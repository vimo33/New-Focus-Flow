# Focus Flow OS - Autonomous PRD-to-Code Pipeline

## Overview

The **Orchestrator** is Focus Flow's autonomous development pipeline that transforms Product Requirements Documents (PRDs) into production-ready code without manual intervention.

### What It Does

1. **Accepts PRD** - Takes an Idea marked with `type: "prd"`
2. **Generates Specifications** - Uses Claude SDK to create technical specs
3. **Parses Design Assets** - Extracts design patterns from Stitch exports
4. **Generates Code** - Creates React components and Express routes
5. **Validates Code** - TypeScript compilation and linting
6. **Deploys** - Writes files to vault and optionally commits to git

---

## Quick Start

### 1. Create a PRD

Create an Idea in Focus Flow with the following format:

```markdown
Title: User Profile Page

Description:
## Requirements
- Display user information (name, email, avatar)
- Edit profile button
- Save changes to vault

## User Stories
- As a user, I want to view my profile
- As a user, I want to edit my details

## Constraints (optional)
- Must use dark theme
- Must use Tailwind CSS

## Success Metrics (optional)
- 95% user satisfaction
- <100ms load time
```

**Important**: Set `metadata.type = "prd"` when creating the idea.

### 2. Trigger Generation

```bash
curl -X POST http://localhost:3001/api/orchestrator/prd/{idea_id}
```

Response:
```json
{
  "status": "processing",
  "message": "PRD processing started",
  "idea_id": "idea-123"
}
```

### 3. Monitor Progress

```bash
curl http://localhost:3001/api/orchestrator/runs/{run_id}
```

Response:
```json
{
  "run": {
    "id": "orch-20260203-abc123",
    "state": "code_generation",
    "outputs": {
      "specs": [...],
      "designs": [...]
    }
  }
}
```

### 4. Check Results

When `state: "complete"`, the generated code will be in:
- Frontend: `/srv/focus-flow/02_projects/active/focus-flow-ui/src/components/`
- Backend: `/srv/focus-flow/02_projects/active/focus-flow-backend/src/routes/`

---

## Architecture

### State Machine

The orchestrator progresses through these states:

```
intake
  ↓
spec_generation
  ↓
design_parsing
  ↓
code_generation
  ↓
validation
  ↓
deployment
  ↓
complete
```

If any step fails, the state becomes `failed` and the error is captured.

### Services

#### 1. **PRDParserService**
Parses markdown-formatted Ideas into structured PRDDocument

**Input**: Idea with markdown sections
**Output**: PRDDocument with arrays for requirements, user stories, etc.

#### 2. **SpecGeneratorService**
Generates technical specifications using Claude SDK

**Input**: PRDDocument
**Output**: Array of Specification objects with:
- Feature name
- Frontend components/routes/state
- Backend endpoints/models
- Acceptance criteria
- Complexity rating

#### 3. **DesignParserService**
Parses Stitch HTML exports to extract design patterns

**Input**: Specifications
**Output**: ParsedDesign objects with:
- Layout structure
- Component patterns
- Style guide (colors, spacing, typography)

**Fallback**: If no matching Stitch export found, uses default design

#### 4. **CodeGeneratorService**
Generates React components and Express routes using Claude SDK

**Input**: Specifications + Parsed Designs
**Output**: GeneratedCode with:
- Frontend components (React + TypeScript)
- Backend routes (Express + TypeScript)
- Test files (Jest/Playwright templates)

#### 5. **ValidatorService**
Validates generated code using TypeScript compiler

**Input**: GeneratedCode
**Output**: ValidationResult with pass/fail and error details

**Checks**:
- TypeScript compilation
- Balanced braces/parentheses/brackets
- Basic syntax validation

#### 6. **DeployerService**
Writes files to filesystem and optionally commits to git

**Input**: GeneratedCode
**Output**: DeploymentResult with file paths and git commit message

**Features**:
- Creates directories automatically
- Optional git commit (set `AUTO_COMMIT=true`)
- Rollback capability

---

## API Endpoints

### POST `/api/orchestrator/prd/:ideaId`

Start autonomous processing for a PRD

**Request**:
```bash
POST /api/orchestrator/prd/idea-123
```

**Response** (202 Accepted):
```json
{
  "status": "processing",
  "message": "PRD processing started",
  "idea_id": "idea-123"
}
```

---

### GET `/api/orchestrator/runs/:runId`

Get status of a specific run

**Request**:
```bash
GET /api/orchestrator/runs/orch-20260203-abc123
```

**Response**:
```json
{
  "run": {
    "id": "orch-20260203-abc123",
    "idea_id": "idea-123",
    "state": "complete",
    "created_at": "2026-02-03T10:00:00Z",
    "updated_at": "2026-02-03T10:05:00Z",
    "metadata": {
      "prd_title": "User Profile Page",
      "estimated_complexity": "moderate"
    },
    "outputs": {
      "specs": [...],
      "designs": [...],
      "code": {...},
      "validation": {...},
      "deployment": {...}
    }
  }
}
```

---

### GET `/api/orchestrator/runs`

List all runs

**Request**:
```bash
GET /api/orchestrator/runs
```

**Response**:
```json
{
  "runs": [
    {
      "id": "orch-20260203-abc123",
      "state": "complete",
      "created_at": "2026-02-03T10:00:00Z",
      ...
    }
  ],
  "count": 1
}
```

---

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...

# Optional
AUTO_COMMIT=true              # Auto-commit generated code to git
```

### Stitch Exports Path

Default: `/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports`

To customize, edit `DesignParserService.stitchExportsPath`

---

## Generated Code Patterns

### Frontend Component

```typescript
import { useState } from 'react';

interface UserProfileProps {
  userId?: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="min-h-screen bg-[#101922] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Profile</h1>
        {/* Component content */}
      </div>
    </div>
  );
}
```

### Backend Route

```typescript
import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';

const router = Router();
const vaultService = new VaultService();

router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const profile = await vaultService.getData(`users/${userId}/profile.json`);
    res.json({ profile: JSON.parse(profile) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Error Handling

If a run fails, the state will be `failed` and the error will be captured:

```json
{
  "state": "failed",
  "error": {
    "message": "Validation failed: TypeScript errors in UserProfile",
    "stack": "...",
    "state_when_failed": "validation"
  }
}
```

Common errors:
- **Invalid PRD format**: Missing ## Requirements section
- **Spec generation failed**: Claude API error or rate limit
- **Validation failed**: TypeScript compilation errors
- **Deployment failed**: File write permissions

---

## Run Tracking

All runs are stored in: `/srv/focus-flow/07_system/orchestrator/runs/`

Each run is a JSON file with full audit trail:
- All states traversed
- All outputs at each step
- Timestamps
- Error details if failed

---

## Limitations & Future Enhancements

### Current Limitations

1. **No multi-file coordination** - Each feature generates independent components
2. **No state management** - Generated components don't integrate with Zustand stores
3. **Basic validation** - Only TypeScript compilation, no runtime tests
4. **Sequential processing** - One PRD at a time
5. **No design variations** - Single design output per feature

### Planned Enhancements

1. **Spec Kit Integration** - Replace Claude spec generation with official tool
2. **Real-time progress** - WebSocket updates instead of polling
3. **Rollback** - Automatic rollback if validation fails
4. **Code review agent** - Additional AI review before deployment
5. **Multi-PRD projects** - Generate entire apps from single PRD
6. **A/B testing** - Generate multiple design variations

---

## Testing

### Manual Test

```bash
# 1. Create test PRD
curl -X POST http://localhost:3001/api/ideas \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Simple Counter",
    "description": "## Requirements\n- Display count\n- Increment button\n- Decrement button",
    "metadata": {"type": "prd"}
  }'

# 2. Trigger generation (replace {idea_id})
curl -X POST http://localhost:3001/api/orchestrator/prd/{idea_id}

# 3. Check results
ls /srv/focus-flow/02_projects/active/focus-flow-ui/src/components/
```

### Automated Test

```bash
cd /srv/focus-flow/02_projects/active/focus-flow-backend
npm test tests/orchestrator.e2e.test.ts
```

**Note**: E2E tests cost money (Claude API calls)

---

## Troubleshooting

### "Invalid PRD format" Error

Ensure your PRD includes at minimum:
```markdown
## Requirements
- Requirement 1
- Requirement 2
```

### "Spec generation failed" Error

Check:
1. ANTHROPIC_API_KEY is set correctly
2. API key has sufficient credits
3. Not hitting rate limits

### "Validation failed" Error

The generated code has TypeScript errors. Check the run outputs for details:
```bash
curl http://localhost:3001/api/orchestrator/runs/{run_id}
```

Look at `outputs.validation.errors` for specific issues.

### Generated files not found

Check deployment output:
```bash
curl http://localhost:3001/api/orchestrator/runs/{run_id}
```

Look at `outputs.deployment.frontend_files` and `outputs.deployment.backend_files` for actual paths.

---

## Examples

### Example 1: Simple Feature

**PRD**:
```markdown
Title: Dark Mode Toggle

## Requirements
- Toggle button in header
- Persist preference to vault
- Switch between light and dark themes
```

**Generated**:
- `DarkModeToggle.tsx` - React component with state
- `theme.routes.ts` - GET/POST endpoints for preference

### Example 2: Complex Feature

**PRD**:
```markdown
Title: Analytics Dashboard

## Requirements
- Display charts for user activity
- Filter by date range
- Export to CSV
- Real-time updates

## User Stories
- As an admin, I want to see user engagement metrics
- As an admin, I want to filter data by time period

## Constraints
- Must load in <2 seconds
- Must use Chart.js for visualizations
```

**Generated**:
- `AnalyticsDashboard.tsx` - Main dashboard component
- `DateRangeFilter.tsx` - Filter component
- `ChartWidget.tsx` - Chart component
- `analytics.routes.ts` - Data fetching endpoints
- `analytics.test.ts` - Test suite

---

## Best Practices

1. **Be specific in requirements** - More detail = better generated code
2. **Include user stories** - Helps Claude understand intent
3. **Specify constraints** - Tech stack, performance, design requirements
4. **Review generated code** - Always review before deploying to production
5. **Start simple** - Test with simple features first
6. **Monitor runs** - Check run status for errors and warnings

---

## Support

For issues or questions:
- Check logs: `docker logs focus-flow-backend`
- View runs: `GET /api/orchestrator/runs`
- Report bugs: [GitHub Issues](https://github.com/yourusername/focus-flow/issues)

---

**Built with Claude SDK v0.72.1**
