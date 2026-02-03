# Contributing to Focus Flow OS

Thank you for your interest in contributing to Focus Flow OS! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [How to Contribute](#how-to-contribute)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)
8. [Pull Request Process](#pull-request-process)
9. [Issue Reporting](#issue-reporting)
10. [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Expected Behavior

- Be respectful and considerate
- Use welcoming and inclusive language
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment, trolling, or discriminatory language
- Personal attacks or insults
- Publishing others' private information
- Spam or excessive self-promotion
- Any conduct that could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 22+ installed
- Docker and Docker Compose installed
- Git installed
- Basic knowledge of TypeScript, React, and Node.js
- Familiarity with REST APIs

### Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/focus-flow-os.git
cd focus-flow-os

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/focus-flow-os.git
```

---

## Development Setup

### 1. Backend Setup

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your development configuration
# You'll need an Anthropic API key for AI features

# Run in development mode
npm run dev
```

### 2. Frontend Setup

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-ui

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Run development server
npm run dev
```

### 3. Telegram Bot Setup (Optional)

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-telegram-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your Telegram bot token
# Get token from @BotFather on Telegram

# Run in development mode
npm run dev
```

### 4. Docker Services Setup

```bash
cd /srv/focus-flow/07_system/config

# Create API key file
echo "your-test-api-key" > /srv/focus-flow/07_system/secrets/anthropic_api_key.txt

# Start services
docker compose up -d

# Verify services are running
docker compose ps
```

---

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

1. **Bug Fixes** - Fix existing bugs or issues
2. **New Features** - Implement new functionality
3. **Documentation** - Improve or add documentation
4. **Tests** - Add or improve test coverage
5. **Performance** - Optimize existing code
6. **UI/UX** - Improve user interface and experience
7. **Security** - Identify and fix security issues

### Finding Issues to Work On

- Check the [Issues](https://github.com/ORIGINAL_OWNER/focus-flow-os/issues) page
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to let others know you're working on it
- Ask questions if anything is unclear

### Creating New Issues

Before creating a new issue:

1. Search existing issues to avoid duplicates
2. Use a clear, descriptive title
3. Provide detailed description
4. Include steps to reproduce (for bugs)
5. Add relevant labels
6. Include system information (OS, Node version, etc.)

---

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types, avoid 'any'
function createTask(title: string, category: TaskCategory): Task {
  return {
    id: generateTaskId(),
    title,
    category,
    status: 'todo',
    created_at: new Date().toISOString()
  };
}

// Use interfaces for object shapes
interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  status: TaskStatus;
  created_at: string;
}

// Use type unions for constants
type TaskCategory = 'work' | 'personal' | 'scheduled';
type TaskStatus = 'todo' | 'in_progress' | 'done';
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `TaskCard.tsx`)
- Services: `camelCase.service.ts` (e.g., `vault.service.ts`)
- Utilities: `camelCase.ts` (e.g., `id-generator.ts`)
- Routes: `kebab-case.routes.ts` (e.g., `inbox.routes.ts`)

**Variables:**
- Constants: `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- Variables: `camelCase` (e.g., `taskList`)
- Private members: `_camelCase` (e.g., `_internalCache`)

**Functions:**
- Use descriptive verb-noun format: `getUserTasks()`, `createProject()`
- Boolean functions: use `is`, `has`, `can` prefix (e.g., `isValidTask()`)

### Code Style

**Formatting:**
- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at end of statements
- Maximum line length: 100 characters
- Use trailing commas in multi-line objects/arrays

**Comments:**
```typescript
// Good: Explain WHY, not WHAT
// Cache results to avoid repeated file system calls
const cachedTasks = await getCachedTasks();

// Bad: Stating the obvious
// Get cached tasks
const cachedTasks = await getCachedTasks();
```

**Async/Await:**
```typescript
// Good: Use async/await
async function loadTasks(): Promise<Task[]> {
  try {
    const tasks = await vaultService.getTasks();
    return tasks;
  } catch (error) {
    console.error('Failed to load tasks:', error);
    throw error;
  }
}

// Avoid: Promise chains
function loadTasks() {
  return vaultService.getTasks()
    .then(tasks => tasks)
    .catch(error => {
      console.error('Failed to load tasks:', error);
      throw error;
    });
}
```

### React/Frontend Guidelines

```typescript
// Use functional components with hooks
import { useState, useEffect } from 'react';

interface TaskListProps {
  category?: string;
  onTaskClick?: (task: Task) => void;
}

export function TaskList({ category, onTaskClick }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [category]);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await api.getTasks(category);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onClick={() => onTaskClick?.(task)}
        />
      ))}
    </div>
  );
}
```

### Error Handling

```typescript
// Backend: Use try-catch and return appropriate status codes
router.get('/api/tasks/:id', async (req: Request, res: Response) => {
  try {
    const task = await vaultService.getTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error: any) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Frontend: Show user-friendly error messages
async function saveTask(task: Task) {
  try {
    await api.updateTask(task.id, task);
    showSuccessMessage('Task saved successfully');
  } catch (error) {
    if (error.response?.status === 404) {
      showErrorMessage('Task not found');
    } else if (error.response?.status === 400) {
      showErrorMessage('Invalid task data');
    } else {
      showErrorMessage('Failed to save task. Please try again.');
    }
  }
}
```

---

## Testing Guidelines

### Unit Tests

```typescript
// Example: Testing a service function
import { VaultService } from './vault.service';

describe('VaultService', () => {
  let vaultService: VaultService;

  beforeEach(() => {
    vaultService = new VaultService();
  });

  describe('createTask', () => {
    it('should create a task with valid data', async () => {
      const taskData = {
        title: 'Test Task',
        category: 'work',
        priority: 'high'
      };

      const task = await vaultService.createTask(taskData);

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.category).toBe('work');
      expect(task.status).toBe('todo');
    });

    it('should throw error with invalid category', async () => {
      const taskData = {
        title: 'Test Task',
        category: 'invalid'
      };

      await expect(vaultService.createTask(taskData))
        .rejects
        .toThrow('Invalid category');
    });
  });
});
```

### Integration Tests

```typescript
// Example: Testing API endpoint
import request from 'supertest';
import app from '../index';

describe('POST /api/tasks', () => {
  it('should create a new task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Integration Test Task',
        category: 'work',
        priority: 'high'
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
    expect(response.body.title).toBe('Integration Test Task');
  });

  it('should return 400 with missing title', async () => {
    await request(app)
      .post('/api/tasks')
      .send({
        category: 'work'
      })
      .expect(400);
  });
});
```

### End-to-End Tests

```typescript
// Example: Playwright test
import { test, expect } from '@playwright/test';

test('create task flow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3008');

  // Click quick capture button
  await page.click('[data-testid="quick-capture-btn"]');

  // Enter task text
  await page.fill('[data-testid="capture-input"]', 'E2E Test Task');

  // Submit
  await page.click('[data-testid="capture-submit"]');

  // Verify task appears in inbox
  await expect(page.locator('text=E2E Test Task')).toBeVisible();
});
```

### Running Tests

```bash
# Backend tests
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm test

# Frontend tests
cd /srv/focus-flow/02_projects/active/focus-flow-ui
npm test

# E2E tests
npm run test:e2e
```

---

## Documentation

### Code Documentation

Use JSDoc for functions and complex logic:

```typescript
/**
 * Creates a new task in the specified category
 *
 * @param taskData - Partial task data to create
 * @returns Promise resolving to the created task
 * @throws Error if category is invalid or file write fails
 *
 * @example
 * ```typescript
 * const task = await createTask({
 *   title: 'Review PR',
 *   category: 'work',
 *   priority: 'high'
 * });
 * ```
 */
async function createTask(taskData: Partial<Task>): Promise<Task> {
  // Implementation...
}
```

### README Updates

When adding new features, update relevant README files:

- Main README: `/srv/focus-flow/README.md`
- Backend README: `/srv/focus-flow/02_projects/active/focus-flow-backend/README.md`
- Production docs: `/srv/focus-flow/PRODUCTION.md`

### API Documentation

Update API reference in `PRODUCTION.md` when adding/modifying endpoints:

```markdown
#### Create Task

\`\`\`http
POST /api/tasks
\`\`\`

**Request Body:**
\`\`\`json
{
  "title": "Review budget",
  "category": "work",
  "priority": "high"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": "task-20260203-001",
  "status": "created"
}
\`\`\`
```

---

## Pull Request Process

### Before Submitting

1. **Update your fork:**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes:**
   - Write clean, documented code
   - Follow coding standards
   - Add/update tests
   - Update documentation

4. **Test thoroughly:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Use conventional commits format:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding or updating tests
   - `chore:` Maintenance tasks

### Submitting Pull Request

1. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request on GitHub:**
   - Use a clear, descriptive title
   - Reference related issues (e.g., "Fixes #123")
   - Provide detailed description of changes
   - Add screenshots/videos for UI changes
   - List any breaking changes
   - Update CHANGELOG.md if applicable

3. **PR Template:**
   ```markdown
   ## Description
   Brief description of what this PR does

   ## Related Issues
   Fixes #123
   Related to #456

   ## Changes
   - Added feature X
   - Fixed bug Y
   - Updated documentation for Z

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed
   - [ ] Documentation updated

   ## Screenshots (if applicable)
   [Add screenshots here]

   ## Breaking Changes
   - List any breaking changes
   - None

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Tests pass locally
   ```

### Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Once approved, your PR will be merged
4. Your contribution will be credited in CHANGELOG.md

### After Merge

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
```

---

## Issue Reporting

### Bug Reports

Use this template:

```markdown
**Bug Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to...
2. Click on...
3. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
[Add screenshots if applicable]

**Environment**
- OS: Ubuntu 22.04
- Node.js: v22.0.0
- Browser: Chrome 120
- Focus Flow Version: 1.0.0

**Additional Context**
Any other relevant information
```

### Feature Requests

Use this template:

```markdown
**Feature Description**
Clear description of the feature

**Problem it Solves**
What problem does this solve?

**Proposed Solution**
How would this work?

**Alternatives Considered**
Other solutions you've thought about

**Additional Context**
Any other relevant information
```

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions

### Getting Help

- Check existing documentation first
- Search closed issues for solutions
- Ask in GitHub Discussions
- Reach out to maintainers

### Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to CONTRIBUTORS.md (if created)

---

## Development Workflow Best Practices

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

Good commit messages:
```
feat: add AI classification for inbox items

- Integrate Claude API for auto-classification
- Add background processing queue
- Update inbox service to use classification

Closes #123
```

Bad commit messages:
```
update code
fix stuff
changes
```

### Code Review Checklist

When reviewing PRs:

- [ ] Code follows style guidelines
- [ ] Functionality works as expected
- [ ] Tests are adequate and passing
- [ ] Documentation is updated
- [ ] No unnecessary dependencies added
- [ ] Security considerations addressed
- [ ] Performance impact considered
- [ ] Error handling is proper

---

## Questions?

If you have questions about contributing, feel free to:

1. Open a GitHub Discussion
2. Create an issue with the `question` label
3. Reach out to maintainers

**Thank you for contributing to Focus Flow OS!**

We appreciate your time and effort in making this project better for everyone.
