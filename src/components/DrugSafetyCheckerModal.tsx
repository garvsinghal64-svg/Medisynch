import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Info,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { DrugSafetyAlert } from '../types/clinical';
import { runDrugSafetyDatabaseCheck } from '../utils/drugSafetyEngine';

interface DrugSafetyCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMedications: string[];
  initialAllergies: string[];
  onApplyWarningToPlan: (warningText: string) => void;
  onToast?: (msg: string) => void;
}

export const DrugSafetyCheckerModal: React.FC<DrugSafetyCheckerModalProps> = ({
  isOpen,
  onClose,
  initialMedications,
  initialAllergies,
  onApplyWarningToPlan,
  onToast,
}) => {
  const [medications, setMedications] = useState<string[]>(initialMedications);
  const [allergies, setAllergies] = useState<string[]>(initialAllergies);
  const [newMed, setNewMed] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  if (!isOpen) return null;

  const detectedAlerts: DrugSafetyAlert[] = runDrugSafetyDatabaseCheck(medications, allergies);

  const handleAddMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.trim()) return;
    setMedications([...medications, newMed.trim()]);
    setNewMed('');
    if (onToast) onToast(`Added "${newMed}" to drug safety regimen prober.`);
  };

  const handleRemoveMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleAddAllergy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergy.trim()) return;
    setAllergies([...allergies, newAllergy.trim()]);
    setNewAllergy('');
    if (onToast) onToast(`Added "${newAllergy}" to allergy contraindication prober.`);
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleInsertWarning = (alert: DrugSafetyAlert) => {
    const textToInsert = `[PHARMACY ALERT - ${alert.severity.toUpperCase()}]: ${alert.title}\nRecommendation: ${alert.recommendation} (Source: ${alert.guidelineSource || 'Clinical Pharmacology Database'})`;
    onApplyWarningToPlan(textToInsert);
    if (onToast) onToast('Inserted drug safety recommendation into clinical Plan!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">
                  Deterministic Drug-Drug Interaction & Allergy Database
                </h3>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Phase 2 Pharmacology
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Rule-based clinical pharmacology engine grounded in FDA Black Box warnings and clinical practice guidelines.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Regimen Prober Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medications Column */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-700" />
                Active Medication Regimen ({medications.length})
              </label>

              <form onSubmit={handleAddMed} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Warfarin, Lisinopril, Ibuprofen..."
                  value={newMed}
                  onChange={(e) => setNewMed(e.target.value)}
                  className="flex-1 text-xs p-2 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {medications.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 font-medium"
                  >
                    {m}
                    <button
                      type="button"
                      onClick={() => handleRemoveMed(i)}
                      className="text-teal-600 hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Allergies Column */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-700" />
                Documented Patient Allergies ({allergies.length})
              </label>

              <form onSubmit={handleAddAllergy} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Penicillin, Sulfa, Aspirin..."
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="flex-1 text-xs p-2 border border-stone-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {allergies.length === 0 ? (
                  <span className="text-xs text-stone-400 italic">No allergies documented (NKDA)</span>
                ) : (
                  allergies.map((a, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 border border-rose-200 font-medium"
                    >
                      {a}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(i)}
                        className="text-rose-600 hover:text-rose-900 ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Results Header */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Real Database Analysis Results ({detectedAlerts.length} Flagged Interactions / Contraindications)
            </h4>
            <span className="text-[11px] text-stone-500">Cross-referenced against ACC/AHA, KDIGO, CHEST & AAAAI</span>
          </div>

          {/* Alerts List */}
          {detectedAlerts.length === 0 ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-700 mx-auto" />
              <div className="text-sm font-bold text-emerald-950">No High-Risk Pharmacological Conflicts Detected</div>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                No critical drug-drug interactions or allergy contraindications identified for the currently selected regimen.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {detectedAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-300'
                      : alert.severity === 'moderate'
                      ? 'bg-amber-50/70 border-amber-300'
                      : 'bg-stone-50 border-stone-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {alert.severity === 'critical' ? (
                          <AlertOctagon className="w-5 h-5 text-rose-700" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-700" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-stone-900">{alert.title}</h5>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              alert.severity === 'critical'
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 mt-1 leading-relaxed">{alert.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInsertWarning(alert)}
                      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-[11px] font-semibold rounded-lg shrink-0 flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      Insert into Plan
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {alert.clinicalMechanism && (
                    <div className="mt-2.5 text-xs bg-white/80 p-2.5 rounded-lg border border-stone-200/60 text-stone-600">
                      <strong className="text-stone-800">Mechanism:</strong> {alert.clinicalMechanism}
                    </div>
                  )}

                  <div className="mt-2 text-xs text-stone-800 font-medium bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/60">
                    <strong className="text-emerald-900">Clinical Recommendation:</strong> {alert.recommendation}
                  </div>

                  {alert.guidelineSource && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-stone-500 italic">
                      <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                      <span>Evidence Citation: {alert.guidelineSource}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>St. Jude Metropolitan Health System • Clinical Pharmacy Rule Matrix</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close Prober
          </button>
        </div>
      </div>
    </div>
  );
};
