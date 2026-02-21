import { useState } from 'react';
import { useValidationStore } from '../../stores/validation';
import { SparkLine } from './SparkLine';

interface EnjoymentWidgetProps {
  projectId: string;
  className?: string;
}

const EMOJI_MAP: Record<number, string> = {
  1: '\uD83D\uDE29', // weary
  2: '\uD83D\uDE15', // confused
  3: '\uD83D\uDE10', // neutral
  4: '\uD83D\uDE0A', // smiling
  5: '\uD83E\uDD29', // star-struck
};

export function EnjoymentWidget({ projectId, className = '' }: EnjoymentWidgetProps) {
  const { enjoyment, recordEnjoyment } = useValidationStore();
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const history = enjoyment.get(projectId) || [];
  const latest = history.length > 0 ? history[0] : null;
  const sparkData = [...history].reverse().map(e => e.score);

  const handleSelect = async (score: number) => {
    await recordEnjoyment(projectId, score, note || undefined);
    setNote('');
    setShowNote(false);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-tertiary uppercase tracking-wider">Enjoyment</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              onClick={() => handleSelect(score)}
              onMouseEnter={() => setHoveredScore(score)}
              onMouseLeave={() => setHoveredScore(null)}
              className={`w-7 h-7 rounded flex items-center justify-center transition-all cursor-pointer
                ${latest?.score === score ? 'bg-primary/20 ring-1 ring-primary/50' : 'hover:bg-elevated'}
                ${hoveredScore === score ? 'scale-110' : ''}`}
              title={`${score}/5`}
            >
              <span className="text-sm">{EMOJI_MAP[score]}</span>
            </button>
          ))}
        </div>
        {latest && (
          <span className="text-xs text-text-tertiary font-mono">{latest.score}/5</span>
        )}
        {sparkData.length > 1 && (
          <SparkLine data={sparkData} width={48} height={16} />
        )}
        <button
          onClick={() => setShowNote(!showNote)}
          className="text-xs text-text-tertiary hover:text-primary transition-colors cursor-pointer"
        >
          +note
        </button>
      </div>
      {showNote && (
        <div className="flex gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why this rating?"
            className="flex-1 bg-base border border-border rounded px-2 py-1 text-xs text-text-primary placeholder:text-text-tertiary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && latest) handleSelect(latest.score);
            }}
          />
        </div>
      )}
    </div>
  );
}
