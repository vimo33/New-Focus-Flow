#!/bin/bash
# Stop hook: Verify builds compile after implementation work
# This runs when Claude Code stops to ensure no broken builds are left behind

BACKEND_DIR="/srv/focus-flow/02_projects/active/focus-flow-backend"
FRONTEND_DIR="/srv/focus-flow/02_projects/active/focus-flow-ui"

errors=()

# Check if any .ts files were recently modified (within last 5 minutes)
backend_changed=$(find "$BACKEND_DIR/src" -name "*.ts" -mmin -5 2>/dev/null | head -1)
frontend_changed=$(find "$FRONTEND_DIR/src" -name "*.ts" -o -name "*.tsx" -mmin -5 2>/dev/null | head -1)

if [ -n "$backend_changed" ]; then
  echo "Backend files changed, verifying build..."
  cd "$BACKEND_DIR" && npx tsc --noEmit 2>&1
  if [ $? -ne 0 ]; then
    errors+=("Backend TypeScript compilation failed")
  fi
fi

if [ -n "$frontend_changed" ]; then
  echo "Frontend files changed, verifying build..."
  cd "$FRONTEND_DIR" && npx tsc -b --noEmit 2>&1
  if [ $? -ne 0 ]; then
    errors+=("Frontend TypeScript compilation failed")
  fi
fi

if [ ${#errors[@]} -gt 0 ]; then
  echo "BUILD VERIFICATION FAILED:"
  for err in "${errors[@]}"; do
    echo "  - $err"
  done
  exit 1
fi

echo "Build verification passed."
exit 0
