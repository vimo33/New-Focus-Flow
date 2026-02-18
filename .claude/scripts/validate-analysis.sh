#!/bin/bash
# Stop hook: Validates report JSON has required fields per task_type
# Logs warnings but never blocks (always exits 0)

REPORTS_DIR="/srv/focus-flow/07_system/reports"

LATEST_REPORT=$(find "$REPORTS_DIR" -maxdepth 1 -name "*.json" -mmin -5 -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [ -z "$LATEST_REPORT" ]; then
  exit 0
fi

python3 -c "
import json, sys
REQUIRED = {
    'portfolio-analysis': ['top_recommendations'],
    'network-analyze': ['opportunities'],
    'build-mvp': ['build_status', 'endpoints'],
    'monitor-project': ['service_status'],
    'profiling-question': ['question'],
}
RESEARCH_FIELDS = ['sources', 'findings']

try:
    with open('${LATEST_REPORT}') as f:
        data = json.load(f)
    task_type = data.get('task_type', '')
    if not task_type:
        print('validate-analysis: Warning — report missing task_type field')
        sys.exit(0)
    if task_type.startswith('research-'):
        required = RESEARCH_FIELDS
    elif task_type in REQUIRED:
        required = REQUIRED[task_type]
    else:
        print(f'validate-analysis: No requirements for \"{task_type}\", skipping.')
        sys.exit(0)
    missing = [f for f in required if f not in data]
    if missing:
        print(f'validate-analysis: Warning — \"{task_type}\" missing: {\", \".join(missing)}')
    else:
        print(f'validate-analysis: \"{task_type}\" passed validation.')
except Exception as e:
    print(f'validate-analysis: Warning — {e}')
" 2>/dev/null || echo "validate-analysis: Warning — python3 failed"

exit 0
