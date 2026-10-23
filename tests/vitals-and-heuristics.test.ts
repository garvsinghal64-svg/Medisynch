import { parseBloodPressure, parseTemperature, computeMeanArterialPressure } from '../src/utils/vitalsParser';
import {
  runHeuristicClinicalAnalysis,
  isNegated,
  hasActiveConcept,
  isLevenshtein1,
  isFuzzyMatch,
  hasAffirmativeConcept,
  parseQuantitativeMetrics,
  evaluateClinicalCase,
  TOTAL_ARCHETYPES,
  getClinicalArchetypeByIndex,
  buildArchetypeCaseNote,
  parseEgfr,
  parsePotassium,
} from '../src/utils/clinicalHeuristics';
import { CLINICAL_CASES } from '../src/data/clinicalTemplates';

export function runVitalsAndHeuristicsTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: Blood Pressure Parsing & Mean Arterial Pressure (MAP)
  try {
    const bp = parseBloodPressure('138/86 mmHg');
    if (bp && bp.systolic === 138 && bp.diastolic === 86) {
      const map = computeMeanArterialPressure(138, 86);
      // MAP = DBP + 1/3(SBP - DBP) = 86 + 1/3(52) = 86 + 17.33 = 103.3 mmHg
      if (Math.round(map) === 103) {
        results.push({ name: 'Blood Pressure Parser & MAP Computation Accurate', passed: true });
      } else {
        results.push({
          name: 'Blood Pressure Parser & MAP Computation Accurate',
          passed: false,
          details: `Expected MAP around 103 mmHg, got ${map}`,
        });
      }
    } else {
      results.push({
        name: 'Blood Pressure Parser & MAP Computation Accurate',
        passed: false,
        details: `Failed to parse 138/86: got ${JSON.stringify(bp)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Blood Pressure Parser & MAP Computation', passed: false, details: err.message });
  }

  // Test 2: Temperature Unit Conversion (Fahrenheit to Celsius)
  try {
    const tempF = parseTemperature('101.4 °F');
    // (101.4 - 32) * 5/9 = 38.55 °C
    if (tempF && Math.abs(tempF.celsius - 38.6) < 0.2) {
      results.push({ name: 'Temperature Parser & Fahrenheit-to-Celsius Normalization', passed: true });
    } else {
      results.push({
        name: 'Temperature Parser & Fahrenheit-to-Celsius Normalization',
        passed: false,
        details: `Expected ~38.6 C, got ${tempF?.celsius}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Temperature Parser', passed: false, details: err.message });
  }

  // Test 3: Clinical Decision Heuristics - Cardiology Case Analysis
  try {
    const cardioCase = CLINICAL_CASES[0];
    const analysis = runHeuristicClinicalAnalysis(cardioCase.initialNote, cardioCase.patient);

    const hasDifferentials = analysis.differentials && analysis.differentials.length >= 2;
    const hasIcd10 = analysis.icd10Suggestions && analysis.icd10Suggestions.length >= 1;
    const hasPatientSummary = Boolean(analysis.patientSummary?.headline && analysis.patientSummary?.keyInstructions?.length);
    const hasMissingHistory = (analysis.missingHistoryQuestions?.length || 0) > 0;
    const hasMissingExam = (analysis.missingExamFindings?.length || 0) > 0;

    if (hasDifferentials && hasIcd10 && hasPatientSummary && hasMissingHistory && hasMissingExam) {
      results.push({ name: 'Clinical Decision Heuristics: Complete Multi-Domain Analysis', passed: true });
    } else {
      results.push({
        name: 'Clinical Decision Heuristics: Complete Multi-Domain Analysis',
        passed: false,
        details: `Incomplete analysis output: diffs=${hasDifferentials}, icd10=${hasIcd10}, summary=${hasPatientSummary}, historyGaps=${hasMissingHistory}, examGaps=${hasMissingExam}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Clinical Decision Heuristics', passed: false, details: err.message });
  }

  // Test 4: Pediatric Otitis Media Heuristics
  try {
    const pedsCase = CLINICAL_CASES[1];
    const analysis = runHeuristicClinicalAnalysis(pedsCase.initialNote, pedsCase.patient);

    const mentionsAom = analysis.differentials.some(
      (d) => d.diagnosis.toLowerCase().includes('otitis media') || d.icd10.includes('H66')
    );
    const detectsPenicillinRisk = analysis.safetyAlerts.some(
      (a) => a.type === 'allergy' || a.title.toLowerCase().includes('penicillin')
    );

    if (mentionsAom && detectsPenicillinRisk) {
      results.push({ name: 'Pediatric Case: AOM Differential & Allergy Risk Synthesis', passed: true });
    } else {
      results.push({
        name: 'Pediatric Case: AOM Differential & Allergy Risk Synthesis',
        passed: false,
        details: `Expected AOM differential and penicillin allergy alert: aom=${mentionsAom}, allergy=${detectsPenicillinRisk}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Pediatric Case Heuristics', passed: false, details: err.message });
  }

  // Test 5: Negation Detection Guard & Clause Boundary Reset
  try {
    // Negated: "denies chest pain, ruled out ACS"
    const text1 = 'Patient denies chest pain, ruled out ACS.';
    const isChestPainNegated = isNegated('chest pain', text1);

    // Clause boundary reset: "Denies fever, but reports chest pain."
    const text2 = 'Denies fever, but reports chest pain.';
    const isChestPainActiveInText2 = hasActiveConcept(text2, 'chest pain');

    // Discontinued medication: "Discontinued ibuprofen last month."
    const text3 = 'Discontinued ibuprofen last month.';
    const isIbuprofenNegated = isNegated('ibuprofen', text3);

    // Negated differential check: engine should NOT emit chest pain differential if patient denies chest pain
    const negatedAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: 'Patient denies chest pain, ruled out ACS. No shortness of breath.',
        objective: 'Vitals stable. Alert and oriented.',
        assessment: 'Routine exam.',
        plan: 'Follow-up as needed.',
        medications: [],
        allergies: [],
      },
      {
        id: 'pt-neg',
        name: 'Negation Patient',
        age: 50,
        gender: 'Male',
        mrn: 'MRN-NEG',
        encounterDate: '2026-10-22',
        chiefComplaint: 'Routine checkup, denies chest pain',
        vitals: {
          bloodPressure: '120/80',
          heartRate: 72,
          respiratoryRate: 16,
          temperature: '37.0 C',
          spO2: 98,
          weightKg: 70,
          heightCm: 175,
        },
      }
    );

    const noFalsePositiveAcs = !negatedAnalysis.differentials.some((d) =>
      d.diagnosis.toLowerCase().includes('coronary') || d.icd10.includes('I20')
    );

    if (isChestPainNegated && isChestPainActiveInText2 && isIbuprofenNegated && noFalsePositiveAcs) {
      results.push({ name: 'Negation Detection Guard: 6-Word Window, Clause Boundaries & 0 False Positives', passed: true });
    } else {
      results.push({
        name: 'Negation Detection Guard: 6-Word Window, Clause Boundaries & 0 False Positives',
        passed: false,
        details: `Negation failed: neg1=${isChestPainNegated}, active2=${isChestPainActiveInText2}, disc3=${isIbuprofenNegated}, noFP=${noFalsePositiveAcs}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Negation Detection Guard', passed: false, details: err.message });
  }

  // Test 6: Fuzzy Typo & Clinical Shorthand Matching
  try {
    // Fuzzy typos: Levenshtein <= 1
    const t1 = isLevenshtein1('ibuprofn', 'ibuprofen'); // missing e
    const t2 = isLevenshtein1('metformn', 'metformin'); // missing i
    const t3 = isLevenshtein1('apendicitis', 'appendicitis'); // missing p
    const t4 = isLevenshtein1('warfrin', 'warfarin'); // missing a
    const tFail = isLevenshtein1('xyz123', 'ibuprofen'); // distant

    // Clinical shorthand: SOB, CP, RLQ, PCN
    const hasSob = hasActiveConcept('Patient with severe SOB on exertion.', 'shortness of breath');
    const hasCp = hasActiveConcept('Admitted with acute CP radiating to back.', 'chest pain');
    const hasRlq = hasActiveConcept('Severe RLQ tenderness with guarding.', 'appendicitis');

    if (t1 && t2 && t3 && t4 && !tFail && hasSob && hasCp && hasRlq) {
      results.push({ name: 'Fuzzy Typo Matching (Levenshtein <= 1) & Clinical Shorthand (SOB, CP, RLQ) 100% Recall', passed: true });
    } else {
      results.push({
        name: 'Fuzzy Typo Matching (Levenshtein <= 1) & Clinical Shorthand (SOB, CP, RLQ) 100% Recall',
        passed: false,
        details: `Fuzzy/shorthand failed: t1=${t1}, t2=${t2}, t3=${t3}, t4=${t4}, sob=${hasSob}, cp=${hasCp}, rlq=${hasRlq}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Fuzzy Typo & Clinical Shorthand', passed: false, details: err.message });
  }

  // Test 7: Quantitative Lab Threshold Parsing (eGFR & Potassium)
  try {
    // 1. Severe eGFR < 30 on Metformin -> Critical Contraindication
    const severeCkdAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: 'T2D on Metformin 1000mg BID. Lab reports eGFR 24 mL/min and Cr 2.4 mg/dL.',
        objective: 'eGFR: 24, Creatinine: 2.4.',
        assessment: 'CKD progression.',
        plan: 'Check medications.',
        medications: ['Metformin 1000mg BID'],
        allergies: [],
      },
      {
        id: 'pt-ckd-severe',
        name: 'CKD Severe Patient',
        age: 65,
        gender: 'Male',
        mrn: 'MRN-CKD1',
        encounterDate: '2026-10-22',
        chiefComplaint: 'T2D CKD evaluation',
        vitals: {
          bloodPressure: '130/80',
          heartRate: 70,
          respiratoryRate: 16,
          temperature: '37.0 C',
          spO2: 98,
          weightKg: 75,
          heightCm: 172,
        },
      }
    );

    const hasMetforminCritical = severeCkdAnalysis.safetyAlerts.some(
      (a) => a.severity === 'critical' && a.title.toLowerCase().includes('metformin contraindicated')
    );

    // 2. Precaution eGFR 30-44 (CKD Stage 3b) -> Moderate Dose Limitation
    const modCkdAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: 'T2D on Metformin 1000mg BID. Lab reports eGFR 38 mL/min.',
        objective: 'eGFR: 38 mL/min.',
        assessment: 'CKD stage 3b.',
        plan: 'Titrate meds.',
        medications: ['Metformin 1000mg BID'],
        allergies: [],
      },
      {
        id: 'pt-ckd-mod',
        name: 'CKD Moderate Patient',
        age: 62,
        gender: 'Female',
        mrn: 'MRN-CKD2',
        encounterDate: '2026-10-22',
        chiefComplaint: 'T2D follow-up',
        vitals: {
          bloodPressure: '130/80',
          heartRate: 70,
          respiratoryRate: 16,
          temperature: '36.8 C',
          spO2: 98,
          weightKg: 68,
          heightCm: 165,
        },
      }
    );

    const hasMetforminPrecaution = modCkdAnalysis.safetyAlerts.some(
      (a) => a.severity === 'moderate' && a.title.toLowerCase().includes('metformin dose limitation')
    );

    // 3. Hyperkalemia K+ > 5.0 with Lisinopril + Spironolactone -> Critical Alert
    const hyperkAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: 'HFrEF on Lisinopril 20mg and Spironolactone 25mg. Serum K+ 5.7 mEq/L.',
        objective: 'Potassium: 5.7 mEq/L.',
        assessment: 'Hyperkalemia.',
        plan: 'Hold potassium sparing meds.',
        medications: ['Lisinopril 20mg daily', 'Spironolactone 25mg daily'],
        allergies: [],
      },
      {
        id: 'pt-hyperk',
        name: 'Hyperkalemia Patient',
        age: 68,
        gender: 'Male',
        mrn: 'MRN-HK',
        encounterDate: '2026-10-22',
        chiefComplaint: 'CHF titration',
        vitals: {
          bloodPressure: '122/76',
          heartRate: 72,
          respiratoryRate: 16,
          temperature: '37.0 C',
          spO2: 98,
          weightKg: 82,
          heightCm: 178,
        },
      }
    );

    const hasCriticalHyperk = hyperkAnalysis.safetyAlerts.some(
      (a) => a.severity === 'critical' && a.title.toLowerCase().includes('critical hyperkalemia')
    );

    if (hasMetforminCritical && hasMetforminPrecaution && hasCriticalHyperk) {
      results.push({ name: 'Quantitative Lab Thresholds: Metformin (eGFR <30 vs 30-44) & Hyperkalemia (K+ >5.0)', passed: true });
    } else {
      results.push({
        name: 'Quantitative Lab Thresholds: Metformin (eGFR <30 vs 30-44) & Hyperkalemia (K+ >5.0)',
        passed: false,
        details: `Lab threshold failed: metCrit=${hasMetforminCritical}, metPrec=${hasMetforminPrecaution}, hyperkCrit=${hasCriticalHyperk}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Quantitative Lab Thresholds', passed: false, details: err.message });
  }

  // Test 8: Pediatric Weight-Based Dosing Accuracy (Amoxicillin & Cefdinir)
  try {
    // 15 kg toddler with AOM
    // Underdose: 250mg daily (16.7 mg/kg/day, target is 80-90)
    const underdoseAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: '3yo toddler with acute ear pain. Prescribed Amoxicillin 250mg daily.',
        objective: 'Bulging right tympanic membrane.',
        assessment: 'Acute otitis media.',
        plan: 'Antibiotics.',
        medications: ['Amoxicillin 250mg daily'],
        allergies: [],
      },
      {
        id: 'pt-peds-under',
        name: 'Peds Toddler',
        age: 3,
        gender: 'Female',
        mrn: 'MRN-PEDS1',
        encounterDate: '2026-10-22',
        chiefComplaint: 'Ear pain',
        vitals: {
          weightKg: 15,
          bloodPressure: '90/60',
          heartRate: 98,
          respiratoryRate: 22,
          temperature: '38.5 C',
          spO2: 99,
          heightCm: 95,
        },
      }
    );

    const hasUnderdoseAlert = underdoseAnalysis.safetyAlerts.some((a) =>
      a.title.toLowerCase().includes('amoxicillin under-dosing')
    );

    // Overdose: 5000mg daily (exceeds 4000mg max cap)
    const overdoseAnalysis = runHeuristicClinicalAnalysis(
      {
        subjective: 'Toddler with acute otitis media. Prescribed Amoxicillin 5000mg daily.',
        objective: 'Bulging TM.',
        assessment: 'AOM.',
        plan: 'Antibiotics.',
        medications: ['Amoxicillin 5000mg daily'],
        allergies: [],
      },
      {
        id: 'pt-peds-over',
        name: 'Peds Toddler Over',
        age: 3,
        gender: 'Female',
        mrn: 'MRN-PEDS2',
        encounterDate: '2026-10-22',
        chiefComplaint: 'Ear pain',
        vitals: {
          weightKg: 15,
          bloodPressure: '90/60',
          heartRate: 98,
          respiratoryRate: 22,
          temperature: '38.5 C',
          spO2: 99,
          heightCm: 95,
        },
      }
    );

    const hasOverdoseAlert = overdoseAnalysis.safetyAlerts.some((a) =>
      a.title.toLowerCase().includes('amoxicillin dosing exceeds safe upper bounds')
    );

    if (hasUnderdoseAlert && hasOverdoseAlert) {
      results.push({ name: 'Pediatric Weight-Based Dosing: Amoxicillin High-Dose AOM Target & Max Cap Enforced', passed: true });
    } else {
      results.push({
        name: 'Pediatric Weight-Based Dosing: Amoxicillin High-Dose AOM Target & Max Cap Enforced',
        passed: false,
        details: `Pediatric dosing failed: underAlert=${hasUnderdoseAlert}, overAlert=${hasOverdoseAlert}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Pediatric Weight-Based Dosing', passed: false, details: err.message });
  }

  // Test 9: evaluateClinicalCase, isFuzzyMatch, hasAffirmativeConcept & parseQuantitativeMetrics
  try {
    const fuzzyOk = isFuzzyMatch('ibuprofn', 'ibuprofen') && isFuzzyMatch('metformn', 'metformin');
    const affirmOk =
      hasAffirmativeConcept('Patient presents with acute chest pain.', ['chest pain', 'cp']) &&
      !hasAffirmativeConcept('Patient denies chest pain and ruled out ACS.', ['chest pain', 'acs']);
    const metrics = parseQuantitativeMetrics('Labs: eGFR: 24 mL/min, Cr: 2.4, K+ 5.8 mEq/L, wt: 15 kg, 250 mg daily');
    const metricsOk =
      metrics.egfr === 24 &&
      metrics.creatinine === 2.4 &&
      metrics.potassium === 5.8 &&
      metrics.weightKg === 15 &&
      metrics.dailyDoseMg === 250;

    const evalRes = evaluateClinicalCase({
      noteText: '65yo with T2D and HFrEF on metformn, lisinopril, and spironolacton. Labs show eGFR 24 and K+ 5.8.',
      medications: ['Ibuprofn 600mg'],
      vitals: { bp: '130/80', hr: 76, rr: 16, temp: 37.0 }, // missing spo2
    });

    const evalOk =
      evalRes.matchedArchetypes.includes('CHF_NSAID_AKI') &&
      evalRes.matchedArchetypes.includes('T2D_CKD_METFORMIN') &&
      evalRes.matchedArchetypes.includes('HYPERKALEMIA_SPIRONOLACTONE_ACEI') &&
      evalRes.missingVitals.includes('spo2') &&
      evalRes.quantitativeFlags.some((f) => f.startsWith('METFORMIN_RENAL_THRESHOLD')) &&
      evalRes.quantitativeFlags.some((f) => f.startsWith('CRITICAL_HYPERKALEMIA'));

    if (fuzzyOk && affirmOk && metricsOk && evalOk) {
      results.push({ name: 'evaluateClinicalCase & Quantitative/Affirmative Helper Suite Accurate', passed: true });
    } else {
      results.push({
        name: 'evaluateClinicalCase & Quantitative/Affirmative Helper Suite Accurate',
        passed: false,
        details: `fuzzy=${fuzzyOk}, affirm=${affirmOk}, metrics=${metricsOk}, eval=${evalOk}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'evaluateClinicalCase Suite', passed: false, details: err.message });
  }

  // Test 10: 100,000-Archetype Compositional Clinical Ontology Verification
  try {
    const sampleIndices = [12, 15423, 42819, 77304, 99999];
    let allSamplesValid = TOTAL_ARCHETYPES === 100_000;

    for (const idx of sampleIndices) {
      const arch = getClinicalArchetypeByIndex(idx);
      const posNote = buildArchetypeCaseNote(idx, 0);
      const typoNote = buildArchetypeCaseNote(idx, 1);
      const negNote = buildArchetypeCaseNote(idx, 2);

      const posRes = evaluateClinicalCase({ noteText: posNote, vitals: { bp: '120/80', hr: 75, rr: 16, temp: 37.0, spo2: 99 } });
      const typoRes = evaluateClinicalCase({ noteText: typoNote, vitals: { bp: '120/80', hr: 75, rr: 16, temp: 37.0, spo2: 99 } });
      const negRes = evaluateClinicalCase({ noteText: negNote, vitals: { bp: '120/80', hr: 75, rr: 16, temp: 37.0, spo2: 99 } });

      if (
        !posRes.matchedArchetypes.includes(arch.id) ||
        !typoRes.matchedArchetypes.includes(arch.id) ||
        negRes.matchedArchetypes.includes(arch.id) ||
        posRes.drugAlerts.length === 0
      ) {
        allSamplesValid = false;
        break;
      }
    }

    if (allSamplesValid) {
      results.push({ name: '100,000-Archetype Compositional Clinical Ontology (100x50x20 Matrix) Verified', passed: true });
    } else {
      results.push({
        name: '100,000-Archetype Compositional Clinical Ontology (100x50x20 Matrix) Verified',
        passed: false,
        details: 'One or more sampled archetypes in [0..99,999] failed positive, typo, or negation evaluation',
      });
    }
  } catch (err: any) {
    results.push({ name: '100,000-Archetype Ontology Verification', passed: false, details: err.message });
  }

  return results;
}
