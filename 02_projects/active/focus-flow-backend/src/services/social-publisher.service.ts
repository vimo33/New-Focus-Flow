import {
  ContentCalendarEntry,
  ContentChannel,
  PublishResult,
} from '../models/types';
import { trustGate } from './trust-gate.service';
import {
  getVaultPath,
  writeJsonFile,
} from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

const LOG_PREFIX = '[SocialPublisher]';

const CHANNEL_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
};

class SocialPublisherService {
  async publish(
    entry: ContentCalendarEntry,
    channel: 'twitter' | 'linkedin'
  ): Promise<PublishResult> {
    const limit = CHANNEL_LIMITS[channel];
    if (limit && entry.draft_content && entry.draft_content.length > limit) {
      return {
        success: false,
        channel,
        error: `Content exceeds ${channel} limit of ${limit} characters (got ${entry.draft_content.length})`,
      };
    }

    console.log(`${LOG_PREFIX} Publishing ${channel} post: ${entry.title}`);

    const approval = await trustGate.createApproval(
      {
        id: generateId('act'),
        type: 'publish_social',
        project_id: entry.project_id,
        description: `Publish ${channel} post: "${entry.title}"`,
        parameters: { entry_id: entry.id, channel },
      },
      `${channel} post "${entry.title}" scheduled for ${entry.scheduled_date}`,
      `Social post ready for ${channel}. Content length: ${entry.draft_content?.length || 0} chars.`
    );

    return {
      success: false,
      channel,
      approval_required: true,
      approval_id: approval.id,
    };
  }

  async executePublish(
    entry: ContentCalendarEntry,
    channel: 'twitter' | 'linkedin'
  ): Promise<PublishResult> {
    try {
      const postRecord = {
        id: generateId('social'),
        entry_id: entry.id,
        project_id: entry.project_id,
        channel,
        title: entry.title,
        content: entry.draft_content || '',
        api_posted: false,
        published_at: new Date().toISOString(),
      };

      const filePath = getVaultPath(
        '11_marketing', 'published', 'social', `${postRecord.id}.json`
      );
      await writeJsonFile(filePath, postRecord);

      console.log(`${LOG_PREFIX} Saved ${channel} post record: ${postRecord.id}`);

      return {
        success: true,
        channel,
        url: filePath,
      };
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to publish ${channel}:`, err.message);
      return {
        success: false,
        channel,
        error: err.message,
      };
    }
  }
}

export const socialPublisher = new SocialPublisherService();
