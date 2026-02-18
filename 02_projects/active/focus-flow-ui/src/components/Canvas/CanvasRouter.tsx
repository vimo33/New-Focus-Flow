import { useCanvasStore } from '../../stores/canvas';
import { lazy, Suspense, useRef, useEffect, useState, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

/**
 * Error boundary that catches dynamic import failures (stale chunks after rebuild)
 * and auto-reloads the page once. Shows a retry button if reload already attempted.
 */
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
      // Auto-reload once to pick up new chunk hashes
      const reloadKey = 'chunk-reload-' + window.location.pathname;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        return;
      }
      // Already tried reloading — clear flag so next navigation can try again
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

// Lazy load canvas components
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

// Placeholder for canvases not yet built
function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-text-secondary text-lg">{name}</p>
        <p className="text-text-tertiary text-sm mt-1">Coming Soon</p>
      </div>
    </div>
  );
}

export default function CanvasRouter() {
  const { activeCanvas } = useCanvasStore();
  const [visible, setVisible] = useState(true);
  const prevCanvas = useRef(activeCanvas);

  useEffect(() => {
    if (prevCanvas.current !== activeCanvas) {
      setVisible(false);
      const timer = setTimeout(() => {
        prevCanvas.current = activeCanvas;
        setVisible(true);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeCanvas]);

  const renderCanvas = () => {
    switch (activeCanvas) {
      case 'morning_briefing':
        return <MorningBriefing />;
      case 'portfolio':
        return <PortfolioCanvas />;
      case 'network':
        return <NetworkCanvas />;
      case 'financials':
        return <FinancialsCanvas />;
      case 'project_detail':
        return <ProjectDetailCanvas />;
      case 'calendar':
        return <CalendarCanvas />;
      case 'settings':
        return <SettingsCanvas />;
      case 'council_evaluation':
        return <CouncilEvaluationCanvas />;
      case 'weekly_report':
        return <WeeklyReportCanvas />;
      case 'onboarding':
        return <OnboardingFlow />;
      case 'marketing':
        return <MarketingCanvas />;
      case 'reports':
        return <ReportsCanvas />;
      default:
        return <ComingSoon name="Unknown Canvas" />;
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
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-text-tertiary">Loading...</div>
              </div>
            }
          >
            {renderCanvas()}
          </Suspense>
        </ChunkErrorBoundary>
      </div>
    </div>
  );
}
