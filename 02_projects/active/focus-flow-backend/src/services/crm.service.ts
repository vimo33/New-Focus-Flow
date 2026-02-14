import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  project_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'demo';
  subject: string;
  content?: string;
  date: string;
  created_at: string;
}

const CRM_DIR = '09_crm';
const CONTACTS_DIR = path.join(CRM_DIR, 'contacts');
const INTERACTIONS_DIR = path.join(CRM_DIR, 'interactions');

export class CRMService {
  private async ensureDirs() {
    const base = getVaultPath();
    await fs.mkdir(path.join(base, CONTACTS_DIR), { recursive: true });
    await fs.mkdir(path.join(base, INTERACTIONS_DIR), { recursive: true });
  }

  async createContact(data: Partial<Contact>): Promise<Contact> {
    await this.ensureDirs();
    const contact: Contact = {
      id: generateId('contact'),
      name: data.name || 'Unknown',
      email: data.email,
      company: data.company,
      phone: data.phone,
      notes: data.notes,
      tags: data.tags || [],
      project_ids: data.project_ids || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${contact.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(contact, null, 2));
    return contact;
  }

  async getContacts(search?: string): Promise<Contact[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), CONTACTS_DIR);
    try {
      const files = await fs.readdir(dir);
      const contacts: Contact[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        contacts.push(data);
      }

      if (search) {
        const q = search.toLowerCase();
        return contacts.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q))
        );
      }

      return contacts.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    } catch {
      return [];
    }
  }

  async getContact(id: string): Promise<Contact | null> {
    try {
      const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${id}.json`);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return data;
    } catch {
      return null;
    }
  }

  async updateContact(id: string, data: Partial<Contact>): Promise<Contact | null> {
    const contact = await this.getContact(id);
    if (!contact) return null;

    const updated = { ...contact, ...data, id: contact.id, updated_at: new Date().toISOString() };
    const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async addInteraction(data: Partial<Interaction>): Promise<Interaction> {
    await this.ensureDirs();
    const interaction: Interaction = {
      id: generateId('interaction'),
      contact_id: data.contact_id || '',
      type: data.type || 'note',
      subject: data.subject || 'Interaction',
      content: data.content,
      date: data.date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const filePath = path.join(getVaultPath(), INTERACTIONS_DIR, `${interaction.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(interaction, null, 2));

    // Update contact's updated_at
    if (interaction.contact_id) {
      const contact = await this.getContact(interaction.contact_id);
      if (contact) {
        await this.updateContact(interaction.contact_id, {});
      }
    }

    return interaction;
  }

  async deleteContact(id: string): Promise<boolean> {
    try {
      const filePath = path.join(getVaultPath(), CONTACTS_DIR, `${id}.json`);
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getInteractions(contactId?: string): Promise<Interaction[]> {
    await this.ensureDirs();
    const dir = path.join(getVaultPath(), INTERACTIONS_DIR);
    try {
      const files = await fs.readdir(dir);
      const interactions: Interaction[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
        if (contactId && data.contact_id !== contactId) continue;
        interactions.push(data);
      }
      return interactions.sort((a, b) => b.date.localeCompare(a.date));
    } catch {
      return [];
    }
  }
}

export const crmService = new CRMService();
