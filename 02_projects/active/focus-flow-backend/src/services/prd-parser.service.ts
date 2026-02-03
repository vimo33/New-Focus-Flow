import { Idea, PRDDocument } from '../models/types';

/**
 * PRDParserService - Parses Idea documents into structured PRD format
 *
 * Extracts markdown sections from idea descriptions:
 * - ## Requirements
 * - ## User Stories
 * - ## Constraints
 * - ## Success Metrics
 */
export class PRDParserService {
  /**
   * Parse an Idea marked as type:"prd" into structured PRDDocument
   */
  async parseFromIdea(idea: Idea): Promise<PRDDocument> {
    const sections = this.extractSections(idea.description);

    return {
      id: idea.id,
      title: idea.title,
      description: sections.description || idea.description,
      requirements: sections.requirements || [],
      user_stories: sections.user_stories,
      constraints: sections.constraints,
      success_metrics: sections.success_metrics,
    };
  }

  /**
   * Extract markdown sections from description
   *
   * Example format:
   * ## Requirements
   * - Requirement 1
   * - Requirement 2
   *
   * ## User Stories
   * - As a user, I want...
   */
  private extractSections(markdown: string): Record<string, any> {
    const sections: Record<string, any> = {};
    const lines = markdown.split('\n');
    let currentSection = 'description';
    let buffer: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section
        if (buffer.length > 0) {
          sections[currentSection] = this.parseSection(currentSection, buffer);
          buffer = [];
        }
        // Start new section
        currentSection = line
          .substring(3)
          .toLowerCase()
          .replace(/\s+/g, '_');
      } else {
        buffer.push(line);
      }
    }

    // Save final section
    if (buffer.length > 0) {
      sections[currentSection] = this.parseSection(currentSection, buffer);
    }

    return sections;
  }

  /**
   * Parse a section into appropriate format
   * - Bullet points → array
   * - Plain text → string
   */
  private parseSection(section: string, lines: string[]): any {
    // Convert bullet points to array
    const bulletPoints = lines
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.trim().substring(1).trim())
      .filter((line) => line.length > 0);

    if (bulletPoints.length > 0) {
      return bulletPoints;
    }

    // Otherwise return as text
    return lines.join('\n').trim();
  }

  /**
   * Validate that an idea is properly formatted as a PRD
   */
  validatePRD(idea: Idea): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check metadata type
    if (!idea.metadata?.type || idea.metadata.type !== 'prd') {
      errors.push('Idea metadata must include type: "prd"');
    }

    // Check for required sections
    const sections = this.extractSections(idea.description);

    if (!sections.requirements || sections.requirements.length === 0) {
      errors.push('PRD must include ## Requirements section with at least one requirement');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
