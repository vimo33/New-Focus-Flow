import { Router, Request, Response } from 'express';
import { knowledgeGraphService, EntityType } from '../services/knowledge-graph.service';

const router = Router();

const VALID_TYPES: EntityType[] = ['market', 'competitor', 'person', 'project', 'opportunity', 'technology'];

// GET /api/knowledge-graph/stats
router.get('/knowledge-graph/stats', async (req: Request, res: Response) => {
  try {
    const stats = await knowledgeGraphService.getStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/entities/:type
router.get('/knowledge-graph/entities/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string as EntityType;
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `Invalid entity type. Valid: ${VALID_TYPES.join(', ')}` });
      return;
    }
    const entities = await knowledgeGraphService.getAllLatestEntities(type);
    res.json({ type, count: entities.length, entities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/entities/:type/:name/history
router.get('/knowledge-graph/entities/:type/:name/history', async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string as EntityType;
    const name = decodeURIComponent(req.params.name as string);
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `Invalid entity type` });
      return;
    }
    const history = await knowledgeGraphService.getEntityHistory(type, name);
    res.json({ type, name, versions: history.length, history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge-graph/entities
router.post('/knowledge-graph/entities', async (req: Request, res: Response) => {
  try {
    const { entity_type, name, data, source_report } = req.body;
    if (!entity_type || !name || !data || !source_report) {
      res.status(400).json({ error: 'Required: entity_type, name, data, source_report' });
      return;
    }
    if (!VALID_TYPES.includes(entity_type)) {
      res.status(400).json({ error: `Invalid entity type` });
      return;
    }
    const entity = await knowledgeGraphService.appendEntity({ entity_type, name, data, source_report });
    res.status(201).json(entity);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/search?q=...&type=...
router.get('/knowledge-graph/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const type = req.query.type as string | undefined;
    if (!q) {
      res.status(400).json({ error: 'Query parameter q required' });
      return;
    }
    const validType = type && VALID_TYPES.includes(type as EntityType) ? type as EntityType : undefined;
    const results = await knowledgeGraphService.searchEntities(q, validType);
    res.json({ query: q, count: results.length, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/relationships?entity=...
router.get('/knowledge-graph/relationships', async (req: Request, res: Response) => {
  try {
    const entityId = req.query.entity as string | undefined;
    const rels = await knowledgeGraphService.getRelationships(entityId);
    res.json({ count: rels.length, relationships: rels });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge-graph/relationships
router.post('/knowledge-graph/relationships', async (req: Request, res: Response) => {
  try {
    const { source, target, type, weight, evidence, source_report } = req.body;
    if (!source || !target || !type || !source_report) {
      res.status(400).json({ error: 'Required: source, target, type, source_report' });
      return;
    }
    const rel = await knowledgeGraphService.appendRelationship({
      source, target, type, weight: weight || 1, evidence: evidence || '', source_report,
    });
    res.status(201).json(rel);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/decisions
router.get('/knowledge-graph/decisions', async (req: Request, res: Response) => {
  try {
    const evaluated = req.query.evaluated === 'true' ? true : req.query.evaluated === 'false' ? false : undefined;
    const project_id = req.query.project_id as string | undefined;
    const decisions = await knowledgeGraphService.getDecisions({ evaluated, project_id });
    res.json({ count: decisions.length, decisions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/knowledge-graph/decisions
router.post('/knowledge-graph/decisions', async (req: Request, res: Response) => {
  try {
    const { recommendation, project_id, predicted_outcome, confidence, tracking_criteria, source_report } = req.body;
    if (!recommendation || !predicted_outcome || !source_report) {
      res.status(400).json({ error: 'Required: recommendation, predicted_outcome, source_report' });
      return;
    }
    const dec = await knowledgeGraphService.recordDecision({
      recommendation, project_id, predicted_outcome,
      confidence: confidence || 0.5,
      tracking_criteria: tracking_criteria || [],
      source_report,
    });
    res.status(201).json(dec);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/knowledge-graph/decisions/:id/evaluate
router.put('/knowledge-graph/decisions/:id/evaluate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { actual_outcome, accuracy_score } = req.body;
    if (!actual_outcome || accuracy_score === undefined) {
      res.status(400).json({ error: 'Required: actual_outcome, accuracy_score' });
      return;
    }
    const dec = await knowledgeGraphService.evaluateDecision(id, actual_outcome, accuracy_score);
    if (!dec) {
      res.status(404).json({ error: 'Decision not found' });
      return;
    }
    res.json(dec);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/decisions/accuracy
router.get('/knowledge-graph/decisions/accuracy', async (req: Request, res: Response) => {
  try {
    const accuracy = await knowledgeGraphService.getDecisionAccuracy();
    res.json(accuracy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/knowledge-graph/contradictions
router.get('/knowledge-graph/contradictions', async (req: Request, res: Response) => {
  try {
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
    const contradictions = await knowledgeGraphService.getContradictions(resolved);
    res.json({ count: contradictions.length, contradictions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/knowledge-graph/contradictions/:id/resolve
router.put('/knowledge-graph/contradictions/:id/resolve', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { resolution } = req.body;
    if (!resolution) {
      res.status(400).json({ error: 'Required: resolution' });
      return;
    }
    const c = await knowledgeGraphService.resolveContradiction(id, resolution);
    if (!c) {
      res.status(404).json({ error: 'Contradiction not found' });
      return;
    }
    res.json(c);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
