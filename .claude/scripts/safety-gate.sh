#!/bin/bash
# PreToolUse hook (Write|Edit|Bash|Read|Glob|Grep): Safety gate for Nitara autonomous agent
# Implements: kill switch, scenario holdout enforcement, command blocking, circuit breaker, loop detection
# Exit 2 = block, Exit 0 = allow

AGENT_DIR="/srv/focus-flow/07_system/agent"
KILL_SWITCH="${AGENT_DIR}/KILL_SWITCH"
CIRCUIT_BREAKER="${AGENT_DIR}/circuit-breaker.json"
LOOP_DIR="${AGENT_DIR}/loop-detection"
AUDIT_LOG="${AGENT_DIR}/safety-audit.jsonl"
SCENARIOS_PATH="07_system/agent/scenarios"

# --- Kill Switch ---
if [ -f "$KILL_SWITCH" ]; then
  echo "SAFETY GATE: Kill switch is active. All Nitara operations blocked. Remove ${KILL_SWITCH} to resume."
  exit 2
fi

# --- Consume stdin (once, reuse everywhere) ---
INPUT=$(cat 2>/dev/null || echo "{}")

# --- Extract tool_name and tool_input from hook context ---
PARSED=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    tn = data.get('tool_name', '')
    ti = data.get('tool_input', {})
    cmd = ti.get('command', '')
    fp = ti.get('file_path', '')
    p = ti.get('path', '')
    pat = ti.get('pattern', '')
    print(f'{tn}\n{cmd}\n{fp}\n{p}\n{pat}')
except:
    print('\n\n\n\n')
" 2>/dev/null || echo "")

TOOL_NAME=$(echo "$PARSED" | sed -n '1p')
COMMAND=$(echo "$PARSED" | sed -n '2p')
FILE_PATH_INPUT=$(echo "$PARSED" | sed -n '3p')
PATH_INPUT=$(echo "$PARSED" | sed -n '4p')
PATTERN_INPUT=$(echo "$PARSED" | sed -n '5p')

# --- Scenario Holdout Enforcement (Read|Glob|Grep path blocking) ---
# Agents must NEVER be able to read evaluation criteria from the scenarios directory.
# This is the most critical invariant in the validation architecture.
if [ "$TOOL_NAME" = "Read" ] || [ "$TOOL_NAME" = "Glob" ] || [ "$TOOL_NAME" = "Grep" ]; then
  SCENARIO_BLOCKED=0
  for CHECK_PATH in "$FILE_PATH_INPUT" "$PATH_INPUT" "$PATTERN_INPUT"; do
    if [ -n "$CHECK_PATH" ] && echo "$CHECK_PATH" | grep -q "$SCENARIOS_PATH"; then
      SCENARIO_BLOCKED=1
      break
    fi
  done

  if [ "$SCENARIO_BLOCKED" -eq 1 ]; then
    echo "SAFETY GATE: Access to scenario holdout directory blocked. Agents must not read evaluation criteria."
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"scenario_holdout_block\",\"tool\":\"${TOOL_NAME}\"}" >> "$AUDIT_LOG" 2>/dev/null
    exit 2
  fi

  # Read/Glob/Grep don't need further safety checks (no destructive potential)
  exit 0
fi

# --- Command Inspection (Bash tool only) ---
if [ "$TOOL_NAME" = "Bash" ] && [ -n "$COMMAND" ]; then
  # Also check if command tries to read scenario files
  if echo "$COMMAND" | grep -qi "$SCENARIOS_PATH"; then
    echo "SAFETY GATE: Command attempts to access scenario holdout directory. Blocked."
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"scenario_holdout_block\",\"tool\":\"Bash\",\"command\":\"$(echo "$COMMAND" | head -c 200)\"}" >> "$AUDIT_LOG" 2>/dev/null
    exit 2
  fi

  # Check against BLOCKED_PATTERNS — pass command via stdin to avoid quoting issues
  BLOCK_RESULT=$(echo "$COMMAND" | python3 -c "
import re, sys

command = sys.stdin.read().strip()

# --- Basic evasion expansion ---
# Expand simple variable assignments followed by usage: X='rm -rf /'; \$X
# This won't catch all evasion (see Leash in Phase 1.4 for kernel-level safety)
expanded = command
try:
    var_assigns = re.findall(r\"(\w+)=['\\\"]([^'\\\"]*)['\\\"]\" , command)
    for var_name, var_value in var_assigns:
        expanded = expanded.replace(f'\${var_name}', var_value)
        expanded = expanded.replace('\${' + var_name + '}', var_value)
except:
    pass

check_targets = [command, expanded]

BLOCKED = [
    # Destructive filesystem
    (r'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+)?(-[a-zA-Z]*r[a-zA-Z]*\s+)?(--no-preserve-root|/\s*$|/\s*;|/\s*\||\s+/\s)', 'Destructive rm on root/system path'),
    (r'rm\s+-rf\s+/', 'rm -rf on root path'),
    (r'--no-preserve-root', 'no-preserve-root flag'),

    # Database destructive
    (r'DROP\s+(TABLE|DATABASE)\s', 'DROP TABLE/DATABASE'),
    (r'TRUNCATE\s+TABLE\s', 'TRUNCATE TABLE'),
    (r'DELETE\s+FROM\s+\w+\s*;', 'DELETE FROM without WHERE clause'),
    (r'DELETE\s+FROM\s+\w+\s*$', 'DELETE FROM without WHERE clause'),

    # Git force operations
    (r'git\s+push\s+.*--force', 'git push --force'),
    (r'git\s+push\s+.*-f\b', 'git push -f'),
    (r'git\s+reset\s+--hard\s+(origin/)?(main|master)', 'git reset --hard on main/master'),

    # System destruction
    (r'\bmkfs\b', 'mkfs (filesystem format)'),
    (r'dd\s+if=/dev/(zero|random|urandom)\s+of=/dev/', 'dd overwrite device'),
    (r'chmod\s+(-R\s+)?777\s+/', 'chmod 777 on root path'),
    (r'\bshutdown\b', 'shutdown command'),
    (r'\breboot\b', 'reboot command'),

    # Privilege escalation
    (r'sudo\s+su\b', 'sudo su'),
    (r'sudo\s+-i\b', 'sudo -i'),
    (r'\bpasswd\b', 'passwd command'),
    (r'\buseradd\b', 'useradd command'),
    (r'\buserdel\b', 'userdel command'),

    # Exfiltration / remote code execution
    (r'curl\s.*\|\s*bash', 'curl piped to bash'),
    (r'curl\s.*\|\s*sh', 'curl piped to sh'),
    (r'wget\s.*\|\s*sh', 'wget piped to sh'),
    (r'wget\s.*\|\s*bash', 'wget piped to bash'),
    (r'eval\s.*curl', 'eval curl substitution'),

    # Service disruption
    (r'systemctl\s+(disable|mask)\s', 'systemctl disable/mask'),
    (r'iptables\s+-F', 'iptables flush'),
    (r'ufw\s+disable', 'ufw disable'),

    # NOTE: This is a best-effort regex check. It cannot catch all evasion vectors.
    # Leash containerization (Phase 1.4) provides kernel-level safety as the real solution.
]

for target in check_targets:
    for pattern, label in BLOCKED:
        if re.search(pattern, target, re.IGNORECASE):
            print(f'BLOCKED:{label}')
            sys.exit(0)

print('OK')
" 2>/dev/null || echo "OK")

  if [[ "$BLOCK_RESULT" == BLOCKED:* ]]; then
    REASON="${BLOCK_RESULT#BLOCKED:}"
    echo "SAFETY GATE: Dangerous command blocked — ${REASON}"
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"type\":\"command_block\",\"reason\":\"${REASON}\",\"command\":\"$(echo "$COMMAND" | head -c 200)\"}" >> "$AUDIT_LOG" 2>/dev/null

    # Send Telegram alert (non-blocking)
    /srv/focus-flow/.claude/scripts/telegram-notify.sh safety_block "Blocked: ${REASON}" 2>/dev/null &
    exit 2
  fi
fi

# --- Circuit Breaker ---
if [ -f "$CIRCUIT_BREAKER" ]; then
  CB_RESULT=$(python3 -c "
import json, sys
from datetime import datetime, timedelta, timezone
try:
    with open('${CIRCUIT_BREAKER}') as f:
        data = json.load(f)
    count = int(data.get('consecutive_failures', 0))
    last = data.get('last_failure_at', '')
    if count >= 3 and last:
        ts = datetime.fromisoformat(last.replace('Z', '+00:00'))
        if (datetime.now(timezone.utc) - ts) < timedelta(minutes=10):
            print('blocked')
            sys.exit(0)
    print('ok')
except:
    print('ok')
" 2>/dev/null || echo "ok")

  if [ "$CB_RESULT" = "blocked" ]; then
    echo "SAFETY GATE: Circuit breaker tripped (3+ consecutive failures in 10 min). Nitara is pausing."
    exit 2
  fi
fi

# --- Loop Detection ---
# Use FILE_PATH_INPUT already extracted above, fallback to legacy parsing
LOOP_PATH="${FILE_PATH_INPUT}"
if [ -z "$LOOP_PATH" ]; then
  LOOP_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('file_path', data.get('filePath', data.get('path', ''))))
except:
    print('')
" 2>/dev/null || echo "")
fi

if [ -n "$LOOP_PATH" ]; then
  mkdir -p "$LOOP_DIR" 2>/dev/null || true
  TRACK_FILE="${LOOP_DIR}/$(echo "$LOOP_PATH" | md5sum | cut -d' ' -f1).log"
  NOW_EPOCH=$(date +%s)
  echo "$NOW_EPOCH" >> "$TRACK_FILE" 2>/dev/null || true

  CUTOFF=$((NOW_EPOCH - 300))
  RECENT=$(python3 -c "
count = 0
try:
    with open('${TRACK_FILE}') as f:
        for line in f:
            try:
                if int(line.strip()) >= ${CUTOFF}: count += 1
            except: continue
except: pass
print(count)
" 2>/dev/null || echo 0)

  if [ "$RECENT" -gt 5 ]; then
    echo "SAFETY GATE: Loop detected — ${LOOP_PATH} edited ${RECENT} times in 5 min. Nitara is pausing."
    exit 2
  fi
fi

exit 0
