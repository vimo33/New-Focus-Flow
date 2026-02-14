import { load, CheerioAPI } from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Specification,
  ParsedDesign,
  Layout,
  Component,
  StyleGuide,
  FormField,
} from '../models/types';
import { getVaultPath } from '../utils/file-operations';

/**
 * DesignParserService - Parses Stitch HTML/PNG exports into structured design data
 *
 * Maps feature specifications to existing Stitch design exports and extracts
 * layout, components, and styling information from HTML files.
 */
export class DesignParserService {
  private stitchExportsPath = getVaultPath('07_system', 'designs');

  /**
   * Parse Stitch exports for each specification
   */
  async parseStitchExports(specs: Specification[]): Promise<ParsedDesign[]> {
    const designs: ParsedDesign[] = [];

    for (const spec of specs) {
      // Try to find matching Stitch export
      const matchingExport = await this.findMatchingExport(spec.feature_name);

      if (matchingExport) {
        try {
          const parsed = await this.parseExport(matchingExport);
          const design: ParsedDesign = {
            feature_name: spec.feature_name,
            source: matchingExport,
            html_path: parsed.html_path,
            png_path: parsed.png_path,
            layout: parsed.layout || this.createDefaultDesign(spec).layout,
            components: parsed.components || [],
            styles: parsed.styles || this.createDefaultDesign(spec).styles,
          };
          designs.push(design);
        } catch (error: any) {
          console.warn(
            `Failed to parse Stitch export for ${spec.feature_name}: ${error.message}`
          );
          // Fallback to default design
          designs.push(this.createDefaultDesign(spec));
        }
      } else {
        // No matching design - use default/template
        designs.push(this.createDefaultDesign(spec));
      }
    }

    return designs;
  }

  /**
   * Find Stitch export directory matching a feature name
   */
  private async findMatchingExport(featureName: string): Promise<string | null> {
    try {
      const exports = await fs.readdir(this.stitchExportsPath);

      // Try exact match first
      const normalized = featureName.toLowerCase().replace(/\s+/g, '_');
      const exactMatch = exports.find((dir) => dir.toLowerCase().includes(normalized));

      if (exactMatch) {
        return path.join(this.stitchExportsPath, exactMatch);
      }

      // Try fuzzy match using keywords
      const keywords = featureName.toLowerCase().split(/\s+/);
      const fuzzyMatch = exports.find((dir) => {
        const dirLower = dir.toLowerCase();
        return keywords.some((keyword) => dirLower.includes(keyword));
      });

      return fuzzyMatch ? path.join(this.stitchExportsPath, fuzzyMatch) : null;
    } catch (error) {
      console.warn(`Could not access Stitch exports directory: ${error}`);
      return null;
    }
  }

  /**
   * Parse a Stitch export directory
   */
  private async parseExport(exportPath: string): Promise<Partial<ParsedDesign>> {
    const htmlPath = path.join(exportPath, 'code.html');
    const pngPath = path.join(exportPath, 'screen.png');

    // Read HTML file
    const html = await fs.readFile(htmlPath, 'utf-8');

    // Extract structure using cheerio
    const $ = load(html);

    // Parse layout
    const layout = this.parseLayout($);

    // Parse components
    const components = this.parseComponents($);

    // Parse styles
    const styles = this.parseStyles($);

    return {
      html_path: htmlPath,
      png_path: pngPath,
      layout,
      components,
      styles,
    };
  }

  /**
   * Parse layout structure from HTML
   */
  private parseLayout($: CheerioAPI): Layout {
    const body = $('body');

    return {
      type: this.detectLayoutType($, body),
      sections: this.extractSections($, body),
      responsive: this.extractResponsiveClasses($, body),
    };
  }

  /**
   * Detect layout type from HTML structure
   */
  private detectLayoutType(
    $: CheerioAPI,
    body: any
  ): 'single-column' | 'two-column' | 'grid' | 'sidebar' | 'custom' {
    const classes = body.attr('class') || '';

    if (classes.includes('grid')) return 'grid';
    if (classes.includes('sidebar')) return 'sidebar';
    if (classes.includes('two-column') || classes.includes('flex-row')) return 'two-column';

    return 'single-column';
  }

  /**
   * Extract layout sections
   */
  private extractSections($: CheerioAPI, body: any): any[] {
    const sections: any[] = [];

    $('section, div[class*="section"], main, aside').each((_, el) => {
      const $el = $(el);
      sections.push({
        name: $el.attr('id') || $el.attr('class')?.split(' ')[0] || 'unnamed',
        width: this.extractWidth($el.attr('class') || ''),
        position: this.extractPosition($el.attr('class') || ''),
      });
    });

    // Default if no sections found
    if (sections.length === 0) {
      sections.push({ name: 'main', width: '100%' });
    }

    return sections;
  }

  /**
   * Extract width from Tailwind classes
   */
  private extractWidth(classes: string): string {
    if (classes.includes('w-full')) return '100%';
    if (classes.includes('w-1/2')) return '50%';
    if (classes.includes('w-1/3')) return '33.33%';
    if (classes.includes('w-2/3')) return '66.67%';
    if (classes.includes('w-1/4')) return '25%';
    return 'auto';
  }

  /**
   * Extract position from Tailwind classes
   */
  private extractPosition(classes: string): 'left' | 'right' | 'center' | undefined {
    if (classes.includes('float-left') || classes.includes('justify-start')) return 'left';
    if (classes.includes('float-right') || classes.includes('justify-end')) return 'right';
    if (classes.includes('mx-auto') || classes.includes('justify-center')) return 'center';
    return undefined;
  }

  /**
   * Extract responsive breakpoints
   */
  private extractResponsiveClasses($: CheerioAPI, body: any): any {
    const html = body.html() || '';
    return {
      mobile: html.includes('sm:') || html.includes('max-sm:'),
      tablet: html.includes('md:') || html.includes('max-md:'),
      desktop: html.includes('lg:') || html.includes('xl:'),
    };
  }

  /**
   * Parse components from HTML
   */
  private parseComponents($: CheerioAPI): Component[] {
    const components: Component[] = [];

    // Find buttons
    $('button').each((_, el) => {
      const $el = $(el);
      components.push({
        type: 'button',
        classes: $el.attr('class') || '',
        text: $el.text().trim(),
        onClick: $el.attr('onclick'),
      });
    });

    // Find forms
    $('form').each((_, el) => {
      const $el = $(el);
      components.push({
        type: 'form',
        fields: this.extractFormFields($, $el),
        action: $el.attr('action'),
      });
    });

    // Find lists
    $('ul, ol').each((_, el) => {
      const $el = $(el);
      components.push({
        type: 'list',
        items: $el
          .find('li')
          .map((_, li) => $(li).text().trim())
          .get(),
      });
    });

    // Find tables
    $('table').each((_, el) => {
      components.push({
        type: 'table',
        classes: $(el).attr('class') || '',
      });
    });

    // Find cards (common pattern: div with card class)
    $('div[class*="card"]').each((_, el) => {
      components.push({
        type: 'card',
        classes: $(el).attr('class') || '',
      });
    });

    return components;
  }

  /**
   * Extract form fields
   */
  private extractFormFields($: CheerioAPI, form: any): FormField[] {
    const fields: FormField[] = [];

    form.find('input, textarea, select').each((_: any, el: any) => {
      const $el = $(el);
      fields.push({
        name: $el.attr('name') || '',
        type: $el.attr('type') || 'text',
        label: $el.attr('placeholder') || $el.prev('label').text() || '',
        required: $el.attr('required') !== undefined,
      });
    });

    return fields;
  }

  /**
   * Parse styles from HTML
   */
  private parseStyles($: CheerioAPI): StyleGuide {
    const allClasses = new Set<string>();

    $('*').each((_, el) => {
      const classes = $(el).attr('class');
      if (classes) {
        classes.split(/\s+/).forEach((cls) => allClasses.add(cls));
      }
    });

    return {
      colors: this.extractColors(allClasses),
      spacing: this.extractSpacing(allClasses),
      typography: this.extractTypography(allClasses),
      theme: this.detectTheme(allClasses),
    };
  }

  /**
   * Extract color classes
   */
  private extractColors(classes: Set<string>): Record<string, string> {
    const colors: Record<string, string> = {};

    for (const cls of classes) {
      if (cls.includes('bg-')) {
        colors.background = cls;
      }
      if (cls.includes('text-') && !cls.includes('text-[')) {
        colors.text = cls;
      }
      if (cls.includes('border-')) {
        colors.border = cls;
      }
    }

    // Defaults
    return {
      primary: '#137fec',
      background: '#101922',
      ...colors,
    };
  }

  /**
   * Extract spacing classes
   */
  private extractSpacing(classes: Set<string>): Record<string, string> {
    const spacing: Record<string, string> = {};

    for (const cls of classes) {
      if (cls.startsWith('p-') || cls.startsWith('m-')) {
        spacing[cls] = cls;
      }
    }

    return spacing;
  }

  /**
   * Extract typography classes
   */
  private extractTypography(classes: Set<string>): any {
    const sizes: Record<string, string> = {};

    for (const cls of classes) {
      if (cls.startsWith('text-')) {
        sizes[cls] = cls;
      }
    }

    return {
      font: 'Inter',
      sizes: { base: '16px', ...sizes },
    };
  }

  /**
   * Detect theme (light/dark)
   */
  private detectTheme(classes: Set<string>): 'light' | 'dark' {
    for (const cls of classes) {
      if (cls.includes('dark') || cls.includes('bg-gray-900') || cls.includes('bg-black')) {
        return 'dark';
      }
    }
    return 'light';
  }

  /**
   * Create default design if no Stitch export found
   */
  private createDefaultDesign(spec: Specification): ParsedDesign {
    return {
      feature_name: spec.feature_name,
      source: 'generated',
      layout: {
        type: 'single-column',
        sections: [{ name: 'main', width: '100%' }],
        responsive: { mobile: true, tablet: true, desktop: true },
      },
      components: [],
      styles: {
        colors: { primary: '#137fec', background: '#101922' },
        spacing: { default: '1rem' },
        typography: { font: 'Inter', sizes: { base: '16px' } },
        theme: 'dark',
      },
    };
  }
}
