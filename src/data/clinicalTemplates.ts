import { ClinicalCaseTemplate, ClinicalAnalysisResult } from '../types/clinical';
import { SAMPLE_ATTACHMENTS } from './demoAttachments';

export const CLINICAL_CASES: ClinicalCaseTemplate[] = [
  {
    id: 'cardiology-htn-dyspnea',
    title: 'Cardiology: HTN & Exertional Dyspnea',
    specialty: 'Internal Medicine / Cardiology',
    description: '64yo male on ACE-inhibitor with newly worsening exertional shortness of breath, bilateral leg edema, and recent OTC Ibuprofen use.',
    patient: {
      id: 'pt-8821',
      name: 'Arthur Pendelton',
      age: 64,
      gender: 'Male',
      mrn: 'MRN-782910',
      encounterDate: '2026-10-17',
      chiefComplaint: 'Shortness of breath on mild exertion and ankle swelling for 2 weeks',
      vitals: {
        bloodPressure: '154/92 mmHg',
        heartRate: 84,
        respiratoryRate: 18,
        temperature: '36.8 °C (98.2 °F)',
        spO2: 95,
        weightKg: 91.5,
        heightCm: 178,
      },
    },
    initialNote: {
      subjective: `Patient is a 64-year-old male with long-standing essential hypertension who presents with progressive shortness of breath over the past 14 days, notably after climbing one flight of stairs (previously tolerated well). He reports mild 2-pillow orthopnea and waking up twice last week feeling air-hungry (suggestive of PND). Denies crushing substernal chest pain, syncope, fever, or productive cough.

Noted that he recently started taking OTC Ibuprofen 400mg TID for left knee osteoarthritis symptoms over the last 3 weeks. Complains of mild bilateral sock-mark ankle swelling that worsens toward the evening.`,
      objective: `Constitutional: Alert, oriented x4, sitting comfortably at rest, slight tachypnea with talking.
Vitals: BP 154/92 mmHg, HR 84 bpm regular, RR 18, SpO2 95% on room air, BMI 28.9.
HEENT: Normocephalic, mucous membranes moist. JVP measured at approximately 4 cm above sternal angle at 45 degrees.
Cardiovascular: Regular rate and rhythm. S1 and S2 present. Soft S3 gallop appreciated at the apex. No murmurs or friction rubs.
Pulmonary: Bilateral bibasilar fine crackles/rales heard in lower lung fields; no wheezes.
Abdomen: Soft, non-tender, non-distended. No hepatomegaly.
Extremities: 1+ to 2+ pitting edema bilateral lower extremities up to mid-shin. Peripheral pulses 2+ symmetric.
Point-of-Care Labs: Serum Creatinine 1.42 mg/dL (baseline 1.05 mg/dL 6 months ago), eGFR 53 mL/min/1.73m², Potassium 4.8 mEq/L, BNP pending.`,
      assessment: `1. Exertional Dyspnea & Fluid Overload: Highly suspicious for early congestive heart failure decompensation (likely HFpEF vs new HFrEF) precipitated by fluid retention.
2. Drug Interaction & Acute Kidney Stress: Concurrent ACE inhibitor (Lisinopril) and NSAID (Ibuprofen) causing afferent arteriolar constriction and blunting of antihypertensive effect, contributing to fluid retention.
3. Uncontrolled Essential Hypertension.`,
      plan: `1. Diagnostic Workup:
   - Stat 12-lead ECG (evaluate for LVH, ischemia, or dysrhythmias).
   - Serum NT-proBNP / BNP, complete metabolic panel, and urine albumin-to-creatinine ratio.
   - Comprehensive Transthoracic Echocardiogram (TTE) to evaluate ejection fraction, diastolic parameters, and valvular function.
   - Posteroanterior and lateral chest radiography (evaluate pulmonary venous congestion/cardiomegaly).

2. Medication Adjustments & Decongestion:
   - IMMEDIATELY DISCONTINUE Ibuprofen. Counsel patient on avoiding NSAIDs; transition to Acetaminophen 500mg PRN for knee discomfort.
   - Initiate oral Furosemide 20mg once daily in morning for gentle diuresis; monitor daily morning weights.
   - Continue Lisinopril 20mg daily with close monitoring of renal panel and potassium in 5 days.

3. Patient Education & Precautions:
   - Sodium restriction (<2g/day) and fluid restriction (1.5-2L/day).
   - Provide red-flag warning criteria (weight gain >3 lbs in 24 hrs, worsening rest orthopnea, chest tightness).
   - Follow-up clinic appointment scheduled in 5-7 days with repeat BMP.`,
      medications: [
        'Lisinopril 20mg PO once daily',
        'Atorvastatin 20mg PO once daily',
        'Ibuprofen 400mg PO TID (OTC, self-started 3 weeks ago)',
        'Daily Multivitamin PO once daily',
      ],
      allergies: [
        'Sulfa drugs (rash)',
      ],
      attachments: [
        {
          ...SAMPLE_ATTACHMENTS[0].attachment,
          section: 'objective',
          analysis: {
            headline: '12-Lead Electrocardiogram Analysis',
            category: 'Diagnostic Cardiology / Electrocardiography',
            summary: 'Sinus rhythm at 74 bpm with normal PR and QRS intervals. Mild non-specific ST-T wave variations in lateral leads V5-V6 without acute ST-segment elevation.',
            keyFindings: [
              'Normal Sinus Rhythm at 74 bpm (PR interval: 156ms)',
              'Mild non-specific ST-T changes in leads V5-V6',
              'No acute ischemic ST elevation or reciprocal depression',
              'Corrected QT (QTc) within normal limits at 418ms',
            ],
            suggestedSectionText: '12-Lead ECG: Sinus rhythm @ 74 bpm, normal axis. PR 156ms, QRS 84ms, QTc 418ms. Mild nonspecific T-wave flattening in V5-V6 without acute ischemic ST elevation.',
            provenance: {
              engine: 'heuristic',
              usedPrebuiltData: true,
              fallbackUsed: true,
              evidenceStatus: 'curated-fallback',
            },
          },
          insertedIntoNote: false,
        },
      ],
    },
  },
  {
    id: 'pediatrics-otitis-media',
    title: 'Pediatrics: Acute Otitis Media & Allergy',
    specialty: 'Pediatrics / Urgent Care',
    description: '4yo female presenting with acute right ear pain, nocturnal fever (38.9°C), and documented severe Penicillin allergy (hives & facial swelling).',
    patient: {
      id: 'pt-3394',
      name: 'Maya Chen',
      age: 4,
      gender: 'Female',
      mrn: 'MRN-442109',
      encounterDate: '2026-10-17',
      chiefComplaint: 'Right ear pain, irritability, and fever of 38.9°C since yesterday evening',
      vitals: {
        bloodPressure: '96/60 mmHg',
        heartRate: 118,
        respiratoryRate: 24,
        temperature: '38.9 °C (102.0 °F)',
        spO2: 99,
        weightKg: 16.2,
        heightCm: 104,
      },
    },
    initialNote: {
      subjective: `Patient is a 4-year-old female brought in by her mother for acute right ear pain and persistent crying for the past 24 hours. Mother notes Maya has been tugging constantly at her right ear, woke up multiple times crying last night, and refused solid breakfast. Mild clear rhinorrhea started 3 days ago. No vomiting, diarrhea, cough, or neck stiffness.

Documented severe allergy to Penicillin: experienced full-body urticaria and peri-orbital swelling at 18 months of age after 2 doses of Amoxicillin.`,
      objective: `General: Alert 4yo female, clinging to mother, tearful during otoscopic exam but easily consoled.
Vitals: Temp 38.9°C tympanic, HR 118 bpm, RR 24 bpm, SpO2 99% room air, Weight 16.2 kg.
HEENT:
- Right Ear: Tympanic membrane is markedly erythematous, distinctly bulging with loss of bony landmarks and light reflex. Decreased pneumatic mobility. No purulent perforation or bullae. No mastoid tenderness or erythema.
- Left Ear: Tympanic membrane pearly gray, translucent, normal light reflex, mobile.
- Oropharynx: Mild cobblestoning of posterior pharynx; tonsils 1+ without exudate.
- Neck: Supple, full range of motion. Small benign bilateral anterior cervical lymph nodes palpable (<1cm), non-tender.
Lungs: Clear to auscultation bilaterally, no stridor or wheezing.`,
      assessment: `1. Acute Otitis Media (AOM), unilateral right ear, moderately severe.
2. Upper Respiratory Viral Prodrome.
3. Severe Penicillin Allergy (Type I hypersensitivity history - anaphylactoid reaction).`,
      plan: `1. Antibiotic Selection & Allergy Safety:
   - Amoxicillin and Augmentin are STRICTLY CONTRAINDICATED due to documented IgE-mediated allergic history.
   - For non-severe delayed rash, 3rd gen cephalosporins might be considered, but given history of facial swelling, select oral Cefdinir 14 mg/kg/day OR Azithromycin (10 mg/kg day 1, then 5 mg/kg days 2-5). Selecting Cefdinir 225 mg (approx 14 mg/kg) PO once daily for 10 days, after confirming low cross-reactivity tolerance or Macrolide alternative.
   - Ibuprofen / Acetaminophen weight-based dosing for pain and fever control:
     * Acetaminophen 160mg/5mL suspension: 240mg (7.5 mL) every 4-6 hours PRN (max 5 doses/24hr).
     * Ibuprofen 100mg/5mL suspension: 160mg (8 mL) every 6-8 hours PRN with food.

2. Patient & Caregiver Instructions:
   - Emphasize finishing the full antibiotic course even after ear pain improves.
   - Seek immediate emergency care if high fever persists >48h, swelling behind the ear (mastoiditis), lethargy, or rash develops.
   - Follow up in 48-72 hours if no clinical improvement.`,
      medications: [
        'None regular',
        'Pediatric multivitamin chewable once daily',
      ],
      allergies: [
        'Penicillins (Amoxicillin: hives, periorbital edema)',
      ],
    },
  },
  {
    id: 'endocrinology-t2d-renal',
    title: 'Endocrinology: Type 2 Diabetes & Early CKD',
    specialty: 'Endocrinology / Primary Care',
    description: '52yo female with uncontrolled T2D (HbA1c 9.1%), microalbuminuria, Metformin monotherapy, and borderline renal function (eGFR 58).',
    patient: {
      id: 'pt-5120',
      name: 'Elena Rostova',
      age: 52,
      gender: 'Female',
      mrn: 'MRN-609124',
      encounterDate: '2026-10-17',
      chiefComplaint: 'Follow-up for routine 6-month diabetic evaluation and lab review',
      vitals: {
        bloodPressure: '138/86 mmHg',
        heartRate: 72,
        respiratoryRate: 16,
        temperature: '37.0 °C (98.6 °F)',
        spO2: 98,
        weightKg: 84.0,
        heightCm: 165,
      },
    },
    initialNote: {
      subjective: `Patient is a 52-year-old female with a 7-year history of Type 2 Diabetes Mellitus presenting for routine follow-up. She reports adherence to Metformin 1000mg twice daily. Home capillary blood glucose logs show fasting readings ranging 160-210 mg/dL and postprandial spikes up to 260 mg/dL. Reports mild polydipsia and nocturia x2 per night. Denies paresthesias in feet, visual blurring, hypoglycemia episodes, or chest pain.`,
      objective: `Vitals: BP 138/86 mmHg, HR 72 bpm, BMI 30.9 kg/m².
Cardiovascular: Regular rhythm, normal heart sounds.
Abdomen: Soft, non-tender, no organomegaly.
Extremities & Neurological: No peripheral edema. Bilateral pedal pulses 2+. 10g monofilament sensation intact in all 10 standard plantar test sites bilaterally. Vibration sense intact. No diabetic foot ulcers or calluses.
Recent Labs:
- HbA1c: 9.1% (elevated, target < 7.0%)
- Fasting Glucose: 184 mg/dL
- Serum Creatinine: 1.18 mg/dL, eGFR: 58 mL/min/1.73m² (Stage 3a CKD)
- Urine Albumin-to-Creatinine Ratio (uACR): 180 mg/g (persistent microalbuminuria)
- Lipid Panel: LDL 112 mg/dL, HDL 42 mg/dL, Triglycerides 210 mg/dL`,
      assessment: `1. Type 2 Diabetes Mellitus, poorly controlled (HbA1c 9.1%) on oral monotherapy.
2. Diabetic Kidney Disease (Stage 3a CKD, G2A2) with persistent microalbuminuria (uACR 180 mg/g).
3. Stage 1 Hypertension in diabetic patient (target <130/80 mmHg).
4. Mixed Dyslipidemia.`,
      plan: `1. Glycemic & Cardiorenal Management:
   - Continue Metformin 1000mg BID (safe since eGFR > 45 mL/min, but monitor renal function biannually).
   - Add SGLT2 inhibitor: Empagliflozin 10mg PO once daily (proven cardiorenal benefit, slows CKD progression, reduces cardiovascular mortality, improves glycemic control with low hypoglycemia risk). Counsel patient on perineal hygiene and staying hydrated.
   - If A1c remains >7.5% at 3 months, consider adding a GLP-1 receptor agonist (e.g., Semaglutide) for synergistic glycemic and weight control.

2. Blood Pressure & Renal Protection:
   - Initiate ACE inhibitor: Lisinopril 10mg PO once daily for renal antiproteinuric protection and blood pressure optimization (target BP < 130/80 mmHg).
   - Recheck serum creatinine, eGFR, and potassium in 2-3 weeks.

3. Preventive Care & Screening:
   - Schedule annual dilated eye examination with ophthalmology.
   - Reinforce medical nutrition therapy and consistent 150 min/week moderate aerobic exercise.
   - Follow-up in clinic in 6-8 weeks with repeat fasting glucose and metabolic panel.`,
      medications: [
        'Metformin 1000mg PO BID with meals',
        'Atorvastatin 20mg PO once daily',
        'Aspirin 81mg PO once daily',
      ],
      allergies: [
        'No known drug allergies (NKDA)',
      ],
    },
  },
  {
    id: 'emergency-chest-pain',
    title: 'Emergency: Atypical Chest Pain Workup',
    specialty: 'Emergency Medicine / Acute Care',
    description: '48yo female with 2 hours of sharp substernal and epigastric discomfort, aggravated by recumbency, normal initial high-sensitivity Troponin.',
    patient: {
      id: 'pt-9034',
      name: 'Marcus Vance',
      age: 48,
      gender: 'Male',
      mrn: 'MRN-194038',
      encounterDate: '2026-10-17',
      chiefComplaint: 'Substernal chest pressure and retrosternal burning for 2 hours',
      vitals: {
        bloodPressure: '142/88 mmHg',
        heartRate: 78,
        respiratoryRate: 16,
        temperature: '36.9 °C (98.4 °F)',
        spO2: 98,
        weightKg: 86.0,
        heightCm: 175,
      },
    },
    initialNote: {
      subjective: `Patient is a 48-year-old male with a history of tobacco use (15 pack-years, quit 2 years ago) and hyperlipidemia who presents to the emergency department with 2 hours of retrosternal burning chest discomfort that began 45 minutes after eating a heavy spicy dinner. He describes it as a 6/10 dull squeezing and burning sensation behind the lower sternum.

He notes the pain is somewhat worse when lying flat on the stretcher and improved slightly when sitting upright. Denies radiation to left arm or jaw, diaphoresis, dyspnea, nausea, or lightheadedness. No previous history of CAD.`,
      objective: `General: 48yo male in mild distress, conversational, skin warm and dry.
Cardiovascular: Regular rate, S1/S2 normal, no murmurs, rubs, or gallops. Normal peripheral pulses.
Lungs: Clear to auscultation bilaterally, no wheezes or rales.
Chest Wall: Mild reproducibility on deep palpation of costochondral junctions bilaterally, but does not completely mimic his deep visceral discomfort.
Abdomen: Soft, mild epigastric tenderness to deep palpation without guarding or rebound. Normal bowel sounds.
Diagnostic Tests:
- 12-lead ECG: Normal sinus rhythm at 76 bpm, no ST-segment elevation or depression, no T-wave inversions.
- High-sensitivity Troponin I (0-hr): 6 ng/L (normal reference < 14 ng/L).
- Chest X-Ray (AP portable): No mediastinal widening, no pneumothorax, no acute pulmonary infiltrates.`,
      assessment: `1. Retrosternal Chest Discomfort: Differential includes:
   - Gastroesophageal Reflux Disease (GERD) / Esophageal spasm (high likelihood given postprandial onset and positional relief).
   - Acute Coronary Syndrome (ACS) / Unstable Angina (must rigorously rule out given risk factors).
   - Acute Pericarditis (positional component noted, but ECG lacks diffuse concave ST-elevations).
   - Musculoskeletal / Costochondritis.`,
      plan: `1. Acute Exclusion of Ischemia:
   - Repeat High-sensitivity Troponin I at 2 hours (0/2-hr rapid rule-out protocol).
   - Serial 12-lead ECG if symptoms persist or recur.
   - Calculate HEART score for risk stratification.

2. Diagnostic & Symptomatic Trial:
   - Administer GI cocktail trial (Viscous Lidocaine + Antacid / H2 blocker or PPI). If prompt resolution occurs, supports esophageal etiology, though does not fully exclude ACS.
   - Administer oral Omeprazole 40mg.

3. Disposition:
   - If 2-hr Troponin remains undetectable/negative and HEART score is low (<3): safe for outpatient cardiac follow-up and stress testing.
   - Strict return precautions: return immediately for worsening chest pain, arm/jaw radiation, diaphoresis, or syncope.`,
      medications: [
        'Rosuvastatin 10mg PO daily',
        'OTC Famotidine 20mg PRN',
      ],
      allergies: [
        'Codeine (nausea/dizziness)',
      ],
    },
  },
];

export const FALLBACK_ANALYSES: Record<string, ClinicalAnalysisResult> = {
  'cardiology-htn-dyspnea': {
    differentials: [
      {
        diagnosis: 'Acute Decompensated Heart Failure (HFpEF vs HFrEF)',
        icd10: 'I50.9',
        likelihood: 'High',
        reasoning: 'Exertional dyspnea, 2-pillow orthopnea, paroxysmal nocturnal dyspnea episodes, bibasilar fine crackles, elevated JVP, S3 gallop, and bilateral pedal edema.',
        recommendedWorkup: ['Serum NT-proBNP', 'Transthoracic Echocardiogram (TTE)', 'Chest Radiograph (PA/Lat)', 'Serial Daily Weights'],
      },
      {
        diagnosis: 'NSAID-Induced Acute Kidney Injury & Volume Retention',
        icd10: 'N17.9',
        likelihood: 'High',
        reasoning: 'Initiation of OTC Ibuprofen 400mg TID in a patient on Lisinopril. Creatinine elevated from 1.05 to 1.42 mg/dL. NSAIDs inhibit vasodilatory prostaglandins at the afferent arteriole, while ACE inhibitors vasodilate the efferent arteriole, dropping glomerular filtration and causing sodium/water retention.',
        recommendedWorkup: ['Comprehensive Metabolic Panel in 5 days', 'Urinalysis with microscopy', 'Urine protein/creatinine ratio'],
      },
      {
        diagnosis: 'Exacerbation of Essential Hypertension',
        icd10: 'I10',
        likelihood: 'Moderate',
        reasoning: 'Blood pressure 154/92 mmHg, likely secondary to NSAID blunting of Lisinopril efficacy and hypervolemia.',
        recommendedWorkup: ['Home blood pressure monitoring log', 'Ambulatory blood pressure monitoring'],
      },
      {
        diagnosis: 'Coronary Artery Disease / Anginal Equivalent',
        icd10: 'I25.10',
        likelihood: 'Consider',
        reasoning: 'Exertional dyspnea can represent an anginal equivalent in patients with cardiovascular risk factors, even without classic substernal chest pressure.',
        recommendedWorkup: ['12-lead ECG', 'High-sensitivity Troponin', 'Cardiology Stress Test after stabilization'],
      },
    ],
    safetyAlerts: [
      {
        type: 'interaction',
        severity: 'critical',
        substances: ['Lisinopril', 'Ibuprofen'],
        title: 'ACE Inhibitor + NSAID Severe Nephrotoxic Interaction',
        description: 'Concurrent use of NSAIDs with ACE inhibitors significantly increases the risk of acute renal failure (triple whammy risk if diuretics are added) and blunts the antihypertensive efficacy of Lisinopril.',
        recommendation: 'Discontinue Ibuprofen immediately. Use Acetaminophen for pain control. Monitor renal function and potassium.',
      },
      {
        type: 'contraindication',
        severity: 'moderate',
        substances: ['Sulfa allergy', 'Loop Diuretics (Furosemide)'],
        title: 'Cross-Reactivity Alert: Furosemide in Sulfa Allergy',
        description: 'Patient has a documented Sulfa allergy (rash). While cross-reactivity between antimicrobial sulfonamides and non-antimicrobial sulfonamides like Furosemide is low, caution is advised.',
        recommendation: 'Evaluate if allergy was mild. If non-severe, Furosemide is generally tolerated. Alternatively consider Ethacrynic acid if true severe hypersensitivity exists.',
      },
    ],
    icd10Suggestions: [
      { code: 'I50.9', description: 'Heart failure, unspecified', category: 'Cardiovascular', rationale: 'Matches primary clinical presentation of fluid overload and dyspnea.' },
      { code: 'I10', description: 'Essential (primary) hypertension', category: 'Cardiovascular', rationale: 'Documented chronic medical condition with current elevation to 154/92.' },
      { code: 'N17.9', description: 'Acute kidney injury, unspecified', category: 'Renal', rationale: 'Creatinine acute rise from 1.05 to 1.42 mg/dL.' },
      { code: 'R60.0', description: 'Localized edema (bilateral lower extremity)', category: 'Signs & Symptoms', rationale: 'Presenting bilateral sock-mark ankle pitting edema.' },
      { code: 'T39.315A', description: 'Adverse effect of propionic acid derivatives (Ibuprofen)', category: 'Toxicology/Adverse', rationale: 'Precipitating drug interaction.' },
    ],
    patientSummary: {
      headline: 'Heart Function & Medication Safety Instructions',
      plainLanguageOverview: 'Your body is holding onto extra fluid, which is causing fluid buildup in your lungs and swelling in your ankles. This is why you have felt short of breath when walking or climbing stairs. Furthermore, taking Ibuprofen while on Lisinopril made it harder for your kidneys to clear salt and water.',
      keyInstructions: [
        'STOP taking Ibuprofen right away. If you have knee pain, you may take Tylenol (Acetaminophen) 500mg instead.',
        'Take your new water pill (Furosemide 20mg) every morning with breakfast. It helps your kidneys flush out the extra water.',
        'Weigh yourself every single morning after using the bathroom and before eating. Write down your weight in a notebook.',
        'Cut back on salty foods. Avoid canned soups, cured meats, and adding table salt to meals.',
      ],
      medicationSchedule: [
        { name: 'Furosemide 20mg', instructions: 'Take 1 tablet every morning', purpose: 'Removes excess fluid from body and lungs' },
        { name: 'Lisinopril 20mg', instructions: 'Take 1 tablet every morning', purpose: 'Controls blood pressure and protects your heart' },
        { name: 'Atorvastatin 20mg', instructions: 'Take 1 tablet at bedtime', purpose: 'Maintains healthy cholesterol levels' },
        { name: 'Acetaminophen 500mg (Tylenol)', instructions: 'Take 1 tablet every 6 hours as needed', purpose: 'Safe alternative for knee pain' },
      ],
      redFlagSymptoms: [
        'Sudden weight gain of 3 pounds in 1 day or 5 pounds in 1 week',
        'Worsening shortness of breath when resting or lying flat',
        'Chest pain, heavy pressure, or fast fluttering heartbeat',
        'Dizziness or feeling faint when standing up',
      ],
      followUp: 'Return to the clinic in 5 to 7 days for a blood test to check your kidney function and potassium levels.',
    },
    clinicalMissingInfoAlerts: [
      'Serum NT-proBNP / BNP result pending.',
      'Baseline echocardiogram report from the past 12 months is not yet linked.',
    ],
    missingHistoryQuestions: [
      {
        id: 'hist-cardio-01',
        domain: 'CHF Staging & Severity',
        question: 'How many pillows do you sleep on at night to breathe comfortably, and do you ever awaken suddenly feeling suffocated or gasping for air (PND)?',
        rationale: 'Quantifies orthopnea severity and detects paroxysmal nocturnal dyspnea indicative of elevated left ventricular end-diastolic filling pressures.',
        suggestedInsert: 'Subjective: Patient reports sleeping on 2 pillows; denies acute waking gasping for air (negative paroxysmal nocturnal dyspnea).',
        status: 'unasked',
      },
      {
        id: 'hist-cardio-02',
        domain: 'Fluid Retention & Dietary Triggers',
        question: 'Have you noticed any rapid weight gain over the last 48-72 hours (e.g. >3-5 lbs), and have you had high-sodium meals or salty snacks recently?',
        rationale: 'Identifies acute volumetric expansion prior to overt peripheral edema and identifies dietary sodium decompensation triggers.',
        suggestedInsert: 'Subjective: Patient reports +4 lbs weight gain over the past 4 days on home bathroom scale; admits to consuming high-sodium canned soup.',
        status: 'unasked',
      },
      {
        id: 'hist-cardio-03',
        domain: 'Ischemic Workup / Angina Rule-Out',
        question: 'Do you experience any chest tightness, heaviness, jaw or left arm discomfort, nausea, or cold sweats when exertion occurs?',
        rationale: 'Excludes silent myocardial ischemia or coronary insufficiency as the primary precipitator of acute heart failure decompensation.',
        suggestedInsert: 'Subjective: Pertinent Negatives: Denies exertional chest tightness, left arm or jaw radiation, diaphoresis, lightheadedness, or syncope.',
        status: 'unasked',
      },
      {
        id: 'hist-cardio-04',
        domain: 'Iatrogenic / NSAID Screening',
        question: 'Have you been taking any other over-the-counter NSAIDs (like Aleve, Naproxen, Aspirin, or cold remedies) in addition to the Ibuprofen?',
        rationale: 'NSAIDs constrict renal afferent arterioles, causing water/sodium retention and blunting ACE inhibitor/diuretic efficacy.',
        suggestedInsert: 'Subjective: Medication Review: Disclosed taking OTC Ibuprofen 400mg TID for knee osteoarthritis; denies other OTC analgesics.',
        status: 'unasked',
      },
    ],
    missingExamFindings: [
      {
        id: 'exam-cardio-01',
        organSystem: 'Cardiovascular',
        maneuver: 'Jugular Venous Pressure (JVP) at 45° Inclination',
        clinicalSignificance: 'Gold standard bedside physical finding for assessing central venous pressure (CVP) and right ventricular filling pressure.',
        normalExpectation: 'Internal jugular venous pulsation meniscus ≤3 cm above sternal angle at 45° angle of inclination (<8 cm H2O total pressure).',
        abnormalIndication: 'JVP elevated >4 cm above sternal angle or visible at angle of mandible with patient seated upright.',
        suggestedInsert: 'Cardiovascular Exam: JVP elevated to 6 cm above sternal angle at 45 degrees, consistent with volume overload.',
        status: 'unexamined',
      },
      {
        id: 'exam-cardio-02',
        organSystem: 'Cardiovascular',
        maneuver: 'Hepatojugular / Abdominojugular Reflux Test',
        clinicalSignificance: 'Distinguishes true right ventricular compliance impairment from transient hyperdynamic volume states.',
        normalExpectation: 'Transient brief flutter of JVP that promptly returns to baseline during continuous abdominal compression.',
        abnormalIndication: 'Sustained elevation of jugular venous pulsation >3 cm for the entire 10 seconds of firm mid-abdominal compression.',
        suggestedInsert: 'Cardiovascular Exam: Positive hepatojugular reflux test with sustained >3 cm rise in jugular pulsation upon 10-second RUQ pressure.',
        status: 'unexamined',
      },
      {
        id: 'exam-cardio-03',
        organSystem: 'Cardiovascular',
        maneuver: 'Apex Bell Auscultation in Left Lateral Decubitus (S3 Gallop)',
        clinicalSignificance: 'Specific marker of elevated left ventricular end-diastolic filling pressure and early passive ventricular filling overload.',
        normalExpectation: 'Physiologic S1 and S2 crisp; absence of third or fourth heart sounds.',
        abnormalIndication: 'Low-pitched early diastolic S3 gallop appreciated with the stethoscope bell lightly placed at the apical impulse.',
        suggestedInsert: 'Cardiovascular Exam: Heart: Regular rate and rhythm, normal S1/S2, distinct S3 ventricular gallop audible at apex with bell in left lateral decubitus; no S4 or friction rubs.',
        status: 'unexamined',
      },
      {
        id: 'exam-cardio-04',
        organSystem: 'Vascular',
        maneuver: 'Bilateral Lower Extremity Pitting Edema Depth & Anatomical Extent',
        clinicalSignificance: 'Quantifies interstitial hydrostatic fluid accumulation and provides baseline for monitoring diuretic decongestion therapy.',
        normalExpectation: 'No pedal, pretibial, or presacral edema; rapid rebound without indentation.',
        abnormalIndication: 'Depressible pitting indentation graded 1+ (2mm) to 4+ (8mm) extending to mid-shin, knees, or sacrum.',
        suggestedInsert: 'Extremities: Bilateral symmetric 2+ (4mm) pitting pretibial edema extending to mid-calf; calves soft and non-tender bilaterally with negative Homan sign.',
        status: 'unexamined',
      },
    ],
    provenance: {
      engine: 'heuristic',
      usedPrebuiltData: true,
      fallbackUsed: true,
      evidenceStatus: 'curated-fallback',
    },
  },
};
