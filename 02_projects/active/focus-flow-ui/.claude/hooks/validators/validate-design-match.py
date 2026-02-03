#!/usr/bin/env python3
"""Validate implementation matches Stitch design."""

import sys
import subprocess
from pathlib import Path

def validate_design_match(screen_name):
    """Run visual regression test against Stitch reference."""
    design_dir = Path("/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports")

    # Map screen names to design folders
    screen_map = {
        "dashboard": "focus_flow_dashboard",
        "capture": "quick_capture_flow",
        "inbox": "inbox_processing_center",
        "projects": "projects_management",
        "project-detail": "project_workspace_details",
        "ideas": "ideas_explorer",
        "calendar": "calendar_&_time_blocking",
        "wellbeing": "wellbeing_tracker",
        "voice": "voice_cockpit_ai",
        "process": "item_processing_panel"
    }

    design_folder = screen_map.get(screen_name)
    if not design_folder:
        print(f"❌ Unknown screen: {screen_name}")
        return False

    reference_png = design_dir / design_folder / "screen.png"
    if not reference_png.exists():
        print(f"❌ Reference design not found: {reference_png}")
        return False

    # Run Playwright visual regression test
    test_file = f"tests/visual/{screen_name}.spec.ts"
    if not Path(test_file).exists():
        print(f"⚠️  Visual test not found: {test_file}")
        print(f"Skipping visual regression check")
        return True

    result = subprocess.run(
        ["npx", "playwright", "test", test_file],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print(f"✅ Visual design matches Stitch reference for {screen_name}")
        return True
    else:
        print(f"❌ Visual regression test failed for {screen_name}")
        print(result.stdout)
        print(f"Fix: Review screenshot diff and adjust styling")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate-design-match.py screen=<name>")
        sys.exit(1)

    arg = sys.argv[1]
    if not arg.startswith("screen="):
        print("Usage: validate-design-match.py screen=<name>")
        sys.exit(1)

    screen = arg.split("=")[1]
    result = validate_design_match(screen)
    sys.exit(0 if result else 1)
