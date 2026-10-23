export interface AbgElectrolyteInput {
  ph: number;
  paco2: number; // mmHg
  hco3: number; // mEq/L
  pao2?: number; // mmHg
  fio2?: number; // fraction e.g. 0.21
  sodium?: number; // mEq/L
  chloride?: number; // mEq/L
  albumin?: number; // g/dL (default 4.0)
  lactate?: number; // mmol/L
}

export interface AbgInterpretationResult {
  acidemiaOrAlkalemia: 'Acidemia' | 'Alkalemia' | 'Normal pH (Euhydremia / Compensated)';
  primaryDisorder: string;
  compensationAssessment: string;
  wintersExpectedPaco2?: { min: number; max: number; center: number };
  anionGap?: number;
  albuminCorrectedAnionGap?: number;
  deltaDeltaRatio?: number;
  deltaDeltaInterpretation?: string;
  pfRatio?: number;
  oxygenationStatus?: string;
  clinicalDifferentials: string[];
  soapSummaryLine: string;
}

export interface EcgParametersInput {
  heartRate: number;
  rhythm: 'Normal Sinus Rhythm' | 'Sinus Tachycardia' | 'Atrial Fibrillation' | 'Supraventricular Tachycardia' | 'Ventricular Tachycardia' | 'Sinus Bradycardia';
  prIntervalMs: number;
  qrsDurationMs: number;
  qtIntervalMs: number;
  stElevationLeads: Array<'V1-V2 (Septal)' | 'V3-V4 (Anterior)' | 'I, aVL, V5-V6 (Lateral)' | 'II, III, aVF (Inferior)'>;
  tWaveAbnormalities: 'None' | 'Peaked Hyperacute T-Waves' | 'Deep Symmetric T-Wave Inversions' | 'Flattened T-Waves / U-Waves';
}

export interface EcgInterpretationResult {
  qtcBazettMs: number;
  qtcFridericiaMs: number;
  qtcStatus: 'Normal QTc' | 'Borderline QTc Prolongation' | 'Severe QTc Prolongation (Torsades Risk ≥ 500 ms)';
  culpritTerritory?: string;
  stemiAlert: boolean;
  conductionFindings: string[];
  clinicalActionPlan: string[];
  soapObjectiveInsert: string;
}

export const ABG_CLINICAL_PRESETS: Record<string, { label: string; description: string; input: AbgElectrolyteInput }> = {
  mala_dka_hagma: {
    label: 'High-Anion Gap Metabolic Acidosis (MALA / DKA)',
    description: 'pH 7.21, PaCO2 24 mmHg, HCO3- 10 mEq/L, Na+ 138, Cl- 98, Lactate 6.4 mmol/L',
    input: {
      ph: 7.21,
      paco2: 24,
      hco3: 10,
      pao2: 92,
      fio2: 0.21,
      sodium: 138,
      chloride: 98,
      albumin: 3.6,
      lactate: 6.4,
    },
  },
  copd_acute_on_chronic: {
    label: 'Acute-on-Chronic Respiratory Acidosis (COPD Exacerbation)',
    description: 'pH 7.28, PaCO2 68 mmHg, HCO3- 31 mEq/L, PaO2 58 mmHg on 28% FiO2',
    input: {
      ph: 7.28,
      paco2: 68,
      hco3: 31,
      pao2: 58,
      fio2: 0.28,
      sodium: 140,
      chloride: 97,
      albumin: 3.8,
      lactate: 1.4,
    },
  },
  sepsis_mixed_hagma_resp_alk: {
    label: 'Mixed HAGMA + Primary Respiratory Alkalosis (Early Sepsis / Salicylate)',
    description: 'pH 7.42, PaCO2 20 mmHg, HCO3- 13 mEq/L, Na+ 140, Cl- 102, Lactate 4.2 mmol/L',
    input: {
      ph: 7.42,
      paco2: 20,
      hco3: 13,
      pao2: 74,
      fio2: 0.32,
      sodium: 140,
      chloride: 102,
      albumin: 3.2,
      lactate: 4.2,
    },
  },
};

export function interpretAbgAndElectrolytes(input: AbgElectrolyteInput): AbgInterpretationResult {
  const { ph, paco2, hco3 } = input;
  const albumin = input.albumin !== undefined && input.albumin > 0 ? input.albumin : 4.0;

  let acidemiaOrAlkalemia: AbgInterpretationResult['acidemiaOrAlkalemia'] = 'Normal pH (Euhydremia / Compensated)';
  if (ph < 7.35) acidemiaOrAlkalemia = 'Acidemia';
  else if (ph > 7.45) acidemiaOrAlkalemia = 'Alkalemia';

  // Anion Gap calculation
  let anionGap: number | undefined;
  let albuminCorrectedAnionGap: number | undefined;
  let deltaDeltaRatio: number | undefined;
  let deltaDeltaInterpretation: string | undefined;

  if (input.sodium !== undefined && input.chloride !== undefined && input.sodium > 0 && input.chloride > 0) {
    anionGap = Number((input.sodium - (input.chloride + hco3)).toFixed(1));
    albuminCorrectedAnionGap = Number((anionGap + 2.5 * (4.0 - albumin)).toFixed(1));

    if (albuminCorrectedAnionGap > 12 && hco3 < 24) {
      const deltaAg = albuminCorrectedAnionGap - 12;
      const deltaHco3 = 24 - hco3;
      if (deltaHco3 > 0) {
        deltaDeltaRatio = Number((deltaAg / deltaHco3).toFixed(2));
        if (deltaDeltaRatio < 1.0) {
          deltaDeltaInterpretation = `Delta AG / Delta HCO3- = ${deltaDeltaRatio} (< 1.0): Combined High-Anion Gap + Non-Anion Gap (Hyperchloremic) Metabolic Acidosis.`;
        } else if (deltaDeltaRatio <= 2.0) {
          deltaDeltaInterpretation = `Delta AG / Delta HCO3- = ${deltaDeltaRatio} (1.0–2.0): Pure High-Anion Gap Metabolic Acidosis (HAGMA).`;
        } else {
          deltaDeltaInterpretation = `Delta AG / Delta HCO3- = ${deltaDeltaRatio} (> 2.0): High-Anion Gap Metabolic Acidosis with concurrent Metabolic Alkalosis (or chronic respiratory acidosis compensation).`;
        }
      }
    }
  }

  let primaryDisorder = 'Normal Acid-Base Homeostasis';
  let compensationAssessment = 'pH, PaCO2, and HCO3- are within physiological reference ranges.';
  let wintersExpectedPaco2: { min: number; max: number; center: number } | undefined;
  const clinicalDifferentials: string[] = [];

  const isHagma = albuminCorrectedAnionGap !== undefined && albuminCorrectedAnionGap > 12;

  if (hco3 < 22 && (ph < 7.35 || isHagma || paco2 < 35)) {
    // Primary Metabolic Acidosis (or Mixed)
    primaryDisorder = isHagma
      ? 'High-Anion Gap Metabolic Acidosis (HAGMA)'
      : 'Non-Anion Gap (Hyperchloremic) Metabolic Acidosis (NAGMA)';

    const center = Number((1.5 * hco3 + 8).toFixed(1));
    const min = Number((center - 2).toFixed(1));
    const max = Number((center + 2).toFixed(1));
    wintersExpectedPaco2 = { min, max, center };

    if (paco2 < min) {
      primaryDisorder += ' + Concurrent Primary Respiratory Alkalosis';
      compensationAssessment = `Winter’s Formula predicts PaCO2 ${min}–${max} mmHg; measured PaCO2 (${paco2} mmHg) is lower than expected, indicating a coexisting Primary Respiratory Alkalosis.`;
    } else if (paco2 > max) {
      primaryDisorder += ' + Concurrent Primary Respiratory Acidosis';
      compensationAssessment = `Winter’s Formula predicts PaCO2 ${min}–${max} mmHg; measured PaCO2 (${paco2} mmHg) is higher than expected, indicating inadequate ventilatory compensation / coexisting Primary Respiratory Acidosis.`;
    } else {
      compensationAssessment = `Appropriate respiratory compensation by Winter’s Formula (Expected PaCO2 ${min}–${max} mmHg; Measured ${paco2} mmHg).`;
    }

    if (isHagma) {
      if (input.lactate && input.lactate >= 2.0) {
        clinicalDifferentials.push(
          `Lactic Acidosis (Lactate ${input.lactate} mmol/L): Evaluate for tissue hypoperfusion/sepsis or Metformin-Associated Lactic Acidosis (MALA) if eGFR < 30.`
        );
      }
      clinicalDifferentials.push(
        'GOLD MARK Differentials: Glycols, Oxoproline, L-Lactate, D-Lactate, Methanol, Aspirin (Salicylates), Renal Failure (Uremia), Ketoacidosis (DKA/Alcoholic).'
      );
    } else {
      clinicalDifferentials.push(
        'NAGMA Differentials: GI bicarbonate loss (diarrhea), Renal Tubular Acidosis (RTA), or excessive 0.9% Normal Saline chloride load.'
      );
    }
  } else if (paco2 > 45 && ph < 7.35) {
    primaryDisorder = 'Primary Respiratory Acidosis';
    const expectedAcuteHco3 = 24 + 0.1 * (paco2 - 40);
    const expectedChronicHco3 = 24 + 0.35 * (paco2 - 40);
    if (Math.abs(hco3 - expectedChronicHco3) < Math.abs(hco3 - expectedAcuteHco3) && hco3 >= 28) {
      primaryDisorder = 'Acute-on-Chronic (or Chronic) Respiratory Acidosis';
      compensationAssessment = `Elevated HCO3- (${hco3} mEq/L) reflects renal bicarbonate retention (Expected chronic HCO3- ~ ${expectedChronicHco3.toFixed(1)} mEq/L).`;
    } else {
      primaryDisorder = 'Acute Uncompensated Respiratory Acidosis';
      compensationAssessment = `Acute CO2 retention (Expected acute HCO3- ~ ${expectedAcuteHco3.toFixed(1)} mEq/L; Measured ${hco3} mEq/L).`;
    }
    clinicalDifferentials.push(
      'Hypoventilation Etiologies: COPD/Asthma exacerbation, opioid/sedative respiratory depression, neuromuscular weakness, or obesity hypoventilation.'
    );
  } else if (hco3 > 26 && ph > 7.45) {
    primaryDisorder = 'Primary Metabolic Alkalosis';
    const expectedPaco2 = Number((0.7 * (hco3 - 24) + 40).toFixed(1));
    compensationAssessment = `Expected compensatory PaCO2 ~ ${expectedPaco2} +/- 5 mmHg (Measured ${paco2} mmHg).`;
    clinicalDifferentials.push(
      'Metabolic Alkalosis Etiologies: Loop/thiazide diuretic contraction alkalosis, nasogastric suction/emesis, or mineralocorticoid excess.'
    );
  } else if (paco2 < 35 && ph > 7.45) {
    primaryDisorder = 'Primary Respiratory Alkalosis';
    compensationAssessment = `Hyperventilation lowering PaCO2 to ${paco2} mmHg.`;
    clinicalDifferentials.push(
      'Hyperventilation Etiologies: Hypoxemia, pulmonary embolism, early sepsis, pain/anxiety, or salicylate toxicity.'
    );
  }

  let pfRatio: number | undefined;
  let oxygenationStatus: string | undefined;
  if (input.pao2 && input.fio2 && input.fio2 > 0) {
    pfRatio = Math.round(input.pao2 / input.fio2);
    if (pfRatio < 100) oxygenationStatus = `P/F Ratio ${pfRatio} mmHg (< 100: Severe Hypoxemic Respiratory Failure / ARDS range)`;
    else if (pfRatio < 200) oxygenationStatus = `P/F Ratio ${pfRatio} mmHg (100–199: Moderate Hypoxemia / ARDS range)`;
    else if (pfRatio < 300) oxygenationStatus = `P/F Ratio ${pfRatio} mmHg (200–299: Mild Hypoxemia / Impaired Gas Exchange)`;
    else oxygenationStatus = `P/F Ratio ${pfRatio} mmHg (>= 300: Preserved Alveolar Oxygenation)`;
  }

  const agText =
    albuminCorrectedAnionGap !== undefined
      ? `, AG ${anionGap} (Albumin-corrected AG ${albuminCorrectedAnionGap})`
      : '';
  const wintersText = wintersExpectedPaco2
    ? ` [Winter's Expected PaCO2: ${wintersExpectedPaco2.min}–${wintersExpectedPaco2.max} mmHg]`
    : '';

  const soapSummaryLine = `ABG & Acid-Base Interpretation: pH ${ph.toFixed(2)} / PaCO2 ${paco2} mmHg / HCO3- ${hco3} mEq/L${agText}${input.lactate ? ` / Lactate ${input.lactate} mmol/L` : ''} -> ${primaryDisorder}. ${compensationAssessment}${wintersText}`;

  return {
    acidemiaOrAlkalemia,
    primaryDisorder,
    compensationAssessment,
    wintersExpectedPaco2,
    anionGap,
    albuminCorrectedAnionGap,
    deltaDeltaRatio,
    deltaDeltaInterpretation,
    pfRatio,
    oxygenationStatus,
    clinicalDifferentials,
    soapSummaryLine,
  };
}

export function interpret12LeadEcg(input: EcgParametersInput): EcgInterpretationResult {
  const hr = Math.max(20, input.heartRate);
  const rrSec = 60 / hr;
  const qtcBazettMs = Math.round(input.qtIntervalMs / Math.sqrt(rrSec));
  const qtcFridericiaMs = Math.round(input.qtIntervalMs / Math.cbrt(rrSec));

  let qtcStatus: EcgInterpretationResult['qtcStatus'] = 'Normal QTc';
  if (qtcBazettMs >= 500) {
    qtcStatus = 'Severe QTc Prolongation (Torsades Risk ≥ 500 ms)';
  } else if (qtcBazettMs >= 460) {
    qtcStatus = 'Borderline QTc Prolongation';
  }

  const conductionFindings: string[] = [];
  if (input.prIntervalMs > 200) {
    conductionFindings.push(`First-Degree AV Block (PR ${input.prIntervalMs} ms > 200 ms)`);
  } else if (input.prIntervalMs > 0 && input.prIntervalMs < 120) {
    conductionFindings.push(`Short PR Interval (${input.prIntervalMs} ms < 120 ms — evaluate for pre-excitation)`);
  }

  if (input.qrsDurationMs >= 120) {
    conductionFindings.push(`Wide QRS Complex / Bundle Branch Block Delay (QRS ${input.qrsDurationMs} ms ≥ 120 ms)`);
  }

  const stemiAlert = input.stElevationLeads.length > 0;
  let culpritTerritory: string | undefined;

  if (stemiAlert) {
    const territories: string[] = [];
    if (input.stElevationLeads.includes('V1-V2 (Septal)') || input.stElevationLeads.includes('V3-V4 (Anterior)')) {
      territories.push('Anterior / Anteroseptal Wall (Left Anterior Descending [LAD] Coronary Artery)');
    }
    if (input.stElevationLeads.includes('II, III, aVF (Inferior)')) {
      territories.push('Inferior Wall (Right Coronary Artery [RCA] / Left Circumflex) — obtain right-sided V4R and avoid nitrates if RV infarction present');
    }
    if (input.stElevationLeads.includes('I, aVL, V5-V6 (Lateral)')) {
      territories.push('Lateral Wall (Left Circumflex [LCx] / Diagonal Branch)');
    }
    culpritTerritory = territories.join('; ');
  }

  const clinicalActionPlan: string[] = [];
  if (stemiAlert) {
    clinicalActionPlan.push(
      `STAT STEMI Alert (${input.stElevationLeads.join(', ')}): Immediate interventional cardiology / Cath Lab activation (door-to-balloon target < 90 min), chewed Aspirin 325 mg, P2Y12 loading, and unfractionated heparin.`
    );
  }
  if (input.tWaveAbnormalities === 'Peaked Hyperacute T-Waves') {
    clinicalActionPlan.push(
      'Peaked T-Waves: Stat serum Potassium check (rule out hyperkalemia; administer IV Calcium Gluconate if K⁺ ≥ 6.0 with ECG changes) vs hyperacute early myocardial ischemia.'
    );
  }
  if (qtcBazettMs >= 500) {
    clinicalActionPlan.push(
      `Severe QTc Prolongation (${qtcBazettMs} ms Bazett / ${qtcFridericiaMs} ms Fridericia): Hold QT-prolonging drugs (macrolides, fluoroquinolones, ondansetron, antipsychotics) and replete K⁺ > 4.0 mEq/L & Mg²⁺ > 2.0 mg/dL.`
    );
  }
  if (clinicalActionPlan.length === 0) {
    clinicalActionPlan.push('Compare with prior baseline 12-lead ECG and correlate clinically with serial hs-Troponin if chest pain or dyspnea present.');
  }

  const soapObjectiveInsert = `12-Lead ECG Interpretation: ${input.rhythm}, Rate ${hr} bpm, PR ${input.prIntervalMs} ms, QRS ${input.qrsDurationMs} ms, QT/QTc (Bazett) ${input.qtIntervalMs}/${qtcBazettMs} ms (Fridericia ${qtcFridericiaMs} ms — ${qtcStatus}). ST-Segment: ${stemiAlert ? `ST-Elevation in ${input.stElevationLeads.join(', ')} (${culpritTerritory})` : 'Isoelectric, no acute ST-elevation'}. T-Waves: ${input.tWaveAbnormalities}.${conductionFindings.length ? ` Conduction: ${conductionFindings.join(', ')}.` : ''}`;

  return {
    qtcBazettMs,
    qtcFridericiaMs,
    qtcStatus,
    culpritTerritory,
    stemiAlert,
    conductionFindings,
    clinicalActionPlan,
    soapObjectiveInsert,
  };
}
