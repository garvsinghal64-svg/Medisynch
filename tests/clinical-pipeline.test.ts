import {
  fetchLiveFdaData,
  fetchLivePubMedData,
  enrichWithLiveRAGData,
  clinicalResponseSchema,
  FDA_FALLBACKS,
} from '../src/services/clinicalAnalysisService';

export async function runClinicalPipelineTests(): Promise<{ name: string; passed: boolean; details?: string }[]> {
  const results: { name: string; passed: boolean; details?: string }[] = [];

  // Test 1: fetchLiveFdaData returns valid clinical FDA pharmacology with sourceUrls
  try {
    const meds = ['Lisinopril 20mg PO daily', 'Furosemide 40mg PO daily'];
    const fdaData = await fetchLiveFdaData(meds);

    const hasLisinopril = fdaData.some(
      (d) => d.genericName.toLowerCase().includes('lisinopril') && d.boxedWarnings.length > 0 && d.sourceUrl.includes('dailymed')
    );
    const hasFurosemide = fdaData.some(
      (d) => d.genericName.toLowerCase().includes('furosemide') && d.boxedWarnings.length > 0 && d.sourceUrl.includes('dailymed')
    );

    if (hasLisinopril && hasFurosemide) {
      results.push({ name: 'Live FDA RAG Pipeline: Boxed Warnings & Evidence URLs Retrieved', passed: true });
    } else {
      results.push({
        name: 'Live FDA RAG Pipeline: Boxed Warnings & Evidence URLs Retrieved',
        passed: false,
        details: 'Failed to extract boxed warnings or source URLs for Lisinopril/Furosemide.',
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Live FDA RAG Pipeline: Boxed Warnings & Evidence URLs Retrieved',
      passed: false,
      details: err.message,
    });
  }

  // Test 2: fetchLiveFdaData gracefully handles empty or invalid inputs
  try {
    const emptyResult = await fetchLiveFdaData([]);
    if (Array.isArray(emptyResult) && emptyResult.length === 0) {
      results.push({ name: 'Live FDA RAG Pipeline: Empty Medication List Handled Safely', passed: true });
    } else {
      results.push({
        name: 'Live FDA RAG Pipeline: Empty Medication List Handled Safely',
        passed: false,
        details: 'Expected empty array for empty medications.',
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Live FDA RAG Pipeline: Empty Medication List Handled Safely',
      passed: false,
      details: err.message,
    });
  }

  // Test 3: clinicalResponseSchema conforms to strict zero-hallucination structured output specification
  try {
    const props = (clinicalResponseSchema as any).properties;
    const hasDifferentials = !!props.differentials && props.differentials.items.properties.sourceUrl;
    const hasSafetyAlerts = !!props.safetyAlerts && props.safetyAlerts.items.properties.sourceUrl;
    const hasPatientSummary = !!props.patientSummary;
    const hasIcd10 = !!props.icd10Suggestions;
    const hasMissingHistory = !!props.missingHistoryQuestions;
    const hasMissingExam = !!props.missingExamFindings;

    if (hasDifferentials && hasSafetyAlerts && hasPatientSummary && hasIcd10 && hasMissingHistory && hasMissingExam) {
      results.push({ name: 'Structured Schema: Strict Multi-Domain Clinical Contract Validated', passed: true });
    } else {
      results.push({
        name: 'Structured Schema: Strict Multi-Domain Clinical Contract Validated',
        passed: false,
        details: 'clinicalResponseSchema is missing required fields or sourceUrl properties.',
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Structured Schema: Strict Multi-Domain Clinical Contract Validated',
      passed: false,
      details: err.message,
    });
  }

  // Test 4: fetchLivePubMedData returns valid citations and PMIDs
  try {
    const pubMedData = await fetchLivePubMedData('Heart failure with acute shortness of breath');
    if (pubMedData.length > 0 && pubMedData[0].pmid && pubMedData[0].sourceUrl.includes('pubmed.ncbi.nlm.nih.gov')) {
      results.push({ name: 'Live PubMed RAG Pipeline: PMIDs & Guidelines Retrieved', passed: true });
    } else {
      results.push({
        name: 'Live PubMed RAG Pipeline: PMIDs & Guidelines Retrieved',
        passed: false,
        details: 'Expected at least one PubMed guideline citation with PMID.',
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Live PubMed RAG Pipeline: PMIDs & Guidelines Retrieved',
      passed: false,
      details: err.message,
    });
  }

  // Test 5: enrichWithLiveRAGData attaches clickable PubMed PMIDs and FDA URLs
  try {
    const mockResult: any = {
      differentials: [
        { diagnosis: 'Acute Decompensated Heart Failure', icd10: 'I50.9', likelihood: 'High', reasoning: 'Symptoms align', recommendedWorkup: ['NT-proBNP'] },
      ],
      safetyAlerts: [
        { type: 'contraindication', severity: 'critical', substances: ['Lisinopril'], title: 'Pregnancy Warning', description: 'Fetal toxicity', recommendation: 'Discontinue' },
      ],
    };
    const fdaMock = [{ drug: 'Lisinopril', genericName: 'Lisinopril', sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=test-setid' }];
    const pubMedMock = [{ pmid: '35363516', title: '2022 AHA/ACC/HFSA Guideline', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/35363516/' }];

    enrichWithLiveRAGData(mockResult, fdaMock, pubMedMock);

    const diffEnriched = mockResult.differentials[0].pmid === '35363516' && mockResult.differentials[0].sourceUrl.includes('35363516');
    const safetyEnriched = mockResult.safetyAlerts[0].sourceUrl.includes('dailymed.nlm.nih.gov');

    if (diffEnriched && safetyEnriched) {
      results.push({ name: 'Live RAG Enrichment: Differential PMIDs & FDA Labels Attached', passed: true });
    } else {
      results.push({
        name: 'Live RAG Enrichment: Differential PMIDs & FDA Labels Attached',
        passed: false,
        details: 'Failed to enrich differentials or safety alerts with live links.',
      });
    }
  } catch (err: any) {
    results.push({
      name: 'Live RAG Enrichment: Differential PMIDs & FDA Labels Attached',
      passed: false,
      details: err.message,
    });
  }

  return results;
}
