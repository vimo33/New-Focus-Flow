import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { networkImporterService } from '../services/network-importer.service';
import { networkGraphService } from '../services/network-graph.service';
import { pdlEnrichmentService } from '../services/pdl-enrichment.service';
import { sseManager } from '../services/sse-manager.service';
import { generateId } from '../utils/id-generator';

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

const csvUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted for Google Contacts import'));
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

// POST /api/network/import/google — Upload Google Contacts CSV
router.post('/network/import/google', csvUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No CSV file provided' });
    }

    const sseClientId = req.body.sse_client_id || undefined;
    const job = await networkImporterService.importGoogleCSV(file.path, sseClientId);

    res.status(201).json({ status: 'importing', job });
  } catch (error: any) {
    console.error('Error starting Google Contacts import:', error);
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

// GET /api/network/xref/:projectId — Cross-reference contacts with a project
router.get('/network/xref/:projectId', async (req: Request, res: Response) => {
  try {
    const result = await networkGraphService.getContactsForProject(String(req.params.projectId));
    res.json(result);
  } catch (error: any) {
    console.error('Error cross-referencing network:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/leverage/:projectId — Network leverage score for a project
router.get('/network/leverage/:projectId', async (req: Request, res: Response) => {
  try {
    const result = await networkGraphService.getNetworkLeverageScore(String(req.params.projectId));
    res.json(result);
  } catch (error: any) {
    console.error('Error computing network leverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/intros/:contactId — Introduction paths to a target contact
router.get('/network/intros/:contactId', async (req: Request, res: Response) => {
  try {
    const result = await networkGraphService.getIntroductionPaths(String(req.params.contactId));
    res.json(result);
  } catch (error: any) {
    console.error('Error finding intro paths:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/enrich/budget — PDL enrichment budget
router.get('/network/enrich/budget', async (_req: Request, res: Response) => {
  try {
    const usage = await pdlEnrichmentService.getUsage();
    res.json(usage);
  } catch (error: any) {
    console.error('Error fetching PDL budget:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/network/enrich — Enrich contacts with PDL
router.post('/network/enrich', async (req: Request, res: Response) => {
  try {
    if (!process.env.PDL_API_KEY) {
      return res.status(503).json({ error: 'PDL API key not configured' });
    }

    const { contact_ids } = req.body || {};
    const jobId = generateId('enr');

    let contacts;
    if (contact_ids && Array.isArray(contact_ids) && contact_ids.length > 0) {
      // Enrich specific contacts
      const all = await Promise.all(
        contact_ids.map((id: string) => networkImporterService.getContact(id))
      );
      contacts = all.filter(Boolean) as any[];
    } else {
      // Enrich all unenriched contacts
      contacts = await networkImporterService.getContacts();
    }

    const budget = await pdlEnrichmentService.getUsage();
    res.json({ status: 'enriching', job_id: jobId, budget: { used: budget.used, remaining: budget.remaining } });

    // Run enrichment in background
    pdlEnrichmentService.enrichBatch(contacts).catch(err => {
      console.error('[PDL] Batch enrichment error:', err.message);
    });
  } catch (error: any) {
    console.error('Error starting PDL enrichment:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/network/contacts/:id/interactions — Log an interaction
router.post('/network/contacts/:id/interactions', async (req: Request, res: Response) => {
  try {
    const { type, summary, project_id } = req.body;
    if (!type || !summary) {
      return res.status(400).json({ error: 'Missing required fields: type, summary' });
    }
    const interaction = await networkImporterService.addInteraction(
      String(req.params.id),
      { type, summary, project_id }
    );
    if (!interaction) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.status(201).json(interaction);
  } catch (error: any) {
    console.error('Error logging interaction:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/contacts/:id/interactions — Get interaction history
router.get('/network/contacts/:id/interactions', async (req: Request, res: Response) => {
  try {
    const interactions = await networkImporterService.getInteractions(String(req.params.id));
    res.json({ interactions, count: interactions.length });
  } catch (error: any) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/network/contacts/:id/outreach-draft — AI-generate outreach message
router.post('/network/contacts/:id/outreach-draft', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.body;
    if (!project_id) {
      return res.status(400).json({ error: 'Missing required field: project_id' });
    }
    const draft = await networkGraphService.generateOutreachDraft(
      String(req.params.id),
      project_id
    );
    res.json(draft);
  } catch (error: any) {
    console.error('Error generating outreach draft:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/network/dormant — Dormant high-value contacts
router.get('/network/dormant', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 90;
    const dormant = await networkGraphService.getDormantHighValue(days);
    res.json({
      dormant: dormant.map(d => ({
        contact_id: d.contact.id,
        full_name: d.contact.full_name,
        company: d.contact.company,
        position: d.contact.position,
        business_value: d.contact.business_value,
        days_dormant: d.days_dormant,
        value_types: d.value_types,
      })),
      count: dormant.length,
    });
  } catch (error: any) {
    console.error('Error fetching dormant contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/network/xref/:projectId/persist — Persist xref results to contact files
router.post('/network/xref/:projectId/persist', async (req: Request, res: Response) => {
  try {
    const updated = await networkGraphService.persistXrefResults(String(req.params.projectId));
    res.json({ ok: true, contacts_updated: updated });
  } catch (error: any) {
    console.error('Error persisting xref results:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/network/opportunities/:id/create-task — Convert opportunity to a vault task
router.post('/network/opportunities/:id/create-task', async (req: Request, res: Response) => {
  try {
    const { title, description, project_id, contact_names } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Missing required field: title' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const task = {
      id: generateId('tsk'),
      title,
      description: description || '',
      status: 'todo',
      priority: 'medium',
      tags: ['network', ...(contact_names || []).map((n: string) => `contact:${n}`)],
      project_id: project_id || undefined,
      due_date: dueDate.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      source: 'network-opportunity',
    };

    // Write task to vault
    const taskPath = path.join('/srv/focus-flow/01_tasks', `${task.id}.json`);
    fs.mkdirSync(path.dirname(taskPath), { recursive: true });
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    res.status(201).json(task);
  } catch (error: any) {
    console.error('Error creating task from opportunity:', error);
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
