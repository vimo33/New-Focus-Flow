import { useState } from 'react';
import { BookOpen, ChevronRight, Search } from 'lucide-react';

interface Playbook {
  id: string;
  title: string;
  context: string;
  stepsCount: number;
  sourceProject?: string;
  createdAt: string;
}

function PlaybookCard({ playbook }: { playbook: Playbook }) {
  return (
    <div className="bg-[rgba(15,10,20,0.65)] backdrop-blur-[20px] border border-white/8 rounded-xl p-5 transition-all hover:border-white/15 cursor-pointer group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">
            {playbook.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{playbook.context}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {playbook.stepsCount} steps
            </span>
            {playbook.sourceProject && (
              <span className="text-[10px] text-indigo-400/60">
                from {playbook.sourceProject}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
    </div>
  );
}

export default function PlaybookLibrary() {
  const [search, setSearch] = useState('');
  // Mock data for initial render
  const playbooks: Playbook[] = [];

  const filtered = playbooks.filter(
    (pb) =>
      pb.title.toLowerCase().includes(search.toLowerCase()) ||
      pb.context.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen size={20} className="text-cyan-400" />
            Playbook Library
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Reusable patterns extracted from completed work
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search playbooks..."
          className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/8 rounded-lg text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-white/15 transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <BookOpen size={32} className="text-slate-600 mb-2" />
          <p className="text-slate-400 text-sm">
            {search ? 'No playbooks match your search' : 'No playbooks yet'}
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Playbooks are extracted automatically when experiments are completed or projects are terminated
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pb) => (
            <PlaybookCard key={pb.id} playbook={pb} />
          ))}
        </div>
      )}
    </div>
  );
}
