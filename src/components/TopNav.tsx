/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Stethoscope,
  FileDown,
  ShieldAlert,
  Sparkles,
  FolderOpen,
  Save,
  RotateCcw,
  Share2,
  Mic,
  Server,
  Languages,
  Zap,
  Building2,
  Lock,
  ChevronDown,
  BarChart3,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  Atom,
  Calculator,
  Activity,
} from 'lucide-react';
import { CLINICAL_CASES } from '../data/clinicalTemplates';
import { ClinicalCaseTemplate, UserProfile } from '../types/clinical';

interface TopNavProps {
  selectedCaseId: string;
  onSelectCase: (caseItem: ClinicalCaseTemplate) => void;
  onOpenExport: () => void;
  onOpenDisclaimer: () => void;
  onOpenFeedbackGuide?: () => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onSaveEncounter: () => void;
  onOpenSavedList: () => void;
  savedCount: number;
  onOpenResetConfirm: () => void;
  // Clinical Hubs & Modals
  onOpenAmbientDictation: () => void;
  onOpenDrugSafety: () => void;
  onOpenCalculators?: (initial?: any) => void;
  onOpenEhrExport: () => void;
  onOpenPatientHandout: () => void;
  onOpenSnippets: () => void;
  onOpenHospitalAdmin: () => void;
  onOpenHospitalAnalytics: () => void;
  onOpenPrivacyDpa: () => void;
  onOpenDiagnostics?: (tab?: 'labs' | 'prescriptions' | 'reports') => void;
  onOpenBioscience?: (tab?: 'chemistry' | 'literature' | 'macromolecules' | 'genomics') => void;
  onOpenApiInspector?: () => void;
  onOpenAlertFatigue?: () => void;
  onOpenAdvancedSuite?: (tab?: 'longitudinal' | 'cpoe' | 'pgx' | 'abg_ecg' | 'avs_teachback') => void;
  onLockWorkstation: () => void;
  currentUser?: UserProfile;
}

export const TopNav: React.FC<TopNavProps> = ({
  selectedCaseId,
  onSelectCase,
  onOpenExport,
  onOpenDisclaimer,
  onOpenFeedbackGuide,
  isAnalyzing,
  onAnalyze,
  onSaveEncounter,
  onOpenSavedList,
  savedCount,
  onOpenResetConfirm,
  onOpenAmbientDictation,
  onOpenDrugSafety,
  onOpenCalculators,
  onOpenDiagnostics,
  onOpenBioscience,
  onOpenApiInspector,
  onOpenAlertFatigue,
  onOpenAdvancedSuite,
  onOpenEhrExport,
  onOpenPatientHandout,
  onOpenSnippets,
  onOpenHospitalAdmin,
  onOpenHospitalAnalytics,
  onOpenPrivacyDpa,
  onLockWorkstation,
  currentUser,
}) => {
  const [isHospitalMenuOpen, setIsHospitalMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsHospitalMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/90 transition-colors">
      {/* Tier 1: System Title, Clinician Identity, Enterprise Controls & Main AI CTA */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
        {/* Brand & Active Clinician */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-[#FAF8F5] flex items-center justify-center shadow-xs">
              <Stethoscope className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-stone-900 whitespace-nowrap">
                CuraDoc AI
              </span>
              <span className="hidden sm:inline text-[11px] text-stone-500 font-medium">
                Clinical Workspace
              </span>
            </div>
          </div>

          {/* Active Clinician Badge */}
          {currentUser && (
            <div className="flex items-center gap-1.5 text-[11px] bg-stone-100/90 border border-stone-200/90 rounded-md px-2 py-1 text-stone-700">
              <UserCheck className="w-3 h-3 text-teal-700" />
              <span className="font-semibold text-stone-800">{currentUser.name.split(',')[0]}</span>
              <span className="text-stone-400 font-mono">·</span>
              <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold">
                {currentUser.role}
              </span>
            </div>
          )}
        </div>

        {/* Right Tools: Interoperability, Hospital Governance, Export, and AI Trigger */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* EHR / FHIR Integration */}
          <button
            onClick={onOpenEhrExport}
            className="flex items-center gap-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="SMART on FHIR R4 Bundle & HL7 v2 Message Export to Epic / Cerner"
          >
            <Server className="w-3.5 h-3.5 text-blue-700" />
            <span className="hidden sm:inline">EHR / FHIR</span>
          </button>

          {/* Multi-Language Patient Handout / AVS */}
          <button
            onClick={onOpenPatientHandout}
            className="flex items-center gap-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="Multi-Language Patient Discharge Summary (English, Spanish, Chinese, Hindi, etc.)"
          >
            <Languages className="w-3.5 h-3.5 text-teal-700" />
            <span className="hidden md:inline">Patient AVS</span>
          </button>

          {/* Hospital Governance Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsHospitalMenuOpen(!isHospitalMenuOpen)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
              title="Hospital Administration, HIPAA Audit Trail & Governance"
            >
              <Building2 className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden lg:inline">Hospital Tools</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {isHospitalMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-stone-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-stone-100 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Hospital Suite & Governance
                </div>

                <button
                  onClick={() => {
                    setIsHospitalMenuOpen(false);
                    onOpenHospitalAdmin();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-800 font-medium cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-stone-600" />
                  <div>
                    <div>Hospital Admin & Audit Log</div>
                    <div className="text-[10px] text-stone-400">Staff roles, credentials & HIPAA trail</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsHospitalMenuOpen(false);
                    onOpenHospitalAnalytics();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-800 font-medium cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-emerald-700" />
                  <div>
                    <div>Clinical Documentation Analytics</div>
                    <div className="text-[10px] text-stone-400">Time savings & throughput metrics</div>
                  </div>
                </button>

                {onOpenAlertFatigue && (
                  <button
                    onClick={() => {
                      setIsHospitalMenuOpen(false);
                      onOpenAlertFatigue();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-800 font-medium cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <div>
                      <div>CDS Alert Fatigue Monitor</div>
                      <div className="text-[10px] text-stone-400">Override rate & justification compliance</div>
                    </div>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsHospitalMenuOpen(false);
                    onOpenPrivacyDpa();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-50 flex items-center gap-2.5 text-stone-800 font-medium cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <div>
                    <div>HIPAA Safe Harbor PHI Masking</div>
                    <div className="text-[10px] text-stone-400">De-identification & BAA inspector</div>
                  </div>
                </button>

                <div className="border-t border-stone-100 my-1" />

                <button
                  onClick={() => {
                    setIsHospitalMenuOpen(false);
                    onLockWorkstation();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50/70 flex items-center gap-2.5 text-amber-900 font-medium cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-amber-800" />
                  <div>
                    <div>Lock Workstation Screen</div>
                    <div className="text-[10px] text-amber-700">HIPAA §164.312 Technical Safeguard</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Standard Export / Print */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="Export Markdown, Plain Text, or Print"
          >
            <FileDown className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Safety Disclaimer */}
          <button
            onClick={onOpenDisclaimer}
            className="flex items-center gap-1 text-xs font-semibold text-stone-600 bg-white border border-stone-300 hover:bg-stone-50 px-2 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
            title="Clinical Safety & Disclaimer Notice"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden xl:inline">Notice</span>
          </button>

          {/* Guide */}
          {onOpenFeedbackGuide && (
            <button
              onClick={onOpenFeedbackGuide}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1.5 rounded-md shadow-2xs transition-colors cursor-pointer"
              title="Feature Evaluation Guide"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-800" />
              <span>Guide</span>
            </button>
          )}

          {/* Main Run Clinical AI Trigger */}
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-amber-800 hover:bg-amber-900 disabled:opacity-60 px-3.5 py-1.5 rounded-md shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            title="Run Clinical Decision Support AI on current encounter (Ctrl+Enter)"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-200' : 'text-amber-200'}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Clinical AI'}</span>
            <kbd className="hidden md:inline text-[9px] bg-amber-950/60 text-amber-200 px-1 py-0.2 rounded font-mono font-normal">
              Ctrl+↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Tier 2: Unified Clinical Command Bar (Zero hidden overflow) */}
      <div className="bg-stone-100/90 border-t border-stone-200/80 px-4 sm:px-6 py-1.5">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-2 overflow-x-auto text-xs">
          {/* Left: Preset Selector & Chart Operations */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Preset Selector */}
            <div className="relative">
              <select
                id="case-selector"
                value={selectedCaseId}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    onOpenResetConfirm();
                    return;
                  }
                  const found = CLINICAL_CASES.find((c) => c.id === e.target.value);
                  if (found) onSelectCase(found);
                }}
                className="text-xs font-semibold bg-white text-stone-900 border border-stone-300 rounded-md px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-stone-400 cursor-pointer shadow-2xs max-w-[210px] truncate"
                title="Select clinical case scenario"
              >
                {CLINICAL_CASES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
                <option value="custom">Custom Clinical Note</option>
              </select>
            </div>

            {/* Save Current Encounter */}
            <button
              onClick={onSaveEncounter}
              className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Save current patient chart and notes"
            >
              <Save className="w-3 h-3 text-stone-600" />
              <span>Save</span>
            </button>

            {/* Saved Patients Directory */}
            <button
              onClick={onOpenSavedList}
              className="flex items-center gap-1 text-[11px] font-semibold text-stone-800 bg-white border border-stone-300 hover:bg-stone-50 px-2 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Browse and load saved patient charts"
            >
              <FolderOpen className="w-3 h-3 text-amber-800" />
              <span>Saved ({savedCount})</span>
            </button>

            {/* Reset All Info */}
            <button
              onClick={onOpenResetConfirm}
              className="flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Reset all fields to feed new patient data"
            >
              <RotateCcw className="w-3 h-3 text-rose-600" />
              <span>Reset</span>
            </button>
          </div>

          {/* Right / Center: Primary Clinical Action Hubs */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Advanced Clinical Suite (NEWS2/KDIGO, CPOE, PGx CPIC, ABG/ECG, AVS Teach-Back) */}
            {onOpenAdvancedSuite && (
              <button
                onClick={() => onOpenAdvancedSuite('longitudinal')}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-stone-900 hover:bg-stone-800 border border-stone-900 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="Advanced Clinical Suite: Longitudinal Trends (NEWS2/KDIGO), Closed-Loop CPOE & Med Rec, PGx CPIC Genomics, ABG/ECG Interpreter & 6th-Grade AVS Teach-Back"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Clinical Suite</span>
              </button>
            )}

            {/* Ambient Doctor-Patient Scribe */}
            <button
              onClick={onOpenAmbientDictation}
              className="flex items-center gap-1 text-[11px] font-bold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Hands-free Ambient Doctor-Patient Visit Dictation & Scribe"
            >
              <Mic className="w-3 h-3 text-rose-700 animate-pulse" />
              <span>Ambient Scribe</span>
            </button>

            {/* Labs & Rx Hub */}
            {onOpenDiagnostics && (
              <button
                onClick={() => onOpenDiagnostics('labs')}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="Organize Laboratory Panels, e-Prescriptions & Diagnostic Reports"
              >
                <FileSpreadsheet className="w-3 h-3 text-teal-700" />
                <span>Labs & Rx Hub</span>
              </button>
            )}

            {/* Drug Safety Prober */}
            <button
              onClick={onOpenDrugSafety}
              className="flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Check Drug-Drug Interactions, Allergies & Dosing Safeguards"
            >
              <ShieldAlert className="w-3 h-3 text-amber-800" />
              <span>Drug Safety</span>
            </button>

            {/* Clinical Calculators Suite */}
            {onOpenCalculators && (
              <button
                onClick={() => onOpenCalculators('heart')}
                className="flex items-center gap-1 text-[11px] font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="Open Clinical Risk Calculators (HEART, CHA2DS2-VASc, CURB-65, eGFR, Alvarado)"
              >
                <Calculator className="w-3 h-3 text-purple-700" />
                <span>Calculators</span>
              </button>
            )}

            {/* Bioscience & PubMed Hub */}
            {onOpenBioscience && (
              <button
                onClick={() => onOpenBioscience('chemistry')}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="BioPharma Structures (PubChem), FDA Safety (openFDA), PubMed Trials & 3D Receptors (AlphaFold DB)"
              >
                <Atom className="w-3 h-3 text-indigo-700 animate-spin-slow" />
                <span>Bioscience Hub</span>
              </button>
            )}

            {/* Dot-Phrases */}
            <button
              onClick={onOpenSnippets}
              className="flex items-center gap-1 text-[11px] font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
              title="Clinical Macro Dot-Phrases (.htn, .dm2, .pe, etc.)"
            >
              <Zap className="w-3 h-3 text-amber-600" />
              <span>Dot-Phrases</span>
            </button>

            {/* API Diagnostics & Payload Inspector */}
            {onOpenApiInspector && (
              <button
                onClick={onOpenApiInspector}
                className="flex items-center gap-1 text-[11px] font-bold text-stone-900 bg-stone-200/80 hover:bg-stone-300 border border-stone-300 px-2 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="Clinical API Diagnostics: Inspect response headers, payloads & database reachability"
              >
                <Activity className="w-3 h-3 text-stone-700" />
                <span>API Logs</span>
              </button>
            )}

            {/* CDS Alert Fatigue Dashboard */}
            {onOpenAlertFatigue && (
              <button
                onClick={onOpenAlertFatigue}
                className="flex items-center gap-1 text-[11px] font-bold text-red-900 bg-red-50 hover:bg-red-100 border border-red-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                title="Hospital Compliance: CDS Alert Fatigue & Override Rate Monitor"
              >
                <BarChart3 className="w-3 h-3 text-red-700" />
                <span>Alert Fatigue</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
