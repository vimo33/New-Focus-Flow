import { useState, useRef, useEffect } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export function ExpandableText({ text, maxLines = 3, className = '' }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
  }, [text, maxLines]);

  const clampClass = expanded ? '' : `line-clamp-${maxLines}`;

  return (
    <div>
      <div
        ref={textRef}
        className={`text-text-secondary text-sm leading-relaxed ${clampClass} ${className}`}
        style={!expanded ? { WebkitLineClamp: maxLines, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' } : undefined}
      >
        {text}
      </div>
      {isOverflowing && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-primary text-xs mt-1 hover:text-primary/80 transition-colors"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
