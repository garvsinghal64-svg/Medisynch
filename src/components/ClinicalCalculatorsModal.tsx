/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Calculator,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { PatientRecord, SoapNote, LabResultItem } from '../types/clinical';
import {
  calculateHeartScore,
  calculateCha2ds2Vasc,
  calculateCurb65,
  calculateEgfr,
  calculateAlvarado,
  extractAutoPopulatedCalculatorInputs,
  HeartScoreInputs,
  Cha2ds2VascInputs,
  Curb65Inputs,
  EgfrInputs,
  AlvaradoInputs,
} from '../utils/clinicalCalculators';

interface ClinicalCalculatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  note: SoapNote;
  onInsertIntoSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
  onToast?: (msg: string) => void;
  initialCalculator?: 'heart' | 'cha2ds2vasc' | 'curb65' | 'egfr' | 'alvarado';
}

export const ClinicalCalculatorsModal: React.FC<ClinicalCalculatorsModalProps> = ({
  isOpen,
  onClose,
  patient,
  note,
  onInsertIntoSection,
  onToast,
  initialCalculator = 'heart',
}) => {
  const [activeCalc, setActiveCalc] = useState<'heart' | 'cha2ds2vasc' | 'curb65' | 'egfr' | 'alvarado'>(
    initialCalculator
  );

  // Initial auto-detection defaults
  const autoInputs = extractAutoPopulatedCalculatorInputs(patient, note, note.labs || []);

  const [heartInputs, setHeartInputs] = useState<HeartScoreInputs>(autoInputs.heart);
  const [chaInputs, setChaInputs] = useState<Cha2ds2VascInputs>(autoInputs.cha2ds2vasc);
  const [curbInputs, setCurbInputs] = useState<Curb65Inputs>(autoInputs.curb65);
  const [egfrInputs, setEgfrInputs] = useState<EgfrInputs>(autoInputs.egfr);
  const [alvaradoInputs, setAlvaradoInputs] = useState<AlvaradoInputs>(autoInputs.alvarado);

  useEffect(() => {
    if (isOpen) {
      setActiveCalc(initialCalculator);
      const refreshed = extractAutoPopulatedCalculatorInputs(patient, note, note.labs || []);
      setHeartInputs(refreshed.heart);
      setChaInputs(refreshed.cha2ds2vasc);
      setCurbInputs(refreshed.curb65);
      setEgfrInputs(refreshed.egfr);
      setAlvaradoInputs(refreshed.alvarado);
    }
  }, [isOpen, initialCalculator, patient, note]);

  if (!isOpen) return null;

  // Real-time calculations
  const heartResult = calculateHeartScore(heartInputs);
  const chaResult = calculateCha2ds2Vasc(chaInputs);
  const curbResult = calculateCurb65(curbInputs);
  const egfrResult = calculateEgfr(egfrInputs);
  const alvaradoResult = calculateAlvarado(alvaradoInputs);

  const handleAutoPopulate = () => {
    const refreshed = extractAutoPopulatedCalculatorInputs(patient, note, note.labs || []);
    setHeartInputs(refreshed.heart);
    setChaInputs(refreshed.cha2ds2vasc);
    setCurbInputs(refreshed.curb65);
    setEgfrInputs(refreshed.egfr);
    setAlvaradoInputs(refreshed.alvarado);
    if (onToast) onToast('Pre-populated calculator parameters from patient chart and labs.');
  };

  const handleInsertHeartScore = () => {
    const text = `[HEART SCORE FOR CHEST PAIN RISK STRATIFICATION]:
Score: ${heartResult.score}/10 (${heartResult.riskCategory} - ${heartResult.sixWeekMaceRate})
Parameters: History (${heartInputs.history}), ECG (${heartInputs.ecg}), Age (${heartInputs.age}), Risk Factors (${heartInputs.riskFactors}), Troponin (${heartInputs.troponin})
Clinical Recommendation: ${heartResult.recommendation}
Reference: ${heartResult.evidenceSource}`;
    onInsertIntoSection('assessment', text);
    if (onToast) onToast('HEART score and recommendations inserted into Assessment.');
    onClose();
  };

  const handleInsertChaScore = () => {
    const text = `[CHA2DS2-VASc ATRIAL FIBRILLATION STROKE RISK SCORE]:
Score: ${chaResult.score} (Annual adjusted stroke risk: ${chaResult.annualStrokeRiskPercent}%)
Clinical Recommendation: ${chaResult.recommendation}
Guideline Reference: ${chaResult.guidelineSource}`;
    onInsertIntoSection('assessment', text);
    if (onToast) onToast('CHA2DS2-VASc score inserted into Assessment.');
    onClose();
  };

  const handleInsertCurbScore = () => {
    const text = `[CURB-65 PNEUMONIA SEVERITY & DISPOSITION SCORE]:
Score: ${curbResult.score}/5 (${curbResult.thirtyDayMortalityPercent})
Disposition Recommendation: ${curbResult.dispositionRecommendation}
Guideline: ${curbResult.guidelineSource}`;
    onInsertIntoSection('assessment', text);
    if (onToast) onToast('CURB-65 score inserted into Assessment.');
    onClose();
  };

  const handleInsertEgfrScore = () => {
    const text = `[RENAL FUNCTION ASSESSMENT - CKD-EPI 2021 & COCKCROFT-GAULT]:
eGFR: ${egfrResult.egfrCkdEpi} mL/min/1.73m² (${egfrResult.ckdStage})
${egfrResult.crClCockcroftGault ? `Estimated CrCl (Cockcroft-Gault): ${egfrResult.crClCockcroftGault} mL/min` : ''}
${egfrResult.renalPrecautionAlerts.length > 0 ? `Renal Dosing Precautions:\n${egfrResult.renalPrecautionAlerts.map((a) => `• ${a}`).join('\n')}` : 'No critical eGFR cut-off drug contraindications identified.'}`;
    onInsertIntoSection('assessment', text);
    if (onToast) onToast('Renal eGFR evaluation inserted into Assessment.');
    onClose();
  };

  const handleInsertAlvaradoScore = () => {
    const text = `[ALVARADO SCORE FOR ACUTE APPENDICITIS]:
Score: ${alvaradoResult.score}/10 (${alvaradoResult.probability})
Management Recommendation: ${alvaradoResult.recommendation}
Guideline: ${alvaradoResult.guidelineSource}`;
    onInsertIntoSection('assessment', text);
    if (onToast) onToast('Alvarado score inserted into Assessment.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Clinical Risk Calculators & Scoring Suite
                </h3>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300">
                  Evidence-Based Decision Support
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Standardized diagnostic criteria for acute triage, cardiorenal risks, and disposition planning.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoPopulate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-semibold text-stone-700 shadow-2xs transition-colors cursor-pointer"
              title="Pre-fill parameters from active patient record"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Auto-Fill from Chart</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calculator Selector Tabs */}
        <div className="bg-stone-100/80 border-b border-stone-200 px-4 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveCalc('heart')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeCalc === 'heart'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-600" />
            <span>1. HEART Score (Chest Pain)</span>
          </button>
          <button
            onClick={() => setActiveCalc('cha2ds2vasc')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeCalc === 'cha2ds2vasc'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-purple-600" />
            <span>2. CHA2DS2-VASc (AFib)</span>
          </button>
          <button
            onClick={() => setActiveCalc('curb65')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeCalc === 'curb65'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>3. CURB-65 (Pneumonia)</span>
          </button>
          <button
            onClick={() => setActiveCalc('egfr')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeCalc === 'egfr'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-teal-600" />
            <span>4. eGFR & CrCl (Renal)</span>
          </button>
          <button
            onClick={() => setActiveCalc('alvarado')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
              activeCalc === 'alvarado'
                ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>5. Alvarado (Appendicitis)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* CALCULATOR 1: HEART SCORE */}
          {activeCalc === 'heart' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    HEART Score for Major Adverse Cardiac Events (MACE)
                  </h4>
                  <p className="text-xs text-stone-500">
                    Validated risk tool for emergency & acute outpatient triage of adult chest discomfort.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
                      heartResult.riskCategory === 'Low Risk'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : heartResult.riskCategory === 'Moderate Risk'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-rose-50 text-rose-900 border-rose-300 animate-pulse'
                    }`}
                  >
                    Score: {heartResult.score}/10 ({heartResult.riskCategory})
                  </span>
                </div>
              </div>

              {/* Input Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* History */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                  <label className="font-bold text-stone-800 block">History Suspicion for Ischemia</label>
                  <select
                    value={heartInputs.history}
                    onChange={(e) =>
                      setHeartInputs({ ...heartInputs, history: parseInt(e.target.value, 10) as any })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value={0}>0 - Slightly suspicious (sharp, positional, or pleuritic only)</option>
                    <option value={1}>1 - Moderately suspicious (atypical pressure, postprandial)</option>
                    <option value={2}>2 - Highly suspicious (retrosternal pressure, radiation, diaphoresis)</option>
                  </select>
                </div>

                {/* ECG */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                  <label className="font-bold text-stone-800 block">12-Lead Electrocardiogram (ECG)</label>
                  <select
                    value={heartInputs.ecg}
                    onChange={(e) =>
                      setHeartInputs({ ...heartInputs, ecg: parseInt(e.target.value, 10) as any })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value={0}>0 - Normal / No ischemic repolarization changes</option>
                    <option value={1}>1 - Non-specific repolarization disturbance / LBBB / LVH / Digoxin</option>
                    <option value={2}>2 - Significant ST depression or T-wave inversion in ischemic territory</option>
                  </select>
                </div>

                {/* Age */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                  <label className="font-bold text-stone-800 block">
                    Patient Age ({patient.age || 0} yo)
                  </label>
                  <select
                    value={heartInputs.age}
                    onChange={(e) =>
                      setHeartInputs({ ...heartInputs, age: parseInt(e.target.value, 10) as any })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value={0}>0 - Under 45 years of age</option>
                    <option value={1}>1 - 45 to 64 years of age</option>
                    <option value={2}>2 - 65 years of age or older</option>
                  </select>
                </div>

                {/* Risk Factors */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5">
                  <label className="font-bold text-stone-800 block">Cardiovascular Risk Factors</label>
                  <select
                    value={heartInputs.riskFactors}
                    onChange={(e) =>
                      setHeartInputs({ ...heartInputs, riskFactors: parseInt(e.target.value, 10) as any })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value={0}>0 - No known risk factors (HTN, lipids, DM, smoking, family CAD)</option>
                    <option value={1}>1 - 1 or 2 cardiac risk factors documented</option>
                    <option value={2}>2 - 3 or more risk factors OR history of atherosclerotic disease (CAD/PAD)</option>
                  </select>
                </div>

                {/* Initial Troponin */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-1.5 md:col-span-2">
                  <label className="font-bold text-stone-800 block">High-Sensitivity Cardiac Troponin</label>
                  <select
                    value={heartInputs.troponin}
                    onChange={(e) =>
                      setHeartInputs({ ...heartInputs, troponin: parseInt(e.target.value, 10) as any })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-medium"
                  >
                    <option value={0}>0 - Below or equal to 99th percentile upper reference limit</option>
                    <option value={1}>1 - 1 to 3 times the upper reference limit</option>
                    <option value={2}>2 - Greater than 3 times the upper reference limit</option>
                  </select>
                </div>
              </div>

              {/* Result Summary Box */}
              <div
                className={`p-4 rounded-xl border space-y-2 text-xs ${
                  heartResult.riskCategory === 'Low Risk'
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : heartResult.riskCategory === 'Moderate Risk'
                    ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                    : 'bg-rose-50/60 border-rose-200 text-rose-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Prognostic Risk: {heartResult.sixWeekMaceRate}
                  </span>
                  <button
                    onClick={handleInsertHeartScore}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Insert into Assessment & Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="leading-relaxed font-medium">{heartResult.recommendation}</p>
                <div className="text-[11px] text-stone-500 italic pt-1 border-t border-stone-200/50">
                  Citation: {heartResult.evidenceSource}
                </div>
              </div>
            </div>
          )}

          {/* CALCULATOR 2: CHA2DS2-VASc */}
          {activeCalc === 'cha2ds2vasc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    CHA2DS2-VASc Stroke Risk Score in Atrial Fibrillation
                  </h4>
                  <p className="text-xs text-stone-500">
                    Guides guideline-directed decision for systemic oral anticoagulation therapy.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-purple-100 text-purple-900 border border-purple-300">
                  Score: {chaResult.score} (Stroke Rate: {chaResult.annualStrokeRiskPercent}%/yr)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {[
                  { key: 'chf', label: 'C - Congestive Heart Failure / LVEF <=40%', pts: '+1' },
                  { key: 'hypertension', label: 'H - Hypertension (resting BP >140/90 or on Rx)', pts: '+1' },
                  { key: 'diabetes', label: 'D - Diabetes Mellitus (HbA1c >6.5% or oral hypoglycemics)', pts: '+1' },
                  { key: 'stroke', label: 'S2 - Prior Stroke, TIA, or Systemic Thromboembolism', pts: '+2' },
                  { key: 'vascularDisease', label: 'V - Vascular Disease (Prior MI, PAD, or Aortic Plaque)', pts: '+1' },
                  { key: 'isFemale', label: 'Sc - Sex Category: Female', pts: '+1' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean((chaInputs as any)[item.key])}
                        onChange={(e) =>
                          setChaInputs({ ...chaInputs, [item.key]: e.target.checked })
                        }
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="font-semibold text-stone-800">{item.label}</span>
                    </div>
                    <span className="font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                      {item.pts}
                    </span>
                  </label>
                ))}
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">Age Bracket:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setChaInputs({ ...chaInputs, age: 50 })}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      chaInputs.age < 65 ? 'bg-purple-800 text-white' : 'bg-white border text-stone-700'
                    }`}
                  >
                    &lt;65 yrs (+0)
                  </button>
                  <button
                    onClick={() => setChaInputs({ ...chaInputs, age: 68 })}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      chaInputs.age >= 65 && chaInputs.age < 75
                        ? 'bg-purple-800 text-white'
                        : 'bg-white border text-stone-700'
                    }`}
                  >
                    65 - 74 yrs (+1)
                  </button>
                  <button
                    onClick={() => setChaInputs({ ...chaInputs, age: 78 })}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      chaInputs.age >= 75 ? 'bg-purple-800 text-white' : 'bg-white border text-stone-700'
                    }`}
                  >
                    &gt;=75 yrs (+2)
                  </button>
                </div>
              </div>

              {/* Result Callout */}
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 text-xs text-purple-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Guideline Anticoagulation Strategy:
                  </span>
                  <button
                    onClick={handleInsertChaScore}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Insert into Assessment & Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="leading-relaxed font-medium">{chaResult.recommendation}</p>
                <div className="text-[11px] text-stone-500 italic pt-1 border-t border-purple-200/60">
                  Guideline: {chaResult.guidelineSource}
                </div>
              </div>
            </div>
          )}

          {/* CALCULATOR 3: CURB-65 */}
          {activeCalc === 'curb65' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    CURB-65 Severity Score for Community-Acquired Pneumonia
                  </h4>
                  <p className="text-xs text-stone-500">
                    Assesses 30-day mortality risk and inpatient versus outpatient disposition.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-blue-100 text-blue-900 border border-blue-300">
                  Score: {curbResult.score}/5 ({curbResult.thirtyDayMortalityPercent})
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { key: 'confusion', label: 'C - Confusion / Acute Mental Status Impairment', detail: 'AMTS <=8 or disorientation' },
                  { key: 'bunOver19', label: 'U - Blood Urea Nitrogen (BUN) > 19 mg/dL', detail: 'Or serum urea > 7 mmol/L' },
                  { key: 'respiratoryRateOver30', label: 'R - Respiratory Rate >= 30 breaths/min', detail: 'Significant tachypnea' },
                  { key: 'hypotension', label: 'B - Blood Pressure: SBP < 90 mmHg OR DBP <= 60 mmHg', detail: 'Hemodynamic compromise' },
                  { key: 'age65OrOlder', label: '65 - Patient Age 65 years or older', detail: `Current age: ${patient.age || 0} yo` },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={Boolean((curbInputs as any)[item.key])}
                        onChange={(e) =>
                          setCurbInputs({ ...curbInputs, [item.key]: e.target.checked })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-semibold text-stone-800 block">{item.label}</span>
                        <span className="text-[11px] text-stone-500">{item.detail}</span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                      +1 pt
                    </span>
                  </label>
                ))}
              </div>

              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Disposition Guidance:
                  </span>
                  <button
                    onClick={handleInsertCurbScore}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Insert into Note</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="leading-relaxed font-medium">{curbResult.dispositionRecommendation}</p>
                <div className="text-[11px] text-stone-500 italic pt-1 border-t border-blue-200/60">
                  Evidence: {curbResult.guidelineSource}
                </div>
              </div>
            </div>
          )}

          {/* CALCULATOR 4: EGFR & CRCL */}
          {activeCalc === 'egfr' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    eGFR (CKD-EPI 2021) & Cockcroft-Gault Creatinine Clearance
                  </h4>
                  <p className="text-xs text-stone-500">
                    Accurate renal staging and automated pharmacotherapy safety threshold warnings.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-teal-100 text-teal-900 border border-teal-300">
                  eGFR: {egfrResult.egfrCkdEpi} mL/min/1.73m²
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Serum Creatinine (mg/dL)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={egfrInputs.serumCreatinine}
                    onChange={(e) =>
                      setEgfrInputs({ ...egfrInputs, serumCreatinine: parseFloat(e.target.value) || 1.0 })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Patient Age (years)</label>
                  <input
                    type="number"
                    value={egfrInputs.age}
                    onChange={(e) =>
                      setEgfrInputs({ ...egfrInputs, age: parseInt(e.target.value, 10) || 50 })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Patient Sex</label>
                  <select
                    value={egfrInputs.isFemale ? 'female' : 'male'}
                    onChange={(e) =>
                      setEgfrInputs({ ...egfrInputs, isFemale: e.target.value === 'female' })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-semibold"
                  >
                    <option value="male">Male (kappa 0.9)</option>
                    <option value="female">Female (kappa 0.7)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-700 block mb-1">Weight (kg for CrCl)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={egfrInputs.weightKg || 70}
                    onChange={(e) =>
                      setEgfrInputs({ ...egfrInputs, weightKg: parseFloat(e.target.value) || 70 })
                    }
                    className="w-full p-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <span className="text-[11px] font-bold text-stone-500 uppercase block mb-1">
                    CKD Classification (KDIGO 2024):
                  </span>
                  <div className="text-sm font-bold text-stone-900">{egfrResult.ckdStage}</div>
                </div>
                <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                  <span className="text-[11px] font-bold text-stone-500 uppercase block mb-1">
                    Cockcroft-Gault Creatinine Clearance (CrCl):
                  </span>
                  <div className="text-sm font-bold text-stone-900 font-mono">
                    {egfrResult.crClCockcroftGault} mL/min
                  </div>
                </div>
              </div>

              {/* Warnings and insert */}
              <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 text-xs text-teal-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Renal Dosing & Safety Precautions:
                  </span>
                  <button
                    onClick={handleInsertEgfrScore}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Insert into Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                {egfrResult.renalPrecautionAlerts.length > 0 ? (
                  <ul className="space-y-1 list-disc list-inside font-medium text-rose-950">
                    {egfrResult.renalPrecautionAlerts.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-medium text-emerald-900">
                    Renal parameters preserved. No active black-box renal contraindications for Metformin, SGLT2i, or MRAs.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* CALCULATOR 5: ALVARADO APPENDICITIS */}
          {activeCalc === 'alvarado' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    Alvarado (MANTRELS) Score for Acute Appendicitis
                  </h4>
                  <p className="text-xs text-stone-500">
                    Clinical decision rule for evaluating acute right lower quadrant abdominal pain.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-amber-100 text-amber-900 border border-amber-300">
                  Score: {alvaradoResult.score}/10
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'migratoryPain', label: 'M - Migratory pain to right lower quadrant', pts: '+1' },
                  { key: 'anorexia', label: 'A - Anorexia (loss of appetite / acetone in urine)', pts: '+1' },
                  { key: 'nauseaVomiting', label: 'N - Nausea or vomiting', pts: '+1' },
                  { key: 'rlqTenderness', label: 'T - Tenderness in Right Lower Quadrant', pts: '+2' },
                  { key: 'reboundTenderness', label: 'R - Rebound tenderness in RLQ', pts: '+1' },
                  { key: 'elevatedTemperature', label: 'E - Elevated temperature (>= 37.3°C / 99.1°F)', pts: '+1' },
                  { key: 'leukocytosis', label: 'L - Leukocytosis (WBC > 10.0 x10^3/uL)', pts: '+2' },
                  { key: 'neutrophilicShift', label: 'S - Shift to the left (neutrophils >= 75%)', pts: '+1' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="p-3 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean((alvaradoInputs as any)[item.key])}
                        onChange={(e) =>
                          setAlvaradoInputs({ ...alvaradoInputs, [item.key]: e.target.checked })
                        }
                        className="rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-semibold text-stone-800">{item.label}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                      {item.pts}
                    </span>
                  </label>
                ))}
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Probability: {alvaradoResult.probability}
                  </span>
                  <button
                    onClick={handleInsertAlvaradoScore}
                    className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Insert into Assessment & Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="leading-relaxed font-medium">{alvaradoResult.recommendation}</p>
                <div className="text-[11px] text-stone-500 italic pt-1 border-t border-amber-200/60">
                  Guideline: {alvaradoResult.guidelineSource}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>St. Jude Metropolitan Health System • Evidence-Based Decision Tools</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Calculators
          </button>
        </div>
      </div>
    </div>
  );
};
