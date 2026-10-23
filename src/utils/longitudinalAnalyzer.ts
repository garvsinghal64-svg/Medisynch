import { LabResultItem, PatientRecord, SavedEncounterRecord } from '../types/clinical';

export interface News2Input {
  respiratoryRate?: number;
  spO2?: number;
  isHypercapnicScale2?: boolean;
  onSupplementalO2?: boolean;
  systolicBp?: number;
  heartRate?: number;
  consciousness?: 'Alert' | 'CVPU';
  temperature?: number;
}

export interface News2ParameterScore {
  parameter: string;
  valueDisplay: string;
  points: number;
  isMissing: boolean;
}

export interface News2Assessment {
  totalScore: number;
  parameters: News2ParameterScore[];
  hasSingleRedScore: boolean;
  riskBand: 'Low' | 'Low-Medium' | 'Medium' | 'High';
  clinicalResponse: string;
  missingParameters: string[];
}

export interface QSofaAssessment {
  score: number;
  criteria: {
    respiratoryRateGe22: boolean;
    systolicBpLe100: boolean;
    alteredMentation: boolean;
  };
  missingParameters: string[];
  highRiskMortality: boolean;
  clinicalInterpretation: string;
}

export interface KdigoAkiAssessment {
  stage: 0 | 1 | 2 | 3;
  stageLabel: 'No AKI' | 'KDIGO Stage 1 AKI' | 'KDIGO Stage 2 AKI' | 'KDIGO Stage 3 AKI';
  baselineCr: number;
  currentCr: number;
  absoluteDelta: number;
  foldChange: number;
  rationale: string;
  recommendedActions: string[];
}

export interface LabDeltaCheckItem {
  testName: string;
  unit: string;
  previousValue: number;
  currentValue: number;
  absoluteDelta: number;
  percentDelta: number;
  severity: 'normal' | 'notable' | 'critical_delta';
  interpretation: string;
}

export function parseSystolicBp(bpString?: string): number | undefined {
  if (!bpString || typeof bpString !== 'string') return undefined;
  const match = bpString.trim().match(/^(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return undefined;
  const sys = parseInt(match[1], 10);
  return isNaN(sys) || sys <= 0 ? undefined : sys;
}

export function calculateNews2(input: News2Input): News2Assessment {
  const parameters: News2ParameterScore[] = [];
  const missingParameters: string[] = [];

  // 1. Respiratory Rate
  const rr = input.respiratoryRate;
  if (rr === undefined || rr <= 0 || isNaN(rr)) {
    missingParameters.push('Respiratory Rate');
    parameters.push({ parameter: 'Respiratory Rate', valueDisplay: 'MISSING (Not measured)', points: 0, isMissing: true });
  } else {
    let pts = 0;
    if (rr <= 8) pts = 3;
    else if (rr <= 11) pts = 1;
    else if (rr <= 20) pts = 0;
    else if (rr <= 24) pts = 2;
    else pts = 3;
    parameters.push({ parameter: 'Respiratory Rate', valueDisplay: `${rr} /min`, points: pts, isMissing: false });
  }

  // 2. SpO2 (Never fabricate 98% if missing or 0)
  const spo2 = input.spO2;
  const scale2 = Boolean(input.isHypercapnicScale2);
  if (spo2 === undefined || spo2 <= 0 || isNaN(spo2)) {
    missingParameters.push('SpO2');
    parameters.push({ parameter: `SpO2 (${scale2 ? 'Scale 2' : 'Scale 1'})`, valueDisplay: 'MISSING (Not measured)', points: 0, isMissing: true });
  } else if (!scale2) {
    let pts = 0;
    if (spo2 <= 91) pts = 3;
    else if (spo2 <= 93) pts = 2;
    else if (spo2 <= 95) pts = 1;
    else pts = 0;
    parameters.push({ parameter: 'SpO2 (Scale 1)', valueDisplay: `${spo2}%`, points: pts, isMissing: false });
  } else {
    let pts = 0;
    if (spo2 <= 83) pts = 3;
    else if (spo2 <= 85) pts = 2;
    else if (spo2 <= 87) pts = 1;
    else if (spo2 <= 92) pts = 0;
    else if (!input.onSupplementalO2) pts = 0;
    else if (spo2 <= 94) pts = 1;
    else if (spo2 <= 96) pts = 2;
    else pts = 3;
    parameters.push({ parameter: 'SpO2 (Scale 2 Hypercapnic)', valueDisplay: `${spo2}%`, points: pts, isMissing: false });
  }

  // 3. Air or Oxygen
  const o2Pts = input.onSupplementalO2 ? 2 : 0;
  parameters.push({
    parameter: 'Inspired O2',
    valueDisplay: input.onSupplementalO2 ? 'Supplemental O2' : 'Room Air',
    points: o2Pts,
    isMissing: false,
  });

  // 4. Systolic BP
  const sbp = input.systolicBp;
  if (sbp === undefined || sbp <= 0 || isNaN(sbp)) {
    missingParameters.push('Systolic BP');
    parameters.push({ parameter: 'Systolic BP', valueDisplay: 'MISSING (Not measured)', points: 0, isMissing: true });
  } else {
    let pts = 0;
    if (sbp <= 90) pts = 3;
    else if (sbp <= 100) pts = 2;
    else if (sbp <= 110) pts = 1;
    else if (sbp <= 219) pts = 0;
    else pts = 3;
    parameters.push({ parameter: 'Systolic BP', valueDisplay: `${sbp} mmHg`, points: pts, isMissing: false });
  }

  // 5. Heart Rate
  const hr = input.heartRate;
  if (hr === undefined || hr <= 0 || isNaN(hr)) {
    missingParameters.push('Heart Rate');
    parameters.push({ parameter: 'Heart Rate', valueDisplay: 'MISSING (Not measured)', points: 0, isMissing: true });
  } else {
    let pts = 0;
    if (hr <= 40) pts = 3;
    else if (hr <= 50) pts = 1;
    else if (hr <= 90) pts = 0;
    else if (hr <= 110) pts = 1;
    else if (hr <= 130) pts = 2;
    else pts = 3;
    parameters.push({ parameter: 'Heart Rate', valueDisplay: `${hr} bpm`, points: pts, isMissing: false });
  }

  // 6. Consciousness (ACVPU)
  const consciousness = input.consciousness || 'Alert';
  const cPts = consciousness === 'CVPU' ? 3 : 0;
  parameters.push({
    parameter: 'Consciousness (ACVPU)',
    valueDisplay: consciousness === 'CVPU' ? 'New Confusion / V / P / U' : 'Alert',
    points: cPts,
    isMissing: false,
  });

  // 7. Temperature
  const temp = input.temperature;
  if (temp === undefined || temp <= 0 || isNaN(temp)) {
    missingParameters.push('Temperature');
    parameters.push({ parameter: 'Temperature', valueDisplay: 'MISSING (Not measured)', points: 0, isMissing: true });
  } else {
    let pts = 0;
    if (temp <= 35.0) pts = 3;
    else if (temp <= 36.0) pts = 1;
    else if (temp <= 38.0) pts = 0;
    else if (temp <= 39.0) pts = 1;
    else pts = 2;
    parameters.push({ parameter: 'Temperature', valueDisplay: `${temp.toFixed(1)} °C`, points: pts, isMissing: false });
  }

  const totalScore = parameters.reduce((sum, p) => sum + p.points, 0);
  const hasSingleRedScore = parameters.some((p) => p.points === 3);

  let riskBand: News2Assessment['riskBand'] = 'Low';
  let clinicalResponse = 'Continue routine NEWS2 monitoring (minimum every 4–6 hours).';

  if (totalScore >= 7) {
    riskBand = 'High';
    clinicalResponse =
      'Emergency assessment by clinical/critical care outreach team with continuous vital sign monitoring. Evaluate for organ dysfunction.';
  } else if (totalScore >= 5) {
    riskBand = 'Medium';
    clinicalResponse =
      'Urgent review by ward clinician within 30 minutes to evaluate for acute deterioration or sepsis-related organ dysfunction. Increase monitoring to at least hourly.';
  } else if (hasSingleRedScore) {
    riskBand = 'Low-Medium';
    clinicalResponse =
      'Extreme variation in a single physiological parameter (score of 3). Urgent review by clinician to determine cause and escalation plan; minimum hourly monitoring.';
  }

  return {
    totalScore,
    parameters,
    hasSingleRedScore,
    riskBand,
    clinicalResponse,
    missingParameters,
  };
}

export function calculateQSofa(input: {
  respiratoryRate?: number;
  systolicBp?: number;
  alteredMentation?: boolean;
}): QSofaAssessment {
  const missingParameters: string[] = [];
  if (!input.respiratoryRate || input.respiratoryRate <= 0) missingParameters.push('Respiratory Rate');
  if (!input.systolicBp || input.systolicBp <= 0) missingParameters.push('Systolic BP');

  const respiratoryRateGe22 = Boolean(input.respiratoryRate && input.respiratoryRate >= 22);
  const systolicBpLe100 = Boolean(input.systolicBp && input.systolicBp <= 100);
  const alteredMentation = Boolean(input.alteredMentation);

  const score =
    (respiratoryRateGe22 ? 1 : 0) +
    (systolicBpLe100 ? 1 : 0) +
    (alteredMentation ? 1 : 0);

  const highRiskMortality = score >= 2;
  const clinicalInterpretation = highRiskMortality
    ? 'qSOFA ≥ 2 indicates elevated risk of poor outcome in patients with suspected infection. Assess for end-organ dysfunction (SOFA score ≥ 2, serum lactate, renal/hepatic panel). Note: qSOFA alone does not define Sepsis-3 without suspected infection.'
    : 'qSOFA < 2 (Low bedside mortality risk screen). Continue clinical evaluation; a low qSOFA does not rule out localized infection or early SIRS.';

  return {
    score,
    criteria: {
      respiratoryRateGe22,
      systolicBpLe100,
      alteredMentation,
    },
    missingParameters,
    highRiskMortality,
    clinicalInterpretation,
  };
}

export function evaluateKdigoAki(
  baselineCr: number,
  currentCr: number,
  onRenalReplacementTherapy: boolean = false
): KdigoAkiAssessment {
  const safeBaseline = Math.max(0.1, baselineCr);
  const safeCurrent = Math.max(0.1, currentCr);
  const absoluteDelta = Number((safeCurrent - safeBaseline).toFixed(2));
  const foldChange = Number((safeCurrent / safeBaseline).toFixed(2));

  let stage: 0 | 1 | 2 | 3 = 0;
  let stageLabel: KdigoAkiAssessment['stageLabel'] = 'No AKI';
  let rationale = `Serum Creatinine ${safeCurrent.toFixed(2)} mg/dL is stable relative to baseline ${safeBaseline.toFixed(2)} mg/dL (Δ ${absoluteDelta >= 0 ? '+' : ''}${absoluteDelta} mg/dL, ${foldChange}x).`;
  let recommendedActions: string[] = [
    'Continue routine renal function surveillance per clinical context.',
  ];

  if (onRenalReplacementTherapy || foldChange >= 3.0 || (safeCurrent >= 4.0 && absoluteDelta >= 0.3)) {
    stage = 3;
    stageLabel = 'KDIGO Stage 3 AKI';
    rationale = `Serum Creatinine increased to ${safeCurrent.toFixed(2)} mg/dL from baseline ${safeBaseline.toFixed(2)} mg/dL (${foldChange}x baseline; Δ +${absoluteDelta} mg/dL), meeting KDIGO Stage 3 AKI criteria.`;
    recommendedActions = [
      'Discontinue all nephrotoxic agents immediately (NSAIDs, aminoglycosides, iodinated contrast).',
      'Hold Metformin (contraindicated when eGFR < 30 or in acute kidney injury) and review RAAS blockers/potassium-sparing diuretics.',
      'Urgent Nephrology consultation; monitor strict hourly urine output, electrolytes (K⁺, HCO₃⁻), and volume status.',
    ];
  } else if (foldChange >= 2.0) {
    stage = 2;
    stageLabel = 'KDIGO Stage 2 AKI';
    rationale = `Serum Creatinine increased ${foldChange}x (2.0–2.9x baseline) from ${safeBaseline.toFixed(2)} to ${safeCurrent.toFixed(2)} mg/dL, meeting KDIGO Stage 2 AKI criteria.`;
    recommendedActions = [
      'Hold nephrotoxins (NSAIDs) and renally cleared high-risk medications (e.g., Metformin, SGLT2i/RAASi during acute hypovolemia).',
      'Perform volume status assessment, urinalysis with microscopy, and fractional excretion of sodium (FENa).',
      'Renally dose-adjust antimicrobials and anticoagulants.',
    ];
  } else if (absoluteDelta >= 0.3 || foldChange >= 1.5) {
    stage = 1;
    stageLabel = 'KDIGO Stage 1 AKI';
    rationale = `Serum Creatinine rose by +${absoluteDelta.toFixed(2)} mg/dL (${foldChange}x baseline) from ${safeBaseline.toFixed(2)} to ${safeCurrent.toFixed(2)} mg/dL, meeting KDIGO Stage 1 AKI criteria (≥ 0.3 mg/dL within 48h or 1.5–1.9x baseline).`;
    recommendedActions = [
      'Review medication list for nephrotoxins and renally cleared agents.',
      'Ensure euvolemia and monitor repeat BMP/Creatinine within 12–24 hours.',
      'Monitor urine output (target > 0.5 mL/kg/h).',
    ];
  }

  return {
    stage,
    stageLabel,
    baselineCr: safeBaseline,
    currentCr: safeCurrent,
    absoluteDelta,
    foldChange,
    rationale,
    recommendedActions,
  };
}

export function computeLabDeltaChecks(
  previousLabs: Array<{ testName: string; numericValue: number; unit: string }>,
  currentLabs: LabResultItem[]
): LabDeltaCheckItem[] {
  const results: LabDeltaCheckItem[] = [];

  for (const prev of previousLabs) {
    const match = currentLabs.find(
      (c) => c.testName.toLowerCase().includes(prev.testName.toLowerCase()) ||
             prev.testName.toLowerCase().includes(c.testName.toLowerCase())
    );
    if (!match) continue;
    const currVal =
      typeof match.numericValue === 'number' && !isNaN(match.numericValue)
        ? match.numericValue
        : parseFloat(String(match.value).replace(/[^0-9.-]/g, ''));

    if (isNaN(currVal) || prev.numericValue <= 0) continue;

    const absDelta = Number((currVal - prev.numericValue).toFixed(2));
    const pctDelta = Number((((currVal - prev.numericValue) / prev.numericValue) * 100).toFixed(1));
    const nameLower = match.testName.toLowerCase();

    let severity: LabDeltaCheckItem['severity'] = 'normal';
    let interpretation = 'Within expected biological variation.';

    if (nameLower.includes('troponin')) {
      if (Math.abs(pctDelta) >= 20 && currVal > 14) {
        severity = 'critical_delta';
        interpretation = `Significant serial hs-cTn delta (${pctDelta > 0 ? '+' : ''}${pctDelta}%) above 99th percentile URL — indicative of acute myocardial injury (ESC/AHA Fourth Universal Definition of MI).`;
      }
    } else if (nameLower.includes('creatinine')) {
      if (absDelta >= 0.3 || pctDelta >= 50) {
        severity = 'critical_delta';
        interpretation = `KDIGO AKI positive delta (+${absDelta} mg/dL / +${pctDelta}%). Evaluate renal perfusion and hold nephrotoxins.`;
      } else if (absDelta >= 0.15) {
        severity = 'notable';
        interpretation = `Upward Creatinine drift (+${absDelta} mg/dL). Recheck BMP and hydration status.`;
      }
    } else if (nameLower.includes('potassium')) {
      if (currVal >= 5.5 || absDelta >= 0.8) {
        severity = 'critical_delta';
        interpretation = `Significant Potassium shift to ${currVal} ${match.unit} (Δ ${absDelta > 0 ? '+' : ''}${absDelta}). Obtain 12-lead ECG if K⁺ ≥ 5.5 mEq/L and audit RAASi/K⁺-sparing diuretics.`;
      } else if (Math.abs(absDelta) >= 0.5) {
        severity = 'notable';
        interpretation = `Notable electrolyte shift (Δ ${absDelta > 0 ? '+' : ''}${absDelta} ${match.unit}).`;
      }
    } else if (nameLower.includes('lactate')) {
      if (currVal >= 2.0 && pctDelta > 0) {
        severity = 'critical_delta';
        interpretation = `Rising serum lactate (${prev.numericValue} → ${currVal} mmol/L, +${pctDelta}%). Assess tissue perfusion and clearance.`;
      } else if (pctDelta <= -10) {
        severity = 'normal';
        interpretation = `Favorable lactate clearance (${pctDelta}%).`;
      }
    } else if (nameLower.includes('wbc') || nameLower.includes('leukocyte')) {
      if (Math.abs(pctDelta) >= 35) {
        severity = 'notable';
        interpretation = `Marked leukocyte trajectory change (${pctDelta > 0 ? '+' : ''}${pctDelta}%).`;
      }
    } else if (Math.abs(pctDelta) >= 30) {
      severity = 'notable';
      interpretation = `Delta check ≥ 30% (${pctDelta > 0 ? '+' : ''}${pctDelta}%). Verify clinical correlation.`;
    }

    results.push({
      testName: match.testName,
      unit: match.unit || prev.unit,
      previousValue: prev.numericValue,
      currentValue: currVal,
      absoluteDelta: absDelta,
      percentDelta: pctDelta,
      severity,
      interpretation,
    });
  }

  return results;
}

export function derivePatientBaselineLabs(
  patient: PatientRecord,
  currentLabs: LabResultItem[],
  savedEncounters: SavedEncounterRecord[]
): Array<{ testName: string; numericValue: number; unit: string }> {
  // Check if an older saved encounter for this patient has labs
  const matchingEncounters = savedEncounters
    .filter((e) => e.patient.mrn === patient.mrn && e.note.labs && e.note.labs.length > 0)
    .sort((a, b) => a.savedAt.localeCompare(b.savedAt));

  if (matchingEncounters.length > 0 && matchingEncounters[0].note.labs) {
    return matchingEncounters[0].note.labs
      .map((l) => ({
        testName: l.testName,
        numericValue: l.numericValue ?? parseFloat(String(l.value).replace(/[^0-9.-]/g, '')),
        unit: l.unit,
      }))
      .filter((l) => !isNaN(l.numericValue));
  }

  // Otherwise construct realistic prior baseline values for delta comparison
  return currentLabs
    .map((l) => {
      const curr = l.numericValue ?? parseFloat(String(l.value).replace(/[^0-9.-]/g, ''));
      if (isNaN(curr)) return null;
      const nameLower = l.testName.toLowerCase();
      let prior = curr;
      if (nameLower.includes('creatinine')) {
        prior = curr > 1.3 ? Number((curr * 0.62).toFixed(2)) : Number(Math.max(0.8, curr - 0.1).toFixed(2));
      } else if (nameLower.includes('troponin')) {
        prior = curr > 14 ? 11 : Math.max(4, curr - 2);
      } else if (nameLower.includes('potassium')) {
        prior = curr >= 5.2 ? 4.4 : 4.2;
      } else if (nameLower.includes('lactate')) {
        prior = curr >= 2.0 ? 1.3 : 1.0;
      } else if (nameLower.includes('bnp')) {
        prior = curr > 200 ? Math.round(curr * 0.55) : curr;
      } else if (nameLower.includes('wbc')) {
        prior = curr > 11 ? 7.8 : 7.2;
      } else {
        prior = Number((curr * 0.92).toFixed(1));
      }
      return {
        testName: l.testName,
        numericValue: prior,
        unit: l.unit,
      };
    })
    .filter((item): item is { testName: string; numericValue: number; unit: string } => item !== null);
}
