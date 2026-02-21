import { useEffect, useState } from 'react';
import { GitBranch, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard, Badge } from '../shared';

export default function DataPipeline() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.getProjects('active');
      setProjects((res.projects || []).filter((p: any) => p.pipeline));
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    } finally {
      setLoading(false);
    }
  }

  const PHASES = ['concept', 'spec', 'design', 'dev', 'test', 'deploy', 'live'];

  return (
    <div data-testid="canvas-data-pipeline" className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <GitBranch size={20} className="text-primary" />
          Data Pipeline
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Project pipeline stages and artifact tracking
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm text-center py-12">Loading pipelines...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <GitBranch size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No active pipelines</p>
          <p className="text-slate-600 text-xs mt-1">Projects with active pipelines will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project: any) => {
            const pipeline = project.pipeline;
            const currentPhase = pipeline?.current_phase || 'concept';

            return (
              <GlassCard key={project.id}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-200">{project.title}</h3>
                  <Badge label={currentPhase} variant="active" />
                </div>

                {/* Phase progression */}
                <div className="flex items-center gap-1">
                  {PHASES.map((phase, i) => {
                    const phaseState = pipeline?.phases?.[phase];
                    const isCurrent = phase === currentPhase;
                    const isComplete = phaseState?.sub_state === 'approved' || phaseState?.completed_at;
                    const phaseIdx = PHASES.indexOf(phase);
                    const currentIdx = PHASES.indexOf(currentPhase);
                    const isPast = phaseIdx < currentIdx;

                    const Icon = isComplete || isPast ? CheckCircle2 : isCurrent ? Loader2 : Circle;
                    const color = isComplete || isPast ? 'text-success' : isCurrent ? 'text-primary' : 'text-slate-600';

                    return (
                      <div key={phase} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <Icon size={16} className={`${color} ${isCurrent ? 'animate-pulse' : ''}`} />
                          <span className={`text-[9px] mt-1 ${isCurrent ? 'text-primary font-bold' : 'text-slate-600'}`}>
                            {phase}
                          </span>
                        </div>
                        {i < PHASES.length - 1 && (
                          <div className={`w-8 h-0.5 mx-1 ${isPast || isComplete ? 'bg-success' : 'bg-slate-700'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
