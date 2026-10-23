import { PatientRecord, PrescriptionOrder, SoapNote } from '../types/clinical';

export interface CpoeOrderItem {
  id: string;
  category: 'Nursing / Monitoring' | 'Laboratory' | 'Imaging / Diagnostics' | 'Medications / IV Fluids';
  title: string;
  priority: 'STAT' | 'Urgent' | 'Routine';
  loincOrRxNormCode: string;
  clinicalRationale: string;
  selectedByDefault: boolean;
  medicationPayload?: {
    medicationName: string;
    dosage: string;
    route: PrescriptionOrder['route'];
    frequency: string;
    quantity: string;
    indication: string;
  };
}

export interface CpoeOrderSet {
  id: string;
  name: string;
  specialty: string;
  guidelineReference: string;
  clinicalSafetyNote: string;
  orders: CpoeOrderItem[];
}

export interface MedRecSafetyConflict {
  id: string;
  offendingMedication: string;
  conflictType: 'renal_contraindication' | 'hyperkalemia_ddi' | 'allergy_cross_reactivity' | 'pediatric_overdose' | 'bleeding_ddi';
  severity: 'critical' | 'high';
  clinicalExplanation: string;
  recommendedActionLabel: string;
  replacementMedication?: {
    medicationName: string;
    dosage: string;
    route: PrescriptionOrder['route'];
    frequency: string;
    quantity: string;
    indication: string;
    rationale: string;
  };
  planDocumentationNote: string;
}

export const CPOE_ORDER_SETS: CpoeOrderSet[] = [
  {
    id: 'acs-nstemi-chest-pain',
    name: 'Acute Coronary Syndrome (ACS / NSTEMI) Protocol',
    specialty: 'Cardiology / Emergency Medicine',
    guidelineReference: 'AHA/ACC/ESC Acute Coronary Syndromes Clinical Practice Guidelines',
    clinicalSafetyNote:
      'Verify absence of active bleeding, right ventricular infarction, or recent PDE5 inhibitor use before administering nitrates.',
    orders: [
      {
        id: 'acs-ecg-10m',
        category: 'Imaging / Diagnostics',
        title: '12-Lead Electrocardiogram (STAT < 10 min) + Continuous Telemetry',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:11524-6',
        clinicalRationale: 'Immediate assessment for ST-segment elevation (STEMI) or dynamic ischemic changes.',
        selectedByDefault: true,
      },
      {
        id: 'acs-hs-troponin',
        category: 'Laboratory',
        title: 'Serial High-Sensitivity Cardiac Troponin I (0h and 1h/2h Delta)',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:89579-7',
        clinicalRationale: 'Quantify acute myocardial injury per Fourth Universal Definition of MI.',
        selectedByDefault: true,
      },
      {
        id: 'acs-asa-325',
        category: 'Medications / IV Fluids',
        title: 'Aspirin 325 mg PO (Chewed, Non-Enteric Coated) x1 Dose',
        priority: 'STAT',
        loincOrRxNormCode: 'RxNorm:1191',
        clinicalRationale: 'Irreversible COX-1 thromboxane A2 platelet inhibition.',
        selectedByDefault: true,
        medicationPayload: {
          medicationName: 'Aspirin (Non-Enteric)',
          dosage: '325 mg',
          route: 'PO',
          frequency: 'STAT once (chewed)',
          quantity: '1 tablet',
          indication: 'Acute Coronary Syndrome Antiplatelet Loading',
        },
      },
      {
        id: 'acs-atorva-80',
        category: 'Medications / IV Fluids',
        title: 'Atorvastatin 80 mg PO Daily (High-Intensity Statin)',
        priority: 'Urgent',
        loincOrRxNormCode: 'RxNorm:83367',
        clinicalRationale: 'Early plaque stabilization and pleiotropic endothelial protection.',
        selectedByDefault: true,
        medicationPayload: {
          medicationName: 'Atorvastatin',
          dosage: '80 mg',
          route: 'PO',
          frequency: 'Once daily at bedtime',
          quantity: '30 tablets',
          indication: 'ACS High-Intensity Lipid Lowering',
        },
      },
    ],
  },
  {
    id: 'suspected-sepsis-evaluation',
    name: 'Suspected Infection & Sepsis-3 Diagnostic Workup',
    specialty: 'Critical Care / Internal Medicine',
    guidelineReference: 'Surviving Sepsis Campaign (SSC) Guidelines',
    clinicalSafetyNote:
      'SIRS criteria (≥2) alone do not define Sepsis-3. Reserve 30 mL/kg crystalloid bolus strictly for sepsis-induced hypoperfusion (SBP < 90, MAP < 65, or Lactate ≥ 4.0 mmol/L).',
    orders: [
      {
        id: 'sep-blood-cultures',
        category: 'Laboratory',
        title: 'Blood Cultures x2 Sets (Aerobic & Anaerobic) Prior to Antimicrobials',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:600-7',
        clinicalRationale: 'Pathogen identification and antimicrobial stewardship de-escalation.',
        selectedByDefault: true,
      },
      {
        id: 'sep-lactate-cmp',
        category: 'Laboratory',
        title: 'Serum Lactate + Comprehensive Metabolic Panel (SOFA Organ Dysfunction Screen)',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:2524-7',
        clinicalRationale: 'Evaluate tissue hypoperfusion and renal/hepatic SOFA score components.',
        selectedByDefault: true,
      },
      {
        id: 'sep-pulse-ox',
        category: 'Nursing / Monitoring',
        title: 'Continuous Pulse Oximetry (SpO₂), Hourly Vitals & Strict Urine Output',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:59408-5',
        clinicalRationale: 'Ensure missing SpO₂ is measured immediately and track end-organ renal perfusion.',
        selectedByDefault: true,
      },
      {
        id: 'sep-crystalloid-500',
        category: 'Medications / IV Fluids',
        title: 'Lactated Ringer’s 500 mL IV Fluid Challenge (Reassess Hemodynamics)',
        priority: 'Urgent',
        loincOrRxNormCode: 'RxNorm:313002',
        clinicalRationale: 'Targeted fluid responsiveness assessment without volume overload.',
        selectedByDefault: false,
        medicationPayload: {
          medicationName: 'Lactated Ringer’s Crystalloid',
          dosage: '500 mL',
          route: 'IV',
          frequency: 'Infuse over 30 mins then reassess',
          quantity: '1 bag',
          indication: 'Hemodynamic Fluid Responsiveness Assessment',
        },
      },
    ],
  },
  {
    id: 'adhf-decompensated-hf',
    name: 'Acute Decompensated Heart Failure (ADHF) Diuresis Set',
    specialty: 'Cardiology / Heart Failure',
    guidelineReference: 'AHA/ACC/HFSA Heart Failure Management Guidelines',
    clinicalSafetyNote:
      'Monitor serum Potassium, Magnesium, and Creatinine every 12–24 hours during IV loop diuresis.',
    orders: [
      {
        id: 'hf-ntprobnp-bmp',
        category: 'Laboratory',
        title: 'NT-proBNP + Basic Metabolic Panel + Serum Magnesium',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:33762-6',
        clinicalRationale: 'Quantify ventricular wall stress and baseline electrolytes prior to diuresis.',
        selectedByDefault: true,
      },
      {
        id: 'hf-cxr-echo',
        category: 'Imaging / Diagnostics',
        title: 'Chest Radiograph (PA & Lateral) + Transthoracic Echocardiogram (TTE)',
        priority: 'Urgent',
        loincOrRxNormCode: 'LOINC:30746-2',
        clinicalRationale: 'Assess pulmonary venous congestion, pleural effusions, and LVEF.',
        selectedByDefault: true,
      },
      {
        id: 'hf-furosemide-iv',
        category: 'Medications / IV Fluids',
        title: 'Furosemide 40 mg IV Push x1 (Monitor Urine Output at 2 Hours)',
        priority: 'STAT',
        loincOrRxNormCode: 'RxNorm:4603',
        clinicalRationale: 'Rapid venodilation and natriuresis to relieve pulmonary congestion.',
        selectedByDefault: true,
        medicationPayload: {
          medicationName: 'Furosemide',
          dosage: '40 mg',
          route: 'IV',
          frequency: 'Once STAT, reassess UOP in 2h',
          quantity: '1 vial',
          indication: 'Acute Pulmonary Congestion / Volume Overload',
        },
      },
      {
        id: 'hf-daily-weights',
        category: 'Nursing / Monitoring',
        title: 'Strict Intake/Output (I&O), Daily Standing Morning Weight & 2g Sodium Restriction',
        priority: 'Routine',
        loincOrRxNormCode: 'LOINC:29463-7',
        clinicalRationale: 'Track net negative fluid balance and dry weight trajectory.',
        selectedByDefault: true,
      },
    ],
  },
  {
    id: 'ckd-hyperkalemia-nephroprotection',
    name: 'CKD Stage 4 / Hyperkalemia & MALA Prevention Set',
    specialty: 'Nephrology / Endocrinology',
    guidelineReference: 'KDIGO 2024 CKD & Diabetes Management Guidelines',
    clinicalSafetyNote:
      'Metformin is strictly contraindicated when eGFR < 30 mL/min/1.73m². Hold RAASi and K⁺-sparing diuretics when K⁺ ≥ 5.5 mEq/L.',
    orders: [
      {
        id: 'ckd-stat-ecg',
        category: 'Imaging / Diagnostics',
        title: 'STAT 12-Lead ECG (Evaluate for Peaked T-Waves / QRS Widening)',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:11524-6',
        clinicalRationale: 'Screen for hyperkalemic cardiac membrane instability.',
        selectedByDefault: true,
      },
      {
        id: 'ckd-repeat-k-vbg',
        category: 'Laboratory',
        title: 'Repeat Non-Hemolyzed Serum Potassium + Venous Blood Gas + Serum Lactate',
        priority: 'STAT',
        loincOrRxNormCode: 'LOINC:2823-3',
        clinicalRationale: 'Rule out pseudohyperkalemia and screen for Metformin-Associated Lactic Acidosis (MALA).',
        selectedByDefault: true,
      },
      {
        id: 'ckd-szc-10g',
        category: 'Medications / IV Fluids',
        title: 'Sodium Zirconium Cyclosilicate (Lokelma) 10 g PO TID x 48h',
        priority: 'Urgent',
        loincOrRxNormCode: 'RxNorm:2047241',
        clinicalRationale: 'Selective gastrointestinal potassium binder to lower serum K⁺ safely.',
        selectedByDefault: true,
        medicationPayload: {
          medicationName: 'Sodium Zirconium Cyclosilicate',
          dosage: '10 g',
          route: 'PO',
          frequency: 'TID for up to 48 hours',
          quantity: '6 packets',
          indication: 'Acute Hyperkalemia Management',
        },
      },
      {
        id: 'ckd-linagliptin-5mg',
        category: 'Medications / IV Fluids',
        title: 'Linagliptin 5 mg PO Once Daily (Renally Safe Glycemic Substitution)',
        priority: 'Routine',
        loincOrRxNormCode: 'RxNorm:1100699',
        clinicalRationale: 'Non-renally cleared DPP-4 inhibitor requiring no dose adjustment in Stage 4–5 CKD.',
        selectedByDefault: true,
        medicationPayload: {
          medicationName: 'Linagliptin',
          dosage: '5 mg',
          route: 'PO',
          frequency: 'Once daily',
          quantity: '30 tablets',
          indication: 'Type 2 Diabetes in Stage 4 CKD (Replaces Metformin)',
        },
      },
    ],
  },
];

export function detectMedRecConflicts(
  note: SoapNote,
  patient: PatientRecord
): MedRecSafetyConflict[] {
  const conflicts: MedRecSafetyConflict[] = [];
  const meds = note.medications || [];
  const allergies = (note.allergies || []).map((a) => a.toLowerCase());
  const fullText = [note.subjective, note.objective, note.assessment, note.plan].join(' ').toLowerCase();

  // Check eGFR from labs or note text
  let egfr: number | undefined;
  let potassium: number | undefined;

  for (const lab of note.labs || []) {
    const tName = lab.testName.toLowerCase();
    const num = lab.numericValue ?? parseFloat(String(lab.value).replace(/[^0-9.-]/g, ''));
    if (!isNaN(num)) {
      if (tName.includes('egfr') || tName.includes('glomerular')) egfr = num;
      if (tName.includes('potassium')) potassium = num;
    }
  }

  if (egfr === undefined) {
    const egfrMatch = fullText.match(/egfr\s*(?:is|of|:|=)?\s*(\d{1,3})/i);
    if (egfrMatch) egfr = parseFloat(egfrMatch[1]);
  }
  if (potassium === undefined) {
    const kMatch = fullText.match(/potassium\s*(?:is|of|:|=)?\s*(\d\.\d)/i) || fullText.match(/k\+?\s*(?:is|of|:|=)?\s*(\d\.\d)/i);
    if (kMatch) potassium = parseFloat(kMatch[1]);
  }

  for (const med of meds) {
    const medLower = med.toLowerCase();

    // 1. Metformin in eGFR < 30
    if (medLower.includes('metformin') && egfr !== undefined && egfr < 30) {
      conflicts.push({
        id: 'conflict-metformin-egfr',
        offendingMedication: med,
        conflictType: 'renal_contraindication',
        severity: 'critical',
        clinicalExplanation: `FDA Boxed Warning: ${med} is contraindicated at eGFR ${egfr} mL/min/1.73m² (< 30) due to high risk of fatal Metformin-Associated Lactic Acidosis (MALA).`,
        recommendedActionLabel: 'Discontinue Metformin & Substitute Linagliptin 5 mg PO Daily',
        replacementMedication: {
          medicationName: 'Linagliptin',
          dosage: '5 mg',
          route: 'PO',
          frequency: 'Once daily',
          quantity: '30 tablets',
          indication: 'Type 2 Diabetes (Renally Safe in CKD Stage 4)',
          rationale: 'Hepatobiliary excretion (>80%); requires no renal dose adjustment at any eGFR.',
        },
        planDocumentationNote: `[MEDICATION RECONCILIATION]: Discontinued ${med} due to eGFR ${egfr} mL/min/1.73m² (< 30 contraindication; MALA risk). Substituted Linagliptin 5 mg PO once daily.`,
      });
    }

    // 2. Spironolactone + ACEi/ARB or Hyperkalemia
    const hasAceOrArb = meds.some((m) => /lisinopril|enalapril|ramipril|losartan|valsartan/i.test(m));
    if (
      medLower.includes('spironolactone') &&
      (hasAceOrArb || (potassium !== undefined && potassium >= 5.2))
    ) {
      conflicts.push({
        id: 'conflict-spironolactone-k',
        offendingMedication: med,
        conflictType: 'hyperkalemia_ddi',
        severity: 'critical',
        clinicalExplanation: `Concurrent ${med} with RAAS blockade ${potassium ? `and Serum K⁺ ${potassium} mEq/L` : ''} carries severe life-threatening hyperkalemic arrhythmia risk.`,
        recommendedActionLabel: 'Hold Spironolactone & Order Sodium Zirconium Cyclosilicate 10 g PO',
        replacementMedication: {
          medicationName: 'Sodium Zirconium Cyclosilicate',
          dosage: '10 g',
          route: 'PO',
          frequency: 'TID x 48h (Hyperkalemia Protocol)',
          quantity: '6 packets',
          indication: 'Drug-Induced Hyperkalemia Reversal',
          rationale: 'Rapidly binds potassium in GI tract while potassium-sparing diuretic is held.',
        },
        planDocumentationNote: `[MEDICATION RECONCILIATION]: Held ${med} due to RAASi interaction / hyperkalemia risk. Ordered repeat BMP and potassium binder protocol.`,
      });
    }

    // 3. Penicillin / Amoxicillin Allergy Cross-Reactivity or Pediatric Overdose
    const hasPcnAllergy = allergies.some((a) => a.includes('penicillin') || a.includes('amoxicillin'));
    if (/amoxicillin|ampicillin|penicillin|augmentin/i.test(medLower) && hasPcnAllergy) {
      conflicts.push({
        id: 'conflict-amox-allergy',
        offendingMedication: med,
        conflictType: 'allergy_cross_reactivity',
        severity: 'critical',
        clinicalExplanation: `${med} is contraindicated in patient with documented Penicillin allergy (${note.allergies.join(', ')}).`,
        recommendedActionLabel: 'Discontinue Amoxicillin & Substitute Cefdinir (Weight-Adjusted)',
        replacementMedication: {
          medicationName: 'Cefdinir',
          dosage: patient.age > 0 && patient.age < 12 && patient.vitals.weightKg > 0
            ? `${Math.min(600, Math.round(patient.vitals.weightKg * 14))} mg/day`
            : '300 mg',
          route: 'PO',
          frequency: 'Once daily for 10 days',
          quantity: '1 bottle / 10 days',
          indication: 'Beta-Lactam Allergic Alternative for Acute Otitis Media / Respiratory Infection',
          rationale: '3rd-generation cephalosporin with distinct R1 side chain (negligible cross-reactivity in non-anaphylactic PCN allergy) at safe weight-based dosing (14 mg/kg/day).',
        },
        planDocumentationNote: `[MEDICATION RECONCILIATION]: Discontinued ${med} due to documented Penicillin allergy. Substituted weight-adjusted Cefdinir (14 mg/kg/day).`,
      });
    }

    // 4. NSAIDs in Heart Failure / CKD / Peptic Ulcer / Anticoagulation
    if (/ibuprofen|naproxen|meloxicam|ketorolac|diclofenac/i.test(medLower)) {
      conflicts.push({
        id: 'conflict-nsaid-cardiorenal',
        offendingMedication: med,
        conflictType: 'renal_contraindication',
        severity: 'high',
        clinicalExplanation: `NSAID (${med}) inhibits afferent arteriolar prostaglandin vasodilation, worsening renal perfusion, sodium retention, heart failure, and GI bleeding risk.`,
        recommendedActionLabel: 'Discontinue NSAID & Substitute Acetaminophen 500 mg PO PRN',
        replacementMedication: {
          medicationName: 'Acetaminophen',
          dosage: '500 mg',
          route: 'PO',
          frequency: 'Q6H PRN pain (Max 2,000–3,000 mg/day)',
          quantity: '30 tablets',
          indication: 'Cardio-Renal Safe Analgesia',
          rationale: 'Avoids prostaglandin-mediated afferent arteriolar vasoconstriction and platelet inhibition.',
        },
        planDocumentationNote: `[MEDICATION RECONCILIATION]: Discontinued ${med} (NSAID) to prevent nephrotoxicity and sodium/fluid retention; switched to Acetaminophen.`,
      });
    }
  }

  return conflicts;
}

export function buildCpoeFhirBundle(
  patient: PatientRecord,
  selectedOrders: CpoeOrderItem[],
  clinicianName: string = 'Dr. Elena Rossi, MD'
): Record<string, any> {
  const timestamp = new Date().toISOString();
  const entries = selectedOrders.map((order) => {
    if (order.medicationPayload) {
      return {
        fullUrl: `urn:uuid:medreq-${order.id}`,
        resource: {
          resourceType: 'MedicationRequest',
          id: `medreq-${order.id}`,
          status: 'active',
          intent: 'order',
          priority: order.priority.toLowerCase(),
          authoredOn: timestamp,
          subject: {
            reference: `Patient/${patient.id || 'pt-1'}`,
            display: patient.name || 'Clinical Patient',
          },
          requester: {
            display: clinicianName,
          },
          medicationCodeableConcept: {
            coding: [
              {
                system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
                code: order.loincOrRxNormCode.replace(/^RxNorm:/i, ''),
                display: order.medicationPayload.medicationName,
              },
            ],
            text: `${order.medicationPayload.medicationName} ${order.medicationPayload.dosage} ${order.medicationPayload.route} ${order.medicationPayload.frequency}`,
          },
          dosageInstruction: [
            {
              text: `${order.medicationPayload.dosage} ${order.medicationPayload.route} ${order.medicationPayload.frequency}`,
              route: { text: order.medicationPayload.route },
            },
          ],
          note: [{ text: order.clinicalRationale }],
        },
      };
    }

    return {
      fullUrl: `urn:uuid:srvreq-${order.id}`,
      resource: {
        resourceType: 'ServiceRequest',
        id: `srvreq-${order.id}`,
        status: 'active',
        intent: 'order',
        priority: order.priority.toLowerCase(),
        authoredOn: timestamp,
        subject: {
          reference: `Patient/${patient.id || 'pt-1'}`,
          display: patient.name || 'Clinical Patient',
        },
        requester: {
          display: clinicianName,
        },
        category: [
          {
            coding: [
              {
                system: 'http://snomed.info/sct',
                display: order.category,
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: order.loincOrRxNormCode.replace(/^LOINC:/i, ''),
              display: order.title,
            },
          ],
          text: order.title,
        },
        note: [{ text: order.clinicalRationale }],
      },
    };
  });

  return {
    resourceType: 'Bundle',
    id: `cpoe-bundle-${Date.now()}`,
    type: 'transaction',
    timestamp,
    total: entries.length,
    entry: entries,
  };
}
