import { api, type VoiceCommandIntent, type VoiceCommandRequest } from './api';

/**
 * Fast-path keyword patterns for obvious commands
 */
const KEYWORD_PATTERNS: Record<string, { action: string; type: string; confidence: number }> = {
  // Navigation patterns
  'go to inbox': { action: 'navigate_inbox', type: 'navigation', confidence: 0.95 },
  'show inbox': { action: 'navigate_inbox', type: 'navigation', confidence: 0.95 },
  'open inbox': { action: 'navigate_inbox', type: 'navigation', confidence: 0.95 },
  'go to projects': { action: 'navigate_projects', type: 'navigation', confidence: 0.95 },
  'show projects': { action: 'navigate_projects', type: 'navigation', confidence: 0.95 },
  'open projects': { action: 'navigate_projects', type: 'navigation', confidence: 0.95 },
  'go to calendar': { action: 'navigate_calendar', type: 'navigation', confidence: 0.95 },
  'open calendar': { action: 'navigate_calendar', type: 'navigation', confidence: 0.95 },
  'go to tasks': { action: 'navigate_tasks', type: 'navigation', confidence: 0.95 },
  'show tasks': { action: 'navigate_tasks', type: 'navigation', confidence: 0.95 },
  'go to ideas': { action: 'navigate_ideas', type: 'navigation', confidence: 0.95 },
  'show ideas': { action: 'navigate_ideas', type: 'navigation', confidence: 0.95 },
  'go to voice': { action: 'navigate_voice', type: 'navigation', confidence: 0.95 },
  'open voice console': { action: 'navigate_voice', type: 'navigation', confidence: 0.95 },
  'go to wellbeing': { action: 'navigate_wellbeing', type: 'navigation', confidence: 0.95 },

  // Approval patterns
  'approve that': { action: 'approval_approve_latest', type: 'approval', confidence: 0.90 },
  'approve it': { action: 'approval_approve_latest', type: 'approval', confidence: 0.90 },
  'approve this': { action: 'approval_approve_latest', type: 'approval', confidence: 0.90 },
  'reject that': { action: 'approval_reject_latest', type: 'approval', confidence: 0.90 },
  'reject it': { action: 'approval_reject_latest', type: 'approval', confidence: 0.90 },
  'reject this': { action: 'approval_reject_latest', type: 'approval', confidence: 0.90 },
  'approve all tier 1': { action: 'approval_approve_tier1', type: 'approval', confidence: 0.90 },
  'auto approve tier one': { action: 'approval_approve_tier1', type: 'approval', confidence: 0.90 },
  'show approvals': { action: 'navigate_approvals', type: 'navigation', confidence: 0.95 },
  'show pending approvals': { action: 'navigate_approvals', type: 'navigation', confidence: 0.95 },
  'what needs approval': { action: 'navigate_approvals', type: 'navigation', confidence: 0.90 },
};

export class VoiceCommandRouter {
  /**
   * Check if command matches fast-path keyword patterns
   */
  private checkKeywordPatterns(command: string): VoiceCommandIntent | null {
    const normalized = command.toLowerCase().trim();

    for (const [pattern, result] of Object.entries(KEYWORD_PATTERNS)) {
      if (normalized === pattern || normalized.startsWith(pattern)) {
        const label = pattern.replace('go to ', '').replace('show ', '').replace('open ', '').replace('approve ', '').replace('reject ', '');
        return {
          type: result.type as VoiceCommandIntent['type'],
          confidence: result.confidence,
          action: result.action,
          parameters: {},
          requires_confirmation: result.type === 'approval' && result.action.includes('tier'),
          suggested_response: result.type === 'approval'
            ? `${result.action.includes('approve') ? 'Approving' : 'Rejecting'} ${label}`
            : `Opening ${label}`,
        };
      }
    }

    return null;
  }

  /**
   * Route a voice command through classification
   * Uses fast-path for obvious commands, AI classification for complex ones
   */
  async route(command: string, context?: { current_route?: string; recent_items?: string[] }): Promise<VoiceCommandIntent> {
    // Fast path: Check keyword patterns first
    const keywordMatch = this.checkKeywordPatterns(command);
    if (keywordMatch) {
      console.log('[VoiceRouter] Fast-path match:', keywordMatch.action);
      return keywordMatch;
    }

    // Smart path: Use AI classification for complex commands
    console.log('[VoiceRouter] Using AI classification for:', command);
    const request: VoiceCommandRequest = {
      command,
      context
    };

    const response = await api.classifyVoiceCommand(request);
    return response.intent;
  }

  /**
   * Check if voice command service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await api.getVoiceCommandStatus();
      return status.api_connected;
    } catch (error) {
      console.error('[VoiceRouter] Service unavailable:', error);
      return false;
    }
  }
}

// Export singleton instance
export const voiceCommandRouter = new VoiceCommandRouter();
