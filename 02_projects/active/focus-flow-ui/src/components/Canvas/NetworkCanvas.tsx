import { useState, useEffect, useRef, useCallback } from 'react';
import { GlassCard, StatCard, Badge, NitaraInsightCard } from '../shared';
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
    // Fetch PDL budget (non-blocking)
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

  const handleImport = async (file: File, source: 'linkedin' | 'google') => {
    setImporting(true);
    setImportError(null);
    setImportProgress(null);

    // Connect to SSE BEFORE starting upload so we don't miss fast events
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
      // If we didn't get a completion event, poll the job status
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

    // Listen for SSE progress
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

  const ImportPanel = () => (
    <GlassCard className="mb-6">
      <h3 className="text-xs font-semibold tracking-wider text-text-tertiary uppercase mb-4">
        IMPORT CONTACTS
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* LinkedIn drop zone */}
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

        {/* Google drop zone */}
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

      {/* Progress bar */}
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

      {/* Completion message */}
      {!importing && importProgress?.status === 'completed' && (
        <div className="flex items-center gap-2 text-sm text-primary py-2">
          <span className="material-symbols-rounded text-base">check_circle</span>
          <span>{importProgress.created} contacts imported — Done</span>
        </div>
      )}

      {/* Error */}
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
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-text-tertiary text-sm">Loading network data...</div>
        </div>
      </div>
    );
  }

  // Classification: "with data" = has full_name AND (company OR email)
  const hasActionableData = (c: any) => !!(c.full_name && (c.company || c.email));
  const contactsWithData = contacts.filter(hasActionableData);
  const contactsNeedingData = contacts.filter(c => !hasActionableData(c));

  // Tab-aware search filtering
  const baseContacts = activeTab === 'with_data' ? contactsWithData : contactsNeedingData;
  const filteredContacts = baseContacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q) ||
      (c.position || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
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

        <ImportPanel />
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-text-primary mb-1">
              Your Constellation
            </h1>
            <p className="text-text-tertiary text-sm">
              Map and nurture your professional relationships.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {enrichBudget && enrichBudget.remaining > 0 && (
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="flex flex-col items-center gap-0 px-3 py-1.5 text-sm text-text-secondary bg-elevated/50 border border-[var(--glass-border)] rounded-lg hover:text-text-primary hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title={enrichBudget.remaining === 0 ? 'Budget exhausted' : `Enrich contacts with People Data Labs (${enrichBudget.remaining} lookups remaining)`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  {enriching ? 'Enriching...' : 'Enrich Contacts'}
                </span>
                <span className="text-[10px] text-text-tertiary">{enrichBudget.remaining}/{enrichBudget.limit} remaining</span>
              </button>
            )}
            {enrichBudget && enrichBudget.remaining === 0 && (
              <span className="flex flex-col items-center px-3 py-1.5 text-sm text-text-tertiary bg-elevated/30 border border-[var(--glass-border)] rounded-lg opacity-60 cursor-not-allowed" title="PDL monthly budget exhausted">
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
              Import Contacts
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
          {/* Tab bar + search */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('with_data')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  activeTab === 'with_data'
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'text-text-tertiary border-transparent hover:text-text-secondary'
                }`}
              >
                With Data ({contactsWithData.length})
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
                {searchQuery.trim()
                  ? 'No contacts match your search.'
                  : activeTab === 'with_data'
                    ? 'No enriched contacts yet. Try enriching your network!'
                    : 'All contacts have data — nice!'}
              </p>
            </div>
          ) : (
            <div>
              {activeTab === 'with_data'
                ? /* Rich contact rows for "With Data" tab */
                  displayContacts.map((contact) => {
                    const initials = (contact.full_name || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    const pdlLikelihood = contact.enrichment_data?.pdl_likelihood;

                    return (
                      <div
                        key={contact.id || contact.full_name}
                        className="p-3 border-b border-[var(--glass-border)] last:border-b-0 flex items-start gap-3"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-text-secondary text-xs font-medium flex-shrink-0 mt-0.5">
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-text-primary text-sm font-medium truncate">
                              {contact.full_name}
                            </p>
                            {contact.seniority && contact.seniority !== 'unknown' && (
                              <span className="text-[10px] text-text-tertiary bg-elevated/60 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {SENIORITY_LABELS[contact.seniority as keyof typeof SENIORITY_LABELS] || contact.seniority}
                              </span>
                            )}
                          </div>
                          {(contact.position || contact.company) && (
                            <p className="text-text-tertiary text-xs truncate">
                              {contact.position}
                              {contact.position && contact.company ? ' @ ' : ''}
                              {contact.company}
                            </p>
                          )}
                          {contact.industry && (
                            <p className="text-text-tertiary/70 text-[11px] truncate mt-0.5">
                              {contact.industry}
                            </p>
                          )}
                          {contact.skills && contact.skills.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {contact.skills.slice(0, 3).map((skill: string) => (
                                <span key={skill} className="text-[10px] text-text-secondary bg-elevated/50 border border-[var(--glass-border)] px-1.5 py-0.5 rounded-full">
                                  {skill}
                                </span>
                              ))}
                              {contact.skills.length > 3 && (
                                <span className="text-[10px] text-text-tertiary">+{contact.skills.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right side: badges */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {contact.relationship_strength && (
                            <Badge
                              label={contact.relationship_strength.toUpperCase()}
                              variant={STRENGTH_VARIANT[contact.relationship_strength] || 'paused'}
                            />
                          )}
                          {pdlLikelihood != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-text-tertiary">
                              <span className="material-symbols-rounded text-xs text-primary/60">verified</span>
                              PDL {pdlLikelihood}/10
                            </span>
                          )}
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1">
                              {contact.tags.slice(0, 2).map((tag: string) => (
                                <Badge key={tag} label={tag} variant="playbook" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                : /* Compact rows for "Needs Data" tab */
                  displayContacts.map((contact) => {
                    const initials = (contact.full_name || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    const sparseInfo = contact.email || contact.company || (contact.import_sources?.join(', ')) || contact.imported_from || '';

                    return (
                      <div
                        key={contact.id || contact.full_name}
                        className="p-2.5 border-b border-[var(--glass-border)] last:border-b-0 flex items-center gap-2.5"
                      >
                        {/* Smaller avatar */}
                        <div className="w-7 h-7 rounded-full bg-elevated/60 flex items-center justify-center text-text-tertiary text-[10px] font-medium flex-shrink-0">
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-text-secondary text-sm truncate">
                            {contact.full_name || 'Unknown'}
                          </p>
                          {sparseInfo && (
                            <p className="text-text-tertiary text-xs truncate">
                              {sparseInfo}
                            </p>
                          )}
                        </div>

                        {/* Needs enrichment indicator */}
                        <span className="material-symbols-rounded text-base text-text-tertiary/50" title="Needs enrichment">
                          data_alert
                        </span>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* Enrichment CTA banner in "Needs Data" tab */}
          {activeTab === 'needs_data' && contactsNeedingData.length > 0 && enrichBudget && enrichBudget.remaining > 0 && (
            <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <span className="material-symbols-rounded text-base text-primary">auto_awesome</span>
                <span className="text-text-secondary">
                  {contactsNeedingData.length} contacts need enrichment
                </span>
                <span className="text-text-tertiary text-xs">
                  ({enrichBudget.remaining} PDL lookups remaining)
                </span>
              </div>
              <button
                onClick={handleEnrich}
                disabled={enriching}
                className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 border border-primary/30 rounded-lg hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enriching ? 'Enriching...' : 'Enrich Now'}
              </button>
            </div>
          )}

          {filteredContacts.length > 20 && (
            <div className="pt-3 text-center">
              <p className="text-text-tertiary text-xs">
                Showing 20 of {filteredContacts.length} {activeTab === 'with_data' ? 'enriched' : 'incomplete'} contacts
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
