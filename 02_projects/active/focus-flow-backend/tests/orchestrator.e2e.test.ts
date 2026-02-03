/**
 * End-to-End Test for Autonomous PRD-to-Code Pipeline
 *
 * This test validates the complete orchestrator flow from PRD intake to code deployment.
 *
 * To run this test:
 * 1. Ensure ANTHROPIC_API_KEY is set in .env
 * 2. Install testing dependencies: npm install --save-dev jest @types/jest ts-jest
 * 3. Run: npm test
 */

import { VaultService } from '../src/services/vault.service';
import { OrchestratorService } from '../src/services/orchestrator.service';
import { Idea } from '../src/models/types';

describe('Autonomous PRD-to-Code Pipeline', () => {
  let vaultService: VaultService;
  let orchestratorService: OrchestratorService;

  beforeEach(() => {
    vaultService = new VaultService();
    orchestratorService = new OrchestratorService();
  });

  /**
   * Full end-to-end test of the orchestrator
   *
   * NOTE: This test requires:
   * - ANTHROPIC_API_KEY environment variable
   * - Write access to vault directories
   * - Claude API access (costs money!)
   */
  it('should process a complete PRD end-to-end', async () => {
    // Skip if no API key (for CI/CD)
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Skipping E2E test: ANTHROPIC_API_KEY not set');
      return;
    }

    // 1. Create PRD Idea
    const idea = await vaultService.createIdea({
      title: 'User Profile Page',
      description: `
## Requirements
- Display user information (name, email, avatar)
- Edit profile button
- Avatar upload functionality
- Save changes to vault

## User Stories
- As a user, I want to view my profile information
- As a user, I want to edit my profile details
- As a user, I want to upload a new avatar

## Constraints
- Must follow Focus Flow dark theme
- Must use Tailwind CSS
- Must use VaultService for data persistence
      `.trim(),
      status: 'inbox',
      metadata: { type: 'prd' },
    });

    console.log(`Created test PRD idea: ${idea.id}`);

    // 2. Run orchestrator
    const run = await orchestratorService.processPRD(idea.id);

    // 3. Verify run completed successfully
    expect(run.state).toBe('complete');
    expect(run.outputs.specs).toBeDefined();
    expect(run.outputs.specs!.length).toBeGreaterThan(0);
    expect(run.outputs.designs).toBeDefined();
    expect(run.outputs.code).toBeDefined();
    expect(run.outputs.validation).toBeDefined();
    expect(run.outputs.validation!.passed).toBe(true);
    expect(run.outputs.deployment).toBeDefined();

    // 4. Verify specs were generated
    const specs = run.outputs.specs!;
    console.log(`Generated ${specs.length} specifications`);
    for (const spec of specs) {
      expect(spec.feature_name).toBeDefined();
      expect(spec.complexity).toMatch(/simple|moderate|complex/);
      expect(spec.frontend.components.length).toBeGreaterThan(0);
    }

    // 5. Verify code was generated
    const code = run.outputs.code!;
    console.log(
      `Generated ${code.frontend.length} frontend, ${code.backend.length} backend files`
    );
    expect(code.frontend.length).toBeGreaterThan(0);

    // 6. Verify validation passed
    const validation = run.outputs.validation!;
    expect(validation.passed).toBe(true);
    expect(validation.errors.length).toBe(0);

    // 7. Verify deployment succeeded
    const deployment = run.outputs.deployment!;
    expect(deployment.frontend_files.length).toBeGreaterThan(0);

    console.log('✓ E2E test passed successfully!');
  }, 120000); // 2 minute timeout for API calls

  /**
   * Test orchestrator error handling
   */
  it('should handle invalid PRD gracefully', async () => {
    const invalidIdea = await vaultService.createIdea({
      title: 'Invalid PRD',
      description: 'This is not a properly formatted PRD',
      status: 'inbox',
      metadata: { type: 'prd' },
    });

    try {
      await orchestratorService.processPRD(invalidIdea.id);
      fail('Should have thrown an error for invalid PRD');
    } catch (error: any) {
      expect(error.message).toContain('Invalid PRD format');
    }
  });

  /**
   * Test run tracking
   */
  it('should track runs in vault', async () => {
    const runs = await orchestratorService.getAllRuns();
    expect(Array.isArray(runs)).toBe(true);
    console.log(`Found ${runs.length} orchestrator runs in vault`);
  });
});
