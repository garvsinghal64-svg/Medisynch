import { ClinicalEvaluationInput } from '../utils/clinicalHeuristics';
import { ResultProvenance } from '../types/clinical';
import {
  pubmedRetrievalService,
  EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
} from './pubmedRetrievalService';
import { trackedFetch } from './apiDiagnosticsService';

export interface LlmDiagnosticResponse {
  primaryDifferential: string;
  secondaryDifferentials: string[];
  reasoning: string;
  recommendedWorkup: string[];
  references: string[];
  provenance?: ResultProvenance;
}

export const DIAGNOSTIC_SYSTEM_INSTRUCTION = `You are an expert clinical diagnostician operating as the Tier-1 LLM Diagnostic Engine in a hybrid hospital clinical decision support architecture.
You are provided with real-time PubMed literature. You MUST ground your reasoning and workup in these provided sources. Cite the sources inline using the format [PMID: XXXXXXXX].
If the literature context states "Evidence retrieval failed. No citations available.", do NOT invent or fabricate any PMIDs, and set references to ["Evidence retrieval failed. No citations available."].
Always include the following mandatory clinical statement in your reasoning: "AI-generated diagnostic suggestions. Always correlate with clinical judgment."
Provide a structured JSON synthesis containing:
- primaryDifferential: The single most probable or highest-acuity unifying diagnosis.
- secondaryDifferentials: 3 to 5 alternative or competing diagnoses to rule out.
- reasoning: Concise pathophysiological synthesis linking the patient's history, vitals, quantitative labs, and medications, grounded in the provided PubMed sources with inline [PMID: XXXXXXXX] citations (only when valid PubMed sources were retrieved) and explicitly stating "AI-generated diagnostic suggestions. Always correlate with clinical judgment."
- recommendedWorkup: Specific, actionable diagnostic tests, imaging, serologies, or specialist consultations grounded in the provided literature with inline [PMID: XXXXXXXX] citations where applicable.
- references: Full citations for every PubMed source referenced (e.g., "[PMID: XXXXXXXX] Title — Journal (Year)"), or ["Evidence retrieval failed. No citations available."] if live retrieval failed.`;

let runtimeMockOverride: boolean | null = null;
export type LiveLlmExecutor = (
  prompt: string,
  systemInstruction: string
) => Promise<LlmDiagnosticResponse>;

let registeredLiveExecutor: LiveLlmExecutor | null = null;

export function registerLiveLlmExecutor(executor: LiveLlmExecutor | null): void {
  registeredLiveExecutor = executor;
}

export function setUseMockLlm(useMock: boolean | null): void {
  runtimeMockOverride = useMock;
}

export function isUseMockLlmEnabled(explicitOption?: boolean): boolean {
  if (typeof explicitOption === 'boolean') {
    return explicitOption;
  }
  if (typeof runtimeMockOverride === 'boolean') {
    return runtimeMockOverride;
  }
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.USE_MOCK_LLM === 'true') return true;
      if (process.env.USE_MOCK_LLM === 'false') return false;
    }
  } catch {
    // Ignore process access issues in browser environments
  }
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv) {
      if (metaEnv.VITE_USE_MOCK_LLM === 'true' || metaEnv.USE_MOCK_LLM === 'true') return true;
      if (metaEnv.VITE_USE_MOCK_LLM === 'false' || metaEnv.USE_MOCK_LLM === 'false') return false;
    }
  } catch {
    // Ignore import.meta access issues
  }
  return false;
}

const HIGH_YIELD_CLINICAL_TERMS = [
  'pancytopenia',
  'splenomegaly',
  'undulating fever',
  'unpasteurized',
  'brucellosis',
  'leishmaniasis',
  'tick bite',
  'transaminitis',
  'night sweats',
  'orofacial dyskinesias',
  'encephalitis',
  'autonomic instability',
  'st-elevation',
  'stemi',
  'chest pain',
  'troponin',
  'otitis media',
  'tympanic membrane',
  'amoxicillin',
  'metformin',
  'lactic acidosis',
  'chronic kidney disease',
  'egfr',
  'hyperkalemia',
  'fever',
];

/**
 * Step 1 (Pre-computation): Quickly extracts 3-4 key clinical terms from ClinicalEvaluationInput
 * for querying NCBI E-utilities PubMed search.
 */
export function extractClinicalKeywords(input: ClinicalEvaluationInput): string[] {
  const text = (input.noteText || '').toLowerCase();
  const matched: string[] = [];

  for (const term of HIGH_YIELD_CLINICAL_TERMS) {
    if (text.includes(term) && !matched.includes(term)) {
      matched.push(term);
      if (matched.length >= 4) break;
    }
  }

  if (matched.length < 3 && Array.isArray(input.medications)) {
    for (const med of input.medications) {
      const cleanMed = med.split(/\s+/)[0]?.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
      if (cleanMed && cleanMed.length > 3 && !matched.includes(cleanMed)) {
        matched.push(cleanMed);
        if (matched.length >= 4) break;
      }
    }
  }

  if (matched.length === 0) {
    const fallbackWords = (input.noteText || '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 5)
      .slice(0, 4);
    return fallbackWords.length > 0 ? fallbackWords : ['clinical', 'differential', 'diagnosis'];
  }

  return matched.slice(0, 4);
}

/**
 * Extracts structured PMIDs and formatted reference lines from the retrieved PubMed literature string.
 * Never fabricates default PMIDs if retrieval failed or returned no sources.
 */
export function parseRetrievedCitations(literatureContext?: string): {
  pmids: string[];
  references: string[];
} {
  if (
    !literatureContext ||
    literatureContext.trim().length === 0 ||
    literatureContext.includes(EVIDENCE_RETRIEVAL_FAILED_MESSAGE) ||
    literatureContext.toLowerCase().includes('evidence retrieval failed') ||
    literatureContext.toLowerCase().includes('no citations available')
  ) {
    return {
      pmids: [],
      references: [EVIDENCE_RETRIEVAL_FAILED_MESSAGE],
    };
  }

  const blocks = literatureContext.split(/Source \d+:\s*/i).filter((b) => b.trim().length > 0);
  const pmids: string[] = [];
  const references: string[] = [];

  for (const block of blocks) {
    const pmidMatch = block.match(/\[PMID:\s*(\d+)\]/i) || block.match(/PMID:\s*(\d+)/i);
    const titleMatch = block.match(/Title:\s*([^\n]+)/i);
    const journalMatch = block.match(/Journal:\s*([^\n]+)/i);

    if (pmidMatch && pmidMatch[1]) {
      const pmid = pmidMatch[1].trim();
      if (!pmids.includes(pmid)) {
        pmids.push(pmid);
      }
      const title = titleMatch ? titleMatch[1].trim() : 'PubMed Clinical Evidence';
      const journal = journalMatch ? journalMatch[1].trim() : 'Indexed Medical Journal';
      references.push(`[PMID: ${pmid}] ${title} — ${journal}`);
    }
  }

  if (pmids.length === 0) {
    const explicitMatches = Array.from(
      literatureContext.matchAll(/\[PMID:\s*(\d+)\]/gi)
    ).map((m) => m[1]);
    for (const pmid of explicitMatches) {
      if (!pmids.includes(pmid)) {
        pmids.push(pmid);
        references.push(`[PMID: ${pmid}] Retrieved NCBI PubMed Literature Source`);
      }
    }
  }

  if (pmids.length === 0) {
    return {
      pmids: [],
      references: [EVIDENCE_RETRIEVAL_FAILED_MESSAGE],
    };
  }

  return { pmids, references };
}

export function validateLlmDiagnosticResponse(data: unknown): LlmDiagnosticResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Tier-1 live LLM returned empty or non-object response.');
  }
  const obj = data as Record<string, any>;
  if (typeof obj.primaryDifferential !== 'string' || !obj.primaryDifferential.trim()) {
    throw new Error('Tier-1 live LLM response missing valid primaryDifferential.');
  }
  if (!Array.isArray(obj.secondaryDifferentials) || obj.secondaryDifferentials.length === 0) {
    throw new Error('Tier-1 live LLM response missing valid secondaryDifferentials array.');
  }
  if (typeof obj.reasoning !== 'string' || !obj.reasoning.trim()) {
    throw new Error('Tier-1 live LLM response missing valid reasoning narrative.');
  }
  if (!Array.isArray(obj.recommendedWorkup)) {
    throw new Error('Tier-1 live LLM response missing valid recommendedWorkup array.');
  }
  if (!Array.isArray(obj.references)) {
    obj.references = [];
  }
  return obj as LlmDiagnosticResponse;
}

/**
 * Formats structured patient EHR data (vitals, labs/noteText, medications, allergies)
 * and retrieved PubMed abstracts into a grounded clinical prompt for the Tier-1 LLM Diagnostic Engine.
 * Never assumes NKDA when allergy information is absent or empty.
 */
export function buildClinicalDiagnosticPrompt(
  input: ClinicalEvaluationInput,
  pubmedLiterature?: string
): string {
  const vitalsParts: string[] = [];
  if (input.vitals) {
    if (input.vitals.bp) vitalsParts.push(`BP: ${input.vitals.bp} mmHg`);
    if (input.vitals.hr !== undefined && input.vitals.hr > 0) vitalsParts.push(`HR: ${input.vitals.hr} bpm`);
    if (input.vitals.rr !== undefined && input.vitals.rr > 0) vitalsParts.push(`RR: ${input.vitals.rr} /min`);
    if (input.vitals.temp !== undefined && input.vitals.temp > 0) vitalsParts.push(`Temp: ${input.vitals.temp} °C`);
    if (input.vitals.spo2 !== undefined && input.vitals.spo2 > 0) {
      vitalsParts.push(`SpO2: ${input.vitals.spo2}%`);
    } else {
      vitalsParts.push('SpO2: Undocumented / Not measured (MISSING — Never infer or assume normal SpO2)');
    }
    if (input.vitals.weightKg !== undefined && input.vitals.weightKg > 0) vitalsParts.push(`Weight: ${input.vitals.weightKg} kg`);
  }

  const medsText =
    input.medications && input.medications.length > 0 && input.medications.some((m) => m.trim().length > 0)
      ? input.medications.filter((m) => m.trim().length > 0).join(', ')
      : 'None documented';

  // Never assume NKDA when missing or empty
  const allergiesText =
    input.allergies && input.allergies.length > 0 && input.allergies.some((a) => a.trim().length > 0)
      ? input.allergies.filter((a) => a.trim().length > 0).join(', ')
      : 'Unknown / Not documented (do not assume NKDA)';

  return [
    '=== STRUCTURED PATIENT EHR SUMMARY ===',
    `Vitals: ${vitalsParts.length > 0 ? vitalsParts.join(' | ') : 'Incomplete / Not recorded'}`,
    `Active Medications: ${medsText}`,
    `Documented Allergies: ${allergiesText}`,
    `Clinical Narrative & Quantitative Labs: ${input.noteText || 'No narrative provided.'}`,
    '======================================',
    '=== CLINICAL INTEGRITY & EVIDENCE STANDARDS ===',
    '1. Vitals Integrity: Never infer that SpO2 is normal when it is absent or undocumented. Keep missing, measured, calculated, and AI-inferred data explicitly distinct.',
    '2. Sepsis vs SIRS: Do not equate SIRS positivity with sepsis. Require clinical assessment and appropriate evidence of infection-associated organ dysfunction before suggesting sepsis-specific management.',
    '3. Evidence Relevance: Do not present a pediatric study as direct evidence for an adult patient without clearly stating the limitation. Separate source retrieved from claim support verified.',
    '==============================================',
    '=== REAL-TIME PUBMED LITERATURE CONTEXT ===',
    pubmedLiterature || EVIDENCE_RETRIEVAL_FAILED_MESSAGE,
    '===========================================',
    'Synthesize the primary differential, secondary differentials, diagnostic reasoning (including "AI-generated diagnostic suggestions. Always correlate with clinical judgment." and inline [PMID: XXXXXXXX] citations ONLY if live PubMed sources were retrieved above), recommended diagnostic workup, and the full references list.',
  ].join('\n');
}

function buildDetailedMockResponse(
  input: ClinicalEvaluationInput,
  literatureContext?: string
): LlmDiagnosticResponse {
  // Match ONLY against the input note text, never literatureContext
  const lower = (input.noteText || '').toLowerCase();
  const { pmids, references } = parseRetrievedCitations(literatureContext);
  const hasCitations = pmids.length > 0;

  // Mock output must strictly declare engine: 'mock' and never masquerade as live Gemini execution
  const provenance: ResultProvenance = {
    engine: 'mock',
    usedPrebuiltData: true,
    fallbackUsed: false,
    evidenceStatus: hasCitations ? 'curated-fallback' : 'unavailable',
    retrievalRequested: true,
    claimSupportVerified: false,
  };

  if (
    lower.includes('tuscany') ||
    lower.includes('unpasteurized') ||
    lower.includes('undulating') ||
    lower.includes('splenomegaly') ||
    lower.includes('brucell')
  ) {
    return {
      primaryDifferential:
        '[MOCK] Acute/Subacute Systemic Brucellosis (Brucella melitensis) vs. Mediterranean Visceral Leishmaniasis (Leishmania infantum)',
      secondaryDifferentials: [
        '[MOCK] Mediterranean Visceral Leishmaniasis (Kala-Azar, Leishmania infantum via Phlebotomus sandfly vector)',
        '[MOCK] Mediterranean Spotted Fever / Boutonneuse Fever (Rickettsia conorii)',
        '[MOCK] Infection-Associated Hemophagocytic Lymphohistiocytosis (Secondary HLH / Macrophage Activation Syndrome)',
        '[MOCK] Q Fever (Coxiella burnetii) or Typhoid/Enteric Fever',
      ],
      reasoning:
        '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. Classic presentation of undulant fever, drenching night sweats, and hepatosplenomegaly/pancytopenia following unpasteurized dairy consumption and Mediterranean travel exposures.',
      recommendedWorkup: [
        '[MOCK] Extended-incubation aerobic blood cultures (notify microbiology of suspected Brucella melitensis)',
        '[MOCK] Brucella serology (Standard Tube Agglutination test and Brucella PCR)',
        '[MOCK] Leishmania infantum diagnostic panel (Quantitative buffy-coat PCR and rK39 dipstick)',
        '[MOCK] Secondary HLH screening (serum ferritin, fasting triglycerides, fibrinogen, sCD25)',
      ],
      references,
      provenance,
    };
  }

  if (lower.includes('egfr') || lower.includes('metformin') || lower.includes('creatinine')) {
    return {
      primaryDifferential:
        '[MOCK] Subacute Cardiorenal Syndrome Type 2 with Metformin Contraindication (eGFR < 30) & Risk of MALA',
      secondaryDifferentials: [
        '[MOCK] Drug-Induced Acute Interstitial Nephritis (AIN)',
        '[MOCK] ANCA-Associated Pauci-Immune Glomerulonephritis',
        '[MOCK] Atheroembolic Renal Disease',
      ],
      reasoning:
        '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. Significant renal impairment while maintained on metformin elevates risk of impaired clearance and lactic acidosis.',
      recommendedWorkup: [
        '[MOCK] STAT venous blood gas (VBG) and arterial serum lactate level',
        '[MOCK] Urinalysis with microscopic sediment inspection and spot UPCR',
        '[MOCK] Renal ultrasonography with Doppler resistive indices',
      ],
      references,
      provenance,
    };
  }

  if (lower.includes('stemi') || lower.includes('chest pain') || lower.includes('troponin')) {
    return {
      primaryDifferential:
        '[MOCK] Acute ST-Elevation Myocardial Infarction (STEMI) vs. Acute Aortic Dissection with Coronary Extension',
      secondaryDifferentials: [
        '[MOCK] Acute Fulminant Myopericarditis',
        '[MOCK] Takotsubo Stress Cardiomyopathy',
        '[MOCK] Massive Saddle Pulmonary Embolism',
      ],
      reasoning:
        '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. Acute chest pain with ischemic biomarkers requires urgent coronary revascularization pathway while actively ruling out aortic dissection.',
      recommendedWorkup: [
        '[MOCK] Immediate 12-lead ECG with right-sided (V3R-V4R) and posterior leads',
        '[MOCK] STAT bedside echocardiogram assessing regional wall motion and aortic root',
        '[MOCK] High-sensitivity cardiac troponin serial trend and emergent catheterization activation',
      ],
      references,
      provenance,
    };
  }

  if (lower.includes('otitis') || lower.includes('aom') || lower.includes('tympanic')) {
    return {
      primaryDifferential:
        '[MOCK] Refractory Acute Otitis Media with Coalescent Mastoiditis Risk',
      secondaryDifferentials: [
        '[MOCK] Penicillin-Resistant Streptococcus pneumoniae Otomastoiditis',
        '[MOCK] Beta-Lactamase Producing Haemophilus influenzae',
        '[MOCK] Petrous Apicitis (Gradenigo Syndrome)',
      ],
      reasoning:
        '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. Persistent fever and tympanic erythema warrant close evaluation for mastoid tenderness.',
      recommendedWorkup: [
        '[MOCK] Focused otoscopic exam assessing mastoid tenderness and auricular position',
        '[MOCK] Tympanocentesis for middle ear fluid culture if unresponsive to second-line therapy',
        '[MOCK] High-resolution temporal bone CT if mastoiditis suspected',
      ],
      references,
      provenance,
    };
  }

  if (
    lower.includes('encephalitis') ||
    lower.includes('dyskinesia') ||
    lower.includes('tick') ||
    lower.includes('neuroborreliosis')
  ) {
    return {
      primaryDifferential:
        '[MOCK] Anti-NMDA Receptor Autoimmune Encephalitis vs. Tick-Borne Neuroborreliosis',
      secondaryDifferentials: [
        '[MOCK] Human Granulocytic Anaplasmosis / Babesia Co-infection',
        '[MOCK] LGI1 / CASPR2 Limbic Autoimmune Encephalitis',
        '[MOCK] Herpes Simplex Virus Type 1 Encephalitis',
      ],
      reasoning:
        '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. Subacute neuropsychiatric fluctuations with dyskinesias and autonomic instability suggest autoimmune receptor or neuro-invasive etiology.',
      recommendedWorkup: [
        '[MOCK] Lumbar puncture for CSF cell count, protein, oligoclonal bands, and autoimmune encephalitis panel',
        '[MOCK] Contrast-enhanced brain MRI with FLAIR sequences',
        '[MOCK] Continuous video EEG monitoring',
      ],
      references,
      provenance,
    };
  }

  // Explicit non-matched mock message for arbitrary input (never default to Encephalitis)
  return {
    primaryDifferential:
      '[MOCK MODE] No Pre-Configured Mock Demonstration Scenario Matched Input',
    secondaryDifferentials: [
      '[MOCK MODE] Please run with live Gemini execution for uncurated patient narratives',
      '[MOCK MODE] Pre-configured mock scenarios include: Brucellosis, Metformin/CKD, STEMI, Otitis Media, Encephalitis',
    ],
    reasoning:
      '[MOCK DEMONSTRATION — NOT PATIENT-SPECIFIC CLINICAL REASONING] AI-generated diagnostic suggestions. Always correlate with clinical judgment. The provided clinical note did not match any pre-configured demonstration mock scenarios. In live deployment mode, Gemini processes arbitrary clinical narratives dynamically.',
    recommendedWorkup: [
      '[MOCK MODE] Configure live Gemini API key on server to analyze this custom case presentation',
    ],
    references: hasCitations ? references : [EVIDENCE_RETRIEVAL_FAILED_MESSAGE],
    provenance,
  };
}

function ensureReferencesAndCitations(
  response: LlmDiagnosticResponse,
  literatureContext: string
): LlmDiagnosticResponse {
  const { pmids, references } = parseRetrievedCitations(literatureContext);
  const hasCitations = pmids.length > 0;

  let reasoning = response.reasoning || '';
  let recommendedWorkup = Array.isArray(response.recommendedWorkup)
    ? [...response.recommendedWorkup]
    : [];

  if (!hasCitations) {
    // Strip any unverified/hallucinated PMIDs when live evidence retrieval failed
    reasoning = reasoning.replace(/\s*\[PMID:\s*\d+\]/gi, '').trim();
    recommendedWorkup = recommendedWorkup.map((w) =>
      w.replace(/\s*\[PMID:\s*\d+\]/gi, '').trim()
    );
  } else {
    // If inline PMIDs are cited, verify they were actually retrieved in literatureContext.
    // Strip any citations that refer to unretrieved PMIDs.
    // Do NOT auto-append [PMID: ${pmids[0]}] to reasoning just to satisfy a citation check.
    const validPmidSet = new Set(pmids);
    reasoning = reasoning.replace(/\[PMID:\s*(\d+)\]/gi, (match, id) => {
      return validPmidSet.has(id.trim()) ? match : '';
    }).replace(/\s{2,}/g, ' ').trim();

    recommendedWorkup = recommendedWorkup.map((w) =>
      w.replace(/\[PMID:\s*(\d+)\]/gi, (match, id) => {
        return validPmidSet.has(id.trim()) ? match : '';
      }).replace(/\s{2,}/g, ' ').trim()
    );
  }

  const finalRefs = hasCitations
    ? Array.isArray(response.references) &&
      response.references.length > 0 &&
      response.references.some((r) => pmids.some((id) => r.includes(id)))
      ? response.references
      : references
    : [EVIDENCE_RETRIEVAL_FAILED_MESSAGE];

  // Preserve verified execution provenance from the actual execution path
  const incomingProv = response.provenance;
  const isMockEngine = incomingProv?.engine === 'mock';
  const isHeuristicEngine = incomingProv?.engine === 'heuristic';

  const engine = isMockEngine
    ? 'mock'
    : isHeuristicEngine
      ? 'heuristic'
      : (incomingProv?.engine || 'gemini');

  const evidenceStatus = hasCitations
    ? (incomingProv?.evidenceStatus === 'live-partial' ? 'live-partial' : 'live-success')
    : 'unavailable';

  return {
    ...response,
    reasoning,
    recommendedWorkup,
    references: finalRefs,
    provenance: {
      engine,
      model: engine === 'gemini' || engine === 'hybrid' ? (incomingProv?.model || 'gemini-3.8-flash') : undefined,
      usedPrebuiltData: incomingProv?.usedPrebuiltData ?? isMockEngine,
      fallbackUsed: incomingProv?.fallbackUsed ?? false,
      evidenceStatus,
      retrievalRequested: true,
      claimSupportVerified: false,
    },
  };
}

class LlmDiagnosticService {
  /**
   * Two-step RAG Diagnostic Synthesis:
   * 1. Pre-computation: Extract 3-4 key clinical terms from ClinicalEvaluationInput.
   * 2. Retrieval: Query NCBI E-utilities via pubmedRetrievalService.fetchRelevantLiterature().
   * 3. Generation: Inject retrieved PubMed abstracts into the LLM prompt and return grounded citations.
   * Never silently substitutes a mock response when live Gemini execution fails.
   */
  public async generateDiagnosticSynthesis(
    input: ClinicalEvaluationInput,
    options?: {
      useMock?: boolean;
      delayMs?: number;
      liveExecutor?: LiveLlmExecutor;
    }
  ): Promise<LlmDiagnosticResponse> {
    // Step 1: Pre-computation — extract 3-4 key clinical terms
    const keywords = extractClinicalKeywords(input);

    // Step 2: Retrieval — fetch live/mocked PubMed literature abstracts
    const literatureContext = await pubmedRetrievalService.fetchRelevantLiterature(keywords);

    // Step 3: Generation — inject retrieved PubMed abstracts into prompt context
    const prompt = buildClinicalDiagnosticPrompt(input, literatureContext);
    const useMock = isUseMockLlmEnabled(options?.useMock);
    const delayMs = options?.delayMs ?? 350;

    if (useMock) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return buildDetailedMockResponse(input, literatureContext);
    }

    const activeExecutor = options?.liveExecutor || registeredLiveExecutor;
    if (activeExecutor) {
      const liveRes = await activeExecutor(prompt, DIAGNOSTIC_SYSTEM_INSTRUCTION);
      const validated = validateLlmDiagnosticResponse(liveRes);
      return ensureReferencesAndCitations(validated, literatureContext);
    }

    const baseUrl =
      typeof window !== 'undefined' ? '' : `http://localhost:${process.env.PORT || 3000}`;
    const fetchFn = typeof window !== 'undefined' ? trackedFetch : fetch;
    const response = await fetchFn(`${baseUrl}/api/clinical/tier1-synthesis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        prompt,
        systemInstruction: DIAGNOSTIC_SYSTEM_INSTRUCTION,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Tier-1 live LLM diagnostic synthesis failed with HTTP ${response.status}. Live AI unreachable.`
      );
    }

    const rawData = await response.json();
    const validated = validateLlmDiagnosticResponse(rawData);
    return ensureReferencesAndCitations(validated, literatureContext);
  }
}

export const llmDiagnosticService = new LlmDiagnosticService();
export const generateDiagnosticSynthesis =
  llmDiagnosticService.generateDiagnosticSynthesis.bind(llmDiagnosticService);
