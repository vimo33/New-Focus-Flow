# Projects Component

The Projects Management screen for Focus Flow UI.

## Features

- **Project Listing**: Display all projects in a responsive grid layout
- **Status Filtering**: Filter projects by status (Active, Paused, All)
- **Search Functionality**: Search projects by title and description
- **Project Cards**: Each card displays:
  - Project icon (dynamically colored)
  - Title and description
  - Status badge (Active, Paused, Completed)
  - Progress bar with task completion percentage
  - Last updated timestamp
  - "Open Project" action button
- **Create New Project**: Modal form to create new projects
- **Empty States**: Helpful messages when no projects exist
- **Loading States**: Skeleton loading while fetching data
- **Error Handling**: Error messages with retry functionality
- **Dark Theme**: Fully styled for dark mode (#137fec, #101922, #16202a, #1e2933)
- **Responsive Design**: 1 column on mobile, 2-3 columns on desktop

## Components

### Projects.tsx
Main component that handles:
- Fetching projects from API
- Filtering and searching
- Navigation to project detail page
- Modal management

### CreateProjectModal.tsx
Modal form for creating new projects with:
- Title input (required)
- Description textarea (optional)
- Status select (active, paused, completed)
- Form validation
- Loading states
- Error handling

## API Integration

Uses the VaultAPI client:
- `GET /api/projects` - List all projects with optional status filter
- `POST /api/projects` - Create a new project

## Routes

- `/projects` - Projects listing page
- `/projects/:id` - Individual project detail page (navigation only, detail page TBD)

## Data Attributes

All interactive elements include `data-testid` attributes for testing:
- `projects-page` - Main container
- `new-project-button` - Create project button
- `filter-active`, `filter-paused`, `filter-all` - Filter tabs
- `search-button`, `search-input` - Search functionality
- `project-card-{id}` - Individual project cards
- `create-project-card` - New project placeholder card
- `create-project-modal` - Modal container
- `empty-state`, `loading-state`, `error-message` - Various states

## Styling

- Uses Tailwind CSS with custom dark theme colors
- Material Symbols icons
- Smooth transitions and hover effects
- Card-based layout with shadows and borders
- Progress bars with dynamic colors based on completion percentage

## Usage

```tsx
import { Projects } from './components/Projects';

// In router
<Route path="/projects" element={<Projects />} />
```

## Mock Data

Currently uses mock data for:
- Project icons (cycles through: web, smartphone, palette, campaign, code, design_services)
- Icon colors (6 different color combinations)
- Progress calculation (based on completed tasks / total tasks)

## Future Enhancements

- Drag and drop reordering
- Bulk actions (archive, delete multiple projects)
- Sort options (by date, name, progress)
- Project templates
- Quick actions menu on cards
- Export project data
