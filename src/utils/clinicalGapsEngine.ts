import {
  SoapNote,
  PatientRecord,
  MissingHistoryQuestion,
  MissingExamManeuver,
} from '../types/clinical';

/**
 * Clinical Gap Detection Engine
 * Systematically audits the active SOAP note and patient presentation to detect
 * crucial unasked history questions and unperformed physical exam maneuvers.
 */
export function identifyClinicalGaps(
  note: SoapNote,
  patient: PatientRecord
): {
  missingHistory: MissingHistoryQuestion[];
  missingExam: MissingExamManeuver[];
} {
  const subjLower = (note.subjective || '').toLowerCase();
  const objLower = (note.objective || '').toLowerCase();
  const ccLower = (patient.chiefComplaint || '').toLowerCase();
  const vitals = patient.vitals || {};
  const combined = `${ccLower} ${subjLower} ${objLower}`;

  const missingHistory: MissingHistoryQuestion[] = [];
  const missingExam: MissingExamManeuver[] = [];

  // =========================================================================
  // 1. CARDIOLOGY / DYSPNEA / HEART FAILURE
  // =========================================================================
  if (
    combined.includes('dyspnea') ||
    combined.includes('short of breath') ||
    combined.includes('breath') ||
    combined.includes('edema') ||
    combined.includes('chf') ||
    combined.includes('heart failure') ||
    combined.includes('crackles') ||
    combined.includes('orthopnea')
  ) {
    // Missing History: Orthopnea quantification
    if (!subjLower.includes('pillow') && !subjLower.includes('orthopnea')) {
      missingHistory.push({
        id: 'hist-cardio-01',
        domain: 'CHF Staging & Severity',
        question: 'How many pillows do you sleep on at night to breathe comfortably, and do you ever awaken feeling suffocated or gasping for air (PND)?',
        rationale: 'Quantifies orthopnea severity and detects paroxysmal nocturnal dyspnea indicative of elevated left ventricular filling pressures.',
        suggestedInsert: 'Subjective: Patient reports sleep position and degree of orthopnea (specifically denies/notes waking up gasping for air at night).',
        status: 'unasked',
      });
    }

    // Missing History: Weight trajectory & Sodium intake
    if (!subjLower.includes('weight') && !subjLower.includes('scale') && !subjLower.includes('sodium')) {
      missingHistory.push({
        id: 'hist-cardio-02',
        domain: 'Fluid Retention & Dietary Triggers',
        question: 'Have you noticed any rapid weight gain over the last 48-72 hours (e.g. >3-5 lbs), and have you had high-sodium meals or salty snacks recently?',
        rationale: 'Identifies acute volumetric gain before overt peripheral edema and detects dietary decompensation triggers.',
        suggestedInsert: 'Subjective: Patient denies rapid dry weight gain (>3 lbs in 48h) and reports stable dietary sodium intake.',
        status: 'unasked',
      });
    }

    // Missing History: Ischemic equivalents
    if (!subjLower.includes('chest pain') && !subjLower.includes('radiation') && !subjLower.includes('diaphoresis')) {
      missingHistory.push({
        id: 'hist-cardio-03',
        domain: 'Acute Coronary Syndrome Rule-Out',
        question: 'Do you experience any chest tightness, heaviness, jaw or left arm discomfort, nausea, or cold sweats when exertion occurs?',
        rationale: 'Rules out exertional angina or silent myocardial ischemia as the primary precipitant for acute heart failure decompensation.',
        suggestedInsert: 'Subjective: Pertinent Negatives: Denies exertional chest tightness, left arm/jaw radiation, diaphoresis, or syncope.',
        status: 'unasked',
      });
    }

    // Missing History: Over-The-Counter NSAID use
    if (!subjLower.includes('ibuprofen') && !subjLower.includes('nsaid') && !subjLower.includes('naproxen') && !subjLower.includes('motrin')) {
      missingHistory.push({
        id: 'hist-cardio-04',
        domain: 'Iatrogenic / Drug Interaction',
        question: 'Are you taking any over-the-counter pain medications like Ibuprofen, Advil, Aleve, or herbal supplements for aches or arthritis?',
        rationale: 'NSAIDs inhibit renal prostaglandin synthesis, causing afferent arteriolar constriction, blunting diuretic response, and precipitating CHF.',
        suggestedInsert: 'Subjective: Medication Review: Screened for over-the-counter NSAID consumption and nephrotoxic analgesics.',
        status: 'unasked',
      });
    }

    // Missing Exam: Jugular Venous Pressure (JVP)
    if (!objLower.includes('jvp') && !objLower.includes('jugular')) {
      missingExam.push({
        id: 'exam-cardio-01',
        organSystem: 'Cardiovascular',
        maneuver: 'Jugular Venous Pressure (JVP) at 45° Elevation',
        clinicalSignificance: 'Gold standard bedside physical finding for assessing central venous pressure (CVP) and right atrial volume overload.',
        normalExpectation: 'Internal jugular vein meniscus ≤3 cm above sternal angle (<8 cm total water pressure).',
        abnormalIndication: 'JVP elevated >4 cm above sternal angle or visible at angle of mandible.',
        suggestedInsert: 'Cardiovascular Exam: JVP non-distended, measured at ≤3 cm above sternal angle at 45 degrees angle of inclination.',
        status: 'unexamined',
      });
    }

    // Missing Exam: Hepatojugular Reflux (HJR)
    if (!objLower.includes('hepatojugular') && !objLower.includes('hjr') && !objLower.includes('abdominojugular')) {
      missingExam.push({
        id: 'exam-cardio-02',
        organSystem: 'Cardiovascular',
        maneuver: 'Hepatojugular / Abdominojugular Reflux Test',
        clinicalSignificance: 'Distinguishes true right ventricular compliance impairment from transient hyperdynamic volume states.',
        normalExpectation: 'Transient brief flutter of JVP that promptly returns to baseline during continuous abdominal compression.',
        abnormalIndication: 'Sustained elevation of jugular venous pulsation >3 cm for the entire 10 seconds of firm mid-abdominal pressure.',
        suggestedInsert: 'Cardiovascular Exam: Negative abdominojugular reflux test with no sustained JVP rise upon 10-second abdominal compression.',
        status: 'unexamined',
      });
    }

    // Missing Exam: S3 Ventricular Gallop Auscultation
    if (!objLower.includes('s3') && !objLower.includes('gallop')) {
      missingExam.push({
        id: 'exam-cardio-03',
        organSystem: 'Cardiovascular',
        maneuver: 'Apex Bell Auscultation in Left Lateral Decubitus (S3 Gallop)',
        clinicalSignificance: 'Specific marker of elevated left ventricular end-diastolic filling pressure and early passive ventricular filling overload.',
        normalExpectation: 'Physiologic S1 and S2 crisp; absence of third or fourth heart sounds.',
        abnormalIndication: 'Low-pitched early diastolic S3 gallop appreciated with the stethoscope bell lightly placed at the cardiac apex.',
        suggestedInsert: 'Cardiovascular Exam: Heart: Regular rate and rhythm, normal S1/S2, no S3 or S4 gallops, no murmurs.',
        status: 'unexamined',
      });
    }

    // Missing Exam: Pitting Edema Depth & Anatomical Extent
    if (!objLower.includes('pitting') && !objLower.includes('edema')) {
      missingExam.push({
        id: 'exam-cardio-04',
        organSystem: 'Vascular',
        maneuver: 'Lower Extremity & Sacral Pitting Edema Palpation (Grade 1+ to 4+)',
        clinicalSignificance: 'Quantifies interstitial fluid accumulation and response to diuretic decongestion therapy.',
        normalExpectation: 'No pedal, pretibial, or sacral edema; rapid rebound without indentation.',
        abnormalIndication: 'Depressible pitting indentation graded 1+ (2mm) to 4+ (8mm) extending to mid-shin, knees, or sacrum.',
        suggestedInsert: 'Extremities: Bilateral lower extremities evaluated: no pedal or pretibial pitting edema, calves soft and non-tender.',
        status: 'unexamined',
      });
    }
  }

  // =========================================================================
  // 2. HYPERTENSION & VASCULAR RESISTANCE
  // =========================================================================
  if (
    combined.includes('hypertension') ||
    combined.includes('blood pressure') ||
    combined.includes('bp') ||
    (vitals.bloodPressure && parseInt(vitals.bloodPressure, 10) > 135)
  ) {
    // Missing History: End-organ symptoms
    if (!subjLower.includes('headache') && !subjLower.includes('vision') && !subjLower.includes('scotoma')) {
      missingHistory.push({
        id: 'hist-htn-01',
        domain: 'Hypertensive Urgency / End-Organ Screen',
        question: 'Have you had severe throbbing morning headaches, blurred vision, flashing lights, epistaxis, or chest tightness?',
        rationale: 'Distinguishes asymptomatic essential hypertension from acute hypertensive urgency/emergency with end-organ injury.',
        suggestedInsert: 'Subjective: Pertinent Negatives: Denies acute visual disturbances, scotomas, occipital headaches, epistaxis, or chest pain.',
        status: 'unasked',
      });
    }

    // Missing Exam: Bilateral Arm Blood Pressure Verification
    if (!objLower.includes('bilateral') && !objLower.includes('right arm') && !objLower.includes('left arm')) {
      missingExam.push({
        id: 'exam-htn-01',
        organSystem: 'Vascular',
        maneuver: 'Bilateral Upper Extremity Blood Pressure Comparison',
        clinicalSignificance: 'Rules out subclavian artery stenosis, aortic coarctation, or aortic dissection (differential >15 mmHg is significant).',
        normalExpectation: 'Inter-arm blood pressure discrepancy ≤10 mmHg systolic.',
        abnormalIndication: 'Persistent systolic blood pressure differential >15-20 mmHg between right and left arms.',
        suggestedInsert: 'Vitals / Vascular: Blood pressure verified bilaterally: Right arm 150/90 mmHg, Left arm 148/88 mmHg (symmetric, <10 mmHg delta).',
        status: 'unexamined',
      });
    }
  }

  // =========================================================================
  // 3. ABDOMINAL PAIN / ACUTE ABDOMEN / APPENDICITIS
  // =========================================================================
  if (
    combined.includes('abdominal') ||
    combined.includes('abdomen') ||
    combined.includes('stomach') ||
    combined.includes('belly') ||
    combined.includes('rlq') ||
    combined.includes('mcburney') ||
    combined.includes('appendicitis')
  ) {
    // Missing History: Chronology and Anorexia
    if (!subjLower.includes('migrat') && !subjLower.includes('anorexia') && !subjLower.includes('appetite')) {
      missingHistory.push({
        id: 'hist-gi-01',
        domain: 'Alvarado Score / Pain Migration',
        question: 'Did the discomfort start around your belly button and migrate down to the lower right side, and do you have complete loss of appetite (Hamburger sign)?',
        rationale: 'Periumbilical-to-RLQ migration combined with anorexia carries >80% sensitivity for acute appendicitis.',
        suggestedInsert: 'Subjective: Patient describes classic visceral pain migration from periumbilical region to focal right lower quadrant; positive anorexia.',
        status: 'unasked',
      });
    }

    // Missing Exam: McBurney Point & Rovsing Sign
    if (!objLower.includes('mcburney') || !objLower.includes('rovsing')) {
      missingExam.push({
        id: 'exam-gi-01',
        organSystem: 'Abdominal',
        maneuver: 'McBurney Point Palpation & Rovsing Referred Tenderness',
        clinicalSignificance: 'Cardinal physical signs of localized parietal peritoneal irritation in acute appendicitis.',
        normalExpectation: 'Right lower quadrant soft, non-tender to light and deep palpation, Rovsing sign negative.',
        abnormalIndication: 'Marked tenderness at 1/3 distance between ASIS and umbilicus; pain referred to RLQ upon deep palpation of LLQ.',
        suggestedInsert: 'Abdominal Exam: Marked point tenderness localized at McBurney point; positive Rovsing sign with referred pain to RLQ upon LLQ palpation.',
        status: 'unexamined',
      });
    }

    // Missing Exam: Psoas & Obturator Maneuvers
    if (!objLower.includes('psoas') && !objLower.includes('obturator')) {
      missingExam.push({
        id: 'exam-gi-02',
        organSystem: 'Abdominal',
        maneuver: 'Psoas Sign (Hip Extension) & Obturator Sign (Internal Rotation)',
        clinicalSignificance: 'Identifies retrocecal or deep pelvic retroperitoneal inflammation in atypical appendicitis presentations.',
        normalExpectation: 'Passive hip extension and internal rotation elicited smoothly without abdominal discomfort.',
        abnormalIndication: 'Right lower quadrant pain reproduced by passive hyperextension of right hip (Psoas) or internal rotation of flexed right thigh (Obturator).',
        suggestedInsert: 'Abdominal Exam: Special Maneuvers: Positive Psoas sign upon passive right hip hyperextension; negative Obturator sign.',
        status: 'unexamined',
      });
    }
  }

  // =========================================================================
  // 4. PEDIATRICS / EAR PAIN / FEVER / AOM
  // =========================================================================
  if (
    combined.includes('ear') ||
    combined.includes('otitis') ||
    combined.includes('tympanic') ||
    combined.includes('pediatric') ||
    patient.age < 12
  ) {
    // Missing History: Hydration & Voiding
    if (!subjLower.includes('diaper') && !subjLower.includes('wet') && !subjLower.includes('intake')) {
      missingHistory.push({
        id: 'hist-ped-01',
        domain: 'Pediatric Hydration Assessment',
        question: 'How many wet diapers has the child produced in the last 12-24 hours, and are they tolerating oral liquids without vomiting?',
        rationale: 'Assesses volume status and guards against dehydration in febrile pediatric encounters.',
        suggestedInsert: 'Subjective: Parent confirms adequate oral fluid intake with 4-5 wet diapers recorded over past 24 hours; no vomiting or diarrhea.',
        status: 'unasked',
      });
    }

    // Missing Exam: Pneumatic Otoscopy of Both Ears
    if (!objLower.includes('membrane') || !objLower.includes('erythema') || !objLower.includes('bulging')) {
      missingExam.push({
        id: 'exam-ped-01',
        organSystem: 'HEENT',
        maneuver: 'Bilateral Otoscopy & Tympanic Membrane Inspection',
        clinicalSignificance: 'Mandated by AAP clinical guidelines to differentiate Acute Otitis Media from Otitis Media with Effusion.',
        normalExpectation: 'Tympanic membranes pearl gray, translucent, sharp light reflex, mobile on insufflation.',
        abnormalIndication: 'Moderate-to-severe bulging, erythema, loss of bony landmarks, and cloudy or purulent middle ear effusion.',
        suggestedInsert: 'HEENT: Otoscopy: Right TM severely erythematous, bulging with purulent middle ear effusion and blunted light reflex. Left TM normal.',
        status: 'unexamined',
      });
    }
  }

  // =========================================================================
  // 5. MUSCULOSKELETAL / KNEE / JOINT INJURY
  // =========================================================================
  if (
    combined.includes('knee') ||
    combined.includes('meniscus') ||
    combined.includes('acl') ||
    combined.includes('mcmurray') ||
    combined.includes('joint')
  ) {
    // Missing History: Mechanical Locking & Pop
    if (!subjLower.includes('lock') && !subjLower.includes('catch') && !subjLower.includes('pop')) {
      missingHistory.push({
        id: 'hist-msk-01',
        domain: 'Mechanical Knee Symptoms',
        question: 'Did you hear or feel an audible pop at the time of twisting, and has the knee gotten locked or caught so you cannot bend or straighten it?',
        rationale: 'Audible pop with immediate effusion suggests ligamentous/meniscal injury; true locking suggests displaced bucket-handle tear.',
        suggestedInsert: 'Subjective: Patient describes twisting mechanism with immediate joint effusion; notes episodic mechanical catching and pain with weight-bearing.',
        status: 'unasked',
      });
    }

    // Missing Exam: McMurray & Joint Line Tenderness
    if (!objLower.includes('mcmurray') || !objLower.includes('joint line')) {
      missingExam.push({
        id: 'exam-msk-01',
        organSystem: 'Musculoskeletal',
        maneuver: 'Medial & Lateral Joint Line Palpation + McMurray Click Test',
        clinicalSignificance: 'High diagnostic specificity for structural tears of the medial and lateral fibrocartilage menisci.',
        normalExpectation: 'Joint lines non-tender to firm palpation; smooth flexion/extension without clicking or localized joint line pain.',
        abnormalIndication: 'Focal joint line tenderness with painful palpable click elicited on tibial external rotation and axial knee extension.',
        suggestedInsert: 'MSK: Right Knee: Point tenderness along medial joint line; positive McMurray test producing palpable click and localized discomfort.',
        status: 'unexamined',
      });
    }

    // Missing Exam: Lachman Test & Collateral Stability
    if (!objLower.includes('lachman') && !objLower.includes('drawer')) {
      missingExam.push({
        id: 'exam-msk-02',
        organSystem: 'Musculoskeletal',
        maneuver: 'Lachman Test & Varus/Valgus Ligament Stress Testing',
        clinicalSignificance: 'Most sensitive bedside physical examination maneuver for diagnosing Anterior Cruciate Ligament (ACL) rupture.',
        normalExpectation: 'Firm, solid endpoint with <3 mm anterior tibial translation compared to contralateral uninjured knee.',
        abnormalIndication: 'Soft or absent endpoint with >5 mm anterior translation (positive Lachman); medial joint space opening on valgus stress.',
        suggestedInsert: 'MSK: Right Knee: Lachman test negative with firm endpoint (<3mm translation); collateral ligaments stable to varus/valgus stress at 0° and 30°.',
        status: 'unexamined',
      });
    }
  }

  // =========================================================================
  // 6. GENERAL MEDICINE / UNIVERSAL REVIEWS
  // =========================================================================
  // Baseline social history / smoking
  if (!subjLower.includes('tobacco') && !subjLower.includes('smok') && !subjLower.includes('alcohol')) {
    missingHistory.push({
      id: 'hist-gen-01',
      domain: 'Social History & Cardiovascular Risk',
      question: 'Do you currently or previously smoke cigarettes, vape, or consume alcoholic beverages regularly?',
      rationale: 'Essential for cardiovascular risk stratification, anesthetic risk profiling, and pharmacologic interactions.',
      suggestedInsert: 'Subjective: Social History: Denies active tobacco smoking, vaping, or illicit drug use; reports occasional social alcohol intake.',
      status: 'unasked',
    });
  }

  return { missingHistory, missingExam };
}
