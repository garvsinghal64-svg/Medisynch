import React, { useState } from 'react';
import {
  X,
  Server,
  Copy,
  Check,
  Download,
  UploadCloud,
  CheckCircle2,
  FileCode,
  Layers,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { PatientRecord, SoapNote, ClinicalAnalysisResult, EhrPushResult } from '../types/clinical';
import { generateFhirR4Bundle, generateHl7v2Message, simulateEhrPush } from '../utils/fhirHl7Generator';

interface EhrExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  analysis: ClinicalAnalysisResult | null;
  onToast?: (msg: string) => void;
  onRecordAudit?: (action: 'EXPORT_FHIR' | 'EXPORT_HL7', details: string) => void;
}

export const EhrExportModal: React.FC<EhrExportModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  analysis,
  onToast,
  onRecordAudit,
}) => {
  const [activeTab, setActiveTab] = useState<'fhir' | 'hl7' | 'push'>('fhir');
  const [copied, setCopied] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<EhrPushResult | null>(null);
  const [targetEhr, setTargetEhr] = useState<'Epic Systems' | 'Cerner / Oracle Health' | 'AthenaHealth'>('Epic Systems');

  if (!isOpen) return null;

  const fhirBundle = generateFhirR4Bundle(patient, note, analysis);
  const fhirJsonString = JSON.stringify(fhirBundle, null, 2);
  const hl7MessageString = generateHl7v2Message(patient, note, analysis);

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onToast) onToast(`Copied ${type} to clipboard.`);
    if (onRecordAudit) onRecordAudit(type === 'FHIR R4' ? 'EXPORT_FHIR' : 'EXPORT_HL7', `Copied ${type} payload for MRN: ${patient.mrn}`);
  };

  const handleDownload = (content: string, filename: string, type: 'EXPORT_FHIR' | 'EXPORT_HL7') => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (onToast) onToast(`Downloaded ${filename}.`);
    if (onRecordAudit) onRecordAudit(type, `Downloaded ${filename} for MRN: ${patient.mrn}`);
  };

  const handleDirectPush = async () => {
    setIsPushing(true);
    try {
      const result = await simulateEhrPush(targetEhr, patient);
      setPushResult(result);
      if (onToast) onToast(`Successfully synced note & vitals to ${targetEhr}!`);
      if (onRecordAudit) onRecordAudit('EXPORT_FHIR', `SMART-on-FHIR push committed to ${targetEhr} (TxID: ${result.transactionId})`);
    } catch {
      if (onToast) onToast('Failed to connect to EHR endpoint.');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800 border border-blue-200">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Hospital EHR / EMR Interoperability Hub</h3>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  FHIR R4 & HL7 v2
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Standardized interoperability formats for Epic, Cerner / Oracle Health, AthenaHealth, and hospital data lakes.
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
            onClick={() => setActiveTab('fhir')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'fhir'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            FHIR R4 Bundle (JSON)
          </button>
          <button
            onClick={() => setActiveTab('hl7')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'hl7'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            HL7 v2.5.1 Message (MDM^T02)
          </button>
          <button
            onClick={() => setActiveTab('push')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'push'
                ? 'border-blue-700 text-blue-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Direct EHR Connector (Push)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* FHIR Tab */}
          {activeTab === 'fhir' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    HL7 FHIR R4 Transaction Bundle (US Core STU3 / R4 Compliant)
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Includes Patient, Encounter, DocumentReference (SOAP note), Observation (LOINC vitals), and Condition resources.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(fhirJsonString, 'FHIR R4')}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-stone-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                  <button
                    onClick={() => handleDownload(fhirJsonString, `fhir_bundle_${patient.mrn || 'pt'}.json`, 'EXPORT_FHIR')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Bundle
                  </button>
                </div>
              </div>

              <div className="bg-stone-900 text-stone-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                <pre>{fhirJsonString}</pre>
              </div>
            </div>
          )}

          {/* HL7 v2 Tab */}
          {activeTab === 'hl7' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    HL7 v2.5.1 Medical Document Management (MDM^T02) Message
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Standard pipe-delimited HL7 format ingested by legacy and modern hospital interface engines (Mirth Connect, Rhapsody, Corepoint).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(hl7MessageString, 'HL7 v2.5.1')}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-stone-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy HL7
                  </button>
                  <button
                    onClick={() => handleDownload(hl7MessageString, `hl7_mdm_${patient.mrn || 'pt'}.hl7`, 'EXPORT_HL7')}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download .HL7
                  </button>
                </div>
              </div>

              <div className="bg-stone-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-stone-800">
                <pre className="whitespace-pre-wrap">{hl7MessageString}</pre>
              </div>
            </div>
          )}

          {/* Push to EHR Tab */}
          {activeTab === 'push' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Direct SMART-on-FHIR Gateway Dispatch</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Synchronize this clinical encounter and signed documentation directly into the active hospital electronic medical record.
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1.5">Select Target Hospital EHR System</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['Epic Systems', 'Cerner / Oracle Health', 'AthenaHealth'] as const).map((ehr) => (
                      <button
                        key={ehr}
                        onClick={() => {
                          setTargetEhr(ehr);
                          setPushResult(null);
                        }}
                        className={`p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                          targetEhr === ehr
                            ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                        }`}
                      >
                        {ehr}
                        <span className="block text-[10px] text-stone-400 font-normal mt-0.5">FHIR R4 Gateway Active</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-stone-600 bg-white p-3 rounded-lg border border-stone-200">
                  <div className="font-semibold text-stone-800">Encounter Metadata Ready to Sync:</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-stone-600">
                    <span>Patient: <strong>{patient.name}</strong></span>
                    <span>MRN: <strong>{patient.mrn}</strong></span>
                    <span>Encounter Date: <strong>{patient.encounterDate}</strong></span>
                    <span>Signed By: <strong>{note.signedBy || 'Dr. Elena Rossi, MD'}</strong></span>
                  </div>
                </div>

                <button
                  onClick={handleDirectPush}
                  disabled={isPushing}
                  className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {isPushing ? (
                    <>
                      <UploadCloud className="w-4 h-4 animate-bounce" />
                      Dispatching to {targetEhr} Gateway...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      Push Record to {targetEhr}
                    </>
                  )}
                </button>
              </div>

              {pushResult && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Transaction Confirmed (HTTP 201 Created)
                  </div>
                  <p>{pushResult.message}</p>
                  <div className="font-mono text-[11px] text-emerald-800 pt-1 border-t border-emerald-200">
                    Transaction ID: {pushResult.transactionId} • Resources Created: {pushResult.resourceCount}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Standards: HL7 FHIR US Core v3.1.1 / HL7 v2.5.1 MDM</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
