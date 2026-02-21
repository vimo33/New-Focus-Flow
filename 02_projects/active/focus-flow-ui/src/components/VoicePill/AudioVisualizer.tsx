interface AudioVisualizerProps {
  side: 'left' | 'right';
  level: number;
  color?: string;
}

export default function AudioVisualizer({ side, level, color = 'bg-primary' }: AudioVisualizerProps) {
  const baseHeights = [12, 16, 24, 32]; // h-3, h-4, h-6, h-8
  const delays = ['0s', '0.1s', '0.2s', '0.3s'];

  const bars = side === 'right' ? baseHeights : [...baseHeights].reverse();

  return (
    <div className={`absolute ${side === 'left' ? '-left-12' : '-right-12'} top-1/2 -translate-y-1/2 flex items-center gap-0.5`}>
      {bars.map((h, i) => {
        const scaledH = Math.max(8, h * (0.3 + level * 0.7));
        return (
          <div
            key={i}
            className={`w-1 ${color} rounded-full opacity-50`}
            style={{
              height: `${scaledH}px`,
              animation: level > 0.01 ? `pulse 0.6s ease-in-out infinite` : 'none',
              animationDelay: delays[i],
              transition: 'height 0.15s ease',
            }}
          />
        );
      })}
    </div>
  );
}
