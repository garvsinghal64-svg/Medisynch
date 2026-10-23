import React, { useState, useEffect } from 'react';
import { X, UserCheck, Activity, RotateCcw, TrendingUp } from 'lucide-react';
import { PatientRecord, Vitals } from '../types/clinical';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  onSave: (updatedPatient: PatientRecord) => void;
  onOpenVitalsChart?: () => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
  onOpenVitalsChart,
}) => {
  const [formData, setFormData] = useState<PatientRecord>(patient);

  // Synchronize internal form state whenever the patient prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(patient);
    }
  }, [isOpen, patient]);

  if (!isOpen) return null;

  const handleVitalChange = (field: keyof Vitals, val: string | number) => {
    setFormData((prev) => ({
      ...prev,
      vitals: {
        ...prev.vitals,
        [field]: val,
      },
    }));
  };

  const handleClearFields = () => {
    setFormData({
      id: `pt-${Date.now().toString().slice(-4)}`,
      name: '',
      age: 0,
      gender: 'Male',
      mrn: '',
      encounterDate: new Date().toISOString().split('T')[0],
      chiefComplaint: '',
      vitals: {
        bloodPressure: '',
        heartRate: 0,
        respiratoryRate: 0,
        temperature: '',
        spO2: 0,
        weightKg: 0,
        heightCm: 0,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const heightM = Number(formData.vitals.heightCm) / 100;
  const bmi =
    heightM > 0 && formData.vitals.weightKg > 0
      ? (formData.vitals.weightKg / (heightM * heightM)).toFixed(1)
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-800">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Enter / Edit Patient Demographics & Vitals</h3>
              <p className="text-xs text-stone-500">Update encounter parameters used for clinical AI analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-stone-800">
          
          {/* Section 1: Demographics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                Patient Identification & Demographics
              </h4>
              <button
                type="button"
                onClick={handleClearFields}
                className="text-[11px] text-stone-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Form Inputs</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Arthur Pendelton"
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Medical Record Number (MRN)</label>
                <input
                  type="text"
                  value={formData.mrn}
                  onChange={(e) => setFormData({ ...formData, mrn: e.target.value })}
                  placeholder="e.g. MRN-782910"
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="0"
                  max="125"
                  required
                  value={formData.age === 0 ? '' : formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0 })}
                  placeholder="e.g. 45"
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Gender / Sex</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Non-binary</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Encounter Date</label>
                <input
                  type="date"
                  value={formData.encounterDate}
                  onChange={(e) => setFormData({ ...formData, encounterDate: e.target.value })}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-600 font-medium mb-1">Chief Complaint</label>
              <input
                type="text"
                required
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                placeholder="e.g. Shortness of breath on mild exertion and ankle swelling for 2 weeks"
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-white"
              />
            </div>
          </div>

          {/* Section 2: Vitals */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-stone-200 pb-1 flex-wrap gap-2">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-stone-600" />
                <span>Encounter Vital Signs & Biometrics</span>
              </h4>
              <div className="flex items-center gap-2">
                {bmi && (
                  <span className="font-mono text-[11px] text-stone-600">
                    BMI: <strong>{bmi}</strong>
                  </span>
                )}
                {onOpenVitalsChart && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenVitalsChart();
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors"
                  >
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <span>View Vitals Chart</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Blood Pressure</label>
                <input
                  type="text"
                  placeholder="e.g. 120/80"
                  value={formData.vitals.bloodPressure}
                  onChange={(e) => handleVitalChange('bloodPressure', e.target.value)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Heart Rate (bpm)</label>
                <input
                  type="number"
                  placeholder="e.g. 72"
                  value={formData.vitals.heartRate === 0 ? '' : formData.vitals.heartRate}
                  onChange={(e) => handleVitalChange('heartRate', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Respiratory Rate (/min)</label>
                <input
                  type="number"
                  placeholder="e.g. 16"
                  value={formData.vitals.respiratoryRate === 0 ? '' : formData.vitals.respiratoryRate}
                  onChange={(e) => handleVitalChange('respiratoryRate', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Oxygen Saturation (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 98"
                  value={formData.vitals.spO2 === 0 ? '' : formData.vitals.spO2}
                  onChange={(e) => handleVitalChange('spO2', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Body Temperature</label>
                <input
                  type="text"
                  placeholder="e.g. 37.0 °C (98.6 °F)"
                  value={formData.vitals.temperature}
                  onChange={(e) => handleVitalChange('temperature', e.target.value)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 70.5"
                  value={formData.vitals.weightKg === 0 ? '' : formData.vitals.weightKg}
                  onChange={(e) => handleVitalChange('weightKg', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-medium mb-1">Height (cm)</label>
                <input
                  type="number"
                  placeholder="e.g. 175"
                  value={formData.vitals.heightCm === 0 ? '' : formData.vitals.heightCm}
                  onChange={(e) => handleVitalChange('heightCm', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 font-mono bg-white"
                />
              </div>
            </div>
          </div>

          {/* Footer buttons inside form */}
          <div className="bg-stone-50 -mx-6 -mb-6 p-4 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-stone-900 text-white rounded-md font-semibold hover:bg-stone-800 transition-colors shadow-xs"
            >
              Save Patient & Vitals
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
