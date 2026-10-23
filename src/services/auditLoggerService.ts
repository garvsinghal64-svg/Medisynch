export interface OverrideEvent {
  timestamp: string;
  clinicianId: string;
  patientId: string;
  overriddenAlerts: string[];
  justificationCode: string;
  clinicalNotes: string;
}

export interface AlertFatigueMetrics {
  totalAlertsFired: number;
  totalAlertsOverridden: number;
  overrideRate: number; // Percentage 0..100 (e.g., 70 for 70%)
  justificationFrequency: Record<string, number>;
  overriddenAlertFrequency: Record<string, number>;
  events: OverrideEvent[];
}

const STORAGE_KEY_EVENTS = 'clinical_audit_override_events_v1';
const STORAGE_KEY_FIRED = 'clinical_audit_alerts_fired_v1';

class AuditLoggerService {
  private events: OverrideEvent[] = [];
  private totalAlertsFired = 0;

  constructor() {
    this.loadFromStorage();
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private loadFromStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      const rawEvents = window.localStorage.getItem(STORAGE_KEY_EVENTS);
      if (rawEvents) {
        const parsed = JSON.parse(rawEvents);
        if (Array.isArray(parsed)) {
          this.events = parsed;
        }
      }
      const rawFired = window.localStorage.getItem(STORAGE_KEY_FIRED);
      if (rawFired) {
        const parsedFired = parseInt(rawFired, 10);
        if (!Number.isNaN(parsedFired) && parsedFired >= 0) {
          this.totalAlertsFired = parsedFired;
        }
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
  }

  private saveToStorage(): void {
    if (!this.isLocalStorageAvailable()) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(this.events));
      window.localStorage.setItem(STORAGE_KEY_FIRED, String(this.totalAlertsFired));
    } catch {
      // Ignore quota or storage errors
    }
  }

  /**
   * Records that an alert intercept fired in the clinical workflow.
   */
  public recordAlertFired(count = 1): void {
    if (count > 0) {
      this.totalAlertsFired += count;
      this.saveToStorage();
    }
  }

  /**
   * Logs a clinician alert override decision for hospital compliance and alert fatigue tracking.
   */
  public logAlertOverride(payload: OverrideEvent): OverrideEvent {
    const normalizedEvent: OverrideEvent = {
      timestamp: payload.timestamp || new Date().toISOString(),
      clinicianId: payload.clinicianId || 'Dr. Smith',
      patientId: payload.patientId || 'PT-UNKNOWN',
      overriddenAlerts: Array.isArray(payload.overriddenAlerts) ? [...payload.overriddenAlerts] : [],
      justificationCode: payload.justificationCode || 'Benefit Outweighs Risk',
      clinicalNotes: payload.clinicalNotes || '',
    };

    this.events.unshift(normalizedEvent);

    // Ensure totalAlertsFired is never less than total override events recorded
    if (this.totalAlertsFired < this.events.length) {
      this.totalAlertsFired = this.events.length;
    }

    this.saveToStorage();
    return normalizedEvent;
  }

  /**
   * Calculates hospital-wide alert fatigue metrics:
   * - Total alerts fired vs. Total alerts overridden (Override Rate %)
   * - Frequency map of the most commonly selected justificationCodes
   * - Frequency map of the most frequently overridden specific alerts
   */
  public getAlertFatigueMetrics(): AlertFatigueMetrics {
    const totalAlertsOverridden = this.events.length;
    const effectiveFired = Math.max(this.totalAlertsFired, totalAlertsOverridden);

    const overrideRate =
      effectiveFired > 0
        ? Number(((totalAlertsOverridden / effectiveFired) * 100).toFixed(1))
        : 0;

    const justificationFrequency: Record<string, number> = {};
    const overriddenAlertFrequency: Record<string, number> = {};

    for (const ev of this.events) {
      const code = ev.justificationCode || 'Unspecified';
      justificationFrequency[code] = (justificationFrequency[code] || 0) + 1;

      for (const alertCode of ev.overriddenAlerts) {
        // Normalize quantitative flags like METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4) -> METFORMIN_RENAL_THRESHOLD
        const normalizedKey = alertCode.includes('(')
          ? alertCode.slice(0, alertCode.indexOf('(')).trim()
          : alertCode.trim();
        if (normalizedKey) {
          overriddenAlertFrequency[normalizedKey] =
            (overriddenAlertFrequency[normalizedKey] || 0) + 1;
        }
      }
    }

    return {
      totalAlertsFired: effectiveFired,
      totalAlertsOverridden,
      overrideRate,
      justificationFrequency,
      overriddenAlertFrequency,
      events: [...this.events],
    };
  }

  /**
   * Resets all stored events and counters (used in unit tests or admin reset).
   */
  public resetLogs(): void {
    this.events = [];
    this.totalAlertsFired = 0;
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY_EVENTS);
        window.localStorage.removeItem(STORAGE_KEY_FIRED);
      } catch {
        // Ignore
      }
    }
  }
}

export const auditLoggerService = new AuditLoggerService();
