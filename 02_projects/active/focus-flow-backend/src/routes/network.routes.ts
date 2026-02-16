import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { networkImporterService } from '../services/network-importer.service';
import { networkGraphService } from '../services/network-graph.service';
import { sseManager } from '../services/sse-manager.service';

const router = Router();

// Upload directory for LinkedIn ZIP files
const IMPORT_UPLOAD_DIR = '/srv/focus-flow/00_inbox/raw/imports';

if (!fs.existsSync(IMPORT_UPLOAD_DIR)) {
  fs.mkdirSync(IMPORT_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, IMPORT_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are accepted for LinkedIn import'));
    }
  },
});

// POST /api/network/import/linkedin — Upload LinkedIn ZIP
router.post('/network/import/linkedin', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No ZIP file provided' });
    }

    const sseClientId = req.body.sse_client_id || undefined;
    const job = await networkImporterService.importLinkedInZip(file.path, sseClientId);

    res.status(201).json({ status: 'importing', job });
  } catch (error: any) {
    console.error('Error starting LinkedIn import:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/import/status — SSE stream for import progress
router.get('/network/import/status', (req: Request, res: Response) => {
  const clientId = sseManager.register(res);
  // Client will receive import_progress events via SSE
});

// GET /api/network/import/:jobId — Get specific job status
router.get('/network/import/:jobId', async (req: Request, res: Response) => {
  try {
    const job = await networkImporterService.getJob(String(req.params.jobId));
    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }
    res.json(job);
  } catch (error: any) {
    console.error('Error fetching import job:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/contacts — List contacts with search/filter
router.get('/network/contacts', async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const relationship = req.query.relationship as string | undefined;
    const contacts = await networkImporterService.getContacts(search, relationship);
    res.json({ contacts, count: contacts.length });
  } catch (error: any) {
    console.error('Error listing contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/contacts/:id — Get single contact
router.get('/network/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await networkImporterService.getContact(String(req.params.id));
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/network/contacts/:id — Update contact
router.put('/network/contacts/:id', async (req: Request, res: Response) => {
  try {
    const contact = await networkImporterService.updateContact(String(req.params.id), req.body);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(contact);
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/graph — Network graph summary
router.get('/network/graph', async (req: Request, res: Response) => {
  try {
    const summary = await networkGraphService.getGraphSummary();
    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching network graph:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/opportunities — AI-suggested opportunities
router.get('/network/opportunities', async (req: Request, res: Response) => {
  try {
    const opportunities = await networkGraphService.getOpportunities();
    res.json({ opportunities, count: opportunities.length });
  } catch (error: any) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multer error handling
router.use((err: any, _req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
