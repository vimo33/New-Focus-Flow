import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string; role: string };
      teamId?: string;
    }
  }
}

/**
 * Auth middleware — extracts Bearer token from Authorization header,
 * validates session, attaches req.user and req.teamId.
 * Returns 401 if no valid session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = await authService.validateSession(token);
    if (session) {
      req.user = session.user;
      req.teamId = session.teamId;
      return next();
    }
  }

  // Dev mode fallback — allow unauthenticated access with a default user
  if (process.env.NODE_ENV !== 'production') {
    req.user = { id: 'dev-user', email: 'dev@nitara.local', name: 'Dev User', role: 'owner' };
    req.teamId = 'dev-team';
    return next();
  }

  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Optional auth — same as requireAuth but doesn't fail if no token.
 * For endpoints that work with or without auth.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const session = await authService.validateSession(token);
    if (session) {
      req.user = session.user;
      req.teamId = session.teamId;
    }
  }
  next();
}
