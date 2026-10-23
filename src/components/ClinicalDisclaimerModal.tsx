import React from 'react';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';

interface ClinicalDisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalDisclaimerModal: React.FC<ClinicalDisclaimerModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Clinical Safety & Regulatory Notice</h3>
              <p className="text-xs text-stone-500">CuraDoc AI Clinical Decision Support Framework</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 text-xs text-stone-700 space-y-4 leading-relaxed">
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-amber-950 font-medium">
            CuraDoc AI is an assistive clinical documentation and educational decision-support tool. It is not an FDA-cleared diagnostic device and does not establish a physician-patient relationship.
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">Core Operating Principles:</h4>
            
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Independent Clinical Judgment:</strong> All differential diagnoses, ICD-10 suggestions, drug interactions, and clinical management recommendations must be evaluated and verified by a licensed healthcare professional prior to clinical implementation.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Medication & Dosage Verification:</strong> While pharmacology safety alerts check for common adverse reactions and contraindications, providers must confirm current FDA drug labeling, black-box warnings, and patient-specific renal/hepatic parameters.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Privacy & Protected Health Information (PHI):</strong> In accordance with healthcare standards, do not submit identifiable patient data (such as social security numbers, real dates of birth, or full home addresses). All pre-loaded scenarios are synthetic educational models.
              </div>
            </div>
          </div>

          <p className="text-stone-500 text-[11px] border-t border-stone-200 pt-3">
            By utilizing CuraDoc AI, you acknowledge that you remain solely responsible for the diagnosis, care, and documentation provided to actual patients.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            I Acknowledge & Understand
          </button>
        </div>

      </div>
    </div>
  );
};
