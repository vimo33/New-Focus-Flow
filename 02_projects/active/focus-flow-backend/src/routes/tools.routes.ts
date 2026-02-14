import { Router, Request, Response } from 'express';
import { toolRegistry } from '../services/tool-registry.service';
import { toolRunner } from '../services/tool-runner.service';

const router = Router();

/** GET /api/tools — list all registered tools */
router.get('/tools', (_req: Request, res: Response) => {
  const tools = toolRegistry.getAll();
  res.json(tools);
});

/** GET /api/tools/:toolId — get single tool manifest */
router.get('/tools/:toolId', (req: Request, res: Response) => {
  const toolId = req.params.toolId as string;
  const manifest = toolRegistry.getById(toolId);
  if (!manifest) {
    res.status(404).json({ error: `Tool '${toolId}' not found` });
    return;
  }
  res.json(manifest);
});

/** POST /api/tools/:toolId/execute — execute a tool */
router.post('/tools/:toolId/execute', async (req: Request, res: Response) => {
  try {
    const toolId = req.params.toolId as string;
    const result = await toolRunner.execute(toolId, req.body);
    const status = result.success ? 200 : 400;
    res.status(status).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** POST /api/tools/reload — hot-reload manifests */
router.post('/tools/reload', async (_req: Request, res: Response) => {
  try {
    const count = await toolRegistry.reload();
    res.json({ status: 'reloaded', tool_count: count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
