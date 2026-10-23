import React, { useState } from 'react';
import { X, Printer, Copy, Check, FileText } from 'lucide-react';
import { PatientRecord, SoapNote, ClinicalAnalysisResult } from '../types/clinical';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  analysis: ClinicalAnalysisResult | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  analysis,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedTxt, setCopiedTxt] = useState(false);

  if (!isOpen) return null;

  const generateMarkdown = () => {
    return `# CLINICAL CONSULTATION NOTE

**Patient Name:** ${patient.name}  
**Demographics:** ${patient.age}yo ${patient.gender} | **MRN:** ${patient.mrn}  
**Encounter Date:** ${patient.encounterDate}  
**Chief Complaint:** ${patient.chiefComplaint}  

---

### VITAL SIGNS
- **Blood Pressure:** ${patient.vitals.bloodPressure || 'Undocumented'}
- **Heart Rate:** ${patient.vitals.heartRate > 0 ? patient.vitals.heartRate + ' bpm' : 'Undocumented'}
- **Respiratory Rate:** ${patient.vitals.respiratoryRate > 0 ? patient.vitals.respiratoryRate + ' /min' : 'Undocumented'}
- **SpO2:** ${patient.vitals.spO2 > 0 ? patient.vitals.spO2 + '%' : 'Undocumented / Not measured'}
- **Temperature:** ${patient.vitals.temperature || 'Undocumented'}
- **Weight:** ${patient.vitals.weightKg} kg | **Height:** ${patient.vitals.heightCm} cm

---

### SUBJECTIVE
${note.subjective}

### OBJECTIVE
${note.objective}

### ASSESSMENT
${note.assessment}

### PLAN
${note.plan}

---

### ACTIVE MEDICATIONS
${note.medications.map((m) => `- ${m}`).join('\n')}

### DOCUMENTED ALLERGIES
${note.allergies.map((a) => `- ${a}`).join('\n')}

${
  note.attachments && note.attachments.length > 0
    ? `### ATTACHED DIAGNOSTIC MEDIA & DOCUMENTS
${note.attachments
  .map(
    (att) =>
      `- **${att.fileName}** [${att.section.toUpperCase()}]: ${
        att.analysis ? att.analysis.headline + ' — ' + att.analysis.summary : 'Attached file'
      }`
  )
  .join('\n')}`
    : ''
}

---

${
  analysis?.patientSummary
    ? `### PATIENT DISCHARGE SUMMARY (LAYPERSON TRANSLATION)
**Overview:** ${analysis.patientSummary.plainLanguageOverview}

**Key Home Instructions:**
${analysis.patientSummary.keyInstructions.map((k, i) => `${i + 1}. ${k}`).join('\n')}

**Red Flag Emergency Symptoms:**
${analysis.patientSummary.redFlagSymptoms.map((r) => `* ${r}`).join('\n')}

**Follow-up:** ${analysis.patientSummary.followUp}`
    : ''
}
`;
  };

  const handleCopyMd = () => {
    navigator.clipboard.writeText(generateMarkdown());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyTxt = () => {
    const txt = generateMarkdown().replace(/#/g, '').replace(/\*\*/g, '');
    navigator.clipboard.writeText(txt);
    setCopiedTxt(true);
    setTimeout(() => setCopiedTxt(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-700" />
            <h3 className="text-sm font-bold text-stone-900">Clinical Document Export & Print</h3>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-stone-100/70 border-b border-stone-200 px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-stone-600 font-medium">Export Formats:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMd}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copiedMd ? 'Copied Markdown' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={handleCopyTxt}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs"
            >
              {copiedTxt ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
              <span>{copiedTxt ? 'Copied Plain Text' : 'Copy Plain Text'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Note</span>
            </button>
          </div>
        </div>

        {/* Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-8 font-sans text-xs text-stone-800 space-y-6 leading-relaxed bg-white print:p-0">
          
          <div className="border-b border-stone-300 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-stone-900">CURADOC CLINICAL ENCOUNTER RECORD</h2>
              <span className="text-stone-500 font-mono text-[11px]">Encounter: {patient.encounterDate}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-stone-600">
              <div><strong className="text-stone-900">Patient:</strong> {patient.name}</div>
              <div><strong className="text-stone-900">Age / Sex:</strong> {patient.age}yo {patient.gender}</div>
              <div><strong className="text-stone-900">MRN:</strong> <span className="font-mono">{patient.mrn}</span></div>
              <div><strong className="text-stone-900">CC:</strong> {patient.chiefComplaint}</div>
            </div>
            <div className="mt-2 text-stone-600 font-mono text-[11px] bg-stone-50 p-2 rounded border border-stone-200">
              Vitals: BP {patient.vitals.bloodPressure || 'Undocumented'} | HR {patient.vitals.heartRate > 0 ? `${patient.vitals.heartRate} bpm` : 'Undocumented'} | RR {patient.vitals.respiratoryRate > 0 ? `${patient.vitals.respiratoryRate}/min` : 'Undocumented'} | SpO2 {patient.vitals.spO2 > 0 ? `${patient.vitals.spO2}%` : 'Undocumented'} | Temp {patient.vitals.temperature || 'Undocumented'}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-stone-900 mb-1">Subjective</h3>
              <p className="whitespace-pre-wrap text-stone-700 bg-stone-50/50 p-3 rounded border border-stone-100">{note.subjective}</p>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-stone-900 mb-1">Objective</h3>
              <p className="whitespace-pre-wrap text-stone-700 bg-stone-50/50 p-3 rounded border border-stone-100">{note.objective}</p>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-stone-900 mb-1">Assessment</h3>
              <p className="whitespace-pre-wrap text-stone-700 bg-stone-50/50 p-3 rounded border border-stone-100">{note.assessment}</p>
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-stone-900 mb-1">Plan</h3>
              <p className="whitespace-pre-wrap text-stone-700 bg-stone-50/50 p-3 rounded border border-stone-100">{note.plan}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <h4 className="font-bold text-stone-900 mb-1">Active Medications</h4>
                <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                  {note.medications.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-stone-900 mb-1">Documented Allergies</h4>
                <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                  {note.allergies.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            {note.attachments && note.attachments.length > 0 && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="font-bold text-stone-900 mb-1 text-xs uppercase tracking-wider">
                  Attached Diagnostic Media & Records ({note.attachments.length})
                </h4>
                <div className="space-y-1.5">
                  {note.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded border border-stone-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900">{att.fileName}</span>
                        <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                          {att.section}
                        </span>
                      </div>
                      {att.analysis && (
                        <p className="text-stone-600 text-[11px] mt-1 leading-relaxed">
                          <strong className="text-stone-800">{att.analysis.headline}:</strong>{' '}
                          {att.analysis.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis?.patientSummary && (
              <div className="border-t border-stone-300 pt-4 mt-4 space-y-2">
                <h3 className="font-bold uppercase tracking-wider text-stone-900">
                  Patient Discharge Instructions
                </h3>
                <p className="italic text-stone-700">{analysis.patientSummary.plainLanguageOverview}</p>
                <div className="space-y-1">
                  <strong>Key Instructions:</strong>
                  <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                    {analysis.patientSummary.keyInstructions.map((k, i) => (
                      <li key={i}>{k}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
