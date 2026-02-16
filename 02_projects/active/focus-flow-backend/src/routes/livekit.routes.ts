import { Router, Request, Response } from 'express';
import { LiveKitService } from '../services/livekit.service';
import { VaultService } from '../services/vault.service';
import { crmService } from '../services/crm.service';
import { founderProfileService } from '../services/founder-profile.service';

const router = Router();
const livekit = new LiveKitService();

// POST /api/livekit/token — generate a LiveKit JWT for a client
router.post('/livekit/token', async (req: Request, res: Response) => {
  try {
    if (!livekit.isConfigured()) {
      return res.status(503).json({ error: 'LiveKit is not configured' });
    }

    const { threadId, voicePreset, roomName: requestedRoom, projectId, deepMode } = req.body || {};

    const roomName = requestedRoom || `nitara-voice-${Date.now()}`;
    const identity = `user-${Date.now()}`;

    const metadata: Record<string, any> = {};
    if (threadId) metadata.threadId = threadId;
    if (voicePreset) metadata.voicePreset = voicePreset;
    if (projectId) metadata.projectId = projectId;
    if (deepMode) metadata.deepMode = deepMode;

    const token = await livekit.createToken(identity, roomName, metadata);

    res.json({
      token,
      roomName,
      wsUrl: livekit.getWsUrl(),
      identity,
    });
  } catch (error: any) {
    console.error('Error creating LiveKit token:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/livekit/status — check if LiveKit is configured
router.get('/livekit/status', (_req: Request, res: Response) => {
  res.json({
    configured: livekit.isConfigured(),
    wsUrl: livekit.isConfigured() ? livekit.getWsUrl() : null,
  });
});

// GET /api/livekit/keywords — domain-specific keywords for STT boosting
router.get('/livekit/keywords', async (_req: Request, res: Response) => {
  try {
    const keywords: string[] = [];
    const vaultService = new VaultService();

    // Add project names
    try {
      const projects = await vaultService.getProjects();
      for (const p of projects) {
        if (p.title) keywords.push(`${p.title}:2`);
      }
    } catch { /* skip */ }

    // Add contact names
    try {
      const contacts = await crmService.getContacts();
      for (const c of contacts.slice(0, 50)) {
        if (c.name) keywords.push(`${c.name}:2`);
      }
    } catch { /* skip */ }

    // Add founder name
    try {
      const profile = await founderProfileService.getProfile();
      if (profile?.name) keywords.push(`${profile.name}:2`);
    } catch { /* skip */ }

    // Add core platform terms
    keywords.push(
      'Nitara:2', 'Focus Flow:2', 'Vimo:2',
      'Kavach:2', 'Bramha:2', 'OpenClaw:2',
    );

    res.json({ keywords, count: keywords.length });
  } catch (error: any) {
    console.error('Error building keywords:', error);
    res.json({ keywords: [], count: 0 });
  }
});

export default router;
