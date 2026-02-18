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

  async importGoogleCSV(csvPath: string, sseClientId?: string): Promise<ImportJob> {
    await this.ensureDirs();

    const job: ImportJob = {
      id: generateId('imp'),
      source: 'google',
      status: 'extracting',
      total_contacts: 0,
      processed_contacts: 0,
      created_contacts: 0,
      errors: [],
      started_at: new Date().toISOString(),
    };

    await this.saveJob(job);
    this.broadcastProgress(sseClientId, job);

    this.processGoogleCSV(csvPath, job, sseClientId).catch(err => {
      console.error('[NetworkImporter] Google import failed:', err.message);
    });

    return job;
  }

  private async processGoogleCSV(csvPath: string, job: ImportJob, sseClientId?: string): Promise<void> {
    try {
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const rows = this.parseGoogleCSV(csvContent);

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

      const BATCH_SIZE = 10;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        for (const row of batch) {
          try {
            // Support both old format (First Name/Last Name/Organization Name)
            // and new format (Given Name/Family Name/Organization 1 - Name)
            const firstName = row['Given Name'] || row['First Name'] || '';
            const middleName = row['Middle Name'] || row['Additional Name'] || '';
            const lastName = row['Family Name'] || row['Last Name'] || '';
            const nameParts = [firstName, middleName, lastName].filter(Boolean);
            const fullName = row['Name'] || nameParts.join(' ').trim();

            // Collect all emails
            const emails: string[] = [];
            for (const [key, value] of Object.entries(row)) {
              if (/^E-mail \d+ - Value$/i.test(key) && value) {
                emails.push(value);
              }
            }

            // Collect all phones
            const phones: string[] = [];
            for (const [key, value] of Object.entries(row)) {
              if (/^Phone \d+ - Value$/i.test(key) && value) {
                phones.push(value);
              }
            }

            // Parse tags from Group Membership or Labels
            const groupMembership = row['Group Membership'] || row['Labels'] || '';
            const tags = groupMembership
              .split(' ::: ')
              .map((g: string) => g.trim())
              .filter((g: string) => g && g !== '* myContacts' && g !== '*');

            const primaryEmail = emails[0] || undefined;

            // Check for existing contact (dedup)
            const existing = await this.findExistingContact(primaryEmail, fullName);

            const company = row['Organization 1 - Name'] || row['Organization Name'] || undefined;
            const position = row['Organization 1 - Title'] || row['Organization Title'] || undefined;

            if (existing) {
              // Merge new data into existing contact
              const mergeData: Partial<NetworkContact> = {};
              if (!existing.company && company) mergeData.company = company;
              if (!existing.position && position) mergeData.position = position;
              if (!existing.location && row['Address 1 - Formatted']) mergeData.location = row['Address 1 - Formatted'];
              if (!existing.phone && phones[0]) mergeData.phone = phones[0];
              if (!existing.notes && row['Notes']) mergeData.notes = row['Notes'];

              // Merge emails
              const existingEmails = new Set([
                ...(existing.emails || []),
                ...(existing.email ? [existing.email] : []),
              ].map(e => e.toLowerCase()));
              const newEmails = emails.filter(e => !existingEmails.has(e.toLowerCase()));
              if (newEmails.length > 0) {
                mergeData.emails = [...(existing.emails || []), ...newEmails];
              }

              // Merge phones
              const existingPhones = new Set(existing.phones || []);
              const newPhones = phones.filter(p => !existingPhones.has(p));
              if (newPhones.length > 0) {
                mergeData.phones = [...(existing.phones || []), ...newPhones];
              }

              // Merge tags
              const existingTags = new Set(existing.tags || []);
              const newTags = tags.filter((t: string) => !existingTags.has(t));
              if (newTags.length > 0) {
                mergeData.tags = [...(existing.tags || []), ...newTags];
              }

              // Track import source
              const sources = new Set(existing.import_sources || []);
              sources.add('google');
              mergeData.import_sources = [...sources];

              if (Object.keys(mergeData).length > 0) {
                await this.updateContact(existing.id, mergeData);
              }
            } else {
              await this.createContact({
                first_name: firstName,
                last_name: lastName,
                full_name: fullName,
                email: primaryEmail,
                emails: emails.length > 1 ? emails : undefined,
                company,
                position,
                location: row['Address 1 - Formatted'] || undefined,
                phone: phones[0] || undefined,
                phones: phones.length > 1 ? phones : undefined,
                notes: row['Notes'] || undefined,
                relationship_type: 'other',
                relationship_strength: 'moderate',
                business_value: 'unknown',
                tags,
                imported_from: 'google',
                import_sources: ['google'],
              });

              job.created_contacts++;
            }
          } catch (err: any) {
            job.errors.push(`Failed to import contact: ${err.message}`);
          }

          job.processed_contacts++;
        }

        await this.saveJob(job);
        this.broadcastProgress(sseClientId, job);
      }

      // AI enrichment pass
      try {
        await this.enrichContacts(job, sseClientId);
      } catch (err: any) {
        job.errors.push(`AI enrichment partially failed: ${err.message}`);
      }

      job.status = 'completed';
      job.completed_at = new Date().toISOString();
      await this.saveJob(job);
      this.broadcastProgress(sseClientId, job);

      // Clean up uploaded file
      try {
        await fs.unlink(csvPath);
      } catch { /* ignore cleanup errors */ }

    } catch (err: any) {
      job.status = 'failed';
      job.errors.push(err.message);
      await this.saveJob(job);
      this.broadcastProgress(sseClientId, job);
    }
  }

  private parseGoogleCSV(content: string): Record<string, string>[] {
    // Strip UTF-8 BOM
    const cleaned = content.replace(/^\uFEFF/, '');
    const lines = cleaned.split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];

    // Find header row (contains "Name" or "Given Name")
    let headerIdx = 0;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (lines[i].includes('Name') || lines[i].includes('Given Name')) {
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

      // Skip rows with no name (support both old and new Google export formats)
      if (!row['Name'] && !row['Given Name'] && !row['Family Name'] && !row['First Name'] && !row['Last Name']) continue;

      rows.push(row);
    }

    return rows;
  }

  private async findExistingContact(email?: string, fullName?: string): Promise<NetworkContact | null> {
    const contacts = await this.getContacts();

    // Match by email first (case-insensitive)
    if (email) {
      const emailLower = email.toLowerCase();
      const match = contacts.find(c => {
        if (c.email && c.email.toLowerCase() === emailLower) return true;
        if (c.emails && c.emails.some(e => e.toLowerCase() === emailLower)) return true;
        return false;
      });
      if (match) return match;
    }

    // Then match by exact full_name
    if (fullName) {
      const match = contacts.find(c => c.full_name === fullName);
      if (match) return match;
    }

    return null;
  }

  private async enrichContacts(job: ImportJob, sseClientId?: string): Promise<void> {
    const contacts = await this.getContacts();
    const unenriched = contacts.filter(c => c.imported_from && !c.ai_tags);

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
