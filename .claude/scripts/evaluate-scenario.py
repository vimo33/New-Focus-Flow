#!/usr/bin/env python3
"""
External scenario evaluator for Nitara autonomous agent reports.
Computes weighted satisfaction score against holdout criteria.

Usage: python3 evaluate-scenario.py <report_path> <scenario_path>
Output: JSON to stdout: {"score": 0.85, "criteria_results": [...], "errors": [...]}
Exit: 0 if score >= threshold, 2 if below, 1 on error
"""

import json
import re
import sys
import os
from datetime import datetime


def load_json(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def check_all_projects_scored(report: dict) -> float:
    """Check that projects have numeric scores with evidence."""
    top_recs = report.get('top_recommendations', [])
    projects = report.get('projects', report.get('portfolio', []))

    # Check top_recommendations for scores
    if top_recs:
        scored = 0
        for rec in top_recs:
            if isinstance(rec, dict):
                score = rec.get('score', rec.get('rating', rec.get('priority_score')))
                if score is not None:
                    try:
                        s = float(score)
                        if 1 <= s <= 10:
                            scored += 1
                    except (ValueError, TypeError):
                        pass
            elif isinstance(rec, str) and re.search(r'\b\d+(\.\d+)?/10\b|\bscore[:\s]+\d+', rec, re.IGNORECASE):
                scored += 1
        if len(top_recs) > 0:
            return min(scored / len(top_recs), 1.0)

    # Check projects array
    if projects:
        scored = sum(1 for p in projects if isinstance(p, dict) and
                     any(p.get(k) is not None for k in ['score', 'rating', 'priority_score']))
        return min(scored / len(projects), 1.0) if projects else 0.0

    # Check if report text contains scores
    text = json.dumps(report)
    score_patterns = re.findall(r'\b\d+(\.\d+)?/10\b', text)
    return min(len(score_patterns) / 3, 1.0)  # At least 3 scores expected


def check_build_next_with_rationale(report: dict) -> float:
    """Check for BUILD-NEXT recommendation with >100 word rationale."""
    text = json.dumps(report).lower()

    if 'build' not in text and 'next' not in text and 'recommend' not in text:
        return 0.0

    # Look for BUILD-NEXT or similar recommendation
    build_next = report.get('build_next', report.get('recommendation', ''))
    if isinstance(build_next, dict):
        rationale = build_next.get('rationale', build_next.get('reasoning', ''))
        name = build_next.get('name', build_next.get('project', ''))
        if name and rationale and len(rationale.split()) >= 100:
            return 1.0
        elif name and rationale and len(rationale.split()) >= 50:
            return 0.7
        elif name:
            return 0.4
    elif isinstance(build_next, str) and len(build_next.split()) >= 100:
        return 1.0

    # Search in top_recommendations
    for rec in report.get('top_recommendations', []):
        if isinstance(rec, dict):
            text_content = json.dumps(rec)
            if re.search(r'build.?next|recommend', text_content, re.IGNORECASE):
                words = len(text_content.split())
                if words >= 100:
                    return 0.9
                elif words >= 50:
                    return 0.6

    # Partial credit if any recommendation exists
    if report.get('top_recommendations') or report.get('recommendations'):
        return 0.3

    return 0.0


def check_novel_data(report: dict) -> float:
    """Check for at least 2 data points per project."""
    text = json.dumps(report)
    # Count unique data-like patterns: numbers, percentages, dollar amounts, dates
    data_points = set()
    data_points.update(re.findall(r'\$[\d,.]+[BMK]?', text))
    data_points.update(re.findall(r'\d+%', text))
    data_points.update(re.findall(r'\d{4}-\d{2}-\d{2}', text))
    data_points.update(re.findall(r'https?://\S+', text))

    # At least 6 unique data points for a good report (2 per ~3 projects)
    if len(data_points) >= 10:
        return 1.0
    elif len(data_points) >= 6:
        return 0.8
    elif len(data_points) >= 3:
        return 0.5
    return 0.2


def check_specific_dates(report: dict) -> float:
    """Check for specific dates in action plans, not vague timeframes."""
    text = json.dumps(report)
    # Look for specific dates
    specific_dates = re.findall(r'\d{4}-\d{2}-\d{2}|\w+ \d{1,2},? \d{4}|Q[1-4] \d{4}', text)
    # Look for vague timeframes
    vague = re.findall(r'\bsoon\b|\beventually\b|\bsometime\b|\bin the future\b|\bwhen possible\b', text, re.IGNORECASE)

    if len(specific_dates) >= 5 and len(vague) == 0:
        return 1.0
    elif len(specific_dates) >= 3:
        return 0.7
    elif len(specific_dates) >= 1:
        return 0.4
    return 0.1


def check_sources_present(report: dict) -> float:
    """Check for URLs or vault file references as evidence."""
    text = json.dumps(report)
    urls = re.findall(r'https?://\S+', text)
    vault_refs = re.findall(r'/srv/focus-flow/\S+|0[0-9]_\w+/\S+', text)
    sources = report.get('sources', [])

    total = len(urls) + len(vault_refs) + len(sources)
    if total >= 5:
        return 1.0
    elif total >= 3:
        return 0.7
    elif total >= 1:
        return 0.4
    return 0.0


def check_no_placeholders(report: dict) -> float:
    """Check for absence of placeholder text."""
    text = json.dumps(report)
    placeholders = re.findall(
        r'\bTODO\b|\bTBD\b|\bPLACEHOLDER\b|\blorem ipsum\b|\[INSERT|\[FILL|\bXXX\b|\bFIXME\b',
        text, re.IGNORECASE
    )
    if len(placeholders) == 0:
        return 1.0
    elif len(placeholders) <= 2:
        return 0.5
    return 0.0


def check_service_status(report: dict) -> float:
    """Check that service statuses are reported."""
    status = report.get('service_status', report.get('services', {}))
    if isinstance(status, dict) and len(status) >= 2:
        return 1.0
    elif isinstance(status, list) and len(status) >= 2:
        return 1.0
    text = json.dumps(report).lower()
    services_mentioned = sum(1 for s in ['backend', 'frontend', 'telegram'] if s in text)
    return min(services_mentioned / 3, 1.0)


def check_health_checks(report: dict) -> float:
    """Check for health check results."""
    text = json.dumps(report).lower()
    indicators = ['healthy', 'unhealthy', 'running', 'stopped', 'active', 'http', 'status', 'port']
    found = sum(1 for i in indicators if i in text)
    return min(found / 3, 1.0)


def check_log_analysis(report: dict) -> float:
    """Check for log analysis."""
    text = json.dumps(report).lower()
    if 'log' in text and ('error' in text or 'warning' in text or 'normal' in text or 'clean' in text):
        return 1.0
    if 'log' in text:
        return 0.5
    return 0.0


def check_recommendations(report: dict) -> float:
    """Check for actionable recommendations."""
    recs = report.get('recommendations', report.get('actions', report.get('suggestions', [])))
    if isinstance(recs, list) and len(recs) >= 1:
        return 1.0
    text = json.dumps(report).lower()
    if 'recommend' in text or 'should' in text or 'action' in text:
        return 0.6
    return 0.0


def check_question_present(report: dict) -> float:
    """Check that a profiling question exists."""
    q = report.get('question', report.get('profiling_question', ''))
    if isinstance(q, str) and len(q) >= 20 and '?' in q:
        return 1.0
    elif isinstance(q, str) and len(q) >= 10:
        return 0.5
    return 0.0


def check_targets_gap(report: dict) -> float:
    """Check that question targets a specific domain."""
    domain = report.get('target_domain', report.get('domain', ''))
    gap_score = report.get('gap_score', report.get('completeness', None))
    if domain and gap_score is not None:
        return 1.0
    if domain:
        return 0.6
    text = json.dumps(report).lower()
    domains = ['technical', 'business', 'market', 'financial', 'personal', 'network', 'operational']
    if any(d in text for d in domains):
        return 0.4
    return 0.0


def check_not_duplicate(report: dict) -> float:
    """Check that question is not a duplicate (can't fully verify without history, partial credit)."""
    q = report.get('question', '')
    if isinstance(q, str) and len(q) >= 30:
        return 0.8  # Partial credit — can't check full history from report alone
    return 0.4


def check_answerable(report: dict) -> float:
    """Check that question is specific enough."""
    q = report.get('question', '')
    if isinstance(q, str):
        words = len(q.split())
        if 5 <= words <= 30:
            return 1.0
        elif words > 30:
            return 0.6  # Too wordy
        elif words >= 3:
            return 0.5
    return 0.0


# Registry of check functions
CHECKS = {
    'all_projects_scored': check_all_projects_scored,
    'build_next_with_rationale': check_build_next_with_rationale,
    'novel_data': check_novel_data,
    'specific_dates': check_specific_dates,
    'sources_present': check_sources_present,
    'no_placeholders': check_no_placeholders,
    'service_status': check_service_status,
    'health_checks': check_health_checks,
    'log_analysis': check_log_analysis,
    'recommendations': check_recommendations,
    'question_present': check_question_present,
    'targets_gap': check_targets_gap,
    'not_duplicate': check_not_duplicate,
    'answerable': check_answerable,
}


def evaluate(report: dict, scenario: dict) -> dict:
    """Evaluate report against scenario criteria. Returns result dict."""
    criteria = scenario.get('criteria', [])
    threshold = scenario.get('satisfaction_threshold', 0.7)
    results = []
    errors = []
    total_score = 0.0

    for criterion in criteria:
        name = criterion['name']
        check_name = criterion['check']
        weight = criterion.get('weight', 1.0 / len(criteria))

        check_fn = CHECKS.get(check_name)
        if not check_fn:
            errors.append(f"Unknown check: {check_name}")
            results.append({'name': name, 'score': 0.0, 'weight': weight, 'error': f'Unknown check: {check_name}'})
            continue

        try:
            score = check_fn(report)
            score = max(0.0, min(1.0, score))
            total_score += score * weight
            results.append({'name': name, 'score': round(score, 3), 'weight': weight})
        except Exception as e:
            errors.append(f"Check {name} failed: {str(e)}")
            results.append({'name': name, 'score': 0.0, 'weight': weight, 'error': str(e)})

    return {
        'score': round(total_score, 4),
        'threshold': threshold,
        'passed': total_score >= threshold,
        'criteria_results': results,
        'errors': errors,
    }


def main():
    if len(sys.argv) != 3:
        print(json.dumps({'error': 'Usage: evaluate-scenario.py <report_path> <scenario_path>'}))
        sys.exit(1)

    report_path = sys.argv[1]
    scenario_path = sys.argv[2]

    try:
        report = load_json(report_path)
        scenario = load_json(scenario_path)
    except Exception as e:
        print(json.dumps({'error': f'Failed to load files: {str(e)}'}))
        sys.exit(1)

    result = evaluate(report, scenario)

    # Write satisfaction_score back into report
    try:
        report['satisfaction_score'] = result['score']
        report['satisfaction_details'] = result['criteria_results']
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
    except Exception as e:
        result['errors'].append(f'Failed to update report with score: {str(e)}')

    # Store score in history for trending
    try:
        skill = scenario.get('skill', 'unknown')
        date = datetime.now().strftime('%Y-%m-%d')
        history_dir = os.path.join(os.path.dirname(scenario_path), 'history')
        os.makedirs(history_dir, exist_ok=True)
        history_path = os.path.join(history_dir, f'{skill}-{date}.json')
        history_entry = {
            'skill': skill,
            'date': date,
            'score': result['score'],
            'threshold': result['threshold'],
            'passed': result['passed'],
            'report_path': report_path,
        }
        with open(history_path, 'w') as f:
            json.dump(history_entry, f, indent=2)
    except Exception as e:
        result['errors'].append(f'Failed to write history: {str(e)}')

    print(json.dumps(result))
    sys.exit(0 if result['passed'] else 2)


if __name__ == '__main__':
    main()
