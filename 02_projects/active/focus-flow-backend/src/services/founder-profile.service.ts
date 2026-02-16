import * as fs from 'fs/promises';
import * as path from 'path';
import { getVaultPath } from '../utils/file-operations';
import { generateId } from '../utils/id-generator';
import { cachedInference } from './cached-inference.service';

export type ArchetypePreference = 'strategist' | 'cofounder' | 'critic';

export interface FounderSkill {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  added_at: string;
}

export interface FounderExperience {
  id: string;
  title: string;
  company?: string;
  description: string;
  start_date?: string;
  end_date?: string;
  tags: string[];
  added_at: string;
}

export interface FounderProfile {
  id: string;
  name: string;
  bio?: string;
  location?: string;
  timezone?: string;
  preferred_archetype: ArchetypePreference;
  skills: FounderSkill[];
  experience: FounderExperience[];
  active_work: string[];
  strategic_focus_tags: string[];
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

const PROFILE_DIR = '10_profile';
const PROFILE_FILE = 'founder.json';

export class FounderProfileService {
  private async ensureDirs() {
    const base = getVaultPath();
    await fs.mkdir(path.join(base, PROFILE_DIR), { recursive: true });
  }

  async getProfile(): Promise<FounderProfile | null> {
    try {
      const filePath = path.join(getVaultPath(), PROFILE_DIR, PROFILE_FILE);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return data;
    } catch {
      return null;
    }
  }

  async saveProfile(data: Partial<FounderProfile>): Promise<FounderProfile> {
    await this.ensureDirs();
    const existing = await this.getProfile();

    const profile: FounderProfile = existing
      ? {
          ...existing,
          ...data,
          id: existing.id,
          skills: data.skills || existing.skills,
          experience: data.experience || existing.experience,
          active_work: data.active_work || existing.active_work,
          strategic_focus_tags: data.strategic_focus_tags || existing.strategic_focus_tags,
          created_at: existing.created_at,
          updated_at: new Date().toISOString(),
        }
      : {
          id: generateId('founder'),
          name: data.name || 'Founder',
          bio: data.bio,
          location: data.location,
          timezone: data.timezone,
          preferred_archetype: data.preferred_archetype || 'strategist',
          skills: data.skills || [],
          experience: data.experience || [],
          active_work: data.active_work || [],
          strategic_focus_tags: data.strategic_focus_tags || [],
          onboarding_completed: data.onboarding_completed || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

    const filePath = path.join(getVaultPath(), PROFILE_DIR, PROFILE_FILE);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));
    return profile;
  }

  async addSkill(skill: Partial<FounderSkill>): Promise<FounderProfile> {
    const existing = await this.getProfile();
    const profile = existing || await this.saveProfile({});

    const newSkill: FounderSkill = {
      id: generateId('skill'),
      name: skill.name || 'Unnamed Skill',
      level: skill.level || 'beginner',
      category: skill.category || 'general',
      added_at: new Date().toISOString(),
    };

    profile.skills.push(newSkill);
    return this.saveProfile(profile);
  }

  async addExperience(exp: Partial<FounderExperience>): Promise<FounderProfile> {
    const existing = await this.getProfile();
    const profile = existing || await this.saveProfile({});

    const newExp: FounderExperience = {
      id: generateId('exp'),
      title: exp.title || 'Untitled',
      company: exp.company,
      description: exp.description || '',
      start_date: exp.start_date,
      end_date: exp.end_date,
      tags: exp.tags || [],
      added_at: new Date().toISOString(),
    };

    profile.experience.push(newExp);
    return this.saveProfile(profile);
  }

  async setArchetype(archetype: ArchetypePreference): Promise<FounderProfile> {
    const existing = await this.getProfile();
    const profile = existing || await this.saveProfile({});

    profile.preferred_archetype = archetype;
    return this.saveProfile(profile);
  }

  async extractProfileFromText(text: string): Promise<Partial<FounderProfile>> {
    const result = await cachedInference.complete(
      `Extract founder profile information from this text. Return JSON with fields: name, bio, location, skills (array of {name, level, category}), active_work (array of strings), strategic_focus_tags (array of strings). Only include fields you can confidently extract.\n\nText: ${text}`,
      'You are a profile extraction assistant. Return ONLY valid JSON, no markdown.',
      'fast_classification',
      'economy'
    );

    try {
      const extracted = JSON.parse(result);
      return extracted;
    } catch {
      return {};
    }
  }
}

export const founderProfileService = new FounderProfileService();
