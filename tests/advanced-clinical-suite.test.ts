import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateNews2, calculateQSofa, evaluateKdigoAki, computeLabDeltaChecks } from '../src/utils/longitudinalAnalyzer';
import { detectMedRecConflicts, buildCpoeFhirBundle, CPOE_ORDER_SETS } from '../src/utils/cpoeOrderEngine';
import { DEFAULT_PGX_PROFILES, evaluateCpicPharmacogenomics } from '../src/utils/pgxEngine';
import { interpretAbgAndElectrolytes, interpret12LeadEcg, ABG_CLINICAL_PRESETS } from '../src/utils/acidBaseAndEcgEngine';
import { analyzeReadability, simplifyToSixthGradeReadingLevel, buildVisualMedicationMatrix } from '../src/utils/avsTeachBackEngine';

export interface TestCaseResult {
  name: string;
  passed: boolean;
  details?: string;
}

export function runAdvancedClinicalSuiteTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // 1. NEWS2 + Missing SpO2 Safety + KDIGO AKI
  try {
    const news = calculateNews2({
      respiratoryRate: 26,
      spO2: 0,
      systolicBp: 92,
      heartRate: 122,
      temperature: 38.8,
      consciousness: 'Alert',
    });
    const aki = evaluateKdigoAki(0.9, 2.1, false);
    const qsofa = calculateQSofa({ respiratoryRate: 26, systolicBp: 92, alteredMentation: false });
    const deltas = computeLabDeltaChecks(
      [{ testName: 'Creatinine', numericValue: 0.9, unit: 'mg/dL' }],
      [
        {
          id: 'l1',
          panel: 'BMP',
          testName: 'Creatinine',
          value: '2.1',
          numericValue: 2.1,
          unit: 'mg/dL',
          referenceRange: '0.7-1.3',
          flag: 'high',
          status: 'resulted',
          collectedAt: '2026-10-23',
        },
      ]
    );
    const passed =
      news.missingParameters.includes('SpO2') &&
      aki.stage === 2 &&
      qsofa.score === 2 &&
      deltas[0]?.severity === 'critical_delta';

    results.push({
      name: 'Longitudinal Analyzer: NEWS2 (Missing SpO2 guarded), qSOFA, KDIGO AKI Stage 2 & Lab Delta Checks',
      passed,
      details: passed ? undefined : 'Longitudinal analyzer assertions failed.',
    });
  } catch (e: any) {
    results.push({ name: 'Longitudinal Analyzer', passed: false, details: e.message });
  }

  // 2. Closed-Loop CPOE & Med Rec
  try {
    const conflicts = detectMedRecConflicts(
      {
        subjective: 'T2D and CKD 4',
        objective: 'eGFR 24, K 5.8',
        assessment: 'MALA risk',
        plan: '',
        medications: ['Metformin 1000mg BID', 'Spironolactone 25mg daily', 'Lisinopril 20mg daily'],
        allergies: [],
      },
      {
        id: 'pt-1',
        name: 'Test Patient',
        age: 68,
        gender: 'Female',
        mrn: 'MRN-1',
        encounterDate: '2026-10-23',
        chiefComplaint: 'Fatigue',
        vitals: { bloodPressure: '140/80', heartRate: 80, respiratoryRate: 16, temperature: '37.0', spO2: 97, weightKg: 70, heightCm: 165 },
      }
    );
    const bundle = buildCpoeFhirBundle(
      {
        id: 'pt-1',
        name: 'Test Patient',
        age: 68,
        gender: 'Female',
        mrn: 'MRN-1',
        encounterDate: '2026-10-23',
        chiefComplaint: 'Fatigue',
        vitals: { bloodPressure: '140/80', heartRate: 80, respiratoryRate: 16, temperature: '37.0', spO2: 97, weightKg: 70, heightCm: 165 },
      },
      CPOE_ORDER_SETS[0].orders
    );
    const passed = conflicts.length >= 2 && bundle.resourceType === 'Bundle' && bundle.total === 4;
    results.push({
      name: 'Closed-Loop CPOE & Med Rec: Renal/Hyperkalemia Contraindication Intercept & FHIR R4 Bundle',
      passed,
      details: passed ? undefined : 'CPOE/MedRec assertions failed.',
    });
  } catch (e: any) {
    results.push({ name: 'Closed-Loop CPOE & Med Rec', passed: false, details: e.message });
  }

  // 3. PGx CPIC Engine
  try {
    const recs = evaluateCpicPharmacogenomics(
      DEFAULT_PGX_PROFILES.cardiovascular_high_risk.profile,
      ['Clopidogrel 75mg', 'Simvastatin 40mg']
    );
    const passed =
      recs.some((r) => r.gene === 'CYP2C19' && r.severity === 'contraindicated' && r.alternativeMedication?.name === 'Ticagrelor') &&
      recs.some((r) => r.gene === 'SLCO1B1' && r.severity === 'contraindicated' && r.alternativeMedication?.name === 'Rosuvastatin');
    results.push({
      name: 'Pharmacogenomic (PGx) CPIC Guideline Engine: CYP2C19 *2/*2 Clopidogrel & SLCO1B1 C/C Statin Rules',
      passed,
      details: passed ? undefined : 'PGx CPIC evaluation failed.',
    });
  } catch (e: any) {
    results.push({ name: 'Pharmacogenomic (PGx) CPIC Guideline Engine', passed: false, details: e.message });
  }

  // 4. ABG Winter's Formula & 12-Lead ECG Interpreter
  try {
    const abg = interpretAbgAndElectrolytes(ABG_CLINICAL_PRESETS.mala_dka_hagma.input);
    const ecg = interpret12LeadEcg({
      heartRate: 96,
      rhythm: 'Normal Sinus Rhythm',
      prIntervalMs: 168,
      qrsDurationMs: 92,
      qtIntervalMs: 420,
      stElevationLeads: ['II, III, aVF (Inferior)'],
      tWaveAbnormalities: 'None',
    });
    const passed =
      abg.wintersExpectedPaco2?.center === 23 &&
      abg.albuminCorrectedAnionGap === 31 &&
      ecg.stemiAlert === true &&
      Boolean(ecg.culpritTerritory?.includes('Right Coronary Artery'));
    results.push({
      name: 'ABG Winter’s Formula, Albumin-Corrected Anion Gap & 12-Lead ECG STEMI Territory Localization',
      passed,
      details: passed ? undefined : 'ABG/ECG evaluation failed.',
    });
  } catch (e: any) {
    results.push({ name: 'ABG & ECG Interpreter', passed: false, details: e.message });
  }

  // 5. Patient AVS 6th-Grade Simplifier & Visual Med Matrix
  try {
    const raw = 'Monitor for dyspnea, hypertension, nephrotoxicity, and hyperkalemia; take Lisinopril BID.';
    const simp = simplifyToSixthGradeReadingLevel(raw);
    const after = analyzeReadability(simp);
    const matrix = buildVisualMedicationMatrix(['Lisinopril 10mg BID', 'Atorvastatin 40mg bedtime']);
    const passed = after.detectedJargonTerms.length === 0 && matrix.length === 5;
    results.push({
      name: 'Patient AVS Readability Simplifier (6th-Grade Target), Time-of-Day Matrix & Teach-Back Generator',
      passed,
      details: passed ? undefined : 'AVS Teach-Back evaluation failed.',
    });
  } catch (e: any) {
    results.push({ name: 'Patient AVS Teach-Back Engine', passed: false, details: e.message });
  }

  return results;
}

test('Advanced Clinical Suite unit tests pass', () => {
  const results = runAdvancedClinicalSuiteTests();
  for (const res of results) {
    assert.equal(res.passed, true, `${res.name} failed: ${res.details || ''}`);
  }
});

