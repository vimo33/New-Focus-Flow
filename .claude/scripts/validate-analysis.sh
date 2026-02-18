#!/bin/bash
# Stop hook: Validates report JSON against external scenario files
# Uses evaluate-scenario.py for satisfaction scoring
# Exit 0 = passed (or no scenario/report found), Exit 2 = failed validation

REPORTS_DIR="/srv/focus-flow/07_system/reports"
SCENARIOS_DIR="/srv/focus-flow/07_system/agent/scenarios"
EVALUATOR="/srv/focus-flow/.claude/scripts/evaluate-scenario.py"
QUEUE_DIR="/srv/focus-flow/07_system/agent/queue"

# Find most recent report (last 5 minutes)
LATEST_REPORT=$(find "$REPORTS_DIR" -maxdepth 1 -name "*.json" -mmin -5 -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_REPORT" ]; then
  exit 0
fi

# Extract task_type from report
TASK_TYPE=$(python3 -c "
import json
try:
    with open('${LATEST_REPORT}') as f:
        print(json.load(f).get('task_type', ''))
except:
    print('')
" 2>/dev/null || echo "")

if [ -z "$TASK_TYPE" ]; then
  echo "validate-analysis: Warning — report missing task_type field"
  exit 0
fi

# Find matching scenario file
SCENARIO_FILE="${SCENARIOS_DIR}/${TASK_TYPE}.json"
if [ ! -f "$SCENARIO_FILE" ]; then
  echo "validate-analysis: No scenario for \"${TASK_TYPE}\", skipping validation."
  exit 0
fi

# Run the evaluator
EVAL_OUTPUT=$(python3 "$EVALUATOR" "$LATEST_REPORT" "$SCENARIO_FILE" 2>/dev/null)
EVAL_EXIT=$?

if [ $EVAL_EXIT -eq 0 ]; then
  SCORE=$(echo "$EVAL_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('score','?'))" 2>/dev/null || echo "?")
  echo "validate-analysis: \"${TASK_TYPE}\" passed — satisfaction score: ${SCORE}"
  exit 0
elif [ $EVAL_EXIT -eq 2 ]; then
  SCORE=$(echo "$EVAL_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('score','?'))" 2>/dev/null || echo "?")
  THRESHOLD=$(echo "$EVAL_OUTPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('threshold','?'))" 2>/dev/null || echo "?")
  echo "validate-analysis: \"${TASK_TYPE}\" FAILED — satisfaction ${SCORE} < threshold ${THRESHOLD}"

  # Check if this task has retry_count < 1 in its queue file, and re-queue if so
  TASK_ID="${NITARA_TASK_ID:-}"
  if [ -n "$TASK_ID" ]; then
    TASK_FILE="${QUEUE_DIR}/${TASK_ID}.json"
    if [ -f "$TASK_FILE" ]; then
      RETRY_COUNT=$(python3 -c "
import json
try:
    with open('${TASK_FILE}') as f:
        print(json.load(f).get('retry_count', 0))
except:
    print(0)
" 2>/dev/null || echo "0")

      if [ "$RETRY_COUNT" -lt 1 ]; then
        # Set task back to queued with incremented retry_count
        python3 -c "
import json
try:
    with open('${TASK_FILE}') as f:
        task = json.load(f)
    task['status'] = 'queued'
    task['retry_count'] = task.get('retry_count', 0) + 1
    task['error'] = 'Validation failed: satisfaction ${SCORE} < ${THRESHOLD}'
    with open('${TASK_FILE}', 'w') as f:
        json.dump(task, f, indent=2)
    print('validate-analysis: Re-queued task for retry')
except Exception as e:
    print(f'validate-analysis: Failed to re-queue: {e}')
" 2>/dev/null
      fi
    fi
  fi

  # Send Telegram alert for failed validation
  /srv/focus-flow/.claude/scripts/telegram-notify.sh validation_fail "Task '${TASK_TYPE}' scored ${SCORE} (threshold: ${THRESHOLD})" 2>/dev/null &

  # Don't block the Stop hook — report the failure but exit 0
  # The re-queue mechanism handles retry
  exit 0
else
  echo "validate-analysis: Error running evaluator (exit ${EVAL_EXIT})"
  exit 0
fi
