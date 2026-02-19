import { useCanvasStore } from '../../stores/canvas';
import { useModeStore } from '../../stores/mode';
import { lazy, Suspense, useRef, useEffect, useState, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

class ChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    const isChunkError =
      error.message.includes('dynamically imported module') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('Loading chunk');

    if (isChunkError) {
      const reloadKey = 'chunk-reload-' + window.location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(reloadKey);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-text-secondary text-lg">Something went wrong</p>
            <p className="text-text-tertiary text-sm mt-1 max-w-md">
              A new version may be available. Try reloading.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy load existing canvas components
const MorningBriefing = lazy(() => import('./MorningBriefing'));
const CouncilEvaluationCanvas = lazy(() => import('./CouncilEvaluationCanvas'));
const WeeklyReportCanvas = lazy(() => import('./WeeklyReportCanvas'));
const SettingsCanvas = lazy(() => import('./SettingsCanvas'));
const NetworkCanvas = lazy(() => import('./NetworkCanvas'));
const PortfolioCanvas = lazy(() => import('./PortfolioCanvas'));
const ProjectDetailCanvas = lazy(() => import('./ProjectDetailCanvas'));
const FinancialsCanvas = lazy(() => import('./FinancialsCanvas'));
const CalendarCanvas = lazy(() => import('./CalendarCanvas'));
const OnboardingFlow = lazy(() => import('../Onboarding/OnboardingFlow'));
const MarketingCanvas = lazy(() => import('./MarketingCanvas'));
const ReportsCanvas = lazy(() => import('./ReportsCanvas'));

// Lazy load new v2 canvas components
const ExperimentStack = lazy(() => import('./ExperimentStack'));
const ApprovalQueue = lazy(() => import('./ApprovalQueue'));
const PlaybookLibrary = lazy(() => import('./PlaybookLibrary'));
const VentureWizard = lazy(() => import('./VentureWizard'));

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <p className="text-slate-300 text-lg font-medium">{name}</p>
        <p className="text-slate-500 text-sm mt-1">Coming soon in Nitara v2</p>
      </div>
    </div>
  );
}

export default function CanvasRouter() {
  const { activeCanvas } = useCanvasStore();
  const { activeMode, activeSubTab } = useModeStore();
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(`${activeMode}-${activeSubTab}-${activeCanvas}`);

  const currentKey = `${activeMode}-${activeSubTab}-${activeCanvas}`;

  useEffect(() => {
    if (prevKey.current !== currentKey) {
      setVisible(false);
      const timer = setTimeout(() => {
        prevKey.current = currentKey;
        setVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [currentKey]);

  // If onboarding is active, show it regardless of mode
  if (activeCanvas === 'onboarding') {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
          <OnboardingFlow />
        </Suspense>
      </ChunkErrorBoundary>
    );
  }

  const renderModeCanvas = () => {
    switch (activeMode) {
      case 'think':
        switch (activeSubTab) {
          case 'strategy': return <PortfolioCanvas />;
          case 'ventures': return <PortfolioCanvas />;
          case 'finance': return <FinancialsCanvas />;
          case 'comms': return <ComingSoon name="Communications" />;
          default: return <MorningBriefing />;
        }

      case 'validate':
        switch (activeSubTab) {
          case 'stack': return <ExperimentStack />;
          case 'variant-testing': return <ComingSoon name="Variant Testing" />;
          case 'data-sources': return <ComingSoon name="Data Sources" />;
          default: return <ExperimentStack />;
        }

      case 'build':
        switch (activeSubTab) {
          case 'build': return <ComingSoon name="Autonomous Builder" />;
          case 'control': return <ApprovalQueue />;
          case 'agents': return <ComingSoon name="Agent Dashboard" />;
          case 'data': return <ComingSoon name="Data Pipeline" />;
          case 'tune': return <ComingSoon name="Model Tuning" />;
          default: return <ComingSoon name="Build Mode" />;
        }

      case 'grow':
        switch (activeSubTab) {
          case 'resources': return <ComingSoon name="Resource Engine" />;
          case 'kpis': return <ComingSoon name="KPI Dashboard" />;
          case 'simulation': return <ComingSoon name="Simulation View" />;
          case 'market': return <MarketingCanvas />;
          default: return <ComingSoon name="Grow Mode" />;
        }

      case 'leverage':
        switch (activeSubTab) {
          case 'network': return <NetworkCanvas />;
          case 'playbooks': return <PlaybookLibrary />;
          case 'tools': return <ComingSoon name="Tool Registry" />;
          case 'partnerships': return <ComingSoon name="Partnerships" />;
          default: return <NetworkCanvas />;
        }

      default:
        return <MorningBriefing />;
    }
  };

  // Fallback: support direct canvas navigation for detail views
  const renderCanvasFallback = () => {
    switch (activeCanvas) {
      case 'project_detail': return <ProjectDetailCanvas />;
      case 'council_evaluation': return <CouncilEvaluationCanvas />;
      case 'weekly_report': return <WeeklyReportCanvas />;
      case 'reports': return <ReportsCanvas />;
      case 'settings': return <SettingsCanvas />;
      case 'calendar': return <CalendarCanvas />;
      case 'venture_wizard': return <VentureWizard />;
      default: return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div
        className={`transition-opacity duration-300 ease-in-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <ChunkErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {renderCanvasFallback() || renderModeCanvas()}
          </Suspense>
        </ChunkErrorBoundary>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-500 text-sm">Loading...</div>
    </div>
  );
}
