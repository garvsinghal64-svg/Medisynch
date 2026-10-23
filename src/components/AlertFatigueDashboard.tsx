import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BarChart3,
  FileSignature,
  X,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  auditLoggerService,
  AlertFatigueMetrics,
} from '../services/auditLoggerService';

export interface AlertFatigueDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertFatigueDashboard: React.FC<AlertFatigueDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<AlertFatigueMetrics>(() =>
    auditLoggerService.getAlertFatigueMetrics()
  );

  useEffect(() => {
    if (isOpen) {
      setMetrics(auditLoggerService.getAlertFatigueMetrics());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRefresh = () => {
    setMetrics(auditLoggerService.getAlertFatigueMetrics());
  };

  const handleSeedDemoEvents = () => {
    auditLoggerService.resetLogs();
    auditLoggerService.recordAlertFired(10);

    const demoOverrides = [
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-482910',
        overriddenAlerts: [
          'METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)',
          'CONTRAINDICATION [T2D_CKD_METFORMIN]: Metformin is contraindicated in severe renal impairment (eGFR < 30 mL/min).',
        ],
        justificationCode: 'Dose Adjusted / Renal Protocol',
        clinicalNotes: 'Nephrology consulted; holding morning dose pending repeat BMP.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-391044',
        overriddenAlerts: ['METFORMIN_RENAL_THRESHOLD(eGFR=28,Cr=2.1)'],
        justificationCode: 'Benefit Outweighs Risk',
        clinicalNotes: 'Chronic stable eGFR 28; monitoring serum lactate.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-774120',
        overriddenAlerts: ['PEDS_AMOXICILLIN_OVERDOSE(125mg/kg/day)'],
        justificationCode: 'Dose Adjusted / Renal Protocol',
        clinicalNotes: 'Refractory AOM high-dose regimen verified with pediatric pharmacist.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-112948',
        overriddenAlerts: ['HYPERKALEMIA_CRITICAL(K=5.6)'],
        justificationCode: 'Patient Monitored',
        clinicalNotes: 'Continuous telemetry and repeat K+ ordered in 2 hours.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-902311',
        overriddenAlerts: ['METFORMIN_RENAL_THRESHOLD(eGFR=25,Cr=2.3)'],
        justificationCode: 'Benefit Outweighs Risk',
        clinicalNotes: 'Patient refused insulin transition; close outpatient follow-up.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-665109',
        overriddenAlerts: ['QT_PROLONGATION_RISK'],
        justificationCode: 'Patient Monitored',
        clinicalNotes: 'Baseline QTc 445ms on telemetry.',
      },
      {
        clinicianId: 'Dr. Smith',
        patientId: 'MRN-558201',
        overriddenAlerts: ['METFORMIN_RENAL_THRESHOLD(eGFR=26,Cr=2.2)'],
        justificationCode: 'Benefit Outweighs Risk',
        clinicalNotes: 'Transient dehydration; IV fluids running.',
      },
    ];

    for (const item of demoOverrides) {
      auditLoggerService.logAlertOverride({
        timestamp: new Date().toISOString(),
        ...item,
      });
    }

    setMetrics(auditLoggerService.getAlertFatigueMetrics());
  };

  const handleClearLogs = () => {
    auditLoggerService.resetLogs();
    setMetrics(auditLoggerService.getAlertFatigueMetrics());
  };

  const sortedAlerts = Object.entries(metrics.overriddenAlertFrequency).sort(
    (a, b) => b[1] - a[1]
  );

  const sortedJustifications = Object.entries(
    metrics.justificationFrequency
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-fatigue-dashboard-title"
    >
      <div className="bg-white border border-stone-200 rounded-xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-stone-900 text-white border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-400/30">
              <BarChart3 className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2
                id="alert-fatigue-dashboard-title"
                className="text-base font-bold tracking-tight text-white"
              >
                Hospital Compliance &amp; CDS Alert Fatigue Monitor
              </h2>
              <p className="text-xs text-stone-400">
                Real-time tracking of Clinical Safety Intercept overrides, justification codes, and high-friction rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSeedDemoEvents}
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-700 hover:bg-amber-600 text-white transition-colors cursor-pointer"
              title="Simulate 10 Fired Alerts & 7 Clinician Overrides (70% Override Rate)"
            >
              Simulate 70% Audit Cohort
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded-md text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="Refresh Metrics"
              aria-label="Refresh metrics"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="p-1.5 rounded-md text-stone-300 hover:text-red-300 hover:bg-stone-800 transition-colors cursor-pointer"
              title="Reset Audit Logs"
              aria-label="Reset audit logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close Alert Fatigue Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-stone-50/60">
          {/* Top KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Global Override Rate */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                  Global Override Rate
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-extrabold tracking-tight ${
                      metrics.overrideRate >= 60
                        ? 'text-red-600'
                        : metrics.overrideRate >= 30
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {metrics.overrideRate}%
                  </span>
                  <span className="text-xs text-stone-500 font-medium">
                    ({metrics.totalAlertsOverridden} / {metrics.totalAlertsFired} alerts)
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] text-stone-500">
                  {metrics.overrideRate >= 60
                    ? 'High alert fatigue threshold (>60%)'
                    : 'Within hospital CDS target (<60%)'}
                </div>
              </div>
              <div
                className={`p-3 rounded-xl ${
                  metrics.overrideRate >= 60
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {metrics.overrideRate >= 60 ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Total Alerts Fired */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Total CDS Alerts Fired
              </div>
              <div className="mt-1 text-3xl font-extrabold text-stone-900">
                {metrics.totalAlertsFired}
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                Cumulative safety intercepts evaluated
              </div>
            </div>

            {/* Total Overridden & Signed */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Total Alerts Overridden
              </div>
              <div className="mt-1 text-3xl font-extrabold text-amber-800">
                {metrics.totalAlertsOverridden}
              </div>
              <div className="mt-1.5 text-[11px] text-stone-500">
                Signed with attending justification code
              </div>
            </div>
          </div>

          {/* Two-Column Breakdown: Most Overridden Alerts & Justification Codes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Frequently Overridden Alerts */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Most Frequently Overridden Alerts
                  </h3>
                </div>
                <span className="text-[11px] text-stone-400 font-medium">
                  Rule Frequency
                </span>
              </div>

              {sortedAlerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  No overridden alerts recorded yet. Click &ldquo;Override &amp; Sign&rdquo; on an active alert banner or load the simulated cohort above.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-[11px] font-bold uppercase text-stone-500">
                        <th className="py-2 pr-3">Alert / Quantitative Rule</th>
                        <th className="py-2 text-right">Override Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {sortedAlerts.map(([alertName, count]) => (
                        <tr key={alertName} className="hover:bg-stone-50/80">
                          <td className="py-2.5 pr-3 font-mono text-[11px] text-stone-900 break-all">
                            {alertName}{' '}
                            <span className="font-sans text-stone-500 font-normal">
                              overridden {count} {count === 1 ? 'time' : 'times'}
                            </span>
                          </td>
                          <td className="py-2.5 text-right whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                              {count}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top Justification Codes Used */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-amber-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                    Top Justification Codes Used
                  </h3>
                </div>
                <span className="text-[11px] text-stone-400 font-medium">
                  Clinician Attestation
                </span>
              </div>

              {sortedJustifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">
                  No justification codes recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedJustifications.map(([code, count]) => {
                    const pct =
                      metrics.totalAlertsOverridden > 0
                        ? Math.round((count / metrics.totalAlertsOverridden) * 100)
                        : 0;
                    return (
                      <div
                        key={code}
                        className="p-3 rounded-lg border border-stone-200/80 bg-stone-50/50"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-bold text-stone-900">{code}</span>
                          <span className="font-semibold text-amber-900">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-600 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Override Audit Log Stream */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Recent Override Attestation Log ({metrics.events.length})
                </h3>
              </div>
              <span className="text-[11px] text-stone-400">
                21 CFR Part 11 / CMS CDS Compliance Record
              </span>
            </div>

            {metrics.events.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                No override events logged in the current session.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {metrics.events.map((ev, index) => (
                  <div
                    key={`${ev.timestamp}-${index}`}
                    className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-stone-900">
                          {ev.clinicianId}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="font-mono text-[11px] text-stone-600">
                          Patient: {ev.patientId}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px]">
                          {ev.justificationCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600 font-mono">
                        Bypassed: {ev.overriddenAlerts.join(' | ')}
                      </div>
                      {ev.clinicalNotes && (
                        <div className="text-[11px] text-stone-500 italic">
                          &ldquo;{ev.clinicalNotes}&rdquo;
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            Hospital CDS Governance Committee · Target Override Rate &lt; 60%
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
