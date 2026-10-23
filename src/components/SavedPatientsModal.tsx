import React, { useState } from 'react';
import { X, Search, FolderOpen, Trash2, ArrowRight, UserCheck, Calendar, Activity, Sparkles, PlusCircle, TrendingUp } from 'lucide-react';
import { SavedEncounterRecord, PatientRecord } from '../types/clinical';

interface SavedPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEncounters: SavedEncounterRecord[];
  onLoadEncounter: (record: SavedEncounterRecord) => void;
  onDeleteEncounter: (id: string) => void;
  onNewEncounter: () => void;
  onOpenVitalsForPatient?: (patient: PatientRecord) => void;
}

export const SavedPatientsModal: React.FC<SavedPatientsModalProps> = ({
  isOpen,
  onClose,
  savedEncounters,
  onLoadEncounter,
  onDeleteEncounter,
  onNewEncounter,
  onOpenVitalsForPatient,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = savedEncounters.filter((item) => {
    const q = searchTerm.toLowerCase();
    return (
      item.patient.name.toLowerCase().includes(q) ||
      item.patient.mrn.toLowerCase().includes(q) ||
      item.patient.chiefComplaint.toLowerCase().includes(q)
    );
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-800">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Saved Patient Encounters</h3>
              <p className="text-xs text-stone-500">
                Browse, search, and reload previously saved patient charts and clinical AI analyses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="bg-stone-100/60 border-b border-stone-200 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by patient name, MRN, or complaint..."
              className="w-full text-xs pl-9 pr-3 py-1.5 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-400 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onNewEncounter();
                onClose();
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-1.5 rounded-md transition-colors shadow-2xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-stone-500" />
              <span>New Patient Feed</span>
            </button>
            <span className="text-xs font-mono text-stone-500 tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {/* Patient Records List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500 space-y-2">
              <FolderOpen className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="font-semibold text-stone-700">No patient records found</p>
              <p className="text-stone-400">
                {searchTerm ? 'Try a different search query.' : 'Save patient encounters from the main workspace to access them here.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-stone-200 hover:border-stone-400 rounded-lg p-4 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-stone-900 group-hover:text-stone-950">
                      {item.patient.name}
                    </span>
                    <span className="text-stone-400 font-mono text-xs">·</span>
                    <span className="text-xs text-stone-600 font-medium">
                      {item.patient.age}yo {item.patient.gender}
                    </span>
                    <span className="text-stone-400 font-mono text-xs">·</span>
                    <span className="text-xs font-mono text-stone-500 tabular-nums">
                      {item.patient.mrn}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600 line-clamp-1">
                    <span className="text-stone-400 font-medium">CC:</span> {item.patient.chiefComplaint}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      <span>Visit: {item.patient.encounterDate}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3 text-stone-400" />
                      <span>BP {item.patient.vitals.bloodPressure}</span>
                    </span>
                    {item.savedAt && (
                      <>
                        <span>·</span>
                        <span className="text-stone-400">Saved: {formatDate(item.savedAt)}</span>
                      </>
                    )}
                    {item.analysis && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-amber-800 font-sans font-medium">
                          <Sparkles className="w-3 h-3 text-amber-700" />
                          <span>AI Analysis Stored</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {onOpenVitalsForPatient && (
                    <button
                      onClick={() => {
                        onOpenVitalsForPatient(item.patient);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-md transition-colors"
                      title="View vitals trajectory and trend chart for this patient"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      <span>Vitals Trend</span>
                    </button>
                  )}

                  <button
                    onClick={() => onDeleteEncounter(item.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    title="Delete saved patient record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      onLoadEncounter(item);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <span>Load Record</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-between text-xs text-stone-500">
          <span>Patient data is stored locally in your browser session.</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-white border border-stone-300 rounded text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
