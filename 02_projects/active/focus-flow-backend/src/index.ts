import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import threadRoutes from './routes/threads.routes';
import voiceRoutes from './routes/voice.routes';
import memoryRoutes from './routes/memory.routes';
import orchestratorChatRoutes from './routes/orchestrator-chat.routes';
import crmRoutes from './routes/crm.routes';
import salesRoutes from './routes/sales.routes';
import focusSessionRoutes from './routes/focus-session.routes';
import designRoutes from './routes/design.routes';
import pipelineRoutes from './routes/pipeline.routes';
import uploadRoutes from './routes/upload.routes';
import decisionsRoutes from './routes/decisions.routes';
import inferenceRoutes from './routes/inference.routes';
import toolsRoutes from './routes/tools.routes';
import councilRoutes from './routes/council.routes';
import agentRoutes from './routes/agent.routes';
import profileRoutes from './routes/profile.routes';
import financialsRoutes from './routes/financials.routes';
import incomeStrategyRoutes from './routes/income-strategy.routes';
import networkRoutes from './routes/network.routes';
import portfolioRoutes from './routes/portfolio.routes';
import weeklyReportRoutes from './routes/weekly-report.routes';
import marketingRoutes from './routes/marketing.routes';
import confidenceRoutes from './routes/confidence.routes';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://167.235.63.193',
  'https://focus-flow-new.tail49878c.ts.net',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Global rate limiter: 200 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use(globalLimiter);

// Stricter rate limit for AI endpoints (expensive operations)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded, please wait before retrying' },
});

app.use(bodyParser.json({ limit: '1mb' }));
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
    service: 'nitara-backend',
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
app.use('/api/orchestrator', aiLimiter, orchestratorRoutes);
app.use('/api', securityRoutes);
app.use('/api', threadRoutes);
app.use('/api', voiceRoutes);
app.use('/api', memoryRoutes);
app.use('/api/orchestrator', aiLimiter, orchestratorChatRoutes);
app.use('/api', crmRoutes);
app.use('/api', salesRoutes);
app.use('/api', focusSessionRoutes);
app.use('/api', designRoutes);
app.use('/api', pipelineRoutes);
app.use('/api', uploadRoutes);
app.use('/api', decisionsRoutes);
app.use('/api', inferenceRoutes);
app.use('/api', toolsRoutes);
app.use('/api', aiLimiter, councilRoutes);
app.use('/api', agentRoutes);
app.use('/api', profileRoutes);
app.use('/api', financialsRoutes);
app.use('/api', incomeStrategyRoutes);
app.use('/api', networkRoutes);
app.use('/api', portfolioRoutes);
app.use('/api', weeklyReportRoutes);
app.use('/api', marketingRoutes);
app.use('/api', confidenceRoutes);

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
  console.log('🚀 Nitara Backend API Server');
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
  console.log('  POST   /api/threads');
  console.log('  GET    /api/threads');
  console.log('  GET    /api/threads/:id');
  console.log('  POST   /api/threads/:id/messages');
  console.log('  PUT    /api/threads/:id');
  console.log('  DELETE /api/threads/:id');
  console.log('  POST   /api/voice-command/classify');
  console.log('  GET    /api/voice-command/status');
  console.log('  GET    /api/memory/search');
  console.log('  GET    /api/memory');
  console.log('  GET    /api/memory/health');
  console.log('  DELETE /api/memory/:id');
  console.log('  POST   /api/orchestrator/chat');
  console.log('  GET    /api/orchestrator/threads');
  console.log('  POST   /api/orchestrator/threads');
  console.log('  GET    /api/orchestrator/threads/:id');
  console.log('  POST   /api/pipeline/:projectId/start');
  console.log('  GET    /api/pipeline/:projectId/status');
  console.log('  POST   /api/pipeline/:projectId/review');
  console.log('  POST   /api/decisions');
  console.log('  GET    /api/decisions');
  console.log('  GET    /api/decisions/:id');
  console.log('  PUT    /api/decisions/:id');
  console.log('  DELETE /api/decisions/:id');
  console.log('  GET    /api/memory/project/:projectId');
  console.log('  GET    /api/memory/project/:projectId/context');
  console.log('  POST   /api/memory/project/:projectId');
  console.log('==========================================');
});

export default app;
