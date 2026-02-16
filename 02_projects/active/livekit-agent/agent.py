import logging
import json
import os
import asyncio

import aiohttp
from dotenv import load_dotenv
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
)
from livekit.plugins import silero

try:
    from livekit.plugins import deepgram as deepgram_plugin
    HAS_DEEPGRAM_PLUGIN = True
except ImportError:
    HAS_DEEPGRAM_PLUGIN = False

load_dotenv()
logger = logging.getLogger("nitara-voice")

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3001")
SOUL_PATH = os.getenv("SOUL_PATH", "/srv/focus-flow/07_system/NITARA_SOUL.md")

# Cartesia voice presets
VOICE_PRESETS = {
    "nova": "f786b574-daa5-4673-aa0c-cbe3e8534c02",
    "atlas": "228fca29-3a0a-435c-8728-5cb483251068",
    "lyra": "6ccbfb76-1fc6-48f7-b71d-91ac6298247b",
}


def get_voice_id(preset_name: str) -> str:
    return VOICE_PRESETS.get(preset_name.lower(), VOICE_PRESETS["nova"])


def load_soul_instructions() -> str:
    """Load NITARA_SOUL.md for the voice agent's personality framing."""
    try:
        with open(SOUL_PATH, "r") as f:
            soul = f.read()
        # Extract just the identity + personality sections for voice brevity
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


class OrchestratorLLM(llm.LLM):
    """Custom LLM that routes through the Focus Flow orchestrator API.

    Instead of calling an LLM directly, this sends user messages to
    POST /api/orchestrator/chat which has access to all 40+ tools,
    memory, prompt injection detection, and the full system prompt.
    """

    def __init__(self, backend_url: str = BACKEND_URL, project_id: str = "", deep_mode: bool = False):
        super().__init__()
        self._backend_url = backend_url
        self._http_session: aiohttp.ClientSession | None = None
        self._project_id = project_id
        self._deep_mode = deep_mode

    async def _ensure_session(self) -> aiohttp.ClientSession:
        if self._http_session is None or self._http_session.closed:
            self._http_session = aiohttp.ClientSession()
        return self._http_session

    async def aclose(self) -> None:
        if self._http_session and not self._http_session.closed:
            await self._http_session.close()

    def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool] | None = None,
        conn_options: APIConnectOptions = APIConnectOptions(),
        **kwargs,
    ) -> "OrchestratorLLMStream":
        return OrchestratorLLMStream(
            self,
            chat_ctx=chat_ctx,
            tools=tools or [],
            conn_options=conn_options,
        )


class OrchestratorLLMStream(llm.LLMStream):
    """Streams orchestrator response as ChatChunks."""

    def __init__(
        self,
        orchestrator_llm: OrchestratorLLM,
        *,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        conn_options: APIConnectOptions,
    ):
        super().__init__(
            orchestrator_llm,
            chat_ctx=chat_ctx,
            tools=tools,
            conn_options=conn_options,
        )
        self._orchestrator_llm = orchestrator_llm

    async def _run(self) -> None:
        """Send the latest user message to the orchestrator and stream the response."""
        # Extract the last user message from chat context
        user_message = ""
        for msg in reversed(self._chat_ctx.items):
            if hasattr(msg, 'role') and msg.role == 'user':
                # Get text content from the message
                if hasattr(msg, 'content'):
                    if isinstance(msg.content, str):
                        user_message = msg.content
                    elif isinstance(msg.content, list):
                        user_message = " ".join(
                            p.text if hasattr(p, 'text') else str(p)
                            for p in msg.content
                            if hasattr(p, 'text')
                        )
                break
            elif hasattr(msg, 'type') and msg.type == 'message' and hasattr(msg, 'role') and msg.role == 'user':
                if hasattr(msg, 'text_content'):
                    user_message = msg.text_content
                break

        if not user_message:
            # Fallback: try to get text from items
            for item in reversed(self._chat_ctx.items):
                text = getattr(item, 'text_content', None) or getattr(item, 'text', None)
                role = getattr(item, 'role', None)
                if text and role == 'user':
                    user_message = text
                    break

        if not user_message:
            # This is likely the on_enter() greeting call — send greeting intent
            thread_id = getattr(self._orchestrator_llm, '_thread_id', '')
            try:
                session = await self._orchestrator_llm._ensure_session()
                url = f"{self._orchestrator_llm._backend_url}/api/orchestrator/chat"
                payload = {
                    "content": "",
                    "source": "voice",
                    "intent": "greeting",
                }
                if thread_id:
                    payload["thread_id"] = thread_id
                if self._orchestrator_llm._project_id:
                    payload["project_id"] = self._orchestrator_llm._project_id

                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status >= 400:
                        raise Exception(f"HTTP {resp.status}")
                    data = await resp.json()

                if data.get("thread_id"):
                    self._orchestrator_llm._thread_id = data["thread_id"]

                content = data.get("content", "Hey Vimo. I'm here. What would you like to work on?")
                self._event_ch.send_nowait(
                    llm.ChatChunk(
                        id="orchestrator-greeting",
                        delta=llm.ChoiceDelta(role="assistant", content=content),
                    )
                )
            except Exception as e:
                logger.error(f"Greeting intent failed: {e}")
                self._event_ch.send_nowait(
                    llm.ChatChunk(
                        id="orchestrator-greeting-fallback",
                        delta=llm.ChoiceDelta(role="assistant", content="Hey Vimo. I'm here. What would you like to work on?"),
                    )
                )
            return

        logger.info(f"Orchestrator request: {user_message[:100]}")

        # Get or create thread ID stored on the LLM instance
        thread_id = getattr(self._orchestrator_llm, '_thread_id', '')

        try:
            session = await self._orchestrator_llm._ensure_session()
            url = f"{self._orchestrator_llm._backend_url}/api/orchestrator/chat"
            payload = {
                "content": user_message,
                "source": "voice",
            }
            if thread_id:
                payload["thread_id"] = thread_id
            if self._orchestrator_llm._project_id:
                payload["project_id"] = self._orchestrator_llm._project_id
            if self._orchestrator_llm._deep_mode:
                payload["deep_mode"] = True

            async with session.post(
                url,
                json=payload,
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status >= 400:
                    error_text = await resp.text()
                    logger.error(f"Orchestrator error {resp.status}: {error_text}")
                    self._event_ch.send_nowait(
                        llm.ChatChunk(
                            id="orchestrator-error",
                            delta=llm.ChoiceDelta(
                                role="assistant",
                                content="I'm having trouble connecting to my brain right now. Give me a moment.",
                            ),
                        )
                    )
                    return

                data = await resp.json()

            # Persist thread ID for subsequent calls
            if data.get("thread_id"):
                self._orchestrator_llm._thread_id = data["thread_id"]

            content = data.get("content", "")
            if not content:
                content = "Done."

            logger.info(f"Orchestrator response: {content[:100]}")

            # Send the full response as a single chunk (orchestrator doesn't stream)
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id=f"orchestrator-{data.get('thread_id', 'unknown')}",
                    delta=llm.ChoiceDelta(role="assistant", content=content),
                )
            )

        except asyncio.TimeoutError:
            logger.error("Orchestrator request timed out")
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id="orchestrator-timeout",
                    delta=llm.ChoiceDelta(
                        role="assistant",
                        content="That's taking longer than expected. Let me try a simpler approach.",
                    ),
                )
            )
        except Exception as e:
            logger.error(f"Orchestrator request failed: {e}")
            self._event_ch.send_nowait(
                llm.ChatChunk(
                    id="orchestrator-fail",
                    delta=llm.ChoiceDelta(
                        role="assistant",
                        content="Something went wrong on my end. Could you try again?",
                    ),
                )
            )


class NitaraAssistant(Agent):
    def __init__(self, voice_preset: str = "nova", thread_id: str = "",
                 project_id: str = "", deep_mode: bool = False,
                 stt_instance=None):
        voice_id = get_voice_id(voice_preset)
        orchestrator_llm = OrchestratorLLM(
            backend_url=BACKEND_URL,
            project_id=project_id,
            deep_mode=deep_mode,
        )
        # Pre-set thread ID if provided from room/participant metadata
        if thread_id:
            orchestrator_llm._thread_id = thread_id

        # Use Deepgram plugin with keywords if available, else fallback to inference STT
        stt = stt_instance or inference.STT(model="deepgram/nova-3")

        super().__init__(
            instructions=load_soul_instructions(),
            stt=stt,
            llm=orchestrator_llm,
            tts=inference.TTS(model="cartesia/sonic-2", voice=voice_id),
        )
        self._thread_id = thread_id

    async def on_enter(self):
        self.session.generate_reply(
            instructions="Generate a contextual greeting for the founder.",
            allow_interruptions=True,
        )


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    participant = await ctx.wait_for_participant()
    logger.info(f"Participant joined: {participant.identity}")

    # Read voice preset, thread_id, project_id, deep_mode from participant metadata
    voice_preset = "nova"
    thread_id = ""
    project_id = ""
    deep_mode = False
    try:
        meta = json.loads(participant.metadata or "{}")
        voice_preset = meta.get("voicePreset", "nova")
        thread_id = meta.get("threadId", "")
        project_id = meta.get("projectId", "")
        deep_mode = meta.get("deepMode", False)
    except (json.JSONDecodeError, TypeError):
        pass

    # Also check room metadata
    try:
        room_meta = json.loads(ctx.room.metadata or "{}")
        if not voice_preset or voice_preset == "nova":
            voice_preset = room_meta.get("voicePreset", voice_preset)
        if not thread_id:
            thread_id = room_meta.get("threadId", thread_id)
        if not project_id:
            project_id = room_meta.get("projectId", project_id)
        if not deep_mode:
            deep_mode = room_meta.get("deepMode", deep_mode)
    except (json.JSONDecodeError, TypeError):
        pass

    # Auto-enable deep mode when in project context
    if project_id and not deep_mode:
        deep_mode = True

    logger.info(f"Voice preset: {voice_preset}, Thread ID: {thread_id}, Project: {project_id}, Deep: {deep_mode}")

    # Build STT with keyword boosting if Deepgram plugin is available
    stt_instance = None
    if HAS_DEEPGRAM_PLUGIN:
        keywords = await fetch_keywords()
        if keywords:
            logger.info(f"Loaded {len(keywords)} keywords for STT boosting")
            try:
                stt_instance = deepgram_plugin.STT(
                    model="nova-3",
                    language="en",
                    keywords=keywords,
                )
            except Exception as e:
                logger.warning(f"Deepgram plugin init failed, falling back: {e}")

    agent = NitaraAssistant(
        voice_preset=voice_preset,
        thread_id=thread_id,
        project_id=project_id,
        deep_mode=deep_mode,
        stt_instance=stt_instance,
    )

    session = AgentSession(
        vad=ctx.proc.userdata["vad"],
        min_endpointing_delay=0.5,
        max_endpointing_delay=5.0,
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
