#!/bin/bash
# Run Jest/Playwright tests

set -e

TEST_PATTERN="${1:-}"

# Check if test framework is configured
if [ ! -f "package.json" ]; then
    echo "⚠️  No package.json found, skipping tests"
    exit 0
fi

# Run tests
if command -v npm &> /dev/null; then
    echo "🧪 Running tests${TEST_PATTERN:+ for $TEST_PATTERN}..."

    if [ -n "$TEST_PATTERN" ]; then
        npm test -- "$TEST_PATTERN" || {
            echo "❌ Tests failed for $TEST_PATTERN"
            echo "Fix: Review and fix failing tests"
            exit 1
        }
    else
        npm test || {
            echo "❌ Tests failed"
            echo "Fix: Review and fix failing tests"
            exit 1
        }
    fi

    echo "✅ All tests passed"
else
    echo "⚠️  npm not found, skipping tests"
fi

exit 0
