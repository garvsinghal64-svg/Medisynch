import { parseFhirBundleToClinicalInput, FhirBundle } from '../src/utils/fhirParser';
import { parseHl7ToClinicalInput, convertHl7ToFhirBundle } from '../src/utils/hl7Bridge';
import {
  evaluateClinicalCase,
  getClinicalArchetypeByIndex,
} from '../src/utils/clinicalHeuristics';
import { extractQuantitativeBadges } from '../src/components/ClinicalAlertBanner';

export function runFhirPipelineIntegrationTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: Complex FHIR R4 Bundle -> T2D_CKD_METFORMIN Archetype (with Refuted/Stopped Negation Guards)
  try {
    const complexT2dCkdBundle: FhirBundle = {
      resourceType: 'Bundle',
      id: 'bundle-t2d-ckd-metformin-001',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Patient',
            id: 'pt-fhir-8821',
            name: [{ family: 'Thornton', given: ['Arthur', 'J'] }],
            gender: 'male',
            birthDate: '1958-04-19',
            identifier: [{ system: 'http://hospital.example.org/mrn', value: 'MRN-882104' }],
          },
        },
        // Vitals Observations
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-wt-1',
            status: 'final',
            code: {
              coding: [{ system: 'http://loinc.org', code: '29463-7', display: 'Body weight' }],
              text: 'Body weight',
            },
            valueQuantity: { value: 84.5, unit: 'kg', system: 'http://unitsofmeasure.org', code: 'kg' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-bp-1',
            status: 'final',
            code: {
              coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel' }],
            },
            component: [
              {
                code: { coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }] },
                valueQuantity: { value: 136, unit: 'mmHg' },
              },
              {
                code: { coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }] },
                valueQuantity: { value: 84, unit: 'mmHg' },
              },
            ],
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-hr-1',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '8867-4', display: 'Heart rate' }] },
            valueQuantity: { value: 78, unit: '/min' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-rr-1',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '9279-1', display: 'Respiratory rate' }] },
            valueQuantity: { value: 16, unit: '/min' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-temp-1',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '8310-5', display: 'Body temperature' }] },
            valueQuantity: { value: 37.0, unit: 'Cel' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-spo2-1',
            status: 'final',
            code: { coding: [{ system: 'http://loinc.org', code: '59408-5', display: 'Oxygen saturation in Arterial blood by Pulse oximetry' }] },
            valueQuantity: { value: 98, unit: '%' },
          },
        },
        // Quantitative Lab Observations: eGFR 24 (LOINC 33914-3) & Creatinine 2.4 (LOINC 2160-0)
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-egfr-1',
            status: 'final',
            code: {
              coding: [{ system: 'http://loinc.org', code: '33914-3', display: 'Glomerular filtration rate/1.73 sq M.predicted' }],
              text: 'eGFR',
            },
            valueQuantity: { value: 24, unit: 'mL/min/1.73m2' },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-cr-1',
            status: 'final',
            code: {
              coding: [{ system: 'http://loinc.org', code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma' }],
              text: 'Serum Creatinine',
            },
            valueQuantity: { value: 2.4, unit: 'mg/dL' },
          },
        },
        // Active Condition: Type 2 Diabetes Mellitus
        {
          resource: {
            resourceType: 'Condition',
            id: 'cond-t2d',
            clinicalStatus: { coding: [{ code: 'active' }] },
            verificationStatus: { coding: [{ code: 'confirmed' }] },
            code: {
              coding: [{ system: 'http://hl7.org/fhir/sid/icd-10-cm', code: 'E11.22', display: 'Type 2 diabetes mellitus with diabetic chronic kidney disease' }],
              text: 'Type 2 diabetes mellitus with CKD stage 4',
            },
          },
        },
        // Refuted Condition: Acute Appendicitis (Must NOT trigger false positive)
        {
          resource: {
            resourceType: 'Condition',
            id: 'cond-refuted-appy',
            clinicalStatus: { coding: [{ code: 'inactive' }] },
            verificationStatus: { coding: [{ code: 'refuted' }] },
            code: {
              coding: [{ code: 'K35.80', display: 'appendicitis' }],
              text: 'appendicitis',
            },
          },
        },
        // Active MedicationRequest: Metformin 1000mg BID
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: 'med-metformin',
            status: 'active',
            medicationCodeableConcept: {
              coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '861004', display: 'Metformin hydrochloride 1000 MG Oral Tablet' }],
              text: 'Metformin 1000mg',
            },
            dosageInstruction: [{ text: '1000 mg BID' }],
          },
        },
        // Stopped MedicationRequest: Linezolid (Must NOT trigger false positive)
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: 'med-stopped-linezolid',
            status: 'stopped',
            medicationCodeableConcept: {
              coding: [{ display: 'linezolid' }],
              text: 'linezolid',
            },
          },
        },
      ],
    };

    const clinicalInput = parseFhirBundleToClinicalInput(complexT2dCkdBundle);
    const evalResult = evaluateClinicalCase(clinicalInput);

    const matchedT2dMetformin = evalResult.matchedArchetypes.includes('T2D_CKD_METFORMIN');
    const zeroFalsePositives =
      !evalResult.matchedArchetypes.includes('ACUTE_APPENDICITIS') &&
      evalResult.matchedArchetypes.length === 1;
    const hasBoxedWarningAlert = evalResult.drugAlerts.some((a) =>
      a.toLowerCase().includes('metformin') && a.toLowerCase().includes('eGFR < 30'.toLowerCase())
    );
    const hasQuantFlag = evalResult.quantitativeFlags.includes('METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)');
    const vitalsComplete =
      clinicalInput.vitals?.weightKg === 84.5 &&
      clinicalInput.vitals?.bp === '136/84' &&
      evalResult.missingVitals.length === 0;

    if (matchedT2dMetformin && zeroFalsePositives && hasBoxedWarningAlert && hasQuantFlag && vitalsComplete) {
      results.push({
        name: 'FHIR R4 Bundle Parser -> T2D_CKD_METFORMIN (eGFR 24, Weight 84.5kg & 0 False Positives)',
        passed: true,
      });
    } else {
      results.push({
        name: 'FHIR R4 Bundle Parser -> T2D_CKD_METFORMIN (eGFR 24, Weight 84.5kg & 0 False Positives)',
        passed: false,
        details: `matched=${matchedT2dMetformin}, zeroFP=${zeroFalsePositives} (${evalResult.matchedArchetypes.join(',')}), alert=${hasBoxedWarningAlert}, quant=${hasQuantFlag}, vitals=${vitalsComplete}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'FHIR R4 Bundle Parser -> T2D_CKD_METFORMIN',
      passed: false,
      details: err.message,
    });
  }

  // Test 2: HL7 v2.5.1 ORU^R01 Message -> HYPERKALEMIA_SPIRONOLACTONE_ACEI (with OBX K+ > 5.5)
  try {
    const hl7OruR01 = [
      'MSH|^~\\&|LAB_SYS|GENERAL_HOSP|CURADOC_CDS|CLINIC|20261022061500||ORU^R01|MSG-99201|P|2.5.1',
      'PID|1||MRN-554192^^^GENERAL_HOSP^MR||VANCE^ELEANOR^M||19540822|F',
      'AL1|1|DA|7980^Penicillin^RXNORM|SV|Anaphylaxis',
      'RXE|1|99901^Spironolactone^RXNORM|25||mg||daily',
      'RXO|314076^Lisinopril^RXNORM|20||mg||daily',
      'OBR|1|ORD-881|LAB-881|24323-8^Comprehensive metabolic panel^LN',
      'OBX|1|NM|29463-7^Body weight^LN||72.4|kg|45-100|N|||F',
      'OBX|2|ST|85354-9^Blood pressure panel^LN||132/78|mmHg||N|||F',
      'OBX|3|NM|8867-4^Heart rate^LN||74|/min|60-100|N|||F',
      'OBX|4|NM|9279-1^Respiratory rate^LN||16|/min|12-20|N|||F',
      'OBX|5|NM|8310-5^Body temperature^LN||36.8|Cel|36.1-37.5|N|||F',
      'OBX|6|NM|59408-5^Oxygen saturation^LN||99|%|95-100|N|||F',
      'OBX|7|NM|2823-3^Potassium [Moles/volume] in Serum or Plasma^LN||5.8|mEq/L|3.5-5.0|HH|||F',
    ].join('\r\n');

    const clinicalInput = parseHl7ToClinicalInput(hl7OruR01);
    const evalResult = evaluateClinicalCase(clinicalInput);

    const matchedHyperk = evalResult.matchedArchetypes.includes('HYPERKALEMIA_SPIRONOLACTONE_ACEI');
    const zeroFalsePositives = evalResult.matchedArchetypes.length === 1;
    const hasRaasAlert = evalResult.drugAlerts.some((a) =>
      a.toLowerCase().includes('spironolactone') && a.toLowerCase().includes('hyperkalemia')
    );
    const hasCriticalKFlag = evalResult.quantitativeFlags.includes('CRITICAL_HYPERKALEMIA(K+=5.8)');
    const demographicsAndVitalsOk =
      clinicalInput.demographics?.mrn === 'MRN-554192' &&
      clinicalInput.vitals?.weightKg === 72.4 &&
      clinicalInput.allergies?.some((a) => a.toLowerCase().includes('penicillin')) &&
      evalResult.missingVitals.length === 0;

    if (matchedHyperk && zeroFalsePositives && hasRaasAlert && hasCriticalKFlag && demographicsAndVitalsOk) {
      results.push({
        name: 'HL7 v2.5.1 ORU^R01 Bridge -> HYPERKALEMIA_SPIRONOLACTONE_ACEI (K+ 5.8 mEq/L & 0 False Positives)',
        passed: true,
      });
    } else {
      results.push({
        name: 'HL7 v2.5.1 ORU^R01 Bridge -> HYPERKALEMIA_SPIRONOLACTONE_ACEI (K+ 5.8 mEq/L & 0 False Positives)',
        passed: false,
        details: `matched=${matchedHyperk}, zeroFP=${zeroFalsePositives} (${evalResult.matchedArchetypes.join(',')}), alert=${hasRaasAlert}, kFlag=${hasCriticalKFlag}, demoVitals=${demographicsAndVitalsOk}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'HL7 v2.5.1 ORU^R01 Bridge -> HYPERKALEMIA_SPIRONOLACTONE_ACEI',
      passed: false,
      details: err.message,
    });
  }

  // Test 3: 100,000-Archetype Matrix Routing via both FHIR R4 Bundle & HL7 v2.5.1 ADT^A01
  try {
    const targetArchIdx = 42819; // Compositional 100k-matrix archetype
    const targetArch = getClinicalArchetypeByIndex(targetArchIdx);

    // 1. Construct FHIR R4 Bundle for Archetype #42819
    const matrixFhirBundle: FhirBundle = {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'Condition',
            clinicalStatus: 'active',
            verificationStatus: 'confirmed',
            code: { text: `${targetArch.syndrome.name} (${targetArch.syndrome.keyToken})` },
          },
        },
        {
          resource: {
            resourceType: 'MedicationRequest',
            status: 'active',
            medicationCodeableConcept: { text: `${targetArch.regimen.drugName} (${targetArch.regimen.keyToken})` },
          },
        },
        {
          resource: {
            resourceType: 'Observation',
            status: 'final',
            code: { text: targetArch.modifier.category },
            valueString: `${targetArch.modifier.label} (${targetArch.modifier.keyToken})`,
          },
        },
      ],
    };

    // 2. Construct HL7 v2.5.1 ADT^A01 message for Archetype #42819
    const matrixHl7AdtA01 = [
      'MSH|^~\\&|EPIC_ADT|HOSP|CURADOC_CDS|HOSP|20261022061600||ADT^A01|MSG-42819|P|2.5.1',
      'PID|1||MRN-42819^^^HOSP^MR||MATRIX^PATIENT||19700101|M',
      `DG1|1|I10|${targetArch.syndrome.icd10}^${targetArch.syndrome.name} (${targetArch.syndrome.keyToken})^I10|${targetArch.syndrome.name} (${targetArch.syndrome.keyToken})`,
      `RXO|${targetArch.regimen.code}^${targetArch.regimen.drugName} (${targetArch.regimen.keyToken})^RXNORM|1||dose`,
      `OBX|1|TX|MOD^${targetArch.modifier.category}^LN||${targetArch.modifier.label} (${targetArch.modifier.keyToken})||||||F`,
    ].join('\r\n');

    const fhirEval = evaluateClinicalCase(parseFhirBundleToClinicalInput(matrixFhirBundle));
    const hl7Bundle = convertHl7ToFhirBundle(matrixHl7AdtA01);
    const hl7Eval = evaluateClinicalCase(parseFhirBundleToClinicalInput(hl7Bundle));

    const fhirMatchedExact =
      fhirEval.matchedArchetypes.length === 1 &&
      fhirEval.matchedArchetypes[0] === targetArch.id &&
      fhirEval.drugAlerts.length === 1 &&
      fhirEval.quantitativeFlags.includes(targetArch.modifier.quantFlag);

    const hl7MatchedExact =
      hl7Eval.matchedArchetypes.length === 1 &&
      hl7Eval.matchedArchetypes[0] === targetArch.id &&
      hl7Eval.drugAlerts.length === 1 &&
      hl7Eval.quantitativeFlags.includes(targetArch.modifier.quantFlag);

    if (fhirMatchedExact && hl7MatchedExact) {
      results.push({
        name: `EHR Ingestion Pipeline -> 100k-Matrix Archetype (${targetArch.id}) Verified via FHIR R4 & HL7 ADT^A01`,
        passed: true,
      });
    } else {
      results.push({
        name: `EHR Ingestion Pipeline -> 100k-Matrix Archetype (${targetArch.id}) Verified via FHIR R4 & HL7 ADT^A01`,
        passed: false,
        details: `fhirOk=${fhirMatchedExact} (${fhirEval.matchedArchetypes.join(',')}), hl7Ok=${hl7MatchedExact} (${hl7Eval.matchedArchetypes.join(',')})`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'EHR Ingestion Pipeline -> 100k-Matrix Archetype Routing',
      passed: false,
      details: err.message,
    });
  }

  // Test 4: ClinicalAlertBanner Quantitative Pill Badge Extraction
  try {
    const badges = extractQuantitativeBadges([
      'METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)',
      'CRITICAL_HYPERKALEMIA(K+=5.8)',
    ]);
    const hasEgfr = badges.includes('eGFR=24');
    const hasCr = badges.includes('Cr=2.4');
    const hasK = badges.includes('K+=5.8');

    if (hasEgfr && hasCr && hasK && badges.length === 3) {
      results.push({
        name: 'ClinicalAlertBanner: Quantitative Trigger Badges Extracted Accurately',
        passed: true,
      });
    } else {
      results.push({
        name: 'ClinicalAlertBanner: Quantitative Trigger Badges Extracted Accurately',
        passed: false,
        details: `Got badges: ${badges.join(', ')}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'ClinicalAlertBanner Quantitative Badges',
      passed: false,
      details: err.message,
    });
  }

  return results;
}
