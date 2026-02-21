import path from 'path';
import { networkImporterService } from './network-importer.service';
import { cachedInference } from './cached-inference.service';
import { generateId } from '../utils/id-generator';
import { VaultService } from './vault.service';
import { getVaultPath, readJsonFile, writeJsonFile, ensureDir } from '../utils/file-operations';
import type {
  NetworkContact,
  RelationshipType,
  RelationshipStrength,
  IndustryCluster,
  GeographicDistribution,
  NetworkGraphSummary,
  NetworkOpportunity,
} from '../models/types';

const XREF_DIR = getVaultPath('07_system', 'reports');

class NetworkGraphService {
  async getGraphSummary(): Promise<NetworkGraphSummary> {
    const contacts = await networkImporterService.getContacts();

    // Industry clusters from company + ai_tags
    const industryMap = new Map<string, string[]>();
    for (const c of contacts) {
      const tags = c.ai_tags || [];
      for (const tag of tags) {
        const existing = industryMap.get(tag) || [];
        existing.push(c.id);
        industryMap.set(tag, existing);
      }
    }
    const industry_clusters: IndustryCluster[] = Array.from(industryMap.entries())
      .map(([industry, ids]) => ({ industry, count: ids.length, contacts: ids }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Geographic distribution
    const geoMap = new Map<string, string[]>();
    for (const c of contacts) {
      const loc = c.location || 'Unknown';
      const existing = geoMap.get(loc) || [];
      existing.push(c.id);
      geoMap.set(loc, existing);
    }
    const geographic_distribution: GeographicDistribution[] = Array.from(geoMap.entries())
      .map(([location, ids]) => ({ location, count: ids.length, contacts: ids }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Relationship breakdown
    const relationship_breakdown: Record<RelationshipType, number> = {
      colleague: 0, client: 0, investor: 0, mentor: 0,
      friend: 0, partner: 0, vendor: 0, other: 0,
    };
    for (const c of contacts) {
      relationship_breakdown[c.relationship_type] = (relationship_breakdown[c.relationship_type] || 0) + 1;
    }

    // Strength breakdown
    const strength_breakdown: Record<RelationshipStrength, number> = {
      strong: 0, moderate: 0, weak: 0, dormant: 0,
    };
    for (const c of contacts) {
      strength_breakdown[c.relationship_strength] = (strength_breakdown[c.relationship_strength] || 0) + 1;
    }

    // Average business value
    const valueMap = { high: 3, medium: 2, low: 1, unknown: 0 };
    const knownContacts = contacts.filter(c => c.business_value !== 'unknown');
    const avg_business_value = knownContacts.length > 0
      ? knownContacts.reduce((sum, c) => sum + valueMap[c.business_value], 0) / knownContacts.length
      : 0;

    return {
      total_contacts: contacts.length,
      industry_clusters,
      geographic_distribution,
      relationship_breakdown,
      strength_breakdown,
      avg_business_value: Math.round(avg_business_value * 100) / 100,
    };
  }

  async getOpportunities(): Promise<NetworkOpportunity[]> {
    const contacts = await networkImporterService.getContacts();
    if (contacts.length === 0) return [];

    // Build a summary for AI analysis
    const contactSummaries = contacts.slice(0, 50).map(c =>
      `${c.full_name} | ${c.position || '?'} @ ${c.company || '?'} | ${c.relationship_type} | ${c.business_value} value | tags: ${(c.ai_tags || []).join(', ')}`
    ).join('\n');

    try {
      const result = await cachedInference.complete(
        `Analyze this professional network and suggest 3-5 actionable opportunities. For each, return a JSON array of objects with: type (one of: reconnect, introduction, collaboration, business_development), title (short), description (1-2 sentences), contact_names (array of names involved), priority (high, medium, low), reasoning (why this matters).\n\nNetwork:\n${contactSummaries}`,
        'You are a professional networking strategist. Return ONLY valid JSON array, no markdown.',
        'fast_classification',
        'economy'
      );

      const parsed = JSON.parse(result);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((opp: any) => ({
        id: generateId('opp'),
        type: opp.type || 'reconnect',
        title: opp.title || 'Network Opportunity',
        description: opp.description || '',
        contacts: opp.contact_names || [],
        priority: opp.priority || 'medium',
        reasoning: opp.reasoning || '',
        created_at: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Cross-reference contacts with a specific project.
   * Returns contacts relevant as customers, advisors, beta testers, etc.
   */
  async getContactsForProject(projectId: string): Promise<{
    project_id: string;
    project_title: string;
    relevant_contacts: Array<{
      contact: NetworkContact;
      relevance_score: number;
      value_types: string[];
      reasoning: string;
    }>;
  }> {
    const vaultService = new VaultService();
    const projects = await vaultService.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return { project_id: projectId, project_title: 'Unknown', relevant_contacts: [] };
    }

    const contacts = await networkImporterService.getContacts();
    if (contacts.length === 0) {
      return { project_id: projectId, project_title: project.title, relevant_contacts: [] };
    }

    const contactSummaries = contacts.slice(0, 80).map(c =>
      `${c.id}: ${c.full_name} | ${c.position || '?'} @ ${c.company || '?'} | ${c.industry || '?'} | ${c.relationship_type} | ${c.business_value} | tags: ${(c.ai_tags || []).join(', ')}`
    ).join('\n');

    const projectDesc = `${project.title}: ${project.description || ''} (stage: ${project.phase || 'unknown'})`;

    try {
      const result = await cachedInference.complete(
        `Given this project:\n${projectDesc}\n\nAnd these contacts:\n${contactSummaries}\n\n` +
        `Identify contacts relevant to this project. For each, return JSON array with: ` +
        `contact_id, relevance_score (1-10), value_types (array: customer, beta_tester, advisor, distributor, investor, referral_source, domain_expert), reasoning (1 sentence).` +
        `\nOnly include contacts with relevance >= 5. Max 15 contacts.`,
        'You are a strategic business analyst. Return ONLY valid JSON array, no markdown.',
        'fast_classification',
        'economy'
      );

      const parsed = JSON.parse(result);
      if (!Array.isArray(parsed)) return { project_id: projectId, project_title: project.title, relevant_contacts: [] };

      const contactMap = new Map(contacts.map(c => [c.id, c]));
      const relevant = parsed
        .filter((r: any) => r.contact_id && contactMap.has(r.contact_id))
        .map((r: any) => ({
          contact: contactMap.get(r.contact_id)!,
          relevance_score: r.relevance_score || 5,
          value_types: r.value_types || [],
          reasoning: r.reasoning || '',
        }))
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score);

      return {
        project_id: projectId,
        project_title: project.title,
        relevant_contacts: relevant,
      };
    } catch {
      return { project_id: projectId, project_title: project.title, relevant_contacts: [] };
    }
  }

  /**
   * Find introduction paths between the founder and a target contact.
   * Uses two-hop graph traversal through mutual connections.
   */
  async getIntroductionPaths(targetContactId: string): Promise<{
    target: string;
    paths: Array<{ via: string; strength: string; reasoning: string }>;
  }> {
    const contacts = await networkImporterService.getContacts();
    const target = contacts.find(c => c.id === targetContactId);
    if (!target) return { target: targetContactId, paths: [] };

    // Strong connections who might know the target
    const strong = contacts.filter(c =>
      c.id !== targetContactId &&
      (c.relationship_strength === 'strong' || c.relationship_strength === 'moderate') &&
      c.business_value !== 'unknown'
    );

    if (strong.length === 0) return { target: target.full_name, paths: [] };

    // Use AI to identify likely intro paths
    const strongSummaries = strong.slice(0, 30).map(c =>
      `${c.full_name} (${c.position || '?'} @ ${c.company || '?'}, ${c.relationship_strength})`
    ).join('\n');

    try {
      const result = await cachedInference.complete(
        `Target: ${target.full_name} (${target.position || '?'} @ ${target.company || '?'}, ${target.industry || '?'})\n\n` +
        `My strong connections:\n${strongSummaries}\n\n` +
        `Which of my connections might be able to introduce me to the target? Return JSON array with: via (name), strength (strong/moderate), reasoning (1 sentence). Max 5 paths.`,
        'You are a networking strategist. Return ONLY valid JSON array.',
        'fast_classification',
        'economy'
      );

      const parsed = JSON.parse(result);
      return {
        target: target.full_name,
        paths: Array.isArray(parsed) ? parsed.slice(0, 5) : [],
      };
    } catch {
      return { target: target.full_name, paths: [] };
    }
  }

  /**
   * Compute network leverage score for a project (used by portfolio analyst).
   * Score 0-10 based on number and quality of relevant contacts.
   */
  /**
   * Fast leverage score from persisted project_relevance on contacts.
   * Does NOT call AI — reads previously persisted xref data from contact files.
   * Use persistXrefResults() or the network-analyze agent to populate xref data.
   */
  async getNetworkLeverageScore(projectId: string): Promise<{
    score: number;
    warm_paths: number;
    potential_customers: number;
    advisors: number;
    summary: string;
  }> {
    const contacts = await networkImporterService.getContacts();

    // Find contacts that have persisted relevance for this project
    const relevant = contacts.filter(c =>
      c.project_relevance && c.project_relevance[projectId] && c.project_relevance[projectId] >= 5
    );

    if (relevant.length === 0) {
      return {
        score: 0,
        warm_paths: 0,
        potential_customers: 0,
        advisors: 0,
        summary: 'No network connections mapped to this project yet. Run /network-analyze to discover relevant contacts.',
      };
    }

    const customers = relevant.filter(c =>
      c.potential_value_type?.some(t => t === 'customer' || t === 'beta_tester')
    );
    const advisorContacts = relevant.filter(c =>
      c.potential_value_type?.some(t => t === 'advisor' || t === 'domain_expert')
    );
    const warmPaths = relevant.filter(c => (c.project_relevance?.[projectId] || 0) >= 7);

    let score = 0;
    score += Math.min(customers.length, 5) * 0.8;
    score += Math.min(advisorContacts.length, 3) * 0.67;
    score += Math.min(warmPaths.length, 5) * 0.8;
    score = Math.min(Math.round(score * 10) / 10, 10);

    const summary = `${relevant.length} relevant contacts: ${customers.length} potential customers, ${advisorContacts.length} advisors, ${warmPaths.length} warm paths.`;

    return { score, warm_paths: warmPaths.length, potential_customers: customers.length, advisors: advisorContacts.length, summary };
  }

  /**
   * Persist xref results back to contact files.
   * After getContactsForProject computes relevance, save project_relevance
   * and potential_value_type back to each contact.
   */
  async persistXrefResults(projectId: string): Promise<number> {
    const xref = await this.getContactsForProject(projectId);
    let updated = 0;

    for (const rc of xref.relevant_contacts) {
      const contact = rc.contact;
      const projectRelevance = contact.project_relevance || {};
      projectRelevance[projectId] = rc.relevance_score;

      // Merge value types (don't overwrite existing types from other projects)
      const existingTypes = new Set(contact.potential_value_type || []);
      for (const vt of rc.value_types) existingTypes.add(vt);

      await networkImporterService.updateContact(contact.id, {
        project_relevance: projectRelevance,
        potential_value_type: Array.from(existingTypes),
      } as any);
      updated++;
    }

    return updated;
  }

  /**
   * Find dormant high-value contacts that haven't been contacted recently.
   */
  async getDormantHighValue(daysSinceContact = 90): Promise<Array<{
    contact: NetworkContact;
    days_dormant: number;
    value_types: string[];
  }>> {
    const contacts = await networkImporterService.getContacts();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysSinceContact);
    const cutoffStr = cutoff.toISOString();

    return contacts
      .filter(c => {
        if (c.business_value !== 'high' && c.business_value !== 'medium') return false;
        // No last_contacted or it's before cutoff
        if (!c.last_contacted) return true;
        return c.last_contacted < cutoffStr;
      })
      .map(c => {
        const lastContact = c.last_contacted ? new Date(c.last_contacted) : new Date(c.created_at);
        const daysDormant = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
        return {
          contact: c,
          days_dormant: daysDormant,
          value_types: c.potential_value_type || [],
        };
      })
      .sort((a, b) => b.days_dormant - a.days_dormant)
      .slice(0, 20);
  }

  /**
   * Generate a personalized outreach message for a contact regarding a project.
   */
  async generateOutreachDraft(contactId: string, projectId: string): Promise<{
    subject: string;
    body: string;
    channel_recommendation: string;
  }> {
    const contact = await networkImporterService.getContact(contactId);
    if (!contact) throw new Error('Contact not found');

    const vaultService = new VaultService();
    const projects = await vaultService.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');

    const contactContext = [
      `Name: ${contact.full_name}`,
      contact.position ? `Position: ${contact.position}` : '',
      contact.company ? `Company: ${contact.company}` : '',
      contact.relationship_type ? `Relationship: ${contact.relationship_type}` : '',
      contact.enrichment_data?.outreach_angle ? `Outreach angle: ${contact.enrichment_data.outreach_angle}` : '',
      contact.ai_summary ? `Background: ${contact.ai_summary}` : '',
    ].filter(Boolean).join('\n');

    const projectContext = `Project: ${project.title}\nDescription: ${project.description || ''}\nPhase: ${project.phase || 'concept'}`;

    const result = await cachedInference.complete(
      `Draft a personalized outreach message to this contact about this project.\n\n` +
      `Contact:\n${contactContext}\n\nProject:\n${projectContext}\n\n` +
      `Return JSON: { "subject": "email subject line", "body": "message body (2-3 paragraphs, professional but warm)", "channel_recommendation": "email|linkedin|call" }`,
      'You are a professional networking strategist. Return ONLY valid JSON.',
      'fast_classification',
      'standard'
    );

    return JSON.parse(result);
  }
}

export const networkGraphService = new NetworkGraphService();
