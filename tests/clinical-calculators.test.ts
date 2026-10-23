import {
  calculateHeartScore,
  calculateCha2ds2Vasc,
  calculateCurb65,
  calculateEgfr,
  calculateAlvarado,
} from '../src/utils/clinicalCalculators';

export function runClinicalCalculatorTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // 1. HEART Score Calculation Test
  try {
    // Low risk case: history=1, ecg=0, age=0, risk=1, trop=0 -> score = 2
    const lowRisk = calculateHeartScore({
      history: 1,
      ecg: 0,
      age: 0,
      riskFactors: 1,
      troponin: 0,
    });
    // High risk case: history=2, ecg=2, age=2, risk=2, trop=1 -> score = 9
    const highRisk = calculateHeartScore({
      history: 2,
      ecg: 2,
      age: 2,
      riskFactors: 2,
      troponin: 1,
    });

    if (lowRisk.score === 2 && lowRisk.riskCategory === 'Low Risk' && highRisk.score === 9 && highRisk.riskCategory === 'High Risk') {
      results.push({ name: 'HEART Score: Stratification (Low vs High Risk MACE) Accurate', passed: true });
    } else {
      results.push({
        name: 'HEART Score: Stratification Accurate',
        passed: false,
        details: `Unexpected score: low=${lowRisk.score} (${lowRisk.riskCategory}), high=${highRisk.score} (${highRisk.riskCategory})`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'HEART Score Calculation', passed: false, details: err.message });
  }

  // 2. CHA2DS2-VASc Stroke Risk Test
  try {
    // 70yo male with HTN, CHF, Diabetes -> CHF(1) + HTN(1) + Age65-74(1) + DM(1) = 4
    const afibPt = calculateCha2ds2Vasc({
      chf: true,
      hypertension: true,
      age: 70,
      diabetes: true,
      stroke: false,
      vascularDisease: false,
      isFemale: false,
    });
    if (afibPt.score === 4 && afibPt.recommendation.includes('Oral anticoagulation strongly recommended')) {
      results.push({ name: 'CHA2DS2-VASc Score: Atrial Fibrillation Anticoagulation Guideline Compliant', passed: true });
    } else {
      results.push({
        name: 'CHA2DS2-VASc Score Compliant',
        passed: false,
        details: `Expected score 4 and oral anticoagulation recommendation, got ${afibPt.score}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'CHA2DS2-VASc Score', passed: false, details: err.message });
  }

  // 3. CURB-65 Pneumonia Severity Test
  try {
    // 68yo, RR 32, BUN 24 mg/dL -> age(1) + RR(1) + BUN(1) = 3
    const capPt = calculateCurb65({
      confusion: false,
      bunOver19: true,
      respiratoryRateOver30: true,
      hypotension: false,
      age65OrOlder: true,
    });
    if (capPt.score === 3 && capPt.dispositionRecommendation.includes('inpatient hospital admission')) {
      results.push({ name: 'CURB-65 Score: Pneumonia Inpatient Triage Stratified', passed: true });
    } else {
      results.push({
        name: 'CURB-65 Score',
        passed: false,
        details: `Expected score 3 and inpatient admission recommendation, got ${capPt.score}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'CURB-65 Score', passed: false, details: err.message });
  }

  // 4. eGFR (CKD-EPI) & CrCl Test
  try {
    // 55yo male with Cr 1.4 mg/dL, weight 80 kg
    const renalResult = calculateEgfr({
      serumCreatinine: 1.4,
      age: 55,
      isFemale: false,
      weightKg: 80,
    });
    // eGFR should be Stage 3a or 2 and Cockcroft-Gault computed
    if (renalResult.egfrCkdEpi > 40 && renalResult.egfrCkdEpi < 75 && renalResult.crClCockcroftGault) {
      results.push({ name: 'eGFR (CKD-EPI 2021) & Cockcroft-Gault Creatinine Clearance Computed', passed: true });
    } else {
      results.push({
        name: 'eGFR and CrCl Computed',
        passed: false,
        details: `Unexpected renal values: eGFR=${renalResult.egfrCkdEpi}, CrCl=${renalResult.crClCockcroftGault}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'eGFR Calculation', passed: false, details: err.message });
  }

  // 5. Alvarado Appendicitis Score Test
  try {
    // Migratory pain (1), anorexia (1), nausea (1), RLQ tenderness (2), rebound (1), leukocytosis (2) -> 8
    const appPt = calculateAlvarado({
      migratoryPain: true,
      anorexia: true,
      nauseaVomiting: true,
      rlqTenderness: true,
      reboundTenderness: true,
      elevatedTemperature: false,
      leukocytosis: true,
      neutrophilicShift: false,
    });
    if (appPt.score === 8 && appPt.probability.includes('High probability')) {
      results.push({ name: 'Alvarado Score: High Probability Acute Appendicitis Flagged', passed: true });
    } else {
      results.push({
        name: 'Alvarado Score',
        passed: false,
        details: `Expected score 8 with high probability, got ${appPt.score}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Alvarado Score', passed: false, details: err.message });
  }

  return results;
}
