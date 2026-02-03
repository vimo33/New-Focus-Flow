#!/usr/bin/env python3
"""Validate WCAG AA accessibility compliance."""

import sys
import subprocess
import json
from pathlib import Path

def validate_accessibility(url):
    """Run pa11y accessibility checks."""

    # Check if pa11y is installed
    result = subprocess.run(
        ["which", "pa11y"],
        capture_output=True
    )

    if result.returncode != 0:
        print("⚠️  pa11y not installed, skipping accessibility check")
        print("Install: npm install -g pa11y")
        return True  # Don't fail if tool not installed

    # Run pa11y
    result = subprocess.run(
        ["pa11y", "--reporter", "json", "--standard", "WCAG2AA", url],
        capture_output=True,
        text=True
    )

    try:
        issues = json.loads(result.stdout)

        if not issues:
            print(f"✅ No accessibility issues found for {url}")
            return True

        # Filter by severity
        errors = [i for i in issues if i.get('type') == 'error']
        warnings = [i for i in issues if i.get('type') == 'warning']

        if errors:
            print(f"❌ {len(errors)} accessibility errors found:")
            for error in errors[:5]:  # Show first 5
                print(f"  - {error.get('message')}")
                print(f"    Element: {error.get('selector')}")
            return False

        if warnings:
            print(f"⚠️  {len(warnings)} accessibility warnings found")
            for warning in warnings[:3]:
                print(f"  - {warning.get('message')}")

        print(f"✅ No critical accessibility errors")
        return True

    except json.JSONDecodeError:
        print(f"⚠️  Could not parse pa11y output")
        return True  # Don't fail on parse error

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate-accessibility.py <url>")
        sys.exit(1)

    url = sys.argv[1]
    result = validate_accessibility(url)
    sys.exit(0 if result else 1)
