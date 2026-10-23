import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileSignature,
  X,
  Activity,
} from 'lucide-react';
import { ClinicalEvaluationResult } from '../utils/clinicalHeuristics';
import { auditLoggerService } from '../services/auditLoggerService';

export interface ClinicalAlertBannerProps {
  result: ClinicalEvaluationResult | null;
  scenarioLabel?: string;
  patientId?: string;
  clinicianId?: string;
  onOverrideAttested?: (reason: string, comment: string) => void;
}

const VITAL_DISPLAY_NAMES: Record<string, string> = {
  bp: 'Blood Pressure',
  hr: 'Heart Rate',
  rr: 'Respiratory Rate',
  temp: 'Temperature',
  spo2: 'SpO2',
  weightKg: 'Body Weight (kg)',
};

const OVERRIDE_REASONS = [
  {
    id: 'Benefit Outweighs Risk',
    label: 'Benefit Outweighs Risk',
    description: 'Clinical urgency requires therapy despite contraindication or interaction.',
  },
  {
    id: 'Patient Monitored',
    label: 'Patient Monitored',
    description: 'Serial telemetry, laboratory panels (BMP/INR), and inpatient monitoring ordered.',
  },
  {
    id: 'Dose Adjusted / Renal Protocol',
    label: 'Dose Adjusted / Renal Protocol',
    description: 'Renal or weight-adjusted dosing verified with clinical pharmacy.',
  },
  {
    id: 'Tolerated Previously / Allergy Clarified',
    label: 'Tolerated Previously / Allergy Clarified',
    description: 'Prior tolerance documented in EHR; reaction was non-IgE intolerance.',
  },
] as const;

/**
 * Extracts quantitative key-value or numeric tokens from quantitativeFlags
 * e.g. "METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)" -> ["eGFR=24", "Cr=2.4"]
 */
export function extractQuantitativeBadges(quantitativeFlags: string[]): string[] {
  const badges: string[] = [];

  for (const flag of quantitativeFlags) {
    const parenMatch = flag.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      const parts = parenMatch[1]
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p && !p.endsWith('=N/A'));
      badges.push(...parts);
    } else {
      const numMatch = flag.match(/(?:[A-Z0-9+_]+)?[<>=\d.]+/i);
      if (numMatch) {
        badges.push(flag.replace(/_/g, ' '));
      }
    }
  }

  return Array.from(new Set(badges));
}

export const ClinicalAlertBanner: React.FC<ClinicalAlertBannerProps> = ({
  result,
  scenarioLabel,
  patientId,
  clinicianId,
  onOverrideAttested,
}) => {
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(OVERRIDE_REASONS[0].id);
  const [overrideComment, setOverrideComment] = useState('');
  const [overrideRecord, setOverrideRecord] = useState<{
    reason: string;
    comment: string;
    timestamp: string;
  } | null>(null);

  // Reset override state and record fired alert when the evaluated result changes
  React.useEffect(() => {
    setOverrideRecord(null);
    if (
      result &&
      (result.drugAlerts.length > 0 ||
        result.quantitativeFlags.length > 0 ||
        result.dosingAlerts.length > 0 ||
        result.differentials.length > 0)
    ) {
      auditLoggerService.recordAlertFired(1);
    }
  }, [result]);

  if (!result) return null;

  const criticalQuantFlags = result.quantitativeFlags.filter(
    (f) => f.toUpperCase().includes('CRITICAL') || f.toUpperCase().includes('THRESHOLD')
  );
  const quantBadges = extractQuantitativeBadges(result.quantitativeFlags);

  const hasCritical = result.drugAlerts.length > 0 || criticalQuantFlags.length > 0;
  const hasWarning = result.differentials.length > 0 || result.dosingAlerts.length > 0;
  const hasMissingVitals = result.missingVitals.length > 0;

  if (!hasCritical && !hasWarning && !hasMissingVitals) {
    return null;
  }

  const formattedMissingVitals = result.missingVitals
    .map((v) => VITAL_DISPLAY_NAMES[v] || v.toUpperCase())
    .join(', ');

  const handleConfirmOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAlerts = [
      ...result.quantitativeFlags,
      ...result.drugAlerts,
      ...result.dosingAlerts,
      ...(result.quantitativeFlags.length === 0 &&
      result.drugAlerts.length === 0 &&
      result.dosingAlerts.length === 0
        ? result.matchedArchetypes
        : []),
    ];

    auditLoggerService.logAlertOverride({
      timestamp: new Date().toISOString(),
      clinicianId: clinicianId || 'Dr. Smith',
      patientId: patientId || 'PT-ACTIVE',
      overriddenAlerts: activeAlerts.length > 0 ? activeAlerts : ['CLINICAL_SAFETY_INTERCEPT'],
      justificationCode: selectedReason,
      clinicalNotes: overrideComment.trim(),
    });

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOverrideRecord({
      reason: selectedReason,
      comment: overrideComment.trim(),
      timestamp,
    });
    setIsOverrideModalOpen(false);
    if (onOverrideAttested) {
      onOverrideAttested(selectedReason, overrideComment.trim());
    }
  };

  return (
    <>
      <section
        aria-label="Clinical Safety Intercept Banner"
        className="max-w-[1520px] w-full mx-auto border-x border-b border-stone-200/90 bg-white px-4 py-3 shadow-xs"
      >
        {/* Top Bar: Intercept Status & Override Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
              Clinical Decision Support Intercept
            </span>
            {scenarioLabel && (
              <>
                <span className="text-stone-300" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-stone-600">
                  Active Payload: <strong className="text-stone-900">{scenarioLabel}</strong>
                </span>
              </>
            )}
            {result.matchedArchetypes.length > 0 && (
              <>
                <span className="text-stone-300" aria-hidden="true">·</span>
                <span className="text-xs font-mono text-stone-500">
                  {result.matchedArchetypes.join(', ')}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {overrideRecord ? (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Overridden &amp; Attested: <strong>{overrideRecord.reason}</strong> ({overrideRecord.timestamp})
                </span>
                <button
                  type="button"
                  onClick={() => setOverrideRecord(null)}
                  className="ml-1 text-emerald-700 underline hover:text-emerald-900 font-medium"
                >
                  Revoke
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 transition-colors cursor-pointer"
              >
                <FileSignature className="w-3.5 h-3.5" />
                <span>Override &amp; Sign</span>
              </button>
            )}
          </div>
        </div>

        {/* Stratified Alert Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* 1. CRITICAL TIER (Red / Urgent): Drug Alerts & Critical/Threshold Quantitative Flags */}
          {hasCritical && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50/90 p-3 text-red-950 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-red-800">
                      Critical Contraindication / Safety Alert
                    </span>
                    {/* Quantitative Pill Highlight Badge */}
                    {quantBadges.map((badge) => (
                      <span
                        key={badge}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-2xs"
                        title="Quantitative Lab/Dosing Trigger"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  <ul className="space-y-1 text-xs leading-relaxed text-red-900 font-medium">
                    {result.drugAlerts.map((alert, idx) => (
                      <li key={idx} className="wrap-break-word">
                        {alert}
                      </li>
                    ))}
                    {criticalQuantFlags.map((qf, idx) => (
                      <li key={`qf-${idx}`} className="font-mono text-[11px] text-red-800">
                        Trigger Flag: {qf}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 2. WARNING TIER (Orange / Amber): Differentials & Pediatric/Weight Dosing Alerts */}
          {hasWarning && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/90 p-3 text-amber-950 flex flex-col justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Clinical Differential &amp; Dosing Warning
                    </span>
                    {!hasCritical &&
                      quantBadges.map((badge) => (
                        <span
                          key={badge}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600 text-white"
                        >
                          {badge}
                        </span>
                      ))}
                  </div>

                  <ul className="space-y-1 text-xs leading-relaxed text-amber-900">
                    {result.differentials.map((diff, idx) => (
                      <li key={`diff-${idx}`} className="font-semibold">
                        Matched Differential: {diff}
                      </li>
                    ))}
                    {result.dosingAlerts.map((doseAlert, idx) => (
                      <li key={`dose-${idx}`} className="font-medium text-amber-950 bg-amber-100/80 px-2 py-1 rounded border border-amber-200">
                        {doseAlert}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 3. INFO / ACTION NEEDED TIER (Blue / Yellow): Missing Vitals */}
          {hasMissingVitals && (
            <div className="rounded-lg border border-sky-300 bg-sky-50/90 p-3 text-sky-950 flex flex-col justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-900 mb-1">
                    Action Needed · Incomplete Triage Vitals
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-sky-900">
                    ⚠️ Missing required vitals: <strong>{formattedMissingVitals}</strong>
                  </p>
                  <p className="text-[11px] text-sky-700 mt-1">
                    Complete vital sign capture is required for hemodynamic risk stratification before final sign-off.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Override & Sign Clinical Attestation Modal */}
      {isOverrideModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="override-modal-title"
        >
          <div className="bg-white border border-stone-200 rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <h2 id="override-modal-title" className="text-base font-bold text-stone-900">
                    Override Clinical Safety Alert &amp; Sign
                  </h2>
                  <p className="text-xs text-stone-500">
                    Select a clinical justification to override active CDS warnings for the audit log.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-md"
                aria-label="Close override modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmOverride} className="mt-4 space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2">
                  Override Reason (Required)
                </legend>
                {OVERRIDE_REASONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReason === option.id
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="overrideReason"
                      value={option.id}
                      checked={selectedReason === option.id}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="mt-0.5 accent-stone-900"
                    />
                    <div className="text-xs">
                      <div className="font-semibold text-stone-900">{option.label}</div>
                      <div className="text-stone-500 mt-0.5">{option.description}</div>
                    </div>
                  </label>
                ))}
              </fieldset>

              <div>
                <label
                  htmlFor="override-clinical-comment"
                  className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5"
                >
                  Attending Clinical Rationale (Optional)
                </label>
                <textarea
                  id="override-clinical-comment"
                  rows={2}
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  placeholder="Document monitoring parameters or specialist consultation..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 rounded-md text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span>Confirm Override &amp; Sign</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
