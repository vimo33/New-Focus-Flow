"""Nitara Voice Agent — Multi-persona voice AI with SIP telephony support.

Three personas:
  nitara-main     — General voice, warm (nova). Default for web + inbound SIP.
  nitara-analyst  — Portfolio analyst, authoritative (atlas). Dispatched for analysis.
  nitara-profiler — Profiling conversations, curious (lyra). Outbound profiling calls.

All personas route LLM through the backend orchestrator API, except the profiler
which uses Claude directly for focused profiling conversations.
"""

import json
import logging
import os
import asyncio
from datetime import datetime

import aiohttp
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentSession,
    APIConnectOptions,
    AutoSubscribe,
    JobContext,
    JobProcess,
    RoomInputOptions,
    WorkerOptions,
    cli,
    inference,
    llm,
    function_tool,
)
from livekit.plugins import silero

try:
    from livekit.plugins import deepgram as deepgram_plugin
    HAS_DEEPGRAM_PLUGIN = True
except ImportError:
    HAS_DEEPGRAM_PLUGIN = False

try:
    from livekit.plugins import anthropic as anthropic_plugin
    HAS_ANTHROPIC_PLUGIN = True
except ImportError:
    HAS_ANTHROPIC_PLUGIN = False

try:
    from livekit.plugins import noise_cancellation
    HAS_NOISE_CANCELLATION = True
except ImportError:
    HAS_NOISE_CANCELLATION = False

load_dotenv()
logger = logging.getLogger("nitara-voice")

# ─── Configuration ────────────────────────────────────────────────────────────

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
SOUL_PATH = os.getenv("SOUL_PATH", "/srv/focus-flow/07_system/NITARA_SOUL.md")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENCLAW_BASE_URL = os.getenv("OPENCLAW_BASE_URL", "http://localhost:18789/v1")
OPENCLAW_TOKEN = os.getenv("OPENCLAW_TOKEN", "")
CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")

# Load voice presets
VOICE_CONFIG = {}
try:
    with open(os.path.join(CONFIG_DIR, "voices.json"), "r") as f:
        VOICE_CONFIG = json.load(f)
except FileNotFoundError:
    pass

PERSONA_VOICES = {
    "nitara-main": VOICE_CONFIG.get("personas", {}).get("nitara-main", {}).get("voice_id", "f786b574-daa5-4673-aa0c-cbe3e8534c02"),
    "nitara-analyst": VOICE_CONFIG.get("personas", {}).get("nitara-analyst", {}).get("voice_id", "228fca29-3a0a-435c-8728-5cb483251068"),
    "nitara-profiler": VOICE_CONFIG.get("personas", {}).get("nitara-profiler", {}).get("voice_id", "6ccbfb76-1fc6-48f7-b71d-91ac6298247b"),
}

# Legacy preset mapping for backward compatibility
VOICE_PRESETS = {
    "nova": "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    "atlas": "228fca29-3a0a-435c-8728-5cb483251068",
    "lyra": "6ccbfb76-1fc6-48f7-b71d-91ac6298247b",
}

# ─── Import function tools ────────────────────────────────────────────────────

from tools import (
    enqueue_task,
    check_task_status,
    read_latest_report,
    update_profiling_data,
    get_profiling_gaps,
)


# ─── Shared Utilities ─────────────────────────────────────────────────────────

def get_voice_id(preset_name: str) -> str:
    return VOICE_PRESETS.get(preset_name.lower(), VOICE_PRESETS["nova"])


def load_soul_instructions() -> str:
    """Load NITARA_SOUL.md for the voice agent's personality framing."""
    try:
        with open(SOUL_PATH, "r") as f:
            soul = f.read()
        return (
            "You are Nitara, an AI business partner. You are speaking via voice.\n"
            "Keep responses under 3 sentences. No markdown, no bullet points, no code blocks. Speak naturally.\n"
            "Your full identity and personality are defined below — embody this in every response.\n\n"
            + soul
        )
    except FileNotFoundError:
        logger.warning(f"SOUL.md not found at {SOUL_PATH}, using fallback instructions")
        return (
            "You are Nitara, an AI business partner for solo founders and creators. "
            "You are concise, professional, and carry calm intensity. "
            "Keep responses short and conversational since this is a voice interface. "
            "Speak naturally — no formatting, no bullet points."
        )


async def fetch_keywords() -> list[str]:
    """Fetch domain-specific keywords from the backend for STT boosting."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{BACKEND_URL}/api/livekit/keywords",
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data.get("keywords", [])
    except Exception as e:
        logger.warning(f"Failed to fetch keywords: {e}")
    return []


def build_stt(keywords: list[str] | None = None):
    """Build the best available STT instance with optional keyword boosting."""
    stt_instance = None
    using_sttv2 = False

    if HAS_DEEPGRAM_PLUGIN and keywords:
        clean_keywords = [k.split(":")[0] for k in keywords if k]
        if clean_keywords:
            logger.info(f"Loaded {len(clean_keywords)} keywords for STT boosting")

        try:
            stt_instance = deepgram_plugin.STTv2(
                model="flux-general-en",
                keyterm=clean_keywords or None,
            )
            using_sttv2 = True
            logger.info("Using Deepgram Flux STTv2")
        except Exception as e:
            logger.warning(f"Flux STTv2 init failed, falling back to Nova-3: {e}")
            try:
                stt_instance = deepgram_plugin.STT(
                    model="nova-3",
                    language="en",
                    keyterm=clean_keywords or None,
                )
                logger.info("Using Deepgram Nova-3 with keyterm boosting")
            except Exception as e2:
                logger.warning(f"Deepgram plugin init failed: {e2}")

    return stt_instance, using_sttv2


# ─── Orchestrator LLM (routes through backend) ───────────────────────────────

class OrchestratorLLM(llm.LLM):
    """Custom LLM that routes through the Focus Flow orchestrator API."""

    def __init__(self, backend_url: str = BACKEND_URL, project_id: str = "",
                 deep_mode: bool = False, room=None):
        super().__init__()
        self._backend_url = backend_url
        self._http_session: aiohttp.ClientSession | None = None
        self._project_id = project_id
        self._deep_mode = deep_mode
        self._room = room
        self._thread_id = ""

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._http_session is None or self._http_session.closed:
            self._http_session = aiohttp.ClientSession()
        return self._http_session

    async def aclose(self) -> None:
        if self._http_session and not self._http_session.closed:
            await self._http_session.close()

    def chat(self, *, chat_ctx: llm.ChatContext, tools: list[llm.Tool] | None = None,
             conn_options: APIConnectOptions = APIConnectOptions(), **kwargs) -> "OrchestratorLLMStream":
        return OrchestratorLLMStream(self, chat_ctx=chat_ctx, tools=tools or [],
                                     conn_options=conn_options)


class OrchestratorLLMStream(llm.LLMStream):
    """Streams orchestrator response as ChatChunks."""

    def __init__(self, orchestrator_llm: OrchestratorLLM, *, chat_ctx: llm.ChatContext,
                 tools: list[llm.Tool], conn_options: APIConnectOptions):
        super().__init__(orchestrator_llm, chat_ctx=chat_ctx, tools=tools,
                         conn_options=conn_options)
        self._orchestrator_llm = orchestrator_llm

    def _extract_user_message(self) -> str:
        """Extract the latest user message from chat context."""
        for msg in reversed(self._chat_ctx.items):
            if hasattr(msg, 'role') and msg.role == 'user':
                if hasattr(msg, 'content'):
                    if isinstance(msg.content, str):
                        return msg.content
                    elif isinstance(msg.content, list):
                        return " ".join(
                            p.text if hasattr(p, 'text') else str(p)
                            for p in msg.content if hasattr(p, 'text')
                        )
                break
            elif hasattr(msg, 'type') and msg.type == 'message':
                if hasattr(msg, 'role') and msg.role == 'user':
                    if hasattr(msg, 'text_content'):
                        return msg.text_content
                    break

        # Fallback: try text_content / text attributes
        for item in reversed(self._chat_ctx.items):
            text = getattr(item, 'text_content', None) or getattr(item, 'text', None)
            role = getattr(item, 'role', None)
            if text and role == 'user':
                return text

        return ""

    async def _send_orchestrator_request(self, payload: dict) -> dict:
        session = await self._orchestrator_llm._ensure_session()
        url = f"{self._orchestrator_llm._backend_url}/api/orchestrator/chat"
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=600)) as resp:
            if resp.status >= 400:
                raise Exception(f"HTTP {resp.status}: {await resp.text()}")
            return await resp.json()

    async def _run(self) -> None:
        user_message = self._extract_user_message()

        payload = {"source": "voice"}
        if self._orchestrator_llm._thread_id:
            payload["thread_id"] = self._orchestrator_llm._thread_id
        if self._orchestrator_llm._project_id:
            payload["project_id"] = self._orchestrator_llm._project_id
        if self._orchestrator_llm._deep_mode:
            payload["deep_mode"] = True

        if not user_message:
            # Greeting intent
            payload["content"] = ""
            payload["intent"] = "greeting"
        else:
            payload["content"] = user_message
            logger.info(f"Orchestrator request: {user_message[:100]}")

        try:
            data = await self._send_orchestrator_request(payload)

            if data.get("thread_id"):
                self._orchestrator_llm._thread_id = data["thread_id"]

            # Forward open_canvas directive via data channel
            open_canvas = data.get("open_canvas")
            if open_canvas and self._orchestrator_llm._room:
                try:
                    canvas_msg = json.dumps({
                        "type": "open_canvas",
                        "canvas": open_canvas.get("canvas", ""),
                        "params": open_canvas.get("params", {}),
                    })
                    await self._orchestrator_llm._room.local_participant.publish_data(
                        canvas_msg, reliable=True, topic="nitara.canvas"
                    )
                except Exception as e:
                    logger.warning(f"Failed to publish open_canvas data: {e}")

            content = data.get("content", "") or "Done."
            logger.info(f"Orchestrator response: {content[:100]}")

            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id=f"orchestrator-{data.get('thread_id', 'unknown')}",
                    delta=llm.ChoiceDelta(role="assistant", content=content),
                )
            )
        except asyncio.TimeoutError:
            logger.error("Orchestrator request timed out after 600s")
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id="orchestrator-timeout",
                    delta=llm.ChoiceDelta(role="assistant",
                        content="That's still processing. Check your dashboard or ask me again shortly."),
                )
            )
        except Exception as e:
            logger.error(f"Orchestrator request failed: {e}")
            fallback = "Hey Vimo. I'm here. What would you like to work on?" if not user_message else "Something went wrong on my end. Could you try again?"
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id="orchestrator-fail",
                    delta=llm.ChoiceDelta(role="assistant", content=fallback),
                )
            )


# ─── Persona: Nitara Main (general voice) ────────────────────────────────────

class NitaraMain(Agent):
    """General-purpose voice assistant. Warm, confident. Routes through orchestrator."""

    def __init__(self, voice_preset: str = "nova", thread_id: str = "",
                 project_id: str = "", deep_mode: bool = False,
                 stt_instance=None, room=None):
        voice_id = get_voice_id(voice_preset) if voice_preset else PERSONA_VOICES["nitara-main"]
        orchestrator_llm = OrchestratorLLM(
            backend_url=BACKEND_URL, project_id=project_id,
            deep_mode=deep_mode, room=room,
        )
        if thread_id:
            orchestrator_llm._thread_id = thread_id

        stt = stt_instance or inference.STT(model="deepgram/nova-3")

        super().__init__(
            instructions=load_soul_instructions(),
            stt=stt,
            llm=orchestrator_llm,
            tts=inference.TTS(model="cartesia/sonic-2", voice=voice_id),
        )

    @function_tool()
    async def enqueue_task(self, skill: str, arguments: str = "", priority: str = "medium") -> str:
        """Queue a task for Nitara's autonomous agents. Use for portfolio analysis, research, etc."""
        return await enqueue_task(skill, arguments, priority)

    @function_tool()
    async def check_task_status(self, task_id: str = "") -> str:
        """Check the status of the autonomous agent task queue."""
        return await check_task_status(task_id)

    @function_tool()
    async def read_latest_report(self, report_type: str = "portfolio-analysis") -> str:
        """Read the most recent report. Types: portfolio-analysis, monitor-project, research-market, etc."""
        return await read_latest_report(report_type)

    async def on_enter(self):
        self.session.generate_reply(
            instructions="Generate a contextual greeting for the founder.",
            allow_interruptions=True,
        )


# ─── Persona: Nitara Analyst (portfolio discussion) ──────────────────────────

ANALYST_INSTRUCTIONS = """You are Nitara in Analyst mode — authoritative, data-driven, strategic.
You are speaking via voice. Keep responses concise but substantive.
No markdown, no bullet points, no code blocks. Speak naturally with confidence.

Your role: Discuss portfolio analysis, project scoring, BUILD-NEXT recommendations,
market research findings, and strategic decisions. Reference specific data from reports.

When the founder asks about their portfolio:
1. Reference the latest portfolio analysis report
2. Give specific scores and rankings
3. Explain your reasoning clearly
4. Recommend concrete next steps

You have access to tools for reading reports and checking task status.
Use them proactively when discussing portfolio or strategy topics."""


class NitaraAnalyst(Agent):
    """Portfolio analyst persona. Authoritative, data-driven."""

    def __init__(self, stt_instance=None, room=None, thread_id: str = ""):
        voice_id = PERSONA_VOICES["nitara-analyst"]
        orchestrator_llm = OrchestratorLLM(
            backend_url=BACKEND_URL, room=room, deep_mode=True,
        )
        if thread_id:
            orchestrator_llm._thread_id = thread_id

        stt = stt_instance or inference.STT(model="deepgram/nova-3")

        super().__init__(
            instructions=ANALYST_INSTRUCTIONS,
            stt=stt,
            llm=orchestrator_llm,
            tts=inference.TTS(model="cartesia/sonic-2", voice=voice_id),
        )

    @function_tool()
    async def read_latest_report(self, report_type: str = "portfolio-analysis") -> str:
        """Read the most recent analysis report."""
        return await read_latest_report(report_type)

    @function_tool()
    async def enqueue_task(self, skill: str, arguments: str = "", priority: str = "high") -> str:
        """Queue a deep analysis task."""
        return await enqueue_task(skill, arguments, priority)

    async def on_enter(self):
        self.session.generate_reply(
            instructions="Greet the founder and briefly summarize the latest portfolio status. Mention you can dive deeper into any project.",
            allow_interruptions=True,
        )


# ─── Persona: Nitara Profiler (profiling conversations) ──────────────────────

def _build_profiler_instructions() -> str:
    """Build profiling instructions with current gap data."""
    base = """You are Nitara in Profiler mode — friendly, curious, conversational.
You are speaking via voice on a phone call. This is a profiling session.

Your goal: Learn about the founder through natural conversation. You're gathering
information to fill gaps in the profiling checklist, but don't make it feel like
an interrogation. Be genuinely curious, follow interesting threads, and let the
conversation flow naturally.

Guidelines:
- Ask ONE question at a time. Wait for the answer before moving on.
- When they share something, acknowledge it warmly before asking the next thing.
- If they seem uncomfortable with a topic, gracefully pivot to another.
- Summarize what you learned at the end of the conversation.
- After each substantive answer, use the update_profiling_data tool to record it.
- Keep the call under 10 minutes.
- Speak naturally — no formatting, no bullet points."""

    try:
        gaps = ""
        with open("/srv/focus-flow/07_system/agent/profiling-checklist.json", "r") as f:
            checklist = json.load(f)
        overall = checklist.get("overall_completeness", 0)

        # Find top gaps
        priority_order = {"critical": 0, "high": 1, "medium": 2}
        gap_items = []
        for dk, domain in checklist.get("domains", {}).items():
            if domain["completeness"] >= 80:
                continue
            for item in domain.get("items", []):
                if item["status"] == "unknown":
                    gap_items.append({
                        "domain": dk,
                        "label": item["label"],
                        "priority": domain.get("priority", "medium"),
                    })
        gap_items.sort(key=lambda g: priority_order.get(g["priority"], 3))
        top_gaps = gap_items[:5]

        if top_gaps:
            gaps = "\n\nCurrent profiling gaps to explore (in priority order):\n"
            for g in top_gaps:
                gaps += f"- {g['domain']}: {g['label']}\n"
            gaps += f"\nOverall completeness: {overall}%. Target: 80%."

        return base + gaps
    except Exception:
        return base


class NitaraProfiler(Agent):
    """Profiling persona. Friendly, curious. Uses Claude directly for focused conversation."""

    def __init__(self, stt_instance=None, room=None, thread_id: str = ""):
        voice_id = PERSONA_VOICES["nitara-profiler"]
        stt = stt_instance or inference.STT(model="deepgram/nova-3")

        # Use Anthropic Claude directly for focused profiling (not orchestrator)
        if HAS_ANTHROPIC_PLUGIN and ANTHROPIC_API_KEY:
            llm_instance = anthropic_plugin.LLM(
                model="claude-sonnet-4-20250514",
                api_key=ANTHROPIC_API_KEY,
                temperature=0.7,
            )
            logger.info("Profiler using Claude Sonnet directly via Anthropic plugin")
        elif OPENCLAW_BASE_URL and OPENCLAW_TOKEN:
            # Fallback: use OpenClaw gateway (OpenAI-compatible)
            llm_instance = inference.LLM(
                model="anthropic/claude-sonnet-4-20250514",
                base_url=OPENCLAW_BASE_URL,
                api_key=OPENCLAW_TOKEN,
                temperature=0.7,
            )
            logger.info("Profiler using Claude via OpenClaw gateway")
        else:
            # Last resort: orchestrator
            llm_instance = OrchestratorLLM(backend_url=BACKEND_URL, room=room)
            if thread_id:
                llm_instance._thread_id = thread_id
            logger.info("Profiler falling back to orchestrator LLM")

        super().__init__(
            instructions=_build_profiler_instructions(),
            stt=stt,
            llm=llm_instance,
            tts=inference.TTS(model="cartesia/sonic-2", voice=voice_id),
        )

    @function_tool()
    async def update_profiling_data(self, domain: str, key: str, value: str, notes: str = "") -> str:
        """Update the profiling checklist with information learned from the conversation.
        Domains: founder_identity, skills_expertise, financial_reality, portfolio_depth,
        network_intelligence, strategic_context, operational_reality."""
        return await update_profiling_data(domain, key, value, notes)

    @function_tool()
    async def get_profiling_gaps(self) -> str:
        """Get the current profiling gaps to guide the conversation."""
        return await get_profiling_gaps()

    async def on_enter(self):
        self.session.generate_reply(
            instructions=(
                "Greet the founder warmly for this profiling session. "
                "Mention that you'd like to learn a bit more about them to be a better partner. "
                "Then use get_profiling_gaps to see what to ask about, and ask your first question."
            ),
            allow_interruptions=True,
        )


# ─── Metadata Extraction ─────────────────────────────────────────────────────

def extract_metadata(ctx: JobContext, participant) -> dict:
    """Extract voice preset, thread ID, project ID, deep mode from metadata."""
    voice_preset = "nova"
    thread_id = ""
    project_id = ""
    deep_mode = False

    # Participant metadata
    try:
        meta = json.loads(participant.metadata or "{}")
        voice_preset = meta.get("voicePreset", "nova")
        thread_id = meta.get("threadId", "")
        project_id = meta.get("projectId", "")
        deep_mode = meta.get("deepMode", False)
    except (json.JSONDecodeError, TypeError):
        pass

    # Room metadata (fallback)
    try:
        room_meta = json.loads(ctx.room.metadata or "{}")
        if voice_preset == "nova":
            voice_preset = room_meta.get("voicePreset", voice_preset)
        if not thread_id:
            thread_id = room_meta.get("threadId", thread_id)
        if not project_id:
            project_id = room_meta.get("projectId", project_id)
        if not deep_mode:
            deep_mode = room_meta.get("deepMode", deep_mode)
    except (json.JSONDecodeError, TypeError):
        pass

    if project_id and not deep_mode:
        deep_mode = True

    return {
        "voice_preset": voice_preset,
        "thread_id": thread_id,
        "project_id": project_id,
        "deep_mode": deep_mode,
    }


def detect_persona_from_metadata(ctx: JobContext, participant) -> str:
    """Detect which persona to use from room/participant metadata."""
    try:
        room_meta = json.loads(ctx.room.metadata or "{}")
        persona = room_meta.get("persona", "")
        if persona:
            return persona
    except (json.JSONDecodeError, TypeError):
        pass

    try:
        meta = json.loads(participant.metadata or "{}")
        persona = meta.get("persona", "")
        if persona:
            return persona
    except (json.JSONDecodeError, TypeError):
        pass

    return "nitara-main"


def is_sip_participant(participant) -> bool:
    """Check if participant joined via SIP (phone call)."""
    try:
        return participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
    except (AttributeError, TypeError):
        return False


# ─── Session Builder ──────────────────────────────────────────────────────────

def build_session(vad, using_sttv2: bool, is_sip: bool = False) -> AgentSession:
    """Build AgentSession with appropriate settings."""
    kwargs = {"vad": vad}

    if using_sttv2:
        kwargs["turn_detection"] = "stt"
        kwargs["min_endpointing_delay"] = 0.3
        kwargs["max_endpointing_delay"] = 3.0
    else:
        kwargs["min_endpointing_delay"] = 0.5
        kwargs["max_endpointing_delay"] = 5.0

    return AgentSession(**kwargs)


# ─── Entrypoint (handles all personas) ────────────────────────────────────────

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    meta = extract_metadata(ctx, participant)
    persona_name = detect_persona_from_metadata(ctx, participant)
    sip_call = is_sip_participant(participant)

    logger.info(
        f"Persona: {persona_name}, Voice: {meta['voice_preset']}, "
        f"Thread: {meta['thread_id']}, Project: {meta['project_id']}, "
        f"Deep: {meta['deep_mode']}, SIP: {sip_call}"
    )

    # Build STT with keyword boosting
    keywords = await fetch_keywords()
    stt_instance, using_sttv2 = build_stt(keywords)

    # Select persona
    if persona_name == "nitara-profiler":
        agent = NitaraProfiler(
            stt_instance=stt_instance, room=ctx.room,
            thread_id=meta["thread_id"],
        )
    elif persona_name == "nitara-analyst":
        agent = NitaraAnalyst(
            stt_instance=stt_instance, room=ctx.room,
            thread_id=meta["thread_id"],
        )
    else:
        agent = NitaraMain(
            voice_preset=meta["voice_preset"],
            thread_id=meta["thread_id"],
            project_id=meta["project_id"],
            deep_mode=meta["deep_mode"],
            stt_instance=stt_instance,
            room=ctx.room,
        )

    session = build_session(
        ctx.proc.userdata["vad"],
        using_sttv2,
        is_sip=sip_call,
    )

    await session.start(
        room=ctx.room,
        agent=agent,
        room_input_options=RoomInputOptions(),
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
            ws_url=os.getenv("LIVEKIT_URL", ""),
            api_key=os.getenv("LIVEKIT_API_KEY", ""),
            api_secret=os.getenv("LIVEKIT_API_SECRET", ""),
        ),
    )
