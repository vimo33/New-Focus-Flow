import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';

const TOKEN_PATH = '/srv/focus-flow/07_system/secrets/.queue-api-token';

let cachedToken: Buffer | null = null;
let tokenLoadedAt = 0;
const TOKEN_CACHE_TTL_MS = 60_000; // Re-read from disk every 60s

function loadToken(): Buffer | null {
  const now = Date.now();
  if (cachedToken && (now - tokenLoadedAt) < TOKEN_CACHE_TTL_MS) {
    return cachedToken;
  }
  try {
    const raw = fs.readFileSync(TOKEN_PATH, 'utf-8').trim();
    if (!raw) return null;
    cachedToken = Buffer.from(raw);
    tokenLoadedAt = now;
    return cachedToken;
  } catch {
    return null;
  }
}

export function queueAuth(req: Request, res: Response, next: NextFunction): void {
  const expected = loadToken();

  if (!expected) {
    console.error('[QueueAuth] Token file not configured at', TOKEN_PATH);
    res.status(500).json({ error: 'Queue API authentication not configured' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Bearer token required' });
    return;
  }

  const provided = Buffer.from(parts[1]);

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
}
