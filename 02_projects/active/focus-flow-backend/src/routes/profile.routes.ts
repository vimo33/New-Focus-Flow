import { Router, Request, Response } from 'express';
import { founderProfileService } from '../services/founder-profile.service';

const router = Router();

// GET /api/profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await founderProfileService.getProfile();
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await founderProfileService.saveProfile(req.body);
    res.json({ status: 'updated', profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profile/skills
router.post('/profile/skills', async (req: Request, res: Response) => {
  try {
    const profile = await founderProfileService.addSkill(req.body);
    res.status(201).json({ status: 'created', profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profile/experience
router.post('/profile/experience', async (req: Request, res: Response) => {
  try {
    const profile = await founderProfileService.addExperience(req.body);
    res.status(201).json({ status: 'created', profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/profile/archetype
router.put('/profile/archetype', async (req: Request, res: Response) => {
  try {
    const profile = await founderProfileService.setArchetype(req.body.archetype);
    res.json({ status: 'updated', profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profile/extract
router.post('/profile/extract', async (req: Request, res: Response) => {
  try {
    const extracted = await founderProfileService.extractProfileFromText(req.body.text);
    res.json({ status: 'extracted', profile: extracted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
