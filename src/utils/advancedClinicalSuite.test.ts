import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNews2,
  calculateQSofa,
  evaluateKdigoAki,
  computeLabDeltaChecks,
  parseSystolicBp,
} from './longitudinalAnalyzer';
import {
  detectMedRecConflicts,
  buildCpoeFhirBundle,
  CPOE_ORDER_SETS,
} from './cpoeOrderEngine';
import {
  DEFAULT_PGX_PROFILES,
  evaluateCpicPharmacogenomics,
} from './pgxEngine';
import {
  interpretAbgAndElectrolytes,
  interpret12LeadEcg,
  ABG_CLINICAL_PRESETS,
} from './acidBaseAndEcgEngine';
import {
  analyzeReadability,
  simplifyToSixthGradeReadingLevel,
  buildVisualMedicationMatrix,
  generateTeachBackQuestions,
} from './avsTeachBackEngine';

test('Enhancement 1: Longitudinal Analyzer — NEWS2, missing SpO2 safety, qSOFA, KDIGO AKI, and Lab Delta Checks', () => {
  // Missing SpO2 should never be fabricated as 98%
  const newsMissing = calculateNews2({
    respiratoryRate: 24,
    spO2: 0,
    systolicBp: parseSystolicBp('96/60'),
    heartRate: 118,
    temperature: 38.6,
    consciousness: 'Alert',
  });
  assert.ok(newsMissing.missingParameters.includes('SpO2'));
  const spo2Param = newsMissing.parameters.find((p) => p.parameter.includes('SpO2'));
  assert.equal(spo2Param?.valueDisplay, 'MISSING (Not measured)');
  assert.equal(spo2Param?.points, 0);

  // High risk NEWS2 >= 7
  const newsHigh = calculateNews2({
    respiratoryRate: 28,
    spO2: 89,
    onSupplementalO2: true,
    systolicBp: 88,
    heartRate: 134,
    temperature: 39.2,
    consciousness: 'CVPU',
  });
  assert.ok(newsHigh.totalScore >= 7);
  assert.equal(newsHigh.riskBand, 'High');

  // qSOFA
  const qsofa = calculateQSofa({
    respiratoryRate: 25,
    systolicBp: 94,
    alteredMentation: false,
  });
  assert.equal(qsofa.score, 2);
  assert.equal(qsofa.highRiskMortality, true);

  // KDIGO AKI staging
  const aki1 = evaluateKdigoAki(1.0, 1.35, false);
  assert.equal(aki1.stage, 1);
  const aki2 = evaluateKdigoAki(1.0, 2.2, false);
  assert.equal(aki2.stage, 2);
  const aki3 = evaluateKdigoAki(1.0, 3.4, false);
  assert.equal(aki3.stage, 3);

  // Lab Delta Checks
  const deltas = computeLabDeltaChecks(
    [{ testName: 'High-Sensitivity Troponin I', numericValue: 12, unit: 'ng/L' }],
    [
      {
        id: 'lab-1',
        panel: 'Cardiac',
        testName: 'High-Sensitivity Troponin I',
        value: '48',
        numericValue: 48,
        unit: 'ng/L',
        referenceRange: '< 14 ng/L',
        flag: 'high',
        status: 'resulted',
        collectedAt: '2026-10-23',
      },
    ]
  );
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0].severity, 'critical_delta');
  assert.equal(deltas[0].percentDelta, 300);
});

test('Enhancement 2: Closed-Loop CPOE & Med Rec — Contraindication detection and FHIR R4 Bundle generation', () => {
  const conflicts = detectMedRecConflicts(
    {
      subjective: 'Patient with T2D and Stage 4 CKD.',
      objective: 'eGFR is 24 mL/min/1.73m2, Potassium is 5.8 mEq/L.',
      assessment: 'CKD Stage 4 and Hyperkalemia.',
      plan: '',
      medications: ['Metformin 1000mg BID', 'Spironolactone 25mg daily', 'Lisinopril 20mg daily'],
      allergies: ['Penicillin'],
    },
    {
      id: 'pt-ckd',
      name: 'Elena Rostova',
      age: 68,
      gender: 'Female',
      mrn: 'MRN-2001',
      encounterDate: '2026-10-23',
      chiefComplaint: 'Fatigue',
      vitals: {
        bloodPressure: '148/88',
        heartRate: 80,
        respiratoryRate: 18,
        temperature: '36.8',
        spO2: 96,
        weightKg: 74,
        heightCm: 165,
      },
    }
  );
  assert.ok(conflicts.some((c) => c.id === 'conflict-metformin-egfr'));
  assert.ok(conflicts.some((c) => c.id === 'conflict-spironolactone-k'));

  const bundle = buildCpoeFhirBundle(
    {
      id: 'pt-ckd',
      name: 'Elena Rostova',
      age: 68,
      gender: 'Female',
      mrn: 'MRN-2001',
      encounterDate: '2026-10-23',
      chiefComplaint: 'Fatigue',
      vitals: {
        bloodPressure: '148/88',
        heartRate: 80,
        respiratoryRate: 18,
        temperature: '36.8',
        spO2: 96,
        weightKg: 74,
        heightCm: 165,
      },
    },
    CPOE_ORDER_SETS[0].orders
  );
  assert.equal(bundle.resourceType, 'Bundle');
  assert.equal(bundle.total, CPOE_ORDER_SETS[0].orders.length);
  assert.ok(bundle.entry.some((e: any) => e.resource.resourceType === 'MedicationRequest'));
  assert.ok(bundle.entry.some((e: any) => e.resource.resourceType === 'ServiceRequest'));
});

test('Enhancement 3: Pharmacogenomic (PGx) CPIC Guideline Engine — CYP2C19, SLCO1B1, CYP2D6, HLA-B, Warfarin', () => {
  const recs = evaluateCpicPharmacogenomics(
    DEFAULT_PGX_PROFILES.cardiovascular_high_risk.profile,
    ['Clopidogrel 75mg daily', 'Simvastatin 40mg daily']
  );
  const clopRec = recs.find((r) => r.gene === 'CYP2C19');
  assert.ok(clopRec);
  assert.equal(clopRec.severity, 'contraindicated');
  assert.equal(clopRec.alternativeMedication?.name, 'Ticagrelor');

  const statinRec = recs.find((r) => r.gene === 'SLCO1B1');
  assert.ok(statinRec);
  assert.equal(statinRec.severity, 'contraindicated');
  assert.equal(statinRec.alternativeMedication?.name, 'Rosuvastatin');
});

test('Enhancement 4: Multimodal ABG Acid-Base, Winter’s Formula & 12-Lead ECG Territory/QTc Engine', () => {
  const abg = interpretAbgAndElectrolytes(ABG_CLINICAL_PRESETS.mala_dka_hagma.input);
  assert.equal(abg.acidemiaOrAlkalemia, 'Acidemia');
  assert.ok(abg.primaryDisorder.includes('High-Anion Gap Metabolic Acidosis'));
  assert.equal(abg.anionGap, 30);
  assert.equal(abg.albuminCorrectedAnionGap, 31);
  assert.deepEqual(abg.wintersExpectedPaco2, { min: 21, max: 25, center: 23 });

  const ecg = interpret12LeadEcg({
    heartRate: 100,
    rhythm: 'Sinus Tachycardia',
    prIntervalMs: 160,
    qrsDurationMs: 96,
    qtIntervalMs: 400,
    stElevationLeads: ['V1-V2 (Septal)', 'V3-V4 (Anterior)'],
    tWaveAbnormalities: 'Peaked Hyperacute T-Waves',
  });
  assert.equal(ecg.stemiAlert, true);
  assert.ok(ecg.culpritTerritory?.includes('Left Anterior Descending [LAD]'));
  assert.ok(ecg.qtcBazettMs >= 500);
});

test('Enhancement 5: Patient-Facing AVS Readability, 6th-Grade Simplifier & Teach-Back Generator', () => {
  const complexText =
    'Continue taking your prescribed medications for hypertension and dyspnea; discontinue contraindicated agents that cause nephrotoxicity or hyperkalemia.';
  const beforeMetrics = analyzeReadability(complexText);
  assert.ok(beforeMetrics.detectedJargonTerms.length >= 4);

  const simplified = simplifyToSixthGradeReadingLevel(complexText);
  const afterMetrics = analyzeReadability(simplified);
  assert.equal(afterMetrics.detectedJargonTerms.length, 0);
  assert.ok(afterMetrics.fleschKincaidGradeLevel < beforeMetrics.fleschKincaidGradeLevel);

  const matrix = buildVisualMedicationMatrix([
    'Lisinopril 20 mg PO daily',
    'Metoprolol 50 mg PO BID',
    'Atorvastatin 40 mg PO bedtime',
    'Nitroglycerin 0.4 mg SL PRN',
  ]);
  const morningSlot = matrix.find((s) => s.slot === 'Morning (08:00)');
  const bedtimeSlot = matrix.find((s) => s.slot === 'Bedtime (22:00)');
  const prnSlot = matrix.find((s) => s.slot === 'As Needed (PRN)');
  assert.equal(morningSlot?.medications.length, 2);
  assert.equal(bedtimeSlot?.medications.length, 1);
  assert.equal(prnSlot?.medications.length, 1);

  const tb = generateTeachBackQuestions(
    {
      id: 'pt-1',
      name: 'Arthur Pendelton',
      age: 64,
      gender: 'Male',
      mrn: 'MRN-100',
      encounterDate: '2026-10-23',
      chiefComplaint: 'Exertional dyspnea',
      vitals: {
        bloodPressure: '150/90',
        heartRate: 88,
        respiratoryRate: 20,
        temperature: '37.0',
        spO2: 95,
        weightKg: 85,
        heightCm: 175,
      },
    },
    {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      medications: ['Lisinopril 20 mg PO daily'],
      allergies: [],
    },
    null
  );
  assert.equal(tb.length, 3);
});
