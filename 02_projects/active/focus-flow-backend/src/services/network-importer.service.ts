import * as fs from 'fs/promises';
import * as path from 'path';
import AdmZip from 'adm-zip';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { cachedInference } from './cached-inference.service';
import { sseManager } from './sse-manager.service';
import type {
  NetworkContact,
  RelationshipType,
  RelationshipStrength,
  BusinessValue,
  ImportJob,
  ImportJobStatus,
} from '../models/types';

const NETWORK_DIR = '10_profile/network';
const CONTACTS_DIR = path.join(NETWORK_DIR, 'contacts');
const IMPORTS_DIR = path.join(NETWORK_DIR, 'imports');

export class NetworkImporterService {
  private async ensureDirs() {
    const base = getVaultPath();
    await fs.mkdir(path.join(base, CONTACTS_DIR), { recursive: true });
    await fs.mkdir(path.join(base, IMPORTS_DIR), { recursive: true });
  }

  async getContacts(search?: string, relationship?: string): Promise<NetworkContact[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), CONTACTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const contacts: NetworkContact[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        contacts.push(data);
      }

      let filtered = contacts;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(c =>
          c.full_name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.position?.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q))
        );
      }
      if (relationship) {
        filtered = filtered.filter(c => c.relationship_type === relationship);
      }

      return filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    } catch {
      return [];
    }
  }

  async getContact(id: string): Promise<NetworkContact | null> {
    try {
      const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${id}.json`);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return data;
    } catch {
      return null;
    }
  }

  async updateContact(id: string, data: Partial<NetworkContact>): Promise<NetworkContact | null> {
    const contact = await this.getContact(id);
    if (!contact) return null;

    const updated = { ...contact, ...data, id: contact.id, updated_at: new Date().toISOString() };
    const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async createContact(data: Partial<NetworkContact>): Promise<NetworkContact> {
    await this.ensureDirs();
    const contact: NetworkContact = {
      id: generateId('nc'),
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      email: data.email,
      company: data.company,
      position: data.position,
      location: data.location,
      linkedin_url: data.linkedin_url,
      relationship_type: data.relationship_type || 'other',
      relationship_strength: data.relationship_strength || 'moderate',
      business_value: data.business_value || 'unknown',
      tags: data.tags || [],
      notes: data.notes,
      last_contacted: data.last_contacted,
      ai_summary: data.ai_summary,
      ai_tags: data.ai_tags,
      imported_from: data.imported_from,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${contact.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(contact, null, 2));
    return contact;
  }

  async importLinkedInZip(zipPath: string, sseClientId?: string): Promise<ImportJob> {
    await this.ensureDirs();

    const job: ImportJob = {
      id: generateId('imp'),
      source: 'linkedin',
      status: 'extracting',
      total_contacts: 0,
      processed_contacts: 0,
      created_contacts: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };

    // Save initial job state
    await this.saveJob(job);
    this.broadcastProgress(sseClientId, job);

    // Process in background
    this.processLinkedInZip(zipPath, job, sseClientId).catch(err => {
      console.error('[NetworkImporter] Import failed:', err.message);
    });

    return job;
  }

  private async processLinkedInZip(zipPath: string, job: ImportJob, sseClientId?: string): Promise<void> {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      // Find Connections.csv in the ZIP
      const connectionsEntry = entries.find(e =>
        e.entryName.toLowerCase().includes('connections') && e.entryName.endsWith('.csv')
      );

      if (!connectionsEntry) {
        job.status = 'failed';
        job.errors.push('No Connections.csv found in ZIP');
        await this.saveJob(job);
        this.broadcastProgress(sseClientId, job);
        return;
      }

      const csvContent = connectionsEntry.getData().toString('utf-8');
      const rows = this.parseCSV(csvContent);

      if (rows.length === 0) {
        job.status = 'failed';
        job.errors.push('No contacts found in CSV');
        await this.saveJob(job);
        this.broadcastProgress(sseClientId, job);
        return;
      }

      job.total_contacts = rows.length;
      job.status = 'enriching';
      await this.saveJob(job);
      this.broadcastProgress(sseClientId, job);

      // Process contacts in batches
      const BATCH_SIZE = 10;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        for (const row of batch) {
          try {
            const contact = await this.createContact({
              first_name: row['First Name'] || '',
              last_name: row['Last Name'] || '',
              full_name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim(),
              email: row['Email Address'] || undefined,
              company: row['Company'] || undefined,
              position: row['Position'] || undefined,
              linkedin_url: row['URL'] || undefined,
              relationship_type: 'colleague',
              relationship_strength: 'moderate',
              business_value: 'unknown',
              tags: [],
              last_contacted: row['Connected On'] || undefined,
              imported_from: 'linkedin',
            });

            job.created_contacts++;
          } catch (err: any) {
            job.errors.push(`Failed to import ${row['First Name']} ${row['Last Name']}: ${err.message}`);
          }

          job.processed_contacts++;
        }

        await this.saveJob(job);
        this.broadcastProgress(sseClientId, job);
      }

      // AI enrichment pass (batch enrichment for tags)
      try {
        await this.enrichContacts(job, sseClientId);
      } catch (err: any) {
        job.errors.push(`AI enrichment partially failed: ${err.message}`);
      }

      job.status = 'completed';
      job.completed_at = new Date().toISOString();
      await this.saveJob(job);
      this.broadcastProgress(sseClientId, job);

      // Clean up the uploaded ZIP
      try {
        await fs.unlink(zipPath);
      } catch { /* ignore cleanup errors */ }

    } catch (err: any) {
      job.status = 'failed';
      job.errors.push(err.message);
      await this.saveJob(job);
      this.broadcastProgress(sseClientId, job);
    }
  }

  private async enrichContacts(job: ImportJob, sseClientId?: string): Promise<void> {
    const contacts = await this.getContacts();
    const unenriched = contacts.filter(c => c.imported_from === 'linkedin' && !c.ai_tags);

    // Batch enrich in groups of 20
    const BATCH_SIZE = 20;
    for (let i = 0; i < unenriched.length; i += BATCH_SIZE) {
      const batch = unenriched.slice(i, i + BATCH_SIZE);
      const summaries = batch.map(c =>
        `${c.full_name} | ${c.position || 'Unknown'} @ ${c.company || 'Unknown'} | ${c.location || 'Unknown'}`
      ).join('\n');

      try {
        const result = await cachedInference.complete(
          `Classify these professional contacts. For each person (one per line), return a JSON array of objects with: name (string), tags (array of industry/skill tags, max 3), relationship_type (one of: colleague, client, investor, mentor, partner, vendor, other), business_value (high, medium, low).\n\nContacts:\n${summaries}`,
          'You are a professional network analyst. Return ONLY valid JSON array, no markdown.',
          'fast_classification',
          'economy'
        );

        const enrichments = JSON.parse(result);
        if (Array.isArray(enrichments)) {
          for (let j = 0; j < batch.length && j < enrichments.length; j++) {
            const enrichment = enrichments[j];
            if (enrichment) {
              await this.updateContact(batch[j].id, {
                ai_tags: enrichment.tags || [],
                relationship_type: enrichment.relationship_type || batch[j].relationship_type,
                business_value: enrichment.business_value || batch[j].business_value,
              });
            }
          }
        }
      } catch {
        // AI enrichment is best-effort, continue on failure
      }
    }
  }

  private parseCSV(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Handle LinkedIn CSV format: may have metadata rows before headers
    // Find the header row (contains "First Name")
    let headerIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (lines[i].includes('First Name')) {
        headerIdx = i;
        break;
      }
    }

    const headers = this.parseCSVLine(lines[headerIdx]);
    const rows: Record<string, string>[] = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = (values[idx] || '').trim();
      });
      rows.push(row);
    }

    return rows;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private async saveJob(job: ImportJob): Promise<void> {
    const filePath = path.join(getVaultPath(), IMPORTS_DIR, `${job.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(job, null, 2));
  }

  async getJob(jobId: string): Promise<ImportJob | null> {
    try {
      const filePath = path.join(getVaultPath(), IMPORTS_DIR, `${jobId}.json`);
      return JSON.parse(await fs.readFile(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private broadcastProgress(sseClientId: string | undefined, job: ImportJob): void {
    const data = {
      job_id: job.id,
      status: job.status,
      total: job.total_contacts,
      processed: job.processed_contacts,
      created: job.created_contacts,
      errors: job.errors.length,
    };

    if (sseClientId) {
      sseManager.send(sseClientId, 'import_progress', data);
    }
    sseManager.broadcast('import_progress', data);
  }
}

export const networkImporterService = new NetworkImporterService();
