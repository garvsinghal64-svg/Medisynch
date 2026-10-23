import { ClinicalSnippet } from '../types/clinical';

export const DEFAULT_CLINICAL_SNIPPETS: ClinicalSnippet[] = [
  {
    trigger: '.htn',
    label: 'Hypertension Follow-Up',
    category: 'Cardiology',
    description: 'Standard chronic essential hypertension clinic follow-up template',
    expansion: `CHRONIC ESSENTIAL HYPERTENSION ASSESSMENT:
- BP Control: Currently [controlled / suboptimal] on current medical regimen.
- Home BP Logs: Average readings reported at [e.g. 138/86 mmHg].
- Symptoms: Patient denies headache, visual disturbances, chest tightness, palpitations, or dyspnea.
- Adherence: Patient reports [good / intermittent] compliance with prescribed medications.
- Lifestyle: Counseling provided regarding dietary sodium reduction (<2g/day) and DASH diet.
- Plan: Check repeat BMP / eGFR and urine microalbumin in [3/6] months.`,
  },
  {
    trigger: '.dm2',
    label: 'Type 2 Diabetes Mellitus',
    category: 'General',
    description: 'Comprehensive outpatient T2DM review (glycemia, foot exam, labs)',
    expansion: `TYPE 2 DIABETES MELLITUS FOLLOW-UP:
- Glycemic Metrics: Most recent HbA1c: [%] on [Date]. Fasting glucose averages [mg/dL].
- Hypoglycemia: Patient denies symptomatic or documented hypoglycemic episodes (<70 mg/dL).
- Microvascular Screening:
  * Retinal Exam: Last completed [Date] (result: no diabetic retinopathy).
  * Foot Inspection: Monofilament test normal bilateral feet; no callous, erythema, or ulceration.
  * Nephropathy: Urine albumin-to-creatinine ratio [mg/g].
- Counseling: Hypoglycemia awareness, sick day management, and continuous glucose monitoring review.`,
  },
  {
    trigger: '.chestpain',
    label: 'Acute Chest Pain Evaluation',
    category: 'ER',
    description: 'Structured acute chest pain evaluation with HEART score factors',
    expansion: `ACUTE CHEST PAIN EVALUATION (OPQRST / HEART PROTOCOL):
- Onset: Started [time/duration] ago, [sudden / gradual] onset.
- Provocation / Palliation: Exacerbated by [exertion / respiration / palpation]; relieved by [rest / sublingual NTG / nothing].
- Quality: Characterized as [pressure / tightness / sharp / burning / tearing].
- Radiation: Radiates to [left arm / neck / jaw / back / no radiation].
- Severity: Rated [X]/10 at peak.
- Associated Symptoms: Denies diaphoresis, nausea, syncope, or acute dyspnea.
- Risk Stratification: Low/Moderate HEART score calculated. Serial troponins and baseline 12-lead ECG ordered.`,
  },
  {
    trigger: '.asthma',
    label: 'Asthma / Bronchospasm Protocol',
    category: 'General',
    description: 'Asthma exacerbation evaluation and inhaled corticosteroid response',
    expansion: `ASTHMA / REACTIVE AIRWAYS REVIEW:
- Triggers: Exacerbated by [viral infection / cold air / allergens / exercise].
- Frequency: Daytime symptoms [X] days/week, nighttime awakenings [X] times/month.
- Peak Expiratory Flow: Measured [L/min] ([%] of personal best).
- Physical Exam: Bilateral expiratory wheezes [mild / moderate]; no accessory muscle retractions.
- Inhaler Technique: Verified proper spacer use and rinse-after-inhalation with ICS.
- Plan: Short course oral corticosteroids and step-up ICS-Formoterol SMART protocol.`,
  },
  {
    trigger: '.normalvitals',
    label: 'Normal Constitutional & Vitals',
    category: 'Examination',
    description: 'Standard reassuring constitutional and vitals exam block',
    expansion: `CONSTITUTIONAL & GENERAL EXAMINATION:
- General: Alert, oriented x4, well-nourished, well-developed, in no acute distress.
- Vitals: Hemodynamically stable, afebrile, normotensive, eupneic on ambient room air.
- Skin: Warm, dry, intact without suspicious lesions, rashes, or jaundice.
- Psychiatric: Pleasant, cooperative, normal mood and appropriate affect.`,
  },
  {
    trigger: '.ros_neg',
    label: 'Negative Review of Systems (10-Point)',
    category: 'Examination',
    description: 'Comprehensive 10-point ROS negative except for chief complaint',
    expansion: `REVIEW OF SYSTEMS (10-POINT ALL NEGATIVE EXCEPT CC):
- Constitutional: Denies fever, chills, unintended weight loss, or fatigue.
- Eyes: Denies blurry vision, eye pain, or diplopia.
- ENT: Denies sore throat, rhinorrhea, nasal congestion, or ear pain.
- Cardiovascular: Denies chest pain, palpitations, orthopnea, or ankle swelling.
- Respiratory: Denies shortness of breath, wheezing, or hemoptysis.
- Gastrointestinal: Denies abdominal pain, nausea, vomiting, diarrhea, or hematochezia.
- Genitourinary: Denies dysuria, hematuria, or flank pain.
- Musculoskeletal: Denies joint swelling, erythema, or focal muscle weakness.
- Neurological: Denies focal weakness, numbness, tingling, or gait instability.
- Psychiatric: Denies acute anxiety, depressed mood, or sleep disturbance.`,
  },
  {
    trigger: '.phys_normal',
    label: 'Normal Comprehensive Physical Exam',
    category: 'Examination',
    description: 'Standard multi-system physical examination with reassuring findings',
    expansion: `PHYSICAL EXAMINATION:
- Head/Neck: Normocephalic, atraumatic. Supple neck, no jugular venous distension, no thyromegaly or cervical lymphadenopathy.
- Eyes: Pupils equal, round, and reactive to light (PERRLA). Extraocular movements intact. Sclerae anicteric.
- Cardiovascular: Normal S1/S2, regular rate and rhythm. No murmurs, gallops, or friction rubs. Distal peripheral pulses 2+ equal.
- Pulmonary: Clear to auscultation bilaterally in all lung fields. Normal respiratory effort without wheezing, rales, or rhonchi.
- Abdomen: Soft, non-tender to palpation throughout. Non-distended, normoactive bowel sounds. No hepatosplenomegaly or rebound/guarding.
- Extremities: No clubbing, cyanosis, or peripheral edema. Full range of motion.
- Neurological: Cranial nerves II-XII grossly intact. Motor strength 5/5 in all four extremities. Sensations intact to light touch.`,
  },
  {
    trigger: '.pe',
    label: 'Normal Physical Exam (Abbreviated)',
    category: 'Examination',
    description: 'Quick multi-system reassuring physical exam',
    expansion: `PHYSICAL EXAM: General: Alert, oriented x4, no acute distress. CV: RRR, normal S1/S2, no murmurs. Pulm: CTAB, no wheezes/rales. Abd: Soft, non-tender, non-distended. Ext: No edema. Neuro: Grossly intact.`,
  },
  {
    trigger: '.pe_normal',
    label: 'Comprehensive Normal PE',
    category: 'Examination',
    description: 'Standard multi-system physical examination with reassuring findings',
    expansion: `PHYSICAL EXAMINATION:
- Head/Neck: Normocephalic, atraumatic. Supple neck, no jugular venous distension, no thyromegaly or cervical lymphadenopathy.
- Eyes: Pupils equal, round, and reactive to light (PERRLA). Extraocular movements intact. Sclerae anicteric.
- Cardiovascular: Normal S1/S2, regular rate and rhythm. No murmurs, gallops, or friction rubs. Distal peripheral pulses 2+ equal.
- Pulmonary: Clear to auscultation bilaterally in all lung fields. Normal respiratory effort without wheezing, rales, or rhonchi.
- Abdomen: Soft, non-tender to palpation throughout. Non-distended, normoactive bowel sounds. No hepatosplenomegaly or rebound/guarding.
- Extremities: No clubbing, cyanosis, or peripheral edema. Full range of motion.
- Neurological: Cranial nerves II-XII grossly intact. Motor strength 5/5 in all four extremities. Sensations intact to light touch.`,
  },
  {
    trigger: '.cardio',
    label: 'Cardiovascular Exam',
    category: 'Examination',
    description: 'Focused normal cardiovascular physical exam',
    expansion: `Cardiovascular Exam: Regular rate and rhythm, normal S1 and S2 present. No murmurs, gallops, or friction rubs. PMI non-displaced. Radial and dorsalis pedis pulses 2+ bilaterally. Capillary refill <2 seconds. No peripheral edema.`,
  },
  {
    trigger: '.pulm',
    label: 'Pulmonary / Respiratory Exam',
    category: 'Examination',
    description: 'Focused normal pulmonary physical exam',
    expansion: `Pulmonary Exam: Clear to auscultation bilaterally in anterior, posterior, and lateral lung fields. Good symmetric air excursion throughout. Respiration unlabored, no wheezing, rales, crackles, or rhonchi. No intercostal retractions or accessory muscle use.`,
  },
  {
    trigger: '.ros',
    label: 'Negative Review of Systems',
    category: 'Examination',
    description: 'Standard 10-point negative review of systems',
    expansion: `Review of Systems: Negative for fevers, chills, diaphoresis, headache, blurred vision, chest pain, palpitations, shortness of breath, cough, abdominal pain, nausea, vomiting, dysuria, focal weakness, or rash.`,
  },
  {
    trigger: '.precautions',
    label: 'Emergency Return Precautions',
    category: 'General',
    description: 'Standard emergency discharge and return warning instructions',
    expansion: `RETURN PRECAUTIONS: Patient was counseled in detail regarding red flag symptoms requiring immediate return to emergency medical care, including sudden severe shortness of breath, crushing substernal chest tightness or pressure radiating to arm/jaw, syncope or presyncope, high persistent fever, sudden focal neurological deficits, or severe intractable pain. Patient voiced clear understanding and agreement.`,
  },
  {
    trigger: '.cp',
    label: 'Chest Pain Evaluation',
    category: 'ER',
    description: 'Structured acute chest pain evaluation with HEART score factors',
    expansion: `ACUTE CHEST PAIN EVALUATION (OPQRST / HEART PROTOCOL):
- Onset: Started [time/duration] ago, [sudden / gradual] onset.
- Provocation / Palliation: Exacerbated by [exertion / respiration / palpation]; relieved by [rest / sublingual NTG / nothing].
- Quality: Characterized as [pressure / tightness / sharp / burning / tearing].
- Radiation: Radiates to [left arm / neck / jaw / back / no radiation].
- Severity: Rated [X]/10 at peak.
- Associated Symptoms: Denies diaphoresis, nausea, syncope, or acute dyspnea.
- Risk Stratification: Low/Moderate HEART score calculated. Serial troponins and baseline 12-lead ECG ordered.`,
  },
  {
    trigger: '.pedfever',
    label: 'Pediatric Acute Fever & Rash',
    category: 'Pediatrics',
    description: 'Pediatric febrile illness, hydration assessment, and warning signs',
    expansion: `PEDIATRIC FEBRILE EVALUATION:
- Fever Curve: Documented maximum temperature of [X] °F/°C at home, onset [X] days ago. Responsive to [Acetaminophen / Ibuprofen].
- Fluid Intake & Output: Consuming fluids [well / reduced]; producing [X] wet diapers in the past 24 hours.
- Alertness: Interactive, making eye contact, consolable by parent, no lethargy or altered mentation.
- Meningeal Signs: Supple neck, negative Brudzinski and Kernig signs. Fontanelle flat and soft.
- Red Flags Reviewed: Counselled parents to seek emergency evaluation for petechial rash, persistent vomiting, respiratory grunting, or inconsolable crying.`,
  },
  {
    trigger: '.geriatric',
    label: 'Geriatric Comprehensive Assessment',
    category: 'General',
    description: 'Fall risk, polypharmacy, ADLs, and cognitive review',
    expansion: `GERIATRIC MULTI-FACTORIAL ASSESSMENT:
- Functional Status: Independent in Activities of Daily Living (ADLs); requires assistance with [IADLs, e.g. driving/meds].
- Mobility & Fall Risk: Timed Up and Go (TUG) test [X] seconds. Denies falls or near-falls in the prior 6 months.
- Polypharmacy & Beers Criteria: Medication reconciliation reviewed; no high-risk anticholinergics or sedative-hypnotics identified.
- Cognitive Screening: Mini-Cog score [X]/5, oriented to person, place, and date.
- Sensory: Uses corrective lenses / hearing aids functioning well.`,
  },
  {
    trigger: '.consent',
    label: 'Informed Clinical Consent',
    category: 'Procedures',
    description: 'Medical and procedural informed consent documentation',
    expansion: `INFORMED CONSENT DOCUMENTATION:
The nature, indication, expected benefits, material risks (including infection, bleeding, failure of procedure, and allergic reaction), as well as viable clinical alternatives were explained in detail to the patient. The patient verbalized understanding, was provided the opportunity to ask questions, and voluntarily gave informed consent.`,
  },
  {
    trigger: '.uti',
    label: 'Urinary Tract Infection Evaluation',
    category: 'General',
    description: 'Dysuria, urgency, urinalysis and antibiotic selection',
    expansion: `URINARY TRACT INFECTION (UTI) ASSESSMENT:
- Symptoms: Reports acute dysuria, urinary frequency, and suprapubic discomfort for [X] days.
- Denies: Fever, chills, rigors, flank pain, or vaginal discharge (rules out acute pyelonephritis / PID).
- Urinalysis (Point-of-Care): Positive leukocyte esterase, positive nitrites, trace blood.
- Management: Initiated targeted empiric antimicrobial therapy based on local antibiogram; instructed on liberal hydration and return precautions.`,
  },
  {
    trigger: '.anxiety',
    label: 'Anxiety & Depression Screening (GAD-7 / PHQ-9)',
    category: 'Psychiatry',
    description: 'Mental health screening, safety evaluation, and coping strategies',
    expansion: `MENTAL HEALTH ASSESSMENT (GAD-7 & PHQ-9):
- Scores: GAD-7 score: [X]/21 (indicative of [mild/moderate/severe] anxiety). PHQ-9 score: [X]/27.
- Safety & Suicide Assessment: Explicitly evaluated for suicidal ideation, intent, plan, and homicidal thoughts. Patient adamantly denies any intent to harm self or others; has future-oriented mindset.
- Coping Mechanisms: Discussed sleep hygiene, cognitive reframing, mindfulness, and exercise.
- Plan: Psychotherapy referral provided; pharmacological regimen reviewed and optimized with close safety net follow-up.`,
  },
];

const CUSTOM_SNIPPETS_KEY = 'curadoc_custom_snippets_v1';

export function getAllSnippets(): ClinicalSnippet[] {
  if (typeof window === 'undefined') return DEFAULT_CLINICAL_SNIPPETS;
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    if (!raw) return DEFAULT_CLINICAL_SNIPPETS;
    const parsed: ClinicalSnippet[] = JSON.parse(raw);
    return [...DEFAULT_CLINICAL_SNIPPETS, ...parsed];
  } catch {
    return DEFAULT_CLINICAL_SNIPPETS;
  }
}

export function saveCustomSnippet(snippet: ClinicalSnippet): ClinicalSnippet[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SNIPPETS_KEY);
    const existing: ClinicalSnippet[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((s) => s.trigger !== snippet.trigger);
    const updated = [snippet, ...filtered];
    localStorage.setItem(CUSTOM_SNIPPETS_KEY, JSON.stringify(updated));
    return getAllSnippets();
  } catch (err) {
    console.error('Failed to save custom snippet', err);
    return getAllSnippets();
  }
}

export function findSnippetByTrigger(trigger: string): ClinicalSnippet | undefined {
  const snippets = getAllSnippets();
  const normalized = trigger.startsWith('.') ? trigger.toLowerCase() : `.${trigger.toLowerCase()}`;
  return snippets.find((s) => s.trigger.toLowerCase() === normalized);
}
