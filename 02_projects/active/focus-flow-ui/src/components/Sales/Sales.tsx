import { useState, useEffect } from 'react';
import { api } from '../../services/api';

type DealStage = 'lead' | 'qualified' | 'demo' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  value?: number;
  currency: string;
  contact_id?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

interface PipelineSummary {
  stages: Record<string, { count: number; total_value: number }>;
  total_deals: number;
  total_value: number;
}

const STAGES: { key: DealStage; label: string; color: string; icon: string }[] = [
  { key: 'lead', label: 'Lead', color: 'bg-slate-500', icon: 'person_add' },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-500', icon: 'verified' },
  { key: 'demo', label: 'Demo', color: 'bg-purple-500', icon: 'slideshow' },
  { key: 'proposal', label: 'Proposal', color: 'bg-amber-500', icon: 'description' },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-500', icon: 'handshake' },
  { key: 'closed_won', label: 'Won', color: 'bg-emerald-500', icon: 'celebration' },
  { key: 'closed_lost', label: 'Lost', color: 'bg-red-500', icon: 'close' },
];

function formatCurrency(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
}

function DealCard({ deal, onMove, onDelete }: { deal: Deal; onMove: (stage: DealStage) => void; onDelete: () => void }) {
  const currentIdx = STAGES.findIndex(s => s.key === deal.stage);

  return (
    <div className="bg-white dark:bg-card-dark rounded-lg p-3 border border-slate-200 dark:border-[#2a3b4d] hover:border-primary/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate flex-1">
          {deal.title}
        </h4>
      </div>
      {deal.value !== undefined && (
        <p className="text-lg font-bold text-emerald-500 mb-2">
          {formatCurrency(deal.value, deal.currency)}
        </p>
      )}
      <div className="flex items-center gap-1">
        {currentIdx > 0 && deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
          <button
            onClick={() => onMove(STAGES[currentIdx - 1].key)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
            title={`Move to ${STAGES[currentIdx - 1].label}`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          </button>
        )}
        {currentIdx < STAGES.length - 2 && deal.stage !== 'closed_won' && deal.stage !== 'closed_lost' && (
          <button
            onClick={() => onMove(STAGES[currentIdx + 1].key)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-primary transition-colors"
            title={`Move to ${STAGES[currentIdx + 1].label}`}
          >
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        )}
        <button
          onClick={onDelete}
          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title="Delete deal"
        >
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
        <span className="ml-auto text-xs text-slate-500">
          {new Date(deal.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

interface Contact {
  id: string;
  name: string;
  company?: string;
}

interface Project {
  id: string;
  title: string;
}

export function Sales() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDeal, setNewDeal] = useState({ title: '', value: '', stage: 'lead' as DealStage, contact_id: '', project_id: '' });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dealsRes, pipelineRes, contactsRes, projectsRes] = await Promise.all([
        api.getDeals(),
        api.getSalesPipeline(),
        api.getContacts(),
        api.getProjects(),
      ]);
      setDeals(dealsRes.deals || []);
      setPipeline(pipelineRes);
      setContacts(contactsRes.contacts || []);
      setProjects(projectsRes.projects || []);
    } catch (err) {
      console.error('Failed to load sales data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveDeal = async (dealId: string, newStage: DealStage) => {
    try {
      await api.updateDeal(dealId, { stage: newStage });
      loadData();
    } catch (err) {
      console.error('Failed to update deal:', err);
    }
  };

  const handleCreateDeal = async () => {
    if (!newDeal.title.trim()) return;
    try {
      await api.createDeal({
        title: newDeal.title,
        value: newDeal.value ? parseFloat(newDeal.value) : undefined,
        stage: newDeal.stage,
        contact_id: newDeal.contact_id || undefined,
        project_id: newDeal.project_id || undefined,
      });
      setNewDeal({ title: '', value: '', stage: 'lead', contact_id: '', project_id: '' });
      setShowCreate(false);
      loadData();
    } catch (err) {
      console.error('Failed to create deal:', err);
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!window.confirm('Delete this deal?')) return;
    try {
      await api.deleteDeal(dealId);
      loadData();
    } catch (err) {
      console.error('Failed to delete deal:', err);
    }
  };

  const dealsByStage = (stage: DealStage) => deals.filter(d => d.stage === stage);

  return (
    <div className="flex flex-col h-full bg-background-light dark:bg-background-dark">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1400px] mx-auto w-full p-6 md:p-8 flex flex-col gap-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Sales Pipeline
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Track deals from lead to close.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20 active:scale-95 whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              New Deal
            </button>
          </header>

          {/* Pipeline Summary */}
          {pipeline && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-[#2a3b4d]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Deals</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{pipeline.total_deals}</p>
              </div>
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-[#2a3b4d]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pipeline Value</p>
                <p className="text-2xl font-black text-emerald-500">{formatCurrency(pipeline.total_value)}</p>
              </div>
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-[#2a3b4d]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Won</p>
                <p className="text-2xl font-black text-emerald-500">
                  {pipeline.stages?.closed_won?.count || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 border border-slate-200 dark:border-[#2a3b4d]">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Active</p>
                <p className="text-2xl font-black text-blue-500">
                  {deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length}
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Kanban Board */}
          {!loading && (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
              {STAGES.map((stage) => {
                const stageDeals = dealsByStage(stage.key);
                const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                return (
                  <div key={stage.key} className="min-w-[240px] flex-shrink-0">
                    {/* Column Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        {stage.label}
                      </span>
                      <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs text-slate-500 mb-2">{formatCurrency(stageValue)}</p>
                    )}
                    {/* Cards */}
                    <div className="flex flex-col gap-2">
                      {stageDeals.map(deal => (
                        <DealCard
                          key={deal.id}
                          deal={deal}
                          onMove={(newStage) => handleMoveDeal(deal.id, newStage)}
                          onDelete={() => handleDeleteDeal(deal.id)}
                        />
                      ))}
                      {stageDeals.length === 0 && (
                        <div className="border-2 border-dashed border-slate-200 dark:border-[#2a3b4d] rounded-lg p-4 text-center">
                          <p className="text-xs text-slate-400">No deals</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && deals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-[64px] mb-4">
                monetization_on
              </span>
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
                No deals yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                Start tracking your sales pipeline by adding your first deal.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg transition-all shadow-lg shadow-blue-500/20"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add First Deal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Deal Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-dark rounded-xl p-6 w-full max-w-md border border-slate-200 dark:border-[#2a3b4d]">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">New Deal</h3>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Deal title"
                value={newDeal.title}
                onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
                autoFocus
              />
              <input
                type="number"
                placeholder="Value (optional)"
                value={newDeal.value}
                onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <select
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value as DealStage })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                {STAGES.slice(0, 5).map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
              <select
                value={newDeal.contact_id}
                onChange={(e) => setNewDeal({ ...newDeal, contact_id: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">Link Contact (optional)</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
              <select
                value={newDeal.project_id}
                onChange={(e) => setNewDeal({ ...newDeal, project_id: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-[#2a3b4d] rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              >
                <option value="">Link Project (optional)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDeal}
                  disabled={!newDeal.title.trim()}
                  className="px-4 py-2 text-sm font-bold bg-primary hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-all"
                >
                  Create Deal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
