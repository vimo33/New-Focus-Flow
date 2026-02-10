#!/usr/bin/env python3
"""
Focus Flow Voice Agent — native macOS voice interface for Focus Flow threads.

Uses sox (rec) for audio capture, local Whisper for STT, macOS `say` for TTS,
and the Focus Flow threads REST API over Tailscale.

Usage:
    python3 focus-flow-voice.py                          # New conversation
    python3 focus-flow-voice.py --thread <id>            # Resume thread
    python3 focus-flow-voice.py --list                   # List recent threads
    python3 focus-flow-voice.py --stt whisper-cpp        # Use whisper.cpp backend
    python3 focus-flow-voice.py --voice Samantha          # Pick macOS TTS voice
"""

import argparse
import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import shutil

# ---------------------------------------------------------------------------
# Terminal colors
# ---------------------------------------------------------------------------

class C:
    BLUE = "\033[94m"
    GREEN = "\033[92m"
    DIM = "\033[2m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

def status(msg):
    print(f"{C.DIM}{msg}{C.RESET}")

def user_line(msg):
    print(f"\n{C.BOLD}{C.BLUE}You:{C.RESET} {msg}")

def assistant_line(msg):
    print(f"{C.BOLD}{C.GREEN}AI:{C.RESET} {msg}")

def error(msg):
    print(f"{C.RED}Error: {msg}{C.RESET}", file=sys.stderr)

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

def check_sox():
    if not shutil.which("rec"):
        error("sox is not installed. Install it with: brew install sox")
        sys.exit(1)

def check_say():
    if not shutil.which("say"):
        error("macOS `say` command not found. This script requires macOS.")
        sys.exit(1)

def detect_stt_backend():
    """Auto-detect the best available Whisper backend."""
    # 1. whisper.cpp CLI
    if shutil.which("whisper-cpp") or shutil.which("whisper"):
        for cmd in ("whisper-cpp", "whisper"):
            if shutil.which(cmd):
                return "whisper-cpp", cmd
    # 2. mlx-whisper
    try:
        import mlx_whisper  # noqa: F401
        return "mlx", None
    except ImportError:
        pass
    # 3. openai-whisper
    try:
        import whisper  # noqa: F401
        return "whisper", None
    except ImportError:
        pass
    return None, None

# ---------------------------------------------------------------------------
# STT — Whisper transcription
# ---------------------------------------------------------------------------

def transcribe(wav_path, backend, backend_cmd=None):
    """Transcribe a WAV file to text using the specified Whisper backend."""
    if backend == "whisper-cpp":
        return _transcribe_whisper_cpp(wav_path, backend_cmd or "whisper-cpp")
    elif backend == "mlx":
        return _transcribe_mlx(wav_path)
    elif backend == "whisper":
        return _transcribe_whisper(wav_path)
    else:
        error(f"Unknown STT backend: {backend}")
        return None

def _transcribe_whisper_cpp(wav_path, cmd):
    """Transcribe using whisper.cpp CLI."""
    try:
        result = subprocess.run(
            [cmd, "--file", wav_path, "--no-timestamps", "--print-progress", "false"],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            # Try alternate flag style (some builds use -f instead of --file)
            result = subprocess.run(
                [cmd, "-f", wav_path],
                capture_output=True, text=True, timeout=60
            )
        text = result.stdout.strip()
        # whisper.cpp sometimes wraps output in brackets
        if text.startswith("[") and "]" in text:
            # Strip timestamp lines like [00:00.000 --> 00:02.000]
            lines = text.split("\n")
            cleaned = []
            for line in lines:
                line = line.strip()
                if line.startswith("[") and "-->" in line and "]" in line:
                    # Extract text after the timestamp bracket
                    after_bracket = line.split("]", 1)[-1].strip()
                    if after_bracket:
                        cleaned.append(after_bracket)
                elif line:
                    cleaned.append(line)
            text = " ".join(cleaned)
        return text if text else None
    except FileNotFoundError:
        error(f"whisper.cpp command '{cmd}' not found")
        return None
    except subprocess.TimeoutExpired:
        error("Whisper.cpp transcription timed out")
        return None

def _transcribe_mlx(wav_path):
    """Transcribe using mlx-whisper."""
    try:
        import mlx_whisper
        result = mlx_whisper.transcribe(wav_path)
        return result.get("text", "").strip() or None
    except Exception as e:
        error(f"mlx-whisper transcription failed: {e}")
        return None

def _transcribe_whisper(wav_path):
    """Transcribe using openai-whisper."""
    try:
        import whisper
        model = whisper.load_model("base")
        result = model.transcribe(wav_path)
        return result.get("text", "").strip() or None
    except Exception as e:
        error(f"openai-whisper transcription failed: {e}")
        return None

# ---------------------------------------------------------------------------
# Audio recording via sox
# ---------------------------------------------------------------------------

def record_audio(wav_path):
    """Record from microphone until silence is detected. Returns True if audio was captured."""
    status("Listening... (speak now, stops after 1.5s of silence)")
    try:
        # rec: record 16kHz mono WAV, stop after 1.5s silence
        # silence 1 0.1 0.5% = start recording after 0.1s of sound above 0.5% threshold
        # 1 1.5 0.5%        = stop recording after 1.5s of sound below 0.5% threshold
        result = subprocess.run(
            [
                "rec", wav_path,
                "rate", "16k",
                "channels", "1",
                "silence", "1", "0.1", "0.5%",
                "1", "1.5", "0.5%",
            ],
            capture_output=True, text=True, timeout=120
        )
        # Check file was created and has content (> 1KB to filter noise-only)
        if os.path.exists(wav_path) and os.path.getsize(wav_path) > 1024:
            return True
        return False
    except subprocess.TimeoutExpired:
        error("Recording timed out after 2 minutes")
        return False
    except FileNotFoundError:
        error("sox `rec` command not found. Install: brew install sox")
        return False

# ---------------------------------------------------------------------------
# TTS — macOS say
# ---------------------------------------------------------------------------

def speak(text, voice=None):
    """Speak text using macOS say command."""
    cmd = ["say"]
    if voice:
        cmd.extend(["-v", voice])
    cmd.append(text)
    try:
        subprocess.run(cmd, timeout=120)
    except subprocess.TimeoutExpired:
        pass
    except FileNotFoundError:
        error("macOS `say` command not found")

# ---------------------------------------------------------------------------
# API client
# ---------------------------------------------------------------------------

class FocusFlowAPI:
    def __init__(self, server_url):
        self.base = server_url.rstrip("/")

    def health(self):
        """Check server health. Returns True if healthy."""
        try:
            # /health is at root, not under /api
            health_url = self.base.replace("/api", "") + "/health"
            r = _get(health_url, timeout=5)
            return r.get("status") == "healthy"
        except Exception:
            return False

    def list_threads(self):
        """List all threads."""
        return _get(f"{self.base}/threads")

    def get_thread(self, thread_id):
        """Get a thread with its messages."""
        return _get(f"{self.base}/threads/{thread_id}")

    def create_thread(self, title=None):
        """Create a new thread."""
        body = {}
        if title:
            body["title"] = title
        return _post(f"{self.base}/threads", body)

    def send_message(self, thread_id, content, source="voice"):
        """Send a message and get AI response."""
        return _post(f"{self.base}/threads/{thread_id}/messages", {
            "content": content,
            "source": source,
        })


def _get(url, timeout=30):
    import requests
    resp = requests.get(url, timeout=timeout)
    resp.raise_for_status()
    return resp.json()

def _post(url, data, timeout=60):
    import requests
    resp = requests.post(url, json=data, timeout=timeout)
    resp.raise_for_status()
    return resp.json()

# ---------------------------------------------------------------------------
# Thread listing display
# ---------------------------------------------------------------------------

def display_threads(api):
    """List recent threads and exit."""
    try:
        data = api.list_threads()
    except Exception as e:
        error(f"Failed to list threads: {e}")
        sys.exit(1)

    threads = data.get("threads", [])
    count = data.get("count", len(threads))

    if count == 0:
        print("No threads found.")
        return

    print(f"\n{C.BOLD}Recent threads ({count}):{C.RESET}\n")
    for t in threads[:20]:
        tid = t.get("id", "?")
        title = t.get("title", "Untitled")
        msgs = t.get("message_count", 0)
        updated = t.get("updated_at", "")[:16].replace("T", " ")
        preview = t.get("last_message_preview", "")
        if len(preview) > 60:
            preview = preview[:57] + "..."

        print(f"  {C.YELLOW}{tid}{C.RESET}")
        print(f"    {C.BOLD}{title}{C.RESET}  ({msgs} messages, updated {updated})")
        if preview:
            print(f"    {C.DIM}{preview}{C.RESET}")
        print()

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Focus Flow Voice Agent — talk to Focus Flow from your Mac",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                             Start new conversation
  %(prog)s --thread thread-20260210    Resume existing thread
  %(prog)s --list                      Show recent threads
  %(prog)s --stt whisper-cpp           Use whisper.cpp for STT
  %(prog)s --voice Samantha            Use specific macOS voice
        """,
    )
    parser.add_argument(
        "--server", default="http://focus-flow-new.tail49878c.ts.net:3001/api",
        help="Focus Flow API base URL (default: Tailscale URL)",
    )
    parser.add_argument(
        "--stt", choices=["whisper", "whisper-cpp", "mlx"],
        help="Whisper backend (default: auto-detect)",
    )
    parser.add_argument(
        "--thread", metavar="ID",
        help="Resume an existing thread by ID",
    )
    parser.add_argument(
        "--list", action="store_true",
        help="List recent threads and exit",
    )
    parser.add_argument(
        "--voice", default=None,
        help="macOS TTS voice name (e.g. Samantha, Daniel)",
    )
    args = parser.parse_args()

    api = FocusFlowAPI(args.server)

    # --list: show threads and exit
    if args.list:
        display_threads(api)
        sys.exit(0)

    # Check dependencies
    check_sox()
    check_say()

    # Detect STT backend
    if args.stt:
        stt_backend = args.stt
        stt_cmd = None
        if stt_backend == "whisper-cpp":
            for cmd in ("whisper-cpp", "whisper"):
                if shutil.which(cmd):
                    stt_cmd = cmd
                    break
            if not stt_cmd:
                error("whisper.cpp CLI not found in PATH")
                sys.exit(1)
    else:
        stt_backend, stt_cmd = detect_stt_backend()
        if not stt_backend:
            error(
                "No Whisper backend found. Install one of:\n"
                "  brew install whisper-cpp        # Recommended for Mac\n"
                "  pip3 install mlx-whisper         # Apple Silicon optimized\n"
                "  pip3 install openai-whisper       # Universal"
            )
            sys.exit(1)

    status(f"STT backend: {stt_backend}" + (f" ({stt_cmd})" if stt_cmd else ""))

    # Check server health
    status(f"Connecting to {args.server} ...")
    if not api.health():
        error(f"Cannot reach Focus Flow at {args.server}")
        error("Is the backend running? Is Tailscale connected?")
        sys.exit(1)
    status("Server is healthy.")

    # Create or resume thread
    thread_id = args.thread
    if thread_id:
        try:
            data = api.get_thread(thread_id)
            thread = data.get("thread", {})
            msgs = data.get("messages", [])
            title = thread.get("title", "Untitled")
            status(f"Resuming thread: {title} ({len(msgs)} messages)")
        except Exception as e:
            error(f"Cannot resume thread {thread_id}: {e}")
            sys.exit(1)
    else:
        try:
            thread = api.create_thread(title="Voice Conversation")
            thread_id = thread.get("id")
            status(f"Created new thread: {thread_id}")
        except Exception as e:
            error(f"Failed to create thread: {e}")
            sys.exit(1)

    # Ready
    greeting = "Ready. What would you like to talk about?"
    print(f"\n{C.BOLD}{C.GREEN}{greeting}{C.RESET}")
    print(f"{C.DIM}(Press Ctrl+C to exit){C.RESET}\n")
    speak(greeting, args.voice)

    # Graceful exit
    running = True

    def handle_sigint(sig, frame):
        nonlocal running
        running = False
        print(f"\n{C.DIM}Goodbye!{C.RESET}")
        speak("Goodbye!", args.voice)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    # Exit phrases
    exit_phrases = {"goodbye", "exit", "quit", "stop", "bye"}

    # Main conversation loop
    while running:
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            wav_path = tmp.name

        try:
            # Record
            if not record_audio(wav_path):
                status("No speech detected, try again...")
                continue

            # Transcribe
            status("Transcribing...")
            text = transcribe(wav_path, stt_backend, stt_cmd)

            if not text:
                status("Could not transcribe audio, try again...")
                continue

            # Filter out whisper hallucinations (common short phantom outputs)
            stripped = text.strip().lower().rstrip(".")
            if stripped in ("", "you", "thank you", "thanks for watching",
                            "thanks for watching!", "subtitles by the amara.org community"):
                status("(Filtered noise, listening again...)")
                continue

            user_line(text)

            # Check for exit phrases
            if stripped in exit_phrases:
                print(f"\n{C.DIM}Ending conversation.{C.RESET}")
                speak("Goodbye!", args.voice)
                break

            # Send to API
            status("Thinking...")
            try:
                resp = api.send_message(thread_id, text, source="voice")
            except Exception as e:
                error(f"API error: {e}")
                speak("Sorry, I had trouble reaching the server.", args.voice)
                continue

            assistant_msg = resp.get("assistant_message", {})
            reply = assistant_msg.get("content", "")

            if not reply:
                error("Empty response from server")
                continue

            assistant_line(reply)

            # Speak the response
            speak(reply, args.voice)

        finally:
            # Clean up temp file
            try:
                os.unlink(wav_path)
            except OSError:
                pass

    status(f"Thread ID: {thread_id} (use --thread {thread_id} to resume)")


if __name__ == "__main__":
    main()
