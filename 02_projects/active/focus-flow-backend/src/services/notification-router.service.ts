import path from 'path';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../models/types';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
  listFiles,
  deleteFile,
} from '../utils/file-operations';
import { generateNotificationId } from '../utils/id-generator';
import { sseManager } from './sse-manager.service';
import { pushNotificationService } from './push-notification.service';

const LOG_PREFIX = '[NotificationRouter]';

const NOTIFICATIONS_DIR = getVaultPath('07_system', 'agent', 'notifications');
const RETENTION_DAYS = 30;

interface SendOptions {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  data?: Record<string, any>;
  action_url?: string;
  requires_response?: boolean;
  approval_id?: string;
}

class NotificationRouterService {
  constructor() {
    ensureDir(NOTIFICATIONS_DIR).catch(err =>
      console.error(`${LOG_PREFIX} Failed to ensure notifications dir:`, err.message)
    );
  }

  async send(options: SendOptions): Promise<Notification> {
    const notification: Notification = {
      id: generateNotificationId(),
      type: options.type,
      priority: options.priority,
      title: options.title,
      body: options.body,
      data: options.data,
      action_url: options.action_url,
      requires_response: options.requires_response,
      approval_id: options.approval_id,
      created_at: new Date().toISOString(),
    };

    // Persist to file
    await writeJsonFile(
      path.join(NOTIFICATIONS_DIR, `${notification.id}.json`),
      notification
    );

    // Broadcast via SSE
    sseManager.broadcast('notification', notification);

    // Send push for high/urgent priority
    if (options.priority === 'high' || options.priority === 'urgent') {
      pushNotificationService.sendPush(
        options.title,
        options.body,
        options.action_url
      ).catch(err => console.error(`${LOG_PREFIX} Push failed:`, err.message));
    }

    console.log(`${LOG_PREFIX} Sent ${notification.type} notification: ${notification.title}`);
    return notification;
  }

  async getAll(limit = 50): Promise<Notification[]> {
    const files = await listFiles(NOTIFICATIONS_DIR);
    const notifications: Notification[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const n = await readJsonFile<Notification>(path.join(NOTIFICATIONS_DIR, file));
      if (n) notifications.push(n);
    }

    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return notifications.slice(0, limit);
  }

  async getUnread(): Promise<Notification[]> {
    const all = await this.getAll(200);
    return all.filter(n => !n.read_at && !n.dismissed_at);
  }

  async markRead(id: string): Promise<Notification | null> {
    const filePath = path.join(NOTIFICATIONS_DIR, `${id}.json`);
    const n = await readJsonFile<Notification>(filePath);
    if (!n) return null;

    n.read_at = new Date().toISOString();
    await writeJsonFile(filePath, n);

    sseManager.broadcast('notification_read', { id });
    return n;
  }

  async dismiss(id: string): Promise<Notification | null> {
    const filePath = path.join(NOTIFICATIONS_DIR, `${id}.json`);
    const n = await readJsonFile<Notification>(filePath);
    if (!n) return null;

    n.dismissed_at = new Date().toISOString();
    await writeJsonFile(filePath, n);

    sseManager.broadcast('notification_dismissed', { id });
    return n;
  }

  async pruneOld(): Promise<number> {
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const files = await listFiles(NOTIFICATIONS_DIR);
    let pruned = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(NOTIFICATIONS_DIR, file);
      const n = await readJsonFile<Notification>(filePath);
      if (n && new Date(n.created_at).getTime() < cutoff) {
        await deleteFile(filePath);
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`${LOG_PREFIX} Pruned ${pruned} notifications older than ${RETENTION_DAYS} days`);
    }
    return pruned;
  }
}

export const notificationRouter = new NotificationRouterService();
