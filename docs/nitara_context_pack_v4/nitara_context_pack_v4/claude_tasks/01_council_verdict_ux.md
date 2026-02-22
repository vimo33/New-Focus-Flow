# Claude Task: Council Verdict UX Upgrade

Goal: Fix layout so long overview text doesn't push content down.

Implement:
- Project summary: clamp to 3 lines + Expand + Pop-out Drawer (formatted markdown)
- Keep council widgets (score ring, dimension cards, risks, actions) above fold
- Recommended actions list:
  - checkbox + 'Create Task' button (SUGGEST tier) using existing apply-actions endpoint if available
- Add 'Evidence' drawer link per action (even placeholder)

Acceptance:
- Responsive desktop/mobile
- No layout shift from long text
