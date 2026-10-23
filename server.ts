import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  runHeuristicClinicalAnalysis,
  runHeuristicAttachmentAnalysis,
  extractAmbientMedicationsFromTranscript,
} from './src/utils/clinicalHeuristics';
import { clinicalDb } from './src/db/databaseService';
import {
  FDA_FALLBACKS,
  executeTwoStepClinicalAnalysis,
  fetchLiveFdaData,
  fetchLivePubMedData,
  determineEvidenceStatus,
  resolveClinicalProvenance,
  enrichWithLiveRAGData,
  clinicalResponseSchema,
  isQuotaOrRateLimitError,
} from './src/services/clinicalAnalysisService';

export {
  FDA_FALLBACKS,
  fetchLiveFdaData,
  fetchLivePubMedData,
  determineEvidenceStatus,
  resolveClinicalProvenance,
  enrichWithLiveRAGData,
  clinicalResponseSchema,
  isQuotaOrRateLimitError,
};

dotenv.config();

export const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable reverse proxy trust in Cloud Run / containerized environments
app.set('trust proxy', true);

// Request logging middleware for debugging API routing vs proxy interception
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.originalUrl || req.url;

  if (path.startsWith('/api')) {
    console.log(`[Express Incoming] ${req.method} ${path}`);
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[Express Completed] ${req.method} ${path} -> ${res.statusCode} (${duration}ms)`);
    });
  }
  next();
});

// CORS and Preflight handling for iframe / preview reverse proxy environments
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

export type ServerFetchLike = (input: any, init?: any) => Promise<globalThis.Response>;
let customServerFetchImpl: ServerFetchLike | null = null;

export function setServerFetchImplementation(fn: ServerFetchLike | null): void {
  customServerFetchImpl = fn;
}

export function getServerFetch(): ServerFetchLike {
  if (customServerFetchImpl) return customServerFetchImpl;
  return globalThis.fetch.bind(globalThis);
}

// Initialize GoogleGenAI server-side with telemetry header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Circuit breaker and cooldown tracking for Gemini API
let geminiCooldownUntil = 0;

export function isGeminiAvailable(): boolean {
  if (!apiKey) return false;
  if (Date.now() < geminiCooldownUntil) return false;
  return true;
}

export function triggerGeminiCooldown(reason: string, seconds: number = 15): void {
  geminiCooldownUntil = Date.now() + seconds * 1000;
  console.log(`[Clinical AI System] Active clinical decision rules engine (${reason}). Fast response active.`);
}

// Priority list of Gemini models to attempt (prioritize active quota model)
const CANDIDATE_MODELS = ['gemini-3-flash-preview', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

export async function generateWithModelFallbackWithModel(params: {
  contents: any;
  config?: any;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  if (!isGeminiAvailable()) {
    throw new Error('Clinical engine fallback active');
  }

  const timeoutMs = params.timeoutMs || 20000;
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for ${model}`));
        }, timeoutMs);
        if (typeof timer.unref === 'function') timer.unref();
      });

      const supportsMinimalThinking = model.startsWith('gemini-3');
      const modelConfig = supportsMinimalThinking
        ? {
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            ...params.config,
          }
        : params.config;

      const response = await Promise.race([
        ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: modelConfig,
        }),
        timeoutPromise,
      ]);

      if (response && response.text) {
        return { text: response.text, model };
      }
    } catch (err: any) {
      lastError = err;
      // Continue to next candidate model
      continue;
    }
  }

  // Only trigger global cooldown if rate-limited or quota-exhausted
  if (isQuotaOrRateLimitError(lastError)) {
    triggerGeminiCooldown('Gemini API rate limit or quota exceeded', 15);
  }
  throw lastError || new Error('All candidate models exhausted');
}

async function generateWithModelFallback(params: {
  contents: any;
  config?: any;
  timeoutMs?: number;
}): Promise<string> {
  const result = await generateWithModelFallbackWithModel(params);
  return result.text;
}

// Helper for safe JSON parsing from Gemini output
function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// 1. Full Clinical Analysis Endpoint (Decoupled Two-Step Grounding & Structuring Pipeline)
app.post('/api/clinical/analyze', async (req: Request, res: Response): Promise<void> => {
  const { note, patient } = req.body;

  if (!note) {
    res.status(400).json({ error: 'Missing clinical note data.' });
    return;
  }

  // Attempt live Gemini decoupled pipeline if available
  if (isGeminiAvailable()) {
    try {
      const parsedData = await executeTwoStepClinicalAnalysis(note, patient, ai, triggerGeminiCooldown);
      const prov = parsedData.provenance;
      const geminiSucceeded =
        !prov?.fallbackUsed && (prov?.engine === 'gemini' || prov?.engine === 'hybrid');
      res.json({
        ...parsedData,
        provenance: resolveClinicalProvenance({
          geminiSucceeded,
          model: prov?.model || 'gemini-3.1-flash-lite',
          usedPrebuiltData: Boolean(prov?.usedPrebuiltData),
          fallbackUsed: Boolean(prov?.fallbackUsed),
          evidenceStatus: prov?.evidenceStatus || 'unavailable',
        }),
      });
      return;
    } catch (err: any) {
      if (isQuotaOrRateLimitError(err)) {
        triggerGeminiCooldown('quota limit reached', 15);
      }
      console.log('[Clinical AI] Analysis served via Clinical Decision Rules Engine (fallback active).');
    }
  }

  // Direct Live Evidence Gathering (Search & RAG) from openFDA & PubMed databases
  const complaint = patient?.chiefComplaint || note.assessment || 'clinical encounter';
  const requestedMeds = note.medications || [];
  const [liveFdaData, livePubMedData] = await Promise.all([
    fetchLiveFdaData(requestedMeds).catch(() => []),
    fetchLivePubMedData(complaint).catch(() => []),
  ]);

  const evidenceStatus = determineEvidenceStatus(
    liveFdaData,
    livePubMedData,
    requestedMeds.length
  );

  // High-yield Clinical Decision Support Rules Engine
  const fallbackResult = runHeuristicClinicalAnalysis(note, patient || {
    id: 'pt-default',
    name: 'Patient',
    age: 0,
    gender: 'Unknown',
    mrn: 'MRN-000000',
    encounterDate: new Date().toISOString().split('T')[0],
    chiefComplaint: complaint,
    vitals: { bloodPressure: '', heartRate: 0, respiratoryRate: 0, temperature: '', spO2: 0, weightKg: 0, heightCm: 0 },
  });

  // Enrich diagnostic differentials and safety alerts only with validated live PubMed and FDA citations
  const validatedFda = liveFdaData.filter((d) => d.isLive === true);
  const validatedPubMed = livePubMedData.filter((p) => p.isLive === true);
  enrichWithLiveRAGData(fallbackResult, validatedFda, validatedPubMed, patient);

  const hasLiveDbData = validatedFda.length > 0 || validatedPubMed.length > 0;
  res.json({
    ...fallbackResult,
    isQuotaExceeded: false,
    isFallback: !hasLiveDbData,
    ...(hasLiveDbData ? {} : { errorType: 'LIVE_RAG_UNREACHABLE' }),
    provenance: resolveClinicalProvenance({
      geminiSucceeded: false,
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus,
    }),
  });
});

// 2. SOAP Note Structuring Endpoint (with fallback)
app.post('/api/clinical/soap', async (req: Request, res: Response): Promise<void> => {
  const { rawText, patient } = req.body;

  if (!rawText || !rawText.trim()) {
    res.status(400).json({ error: 'Raw text or transcript is required.' });
    return;
  }

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are an expert clinical scribe. Take the following unorganized doctor's notes, patient history, or consultation dictation and format it into a standardized, high-yield SOAP note.

PATIENT CONTEXT:
${patient ? `Age: ${patient.age}, Gender: ${patient.gender}, Chief Complaint: ${patient.chiefComplaint}` : 'Standard adult encounter'}

RAW NOTES / DICTATION:
${rawText}

Extract and structure into standard medical prose. Also extract any mentioned medications and allergies into clean arrays.
Return strictly valid JSON with this format:
{
  "subjective": "string",
  "objective": "string",
  "assessment": "string",
  "plan": "string",
  "medications": ["string"],
  "allergies": ["string"]
}`;

      const textOutput = await generateWithModelFallback({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsedData = extractJsonFromText(textOutput);
      res.json(parsedData);
      return;
    } catch {
      console.log('[Clinical AI] SOAP structuring served via Clinical Rules Engine.');
    }
  }

  // Heuristic structuring fallback
  const lines = rawText.split('\n');
  const subjectiveLines: string[] = [];
  const objectiveLines: string[] = [];
  const assessmentLines: string[] = [];
  const planLines: string[] = [];
  const medications: string[] = [];
  const allergies: string[] = [];

  let currentSection = 'subjective';

  for (const line of lines) {
    const lower = line.toLowerCase().trim();
    if (lower.startsWith('subjective') || lower.startsWith('hpi') || lower.startsWith('history')) {
      currentSection = 'subjective';
      continue;
    }
    if (lower.startsWith('objective') || lower.startsWith('exam') || lower.startsWith('pe:') || lower.startsWith('vitals')) {
      currentSection = 'objective';
      continue;
    }
    if (lower.startsWith('assessment') || lower.startsWith('impression') || lower.startsWith('diagnosis')) {
      currentSection = 'assessment';
      continue;
    }
    if (lower.startsWith('plan') || lower.startsWith('treatment') || lower.startsWith('rx:')) {
      currentSection = 'plan';
      continue;
    }
    if (lower.startsWith('medications:') || lower.startsWith('meds:')) {
      const medItems = line.replace(/^(medications:|meds:)/i, '').split(/[,;]/);
      medItems.forEach((m: string) => m.trim() && medications.push(m.trim()));
      continue;
    }
    if (lower.startsWith('allergies:') || lower.startsWith('allergy:')) {
      const allergyItems = line.replace(/^(allergies:|allergy:)/i, '').split(/[,;]/);
      allergyItems.forEach((a: string) => a.trim() && allergies.push(a.trim()));
      continue;
    }

    if (currentSection === 'subjective') subjectiveLines.push(line);
    else if (currentSection === 'objective') objectiveLines.push(line);
    else if (currentSection === 'assessment') assessmentLines.push(line);
    else if (currentSection === 'plan') planLines.push(line);
  }

  res.json({
    subjective: subjectiveLines.join('\n').trim() || rawText,
    objective: objectiveLines.join('\n').trim() || 'Physical exam and vitals pending comprehensive evaluation.',
    assessment: assessmentLines.join('\n').trim() || 'Clinical evaluation and diagnostic synthesis under review.',
    plan: planLines.join('\n').trim() || '1. Continue supportive measures.\n2. Diagnostic workup as indicated.\n3. Return precautions discussed.',
    medications,
    allergies,
  });
});

// 2b. Tier-1 LLM Diagnostic Synthesis Endpoint
app.post('/api/clinical/tier1-synthesis', async (req: Request, res: Response): Promise<void> => {
  const { prompt, systemInstruction } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Missing clinical prompt for Tier-1 synthesis.' });
    return;
  }

  if (isGeminiAvailable()) {
    try {
      const { text: textOutput, model: usedModel } = await generateWithModelFallbackWithModel({
        contents: prompt,
        config: {
          systemInstruction:
            systemInstruction ||
            'You are an expert diagnostician. Explicitly state: "AI-generated diagnostic suggestions. Always correlate with clinical judgment."',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              primaryDifferential: { type: Type.STRING },
              secondaryDifferentials: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              reasoning: { type: Type.STRING },
              recommendedWorkup: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              references: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
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

      const parsed = extractJsonFromText(textOutput);
      res.json({
        ...parsed,
        provenance: {
          engine: 'gemini',
          model: usedModel || 'gemini-3-flash-preview',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'live-success',
        },
      });
      return;
    } catch {
      console.log('[Clinical AI] Tier-1 synthesis served via fallback engine.');
    }
  }

  res.status(503).json({ error: 'Live Tier-1 LLM unavailable; use mock/fallback synthesis.' });
});

// 3. Patient Layperson Summary Endpoint (with fallback)
app.post('/api/clinical/translate', async (req: Request, res: Response): Promise<void> => {
  const { note, patient } = req.body;

  if (!note) {
    res.status(400).json({ error: 'SOAP note is required.' });
    return;
  }

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are a compassionate clinical communicator.
Translate the following medical SOAP note into a patient-facing discharge summary at a 6th-grade reading level.
Avoid medical jargon or clearly explain terms in plain English.
Include:
1. A warm headline
2. A 2-3 sentence overview of what is happening in the patient's body
3. 3-5 bulleted key instructions
4. A simple medication schedule
5. Red flag symptoms that require immediate emergency care
6. Clear follow-up timing

SOAP NOTE:
${JSON.stringify(note, null, 2)}

Return strictly JSON:
{
  "headline": "string",
  "plainLanguageOverview": "string",
  "keyInstructions": ["string"],
  "medicationSchedule": [
    {
      "name": "string",
      "instructions": "string",
      "purpose": "string"
    }
  ],
  "redFlagSymptoms": ["string"],
  "followUp": "string"
}`;

      const rawOutput = await generateWithModelFallback({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsedData = extractJsonFromText(rawOutput);
      res.json(parsedData);
      return;
    } catch {
      console.log('[Clinical AI] Patient summary served via Clinical Rules Engine.');
    }
  }

  // Fallback summary
  const fallback = runHeuristicClinicalAnalysis(note, patient);
  res.json(fallback.patientSummary);
});

// 4. Clinical Query / Copilot Q&A Endpoint (with fallback)
app.post('/api/clinical/query', async (req: Request, res: Response): Promise<void> => {
  const { question, context } = req.body;

  if (!question) {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are an evidence-based clinical decision support assistant.
Answer the following clinical or pharmacological question for a medical provider.
Ground your response in established clinical practice guidelines (e.g. ACC/AHA, ADA, IDSA, USPSTF).
Be concise, precise, and practical.

CLINICAL CONTEXT:
${context || 'No specific patient context provided'}

QUESTION:
${question}

Provide your answer with clear headers, bullet points, and citation references where appropriate.`;

      const { text: responseText, model: usedModel } = await generateWithModelFallbackWithModel({ contents: prompt });
      res.json({
        answer: responseText,
        provenance: {
          engine: 'gemini',
          model: usedModel || 'gemini-3-flash-preview',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'unavailable',
        },
      });
      return;
    } catch {
      console.log('[Clinical AI] Clinical query served via Evidence-Based Guidelines Knowledge Base.');
    }
  }

  // Guideline-grounded heuristics for standard questions
  const qLower = question.toLowerCase();
  let answer = '';

  if (qLower.includes('heart failure') || qLower.includes('gdmt') || qLower.includes('hfref') || qLower.includes('hfpef')) {
    answer = `### Guideline-Directed Medical Therapy (GDMT) for HFrEF (ACC/AHA/HFSA Guidelines)
1. **ARNI / ACEi / ARB**: Sacubitril/Valsartan (target 97/103mg BID) preferred over ACE inhibitors to reduce cardiovascular mortality and hospitalization (36-hour washout required when switching from ACEi).
2. **Beta-Blocker**: Initiate evidence-based beta-blockers: Carvedilol (target 25mg BID), Bisoprolol (target 10mg daily), or Metoprolol succinate XL (target 200mg daily).
3. **Mineralocorticoid Receptor Antagonist (MRA)**: Spironolactone 25-50mg daily or Eplerenone (monitor serum K+ and eGFR).
4. **SGLT2 Inhibitor**: Empagliflozin 10mg daily or Dapagliflozin 10mg daily regardless of diabetes status.

*Diuretics:* Titrate loop diuretics (Furosemide, Torsemide, Bumetanide) to maintain dry weight and euvolemia.`;
  } else if (qLower.includes('chest pain') || qLower.includes('acs') || qLower.includes('angina') || qLower.includes('troponin')) {
    answer = `### Acute Chest Pain & ACS Diagnostic Evaluation (ACC/AHA Guidelines)
1. **Immediate Bedside Actions:**
   - 12-lead ECG within 10 minutes of arrival; repeat serially if initial ECG is non-diagnostic.
   - High-sensitivity cardiac troponin (hs-cTn) at 0 and 1-3 hours.
   - Aspirin 162-325 mg non-enteric chewed immediately unless contraindication exists.
2. **HEART Score Risk Stratification:**
   - Low risk (0-3): Early discharge or outpatient non-invasive stress testing.
   - Moderate risk (4-6): Inpatient observation, serial troponins, non-invasive imaging.
   - High risk (7-10): Urgent cardiology consult, continuous telemetry, invasive angiography consideration.`;
  } else if (qLower.includes('otitis') || qLower.includes('penicillin') || qLower.includes('allergy')) {
    answer = `### Pediatric AOM with Penicillin Allergy (AAP Guidelines)
1. **Non-Severe / Delayed Rash History:**
   - 3rd-generation oral Cephalosporins (Cefdinir 14 mg/kg/day, Cefuroxime axetil 30 mg/kg/day, or Cefpodoxime 10 mg/kg/day).
   - Cross-reactivity between penicillins and 3rd-generation cephalosporins with distinct side chains is very low (<1%).
2. **Severe / Type I Hypersensitivity (Anaphylaxis, Angioedema, Urticaria):**
   - Macrolides: Azithromycin (10 mg/kg day 1, 5 mg/kg days 2–5) or Clarithromycin (15 mg/kg/day in 2 divided doses).
   - Alternatively: Clindamycin 30–40 mg/kg/day in 3 divided doses (note: covers S. pneumoniae but lacks H. influenzae activity).`;
  } else if (qLower.includes('sglt2') || qLower.includes('ckd') || qLower.includes('renal')) {
    answer = `### SGLT2 Inhibitor & ACEi Guidelines in CKD (KDIGO / ADA Guidelines)
1. **Renal Benefits:** SGLT2 inhibitors (Empagliflozin, Dapagliflozin) slow CKD progression, reduce proteinuria, and reduce cardiovascular events down to eGFR >= 20 mL/min/1.73m².
2. **Acute eGFR Dip:** An initial 10–30% benign decline in eGFR is expected due to restoration of tubuloglomerular feedback. Do not discontinue unless acute renal failure develops.
3. **Safety & Sick-Day Rules:** Hold SGLT2 inhibitors prior to major elective surgery, severe acute dehydration, or critical illness to prevent euglycemic DKA.`;
  } else if (qLower.includes('diabetes') || qLower.includes('metformin') || qLower.includes('glp') || qLower.includes('a1c')) {
    answer = `### Type 2 Diabetes Management & Pharmacotherapy (ADA Standards of Care)
1. **First-line Therapy:** Lifestyle intervention + Metformin (check eGFR: contraindicated if eGFR < 30 mL/min).
2. **Established ASCVD, Heart Failure, or CKD:**
   - ASCVD or High Risk: Add GLP-1 receptor agonist with proven cardiovascular benefit (Semaglutide, Dulaglutide) or SGLT2 inhibitor.
   - Heart Failure or CKD (eGFR 20-60 or UACR > 30 mg/g): SGLT2 inhibitor is preferred first-line add-on.
3. **Glycemic Targets:** General HbA1c < 7.0% for most non-pregnant adults; less stringent (< 8.0%) for frail elderly or significant hypoglycemia risk.`;
  } else if (qLower.includes('hypertension') || qLower.includes('blood pressure') || qLower.includes('bp')) {
    answer = `### Hypertension Clinical Management (ACC/AHA Guidelines)
1. **Blood Pressure Thresholds:** Stage 1: 130-139 / 80-89 mmHg; Stage 2: >= 140 / >= 90 mmHg. Goal: < 130/80 mmHg.
2. **Initial Pharmacotherapy:**
   - First-line classes: Thiazide diuretic (Chlorthalidone preferred), CCB (Amlodipine), ACEi (Lisinopril), or ARB (Losartan).
   - In Black adults without CKD: Initial treatment should include a CCB or thiazide diuretic.
   - In CKD with proteinuria: ACE inhibitor or ARB is preferred.
   - Stage 2 HTN with BP > 20/10 over goal: Initiate with 2 first-line agents from different classes.`;
  } else if (qLower.includes('pneumonia') || qLower.includes('curb') || qLower.includes('respiratory')) {
    answer = `### Community-Acquired Pneumonia (CAP) Management (ATS/IDSA Guidelines)
1. **Outpatient Empiric Therapy (No Comorbidities):**
   - Amoxicillin 1g TID OR Doxycycline 100mg BID (or Macrolide if local pneumococcal resistance < 25%).
2. **Outpatient with Comorbidities (CHF, COPD, DM, Renal/Hepatic Disease):**
   - Combination therapy: Amoxicillin/Clavulanate 875/125mg BID + Macrolide or Doxycycline; OR Respiratory Fluoroquinolone monotherapy (Levofloxacin 750mg daily).
3. **CURB-65 Risk Stratification:**
   - Confusion (1), Urea > 7 mmol/L (1), Respiratory rate >= 30 (1), BP < 90/60 (1), Age >= 65 (1). Score 0-1: Outpatient; Score 2: Inpatient floor; Score >= 3: Intensive care evaluation.`;
  } else {
    answer = `### Evidence-Based Clinical Decision Support
Based on standard clinical practice guidelines for: "${question}"

• **Diagnostic Approach:** Correlate presenting symptoms, objective vital signs, targeted physical examination maneuvers, and laboratory markers.
• **Pharmacology & Safety:** Verify baseline renal function (eGFR), hepatic profile, drug-drug interactions, and documented allergy history prior to initiating therapy.
• **Monitoring & Safety Net:** Reassess clinical response within 48–72 hours for acute conditions or 2–4 weeks for chronic medication adjustments. Educate patient on red-flag emergency symptoms.`;
  }

  res.json({
    answer: `${answer}\n\n*(Notice: Provided by Evidence-Based Clinical Decision Rules Engine while external AI quota resets.)*`,
    provenance: {
      engine: 'heuristic',
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus: 'curated-fallback',
    },
  });
});

// 5. Attachment (Photo / Document) AI Analysis Endpoint
app.post('/api/clinical/analyze-attachment', async (req: Request, res: Response): Promise<void> => {
  const { section, fileName, fileType, mimeType, base64Data, textContent, patient } = req.body;

  if (!fileName) {
    res.status(400).json({ error: 'Missing attachment file data.' });
    return;
  }

  // Attempt live Gemini Multimodal analysis if API is available and not in cooldown
  if (isGeminiAvailable()) {
    try {
      const targetSection = (section || 'objective').toUpperCase();
      const prompt = `You are a clinical documentation specialist and medical diagnostic intelligence AI.
Analyze this medical clinical attachment (photo/document) uploaded for the ${targetSection} section of a medical SOAP note.

PATIENT CONTEXT:
Patient: ${patient?.name || 'Patient'}, ${patient?.age ? patient.age + ' yo' : ''} ${patient?.gender || ''}
Chief Complaint: ${patient?.chiefComplaint || 'Clinical evaluation'}

ATTACHMENT METADATA:
File Name: ${fileName}
Modality/Type: ${fileType} (${mimeType || 'unknown'})

DIAGNOSTIC INSTRUCTIONS:
1. Examine the image or document content with clinical precision.
2. If this is an ECG, identify rate, rhythm, electrical axis, PR/QRS/QTc intervals, ST elevations/depressions, and T-wave abnormalities.
3. If this is an X-ray, CT, MRI, or Ultrasound, evaluate anatomical structures, opacities, cardiothoracic ratio, fractures, or focal consolidation.
4. If this is a Lab Report or Blood Test, identify any abnormal, high, or low markers, electrolyte imbalances, and pertinent negatives.
5. If this is a Clinical Photo (e.g. dermatological lesion, wound, otoscopic exam, rash), assess morphology, coloration, distribution, and presence of infection or erythema.
6. If this is a Document or Consultation Record, synthesize the pertinent chronological history and outside clinical impressions.
7. Provide a concise, publication-grade clinical paragraph specifically formatted to be inserted directly into the ${targetSection} section of the SOAP note.

Return strictly valid JSON matching this schema:
{
  "headline": "Brief clinical headline (e.g., '12-Lead Electrocardiogram Analysis', 'Chest Radiograph (PA/Lateral)', 'Complete Blood Count (CBC) Panel')",
  "category": "Modality category (e.g., 'Diagnostic Cardiology', 'Diagnostic Radiology', 'Clinical Pathology', 'Dermatological Photography', 'Clinical Records')",
  "summary": "2-3 sentence objective clinical synthesis of the findings",
  "keyFindings": ["Finding 1 with values/measurements", "Finding 2", "Finding 3", "Finding 4"],
  "suggestedSectionText": "Clinical narrative paragraph ready for immediate insertion into the ${targetSection} section of the SOAP note."
}`;

      let contents: any;

      if (base64Data && (mimeType?.startsWith('image/') || mimeType === 'application/pdf')) {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
        const filePart = {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        };
        const textPart = {
          text: prompt,
        };
        contents = { parts: [filePart, textPart] };
      } else if (textContent) {
        contents = `${prompt}\n\nDOCUMENT EXTRACT:\n${textContent.slice(0, 8000)}`;
      } else {
        contents = prompt;
      }

      const { text: rawOutput, model: usedModel } = await generateWithModelFallbackWithModel({
        contents,
        config: { responseMimeType: 'application/json' },
      });

      const parsedData = extractJsonFromText(rawOutput);
      res.json({
        ...parsedData,
        provenance: {
          engine: 'gemini',
          model: usedModel || 'gemini-3-flash-preview',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'unavailable',
        },
      });
      return;
    } catch {
      console.log('[Clinical AI] Attachment analyzed via Multimodal Heuristics Engine.');
    }
  }

  // Fallback heuristic analysis (instant, zero-failure guarantee)
  const fallback = runHeuristicAttachmentAnalysis({
    section: section || 'objective',
    fileName,
    fileType: fileType || 'image',
    mimeType: mimeType || 'image/jpeg',
    textContent,
    patientName: patient?.name,
    chiefComplaint: patient?.chiefComplaint,
  });

  res.json({
    ...fallback,
    provenance: {
      engine: 'heuristic',
      fallbackUsed: true,
      usedPrebuiltData: true,
      evidenceStatus: 'unavailable',
    },
  });
});

// 6. Ambient Doctor-Patient Visit Dictation to SOAP Endpoint
app.post('/api/clinical/ambient-dictation', async (req: Request, res: Response): Promise<void> => {
  const { transcript, audioData, mimeType, patient } = req.body;

  if (!transcript && !audioData) {
    res.status(400).json({ error: 'Missing transcript or audio data.' });
    return;
  }

  if (isGeminiAvailable()) {
    try {
      // Case A: Audio data provided (uploaded audio file or recorded voice memo)
      if (audioData) {
        const audioPrompt = `You are an elite clinical medical scribe and documentation specialist.
Listen to this doctor-patient clinical visit audio encounter.
1. Transcribe the conversation accurately into dialogue between Doctor and Patient.
2. Structure the clinical findings into a publication-grade medical SOAP note:
   - subjective: Narrative of chief complaint, history of present illness, ROS, and patient statements.
   - objective: Physical exam observations, vital signs, and diagnostic findings.
   - assessment: Numbered clinical assessment, primary diagnosis, and differentials.
   - plan: Numbered management plan (medications, workup, red flag counseling, follow-up).
   - medications: Array of mentioned medications with dosages.
   - allergies: Array of mentioned allergies or NKDA.
   - transcript: Full transcribed verbatim dialogue.

PATIENT CONTEXT:
Patient: ${patient?.name || 'Patient'}, ${patient?.age ? patient.age + ' yo' : ''} ${patient?.gender || ''}
Chief Complaint: ${patient?.chiefComplaint || 'Clinical Consultation'}

Return strictly valid JSON matching this schema:
{
  "transcript": "Doctor: ... Patient: ...",
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "...",
  "medications": ["..."],
  "allergies": ["..."]
}`;

        const rawOutput = await generateWithModelFallback({
          contents: [
            {
              inlineData: {
                mimeType: mimeType || 'audio/webm',
                data: audioData,
              },
            },
            { text: audioPrompt },
          ],
          config: { responseMimeType: 'application/json' },
        });

        const parsedData = extractJsonFromText(rawOutput);
        res.json(parsedData);
        return;
      }

      // Case B: Text transcript provided
      const prompt = `You are an elite clinical medical scribe and documentation specialist.
Transform the following conversation or dictation from a doctor-patient clinical visit into a structured, publication-grade medical SOAP note.
Extract pertinent medical details, physical exam observations, differential diagnoses, and plan instructions.
Also identify any medications and allergies mentioned in the visit.

PATIENT CONTEXT:
Patient: ${patient?.name || 'Patient'}, ${patient?.age ? patient.age + ' yo' : ''} ${patient?.gender || ''}
Chief Complaint: ${patient?.chiefComplaint || 'Clinical Consultation'}

VISIT CONVERSATION / DICTATION:
${transcript}

Return strictly valid JSON matching this schema:
{
  "subjective": "Detailed narrative history of present illness, ROS, and patient-reported symptoms",
  "objective": "Vital signs, physical examination findings by organ system, and point-of-care results",
  "assessment": "Numbered clinical assessment, primary working diagnosis, and differential considerations",
  "plan": "Numbered actionable management plan including medications, diagnostics, counseling, and follow-up",
  "medications": ["Medication name, dose, frequency"],
  "allergies": ["Documented allergies or NKDA"]
}`;

      const { text: rawOutput, model: usedModel } = await generateWithModelFallbackWithModel({
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsedData = extractJsonFromText(rawOutput);
      res.json({
        ...parsedData,
        provenance: {
          engine: 'gemini',
          model: usedModel || 'gemini-3-flash-preview',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'not-requested',
        },
      });
      return;
    } catch {
      console.log('[Clinical AI] Ambient visit structured via Clinical Scribe Engine.');
    }
  }

  // Fallback heuristic parsing
  const effectiveText = transcript || 'Clinical encounter recorded. Review subjective history, physical exam, and management plan.';
  const lines = effectiveText.split('\n').map((l: string) => l.trim()).filter(Boolean);
  let subjective = '';
  let objective = '';
  let assessment = '';
  let plan = '';
  const allergies: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('exam') || lower.includes('vitals') || lower.includes('blood pressure') || lower.includes('heart rate') || lower.includes('auscultation') || lower.includes('lungs') || lower.includes('edema') || lower.includes('temperature') || lower.includes('abdomen') || lower.includes('palpation') || lower.includes('tympanic')) {
      objective += (objective ? '\n' : '') + line;
    } else if (lower.includes('assessment') || lower.includes('impression') || lower.includes('diagnosis') || lower.includes('consistent with') || lower.includes('suspicious for') || lower.includes('score')) {
      assessment += (assessment ? '\n' : '') + line;
    } else if (lower.includes('plan') || lower.includes('order') || lower.includes('start') || lower.includes('prescribe') || lower.includes('discontinue') || lower.includes('follow-up') || lower.includes('follow up') || lower.includes('consult')) {
      plan += (plan ? '\n' : '') + line;
    } else {
      subjective += (subjective ? '\n' : '') + line;
    }
  }

  // Extract only explicitly spoken medications without inventing fixed doses or frequencies
  const medications = extractAmbientMedicationsFromTranscript(effectiveText);

  res.json({
    transcript: effectiveText,
    subjective: subjective || effectiveText,
    objective: objective || 'Physical exam and vital signs gathered during clinical visit.',
    assessment: assessment || 'Clinical impression under physician evaluation.',
    plan: plan || '1. Supportive clinical care\n2. Diagnostic laboratory workup\n3. Scheduled outpatient clinic follow-up',
    medications,
    allergies,
    provenance: {
      engine: 'heuristic',
      usedPrebuiltData: false,
      fallbackUsed: true,
      evidenceStatus: 'not-requested',
    },
  });
});

// -------------------------------------------------------------
// BIOSCIENCE SKILLS ENDPOINTS (PubChem, openFDA, PubMed, ClinVar)
// -------------------------------------------------------------

// 1. PubChem Chemical Structure & Properties Proxy
app.get('/api/science/pubchem', async (req: Request, res: Response): Promise<void> => {
  const query = ((req.query.query as string) || (req.query.compound as string) || '').trim();
  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  // Pre-cached clinical pharmacology dataset for high-speed offline resilience
  const CLINICAL_PUBCHEM_CACHE: Record<string, any> = {
    lisinopril: {
      cid: 5362119,
      name: 'Lisinopril',
      molecularFormula: 'C21H31N3O5',
      molecularWeight: '405.49',
      canonicalSmiles: 'C1CC(N(C1)C(=O)C(CCC2=CC=CC=C2)NC(CCCCN)C(=O)O)C(=O)O',
      inchiKey: 'RLAWWYSOJDYHDC-UHFFFAOYSA-N',
      xlogp: -1.2,
      tpsa: 112,
      hBondDonors: 4,
      hBondAcceptors: 6,
      rotatableBonds: 10,
      complexity: 564,
      iupacName: '(2S)-1-[(2S)-6-amino-2-[[(1S)-1-carboxy-3-phenylpropyl]amino]hexanoyl]pyrrolidine-2-carboxylic acid',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/5362119/PNG?image_size=300x300',
    },
    furosemide: {
      cid: 3440,
      name: 'Furosemide',
      molecularFormula: 'C12H11ClN2O5S',
      molecularWeight: '330.74',
      canonicalSmiles: 'C1=COC(=C1)CNC2=CC(=C(C=C2C(=O)O)S(=O)(=O)N)Cl',
      inchiKey: 'ZZUFCTLCJUWOSV-UHFFFAOYSA-N',
      xlogp: 2.0,
      tpsa: 121,
      hBondDonors: 3,
      hBondAcceptors: 6,
      rotatableBonds: 4,
      complexity: 442,
      iupacName: '4-chloro-2-(furan-2-ylmethylamino)-5-sulfamoylbenzoic acid',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/3440/PNG?image_size=300x300',
    },
    atorvastatin: {
      cid: 60823,
      name: 'Atorvastatin',
      molecularFormula: 'C33H35FN2O5',
      molecularWeight: '558.6',
      canonicalSmiles: 'CC(C)C1=C(C(=C(N1CCC(CC(CC(=O)O)O)O)C2=CC=C(C=C2)F)C3=CC=CC=C3)C(=O)NC4=CC=CC=C4',
      inchiKey: 'XGARUPXZRZPGBV-UHFFFAOYSA-N',
      xlogp: 5.7,
      tpsa: 111,
      hBondDonors: 4,
      hBondAcceptors: 5,
      rotatableBonds: 12,
      complexity: 820,
      iupacName: '(3R,5R)-7-[2-(4-fluorophenyl)-3-phenyl-4-(phenylcarbamoyl)-5-propan-2-ylpyrrol-1-yl]-3,5-dihydroxyheptanoic acid',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/60823/PNG?image_size=300x300',
    },
    ibuprofen: {
      cid: 3672,
      name: 'Ibuprofen',
      molecularFormula: 'C13H18O2',
      molecularWeight: '206.28',
      canonicalSmiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',
      inchiKey: 'HEFNNWSXXWATRW-UHFFFAOYSA-N',
      xlogp: 3.5,
      tpsa: 37.3,
      hBondDonors: 1,
      hBondAcceptors: 2,
      rotatableBonds: 4,
      complexity: 232,
      iupacName: '2-[4-(2-methylpropyl)phenyl]propanoic acid',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/3672/PNG?image_size=300x300',
    },
    metformin: {
      cid: 4091,
      name: 'Metformin',
      molecularFormula: 'C4H11N5',
      molecularWeight: '129.16',
      canonicalSmiles: 'CN(C)C(=N)NC(=N)N',
      inchiKey: 'XZBJJZZBXBIPGG-UHFFFAOYSA-N',
      xlogp: -1.4,
      tpsa: 87.7,
      hBondDonors: 3,
      hBondAcceptors: 2,
      rotatableBonds: 2,
      complexity: 92,
      iupacName: '3-(diaminomethylidene)-1,1-dimethylguanidine',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/4091/PNG?image_size=300x300',
    },
    amoxicillin: {
      cid: 33613,
      name: 'Amoxicillin',
      molecularFormula: 'C16H19N3O5S',
      molecularWeight: '365.4',
      canonicalSmiles: 'CC1(C(N2C(S1)C(C2=O)NC(=O)C(C3=CC=C(C=C3)O)N)C(=O)O)C',
      inchiKey: 'LSQZLLLLGUSVIP-UHFFFAOYSA-N',
      xlogp: 0.9,
      tpsa: 139,
      hBondDonors: 4,
      hBondAcceptors: 6,
      rotatableBonds: 4,
      complexity: 569,
      iupacName: '(2S,5R,6R)-6-[[(2R)-2-amino-2-(4-hydroxyphenyl)acetyl]amino]-3,3-dimethyl-7-oxo-4-thia-1-azabicyclo[3.2.0]heptane-2-carboxylic acid',
      imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/33613/PNG?image_size=300x300',
    },
  };

  const key = query.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '');
  const fetchFn = getServerFetch();

  try {
    // 1. Check live PubChem API
    const cidRes = await fetchFn(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON`
    );
    if (cidRes.ok) {
      const cidData = await cidRes.json();
      const cid = cidData?.IdentifierList?.CID?.[0];
      if (cid) {
        const propRes = await fetchFn(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,XLogP,TPSA,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,Complexity,IUPACName/JSON`
        );
        if (propRes.ok) {
          const propData = await propRes.json();
          const p = propData?.PropertyTable?.Properties?.[0] || {};
          res.json({
            cid,
            name: query,
            molecularFormula: p.MolecularFormula || '',
            molecularWeight: p.MolecularWeight || '',
            canonicalSmiles: p.CanonicalSMILES || p.ConnectivitySMILES || '',
            inchiKey: p.InChIKey || '',
            xlogp: p.XLogP ?? null,
            tpsa: p.TPSA ?? null,
            hBondDonors: p.HBondDonorCount ?? 0,
            hBondAcceptors: p.HBondAcceptorCount ?? 0,
            rotatableBonds: p.RotatableBondCount ?? 0,
            complexity: p.Complexity ?? 0,
            iupacName: p.IUPACName || query,
            imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=300x300`,
            evidenceStatus: 'live-success',
            provenance: {
              engine: 'heuristic',
              usedPrebuiltData: false,
              fallbackUsed: false,
              evidenceStatus: 'live-success',
              retrievalRequested: true,
              claimSupportVerified: false,
            },
          });
          return;
        }
      }
    }
  } catch (err) {
    console.warn('PubChem live fetch failed, using fallback:', err);
  }

  // Exact curated static record for known high-frequency substances
  if (CLINICAL_PUBCHEM_CACHE[key]) {
    res.json({
      ...CLINICAL_PUBCHEM_CACHE[key],
      isCuratedFallback: true,
      dataOrigin: 'curated-static',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
    return;
  }

  // Never return synthesized/random CIDs or chemical properties
  res.status(404).json({
    error: `Compound "${query}" not found in live PubChem and no curated static record matches this query.`,
    status: 'unavailable',
    evidenceStatus: 'unavailable',
    compound: null,
    provenance: {
      engine: 'unknown',
      usedPrebuiltData: false,
      fallbackUsed: true,
      evidenceStatus: 'unavailable',
      retrievalRequested: true,
      claimSupportVerified: false,
    },
  });
});

// 2. openFDA Drug Labeling & Pharmacovigilance Proxy
app.get('/api/science/openfda', async (req: Request, res: Response): Promise<void> => {
  const drug = ((req.query.drug as string) || '').trim();
  if (!drug) {
    res.status(400).json({ error: 'Drug parameter is required' });
    return;
  }

  const drugClean = drug.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');

  try {
    const [labelRes, eventsRes] = await Promise.all([
      fetch(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugClean)}"&limit=1`),
      fetch(`https://api.fda.gov/drug/event.json?search=patient.drug.openfda.generic_name:"${encodeURIComponent(drugClean)}"&count=patient.reaction.reactionmeddrapt.exact&limit=10`),
    ]);

    let labelData: any = null;
    let eventsData: any = null;

    if (labelRes.ok) labelData = await labelRes.json();
    if (eventsRes.ok) eventsData = await eventsRes.json();

    const result = labelData?.results?.[0];
    const topEvents = (eventsData?.results || []).map((e: any) => ({
      term: e.term,
      count: e.count,
    }));

    if (result) {
      res.json({
        brandName: result.openfda?.brand_name?.[0] || drug,
        genericName: result.openfda?.generic_name?.[0] || drugClean,
        boxedWarnings: result.boxed_warning || [],
        indications: (result.indications_and_usage?.[0] || '').slice(0, 500),
        contraindications: (result.contraindications?.[0] || '').slice(0, 500),
        mechanismOfAction: (result.mechanism_of_action?.[0] || result.clinical_pharmacology?.[0] || '').slice(0, 500),
        adverseReactions: (result.adverse_reactions?.[0] || '').slice(0, 500),
        topAdverseEvents: topEvents,
        evidenceStatus: 'live-success',
        provenance: {
          engine: 'heuristic',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'live-success',
        },
      });
      return;
    }
  } catch (err) {
    console.warn('openFDA API fetch failed, returning explicit fallback status:', err);
  }

  // Never silently substitute FDA_FALLBACKS as live data: explicitly flag curated-fallback or unavailable
  if (FDA_FALLBACKS[drugClean]) {
    res.json({
      ...FDA_FALLBACKS[drugClean],
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: true,
        evidenceStatus: 'curated-fallback',
      },
    });
    return;
  }

  res.status(503).json({
    error: `Live openFDA query failed for "${drug}" and no curated fallback record exists.`,
    brandName: drug,
    genericName: drugClean,
    boxedWarnings: [],
    indications: '',
    contraindications: '',
    mechanismOfAction: '',
    adverseReactions: '',
    topAdverseEvents: [],
    evidenceStatus: 'unavailable',
    provenance: {
      engine: 'heuristic',
      usedPrebuiltData: false,
      fallbackUsed: true,
      evidenceStatus: 'unavailable',
    },
  });
});

// 3. PubMed & Europe PMC Biomedical Literature Proxy
app.get('/api/science/pubmed', async (req: Request, res: Response): Promise<void> => {
  const term = ((req.query.term as string) || '').trim();
  if (!term) {
    res.status(400).json({ error: 'Term parameter is required' });
    return;
  }

  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      term
    )}&sort=pub_date&retmode=json&retmax=6&tool=AIStudioBuild&email=clinical_ai@app.com`;
    const searchRes = await fetch(searchUrl);

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const idList = searchData?.esearchresult?.idlist || [];

      if (idList.length > 0) {
        const sumUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
          ','
        )}&retmode=json&tool=AIStudioBuild&email=clinical_ai@app.com`;
        const sumRes = await fetch(sumUrl);
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          const articles = idList
            .map((id: string) => {
              const item = sumData?.result?.[id];
              if (!item) return null;
              const authors = (item.authors || []).map((a: any) => a.name);
              const firstAuthor = authors[0] || 'Clinical Investigators';
              const etAl = authors.length > 1 ? ' et al.' : '';
              const year = (item.pubdate || '').slice(0, 4) || '2023';
              const journal = item.source || 'Biomedical Literature';
              return {
                pmid: id,
                title: item.title,
                authors: authors.slice(0, 5),
                journal,
                pubdate: item.pubdate,
                doi: (item.articleids || []).find((a: any) => a.idtype === 'doi')?.value,
                citationString: `[${firstAuthor}${etAl}, ${journal} (${year}); PMID: ${id}]`,
              };
            })
            .filter(Boolean);

          if (articles.length > 0) {
            res.json({
              articles,
              evidenceStatus: 'live-success',
              provenance: {
                engine: 'heuristic',
                usedPrebuiltData: false,
                fallbackUsed: false,
                evidenceStatus: 'live-success',
              },
            });
            return;
          }
        }
      }
    }
  } catch (err) {
    console.warn('PubMed live fetch failed, returning explicit unavailable status:', err);
  }

  // Never silently substitute hardcoded papers when live PubMed retrieval fails
  res.json({
    articles: [],
    error: 'Evidence retrieval failed. No citations available.',
    evidenceStatus: 'unavailable',
    provenance: {
      engine: 'heuristic',
      usedPrebuiltData: false,
      fallbackUsed: true,
      evidenceStatus: 'unavailable',
    },
  });
});

// 4. ClinVar & AlphaGenome Precision Genomic Variants
app.get('/api/science/clinvar', async (req: Request, res: Response): Promise<void> => {
  const query = ((req.query.query as string) || '').trim();
  const qLower = query.toLowerCase();

  const CLINICAL_VARIANTS = [
    {
      id: 'VCV000014088',
      title: 'SLCO1B1 c.521T>C (p.Val174Ala) [rs4149056]',
      gene: 'SLCO1B1',
      clinicalSignificance: 'Drug Response / Risk Factor (Statin-Induced Myopathy)',
      reviewStatus: 'Practice guideline (CPIC Level A)',
      conditions: ['Simvastatin / Atorvastatin systemic exposure increase', 'Statin-induced necrotizing autoimmune myopathy risk'],
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=SLCO1B1',
    },
    {
      id: 'VCV000012582',
      title: 'CYP2C9*3 c.1075A>C (p.Ile359Leu) [rs1057910]',
      gene: 'CYP2C9',
      clinicalSignificance: 'Drug Response (Poor Metabolizer)',
      reviewStatus: 'Practice guideline (CPIC Level A)',
      conditions: ['Warfarin dose requirement reduction', 'NSAID prolonged half-life & gastrointestinal bleed risk'],
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=CYP2C9',
    },
    {
      id: 'VCV000014092',
      title: 'MYH7 c.2156G>A (p.Arg719Gln) [rs121913628]',
      gene: 'MYH7',
      clinicalSignificance: 'Pathogenic (Cardiovascular)',
      reviewStatus: 'reviewed by expert panel (ClinGen)',
      conditions: ['Familial hypertrophic cardiomyopathy (HCM)', 'Left ventricular outflow tract obstruction'],
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=MYH7',
    },
    {
      id: 'VCV000009298',
      title: 'LDLR c.2054G>A (p.Cys685Tyr) [rs121908028]',
      gene: 'LDLR',
      clinicalSignificance: 'Pathogenic',
      reviewStatus: 'criteria provided, multiple submitters',
      conditions: ['Familial hypercholesterolemia (FH)', 'Premature coronary atherosclerosis'],
      alphaGenomeUrl: 'https://deepmind.google.com/science/alphagenome/atlas?q=LDLR',
    },
  ];

  if (!query || qLower.includes('cardio') || qLower.includes('all')) {
    res.json({
      query: query || 'cardiology',
      variants: CLINICAL_VARIANTS,
      isCuratedStatic: true,
      datasetScope: 'Curated cardiovascular & pharmacogenomic catalog (SLCO1B1, CYP2C9, MYH7, LDLR)',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
    return;
  }

  const matched = CLINICAL_VARIANTS.filter((v) =>
    v.gene.toLowerCase().includes(qLower) ||
    v.title.toLowerCase().includes(qLower) ||
    v.conditions.some((c) => c.toLowerCase().includes(qLower))
  );

  if (matched.length > 0) {
    res.json({
      query,
      variants: matched,
      isCuratedStatic: true,
      datasetScope: 'Curated precision genomics subset',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  } else {
    res.json({
      query,
      variants: [],
      status: 'unavailable',
      evidenceStatus: 'unavailable',
      datasetScope: 'Curated catalog does not cover this gene or condition',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: false,
        fallbackUsed: true,
        evidenceStatus: 'unavailable',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  }
});

// 5. Target Macromolecular 3D Structures (AlphaFold DB & PDB)
app.get('/api/science/target-structures', (req: Request, res: Response): void => {
  const query = ((req.query.query as string) || '').trim();
  const qLower = query.toLowerCase();

  const TARGETS = [
    {
      id: 'ace',
      name: 'Angiotensin-Converting Enzyme (ACE)',
      geneSymbol: 'ACE',
      uniprotId: 'P12821',
      pdbId: '1O86',
      description: 'Zinc metallopeptidase converting Angiotensin I to the potent vasoconstrictor Angiotensin II.',
      drugs: ['Lisinopril', 'Enalapril', 'Ramipril', 'Captopril'],
      functionSummary: 'Central therapeutic target for essential hypertension, diabetic nephropathy, and heart failure.',
      plddtConfidence: '92.4% (Very High - AlphaFold DB)',
    },
    {
      id: 'agtr1',
      name: 'Type-1 Angiotensin II Receptor (AT1R)',
      geneSymbol: 'AGTR1',
      uniprotId: 'P30556',
      pdbId: '4ZUD',
      description: 'G-protein coupled receptor mediating vasoconstriction, aldosterone release, and cardiac hypertrophy.',
      drugs: ['Losartan', 'Valsartan', 'Telmisartan', 'Candesartan'],
      functionSummary: 'Selectively blocked by ARBs to reduce systemic vascular resistance and glomerular pressure.',
      plddtConfidence: '89.1% (High Confidence)',
    },
    {
      id: 'sglt2',
      name: 'Sodium/Glucose Cotransporter 2 (SGLT2)',
      geneSymbol: 'SLC5A2',
      uniprotId: 'P31639',
      pdbId: '7VSI',
      description: 'High-capacity sodium/glucose symporter responsible for 90% of renal tubular glucose reabsorption.',
      drugs: ['Empagliflozin', 'Dapagliflozin', 'Canagliflozin'],
      functionSummary: 'Inhibition induces osmotic diuresis, reduces cardiac preload/afterload, and preserves renal eGFR.',
      plddtConfidence: '94.2% (Very High Confidence)',
    },
    {
      id: 'adrb1',
      name: 'Beta-1 Adrenergic Receptor (Beta-1 AR)',
      geneSymbol: 'ADRB1',
      uniprotId: 'P08588',
      pdbId: '2Y00',
      description: 'Predominant cardiac adrenergic receptor regulating inotropy, chronotropy, and renin release.',
      drugs: ['Metoprolol', 'Bisoprolol', 'Carvedilol', 'Atenolol'],
      functionSummary: 'Antagonism reduces myocardial oxygen consumption, blunts sympathetic neurohormonal drive in heart failure.',
      plddtConfidence: '88.7% (High Confidence)',
    },
    {
      id: 'hmgcr',
      name: 'HMG-CoA Reductase (Catalytic Domain)',
      geneSymbol: 'HMGCR',
      uniprotId: 'P04035',
      pdbId: '1HW9',
      description: 'Rate-limiting enzyme of the mevalonate pathway in de novo cholesterol biosynthesis.',
      drugs: ['Atorvastatin', 'Rosuvastatin', 'Simvastatin', 'Pravastatin'],
      functionSummary: 'Competitive inhibition upregulates hepatic LDL receptors and clears circulating atherogenic particles.',
      plddtConfidence: '91.8% (Very High Confidence)',
    },
    {
      id: 'ptgs2',
      name: 'Cyclooxygenase-2 (COX-2 / Prostaglandin Synthase)',
      geneSymbol: 'PTGS2',
      uniprotId: 'P35354',
      pdbId: '5KIR',
      description: 'Inducible enzyme converting arachidonic acid to prostaglandin H2 during inflammation.',
      drugs: ['Celecoxib', 'Ibuprofen', 'Meloxicam', 'Naproxen'],
      functionSummary: 'Inhibition reduces pain/swelling but can reduce renal vasodilatory prostaglandins and elevate BP.',
      plddtConfidence: '90.5% (Very High Confidence)',
    },
  ];

  if (!query || qLower.includes('all') || qLower.includes('cardio')) {
    res.json({
      targets: TARGETS,
      isCuratedStatic: true,
      datasetScope: 'Curated 6-target macromolecular reference set (ACE, AT1R, SGLT2, ADRB1, HMGCR, PTGS2)',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
    return;
  }

  const matched = TARGETS.filter((t) =>
    t.name.toLowerCase().includes(qLower) ||
    t.geneSymbol.toLowerCase().includes(qLower) ||
    t.drugs.some((d) => d.toLowerCase().includes(qLower)) ||
    t.description.toLowerCase().includes(qLower)
  );

  if (matched.length > 0) {
    res.json({
      query,
      targets: matched,
      isCuratedStatic: true,
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  } else {
    res.json({
      query,
      targets: [],
      status: 'unavailable',
      evidenceStatus: 'unavailable',
      datasetScope: 'Target macromolecule not found in curated demonstration catalog',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: false,
        fallbackUsed: true,
        evidenceStatus: 'unavailable',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  }
});

// -------------------------------------------------------------
// CLINICAL DATABASE & OFFLINE PERSISTENCE ENDPOINTS
// -------------------------------------------------------------

// Database status & telemetry
app.get('/api/db/status', (_req: Request, res: Response): void => {
  res.json(clinicalDb.getStatus());
});

// Query encounters with pagination, search, MRN filtering
app.get('/api/encounters', (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const search = req.query.search as string;
  const mrn = req.query.mrn as string;
  const date = req.query.date as string;

  const result = clinicalDb.getEncounters({ page, limit, search, mrn, date });
  res.json(result);
});

// Get single encounter with full history and revisions
app.get('/api/encounters/:id', (req: Request, res: Response): void => {
  const encounter = clinicalDb.getEncounterById(req.params.id);
  if (!encounter) {
    res.status(404).json({ error: 'Clinical encounter not found.' });
    return;
  }
  res.json(encounter);
});

// Create new encounter
app.post('/api/encounters', (req: Request, res: Response): void => {
  const record = req.body;
  if (!record || !record.patient || !record.note) {
    res.status(400).json({ error: 'Invalid clinical encounter schema: missing patient or note.' });
    return;
  }
  const created = clinicalDb.createEncounter(record, req.body.userId || 'clinician');
  res.status(201).json(created);
});

// Update encounter & record revision
app.put('/api/encounters/:id', (req: Request, res: Response): void => {
  const updated = clinicalDb.updateEncounter(
    req.params.id,
    req.body,
    req.body.userId || 'clinician',
    req.body.changeSummary || 'Clinical note amended'
  );
  if (!updated) {
    res.status(404).json({ error: 'Clinical encounter not found.' });
    return;
  }
  res.json(updated);
});

// Delete encounter
app.delete('/api/encounters/:id', (req: Request, res: Response): void => {
  const success = clinicalDb.deleteEncounter(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Clinical encounter not found.' });
    return;
  }
  res.json({ message: 'Encounter deleted successfully.' });
});

// Batch offline synchronization endpoint
app.post('/api/sync/offline', (req: Request, res: Response): void => {
  const { queue } = req.body;
  if (!Array.isArray(queue)) {
    res.status(400).json({ error: 'queue must be an array of encounters.' });
    return;
  }
  const result = clinicalDb.batchSync(queue);
  res.json(result);
});

// Audit events query
app.get('/api/audit-events', (req: Request, res: Response): void => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const mrn = req.query.mrn as string;
  const action = req.query.action as string;
  const userId = req.query.userId as string;

  const result = clinicalDb.getAuditEvents({ page, limit, mrn, action, userId });
  res.json(result);
});

// Record audit event server-side
app.post('/api/audit-events', (req: Request, res: Response): void => {
  const entry = req.body;
  if (!entry || !entry.action || !entry.userId) {
    res.status(400).json({ error: 'Audit event requires action and userId.' });
    return;
  }
  const recorded = clinicalDb.recordAuditEvent(entry);
  res.status(201).json(recorded);
});

// -------------------------------------------------------------
// VERIFIABLE BIOMEDICAL RESEARCH & CLINICAL EVIDENCE ENDPOINTS
// -------------------------------------------------------------

// 1. ClinicalTrials.gov v2 API Proxy (Live with curated landmark trials fallback)
app.get('/api/science/trials', async (req: Request, res: Response): Promise<void> => {
  const term = ((req.query.term as string) || '').trim();
  if (!term) {
    res.status(400).json({ error: 'Term parameter is required' });
    return;
  }

  const fetchFn = getServerFetch();
  try {
    const apiUrl = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(term)}&pageSize=6`;
    const response = await fetchFn(apiUrl);

    if (response.ok) {
      const data = await response.json();
      const studies = (data?.studies || []).map((s: any) => {
        const proto = s?.protocolSection;
        const idMod = proto?.identificationModule;
        const descMod = proto?.descriptionModule;
        const statusMod = proto?.statusModule;
        const designMod = proto?.designModule;
        const sponsorMod = proto?.sponsorCollaboratorsModule;
        const condMod = proto?.conditionsModule;
        const armsMod = proto?.armsInterventionsModule;

        const nctId = idMod?.nctId || '';
        const title = idMod?.briefTitle || 'Clinical Study';
        const briefSummary = (descMod?.briefSummary || '').slice(0, 400);
        const phase = (designMod?.phases || []).join(', ') || 'Phase not specified';
        const status = statusMod?.overallStatus || 'UNKNOWN';
        const conditions = condMod?.conditions || [];
        const interventions = (armsMod?.interventions || []).map((i: any) => i.name);
        const leadSponsor = sponsorMod?.leadSponsor?.name || 'Academic Medical Center';

        return {
          nctId,
          title,
          briefSummary,
          phase,
          status,
          conditions: conditions.slice(0, 4),
          interventions: interventions.slice(0, 4),
          leadSponsor,
          url: `https://clinicaltrials.gov/study/${nctId}`,
        };
      }).filter((s: any) => s.nctId);

      if (studies.length > 0) {
        res.json({
          query: term,
          studies,
          evidenceStatus: 'live-success',
          provenance: {
            engine: 'heuristic',
            usedPrebuiltData: false,
            fallbackUsed: false,
            evidenceStatus: 'live-success',
            retrievalRequested: true,
            claimSupportVerified: false,
          },
        });
        return;
      }
    }
  } catch (err) {
    console.warn('ClinicalTrials.gov live fetch notice, using curated trials:', err);
  }

  // Curated landmark trials catalog
  const CURATED_TRIALS = [
    {
      nctId: 'NCT03057977',
      title: 'EMPEROR-Preserved: Empagliflozin Outcome Trial in Patients With Chronic Heart Failure With Preserved Ejection Fraction',
      briefSummary: 'A Phase III randomized, double-blind study to evaluate the efficacy and safety of empagliflozin 10 mg once daily versus placebo on top of standard therapy in patients with HFpEF.',
      phase: 'Phase 3',
      status: 'COMPLETED',
      conditions: ['Heart Failure with Preserved Ejection Fraction', 'Hypertension'],
      interventions: ['Empagliflozin 10 mg', 'Placebo'],
      leadSponsor: 'Boehringer Ingelheim & Eli Lilly',
      url: 'https://clinicaltrials.gov/study/NCT03057977',
    },
    {
      nctId: 'NCT03619213',
      title: 'DELIVER: Dapagliflozin Evaluation to Improve the LIVEs of Patients With Preserved Ejection Fraction Heart Failure',
      briefSummary: 'Investigates the effect of dapagliflozin 10 mg once daily compared with placebo in reducing cardiovascular death and heart failure events in patients with HFpEF or mildly reduced EF.',
      phase: 'Phase 3',
      status: 'COMPLETED',
      conditions: ['Heart Failure with Preserved Ejection Fraction', 'Cardiovascular Disease'],
      interventions: ['Dapagliflozin 10 mg', 'Placebo'],
      leadSponsor: 'AstraZeneca',
      url: 'https://clinicaltrials.gov/study/NCT03619213',
    },
    {
      nctId: 'NCT01035255',
      title: 'PARADIGM-HF: Prospective Comparison of ARNI With ACEI to Determine Impact on Global Mortality and Morbidity in Heart Failure',
      briefSummary: 'A multi-center, randomized, double-blind, active-controlled trial comparing sacubitril/valsartan (LCZ696) with enalapril in reducing death and hospitalization.',
      phase: 'Phase 3',
      status: 'COMPLETED',
      conditions: ['Heart Failure with Reduced Ejection Fraction', 'HFrEF'],
      interventions: ['Sacubitril/Valsartan 97/103 mg', 'Enalapril 10 mg'],
      leadSponsor: 'Novartis',
      url: 'https://clinicaltrials.gov/study/NCT01035255',
    },
    {
      nctId: 'NCT01206062',
      title: 'SPRINT: Systolic Blood Pressure Intervention Trial',
      briefSummary: 'A landmark randomized trial comparing intensive systolic blood pressure control (<120 mmHg) versus standard control (<140 mmHg) in non-diabetic adults with elevated cardiovascular risk.',
      phase: 'Phase 4',
      status: 'COMPLETED',
      conditions: ['Hypertension', 'Cardiovascular Risk'],
      interventions: ['Intensive BP Control (<120 mmHg)', 'Standard BP Control (<140 mmHg)'],
      leadSponsor: 'National Heart, Lung, and Blood Institute (NHLBI)',
      url: 'https://clinicaltrials.gov/study/NCT01206062',
    },
  ];

  const tLower = term.toLowerCase();
  const matched = CURATED_TRIALS.filter((t) =>
    t.title.toLowerCase().includes(tLower) ||
    t.conditions.some((c) => c.toLowerCase().includes(tLower)) ||
    t.interventions.some((i) => i.toLowerCase().includes(tLower))
  );

  if (matched.length > 0) {
    res.json({
      query: term,
      studies: matched,
      isCuratedFallback: true,
      datasetScope: 'Curated cardiovascular landmark trials catalog',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  } else {
    res.json({
      query: term,
      studies: [],
      status: 'unavailable',
      evidenceStatus: 'unavailable',
      datasetScope: 'No trials matched in curated catalog',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: false,
        fallbackUsed: true,
        evidenceStatus: 'unavailable',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  }
});

// 2. NIH RxNorm Drug Concepts & Identifiers Proxy
app.get('/api/science/rxnorm', async (req: Request, res: Response): Promise<void> => {
  const drug = ((req.query.drug as string) || '').trim();
  if (!drug) {
    res.status(400).json({ error: 'Drug parameter is required' });
    return;
  }

  const fetchFn = getServerFetch();
  try {
    const apiUrl = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(drug)}`;
    const response = await fetchFn(apiUrl);

    if (response.ok) {
      const data = await response.json();
      const groups = data?.drugGroup?.conceptGroup || [];
      const concepts: any[] = [];

      for (const g of groups) {
        const props = g.conceptProperties || [];
        for (const p of props) {
          concepts.push({
            rxcui: p.rxcui,
            name: p.name,
            synonym: p.synonym || '',
            tty: p.tty || g.tty,
          });
        }
      }

      if (concepts.length > 0) {
        res.json({
          query: drug,
          concepts: concepts.slice(0, 10),
          evidenceStatus: 'live-success',
          provenance: {
            engine: 'heuristic',
            usedPrebuiltData: false,
            fallbackUsed: false,
            evidenceStatus: 'live-success',
            retrievalRequested: true,
            claimSupportVerified: false,
          },
        });
        return;
      }
    }
  } catch (err) {
    console.warn('RxNorm live fetch notice, using clinical standard cache:', err);
  }

  // Curated RxCUIs for high-frequency clinical medications
  const RXNORM_CACHE: Record<string, any[]> = {
    lisinopril: [
      { rxcui: '29046', name: 'Lisinopril', tty: 'IN' },
      { rxcui: '314076', name: 'Lisinopril 10 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '314077', name: 'Lisinopril 20 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '206813', name: 'Prinivil', tty: 'BN' },
      { rxcui: '206814', name: 'Zestril', tty: 'BN' },
    ],
    furosemide: [
      { rxcui: '4603', name: 'Furosemide', tty: 'IN' },
      { rxcui: '310430', name: 'Furosemide 20 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '310431', name: 'Furosemide 40 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '202758', name: 'Lasix', tty: 'BN' },
    ],
    atorvastatin: [
      { rxcui: '83367', name: 'Atorvastatin', tty: 'IN' },
      { rxcui: '617314', name: 'Atorvastatin 20 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '617318', name: 'Atorvastatin 40 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '153666', name: 'Lipitor', tty: 'BN' },
    ],
    metformin: [
      { rxcui: '6809', name: 'Metformin', tty: 'IN' },
      { rxcui: '860975', name: 'Metformin hydrochloride 500 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '861007', name: 'Metformin hydrochloride 1000 MG Oral Tablet', tty: 'SCD' },
      { rxcui: '153844', name: 'Glucophage', tty: 'BN' },
    ],
  };

  const key = drug.toLowerCase().split(' ')[0].replace(/[^a-z]/g, '');
  if (RXNORM_CACHE[key]) {
    res.json({
      query: drug,
      concepts: RXNORM_CACHE[key],
      isCuratedFallback: true,
      dataOrigin: 'curated-static',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
    return;
  }

  // Never return fabricated random RxCUIs
  res.status(404).json({
    error: `Drug concept "${drug}" not found in live RxNorm and no curated static record matches this query.`,
    status: 'unavailable',
    evidenceStatus: 'unavailable',
    concepts: [],
    provenance: {
      engine: 'unknown',
      usedPrebuiltData: false,
      fallbackUsed: true,
      evidenceStatus: 'unavailable',
      retrievalRequested: true,
      claimSupportVerified: false,
    },
  });
});

// 3. Europe PMC Open Access Literature Search Proxy
app.get('/api/science/europepmc', async (req: Request, res: Response): Promise<void> => {
  const query = ((req.query.query as string) || '').trim();
  if (!query) {
    res.status(400).json({ error: 'Query parameter is required' });
    return;
  }

  const fetchFn = getServerFetch();
  try {
    const apiUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=6`;
    const response = await fetchFn(apiUrl);

    if (response.ok) {
      const data = await response.json();
      const results = (data?.resultList?.result || []).map((r: any) => ({
        id: r.id,
        source: r.source,
        pmid: r.pmid,
        pmcid: r.pmcid,
        doi: r.doi,
        title: r.title,
        authorString: r.authorString || 'Clinical Investigators',
        journalTitle: r.journalTitle || 'Biomedical Journal',
        pubYear: r.pubYear || '2023',
        citedByCount: r.citedByCount || 0,
        isOpenAccess: r.isOpenAccess === 'Y',
        abstractText: r.abstractText ? r.abstractText.slice(0, 400) : '',
      }));

      if (results.length > 0) {
        res.json({
          query,
          articles: results,
          evidenceStatus: 'live-success',
          provenance: {
            engine: 'heuristic',
            usedPrebuiltData: false,
            fallbackUsed: false,
            evidenceStatus: 'live-success',
            retrievalRequested: true,
            claimSupportVerified: false,
          },
        });
        return;
      }
    }
  } catch (err) {
    console.warn('Europe PMC live fetch notice, using fallback:', err);
  }

  // Curated open-access literature subset
  const CURATED_PMC_ARTICLES = [
    {
      id: 'PMC8579001',
      source: 'MED',
      pmid: '34449189',
      pmcid: 'PMC8579001',
      doi: '10.1056/NEJMoa2107038',
      title: 'Empagliflozin in Heart Failure with a Preserved Ejection Fraction (EMPEROR-Preserved)',
      authorString: 'Anker SD, Butler J, Filippatos G, Ferreira JP, Bocchi E, et al.',
      journalTitle: 'New England Journal of Medicine',
      pubYear: '2021',
      citedByCount: 1420,
      isOpenAccess: true,
      abstractText: 'Empagliflozin reduced the combined risk of cardiovascular death or hospitalization for heart failure in patients with heart failure and a preserved ejection fraction, regardless of the presence or absence of diabetes.',
    },
    {
      id: 'PMC9562110',
      source: 'MED',
      pmid: '36066271',
      pmcid: 'PMC9562110',
      doi: '10.1056/NEJMoa2206286',
      title: 'Dapagliflozin in Heart Failure with Mildly Reduced or Preserved Ejection Fraction',
      authorString: 'Solomon SD, McMurray JJV, Claggett B, de Boer RA, DeMets D, et al.',
      journalTitle: 'New England Journal of Medicine',
      pubYear: '2022',
      citedByCount: 890,
      isOpenAccess: true,
      abstractText: 'Dapagliflozin reduced the composite of worsening heart failure or cardiovascular death in patients with heart failure and a mildly reduced or preserved ejection fraction.',
    },
  ];

  const qLower = query.toLowerCase();
  const matched = CURATED_PMC_ARTICLES.filter((a) =>
    a.title.toLowerCase().includes(qLower) ||
    a.abstractText.toLowerCase().includes(qLower)
  );

  if (matched.length > 0) {
    res.json({
      query,
      articles: matched,
      isCuratedFallback: true,
      datasetScope: 'Curated SGLT2 in heart failure open-access literature',
      evidenceStatus: 'curated-fallback',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: true,
        fallbackUsed: false,
        evidenceStatus: 'curated-fallback',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  } else {
    res.json({
      query,
      articles: [],
      status: 'unavailable',
      evidenceStatus: 'unavailable',
      datasetScope: 'No articles matched in curated literature catalog',
      provenance: {
        engine: 'heuristic',
        usedPrebuiltData: false,
        fallbackUsed: true,
        evidenceStatus: 'unavailable',
        retrievalRequested: true,
        claimSupportVerified: false,
      },
    });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(apiKey),
    isGeminiAvailable: isGeminiAvailable(),
    cooldownRemainingMs: Math.max(0, geminiCooldownUntil - Date.now()),
  });
});

// Mount Vite or serve production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const server = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CuraDoc AI server running on port ${PORT} (prod=${isProd})`);
  });
  return server;
}

export { startServer };
const isTestMode = Boolean(
  process.env.SKIP_SERVER_LISTEN ||
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('test'))
);
if (!isTestMode) {
  startServer();
}
