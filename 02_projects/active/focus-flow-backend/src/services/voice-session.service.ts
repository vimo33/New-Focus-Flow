/**
 * Voice Session Service — manages outbound calls, session tracking, and DND enforcement.
 *
 * Uses LiveKit SIP client for outbound call dispatch and agent dispatch for persona selection.
 */

import fs from 'fs';
import path from 'path';
import { SipClient, AgentDispatchClient } from 'livekit-server-sdk';
import { getVaultPath, readJsonFile, writeJsonFile, ensureDir } from '../utils/file-operations';

const LOG_PREFIX = '[VoiceSession]';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DndSchedule {
  quiet_hours: { start: string; end: string; timezone: string };
  max_outbound_calls_per_day: number;
  critical_alert_override: { enabled: boolean; delay_minutes: number };
}

interface VoiceSession {
  id: string;
  room_name: string;
  persona: string;
  phone_number?: string;
  reason: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'active' | 'completed' | 'failed' | 'dnd_blocked';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
}

interface OutboundCallRequest {
  phone_number: string;
  persona: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSIONS_DIR = getVaultPath('07_system', 'agent', 'voice-sessions');
const DND_CONFIG_PATH = '/srv/focus-flow/02_projects/active/livekit-agent/config/dnd_schedule.json';
const DAILY_CALL_LOG_DIR = getVaultPath('07_system', 'agent', 'voice-sessions', 'daily');

// ─── Service ─────────────────────────────────────────────────────────────────

class VoiceSessionService {
  private sipClient: SipClient | null = null;
  private agentDispatch: AgentDispatchClient | null = null;
  private dndSchedule: DndSchedule | null = null;

  constructor() {
    ensureDir(SESSIONS_DIR).catch(() => {});
    ensureDir(DAILY_CALL_LOG_DIR).catch(() => {});
    this.loadDndSchedule();
  }

  private initClients(): void {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      console.warn(`${LOG_PREFIX} LiveKit credentials not configured`);
      return;
    }

    // Convert wss:// to https:// for API calls
    const httpUrl = url.replace('wss://', 'https://');

    if (!this.sipClient) {
      this.sipClient = new SipClient(httpUrl, apiKey, apiSecret);
    }
    if (!this.agentDispatch) {
      this.agentDispatch = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
    }
  }

  private loadDndSchedule(): void {
    try {
      if (fs.existsSync(DND_CONFIG_PATH)) {
        this.dndSchedule = JSON.parse(fs.readFileSync(DND_CONFIG_PATH, 'utf-8'));
      }
    } catch (err) {
      console.warn(`${LOG_PREFIX} Failed to load DND schedule:`, err);
    }
  }

  // ─── DND Enforcement ────────────────────────────────────────────────────

  isDndActive(): boolean {
    if (!this.dndSchedule) return false;

    const { quiet_hours } = this.dndSchedule;
    const now = new Date();

    // Simple hour-based check (timezone-aware would need a library)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startH, startM] = quiet_hours.start.split(':').map(Number);
    const [endH, endM] = quiet_hours.end.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }
    return currentTime >= startTime && currentTime < endTime;
  }

  async getDailyCallCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(DAILY_CALL_LOG_DIR, `${today}.json`);
    try {
      const data = await readJsonFile<{ count: number }>(logPath);
      return data?.count || 0;
    } catch {
      return 0;
    }
  }

  private async incrementDailyCallCount(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(DAILY_CALL_LOG_DIR, `${today}.json`);
    const current = await this.getDailyCallCount();
    await writeJsonFile(logPath, { date: today, count: current + 1 });
  }

  canMakeOutboundCall(priority: string): { allowed: boolean; reason?: string } {
    // Critical alerts can override DND after delay
    if (priority === 'critical' && this.dndSchedule?.critical_alert_override?.enabled) {
      return { allowed: true };
    }

    if (this.isDndActive()) {
      return { allowed: false, reason: 'Do Not Disturb is active (quiet hours)' };
    }

    return { allowed: true };
  }

  // ─── Outbound Call Dispatch ──────────────────────────────────────────────

  async makeOutboundCall(request: OutboundCallRequest): Promise<VoiceSession> {
    this.initClients();

    // Check DND
    const dndCheck = this.canMakeOutboundCall(request.priority);
    if (!dndCheck.allowed) {
      const session = this.createSessionRecord({
        persona: request.persona,
        phone_number: request.phone_number,
        reason: request.reason,
        direction: 'outbound',
        status: 'dnd_blocked',
      });
      console.log(`${LOG_PREFIX} Outbound call blocked by DND: ${dndCheck.reason}`);
      return session;
    }

    // Check daily limit
    const maxCalls = this.dndSchedule?.max_outbound_calls_per_day || 3;
    const dailyCount = await this.getDailyCallCount();
    if (dailyCount >= maxCalls && request.priority !== 'critical') {
      const session = this.createSessionRecord({
        persona: request.persona,
        phone_number: request.phone_number,
        reason: request.reason,
        direction: 'outbound',
        status: 'dnd_blocked',
      });
      console.log(`${LOG_PREFIX} Daily call limit reached (${dailyCount}/${maxCalls})`);
      return session;
    }

    if (!this.sipClient || !this.agentDispatch) {
      throw new Error('LiveKit clients not initialized — check credentials');
    }

    const outboundTrunkId = process.env.SIP_OUTBOUND_TRUNK_ID;
    if (!outboundTrunkId) {
      throw new Error('SIP_OUTBOUND_TRUNK_ID not configured');
    }

    const roomName = `nitara-call-${Date.now()}`;

    try {
      // 1. Dispatch the agent to the room first
      const metadata = JSON.stringify({
        persona: request.persona,
        reason: request.reason,
        phone_number: request.phone_number,
        ...(request.metadata || {}),
      });

      await this.agentDispatch.createDispatch(roomName, 'nitara-voice', { metadata });
      console.log(`${LOG_PREFIX} Agent dispatched to room ${roomName} with persona ${request.persona}`);

      // 2. Create SIP participant to dial the phone
      const sipParticipant = await this.sipClient.createSipParticipant(
        outboundTrunkId,
        request.phone_number,
        roomName,
        {
          participantIdentity: 'phone_user',
          participantName: 'Founder',
          krispEnabled: true,
          playDialtone: true,
          waitUntilAnswered: false,
          maxCallDuration: 600, // 10 minutes max
          ringingTimeout: 30,
        }
      );

      console.log(`${LOG_PREFIX} SIP participant created, dialing ${request.phone_number}`);

      await this.incrementDailyCallCount();

      const session = this.createSessionRecord({
        room_name: roomName,
        persona: request.persona,
        phone_number: request.phone_number,
        reason: request.reason,
        direction: 'outbound',
        status: 'ringing',
      });

      await this.saveSession(session);
      return session;
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Outbound call failed:`, err.message);

      const session = this.createSessionRecord({
        room_name: roomName,
        persona: request.persona,
        phone_number: request.phone_number,
        reason: request.reason,
        direction: 'outbound',
        status: 'failed',
      });

      await this.saveSession(session);
      throw err;
    }
  }

  // ─── Session Management ──────────────────────────────────────────────────

  private createSessionRecord(opts: Partial<VoiceSession>): VoiceSession {
    return {
      id: `vs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      room_name: opts.room_name || '',
      persona: opts.persona || 'nitara-main',
      phone_number: opts.phone_number,
      reason: opts.reason || '',
      direction: opts.direction || 'outbound',
      status: opts.status || 'active',
      started_at: new Date().toISOString(),
    };
  }

  private async saveSession(session: VoiceSession): Promise<void> {
    const filePath = path.join(SESSIONS_DIR, `${session.id}.json`);
    await writeJsonFile(filePath, session);
  }

  async getSession(id: string): Promise<VoiceSession | null> {
    const filePath = path.join(SESSIONS_DIR, `${id}.json`);
    return readJsonFile<VoiceSession>(filePath);
  }

  async getRecentSessions(limit: number = 20): Promise<VoiceSession[]> {
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json') && f.startsWith('vs-'))
        .sort()
        .reverse()
        .slice(0, limit);

      const sessions: VoiceSession[] = [];
      for (const file of files) {
        const s = await readJsonFile<VoiceSession>(path.join(SESSIONS_DIR, file));
        if (s) sessions.push(s);
      }
      return sessions;
    } catch {
      return [];
    }
  }

  // ─── Status ──────────────────────────────────────────────────────────────

  getStatus(): Record<string, any> {
    return {
      dnd_active: this.isDndActive(),
      dnd_schedule: this.dndSchedule?.quiet_hours || null,
      sip_configured: !!(process.env.SIP_OUTBOUND_TRUNK_ID),
      livekit_configured: !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY),
    };
  }
}

export const voiceSessionService = new VoiceSessionService();
