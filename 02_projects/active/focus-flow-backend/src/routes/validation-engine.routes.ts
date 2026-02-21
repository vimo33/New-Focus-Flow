/**
 * Validation Engine Routes — Signal Strength, Pruning Recommendations, Enjoyment
 */

import { Router, Request, Response } from 'express';
import { signalStrengthService } from '../services/signal-strength.service';
import { enjoymentService } from '../services/enjoyment.service';
import { experimentExecutionService } from '../services/experiment-execution.service';
import { validationSprintService } from '../services/validation-sprint.service';
import { patternMemoryService } from '../services/pattern-memory.service';
import { agentMemoryService, AgentMemoryType } from '../services/agent-memory.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// ─── Signal Strength ────────────────────────────────────────────────────────

// GET /api/validation/overview — Dashboard aggregate stats
router.get('/validation/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const overview = await signalStrengthService.getOverview(req.teamId!);
    res.json(overview);
  } catch (error: any) {
    console.error('Error getting validation overview:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/signal-strength/:projectId — Latest score for a project
router.get('/validation/signal-strength/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const score = await signalStrengthService.getLatest(String(req.params.projectId));
    if (!score) {
      return res.status(404).json({ error: 'No signal strength score found for this project' });
    }
    res.json(score);
  } catch (error: any) {
    console.error('Error getting signal strength:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/signal-strength/history/:projectId — Score history
router.get('/validation/signal-strength/history/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await signalStrengthService.getHistory(String(req.params.projectId), days);
    res.json({ history, count: history.length });
  } catch (error: any) {
    console.error('Error getting signal strength history:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/validation/signal-strength/compute — Trigger recompute
router.post('/validation/signal-strength/compute', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;

    if (projectId) {
      const result = await signalStrengthService.computeForProject(projectId, req.teamId!);
      return res.json(result);
    }

    // Compute for all projects
    const results = await signalStrengthService.computeForAll(req.teamId!);
    res.json({ computed: results.length, results });
  } catch (error: any) {
    console.error('Error computing signal strength:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/pruning-recommendations — Kill/scale/park list
router.get('/validation/pruning-recommendations', requireAuth, async (req: Request, res: Response) => {
  try {
    const recommendations = await signalStrengthService.getPruningRecommendations(req.teamId!);
    res.json({ recommendations, count: recommendations.length });
  } catch (error: any) {
    console.error('Error getting pruning recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Enjoyment ──────────────────────────────────────────────────────────────

// POST /api/validation/enjoyment/:projectId — Record 1-5 enjoyment score
router.post('/validation/enjoyment/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { score, note } = req.body;

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    const entry = await enjoymentService.record({
      projectId: String(req.params.projectId),
      teamId: req.teamId!,
      score,
      note,
      createdBy: req.user!.id,
    });

    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error recording enjoyment:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/enjoyment/:projectId — Get enjoyment history
router.get('/validation/enjoyment/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await enjoymentService.getHistory(String(req.params.projectId), req.teamId!, limit);
    const latest = history.length > 0 ? history[0] : null;
    res.json({ latest, history, count: history.length });
  } catch (error: any) {
    console.error('Error getting enjoyment history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Experiment Plans ───────────────────────────────────────────────────────

// POST /api/validation/experiment-plans — Generate plan for an experiment
router.post('/validation/experiment-plans', requireAuth, async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.body;
    if (!experimentId) {
      return res.status(400).json({ error: 'Missing required field: experimentId' });
    }
    const plan = await experimentExecutionService.generatePlan(experimentId, req.teamId!);
    res.status(201).json(plan);
  } catch (error: any) {
    console.error('Error generating experiment plan:', error);
    res.status(error.message?.includes('already exists') ? 409 : 500).json({ error: error.message });
  }
});

// GET /api/validation/experiment-plans/:experimentId — Get plan with steps
router.get('/validation/experiment-plans/:experimentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const plan = await experimentExecutionService.getPlan(String(req.params.experimentId));
    if (!plan) {
      return res.status(404).json({ error: 'No plan found for this experiment' });
    }
    res.json(plan);
  } catch (error: any) {
    console.error('Error getting experiment plan:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/experiment-plans/:experimentId/timeline — Check timeline status
router.get('/validation/experiment-plans/:experimentId/timeline', requireAuth, async (req: Request, res: Response) => {
  try {
    const timeline = await experimentExecutionService.checkTimeline(String(req.params.experimentId));
    if (!timeline) {
      return res.status(404).json({ error: 'No plan found for this experiment' });
    }
    res.json(timeline);
  } catch (error: any) {
    console.error('Error checking timeline:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/validation/experiment-steps/:stepId — Mark step complete
router.patch('/validation/experiment-steps/:stepId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { result } = req.body;
    if (!result) {
      return res.status(400).json({ error: 'Missing required field: result' });
    }
    const updated = await experimentExecutionService.completeStep(
      String(req.params.stepId),
      result,
      req.teamId!
    );
    res.json(updated);
  } catch (error: any) {
    console.error('Error completing step:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Validation Sprints ─────────────────────────────────────────────────────

// POST /api/validation/sprints — Create a sprint
router.post('/validation/sprints', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, totalBudgetUsd } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Missing required field: name' });
    }
    const sprint = await validationSprintService.create({
      teamId: req.teamId!,
      name,
      totalBudgetUsd,
    });
    res.status(201).json(sprint);
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/sprints — List all sprints
router.get('/validation/sprints', requireAuth, async (req: Request, res: Response) => {
  try {
    const sprints = await validationSprintService.getAll(req.teamId!);
    res.json({ sprints, count: sprints.length });
  } catch (error: any) {
    console.error('Error listing sprints:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/sprints/:id — Get sprint detail
router.get('/validation/sprints/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const sprint = await validationSprintService.getById(String(req.params.id));
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found' });
    }
    res.json(sprint);
  } catch (error: any) {
    console.error('Error getting sprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/validation/sprints/:id/experiments — Add experiment to sprint
router.post('/validation/sprints/:id/experiments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { experimentId, budget } = req.body;
    if (!experimentId) {
      return res.status(400).json({ error: 'Missing required field: experimentId' });
    }
    const link = await validationSprintService.addExperiment(
      String(req.params.id),
      experimentId,
      budget
    );
    res.status(201).json(link);
  } catch (error: any) {
    console.error('Error adding experiment to sprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/validation/sprints/:id/start — Start a sprint
router.post('/validation/sprints/:id/start', requireAuth, async (req: Request, res: Response) => {
  try {
    const sprint = await validationSprintService.start(String(req.params.id), req.teamId!);
    res.json(sprint);
  } catch (error: any) {
    console.error('Error starting sprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/validation/sprints/:id/complete — Complete a sprint
router.post('/validation/sprints/:id/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const sprint = await validationSprintService.complete(String(req.params.id), req.teamId!);
    res.json(sprint);
  } catch (error: any) {
    console.error('Error completing sprint:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Pattern Memory ─────────────────────────────────────────────────────────

// GET /api/validation/patterns — List all patterns
router.get('/validation/patterns', requireAuth, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const patterns = await patternMemoryService.getAll(req.teamId!, category);
    res.json({ patterns, count: patterns.length });
  } catch (error: any) {
    console.error('Error listing patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/patterns/cross-project — Cross-project analysis
router.get('/validation/patterns/cross-project', requireAuth, async (req: Request, res: Response) => {
  try {
    const analysis = await patternMemoryService.getCrossProjectPatterns(req.teamId!);
    res.json(analysis);
  } catch (error: any) {
    console.error('Error getting cross-project patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/patterns/search — Search patterns
router.get('/validation/patterns/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter: q' });
    }
    const patterns = await patternMemoryService.search(q, req.teamId!);
    res.json({ patterns, count: patterns.length });
  } catch (error: any) {
    console.error('Error searching patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/validation/patterns/suggest/:projectId — Suggest relevant patterns
router.get('/validation/patterns/suggest/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const suggestions = await patternMemoryService.suggestPatternsForProject(
      String(req.params.projectId),
      req.teamId!
    );
    res.json({ suggestions, count: suggestions.length });
  } catch (error: any) {
    console.error('Error suggesting patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/validation/patterns/extract/:experimentId — Manually trigger extraction
router.post('/validation/patterns/extract/:experimentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const patterns = await patternMemoryService.extractFromExperiment(
      String(req.params.experimentId),
      req.teamId!
    );
    res.json({ patterns, count: patterns.length });
  } catch (error: any) {
    console.error('Error extracting patterns:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Agent Memory ──────────────────────────────────────────────────────────

// POST /api/memory/agent — Write structured memory from agent skills
router.post('/memory/agent', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, content, projectId, experimentId, outcome, contactId, category, relatedProjects, confidence } = req.body;

    if (!type || !content) {
      return res.status(400).json({ error: 'Missing required fields: type, content' });
    }

    switch (type as AgentMemoryType) {
      case 'experiment_outcome':
        await agentMemoryService.recordExperimentOutcome(
          experimentId || 'unknown',
          projectId || 'unknown',
          outcome || 'inconclusive',
          content
        );
        break;

      case 'pattern':
        await agentMemoryService.recordPattern(
          content,
          category || 'success_pattern',
          relatedProjects || [],
          confidence || 0.7
        );
        break;

      case 'decision_context':
        await agentMemoryService.recordDecisionContext(
          projectId || 'unknown',
          category || 'unknown',
          content,
          relatedProjects || []
        );
        break;

      case 'network_insight':
        await agentMemoryService.recordNetworkInsight(
          contactId || 'unknown',
          projectId || null,
          content
        );
        break;

      case 'validation_insight':
        await agentMemoryService.recordValidationInsight(
          projectId || 'unknown',
          content
        );
        break;

      case 'playbook_step':
        await agentMemoryService.recordPlaybookStep(
          projectId || 'unknown',
          content,
          category || ''
        );
        break;

      default:
        return res.status(400).json({ error: `Unknown memory type: ${type}` });
    }

    res.json({ ok: true, type, stored: true });
  } catch (error: any) {
    console.error('Error recording agent memory:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/memory/agent/search — Search agent memories by type
router.get('/memory/agent/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const types = req.query.types ? (req.query.types as string).split(',') as AgentMemoryType[] : [];
    const projectId = req.query.projectId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter: q' });
    }

    const results = await agentMemoryService.getRelevantMemories(projectId || null, query, types, limit);
    res.json({ memories: results, count: results.length });
  } catch (error: any) {
    console.error('Error searching agent memories:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
