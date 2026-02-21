import { useEffect, useState } from 'react';
import { Wrench, Shield, Zap, Search } from 'lucide-react';
import { api } from '../../services/api';
import type { ToolManifest } from '../../services/api';
import { GlassCard, StatCard } from '../shared';

const TRUST_STYLES: Record<string, { bg: string; text: string }> = {
  trusted: { bg: 'bg-success/20', text: 'text-success' },
  verified: { bg: 'bg-primary/20', text: 'text-primary' },
  community: { bg: 'bg-tertiary/20', text: 'text-tertiary' },
  experimental: { bg: 'bg-warning/20', text: 'text-warning' },
};

const EXEC_STYLES: Record<string, string> = {
  'in-process': 'bg-success/10 text-success',
  docker: 'bg-primary/10 text-primary',
  cli: 'bg-tertiary/10 text-tertiary',
  api: 'bg-warning/10 text-warning',
};

export default function ToolRegistryCanvas() {
  const [tools, setTools] = useState<ToolManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    loadTools();
  }, []);

  async function loadTools() {
    setLoading(true);
    try {
      const res = await api.getTools();
      setTools(res.tools || []);
    } catch (err) {
      console.error('Failed to load tools:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = tools.filter(tool => {
    if (search && !tool.name.toLowerCase().includes(search.toLowerCase()) &&
        !tool.description?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && tool.execution_type !== typeFilter) return false;
    return true;
  });

  const execTypes = [...new Set(tools.map(t => t.execution_type))];

  return (
    <div data-testid="canvas-tool-registry" className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Wrench size={20} className="text-tertiary" />
          Tool Registry
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Available tools, capabilities, and execution details
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard value={String(tools.length)} label="Total Tools" />
        <StatCard
          value={String(tools.filter(t => t.trust_level === 'trusted').length)}
          label="Trusted"
        />
        <StatCard
          value={String(tools.filter(t => t.requires_approval).length)}
          label="Need Approval"
        />
        <StatCard
          value={String(execTypes.length)}
          label="Exec Types"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-600"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              !typeFilter ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            All
          </button>
          {execTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t ? 'bg-primary/20 text-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Grid */}
      {loading ? (
        <p className="text-slate-500 text-sm text-center py-12">Loading tools...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Wrench size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No tools found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(tool => {
            const trust = TRUST_STYLES[tool.trust_level] || TRUST_STYLES.experimental;
            const isExpanded = expanded === tool.id;

            return (
              <GlassCard
                key={tool.id}
                className={`cursor-pointer transition-all ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
              >
                <div onClick={() => setExpanded(isExpanded ? null : tool.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200">{tool.name}</h3>
                      {tool.version && (
                        <span className="text-[10px] text-slate-500 font-mono">v{tool.version}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${trust.bg} ${trust.text}`}>
                        {tool.trust_level}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${EXEC_STYLES[tool.execution_type] || ''}`}>
                        {tool.execution_type}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{tool.description}</p>

                  {tool.capabilities && tool.capabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tool.capabilities.slice(0, 4).map(cap => (
                        <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-slate-500">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Shield size={12} className="text-slate-500" />
                      <span className="text-slate-400">
                        Requires approval: {tool.requires_approval ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {tool.cost_estimate && (
                      <div className="flex items-center gap-2 text-xs">
                        <Zap size={12} className="text-slate-500" />
                        <span className="text-slate-400">Cost: {tool.cost_estimate}</span>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
