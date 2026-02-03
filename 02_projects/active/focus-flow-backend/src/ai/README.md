# Claude SDK Client

This module provides a TypeScript client for integrating Claude AI into the Focus Flow backend.

## Features

- **Inbox Item Classification**: Uses Claude Haiku 4.5 for fast, efficient classification of inbox items
- **Response Generation**: Uses Claude Sonnet 4.5 for high-quality AI responses
- **Idea Evaluation**: Uses Claude Sonnet 4.5 to evaluate ideas with detailed reasoning

## Usage

### Import the Client

```typescript
import { claudeClient } from './ai/claude-client';
```

### Classify Inbox Items

```typescript
const result = await claudeClient.classifyInboxItem('Buy groceries for dinner tonight');

// Result:
// {
//   category: 'personal',
//   confidence: 0.95,
//   suggested_action: 'task',
//   reasoning: 'This is a personal errand that requires immediate action'
// }
```

### Generate AI Responses

```typescript
const response = await claudeClient.generateResponse(
  'How should I prioritize my tasks?',
  'I have 10 tasks due this week'
);

// Result:
// {
//   content: 'Based on your workload, I recommend...',
//   usage: {
//     input_tokens: 25,
//     output_tokens: 150
//   }
// }
```

### Evaluate Ideas

```typescript
const evaluation = await claudeClient.evaluateIdea(
  'Build a mobile app for Focus Flow',
  'Feasibility, market fit, and resource requirements'
);

// Result:
// {
//   score: 75,
//   reasoning: 'This is a valuable idea that extends the platform...',
//   recommendation: 'approve',
//   strengths: ['Extends platform reach', 'Market demand exists'],
//   weaknesses: ['Requires mobile development expertise'],
//   suggestions: ['Start with PWA', 'Consider React Native']
// }
```

### Health Check

```typescript
const isHealthy = await claudeClient.healthCheck();
console.log('Claude API is healthy:', isHealthy);
```

## Models Used

- **Classification**: `claude-haiku-4.5-20250514` - Fast and efficient for structured outputs
- **Generation & Evaluation**: `claude-sonnet-4.5-20250929` - High-quality reasoning and analysis

## Error Handling

All methods throw errors with descriptive messages:

```typescript
try {
  const result = await claudeClient.classifyInboxItem(text);
} catch (error) {
  if (error.message.includes('Claude API Error')) {
    // Handle API errors
  } else if (error.message.includes('Failed to parse')) {
    // Handle JSON parsing errors
  } else {
    // Handle other errors
  }
}
```

## Environment Configuration

Required environment variable:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Type Definitions

All response types are exported for use in your application:

- `ClassificationResponse`
- `GenerateResponse`
- `IdeaEvaluationResponse`
