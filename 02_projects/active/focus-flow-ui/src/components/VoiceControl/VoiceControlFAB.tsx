import { useVoiceCommands } from '../../hooks/useVoiceCommands';
import { VoiceCommandOverlay } from './VoiceCommandOverlay';

export function VoiceControlFAB() {
  const {
    isListening,
    transcript,
    lastExecutedAction,
    toggleListening,
    handsFreeMode,
  } = useVoiceCommands();

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleListening}
        className={`
          fixed bottom-6 right-6 z-40
          w-16 h-16 rounded-full
          flex items-center justify-center
          shadow-2xl shadow-primary/30
          transition-all duration-300 ease-out
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
            : 'bg-primary hover:bg-primary-dark scale-100'
          }
          ${handsFreeMode ? 'ring-4 ring-primary/50' : ''}
        `}
        aria-label={isListening ? 'Stop listening' : 'Start voice command'}
        data-testid="voice-control-fab"
      >
        <span className="material-symbols-outlined text-white text-[28px]">
          {isListening ? 'stop' : 'mic'}
        </span>
      </button>

      {/* Overlay when listening */}
      {isListening && (
        <VoiceCommandOverlay
          transcript={transcript}
          lastExecutedAction={lastExecutedAction}
          onClose={() => toggleListening()}
        />
      )}
    </>
  );
}
