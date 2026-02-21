import { useEffect, useState, useRef } from 'react';
import { useModeStore } from '../../stores/mode';
import { useCanvasStore } from '../../stores/canvas';

export function RouteProgressBar() {
  const { activeMode, activeSubTab } = useModeStore();
  const { activeCanvas } = useCanvasStore();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevKey = useRef(`${activeMode}-${activeSubTab}-${activeCanvas}`);

  const currentKey = `${activeMode}-${activeSubTab}-${activeCanvas}`;

  useEffect(() => {
    if (prevKey.current === currentKey) return;
    prevKey.current = currentKey;

    setProgress(0);
    setVisible(true);

    // Fast ramp to 80%
    const t1 = setTimeout(() => setProgress(80), 50);
    // Slow crawl to 95%
    const t2 = setTimeout(() => setProgress(95), 400);
    // Snap to 100%
    const t3 = setTimeout(() => setProgress(100), 700);
    // Hide
    const t4 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [currentKey]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-0.5"
      data-testid="route-progress"
    >
      <div
        className="h-full bg-primary rounded-r-full transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress <= 80 ? '200ms' : progress <= 95 ? '300ms' : '150ms',
          background: 'var(--color-primary, #06b6d4)',
        }}
      />
    </div>
  );
}
