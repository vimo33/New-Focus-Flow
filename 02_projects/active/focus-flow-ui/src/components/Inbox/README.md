# Inbox Component

The Inbox Processing Center component for Focus Flow UI. This component provides a comprehensive interface for processing inbox items with filtering, search, batch actions, and AI-powered suggestions.

## Features

- **Filter Tabs**: Filter items by category (All, Work, Personal, Ideas)
- **Item Cards**: Display inbox items with metadata including:
  - Item text
  - Created date/time
  - Source (telegram, pwa, voice, api)
  - AI classification and suggestions
  - Category badges
  - Urgency labels
- **Action Buttons**:
  - Process: Opens modal to convert item to task/project/idea/note or archive
  - Archive: Quick archive action
  - Delete: Remove item permanently
- **Batch Selection**: Select multiple items and perform bulk actions
- **Search**: Real-time search filtering
- **Process Modal**: Rich form to process items with AI suggestions
- **Empty States**: Helpful messages when no items are found
- **Loading States**: Spinner during data fetching
- **Dark Theme**: Fully styled for dark mode (#137fec, #101922, #16202a, #1e2933)
- **Responsive**: Mobile-first design with responsive grid

## Usage

```tsx
import { Inbox } from './components/Inbox';

function App() {
  return <Inbox />;
}
```

## API Integration

The component uses the API client from `src/services/api.ts`:

- `GET /api/inbox?filter=X` - Fetch inbox items with optional filter
- `GET /api/inbox/counts` - Get count badges for each category
- `POST /api/inbox/:id/process` - Process an inbox item

## Process Actions

When processing an item, users can choose from:

1. **Task**: Convert to a task with title, description, category, and priority
2. **Project**: Convert to a project with title and description
3. **Idea**: Convert to an idea for AI Council validation
4. **Note**: Archive as a reference note
5. **Archive**: Simply archive the item

## TypeScript Interfaces

All types are imported from `src/services/api.ts`:

- `InboxItem`: Main inbox item type
- `InboxCounts`: Count object for filter tabs
- `ProcessInboxRequest`: Request payload for processing
- `AIClassification`: AI suggestion data

## Data Test IDs

All interactive elements have `data-testid` attributes for testing:

- `add-item-button`: Add new item button
- `filter-{type}`: Filter tabs (all, work, personal, ideas)
- `search-button`: Toggle search bar
- `filter-button`: Advanced filter options
- `sort-button`: Sort options
- `search-input`: Search text input
- `select-all-checkbox`: Select/deselect all items
- `inbox-item-{id}`: Individual inbox item cards
- `checkbox-{id}`: Item selection checkbox
- `process-button-{id}`: Process item button
- `menu-button-{id}`: Item menu button
- `archive-button-{id}`: Archive item button
- `delete-button-{id}`: Delete item button
- `batch-action-bar`: Batch action toolbar
- `batch-archive-button`: Batch archive button
- `batch-delete-button`: Batch delete button
- `clear-selection-button`: Clear selection button
- `loading-state`: Loading spinner
- `empty-state`: Empty state message
- `process-modal`: Process modal container
- `close-modal-button`: Close modal button
- `action-{type}`: Action selection buttons (task, project, idea, note, archive)
- `task-title-input`: Task title input
- `task-description-input`: Task description textarea
- `task-category-select`: Task category dropdown
- `task-priority-select`: Task priority dropdown
- `project-title-input`: Project title input
- `project-description-input`: Project description textarea
- `idea-title-input`: Idea title input
- `idea-description-input`: Idea description textarea
- `cancel-button`: Cancel button in modal
- `submit-button`: Submit/process button in modal

## Component Structure

```
src/components/Inbox/
├── Inbox.tsx           # Main inbox component
├── ProcessModal.tsx    # Modal for processing items
├── index.ts           # Barrel export
└── README.md          # This file
```

## Exports

```ts
export { Inbox } from '../components/Inbox';
```

Added to `src/lib/index.ts` for easy importing.

## Design Reference

Based on the Stitch design export:
`/opt/brain/vault/Work/01_Projects/Active/focus-flow-ui/design/stitch_exports/inbox_processing_center/`

## State Management

The component uses local React state for:
- Items list
- Count badges
- Active filter
- Selected items
- Processing item
- Search query
- Loading state

Future enhancement: Consider moving to Zustand store for global state management.

## AI Classification

The component displays AI-powered suggestions:
- Suggested action (task, project, idea, note)
- Confidence level
- Category classification
- Reasoning

These suggestions are pre-filled in the Process Modal to speed up workflow.

## Date Formatting

Dates are displayed in a human-friendly format:
- "Today" for items created today
- "Yesterday" for items created yesterday
- "X days ago" for items within the last week
- "Mon DD" format for older items

Overdue items (created more than 1 day ago) are highlighted in red.

## Keyboard Shortcuts

(Future enhancement: Add keyboard shortcuts for common actions)

## Accessibility

(Future enhancement: Add ARIA labels and keyboard navigation)

## Performance

The component uses:
- Optimistic UI updates for better UX
- Promise.all for parallel API requests
- Filtered arrays for search (consider virtualization for large lists)

## Known Limitations

- No pagination (all items loaded at once)
- No sorting options UI (only filter)
- No keyboard shortcuts yet
- No undo functionality
- Search is client-side only

## Future Enhancements

- [ ] Add pagination or infinite scroll
- [ ] Implement sorting options
- [ ] Add keyboard shortcuts
- [ ] Add undo/redo functionality
- [ ] Server-side search
- [ ] Drag and drop reordering
- [ ] Bulk processing with custom actions
- [ ] Export filtered items
- [ ] Save custom filters
- [ ] Add tags to items
- [ ] Due date picker for tasks
- [ ] Project assignment for tasks
