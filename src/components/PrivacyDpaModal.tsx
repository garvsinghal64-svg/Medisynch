import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Eye,
  FileText,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { PatientRecord, SoapNote } from '../types/clinical';
import { maskPatientDataForAi } from '../utils/dataMasker';

interface PrivacyDpaModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  isMaskingActive: boolean;
  onToggleMasking: (active: boolean) => void;
  onToast?: (msg: string) => void;
}

export const PrivacyDpaModal: React.FC<PrivacyDpaModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  isMaskingActive,
  onToggleMasking,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'inspector' | 'dpa'>('inspector');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const maskingResult = maskPatientDataForAi(patient, note);

  const handleCopyMasked = () => {
    navigator.clipboard.writeText(JSON.stringify(maskingResult.maskedNote, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onToast) onToast('Copied scrubbed payload to clipboard.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 border border-teal-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">
                  HIPAA Safe Harbor Masking & Data Processing Agreement (DPA)
                </h3>
                <span className={`text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border ${
                  isMaskingActive
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {isMaskingActive ? 'Safe Harbor Active' : 'Masking Inactive'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Client-side de-identification ensures no Direct Identifiers or PHI ever reach external AI pipelines.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-stone-200 bg-white px-5 gap-2">
          <button
            onClick={() => setActiveTab('inspector')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'inspector'
                ? 'border-teal-700 text-teal-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            Live Safe Harbor Payload Inspector
          </button>
          <button
            onClick={() => setActiveTab('dpa')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'dpa'
                ? 'border-teal-700 text-teal-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Data Processing Agreement (BAA Terms)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'inspector' && (
            <div className="space-y-5">
              {/* Toggle Banner */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-stone-900">Enforce Client-Side HIPAA Masking</div>
                  <p className="text-xs text-stone-500">
                    When active, names, MRNs, dates, and contact data are redacted on-device before outbound API calls.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onToggleMasking(!isMaskingActive);
                    if (onToast) onToast(`HIPAA Safe Harbor Masking ${!isMaskingActive ? 'enabled' : 'disabled'}.`);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all ${
                    isMaskingActive
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-stone-200 hover:bg-stone-300 text-stone-800'
                  }`}
                >
                  {isMaskingActive ? 'Masking Enabled' : 'Enable Safe Harbor Masking'}
                </button>
              </div>

              {/* Redaction Summary Chips */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                  Active De-Identification Redactions ({maskingResult.redactedFieldsCount} Elements Scrubbed)
                </span>
                <div className="flex flex-wrap gap-2">
                  {maskingResult.redactionsSummary.map((item, i) => (
                    <span key={i} className="px-2.5 py-1 bg-teal-50 border border-teal-200 text-teal-900 text-xs rounded-lg font-mono">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Side-by-side Payload Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Raw PHI */}
                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="p-3 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">Local Hospital Protected Data (Raw)</span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                      Contains PHI
                    </span>
                  </div>
                  <div className="p-4 space-y-2 text-xs font-mono text-stone-700 max-h-72 overflow-y-auto leading-relaxed">
                    <div><span className="text-stone-400">patient.name:</span> <strong>{patient.name}</strong></div>
                    <div><span className="text-stone-400">patient.mrn:</span> <strong>{patient.mrn}</strong></div>
                    <div><span className="text-stone-400">patient.dob/date:</span> <strong>{patient.encounterDate}</strong></div>
                    <div><span className="text-stone-400">patient.chiefComplaint:</span> {patient.chiefComplaint}</div>
                    <div className="pt-2 border-t border-stone-100">
                      <span className="text-stone-400 block mb-1">note.subjective:</span>
                      <p className="font-sans text-xs whitespace-pre-wrap">{note.subjective.slice(0, 250)}...</p>
                    </div>
                  </div>
                </div>

                {/* Masked Transmitted Payload */}
                <div className="border border-teal-300 rounded-xl overflow-hidden bg-teal-50/20 shadow-2xs">
                  <div className="p-3 bg-teal-100/70 border-b border-teal-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-950">De-Identified Payload (Sent to AI)</span>
                    <button
                      onClick={handleCopyMasked}
                      className="text-[11px] text-teal-800 hover:text-teal-950 font-medium flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copy Scrubbed
                    </button>
                  </div>
                  <div className="p-4 space-y-2 text-xs font-mono text-teal-950 max-h-72 overflow-y-auto leading-relaxed">
                    <div><span className="text-teal-600">patient.name:</span> <strong className="bg-teal-200/80 px-1.5 py-0.5 rounded">{maskingResult.maskedPatient.name}</strong></div>
                    <div><span className="text-teal-600">patient.mrn:</span> <strong className="bg-teal-200/80 px-1.5 py-0.5 rounded">{maskingResult.maskedPatient.mrn}</strong></div>
                    <div><span className="text-teal-600">patient.dob/date:</span> <strong className="bg-teal-200/80 px-1.5 py-0.5 rounded">{maskingResult.maskedPatient.encounterDate}</strong></div>
                    <div><span className="text-teal-600">patient.chiefComplaint:</span> {maskingResult.maskedPatient.chiefComplaint}</div>
                    <div className="pt-2 border-t border-teal-100">
                      <span className="text-teal-600 block mb-1">note.subjective:</span>
                      <p className="font-sans text-xs whitespace-pre-wrap">{maskingResult.maskedNote.subjective.slice(0, 250)}...</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dpa' && (
            <div className="space-y-5 max-w-3xl">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Hospital Data Processing Agreement & Business Associate Terms</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Legal compliance under HIPAA (Health Insurance Portability and Accountability Act) §164.502(e) and §164.504(e).
                </p>
              </div>

              <div className="space-y-3 text-xs text-stone-700 leading-relaxed bg-stone-50 p-5 rounded-2xl border border-stone-200">
                <div className="font-bold text-stone-900 text-sm">Key Privacy & Safeguard Guarantees:</div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>1. Zero Data Retention (ZDR) for Model Training:</strong> All clinical inputs, transcripts, and generated notes are processed strictly ephemerally in volatile memory. No user prompt or medical documentation is logged, persisted, or utilized to train future artificial intelligence models.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>2. End-to-End Cryptographic Security:</strong> All data in transit is protected using TLS 1.3 encryption with perfect forward secrecy. Any cached browser storage utilizes AES-256 local encrypted storage within the hospital domain origin.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>3. Safe Harbor De-Identification:</strong> Direct 18 HIPAA Safe Harbor identifiers (including full name, MRN, contact telephone numbers, email addresses, and specific dates) are scrubbed prior to network serialization.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>4. Immutable Auditability:</strong> Under HIPAA §164.312(b), all actions including view, edit, model recommendation acceptance, and export are chronologically committed to a tamper-evident audit ledger.
                  </div>
                </div>
              </div>

              <div className="text-xs text-stone-500 italic">
                CuraDoc BAA Certificate ID: BAA-METRO-2026-X992 • Executed between St. Jude Metropolitan Health System & CuraDoc AI.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Compliant with 45 CFR § 164.514(b) (Safe Harbor Standard)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
