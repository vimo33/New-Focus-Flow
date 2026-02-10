import { Link } from 'react-router-dom';

interface VoiceCommandOverlayProps {
  transcript: string;
  lastExecutedAction: string | null;
  onClose: () => void;
}

export function VoiceCommandOverlay({
  transcript,
  lastExecutedAction,
  onClose,
}: VoiceCommandOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-testid="voice-command-overlay"
    >
      <div
        className="relative w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Listening Indicator */}
        <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl p-8 border border-primary/30 shadow-2xl shadow-primary/20">
          {/* Pulsing Circle Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-white text-[48px]">
                  mic
                </span>
              </div>
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75"></div>
            </div>
          </div>

          {/* Status Text */}
          <div className="text-center mb-6">
            <h2 className="text-white text-2xl font-bold mb-2">
              Listening...
            </h2>
            <p className="text-slate-300 text-sm">
              Speak your command
            </p>
          </div>

          {/* Live Transcript */}
          {transcript && (
            <div className="bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-700">
              <p className="text-slate-200 text-base font-medium text-center">
                "{transcript}"
              </p>
            </div>
          )}

          {/* Last Executed Action */}
          {lastExecutedAction && !transcript && (
            <div className="bg-green-500/20 rounded-xl p-4 mb-4 border border-green-500/30">
              <div className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-green-400 text-[20px]">
                  check_circle
                </span>
                <p className="text-green-200 text-sm font-medium">
                  {lastExecutedAction}
                </p>
              </div>
            </div>
          )}

          {/* Quick Tips */}
          <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-400 text-xs text-center mb-2 font-semibold">
              Try saying:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 bg-slate-800/50 rounded-full text-slate-300 text-xs">
                "Go to inbox"
              </span>
              <span className="px-3 py-1 bg-slate-800/50 rounded-full text-slate-300 text-xs">
                "Create a task"
              </span>
              <span className="px-3 py-1 bg-slate-800/50 rounded-full text-slate-300 text-xs">
                "How many items?"
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-slate-300 text-[20px]">
              close
            </span>
          </button>

          {/* Link to Full Voice Page */}
          <Link
            to="/voice"
            className="block mt-4 text-center text-primary hover:text-primary-light text-sm font-medium transition-colors"
          >
            Open full voice assistant →
          </Link>
        </div>
      </div>
    </div>
  );
}
