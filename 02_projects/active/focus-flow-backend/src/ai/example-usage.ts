/**
 * Example usage of the Claude Client
 * This file demonstrates how to use the Claude SDK client in the Focus Flow backend
 *
 * DO NOT run this file directly - it's for reference only
 */

import { claudeClient } from './claude-client';

async function exampleClassification() {
  console.log('=== Example: Classify Inbox Items ===\n');

  const examples = [
    'Finish the Q4 financial report by Friday',
    'Buy groceries and pick up dry cleaning',
    'What if we built an AI-powered task prioritization system?',
  ];

  for (const text of examples) {
    console.log(`Text: "${text}"`);
    try {
      const result = await claudeClient.classifyInboxItem(text);
      console.log('Classification:', result);
      console.log('');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      console.log('');
    }
  }
}

async function exampleGeneration() {
  console.log('=== Example: Generate AI Response ===\n');

  const prompt = 'What are the key principles of effective task management?';
  const context = 'User is building a personal productivity system';

  console.log(`Prompt: "${prompt}"`);
  console.log(`Context: "${context}"`);

  try {
    const result = await claudeClient.generateResponse(prompt, context);
    console.log('Response:', result.content);
    console.log('Token usage:', result.usage);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.log('');
  }
}

async function exampleIdeaEvaluation() {
  console.log('=== Example: Evaluate Idea ===\n');

  const idea = 'Create a voice-first interface for capturing tasks while driving';
  const criteria = `
    - Feasibility: Technical complexity and implementation difficulty
    - Value: User impact and problem-solving potential
    - Safety: Considerations for driving and user attention
    - Resources: Time and cost requirements
  `;

  console.log(`Idea: "${idea}"`);
  console.log(`Criteria: ${criteria}`);

  try {
    const result = await claudeClient.evaluateIdea(idea, criteria);
    console.log('Evaluation:');
    console.log('  Score:', result.score);
    console.log('  Recommendation:', result.recommendation);
    console.log('  Reasoning:', result.reasoning);
    console.log('  Strengths:', result.strengths);
    console.log('  Weaknesses:', result.weaknesses);
    console.log('  Suggestions:', result.suggestions);
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.log('');
  }
}

async function exampleHealthCheck() {
  console.log('=== Example: Health Check ===\n');

  try {
    const isHealthy = await claudeClient.healthCheck();
    console.log('Claude API Health:', isHealthy ? '✓ Healthy' : '✗ Unhealthy');
    console.log('');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.log('');
  }
}

// Main function to run all examples
async function main() {
  console.log('Claude SDK Client - Usage Examples\n');
  console.log('=' .repeat(50));
  console.log('');

  try {
    await exampleHealthCheck();
    await exampleClassification();
    await exampleGeneration();
    await exampleIdeaEvaluation();
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Uncomment to run examples:
// main().catch(console.error);

export { exampleClassification, exampleGeneration, exampleIdeaEvaluation, exampleHealthCheck };
