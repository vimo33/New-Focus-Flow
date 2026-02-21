import { Router, Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register — Register a new user and team
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name' });
    }

    const result = await authService.register({ email, password, name });
    res.status(201).json({
      user: result.user,
      team: result.team,
      token: result.token,
    });
  } catch (error: any) {
    console.error('Error in /auth/register:', error);
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login — Authenticate and return session token
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    const result = await authService.login({ email, password });
    if (!result) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      user: result.user,
      team: result.team,
      token: result.token,
    });
  } catch (error: any) {
    console.error('Error in /auth/login:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/logout — Invalidate current session
router.post('/auth/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader!.slice(7);
    await authService.logout(token);
    res.json({ status: 'logged_out' });
  } catch (error: any) {
    console.error('Error in /auth/logout:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me — Return current user and team info
router.get('/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userInfo = await authService.getUserInfo(req.user!.id, req.teamId);
    if (!userInfo) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      user: userInfo.user,
      team: userInfo.team,
    });
  } catch (error: any) {
    console.error('Error in /auth/me:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
