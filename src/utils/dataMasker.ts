import { PatientRecord, SoapNote } from '../types/clinical';

export interface MaskingResult {
  maskedPatient: PatientRecord;
  maskedNote: SoapNote;
  redactedFieldsCount: number;
  redactionsSummary: string[];
}

export function maskPatientDataForAi(
  patient: PatientRecord,
  note: SoapNote
): MaskingResult {
  const redactionsSummary: string[] = [];
  let redactedFieldsCount = 0;

  // 1. Mask Patient Name
  let pseudonym = 'PATIENT-ANON-77';
  if (patient.gender?.toLowerCase() === 'female') {
    pseudonym = 'PATIENT-FEMALE-42';
  } else if (patient.gender?.toLowerCase() === 'male') {
    pseudonym = 'PATIENT-MALE-88';
  }

  const originalName = patient.name || '';
  if (originalName) {
    redactionsSummary.push(`Patient Full Name ("${originalName}") -> [${pseudonym}]`);
    redactedFieldsCount++;
  }

  // 2. Mask MRN
  const originalMrn = patient.mrn || '';
  if (originalMrn) {
    redactionsSummary.push(`Medical Record Number ("${originalMrn}") -> [REDACTED_MRN]`);
    redactedFieldsCount++;
  }

  // 3. Mask exact dates of encounter to generalized relative dates
  const originalDate = patient.encounterDate || '';
  if (originalDate) {
    redactionsSummary.push(`Specific Encounter Date ("${originalDate}") -> [DAY_OF_VISIT]`);
    redactedFieldsCount++;
  }

  // Helper to scrub text
  const scrubText = (text: string): string => {
    if (!text) return '';
    let scrubbed = text;

    // Scrub patient name if present
    if (originalName && originalName.length > 2) {
      const nameParts = originalName.split(/\s+/).filter((p) => p.length > 1);
      for (const part of nameParts) {
        const regex = new RegExp(`\\b${part}\\b`, 'gi');
        scrubbed = scrubbed.replace(regex, `[${pseudonym}]`);
      }
    }

    // Scrub MRN
    if (originalMrn) {
      const mrnClean = originalMrn.replace(/[^a-zA-Z0-9]/g, '');
      scrubbed = scrubbed.replace(new RegExp(originalMrn, 'gi'), '[REDACTED_MRN]');
      if (mrnClean.length > 4) {
        scrubbed = scrubbed.replace(new RegExp(mrnClean, 'gi'), '[REDACTED_MRN]');
      }
    }

    // Scrub phone numbers
    const phoneRegex = /(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    if (phoneRegex.test(scrubbed)) {
      redactedFieldsCount++;
      redactionsSummary.push('Contact Phone Number -> [REDACTED_PHONE]');
      scrubbed = scrubbed.replace(phoneRegex, '[REDACTED_PHONE]');
    }

    // Scrub emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(scrubbed)) {
      redactedFieldsCount++;
      redactionsSummary.push('Email Address -> [REDACTED_EMAIL]');
      scrubbed = scrubbed.replace(emailRegex, '[REDACTED_EMAIL]');
    }

    // Scrub standard street addresses (e.g. 123 Main St, Apt 4B)
    const addressRegex = /\d+\s+[A-Za-z0-9\s,.'-]{3,}(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/gi;
    if (addressRegex.test(scrubbed)) {
      redactedFieldsCount++;
      redactionsSummary.push('Physical Street Address -> [REDACTED_ADDRESS]');
      scrubbed = scrubbed.replace(addressRegex, '[REDACTED_ADDRESS]');
    }

    return scrubbed;
  };

  const maskedPatient: PatientRecord = {
    ...patient,
    name: `[${pseudonym}]`,
    mrn: '[REDACTED_MRN]',
    encounterDate: '[CURRENT_CLINICAL_VISIT]',
    chiefComplaint: scrubText(patient.chiefComplaint),
  };

  const maskedNote: SoapNote = {
    ...note,
    subjective: scrubText(note.subjective),
    objective: scrubText(note.objective),
    assessment: scrubText(note.assessment),
    plan: scrubText(note.plan),
    medications: note.medications.map((m) => scrubText(m)),
    allergies: note.allergies.map((a) => scrubText(a)),
  };

  return {
    maskedPatient,
    maskedNote,
    redactedFieldsCount,
    redactionsSummary,
  };
}

export function maskPatientDemographics(patient: PatientRecord): PatientRecord {
  const result = maskPatientDataForAi(patient, {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    medications: [],
    allergies: [],
  });
  return result.maskedPatient;
}

export function maskPhiInText(text: string): string {
  if (!text) return '';
  let scrubbed = text;
  // SSN: \d{3}-\d{2}-\d{4}
  scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]');
  // Phone numbers
  scrubbed = scrubbed.replace(/(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[REDACTED_PHONE]');
  // Emails
  scrubbed = scrubbed.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  // MRN numbers
  scrubbed = scrubbed.replace(/MRN-?\d+/gi, '[REDACTED_MRN]');
  return scrubbed;
}

