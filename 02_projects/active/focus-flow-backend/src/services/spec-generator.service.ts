import { cachedInference } from './cached-inference.service';
import { PRDDocument, Specification } from '../models/types';


/**
 * SpecGeneratorService - Generates technical specifications from PRDs using OpenClaw Gateway
 *
 * Transforms Product Requirements Documents into detailed technical specs
 * including frontend components, backend endpoints, and data models.
 */
export class SpecGeneratorService {
  constructor() {
    // Uses CachedInferenceClient → OpenClaw Gateway for Claude access
  }

  /**
   * Generate technical specifications from a PRD
   */
  async generateFromPRD(prd: PRDDocument): Promise<Specification[]> {
    const systemPrompt = `You are a Senior Technical Architect generating detailed specifications from PRDs.

Your task is to analyze a Product Requirements Document and generate comprehensive technical specifications.

For each feature in the PRD, output:
1. **Feature Name**: Clear, concise title
2. **Description**: What it does
3. **Technical Requirements**:
   - Frontend components needed (React)
   - Backend endpoints needed (Express API)
   - Data models (TypeScript interfaces)
   - State management requirements
4. **Acceptance Criteria**: Testable conditions
5. **Dependencies**: What must exist first
6. **Complexity**: simple | moderate | complex

Respond ONLY with valid JSON array:
[{
  "feature_name": "...",
  "description": "...",
  "frontend": {
    "components": ["ComponentName"],
    "routes": ["/path"],
    "state": ["stateKey"]
  },
  "backend": {
    "endpoints": [{"method": "POST", "path": "/api/...", "purpose": "..."}],
    "models": ["TypeName"]
  },
  "acceptance_criteria": ["criterion 1"],
  "dependencies": [],
  "complexity": "simple"
}]`;

    const userMessage = `Generate technical specifications for this PRD:

Title: ${prd.title}

Description:
${prd.description}

Requirements:
${prd.requirements.join('\n')}

${prd.user_stories ? `User Stories:\n${prd.user_stories.join('\n')}` : ''}

${prd.constraints ? `Constraints:\n${prd.constraints.join('\n')}` : ''}

${prd.success_metrics ? `Success Metrics:\n${prd.success_metrics.join('\n')}` : ''}`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'code_generation',
        'standard',
        { max_tokens: 4000, temperature: 0.3 }
      );

      const specs = JSON.parse(responseText) as Specification[];
      this.validateSpecs(specs);

      return specs;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse spec generation response as JSON');
      }
      throw error;
    }
  }

  /**
   * Refine existing specs based on user feedback
   */
  async refineSpecs(
    specs: Specification[],
    feedback: string,
    prd: PRDDocument
  ): Promise<Specification[]> {
    const systemPrompt = `You are a Senior Technical Architect refining specifications based on user feedback.
Maintain the same JSON structure. Apply the feedback to improve the specs.
Respond ONLY with valid JSON array.`;

    const userMessage = `Refine these specs based on feedback:

PRD: ${prd.title}
Requirements: ${prd.requirements.join(', ')}

Current Specs:
${JSON.stringify(specs, null, 2)}

User Feedback: ${feedback}`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'code_generation',
        'standard',
        { max_tokens: 4000, temperature: 0.3 }
      );

      const refined = JSON.parse(responseText) as Specification[];
      this.validateSpecs(refined);
      return refined;
    } catch (error) {
      console.error('Spec refinement failed, returning original specs:', error);
      return specs;
    }
  }

  /**
   * Validate that specs match expected format
   */
  private validateSpecs(specs: any[]): asserts specs is Specification[] {
    if (!Array.isArray(specs) || specs.length === 0) {
      throw new Error('Specs must be a non-empty array');
    }

    for (const spec of specs) {
      if (!spec.feature_name || typeof spec.feature_name !== 'string') {
        throw new Error('Each spec must have a feature_name string');
      }
      if (
        !spec.complexity ||
        !['simple', 'moderate', 'complex'].includes(spec.complexity)
      ) {
        throw new Error('Each spec must have valid complexity');
      }
      if (!spec.frontend || !Array.isArray(spec.frontend.components)) {
        throw new Error('Each spec must have frontend.components array');
      }
      if (!spec.backend || !Array.isArray(spec.backend.endpoints)) {
        throw new Error('Each spec must have backend.endpoints array');
      }
    }
  }
}
