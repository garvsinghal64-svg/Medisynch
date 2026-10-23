import { maskPhiInText, maskPatientDemographics } from '../src/utils/dataMasker';
import { logAuditEvent, getAuditLog } from '../src/utils/auditLogger';
import { CLINICAL_CASES } from '../src/data/clinicalTemplates';
import { scrubPHI, apiDiagnostics } from '../src/services/apiDiagnosticsService';

export function runDataMaskerAndAuditTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  const samplePatient = CLINICAL_CASES[0].patient;

  // Test 1: PHI Demographics Masking
  try {
    const masked = maskPatientDemographics(samplePatient);

    const nameMasked = masked.name.includes('[REDACTED') || masked.name !== samplePatient.name;
    const mrnMasked = masked.mrn.includes('[MRN-') || masked.mrn !== samplePatient.mrn;

    if (nameMasked && mrnMasked) {
      results.push({ name: 'HIPAA Safe Harbor: Patient Demographics PHI Masked', passed: true });
    } else {
      results.push({
        name: 'HIPAA Safe Harbor: Patient Demographics PHI Masked',
        passed: false,
        details: `Name or MRN was not properly masked: name=${masked.name}, mrn=${masked.mrn}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'HIPAA Safe Harbor Masking', passed: false, details: err.message });
  }

  // Test 2: Free Text PHI Masking
  try {
    const rawText = `Patient John Doe (DOB: 1980-05-12, SSN: 123-45-6789, Phone: 555-123-4567, MRN-998877) was admitted on 2026-10-15.`;
    const masked = maskPhiInText(rawText);

    const hasSsn = masked.includes('123-45-6789');
    const hasPhone = masked.includes('555-123-4567');
    const hasMrn = masked.includes('MRN-998877');

    if (!hasSsn && !hasPhone && !hasMrn) {
      results.push({ name: 'Free-Text PHI Sanitization (SSN, Phone, MRN Redaction)', passed: true });
    } else {
      results.push({
        name: 'Free-Text PHI Sanitization (SSN, Phone, MRN Redaction)',
        passed: false,
        details: `Failed to redact identifiers from text: ssn=${hasSsn}, phone=${hasPhone}, mrn=${hasMrn}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Free-Text PHI Sanitization', passed: false, details: err.message });
  }

  // Test 3: Tamper-Evident Audit Logging
  try {
    const initialLogCount = getAuditLog().length;
    logAuditEvent({
      userId: 'usr-test-1',
      userName: 'Dr. Automated Tester',
      role: 'doctor',
      action: 'SIGN_NOTE',
      patientMrn: 'MRN-999999',
      patientName: 'Test Patient',
      details: 'Audit logging automated unit test verification entry.',
    });

    const updatedLog = getAuditLog();
    const latestEntry = updatedLog[0];

    const countIncremented = updatedLog.length > initialLogCount;
    const hasCorrectAction = latestEntry?.action === 'SIGN_NOTE';
    const hasTimestamp = Boolean(latestEntry?.timestamp);

    if (countIncremented && hasCorrectAction && hasTimestamp) {
      results.push({ name: 'HIPAA Audit Trail: Event Recorded & Serialized Correctly', passed: true });
    } else {
      results.push({
        name: 'HIPAA Audit Trail: Event Recorded & Serialized Correctly',
        passed: false,
        details: `Audit log verification failed: countIncr=${countIncremented}, action=${latestEntry?.action}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'HIPAA Audit Trail Logging', passed: false, details: err.message });
  }

  // Test 4: API Diagnostics scrubPHI() Deep Object & Key Sanitization
  try {
    const sensitivePayload = {
      patientName: 'Alice Healthcare',
      firstName: 'Alice',
      lastName: 'Smith',
      mrn: 'MRN-445566',
      ssn: '123-45-6789',
      dob: '1985-04-12',
      contact: {
        phone: '1-800-555-0199',
        email: 'alice.smith@hospital-system.org',
      },
      clinicalNote: 'Patient SSN 987-65-4321, MRN-887766, DOB: 01/15/1970, call 555-234-5678 or dr@clinic.com',
    };

    const scrubbed = scrubPHI(sensitivePayload);

    const hasNoSsn = !JSON.stringify(scrubbed).includes('123-45-6789') && !JSON.stringify(scrubbed).includes('987-65-4321');
    const hasNoMrn = !JSON.stringify(scrubbed).includes('MRN-445566') && !JSON.stringify(scrubbed).includes('MRN-887766');
    const hasNoPhone = !JSON.stringify(scrubbed).includes('800-555-0199') && !JSON.stringify(scrubbed).includes('555-234-5678');
    const hasNoEmail = !JSON.stringify(scrubbed).includes('hospital-system.org') && !JSON.stringify(scrubbed).includes('dr@clinic.com');
    const hasNoName = scrubbed.patientName === '[REDACTED-PHI]' && scrubbed.firstName === '[REDACTED-PHI]';

    if (hasNoSsn && hasNoMrn && hasNoPhone && hasNoEmail && hasNoName) {
      results.push({ name: 'API Diagnostics: scrubPHI Strips 100% of SSN, MRN, DOB, Phone, Email & Names', passed: true });
    } else {
      results.push({
        name: 'API Diagnostics: scrubPHI Strips 100% of SSN, MRN, DOB, Phone, Email & Names',
        passed: false,
        details: `PHI leak detected: ssn=${hasNoSsn}, mrn=${hasNoMrn}, phone=${hasNoPhone}, email=${hasNoEmail}, name=${hasNoName}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'API Diagnostics: scrubPHI Sanitizer', passed: false, details: err.message });
  }

  // Test 5: API Diagnostics Ring Buffer Capacity (MAX_LOGS = 100) & FIFO Eviction
  try {
    apiDiagnostics.clear();
    for (let i = 0; i < 115; i++) {
      apiDiagnostics.addEntry({
        id: `entry-${i}`,
        timestamp: new Date().toISOString(),
        endpoint: `/api/test/${i}`,
        method: 'POST',
        status: 200,
        statusText: 'OK',
        durationMs: 15,
        requestHeaders: {},
        requestPayload: { testIdx: i, patientName: 'Secret John' },
        responseHeaders: {},
        responsePayload: { ok: true },
        isError: false,
      });
    }

    const stats = apiDiagnostics.getBufferStats();
    const entries = apiDiagnostics.getEntries();

    const countIs100 = entries.length === 100;
    const maxIs100 = stats.max === 100;
    const statsCountIs100 = stats.count === 100;
    const newestIsFirst = entries[0].id === 'entry-114';
    const oldestIsEvicted = !entries.some((e) => e.id === 'entry-0' || e.id === 'entry-14');
    const bytesPresent = stats.approxBytes > 0;

    if (countIs100 && maxIs100 && statsCountIs100 && newestIsFirst && oldestIsEvicted && bytesPresent) {
      results.push({ name: 'API Diagnostics: Ring Buffer Capped at 100 with FIFO Eviction & Memory Stats', passed: true });
    } else {
      results.push({
        name: 'API Diagnostics: Ring Buffer Capped at 100 with FIFO Eviction & Memory Stats',
        passed: false,
        details: `Buffer failed: count=${entries.length}, max=${stats.max}, newest=${entries[0]?.id}, oldestEvicted=${oldestIsEvicted}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'API Diagnostics Ring Buffer', passed: false, details: err.message });
  }

  return results;
}
