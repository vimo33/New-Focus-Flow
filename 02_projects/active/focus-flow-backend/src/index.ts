import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Load secrets from secure location (must happen after dotenv, before routes)
import { loadOpenClawSecrets } from './config/load-secrets';
loadOpenClawSecrets();

// Import routes
import inboxRoutes from './routes/inbox.routes';
import tasksRoutes from './routes/tasks.routes';
import projectsRoutes from './routes/projects.routes';
import ideasRoutes from './routes/ideas.routes';
import healthRoutes from './routes/health.routes';
import aiRoutes from './routes/ai.routes';
import { VaultService } from './services/vault.service';
import orchestratorRoutes from './routes/orchestrator.routes';
import securityRoutes from './routes/security.routes';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'focus-flow-backend',
    version: '1.0.0'
  });
});

// API routes
app.use('/api', inboxRoutes);
app.use('/api', tasksRoutes);
app.use('/api', projectsRoutes);
app.use('/api', ideasRoutes);
app.use('/api', healthRoutes);
app.use('/api', aiRoutes);
app.use('/api/orchestrator', orchestratorRoutes);
app.use('/api', securityRoutes);

// Dashboard summary endpoint
app.get('/api/summary', async (req: Request, res: Response) => {
  try {
    const vault = new VaultService();
    const [inboxCounts, projects, tasks, inboxItems] = await Promise.all([
      vault.getInboxCounts(),
      vault.getProjects('active'),
      vault.getTasks(),
      vault.getInboxItems(),
    ]);

    // Build recent activity from newest inbox items
    const recent_activity = inboxItems.slice(0, 10).map(item => ({
      type: 'inbox' as const,
      text: item.text.substring(0, 100),
      timestamp: item.created_at,
    }));

    res.json({
      inbox_counts: inboxCounts,
      active_projects_count: projects.length,
      tasks_today: tasks.filter(t => t.status !== 'done').length,
      recent_activity,
    });
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 Focus Flow Backend API Server');
  console.log('==========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
  console.log('==========================================');
  console.log('Available endpoints:');
  console.log('  POST   /api/capture');
  console.log('  GET    /api/inbox');
  console.log('  GET    /api/inbox/counts');
  console.log('  GET    /api/inbox/:id');
  console.log('  POST   /api/inbox/:id/process');
  console.log('  POST   /api/inbox/:id/classify');
  console.log('  POST   /api/inbox/classify-all');
  console.log('  GET    /api/tasks');
  console.log('  POST   /api/tasks');
  console.log('  PUT    /api/tasks/:id');
  console.log('  GET    /api/projects');
  console.log('  POST   /api/projects');
  console.log('  GET    /api/ideas');
  console.log('  POST   /api/ideas');
  console.log('  POST   /api/health/log');
  console.log('  GET    /api/summary');
  console.log('  POST   /api/ideas/:id/validate');
  console.log('  POST   /api/classify/:id');
  console.log('  GET    /api/ai/status');
  console.log('  POST   /api/orchestrator/prd/:ideaId');
  console.log('  GET    /api/orchestrator/runs/:runId');
  console.log('  GET    /api/orchestrator/runs');
  console.log('  GET    /api/security/status');
  console.log('  GET    /api/security/audit-log');
  console.log('==========================================');
});

export default app;
