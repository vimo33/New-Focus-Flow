const BRIDGE_URL = 'http://127.0.0.1:8473';
const HEALTH_TIMEOUT = 2000;
const HEALTH_CACHE_MS = 30_000;

interface HealthResponse {
  status: string;
  stt: boolean;
  tts: boolean;
}

class VoiceBridge {
  private _sttAvailable = false;
  private _ttsAvailable = false;
  private _healthy = false;
  private _lastHealthCheck = 0;
  private _healthPromise: Promise<HealthResponse | null> | null = null;

  get sttAvailable() { return this._sttAvailable; }
  get ttsAvailable() { return this._ttsAvailable; }
  get isHealthy() { return this._healthy; }

  async checkHealth(): Promise<HealthResponse | null> {
    const now = Date.now();

    // Return cached result if fresh
    if (now - this._lastHealthCheck < HEALTH_CACHE_MS && this._healthy) {
      return { status: 'ok', stt: this._sttAvailable, tts: this._ttsAvailable };
    }

    // Deduplicate concurrent calls
    if (this._healthPromise) return this._healthPromise;

    this._healthPromise = this._doHealthCheck();
    try {
      return await this._healthPromise;
    } finally {
      this._healthPromise = null;
    }
  }

  private async _doHealthCheck(): Promise<HealthResponse | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT);

      const res = await fetch(`${BRIDGE_URL}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: HealthResponse = await res.json();
      this._sttAvailable = !!data.stt;
      this._ttsAvailable = !!data.tts;
      this._healthy = true;
      this._lastHealthCheck = Date.now();
      return data;
    } catch {
      this._sttAvailable = false;
      this._ttsAvailable = false;
      this._healthy = false;
      this._lastHealthCheck = 0;
      return null;
    }
  }

  async transcribe(audioBlob: Blob): Promise<string> {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');

    const res = await fetch(`${BRIDGE_URL}/stt`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) throw new Error(`STT failed: HTTP ${res.status}`);

    const data = await res.json();
    return data.text ?? '';
  }

  async synthesize(text: string, speed = 1.0): Promise<Blob> {
    const res = await fetch(`${BRIDGE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, speed }),
    });

    if (!res.ok) throw new Error(`TTS failed: HTTP ${res.status}`);

    return res.blob();
  }
}

export const voiceBridge = new VoiceBridge();
