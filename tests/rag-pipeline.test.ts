import { ClinicalEvaluationInput } from '../src/utils/clinicalHeuristics';
import {
  pubmedRetrievalService,
  setPubMedFetchImplementation,
} from '../src/services/pubmedRetrievalService';
import {
  llmDiagnosticService,
  DIAGNOSTIC_SYSTEM_INSTRUCTION,
  setUseMockLlm,
} from '../src/services/llmDiagnosticService';

export interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export async function runRagPipelineTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Mock NCBI E-utilities (esearch + esummary/efetch) returning a fake Brucellosis abstract
  // and assert that llmDiagnosticService.generateDiagnosticSynthesis() cites [PMID: 39481029] inline and populates references[]
  try {
    const mockedPmid = '39481029';
    const mockedTitle =
      'Zoonotic Brucella melitensis Outbreaks from Unpasteurized Goat Cheese: Pancytopenia and Splenomegaly';
    const mockedJournal = 'New England Journal of Medicine';
    const mockedAbstract =
      'Patients consuming unpasteurized caprine dairy in rural Italy frequently present with undulant fever, night sweats, splenomegaly, transaminitis, and pancytopenia. Standard tube agglutination and extended blood cultures are diagnostic.';

    let esearchCalled = false;
    let detailsEndpointCalled = false;

    setPubMedFetchImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url.includes('esearch.fcgi')) {
        esearchCalled = true;
        return new Response(
          JSON.stringify({
            esearchresult: {
              idlist: [mockedPmid],
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (url.includes('esummary.fcgi')) {
        detailsEndpointCalled = true;
        return new Response(
          JSON.stringify({
            result: {
              [mockedPmid]: {
                uid: mockedPmid,
                title: mockedTitle,
                fulljournalname: mockedJournal,
                pubdate: '2025',
                abstract: mockedAbstract,
              },
            },
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }
        );
      }

      if (url.includes('efetch.fcgi')) {
        detailsEndpointCalled = true;
        const xmlPayload = `<PubmedArticleSet>
          <PubmedArticle>
            <MedlineCitation>
              <PMID>${mockedPmid}</PMID>
              <Article>
                <Journal><Title>${mockedJournal}</Title></Journal>
                <ArticleTitle>${mockedTitle}</ArticleTitle>
                <Abstract><AbstractText>${mockedAbstract}</AbstractText></Abstract>
              </Article>
            </MedlineCitation>
          </PubmedArticle>
        </PubmedArticleSet>`;
        return new Response(xmlPayload, {
          status: 200,
          headers: { 'content-type': 'application/xml' },
        });
      }

      return new Response('Not Found', { status: 404 });
    });

    setUseMockLlm(true);

    const literatureText = await pubmedRetrievalService.fetchRelevantLiterature([
      'pancytopenia',
      'splenomegaly',
      'tick bite',
    ]);

    const brucellosisInput: ClinicalEvaluationInput = {
      vitals: {
        temp: 39.2,
        hr: 115,
        bp: '105/65',
        rr: 18,
        spo2: 97,
        weightKg: 62,
      },
      medications: ['Albuterol PRN', 'Ibuprofen 600mg PRN'],
      allergies: ['NKDA'],
      noteText:
        '34-year-old female presenting with 3 weeks of undulating fevers, night sweats, pancytopenia, and splenomegaly after consuming unpasteurized goat cheese and tick bites in Tuscany.',
    };

    // 1. Verify Mock Mode: Has engine: 'mock', populates references from retrieved literature,
    // and does NOT falsely inject unverified inline PMIDs into canned mock reasoning.
    const mockSynthesis = await llmDiagnosticService.generateDiagnosticSynthesis(brucellosisInput, {
      useMock: true,
      delayMs: 15,
    });

    const hasSystemMandate =
      DIAGNOSTIC_SYSTEM_INSTRUCTION.includes(
        'You are provided with real-time PubMed literature. You MUST ground your reasoning and workup in these provided sources. Cite the sources inline using the format [PMID: XXXXXXXX].'
      );

    const literatureContainsAbstract =
      literatureText.includes(`[PMID: ${mockedPmid}]`) &&
      literatureText.includes(mockedTitle) &&
      literatureText.includes(mockedAbstract);

    const mockIsTruthful =
      mockSynthesis.provenance?.engine === 'mock' &&
      Array.isArray(mockSynthesis.references) &&
      mockSynthesis.references.some((r) => r.includes(mockedPmid)) &&
      !mockSynthesis.reasoning.includes(`[PMID: ${mockedPmid}]`);

    // 2. Verify Live Executor Mode: Grounds retrieved [PMID: 39481029] and strips unsupported [PMID: 99999999]
    const liveSynthesis = await llmDiagnosticService.generateDiagnosticSynthesis(brucellosisInput, {
      useMock: false,
      liveExecutor: async () => ({
        primaryDifferential: 'Acute Zoonotic Brucellosis (Brucella melitensis)',
        secondaryDifferentials: ['Tick-borne Borreliosis / Lyme', 'Visceral Leishmaniasis'],
        reasoning: `Patient presents with classic undulant fevers and pancytopenia supported by literature [PMID: ${mockedPmid}]. An unverified claim [PMID: 99999999] is also present.`,
        recommendedWorkup: [
          `Serum agglutination test (SAT) and Brucella blood cultures [PMID: ${mockedPmid}]`,
          'Complete abdominal ultrasound for splenomegaly',
        ],
        references: [],
      }),
    });

    const liveGroundingAccurate =
      liveSynthesis.provenance?.engine === 'gemini' &&
      liveSynthesis.provenance?.evidenceStatus === 'live-success' &&
      liveSynthesis.reasoning.includes(`[PMID: ${mockedPmid}]`) &&
      !liveSynthesis.reasoning.includes('99999999') &&
      liveSynthesis.recommendedWorkup[0].includes(`[PMID: ${mockedPmid}]`) &&
      Array.isArray(liveSynthesis.references) &&
      liveSynthesis.references.some((ref) => ref.includes(mockedPmid) && ref.includes(mockedTitle));

    const passed =
      esearchCalled &&
      detailsEndpointCalled &&
      hasSystemMandate &&
      literatureContainsAbstract &&
      mockIsTruthful &&
      liveGroundingAccurate;

    results.push({
      name: 'PubMed E-Utilities RAG Pipeline: Grounded PMID citations verified, unverified PMIDs stripped, and mock engine isolated',
      passed,
      details: passed
        ? undefined
        : `esearch=${esearchCalled}, details=${detailsEndpointCalled}, mandate=${hasSystemMandate}, lit=${literatureContainsAbstract}, mockIsTruthful=${mockIsTruthful}, liveGrounding=${liveGroundingAccurate}, refs=${JSON.stringify(
            liveSynthesis.references
          )}`,
    });
  } catch (err) {
    results.push({
      name: 'PubMed E-Utilities RAG Pipeline: Grounded PMID citations verified, unverified PMIDs stripped, and mock engine isolated',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    setPubMedFetchImplementation(null);
    setUseMockLlm(false);
  }

  // Test 2: When PubMed E-utilities fails, never fabricate PMIDs; explicitly state "Evidence retrieval failed. No citations available."
  try {
    setPubMedFetchImplementation(async () => {
      return new Response('Internal Server Error', { status: 500 });
    });

    const failedLit = await pubmedRetrievalService.fetchRelevantLiterature([
      'pancytopenia',
      'splenomegaly',
    ]);

    const brucellosisInput: ClinicalEvaluationInput = {
      vitals: { temp: 39.2, hr: 115, bp: '105/65', rr: 18, spo2: 97, weightKg: 62 },
      medications: ['Ibuprofen 600mg PRN'],
      allergies: ['NKDA'],
      noteText: '34yo female with undulating fevers, pancytopenia, and splenomegaly.',
    };

    const synthesisOnFailedEvidence = await llmDiagnosticService.generateDiagnosticSynthesis(
      brucellosisInput,
      { useMock: true, delayMs: 10 }
    );

    const noFabricatedPmids =
      failedLit === 'Evidence retrieval failed. No citations available.' &&
      !failedLit.includes('35363516') &&
      !failedLit.includes('36183291') &&
      !synthesisOnFailedEvidence.reasoning.includes('[PMID:') &&
      Array.isArray(synthesisOnFailedEvidence.references) &&
      synthesisOnFailedEvidence.references.length === 1 &&
      synthesisOnFailedEvidence.references[0] ===
        'Evidence retrieval failed. No citations available.' &&
      synthesisOnFailedEvidence.provenance?.evidenceStatus === 'unavailable';

    results.push({
      name: 'PubMed RAG Failure Transparency: Explicitly returns "Evidence retrieval failed. No citations available." with zero fabricated PMIDs',
      passed: noFabricatedPmids,
      details: noFabricatedPmids
        ? undefined
        : `failedLit=${failedLit}, refs=${JSON.stringify(
            synthesisOnFailedEvidence.references
          )}, prov=${JSON.stringify(synthesisOnFailedEvidence.provenance)}`,
    });
  } catch (err) {
    results.push({
      name: 'PubMed RAG Failure Transparency: Explicitly returns "Evidence retrieval failed. No citations available." with zero fabricated PMIDs',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
  } finally {
    setPubMedFetchImplementation(null);
  }

  return results;
}
