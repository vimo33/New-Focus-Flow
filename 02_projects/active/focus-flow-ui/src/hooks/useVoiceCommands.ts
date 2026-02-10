import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { voiceCommandRouter } from '../services/voice-command-router';
import { ActionExecutor, type ExecutionResult } from '../services/action-executor';
import type { VoiceCommandIntent } from '../services/api';
import { useTTS } from './useTTS';
import { useSTT } from './useSTT';

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

  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [lastExecutedAction, setLastExecutedAction] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const actionExecutorRef = useRef<ActionExecutor | null>(null);
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const isExecutingRef = useRef(isExecuting);
  isExecutingRef.current = isExecuting;

  const speakRef = useRef(speak);
  speakRef.current = speak;

  // Stable command handler that doesn't depend on changing state
  const handleVoiceCommand = useCallback(async (command: string) => {
    if (!command.trim() || isExecutingRef.current) return;

    isExecutingRef.current = true;
    setIsExecuting(true);
    console.log('[useVoiceCommands] Processing command:', command);

    try {
      const intent = await voiceCommandRouter.route(command, {
        current_route: locationRef.current,
      });

      console.log('[useVoiceCommands] Intent classified:', intent);

      if (intent.requires_confirmation) {
        const action = createSuggestedAction(intent, command);
        setSuggestedActions((prev) => [...prev, action]);
        if (intent.suggested_response) {
          speakRef.current(intent.suggested_response);
        }
      } else {
        if (!actionExecutorRef.current) return;
        const result = await actionExecutorRef.current.execute(intent);
        setLastExecutedAction(result.message);
        if (result.speak && result.message) {
          speakRef.current(result.message);
        }
      }
    } catch (error: any) {
      console.error('[useVoiceCommands] Error processing command:', error);
      speakRef.current('Sorry, I had trouble processing that command.');
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, []);

  const { isListening, isTranscribing, transcript, provider: sttProvider, startListening, stopListening } = useSTT({
    continuous: handsFreeMode,
    interimResults: true,
    onResult: handleVoiceCommand,
  });

  // Initialize action executor
  useEffect(() => {
    actionExecutorRef.current = new ActionExecutor(navigate);
  }, [navigate]);

  // Handle hands-free mode toggle
  useEffect(() => {
    if (handsFreeMode && !isListening) {
      startListening();
    } else if (!handsFreeMode && isListening) {
      stopListening();
    }
  }, [handsFreeMode]);

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
    setLastExecutedAction(result.message);

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

    setSuggestedActions(prev =>
      prev.map(a => a.id === actionId ? { ...a, status: 'approved' as const } : a)
    );

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
    isTranscribing,
    handsFreeMode,
    transcript,
    suggestedActions,
    lastExecutedAction,
    isExecuting,
    sttProvider,

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
