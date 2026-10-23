import {
  evaluateSirsAndSepsisRisk,
  evaluateEmergencyRedFlags,
} from '../src/utils/drugSafetyEngine';
import { buildClinicalDiagnosticPrompt } from '../src/services/llmDiagnosticService';
import { generateFhirR4Bundle } from '../src/utils/fhirHl7Generator';
import { enrichWithLiveRAGData } from '../src/services/clinicalAnalysisService';
import { PatientRecord, SoapNote, ClinicalAnalysisResult } from '../src/types/clinical';

export function runClinicalSafetyPatchTests(): { name: string; passed: boolean; details?: string }[] {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // =========================================================================
  // TEST 1: Exact Demo Case Vitals & SIRS Evaluation
  // 28-year-old, Temp 100.8°F, HR 96/min, RR 18/min, BP 118/76, SpO2 undocumented
  // =========================================================================
  try {
    const demoVitals = {
      temperature: '100.8 F',
      heartRate: 96,
      respiratoryRate: 18,
      bloodPressure: '118/76',
      spO2: 0, // undocumented
      weightKg: 70,
      heightCm: 175,
    };
    const clinicalText = 'Patient reports 2 days of productive cough, fever, and fatigue.';

    const sirsResult = evaluateSirsAndSepsisRisk(demoVitals, clinicalText);

    // Criteria checks:
    // 1. Temp 100.8F = 38.22C (> 38.0C) -> Met
    // 2. HR 96 (> 90) -> Met
    // 3. RR 18 (<= 20) -> Not Met (Normal)
    // 4. WBC -> Undocumented
    const tempMet = sirsResult.criteriaMet.some((c) => c.toLowerCase().includes('fever') || c.includes('38.2'));
    const hrMet = sirsResult.criteriaMet.some((c) => c.toLowerCase().includes('tachycardia') || c.includes('96'));
    const rrNotMet = sirsResult.criteriaNotMet.some((c) => c.toLowerCase().includes('respiratory rate') || c.includes('18'));
    const wbcUndoc = sirsResult.undocumentedCriteria.some((c) => c.toLowerCase().includes('wbc'));

    const countAccurate = sirsResult.sirsCount === 2;
    const notEquatedToSepsis = sirsResult.isSepsisDiagnosed === false;

    if (tempMet && hrMet && rrNotMet && wbcUndoc && countAccurate && notEquatedToSepsis) {
      results.push({
        name: 'Demo Case: Exactly 2 SIRS criteria met (Temp & HR); RR 18 normal; WBC undocumented; SIRS != Sepsis',
        passed: true,
      });
    } else {
      results.push({
        name: 'Demo Case: Exactly 2 SIRS criteria met (Temp & HR); RR 18 normal; WBC undocumented; SIRS != Sepsis',
        passed: false,
        details: `tempMet=${tempMet}, hrMet=${hrMet}, rrNotMet=${rrNotMet}, wbcUndoc=${wbcUndoc}, count=${sirsResult.sirsCount}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Demo Case: SIRS criteria calculation',
      passed: false,
      details: err.message,
    });
  }

  // =========================================================================
  // TEST 2: No Automatic Sepsis Bundle or 30 mL/kg Fluid Resuscitation for SIRS Alone
  // =========================================================================
  try {
    const demoVitals = {
      temperature: '100.8 F',
      heartRate: 96,
      respiratoryRate: 18,
      bloodPressure: '118/76',
      spO2: 0,
    };
    const clinicalText = 'Patient presents with fever and mild productive cough. Alert and oriented x 4. Normal capillary refill.';

    const flags = evaluateEmergencyRedFlags(demoVitals, clinicalText, 'Fever and cough');
    const sirsFlag = flags.find((f) => f.id === 'redflag-sirs' || f.category === 'Sepsis');

    // Must NOT be immediate_life_threat solely for SIRS without shock
    const notImmediateThreat = sirsFlag?.severity === 'urgent_evaluation';
    // Must NOT mandate 1-hour bundle or 30 mL/kg fluid resuscitation automatically
    const actionText = sirsFlag?.immediateAction || '';
    const noMandatedBundle = !actionText.startsWith('Initiate 1-hour Sepsis Bundle');
    const warnsAgainstAutoBundle = actionText.includes('Do NOT automatically initiate 1-hour sepsis bundle');
    const warnsAgainstAutoFluid = actionText.includes('30 mL/kg fluid bolus based solely on SIRS criteria');
    // Title must NOT imply confirmed sepsis diagnosis
    const title = sirsFlag?.title || '';
    const titleSafe = !title.includes('Potential Sepsis Alert') && title.includes('SIRS Criteria Present');

    if (sirsFlag && notImmediateThreat && noMandatedBundle && warnsAgainstAutoBundle && warnsAgainstAutoFluid && titleSafe) {
      results.push({
        name: 'Clinical Safety: No automatic 1-hour sepsis bundle or 30 mL/kg fluid bolus solely based on SIRS',
        passed: true,
      });
    } else {
      results.push({
        name: 'Clinical Safety: No automatic 1-hour sepsis bundle or 30 mL/kg fluid bolus solely based on SIRS',
        passed: false,
        details: `flagFound=${!!sirsFlag}, severity=${sirsFlag?.severity}, title=${title}, safe=${titleSafe}, warnsBundle=${warnsAgainstAutoBundle}, warnsFluid=${warnsAgainstAutoFluid}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Clinical Safety: No automatic sepsis bundle for SIRS alone',
      passed: false,
      details: err.message,
    });
  }

  // =========================================================================
  // TEST 3: Genuine Emergency Escalation When Organ Dysfunction / Shock Present
  // =========================================================================
  try {
    const septicShockVitals = {
      temperature: '39.2 C',
      heartRate: 124,
      respiratoryRate: 26,
      bloodPressure: '78/44', // Severe hypotension: SBP < 90, MAP < 65
      spO2: 91,
    };
    const shockText = 'Patient with severe urosepsis, refractory hypotension, altered mental status, and lactate 4.6.';

    const shockFlags = evaluateEmergencyRedFlags(septicShockVitals, shockText, 'Altered mental status with fever');
    const shockFlag = shockFlags.find((f) => f.id === 'redflag-sepsis');

    const escalated = shockFlag && shockFlag.severity === 'immediate_life_threat';
    const mentionsShock = shockFlag?.title.includes('Shock') || shockFlag?.title.includes('Hemodynamic');

    if (escalated && mentionsShock) {
      results.push({
        name: 'Emergency Escalation: Genuine infection + shock/organ dysfunction escalates to immediate life threat',
        passed: true,
      });
    } else {
      results.push({
        name: 'Emergency Escalation: Genuine infection + shock/organ dysfunction escalates to immediate life threat',
        passed: false,
        details: `flagFound=${!!shockFlag}, severity=${shockFlag?.severity}, title=${shockFlag?.title}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Emergency Escalation: Shock/organ dysfunction',
      passed: false,
      details: err.message,
    });
  }

  // =========================================================================
  // TEST 4: Missing SpO2 Integrity — Never Inferred Normal When Absent
  // =========================================================================
  try {
    const inputWithMissingSpO2 = {
      noteText: 'Evaluation of fever and myalgias.',
      vitals: {
        bp: '118/76',
        hr: 96,
        rr: 18,
        temp: 38.2,
        spo2: 0, // Undocumented / absent
      },
      allergies: ['Penicillin'],
    };

    const prompt = buildClinicalDiagnosticPrompt(inputWithMissingSpO2);

    const explicitlyMarksMissing = prompt.includes('SpO2: Undocumented / Not measured (MISSING');
    const doesNotAssumeNormal = !prompt.includes('SpO2: 98%') && !prompt.includes('SpO2: 100%') && !prompt.includes('SpO2: 0%');

    // Also test FHIR bundle: missing SpO2 must NOT fabricate a 98% Observation
    const mockPatient: PatientRecord = {
      id: 'pt-test-demo',
      name: 'Jane Doe',
      age: 28,
      gender: 'Female',
      mrn: 'MRN-DEMO-28',
      encounterDate: '2026-10-23',
      chiefComplaint: 'Fever and cough',
      vitals: {
        bloodPressure: '118/76',
        heartRate: 96,
        respiratoryRate: 18,
        temperature: '100.8 F',
        spO2: 0, // Missing
        weightKg: 70,
        heightCm: 175,
      },
    };
    const mockNote: SoapNote = {
      subjective: 'Productive cough',
      objective: 'Lungs clear',
      assessment: 'Viral syndrome vs bronchitis',
      plan: 'Hydration and rest',
      medications: [],
      allergies: [],
    };

    const fhirBundle: any = generateFhirR4Bundle(mockPatient, mockNote, null);
    const observations = (fhirBundle.entry || []).filter((e: any) => e.resource?.resourceType === 'Observation');
    const hasFabricatedSpO2 = observations.some(
      (obs: any) =>
        obs.resource?.code?.text === 'SpO2' ||
        obs.resource?.code?.coding?.some((c: any) => c.code === '59408-5')
    );

    if (explicitlyMarksMissing && doesNotAssumeNormal && !hasFabricatedSpO2) {
      results.push({
        name: 'Missing Vitals Integrity: Absent SpO2 explicitly marked MISSING in AI prompt & omitted from FHIR without fabricating 98%',
        passed: true,
      });
    } else {
      results.push({
        name: 'Missing Vitals Integrity: Absent SpO2 explicitly marked MISSING in AI prompt & omitted from FHIR without fabricating 98%',
        passed: false,
        details: `explicitlyMarksMissing=${explicitlyMarksMissing}, doesNotAssumeNormal=${doesNotAssumeNormal}, hasFabricatedSpO2=${hasFabricatedSpO2}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Missing Vitals Integrity: Absent SpO2',
      passed: false,
      details: err.message,
    });
  }

  // =========================================================================
  // TEST 5: Evidence Relevance — Pediatric Study Limitation on Adult Patients & Decoupled Verification
  // =========================================================================
  try {
    const adultPatient: PatientRecord = {
      id: 'pt-adult-demo',
      name: 'Robert Miller',
      age: 45,
      gender: 'Male',
      mrn: 'MRN-45001',
      encounterDate: '2026-10-23',
      chiefComplaint: 'Acute cough and pleuritic pain',
      vitals: {
        bloodPressure: '124/80',
        heartRate: 78,
        respiratoryRate: 16,
        temperature: '98.6 F',
        spO2: 98,
        weightKg: 82,
        heightCm: 180,
      },
    };

    const analysisResult: any = {
      differentials: [
        {
          diagnosis: 'Community-Acquired Pneumonia',
          icd10: 'J18.9',
          likelihood: 'High',
          reasoning: 'Infiltrate on exam',
          recommendedWorkup: ['Chest X-Ray'],
          pmid: '28495000', // Pediatric pneumonia study
        },
      ],
      safetyAlerts: [],
    };

    const livePubMedData = [
      {
        pmid: '28495000',
        title: 'Clinical Outcomes of Pediatric Pneumonia in Children and Infants: A Cohort Study',
        sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/28495000/',
        citation: '[Pediatrics 2017; PMID: 28495000]',
      },
    ];

    enrichWithLiveRAGData(analysisResult, [], livePubMedData, adultPatient);

    const diff = analysisResult.differentials[0];
    const hasPediatricLimitation = !!diff.evidenceLimitation && diff.evidenceLimitation.includes('Pediatric study population');
    const claimNotVerified = diff.claimSupportVerified === false;

    if (hasPediatricLimitation && claimNotVerified) {
      results.push({
        name: 'Evidence Relevance: Pediatric studies applied to adult patients flagged with limitation; source retrieved decoupled from claim support',
        passed: true,
      });
    } else {
      results.push({
        name: 'Evidence Relevance: Pediatric studies applied to adult patients flagged with limitation; source retrieved decoupled from claim support',
        passed: false,
        details: `hasLimitation=${hasPediatricLimitation}, limitation="${diff.evidenceLimitation}", claimSupportVerified=${diff.claimSupportVerified}`,
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Evidence Relevance: Pediatric studies on adult patients',
      passed: false,
      details: err.message,
    });
  }

  return results;
}
