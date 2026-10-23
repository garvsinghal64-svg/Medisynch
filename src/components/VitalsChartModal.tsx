import React, { useState } from 'react';
import {
  X,
  Activity,
  TrendingUp,
  User,
  PlusCircle,
  FolderOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PatientRecord, SavedEncounterRecord } from '../types/clinical';
import { VitalsTrendChart } from './VitalsTrendChart';
import {
  extractVitalsHistory,
  computeVitalsMetrics,
} from '../utils/vitalsParser';

interface VitalsChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  savedEncounters: SavedEncounterRecord[];
  onLoadEncounter: (record: SavedEncounterRecord) => void;
  onSaveNewEncounter: (newRecord: SavedEncounterRecord) => void;
  onSelectPatient?: (patient: PatientRecord) => void;
}

export const VitalsChartModal: React.FC<VitalsChartModalProps> = ({
  isOpen,
  onClose,
  patient,
  savedEncounters,
  onLoadEncounter,
  onSaveNewEncounter,
}) => {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // New encounter form state
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newBP, setNewBP] = useState('');
  const [newHR, setNewHR] = useState<string>('');
  const [newWeight, setNewWeight] = useState<string>('');
  const [newComplaint, setNewComplaint] = useState('');

  if (!isOpen) return null;

  // Filter encounters belonging to this patient
  const patientEncounters = savedEncounters.filter(
    (enc) =>
      (patient.mrn && enc.patient.mrn && enc.patient.mrn === patient.mrn) ||
      (patient.name &&
        enc.patient.name &&
        enc.patient.name.trim().toLowerCase() === patient.name.trim().toLowerCase())
  );

  // Extract chronological data points
  const history = extractVitalsHistory(patientEncounters, patient);
  const metrics = computeVitalsMetrics(history);

  // Submit quick encounter
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();

    const hrNum = parseInt(newHR, 10);
    const wtNum = parseFloat(newWeight);

    const newPatientRecord: PatientRecord = {
      ...patient,
      id: `pt-${Date.now().toString().slice(-4)}`,
      encounterDate: newDate,
      chiefComplaint: newComplaint || 'Outpatient clinical visit',
      vitals: {
        ...patient.vitals,
        bloodPressure: newBP || patient.vitals.bloodPressure || '120/80 mmHg',
        heartRate: !isNaN(hrNum) && hrNum > 0 ? hrNum : patient.vitals.heartRate,
        weightKg: !isNaN(wtNum) && wtNum > 0 ? wtNum : patient.vitals.weightKg,
      },
    };

    const newRecord: SavedEncounterRecord = {
      id: `enc-${Date.now()}`,
      savedAt: new Date().toISOString(),
      patient: newPatientRecord,
      note: {
        subjective: `Patient seen for ${newComplaint || 'routine follow-up'}.`,
        objective: `Vitals documented: BP ${newPatientRecord.vitals.bloodPressure}, HR ${newPatientRecord.vitals.heartRate} bpm, Weight ${newPatientRecord.vitals.weightKg} kg.`,
        assessment: 'Clinical progress review.',
        plan: 'Continue therapy as prescribed.',
        medications: [],
        allergies: [],
      },
      analysis: null,
    };

    onSaveNewEncounter(newRecord);

    // Reset form
    setNewBP('');
    setNewHR('');
    setNewWeight('');
    setNewComplaint('');
    setIsAddFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-stone-900">
                  Vitals Trajectory & History: {patient.name || 'Unnamed Patient'}
                </h3>
                {patient.mrn && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                    {patient.mrn}
                  </span>
                )}
                {history.length > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold font-mono">
                    {history.length} {history.length === 1 ? 'Visit' : 'Visits Recorded'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Visualizing longitudinal Blood Pressure, Heart Rate, and Weight metrics across clinical encounters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Notice if only 1 visit */}
          {history.length === 1 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <Activity className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Single Encounter Documented</p>
                <p className="text-amber-800 mt-0.5">
                  This patient currently has 1 saved encounter. You can click{' '}
                  <strong className="underline cursor-pointer" onClick={() => setIsAddFormOpen(true)}>
                    &ldquo;Record New Visit&rdquo;
                  </strong>{' '}
                  below to quickly add a past or follow-up encounter and see their vitals trajectory. (Or switch to Arthur Pendelton or Elena Rostova from the top case presets to view full multi-visit charts).
                </p>
              </div>
            </div>
          )}

          {/* Quick Add Encounter Drawer / Form */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg overflow-hidden transition-all">
            <button
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="w-full px-4 py-2.5 text-xs font-semibold text-stone-800 flex items-center justify-between hover:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-stone-600" />
                <span>+ Record Another Encounter / Historical Vitals Data Point</span>
              </div>
              {isAddFormOpen ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {isAddFormOpen && (
              <form onSubmit={handleQuickAdd} className="p-4 border-t border-stone-200 bg-white space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Encounter Date</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-400 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Blood Pressure (e.g. 142/86)</label>
                    <input
                      type="text"
                      placeholder="138/86 mmHg"
                      value={newBP}
                      onChange={(e) => setNewBP(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-400 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      placeholder="76"
                      value={newHR}
                      onChange={(e) => setNewHR(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-400 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="89.5"
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-400 bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-600 font-medium mb-1">Chief Complaint / Visit Note</label>
                  <input
                    type="text"
                    placeholder="e.g. Follow-up for blood pressure medication adjustment"
                    value={newComplaint}
                    onChange={(e) => setNewComplaint(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-400 bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddFormOpen(false)}
                    className="px-3 py-1 text-xs text-stone-600 hover:text-stone-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 px-4 py-1.5 rounded-md transition-colors shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Visit Point</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Trend Chart View */}
          <VitalsTrendChart
            history={history}
            metrics={metrics}
            onLoadEncounter={(rec) => {
              onLoadEncounter(rec);
              onClose();
            }}
            onOpenAddEncounter={() => setIsAddFormOpen(true)}
          />
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-stone-400">
              Patient MRN: {patient.mrn || 'Unassigned'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-100 font-medium transition-colors"
          >
            Close Chart View
          </button>
        </div>
      </div>
    </div>
  );
};
