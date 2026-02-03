#!/bin/bash
# Lint TypeScript files with ESLint

set -e

FILE_PATH="$1"

if [ -z "$FILE_PATH" ]; then
    echo "Usage: lint-typescript.sh <file-path>"
    exit 1
fi

# Check if ESLint is configured
if [ ! -f "package.json" ]; then
    echo "⚠️  No package.json found, skipping lint"
    exit 0
fi

# Run ESLint on the file
if command -v npx &> /dev/null; then
    echo "🔍 Linting $FILE_PATH..."
    npx eslint "$FILE_PATH" --fix || {
        echo "❌ Lint errors found in $FILE_PATH"
        echo "Fix: Review and address ESLint errors"
        exit 1
    }
    echo "✅ Lint passed for $FILE_PATH"
else
    echo "⚠️  npx not found, skipping lint"
fi

exit 0
