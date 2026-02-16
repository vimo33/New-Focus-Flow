type Strength = 'strong' | 'medium' | 'weak' | 'dormant';

interface RelationshipDotsProps {
  strength: Strength;
  className?: string;
}

const dotCounts: Record<Strength, number> = {
  strong: 3,
  medium: 2,
  weak: 1,
  dormant: 0,
};

export function RelationshipDots({ strength, className = '' }: RelationshipDotsProps) {
  const filled = dotCounts[strength];

  return (
    <div className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < filled ? 'bg-primary' : 'bg-[#334155]'
          }`}
        />
      ))}
    </div>
  );
}
