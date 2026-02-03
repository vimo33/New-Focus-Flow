#!/bin/bash
# Format code with Prettier

set -e

FILE_PATH="$1"

if [ -z "$FILE_PATH" ]; then
    echo "Usage: format-code.sh <file-path>"
    exit 1
fi

# Check if Prettier is available
if command -v npx &> /dev/null; then
    echo "✨ Formatting $FILE_PATH..."
    npx prettier --write "$FILE_PATH" || {
        echo "❌ Prettier failed"
        exit 1
    }
    echo "✅ Code formatted"
else
    echo "⚠️  npx not found, skipping format"
fi

exit 0
