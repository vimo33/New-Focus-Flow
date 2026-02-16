import { AccessToken } from 'livekit-server-sdk';

export class LiveKitService {
  private apiKey: string;
  private apiSecret: string;
  private wsUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || '';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || '';
    this.wsUrl = process.env.LIVEKIT_URL || '';
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret && this.wsUrl);
  }

  getWsUrl(): string {
    return this.wsUrl;
  }

  async createToken(
    identity: string,
    roomName: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('LiveKit is not configured. Check LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL.');
    }

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      ttl: '2h',
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return await at.toJwt();
  }
}
