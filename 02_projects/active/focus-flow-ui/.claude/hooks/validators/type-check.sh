#!/bin/bash
# Run TypeScript type checking

set -e

# Check if TypeScript is configured
if [ ! -f "tsconfig.json" ]; then
    echo "⚠️  No tsconfig.json found, skipping type check"
    exit 0
fi

# Run TypeScript compiler
if command -v npx &> /dev/null; then
    echo "🔍 Running TypeScript type check..."
    npx tsc --noEmit || {
        echo "❌ TypeScript type errors found"
        echo "Fix: Review and fix type errors"
        exit 1
    }
    echo "✅ Type check passed"
else
    echo "⚠️  npx not found, skipping type check"
fi

exit 0
