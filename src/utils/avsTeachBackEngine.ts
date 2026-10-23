import { ClinicalAnalysisResult, PatientRecord, SoapNote } from '../types/clinical';

export interface ReadabilityMetrics {
  wordCount: number;
  sentenceCount: number;
  syllableCount: number;
  fleschKincaidGradeLevel: number;
  fleschReadingEase: number;
  readingLevelCategory: '6th Grade or Below (Optimal Health Literacy)' | '7th–8th Grade (Standard)' | 'High School / Clinical Jargon (Needs Simplification)';
  detectedJargonTerms: Array<{ jargon: string; plainAlternative: string }>;
}

export interface TimeOfDayMedicationSlot {
  slot: 'Morning (08:00)' | 'Noon (12:00)' | 'Evening (18:00)' | 'Bedtime (22:00)' | 'As Needed (PRN)';
  medications: Array<{
    name: string;
    doseAndInstructions: string;
    plainPurpose: string;
    safetyPearl: string;
  }>;
}

export interface TeachBackQuestionItem {
  id: string;
  domain: 'Medication Change' | 'Red-Flag Warning Signs' | 'Self-Care & Follow-Up';
  clinicianPrompt: string;
  expectedPatientUnderstanding: string;
}

const JARGON_DICTIONARY: Array<{ pattern: RegExp; term: string; plain: string }> = [
  { pattern: /\bdyspnea\b/gi, term: 'dyspnea', plain: 'shortness of breath' },
  { pattern: /\borthopnea\b/gi, term: 'orthopnea', plain: 'trouble breathing when lying flat' },
  { pattern: /\bhypertension\b/gi, term: 'hypertension', plain: 'high blood pressure' },
  { pattern: /\bhypotension\b/gi, term: 'hypotension', plain: 'low blood pressure' },
  { pattern: /\btachycardia\b/gi, term: 'tachycardia', plain: 'fast heart rate' },
  { pattern: /\bbradycardia\b/gi, term: 'bradycardia', plain: 'slow heart rate' },
  { pattern: /\bmyocardial infarction\b/gi, term: 'myocardial infarction', plain: 'heart attack' },
  { pattern: /\bnephrotoxicity\b/gi, term: 'nephrotoxicity', plain: 'kidney stress or damage' },
  { pattern: /\brenal impairment\b/gi, term: 'renal impairment', plain: 'reduced kidney function' },
  { pattern: /\bhyperkalemia\b/gi, term: 'hyperkalemia', plain: 'high potassium in the blood' },
  { pattern: /\bedema\b/gi, term: 'edema', plain: 'fluid swelling' },
  { pattern: /\bdiaphoresis\b/gi, term: 'diaphoresis', plain: 'cold sweats' },
  { pattern: /\bsyncope\b/gi, term: 'syncope', plain: 'fainting or passing out' },
  { pattern: /\botalgia\b/gi, term: 'otalgia', plain: 'ear pain' },
  { pattern: /\berythematous\b/gi, term: 'erythematous', plain: 'red and inflamed' },
  { pattern: /\bcontraindicated\b/gi, term: 'contraindicated', plain: 'not safe to use' },
  { pattern: /\bb\.?i\.?d\.?\b/gi, term: 'BID', plain: 'twice a day' },
  { pattern: /\bt\.?i\.?d\.?\b/gi, term: 'TID', plain: 'three times a day' },
  { pattern: /\bq\.?d\.?\b/gi, term: 'QD', plain: 'once a day' },
  { pattern: /\bp\.?r\.?n\.?\b/gi, term: 'PRN', plain: 'as needed' },
  { pattern: /\bp\.?o\.?\b/gi, term: 'PO', plain: 'by mouth' },
];

export function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 0;
  if (clean.length <= 3) return 1;
  const withoutSilentE = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const vowelGroups = withoutSilentE.match(/[aeiouy]{1,2}/g);
  return vowelGroups ? Math.max(1, vowelGroups.length) : 1;
}

export function analyzeReadability(text: string): ReadabilityMetrics {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      fleschKincaidGradeLevel: 5.0,
      fleschReadingEase: 80.0,
      readingLevelCategory: '6th Grade or Below (Optimal Health Literacy)',
      detectedJargonTerms: [],
    };
  }

  const words = cleanText.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  const wordCount = Math.max(1, words.length);
  const sentences = cleanText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const syllableCount = words.reduce((sum, w) => sum + countSyllablesInWord(w), 0);

  const asl = wordCount / sentenceCount;
  const asw = syllableCount / wordCount;

  const rawGrade = 0.39 * asl + 11.8 * asw - 15.59;
  const fleschKincaidGradeLevel = Number(Math.max(1.0, Math.min(18.0, rawGrade)).toFixed(1));

  const rawEase = 206.835 - 1.015 * asl - 84.6 * asw;
  const fleschReadingEase = Number(Math.max(0, Math.min(100, rawEase)).toFixed(1));

  const detectedJargonTerms: Array<{ jargon: string; plainAlternative: string }> = [];
  for (const entry of JARGON_DICTIONARY) {
    if (entry.pattern.test(cleanText)) {
      detectedJargonTerms.push({ jargon: entry.term, plainAlternative: entry.plain });
    }
    entry.pattern.lastIndex = 0;
  }

  let readingLevelCategory: ReadabilityMetrics['readingLevelCategory'] =
    '6th Grade or Below (Optimal Health Literacy)';
  if (fleschKincaidGradeLevel > 8.5 || detectedJargonTerms.length >= 2) {
    readingLevelCategory = 'High School / Clinical Jargon (Needs Simplification)';
  } else if (fleschKincaidGradeLevel > 6.5) {
    readingLevelCategory = '7th–8th Grade (Standard)';
  }

  return {
    wordCount,
    sentenceCount,
    syllableCount,
    fleschKincaidGradeLevel,
    fleschReadingEase,
    readingLevelCategory,
    detectedJargonTerms,
  };
}

export function simplifyToSixthGradeReadingLevel(text: string): string {
  let simplified = text || '';
  for (const entry of JARGON_DICTIONARY) {
    simplified = simplified.replace(entry.pattern, entry.plain);
    entry.pattern.lastIndex = 0;
  }

  // Split overly long compound clauses (> 22 words) at semicolons or conjunctions for lower Flesch-Kincaid grade
  simplified = simplified
    .replace(/;\s*/g, '. ')
    .replace(/,\s+which\s+/gi, '. This ')
    .replace(/\badminister\b/gi, 'take')
    .replace(/\bdiscontinue\b/gi, 'stop taking')
    .replace(/\bmonitor\b/gi, 'check')
    .replace(/\bambulatory\b/gi, 'outpatient')
    .replace(/\bexacerbation\b/gi, 'flare-up')
    .replace(/\bsublingual\b/gi, 'under the tongue');

  return simplified.trim();
}

export function buildVisualMedicationMatrix(medications: string[]): TimeOfDayMedicationSlot[] {
  const slots: Record<TimeOfDayMedicationSlot['slot'], TimeOfDayMedicationSlot['medications']> = {
    'Morning (08:00)': [],
    'Noon (12:00)': [],
    'Evening (18:00)': [],
    'Bedtime (22:00)': [],
    'As Needed (PRN)': [],
  };

  for (const rawMed of medications) {
    const lower = rawMed.toLowerCase();
    let plainPurpose = 'Supports your daily treatment plan';
    let safetyPearl = 'Take with a full glass of water unless on a fluid restriction.';

    if (lower.includes('lisinopril') || lower.includes('losartan') || lower.includes('valsartan')) {
      plainPurpose = 'Lowers blood pressure and protects your heart and kidneys';
      safetyPearl = 'Stand up slowly from sitting or lying down. Call us if you develop a dry cough or swelling.';
    } else if (lower.includes('furosemide') || lower.includes('torsemide') || lower.includes('bumetanide')) {
      plainPurpose = 'Water pill (diuretic) that removes extra fluid from your lungs and legs';
      safetyPearl = 'Take in the morning (and early afternoon if twice daily) so it does not wake you up at night to urinate.';
    } else if (lower.includes('metoprolol') || lower.includes('carvedilol') || lower.includes('bisoprolol')) {
      plainPurpose = 'Slows heart rate and reduces workload on your heart muscle';
      safetyPearl = 'Do not stop suddenly without talking to your doctor.';
    } else if (lower.includes('atorvastatin') || lower.includes('rosuvastatin') || lower.includes('simvastatin')) {
      plainPurpose = 'Lowers cholesterol and stabilizes blood vessels';
      safetyPearl = 'Report any new, unexplained muscle aches or dark urine.';
    } else if (lower.includes('aspirin') || lower.includes('clopidogrel') || lower.includes('ticagrelor')) {
      plainPurpose = 'Prevents blood clots in your heart arteries';
      safetyPearl = 'Take with food. Watch for easy bruising or dark stools.';
    } else if (lower.includes('metformin') || lower.includes('linagliptin') || lower.includes('empagliflozin')) {
      plainPurpose = 'Keeps your blood sugar in a healthy range';
      safetyPearl = 'Hold and call the clinic if you have severe vomiting, dehydration, or kidney issues.';
    } else if (lower.includes('nitroglycerin')) {
      plainPurpose = 'Relieves sudden chest tightness or angina pain';
      safetyPearl = 'Sit down before placing under your tongue. Call 911 if chest pain is not gone after 5 minutes.';
    } else if (lower.includes('albuterol')) {
      plainPurpose = 'Opens airways quickly when you feel short of breath or wheezing';
      safetyPearl = 'Rinse mouth after use if using steroid inhalers.';
    } else if (lower.includes('amoxicillin') || lower.includes('cefdinir') || lower.includes('azithromycin')) {
      plainPurpose = 'Antibiotic to clear bacterial infection';
      safetyPearl = 'Finish the full course even if you feel better after a few days.';
    }

    const plainDose = simplifyToSixthGradeReadingLevel(rawMed);

    if (lower.includes('prn') || lower.includes('as needed') || lower.includes('sl') || lower.includes('sublingual')) {
      slots['As Needed (PRN)'].push({
        name: rawMed.split(' ')[0],
        doseAndInstructions: plainDose,
        plainPurpose,
        safetyPearl,
      });
    } else if (lower.includes('bedtime') || lower.includes('qhs') || lower.includes('atorvastatin') || lower.includes('simvastatin')) {
      slots['Bedtime (22:00)'].push({
        name: rawMed.split(' ')[0],
        doseAndInstructions: plainDose,
        plainPurpose,
        safetyPearl,
      });
    } else if (lower.includes('tid') || lower.includes('three times')) {
      slots['Morning (08:00)'].push({ name: rawMed.split(' ')[0], doseAndInstructions: plainDose, plainPurpose, safetyPearl });
      slots['Noon (12:00)'].push({ name: rawMed.split(' ')[0], doseAndInstructions: plainDose, plainPurpose, safetyPearl });
      slots['Evening (18:00)'].push({ name: rawMed.split(' ')[0], doseAndInstructions: plainDose, plainPurpose, safetyPearl });
    } else if (lower.includes('bid') || lower.includes('twice')) {
      slots['Morning (08:00)'].push({ name: rawMed.split(' ')[0], doseAndInstructions: plainDose, plainPurpose, safetyPearl });
      slots['Evening (18:00)'].push({ name: rawMed.split(' ')[0], doseAndInstructions: plainDose, plainPurpose, safetyPearl });
    } else {
      slots['Morning (08:00)'].push({
        name: rawMed.split(' ')[0],
        doseAndInstructions: plainDose,
        plainPurpose,
        safetyPearl,
      });
    }
  }

  return (Object.keys(slots) as Array<TimeOfDayMedicationSlot['slot']>).map((slot) => ({
    slot,
    medications: slots[slot],
  }));
}

export function generateTeachBackQuestions(
  patient: PatientRecord,
  note: SoapNote,
  analysis: ClinicalAnalysisResult | null
): TeachBackQuestionItem[] {
  const firstMed = note.medications[0] || 'your daily medications';
  const redFlags =
    analysis?.patientSummary?.redFlagSymptoms?.slice(0, 2).join(' or ') ||
    'chest pain, trouble breathing at rest, dizziness, or high fever';

  return [
    {
      id: 'tb-meds',
      domain: 'Medication Change',
      clinicianPrompt: `"To make sure I explained everything clearly, can you tell me in your own words how and when you will take ${firstMed} at home?"`,
      expectedPatientUnderstanding: `Patient states the correct time of day, dose, and purpose for ${firstMed} (and knows which medications were stopped or changed).`,
    },
    {
      id: 'tb-red-flags',
      domain: 'Red-Flag Warning Signs',
      clinicianPrompt: `"What are the warning signs we talked about that mean you should call our clinic right away or go to the Emergency Room?"`,
      expectedPatientUnderstanding: `Patient accurately names red-flag symptoms (${redFlags}).`,
    },
    {
      id: 'tb-followup',
      domain: 'Self-Care & Follow-Up',
      clinicianPrompt: `"What is the most important daily check you will do at home before your follow-up visit?"`,
      expectedPatientUnderstanding:
        patient.chiefComplaint.toLowerCase().includes('dyspnea') || patient.chiefComplaint.toLowerCase().includes('heart')
          ? 'Patient confirms checking weight every morning after urinating and before breakfast, and limiting salt.'
          : 'Patient confirms monitoring symptoms daily, staying hydrated, and attending scheduled follow-up.',
    },
  ];
}
