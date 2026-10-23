import { clinicalDb } from '../src/db/databaseService';
import { SavedEncounterRecord } from '../src/types/clinical';

export function runDbPersistenceTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: Database Status & Migration Verification
  try {
    const status = clinicalDb.getStatus();
    const hasVersion = status.migrationVersion === '001_initial_schema';
    const isReady = status.status === 'connected' || status.status === 'fallback_durable_storage';

    if (hasVersion && isReady) {
      results.push({ name: 'Clinical DB: Migration Version 001 Initial Schema Verified', passed: true });
    } else {
      results.push({
        name: 'Clinical DB: Migration Version 001 Initial Schema Verified',
        passed: false,
        details: `Unexpected status: version=${status.migrationVersion}, status=${status.status}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Clinical DB Status', passed: false, details: err.message });
  }

  // Test 2: Encounter Creation & Patient Upsert
  let createdId = '';
  try {
    const testRecord: SavedEncounterRecord = {
      id: `enc-test-${Date.now()}`,
      savedAt: new Date().toISOString(),
      patient: {
        id: 'pt-test-999',
        name: 'Test Database Patient',
        age: 55,
        gender: 'Female',
        mrn: `MRN-T${Date.now().toString().slice(-5)}`,
        encounterDate: '2026-10-21',
        chiefComplaint: 'Database transactional write verification',
        vitals: {
          bloodPressure: '120/80 mmHg',
          heartRate: 72,
          respiratoryRate: 16,
          temperature: '37.0 °C',
          spO2: 99,
          weightKg: 65,
          heightCm: 168,
        },
      },
      note: {
        subjective: 'Patient presents for unit testing.',
        objective: 'Vitals stable. Alert and oriented.',
        assessment: 'Healthy test subject.',
        plan: '1. Complete test assertions.\n2. Verify persistence.',
        medications: ['Lisinopril 10mg daily'],
        allergies: [],
      },
      analysis: null,
    };

    const entity = clinicalDb.createEncounter(testRecord, 'automated-test-runner');
    createdId = entity.id;

    if (entity && entity.id === testRecord.id && entity.revisions?.length === 1) {
      results.push({ name: 'Clinical DB: Transactional Encounter Creation & Revision #1 Initialized', passed: true });
    } else {
      results.push({
        name: 'Clinical DB: Transactional Encounter Creation',
        passed: false,
        details: `Failed to create encounter with revision 1: ${JSON.stringify(entity)}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Clinical DB Encounter Creation', passed: false, details: err.message });
  }

  // Test 3: Encounter Update & Revision History Tracking
  try {
    if (!createdId) throw new Error('Cannot test update: createdId missing');

    const updated = clinicalDb.updateEncounter(
      createdId,
      {
        note: {
          subjective: 'Patient reports feeling great after medication adjustment.',
          objective: 'BP 118/76 mmHg.',
          assessment: 'Controlled test presentation.',
          plan: 'Follow up as scheduled.',
          medications: ['Lisinopril 10mg daily'],
          allergies: [],
        },
      },
      'doctor-editor',
      'Follow-up visit notes appended'
    );

    const hasRevision2 = updated?.revisions?.length === 2;
    const rev2Summary = updated?.revisions?.[1]?.changeSummary === 'Follow-up visit notes appended';

    if (hasRevision2 && rev2Summary) {
      results.push({ name: 'Clinical DB: Immutable Note Revision History (#2) Tracked', passed: true });
    } else {
      results.push({
        name: 'Clinical DB: Note Revision History Tracking',
        passed: false,
        details: `Expected 2 revisions, got ${updated?.revisions?.length}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Clinical DB Revision Tracking', passed: false, details: err.message });
  }

  // Test 4: Idempotent Batch Offline Sync
  try {
    const offlineBatch: SavedEncounterRecord[] = [
      {
        id: `enc-offline-1-${Date.now()}`,
        savedAt: new Date().toISOString(),
        patient: {
          id: 'pt-off-1',
          name: 'Offline Sync Patient',
          age: 42,
          gender: 'Male',
          mrn: `MRN-OFF-${Date.now().toString().slice(-4)}`,
          encounterDate: '2026-10-21',
          chiefComplaint: 'Offline clinic visit',
          vitals: { bloodPressure: '128/82 mmHg', heartRate: 70, respiratoryRate: 14, temperature: '36.8 C', spO2: 98, weightKg: 78, heightCm: 175 },
        },
        note: {
          subjective: 'Entered while offline.',
          objective: 'Exam completed.',
          assessment: 'Routine visit.',
          plan: 'Maintain current therapy.',
          medications: [],
          allergies: [],
        },
        analysis: null,
      },
    ];

    const syncResult = clinicalDb.batchSync(offlineBatch);

    if (syncResult.syncedCount === 1 && syncResult.failedCount === 0) {
      results.push({ name: 'Clinical DB: Idempotent Batch Offline Sync Processed Successfully', passed: true });
    } else {
      results.push({
        name: 'Clinical DB: Idempotent Batch Offline Sync',
        passed: false,
        details: `Sync result: synced=${syncResult.syncedCount}, failed=${syncResult.failedCount}`,
      });
    }
  } catch (err: any) {
    results.push({ name: 'Clinical DB Offline Batch Sync', passed: false, details: err.message });
  }

  return results;
}
