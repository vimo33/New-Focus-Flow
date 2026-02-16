#!/bin/bash
# Stop hook: Verify builds compile after Nitara implementation work
# Checks TypeScript compilation and verifies no stale "Focus Flow" branding in UI

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

# Branding guard: Check for stale "Focus Flow" in UI source
stale_branding=$(grep -r "Focus Flow" "$FRONTEND_DIR/src/" 2>/dev/null | grep -v "_legacy/" | grep -v "node_modules/" || true)
if [ -n "$stale_branding" ]; then
  errors+=("Stale 'Focus Flow' branding found in frontend source (outside _legacy/)")
  echo "$stale_branding"
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
