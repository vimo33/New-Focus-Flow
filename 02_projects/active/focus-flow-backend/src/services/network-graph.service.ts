import { networkImporterService } from './network-importer.service';
import { cachedInference } from './cached-inference.service';
import { generateId } from '../utils/id-generator';
import type {
  NetworkContact,
  RelationshipType,
  RelationshipStrength,
  IndustryCluster,
  GeographicDistribution,
  NetworkGraphSummary,
  NetworkOpportunity,
} from '../models/types';

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
}

export const networkGraphService = new NetworkGraphService();
