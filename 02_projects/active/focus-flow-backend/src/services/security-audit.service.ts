import * as fs from 'fs';
import * as path from 'path';

export interface SecurityEvent {
  timestamp: string;
  type: 'ai_request' | 'prompt_injection' | 'auth_failure' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  userContext?: string;
}

export class SecurityAuditService {
  private static auditLogPath = '/srv/focus-flow/07_system/logs/security-audit.log';
  private static criticalLogPath = '/srv/focus-flow/07_system/logs/critical-security-events.log';

  /**
   * Ensure log directory exists
   */
  private static ensureLogDirectory(): void {
    const logDir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Log a security event
   */
  static log(event: SecurityEvent): void {
    this.ensureLogDirectory();

    const logEntry = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // Write to audit log
    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      fs.appendFileSync(this.auditLogPath, logLine, { mode: 0o600 });
    } catch (error) {
      console.error('[SecurityAudit] Failed to write audit log:', error);
    }

    // Also log to console for immediate visibility
    const severityEmoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    };

    console.log(`${severityEmoji[event.severity]} [SECURITY] ${event.type}:`, event.details);

    // Alert on critical events
    if (event.severity === 'critical') {
      this.alertCriticalEvent(event);
    }
  }

  /**
   * Log AI request for audit trail
   */
  static logAIRequest(params: {
    model: string;
    promptLength: number;
    userInput: string;
    wasSanitized: boolean;
    wasSuspicious: boolean;
    suspiciousReasons?: string[];
  }): void {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'ai_request',
      severity: params.wasSuspicious ? 'medium' : 'low',
      details: {
        model: params.model,
        promptLength: params.promptLength,
        userInputPreview: params.userInput.substring(0, 100),
        wasSanitized: params.wasSanitized,
        wasSuspicious: params.wasSuspicious,
        suspiciousReasons: params.suspiciousReasons,
      },
    });
  }

  /**
   * Alert on critical security events
   */
  private static alertCriticalEvent(event: SecurityEvent): void {
    this.ensureLogDirectory();

    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    console.error('🔴🔴🔴 CRITICAL SECURITY EVENT 🔴🔴🔴');
    console.error(JSON.stringify(event, null, 2));

    // Write to critical events log
    try {
      fs.appendFileSync(
        this.criticalLogPath,
        `\n\n${'='.repeat(80)}\nCRITICAL EVENT: ${new Date().toISOString()}\n${'='.repeat(80)}\n${JSON.stringify(event, null, 2)}\n`,
        { mode: 0o600 }
      );
    } catch (error) {
      console.error('[SecurityAudit] Failed to write critical event log:', error);
    }
  }

  /**
   * Get recent security events
   */
  static getRecentEvents(count: number = 100): SecurityEvent[] {
    if (!fs.existsSync(this.auditLogPath)) {
      return [];
    }

    try {
      const logs = fs.readFileSync(this.auditLogPath, 'utf8');
      const lines = logs.trim().split('\n');
      const recentLines = lines.slice(-count);

      return recentLines
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((event): event is SecurityEvent => event !== null);
    } catch (error) {
      console.error('[SecurityAudit] Failed to read audit log:', error);
      return [];
    }
  }

  /**
   * Analyze security events for patterns
   */
  static analyzeThreats(): {
    totalEvents: number;
    suspiciousRequests: number;
    criticalEvents: number;
    recentThreats: SecurityEvent[];
  } {
    const events = this.getRecentEvents(1000);

    return {
      totalEvents: events.length,
      suspiciousRequests: events.filter((e) => e.severity === 'medium' || e.severity === 'high').length,
      criticalEvents: events.filter((e) => e.severity === 'critical').length,
      recentThreats: events.filter((e) => e.severity === 'high' || e.severity === 'critical').slice(-10),
    };
  }
}
