/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientRecord, SoapNote, LabResultItem } from '../types/clinical';
import { parseBloodPressure } from './vitalsParser';

export interface HeartScoreInputs {
  history: 0 | 1 | 2; // 0: slightly suspicious, 1: moderately suspicious, 2: highly suspicious
  ecg: 0 | 1 | 2; // 0: normal, 1: non-specific repolarization disturbance, 2: significant ST-segment deviation
  age: 0 | 1 | 2; // 0: <45, 1: 45-64, 2: >=65
  riskFactors: 0 | 1 | 2; // 0: no known risk factors, 1: 1-2 risk factors, 2: >=3 risk factors or history of atherosclerotic disease
  troponin: 0 | 1 | 2; // 0: <= normal limit, 1: 1-3x normal limit, 2: >3x normal limit
}

export interface HeartScoreResult {
  score: number;
  riskCategory: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  sixWeekMaceRate: string;
  recommendation: string;
  evidenceSource: string;
}

export function calculateHeartScore(inputs: HeartScoreInputs): HeartScoreResult {
  const score = inputs.history + inputs.ecg + inputs.age + inputs.riskFactors + inputs.troponin;
  if (score <= 3) {
    return {
      score,
      riskCategory: 'Low Risk',
      sixWeekMaceRate: '1.7% Major Adverse Cardiac Event (MACE) risk',
      recommendation:
        'Supports safe consideration for early outpatient discharge and non-invasive provocative testing within 72 hours.',
      evidenceSource: 'Six et al., Chest 2008 & AHA/ACC 2021 Chest Pain Guidelines',
    };
  } else if (score <= 6) {
    return {
      score,
      riskCategory: 'Moderate Risk',
      sixWeekMaceRate: '16.6% Major Adverse Cardiac Event (MACE) risk',
      recommendation:
        'Indicates admission for clinical observation, continuous telemetry, serial high-sensitivity troponin assays (0/2-3hr), and non-invasive imaging.',
      evidenceSource: 'Six et al., Chest 2008 & AHA/ACC 2021 Chest Pain Guidelines',
    };
  } else {
    return {
      score,
      riskCategory: 'High Risk',
      sixWeekMaceRate: '50.1% Major Adverse Cardiac Event (MACE) risk',
      recommendation:
        'High likelihood of acute coronary syndrome. Recommend urgent cardiology consultation, aggressive medical therapy, and early invasive coronary angiography.',
      evidenceSource: 'Six et al., Chest 2008 & AHA/ACC 2021 Chest Pain Guidelines',
    };
  }
}

export interface Cha2ds2VascInputs {
  chf: boolean; // Congestive Heart Failure (+1)
  hypertension: boolean; // Hypertension (+1)
  age: number; // Age >=75 (+2), 65-74 (+1), <65 (0)
  diabetes: boolean; // Diabetes Mellitus (+1)
  stroke: boolean; // Prior Stroke / TIA / Thromboembolism (+2)
  vascularDisease: boolean; // Prior MI, PAD, or Aortic plaque (+1)
  isFemale: boolean; // Female Sex category (+1)
}

export interface Cha2ds2VascResult {
  score: number;
  annualStrokeRiskPercent: number;
  recommendation: string;
  guidelineSource: string;
}

export function calculateCha2ds2Vasc(inputs: Cha2ds2VascInputs): Cha2ds2VascResult {
  let score = 0;
  if (inputs.chf) score += 1;
  if (inputs.hypertension) score += 1;
  if (inputs.age >= 75) score += 2;
  else if (inputs.age >= 65) score += 1;
  if (inputs.diabetes) score += 1;
  if (inputs.stroke) score += 2;
  if (inputs.vascularDisease) score += 1;
  if (inputs.isFemale) score += 1;

  // Annual adjusted stroke rate table
  const strokeRates = [0.2, 0.6, 2.2, 3.2, 4.8, 7.2, 9.7, 11.2, 12.5, 15.2];
  const rate = strokeRates[Math.min(score, 9)];

  let recommendation = '';
  const isHighRisk = inputs.isFemale ? score >= 3 : score >= 2;
  const isIntermediateRisk = inputs.isFemale ? score === 2 : score === 1;

  if (isHighRisk) {
    recommendation =
      'Oral anticoagulation strongly recommended (Class I, Level A). Direct Oral Anticoagulant (DOAC: Apixaban, Rivaroxaban, Dabigatran) preferred over Warfarin unless mechanical heart valve or mitral stenosis is present.';
  } else if (isIntermediateRisk) {
    recommendation =
      'Oral anticoagulation should be considered (Class IIa, Level B) after assessing individualized bleeding risk (HAS-BLED) and patient values.';
  } else {
    recommendation =
      'Low stroke risk: Oral anticoagulation is generally not recommended (Class III Harm). Antiplatelet monotherapy is not protective against cardioembolic stroke.';
  }

  return {
    score,
    annualStrokeRiskPercent: rate,
    recommendation,
    guidelineSource: '2023 ACC/AHA/ACCP/HRS Guideline for the Management of Atrial Fibrillation',
  };
}

export interface Curb65Inputs {
  confusion: boolean; // Acute altered mental status / disorientation (+1)
  bunOver19: boolean; // BUN > 19 mg/dL (or urea > 7 mmol/L) (+1)
  respiratoryRateOver30: boolean; // RR >= 30 breaths/min (+1)
  hypotension: boolean; // SBP < 90 mmHg or DBP <= 60 mmHg (+1)
  age65OrOlder: boolean; // Age >= 65 (+1)
}

export interface Curb65Result {
  score: number;
  thirtyDayMortalityPercent: string;
  dispositionRecommendation: string;
  guidelineSource: string;
}

export function calculateCurb65(inputs: Curb65Inputs): Curb65Result {
  let score = 0;
  if (inputs.confusion) score += 1;
  if (inputs.bunOver19) score += 1;
  if (inputs.respiratoryRateOver30) score += 1;
  if (inputs.hypotension) score += 1;
  if (inputs.age65OrOlder) score += 1;

  if (score <= 1) {
    return {
      score,
      thirtyDayMortalityPercent: score === 0 ? '0.7% 30-day mortality' : '2.1% 30-day mortality',
      dispositionRecommendation:
        'Low risk: Appropriate for outpatient management with oral antimicrobial therapy, close safety net follow-up in 48-72h, and return precautions.',
      guidelineSource: 'British Thoracic Society (BTS) & ATS/IDSA Community-Acquired Pneumonia Guidelines',
    };
  } else if (score === 2) {
    return {
      score,
      thirtyDayMortalityPercent: '9.2% 30-day mortality',
      dispositionRecommendation:
        'Moderate risk: Consider short inpatient hospital admission or supervised outpatient observation unit.',
      guidelineSource: 'British Thoracic Society (BTS) & ATS/IDSA Community-Acquired Pneumonia Guidelines',
    };
  } else {
    return {
      score,
      thirtyDayMortalityPercent: score === 3 ? '14.5% mortality' : score === 4 ? '40% mortality' : '57% mortality',
      dispositionRecommendation:
        'Severe pneumonia: Immediate inpatient hospital admission required. Evaluate for Intensive Care Unit (ICU) level monitoring if score >= 4 or septic shock.',
      guidelineSource: 'British Thoracic Society (BTS) & ATS/IDSA Community-Acquired Pneumonia Guidelines',
    };
  }
}

export interface EgfrInputs {
  serumCreatinine: number; // mg/dL
  age: number; // years
  isFemale: boolean;
  weightKg?: number; // for Cockcroft-Gault CrCl
}

export interface EgfrResult {
  egfrCkdEpi: number; // mL/min/1.73m2
  ckdStage: string;
  crClCockcroftGault?: number; // mL/min
  renalPrecautionAlerts: string[];
}

export function calculateEgfr(inputs: EgfrInputs): EgfrResult {
  const scr = Math.max(0.2, inputs.serumCreatinine);
  const age = Math.max(18, inputs.age);
  const isFemale = inputs.isFemale;

  const kappa = isFemale ? 0.7 : 0.9;
  const alpha = isFemale ? -0.241 : -0.302;
  const minRatio = Math.min(scr / kappa, 1);
  const maxRatio = Math.max(scr / kappa, 1);
  const genderMultiplier = isFemale ? 1.012 : 1.0;

  const egfr = Math.round(
    142 *
      Math.pow(minRatio, alpha) *
      Math.pow(maxRatio, -1.2) *
      Math.pow(0.9938, age) *
      genderMultiplier
  );

  let ckdStage = '';
  if (egfr >= 90) ckdStage = 'Stage 1: Normal or high renal function (>=90)';
  else if (egfr >= 60) ckdStage = 'Stage 2: Mildly decreased (60-89)';
  else if (egfr >= 45) ckdStage = 'Stage 3a: Mild-to-moderate decrease (45-59)';
  else if (egfr >= 30) ckdStage = 'Stage 3b: Moderate-to-severe decrease (30-44)';
  else if (egfr >= 15) ckdStage = 'Stage 4: Severely decreased (15-29)';
  else ckdStage = 'Stage 5: Kidney failure / End-stage renal disease (<15)';

  let crCl: number | undefined;
  if (inputs.weightKg && inputs.weightKg > 10) {
    const rawCrCl = ((140 - age) * inputs.weightKg) / (72 * scr);
    crCl = Math.round(isFemale ? rawCrCl * 0.85 : rawCrCl);
  }

  const renalPrecautionAlerts: string[] = [];
  if (egfr < 30) {
    renalPrecautionAlerts.push(
      'CRITICAL: Metformin is contraindicated at eGFR < 30 mL/min due to lactic acidosis hazard.'
    );
    renalPrecautionAlerts.push(
      'MRA Warning: Avoid Spironolactone / Eplerenone if eGFR < 30 mL/min or K+ > 5.0 mEq/L.'
    );
  } else if (egfr < 45) {
    renalPrecautionAlerts.push(
      'Dose Reduction: Cap Metformin at 1000 mg/day max (eGFR 30-44 mL/min). Monitor eGFR quarterly.'
    );
  }
  if (egfr < 20) {
    renalPrecautionAlerts.push(
      'SGLT2 Precaution: Do not initiate SGLT2 inhibitors (Empagliflozin/Dapagliflozin) at eGFR < 20 mL/min.'
    );
  }

  return {
    egfrCkdEpi: egfr,
    ckdStage,
    crClCockcroftGault: crCl,
    renalPrecautionAlerts,
  };
}

export interface AlvaradoInputs {
  migratoryPain: boolean;
  anorexia: boolean;
  nauseaVomiting: boolean;
  rlqTenderness: boolean;
  reboundTenderness: boolean;
  elevatedTemperature: boolean;
  leukocytosis: boolean;
  neutrophilicShift: boolean;
}

export interface AlvaradoResult {
  score: number;
  probability: string;
  recommendation: string;
  guidelineSource: string;
}

export function calculateAlvarado(inputs: AlvaradoInputs): AlvaradoResult {
  let score = 0;
  if (inputs.migratoryPain) score += 1;
  if (inputs.anorexia) score += 1;
  if (inputs.nauseaVomiting) score += 1;
  if (inputs.rlqTenderness) score += 2;
  if (inputs.reboundTenderness) score += 1;
  if (inputs.elevatedTemperature) score += 1;
  if (inputs.leukocytosis) score += 2;
  if (inputs.neutrophilicShift) score += 1;

  if (score <= 4) {
    return {
      score,
      probability: 'Low likelihood of acute appendicitis (<5%)',
      recommendation:
        'Appendicitis unlikely. Diagnostic imaging not routinely indicated; pursue alternative etiologies or safe outpatient follow-up.',
      guidelineSource: 'Alvarado A, Ann Emerg Med 1986 & WSES Jerusalem Guidelines 2020',
    };
  } else if (score <= 6) {
    return {
      score,
      probability: 'Equivocal / Moderate likelihood (approx 35-50%)',
      recommendation:
        'Equivocal presentation: Recommend contrast-enhanced CT of abdomen/pelvis (adults) or graded-compression ultrasound (pediatrics/pregnancy).',
      guidelineSource: 'Alvarado A, Ann Emerg Med 1986 & WSES Jerusalem Guidelines 2020',
    };
  } else {
    return {
      score,
      probability: 'High probability of acute appendicitis (>85-93%)',
      recommendation:
        'High probability of acute appendicitis. Urgent surgical consultation for appendectomy. Keep patient strictly NPO, administer IV crystalloid resuscitation and pre-op antibiotics.',
      guidelineSource: 'Alvarado A, Ann Emerg Med 1986 & WSES Jerusalem Guidelines 2020',
    };
  }
}

export function extractAutoPopulatedCalculatorInputs(
  patient: PatientRecord,
  note: SoapNote,
  labs: LabResultItem[] = []
) {
  const combinedText = `${patient.chiefComplaint || ''} ${note.subjective || ''} ${note.objective || ''} ${note.assessment || ''} ${note.plan || ''}`.toLowerCase();
  const vitals = patient.vitals || {};
  const { systolic, diastolic } = parseBloodPressure(vitals.bloodPressure);

  const agePts: 0 | 1 | 2 = patient.age >= 65 ? 2 : patient.age >= 45 ? 1 : 0;
  let ecgPts: 0 | 1 | 2 = 0;
  if (combinedText.includes('st elevation') || combinedText.includes('stemi') || combinedText.includes('st depression')) {
    ecgPts = 2;
  } else if (combinedText.includes('t-wave') || combinedText.includes('repolarization') || combinedText.includes('lvh')) {
    ecgPts = 1;
  }
  let historyPts: 0 | 1 | 2 = 1;
  if (combinedText.includes('radiation') && combinedText.includes('diaphoresis')) {
    historyPts = 2;
  }
  let tropPts: 0 | 1 | 2 = 0;
  const tropLab = labs.find((l) => l.testName.toLowerCase().includes('troponin'));
  if (tropLab && tropLab.flag === 'critical') tropPts = 2;
  else if (tropLab && tropLab.flag === 'high') tropPts = 1;

  const bunLab = labs.find((l) => l.testName.toLowerCase().includes('bun') || l.testName.toLowerCase().includes('urea'));
  const bunOver19 = Boolean((bunLab?.numericValue && bunLab.numericValue > 19) || (bunLab?.flag === 'high'));
  const rrOver30 = (vitals.respiratoryRate || 0) >= 30;
  const hypotension = (systolic !== null && systolic < 90) || (diastolic !== null && diastolic <= 60);

  const crLab = labs.find((l) => l.testName.toLowerCase().includes('creatinine'));
  const crVal = crLab?.numericValue || (crLab?.value ? parseFloat(crLab.value) : 1.0);

  const wbcLab = labs.find((l) => l.testName.toLowerCase().includes('wbc'));
  const wbcOver10 = Boolean((wbcLab?.numericValue && wbcLab.numericValue > 10.0) || wbcLab?.flag === 'high');

  return {
    heart: {
      history: historyPts,
      ecg: ecgPts,
      age: agePts,
      riskFactors: 1 as const,
      troponin: tropPts,
    },
    cha2ds2vasc: {
      chf: combinedText.includes('heart failure') || combinedText.includes('chf'),
      hypertension: combinedText.includes('hypertension') || (systolic !== null && systolic >= 130),
      age: patient.age || 60,
      diabetes: combinedText.includes('diabetes') || combinedText.includes('t2d'),
      stroke: combinedText.includes('stroke') || combinedText.includes('tia'),
      vascularDisease: combinedText.includes('cad') || combinedText.includes('infarction') || combinedText.includes('statin'),
      isFemale: patient.gender?.toLowerCase() === 'female',
    },
    curb65: {
      confusion: combinedText.includes('altered mental') || combinedText.includes('confusion') || combinedText.includes('disoriented'),
      bunOver19,
      respiratoryRateOver30: rrOver30,
      hypotension,
      age65OrOlder: patient.age >= 65,
    },
    egfr: {
      serumCreatinine: crVal > 0 ? crVal : 1.1,
      age: patient.age || 50,
      isFemale: patient.gender?.toLowerCase() === 'female',
      weightKg: vitals.weightKg || 70,
    },
    alvarado: {
      migratoryPain: combinedText.includes('migrat'),
      anorexia: combinedText.includes('anorexia') || combinedText.includes('appetite'),
      nauseaVomiting: combinedText.includes('nausea') || combinedText.includes('vomit'),
      rlqTenderness: combinedText.includes('rlq') || combinedText.includes('mcburney'),
      reboundTenderness: combinedText.includes('rebound') || combinedText.includes('guarding'),
      elevatedTemperature: Boolean(vitals.temperature && vitals.temperature.includes('38')),
      leukocytosis: wbcOver10,
      neutrophilicShift: combinedText.includes('neutrophil') || combinedText.includes('left shift'),
    },
  };
}
