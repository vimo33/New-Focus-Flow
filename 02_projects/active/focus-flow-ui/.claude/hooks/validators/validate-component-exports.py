#!/usr/bin/env python3
"""Validate React component is properly exported."""

import sys
import re
from pathlib import Path

def validate_component_exports(component_file):
    """Check that component is exported from index.ts."""
    component_path = Path(component_file)

    if not component_path.exists():
        print(f"❌ Component file not found: {component_file}")
        return False

    # Extract component name
    component_name = component_path.stem

    # Check component has export statement
    content = component_path.read_text()
    if f"export const {component_name}" not in content and \
       f"export default {component_name}" not in content:
        print(f"❌ Component {component_name} not exported in {component_file}")
        print(f"Fix: Add 'export const {component_name}' or 'export default {component_name}'")
        return False

    # Check index.ts has re-export
    index_path = Path("src/lib/index.ts")
    if not index_path.exists():
        print(f"❌ Index file not found: src/lib/index.ts")
        return False

    index_content = index_path.read_text()
    export_pattern = f"export.*{component_name}"
    if not re.search(export_pattern, index_content):
        print(f"❌ Component {component_name} not exported from src/lib/index.ts")
        print(f"Fix: Add 'export {{ {component_name} }} from './components/{component_name}';'")
        return False

    # Check data-testid attributes
    if 'data-testid=' not in content:
        print(f"⚠️  No data-testid attributes found in {component_name}")
        print(f"Recommendation: Add data-testid for testing")

    print(f"✅ Component {component_name} properly exported")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate-component-exports.py <component-file>")
        sys.exit(1)

    result = validate_component_exports(sys.argv[1])
    sys.exit(0 if result else 1)
