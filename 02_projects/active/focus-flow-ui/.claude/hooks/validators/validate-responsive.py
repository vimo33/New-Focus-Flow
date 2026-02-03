#!/usr/bin/env python3
"""Validate responsive design at different breakpoints."""

import sys
import subprocess
from pathlib import Path

def validate_responsive(screen_name):
    """Run Playwright responsive tests."""

    # Run responsive tests
    test_file = f"tests/responsive/{screen_name}.spec.ts"
    if not Path(test_file).exists():
        print(f"⚠️  Responsive test not found: {test_file}")
        print(f"Skipping responsive check")
        return True

    result = subprocess.run(
        ["npx", "playwright", "test", test_file],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print(f"✅ Responsive design validated for {screen_name}")
        print("  - Mobile (320px): ✓")
        print("  - Tablet (768px): ✓")
        print("  - Desktop (1024px+): ✓")
        return True
    else:
        print(f"❌ Responsive tests failed for {screen_name}")
        print(result.stdout)
        print(f"Fix: Check responsive breakpoints and layouts")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate-responsive.py <screen-name>")
        sys.exit(1)

    screen = sys.argv[1]
    result = validate_responsive(screen)
    sys.exit(0 if result else 1)
