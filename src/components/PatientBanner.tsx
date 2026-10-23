/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  User,
  Activity,
  AlertTriangle,
  Pill,
  Edit3,
  TrendingUp,
  AlertOctagon,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { PatientRecord } from '../types/clinical';
import { evaluateEmergencyRedFlags } from '../utils/drugSafetyEngine';

interface PatientBannerProps {
  patient: PatientRecord;
  medications: string[];
  allergies: string[];
  onEditPatient: () => void;
  onOpenVitalsChart?: () => void;
  onOpenCalculators?: (initial?: any) => void;
  encountersCount?: number;
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  patient,
  medications,
  allergies,
  onEditPatient,
  onOpenVitalsChart,
  onOpenCalculators,
  encountersCount = 1,
}) => {
  // Simple BMI calculation if height and weight available
  const heightM = patient.vitals.heightCm / 100;
  const bmi = heightM > 0 ? (patient.vitals.weightKg / (heightM * heightM)).toFixed(1) : null;

  // Evaluate any real-time emergency red flags
  const redFlags = evaluateEmergencyRedFlags(
    patient.vitals,
    undefined,
    patient.chiefComplaint
  );

  return (
    <div className="bg-white border-b border-stone-200/90 transition-colors">
      {/* Primary Demographics & Vitals Row */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        {/* Left: Patient Demographics */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-700 shrink-0 font-bold border border-stone-200">
              {patient.name ? (
                patient.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              ) : (
                <User className="w-4 h-4 text-stone-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {patient.name ? (
                  <span className="font-bold text-stone-900 text-sm tracking-tight">{patient.name}</span>
                ) : (
                  <span className="font-semibold text-stone-400 text-xs italic">
                    [No Patient Name — Click Edit to Enter]
                  </span>
                )}
                {patient.age > 0 && (
                  <>
                    <span className="text-stone-400 font-mono">·</span>
                    <span className="text-stone-600 font-medium">
                      {patient.age}yo {patient.gender}
                    </span>
                  </>
                )}
                {patient.mrn && (
                  <>
                    <span className="text-stone-400 font-mono">·</span>
                    <span className="text-stone-600 font-mono font-medium tabular-nums">{patient.mrn}</span>
                  </>
                )}
                {patient.encounterDate && (
                  <>
                    <span className="text-stone-400 font-mono">·</span>
                    <span className="text-stone-500 font-mono tabular-nums">{patient.encounterDate}</span>
                  </>
                )}
              </div>
              <div className="text-stone-600 mt-0.5 line-clamp-1">
                <span className="text-stone-400 font-medium">Chief Complaint:</span>{' '}
                <span className="italic font-medium text-stone-800">
                  {patient.chiefComplaint || 'Routine clinical consultation'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              onClick={onEditPatient}
              className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-300 px-2.5 py-1 rounded transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Edit patient demographics and vitals"
            >
              <Edit3 className="w-3 h-3 text-stone-600" />
              <span>Edit Vitals</span>
            </button>

            {onOpenVitalsChart && (
              <button
                onClick={onOpenVitalsChart}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-800 hover:text-blue-900 bg-blue-50 hover:bg-blue-100/90 border border-blue-200/90 px-2.5 py-1 rounded transition-all whitespace-nowrap shadow-2xs group cursor-pointer"
                title="View longitudinal vitals trend chart over multiple encounters"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span>Vitals Trend</span>
                {encountersCount > 1 ? (
                  <span className="px-1.5 py-0.2 bg-blue-200/80 text-blue-950 rounded-full font-mono text-[10px] font-bold">
                    {encountersCount} visits
                  </span>
                ) : (
                  <span className="text-[10px] text-blue-600 font-mono">1 visit</span>
                )}
              </button>
            )}

            {onOpenCalculators && (
              <button
                onClick={() => onOpenCalculators()}
                className="hidden xl:flex items-center gap-1 text-[11px] font-semibold text-purple-800 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded transition-all whitespace-nowrap shadow-2xs cursor-pointer"
                title="Open clinical risk calculators (HEART, CHA2DS2-VASc, CURB-65)"
              >
                <Calculator className="w-3 h-3 text-purple-600" />
                <span>Calculators</span>
              </button>
            )}
          </div>
        </div>

        {/* Center/Right: Tabular Vitals Strip (Clickable to open chart) */}
        <div
          onClick={onOpenVitalsChart}
          className={`flex items-center gap-3.5 flex-wrap bg-stone-50/80 border border-stone-200/80 rounded-lg px-3 py-1.5 font-mono text-xs text-stone-700 ${
            onOpenVitalsChart ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all' : ''
          }`}
          title={onOpenVitalsChart ? 'Click to inspect vitals trend chart & history' : undefined}
        >
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="text-stone-400 text-[11px] uppercase font-sans font-bold">Vitals:</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-stone-500 text-[11px]">BP</span>
            <span className="font-bold text-stone-900 tabular-nums">
              {patient.vitals.bloodPressure || '--/--'}
            </span>
          </div>

          <span className="text-stone-300">|</span>

          <div className="flex items-center gap-1">
            <span className="text-stone-500 text-[11px]">HR</span>
            <span className="font-bold text-stone-900 tabular-nums">
              {patient.vitals.heartRate > 0 ? patient.vitals.heartRate : '--'}
            </span>
            {patient.vitals.heartRate > 0 && <span className="text-[10px] text-stone-400">bpm</span>}
          </div>

          <span className="text-stone-300">|</span>

          <div className="flex items-center gap-1">
            <span className="text-stone-500 text-[11px]">RR</span>
            <span className="font-bold text-stone-900 tabular-nums">
              {patient.vitals.respiratoryRate > 0 ? patient.vitals.respiratoryRate : '--'}
            </span>
            {patient.vitals.respiratoryRate > 0 && <span className="text-[10px] text-stone-400">/min</span>}
          </div>

          <span className="text-stone-300">|</span>

          <div className="flex items-center gap-1" title={patient.vitals.spO2 > 0 ? `SpO2: ${patient.vitals.spO2}% (Measured)` : 'SpO2: Undocumented / Not measured (Missing)'}>
            <span className="text-stone-500 text-[11px]">SpO2</span>
            <span
              className={`font-bold tabular-nums ${
                patient.vitals.spO2 > 0 && patient.vitals.spO2 < 90
                  ? 'text-rose-700 underline font-extrabold'
                  : 'text-stone-900'
              }`}
            >
              {patient.vitals.spO2 > 0 ? `${patient.vitals.spO2}%` : '--'}
            </span>
          </div>

          <span className="text-stone-300">|</span>

          <div className="flex items-center gap-1">
            <span className="text-stone-500 text-[11px]">Temp</span>
            <span className="font-bold text-stone-900 tabular-nums">
              {patient.vitals.temperature || '--'}
            </span>
          </div>

          {bmi && (
            <>
              <span className="text-stone-300">|</span>
              <div className="flex items-center gap-1">
                <span className="text-stone-500 text-[11px]">BMI</span>
                <span className="font-bold text-stone-900 tabular-nums">{bmi}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Quick Allergies & Med Count */}
        <div className="hidden xl:flex items-center gap-4 text-xs text-stone-600 shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="text-stone-500">Allergies:</span>
            <span className="font-semibold text-stone-900">
              {allergies.length > 0 ? allergies.join(', ') : 'NKDA'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="text-stone-500">Medications:</span>
            <span className="font-mono tabular-nums font-bold text-stone-800">
              {medications.length} active
            </span>
          </div>
        </div>
      </div>

      {/* Emergency Red Flags Alert Banner (When critical triggers exist) */}
      {redFlags.length > 0 && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 sm:px-6 py-2">
          <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs text-rose-950">
              <div className="p-1 rounded bg-rose-200 text-rose-800 animate-pulse">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-rose-900 uppercase tracking-wide text-[11px] block">
                  EMERGENCY RED FLAG: {redFlags[0].title}
                </strong>
                <span className="text-rose-800 text-[11px]">
                  {redFlags[0].immediateAction}
                </span>
              </div>
            </div>

            {onOpenCalculators && (
              <button
                onClick={() => onOpenCalculators()}
                className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Stratify Risk (HEART / CURB-65)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
