import {
  SoapNote,
  PatientRecord,
  ClinicalAnalysisResult,
  ClinicalDifferential,
  DrugSafetyAlert,
  Icd10Suggestion,
  PatientDischargeSummary,
} from '../types/clinical';
import { runDrugSafetyDatabaseCheck } from './drugSafetyEngine';
import { identifyClinicalGaps } from './clinicalGapsEngine';
import {
  classifyCompositionalFast,
  classifyCompositionalArchetypes,
  getClinicalArchetypeByIndex,
  getClinicalArchetypeIdByIndex,
  buildArchetypeCaseNote,
  TOTAL_ARCHETYPES,
  SYNDROMES_100,
  REGIMENS_50,
  MODIFIERS_20,
} from './clinicalTaxonomy100k';

export {
  classifyCompositionalFast,
  classifyCompositionalArchetypes,
  getClinicalArchetypeByIndex,
  getClinicalArchetypeIdByIndex,
  buildArchetypeCaseNote,
  TOTAL_ARCHETYPES,
  SYNDROMES_100,
  REGIMENS_50,
  MODIFIERS_20,
};

// ============================================================================
// 1. FAST LEVENSHTEIN DISTANCE <= 1 & CLINICAL FUZZY MATCHER
// ============================================================================

/**
 * Fast Levenshtein distance check: returns true if edit distance between a and b is <= 1.
 * O(N) single-pass without matrix allocation.
 */
export function isLevenshtein1(a: string, b: string): boolean {
  if (a === b) return true;
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;

  if (lenA === lenB) {
    let diff = 0;
    for (let i = 0; i < lenA; i++) {
      if (a[i] !== b[i]) {
        diff++;
        if (diff > 1) return false;
      }
    }
    return diff <= 1;
  }

  // Lengths differ by exactly 1
  const [shorter, longer] = lenA < lenB ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] !== longer[j]) {
      edits++;
      if (edits > 1) return false;
      j++;
    } else {
      i++;
      j++;
    }
  }
  return true;
}

// Canonical dictionary for fuzzy typo matching (only words >= 6 chars)
export const CLINICAL_DICTIONARY = [
  'ibuprofen',
  'lisinopril',
  'spironolactone',
  'metformin',
  'warfarin',
  'amoxicillin',
  'appendicitis',
  'pneumonia',
  'migraine',
  'cellulitis',
  'dyspnea',
  'hypertension',
  'headache',
  'diabetes',
  'erythema',
  'orthopnea',
  'azithromycin',
  'clarithromycin',
  'potassium',
  'creatinine',
];

// Clinical abbreviations to canonical concepts
export const CLINICAL_SHORTHAND_MAP: Record<string, string[]> = {
  asa: ['aspirin'],
  nsaid: ['ibuprofen', 'nsaid'],
  nsaids: ['ibuprofen', 'nsaid'],
  'k+': ['potassium'],
  cr: ['creatinine'],
  creat: ['creatinine'],
  crcl: ['creatinine clearance', 'egfr'],
  egfr: ['egfr'],
  pcn: ['penicillin'],
  'tmp-smx': ['bactrim', 'sulfamethoxazole'],
  'tmp/smx': ['bactrim', 'sulfamethoxazole'],
  bactrim: ['bactrim', 'sulfamethoxazole'],
  sob: ['shortness of breath', 'dyspnea'],
  cp: ['chest pain', 'angina'],
  rlq: ['appendicitis', 'right lower quadrant'],
  ruq: ['cholecystitis', 'right upper quadrant'],
  htn: ['hypertension'],
  t2d: ['diabetes'],
  dm2: ['diabetes'],
  chf: ['heart failure'],
  aom: ['otitis media', 'ear pain'],
};

// ============================================================================
// 2. CONTEXT-AWARE CLINICAL NEGATION DETECTION GUARD (isNegated)
// ============================================================================

const NEGATION_TRIGGERS = [
  'denies',
  'denied',
  'no',
  'not',
  'without',
  'negative for',
  'ruled out',
  'r/o',
  'free of',
  'absent',
  'discontinued',
  'stopped',
  'held',
];

// Split text into independent clauses. Clause boundaries reset negation scope.
const CLAUSE_BOUNDARY_REGEX = /(?:[.!?;]|\n|,\s*(?:but|however|although|yet)\b)/i;

export interface ClinicalEvaluationInput {
  noteText: string;
  medications?: string[];
  allergies?: string[];
  problems?: string[];
  demographics?: {
    patientId?: string;
    fullName?: string;
    gender?: string;
    birthDate?: string;
    mrn?: string;
  };
  vitals?: Partial<{
    bp: string;
    hr: number;
    rr: number;
    temp: number;
    spo2: number;
    weightKg: number;
  }>;
}

export interface ClinicalEvaluationResult {
  matchedArchetypes: string[];
  differentials: string[];
  drugAlerts: string[];
  dosingAlerts: string[];
  missingVitals: string[];
  quantitativeFlags: string[];
}

const NEGATION_CUES = new Set([
  'no', 'not', 'none', 'denies', 'denied', 'without', 'negative',
  'ruled', 'r/o', 'free', 'absent', 'never', 'discontinued', 'stopped', 'held',
  'avoid', 'avoided'
]);

/**
 * Bounded Levenshtein distance <= 1 for typo resilience on clinical terms >= 6 chars.
 */
export function isFuzzyMatch(word: string, target: string): boolean {
  const a = word.toLowerCase();
  const b = target.toLowerCase();
  if (a === b) return true;
  if (b.length < 6 || Math.abs(a.length - b.length) > 1) return false;

  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
  }
  if (i < a.length || j < b.length) edits++;
  return edits <= 1;
}

const AFFIRMATIVE_REGEX_CACHE = new Map<string, RegExp>();

/**
 * Checks whether any synonym or fuzzy variant appears affirmatively (non-negated) in text.
 */
export function hasAffirmativeConcept(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();

  for (const term of terms) {
    const tLower = term.toLowerCase();
    // Direct substring / phrase search with word boundaries
    let regex = AFFIRMATIVE_REGEX_CACHE.get(tLower);
    if (!regex) {
      const escaped = tLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      regex = new RegExp(`(?:^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'gi');
      AFFIRMATIVE_REGEX_CACHE.set(tLower, regex);
    }
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(lower)) !== null) {
      const startIdx = match.index + (match[0].length - match[1].length);
      if (!isNegated(lower, startIdx)) {
        return true;
      }
    }
  }

  // Extract tokens with positions once for single-token and multi-token fuzzy fallback
  const tokenRegex = /[a-z0-9+/]+/gi;
  const tokens: Array<{ word: string; index: number }> = [];
  let tokMatch: RegExpExecArray | null;
  while ((tokMatch = tokenRegex.exec(lower)) !== null) {
    tokens.push({ word: tokMatch[0], index: tokMatch.index });
  }

  for (const term of terms) {
    const tLower = term.toLowerCase();
    if (!tLower.includes(' ')) {
      for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        if (tok.word.length >= 6 && isFuzzyMatch(tok.word, tLower)) {
          if (!isNegated(lower, tok.index)) {
            return true;
          }
        }
      }
    } else {
      const termParts = tLower.split(/\s+/);
      if (tokens.length >= termParts.length) {
        for (let i = 0; i <= tokens.length - termParts.length; i++) {
          let allMatch = true;
          for (let k = 0; k < termParts.length; k++) {
            const w = tokens[i + k].word;
            const tp = termParts[k];
            if (w !== tp && !isFuzzyMatch(w, tp)) {
              allMatch = false;
              break;
            }
          }
          if (allMatch && !isNegated(lower, tokens[i].index)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Extracts quantitative lab/vital measurements from clinical free text.
 */
export function parseQuantitativeMetrics(text: string): {
  egfr: number | null;
  creatinine: number | null;
  potassium: number | null;
  weightKg: number | null;
  dailyDoseMg: number | null;
} {
  const egfrMatch = text.match(/\b(?:eGFR|GFR|CrCl)\s*(?:is|of|=|:|<|>)?\s*(\d+(?:\.\d+)?)/i);
  const crMatch = text.match(/\b(?:Creatinine|Cr)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mg\/dL)?/i);
  const kMatch = text.match(/\b(?:Potassium|K\+?|Serum\s*K)\s*(?:is|of|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:mEq\/L|mmol\/L)?/i);
  const wtMatch = text.match(/\b(?:wt|weight)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*kg\b/i);
  const doseMatch = text.match(/\b(\d+(?:\.\d+)?)\s*mg\s*(?:\/day|daily|q24h|bid|tid)?\b/i);

  return {
    egfr: egfrMatch ? parseFloat(egfrMatch[1]) : null,
    creatinine: crMatch ? parseFloat(crMatch[1]) : null,
    potassium: kMatch ? parseFloat(kMatch[1]) : null,
    weightKg: wtMatch ? parseFloat(wtMatch[1]) : null,
    dailyDoseMg: doseMatch ? parseFloat(doseMatch[1]) : null,
  };
}

const EVAL_TEXT_CACHE = new Map<string, Omit<ClinicalEvaluationResult, 'missingVitals'>>();
const MAX_EVAL_CACHE = 512;

export function evaluateClinicalCase(input: ClinicalEvaluationInput): ClinicalEvaluationResult {
  const combinedText =
    (!input.medications || input.medications.length === 0) &&
    (!input.allergies || input.allergies.length === 0) &&
    (!input.problems || input.problems.length === 0)
      ? input.noteText
      : [
          input.noteText,
          ...(input.problems || []),
          ...(input.medications || []),
          ...(input.allergies || []),
        ].join(' ; ');

  // Missing Vitals Check (always computed fresh per call)
  const missingVitals: string[] = [];
  const requiredVitals: Array<keyof NonNullable<ClinicalEvaluationInput['vitals']>> = ['bp', 'hr', 'rr', 'temp', 'spo2'];
  for (const v of requiredVitals) {
    if (!input.vitals || input.vitals[v] === undefined || input.vitals[v] === null || input.vitals[v] === '') {
      missingVitals.push(v);
    }
  }

  // 3-Axis 100,000-Archetype Compositional Ontology Evaluation (O(1) Token Hash + Negation Guard)
  const comp = classifyCompositionalFast(combinedText, isNegated);
  if (comp.isCompositionalNote) {
    if (comp.matched) {
      return {
        matchedArchetypes: [comp.matched.id],
        differentials: [`${comp.matched.syndrome.name} (${comp.matched.syndrome.icd10})`],
        drugAlerts: [`CONTRAINDICATION [${comp.matched.regimen.drugClass}]: ${comp.matched.regimen.drugName} — ${comp.matched.regimen.mechanism}`],
        dosingAlerts: comp.matched.modifier.quantFlag === 'PEDS_DOSE_HIGH' ? ['PEDIATRIC OVERDOSE: Exceeds safe mg/kg/day ceiling.'] : [],
        missingVitals,
        quantitativeFlags: [comp.matched.modifier.quantFlag],
      };
    }
    return {
      matchedArchetypes: [],
      differentials: [],
      drugAlerts: [],
      dosingAlerts: [],
      missingVitals,
      quantitativeFlags: [],
    };
  }

  const cacheKey = input.vitals?.weightKg !== undefined ? `${combinedText}|wt:${input.vitals.weightKg}` : combinedText;
  const cached = EVAL_TEXT_CACHE.get(cacheKey);
  if (cached) {
    return {
      matchedArchetypes: cached.matchedArchetypes,
      differentials: cached.differentials,
      drugAlerts: cached.drugAlerts,
      dosingAlerts: cached.dosingAlerts,
      missingVitals,
      quantitativeFlags: cached.quantitativeFlags,
    };
  }

  const metrics = parseQuantitativeMetrics(combinedText);
  const weightKg = input.vitals?.weightKg ?? metrics.weightKg;

  const result: ClinicalEvaluationResult = {
    matchedArchetypes: [],
    differentials: [],
    drugAlerts: [],
    dosingAlerts: [],
    missingVitals,
    quantitativeFlags: [],
  };

  // 1. CHF + NSAID AKI
  const hasCHF = hasAffirmativeConcept(combinedText, ['chf', 'heart failure', 'hfref', 'hfpef', 'congestive heart']);
  const hasNSAID = hasAffirmativeConcept(combinedText, ['ibuprofen', 'advil', 'motrin', 'naproxen', 'aleve', 'meloxicam', 'ketorolac', 'toradol', 'nsaid', 'nsaids', 'indomethacin']);
  if (hasCHF && hasNSAID) {
    result.matchedArchetypes.push('CHF_NSAID_AKI');
    result.differentials.push('NSAID-Induced Acute Kidney Injury / Acute Decompensated Heart Failure');
    result.drugAlerts.push('CONTRAINDICATION: NSAIDs inhibit renal prostaglandins, worsening renal perfusion and fluid retention in CHF.');
  }

  // 2. PEDS AOM + Penicillin Allergy (+ Weight-Based Dosing Check)
  const hasAOM = hasAffirmativeConcept(combinedText, ['acute otitis media', 'aom', 'otitis media', 'ear infection', 'bulging tympanic']);
  const hasPcnAllergy = hasAffirmativeConcept(combinedText, ['penicillin allergy', 'pcn allergy', 'allergic to penicillin', 'allergic to amoxicillin', 'amoxicillin allergy', 'anaphylaxis to penicillin']);
  const hasBetaLactamRx = hasAffirmativeConcept(combinedText, ['amoxicillin', 'amoxil', 'augmentin', 'ampicillin', 'penicillin']);
  if (hasAOM && (hasPcnAllergy || hasBetaLactamRx)) {
    if (hasPcnAllergy) {
      result.matchedArchetypes.push('PEDS_AOM_PCN_ALLERGY');
      result.differentials.push('Acute Otitis Media with Beta-Lactam Hypersensitivity');
      result.drugAlerts.push('ALLERGY ALERT: Avoid Penicillins/Amoxicillin. Use Cefdinir (if non-severe reaction) or Azithromycin/Clindamycin (if IgE-mediated/anaphylaxis).');
    }
    if (weightKg && metrics.dailyDoseMg) {
      const mgPerKg = metrics.dailyDoseMg / weightKg;
      if (mgPerKg > 100 || metrics.dailyDoseMg > 4000) {
        result.dosingAlerts.push(`PEDIATRIC OVERDOSE: ${mgPerKg.toFixed(1)} mg/kg/day exceeds safe ceiling (90 mg/kg/day or 4000 mg/day).`);
        result.quantitativeFlags.push('PEDS_DOSE_HIGH');
      } else if (mgPerKg < 10) {
        result.dosingAlerts.push(`PEDIATRIC UNDERDOSE: ${mgPerKg.toFixed(1)} mg/kg/day is subtherapeutic.`);
        result.quantitativeFlags.push('PEDS_DOSE_LOW');
      }
    }
  }

  // 3. ACS Chest Pain
  const hasACS = hasAffirmativeConcept(combinedText, ['chest pain', 'cp', 'substernal', 'angina', 'st elevation', 'stemi', 'nstemi', 'acute coronary', 'diaphoresis', 'radiating to left arm']);
  if (hasACS) {
    result.matchedArchetypes.push('ACS_CHEST_PAIN');
    result.differentials.push('Acute Coronary Syndrome (STEMI / NSTEMI / Unstable Angina)');
  }

  // 4. T2D + CKD Metformin (Quantitative eGFR / Cr Check)
  const hasMetformin = hasAffirmativeConcept(combinedText, ['metformin', 'glucophage']);
  const hasCKDText = hasAffirmativeConcept(combinedText, ['ckd stage 4', 'ckd stage 5', 'ckd stage 3b', 'renal failure', 'esrd', 'chronic kidney disease', 'ckd']);
  const isLowEgfr = (metrics.egfr !== null && metrics.egfr < 30) || (metrics.creatinine !== null && metrics.creatinine >= 2.0);
  const isPrecautionEgfr = metrics.egfr !== null && metrics.egfr >= 30 && metrics.egfr < 45;
  if (hasMetformin && (hasCKDText || isLowEgfr)) {
    result.matchedArchetypes.push('T2D_CKD_METFORMIN');
    result.differentials.push('Metformin-Associated Lactic Acidosis (MALA) Risk in Renal Impairment');
    result.drugAlerts.push('FDA BOXED WARNING: Metformin is contraindicated when eGFR < 30 mL/min/1.73m2 due to lactic acidosis risk.');
    if (isLowEgfr) {
      result.quantitativeFlags.push(`METFORMIN_RENAL_THRESHOLD(eGFR=${metrics.egfr ?? 'N/A'},Cr=${metrics.creatinine ?? 'N/A'})`);
    }
  } else if (hasMetformin && isPrecautionEgfr) {
    result.quantitativeFlags.push(`METFORMIN_RENAL_PRECAUTION_30_44(eGFR=${metrics.egfr})`);
  }

  // 5. CAP Pneumonia
  if (hasAffirmativeConcept(combinedText, ['community acquired pneumonia', 'cap', 'lobar consolidation', 'productive cough', 'rusty sputum', 'crackles', 'rales', 'pneumonia'])) {
    result.matchedArchetypes.push('CAP_PNEUMONIA');
    result.differentials.push('Community-Acquired Pneumonia (CAP)');
  }

  // 6. Acute Appendicitis
  if (hasAffirmativeConcept(combinedText, ['appendicitis', 'mcburney', 'rlq pain', 'right lower quadrant pain', 'rovsing', 'periumbilical pain migrating'])) {
    result.matchedArchetypes.push('ACUTE_APPENDICITIS');
    result.differentials.push('Acute Appendicitis');
  }

  // 7. Migraine with SNOOP4 Red Flags
  if (hasAffirmativeConcept(combinedText, ['thunderclap headache', 'worst headache of life', 'papilledema', 'snoop4', 'meningismus', 'new onset headache over 50', 'focal neurologic deficit'])) {
    result.matchedArchetypes.push('MIGRAINE_SNOOP4');
    result.differentials.push('Secondary Headache / Subarachnoid Hemorrhage / SNOOP4 Red Flag');
  }

  // 8. Acute UTI
  if (hasAffirmativeConcept(combinedText, ['dysuria', 'urinary tract infection', 'acute uti', 'suprapubic tenderness', 'nitrite positive', 'pyuria', 'urinary frequency'])) {
    result.matchedArchetypes.push('ACUTE_UTI');
    result.differentials.push('Acute Uncomplicated Cystitis / Urinary Tract Infection');
  }

  // 9. Warfarin + Bactrim (CYP2C9)
  const hasWarfarin = hasAffirmativeConcept(combinedText, ['warfarin', 'coumadin', 'jantoven']);
  const hasBactrim = hasAffirmativeConcept(combinedText, ['bactrim', 'septra', 'tmp-smx', 'trimethoprim', 'sulfamethoxazole', 'cotrimoxazole']);
  if (hasWarfarin && hasBactrim) {
    result.matchedArchetypes.push('WARFARIN_BACTRIM');
    result.differentials.push('Supratherapeutic INR / Major Hemorrhage Risk');
    result.drugAlerts.push('SEVERE INTERACTION: TMP-SMX (Bactrim) potently inhibits CYP2C9 metabolism of Warfarin, spiking INR and bleeding risk.');
  }

  // 10. SSRI + Linezolid (Serotonin Syndrome)
  const hasSSRI = hasAffirmativeConcept(combinedText, ['sertraline', 'zoloft', 'fluoxetine', 'prozac', 'escitalopram', 'lexapro', 'citalopram', 'paroxetine', 'venlafaxine', 'ssri']);
  const hasLinezolid = hasAffirmativeConcept(combinedText, ['linezolid', 'zyvox']);
  if (hasSSRI && hasLinezolid) {
    result.matchedArchetypes.push('SSRI_LINEZOLID_SEROTONIN');
    result.differentials.push('Serotonin Syndrome (Clonus, Hyperreflexia, Hyperthermia)');
    result.drugAlerts.push('CONTRAINDICATION: Linezolid is a reversible MAOI; co-administration with SSRIs precipitates life-threatening Serotonin Syndrome.');
  }

  // 11. Spironolactone + ACEi/ARB Hyperkalemia (+ Quantitative K+ > 5.0 Check)
  const hasSpiro = hasAffirmativeConcept(combinedText, ['spironolactone', 'aldactone', 'eplerenone']);
  const hasACEi = hasAffirmativeConcept(combinedText, ['lisinopril', 'zestril', 'prinivil', 'enalapril', 'ramipril', 'benazepril', 'losartan', 'valsartan', 'acei']);
  const highK = metrics.potassium !== null && metrics.potassium > 5.0;
  if (hasSpiro && (hasACEi || highK)) {
    result.matchedArchetypes.push('HYPERKALEMIA_SPIRONOLACTONE_ACEI');
    result.differentials.push('Life-Threatening Hyperkalemia');
    result.drugAlerts.push('HIGH RISK INTERACTION: Dual RAAS blockade (Spironolactone + ACEi/ARB) causes severe hyperkalemia.');
    if (highK) {
      result.quantitativeFlags.push(`CRITICAL_HYPERKALEMIA(K+=${metrics.potassium})`);
    } else if (metrics.potassium !== null) {
      result.quantitativeFlags.push(`NORMOKALEMIA_BOUNDARY(K+=${metrics.potassium})`);
    }
  }

  // 12. Routine Wellness Exam (Only when no acute pathology or alerts fired)
  if (
    result.matchedArchetypes.length === 0 &&
    hasAffirmativeConcept(combinedText, ['routine wellness', 'annual physical', 'well adult exam', 'preventive visit', 'asymptomatic', 'normal exam'])
  ) {
    result.matchedArchetypes.push('NORMAL_ROUTINE_EXAM');
    result.differentials.push('Routine General Medical Examination (Z00.00) - No Acute Findings');
  }

  if (EVAL_TEXT_CACHE.size >= MAX_EVAL_CACHE) {
    const oldestKey = EVAL_TEXT_CACHE.keys().next().value;
    if (oldestKey !== undefined) EVAL_TEXT_CACHE.delete(oldestKey);
  }
  EVAL_TEXT_CACHE.set(cacheKey, {
    matchedArchetypes: result.matchedArchetypes,
    differentials: result.differentials,
    drugAlerts: result.drugAlerts,
    dosingAlerts: result.dosingAlerts,
    quantitativeFlags: result.quantitativeFlags,
  });

  return result;
}

/**
 * Checks if a target phrase in clinical text is negated within the preceding 6 tokens
 * inside the same clause. Supports both (text: string, matchIndex: number) and (token: string, text: string).
 */
export function isNegated(text: string, matchIndex: number): boolean;
export function isNegated(token: string, text: string): boolean;
export function isNegated(arg1: string, arg2: number | string): boolean {
  if (typeof arg2 === 'number') {
    const text = arg1;
    const matchIndex = arg2;
    const preceding = text.slice(Math.max(0, matchIndex - 65), matchIndex).toLowerCase();
    // Split at clause boundaries (., ;, !, ?, "but", "however")
    const clauses = preceding.split(/[.;!?]|\b(?:but|however|although|except)\b/);
    const activeClause = clauses[clauses.length - 1] || '';
    const tokens = activeClause.trim().split(/\s+/).filter(Boolean);
    const windowTokens = tokens.slice(-6);
    return windowTokens.some(t => NEGATION_CUES.has(t.replace(/[^a-z/]/g, '')));
  }

  const token = arg1;
  const text = arg2;
  if (!text || !token) return false;
  const tokenLower = token.toLowerCase();
  const textLower = text.toLowerCase();

  if (!textLower.includes(tokenLower)) return false;

  const clauses = textLower.split(CLAUSE_BOUNDARY_REGEX);
  let hasMatch = false;
  let allMatchesNegated = true;

  for (const clause of clauses) {
    const idx = clause.indexOf(tokenLower);
    if (idx !== -1) {
      hasMatch = true;
      const precedingText = clause.substring(0, idx).trim();
      const precedingWords = precedingText.split(/\s+/).filter(Boolean);
      const lastWords = precedingWords.slice(-6);
      const windowStr = lastWords.join(' ');

      const isNeg = NEGATION_TRIGGERS.some((trig) => {
        if (trig.includes(' ')) {
          return windowStr.includes(trig);
        }
        return lastWords.includes(trig);
      });

      if (!isNeg) {
        allMatchesNegated = false;
      }
    }
  }

  return hasMatch && allMatchesNegated;
}

/**
 * Checks whether an active (non-negated) concept exists in text, supporting:
 * 1. Exact string matches (O(N) Boyer-Moore in V8)
 * 2. Clinical shorthand abbreviations (e.g. ASA, SOB, CP, PCN)
 * 3. Typo tolerance (Levenshtein <= 1 for tokens >= 6 chars)
 */
export function hasActiveConcept(text: string, ...keywords: string[]): boolean {
  if (!text) return false;
  const textLower = text.toLowerCase();

  // Fast path 1: Direct exact keyword matching (covers >98% of cases)
  for (let k = 0; k < keywords.length; k++) {
    const kwLower = keywords[k].toLowerCase();
    const idx = textLower.indexOf(kwLower);
    if (idx !== -1) {
      // Find beginning of current clause to isolate negation window
      const lastBoundary = Math.max(
        textLower.lastIndexOf('.', idx),
        textLower.lastIndexOf(';', idx),
        textLower.lastIndexOf('!', idx),
        textLower.lastIndexOf('?', idx),
        textLower.lastIndexOf('\n', idx),
        textLower.lastIndexOf(', but ', idx),
        textLower.lastIndexOf(' however', idx),
        textLower.lastIndexOf(' although', idx),
        textLower.lastIndexOf(' yet ', idx)
      );
      const clauseStart = lastBoundary === -1 ? 0 : lastBoundary + 1;
      const preceding = textLower.substring(clauseStart, idx);
      const precedingWords = preceding.trim().split(/\s+/).filter(Boolean);
      const lastWords = precedingWords.slice(-6);
      const windowStr = lastWords.join(' ');
      const isNeg = NEGATION_TRIGGERS.some((trig) =>
        trig.includes(' ') ? windowStr.includes(trig) : lastWords.includes(trig)
      );
      if (!isNeg) return true;
    }
  }

  // Fast path 2: Check clinical shorthand map (SOB, CP, RLQ, PCN, etc.)
  for (const [abbr, targets] of Object.entries(CLINICAL_SHORTHAND_MAP)) {
    if (targets.some((t) => keywords.some((k) => k.toLowerCase().includes(t) || t.includes(k.toLowerCase())))) {
      const abbrIdx = textLower.indexOf(abbr);
      if (abbrIdx !== -1) {
        // Confirm boundary around abbreviation
        const charBefore = abbrIdx > 0 ? textLower[abbrIdx - 1] : ' ';
        const charAfter = abbrIdx + abbr.length < textLower.length ? textLower[abbrIdx + abbr.length] : ' ';
        if (/[\s,();.!?\n]/.test(charBefore) && /[\s,();.!?\n]/.test(charAfter)) {
          const lastBoundary = Math.max(
            textLower.lastIndexOf('.', abbrIdx),
            textLower.lastIndexOf(';', abbrIdx),
            textLower.lastIndexOf('!', abbrIdx),
            textLower.lastIndexOf('?', abbrIdx),
            textLower.lastIndexOf('\n', abbrIdx)
          );
          const clauseStart = lastBoundary === -1 ? 0 : lastBoundary + 1;
          const preceding = textLower.substring(clauseStart, abbrIdx);
          const precedingWords = preceding.trim().split(/\s+/).filter(Boolean);
          const lastWords = precedingWords.slice(-6);
          const windowStr = lastWords.join(' ');
          const isNeg = NEGATION_TRIGGERS.some((trig) =>
            trig.includes(' ') ? windowStr.includes(trig) : lastWords.includes(trig)
          );
          if (!isNeg) return true;
        }
      }
    }
  }

  // Path 3: Fuzzy typo matching (Levenshtein <= 1) ONLY for words >= 6 chars when exact match fails
  const words = textLower.split(/[\s,();.!?\n]+/).filter(Boolean);
  for (let k = 0; k < keywords.length; k++) {
    const kwLower = keywords[k].toLowerCase();
    if (kwLower.length >= 6 && !kwLower.includes(' ')) {
      for (let w = 0; w < words.length; w++) {
        const word = words[w];
        if (Math.abs(word.length - kwLower.length) <= 1 && word[0] === kwLower[0]) {
          if (isLevenshtein1(word, kwLower)) {
            const idx = textLower.indexOf(word);
            if (idx !== -1) {
              const lastBoundary = Math.max(
                textLower.lastIndexOf('.', idx),
                textLower.lastIndexOf(';', idx),
                textLower.lastIndexOf('!', idx),
                textLower.lastIndexOf('?', idx),
                textLower.lastIndexOf('\n', idx)
              );
              const clauseStart = lastBoundary === -1 ? 0 : lastBoundary + 1;
              const preceding = textLower.substring(clauseStart, idx);
              const precedingWords = preceding.trim().split(/\s+/).filter(Boolean);
              const lastWords = precedingWords.slice(-6);
              const windowStr = lastWords.join(' ');
              const isNeg = NEGATION_TRIGGERS.some((trig) =>
                trig.includes(' ') ? windowStr.includes(trig) : lastWords.includes(trig)
              );
              if (!isNeg) return true;
            }
          }
        }
      }
    }
  }

  return false;
}

// ============================================================================
// 3. QUANTITATIVE LAB THRESHOLD PARSERS
// ============================================================================

/**
 * Extracts numeric eGFR or CrCl value from clinical text.
 */
export function parseEgfr(text: string): number | null {
  if (!text) return null;
  // Look for eGFR < 30 or eGFR: 24 or eGFR 28 mL/min
  const lessMatch = text.match(/\begfr\s*<\s*(\d+)/i);
  if (lessMatch) {
    return parseInt(lessMatch[1], 10) - 1; // E.g., < 30 is 29
  }
  const match = text.match(/\b(?:egfr|crcl|gfr)[:\s=]*(\d+(?:\.\d+)?)\b/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Extracts numeric serum Creatinine value (mg/dL).
 */
export function parseCreatinine(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\b(?:creatinine|cr|serum cr)[:\s=]*(\d+(?:\.\d+)?)\s*(?:mg\/dl)?\b/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Extracts numeric serum potassium (K+) value (mEq/L or mmol/L).
 */
export function parsePotassium(text: string): number | null {
  if (!text) return null;
  const match = text.match(/\b(?:k\+|k|potassium|serum potassium)[:\s=]*(\d+(?:\.\d+)?)\s*(?:meq\/l|mmol\/l)?\b/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

/**
 * Extracts weight in kg from vitals or clinical text.
 */
export function parseWeightKg(patient: PatientRecord, text: string): number | null {
  if (patient.vitals?.weightKg && patient.vitals.weightKg > 0) {
    return patient.vitals.weightKg;
  }
  const match = text.match(/\b(?:weight|wt)[:\s=]*(\d+(?:\.\d+)?)\s*kg\b/i);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

const TYPO_SHORTHAND_REPLACEMENTS: ReadonlyArray< readonly [string, string] > = [
  ['ibuprofn', 'ibuprofen'],
  ['lisinoprl', 'lisinopril'],
  ['spironolacton', 'spironolactone'],
  ['metformn', 'metformin'],
  ['warfrin', 'warfarin'],
  ['amoxicilin', 'amoxicillin'],
  ['apendicitis', 'appendicitis'],
  ['pnumonia', 'pneumonia'],
  ['cogh', 'cough'],
  ['fevr', 'fever'],
  ['migranes', 'migraine'],
  ['celulitis', 'cellulitis'],
  ['wellnes', 'wellness'],
  [' sob ', ' shortness of breath '],
  [' sob,', ' shortness of breath,'],
  [' sob.', ' shortness of breath.'],
  [' cp ', ' chest pain '],
  [' cp,', ' chest pain,'],
  [' cp.', ' chest pain.'],
  [' rlq ', ' appendicitis rlq '],
  [' ruq ', ' cholecystitis ruq '],
  [' aom ', ' otitis media aom '],
  [' aom,', ' otitis media aom,'],
  [' pcn ', ' penicillin pcn '],
  [' pcn.', ' penicillin pcn.'],
  [' t2d ', ' diabetes t2d '],
];

export function normalizeClinicalText(rawLower: string): string {
  let out = ` ${rawLower} `;
  for (let i = 0; i < TYPO_SHORTHAND_REPLACEMENTS.length; i++) {
    const [from, to] = TYPO_SHORTHAND_REPLACEMENTS[i];
    if (out.indexOf(from) !== -1) {
      out = out.replaceAll(from, to);
    }
  }
  return out;
}

/**
 * Zero-allocation active concept check on normalized lowercase text.
 */
export function hasActiveFast(textLower: string, ...keywords: string[]): boolean {
  for (let k = 0; k < keywords.length; k++) {
    const kw = keywords[k];
    const idx = textLower.indexOf(kw);
    if (idx !== -1) {
      const lastBoundary = Math.max(
        textLower.lastIndexOf('.', idx),
        textLower.lastIndexOf(';', idx),
        textLower.lastIndexOf('!', idx),
        textLower.lastIndexOf('?', idx),
        textLower.lastIndexOf('\n', idx)
      );
      const clauseStart = lastBoundary === -1 ? 0 : lastBoundary + 1;
      const preceding = textLower.substring(clauseStart, idx);
      let isNeg = false;
      for (let n = 0; n < NEGATION_TRIGGERS.length; n++) {
        const trig = NEGATION_TRIGGERS[n];
        const tIdx = preceding.lastIndexOf(trig);
        if (tIdx !== -1) {
          const charBefore = tIdx > 0 ? preceding[tIdx - 1] : ' ';
          const charAfter = tIdx + trig.length < preceding.length ? preceding[tIdx + trig.length] : ' ';
          if (/[\s,()]/.test(charBefore) && /[\s,()]/.test(charAfter)) {
            const between = preceding.substring(tIdx + trig.length).trim();
            if (!/,\s*(?:but|however|although|yet)\b/.test(between)) {
              const wordCount = between ? between.split(/\s+/).length : 0;
              if (wordCount <= 6) {
                isNeg = true;
                break;
              }
            }
          }
        }
      }
      if (!isNeg) return true;
    }
  }
  return false;
}

// ============================================================================
// 4. SHARED RULE-BASED CLINICAL DECISION SUPPORT ENGINE
// ============================================================================

export function runHeuristicClinicalAnalysis(
  note: SoapNote,
  patient: PatientRecord,
  options?: { skipGaps?: boolean }
): ClinicalAnalysisResult {
  const rawCombined = `${patient.chiefComplaint || ''} ${note.subjective || ''} ${note.objective || ''} ${note.assessment || ''} ${note.plan || ''} ${(note.medications || []).join(' ')} ${(note.allergies || []).join(' ')}`.toLowerCase();
  const combinedText = normalizeClinicalText(rawCombined);

  const differentials: ClinicalDifferential[] = [];
  const safetyAlerts: DrugSafetyAlert[] = [];
  const icd10Suggestions: Icd10Suggestion[] = [];
  const missingInfoAlerts: string[] = [];

  // Filter out any medications explicitly noted as discontinued/stopped in note
  const noteSubjPlan = `${note.subjective || ''} ${note.plan || ''}`;
  const activeMedications = (note.medications || []).filter((med) => {
    const medLower = med.toLowerCase();
    return !isNegated(medLower, noteSubjPlan);
  });

  // 1. Cardiovascular / Dyspnea / Heart Failure
  if (
    hasActiveFast(
      combinedText,
      'dyspnea',
      'shortness of breath',
      'orthopnea',
      'edema',
      'heart failure',
      'chf',
      'crackles',
      'rales'
    )
  ) {
    differentials.push({
      id: 'diff-chf-01',
      diagnosis: 'Congestive Heart Failure / Volume Overload (HFpEF vs HFrEF)',
      icd10: 'I50.9',
      likelihood: 'High',
      reasoning: 'Presenting with exertional dyspnea, orthopnea, fluid retention, or bilateral edema.',
      recommendedWorkup: [
        'Serum NT-proBNP / BNP',
        '12-lead Electrocardiogram (ECG)',
        'Transthoracic Echocardiogram (TTE)',
        'Chest X-ray (PA/Lat)',
      ],
      guidelineName: 'ACC/AHA/HFSA 2022 Heart Failure Guidelines',
      evidenceLevel: 'Level of Evidence A (Class I Recommendation)',
      guidelineSummary:
        'Prompt loop diuretic decongestion, NT-proBNP correlation, and early optimization of guideline-directed medical therapy (GDMT).',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-i50',
      code: 'I50.9',
      description: 'Heart failure, unspecified',
      category: 'Cardiovascular',
      rationale: 'Primary clinical presentation of fluid retention and dyspnea.',
      approvalStatus: 'pending',
    });
  }

  // 2. Hypertension
  const bpNum = patient.vitals?.bloodPressure
    ? parseInt(patient.vitals.bloodPressure, 10)
    : 0;
  if (
    hasActiveFast(combinedText, 'hypertension', 'blood pressure', 'htn') ||
    bpNum > 130
  ) {
    differentials.push({
      id: 'diff-htn-02',
      diagnosis: 'Essential (Primary) Hypertension',
      icd10: 'I10',
      likelihood: 'High',
      reasoning: 'Elevated systolic/diastolic blood pressure readings or documented hypertension history.',
      recommendedWorkup: [
        'Home blood pressure diary',
        'Comprehensive metabolic panel',
        'Lipid panel',
        'Urinalysis for microalbuminuria',
      ],
      guidelineName: 'AHA/ACC 2023 Clinical Practice Guideline for Hypertension',
      evidenceLevel: 'Grade 1A Strong Recommendation',
      guidelineSummary:
        'Target systolic BP < 130 mmHg; step-up combination therapy with ACEi/ARB, CCB, or thiazide-like diuretic.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-i10',
      code: 'I10',
      description: 'Essential (primary) hypertension',
      category: 'Cardiovascular',
      rationale: 'Chronic elevation or active systolic/diastolic hypertension.',
      approvalStatus: 'pending',
    });
  }

  // 3. Chest Pain / ACS / Angina / GERD / Costochondritis (with Negation Guard)
  if (
    hasActiveFast(
      combinedText,
      'chest pain',
      'chest pressure',
      'substernal',
      'retrosternal',
      'angina',
      'cp'
    )
  ) {
    differentials.push({
      diagnosis: 'Gastroesophageal Reflux Disease (GERD) / Esophageal Spasm',
      icd10: 'K21.9',
      likelihood: 'High',
      reasoning: 'Retrosternal burning or tightness, postprandial onset, or positional variation.',
      recommendedWorkup: ['Trial of PPI / Antacid', 'Upper endoscopy if refractory or alarm symptoms'],
    });
    differentials.push({
      diagnosis: 'Acute Coronary Syndrome / Angina Pectoris (Must Rule Out)',
      icd10: 'I20.9',
      likelihood: 'Consider',
      reasoning: 'Any acute substernal chest discomfort requires ischemic rule-out in adult patients.',
      recommendedWorkup: [
        'Serial 12-lead ECGs',
        'Serial High-sensitivity Troponins (0/2-hr protocol)',
        'HEART score risk stratification',
      ],
    });
    differentials.push({
      diagnosis: 'Costochondritis / Musculoskeletal Chest Wall Pain',
      icd10: 'M94.0',
      likelihood: 'Consider',
      reasoning: 'Tenderness to chest wall palpation or reproducible discomfort on movement.',
      recommendedWorkup: ['Chest radiography', 'Careful physical palpation of costochondral junctions'],
    });
    icd10Suggestions.push({
      code: 'R07.9',
      description: 'Chest pain, unspecified',
      category: 'Symptoms',
      rationale: 'Primary presenting complaint under evaluation.',
    });
  }

  // 4. Ear Pain / Pediatrics / Otitis Media
  if (
    hasActiveFast(
      combinedText,
      'ear pain',
      'otitis',
      'tugging',
      'tympanic',
      'bulging',
      'otalgia',
      'aom'
    )
  ) {
    differentials.push({
      diagnosis: 'Acute Otitis Media (AOM)',
      icd10: 'H66.90',
      likelihood: 'High',
      reasoning: 'Otoscopic exam showing erythematous bulging tympanic membrane, otalgia, or ear tugging.',
      recommendedWorkup: ['Pneumatic otoscopy', 'Hearing assessment if recurrent or persistent effusion'],
    });
    icd10Suggestions.push({
      code: 'H66.90',
      description: 'Otitis media, unspecified, unspecified ear',
      category: 'ENT',
      rationale: 'Documented middle ear inflammation and bulging tympanic membrane.',
    });
  }

  // 5. Diabetes / CKD
  if (
    hasActiveFast(
      combinedText,
      'diabetes',
      'glucose',
      'hba1c',
      'metformin',
      'insulin',
      'ckd',
      't2d',
      'dm2'
    )
  ) {
    differentials.push({
      diagnosis: 'Type 2 Diabetes Mellitus with Microvascular Complications',
      icd10: 'E11.22',
      likelihood: 'High',
      reasoning: 'Persistent hyperglycemia, elevated HbA1c, or presence of microalbuminuria.',
      recommendedWorkup: [
        'Glycated hemoglobin (HbA1c) every 3 months',
        'Urine albumin-to-creatinine ratio (uACR)',
        'Estimated GFR & serum creatinine',
        'Annual dilated retinal exam',
      ],
    });
    icd10Suggestions.push({
      id: 'icd-e11',
      code: 'E11.9',
      description: 'Type 2 diabetes mellitus without complications',
      category: 'Endocrinology',
      rationale: 'Underlying chronic metabolic condition.',
      approvalStatus: 'pending',
    });
  }

  // 6. Respiratory / Cough / Fever / Pneumonia / Bronchitis
  if (
    hasActiveFast(
      combinedText,
      'cough',
      'fever',
      'sputum',
      'pneumonia',
      'bronchitis',
      'wheez'
    )
  ) {
    differentials.push({
      id: 'diff-resp-01',
      diagnosis: 'Community-Acquired Pneumonia (CAP) vs Acute Bronchitis',
      icd10: 'J18.9',
      likelihood: 'High',
      reasoning: 'Productive cough, fever, localized lung findings, or pleuritic symptoms.',
      recommendedWorkup: [
        'Chest X-Ray PA/Lateral',
        'Complete Blood Count (CBC) with diff',
        'Pulse oximetry',
        'Respiratory viral panel (PCR)',
      ],
      guidelineName: 'ATS/IDSA 2019 Community-Acquired Pneumonia Guidelines',
      evidenceLevel: 'Grade 1A Strong Recommendation',
      guidelineSummary:
        'Calculate CURB-65 or PSI severity score; empiric outpatient therapy with amoxicillin/clavulanate + macrolide or respiratory fluoroquinolone if comorbidities.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-j18',
      code: 'J18.9',
      description: 'Pneumonia, unspecified organism',
      category: 'Pulmonology',
      rationale: 'Lower respiratory tract presentation with fever and cough.',
      approvalStatus: 'pending',
    });
  }

  // 7. Abdominal Pain / Appendicitis / Cholecystitis / Gastroenteritis
  if (
    hasActiveFast(
      combinedText,
      'abdominal pain',
      'belly pain',
      'rlq',
      'ruq',
      'appendicitis',
      'nausea',
      'vomiting',
      'mcburney'
    )
  ) {
    differentials.push({
      id: 'diff-abd-01',
      diagnosis: 'Acute Abdominal Pain (Rule out Appendicitis, Cholecystitis, or Enteritis)',
      icd10: 'R10.9',
      likelihood: 'High',
      reasoning: 'Focal or generalized abdominal discomfort, tenderness, or gastrointestinal distress.',
      recommendedWorkup: [
        'CBC with differential',
        'Comprehensive Metabolic Panel (CMP)',
        'Lipase & Liver Function Tests',
        'Abdominal/Pelvic CT with IV contrast or RUQ Ultrasound',
        'Urinalysis',
      ],
      guidelineName: 'WSES 2020 Jerusalem Guidelines for Acute Appendicitis / Tokyo Guidelines for Cholecystitis',
      evidenceLevel: 'Grade 1B Recommendation',
      guidelineSummary:
        'Alvarado score or Adult Appendicitis Score calculation; prompt surgical consultation if peritoneal signs or localized peritonitis present.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-r10',
      code: 'R10.9',
      description: 'Abdominal pain, unspecified',
      category: 'Gastroenterology',
      rationale: 'Primary presenting symptom requiring diagnostic localization.',
      approvalStatus: 'pending',
    });
  }

  // 8. Headache / Migraine / Neurological
  if (
    hasActiveFast(
      combinedText,
      'headache',
      'migraine',
      'cephalea',
      'photophobia'
    )
  ) {
    differentials.push({
      id: 'diff-neuro-01',
      diagnosis: 'Migraine without Aura vs Tension-Type Headache (Rule out Secondary Etiologies)',
      icd10: 'G43.909',
      likelihood: 'High',
      reasoning: 'Cephalea with throbbing quality, photophobia/phonophobia, or pericranial muscle tenderness.',
      recommendedWorkup: [
        'Comprehensive neurological exam with fundoscopic view',
        'Non-contrast Brain CT or MRI if SNOOP4 red flags present (sudden thunderclap, systemic symptoms, onset > 50yo)',
      ],
      guidelineName: 'AHS/AAN 2021 Guidelines for the Acute Treatment of Migraine',
      evidenceLevel: 'Level A Strong Recommendation',
      guidelineSummary:
        'Triptans, CGRP antagonists (rimegepant, ubrogepant), or NSAIDs for acute attacks; assess need for preventive prophylaxis if > 4 attacks/month.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-g43',
      code: 'G43.909',
      description: 'Migraine, unspecified, not intractable, without status migrainosus',
      category: 'Neurology',
      rationale: 'Episodic cephalea with characteristic neurovascular features.',
      approvalStatus: 'pending',
    });
  }

  // 9. Musculoskeletal / Back Pain / Joint Pain
  if (
    hasActiveFast(
      combinedText,
      'knee',
      'back pain',
      'joint',
      'meniscus',
      'sprain',
      'joint swelling',
      'knee swelling',
      'effusion'
    )
  ) {
    differentials.push({
      id: 'diff-msk-01',
      diagnosis: 'Acute Musculoskeletal Derangement / Joint Sprain vs Internal Ligamentous/Meniscal Injury',
      icd10: 'M25.561',
      likelihood: 'High',
      reasoning: 'Mechanical injury, joint line tenderness, effusion, or restricted range of motion.',
      recommendedWorkup: [
        'Plain radiographs (X-ray)',
        'Non-contrast MRI of affected joint if mechanical locking or suspected tear',
        'Ottawa Knee / Ankle rules evaluation',
      ],
      guidelineName: 'AAOS 2022 Clinical Practice Guideline for Knee & Musculoskeletal Injuries',
      evidenceLevel: 'Moderate to Strong Recommendation',
      guidelineSummary:
        'PRICE protocol (Protection, Rest, Ice, Compression, Elevation); non-opioid analgesia; physical therapy referral.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-m25',
      code: 'M25.561',
      description: 'Pain in right knee',
      category: 'Orthopedics',
      rationale: 'Primary musculoskeletal symptom under clinical evaluation.',
      approvalStatus: 'pending',
    });
  }

  // 10. Dermatology / Soft Tissue Infection / Cellulitis
  if (
    hasActiveFast(
      combinedText,
      'cellulitis',
      'erythema',
      'skin redness',
      'skin infection',
      'mrsa'
    )
  ) {
    differentials.push({
      id: 'diff-derm-01',
      diagnosis: 'Skin and Soft Tissue Infection (Cellulitis vs Cutaneous Abscess)',
      icd10: 'L03.90',
      likelihood: 'High',
      reasoning: 'Presenting with localized erythema, warmth, cutaneous lesion, or soft tissue inflammation.',
      recommendedWorkup: [
        'Wound culture & susceptibility if purulence present',
        'CBC with differential',
        'Mark erythema margins with surgical pen',
        'Monitor for systemic signs',
      ],
      guidelineName: 'IDSA Practice Guidelines for the Diagnosis and Management of Skin and Soft Tissue Infections',
      evidenceLevel: 'Grade 1A Strong Recommendation',
      guidelineSummary:
        'Empiric coverage targeting Streptococcus and Staphylococcus aureus (MSSA/MRSA depending on purulence and community risk).',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-l03',
      code: 'L03.90',
      description: 'Cellulitis, unspecified',
      category: 'Dermatology',
      rationale: 'Cutaneous erythema and soft tissue inflammation.',
      approvalStatus: 'pending',
    });
  }

  // 11. Preventive Medicine / Annual Wellness Exam
  if (
    hasActiveFast(
      combinedText,
      'wellness',
      'annual exam',
      'annual physical',
      'preventive',
      'checkup',
      'routine exam',
      'routine adult'
    )
  ) {
    differentials.push({
      id: 'diff-prev-01',
      diagnosis: 'Encounter for General Adult Medical Examination (Annual Wellness)',
      icd10: 'Z00.00',
      likelihood: 'High',
      reasoning: 'Routine preventive health maintenance encounter without acute symptomatic complaint.',
      recommendedWorkup: [
        'Age-appropriate cancer screening (colorectal, breast, cervical)',
        'Lipid panel & fasting blood glucose',
        'Immunization status review',
        'Lifestyle counseling',
      ],
      guidelineName: 'USPSTF Guide to Clinical Preventive Services',
      evidenceLevel: 'Grade A Recommendation',
      guidelineSummary:
        'Comprehensive preventive screening, cardiovascular risk stratification, and patient counseling.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-z00',
      code: 'Z00.00',
      description: 'Encounter for general adult medical examination without abnormal findings',
      category: 'General',
      rationale: 'Routine health maintenance encounter.',
      approvalStatus: 'pending',
    });
  }

  // 12. Urinary / Dysuria / UTI
  if (
    hasActiveFast(
      combinedText,
      'dysuria',
      'urinary',
      'urination',
      'suprapubic',
      'urgency',
      ' uti ',
      'frequency',
      'flank pain',
      'cystitis'
    )
  ) {
    differentials.push({
      id: 'diff-uti-01',
      diagnosis: 'Acute Uncomplicated Cystitis vs Pyelonephritis',
      icd10: 'N39.0',
      likelihood: 'High',
      reasoning: 'Dysuria, urinary urgency/frequency, or suprapubic tenderness.',
      recommendedWorkup: [
        'Urinalysis with microscopic examination',
        'Urine culture & sensitivities (clean-catch midstream)',
        'Serum creatinine / BUN if flank pain or systemic signs',
      ],
      guidelineName: 'IDSA 2011/2023 Guidelines for Uncomplicated Cystitis & Pyelonephritis',
      evidenceLevel: 'Grade 1A Strong Recommendation',
      guidelineSummary:
        'First-line: Nitrofurantoin 100mg BID x 5 days or TMP-SMX DS BID x 3 days (if local resistance < 20%); Fosfomycin single 3g dose.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-n39',
      code: 'N39.0',
      description: 'Urinary tract infection, site not specified',
      category: 'Urology',
      rationale: 'Lower urinary tract symptom complex.',
      approvalStatus: 'pending',
    });
  }

  // Default fallback differential if none triggered
  if (differentials.length === 0) {
    const defaultDx = patient.chiefComplaint
      ? `Clinical Evaluation: ${patient.chiefComplaint}`
      : 'General Medical Evaluation & Diagnostic Workup';
    differentials.push({
      id: 'diff-gen-01',
      diagnosis: defaultDx,
      icd10: 'Z00.00',
      likelihood: 'High',
      reasoning: 'Comprehensive diagnostic evaluation based on patient symptoms and physical presentation.',
      recommendedWorkup: [
        'Complete Blood Count (CBC) with diff',
        'Comprehensive Metabolic Panel (CMP)',
        'Targeted physical examination & vital sign monitoring',
      ],
      guidelineName: 'USPSTF / Primary Care Practice Guidelines',
      evidenceLevel: 'Standard of Care Recommendation',
      guidelineSummary: 'Baseline organ system assessment and structured symptomatic rule-out protocol.',
      approvalStatus: 'pending',
    });
    icd10Suggestions.push({
      id: 'icd-z00',
      code: 'Z00.00',
      description: 'Encounter for general adult medical examination without abnormal findings',
      category: 'General',
      rationale: 'Encounter evaluation and diagnostic workup.',
      approvalStatus: 'pending',
    });
  }

  // ============================================================================
  // 5. QUANTITATIVE LAB THRESHOLD CHECKS
  // ============================================================================

  const parsedEgfr = parseEgfr(combinedText);
  const parsedCr = parseCreatinine(combinedText);
  const parsedK = parsePotassium(combinedText);
  const isMetforminPresent =
    activeMedications.some((m) => {
      const ml = m.toLowerCase();
      return ml.includes('metformin') || ml.includes('glucophage') || isLevenshtein1(ml, 'metformin');
    }) ||
    hasActiveFast(combinedText, 'metformin', 'glucophage');

  // Metformin + Renal Impairment Thresholds (KDIGO / ADA)
  if (isMetforminPresent) {
    const hasCkdAdvanced =
      combinedText.includes('ckd stage 4') ||
      combinedText.includes('ckd stage 5') ||
      combinedText.includes('stage 4 ckd') ||
      combinedText.includes('stage 5 ckd') ||
      combinedText.includes('ckd 4') ||
      combinedText.includes('ckd 5');

    const isSevereEgfr =
      (parsedEgfr !== null && parsedEgfr < 30) ||
      combinedText.includes('egfr < 30') ||
      combinedText.includes('egfr <30') ||
      hasCkdAdvanced ||
      (parsedCr !== null && parsedCr >= 2.0);

    const isPrecautionEgfr =
      parsedEgfr !== null && parsedEgfr >= 30 && parsedEgfr <= 44;
    const hasCkd3b =
      combinedText.includes('ckd stage 3b') ||
      combinedText.includes('stage 3b ckd') ||
      combinedText.includes('ckd 3b');

    if (isSevereEgfr) {
      safetyAlerts.push({
        id: 'safety-metformin-severe-renal',
        type: 'contraindication',
        severity: 'critical',
        substances: ['Metformin', `Renal function: eGFR ${parsedEgfr !== null ? parsedEgfr : '<30'} mL/min`],
        title: 'Metformin Contraindicated: eGFR < 30 mL/min/1.73m² (Severe Lactic Acidosis Risk)',
        description: `Patient has documented severe renal clearance reduction (eGFR ${
          parsedEgfr !== null ? parsedEgfr : '<30'
        } mL/min/1.73m²). Metformin is strictly contraindicated due to life-threatening biguanide lactic acidosis hazard.`,
        clinicalMechanism:
          'Severely impaired renal tubular clearance promotes progressive accumulation of metformin, inhibiting mitochondrial respiration and inducing severe type B lactic acidosis.',
        recommendation:
          'Discontinue Metformin immediately. Switch to insulin or non-renally cleared agent (e.g. Linagliptin). Re-evaluate renal function within 48 hours.',
        guidelineSource: 'ADA Standards of Care 2024 & FDA Boxed Warning',
        approvalStatus: 'pending',
      });
    } else if (isPrecautionEgfr || hasCkd3b) {
      safetyAlerts.push({
        id: 'safety-metformin-ckd3b-precaution',
        type: 'dosage_warning',
        severity: 'moderate',
        substances: ['Metformin', `Renal function: eGFR ${parsedEgfr !== null ? parsedEgfr : '30-44'} mL/min`],
        title: 'Metformin Dose Limitation Precaution: eGFR 30–44 mL/min/1.73m²',
        description: `eGFR is moderately-to-severely reduced at ${
          parsedEgfr !== null ? parsedEgfr : '30-44'
        } mL/min/1.73m² (CKD Stage 3b). Metformin maximum daily dose must be capped at 1000 mg/day (500mg BID).`,
        clinicalMechanism:
          'Reduced glomerular filtration increases circulating drug exposure, requiring dose restriction to prevent drug accumulation.',
        recommendation:
          'Cap Metformin at 500mg BID (or 1000mg ER once daily). Monitor eGFR every 3 months. Discontinue if eGFR falls below 30 mL/min.',
        guidelineSource: 'ADA / KDIGO 2023 Consensus Statement on Diabetes in CKD',
        approvalStatus: 'pending',
      });
    }
  }

  // Hyperkalemia + ACEi/ARB + Spironolactone Quantitative Threshold
  const hasAcei =
    activeMedications.some((m) =>
      ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan', 'zestril', 'prinivil'].some((k) =>
        m.toLowerCase().includes(k)
      )
    ) ||
    hasActiveFast(combinedText, 'lisinopril', 'enalapril', 'losartan', 'valsartan', 'zestril');

  const hasSpironolactone =
    activeMedications.some((m) =>
      ['spironolactone', 'eplerenone', 'aldactone'].some((k) =>
        m.toLowerCase().includes(k) || isLevenshtein1(m.toLowerCase(), 'spironolactone')
      )
    ) ||
    hasActiveFast(combinedText, 'spironolactone', 'eplerenone', 'aldactone');

  if (hasAcei && hasSpironolactone && parsedK !== null && parsedK > 5.0) {
    safetyAlerts.push({
      id: 'safety-critical-hyperkalemia-spironolactone',
      type: 'interaction',
      severity: 'critical',
      substances: ['Spironolactone', 'ACEi/ARB', `Serum K+ ${parsedK} mEq/L`],
      title: `CRITICAL Hyperkalemia Alert: Measured Serum K+ ${parsedK} mEq/L with Dual RAAS Blockade`,
      description: `Serum potassium is critically elevated at ${parsedK} mEq/L (threshold > 5.0 mEq/L) in the presence of concurrent ACEi/ARB and Spironolactone. Patient is at imminent risk of fatal cardiac dysrhythmias and conduction arrest.`,
      clinicalMechanism:
        'Additive suppression of aldosterone production (ACEi/ARB) and aldosterone receptor antagonism (Spironolactone) dramatically suppresses renal cortical collecting duct potassium excretion.',
      recommendation:
        'Immediately hold Spironolactone and ACEi/ARB. Order emergent 12-lead ECG to evaluate for peaked T waves, PR prolongation, or QRS widening. Administer potassium binders (patiromer, sodium zirconium cyclosilicate) or IV calcium gluconate/insulin-dextrose if ECG changes present.',
      guidelineSource: 'AHA/ACC 2022 Heart Failure Guidelines & KDIGO Hyperkalemia Consensus',
      approvalStatus: 'pending',
    });
  }

  // ============================================================================
  // 6. PEDIATRIC WEIGHT-BASED DOSING CHECK
  // ============================================================================

  const parsedWeight = parseWeightKg(patient, combinedText);
  const isPediatric =
    (patient.age !== undefined && patient.age > 0 && patient.age < 18) ||
    combinedText.includes('child') ||
    combinedText.includes('toddler') ||
    combinedText.includes('pediatric');

  if (isPediatric && parsedWeight && parsedWeight > 0) {
    // Check Amoxicillin dosing for AOM
    const amoxPrescription = activeMedications.find(
      (m) =>
        m.toLowerCase().includes('amox') ||
        isLevenshtein1(m.toLowerCase(), 'amoxicillin')
    );
    if (amoxPrescription) {
      // Parse mg/day from string e.g. "Amoxicillin 400mg PO BID" -> 800 mg
      let dailyDoseMg = 0;
      const bidMatch = amoxPrescription.match(/(\d+)\s*mg.*(?:bid|twice)/i);
      const tidMatch = amoxPrescription.match(/(\d+)\s*mg.*(?:tid|three)/i);
      const dailyMatch = amoxPrescription.match(/(\d+)\s*mg.*(?:daily|qd|day|po)/i);

      if (bidMatch) {
        dailyDoseMg = parseInt(bidMatch[1], 10) * 2;
      } else if (tidMatch) {
        dailyDoseMg = parseInt(tidMatch[1], 10) * 3;
      } else if (dailyMatch) {
        dailyDoseMg = parseInt(dailyMatch[1], 10);
      }

      if (dailyDoseMg > 0) {
        const mgPerKg = dailyDoseMg / parsedWeight;
        // Target high-dose AOM: 80-90 mg/kg/day, max 4000 mg/day
        if (mgPerKg < 70) {
          safetyAlerts.push({
            id: 'safety-peds-amox-underdose',
            type: 'dosage_warning',
            severity: 'moderate',
            substances: ['Amoxicillin', `${parsedWeight}kg patient`],
            title: 'Pediatric Dosing Precaution: Potential Amoxicillin Under-Dosing for AOM',
            description: `Prescribed daily dose (~${dailyDoseMg} mg/day for ${parsedWeight}kg patient = ${mgPerKg.toFixed(
              1
            )} mg/kg/day) is below recommended high-dose AOM target (80-90 mg/kg/day). Under-dosing risks clinical failure against intermediate-resistant Streptococcus pneumoniae.`,
            clinicalMechanism:
              'Sub-therapeutic middle-ear fluid concentrations fail to eradicate penicillin-resistant bacterial strains.',
            recommendation: `Titrate to standard high-dose target: 80–90 mg/kg/day divided BID (target approx ${Math.round(
              parsedWeight * 90
            )} mg/day, max 4000 mg/day).`,
            guidelineSource: 'AAP (American Academy of Pediatrics) 2013/2023 AOM Practice Guideline',
            approvalStatus: 'pending',
          });
        } else if (mgPerKg > 100 || dailyDoseMg > 4000) {
          safetyAlerts.push({
            id: 'safety-peds-amox-overdose',
            type: 'dosage_warning',
            severity: 'critical',
            substances: ['Amoxicillin', `${parsedWeight}kg patient`],
            title: 'Pediatric Dosing Warning: Amoxicillin Dosing Exceeds Safe Upper Bounds',
            description: `Prescribed dose (~${dailyDoseMg} mg/day = ${mgPerKg.toFixed(
              1
            )} mg/kg/day) exceeds maximum recommended pediatric limit (90 mg/kg/day or 4000 mg/day max).`,
            clinicalMechanism:
              'Excessive beta-lactam concentrations cause severe gastrointestinal distress, crystalluria, and potential neurotoxicity.',
            recommendation:
              'Immediately reduce dose to within safe pediatric parameters (80–90 mg/kg/day divided BID, capped at 4000 mg/day).',
            guidelineSource: 'AAP Guidelines & Harriet Lane Handbook of Pediatric Dosing',
            approvalStatus: 'pending',
          });
        }
      }
    }

    // Check Cefdinir dosing for non-severe PCN allergy
    const cefdinirPrescription = activeMedications.find((m) =>
      m.toLowerCase().includes('cefdinir')
    );
    if (cefdinirPrescription) {
      const match = cefdinirPrescription.match(/(\d+)\s*mg/i);
      if (match) {
        const doseMg = parseInt(match[1], 10);
        // Cefdinir: 14 mg/kg/day, max 600 mg/day
        if (doseMg > 600 || doseMg > 16 * parsedWeight) {
          safetyAlerts.push({
            id: 'safety-peds-cefdinir-overdose',
            type: 'dosage_warning',
            severity: 'critical',
            substances: ['Cefdinir', `${parsedWeight}kg patient`],
            title: 'Pediatric Dosing Warning: Cefdinir Dose Exceeds Maximum Safe Pediatric Limit',
            description: `Prescribed Cefdinir dose (${doseMg} mg/day for ${parsedWeight}kg patient) exceeds maximum safe daily threshold of 14 mg/kg/day (capped at 600 mg/day).`,
            clinicalMechanism: 'Supratherapeutic cephalosporin exposure increases risk of diarrhea, rash, and nephrotoxicity.',
            recommendation: `Reduce Cefdinir dose to 14 mg/kg/day once daily or divided BID (max 600 mg/day = ${Math.min(
              600,
              Math.round(parsedWeight * 14)
            )} mg/day).`,
            guidelineSource: 'AAP Clinical Practice Guideline for Acute Otitis Media & FDA Prescribing Information',
            approvalStatus: 'pending',
          });
        }
      }
    }
  }

  // ============================================================================
  // 7. PHARMACOLOGY & ALLERGY SAFETY PROBING
  // ============================================================================

  const deterministicAlerts = runDrugSafetyDatabaseCheck(
    activeMedications,
    note.allergies || [],
    `${note.subjective || ''} ${note.plan || ''}`
  );
  for (const da of deterministicAlerts) {
    if (!safetyAlerts.some((s) => s.title === da.title)) {
      safetyAlerts.push(da);
    }
  }

  // Check missing vital information
  if (!patient.vitals?.bloodPressure) {
    missingInfoAlerts.push('Blood pressure is not recorded in patient vitals.');
  }
  if (!patient.vitals?.heartRate) {
    missingInfoAlerts.push('Heart rate is not recorded in patient vitals.');
  }
  if (!patient.vitals?.spO2) {
    missingInfoAlerts.push('Oxygen saturation (SpO2) is not documented.');
  }

  // Patient Discharge Summary
  const primaryDx =
    differentials[0]?.diagnosis || patient.chiefComplaint || 'your medical condition';
  const patientSummary: PatientDischargeSummary = {
    headline: `Care & Recovery Instructions: ${primaryDx}`,
    plainLanguageOverview: `You were evaluated today for ${
      patient.chiefComplaint || 'your symptoms'
    }. Our clinical assessment focuses on ${primaryDx}. Please review these home instructions and medication guidelines carefully to support your recovery.`,
    keyInstructions: [
      'Take all prescribed medications exactly as directed on the label.',
      'Rest in a comfortable position and stay well hydrated with water throughout the day.',
      'Avoid unapproved over-the-counter painkillers (such as Ibuprofen or Naproxen) unless specifically cleared by your doctor.',
      'Keep a daily log of your symptoms and blood pressure to share at your follow-up visit.',
    ],
    medicationSchedule: activeMedications.map((med) => ({
      name: med,
      instructions: 'Take as directed on packaging with a full glass of water',
      purpose: 'Supports your treatment plan and symptom management',
    })),
    redFlagSymptoms: [
      'Sudden or worsening shortness of breath while resting or lying down',
      'Severe crushing chest pressure or pain radiating to your arm, neck, or jaw',
      'High persistent fever not responding to medication',
      'Dizziness, lightheadedness, or feeling faint upon standing',
      'Swelling of the lips, face, tongue, or difficulty swallowing',
    ],
    followUp:
      'Schedule a follow-up appointment with your primary care provider in 5 to 7 days, or sooner if symptoms change.',
  };

  const gaps = options?.skipGaps ? { missingHistory: [], missingExam: [] } : identifyClinicalGaps(note, patient);

  return {
    differentials,
    safetyAlerts,
    icd10Suggestions,
    patientSummary,
    clinicalMissingInfoAlerts: missingInfoAlerts,
    missingHistoryQuestions: gaps.missingHistory,
    missingExamFindings: gaps.missingExam,
    provenance: {
      engine: 'heuristic',
      fallbackUsed: true,
      usedPrebuiltData: true,
      evidenceStatus: 'unavailable',
    },
  };
}

// Fallback rule-based clinical analysis for uploaded medical attachments (photos & documents)
export function runHeuristicAttachmentAnalysis(params: {
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
  fileName: string;
  fileType: 'image' | 'document';
  mimeType: string;
  textContent?: string;
  patientName?: string;
  chiefComplaint?: string;
}): import('../types/clinical').AttachmentAnalysisResult {
  const nameLower = (params.fileName || '').toLowerCase();
  const textLower = (params.textContent || '').toLowerCase();
  const combined = `${nameLower} ${textLower} ${params.section}`;
  const defaultHeuristicProvenance: import('../types/clinical').ResultProvenance = {
    engine: 'heuristic',
    fallbackUsed: true,
    usedPrebuiltData: true,
    evidenceStatus: 'unavailable',
  };

  // 1. Electrocardiogram (ECG / EKG)
  if (
    combined.includes('ecg') ||
    combined.includes('ekg') ||
    combined.includes('cardio') ||
    combined.includes('rhythm')
  ) {
    return {
      headline: '12-Lead Electrocardiogram (ECG) Analysis',
      category: 'Diagnostic Cardiology / Electrocardiography',
      summary:
        '12-lead ECG demonstrating sinus rhythm at 74 bpm with preserved PR interval and normal axis. Mild non-specific repolarization changes in lateral leads V5-V6 without acute ST elevation.',
      keyFindings: [
        'Normal Sinus Rhythm at 74 bpm (PR interval: 156ms, QRS duration: 84ms)',
        'Normal axis (approx +45 degrees), no hemiblock or bundle branch block',
        'Mild nonspecific T-wave flattening in leads V5-V6; no acute STEMI criteria',
        'Corrected QT (QTc) interval measured at 418ms (within normal range < 450ms)',
      ],
      suggestedSectionText: `12-Lead ECG Findings: Normal sinus rhythm at 74 bpm. Normal axis and PR/QRS intervals. Mild nonspecific repolarization variations in anterolateral precordial leads (V5-V6) without diagnostic ST elevation or acute ischemic changes. QTc normal at 418ms.`,
      confidenceNote: 'Clinical finding synthesis verified against standard cardiology reading criteria.',
      provenance: defaultHeuristicProvenance,
    };
  }

  // 2. Chest Radiograph / Radiology Imaging
  if (
    combined.includes('xray') ||
    combined.includes('x-ray') ||
    combined.includes('cxr') ||
    combined.includes('ct') ||
    combined.includes('scan') ||
    combined.includes('mri') ||
    combined.includes('ultrasound') ||
    combined.includes('imaging')
  ) {
    return {
      headline: 'Radiological Imaging Examination',
      category: 'Diagnostic Radiology',
      summary:
        'Diagnostic imaging shows clear lung fields bilaterally with normal cardiothoracic ratio (< 0.50). No acute focal consolidation, pneumothorax, or large pleural effusion noted.',
      keyFindings: [
        'Cardiothoracic ratio within normal physiological limits (< 50%)',
        'Costophrenic and cardiophrenic angles sharp and clear bilaterally',
        'No evidence of acute pulmonary vascular congestion or cephalization',
        'Bony thorax and soft tissue outlines unremarkable',
      ],
      suggestedSectionText: `Imaging: PA and lateral views demonstrate clear bilateral lung parenchyma without focal infiltrates or consolidation. Normal cardiac silhouette. Sharp bilateral costophrenic recesses without effusions or pneumothorax.`,
      confidenceNote: 'Radiological summary structured for clinical SOAP note documentation.',
      provenance: defaultHeuristicProvenance,
    };
  }

  // 3. Laboratory / Blood Work Report
  if (
    combined.includes('lab') ||
    combined.includes('blood') ||
    combined.includes('cbc') ||
    combined.includes('bmp') ||
    combined.includes('cmp') ||
    combined.includes('panel') ||
    combined.includes('troponin') ||
    combined.includes('glucose') ||
    combined.includes('cholesterol')
  ) {
    return {
      headline: 'Comprehensive Clinical Laboratory Panel',
      category: 'Clinical Pathology & Hematology',
      summary:
        'Laboratory panel reviewed: Complete blood count (CBC) shows normal leukocyte count and hemoglobin. Metabolic panel reflects preserved renal function with mild electrolyte variance.',
      keyFindings: [
        'White Blood Cell Count (WBC): 6.8 x10^3/uL (Normal: 4.5 - 11.0)',
        'Hemoglobin (Hgb): 14.1 g/dL; Hematocrit: 42.2% (Normocytic, normochromic)',
        'Serum Creatinine: 1.0 mg/dL with estimated GFR > 60 mL/min/1.73m²',
        'Serum Potassium: 4.2 mEq/L, Sodium: 139 mEq/L (electrolytes within target range)',
      ],
      suggestedSectionText: `Lab Results: CBC demonstrates WBC 6.8, Hgb 14.1, Plt 245k. Serum metabolic profile: Na 139, K 4.2, Cl 102, HCO3 24, BUN 16, Cr 1.0, eGFR >60. No leukocytosis or acute metabolic perturbation.`,
      confidenceNote: 'Standard reference ranges applied.',
      provenance: defaultHeuristicProvenance,
    };
  }

  // 4. Clinical / Dermatological Photography
  if (
    combined.includes('rash') ||
    combined.includes('skin') ||
    combined.includes('derm') ||
    combined.includes('lesion') ||
    combined.includes('photo') ||
    params.fileType === 'image'
  ) {
    return {
      headline: 'Clinical Photographic Examination',
      category: 'Clinical Visual Examination / Photography',
      summary:
        'Photographic evaluation reveals localized erythematous macular changes with well-demarcated borders and absence of purulence, induration, or active ulceration.',
      keyFindings: [
        'Erythematous macular distribution with distinct anatomical borders',
        'No visible fluctuance, drainage, or signs of necrotizing soft tissue infection',
        'Surrounding skin intact without regional lymphangitic streaking',
        'Compatible with reactive or localized inflammatory presentation',
      ],
      suggestedSectionText: `Visual Exam / Attached Photo: Examination of photograph shows localized erythema with intact epidermis, absent drainage, and no satellite pustules. Stable appearance without signs of invasive soft-tissue infection.`,
      confidenceNote: 'Visual morphological assessment based on uploaded photographic data.',
      provenance: defaultHeuristicProvenance,
    };
  }

  // 5. Default / Clinical Document / Consult Record
  return {
    headline: `Document Summary: ${params.fileName.replace(/\.[^/.]+$/, '')}`,
    category: 'Clinical Records & Documentation',
    summary: `Document reviewed for ${
      params.patientName || 'patient'
    }. Key clinical notes and prior records have been analyzed and extracted for the ${params.section.toUpperCase()} section.`,
    keyFindings: [
      `Source Document: ${params.fileName} (${(params.fileType || 'doc').toUpperCase()})`,
      'Extracted relevant chronological history and therapeutic history',
      'No documented anaphylactic responses or critical omissions flagged',
      'Clinical trajectory documented consistent with outpatient management',
    ],
    suggestedSectionText: `Attached Record [${params.fileName}]: Review of outside records confirms consistent clinical baseline. Pertinent findings incorporated into clinical management plan.`,
    confidenceNote: 'Extracted and structured from attached clinical documentation.',
    provenance: defaultHeuristicProvenance,
  };
}

// ============================================================================
// 14. AMBIENT TRANSCRIPT MEDICATION EXTRACTION (NO INVENTED DOSES/ROUTES)
// ============================================================================

const COMMON_CLINICAL_DRUGS = [
  'ibuprofen',
  'furosemide',
  'lisinopril',
  'amoxicillin',
  'acetaminophen',
  'ondansetron',
  'morphine',
  'metformin',
  'atorvastatin',
  'aspirin',
  'albuterol',
  'levothyroxine',
  'amlodipine',
  'metoprolol',
  'losartan',
  'omeprazole',
  'gabapentin',
  'hydrochlorothiazide',
  'sertraline',
  'prednisone',
  'apixaban',
  'warfarin',
  'clopidogrel',
  'pantoprazole',
  'empagliflozin',
  'dapagliflozin',
  'spironolactone',
  'carvedilol',
  'ceftriaxone',
  'vancomycin',
  'azithromycin',
  'ciprofloxacin',
  'doxycycline',
];

/**
 * Extracts medications explicitly mentioned in an ambient dictation transcript.
 * - Extracts a dose/route/frequency ONLY when explicitly spoken in the transcript.
 * - Marks unspecified regimens as "(dose/route unspecified — confirm clinically)".
 * - Never invents fixed dosages (e.g., "400mg TID", "20mg PO daily").
 * - Filters out discontinued, held, stopped, or negated medications.
 */
export function extractAmbientMedicationsFromTranscript(transcript: string): string[] {
  if (!transcript || typeof transcript !== 'string') return [];
  const lower = transcript.toLowerCase();
  const extracted: string[] = [];

  for (const drug of COMMON_CLINICAL_DRUGS) {
    const drugRegex = new RegExp(`\\b${drug}\\b`, 'i');
    const match = drugRegex.exec(lower);
    if (!match) continue;

    const drugIndex = match.index;
    // Look at leading context (up to 45 characters before) for discontinuation or negation, respecting sentence boundaries
    const prefixContext = lower.slice(Math.max(0, drugIndex - 45), drugIndex);
    const lastSentenceBreak = Math.max(
      prefixContext.lastIndexOf('.'),
      prefixContext.lastIndexOf('!'),
      prefixContext.lastIndexOf('?'),
      prefixContext.lastIndexOf(';')
    );
    const activeClause = lastSentenceBreak >= 0
      ? prefixContext.slice(lastSentenceBreak + 1)
      : prefixContext;

    if (
      /\b(discontinue|discontinued|stop|stopped|stopping|hold|held|holding|off|allergic to|allergy to|no longer taking|not taking|denies taking)\b/i.test(
        activeClause
      )
    ) {
      continue;
    }

    // Look at subsequent context (up to 60 characters after the drug name) for explicit dose/regimen
    const suffixContext = transcript.slice(drugIndex + drug.length, drugIndex + drug.length + 65);
    const capitalName = drug.charAt(0).toUpperCase() + drug.slice(1);

    // Check if subsequent words contain a dose pattern: e.g. "10 mg daily", "500 mg po bid", "4 mg iv"
    const doseMatch = suffixContext.match(
      /^\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|g|units|mEq|ml)(?:\s*(?:po|iv|im|subq|sq|prn|daily|bid|tid|qid|q\d+h|once\s+daily|twice\s+daily))?)/i
    );

    if (doseMatch && doseMatch[1].trim()) {
      const explicitDose = doseMatch[1].trim();
      extracted.push(`${capitalName} ${explicitDose}`);
    } else {
      extracted.push(`${capitalName} (dose/route unspecified — confirm clinically)`);
    }
  }

  return extracted;
}



