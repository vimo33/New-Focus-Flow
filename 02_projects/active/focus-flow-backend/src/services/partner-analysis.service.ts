import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { networkImporterService } from './network-importer.service';
import { founderProfileService } from './founder-profile.service';
import { cachedInference } from './cached-inference.service';
import type { ProjectCollaborator, PartnerAnalysis } from '../models/types';

const COLLABORATORS_SUBDIR = 'collaborators';

class PartnerAnalysisService {
  private getCollaboratorsDir(projectId: string): string {
    return path.join(getVaultPath(), '02_projects', 'active', `${projectId}-collaborators`);
  }

  private async ensureDir(projectId: string) {
    await fs.mkdir(this.getCollaboratorsDir(projectId), { recursive: true });
  }

  async addCollaborator(projectId: string, data: Partial<ProjectCollaborator>): Promise<ProjectCollaborator> {
    await this.ensureDir(projectId);

    const collaborator: ProjectCollaborator = {
      id: generateId('collab'),
      project_id: projectId,
      contact_id: data.contact_id,
      name: data.name || 'Unknown',
      role: data.role || 'Collaborator',
      email: data.email,
      company: data.company,
      added_at: new Date().toISOString(),
    };

    const filePath = path.join(this.getCollaboratorsDir(projectId), `${collaborator.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(collaborator, null, 2));
    return collaborator;
  }

  async getCollaborators(projectId: string): Promise<ProjectCollaborator[]> {
    await this.ensureDir(projectId);
    const dir = this.getCollaboratorsDir(projectId);

    try {
      const files = await fs.readdir(dir);
      const collaborators: ProjectCollaborator[] = [];
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const data = JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'));
          collaborators.push(data);
        } catch {
          // Skip invalid files
        }
      }
      return collaborators.sort((a, b) => b.added_at.localeCompare(a.added_at));
    } catch {
      return [];
    }
  }

  async removeCollaborator(projectId: string, collaboratorId: string): Promise<boolean> {
    const filePath = path.join(this.getCollaboratorsDir(projectId), `${collaboratorId}.json`);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async analyzePartner(collaboratorId: string): Promise<PartnerAnalysis> {
    // Find the collaborator across all project directories
    const collaborator = await this.findCollaborator(collaboratorId);
    if (!collaborator) throw new Error(`Collaborator ${collaboratorId} not found`);

    const [contacts, profile] = await Promise.all([
      networkImporterService.getContacts(),
      founderProfileService.getProfile(),
    ]);

    // Find network overlap
    const shared_contacts: string[] = [];
    const shared_industries: string[] = [];

    if (collaborator.company) {
      const companyContacts = contacts.filter(c =>
        c.company?.toLowerCase() === collaborator.company?.toLowerCase()
      );
      shared_contacts.push(...companyContacts.map(c => c.full_name));
    }

    // Find contacts with matching tags
    const collabNameLower = collaborator.name.toLowerCase();
    for (const contact of contacts) {
      if (contact.full_name.toLowerCase() === collabNameLower) {
        shared_industries.push(...contact.tags);
      }
    }

    // AI-powered business possibilities analysis
    let business_possibilities: PartnerAnalysis['business_possibilities'] = [];
    try {
      const result = await cachedInference.infer({
        task_type: 'strategic_reasoning',
        budget_tier: 'standard',
        system_prompt: `Analyze business possibilities between a founder and a collaborator. Return JSON array of objects with: type (one of: joint_venture, referral_channel, skill_complement, market_access), title, description, confidence (0-1).`,
        messages: [{
          role: 'user',
          content: `Collaborator: ${collaborator.name}, Role: ${collaborator.role}, Company: ${collaborator.company || 'N/A'}\nFounder profile: ${profile ? `${profile.name}, Skills: ${profile.skills.map(s => s.name).join(', ')}, Focus: ${profile.strategic_focus_tags.join(', ')}` : 'No profile available'}\nShared contacts: ${shared_contacts.length}\nShared industries: ${shared_industries.join(', ') || 'None identified'}\n\nAnalyze business partnership possibilities.`,
        }],
      });
      const parsed = JSON.parse(result.content);
      if (Array.isArray(parsed)) {
        business_possibilities = parsed.slice(0, 5).map((p: any) => ({
          type: p.type || 'skill_complement',
          title: p.title || 'Partnership Opportunity',
          description: p.description || '',
          confidence: typeof p.confidence === 'number' ? p.confidence : 0.5,
        }));
      }
    } catch {
      business_possibilities = [{
        type: 'skill_complement',
        title: 'Potential Collaboration',
        description: `Explore partnership opportunities with ${collaborator.name} based on their role as ${collaborator.role}.`,
        confidence: 0.5,
      }];
    }

    return {
      collaborator_id: collaboratorId,
      network_overlap: {
        shared_contacts: [...new Set(shared_contacts)],
        shared_industries: [...new Set(shared_industries)],
      },
      business_possibilities,
      analyzed_at: new Date().toISOString(),
    };
  }

  private async findCollaborator(collaboratorId: string): Promise<ProjectCollaborator | null> {
    const baseDir = path.join(getVaultPath(), '02_projects', 'active');
    try {
      const entries = await fs.readdir(baseDir);
      for (const entry of entries) {
        if (!entry.endsWith('-collaborators')) continue;
        const filePath = path.join(baseDir, entry, `${collaboratorId}.json`);
        try {
          const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
          return data;
        } catch {
          // Not in this directory
        }
      }
    } catch {
      // Directory doesn't exist
    }
    return null;
  }
}

export const partnerAnalysisService = new PartnerAnalysisService();
