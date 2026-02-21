import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface KillSwitchToggleProps {
  initialActive?: boolean;
  onToggle?: (active: boolean) => void;
  className?: string;
}

export function KillSwitchToggle({ initialActive = false, onToggle, className = '' }: KillSwitchToggleProps) {
  const [active, setActive] = useState(initialActive);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    setLoading(true);
    try {
      const method = active ? 'DELETE' : 'POST';
      const res = await fetch(`${API_BASE}/queue/kill-switch`, { method });
      if (res.ok) {
        const newState = !active;
        setActive(newState);
        onToggle?.(newState);
      }
    } catch (err) {
      console.error('Kill switch toggle failed:', err);
    } finally {
      setLoading(false);
    }
  }, [active, onToggle]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        active ? 'bg-danger' : 'bg-surface'
      } ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'} ${className}`}
      title={active ? 'Kill switch ON — agents paused' : 'Kill switch OFF — agents running'}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
