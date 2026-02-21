import axios from 'axios';

/**
 * CoolifyService - Wraps the Coolify API for deployment triggers.
 *
 * Coolify is a self-hosted PaaS. This service triggers builds/deployments
 * for Nitara applications.
 */

interface CoolifyApp {
  id: string;
  name: string;
  status: string;
  fqdn?: string;
}

interface DeploymentStatus {
  id: string;
  status: 'queued' | 'building' | 'deploying' | 'running' | 'failed' | 'stopped';
  started_at?: string;
  finished_at?: string;
}

export class CoolifyService {
  private baseUrl: string;
  private token: string;
  private available: boolean;

  constructor() {
    this.baseUrl = process.env.COOLIFY_URL || 'http://localhost:8000';
    this.token = process.env.COOLIFY_TOKEN || '';
    this.available = !!this.token;

    if (!this.available) {
      console.warn('[Coolify] No COOLIFY_TOKEN set — deployment triggers disabled');
    }
  }

  get isAvailable(): boolean {
    return this.available;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async listApplications(): Promise<CoolifyApp[]> {
    if (!this.available) return [];
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/applications`, {
        headers: this.headers,
        timeout: 10000,
      });
      return res.data;
    } catch (err: any) {
      console.error('[Coolify] Failed to list apps:', err.message);
      return [];
    }
  }

  async triggerDeploy(appId: string): Promise<{ success: boolean; message: string }> {
    if (!this.available) {
      return { success: false, message: 'Coolify not configured (no token)' };
    }
    try {
      await axios.post(
        `${this.baseUrl}/api/v1/applications/${appId}/restart`,
        {},
        { headers: this.headers, timeout: 30000 }
      );
      return { success: true, message: `Deployment triggered for app ${appId}` };
    } catch (err: any) {
      return { success: false, message: `Deploy failed: ${err.message}` };
    }
  }

  async getDeploymentStatus(appId: string): Promise<DeploymentStatus | null> {
    if (!this.available) return null;
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/v1/applications/${appId}`,
        { headers: this.headers, timeout: 10000 }
      );
      return {
        id: appId,
        status: res.data.status || 'unknown',
        started_at: res.data.started_at,
        finished_at: res.data.finished_at,
      };
    } catch (err: any) {
      console.error('[Coolify] Failed to get status:', err.message);
      return null;
    }
  }
}

export const coolifyService = new CoolifyService();
