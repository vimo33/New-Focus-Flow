import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import type { MemoryItem } from '../../services/api';

type ViewMode = 'all' | 'search';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getSourceIcon(source?: string): string {
  switch (source) {
    case 'conversation': return 'chat';
    case 'explicit': return 'edit_note';
    case 'decision': return 'gavel';
    default: return 'psychology';
  }
}

function getSourceLabel(source?: string): string {
  switch (source) {
    case 'conversation': return 'Conversation';
    case 'explicit': return 'Manual';
    case 'decision': return 'Decision';
    default: return 'Auto';
  }
}

export function Memory() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: string; available: boolean } | null>(null);

  const loadMemories = useCallback(async () => {
    try {
      setLoading(true);
      const [memResponse, healthResponse] = await Promise.all([
        api.getMemories(100),
        api.getMemoryHealth(),
      ]);
      setMemories(memResponse.memories || []);
      setHealth(healthResponse);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setViewMode('all');
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setViewMode('search');
      const response = await api.searchMemories(searchQuery.trim(), 20);
      setSearchResults(response.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setViewMode('all');
    setSearchResults([]);
  };

  const handleAdd = async () => {
    if (!newMemory.trim()) return;

    try {
      setAdding(true);
      const tags = newTags.trim()
        ? newTags.split(',').map(t => t.trim()).filter(Boolean)
        : undefined;
      await api.addProjectMemory('_global', newMemory.trim(), tags);
      setNewMemory('');
      setNewTags('');
      setShowAddModal(false);
      await loadMemories();
    } catch (error) {
      console.error('Failed to add memory:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
      setSearchResults(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const displayMemories = viewMode === 'search' ? searchResults : memories;

  // Group memories by project
  const grouped = displayMemories.reduce<Record<string, MemoryItem[]>>((acc, mem) => {
    const project = mem.metadata?.project_id || '_unscoped';
    if (!acc[project]) acc[project] = [];
    acc[project].push(mem);
    return acc;
  }, {});

  const projectIds = Object.keys(grouped).sort((a, b) => {
    if (a === '_unscoped') return 1;
    if (b === '_unscoped') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="flex flex-col h-full bg-background-dark">
      {/* Header */}
      <header className="flex flex-col shrink-0 pb-4 border-b border-[#233648]/50 mb-6">
        <div className="flex justify-between items-start gap-4 mb-5">
          <div>
            <h2 className="text-white text-3xl font-black tracking-tight">Memory</h2>
            <p className="text-[#92adc9] text-sm mt-1">
              {health?.available
                ? `${memories.length} memories stored`
                : 'Memory service unavailable'}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 h-10 bg-[#233648] hover:bg-primary text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Memory
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative flex w-full h-12 rounded-lg bg-[#233648] focus-within:ring-2 focus-within:ring-primary/50">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <span className="material-symbols-outlined text-[#92adc9]">search</span>
          </div>
          <input
            className="w-full bg-transparent border-none text-white placeholder:text-[#92adc9] pl-12 pr-24 rounded-lg focus:ring-0 focus:outline-none"
            placeholder="Semantic search across all memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="p-1.5 text-[#92adc9] hover:text-white rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-3 h-8 bg-primary/20 hover:bg-primary text-primary hover:text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* View mode indicator */}
        {viewMode === 'search' && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-[#92adc9]">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </span>
            <button
              onClick={handleClearSearch}
              className="text-xs text-primary hover:text-white transition-colors"
            >
              Clear search
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        )}

        {!loading && displayMemories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[64px] text-[#324d67] mb-4">
              {viewMode === 'search' ? 'search_off' : 'psychology'}
            </span>
            <h3 className="text-white text-xl font-semibold mb-2">
              {viewMode === 'search' ? 'No results found' : 'No memories yet'}
            </h3>
            <p className="text-[#92adc9] max-w-md">
              {viewMode === 'search'
                ? 'Try a different search query'
                : 'Memories are automatically captured from conversations, decisions, and the command center. You can also add them manually.'}
            </p>
          </div>
        )}

        {!loading && displayMemories.length > 0 && (
          <div className="space-y-8">
            {projectIds.map(projectId => (
              <div key={projectId}>
                {/* Project group header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    {projectId === '_unscoped' ? 'language' : 'folder'}
                  </span>
                  <h3 className="text-sm font-semibold text-[#92adc9] uppercase tracking-wider">
                    {projectId === '_unscoped' ? 'Global' : projectId}
                  </h3>
                  <span className="text-xs text-[#4a6a8a]">
                    ({grouped[projectId].length})
                  </span>
                </div>

                {/* Memory cards */}
                <div className="space-y-2">
                  {grouped[projectId].map(mem => (
                    <div
                      key={mem.id}
                      className="group flex items-start gap-4 bg-[#192633] rounded-lg px-4 py-3 border border-transparent hover:border-[#233648] transition-all"
                    >
                      {/* Source icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-8 h-8 rounded-full bg-[#233648] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px] text-[#92adc9]">
                            {getSourceIcon(mem.metadata?.source)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm leading-relaxed">{mem.memory}</p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {/* Source badge */}
                          <span className="text-xs text-[#4a6a8a]">
                            {getSourceLabel(mem.metadata?.source)}
                          </span>

                          {/* Tags */}
                          {mem.metadata?.tags && (mem.metadata.tags as string[]).map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}

                          {/* Score (search mode) */}
                          {mem.score !== undefined && (
                            <span className="text-[10px] font-mono text-emerald-400">
                              {(mem.score * 100).toFixed(0)}% match
                            </span>
                          )}

                          {/* Time */}
                          <span className="text-xs text-[#4a6a8a] ml-auto flex-shrink-0">
                            {formatDate(mem.updated_at || mem.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(mem.id)}
                        disabled={deletingId === mem.id}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-[#4a6a8a] hover:text-red-400 rounded transition-all disabled:opacity-50"
                        title="Delete memory"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {deletingId === mem.id ? 'hourglass_empty' : 'delete'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#192633] rounded-xl border border-[#233648] shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#233648]">
              <h3 className="text-white text-lg font-bold">Add Memory</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#92adc9] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-[#92adc9] mb-1.5 block">
                  Fact, decision, or preference
                </label>
                <textarea
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="e.g. We decided to use PostgreSQL for the auth service..."
                  className="w-full h-28 bg-[#233648] text-white placeholder:text-[#4a6a8a] rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none border-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-[#92adc9] mb-1.5 block">
                  Tags (optional, comma-separated)
                </label>
                <input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. architecture, database, auth"
                  className="w-full h-10 bg-[#233648] text-white placeholder:text-[#4a6a8a] rounded-lg px-4 text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none border-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#233648]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 h-9 text-sm font-medium text-[#92adc9] hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newMemory.trim() || adding}
                className="px-5 h-9 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Saving...' : 'Save Memory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
