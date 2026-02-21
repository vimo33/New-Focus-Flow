import { useEffect, useState } from 'react';
import { Handshake, Users, Star, ExternalLink } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard, StatCard } from '../shared';

export default function PartnershipsCanvas() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [contactsRes, oppsRes] = await Promise.all([
        api.getNetworkContacts().catch(() => ({ contacts: [] })),
        api.getNetworkOpportunities().catch(() => ({ opportunities: [] })),
      ]);
      setContacts(contactsRes.contacts || []);
      setOpportunities(oppsRes.opportunities || []);
    } catch (err) {
      console.error('Failed to load partnerships:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter for partnership-relevant contacts (high relationship score or tagged)
  const partners = contacts.filter((c: any) =>
    (c.relationship_score && c.relationship_score >= 7) ||
    (c.tags && c.tags.includes('partner'))
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Handshake size={20} className="text-success" />
          Partnerships
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Partner contacts, collaboration opportunities, and network insights
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard value={String(contacts.length)} label="Network Contacts" />
        <StatCard value={String(partners.length)} label="Potential Partners" />
        <StatCard value={String(opportunities.length)} label="Opportunities" />
      </div>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <GlassCard className="mb-6">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
            <Star size={14} className="text-warning" />
            Collaboration Opportunities
          </h2>
          <div className="space-y-2">
            {opportunities.slice(0, 10).map((opp: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <ExternalLink size={12} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{opp.title || opp.description || 'Opportunity'}</p>
                  <p className="text-xs text-slate-500">{opp.type || 'general'}</p>
                </div>
                {opp.score && (
                  <span className="text-xs font-mono text-primary">{opp.score}%</span>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Partner Contacts */}
      <GlassCard>
        <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-4">
          <Users size={14} className="text-primary" />
          Partner Contacts
        </h2>
        {loading ? (
          <p className="text-xs text-slate-500 text-center py-6">Loading contacts...</p>
        ) : partners.length === 0 ? (
          <div className="text-center py-8">
            <Handshake size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No partner contacts found</p>
            <p className="text-slate-600 text-xs mt-1">
              Import your network or tag contacts as partners
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {partners.map((contact: any) => (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {(contact.name || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{contact.name}</p>
                  <p className="text-xs text-slate-500 truncate">{contact.company || contact.email || ''}</p>
                </div>
                {contact.relationship_score && (
                  <span className="text-xs font-mono text-success">{contact.relationship_score}/10</span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
