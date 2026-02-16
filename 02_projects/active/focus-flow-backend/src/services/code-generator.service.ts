import { cachedInference } from './cached-inference.service';
import {
  Specification,
  ParsedDesign,
  GeneratedCode,
  FrontendCode,
  BackendCode,
  TestCode,
} from '../models/types';

/**
 * CodeGeneratorService - Generates React components and Express routes using OpenClaw Gateway
 *
 * Transforms technical specifications and design data into production-ready code
 * following Nitara's architectural patterns.
 */
export class CodeGeneratorService {
  constructor() {
    // Uses CachedInferenceClient → OpenClaw Gateway for Claude access
  }

  /**
   * Generate complete codebase from specifications and designs
   */
  async generate(
    specs: Specification[],
    designs: ParsedDesign[]
  ): Promise<GeneratedCode> {
    const code: GeneratedCode = {
      frontend: [],
      backend: [],
      tests: [],
    };

    // Generate for each feature
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      const design = designs[i];

      // Generate frontend component
      const frontendCode = await this.generateFrontendComponent(spec, design);
      code.frontend.push(frontendCode);

      // Generate backend endpoints
      if (spec.backend.endpoints.length > 0) {
        const backendCode = await this.generateBackendEndpoints(spec);
        code.backend.push(backendCode);
      }

      // Generate tests
      const testCode = await this.generateTests(spec);
      code.tests.push(testCode);
    }

    return code;
  }

  /**
   * Generate React component from specification and design
   */
  private async generateFrontendComponent(
    spec: Specification,
    design: ParsedDesign
  ): Promise<FrontendCode> {
    const systemPrompt = `You are an expert React developer generating production-ready components.

Generate a React component following these patterns:
- React 19 with TypeScript
- Functional components with hooks
- Tailwind CSS for styling (dark theme by default)
- Material Symbols icons
- Zustand for state management
- Type-safe with interfaces

Output structure (MUST be valid JSON):
{
  "component_name": "FeatureName",
  "code": "full TypeScript React component code as string",
  "types": "TypeScript interfaces as string",
  "route": "/path"
}

IMPORTANT: Escape all quotes in the code and types strings properly for JSON.`;

    const userMessage = `Generate a React component for this feature:

Feature: ${spec.feature_name}
Description: ${spec.description}

Frontend Requirements:
- Components: ${spec.frontend.components.join(', ')}
- Routes: ${spec.frontend.routes.join(', ')}
- State: ${spec.frontend.state.join(', ')}

Design Reference:
- Layout: ${design.layout.type}
- Theme: ${design.styles.theme}
- Colors: ${JSON.stringify(design.styles.colors)}
- Components found: ${design.components.map((c) => c.type).join(', ')}

Follow this pattern:

import { useState } from 'react';

interface ${this.toComponentName(spec.feature_name)}Props {
  // Define props based on requirements
}

export function ${this.toComponentName(spec.feature_name)}({ }: ${this.toComponentName(spec.feature_name)}Props) {
  return (
    <div className="min-h-screen bg-[#101922] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Component content based on design */}
      </div>
    </div>
  );
}

Generate ONLY valid JSON with the structure above.`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'code_generation',
        'standard',
        { max_tokens: 4000, temperature: 0.4 }
      );

      const response = JSON.parse(responseText);

      const componentName = this.toComponentName(spec.feature_name);

      return {
        component_name: componentName,
        file_path: `/srv/focus-flow/02_projects/active/focus-flow-ui/src/components/${componentName}/${componentName}.tsx`,
        code: response.code,
        types: response.types || '',
        route: response.route || spec.frontend.routes[0] || `/${componentName.toLowerCase()}`,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse frontend code response as JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate Express routes from specification
   */
  private async generateBackendEndpoints(spec: Specification): Promise<BackendCode> {
    const systemPrompt = `You are an expert backend developer generating Express API endpoints.

Generate Express routes following these patterns:
- Express 5 with TypeScript
- VaultService for data persistence
- Async/await error handling
- Type-safe with interfaces
- RESTful conventions

Output structure (MUST be valid JSON):
{
  "route_file": "feature.routes.ts",
  "code": "full TypeScript Express route code as string",
  "models": "TypeScript interfaces as string"
}

IMPORTANT: Escape all quotes in the code and models strings properly for JSON.`;

    const userMessage = `Generate Express endpoints for this feature:

Feature: ${spec.feature_name}
Description: ${spec.description}

Backend Requirements:
${spec.backend.endpoints.map((ep) => `- ${ep.method} ${ep.path}: ${ep.purpose}`).join('\n')}

Data Models: ${spec.backend.models.join(', ')}

Follow this pattern:

import { Router, Request, Response } from 'express';
import { VaultService } from '../services/vault.service';

const router = Router();
const vaultService = new VaultService();

router.get('/endpoint', async (req: Request, res: Response) => {
  try {
    const result = await vaultService.getData('path');
    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

Generate ONLY valid JSON with the structure above.`;

    try {
      const responseText = await cachedInference.complete(
        userMessage,
        systemPrompt,
        'code_generation',
        'standard',
        { max_tokens: 3000, temperature: 0.3 }
      );

      const response = JSON.parse(responseText);

      const routeFileName = this.toRouteFileName(spec.feature_name);

      return {
        route_file: routeFileName,
        file_path: `/srv/focus-flow/02_projects/active/focus-flow-backend/src/routes/${routeFileName}`,
        code: response.code,
        models: response.models || '',
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Failed to parse backend code response as JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate tests for a feature
   */
  private async generateTests(spec: Specification): Promise<TestCode> {
    const componentName = this.toComponentName(spec.feature_name);

    // Basic test template
    const testCode = `import { describe, it, expect } from '@jest/globals';
// TODO: Import component and test utilities

describe('${componentName}', () => {
  it('should render successfully', () => {
    // TODO: Implement test
    expect(true).toBe(true);
  });

  it('should meet acceptance criteria', () => {
    // Acceptance Criteria:
${spec.acceptance_criteria.map((c) => `    // - ${c}`).join('\n')}
  });
});
`;

    return {
      test_file: `${componentName}.test.ts`,
      file_path: `/srv/focus-flow/02_projects/active/focus-flow-ui/src/components/${componentName}/${componentName}.test.ts`,
      code: testCode,
    };
  }

  /**
   * Convert feature name to PascalCase component name
   */
  private toComponentName(featureName: string): string {
    return featureName
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Convert feature name to kebab-case route file name
   */
  private toRouteFileName(featureName: string): string {
    return featureName.toLowerCase().replace(/\s+/g, '-') + '.routes.ts';
  }
}
