import { useCanvasStore } from '../../stores/canvas';
import { lazy, Suspense, useRef, useEffect, useState } from 'react';

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
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="text-text-tertiary">Loading...</div>
            </div>
          }
        >
          {renderCanvas()}
        </Suspense>
      </div>
    </div>
  );
}
