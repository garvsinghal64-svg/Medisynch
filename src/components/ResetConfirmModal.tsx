import React from 'react';
import { RotateCcw, AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-md w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-800">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Reset All Clinical Data?</h3>
              <p className="text-xs text-stone-500">Prepare workspace to feed fresh patient data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-xs text-stone-700 space-y-3 leading-relaxed">
          <p>
            This action will clear all current clinical documentation, including:
          </p>
          <ul className="list-disc list-inside space-y-1 text-stone-600 bg-stone-50 p-3 rounded border border-stone-200">
            <li>Patient demographics and encounter identification</li>
            <li>All vital signs and biometric measurements</li>
            <li>Subjective, Objective, Assessment, and Plan notes</li>
            <li>Active medications and documented allergies</li>
            <li>Current AI differential and safety suggestions</li>
          </ul>
          <p className="text-stone-500 text-[11px]">
            Tip: If you want to keep this patient chart, click <strong>Save Record</strong> first before resetting.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-700 hover:bg-stone-50 transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-md font-semibold transition-colors text-xs shadow-xs"
          >
            Reset All & Feed New Data
          </button>
        </div>

      </div>
    </div>
  );
};
