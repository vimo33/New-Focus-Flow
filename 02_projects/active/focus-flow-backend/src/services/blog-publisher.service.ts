import path from 'path';
import {
  ContentCalendarEntry,
  PublishResult,
} from '../models/types';
import { trustGate } from './trust-gate.service';
import {
  getVaultPath,
  writeJsonFile,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import fs from 'fs/promises';

const LOG_PREFIX = '[BlogPublisher]';

class BlogPublisherService {
  async publish(entry: ContentCalendarEntry): Promise<PublishResult> {
    console.log(`${LOG_PREFIX} Publishing blog entry: ${entry.title}`);

    const approval = await trustGate.createApproval(
      {
        id: generateId('act'),
        type: 'publish_blog',
        project_id: entry.project_id,
        description: `Publish blog post: "${entry.title}"`,
        parameters: { entry_id: entry.id, channel: 'blog' },
      },
      `Blog post "${entry.title}" scheduled for ${entry.scheduled_date}`,
      `Content has been drafted and is ready for publishing. Content length: ${entry.draft_content?.length || 0} chars.`
    );

    return {
      success: false,
      channel: 'blog',
      approval_required: true,
      approval_id: approval.id,
    };
  }

  async executePublish(entry: ContentCalendarEntry): Promise<PublishResult> {
    try {
      const date = entry.scheduled_date || new Date().toISOString().split('T')[0];
      const slug = entry.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);

      const filename = `${date}-${slug}.md`;
      const publishDir = getVaultPath('11_marketing', 'published', 'blog');
      const filePath = path.join(publishDir, filename);

      const frontmatter = [
        '---',
        `title: "${entry.title.replace(/"/g, '\\"')}"`,
        `date: "${date}"`,
        `channel: blog`,
        `project_id: "${entry.project_id}"`,
        `calendar_entry_id: "${entry.id}"`,
        `tone: "${entry.tone}"`,
        `published_at: "${new Date().toISOString()}"`,
        '---',
        '',
      ].join('\n');

      const content = frontmatter + (entry.draft_content || '');

      await fs.mkdir(publishDir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');

      console.log(`${LOG_PREFIX} Published blog to ${filePath}`);

      return {
        success: true,
        channel: 'blog',
        url: filePath,
      };
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to publish:`, err.message);
      return {
        success: false,
        channel: 'blog',
        error: err.message,
      };
    }
  }
}

export const blogPublisher = new BlogPublisherService();
