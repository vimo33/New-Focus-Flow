import { useState, useEffect } from 'react';
import { GlassCard, StatCard, Badge, NitaraInsightCard } from '../shared';
import { api } from '../../services/api';

export default function NetworkCanvas() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, graphRes, oppsRes] = await Promise.all([
          api.getNetworkContacts(),
          api.getNetworkGraph(),
          api.getNetworkOpportunities(),
        ]);
        setContacts(contactsRes.contacts || []);
        setGraph(graphRes);
        setOpportunities(oppsRes.opportunities || []);
      } catch (err) {
        console.error('Failed to load network data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-text-tertiary text-sm">Loading network data...</div>
        </div>
      </div>
    );
  }

  // Client-side search filtering
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.position || '').toLowerCase().includes(q)
    );
  });

  const displayContacts = filteredContacts.slice(0, 20);

  const activeRelationships = contacts.filter(
    (c) => c.relationship_strength === 'strong' || c.relationship_strength === 'moderate'
  ).length;

  // Compute max count for proportional bar widths
  const relationshipTypes: { type: string; count: number }[] = graph?.relationship_types || [];
  const maxTypeCount = Math.max(...relationshipTypes.map((r) => r.count), 1);

  // Empty state
  if (contacts.length === 0 && !loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-2">
            NETWORK
          </h2>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary mb-1">
            Your Constellation
          </h1>
          <p className="text-text-tertiary text-sm">
            Map and nurture your professional relationships.
          </p>
        </div>

        <GlassCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-text-secondary text-sm mb-2">
              No contacts yet. Import your LinkedIn network to get started.
            </p>
            <p className="text-text-tertiary text-xs">
              Use the onboarding flow to connect your accounts and import contacts.
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-2">
          NETWORK
        </h2>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary mb-1">
          Your Constellation
        </h1>
        <p className="text-text-tertiary text-sm">
          Map and nurture your professional relationships.
        </p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          value={String(graph?.total_contacts ?? contacts.length)}
          label="Total Contacts"
        />
        <StatCard
          value={String(activeRelationships)}
          label="Active Relationships"
        />
        <StatCard
          value={String(opportunities.length)}
          label="Opportunities"
        />
      </div>

      {/* Main Grid — 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column — Contact List (spans 2) */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase">
              Contacts
            </h3>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm bg-elevated/50 border border-[var(--glass-border)] rounded-lg px-3 py-1.5 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {displayContacts.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-text-tertiary text-sm">
                No contacts match your search.
              </p>
            </div>
          ) : (
            <div>
              {displayContacts.map((contact) => {
                const initials = (contact.full_name || 'U')
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                const strengthVariant: Record<string, 'active' | 'paused' | 'blocked' | 'completed'> = {
                  strong: 'active',
                  moderate: 'completed',
                  weak: 'paused',
                  dormant: 'blocked',
                };

                return (
                  <div
                    key={contact.id || contact.full_name}
                    className="p-3 border-b border-[var(--glass-border)] last:border-b-0 flex items-center gap-3"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-medium flex-shrink-0">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">
                        {contact.full_name}
                      </p>
                      {(contact.position || contact.company) && (
                        <p className="text-text-tertiary text-xs truncate">
                          {contact.position}
                          {contact.position && contact.company ? ' @ ' : ''}
                          {contact.company}
                        </p>
                      )}
                    </div>

                    {/* Relationship badge */}
                    {contact.relationship_strength && (
                      <Badge
                        label={contact.relationship_strength.toUpperCase()}
                        variant={strengthVariant[contact.relationship_strength] || 'paused'}
                      />
                    )}

                    {/* Tags */}
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="hidden sm:flex items-center gap-1">
                        {contact.tags.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} label={tag} variant="playbook" />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {filteredContacts.length > 20 && (
            <div className="pt-3 text-center">
              <p className="text-text-tertiary text-xs">
                Showing 20 of {filteredContacts.length} contacts
              </p>
            </div>
          )}
        </GlassCard>

        {/* Right Column — Two stacked cards */}
        <div className="flex flex-col gap-4">
          {/* Relationship Breakdown */}
          {graph && relationshipTypes.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">
                Relationship Breakdown
              </h3>
              <div className="space-y-3">
                {relationshipTypes.map((rt) => (
                  <div key={rt.type} className="flex items-center gap-3">
                    <span className="text-text-secondary text-sm w-24 truncate capitalize">
                      {rt.type}
                    </span>
                    <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(rt.count / maxTypeCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-text-tertiary text-xs font-mono tabular-nums w-8 text-right">
                      {rt.count}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Opportunities */}
          <NitaraInsightCard title="NETWORK OPPORTUNITIES">
            {opportunities.length === 0 ? (
              <p className="text-text-tertiary text-sm">
                No opportunities detected yet. As your network grows, insights will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {opportunities.map((opp, idx) => (
                  <div
                    key={opp.id || idx}
                    className="border-b border-secondary/10 last:border-b-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {opp.type && (
                        <Badge
                          label={opp.type.toUpperCase()}
                          variant="council"
                        />
                      )}
                      {opp.priority && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            opp.priority === 'high'
                              ? 'bg-secondary'
                              : opp.priority === 'medium'
                              ? 'bg-primary'
                              : 'bg-text-tertiary'
                          }`}
                        />
                      )}
                    </div>
                    <p className="text-text-primary text-sm font-medium">
                      {opp.title}
                    </p>
                    {opp.description && (
                      <p className="text-text-tertiary text-xs mt-0.5">
                        {opp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NitaraInsightCard>
        </div>
      </div>
    </div>
  );
}
