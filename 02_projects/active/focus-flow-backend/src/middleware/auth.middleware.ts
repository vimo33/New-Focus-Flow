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
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  const session = await authService.validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.user = session.user;
  req.teamId = session.teamId;
  next();
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
