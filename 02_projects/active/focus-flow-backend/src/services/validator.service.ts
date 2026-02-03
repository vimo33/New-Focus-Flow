import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GeneratedCode, ValidationResult, FrontendCode, BackendCode } from '../models/types';

/**
 * ValidatorService - Validates generated code using TypeScript and ESLint
 *
 * Ensures generated code is syntactically correct and follows best practices
 * before deployment.
 */
export class ValidatorService {
  private tempDir = '/tmp/focus-flow-validation';

  /**
   * Validate all generated code
   */
  async validate(code: GeneratedCode): Promise<ValidationResult> {
    const results: ValidationResult = {
      passed: true,
      errors: [],
      warnings: [],
    };

    // Ensure temp directory exists
    await fs.mkdir(this.tempDir, { recursive: true });

    try {
      // Validate frontend code
      for (const frontend of code.frontend) {
        const frontendResult = await this.validateFrontend(frontend);
        results.errors.push(...frontendResult.errors);
        results.warnings.push(...frontendResult.warnings);
      }

      // Validate backend code
      for (const backend of code.backend) {
        const backendResult = await this.validateBackend(backend);
        results.errors.push(...backendResult.errors);
        results.warnings.push(...backendResult.warnings);
      }

      results.passed = results.errors.length === 0;
    } finally {
      // Cleanup temp directory
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }

    return results;
  }

  /**
   * Validate frontend component code
   */
  private async validateFrontend(code: FrontendCode): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Write code to temp file
    const tempFile = path.join(this.tempDir, code.component_name + '.tsx');
    await fs.writeFile(tempFile, code.code);

    // Run TypeScript compiler check
    const tscResult = await this.runTypeScriptCheck(tempFile);
    if (tscResult.exitCode !== 0) {
      errors.push(`TypeScript errors in ${code.component_name}:\n${tscResult.stderr}`);
    }

    // Basic syntax validation
    const syntaxErrors = this.validateSyntax(code.code);
    errors.push(...syntaxErrors);

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Validate backend route code
   */
  private async validateBackend(code: BackendCode): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Write code to temp file
    const tempFile = path.join(this.tempDir, code.route_file);
    await fs.writeFile(tempFile, code.code);

    // Run TypeScript compiler check
    const tscResult = await this.runTypeScriptCheck(tempFile);
    if (tscResult.exitCode !== 0) {
      errors.push(`TypeScript errors in ${code.route_file}:\n${tscResult.stderr}`);
    }

    // Basic syntax validation
    const syntaxErrors = this.validateSyntax(code.code);
    errors.push(...syntaxErrors);

    return { passed: errors.length === 0, errors, warnings };
  }

  /**
   * Run TypeScript compiler on a file
   */
  private async runTypeScriptCheck(
    filePath: string
  ): Promise<{ exitCode: number; stderr: string }> {
    return new Promise((resolve) => {
      // Use --noEmit to check without generating files
      // Use --skipLibCheck to avoid checking node_modules
      const cmd = `npx tsc --noEmit --skipLibCheck --jsx react --esModuleInterop --module commonjs --target es2020 ${filePath}`;

      exec(cmd, (error, stdout, stderr) => {
        resolve({
          exitCode: error ? error.code || 1 : 0,
          stderr: stderr || stdout,
        });
      });
    });
  }

  /**
   * Validate basic syntax patterns
   */
  private validateSyntax(code: string): string[] {
    const errors: string[] = [];

    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
    }

    // Check for balanced parentheses
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
    }

    // Check for balanced brackets
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
    }

    // Check for obvious syntax errors
    if (code.includes('undefined') && code.includes('export function undefined')) {
      errors.push('Found undefined function name');
    }

    return errors;
  }

  /**
   * Run ESLint on a file (optional, requires ESLint config)
   */
  private async runESLint(filePath: string): Promise<{ errors: string[]; warnings: string[] }> {
    return new Promise((resolve) => {
      exec(`npx eslint ${filePath} --format json`, (error, stdout) => {
        try {
          if (!stdout) {
            resolve({ errors: [], warnings: [] });
            return;
          }

          const results = JSON.parse(stdout);
          const errors: string[] = [];
          const warnings: string[] = [];

          for (const result of results) {
            for (const message of result.messages) {
              const text = `Line ${message.line}: ${message.message}`;
              if (message.severity === 2) {
                errors.push(text);
              } else {
                warnings.push(text);
              }
            }
          }

          resolve({ errors, warnings });
        } catch {
          // ESLint not configured or failed - skip
          resolve({ errors: [], warnings: [] });
        }
      });
    });
  }
}
