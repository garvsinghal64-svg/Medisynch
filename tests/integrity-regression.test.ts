process.env.SKIP_SERVER_LISTEN = 'true';

import { app, setServerFetchImplementation } from '../server';
import {
  buildClinicalDiagnosticPrompt,
  llmDiagnosticService,
  setUseMockLlm,
} from '../src/services/llmDiagnosticService';
import {
  extractAmbientMedicationsFromTranscript,
} from '../src/utils/clinicalHeuristics';
import {
  parseEfetchXml,
} from '../src/services/pubmedRetrievalService';
import { getProvenanceTags } from '../src/components/ProvenanceBadge';

export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

// Lightweight in-memory request dispatcher for Express app
async function callServerEndpoint(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method,
      url: path,
      query: {},
      headers: { host: 'localhost:3000' },
      body: body || {},
    };

    const parsedUrl = new URL(path, 'http://localhost:3000');
    req.path = parsedUrl.pathname;
    parsedUrl.searchParams.forEach((val, key) => {
      req.query[key] = val;
    });

    let resStatus = 200;
    const resHeaders: Record<string, string> = {};
    let responseBody: any = null;

    const res: any = {
      status(code: number) {
        resStatus = code;
        return this;
      },
      setHeader(name: string, value: string) {
        resHeaders[name.toLowerCase()] = value;
        return this;
      },
      json(data: any) {
        responseBody = data;
        resolve({ status: resStatus, body: responseBody });
      },
      send(data: any) {
        responseBody = data;
        resolve({ status: resStatus, body: responseBody });
      },
      end() {
        resolve({ status: resStatus, body: responseBody });
      },
    };

    app(req, res);
  });
}

export async function runIntegrityRegressionTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // 1. Allergy Integrity: missing/empty allergies -> 'Unknown / Not documented (do not assume NKDA)'
  try {
    const emptyAllergiesPrompt = buildClinicalDiagnosticPrompt({
      noteText: 'Evaluation of persistent cough.',
      allergies: [],
    });
    const missingAllergiesPrompt = buildClinicalDiagnosticPrompt({
      noteText: 'Evaluation of persistent cough.',
    });
    const explicitAllergyPrompt = buildClinicalDiagnosticPrompt({
      noteText: 'Evaluation of persistent cough.',
      allergies: ['Amoxicillin', 'Sulfa'],
    });

    const passed =
      emptyAllergiesPrompt.includes('Unknown / Not documented (do not assume NKDA)') &&
      !emptyAllergiesPrompt.includes('Documented Allergies: NKDA') &&
      missingAllergiesPrompt.includes('Unknown / Not documented (do not assume NKDA)') &&
      explicitAllergyPrompt.includes('Amoxicillin, Sulfa');

    results.push({
      name: 'Allergy Integrity: Missing or empty allergies never default to NKDA; explicitly marked Unknown / Not documented',
      passed,
      details: passed
        ? undefined
        : `emptyPrompt=${emptyAllergiesPrompt}, explicitPrompt=${explicitAllergyPrompt}`,
    });
  } catch (err) {
    results.push({
      name: 'Allergy Integrity: Missing or empty allergies never default to NKDA; explicitly marked Unknown / Not documented',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 2. Ambient Dictation Medication Extraction: no invented fixed doses, unstated doses marked unspecified, negations excluded
  try {
    const transcriptWithExplicitDose =
      'Patient reports taking Lisinopril 20mg once daily and Metformin 500mg BID with meals.';
    const extractedExplicit = extractAmbientMedicationsFromTranscript(transcriptWithExplicitDose);

    const transcriptWithUnspecifiedDose =
      'Patient is on carvedilol and started omeprazole last month.';
    const extractedUnspecified = extractAmbientMedicationsFromTranscript(transcriptWithUnspecifiedDose);

    const transcriptWithDiscontinued =
      'We stopped her atorvastatin due to myalgias and discontinued aspirin. She takes Metoprolol 25mg.';
    const extractedDiscontinued = extractAmbientMedicationsFromTranscript(transcriptWithDiscontinued);

    const passed =
      extractedExplicit.some((m) => m.toLowerCase().includes('lisinopril 20mg')) &&
      extractedExplicit.some((m) => m.toLowerCase().includes('metformin 500mg')) &&
      extractedUnspecified.some((m) => m.toLowerCase().includes('carvedilol (dose/route unspecified — confirm clinically)')) &&
      extractedUnspecified.some((m) => m.toLowerCase().includes('omeprazole (dose/route unspecified — confirm clinically)')) &&
      !extractedUnspecified.some((m) => m.includes('400mg') || m.includes('TID')) &&
      !extractedDiscontinued.some((m) => m.toLowerCase().includes('atorvastatin')) &&
      !extractedDiscontinued.some((m) => m.toLowerCase().includes('aspirin')) &&
      extractedDiscontinued.some((m) => m.toLowerCase().includes('metoprolol 25mg'));

    results.push({
      name: 'Ambient Dictation Integrity: Spoken regimens preserved, unstated doses marked unspecified, discontinued drugs excluded',
      passed,
      details: passed
        ? undefined
        : `explicit=${JSON.stringify(extractedExplicit)}, unspecified=${JSON.stringify(extractedUnspecified)}, discontinued=${JSON.stringify(extractedDiscontinued)}`,
    });
  } catch (err) {
    results.push({
      name: 'Ambient Dictation Integrity: Spoken regimens preserved, unstated doses marked unspecified, discontinued drugs excluded',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Mock LLM Scenario Specificity: Unmatched inputs return explicit unmatched notice without defaulting to Encephalitis
  try {
    setUseMockLlm(true);
    const nonMatchedInput = {
      noteText: '45yo male with bilateral plantar fasciitis and heel pain after running a marathon.',
      medications: ['Acetaminophen PRN'],
      allergies: ['NKDA'],
    };

    const mockResponse = await llmDiagnosticService.generateDiagnosticSynthesis(nonMatchedInput, {
      useMock: true,
      delayMs: 10,
    });

    const passed =
      mockResponse.provenance?.engine === 'mock' &&
      mockResponse.primaryDifferential.includes('[MOCK MODE] No Pre-Configured Mock Demonstration Scenario Matched Input') &&
      !mockResponse.primaryDifferential.toLowerCase().includes('encephalitis');

    results.push({
      name: 'Mock LLM Integrity: Arbitrary inputs do not default to Encephalitis; returns explicit unmatched demonstration notice',
      passed,
      details: passed
        ? undefined
        : `primaryDifferential=${mockResponse.primaryDifferential}, engine=${mockResponse.provenance?.engine}`,
    });
  } catch (err) {
    results.push({
      name: 'Mock LLM Integrity: Arbitrary inputs do not default to Encephalitis; returns explicit unmatched demonstration notice',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    setUseMockLlm(false);
  }

  // 4. Server Science Endpoints: PubChem & RxNorm return 404 unavailable for unknown compounds with NO synthesized IDs
  try {
    // Upstream fetch returns 404 to simulate missing live compound
    setServerFetchImplementation(async () => {
      return new Response('Not Found', { status: 404 });
    });

    const pubchemRes = await callServerEndpoint('/api/science/pubchem?compound=UnknownSubstanceXYZ999');
    const rxnormRes = await callServerEndpoint('/api/science/rxnorm?drug=UnknownChemicalABC888');

    const passed =
      pubchemRes.status === 404 &&
      pubchemRes.body.status === 'unavailable' &&
      !pubchemRes.body.cid &&
      !pubchemRes.body.canonicalSmiles &&
      rxnormRes.status === 404 &&
      rxnormRes.body.status === 'unavailable' &&
      !rxnormRes.body.rxcui;

    results.push({
      name: 'Science Endpoints: PubChem and RxNorm return 404 unavailable without fabricating CIDs, formulas, or RxCUIs',
      passed,
      details: passed
        ? undefined
        : `pubchem=${JSON.stringify(pubchemRes)}, rxnorm=${JSON.stringify(rxnormRes)}`,
    });
  } catch (err) {
    results.push({
      name: 'Science Endpoints: PubChem and RxNorm return 404 unavailable without fabricating CIDs, formulas, or RxCUIs',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    setServerFetchImplementation(null);
  }

  // 5. Server Science Endpoints: ClinVar, Target Structures & EuropePMC filter by query relevance
  try {
    const clinvarMatch = await callServerEndpoint('/api/science/clinvar?query=SLCO1B1');
    const clinvarNoMatch = await callServerEndpoint('/api/science/clinvar?query=UNKNOWNGENEXXX');

    const targetMatch = await callServerEndpoint('/api/science/target-structures?query=SGLT2');
    const targetNoMatch = await callServerEndpoint('/api/science/target-structures?query=NONEXISTENTPROTEIN');

    const passed =
      clinvarMatch.body.variants?.length > 0 &&
      clinvarNoMatch.body.variants?.length === 0 &&
      clinvarNoMatch.body.status === 'unavailable' &&
      targetMatch.body.targets?.length > 0 &&
      targetNoMatch.body.targets?.length === 0 &&
      targetNoMatch.body.status === 'unavailable';

    results.push({
      name: 'Science Endpoints: ClinVar and Target Structures filter by query relevance and never return unrelated datasets',
      passed,
      details: passed
        ? undefined
        : `clinvarMatch=${clinvarMatch.body.variants?.length}, clinvarNoMatch=${clinvarNoMatch.body.variants?.length}, targetMatch=${targetMatch.body.targets?.length}, targetNoMatch=${targetNoMatch.body.targets?.length}`,
    });
  } catch (err) {
    results.push({
      name: 'Science Endpoints: ClinVar and Target Structures filter by query relevance and never return unrelated datasets',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 6. PubMed XML Parser: Handles XML entities, nested tags, and never substitutes title for missing abstract
  try {
    const sampleXml = `<PubmedArticleSet>
      <PubmedArticle>
        <MedlineCitation>
          <PMID>12345678</PMID>
          <Article>
            <Journal><Title>JAMA &amp; Clinical Medicine</Title></Journal>
            <ArticleTitle>Efficacy of Drug &lt;A&gt; in &quot;Hypertension&quot; &amp; Cardiac Failure</ArticleTitle>
            <Abstract>
              <AbstractText Label="BACKGROUND">Hypertension affects &gt;30% of adults.</AbstractText>
              <AbstractText Label="CONCLUSION">Drug &lt;A&gt; demonstrated clinical benefit.</AbstractText>
            </Abstract>
          </Article>
        </MedlineCitation>
      </PubmedArticle>
      <PubmedArticle>
        <MedlineCitation>
          <PMID>87654321</PMID>
          <Article>
            <Journal><Title>Lancet</Title></Journal>
            <ArticleTitle>Editorial on Emerging Pathogens</ArticleTitle>
            <!-- No abstract provided -->
          </Article>
        </MedlineCitation>
      </PubmedArticle>
    </PubmedArticleSet>`;

    const parsedArticles = parseEfetchXml(sampleXml, ['12345678', '87654321']);

    const first = parsedArticles.find((a) => a.pmid === '12345678');
    const second = parsedArticles.find((a) => a.pmid === '87654321');

    const passed =
      first !== undefined &&
      first.journal === 'JAMA & Clinical Medicine' &&
      first.title === 'Efficacy of Drug <A> in "Hypertension" & Cardiac Failure' &&
      first.abstractText.includes('Hypertension affects >30% of adults') &&
      first.abstractText.includes('Drug <A> demonstrated clinical benefit') &&
      second !== undefined &&
      second.pmid === '87654321' &&
      second.abstractText === '' && // Abstract must be empty, NOT substituted with the title!
      second.title === 'Editorial on Emerging Pathogens';

    results.push({
      name: 'PubMed XML Parser: Decodes XML entities, flattens structured sub-abstracts, and never substitutes title for missing abstract',
      passed,
      details: passed
        ? undefined
        : `first=${JSON.stringify(first)}, second=${JSON.stringify(second)}`,
    });
  } catch (err) {
    results.push({
      name: 'PubMed XML Parser: Decodes XML entities, flattens structured sub-abstracts, and never substitutes title for missing abstract',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  // 7. ProvenanceBadge: Distinct representation for all engine origins and evidence statuses
  try {
    const mockTags = getProvenanceTags({
      engine: 'mock',
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: 'curated-fallback',
    });
    const heuristicTags = getProvenanceTags({
      engine: 'heuristic',
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus: 'curated-fallback',
    });
    const unknownTags = getProvenanceTags({
      engine: 'unknown',
      usedPrebuiltData: false,
      fallbackUsed: false,
      evidenceStatus: 'unavailable',
    });

    const passed =
      mockTags.some((t) => t.label === 'Mock / Static Data') &&
      heuristicTags.some((t) => t.label === 'AI Fallback — Rule-Based') &&
      unknownTags.some((t) => t.label === 'Unknown Origin — Verification Unavailable');

    results.push({
      name: 'ProvenanceBadge: Renders explicit distinct tags for mock, heuristic, and unknown execution origins',
      passed,
      details: passed
        ? undefined
        : `mock=${JSON.stringify(mockTags)}, heuristic=${JSON.stringify(heuristicTags)}, unknown=${JSON.stringify(unknownTags)}`,
    });
  } catch (err) {
    results.push({
      name: 'ProvenanceBadge: Renders explicit distinct tags for mock, heuristic, and unknown execution origins',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}
