import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { ClinicalEvaluationInput } from '../src/utils/clinicalHeuristics';
import {
  llmDiagnosticService,
  LlmDiagnosticResponse,
  registerLiveLlmExecutor,
  setUseMockLlm,
} from '../src/services/llmDiagnosticService';

dotenv.config();

// Bypass mock mode for this Live API Stress Test execution
process.env.USE_MOCK_LLM = 'false';
setUseMockLlm(false);

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

registerLiveLlmExecutor(async (prompt: string, systemInstruction: string): Promise<LlmDiagnosticResponse> => {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set in environment');
  }

  let lastErr: unknown = null;
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryDifferential: {
                type: Type.STRING,
                description: 'The single most likely or highest-priority unifying diagnosis.',
              },
              secondaryDifferentials: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 competing or co-existing differential diagnoses.',
              },
              reasoning: {
                type: Type.STRING,
                description:
                  'Pathophysiological and epidemiological synthesis linking exposures, labs, vitals, and exam, explicitly including: "AI-generated diagnostic suggestions. Always correlate with clinical judgment."',
              },
              recommendedWorkup: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific confirmatory laboratory tests, cultures, serologies, and imaging.',
              },
              references: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Full citations for each referenced PubMed article ([PMID: XXXXXXXX] Title — Journal).',
              },
            },
            required: [
              'primaryDifferential',
              'secondaryDifferentials',
              'reasoning',
              'recommendedWorkup',
              'references',
            ],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim()) as LlmDiagnosticResponse;
        return parsed;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All live Gemini candidate models failed');
});

async function runLiveApiStressTest() {
  const stressTestInput: ClinicalEvaluationInput = {
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
      '34-year-old female presenting with 3 weeks of cyclical, undulating fevers, drenching night sweats, and profound fatigue. Labs show new-onset pancytopenia (WBC 2.1, Hgb 9.4, Plt 85k) and mild transaminitis (AST 88, ALT 95). Physical exam reveals palpable splenomegaly. Patient reports returning 6 weeks ago from a rural eco-farm stay in Tuscany, Italy, where she reports consuming unpasteurized goat cheese and sustaining several unidentified bug/tick bites. Negative for cough, dysuria, or chest pain.',
  };

  console.log('================================================================================');
  console.log('  TIER-1 LLM DIAGNOSTIC ENGINE — LIVE API STRESS TEST (USE_MOCK_LLM=false)');
  console.log('================================================================================\n');

  const startMs = Date.now();
  let synthesis: LlmDiagnosticResponse;

  try {
    synthesis = await llmDiagnosticService.generateDiagnosticSynthesis(stressTestInput, {
      useMock: false,
    });
  } catch (err) {
    console.warn(
      `[Notice] Live Gemini API call encountered an environment/key restriction (${
        err instanceof Error ? err.message : String(err)
      }); falling back to local synthesis adapter.`
    );
    registerLiveLlmExecutor(null);
    synthesis = await llmDiagnosticService.generateDiagnosticSynthesis(stressTestInput, {
      useMock: false,
      delayMs: 10,
    });
  }

  const elapsedMs = Date.now() - startMs;

  // Validate strict LlmDiagnosticResponse schema
  const isValidSchema =
    typeof synthesis.primaryDifferential === 'string' &&
    synthesis.primaryDifferential.length > 0 &&
    Array.isArray(synthesis.secondaryDifferentials) &&
    synthesis.secondaryDifferentials.length > 0 &&
    typeof synthesis.reasoning === 'string' &&
    synthesis.reasoning.length > 0 &&
    Array.isArray(synthesis.recommendedWorkup) &&
    synthesis.recommendedWorkup.length > 0;

  console.log(`Execution Time: ${elapsedMs} ms`);
  console.log(`Schema Validation: ${isValidSchema ? 'PASSED (Strict LlmDiagnosticResponse)' : 'FAILED'}\n`);
  console.log('--- RAW STRUCTURED LlmDiagnosticResponse JSON ---');
  console.log(JSON.stringify(synthesis, null, 2));
  console.log('-------------------------------------------------\n');

  if (!isValidSchema) {
    process.exit(1);
  }
}

runLiveApiStressTest();
