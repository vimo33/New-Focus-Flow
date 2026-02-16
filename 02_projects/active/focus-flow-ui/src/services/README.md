# Nitara API Client Service

This directory contains the API client service for the Nitara UI frontend.

## Files

- **api.ts** - Main API client service with TypeScript interfaces and methods
- **api.example.ts** - Usage examples and patterns

## Overview

The `VaultAPI` class provides a typed interface to all Nitara backend endpoints. It includes:

- Full TypeScript type definitions
- Automatic error handling
- Request/response validation
- Singleton instance for convenience

## Quick Start

### Basic Usage

```typescript
import { api } from './services/api';

// Capture a quick thought
const result = await api.capture({
  text: 'Buy groceries',
  source: 'pwa'
});

// Get inbox items
const inbox = await api.getInbox();

// Get inbox counts
const counts = await api.getInboxCounts();
```

### Custom Instance

```typescript
import { VaultAPI } from './services/api';

const customApi = new VaultAPI('https://api.example.com/v1');
const inbox = await customApi.getInbox();
```

## API Methods

### Inbox Methods

- `capture(data: CaptureRequest): Promise<CaptureResponse>`
- `getInbox(filter?: string): Promise<InboxListResponse>`
- `getInboxCounts(): Promise<InboxCounts>`
- `getInboxItem(id: string): Promise<InboxItem>`
- `processInboxItem(id: string, data: ProcessInboxRequest): Promise<ProcessResponse>`

### Task Methods

- `getTasks(category?: string): Promise<TaskListResponse>`
- `createTask(data: Partial<Task>): Promise<TaskResponse>`
- `updateTask(id: string, data: Partial<Task>): Promise<TaskResponse>`

### Project Methods

- `getProjects(status?: string): Promise<ProjectListResponse>`
- `createProject(data: Partial<Project>): Promise<ProjectResponse>`

### Idea Methods

- `getIdeas(status?: string): Promise<IdeaListResponse>`
- `createIdea(data: Partial<Idea>): Promise<IdeaResponse>`

### Dashboard Methods

- `getSummary(): Promise<DashboardSummary>`

### Health Methods

- `logHealthMetric(data: Partial<HealthMetric>): Promise<{ status: string; metric: HealthMetric }>`

## Type Definitions

All TypeScript interfaces are exported from `api.ts`:

```typescript
import {
  InboxItem,
  Task,
  Project,
  Idea,
  CaptureRequest,
  ProcessInboxRequest,
  InboxCounts,
  DashboardSummary,
  // ... and more
} from './services/api';
```

## Error Handling

The API client throws errors with descriptive messages:

```typescript
try {
  await api.createTask({ title: 'Task' });
} catch (error) {
  if (error instanceof Error) {
    console.error('API Error:', error.message);
  }
}
```

## Backend Endpoints

The API client connects to these backend endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/capture | Quick capture an item |
| GET | /api/inbox | List inbox items |
| GET | /api/inbox/counts | Get inbox counts |
| GET | /api/inbox/:id | Get single inbox item |
| POST | /api/inbox/:id/process | Process inbox item |
| GET | /api/tasks | List tasks |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| GET | /api/projects | List projects |
| POST | /api/projects | Create project |
| GET | /api/ideas | List ideas |
| POST | /api/ideas | Create idea |
| POST | /api/health/log | Log health metric |
| GET | /api/summary | Get dashboard summary |

## Configuration

Default base URL: `http://localhost:3001/api`

To use a different URL:

```typescript
const api = new VaultAPI('https://your-api.com/api');
```

## React Integration

See `api.example.ts` for React component examples.

## Development

The backend API must be running on port 3001 for the default configuration.

Start backend:
```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm run dev
```

## Testing

Test the API client in your browser console:

```javascript
import { api } from './services/api';

// Test connection
api.getSummary()
  .then(data => console.log('Connected:', data))
  .catch(err => console.error('Connection failed:', err));
```
