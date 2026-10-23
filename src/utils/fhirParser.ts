import { ClinicalEvaluationInput } from './clinicalHeuristics';

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirQuantity {
  value?: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirObservationComponent {
  code?: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueString?: string;
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  status?: string;
  clinicalStatus?: FhirCodeableConcept | string;
  verificationStatus?: FhirCodeableConcept | string;
  code?: FhirCodeableConcept;
  medicationCodeableConcept?: FhirCodeableConcept;
  valueQuantity?: FhirQuantity;
  valueString?: string;
  component?: FhirObservationComponent[];
  dosageInstruction?: Array<{
    text?: string;
    doseAndRate?: Array<{
      doseQuantity?: FhirQuantity;
    }>;
  }>;
  dosage?: Array<{
    text?: string;
  }>;
  reaction?: Array<{
    manifestation?: FhirCodeableConcept[];
    severity?: string;
  }>;
  name?: Array<{
    text?: string;
    family?: string;
    given?: string[];
  }>;
  gender?: string;
  birthDate?: string;
  identifier?: Array<{
    system?: string;
    value?: string;
    type?: FhirCodeableConcept;
  }>;
  note?: Array<{ text?: string }>;
  description?: string;
  summary?: string;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id?: string;
  type?: string;
  entry?: Array<{
    fullUrl?: string;
    resource?: FhirResource;
  }>;
}

// Standard LOINC Codes for Vitals & Quantitative Clinical Labs
const LOINC_WEIGHT = new Set(['29463-7', '3141-9', '8335-2']);
const LOINC_HEART_RATE = new Set(['8867-4', '8889-8']);
const LOINC_RESP_RATE = new Set(['9279-1']);
const LOINC_TEMP = new Set(['8310-5', '8331-1', '8328-7']);
const LOINC_SPO2 = new Set(['59408-5', '2708-6']);
const LOINC_BP_PANEL = new Set(['85354-9', '55284-4']);
const LOINC_BP_SYSTOLIC = new Set(['8480-6']);
const LOINC_BP_DIASTOLIC = new Set(['8462-4']);

const LOINC_EGFR = new Set(['33914-3', '62238-1', '48643-1', '98979-8', '77147-7']);
const LOINC_CREATININE = new Set(['2160-0', '38483-4']);
const LOINC_POTASSIUM = new Set(['2823-3', '6298-4']);

function extractCodes(concept?: FhirCodeableConcept): string[] {
  if (!concept) return [];
  const codes: string[] = [];
  if (Array.isArray(concept.coding)) {
    for (const c of concept.coding) {
      if (c.code) codes.push(c.code.trim());
    }
  }
  return codes;
}

function extractDisplayStrings(concept?: FhirCodeableConcept): string[] {
  if (!concept) return [];
  const displays: string[] = [];
  if (concept.text && concept.text.trim()) {
    displays.push(concept.text.trim());
  }
  if (Array.isArray(concept.coding)) {
    for (const c of concept.coding) {
      if (c.display && c.display.trim() && !displays.includes(c.display.trim())) {
        displays.push(c.display.trim());
      }
    }
  }
  return displays;
}

function extractConceptStatus(statusField?: FhirCodeableConcept | string): string {
  if (!statusField) return '';
  if (typeof statusField === 'string') return statusField.toLowerCase();
  if (statusField.text) return statusField.text.toLowerCase();
  if (Array.isArray(statusField.coding) && statusField.coding.length > 0) {
    return (statusField.coding[0].code || statusField.coding[0].display || '').toLowerCase();
  }
  return '';
}

/**
 * Parses a standard FHIR R4 Bundle (JSON object or serialized JSON string)
 * and maps demographics, vitals, quantitative labs, medications, conditions,
 * and allergies into `ClinicalEvaluationInput`.
 */
export function parseFhirBundleToClinicalInput(bundleInput: FhirBundle | string): ClinicalEvaluationInput {
  const bundle: FhirBundle =
    typeof bundleInput === 'string' ? (JSON.parse(bundleInput) as FhirBundle) : bundleInput;

  if (!bundle || bundle.resourceType !== 'Bundle') {
    throw new Error('Invalid FHIR R4 payload: expected resourceType "Bundle".');
  }

  const noteSegments: string[] = [];
  const medications: string[] = [];
  const allergies: string[] = [];
  const problems: string[] = [];
  const demographics: NonNullable<ClinicalEvaluationInput['demographics']> = {};
  const vitals: NonNullable<ClinicalEvaluationInput['vitals']> = {};

  let standaloneSystolic: number | null = null;
  let standaloneDiastolic: number | null = null;

  const entries = Array.isArray(bundle.entry) ? bundle.entry : [];

  for (const entry of entries) {
    const res = entry?.resource;
    if (!res || !res.resourceType) continue;

    switch (res.resourceType) {
      case 'Patient': {
        if (res.id) demographics.patientId = res.id;
        if (res.gender) demographics.gender = res.gender;
        if (res.birthDate) demographics.birthDate = res.birthDate;
        if (Array.isArray(res.name) && res.name.length > 0) {
          const n = res.name[0];
          if (n.text) {
            demographics.fullName = n.text;
          } else {
            const given = Array.isArray(n.given) ? n.given.join(' ') : '';
            const family = n.family || '';
            const full = `${given} ${family}`.trim();
            if (full) demographics.fullName = full;
          }
        }
        if (Array.isArray(res.identifier)) {
          for (const idObj of res.identifier) {
            if (idObj.value) {
              demographics.mrn = idObj.value;
              break;
            }
          }
        }
        break;
      }

      case 'Observation': {
        const status = (res.status || '').toLowerCase();
        if (status === 'entered-in-error' || status === 'cancelled') break;

        const codes = extractCodes(res.code);
        const displays = extractDisplayStrings(res.code);
        const displayLower = displays.join(' ').toLowerCase();
        const val = res.valueQuantity?.value;
        const unit = (res.valueQuantity?.unit || res.valueQuantity?.code || '').toLowerCase();

        // 1. Body Weight (LOINC 29463-7)
        if (codes.some((c) => LOINC_WEIGHT.has(c)) || displayLower.includes('body weight') || displayLower === 'weight') {
          if (typeof val === 'number' && !isNaN(val)) {
            const weightKg = unit.includes('lb') ? Number((val * 0.45359237).toFixed(2)) : val;
            vitals.weightKg = weightKg;
            noteSegments.push(`wt: ${weightKg} kg`);
          }
          break;
        }

        // 2. Heart Rate (LOINC 8867-4)
        if (codes.some((c) => LOINC_HEART_RATE.has(c)) || displayLower.includes('heart rate')) {
          if (typeof val === 'number' && !isNaN(val)) {
            vitals.hr = val;
          }
          break;
        }

        // 3. Respiratory Rate (LOINC 9279-1)
        if (codes.some((c) => LOINC_RESP_RATE.has(c)) || displayLower.includes('respiratory rate')) {
          if (typeof val === 'number' && !isNaN(val)) {
            vitals.rr = val;
          }
          break;
        }

        // 4. Body Temperature (LOINC 8310-5)
        if (codes.some((c) => LOINC_TEMP.has(c)) || displayLower.includes('body temperature') || displayLower === 'temperature') {
          if (typeof val === 'number' && !isNaN(val)) {
            const isFahrenheit = unit.includes('f') || val > 45;
            vitals.temp = isFahrenheit ? Number((((val - 32) * 5) / 9).toFixed(1)) : val;
          }
          break;
        }

        // 5. SpO2 / Oxygen Saturation (LOINC 59408-5 / 2708-6)
        if (codes.some((c) => LOINC_SPO2.has(c)) || displayLower.includes('oxygen saturation') || displayLower.includes('spo2')) {
          if (typeof val === 'number' && !isNaN(val)) {
            vitals.spo2 = val;
          }
          break;
        }

        // 6. Blood Pressure Panel (LOINC 85354-9 / 55284-4) or Standalone Systolic/Diastolic
        if (codes.some((c) => LOINC_BP_PANEL.has(c)) || displayLower.includes('blood pressure')) {
          if (typeof res.valueString === 'string' && res.valueString.includes('/')) {
            vitals.bp = res.valueString.trim();
          } else if (Array.isArray(res.component)) {
            let sys: number | null = null;
            let dia: number | null = null;
            for (const comp of res.component) {
              const compCodes = extractCodes(comp.code);
              const compDisp = extractDisplayStrings(comp.code).join(' ').toLowerCase();
              const compVal = comp.valueQuantity?.value;
              if (typeof compVal === 'number') {
                if (compCodes.some((c) => LOINC_BP_SYSTOLIC.has(c)) || compDisp.includes('systolic')) {
                  sys = compVal;
                } else if (compCodes.some((c) => LOINC_BP_DIASTOLIC.has(c)) || compDisp.includes('diastolic')) {
                  dia = compVal;
                }
              }
            }
            if (sys !== null && dia !== null) {
              vitals.bp = `${Math.round(sys)}/${Math.round(dia)}`;
            }
          }
          break;
        }

        if (codes.some((c) => LOINC_BP_SYSTOLIC.has(c)) || displayLower.includes('systolic blood pressure')) {
          if (typeof val === 'number') standaloneSystolic = val;
          break;
        }
        if (codes.some((c) => LOINC_BP_DIASTOLIC.has(c)) || displayLower.includes('diastolic blood pressure')) {
          if (typeof val === 'number') standaloneDiastolic = val;
          break;
        }

        // 7. Quantitative Labs: eGFR (LOINC 33914-3 or 62238-1)
        if (codes.some((c) => LOINC_EGFR.has(c)) || displayLower.includes('egfr') || displayLower.includes('glomerular filtration')) {
          if (typeof val === 'number' && !isNaN(val)) {
            noteSegments.push(`eGFR is ${val} mL/min`);
          } else if (res.valueString) {
            noteSegments.push(`eGFR is ${res.valueString}`);
          }
          break;
        }

        // 8. Quantitative Labs: Creatinine (LOINC 2160-0)
        if (codes.some((c) => LOINC_CREATININE.has(c)) || displayLower.includes('creatinine')) {
          if (typeof val === 'number' && !isNaN(val)) {
            noteSegments.push(`Creatinine is ${val} mg/dL`);
          } else if (res.valueString) {
            noteSegments.push(`Creatinine is ${res.valueString}`);
          }
          break;
        }

        // 9. Quantitative Labs: Potassium (LOINC 2823-3)
        if (codes.some((c) => LOINC_POTASSIUM.has(c)) || displayLower.includes('potassium')) {
          if (typeof val === 'number' && !isNaN(val)) {
            noteSegments.push(`Potassium is ${val} mEq/L`);
          } else if (res.valueString) {
            noteSegments.push(`Potassium is ${res.valueString}`);
          }
          break;
        }

        // 10. General Clinical Observation / Compositional Modifier Notes
        if (res.valueString) {
          noteSegments.push(res.valueString);
        } else if (typeof val === 'number' && displays.length > 0) {
          noteSegments.push(`${displays[0]} is ${val} ${res.valueQuantity?.unit || ''}`.trim());
        }
        if (Array.isArray(res.note)) {
          for (const n of res.note) {
            if (n.text) noteSegments.push(n.text);
          }
        }
        break;
      }

      case 'MedicationRequest':
      case 'MedicationStatement':
      case 'MedicationAdministration': {
        const status = (res.status || 'active').toLowerCase();
        const medNames = extractDisplayStrings(res.medicationCodeableConcept || res.code);
        const dosageTexts: string[] = [];

        if (Array.isArray(res.dosageInstruction)) {
          for (const d of res.dosageInstruction) {
            if (d.text) dosageTexts.push(d.text.trim());
            else if (Array.isArray(d.doseAndRate)) {
              for (const dr of d.doseAndRate) {
                if (dr.doseQuantity?.value !== undefined) {
                  dosageTexts.push(`${dr.doseQuantity.value} ${dr.doseQuantity.unit || 'mg'}`.trim());
                }
              }
            }
          }
        }
        if (Array.isArray(res.dosage)) {
          for (const d of res.dosage) {
            if (d.text) dosageTexts.push(d.text.trim());
          }
        }

        if (medNames.length > 0) {
          const primaryMed = medNames.join(' ');
          const fullMedText = dosageTexts.length > 0 ? `${primaryMed} ${dosageTexts.join(' ')}` : primaryMed;

          if (status === 'stopped' || status === 'cancelled' || status === 'entered-in-error') {
            noteSegments.push(`discontinued ${primaryMed}`);
          } else {
            medications.push(fullMedText);
            noteSegments.push(`prescribed ${fullMedText}`);
          }
        }
        break;
      }

      case 'Condition': {
        const clinStatus = extractConceptStatus(res.clinicalStatus);
        const verStatus = extractConceptStatus(res.verificationStatus);
        const condNames = extractDisplayStrings(res.code);

        if (condNames.length > 0) {
          const condText = condNames.join(' — ');
          if (verStatus === 'refuted' || verStatus === 'entered-in-error' || clinStatus === 'inactive' || clinStatus === 'resolved') {
            noteSegments.push(`ruled out ${condText}`);
          } else {
            problems.push(condText);
            noteSegments.push(condText);
          }
        }
        if (Array.isArray(res.note)) {
          for (const n of res.note) {
            if (n.text) noteSegments.push(n.text);
          }
        }
        break;
      }

      case 'AllergyIntolerance': {
        const verStatus = extractConceptStatus(res.verificationStatus);
        const allergyNames = extractDisplayStrings(res.code);
        const reactions: string[] = [];
        if (Array.isArray(res.reaction)) {
          for (const r of res.reaction) {
            if (Array.isArray(r.manifestation)) {
              for (const m of r.manifestation) {
                reactions.push(...extractDisplayStrings(m));
              }
            }
          }
        }

        if (allergyNames.length > 0) {
          const baseAllergy = allergyNames.join(' ');
          const fullAllergy = reactions.length > 0 ? `${baseAllergy} (${reactions.join(', ')})` : baseAllergy;
          if (verStatus === 'refuted' || verStatus === 'entered-in-error') {
            noteSegments.push(`no ${baseAllergy} allergy`);
          } else {
            allergies.push(fullAllergy);
            // Normalize e.g. "Penicillin" -> "allergic to Penicillin, Penicillin allergy" so heuristics match
            const cleanedSubstance = baseAllergy.replace(/\s*allergy$/i, '').trim();
            noteSegments.push(`allergic to ${cleanedSubstance} (${cleanedSubstance} allergy)`);
          }
        }
        break;
      }

      default: {
        if (res.description) noteSegments.push(res.description);
        if (res.summary) noteSegments.push(res.summary);
        if (Array.isArray(res.note)) {
          for (const n of res.note) {
            if (n.text) noteSegments.push(n.text);
          }
        }
        break;
      }
    }
  }

  if (!vitals.bp && standaloneSystolic !== null && standaloneDiastolic !== null) {
    vitals.bp = `${Math.round(standaloneSystolic)}/${Math.round(standaloneDiastolic)}`;
  }

  return {
    noteText: noteSegments.join(' . '),
    medications,
    allergies,
    problems,
    demographics,
    vitals,
  };
}
