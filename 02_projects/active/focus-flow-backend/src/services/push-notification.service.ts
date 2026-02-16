import path from 'path';
import {
  getVaultPath,
  ensureDir,
  readJsonFile,
  writeJsonFile,
} from '../utils/file-operations';

const LOG_PREFIX = '[PushNotification]';

const AGENT_DIR = getVaultPath('07_system', 'agent');
const VAPID_KEYS_PATH = path.join(AGENT_DIR, 'vapid-keys.json');
const SUBSCRIPTIONS_PATH = path.join(AGENT_DIR, 'push-subscriptions.json');

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

let webPush: any = null;

class PushNotificationService {
  private vapidKeys: VapidKeys | null = null;
  private subscriptions: PushSubscription[] = [];
  private ready = false;

  constructor() {
    this.initialize().catch(err =>
      console.error(`${LOG_PREFIX} Init failed:`, err.message)
    );
  }

  private async initialize(): Promise<void> {
    await ensureDir(AGENT_DIR);

    // Try to load web-push
    try {
      webPush = await import('web-push');
      if (webPush.default) webPush = webPush.default;
    } catch {
      console.log(`${LOG_PREFIX} web-push not available, push notifications disabled`);
      return;
    }

    // Load or generate VAPID keys
    const savedKeys = await readJsonFile<VapidKeys>(VAPID_KEYS_PATH);
    if (savedKeys?.publicKey && savedKeys?.privateKey) {
      this.vapidKeys = savedKeys;
    } else {
      const keys = webPush.generateVAPIDKeys();
      this.vapidKeys = {
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      };
      await writeJsonFile(VAPID_KEYS_PATH, this.vapidKeys);
      console.log(`${LOG_PREFIX} Generated new VAPID keys`);
    }

    webPush.setVapidDetails(
      'mailto:admin@focusflow.local',
      this.vapidKeys.publicKey,
      this.vapidKeys.privateKey
    );

    // Load subscriptions
    const saved = await readJsonFile<PushSubscription[]>(SUBSCRIPTIONS_PATH);
    if (saved && Array.isArray(saved)) {
      this.subscriptions = saved;
    }

    this.ready = true;
    console.log(`${LOG_PREFIX} Initialized with ${this.subscriptions.length} subscriptions`);
  }

  async subscribe(subscription: PushSubscription): Promise<void> {
    if (!this.ready) return;

    // Deduplicate by endpoint
    const existing = this.subscriptions.findIndex(s => s.endpoint === subscription.endpoint);
    if (existing >= 0) {
      this.subscriptions[existing] = subscription;
    } else {
      this.subscriptions.push(subscription);
    }

    await writeJsonFile(SUBSCRIPTIONS_PATH, this.subscriptions);
    console.log(`${LOG_PREFIX} Subscription stored (total: ${this.subscriptions.length})`);
  }

  async sendPush(title: string, body: string, url?: string): Promise<void> {
    if (!this.ready || !webPush || this.subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url: url || '/' });
    const invalidIndices: number[] = [];

    await Promise.all(
      this.subscriptions.map(async (sub, idx) => {
        try {
          await webPush.sendNotification(sub, payload);
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            invalidIndices.push(idx);
          } else {
            console.error(`${LOG_PREFIX} Push failed:`, err.message);
          }
        }
      })
    );

    // Remove invalid subscriptions
    if (invalidIndices.length > 0) {
      this.subscriptions = this.subscriptions.filter((_, idx) => !invalidIndices.includes(idx));
      await writeJsonFile(SUBSCRIPTIONS_PATH, this.subscriptions);
      console.log(`${LOG_PREFIX} Removed ${invalidIndices.length} invalid subscriptions`);
    }
  }

  getVapidPublicKey(): string {
    return this.vapidKeys?.publicKey || '';
  }
}

export const pushNotificationService = new PushNotificationService();
