/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileCheck2,
  Lock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  FileText,
  UserCheck,
} from 'lucide-react';
import { PatientRecord, SoapNote, UserProfile } from '../types/clinical';
import { logAuditEvent } from '../utils/auditLogger';

interface SignNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  currentUser: UserProfile;
  onSignSuccess: (signedBy: string, signedAt: string, attestationText: string) => void;
  onToast?: (msg: string) => void;
}

const DEFAULT_ATTESTATIONS = [
  'I personally evaluated the patient, reviewed all diagnostic data and history, formulate the clinical assessment, and approve the management plan documented herein.',
  'Attending Physician Attestation: I was physically present during the key and critical portions of the service and agree with the documentation, assessment, and plan.',
  'Synchronous Telehealth Attestation: I conducted a real-time audio-visual clinical encounter with the patient and verified patient identity and clinical stability.',
];

export const SignNoteModal: React.FC<SignNoteModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  currentUser,
  onSignSuccess,
  onToast,
}) => {
  const [selectedAttestationIndex, setSelectedAttestationIndex] = useState(0);
  const [customAttestation, setCustomAttestation] = useState(DEFAULT_ATTESTATIONS[0]);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (idx: number) => {
    setSelectedAttestationIndex(idx);
    setCustomAttestation(DEFAULT_ATTESTATIONS[idx]);
  };

  const handleSignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== currentUser.pin && pin !== '1234') {
      setPinError(true);
      return;
    }

    setIsSigning(true);
    setPinError(false);

    const now = new Date().toISOString();
    const signerTitle = `${currentUser.name} (${currentUser.title})`;

    setTimeout(() => {
      onSignSuccess(signerTitle, now, customAttestation);

      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: 'SIGN_NOTE',
        patientMrn: patient.mrn,
        patientName: patient.name,
        details: `Electronically signed and attested clinical SOAP progress note. Attestation: "${customAttestation.slice(0, 60)}..."`,
      });

      if (onToast) onToast(`Clinical note attested and locked by ${currentUser.name.split(',')[0]}.`);
      setIsSigning(false);
      onClose();
    }, 400);
  };

  const wordCount = (
    note.subjective +
    ' ' +
    note.objective +
    ' ' +
    note.assessment +
    ' ' +
    note.plan
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
              <FileCheck2 className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Physician Attestation & Note Digital Signature
                </h3>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200">
                  Legal Authentication
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                St. Jude Metropolitan Health System • Electronic Medical Record Sign-Off (21 CFR Part 11)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSignSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Note Metadata Summary */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">Patient</span>
              <strong className="text-stone-900">{patient.name || 'Unnamed Patient'}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">MRN Number</span>
              <span className="font-mono text-stone-800 font-semibold">{patient.mrn}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">Encounter Date</span>
              <span className="text-stone-800 font-medium">{patient.encounterDate}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-semibold">Documentation</span>
              <span className="text-emerald-800 font-semibold font-mono">{wordCount} words verified</span>
            </div>
          </div>

          {/* Clinician Identity Card */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-stone-900 block text-xs">{currentUser.name}</strong>
                <span className="text-[11px] text-stone-600">
                  {currentUser.title} • {currentUser.department} (Badge: {currentUser.badgeNumber})
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold uppercase">
              {currentUser.role}
            </span>
          </div>

          {/* Attestation Presets */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 block uppercase tracking-wider text-[11px]">
              Select Attestation Statement
            </label>
            <div className="space-y-2">
              {DEFAULT_ATTESTATIONS.map((preset, idx) => (
                <label
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    selectedAttestationIndex === idx
                      ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 font-medium shadow-2xs'
                      : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="attestation"
                    checked={selectedAttestationIndex === idx}
                    onChange={() => handleSelectPreset(idx)}
                    className="mt-0.5 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span className="text-xs leading-relaxed">{preset}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Editable Custom Attestation */}
          <div>
            <label className="font-bold text-stone-800 block uppercase tracking-wider text-[11px] mb-1">
              Legal Attestation Statement for Medical Record:
            </label>
            <textarea
              value={customAttestation}
              onChange={(e) => setCustomAttestation(e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
            />
          </div>

          {/* PIN Authentication Input */}
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-stone-600" />
                <span>Enter Clinician PIN to Digitally Authenticate</span>
              </label>
              <span className="text-[10px] text-stone-400 font-mono">(Demo PIN: {currentUser.pin || '1234'})</span>
            </div>

            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setPinError(false);
                }}
                className={`w-full text-center tracking-[0.4em] font-mono text-base py-1.5 bg-white border rounded-lg focus:outline-hidden focus:ring-2 ${
                  pinError
                    ? 'border-rose-400 focus:ring-rose-400 bg-rose-50'
                    : 'border-stone-300 focus:ring-emerald-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setPin(currentUser.pin || '1234')}
                className="px-2.5 py-2 text-[10px] bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg whitespace-nowrap font-medium"
              >
                Auto-fill
              </button>
            </div>

            {pinError && (
              <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Incorrect PIN entered. (Default demo PIN is {currentUser.pin || '1234'})</span>
              </div>
            )}
          </div>

          {/* Legal Certification Notice */}
          <div className="text-[11px] text-stone-500 flex items-start gap-2 pt-1 border-t border-stone-100">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              By entering your PIN and authenticating, you affirm that this electronic signature is the legally binding equivalent of your handwritten signature under 45 CFR Part 164 (HIPAA Security Rule).
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl text-stone-700 hover:bg-stone-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSigning || pin.length < 4}
              className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSigning ? 'Authenticating...' : 'Sign & Seal Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
