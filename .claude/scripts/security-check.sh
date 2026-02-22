#!/bin/bash
# PostToolUse hook: Lightweight security check on Write|Edit operations
# Warns about common security anti-patterns but never blocks (exit 0 always)

# Get the file path from the tool input (passed via CLAUDE_TOOL_INPUT)
FILE_PATH=""
if [ -n "$CLAUDE_TOOL_INPUT" ]; then
  FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | grep -oP '"file_path"\s*:\s*"([^"]*)"' | head -1 | sed 's/"file_path"\s*:\s*"//;s/"$//')
fi

# Skip if no file path or not a source file
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check source files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.py|*.sh|*.json|*.yaml|*.yml|*.env) ;;
  *) exit 0 ;;
esac

# Skip node_modules, dist, build directories
case "$FILE_PATH" in
  */node_modules/*|*/dist/*|*/build/*|*/.git/*) exit 0 ;;
esac

# Skip if file doesn't exist
if [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

warnings=()

# Check for hardcoded passwords/secrets patterns
if grep -qP '(password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["\x27][^"\x27]{8,}' "$FILE_PATH" 2>/dev/null; then
  # Exclude .env.example, test files, and documentation
  case "$FILE_PATH" in
    *.example|*.test.*|*.spec.*|*/tests/*|*/docs/*) ;;
    *) warnings+=("Possible hardcoded secret detected") ;;
  esac
fi

# Check for eval() usage
if grep -qP '\beval\s*\(' "$FILE_PATH" 2>/dev/null; then
  case "$FILE_PATH" in
    *.test.*|*.spec.*) ;;
    *) warnings+=("eval() usage detected — potential code injection risk") ;;
  esac
fi

# Check for innerHTML / dangerouslySetInnerHTML
if grep -qP '(innerHTML|dangerouslySetInnerHTML)' "$FILE_PATH" 2>/dev/null; then
  case "$FILE_PATH" in
    *.test.*|*.spec.*) ;;
    *) warnings+=("innerHTML/dangerouslySetInnerHTML usage — potential XSS risk") ;;
  esac
fi

# Report warnings (but never block)
if [ ${#warnings[@]} -gt 0 ]; then
  echo "SECURITY CHECK WARNINGS for $FILE_PATH:"
  for w in "${warnings[@]}"; do
    echo "  - $w"
  done
fi

# Always exit 0 — this hook warns but never blocks
exit 0
