import { auditLoggerService, OverrideEvent } from '../src/services/auditLoggerService';

export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export function runAuditLoggerTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Simulate firing 10 alerts, overriding 7 of them with various justifications, and assert 70% override rate
  try {
    auditLoggerService.resetLogs();

    // Simulate firing 10 clinical safety alerts
    for (let i = 0; i < 10; i++) {
      auditLoggerService.recordAlertFired(1);
    }

    const justifications = [
      'Benefit Outweighs Risk',
      'Patient Monitored',
      'Benefit Outweighs Risk',
      'Dose Adjusted / Renal Protocol',
      'Benefit Outweighs Risk',
      'Patient Monitored',
      'Tolerated Previously / Allergy Clarified',
    ];

    // Override 7 of the 10 fired alerts
    for (let i = 0; i < 7; i++) {
      const event: OverrideEvent = {
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        clinicianId: 'Dr. Smith',
        patientId: `PT-100${i + 1}`,
        overriddenAlerts:
          i % 2 === 0
            ? ['METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)']
            : ['PEDS_AMOXICILLIN_OVERDOSE(125mg/kg/day)'],
        justificationCode: justifications[i],
        clinicalNotes: `Clinical override attestation #${i + 1}`,
      };
      auditLoggerService.logAlertOverride(event);
    }

    const metrics = auditLoggerService.getAlertFatigueMetrics();

    const rateMatches = metrics.overrideRate === 70;
    const countsMatch =
      metrics.totalAlertsFired === 10 && metrics.totalAlertsOverridden === 7;
    const justificationFreqMatches =
      metrics.justificationFrequency['Benefit Outweighs Risk'] === 3 &&
      metrics.justificationFrequency['Patient Monitored'] === 2 &&
      metrics.justificationFrequency['Dose Adjusted / Renal Protocol'] === 1 &&
      metrics.justificationFrequency['Tolerated Previously / Allergy Clarified'] === 1;
    const alertFreqMatches =
      metrics.overriddenAlertFrequency['METFORMIN_RENAL_THRESHOLD'] === 4 &&
      metrics.overriddenAlertFrequency['PEDS_AMOXICILLIN_OVERDOSE'] === 3;

    const passed =
      rateMatches && countsMatch && justificationFreqMatches && alertFreqMatches;

    results.push({
      name: 'Alert Fatigue Metrics: 10 fired alerts & 7 overrides yields 70% override rate and accurate frequency maps',
      passed,
      details: passed
        ? undefined
        : `Expected overrideRate=70 (10 fired, 7 overridden), got rate=${metrics.overrideRate}, fired=${metrics.totalAlertsFired}, overridden=${metrics.totalAlertsOverridden}, justifications=${JSON.stringify(metrics.justificationFrequency)}, alerts=${JSON.stringify(metrics.overriddenAlertFrequency)}`,
    });
  } catch (err) {
    results.push({
      name: 'Alert Fatigue Metrics: 10 fired alerts & 7 overrides yields 70% override rate and accurate frequency maps',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}
