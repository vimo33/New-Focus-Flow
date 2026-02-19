#!/bin/bash
# PostToolUse hook: Ensures no hardcoded colors or fonts in React/CSS files
# Exit 0 = pass, Exit 2 = block

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Only check .tsx, .jsx, .css files
case "$FILE_PATH" in
  *.tsx|*.jsx|*.css) ;;
  *) exit 0 ;;
esac

# Skip non-UI directories
case "$FILE_PATH" in
  */node_modules/*|*/dist/*|*/design/*|*/.claude/*|*/stitch_v1/*) exit 0 ;;
esac

[ ! -f "$FILE_PATH" ] && exit 0

# Check for hardcoded hex colors (excluding comments, CSS var definitions, and tailwind config)
VIOLATIONS=$(grep -n '#[0-9a-fA-F]\{6\}' "$FILE_PATH" | grep -v '//' | grep -v '/\*' | grep -v 'var(--' | grep -v ':root' | grep -v '@theme' | grep -v 'tailwind' | head -5)

if [ -n "$VIOLATIONS" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"Hardcoded hex colors found. Use CSS variables (var(--color-*)) instead:\\n${VIOLATIONS}\"}"
  exit 2
fi

exit 0
