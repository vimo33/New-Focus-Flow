# Capture Component

Quick capture screen for Nitara UI that allows users to capture thoughts, tasks, and ideas with AI-powered auto-classification.

## Features

- **Large Textarea Input**: Spacious text input area with placeholder "What's on your mind?"
- **Emoji Prefix Picker**: Optional emoji prefixes for categorizing captures (💡 Idea, 📋 Task, 🎯 Goal, etc.)
- **Voice Input**: Web Speech API integration for voice-to-text capture
- **Auto-Classification Badge**: Real-time AI classification feedback showing category and confidence
- **Recent Captures List**: Display last 5 captured items with their classifications
- **Success Feedback**: Toast notification with undo functionality
- **Keyboard Shortcuts**:
  - `Cmd/Ctrl + Enter` to submit
  - `V` key to activate voice input
- **Loading States**: Visual feedback during submission
- **Error Handling**: Clear error messages for failed operations
- **Dark Theme**: Consistent with Nitara design system (#137fec, #101922, #16202a, #1e2933)
- **Responsive Design**: Mobile-first design with desktop optimizations

## Usage

```tsx
import { Capture } from '@/components/Capture';

function CapturePage() {
  return <Capture />;
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Additional CSS classes to apply to the root element |

## API Integration

The component uses the API client from `src/services/api.ts`:

- **POST /api/capture**: Submit new capture with text, prefix, and source
- **GET /api/inbox**: Load recent captures for display

### Response Structure

```typescript
interface CaptureResponse {
  id: string;
  status: 'created';
  item: InboxItem;
}

interface InboxItem {
  id: string;
  text: string;
  category?: 'work' | 'personal' | 'ideas';
  prefix?: string;
  source: 'telegram' | 'pwa' | 'voice' | 'api';
  created_at: string;
  ai_classification?: AIClassification;
}

interface AIClassification {
  category: 'work' | 'personal' | 'ideas';
  confidence: number;
  suggested_action: 'task' | 'project' | 'idea' | 'note';
  suggested_project?: string;
  reasoning?: string;
}
```

## Design System

### Colors
- **Primary**: `#137fec` - Blue accent for buttons and highlights
- **Background Dark**: `#101922` - Main background
- **Surface Dark**: `#16202a` - Sidebar and cards
- **Card Dark**: `#1e2933` - Input fields and elevated cards

### Typography
- **Font**: Inter (300, 400, 500, 600, 700, 900)
- **Input**: 3xl (mobile) to 5xl (desktop), font-light
- **Body**: sm to base

### Icons
- Uses Material Symbols Outlined font

## Testing

The component includes `data-testid` attributes for testing:

- `capture-screen` - Root container
- `capture-textarea` - Main text input
- `voice-input-button` - Voice input toggle
- `emoji-picker-toggle` - Emoji picker toggle
- `emoji-picker` - Emoji picker dropdown
- `capture-submit-button` - Submit button
- `classification-badge` - AI classification badge
- `confidence-indicator` - Confidence indicator
- `success-toast` - Success notification
- `undo-button` - Undo action button
- `error-message` - Error display
- `recent-captures-list` - Recent captures container
- `recent-capture-{id}` - Individual recent capture items

## Browser Compatibility

### Web Speech API
The voice input feature uses the Web Speech API, which has varying browser support:

- **Chrome/Edge**: Full support (preferred)
- **Safari**: Partial support
- **Firefox**: Limited support

The component gracefully degrades when Speech API is not available, showing an error message to the user.

## Accessibility

- All interactive elements have proper ARIA labels
- Keyboard navigation fully supported
- Focus management for form submission
- Screen reader friendly status messages

## Future Enhancements

- [ ] Real-time AI classification preview while typing
- [ ] Drag-and-drop file attachments
- [ ] Rich text formatting options
- [ ] Capture templates/quick actions
- [ ] Offline support with sync
- [ ] Voice waveform visualization during recording
- [ ] Multi-language speech recognition
