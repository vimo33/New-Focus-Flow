import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface TypedConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmPhrase: string;
  severity?: 'warning' | 'critical';
  confirmLabel?: string;
  salvageItems?: { label: string; description: string; checked: boolean }[];
  resourcePreview?: string;
}

export default function TypedConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
  severity = 'critical',
  confirmLabel = 'Confirm',
  salvageItems,
  resourcePreview,
}: TypedConfirmationModalProps) {
  const [input, setInput] = useState('');
  const isMatch = input === confirmPhrase;

  const handleConfirm = useCallback(() => {
    if (isMatch) {
      onConfirm();
      setInput('');
    }
  }, [isMatch, onConfirm]);

  if (!isOpen) return null;

  const isCritical = severity === 'critical';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[rgba(15,10,20,0.85)] backdrop-blur-[24px] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
        {/* Severity badge */}
        <div className="flex justify-center pt-6">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${
            isCritical ? 'bg-red-950/40 border border-red-500/20' : 'bg-amber-950/40 border border-amber-500/20'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCritical ? 'bg-red-500' : 'bg-amber-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isCritical ? 'bg-red-600' : 'bg-amber-600'
              }`} />
            </span>
            <span className={`text-xs font-semibold uppercase tracking-widest ${
              isCritical ? 'text-red-300' : 'text-amber-300'
            }`}>
              Severity: {severity}
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle size={18} className={isCritical ? 'text-red-500' : 'text-amber-500'} />
              {title}
            </h2>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={18} />
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-2">{description}</p>
        </div>

        {/* Salvage items */}
        {salvageItems && salvageItems.length > 0 && (
          <div className="px-6 pb-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Salvage Checklist
            </h3>
            <div className="space-y-2">
              {salvageItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                    <p className="text-[10px] text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resource preview */}
        {resourcePreview && (
          <div className="px-6 pb-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-900/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-200/90">{resourcePreview}</p>
            </div>
          </div>
        )}

        {/* Confirmation input */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">
            Type{' '}
            <span className={`font-mono px-1 rounded select-all ${
              isCritical ? 'text-red-400 bg-red-950/30' : 'text-amber-400 bg-amber-950/30'
            }`}>
              {confirmPhrase}
            </span>
            {' '}to confirm
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={confirmPhrase}
            className={`w-full bg-black/40 border rounded-lg px-4 py-3 text-white placeholder-slate-600 font-mono text-sm shadow-inner transition-all focus:outline-none ${
              isMatch
                ? isCritical ? 'border-red-500 ring-2 ring-red-500/30' : 'border-amber-500 ring-2 ring-amber-500/30'
                : 'border-white/20 focus:border-white/40'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          />
        </div>

        {/* Actions */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatch}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              isMatch
                ? isCritical
                  ? 'bg-red-600/90 hover:bg-red-600 text-white shadow-lg shadow-red-900/40 border border-red-500/50'
                  : 'bg-amber-600/90 hover:bg-amber-600 text-white shadow-lg shadow-amber-900/40 border border-amber-500/50'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
