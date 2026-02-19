---
name: network-import
description: Import LinkedIn ZIP or Gmail CSV contacts with deduplication and merge
context: fork
model: sonnet
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch, Write
---

# /network-import

Import contacts from LinkedIn data export (ZIP with Connections.csv) or Gmail CSV. Deduplicates against existing contacts.

## Usage

```
/network-import <path-to-file>
```

## HITL Resumption

If this is a resumed task, first check `07_system/agent/answered-questions/` for prior answers matching your task ID before proceeding.

## Process

### Phase 1: Parse Source
- **LinkedIn ZIP**: Extract and parse `Connections.csv` (First Name, Last Name, Email, Company, Position, Connected On)
- **Gmail CSV**: Parse Name, Email, Organization, Title
- Normalize: trim, lowercase emails, standardize company names

### Phase 2: Deduplicate
1. **Email block** — Normalize emails (lowercase, strip Gmail dots). Exact match = same person → merge.
2. **Name similarity** — Levenshtein distance, threshold 0.85. If name matches AND another field matches (company/position) → merge. If name-only match → flag as possible duplicate.

### Phase 3: Merge
- Keep longer/more complete name
- Keep all emails as array
- Keep newest company/position, archive old as `previous_companies`/`previous_positions`
- Union all tags
- Append to `imported_from` provenance array
- Keep earliest `first_seen`, update `last_updated`

### Phase 4: Write
- Contact files to `10_profile/network/contacts/{name}-{hash}.json`
- Import log to `10_profile/network/imports/import-log-YYYY-MM-DD.json`

## Output

```json
{
  "task_type": "network-import",
  "status": "completed",
  "import_count": 0,
  "dedup_count": 0,
  "stats": { "total_in_source": 0, "imported_new": 0, "merged": 0, "skipped": 0 }
}
```
