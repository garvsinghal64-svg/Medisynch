import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { SoapNote, PatientRecord, ClinicalAnalysisResult, EvidenceRetrievalStatus } from '../types/clinical';
import { runHeuristicClinicalAnalysis } from '../utils/clinicalHeuristics';

// Curated high-yield clinical FDA dataset for live pharmacology RAG & fallback
export const FDA_FALLBACKS: Record<string, any> = {
  lisinopril: {
    brandName: 'Prinivil, Zestril',
    genericName: 'Lisinopril',
    boxedWarnings: [
      'WARNING: FETAL TOXICITY - When pregnancy is detected, discontinue Lisinopril as soon as possible. Drugs that act directly on the renin-angiotensin system can cause injury and death to the developing fetus.',
    ],
    indications: 'Lisinopril is indicated for the treatment of hypertension in adult patients and pediatric patients 6 years of age and older, and as an adjunct therapy in systolic heart failure and acute myocardial infarction.',
    contraindications: 'Contraindicated in patients with a history of angioedema related to previous ACE inhibitor treatment and patients with hereditary or idiopathic angioedema. Do not co-administer aliskiren in patients with diabetes.',
    mechanismOfAction: 'Inhibits Angiotensin-Converting Enzyme (ACE), preventing the conversion of angiotensin I to angiotensin II, decreasing systemic vascular resistance and aldosterone secretion.',
    adverseReactions: 'Common adverse reactions (>1%) include persistent dry cough, dizziness, hypotension, hyperkalemia, and elevation in serum creatinine.',
    topAdverseEvents: [
      { term: 'COUGH', count: 48210 },
      { term: 'DIZZINESS', count: 31200 },
      { term: 'HYPOTENSION', count: 24500 },
      { term: 'ANGIOEDEMA', count: 18900 },
      { term: 'HYPERKALAEMIA', count: 16400 },
      { term: 'ACUTE KIDNEY INJURY', count: 14200 },
    ],
  },
  furosemide: {
    brandName: 'Lasix',
    genericName: 'Furosemide',
    boxedWarnings: [
      'WARNING: FLUID AND ELECTROLYTE DEPLETION - Furosemide is a potent diuretic that, if given in excessive amounts, can lead to a profound diuresis with water and electrolyte depletion. Careful medical supervision is required.',
    ],
    indications: 'Indicated in adults and pediatric patients for the treatment of edema associated with congestive heart failure, cirrhosis of the liver, and renal disease, including nephrotic syndrome.',
    contraindications: 'Contraindicated in patients with anuria and in patients with a history of hypersensitivity to furosemide or sulfonamides.',
    mechanismOfAction: 'Inhibits the Na+/K+/2Cl- cotransporter in the thick ascending limb of the loop of Henle, promoting excretion of water, sodium, chloride, potassium, and magnesium.',
    adverseReactions: 'Hypokalemia, hyponatremia, hypomagnesemia, prerenal azotemia, hyperuricemia, ototoxicity with high doses.',
    topAdverseEvents: [
      { term: 'HYPOKALAEMIA', count: 29800 },
      { term: 'DEHYDRATION', count: 22100 },
      { term: 'HYPOTENSION', count: 19500 },
      { term: 'RENAL FAILURE ACUTE', count: 18400 },
      { term: 'HYPONATRAEMIA', count: 15300 },
    ],
  },
  atorvastatin: {
    brandName: 'Lipitor',
    genericName: 'Atorvastatin',
    boxedWarnings: [],
    indications: 'Indicated as an adjunct to diet to reduce elevated total-C, LDL-C, apo B, and TG levels and to increase HDL-C in patients with primary hyperlipidemia and mixed dyslipidemia; cardiovascular risk reduction.',
    contraindications: 'Active liver disease, unexplained persistent elevations of hepatic transaminases. Pregnancy and nursing women.',
    mechanismOfAction: 'Selective, competitive inhibitor of HMG-CoA reductase, the rate-limiting enzyme that converts HMG-CoA to mevalonate in cholesterol biosynthesis.',
    adverseReactions: 'Myalgia, arthralgia, diarrhea, nasopharyngitis, dyspepsia, transaminase elevations, rare rhabdomyolysis.',
    topAdverseEvents: [
      { term: 'MYALGIA', count: 38200 },
      { term: 'ARTHRALGIA', count: 21500 },
      { term: 'FATIGUE', count: 19400 },
      { term: 'RHABDOMYOLYSIS', count: 12100 },
      { term: 'HEPATIC ENZYME INCREASED', count: 9800 },
    ],
  },
  ibuprofen: {
    brandName: 'Motrin, Advil',
    genericName: 'Ibuprofen',
    boxedWarnings: [
      'WARNING: CARDIOVASCULAR AND GASTROINTESTINAL RISK - NSAIDs cause an increased risk of serious cardiovascular thrombotic events, including myocardial infarction and stroke. NSAIDs cause an increased risk of serious gastrointestinal adverse events including bleeding, ulceration, and perforation.',
    ],
    indications: 'Relief of mild to moderate pain, fever reduction, and relief of signs and symptoms of osteoarthritis and rheumatoid arthritis.',
    contraindications: 'Known hypersensitivity, history of asthma, urticaria, or allergic reactions after taking aspirin/NSAIDs. In the setting of CABG surgery.',
    mechanismOfAction: 'Non-steroidal anti-inflammatory drug (NSAID) with analgesic and antipyretic properties via reversible inhibition of COX-1 and COX-2 enzymes.',
    adverseReactions: 'Gastric ulceration, bleeding, acute renal injury, hypertension exacerbation, fluid retention.',
    topAdverseEvents: [
      { term: 'GASTROINTESTINAL HAEMORRHAGE', count: 24200 },
      { term: 'ACUTE KIDNEY INJURY', count: 18100 },
      { term: 'HYPERTENSION', count: 11900 },
    ],
  },
  metformin: {
    brandName: 'Glucophage',
    genericName: 'Metformin',
    boxedWarnings: [
      'WARNING: LACTIC ACIDOSIS - Post-marketing cases of metformin-associated lactic acidosis have resulted in death, hypothermia, hypotension, and resistant bradyarrhythmias. Contraindicated if eGFR < 30 mL/min/1.73m².',
    ],
    indications: 'Adjunct to diet and exercise to improve glycemic control in adults and pediatric patients 10 years of age and older with type 2 diabetes mellitus.',
    contraindications: 'Severe renal impairment (eGFR < 30 mL/min/1.73m²), acute or chronic metabolic acidosis, including diabetic ketoacidosis.',
    mechanismOfAction: 'Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity by increasing peripheral glucose uptake and utilization.',
    adverseReactions: 'Diarrhea, nausea, vomiting, abdominal bloating, flatulence, anorexia, vitamin B12 deficiency.',
    topAdverseEvents: [
      { term: 'LACTIC ACIDOSIS', count: 8900 },
      { term: 'DIARRHOEA', count: 21500 },
      { term: 'NAUSEA', count: 16700 },
    ],
  },
  amoxicillin: {
    brandName: 'Amoxil',
    genericName: 'Amoxicillin',
    boxedWarnings: [],
    indications: 'Treatment of infections due to practical susceptible strains of designated microorganisms in ear, nose, throat, and lower respiratory tract.',
    contraindications: 'History of serious hypersensitivity reaction (e.g., anaphylaxis or Stevens-Johnson syndrome) to amoxicillin or other beta-lactam antibacterials.',
    mechanismOfAction: 'Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs), leading to bacterial cell lysis and death.',
    adverseReactions: 'Diarrhea, rash, nausea, vomiting, hypersensitivity reactions, Clostridioides difficile-associated diarrhea.',
    topAdverseEvents: [
      { term: 'RASH', count: 32100 },
      { term: 'URTICARIA', count: 18400 },
      { term: 'ANAPHYLACTIC REACTION', count: 7200 },
    ],
  },
};

// 1. Fetch RAG Data Helper for Live FDA Data
export async function fetchLiveFdaData(medications: string[] = []): Promise<Array<{
  drug: string;
  genericName: string;
  boxedWarnings: string[];
  contraindications: string;
  adverseReactions: string;
  sourceUrl: string;
  isLive?: boolean;
}>> {
  if (!Array.isArray(medications) || medications.length === 0) {
    return [];
  }

  const results: Array<{
    drug: string;
    genericName: string;
    boxedWarnings: string[];
    contraindications: string;
    adverseReactions: string;
    sourceUrl: string;
    isLive?: boolean;
  }> = [];

  for (const rawMed of medications) {
    if (!rawMed || typeof rawMed !== 'string') continue;
    const drugClean = rawMed.split(/[\s,]+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
    if (!drugClean || drugClean.length < 3) continue;

    if (results.some((r) => r.genericName.toLowerCase() === drugClean)) continue;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);
      const res = await fetch(
        `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugClean)}"&limit=1`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const first = data?.results?.[0];
        if (first) {
          const usedPrebuiltBoxed =
            (!first.boxed_warning || first.boxed_warning.length === 0) &&
            Boolean(FDA_FALLBACKS[drugClean]?.boxedWarnings?.length);
          const boxed =
            first.boxed_warning && first.boxed_warning.length > 0
              ? first.boxed_warning
              : FDA_FALLBACKS[drugClean]?.boxedWarnings || [];
          const contra =
            (first.contraindications?.[0] || '').slice(0, 500) ||
            FDA_FALLBACKS[drugClean]?.contraindications ||
            '';
          const adverse =
            (first.adverse_reactions?.[0] || '').slice(0, 500) ||
            FDA_FALLBACKS[drugClean]?.adverseReactions ||
            '';

          results.push({
            drug: rawMed,
            genericName:
              first.openfda?.generic_name?.[0] ||
              FDA_FALLBACKS[drugClean]?.genericName ||
              drugClean,
            boxedWarnings: boxed,
            contraindications: contra,
            adverseReactions: adverse,
            sourceUrl: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(drugClean)}`,
            isLive: !usedPrebuiltBoxed,
          });
          continue;
        }
      }
    } catch {
      // Proceed to fallback dataset on timeout or network error
    }

    if (FDA_FALLBACKS[drugClean]) {
      const fb = FDA_FALLBACKS[drugClean];
      results.push({
        drug: rawMed,
        genericName: fb.genericName || drugClean,
        boxedWarnings: fb.boxedWarnings || [],
        contraindications: fb.contraindications || '',
        adverseReactions: fb.adverseReactions || '',
        sourceUrl: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(drugClean)}`,
        isLive: false,
      });
    } else {
      results.push({
        drug: rawMed,
        genericName: drugClean,
        boxedWarnings: [],
        contraindications: `Verify baseline renal/hepatic clearance and allergy history for ${drugClean}.`,
        adverseReactions: `Monitor for adverse reactions and drug interactions with ${drugClean}.`,
        sourceUrl: `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(drugClean)}`,
        isLive: false,
      });
    }
  }

  return results;
}

// Strict JSON Schema for Structured Outputs (Zero-Hallucination Structuring)
export const clinicalResponseSchema = {
  type: Type.OBJECT,
  properties: {
    differentials: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          diagnosis: { type: Type.STRING },
          icd10: { type: Type.STRING },
          likelihood: { type: Type.STRING },
          reasoning: { type: Type.STRING },
          recommendedWorkup: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          guidelineName: { type: Type.STRING },
          evidenceLevel: { type: Type.STRING },
          guidelineSummary: { type: Type.STRING },
          sourceUrl: { type: Type.STRING },
          pmid: { type: Type.STRING },
        },
        required: ['diagnosis', 'icd10', 'likelihood', 'reasoning', 'recommendedWorkup'],
      },
    },
    safetyAlerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          severity: { type: Type.STRING },
          substances: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          guidelineSource: { type: Type.STRING },
          clinicalMechanism: { type: Type.STRING },
          sourceUrl: { type: Type.STRING },
        },
        required: ['type', 'severity', 'substances', 'title', 'description', 'recommendation'],
      },
    },
    icd10Suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          code: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ['code', 'description', 'category', 'rationale'],
      },
    },
    patientSummary: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        plainLanguageOverview: { type: Type.STRING },
        keyInstructions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        medicationSchedule: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              instructions: { type: Type.STRING },
              purpose: { type: Type.STRING },
            },
            required: ['name', 'instructions', 'purpose'],
          },
        },
        redFlagSymptoms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        followUp: { type: Type.STRING },
      },
      required: ['headline', 'plainLanguageOverview', 'keyInstructions', 'medicationSchedule', 'redFlagSymptoms', 'followUp'],
    },
    clinicalMissingInfoAlerts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    missingHistoryQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          domain: { type: Type.STRING },
          question: { type: Type.STRING },
          rationale: { type: Type.STRING },
          suggestedInsert: { type: Type.STRING },
        },
        required: ['id', 'domain', 'question', 'rationale', 'suggestedInsert'],
      },
    },
    missingExamFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          organSystem: { type: Type.STRING },
          maneuver: { type: Type.STRING },
          clinicalSignificance: { type: Type.STRING },
          normalExpectation: { type: Type.STRING },
          abnormalIndication: { type: Type.STRING },
          suggestedInsert: { type: Type.STRING },
        },
        required: ['id', 'organSystem', 'maneuver', 'clinicalSignificance', 'normalExpectation', 'abnormalIndication', 'suggestedInsert'],
      },
    },
  },
  required: ['differentials', 'safetyAlerts', 'icd10Suggestions', 'patientSummary', 'clinicalMissingInfoAlerts'],
};

export type ClinicalFetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

let customClinicalFetchImpl: ClinicalFetchLike | null = null;

export function setClinicalServiceFetchImplementation(fn: ClinicalFetchLike | null): void {
  customClinicalFetchImpl = fn;
}

function getActiveClinicalFetch(): ClinicalFetchLike {
  if (customClinicalFetchImpl) return customClinicalFetchImpl;
  return globalThis.fetch.bind(globalThis);
}

// 2. Fetch Live PubMed Biomedical Citations Helper
export async function fetchLivePubMedData(query: string): Promise<Array<{
  pmid: string;
  title: string;
  sourceUrl: string;
  citation: string;
  isLive?: boolean;
  isCuratedFallback?: boolean;
}>> {
  if (!query || typeof query !== 'string') return [];
  const cleanQuery = query.replace(/[^\w\s]/g, ' ').trim();
  if (!cleanQuery) return [];

  const lower = cleanQuery.toLowerCase();
  const fetchFn = getActiveClinicalFetch();

  // Extract targeted medical query keyword for NCBI E-Utilities
  let targetedTerm = cleanQuery;
  if (lower.includes('heart failure') || lower.includes('chf')) {
    targetedTerm = 'heart failure';
  } else if (lower.includes('shortness of breath') || lower.includes('dyspnea') || lower.includes('orthopnea')) {
    targetedTerm = 'shortness of breath';
  } else if (lower.includes('chest pain') || lower.includes('angina') || lower.includes('acs')) {
    targetedTerm = 'chest pain';
  } else if (lower.includes('pneumonia') || lower.includes('cough') || lower.includes('fever')) {
    targetedTerm = 'pneumonia';
  } else if (lower.includes('hypertension') || lower.includes('blood pressure') || lower.includes('bp')) {
    targetedTerm = 'hypertension';
  } else if (lower.includes('diabetes') || lower.includes('glucose')) {
    targetedTerm = 'type 2 diabetes';
  } else {
    const firstClause = query.split(/[,;.]/)[0].trim();
    const words = firstClause.split(/\s+/).slice(0, 3).join(' ');
    targetedTerm = words || cleanQuery;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2400);
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      targetedTerm + ' clinical guidelines'
    )}&sort=pub_date&retmode=json&retmax=4&tool=CuradocAI&email=clinical_ai@app.com`;
    const res = await fetchFn(searchUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const idList: string[] = (data?.esearchresult?.idlist || []).filter((id: any) => /^\d+$/.test(String(id)));
      if (idList.length > 0) {
        // Query esummary to parse real titles before presenting as sources
        try {
          const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
            ','
          )}&retmode=json`;
          const summaryRes = await fetchFn(summaryUrl);
          if (summaryRes.ok) {
            const summaryData = await summaryRes.json();
            const resultObj = summaryData?.result || {};
            const liveRecords: Array<{
              pmid: string;
              title: string;
              sourceUrl: string;
              citation: string;
              isLive: boolean;
            }> = [];

            for (const pmid of idList) {
              const item = resultObj[pmid];
              const parsedTitle = item?.title ? String(item.title).replace(/<[^>]+>/g, '').trim() : '';
              const parsedJournal = item?.fulljournalname || item?.source || 'PubMed';
              if (parsedTitle) {
                liveRecords.push({
                  pmid,
                  title: parsedTitle,
                  sourceUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
                  citation: `[${parsedJournal}; PMID: ${pmid}]`,
                  isLive: true,
                });
              }
            }

            if (liveRecords.length > 0) {
              return liveRecords;
            }
          }
        } catch {
          // If summary fails, do not fabricate generic titles from PMIDs alone
        }
      }
    }
  } catch (err) {
    console.warn('[Clinical AI] PubMed live search query timed out or failed:', err);
  }

  // Curated peer-reviewed guideline PMIDs for specific matching clinical domains ONLY
  // (Flagged with isLive: false and isCuratedFallback: true)
  if (
    lower.includes('heart') ||
    lower.includes('failure') ||
    lower.includes('chf') ||
    lower.includes('shortness of breath') ||
    lower.includes('dyspnea') ||
    lower.includes('orthopnea') ||
    lower.includes('edema')
  ) {
    return [
      { pmid: '35363516', title: '2022 AHA/ACC/HFSA Guideline for the Management of Heart Failure', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/35363516/', citation: '[Circulation (2022); PMID: 35363516]', isLive: false, isCuratedFallback: true },
      { pmid: '34449189', title: 'Empagliflozin in Heart Failure (EMPEROR-Preserved)', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/34449189/', citation: '[NEJM (2021); PMID: 34449189]', isLive: false, isCuratedFallback: true },
    ];
  } else if (lower.includes('chest pain') || lower.includes('acs') || lower.includes('angina') || lower.includes('stemi')) {
    return [
      { pmid: '34715651', title: '2021 AHA/ACC/ASE/CHEST/SAEM Guideline for the Evaluation of Chest Pain', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/34715651/', citation: '[Circulation (2021); PMID: 34715651]', isLive: false, isCuratedFallback: true },
    ];
  } else if (lower.includes('pneumonia') || lower.includes('fever') || lower.includes('cough') || lower.includes('respiratory')) {
    return [
      { pmid: '31573350', title: 'Diagnosis and Treatment of Adults with Community-acquired Pneumonia (ATS/IDSA)', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/31573350/', citation: '[Am J Respir Crit Care Med (2019); PMID: 31573350]', isLive: false, isCuratedFallback: true },
    ];
  } else if (lower.includes('hypertension') || lower.includes('bp') || lower.includes('blood pressure')) {
    return [
      { pmid: '29189288', title: '2017 ACC/AHA Guideline for High Blood Pressure in Adults', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/29189288/', citation: '[J Am Coll Cardiol (2018); PMID: 29189288]', isLive: false, isCuratedFallback: true },
    ];
  } else if (lower.includes('diabetes') || lower.includes('glucose') || lower.includes('metformin')) {
    return [
      { pmid: '38085127', title: 'Standards of Care in Diabetes—2024 (American Diabetes Association)', sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/38085127/', citation: '[Diabetes Care (2024); PMID: 38085127]', isLive: false, isCuratedFallback: true },
    ];
  }

  // Never return an unrelated heart-failure guideline for unmatched queries
  return [];
}

/**
 * Decouples Evidence Status from Generation Status:
 * 'live-success' strictly means actual, live PubMed/FDA evidence was retrieved and validated (isLive === true).
 */
export function determineEvidenceStatus(
  liveFdaData: Array<{ isLive?: boolean; isCuratedFallback?: boolean }>,
  livePubMedData: Array<{ isLive?: boolean; isCuratedFallback?: boolean }>,
  requestedMedsCount: number = 0
): 'live-success' | 'live-partial' | 'unavailable' | 'curated-fallback' | 'no-results' {
  const hasLivePubMed = livePubMedData.some((p) => p.isLive === true);
  const allLivePubMed = livePubMedData.length > 0 && livePubMedData.every((p) => p.isLive === true);

  const medsRequested = requestedMedsCount > 0;
  const hasLiveFda = liveFdaData.some((d) => d.isLive === true);
  const allLiveFda = !medsRequested || (liveFdaData.length > 0 && liveFdaData.every((d) => d.isLive === true));

  if (allLivePubMed && allLiveFda) {
    return 'live-success';
  }

  if (hasLivePubMed || hasLiveFda) {
    return 'live-partial';
  }

  const hasCuratedFallback =
    livePubMedData.some((p) => p.isCuratedFallback === true) ||
    liveFdaData.some((d) => d.isCuratedFallback === true);

  if (hasCuratedFallback) {
    return 'curated-fallback';
  }

  return 'unavailable';
}

/**
 * Resolves ResultProvenance enforcing:
 * 1. Strict Fallback Priority: if fallbackUsed === true, engine is 'heuristic'.
 * 2. Hybrid Engine State: if Gemini succeeded AND pre-built data/rules were blended, engine is 'hybrid'.
 * 3. Decoupled Evidence Status: evidence origin and engine origin are separate dimensions.
 * 4. Model name is only attached when engine is 'gemini' or 'hybrid' and model is known.
 */
export function resolveClinicalProvenance(params: {
  geminiSucceeded: boolean;
  engine?: 'gemini' | 'heuristic' | 'hybrid' | 'mock' | 'unknown';
  model?: string;
  usedPrebuiltData: boolean;
  fallbackUsed: boolean;
  evidenceStatus: EvidenceRetrievalStatus;
  retrievalRequested?: boolean;
}): ClinicalAnalysisResult['provenance'] {
  if (params.engine === 'mock') {
    return {
      engine: 'mock',
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: params.evidenceStatus,
      retrievalRequested: params.retrievalRequested ?? true,
      claimSupportVerified: false,
    };
  }

  if (params.fallbackUsed || !params.geminiSucceeded || params.engine === 'heuristic') {
    return {
      engine: 'heuristic',
      usedPrebuiltData: params.usedPrebuiltData,
      fallbackUsed: true,
      evidenceStatus: params.evidenceStatus,
      retrievalRequested: params.retrievalRequested ?? true,
      claimSupportVerified: false,
    };
  }

  if (params.usedPrebuiltData || params.engine === 'hybrid') {
    return {
      engine: 'hybrid',
      model: params.model || 'gemini-3-flash-preview',
      usedPrebuiltData: true,
      fallbackUsed: false,
      evidenceStatus: params.evidenceStatus,
      retrievalRequested: params.retrievalRequested ?? true,
      claimSupportVerified: false,
    };
  }

  return {
    engine: 'gemini',
    model: params.model || 'gemini-3-flash-preview',
    usedPrebuiltData: false,
    fallbackUsed: false,
    evidenceStatus: params.evidenceStatus,
    retrievalRequested: params.retrievalRequested ?? true,
    claimSupportVerified: false,
  };
}

// 3. Helper to Enrich Differential & Safety Cards with verified PubMed & FDA URLs
// Never attaches citations to claims solely by array index or mere availability.
// Decouples "source retrieved" from "claim support verified".
// Clearly marks pediatric evidence limitations when evaluating adult patients.
export function enrichWithLiveRAGData(
  result: ClinicalAnalysisResult,
  liveFdaData: Array<{ drug: string; genericName: string; sourceUrl: string }>,
  livePubMedData: Array<{ pmid: string; sourceUrl: string; title?: string }>,
  patient?: PatientRecord
): void {
  if (!result) return;

  const isAdultPatient = patient
    ? patient.age >= 18 || (patient.age === 0 && !patient.chiefComplaint?.toLowerCase().includes('pediatric'))
    : true;

  // Only attach PubMed citation to a differential if that differential already specified
  // a matching pmid or the article title explicitly mentions the differential diagnosis
  if (Array.isArray(result.differentials)) {
    result.differentials.forEach((diff) => {
      if (diff.claimSupportVerified === undefined) {
        diff.claimSupportVerified = false;
      }

      if (diff.pmid) {
        const matchingArticle = livePubMedData.find((p) => p.pmid === diff.pmid);
        if (matchingArticle) {
          diff.sourceUrl = matchingArticle.sourceUrl;
          const lowerTitle = (matchingArticle.title || '').toLowerCase();
          const isPediatricStudy = /\b(pediatric|pediatrics|children|childhood|infant|infants|neonatal|neonate|adolescent)\b/i.test(lowerTitle);
          if (isAdultPatient && isPediatricStudy) {
            diff.evidenceLimitation = 'Pediatric study population; findings may not directly generalize to adult patients.';
            diff.claimSupportVerified = false;
          }
        }
      } else if (diff.diagnosis && livePubMedData.length > 0) {
        const lowerDiag = diff.diagnosis.toLowerCase();
        const matchingArticle = livePubMedData.find((p) => {
          const lowerTitle = (p.title || '').toLowerCase();
          const isPediatricStudy = /\b(pediatric|pediatrics|children|childhood|infant|infants|neonatal|neonate|adolescent)\b/i.test(lowerTitle);
          const isPediatricDiagnosis = /\b(pediatric|pediatrics|croup|otitis|bronchiolitis|kawasaki)\b/i.test(lowerDiag);

          // If patient is adult and study is pediatric while diagnosis is not pediatric, do not attach as direct evidence
          if (isAdultPatient && isPediatricStudy && !isPediatricDiagnosis) {
            return false;
          }

          if (lowerDiag.length > 4 && lowerTitle.includes(lowerDiag)) return true;
          // Check matching clinical concepts (e.g. Heart Failure and AHA/ACC/HFSA)
          if (
            (lowerDiag.includes('heart failure') || lowerDiag.includes('cardiac failure')) &&
            (lowerTitle.includes('heart failure') || lowerTitle.includes('hfsa'))
          ) {
            return true;
          }
          const coreConcepts = lowerDiag.split(/[,/]+/).map((s) => s.trim()).filter((s) => s.length > 4);
          for (const concept of coreConcepts) {
            if (lowerTitle.includes(concept)) return true;
          }
          return false;
        });

        if (matchingArticle) {
          diff.pmid = matchingArticle.pmid;
          diff.sourceUrl = matchingArticle.sourceUrl;
          const lowerTitle = (matchingArticle.title || '').toLowerCase();
          const isPediatricStudy = /\b(pediatric|pediatrics|children|childhood|infant|infants|neonatal|neonate|adolescent)\b/i.test(lowerTitle);
          if (isAdultPatient && isPediatricStudy) {
            diff.evidenceLimitation = 'Pediatric study population; findings may not directly generalize to adult patients.';
            diff.claimSupportVerified = false;
          } else {
            // Decouple source retrieved from claim support verified:
            // RAG/Title match retrieves the source, but claim support requires explicit verified clinical guideline match
            const isGroundedClinicalGuideline =
              matchingArticle.pmid === '35363516' || // AHA/ACC Heart Failure Guideline
              matchingArticle.pmid === '34715651' || // AHA/ACC Chest Pain Guideline
              matchingArticle.pmid === '31573350' || // ATS/IDSA CAP Adult Guideline
              matchingArticle.pmid === '29189288' || // ACC/AHA High Blood Pressure in Adults
              matchingArticle.pmid === '38085127';   // ADA Standards of Care
            diff.claimSupportVerified = isGroundedClinicalGuideline;
          }
        }
      }
    });
  }

  // Enrich safety alerts with FDA label URLs ONLY when drug/genericName matches alert substances
  if (Array.isArray(result.safetyAlerts)) {
    result.safetyAlerts.forEach((alert) => {
      if (alert.claimSupportVerified === undefined) {
        alert.claimSupportVerified = false;
      }
      if (!alert.sourceUrl && liveFdaData.length > 0 && Array.isArray(alert.substances)) {
        const matchingFda = liveFdaData.find((f) =>
          alert.substances.some((s) => s.toLowerCase().includes(f.genericName.toLowerCase()) || f.genericName.toLowerCase().includes(s.toLowerCase()))
        );
        if (matchingFda) {
          alert.sourceUrl = matchingFda.sourceUrl;
          alert.claimSupportVerified = true;
        }
      }
    });
  }
}

export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const str =
    (typeof err === 'object' ? JSON.stringify(err) : String(err)) +
    ' ' +
    String(err?.message || '') +
    ' ' +
    String(err?.status || '');
  return (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('quota') ||
    str.includes('rate-limit') ||
    str.includes('rate limit') ||
    str.includes('503') ||
    str.includes('UNAVAILABLE') ||
    str.includes('overloaded')
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    if (typeof timer?.unref === 'function') timer.unref();
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executes the Decoupled Two-Step Live Evidence & Structuring Pipeline
 * Step 1: Live Evidence Gathering (Search & RAG) without response_schema
 * Step 2: Zero-Hallucination Structuring with responseSchema and search tools disabled
 */
export async function executeTwoStepClinicalAnalysis(
  note: SoapNote,
  patient: PatientRecord | undefined,
  ai: GoogleGenAI,
  onCooldown?: (reason: string, seconds?: number) => void
): Promise<ClinicalAnalysisResult> {
  // Step 1: The Live Evidence Gathering (Search & RAG)
  const complaint = patient?.chiefComplaint || note.assessment || 'clinical encounter';
  const requestedMeds = note.medications || [];
  const [liveFdaData, livePubMedData] = await Promise.all([
    fetchLiveFdaData(requestedMeds),
    fetchLivePubMedData(complaint),
  ]);

  const evidenceStatus = determineEvidenceStatus(
    liveFdaData,
    livePubMedData,
    requestedMeds.length
  );
  const usedPrebuiltEvidence =
    liveFdaData.some((d) => d.isLive !== true) ||
    livePubMedData.some((p) => p.isLive !== true);

  // 2. Prepare Grounding Context from Live PubMed & Clinical Guidelines
  let liveWebData = livePubMedData
    .map((p) => `${p.title} (PMID: ${p.pmid}, URL: ${p.sourceUrl})`)
    .join('\n');
  if (!liveWebData) {
    liveWebData = `Clinical Practice Guidelines and evidence-based standards for ${complaint}.`;
  }

  const formatVitalsForPrompt = (v: PatientRecord['vitals'] | undefined) => {
    if (!v) return 'No vitals recorded (All MISSING)';
    const parts: string[] = [];
    if (v.bloodPressure && v.bloodPressure.trim()) parts.push(`BP: ${v.bloodPressure} (measured)`);
    else parts.push('BP: Undocumented (MISSING)');
    if (v.heartRate > 0) parts.push(`HR: ${v.heartRate} bpm (measured)`);
    else parts.push('HR: Undocumented (MISSING)');
    if (v.respiratoryRate > 0) parts.push(`RR: ${v.respiratoryRate}/min (measured)`);
    else parts.push('RR: Undocumented (MISSING)');
    if (v.temperature && v.temperature.trim()) parts.push(`Temp: ${v.temperature} (measured)`);
    else parts.push('Temp: Undocumented (MISSING)');
    if (v.spO2 > 0) parts.push(`SpO2: ${v.spO2}% (measured)`);
    else parts.push('SpO2: Undocumented / Not measured (MISSING — Do NOT infer or assume normal SpO2)');
    if (v.weightKg > 0) parts.push(`Weight: ${v.weightKg} kg (measured)`);
    return parts.join(' | ');
  };

  // Step 2: Zero-Hallucination Structuring
  const structuringPrompt = `
  You are an evidence-based clinical decision support AI. Synthesize a comprehensive diagnostic assessment for the patient encounter.
  Ground differentials and safety considerations in verified clinical practice guidelines.
  
  CLINICAL DATA INTEGRITY:
  - Treat documented vitals as the single source of truth.
  - Never infer that SpO2 is normal when it is Undocumented / MISSING.
  - Keep missing, measured, calculated, and AI-inferred data explicitly distinct.
  - Do not equate SIRS positivity with sepsis. Require clinical assessment and appropriate evidence of infection-associated organ dysfunction before suggesting sepsis-specific management.
  - Do not present pediatric studies as direct evidence for an adult patient without stating the limitation.
  
  LIVE CONTEXT:
  FDA Pharmacology Data: ${JSON.stringify(liveFdaData)}
  PubMed Citations & Guidelines: ${JSON.stringify(livePubMedData)}
  Web Guidelines: ${liveWebData}
  
  PATIENT ENCOUNTER:
  Chief Complaint: ${complaint}
  Vitals: ${formatVitalsForPrompt(patient?.vitals)}
  Notes: ${JSON.stringify(note)}
`;

  const defaultPatient = patient || {
    id: 'pt-default',
    name: 'Patient',
    age: 0,
    gender: 'Unknown',
    mrn: 'MRN-000000',
    encounterDate: new Date().toISOString().split('T')[0],
    chiefComplaint: complaint,
    vitals: { bloodPressure: '', heartRate: 0, respiratoryRate: 0, temperature: '', spO2: 0, weightKg: 0, heightCm: 0 },
  };

  // 4. Generate the Final JSON (No Search Tools here)
  const structuringModels = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite'];
  let lastStructuringErr: any = null;

  for (const candidateModel of structuringModels) {
    try {
      const structuringCall = ai.models.generateContent({
        model: candidateModel,
        contents: structuringPrompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          responseMimeType: 'application/json',
          responseSchema: clinicalResponseSchema,
        },
      });

      const finalResponse = await withTimeout(structuringCall, 25000, 'Structuring step');

      if (finalResponse && finalResponse.text) {
        const parsed = JSON.parse(finalResponse.text) as ClinicalAnalysisResult;
        const validatedFda = liveFdaData.filter((d) => d.isLive === true);
        const validatedPubMed = livePubMedData.filter((p) => p.isLive === true);
        enrichWithLiveRAGData(parsed, validatedFda, validatedPubMed, patient || defaultPatient);

        // Blend deterministic heuristic safety alerts if any critical local safety rules triggered
        const heuristicCheck = runHeuristicClinicalAnalysis(note, defaultPatient);
        let blendedHeuristicRules = false;
        if (Array.isArray(heuristicCheck.safetyAlerts) && heuristicCheck.safetyAlerts.length > 0) {
          parsed.safetyAlerts = Array.isArray(parsed.safetyAlerts) ? parsed.safetyAlerts : [];
          for (const hAlert of heuristicCheck.safetyAlerts) {
            const alreadyExists = parsed.safetyAlerts.some(
              (a) => a.title.toLowerCase() === hAlert.title.toLowerCase()
            );
            if (!alreadyExists) {
              parsed.safetyAlerts.push(hAlert);
              blendedHeuristicRules = true;
            }
          }
        }

        const usedPrebuiltData = usedPrebuiltEvidence || blendedHeuristicRules;
        parsed.isFallback = false;
        parsed.provenance = resolveClinicalProvenance({
          geminiSucceeded: true,
          model: candidateModel,
          usedPrebuiltData,
          fallbackUsed: false,
          evidenceStatus,
        });
        return parsed;
      }
    } catch (structuringErr: any) {
      lastStructuringErr = structuringErr;
      continue;
    }
  }

  if (lastStructuringErr && isQuotaOrRateLimitError(lastStructuringErr)) {
    onCooldown?.('Gemini API rate limit or quota exceeded', 180);
  }

  // Fallback to high-yield clinical decision engine
  const synthesized = runHeuristicClinicalAnalysis(note, defaultPatient);

  const validatedFda = liveFdaData.filter((d) => d.isLive === true);
  const validatedPubMed = livePubMedData.filter((p) => p.isLive === true);
  enrichWithLiveRAGData(synthesized, validatedFda, validatedPubMed, patient || defaultPatient);

  const hasLiveDbData = validatedFda.length > 0 || validatedPubMed.length > 0;
  synthesized.isFallback = !hasLiveDbData;
  if (!hasLiveDbData) {
    synthesized.errorType = 'LIVE_RAG_UNREACHABLE';
  }
  synthesized.provenance = resolveClinicalProvenance({
    geminiSucceeded: false,
    usedPrebuiltData: true,
    fallbackUsed: true,
    evidenceStatus,
  });

  return synthesized;
}
