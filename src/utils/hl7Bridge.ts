import { ClinicalEvaluationInput } from './clinicalHeuristics';
import { FhirBundle, FhirResource, parseFhirBundleToClinicalInput } from './fhirParser';

export interface ParsedHl7Metadata {
  messageType: string;
  controlId: string;
  version: string;
}

/**
 * Splits an HL7 v2 composite field (e.g. "2823-3^Potassium^LN") into components.
 */
function splitComponents(field: string, componentSep = '^'): string[] {
  if (!field) return [];
  return field.split(componentSep).map((s) => s.trim());
}

/**
 * Extracts code and human-readable display from an HL7 CE/CWE field (e.g., "2823-3^Potassium [Moles/volume] in Serum^LN").
 */
function parseCodedElement(field: string, componentSep = '^'): { code: string; display: string; system: string } {
  const parts = splitComponents(field, componentSep);
  const code = parts[0] || '';
  const display = parts[1] || parts[0] || '';
  const system = parts[2] || '';
  return { code, display, system };
}

/**
 * Converts a raw HL7 v2.5.1 message (such as ADT^A01 or ORU^R01) into a standard FHIR R4 Bundle.
 */
export function convertHl7ToFhirBundle(hl7Payload: string): FhirBundle {
  if (!hl7Payload || typeof hl7Payload !== 'string') {
    throw new Error('Invalid HL7 v2 payload: expected non-empty string.');
  }

  const rawSegments = hl7Payload
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawSegments.length === 0 || !rawSegments[0].startsWith('MSH')) {
    throw new Error('Invalid HL7 v2 payload: missing MSH header segment.');
  }

  const msh = rawSegments[0];
  const fieldSep = msh[3] || '|';
  const encodingChars = msh.slice(4, 8);
  const componentSep = encodingChars[0] || '^';

  const entries: Array<{ resource: FhirResource }> = [];
  let obsCounter = 1;
  let medCounter = 1;
  let alCounter = 1;
  let condCounter = 1;

  for (const seg of rawSegments) {
    const fields = seg.split(fieldSep);
    const segType = fields[0];

    switch (segType) {
      case 'PID': {
        // PID-3: Patient Identifier List, PID-5: Patient Name, PID-7: DOB, PID-8: Sex
        const pid3 = fields[3] || '';
        const pid5 = fields[5] || '';
        const pid7 = fields[7] || '';
        const pid8 = fields[8] || '';

        const idParts = splitComponents(pid3.split('~')[0] || '', componentSep);
        const mrn = idParts[0] || 'UNKNOWN-MRN';

        const nameParts = splitComponents(pid5, componentSep);
        const family = nameParts[0] || '';
        const given = nameParts.slice(1, 3).filter(Boolean);

        const genderMap: Record<string, string> = {
          M: 'male',
          F: 'female',
          O: 'other',
          U: 'unknown',
        };

        let formattedDob = pid7;
        if (/^\d{8}/.test(pid7)) {
          formattedDob = `${pid7.slice(0, 4)}-${pid7.slice(4, 6)}-${pid7.slice(6, 8)}`;
        }

        entries.push({
          resource: {
            resourceType: 'Patient',
            id: `pt-${mrn}`,
            identifier: [{ value: mrn }],
            name: [{ family, given, text: `${given.join(' ')} ${family}`.trim() }],
            birthDate: formattedDob || undefined,
            gender: genderMap[pid8.toUpperCase()] || pid8.toLowerCase() || undefined,
          },
        });
        break;
      }

      case 'AL1': {
        // AL1-2: Allergen Type, AL1-3: Allergen Code/Mnemonic/Description, AL1-4: Severity, AL1-5: Reaction
        const al3 = fields[3] || '';
        const al4 = fields[4] || '';
        const al5 = fields[5] || '';

        const coded = parseCodedElement(al3, componentSep);
        const allergyText = coded.display || coded.code;
        if (allergyText) {
          entries.push({
            resource: {
              resourceType: 'AllergyIntolerance',
              id: `allergy-${alCounter++}`,
              verificationStatus: 'confirmed',
              code: {
                coding: [{ code: coded.code || allergyText, display: allergyText, system: coded.system || undefined }],
                text: allergyText,
              },
              reaction: al5
                ? [
                    {
                      severity: al4.toLowerCase(),
                      manifestation: [{ text: al5 }],
                    },
                  ]
                : undefined,
            },
          });
        }
        break;
      }

      case 'RXE': {
        // RXE-2: Give Code (Code^Text^System), RXE-3: Give Amount - Minimum, RXE-5: Give Units
        const rxe2 = fields[2] || '';
        const rxe3 = fields[3] || '';
        const rxe5 = fields[5] || '';
        const rxe7 = fields[7] || ''; // Provider's Administration Instructions

        const coded = parseCodedElement(rxe2, componentSep);
        const medName = coded.display || coded.code;
        const unit = parseCodedElement(rxe5, componentSep).display || rxe5;
        const instr = parseCodedElement(rxe7, componentSep).display || rxe7;

        if (medName) {
          const doseTextParts: string[] = [];
          if (rxe3) doseTextParts.push(`${rxe3} ${unit || 'mg'}`.trim());
          if (instr) doseTextParts.push(instr);

          entries.push({
            resource: {
              resourceType: 'MedicationRequest',
              id: `med-${medCounter++}`,
              status: 'active',
              medicationCodeableConcept: {
                coding: [{ code: coded.code || medName, display: medName, system: coded.system || undefined }],
                text: medName,
              },
              dosageInstruction:
                doseTextParts.length > 0 ? [{ text: doseTextParts.join(' ') }] : undefined,
            },
          });
        }
        break;
      }

      case 'RXO': {
        // RXO-1: Requested Give Code, RXO-2: Requested Give Amount - Minimum, RXO-4: Requested Give Units
        const rxo1 = fields[1] || '';
        const rxo2 = fields[2] || '';
        const rxo4 = fields[4] || '';
        const rxo6 = fields[6] || ''; // Provider's Pharmacy/Treatment Instructions

        const coded = parseCodedElement(rxo1, componentSep);
        const medName = coded.display || coded.code;
        const unit = parseCodedElement(rxo4, componentSep).display || rxo4;
        const instr = parseCodedElement(rxo6, componentSep).display || rxo6;

        if (medName) {
          const doseTextParts: string[] = [];
          if (rxo2) doseTextParts.push(`${rxo2} ${unit || 'mg'}`.trim());
          if (instr) doseTextParts.push(instr);

          entries.push({
            resource: {
              resourceType: 'MedicationRequest',
              id: `med-${medCounter++}`,
              status: 'active',
              medicationCodeableConcept: {
                coding: [{ code: coded.code || medName, display: medName, system: coded.system || undefined }],
                text: medName,
              },
              dosageInstruction:
                doseTextParts.length > 0 ? [{ text: doseTextParts.join(' ') }] : undefined,
            },
          });
        }
        break;
      }

      case 'DG1': {
        // DG1-3: Diagnosis Code, DG1-4: Diagnosis Description
        const dg3 = fields[3] || '';
        const dg4 = fields[4] || '';
        const coded = parseCodedElement(dg3, componentSep);
        const condName = dg4 || coded.display || coded.code;
        if (condName) {
          entries.push({
            resource: {
              resourceType: 'Condition',
              id: `cond-${condCounter++}`,
              clinicalStatus: 'active',
              verificationStatus: 'confirmed',
              code: {
                coding: [{ code: coded.code || condName, display: condName }],
                text: condName,
              },
            },
          });
        }
        break;
      }

      case 'OBX': {
        // OBX-2: Value Type (NM, ST, TX, CWE), OBX-3: Observation Identifier, OBX-5: Observation Value, OBX-6: Units, OBX-11: Status
        const obx2 = (fields[2] || 'ST').toUpperCase();
        const obx3 = fields[3] || '';
        const obx5 = fields[5] || '';
        const obx6 = fields[6] || '';
        const obx11 = (fields[11] || 'F').toUpperCase();

        if (obx11 === 'X' || obx11 === 'D') break; // Cancelled / Deleted observation

        const coded = parseCodedElement(obx3, componentSep);
        const unit = parseCodedElement(obx6, componentSep).code || parseCodedElement(obx6, componentSep).display || obx6;
        const numVal = parseFloat(obx5);
        const isNumeric = (obx2 === 'NM' || obx2 === 'SN' || !isNaN(numVal)) && !obx5.includes('/') && !isNaN(numVal) && String(numVal) === obx5.trim();

        entries.push({
          resource: {
            resourceType: 'Observation',
            id: `obs-${obsCounter++}`,
            status: 'final',
            code: {
              coding: [{ code: coded.code, display: coded.display, system: coded.system || undefined }],
              text: coded.display || coded.code,
            },
            valueQuantity: isNumeric
              ? {
                  value: numVal,
                  unit: unit || undefined,
                }
              : undefined,
            valueString: !isNumeric ? obx5 : undefined,
          },
        });
        break;
      }

      case 'NTE': {
        // NTE-3: Comment text
        const comment = fields[3] || '';
        if (comment.trim()) {
          entries.push({
            resource: {
              resourceType: 'Observation',
              id: `nte-${obsCounter++}`,
              status: 'final',
              code: { text: 'Clinical Note' },
              valueString: comment.trim(),
            },
          });
        }
        break;
      }

      default:
        break;
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: entries,
  };
}

/**
 * Directly parses an HL7 v2.5.1 payload (ADT^A01 or ORU^R01) into `ClinicalEvaluationInput`
 * by bridging through the FHIR R4 resource mapper.
 */
export function parseHl7ToClinicalInput(hl7Payload: string): ClinicalEvaluationInput {
  const bundle = convertHl7ToFhirBundle(hl7Payload);
  return parseFhirBundleToClinicalInput(bundle);
}
