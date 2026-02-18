"""Function tools for Nitara voice agents.

These tools allow voice agents to interact with the Focus Flow backend
for task management, report reading, and profiling updates.
"""

import json
import logging
import os
from datetime import datetime

import aiohttp

logger = logging.getLogger("nitara-voice-tools")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
QUEUE_TOKEN_PATH = "/srv/focus-flow/07_system/secrets/.queue-api-token"
PROFILING_CHECKLIST_PATH = "/srv/focus-flow/07_system/agent/profiling-checklist.json"
REPORTS_DIR = "/srv/focus-flow/07_system/reports"


def _read_queue_token() -> str:
    """Read the queue API bearer token."""
    try:
        with open(QUEUE_TOKEN_PATH, "r") as f:
            return f.read().strip()
    except FileNotFoundError:
        logger.warning("Queue API token not found")
        return ""


async def enqueue_task(skill: str, arguments: str = "", priority: str = "medium") -> str:
    """Enqueue a task in Nitara's autonomous agent system.

    Args:
        skill: The skill to execute (e.g., 'portfolio-analysis', 'research-market')
        arguments: Arguments to pass to the skill
        priority: Task priority — 'low', 'medium', or 'high'

    Returns:
        Confirmation message with task ID or error description.
    """
    token = _read_queue_token()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    payload = {
        "skill": skill,
        "arguments": arguments,
        "priority": priority,
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{BACKEND_URL}/api/queue/enqueue",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                data = await resp.json()
                if resp.status == 200 or resp.status == 201:
                    task_id = data.get("id", "unknown")
                    return f"Task queued successfully. ID: {task_id}, skill: {skill}, priority: {priority}."
                else:
                    return f"Failed to queue task: {data.get('error', 'unknown error')}"
    except Exception as e:
        logger.error(f"enqueue_task failed: {e}")
        return f"Error queuing task: {str(e)}"


async def check_task_status(task_id: str = "") -> str:
    """Check the status of queued tasks.

    Args:
        task_id: Optional specific task ID. If empty, returns recent task summary.

    Returns:
        Task status information.
    """
    token = _read_queue_token()
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        async with aiohttp.ClientSession() as session:
            url = f"{BACKEND_URL}/api/queue/stats"
            async with session.get(
                url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                if resp.status == 200:
                    pending = data.get("pending", 0)
                    running = data.get("running", 0)
                    completed = data.get("completed_today", 0)
                    return (
                        f"Queue status: {pending} pending, {running} running, "
                        f"{completed} completed today."
                    )
                else:
                    return f"Could not fetch queue status: {data.get('error', 'unknown')}"
    except Exception as e:
        logger.error(f"check_task_status failed: {e}")
        return f"Error checking status: {str(e)}"


async def read_latest_report(report_type: str = "portfolio-analysis") -> str:
    """Read the most recent report of a given type.

    Args:
        report_type: Type of report — 'portfolio-analysis', 'monitor-project',
                     'research-market', 'research-youtube', 'network-analyze', etc.

    Returns:
        Summary of the latest report, or a message if no report found.
    """
    try:
        import glob

        pattern = os.path.join(REPORTS_DIR, f"{report_type}*.json")
        files = sorted(glob.glob(pattern), reverse=True)
        if not files:
            return f"No {report_type} reports found yet."

        with open(files[0], "r") as f:
            report = json.load(f)

        # Extract key fields for voice summary
        parts = [f"Latest {report_type} report from {report.get('date', 'unknown date')}."]

        if "summary" in report:
            parts.append(report["summary"])
        elif "notes" in report:
            parts.append(report["notes"])

        status = report.get("status", "")
        if status:
            parts.append(f"Status: {status}.")

        score = report.get("satisfaction_score")
        if score is not None:
            parts.append(f"Quality score: {score:.1%}.")

        return " ".join(parts)
    except Exception as e:
        logger.error(f"read_latest_report failed: {e}")
        return f"Error reading report: {str(e)}"


async def update_profiling_data(domain: str, key: str, value: str, notes: str = "") -> str:
    """Update the profiling checklist after a voice conversation.

    Args:
        domain: The profiling domain (e.g., 'founder_identity', 'financial_reality')
        key: The specific item key (e.g., 'education', 'savings_runway')
        value: The new status — 'known', 'partial', or 'unknown'
        notes: Information gathered from the conversation

    Returns:
        Confirmation message.
    """
    try:
        with open(PROFILING_CHECKLIST_PATH, "r") as f:
            checklist = json.load(f)

        domains = checklist.get("domains", {})
        if domain not in domains:
            return f"Unknown domain: {domain}. Available: {', '.join(domains.keys())}"

        items = domains[domain].get("items", [])
        found = False
        for item in items:
            if item["key"] == key:
                item["status"] = value
                item["source"] = "voice_conversation"
                if notes:
                    item["notes"] = notes
                found = True
                break

        if not found:
            return f"Unknown key '{key}' in domain '{domain}'."

        # Recompute domain completeness
        total = len(items)
        known = sum(1 for i in items if i["status"] == "known")
        partial = sum(1 for i in items if i["status"] == "partial")
        domains[domain]["completeness"] = round((known + partial * 0.5) / total * 100)

        # Recompute overall completeness
        all_domains = list(domains.values())
        checklist["overall_completeness"] = round(
            sum(d["completeness"] for d in all_domains) / len(all_domains)
        )
        checklist["last_updated"] = datetime.now().strftime("%Y-%m-%d")

        with open(PROFILING_CHECKLIST_PATH, "w") as f:
            json.dump(checklist, f, indent=2)

        return (
            f"Updated {domain}.{key} to '{value}'. "
            f"Domain completeness: {domains[domain]['completeness']}%. "
            f"Overall: {checklist['overall_completeness']}%."
        )
    except Exception as e:
        logger.error(f"update_profiling_data failed: {e}")
        return f"Error updating profiling data: {str(e)}"


async def get_profiling_gaps() -> str:
    """Get the highest-priority profiling gaps for the next conversation.

    Returns:
        Description of the top profiling gaps to address.
    """
    try:
        with open(PROFILING_CHECKLIST_PATH, "r") as f:
            checklist = json.load(f)

        gaps = []
        for domain_key, domain in checklist.get("domains", {}).items():
            if domain["completeness"] >= 80:
                continue
            for item in domain.get("items", []):
                if item["status"] == "unknown":
                    gaps.append({
                        "domain": domain["label"],
                        "domain_key": domain_key,
                        "key": item["key"],
                        "label": item["label"],
                        "priority": domain.get("priority", "medium"),
                    })

        # Sort by priority (critical > high > medium)
        priority_order = {"critical": 0, "high": 1, "medium": 2}
        gaps.sort(key=lambda g: priority_order.get(g["priority"], 3))

        if not gaps:
            return "All profiling domains are at 80% or above. Great coverage!"

        top = gaps[:5]
        lines = [f"Top {len(top)} profiling gaps to address:"]
        for g in top:
            lines.append(f"- {g['domain']}: {g['label']} (priority: {g['priority']})")

        overall = checklist.get("overall_completeness", 0)
        lines.append(f"\nOverall profiling completeness: {overall}%.")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"get_profiling_gaps failed: {e}")
        return f"Error reading profiling gaps: {str(e)}"
