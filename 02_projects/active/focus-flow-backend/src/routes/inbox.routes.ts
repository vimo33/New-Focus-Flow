import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';
import { classificationService } from '../services/classification.service';
import { CaptureRequest, ProcessInboxRequest } from '../models/types';

const router = Router();
const vaultService = new VaultService();

// POST /api/capture - Quick capture
router.post('/capture', async (req: Request, res: Response) => {
  try {
    const captureReq: CaptureRequest = req.body;

    if (!captureReq.text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const inboxItem = await vaultService.createInboxItem({
      text: captureReq.text,
      prefix: captureReq.prefix,
      source: captureReq.source || 'api',
      metadata: captureReq.metadata
    });

    // Return immediately to user (non-blocking)
    res.status(201).json({
      id: inboxItem.id,
      status: 'created',
      item: inboxItem
    });

    // Run classification in background (async, non-blocking)
    // This will not delay the response to the user
    classificationService.classifyInboxItemAsync(inboxItem.id).catch(error => {
      console.error(`Background classification failed for item ${inboxItem.id}:`, error);
    });
  } catch (error: any) {
    console.error('Error creating inbox item:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inbox - List inbox items
router.get('/inbox', async (req: Request, res: Response) => {
  try {
    const filter = req.query.filter as string | undefined;
    const items = await vaultService.getInboxItems(filter);

    res.json({
      items,
      count: items.length
    });
  } catch (error: any) {
    console.error('Error fetching inbox items:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inbox/counts - Get inbox counts
router.get('/inbox/counts', async (req: Request, res: Response) => {
  try {
    const counts = await vaultService.getInboxCounts();
    res.json(counts);
  } catch (error: any) {
    console.error('Error fetching inbox counts:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inbox/:id - Get single inbox item
router.get('/inbox/:id', async (req: Request, res: Response) => {
  try {
    const item = await vaultService.getInboxItem(String(req.params.id));

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    res.json(item);
  } catch (error: any) {
    console.error('Error fetching inbox item:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inbox/:id/process - Process inbox item
router.post('/inbox/:id/process', async (req: Request, res: Response) => {
  try {
    const processReq: ProcessInboxRequest = req.body;

    if (!processReq.action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    await vaultService.processInboxItem(String(req.params.id), processReq);

    res.json({
      status: 'processed',
      action: processReq.action
    });
  } catch (error: any) {
    console.error('Error processing inbox item:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inbox/:id/classify - Manually trigger classification for an item
router.post('/inbox/:id/classify', async (req: Request, res: Response) => {
  try {
    const item = await vaultService.getInboxItem(String(req.params.id));

    if (!item) {
      return res.status(404).json({ error: 'Inbox item not found' });
    }

    const classifiedItem = await classificationService.classifyInboxItem(item);

    res.json({
      status: 'classified',
      item: classifiedItem
    });
  } catch (error: any) {
    console.error('Error classifying inbox item:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/inbox/classify-all - Classify all unclassified items
router.post('/inbox/classify-all', async (req: Request, res: Response) => {
  try {
    // Start classification in background
    classificationService.classifyAllUnclassified().catch(error => {
      console.error('Batch classification failed:', error);
    });

    res.json({
      status: 'started',
      message: 'Batch classification started in background'
    });
  } catch (error: any) {
    console.error('Error starting batch classification:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
