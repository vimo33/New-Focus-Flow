import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { voiceCommandRouter } from '../services/voice-command-router';
import { ActionExecutor, type ExecutionResult } from '../services/action-executor';
import type { VoiceCommandIntent } from '../services/api';
import { useTTS } from './useTTS';

export interface SuggestedAction {
  id: string;
  type: 'navigation' | 'create' | 'query' | 'update' | 'delete' | 'conversation';
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  status: 'pending' | 'approved' | 'rejected';
  intent: VoiceCommandIntent;
}

export function useVoiceCommands() {
  const navigate = useNavigate();
  const location = useLocation();
  const { speak } = useTTS();

  const [isListening, setIsListening] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [lastExecutedAction, setLastExecutedAction] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const actionExecutorRef = useRef<ActionExecutor | null>(null);

  // Initialize action executor
  useEffect(() => {
    actionExecutorRef.current = new ActionExecutor(navigate);
  }, [navigate]);

  // Initialize Web Speech API
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = handsFreeMode;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += piece;
            } else {
              interimTranscript += piece;
            }
          }

          if (finalTranscript) {
            setTranscript('');
            handleVoiceCommand(finalTranscript.trim());
          } else {
            setTranscript(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Voice recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          if (handsFreeMode && recognitionRef.current) {
            setTimeout(() => {
              try {
                recognitionRef.current?.start();
              } catch (_) {}
            }, 100);
          }
        };
      }
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [handsFreeMode]);

  // Handle hands-free mode toggle
  useEffect(() => {
    if (handsFreeMode && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (_) {}
    } else if (!handsFreeMode && recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [handsFreeMode]);

  /**
   * Handle a voice command by routing and executing it
   */
  const handleVoiceCommand = useCallback(async (command: string) => {
    if (!command.trim() || isExecuting) return;

    setIsExecuting(true);
    console.log('[useVoiceCommands] Processing command:', command);

    try {
      // Route the command through classification
      const intent = await voiceCommandRouter.route(command, {
        current_route: location.pathname,
      });

      console.log('[useVoiceCommands] Intent classified:', intent);

      // If action requires confirmation, add to suggested actions
      if (intent.requires_confirmation) {
        const action = createSuggestedAction(intent, command);
        setSuggestedActions((prev) => [...prev, action]);

        // Speak the suggested response
        if (intent.suggested_response) {
          speak(intent.suggested_response);
        }
      } else {
        // Execute immediately for safe actions
        await executeAction(intent);
      }
    } catch (error: any) {
      console.error('[useVoiceCommands] Error processing command:', error);
      speak('Sorry, I had trouble processing that command.');
    } finally {
      setIsExecuting(false);
    }
  }, [location.pathname, isExecuting, speak]);

  /**
   * Execute an action intent
   */
  const executeAction = useCallback(async (intent: VoiceCommandIntent): Promise<ExecutionResult> => {
    if (!actionExecutorRef.current) {
      return {
        success: false,
        message: 'Action executor not initialized',
        speak: true
      };
    }

    console.log('[useVoiceCommands] Executing action:', intent.action);

    const result = await actionExecutorRef.current.execute(intent);

    // Update last executed action
    setLastExecutedAction(result.message);

    // Speak the result if requested
    if (result.speak && result.message) {
      speak(result.message);
    }

    return result;
  }, [speak]);

  /**
   * Create a suggested action from an intent
   */
  const createSuggestedAction = (intent: VoiceCommandIntent, command: string): SuggestedAction => {
    const iconMap: Record<string, { icon: string; color: string; bg: string }> = {
      navigation: { icon: 'arrow_forward', color: 'text-blue-500', bg: 'bg-blue-500/20' },
      create: { icon: 'add_circle', color: 'text-green-500', bg: 'bg-green-500/20' },
      query: { icon: 'search', color: 'text-purple-500', bg: 'bg-purple-500/20' },
      update: { icon: 'edit', color: 'text-amber-500', bg: 'bg-amber-500/20' },
      delete: { icon: 'delete', color: 'text-red-500', bg: 'bg-red-500/20' },
      conversation: { icon: 'chat', color: 'text-slate-500', bg: 'bg-slate-500/20' },
    };

    const iconInfo = iconMap[intent.type] || iconMap.conversation;

    return {
      id: `action-${Date.now()}`,
      type: intent.type,
      title: intent.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      subtitle: `Confidence: ${Math.round(intent.confidence * 100)}%`,
      description: intent.suggested_response || command,
      icon: iconInfo.icon,
      iconColor: iconInfo.color,
      iconBg: iconInfo.bg,
      status: 'pending',
      intent
    };
  };

  /**
   * Approve a suggested action
   */
  const approveAction = useCallback(async (actionId: string) => {
    const action = suggestedActions.find(a => a.id === actionId);
    if (!action) return;

    // Mark as approved
    setSuggestedActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, status: 'approved' as const } : a)
    );

    // Execute the action
    await executeAction(action.intent);
  }, [suggestedActions, executeAction]);

  /**
   * Reject a suggested action
   */
  const rejectAction = useCallback((actionId: string) => {
    setSuggestedActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, status: 'rejected' as const } : a)
    );
    speak('Action cancelled');
  }, [speak]);

  /**
   * Start listening for voice commands
   */
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('Voice recognition not supported');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
    }
  }, []);

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  /**
   * Toggle listening state
   */
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  /**
   * Toggle hands-free mode
   */
  const toggleHandsFree = useCallback(() => {
    setHandsFreeMode(prev => !prev);
  }, []);

  return {
    // State
    isListening,
    handsFreeMode,
    transcript,
    suggestedActions,
    lastExecutedAction,
    isExecuting,

    // Actions
    startListening,
    stopListening,
    toggleListening,
    toggleHandsFree,
    approveAction,
    rejectAction,
    executeAction,
  };
}
