import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { networkImporterService } from './network-importer.service';
import { sseManager } from './sse-manager.service';
import type { NetworkContact, SeniorityLevel } from '../models/types';

const USAGE_FILE = '07_system/agent/pdl-usage.json';
const CONTACTS_DIR = '10_profile/network/contacts';

interface PDLUsage {
  month: string;
  used: number;
  limit: number;
}

interface PDLEnrichResult {
  enriched: number;
  skipped: number;
  errors: number;
  budget_exhausted: boolean;
}

class PDLEnrichmentService {
  private async getUsageFilePath(): Promise<string> {
    return path.join(getVaultPath(), USAGE_FILE);
  }

  async getUsage(): Promise<PDLUsage & { remaining: number }> {
    const filePath = await this.getUsageFilePath();
    const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"

    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const usage: PDLUsage = JSON.parse(raw);

      // Reset if month changed
      if (usage.month !== currentMonth) {
        const reset: PDLUsage = { month: currentMonth, used: 0, limit: usage.limit || 100 };
        await fs.writeFile(filePath, JSON.stringify(reset, null, 2));
        return { ...reset, remaining: reset.limit };
      }

      return { ...usage, remaining: Math.max(0, usage.limit - usage.used) };
    } catch {
      // Create default usage file
      const defaults: PDLUsage = { month: currentMonth, used: 0, limit: 100 };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaults, null, 2));
      return { ...defaults, remaining: defaults.limit };
    }
  }

  private async incrementUsage(): Promise<void> {
    const usage = await this.getUsage();
    const updated: PDLUsage = { month: usage.month, used: usage.used + 1, limit: usage.limit };
    const filePath = await this.getUsageFilePath();
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
  }

  async enrichContact(contact: NetworkContact): Promise<Partial<NetworkContact> | null> {
    if (!process.env.PDL_API_KEY) {
      console.warn('[PDL] No PDL_API_KEY configured — skipping enrichment');
      return null;
    }

    // Check budget
    const usage = await this.getUsage();
    if (usage.remaining <= 0) {
      console.warn('[PDL] Monthly budget exhausted');
      return null;
    }

    // Build lookup params
    const params = new URLSearchParams();
    params.set('min_likelihood', '6');
    params.set('titlecase', 'true');

    if (contact.linkedin_url) {
      params.set('profile', contact.linkedin_url);
    } else if (contact.email) {
      params.set('email', contact.email);
    } else if (contact.full_name && contact.company) {
      const nameParts = contact.full_name.split(' ');
      params.set('first_name', nameParts[0] || '');
      params.set('last_name', nameParts.slice(1).join(' ') || '');
      params.set('company', contact.company);
    } else {
      // Not enough data to look up
      return null;
    }

    try {
      const url = `https://api.peopledatalabs.com/v5/person/enrich?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': process.env.PDL_API_KEY,
          'Accept': 'application/json',
        },
      });

      if (response.status === 200) {
        // Charged — increment budget
        await this.incrementUsage();

        const body: any = await response.json();
        // PDL v5 wraps person data in body.data, likelihood at body.likelihood
        const personData = body.data || body;
        personData.likelihood = body.likelihood ?? personData.likelihood;
        return this.mapPDLToContact(contact, personData);
      }

      if (response.status === 404) {
        // Not charged — mark as attempted so we don't retry
        return { enrichment_date: new Date().toISOString() };
      }

      if (response.status === 429) {
        console.warn('[PDL] Rate limited — stopping batch');
        throw new Error('PDL rate limited');
      }

      const errBody = await response.text().catch(() => '');
      console.error(`[PDL] Unexpected status ${response.status}: ${errBody}`);
      throw new Error(`PDL API error: ${response.status}`);
    } catch (err: any) {
      if (err.message === 'PDL rate limited') throw err;
      console.error('[PDL] enrichContact error:', err.message);
      throw err;
    }
  }

  private mapPDLToContact(existing: NetworkContact, data: any): Partial<NetworkContact> {
    const update: Partial<NetworkContact> = {};

    // Only fill empty fields — never clobber user-edited data
    if (!existing.position && data.job_title) {
      update.position = data.job_title;
    }
    if (!existing.company && data.job_company_name) {
      update.company = data.job_company_name;
    }
    if (data.job_company_size) {
      update.company_size = this.mapCompanySize(data.job_company_size);
    }
    if (data.job_company_industry) {
      update.industry = data.job_company_industry;
    } else if (data.industry) {
      update.industry = data.industry;
    }
    if (data.job_title_levels && data.job_title_levels.length > 0) {
      update.seniority = this.mapSeniority(data.job_title_levels);
    }
    if (data.skills && data.skills.length > 0) {
      update.skills = data.skills.slice(0, 10);
    }
    if (!existing.location && data.location_name) {
      update.location = data.location_name;
    }
    if (!existing.linkedin_url && data.linkedin_url) {
      update.linkedin_url = data.linkedin_url;
    }

    // Merge emails
    if (data.emails && data.emails.length > 0) {
      const existingEmails = new Set([
        ...(existing.emails || []),
        ...(existing.email ? [existing.email] : []),
      ].map(e => e.toLowerCase()));

      const newEmails = data.emails
        .map((e: any) => typeof e === 'string' ? e : e.address)
        .filter((e: string) => e && !existingEmails.has(e.toLowerCase()));

      if (newEmails.length > 0) {
        update.emails = [...(existing.emails || []), ...newEmails];
      }
    }

    // Merge phones
    if (data.phone_numbers && data.phone_numbers.length > 0) {
      const existingPhones = new Set(existing.phones || []);
      const newPhones = data.phone_numbers
        .map((p: any) => typeof p === 'string' ? p : p.number || p)
        .filter((p: string) => p && !existingPhones.has(p));

      if (newPhones.length > 0) {
        update.phones = [...(existing.phones || []), ...newPhones];
      }
    }

    // Enrichment metadata
    update.enrichment_date = new Date().toISOString();
    update.enrichment_data = {
      ...(existing.enrichment_data || {}),
      pdl_likelihood: data.likelihood,
    } as any;

    if (data.summary) {
      (update.enrichment_data as any).outreach_angle = data.summary;
    }
    if (data.job_company_total_funding_raised) {
      (update.enrichment_data as any).company_funding = String(data.job_company_total_funding_raised);
    }

    return update;
  }

  private mapCompanySize(size: string): string {
    // PDL returns ranges like "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10001+"
    const sizeMap: Record<string, string> = {
      '1-10': '1-10',
      '11-50': '11-50',
      '51-200': '51-200',
      '201-500': '201-1000',
      '501-1000': '201-1000',
      '1001-5000': '1000+',
      '5001-10000': '1000+',
      '10001+': '1000+',
    };
    return sizeMap[size] || size;
  }

  private mapSeniority(levels: string[]): SeniorityLevel {
    const level = levels[0]?.toLowerCase();
    if (!level) return 'unknown';

    if (level === 'cxo' || level === 'owner') return 'c_suite';
    if (level === 'vp') return 'vp';
    if (level === 'director') return 'director';
    if (level === 'manager') return 'manager';
    if (level === 'senior' || level === 'entry' || level === 'training' || level === 'unpaid') return 'individual_contributor';
    if (level === 'partner') return 'founder';
    return 'unknown';
  }

  async enrichBatch(contacts: NetworkContact[], sseClientId?: string): Promise<PDLEnrichResult> {
    // Filter to unenriched contacts
    const unenriched = contacts.filter(c => !c.enrichment_date);

    // Prioritize: contacts with email or linkedin_url first (higher match probability)
    unenriched.sort((a, b) => {
      const aScore = (a.linkedin_url ? 2 : 0) + (a.email ? 1 : 0);
      const bScore = (b.linkedin_url ? 2 : 0) + (b.email ? 1 : 0);
      return bScore - aScore;
    });

    const result: PDLEnrichResult = { enriched: 0, skipped: 0, errors: 0, budget_exhausted: false };
    const total = unenriched.length;

    for (let i = 0; i < unenriched.length; i++) {
      const contact = unenriched[i];

      // Check budget before each call
      const usage = await this.getUsage();
      if (usage.remaining <= 0) {
        result.budget_exhausted = true;
        result.skipped += (unenriched.length - i);
        this.broadcastEnrichProgress(sseClientId, {
          status: 'budget_exhausted',
          processed: i,
          total,
          enriched: result.enriched,
          errors: result.errors,
        });
        break;
      }

      try {
        const update = await this.enrichContact(contact);
        if (update) {
          await networkImporterService.updateContact(contact.id, update);
          result.enriched++;
        } else {
          result.skipped++;
        }
      } catch (err: any) {
        if (err.message === 'PDL rate limited') {
          result.budget_exhausted = true;
          result.skipped += (unenriched.length - i);
          this.broadcastEnrichProgress(sseClientId, {
            status: 'rate_limited',
            processed: i,
            total,
            enriched: result.enriched,
            errors: result.errors,
          });
          break;
        }
        result.errors++;
      }

      // Broadcast progress
      this.broadcastEnrichProgress(sseClientId, {
        status: 'enriching',
        processed: i + 1,
        total,
        enriched: result.enriched,
        errors: result.errors,
      });
    }

    // Final broadcast
    if (!result.budget_exhausted) {
      this.broadcastEnrichProgress(sseClientId, {
        status: 'completed',
        processed: total,
        total,
        enriched: result.enriched,
        errors: result.errors,
      });
    }

    return result;
  }

  private broadcastEnrichProgress(sseClientId: string | undefined, data: any): void {
    if (sseClientId) {
      sseManager.send(sseClientId, 'enrich_progress', data);
    }
    sseManager.broadcast('enrich_progress', data);
  }
}

export const pdlEnrichmentService = new PDLEnrichmentService();
