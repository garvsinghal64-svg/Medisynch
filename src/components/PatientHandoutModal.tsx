import React, { useState } from 'react';
import {
  X,
  Printer,
  Globe,
  Languages,
  Check,
  AlertTriangle,
  Heart,
  Pill,
  Calendar,
  FileCheck
} from 'lucide-react';
import { PatientRecord, SoapNote, ClinicalAnalysisResult, SupportedLanguage } from '../types/clinical';
import { SUPPORTED_LANGUAGES, generateLocalizedPatientHandout } from '../utils/multilingualHandouts';

interface PatientHandoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  analysis: ClinicalAnalysisResult | null;
  onToast?: (msg: string) => void;
  onRecordAudit?: (action: 'PRINT_HANDOUT', details: string) => void;
}

export const PatientHandoutModal: React.FC<PatientHandoutModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  analysis,
  onToast,
  onRecordAudit,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');

  if (!isOpen) return null;

  const handout = generateLocalizedPatientHandout(selectedLanguage, patient, note, analysis);

  const handlePrint = () => {
    if (onRecordAudit) {
      onRecordAudit('PRINT_HANDOUT', `Printed patient discharge handout in ${selectedLanguage.toUpperCase()} for MRN: ${patient.mrn}`);
    }
    if (onToast) onToast('Preparing print view / PDF export...');
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs print:p-0 print:bg-white">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-100 text-teal-800 border border-teal-200">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">Multi-Language Patient Discharge Handout</h3>
              <p className="text-xs text-stone-500">
                Patient-friendly instructions, warning signs, and medication instructions ready for PDF export or printing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Selection Bar (Hidden in Print) */}
        <div className="p-3 border-b border-stone-200 bg-white flex items-center gap-2 overflow-x-auto print:hidden">
          <span className="text-xs font-semibold text-stone-500 flex items-center gap-1 pl-2 pr-1">
            <Globe className="w-3.5 h-3.5" />
            Language:
          </span>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setSelectedLanguage(lang.code);
                if (onToast) onToast(`Switched handout language to ${lang.name}.`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                selectedLanguage === lang.code
                  ? 'bg-teal-800 text-white shadow-2xs font-semibold'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          ))}
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 print:p-0 print:overflow-visible">
          {/* Hospital Header */}
          <div className="border-b-2 border-stone-800 pb-4 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">ST. JUDE METROPOLITAN HEALTH SYSTEM</h1>
              <p className="text-xs text-stone-500 uppercase tracking-widest mt-0.5">
                Department of Ambulatory & Acute Clinical Care
              </p>
            </div>
            <div className="text-right text-xs text-stone-500">
              <div>Date: <strong>{patient.encounterDate || new Date().toISOString().split('T')[0]}</strong></div>
              <div>Station: <strong>Outpatient Clinic 104</strong></div>
            </div>
          </div>

          {/* Patient Details Stripe */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-stone-400 block text-[11px] uppercase tracking-wider">Patient Name</span>
              <strong className="text-stone-900 font-semibold">{patient.name || 'Anonymous Patient'}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] uppercase tracking-wider">Medical Record #</span>
              <strong className="text-stone-900 font-mono font-semibold">{patient.mrn || 'MRN-782910'}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] uppercase tracking-wider">Age / Gender</span>
              <span className="text-stone-900 font-medium">{patient.age} yrs • {patient.gender}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px] uppercase tracking-wider">Attending Physician</span>
              <span className="text-stone-900 font-medium">{note.signedBy || 'Dr. Elena Rossi, MD'}</span>
            </div>
          </div>

          {/* Handout Title & Greeting */}
          <div>
            <h2 className="text-lg font-bold text-teal-950 tracking-tight">{handout.title}</h2>
            <p className="text-xs text-stone-600 mt-1 italic">{handout.patientGreeting}</p>
          </div>

          {/* Clinical Overview */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-teal-700" />
              {handout.overviewHeading}
            </h3>
            <p className="text-xs text-stone-700 leading-relaxed bg-teal-50/40 p-3.5 rounded-xl border border-teal-100">
              {handout.overviewText}
            </p>
          </div>

          {/* Key Daily Instructions */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-teal-700" />
              {handout.instructionsHeading}
            </h3>
            <ul className="space-y-2 text-xs text-stone-700 list-disc list-inside bg-stone-50 p-4 rounded-xl border border-stone-200">
              {handout.instructions.map((inst, i) => (
                <li key={i} className="leading-relaxed">{inst}</li>
              ))}
            </ul>
          </div>

          {/* Medications Schedule */}
          {handout.medications.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-700" />
                {handout.medicationsHeading}
              </h3>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[11px] text-stone-600 font-semibold uppercase">
                    <tr>
                      <th className="p-2.5">Medication</th>
                      <th className="p-2.5">Instructions</th>
                      <th className="p-2.5">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {handout.medications.map((med, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50">
                        <td className="p-2.5 font-bold text-stone-900">{med.name}</td>
                        <td className="p-2.5 text-stone-600">{med.instructions}</td>
                        <td className="p-2.5 text-stone-500 italic">{med.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Red Flag Symptoms */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              {handout.redFlagsHeading}
            </h3>
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 space-y-1.5">
              {handout.redFlags.map((flag, idx) => (
                <div key={idx} className="text-xs text-rose-950 flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{flag}</span>
                </div>
              ))}
              <div className="pt-2 text-xs font-bold text-rose-900 border-t border-rose-200/60 mt-2">
                {handout.emergencyNotice}
              </div>
            </div>
          </div>

          {/* Follow-Up Schedule & Physician Sign-Off */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-200">
            <div>
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Calendar className="w-4 h-4 text-teal-700" />
                {handout.followUpHeading}
              </h4>
              <p className="text-xs text-stone-700">{handout.followUpText}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end">
              <div className="text-xs font-bold text-stone-900">{handout.physicianSignOff}</div>
              <div className="text-[11px] text-stone-400 mt-0.5">St. Jude Metropolitan Health System • Medical Records Validated</div>
            </div>
          </div>
        </div>

        {/* Footer (Hidden in Print) */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500 print:hidden">
          <span>7 Supported International & Regional Languages</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
