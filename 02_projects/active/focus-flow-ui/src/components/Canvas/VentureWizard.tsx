import { useState, useCallback } from 'react';
import { Rocket, ArrowRight, ArrowLeft, Sparkles, FlaskConical } from 'lucide-react';
import { useCanvasStore } from '../../stores/canvas';
import { useModeStore } from '../../stores/mode';
import { api } from '../../services/api';

type WizardStep = 'basics' | 'problem' | 'hypotheses' | 'experiment' | 'done';

interface VentureForm {
  name: string;
  problemStatement: string;
  icp: string;
  constraints: string;
}

interface GeneratedHypothesis {
  statement: string;
  type: 'problem' | 'solution' | 'channel' | 'pricing' | 'moat';
  confidence: number;
  selected: boolean;
}

export default function VentureWizard() {
  const { goBack } = useCanvasStore();
  const { setModeAndTab } = useModeStore();
  const [step, setStep] = useState<WizardStep>('basics');
  const [form, setForm] = useState<VentureForm>({
    name: '',
    problemStatement: '',
    icp: '',
    constraints: '',
  });
  const [hypotheses, setHypotheses] = useState<GeneratedHypothesis[]>([]);
  const [generatingHypotheses, setGeneratingHypotheses] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const updateForm = useCallback((field: keyof VentureForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const createProjectAndHypotheses = async () => {
    setCreating(true);
    try {
      // 1. Create the project
      const { project } = await api.createProject({
        title: form.name,
        description: form.problemStatement,
        status: 'active',
        metadata: {
          icp: form.icp,
          constraints: form.constraints,
        },
      });
      setCreatedProjectId(project.id);

      // 2. Generate hypotheses (for now, create structured ones from the problem)
      setGeneratingHypotheses(true);
      const generated: GeneratedHypothesis[] = [
        {
          statement: `The target audience (${form.icp || 'unknown'}) actively experiences "${form.problemStatement}" and would pay for a solution`,
          type: 'problem',
          confidence: 0.5,
          selected: true,
        },
        {
          statement: `A focused MVP addressing the core pain point can be built within the constraints: ${form.constraints || 'standard'}`,
          type: 'solution',
          confidence: 0.4,
          selected: true,
        },
        {
          statement: `The target audience can be reached through direct outreach and community channels`,
          type: 'channel',
          confidence: 0.3,
          selected: false,
        },
      ];
      setHypotheses(generated);
      setGeneratingHypotheses(false);
      setStep('hypotheses');
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setCreating(false);
    }
  };

  const saveHypothesesAndCreateExperiment = async () => {
    if (!createdProjectId) return;
    setCreating(true);
    try {
      const selected = hypotheses.filter(h => h.selected);

      // Save hypotheses to backend
      for (const h of selected) {
        await api.createHypothesis({
          projectId: createdProjectId,
          statement: h.statement,
          type: h.type,
          confidence: h.confidence,
        });
      }

      setStep('experiment');
    } catch (err) {
      console.error('Failed to save hypotheses:', err);
    } finally {
      setCreating(false);
    }
  };

  const createFirstExperiment = async (metricName: string, successRule: string) => {
    if (!createdProjectId) return;
    setCreating(true);
    try {
      await api.createExperimentV2({
        projectId: createdProjectId,
        metricName,
        successRule,
      });
      setStep('done');
    } catch (err) {
      console.error('Failed to create experiment:', err);
    } finally {
      setCreating(false);
    }
  };

  const goToExperiments = () => {
    setModeAndTab('validate', 'stack');
  };

  const STEPS: { id: WizardStep; label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'problem', label: 'Problem' },
    { id: 'hypotheses', label: 'Hypotheses' },
    { id: 'experiment', label: 'Experiment' },
    { id: 'done', label: 'Done' },
  ];

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Rocket size={20} className="text-indigo-400" />
            New Venture
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Idea → Hypotheses → First Experiment
          </p>
        </div>
        <button
          onClick={goBack}
          className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1">
            <div className={`h-1 flex-1 rounded-full transition-colors ${
              i <= stepIdx ? 'bg-indigo-500' : 'bg-white/10'
            }`} />
          </div>
        ))}
      </div>

      {/* Step: Basics */}
      {step === 'basics' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Venture Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g. AI Writing Assistant for Lawyers"
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Customer (ICP)</label>
            <input
              type="text"
              value={form.icp}
              onChange={(e) => updateForm('icp', e.target.value)}
              placeholder="e.g. Solo practitioners at mid-size law firms"
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setStep('problem')}
            disabled={!form.name.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 text-indigo-400 font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step: Problem */}
      {step === 'problem' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Problem Statement</label>
            <textarea
              value={form.problemStatement}
              onChange={(e) => updateForm('problemStatement', e.target.value)}
              placeholder="What specific problem does your target customer face? Be concrete."
              rows={4}
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Constraints</label>
            <input
              type="text"
              value={form.constraints}
              onChange={(e) => updateForm('constraints', e.target.value)}
              placeholder="e.g. $500 budget, solo founder, 4-week timeline"
              className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('basics')}
              className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={createProjectAndHypotheses}
              disabled={!form.problemStatement.trim() || creating}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 text-indigo-400 font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={16} />
              {creating ? 'Creating...' : 'Generate Hypotheses'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Hypotheses */}
      {step === 'hypotheses' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-400">
            Select the hypotheses you want to test first. Each selected hypothesis will be saved to your venture.
          </p>

          {generatingHypotheses ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-500 text-sm">Generating hypotheses...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hypotheses.map((h, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setHypotheses(prev => prev.map((hyp, j) =>
                      j === i ? { ...hyp, selected: !hyp.selected } : hyp
                    ));
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    h.selected
                      ? 'border-indigo-500/40 bg-indigo-500/10'
                      : 'border-white/8 bg-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/10 text-slate-400">
                          {h.type}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Confidence: {Math.round(h.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 mt-1">{h.statement}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                      h.selected ? 'border-indigo-400 bg-indigo-500' : 'border-white/20'
                    }`}>
                      {h.selected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('problem')}
              className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={saveHypothesesAndCreateExperiment}
              disabled={!hypotheses.some(h => h.selected) || creating}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 text-indigo-400 font-medium hover:bg-indigo-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating ? 'Saving...' : 'Save & Create Experiment'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step: Experiment */}
      {step === 'experiment' && (
        <ExperimentSetup
          onBack={() => setStep('hypotheses')}
          onCreate={createFirstExperiment}
          creating={creating}
        />
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <FlaskConical size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">Venture Created</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
            Your venture "{form.name}" is live with hypotheses and a first experiment ready to run.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={goBack}
              className="px-6 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 transition-colors"
            >
              Back to Portfolio
            </button>
            <button
              onClick={goToExperiments}
              className="px-6 py-2.5 rounded-lg text-sm font-medium bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-2"
            >
              <FlaskConical size={14} />
              View Experiments
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExperimentSetup({
  onBack,
  onCreate,
  creating,
}: {
  onBack: () => void;
  onCreate: (metricName: string, successRule: string) => Promise<void>;
  creating: boolean;
}) {
  const [metricName, setMetricName] = useState('');
  const [successRule, setSuccessRule] = useState('');

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Define the first experiment to validate your top hypothesis. What will you measure?
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Metric Name</label>
        <input
          type="text"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="e.g. Landing page conversion rate"
          className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Success Rule</label>
        <input
          type="text"
          value={successRule}
          onChange={(e) => setSuccessRule(e.target.value)}
          placeholder="e.g. > 5% sign-up rate from 100 visitors within 7 days"
          className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
        />
      </div>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-3 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={() => onCreate(metricName, successRule)}
          disabled={!metricName.trim() || !successRule.trim() || creating}
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FlaskConical size={16} />
          {creating ? 'Creating...' : 'Create Experiment'}
        </button>
      </div>
    </div>
  );
}
