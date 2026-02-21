import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassCard, StatCard, Badge, NitaraInsightCard, Drawer, Skeleton } from '../shared';
import { api } from '../../services/api';

const STRENGTH_VARIANT: Record<string, 'active' | 'paused' | 'blocked' | 'completed'> = {
  strong: 'active',
  moderate: 'completed',
  weak: 'paused',
  dormant: 'blocked',
};

const SENIORITY_LABELS: Record<string, string> = {
  c_suite: 'C-Suite',
  vp: 'VP',
  director: 'Director',
  manager: 'Manager',
  individual_contributor: 'IC',
  founder: 'Founder',
};

export default function NetworkCanvas() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Import panel state
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ status: string; processed: number; total: number; created: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // PDL enrichment state
  const [enrichBudget, setEnrichBudget] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ status: string; processed: number; total: number; enriched: number } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'with_data' | 'needs_data'>('with_data');

  // Contact detail drawer state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetail, setContactDetail] = useState<any>(null);
  const [outreachDraft, setOutreachDraft] = useState<{ subject: string; body: string; channel_recommendation: string } | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);

  // Tag filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const refreshData = useCallback(async () => {
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
    }
    api.getEnrichBudget().then(b => setEnrichBudget(b)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      await refreshData();
      setLoading(false);
    };
    fetchData();
  }, [refreshData]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Fetch contact detail when selected
  useEffect(() => {
    if (!selectedContactId) {
      setContactDetail(null);
      setOutreachDraft(null);
      return;
    }
    api.getNetworkContact(selectedContactId)
      .then(setContactDetail)
      .catch(() => setContactDetail(null));
  }, [selectedContactId]);

  const handleImport = async (file: File, source: 'linkedin' | 'google') => {
    setImporting(true);
    setImportError(null);
    setImportProgress(null);

    const es = new EventSource(api.getImportSSEUrl());
    eventSourceRef.current = es;
    let jobId: string | null = null;

    es.addEventListener('import_progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setImportProgress({
          status: data.status,
          processed: data.processed,
          total: data.total,
          created: data.created,
        });

        if (data.status === 'completed' || data.status === 'failed') {
          es.close();
          eventSourceRef.current = null;
          setImporting(false);
          if (data.status === 'completed') {
            setShowImportPanel(true);
            refreshData();
          }
          if (data.status === 'failed') {
            setImportError('Import failed. Please check the file and try again.');
          }
        }
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      if (jobId) {
        const pollJob = async () => {
          try {
            const job = await api.getImportJobStatus(jobId!);
            if (job.status === 'completed') {
              setImportProgress({ status: 'completed', processed: job.processed_contacts, total: job.total_contacts, created: job.created_contacts });
              setImporting(false);
              setShowImportPanel(true);
              refreshData();
            } else if (job.status === 'failed') {
              setImportError('Import failed. Please check the file and try again.');
              setImporting(false);
            }
          } catch { /* ignore */ }
        };
        setTimeout(pollJob, 2000);
      }
    };

    try {
      const result = source === 'linkedin'
        ? await api.importLinkedInNetwork(file)
        : await api.importGoogleContacts(file);
      jobId = result.job?.id || null;
    } catch (err: any) {
      es.close();
      eventSourceRef.current = null;
      setImportError(err.message || 'Import failed');
      setImporting(false);
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    setEnrichProgress(null);

    const es = new EventSource(api.getImportSSEUrl());
    const enrichES = es;

    es.addEventListener('enrich_progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setEnrichProgress({
          status: data.status,
          processed: data.processed,
          total: data.total,
          enriched: data.enriched,
        });

        if (data.status === 'completed' || data.status === 'budget_exhausted' || data.status === 'rate_limited') {
          enrichES.close();
          setEnriching(false);
          refreshData();
        }
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      enrichES.close();
      setEnriching(false);
      refreshData();
    };

    try {
      await api.enrichNetworkContacts();
    } catch {
      enrichES.close();
      setEnriching(false);
    }
  };

  const handleDraftOutreach = async (contactId: string) => {
    setOutreachLoading(true);
    setOutreachDraft(null);
    try {
      const draft = await api.generateOutreachDraft(contactId, '');
      setOutreachDraft(draft);
    } catch (err) {
      console.error('Failed to generate outreach draft:', err);
    } finally {
      setOutreachLoading(false);
    }
  };

  // Extract unique tags from contacts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach(c => {
      if (c.tags) c.tags.forEach((t: string) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const ImportPanel = () => (
    <GlassCard className="mb-6">
      <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">
        IMPORT CONTACTS
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[var(--glass-border)] rounded-xl cursor-pointer hover:border-primary/50 hover:bg-elevated/30 transition-all">
          <span className="material-symbols-rounded text-3xl text-text-tertiary">cloud_upload</span>
          <span className="text-text-primary text-sm font-medium">LinkedIn Export</span>
          <span className="text-text-tertiary text-xs">.zip file</span>
          <input
            type="file"
            accept=".zip"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file, 'linkedin');
              e.target.value = '';
            }}
          />
        </label>

        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-[var(--glass-border)] rounded-xl cursor-pointer hover:border-primary/50 hover:bg-elevated/30 transition-all">
          <span className="material-symbols-rounded text-3xl text-text-tertiary">contacts</span>
          <span className="text-text-primary text-sm font-medium">Google Contacts</span>
          <span className="text-text-tertiary text-xs">.csv file</span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file, 'google');
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {importing && importProgress && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
            <span className="capitalize">{importProgress.status === 'extracting' ? 'Reading file...' : importProgress.status === 'enriching' ? 'Processing contacts...' : importProgress.status}...</span>
            <span>{importProgress.processed} / {importProgress.total}</span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {importing && !importProgress && (
        <div className="text-text-tertiary text-xs text-center py-2">
          Uploading file...
        </div>
      )}

      {!importing && importProgress?.status === 'completed' && (
        <div className="flex items-center gap-2 text-sm text-primary py-2">
          <span className="material-symbols-rounded text-base">check_circle</span>
          <span>{importProgress.created} contacts imported — Done</span>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-2 text-sm text-secondary py-2">
          <span className="material-symbols-rounded text-base">error</span>
          <span>{importError}</span>
          <button
            onClick={() => { setImportError(null); setImportProgress(null); }}
            className="ml-auto text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            Try again
          </button>
        </div>
      )}
    </GlassCard>
  );

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto" data-testid="canvas-network">
        <Skeleton variant="text" className="mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Skeleton variant="stat" count={3} />
        </div>
        <Skeleton variant="list-item" count={5} />
      </div>
    );
  }

  // Classification
  const hasActionableData = (c: any) => !!(c.full_name && (c.company || c.email));
  const contactsWithData = contacts.filter(hasActionableData);
  const contactsNeedingData = contacts.filter(c => !hasActionableData(c));

  // Tab-aware + tag-aware search filtering
  const baseContacts = activeTab === 'with_data' ? contactsWithData : contactsNeedingData;
  const filteredContacts = baseContacts.filter((c) => {
    // Tag filter
    if (selectedTags.length > 0) {
      const cTags: string[] = c.tags || [];
      if (!selectedTags.some(t => cTags.includes(t))) return false;
    }
    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.position || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  const displayContacts = filteredContacts.slice(0, 50);

  const activeRelationships = contacts.filter(
    (c) => c.relationship_strength === 'strong' || c.relationship_strength === 'moderate'
  ).length;

  const relationshipTypes: { type: string; count: number }[] = graph?.relationship_types || [];
  const maxTypeCount = Math.max(...relationshipTypes.map((r) => r.count), 1);

  // Empty state
  if (contacts.length === 0 && !loading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto" data-testid="canvas-network">
        <div className="mb-8">
          <h2 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-2">NETWORK</h2>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary mb-1">Your Constellation</h1>
          <p className="text-text-tertiary text-sm">Map and nurture your professional relationships.</p>
        </div>
        <ImportPanel />
      </div>
    );
  }

  const initials = (name: string) =>
    (name || 'U').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" data-testid="canvas-network">
      {/* Header with toolbar */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold tracking-wider uppercase text-text-secondary mb-2">NETWORK</h2>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary mb-1">Your Constellation</h1>
            <p className="text-text-tertiary text-sm">Map and nurture your professional relationships.</p>
          </div>
          <div className="flex items-center gap-2">
            {enrichBudget && enrichBudget.remaining > 0 && (
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex flex-col items-center gap-0 px-3 py-1.5 text-sm text-text-secondary bg-elevated/50 border border-[var(--glass-border)] rounded-lg hover:text-text-primary hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  {enriching ? 'Enriching...' : 'Enrich Contacts'}
                </span>
                <span className="text-[10px] text-text-tertiary">{enrichBudget.remaining}/{enrichBudget.limit} remaining</span>
              </button>
            )}
            {enrichBudget && enrichBudget.remaining === 0 && (
              <span className="flex flex-col items-center px-3 py-1.5 text-sm text-text-tertiary bg-elevated/30 border border-[var(--glass-border)] rounded-lg opacity-60 cursor-not-allowed">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  Budget Exhausted
                </span>
                <span className="text-[10px]">0/{enrichBudget.limit} remaining</span>
              </span>
            )}
            <button
              onClick={() => setShowImportPanel(!showImportPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary bg-elevated/50 border border-[var(--glass-border)] rounded-lg hover:text-text-primary hover:border-primary/50 transition-all"
            >
              <span className="material-symbols-rounded text-base">upload</span>
              Import
            </button>
          </div>
        </div>
      </div>

      {/* Import Panel (togglable) */}
      {showImportPanel && <ImportPanel />}

      {/* PDL Enrichment Progress */}
      {enriching && enrichProgress && (
        <GlassCard className="mb-6">
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
            <span>
              {enrichProgress.status === 'enriching' ? 'Enriching contacts with PDL...' :
               enrichProgress.status === 'budget_exhausted' ? 'Budget exhausted' :
               enrichProgress.status === 'completed' ? 'Enrichment complete' : enrichProgress.status}
            </span>
            <span>{enrichProgress.processed} / {enrichProgress.total} ({enrichProgress.enriched} enriched)</span>
          </div>
          <div className="h-2 bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${enrichProgress.total > 0 ? (enrichProgress.processed / enrichProgress.total) * 100 : 0}%` }}
            />
          </div>
        </GlassCard>
      )}

      {!enriching && enrichProgress?.status === 'completed' && (
        <GlassCard className="mb-6">
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="material-symbols-rounded text-base">check_circle</span>
            <span>{enrichProgress.enriched} contacts enriched with PDL data</span>
            <button onClick={() => setEnrichProgress(null)} className="ml-auto text-xs text-text-tertiary hover:text-text-primary">Dismiss</button>
          </div>
        </GlassCard>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard value={String(graph?.total_contacts ?? contacts.length)} label="Total Contacts" />
        <StatCard value={String(activeRelationships)} label="Active Relationships" />
        <StatCard value={String(opportunities.length)} label="Opportunities" />
      </div>

      {/* 2-Column Layout: Left (contact list) | Center (stats + opportunities) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-340px)] min-h-[400px]">
        {/* LEFT PANEL — Contact List */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* Search */}
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-sm bg-elevated/50 border border-[var(--glass-border)] rounded-lg px-3 py-2 text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary/50 transition-colors"
          />

          {/* Tag filter chips */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-shrink-0">
              {allTags.slice(0, 15).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium border whitespace-nowrap transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-elevated/30 text-text-tertiary border-[var(--glass-border)] hover:text-text-secondary'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setActiveTab('with_data')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                activeTab === 'with_data'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'text-text-tertiary border-transparent hover:text-text-secondary'
              }`}
            >
              Data ({contactsWithData.length})
            </button>
            <button
              onClick={() => setActiveTab('needs_data')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                activeTab === 'needs_data'
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'text-text-tertiary border-transparent hover:text-text-secondary'
              }`}
            >
              Needs Data ({contactsNeedingData.length})
            </button>
          </div>

          {/* Contact list (scrollable) */}
          <div className="flex-1 overflow-y-auto min-h-0 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)]">
            {displayContacts.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-text-tertiary text-sm">
                  {searchQuery.trim()
                    ? 'No contacts match your search.'
                    : activeTab === 'with_data'
                      ? 'No enriched contacts yet.'
                      : 'All contacts have data!'}
                </p>
              </div>
            ) : (
              displayContacts.map((contact) => {
                const isSelected = selectedContactId === contact.id;
                return (
                  <button
                    key={contact.id || contact.full_name}
                    onClick={() => setSelectedContactId(contact.id || null)}
                    className={`w-full text-left p-3 border-b border-[var(--glass-border)] last:border-b-0 flex items-center gap-3 transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-elevated/40 border-l-2 border-l-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-medium flex-shrink-0">
                      {initials(contact.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium truncate">{contact.full_name}</p>
                      {(contact.position || contact.company) && (
                        <p className="text-text-tertiary text-xs truncate">
                          {contact.position}{contact.position && contact.company ? ' @ ' : ''}{contact.company}
                        </p>
                      )}
                    </div>
                    {contact.relationship_strength && (
                      <Badge
                        label={contact.relationship_strength.toUpperCase()}
                        variant={STRENGTH_VARIANT[contact.relationship_strength] || 'paused'}
                      />
                    )}
                  </button>
                );
              })
            )}
            {filteredContacts.length > 50 && (
              <div className="py-2 text-center">
                <p className="text-text-tertiary text-xs">Showing 50 of {filteredContacts.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* CENTER PANEL — Stats, Relationships, Opportunities */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0">
          {/* Relationship Breakdown */}
          {graph && relationshipTypes.length > 0 && (
            <GlassCard>
              <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">
                Relationship Breakdown
              </h3>
              <div className="space-y-3">
                {relationshipTypes.map((rt) => (
                  <div key={rt.type} className="flex items-center gap-3">
                    <span className="text-text-secondary text-sm w-24 truncate capitalize">{rt.type}</span>
                    <div className="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(rt.count / maxTypeCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-text-tertiary text-xs font-mono tabular-nums w-8 text-right">{rt.count}</span>
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
                      {opp.type && <Badge label={opp.type.toUpperCase()} variant="council" />}
                      {opp.priority && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          opp.priority === 'high' ? 'bg-secondary' :
                          opp.priority === 'medium' ? 'bg-primary' : 'bg-text-tertiary'
                        }`} />
                      )}
                    </div>
                    <p className="text-text-primary text-sm font-medium">{opp.title}</p>
                    {opp.description && (
                      <p className="text-text-tertiary text-xs mt-0.5">{opp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </NitaraInsightCard>

          {/* Graph placeholder */}
          <GlassCard>
            <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-3">Network Graph</h3>
            <div className="flex items-center justify-center py-8 border border-dashed border-[var(--glass-border)] rounded-lg">
              <p className="text-text-tertiary text-sm">Network graph visualization — Sprint 2</p>
            </div>
          </GlassCard>

          {/* Enrichment CTA in needs_data tab */}
          {activeTab === 'needs_data' && contactsNeedingData.length > 0 && enrichBudget && enrichBudget.remaining > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-rounded text-base text-primary">auto_awesome</span>
                  <span className="text-text-secondary">{contactsNeedingData.length} contacts need enrichment</span>
                  <span className="text-text-tertiary text-xs">({enrichBudget.remaining} PDL lookups remaining)</span>
                </div>
                <button
                  onClick={handleEnrich}
                  disabled={enriching}
                  className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enriching ? 'Enriching...' : 'Enrich Now'}
                </button>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* RIGHT PANEL — Drawer for contact detail */}
      <Drawer
        open={!!selectedContactId && !!contactDetail}
        onClose={() => setSelectedContactId(null)}
        title={contactDetail?.full_name || 'Contact'}
        width="md"
      >
        {contactDetail && (
          <div className="space-y-5">
            {/* Avatar + name + company */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-lg font-medium flex-shrink-0">
                {initials(contactDetail.full_name)}
              </div>
              <div>
                <p className="text-text-primary text-lg font-semibold">{contactDetail.full_name}</p>
                {(contactDetail.position || contactDetail.company) && (
                  <p className="text-text-secondary text-sm">
                    {contactDetail.position}{contactDetail.position && contactDetail.company ? ' @ ' : ''}{contactDetail.company}
                  </p>
                )}
              </div>
            </div>

            {/* Relationship strength */}
            {contactDetail.relationship_strength && (
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary text-xs uppercase tracking-wider">Relationship</span>
                <Badge
                  label={contactDetail.relationship_strength.toUpperCase()}
                  variant={STRENGTH_VARIANT[contactDetail.relationship_strength] || 'paused'}
                />
              </div>
            )}

            {/* Seniority */}
            {contactDetail.seniority && contactDetail.seniority !== 'unknown' && (
              <div className="flex items-center gap-2">
                <span className="text-text-tertiary text-xs uppercase tracking-wider">Seniority</span>
                <span className="text-text-primary text-sm">
                  {SENIORITY_LABELS[contactDetail.seniority] || contactDetail.seniority}
                </span>
              </div>
            )}

            {/* Tags */}
            {contactDetail.tags && contactDetail.tags.length > 0 && (
              <div>
                <p className="text-text-tertiary text-xs uppercase tracking-wider mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {contactDetail.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {contactDetail.skills && contactDetail.skills.length > 0 && (
              <div>
                <p className="text-text-tertiary text-xs uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {contactDetail.skills.map((skill: string) => (
                    <span key={skill} className="px-2 py-0.5 rounded-full bg-elevated text-text-secondary text-xs border border-[var(--glass-border)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact info */}
            <div className="space-y-2">
              {contactDetail.email && (
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary text-xs w-16">Email</span>
                  <a href={`mailto:${contactDetail.email}`} className="text-primary text-sm hover:text-primary/80 transition-colors truncate">
                    {contactDetail.email}
                  </a>
                </div>
              )}
              {contactDetail.linkedin_url && (
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary text-xs w-16">LinkedIn</span>
                  <a href={contactDetail.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:text-primary/80 transition-colors truncate">
                    Profile
                  </a>
                </div>
              )}
              {contactDetail.industry && (
                <div className="flex items-center gap-2">
                  <span className="text-text-tertiary text-xs w-16">Industry</span>
                  <span className="text-text-secondary text-sm">{contactDetail.industry}</span>
                </div>
              )}
            </div>

            {/* Draft Outreach */}
            <div className="pt-2 border-t border-[var(--glass-border)]">
              <button
                onClick={() => handleDraftOutreach(contactDetail.id)}
                disabled={outreachLoading}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-tertiary/15 text-tertiary border border-tertiary/30 hover:bg-tertiary/25 transition-colors disabled:opacity-50"
              >
                {outreachLoading ? 'Drafting...' : 'Draft Outreach'}
              </button>

              {outreachDraft && (
                <GlassCard className="mt-3">
                  <p className="text-[10px] tracking-wider text-tertiary uppercase mb-2">DRAFT OUTREACH</p>
                  {outreachDraft.subject && (
                    <p className="text-text-primary text-sm font-semibold mb-1">{outreachDraft.subject}</p>
                  )}
                  <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">{outreachDraft.body}</p>
                  {outreachDraft.channel_recommendation && (
                    <p className="text-text-tertiary text-xs mt-2">
                      Recommended channel: <span className="text-primary">{outreachDraft.channel_recommendation}</span>
                    </p>
                  )}
                </GlassCard>
              )}
            </div>

            {/* Interaction history */}
            {contactDetail.interactions && contactDetail.interactions.length > 0 && (
              <div className="pt-2 border-t border-[var(--glass-border)]">
                <p className="text-text-tertiary text-xs uppercase tracking-wider mb-2">History</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {contactDetail.interactions.slice(0, 10).map((interaction: any, i: number) => (
                    <div key={i} className="flex gap-2 text-xs">
                      <span className="text-text-tertiary font-mono flex-shrink-0">
                        {interaction.date ? new Date(interaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                      <span className="text-text-secondary">{interaction.description || interaction.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
