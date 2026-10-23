import { runClinicalSafetyTests } from './clinical-safety.test';
import { runVitalsAndHeuristicsTests } from './vitals-and-heuristics.test';
import { runFhirHl7Tests } from './fhir-hl7.test';
import { runFhirPipelineIntegrationTests } from './fhir-pipeline.test';
import { runDataMaskerAndAuditTests } from './data-masker-and-audit.test';
import { runDbPersistenceTests } from './db-persistence.test';
import { runClinicalCalculatorTests } from './clinical-calculators.test';
import { runClinicalPipelineTests } from './clinical-pipeline.test';
import { runAuditLoggerTests } from './audit-logger.test';
import { runLlmDiagnosticTests } from './llm-diagnostic.test';
import { runRagPipelineTests } from './rag-pipeline.test';
import { runIntegrityRegressionTests } from './integrity-regression.test';
import { runClinicalSafetyPatchTests } from './clinical-safety-patch.test';
import { runAdvancedClinicalSuiteTests } from './advanced-clinical-suite.test';

async function main() {
  console.log('================================================================');
  console.log('  CURADOC AI CLINICAL WORKSPACE — AUTOMATED TEST SUITE');
  console.log('  Verification of Safety, Heuristics, FHIR, DB & Security Rules');
  console.log('================================================================\n');

  const allTestSuites = [
    { suite: 'Clinical Safety & Drug Interactions', fn: runClinicalSafetyTests },
    { suite: 'Clinical Risk Calculators (HEART, CHA2DS2-VASc, CURB-65, eGFR, Alvarado)', fn: runClinicalCalculatorTests },
    { suite: 'Vitals Normalization & Clinical Heuristics', fn: runVitalsAndHeuristicsTests },
    { suite: 'Decoupled Two-Step Live Evidence & Structuring Pipeline', fn: runClinicalPipelineTests },
    { suite: 'FHIR R4 & HL7 v2.5.1 Message Construction', fn: runFhirHl7Tests },
    { suite: 'FHIR R4 & HL7 v2.5.1 EHR Ingestion Pipeline -> 100k-Archetype Engine', fn: runFhirPipelineIntegrationTests },
    { suite: 'HIPAA PHI Data Masking & Audit Trail', fn: runDataMaskerAndAuditTests },
    { suite: 'Clinical Database CRUD, Revisions & Sync', fn: runDbPersistenceTests },
    { suite: 'Hospital Compliance & CDS Alert Fatigue Audit Logger', fn: runAuditLoggerTests },
    { suite: 'Tier-1 LLM Diagnostic Engine Synthesis (Mock & Schema Verification)', fn: runLlmDiagnosticTests },
    { suite: 'Tier-1 NCBI PubMed E-Utilities RAG Grounding & Inline PMID Citations', fn: runRagPipelineTests },
    { suite: 'Clinical Evidence, Provenance & Safety Pass Integrity Regressions', fn: runIntegrityRegressionTests },
    { suite: 'Priority Clinical Safety Patch (SIRS vs Sepsis, Missing SpO2 & Evidence Relevance)', fn: runClinicalSafetyPatchTests },
    { suite: 'Advanced Clinical Suite (NEWS2/KDIGO, CPOE/MedRec, PGx CPIC, ABG/ECG, AVS Teach-Back)', fn: runAdvancedClinicalSuiteTests },
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const { suite, fn } of allTestSuites) {
    console.log(`▶ Running Suite: ${suite}`);
    const results = await Promise.resolve(fn());
    for (const res of results) {
      totalTests++;
      if (res.passed) {
        passedTests++;
        console.log(`  ✔ [PASS] ${res.name}`);
      } else {
        failedTests++;
        console.error(`  ✖ [FAIL] ${res.name}`);
        if (res.details) {
          console.error(`      Reason: ${res.details}`);
        }
      }
    }
    console.log('');
  }

  console.log('================================================================');
  console.log(`  TEST RESULTS SUMMARY:`);
  console.log(`  Total:  ${totalTests}`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${failedTests}`);
  console.log('================================================================');

  if (failedTests > 0) {
    console.error(`\nFAILED: ${failedTests} test(s) failed. Inspect outputs above.`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All clinical verification tests passed cleanly!');
    process.exit(0);
  }
}

main();
