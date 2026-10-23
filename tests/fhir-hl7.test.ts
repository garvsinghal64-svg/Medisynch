import { generateFhirR4Bundle, generateHl7v2Message } from '../src/utils/fhirHl7Generator';
import { CLINICAL_CASES, FALLBACK_ANALYSES } from '../src/data/clinicalTemplates';

export function runFhirHl7Tests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const samplePatient = CLINICAL_CASES[0].patient;
  const sampleNote = CLINICAL_CASES[0].initialNote;
  const sampleAnalysis = FALLBACK_ANALYSES['cardiology-htn-dyspnea'];

  // Test 1: FHIR R4 Bundle Construction & Structure
  try {
    const fhirBundle: any = generateFhirR4Bundle(samplePatient, sampleNote, sampleAnalysis);

    const isBundle = fhirBundle.resourceType === 'Bundle';
    const isDocumentOrCollection = fhirBundle.type === 'document' || fhirBundle.type === 'collection' || fhirBundle.type === 'transaction';
    const entries = fhirBundle.entry || [];
    const hasPatient = entries.some((e: any) => e.resource?.resourceType === 'Patient');
    const hasEncounter = entries.some((e: any) => e.resource?.resourceType === 'Encounter');
    const hasObservations = entries.some((e: any) => e.resource?.resourceType === 'Observation');
    const hasConditions = entries.some((e: any) => e.resource?.resourceType === 'Condition');

    if (isBundle && isDocumentOrCollection && hasPatient && hasEncounter && hasObservations && hasConditions) {
      results.push({ name: 'FHIR R4 Bundle Generation & Standard Resource Compliance', passed: true });
    } else {
      results.push({
        name: 'FHIR R4 Bundle Generation & Standard Resource Compliance',
        passed: false,
        details: `Missing standard FHIR resources: isBundle=${isBundle}, pt=${hasPatient}, enc=${hasEncounter}, obs=${hasObservations}, cond=${hasConditions}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'FHIR R4 Bundle Generation', passed: false, details: err.message });
  }

  // Test 2: HL7 v2.5.1 Message Construction & Segments
  try {
    const hl7Message = generateHl7v2Message(samplePatient, sampleNote, sampleAnalysis);

    const lines = hl7Message.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const hasMsh = lines.some((l) => l.startsWith('MSH|'));
    const hasPid = lines.some((l) => l.startsWith('PID|'));
    const hasPv1 = lines.some((l) => l.startsWith('PV1|'));
    const hasObx = lines.some((l) => l.startsWith('OBX|'));

    // Check that Patient MRN number is present in PID
    const cleanMrn = samplePatient.mrn.replace(/[^a-zA-Z0-9]/g, '');
    const pidLine = lines.find((l) => l.startsWith('PID|'));
    const includesMrn = pidLine && (pidLine.includes(samplePatient.mrn) || pidLine.includes(cleanMrn));

    if (hasMsh && hasPid && hasPv1 && hasObx && includesMrn) {
      results.push({ name: 'HL7 v2.5.1 Message Generator (MSH, PID, PV1, OBX) Compliant', passed: true });
    } else {
      results.push({
        name: 'HL7 v2.5.1 Message Generator (MSH, PID, PV1, OBX) Compliant',
        passed: false,
        details: `Missing HL7 segments: MSH=${hasMsh}, PID=${hasPid}, PV1=${hasPv1}, OBX=${hasObx}, MRN in PID=${includesMrn}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'HL7 v2.5.1 Message Generator', passed: false, details: err.message });
  }

  return results;
}
