import {
  runDrugSafetyDatabaseCheck,
  DETERMINISTIC_DRUG_INTERACTIONS,
  DETERMINISTIC_ALLERGY_RULES,
  DETERMINISTIC_RENAL_RULES,
  DETERMINISTIC_PREGNANCY_RULES,
  evaluateEmergencyRedFlags,
} from '../src/utils/drugSafetyEngine';

export function runClinicalSafetyTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: ACEi + NSAID Critical Interaction Detection
  try {
    const meds = ['Lisinopril 20mg daily', 'Ibuprofen 600mg TID'];
    const allergies: string[] = [];
    const alerts = runDrugSafetyDatabaseCheck(meds, allergies);

    const hasAceNsaidAlert = alerts.some(
      (a) =>
        a.severity === 'critical' &&
        (a.title.includes('ACEi') || a.title.includes('NSAID')) &&
        a.type === 'interaction'
    );

    if (hasAceNsaidAlert) {
      results.push({ name: 'ACEi + NSAID Critical Interaction Flagged', passed: true });
    } else {
      results.push({
        name: 'ACEi + NSAID Critical Interaction Flagged',
        passed: false,
        details: 'Failed to flag Lisinopril + Ibuprofen nephrotoxicity hazard.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'ACEi + NSAID Critical Interaction Flagged', passed: false, details: err.message });
  }

  // Test 2: Warfarin + Aspirin Bleeding Hazard Detection
  try {
    const meds = ['Warfarin 5mg daily', 'Aspirin 325mg daily'];
    const alerts = runDrugSafetyDatabaseCheck(meds, []);
    const hasBleedAlert = alerts.some(
      (a) => a.severity === 'critical' && a.title.toLowerCase().includes('warfarin')
    );
    if (hasBleedAlert) {
      results.push({ name: 'Warfarin + Aspirin Hemorrhage Warning Flagged', passed: true });
    } else {
      results.push({
        name: 'Warfarin + Aspirin Hemorrhage Warning Flagged',
        passed: false,
        details: 'Failed to detect Warfarin + Aspirin bleeding risk.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Warfarin + Aspirin Hemorrhage Warning Flagged', passed: false, details: err.message });
  }

  // Test 3: Penicillin Allergy Cross-Reactivity
  try {
    const meds = ['Amoxicillin 500mg TID'];
    const allergies = ['Penicillins'];
    const alerts = runDrugSafetyDatabaseCheck(meds, allergies);

    const hasAllergyAlert = alerts.some(
      (a) => a.type === 'allergy' && a.severity === 'critical' && a.title.includes('Penicillin')
    );

    if (hasAllergyAlert) {
      results.push({ name: 'Direct Beta-Lactam Penicillin Allergy Contraindication', passed: true });
    } else {
      results.push({
        name: 'Direct Beta-Lactam Penicillin Allergy Contraindication',
        passed: false,
        details: 'Failed to trigger critical allergy alert for Penicillin vs Amoxicillin.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Direct Beta-Lactam Penicillin Allergy Contraindication', passed: false, details: err.message });
  }

  // Test 4: Renal Precaution Rules
  try {
    const metforminRule = DETERMINISTIC_RENAL_RULES.find((r) => r.drugKeywords.includes('metformin') && r.minEgfrThreshold === 30);
    if (metforminRule && metforminRule.severity === 'critical') {
      results.push({ name: 'Metformin Renal Cutoff (eGFR < 30) Rule Verified', passed: true });
    } else {
      results.push({
        name: 'Metformin Renal Cutoff (eGFR < 30) Rule Verified',
        passed: false,
        details: 'Metformin renal cutoff rule missing or misconfigured.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Metformin Renal Cutoff Rule', passed: false, details: err.message });
  }

  // Test 5: Pregnancy Teratogenicity Warning
  try {
    const acePregRule = DETERMINISTIC_PREGNANCY_RULES.find((r) => r.drugKeywords.includes('lisinopril'));
    if (acePregRule && acePregRule.severity === 'critical') {
      results.push({ name: 'RAAS Inhibitor Pregnancy Boxed Warning Verified', passed: true });
    } else {
      results.push({
        name: 'RAAS Inhibitor Pregnancy Boxed Warning Verified',
        passed: false,
        details: 'Lisinopril fetal toxicity rule missing.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'RAAS Inhibitor Pregnancy Rule', passed: false, details: err.message });
  }

  // Test 6: Emergency Red Flags Evaluator - Hypertensive Crisis
  try {
    const flags = evaluateEmergencyRedFlags(
      { bloodPressure: '194/118 mmHg', heartRate: 98, spO2: 96 },
      'Patient reports headache and blurred vision.',
      'Headache'
    );
    const hasHtnCrisis = flags.some((f) => f.category === 'Hypertensive' && f.severity === 'immediate_life_threat');
    if (hasHtnCrisis) {
      results.push({ name: 'Emergency Red Flag: Hypertensive Crisis Detected (194/118)', passed: true });
    } else {
      results.push({
        name: 'Emergency Red Flag: Hypertensive Crisis Detected',
        passed: false,
        details: 'Failed to flag blood pressure >= 180/120 mmHg as hypertensive crisis.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Emergency Red Flag: Hypertensive Crisis', passed: false, details: err.message });
  }

  // Test 7: Emergency Red Flags Evaluator - Critical Hypoxemia
  try {
    const flags = evaluateEmergencyRedFlags(
      { bloodPressure: '120/80 mmHg', heartRate: 110, spO2: 84 },
      'Patient short of breath with cyanosis',
      'Shortness of breath'
    );
    const hasHypoxemia = flags.some((f) => f.category === 'Respiratory');
    if (hasHypoxemia) {
      results.push({ name: 'Emergency Red Flag: Critical Hypoxemia Detected (SpO2 84%)', passed: true });
    } else {
      results.push({
        name: 'Emergency Red Flag: Critical Hypoxemia Detected',
        passed: false,
        details: 'Failed to flag SpO2 < 90% as emergency hypoxemia.',
      });
    }
  } catch (err: any) {
    results.push({ name: 'Emergency Red Flag: Critical Hypoxemia', passed: false, details: err.message });
  }

  return results;
}
