# Focus Flow OS - Revised Full Stack Implementation Plan

**Date:** 2026-02-03
**Scope:** Complete full-stack autonomous productivity system
**Backend:** Node.js + Express + TypeScript
**Timeline:** 8-10 weeks

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    INPUT LAYER                              │
│  Telegram Bot • PWA UI • Voice (Web Speech API)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 BACKEND API SERVER                          │
│  Node.js + Express + TypeScript + WebSocket                │
│  REST Endpoints • File Operations • Business Logic         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                 INTELLIGENCE LAYER                          │
│  Claude API • AI Council • Auto-Classification             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   MEMORY & STORAGE                          │
│  Vault (/srv/focus-flow) • mem0 • Qdrant                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases (Revised)

### Phase 1: ✅ Foundation (COMPLETE)
- Fresh vault structure at `/srv/focus-flow`
- Docker services configured
- Security (UFW, Tailscale)
- Agent framework (20 agents + 8 hooks)

### Phase 2: 🔄 Frontend Scaffolding (25% Complete)
- React + Vite + TypeScript
- Tailwind CSS design system
- Router and state management
- **Next:** Basic layout and routing

### Phase 3: Backend API Server (NEW)
**Duration:** 2-3 weeks

Build Node.js backend with TypeScript:

#### 3.1 Project Setup
```bash
/srv/focus-flow/02_projects/active/focus-flow-backend/
├── src/
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── models/          # TypeScript types/interfaces
│   ├── middleware/      # Express middleware
│   ├── utils/           # Vault file operations
│   └── index.ts         # Entry point
├── tests/
├── package.json
└── tsconfig.json
```

#### 3.2 Core API Endpoints

**Capture:**
- `POST /api/capture` - Quick capture text/voice/image

**Inbox:**
- `GET /api/inbox` - List items (filters: all/work/personal/ideas)
- `GET /api/inbox/:id` - Get single item
- `POST /api/inbox/:id/process` - Process item (action: task/project/idea/archive/delete)
- `GET /api/inbox/counts` - Get counts by category

**Tasks:**
- `GET /api/tasks` - List tasks (filters: work/personal/scheduled)
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Projects:**
- `GET /api/projects` - List projects (filters: active/paused/completed)
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `GET /api/projects/:id/tasks` - Get project tasks

**Ideas:**
- `GET /api/ideas` - List ideas (filters: inbox/validated/rejected)
- `POST /api/ideas` - Create idea
- `PUT /api/ideas/:id` - Update idea (validate/reject)

**Health:**
- `POST /api/health/log` - Log health metrics
- `GET /api/health/metrics` - Get health data (filters: date range, metric type)
- `GET /api/health/trends` - Get trends and analytics

**Summary:**
- `GET /api/summary` - Dashboard summary (inbox counts, active projects, recent activity)

#### 3.3 File Operations Service

Interact with `/srv/focus-flow` vault:

```typescript
// src/services/vault.service.ts
class VaultService {
  // Inbox operations
  createInboxItem(text: string, metadata?: object): Promise<string>
  getInboxItems(filter?: string): Promise<InboxItem[]>
  processInboxItem(id: string, action: ProcessAction): Promise<void>

  // Task operations
  createTask(task: Task): Promise<string>
  updateTask(id: string, updates: Partial<Task>): Promise<void>

  // Project operations (Markdown frontmatter + content)
  createProject(project: Project): Promise<string>
  getProjectDetails(id: string): Promise<Project>

  // Health logging (CSV format)
  logHealthMetric(metric: HealthMetric): Promise<void>
  getHealthMetrics(filters: HealthFilters): Promise<HealthMetric[]>
}
```

#### 3.4 WebSocket for Real-Time Updates

```typescript
// src/websocket/events.ts
enum WSEvent {
  INBOX_NEW_ITEM = 'inbox:new',
  INBOX_PROCESSED = 'inbox:processed',
  TASK_CREATED = 'task:created',
  PROJECT_UPDATED = 'project:updated',
  AI_CLASSIFICATION_COMPLETE = 'ai:classification:complete'
}
```

### Phase 4: Telegram Bot (NEW)
**Duration:** 1 week

Build Telegram bot with Telegraf:

#### 4.1 Bot Commands

```typescript
/start - Welcome message and setup
/capture <text> - Quick capture to inbox
/inbox - Show inbox counts
/inbox work - Show work inbox items
/inbox personal - Show personal inbox items
/process <id> - Process inbox item
/projects - List active projects
/task <text> - Create task quickly
/health <metric> <value> - Log health metric
/help - Show all commands
```

#### 4.2 Features
- Voice note transcription (Whisper API)
- Image OCR (extract text from images)
- Document parsing (PDF, TXT)
- Inline keyboards for quick actions
- User authentication via Telegram ID

#### 4.3 Integration
- REST API client to backend server
- Real-time notifications via webhook
- Polling mode for development

### Phase 5: AI Integration Layer (NEW)
**Duration:** 1-2 weeks

#### 5.1 Claude API Client

```typescript
// src/ai/claude-client.ts
class ClaudeClient {
  generateText(prompt: string, context?: string): Promise<string>
  classifyInboxItem(text: string): Promise<Classification>
  validateIdea(idea: string, criteria: string[]): Promise<Validation>
  generateProjectSpec(description: string): Promise<ProjectSpec>
}
```

#### 5.2 AI Council (Multi-Agent Debate)

Three perspectives for idea validation:
1. **Pragmatist**: Feasibility and resources
2. **Visionary**: Innovation and impact
3. **Skeptic**: Risks and challenges

```typescript
// src/ai/ai-council.ts
class AICouncil {
  validateIdea(idea: Idea): Promise<CouncilVerdict> {
    // Each agent provides perspective
    // Synthesize final recommendation
    // Store debate transcript
  }
}
```

#### 5.3 Auto-Classification

Background job to classify inbox items:
- **Work**: Project-related, business tasks
- **Personal**: Home, family, errands
- **Ideas**: Innovation, brainstorming, future projects
- **Health**: Wellbeing, fitness, mental health

#### 5.4 Spec-Kit Integration

Generate project specifications:
- Requirements analysis
- Technical approach
- Resource estimation
- Risk assessment

### Phase 6: mem0 Integration (NEW)
**Duration:** 3-5 days

#### 6.1 Personal Memory Layer

Store and retrieve:
- User preferences (work style, communication)
- Decision patterns
- Project history
- Health baseline metrics
- Interaction history

#### 6.2 Context Retrieval

Enhance AI responses with personal context:
```typescript
// src/services/memory.service.ts
class MemoryService {
  storeMemory(type: MemoryType, content: any): Promise<void>
  retrieveContext(query: string): Promise<ContextData>
  updatePreferences(preferences: UserPreferences): Promise<void>
}
```

### Phase 7: Frontend Screen Development
**Duration:** 2-3 weeks

Build 10 screens (parallel execution with agents):

**Priority 0 (Core):**
1. Dashboard - Summary view
2. Quick Capture - Input form
3. Inbox Processing - Item list + actions

**Priority 1 (Projects & Ideas):**
4. Projects Management - Project cards
5. Project Workspace - Details + tasks
6. Ideas Explorer - Idea grid + validation

**Priority 2 (Advanced):**
7. Calendar & Time Blocking
8. Wellbeing Tracker - Health metrics + charts
9. Voice Cockpit AI - Voice input interface

**Priority 3:**
10. Item Processing Panel - Quick actions

### Phase 8: Frontend-Backend Integration
**Duration:** 1 week

- Replace mock data with API calls
- Add WebSocket for real-time updates
- Implement optimistic UI updates
- Error handling and loading states
- Offline mode with service worker

### Phase 9: PWA Polish
**Duration:** 3-5 days

- Manifest.json
- App icons (72x72, 192x192, 512x512)
- iOS meta tags
- Offline functionality
- Push notifications
- Lighthouse optimization (>90 all categories)

### Phase 10: Deployment & Monitoring
**Duration:** 2-3 days

- Dockerfile for backend API
- Dockerfile for Telegram bot
- Docker Compose orchestration
- Coolify deployment pipeline
- Logging and monitoring
- Health checks and alerts

---

## Technology Stack

### Backend
- **Runtime:** Node.js 22
- **Framework:** Express.js
- **Language:** TypeScript
- **Validation:** Zod
- **Logging:** Winston
- **WebSocket:** socket.io
- **Job Queue:** Bull (for AI processing)
- **Testing:** Jest + Supertest

### Frontend (Existing)
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router 6
- **State:** Zustand
- **Testing:** Playwright + Jest

### Telegram Bot
- **Framework:** Telegraf
- **Transcription:** OpenAI Whisper API
- **OCR:** Tesseract.js

### AI/ML
- **LLM:** Anthropic Claude API (Sonnet 3.5)
- **Memory:** mem0 SDK
- **Vector DB:** Qdrant
- **Embeddings:** Anthropic embeddings

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Deployment:** Coolify
- **Reverse Proxy:** Nginx (via Tailscale)
- **VPN:** Tailscale
- **Firewall:** UFW

---

## API Specification Example

### POST /api/capture
**Request:**
```json
{
  "text": "Schedule dentist appointment for next week",
  "prefix": "🦷",
  "source": "telegram",
  "metadata": {
    "telegram_user_id": 123456789,
    "timestamp": "2026-02-03T00:30:00Z"
  }
}
```

**Response:**
```json
{
  "id": "inbox-20260203-001",
  "status": "created",
  "classification": {
    "category": "personal",
    "confidence": 0.92,
    "suggested_action": "task"
  }
}
```

### GET /api/inbox?filter=work
**Response:**
```json
{
  "items": [
    {
      "id": "inbox-20260203-001",
      "text": "Review Q1 budget proposal",
      "category": "work",
      "created_at": "2026-02-03T10:15:00Z",
      "source": "pwa",
      "ai_classification": {
        "category": "work",
        "confidence": 0.95,
        "suggested_project": "finance-q1"
      }
    }
  ],
  "count": 12,
  "filters": {
    "work": 5,
    "personal": 4,
    "ideas": 3
  }
}
```

---

## Development Workflow

### 1. Backend First Approach
- Build API endpoints
- Test with Postman/curl
- Document with OpenAPI/Swagger
- Unit tests with Jest

### 2. Telegram Bot
- Develop bot commands
- Test in Telegram
- Integrate with backend API

### 3. AI Integration
- Implement Claude API client
- Build AI Council
- Auto-classification background jobs

### 4. Frontend Development
- Build screens with mock data first
- Connect to real API
- Add WebSocket for real-time

### 5. Integration Testing
- End-to-end workflows
- Real user scenarios
- Performance testing

---

## Next Immediate Actions

1. **Start Backend API Server**
   - Initialize Node.js + TypeScript project
   - Set up Express server
   - Create vault service for file operations
   - Implement first endpoint: POST /api/capture

2. **After Backend Core Complete:**
   - Build Telegram bot
   - Integrate AI layer
   - Connect frontend

3. **Parallel Frontend Development:**
   - Continue building React screens
   - Use mock data initially
   - Switch to real API when ready

---

## Timeline Estimate

| Phase | Duration | Parallel? |
|-------|----------|-----------|
| Phase 1: Foundation | ✅ Complete | - |
| Phase 2: Frontend Scaffold | ✅ Complete | - |
| Phase 3: Backend API | 2-3 weeks | Can run parallel with Phase 7 |
| Phase 4: Telegram Bot | 1 week | Blocked by Phase 3 |
| Phase 5: AI Integration | 1-2 weeks | Can run parallel with Phase 7 |
| Phase 6: mem0 | 3-5 days | Can run parallel |
| Phase 7: Frontend Screens | 2-3 weeks | Can run parallel with Phase 3/5 |
| Phase 8: Frontend-Backend | 1 week | Sequential |
| Phase 9: PWA Polish | 3-5 days | Sequential |
| Phase 10: Deployment | 2-3 days | Sequential |

**Total Estimated: 8-10 weeks with parallel development**

---

**Status:** Ready to build backend API server
**Next Task:** Initialize focus-flow-backend project
