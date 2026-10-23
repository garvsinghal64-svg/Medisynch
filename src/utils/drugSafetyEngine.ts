import { DrugSafetyAlert, EmergencyRedFlag, Vitals } from '../types/clinical';

export interface KnownInteractionRule {
  drugAKeywords: string[];
  drugBKeywords: string[];
  severity: 'critical' | 'moderate' | 'informational';
  title: string;
  description: string;
  clinicalMechanism: string;
  recommendation: string;
  guidelineSource: string;
}

export interface AllergyContraindicationRule {
  allergyKeywords: string[];
  contraindicatedDrugKeywords: string[];
  severity: 'critical' | 'moderate';
  title: string;
  description: string;
  clinicalMechanism: string;
  recommendation: string;
  guidelineSource: string;
}

// Deterministic pharmacy interaction knowledge base
export const DETERMINISTIC_DRUG_INTERACTIONS: KnownInteractionRule[] = [
  {
    drugAKeywords: ['lisinopril', 'enalapril', 'ramipril', 'captopril', 'benazepril', 'losartan', 'valsartan', 'candesartan', 'zestril', 'prinivil'],
    drugBKeywords: ['ibuprofen', 'naproxen', 'ketorolac', 'meloxicam', 'diclofenac', 'indomethacin', 'celecoxib', 'advil', 'motrin', 'aleve'],
    severity: 'critical',
    title: 'ACEi/ARB + NSAID: Acute Nephrotoxicity & Blunted Antihypertensive Response',
    description: 'Concurrent use of an ACE inhibitor/ARB with systemic NSAIDs promotes acute kidney injury (loss of glomerular filtration via afferent vasoconstriction + efferent vasodilation) and causes sodium retention.',
    clinicalMechanism: 'NSAIDs inhibit prostaglandin-mediated afferent arteriolar vasodilation, while ACEi/ARBs block angiotensin II-mediated efferent vasoconstriction, precipitating acute drops in intraglomerular pressure (Triple Whammy effect).',
    recommendation: 'Discontinue systemic NSAID immediately. Substitute with Acetaminophen or topical analgesics. Recheck renal panel (BUN/Cr/eGFR) and serum potassium.',
    guidelineSource: 'KDIGO 2024 Clinical Practice Guideline for CKD & AHA Hypertension Scientific Statement',
  },
  {
    drugAKeywords: ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan', 'zestril', 'prinivil'],
    drugBKeywords: ['spironolactone', 'eplerenone', 'triamterene', 'amiloride', 'aldactone'],
    severity: 'critical',
    title: 'ACEi/ARB + Potassium-Sparing Diuretic: Severe Hyperkalemia Risk',
    description: 'Additive potassium retention can lead to life-threatening cardiac arrhythmias, particularly in patients with baseline renal impairment or diabetes.',
    clinicalMechanism: 'Dual blockade of aldosterone production and activity dramatically suppresses distal nephron potassium excretion.',
    recommendation: 'Monitor serum potassium and creatinine within 3–7 days of initiation or dose titration. Advise patient on low-potassium diet and avoiding potassium-based salt substitutes.',
    guidelineSource: 'ACC/AHA 2022 Heart Failure Guidelines',
  },
  {
    drugAKeywords: ['warfarin', 'coumadin', 'jantoven'],
    drugBKeywords: ['bactrim', 'septra', 'sulfamethoxazole', 'trimethoprim', 'tmp-smx', 'cotrimoxazole'],
    severity: 'critical',
    title: 'Warfarin + Bactrim / TMP-SMX: Severe Supratherapeutic INR & Bleeding Hazard',
    description: 'Trimethoprim-sulfamethoxazole potently inhibits CYP2C9, the primary metabolic pathway for active S-warfarin, precipitating dramatic INR elevation and fatal hemorrhage risk.',
    clinicalMechanism: 'Inhibition of CYP2C9 and displacement of warfarin from serum albumin dramatically increases free active warfarin concentrations.',
    recommendation: 'Avoid combination if possible. If mandatory, empirically reduce warfarin dose by 30–50% and monitor daily or alternate-day INR.',
    guidelineSource: 'CHEST 2023 Antithrombotic Guidelines & FDA Black Box Warning',
  },
  {
    drugAKeywords: ['linezolid', 'zyvox'],
    drugBKeywords: ['sertraline', 'zoloft', 'fluoxetine', 'prozac', 'citalopram', 'celexa', 'escitalopram', 'lexapro', 'paroxetine', 'paxil', 'duloxetine', 'cymbalta', 'venlafaxine', 'effexor'],
    severity: 'critical',
    title: 'Linezolid + SSRI/SNRI: Severe Life-Threatening Serotonin Syndrome',
    description: 'Linezolid is a reversible, nonselective monoamine oxidase inhibitor (MAOI). Co-administration with serotonergic psychiatric medications produces toxic central serotonin accumulation.',
    clinicalMechanism: 'Dual inhibition of serotonin reuptake (SSRI/SNRI) and serotonin degradation (MAO inhibition by linezolid) induces neuromuscular hyperactivity, hyperthermia, and autonomic collapse.',
    recommendation: 'Contraindicated. Discontinue SSRI/SNRI with appropriate washout prior to linezolid, or select alternative Gram-positive antibiotic (Vancomycin, Daptomycin).',
    guidelineSource: 'FDA Drug Safety Alert & Infectious Diseases Society of America (IDSA)',
  },
  {
    drugAKeywords: ['warfarin', 'coumadin'],
    drugBKeywords: ['aspirin', 'ibuprofen', 'naproxen', 'meloxicam', 'ketorolac'],
    severity: 'critical',
    title: 'Warfarin + NSAID/Aspirin: Major Hemorrhage & Gastrointestinal Bleed',
    description: 'Substantial multi-fold increase in upper GI ulceration and systemic hemorrhagic complications.',
    clinicalMechanism: 'NSAIDs cause gastric mucosal injury and reversible platelet inhibition on top of vitamin K-dependent clotting factor suppression by Warfarin.',
    recommendation: 'Avoid concurrent NSAIDs unless specifically indicated with strict gastroprotection (e.g. low-dose aspirin + PPI in acute coronary syndrome under cardiology oversight).',
    guidelineSource: 'CHEST 2023 Antithrombotic Guidelines & FDA Black Box Warning',
  },
  {
    drugAKeywords: ['clopidogrel', 'plavix'],
    drugBKeywords: ['omeprazole', 'esomeprazole', 'prilosec', 'nexium'],
    severity: 'moderate',
    title: 'Clopidogrel + Omeprazole: CYP2C19 Antiplatelet Attenuation',
    description: 'Omeprazole competitively inhibits hepatic CYP2C19, significantly reducing bioactivation of clopidogrel into its active antiplatelet thiol metabolite.',
    clinicalMechanism: 'Competitive enzymatic blockade of cytochrome P450 2C19 diminishes platelet aggregation inhibition, risking stent thrombosis or recurrent ischemic stroke.',
    recommendation: 'Switch gastroprotective agent to Pantoprazole, Famotidine (H2RA), or Rabeprazole, which exhibit minimal CYP2C19 interaction.',
    guidelineSource: 'AHA/ACC 2021 Coronary Revascularization Guidelines & FDA Safety Communication',
  },
  {
    drugAKeywords: ['atorvastatin', 'simvastatin', 'lovastatin'],
    drugBKeywords: ['clarithromycin', 'erythromycin', 'ketoconazole', 'itraconazole'],
    severity: 'critical',
    title: 'Statin + Strong CYP3A4 Inhibitor: Severe Rhabdomyolysis Risk',
    description: 'Massive increase in systemic statin plasma concentrations resulting in severe myopathy, elevated creatine kinase (CK), and potential acute tubular necrosis.',
    clinicalMechanism: 'Macrolides potently inhibit intestinal and hepatic CYP3A4-mediated statin catabolism, increasing AUC up to 5-10 fold.',
    recommendation: 'Temporarily withhold Atorvastatin/Simvastatin for the duration of the macrolide antibiotic course, or prescribe Azithromycin (which does not inhibit CYP3A4).',
    guidelineSource: 'AHA Scientific Statement on Statin Safety & Drug Interactions (Circulation 2022)',
  },
  {
    drugAKeywords: ['ciprofloxacin', 'levofloxacin', 'moxifloxacin'],
    drugBKeywords: ['amiodarone', 'sotalol', 'haloperidol', 'methadone', 'ondansetron', 'erythromycin'],
    severity: 'critical',
    title: 'Fluoroquinolone + QTc Prolonging Agent: Torsades de Pointes Warning',
    description: 'Additive prolongation of the cardiac ventricular repolarization interval (QTc), precipitating polymorphic ventricular tachycardia (TdP) and sudden cardiac arrest.',
    clinicalMechanism: 'Blockade of human ether-a-go-go-related gene (hERG) potassium channels in cardiac myocytes.',
    recommendation: 'Obtain baseline 12-lead ECG; avoid combination if corrected QT (QTc) > 460ms in males or > 470ms in females. Correct electrolyte abnormalities (potassium, magnesium).',
    guidelineSource: 'CredibleMeds QTc Risk Stratification & ACC/AHA Electrophysiology Guidelines',
  },
  {
    drugAKeywords: ['metformin', 'glucophage'],
    drugBKeywords: ['contrast', 'iodinated', 'iohexol', 'iopamidol'],
    severity: 'moderate',
    title: 'Metformin + Intravenous Iodinated Contrast: Lactic Acidosis Caution',
    description: 'Contrast-induced nephropathy can abruptly impair renal clearance of Metformin, promoting life-threatening biguanide lactic acidosis.',
    clinicalMechanism: 'Sudden decline in renal elimination leads to toxic accumulation of metformin, inhibiting mitochondrial complex I and oxidative phosphorylation.',
    recommendation: 'Withhold Metformin at the time of procedure in patients with eGFR 30–59 mL/min/1.73m² or undergoing intra-arterial catheterization; resume 48 hours post-procedure only after re-evaluating renal stability.',
    guidelineSource: 'American College of Radiology (ACR) Contrast Media Manual & ADA Guidelines',
  },
  {
    drugAKeywords: ['tramadol', 'ultram', 'fentanyl', 'meperidine'],
    drugBKeywords: ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram', 'duloxetine', 'venlafaxine'],
    severity: 'critical',
    title: 'Opioid / Tramadol + SSRI/SNRI: Serotonin Syndrome Warning',
    description: 'Hyperpyrexia, hyperreflexia, clonus, autonomic instability, and mental status changes due to excessive central and peripheral serotonin receptor activation.',
    clinicalMechanism: 'Tramadol inhibits serotonin and norepinephrine reuptake in addition to mu-opioid receptor agonism, causing cumulative serotonergic excess when paired with SSRIs/SNRIs.',
    recommendation: 'Avoid combination or use minimal doses with stringent patient education on early warning signs (tremor, diaphoresis, hyperthermia, agitation).',
    guidelineSource: 'FDA Drug Safety Communication & UpToDate Clinical Pharmacology',
  },
];

// Deterministic allergy cross-reactivity and contraindication rules
export const DETERMINISTIC_ALLERGY_RULES: AllergyContraindicationRule[] = [
  {
    allergyKeywords: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin', 'amoxil', 'pcn'],
    contraindicatedDrugKeywords: ['amoxicillin', 'ampicillin', 'augmentin', 'piperacillin', 'unasyn', 'zosyn', 'amoxil'],
    severity: 'critical',
    title: 'Direct Penicillin Class Allergy Contraindication',
    description: 'Patient has documented penicillin allergy; prescribed antibiotic belongs to the same beta-lactam penicillin core class.',
    clinicalMechanism: 'Shared beta-lactam core ring and identical epitopes trigger IgE-mediated anaphylaxis or delayed type IV hypersensitivity.',
    recommendation: 'Absolute contraindication. Discontinue penicillin antibiotic. Switch to Macrolide (Azithromycin), Doxycycline, or Fluoroquinolone based on culture.',
    guidelineSource: 'AAAAI / ACAAI 2022 Drug Allergy Practice Parameter',
  },
  {
    allergyKeywords: ['penicillin', 'amoxicillin'],
    contraindicatedDrugKeywords: ['cephalexin', 'cefazolin', 'keflex'],
    severity: 'moderate',
    title: '1st-Gen Cephalosporin Cross-Reactivity in Penicillin Allergy',
    description: '1st-generation cephalosporins (Cephalexin, Cefazolin) share similar R1 side-chains with Aminopenicillins, carrying a 2–5% cross-reactivity rate.',
    clinicalMechanism: 'Molecular mimicry of the R1 side chain between ampicillin/amoxicillin and cephalexin/cefadroxil.',
    recommendation: 'If prior penicillin reaction was mild (delayed rash), 3rd/4th generation cephalosporins (Cefdinir, Ceftriaxone) have <1% cross-reactivity and are preferred; if prior reaction was anaphylaxis, avoid beta-lactams.',
    guidelineSource: 'CDC & Joint Task Force on Allergy Practice Parameters',
  },
  {
    allergyKeywords: ['sulfa', 'sulfonamide', 'sulfamethoxazole'],
    contraindicatedDrugKeywords: ['bactrim', 'septra', 'sulfamethoxazole', 'sulfasalazine', 'sulfadiazine'],
    severity: 'critical',
    title: 'Sulfonamide Antibiotic Contraindication',
    description: 'Documented sulfa allergy creates direct risk of Stevens-Johnson syndrome (SJS), toxic epidermal necrolysis (TEN), or severe rash.',
    clinicalMechanism: 'Arylamine sulfonamides with N4-aromatic amines produce reactive hydroxylamine metabolites triggering severe T-cell mediated cytotoxicity.',
    recommendation: 'Absolute contraindication. Avoid all arylamine sulfonamide antimicrobials. Substitute with Nitrofurantoin, Fosfomycin, or Ciprofloxacin.',
    guidelineSource: 'FDA Prescribing Information & Dermatology-Allergy Consensus',
  },
  {
    allergyKeywords: ['aspirin', 'nsaid', 'ibuprofen'],
    contraindicatedDrugKeywords: ['ibuprofen', 'naproxen', 'ketorolac', 'meloxicam', 'diclofenac', 'indomethacin', 'celecoxib'],
    severity: 'critical',
    title: 'NSAID / Aspirin Exacerbated Respiratory or Cutaneous Disease',
    description: 'Cross-reactive cyclooxygenase-1 (COX-1) inhibition can trigger severe bronchospasm (Samter triad / AERD), angioedema, or urticaria.',
    clinicalMechanism: 'COX-1 inhibition shunts arachidonic acid metabolism into the 5-lipoxygenase pathway, leading to massive leukotriene overproduction.',
    recommendation: 'Absolute contraindication for systemic non-selective NSAIDs. Use Acetaminophen (up to 1000mg) for mild pain relief.',
    guidelineSource: 'American Academy of Allergy, Asthma & Immunology (AAAAI)',
  },
  {
    allergyKeywords: ['codeine', 'morphine'],
    contraindicatedDrugKeywords: ['codeine', 'morphine', 'oxycodone', 'hydrocodone', 'hydromorphone'],
    severity: 'moderate',
    title: 'Opiate Phenanthrene Class Allergy Cross-Reactivity',
    description: 'Documented sensitivity to codeine/morphine can cross-react across structural phenanthrene opioids.',
    clinicalMechanism: 'Direct mast-cell degranulation or true IgE-mediated sensitization to the morphinan/phenanthrene opioid nucleus.',
    recommendation: 'Clarify if prior reaction was true allergy vs histamine-release pruritus/nausea. If true allergy, consider non-phenanthrene alternative (e.g. Fentanyl or Methadone) or non-opioid analgesics.',
    guidelineSource: 'American Society of Anesthesiologists Clinical Practice Guidelines',
  },
];

// Clinical execution engine: parses text / med list & returns verified alerts
export function runDrugSafetyDatabaseCheck(
  medications: string[],
  allergies: string[],
  soapText?: string
): DrugSafetyAlert[] {
  const alerts: DrugSafetyAlert[] = [];
  const combinedMeds = [...medications];

  // Also parse any medication names appearing in note text (ignoring discontinued meds)
  if (soapText) {
    const commonDrugNames = [
      'lisinopril', 'ibuprofen', 'spironolactone', 'warfarin', 'aspirin',
      'clopidogrel', 'omeprazole', 'atorvastatin', 'clarithromycin',
      'metformin', 'tramadol', 'furosemide', 'amoxicillin', 'bactrim',
      'naproxen', 'meloxicam', 'losartan', 'ketorolac'
    ];
    const textLower = soapText.toLowerCase();
    const negationTriggers = ['discontinued', 'stopped', 'held', 'denies', 'not taking', 'no longer', 'no', 'without'];
    for (const d of commonDrugNames) {
      if (textLower.includes(d)) {
        const dIdx = textLower.indexOf(d);
        const preceding = textLower.substring(Math.max(0, dIdx - 35), dIdx);
        const isDiscontinued = negationTriggers.some((t) => preceding.includes(t));
        if (!isDiscontinued && !combinedMeds.some((m) => m.toLowerCase().includes(d))) {
          combinedMeds.push(d);
        }
      }
    }
  }

  // Filter out any medication from combinedMeds if explicitly documented as discontinued in note
  const activeMeds = combinedMeds.filter((med) => {
    if (!soapText) return true;
    const medLower = med.toLowerCase();
    const textLower = soapText.toLowerCase();
    const negationTriggers = ['discontinued', 'stopped', 'held', 'no longer'];
    for (const token of medLower.split(/\s+/)) {
      if (token.length >= 4) {
        const idx = textLower.indexOf(token);
        if (idx !== -1) {
          const preceding = textLower.substring(Math.max(0, idx - 35), idx);
          if (negationTriggers.some((t) => preceding.includes(t))) {
            return false;
          }
        }
      }
    }
    return true;
  });

  // 1. Check Drug-Drug Interactions
  for (let i = 0; i < activeMeds.length; i++) {
    for (let j = i + 1; j < activeMeds.length; j++) {
      const medA = activeMeds[i].toLowerCase();
      const medB = activeMeds[j].toLowerCase();

      for (const rule of DETERMINISTIC_DRUG_INTERACTIONS) {
        const matchesA = rule.drugAKeywords.some((k) => medA.includes(k));
        const matchesB = rule.drugBKeywords.some((k) => medB.includes(k));

        const matchesReverseA = rule.drugAKeywords.some((k) => medB.includes(k));
        const matchesReverseB = rule.drugBKeywords.some((k) => medA.includes(k));

        if ((matchesA && matchesB) || (matchesReverseA && matchesReverseB)) {
          alerts.push({
            id: `rule-ddi-${i}-${j}-${rule.title.slice(0, 10)}`,
            type: 'interaction',
            severity: rule.severity,
            substances: [activeMeds[i], activeMeds[j]],
            title: rule.title,
            description: rule.description,
            recommendation: rule.recommendation,
            clinicalMechanism: rule.clinicalMechanism,
            guidelineSource: rule.guidelineSource,
            approvalStatus: 'pending',
          });
        }
      }
    }
  }

  // 2. Check Allergy Contraindications
  for (const allergy of allergies) {
    const allergyLower = allergy.toLowerCase();

    for (const med of activeMeds) {
      const medLower = med.toLowerCase();

      for (const rule of DETERMINISTIC_ALLERGY_RULES) {
        const matchesAllergy = rule.allergyKeywords.some((k) => allergyLower.includes(k));
        const matchesContraindicatedDrug = rule.contraindicatedDrugKeywords.some((k) => medLower.includes(k));

        if (matchesAllergy && matchesContraindicatedDrug) {
          alerts.push({
            id: `rule-allergy-${allergy.slice(0, 5)}-${med.slice(0, 5)}`,
            type: 'allergy',
            severity: rule.severity === 'critical' ? 'critical' : 'moderate',
            substances: [med, `Allergy: ${allergy}`],
            title: `ALLERGY CONTRAINDICATION: ${rule.title}`,
            description: `Patient documented allergy to "${allergy}" conflicts with prescribed/current medication "${med}". ${rule.description}`,
            recommendation: rule.recommendation,
            clinicalMechanism: rule.clinicalMechanism,
            guidelineSource: rule.guidelineSource,
            approvalStatus: 'pending',
          });
        }
      }
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------
// RENAL DOSING THRESHOLD RULES (KDIGO / FDA Prescribing Standards)
// ---------------------------------------------------------------------
export interface RenalSafetyRule {
  drugKeywords: string[];
  minEgfrThreshold: number;
  severity: 'critical' | 'moderate';
  title: string;
  clinicalMechanism: string;
  recommendation: string;
  guidelineSource: string;
}

export const DETERMINISTIC_RENAL_RULES: RenalSafetyRule[] = [
  {
    drugKeywords: ['metformin', 'glucophage'],
    minEgfrThreshold: 30,
    severity: 'critical',
    title: 'Metformin Contraindicated: eGFR < 30 mL/min/1.73m²',
    clinicalMechanism: 'Severely impaired renal tubular clearance promotes progressive accumulation of metformin, triggering type B lactic acidosis.',
    recommendation: 'Discontinue Metformin immediately. Switch to Insulin or DPP-4 inhibitor (e.g. Linagliptin, which requires no renal dose adjustment).',
    guidelineSource: 'ADA Standards of Care 2024 & FDA Drug Safety Communication',
  },
  {
    drugKeywords: ['metformin', 'glucophage'],
    minEgfrThreshold: 45,
    severity: 'moderate',
    title: 'Metformin Dose Limitation: eGFR 30–44 mL/min/1.73m²',
    clinicalMechanism: 'Reduced renal clearance requires 50% dose reduction (max 1000 mg/day total) and frequent serum creatinine surveillance.',
    recommendation: 'Cap dose at 500mg BID (or 1000mg ER once daily). Monitor eGFR every 3 months.',
    guidelineSource: 'ADA / KDIGO 2023 Consensus Statement on Diabetes in CKD',
  },
  {
    drugKeywords: ['empagliflozin', 'dapagliflozin', 'canagliflozin', 'jardiance', 'farxiga'],
    minEgfrThreshold: 20,
    severity: 'critical',
    title: 'SGLT2 Inhibitor Initiation Threshold: eGFR < 20 mL/min/1.73m²',
    clinicalMechanism: 'Glycemic efficacy is lost at eGFR < 20 mL/min and cardiovascular/renal outcomes data below this threshold remain limited.',
    recommendation: 'Do not initiate if eGFR < 20 mL/min. If already on therapy, may continue for kidney protection until dialysis is required unless acute kidney injury occurs.',
    guidelineSource: 'KDIGO 2024 CKD Clinical Practice Guideline',
  },
  {
    drugKeywords: ['spironolactone', 'eplerenone', 'aldactone'],
    minEgfrThreshold: 30,
    severity: 'critical',
    title: 'Mineralocorticoid Receptor Antagonist (MRA) Hyperkalemia Hazard',
    clinicalMechanism: 'In stage 4/5 CKD, blunted potassium excretion precipitously elevates serum K+ above 5.5 mEq/L, risking ventricular arrhythmias.',
    recommendation: 'Discontinue or hold Spironolactone if eGFR < 30 mL/min or serum K+ > 5.0 mEq/L. Consult nephrology.',
    guidelineSource: 'ACC/AHA/HFSA 2022 Heart Failure Guidelines',
  },
  {
    drugKeywords: ['gabapentin', 'neurontin'],
    minEgfrThreshold: 60,
    severity: 'moderate',
    title: 'Gabapentin Renal Dose Reduction Indicated',
    clinicalMechanism: 'Gabapentin is eliminated 100% unchanged by the kidneys. Decreased clearance causes central nervous system toxicity, profound sedation, and myoclonus.',
    recommendation: 'Adjust daily dose based on calculated CrCl (e.g. 200-700 mg/day for CrCl 30-59 mL/min; 100-300 mg/day for CrCl 15-29 mL/min).',
    guidelineSource: 'FDA Prescribing Information & Renal Drug Handbook',
  },
];

// ---------------------------------------------------------------------
// PREGNANCY / TERATOGENICITY CONTRAINDICATION RULES
// ---------------------------------------------------------------------
export interface TeratogenicityRule {
  drugKeywords: string[];
  severity: 'critical';
  title: string;
  clinicalMechanism: string;
  recommendation: string;
  guidelineSource: string;
}

export const DETERMINISTIC_PREGNANCY_RULES: TeratogenicityRule[] = [
  {
    drugKeywords: ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan', 'candesartan', 'sacubitril'],
    severity: 'critical',
    title: 'Boxed Warning: Fetal Toxicity with RAAS Inhibitors',
    clinicalMechanism: 'Drugs acting on the renin-angiotensin system during the 2nd and 3rd trimesters cause fetal renal agenesis, oligohydramnios, skull hypoplasia, and fetal death.',
    recommendation: 'Absolute contraindication in pregnancy. Immediately discontinue and switch to Labetalol, Nifedipine (extended-release), or Methyldopa.',
    guidelineSource: 'ACOG Practice Bulletin #222 (Gestational Hypertension & Preeclampsia)',
  },
  {
    drugKeywords: ['atorvastatin', 'rosuvastatin', 'simvastatin', 'pravastatin'],
    severity: 'critical',
    title: 'Statin Teratogenicity Precaution',
    clinicalMechanism: 'Cholesterol biosynthesis is essential for fetal organ and neural development; potential risk of structural fetal malformations.',
    recommendation: 'Discontinue statin therapy when pregnancy is recognized or planned.',
    guidelineSource: 'FDA Drug Safety Communication & ESC Guidelines on Cardiovascular Diseases during Pregnancy',
  },
  {
    drugKeywords: ['methotrexate'],
    severity: 'critical',
    title: 'Absolute Teratogen: Methotrexate Embryotoxicity & Craniofacial Defects',
    clinicalMechanism: 'Dihydrofolate reductase inhibition halts cellular division, inducing high rates of spontaneous abortion, hydrocephalus, and limb defects.',
    recommendation: 'Absolute contraindication. Discontinue at least 3 months prior to planned conception.',
    guidelineSource: 'ACR Guideline for the Management of Reproductive Health in Rheumatic Diseases',
  },
];

// ---------------------------------------------------------------------
// SIRS CRITERIA & SEPSIS SCREENING EVALUATOR (SEPSIS-3 ALIGNED)
// ---------------------------------------------------------------------
export interface SirsEvaluationResult {
  sirsCount: number;
  criteriaMet: string[];
  criteriaNotMet: string[];
  undocumentedCriteria: string[];
  hasInfectionSign: boolean;
  hasOrganDysfunctionOrShock: boolean;
  isSepsisDiagnosed: boolean; // Always false — SIRS is a screening tool, not a diagnostic confirmation
  recommendedAlertTitle: string;
  recommendedSeverity: 'urgent_evaluation' | 'immediate_life_threat' | 'none';
  immediateAction: string;
  explanation: string;
}

/**
 * Evaluates adult SIRS criteria and infection status without equating SIRS to sepsis.
 * Fulfills clinical safety guidelines:
 * - Differentiates physiological SIRS from life-threatening Sepsis-3 organ dysfunction.
 * - Forbids automatic 1-hour sepsis bundles, broad-spectrum IV antibiotics, or 30 mL/kg fluids based solely on SIRS.
 * - Escalates to immediate life threat only when genuine emergency organ dysfunction / shock indicators are documented.
 */
export function evaluateSirsAndSepsisRisk(
  vitals?: Partial<Vitals>,
  clinicalText?: string
): SirsEvaluationResult {
  const text = (clinicalText || '').toLowerCase();
  const hr = vitals?.heartRate || 0;
  const rr = vitals?.respiratoryRate || 0;
  const tempStr = vitals?.temperature || '';

  let tempC = 0;
  const tempMatch = tempStr.match(/(\d{2,3}(?:\.\d+)?)/);
  if (tempMatch) {
    const rawVal = parseFloat(tempMatch[1]);
    tempC = rawVal > 50 ? (rawVal - 32) * (5 / 9) : rawVal;
  }

  const criteriaMet: string[] = [];
  const criteriaNotMet: string[] = [];
  const undocumentedCriteria: string[] = [];

  // 1. Temperature: Fever > 38.0°C (100.4°F) or Hypothermia < 36.0°C (96.8°F)
  if (tempC > 38.0) {
    criteriaMet.push(`Fever (Temp ${tempC.toFixed(1)}°C / ${(tempC * 9 / 5 + 32).toFixed(1)}°F > 38.0°C)`);
  } else if (tempC > 0 && tempC < 36.0) {
    criteriaMet.push(`Hypothermia (Temp ${tempC.toFixed(1)}°C < 36.0°C)`);
  } else if (tempC > 0) {
    criteriaNotMet.push(`Normal Temperature (${tempC.toFixed(1)}°C / ${(tempC * 9 / 5 + 32).toFixed(1)}°F)`);
  } else {
    undocumentedCriteria.push('Temperature undocumented');
  }

  // 2. Heart rate: > 90 bpm
  if (hr > 90) {
    criteriaMet.push(`Tachycardia (HR ${hr} bpm > 90 bpm)`);
  } else if (hr > 0) {
    criteriaNotMet.push(`Normal Heart Rate (HR ${hr} bpm <= 90 bpm)`);
  } else {
    undocumentedCriteria.push('Heart rate undocumented');
  }

  // 3. Respiratory rate: > 20 /min (or PaCO2 < 32 mmHg)
  if (rr > 20) {
    criteriaMet.push(`Tachypnea (RR ${rr} /min > 20 /min)`);
  } else if (rr > 0) {
    criteriaNotMet.push(`Normal Respiratory Rate (RR ${rr} /min <= 20 /min)`);
  } else {
    undocumentedCriteria.push('Respiratory rate undocumented');
  }

  // 4. White blood cell count: > 12,000, < 4,000, or > 10% bands
  const wbcMatch = text.match(/wbc\s*(?:count\s*)?(?:of\s*)?(\d+(?:\.\d+)?)/);
  if (wbcMatch) {
    let wbcVal = parseFloat(wbcMatch[1]);
    if (wbcVal > 100) wbcVal = wbcVal / 1000;
    if (wbcVal > 12.0 || (wbcVal > 0 && wbcVal < 4.0)) {
      criteriaMet.push(`Abnormal WBC (${wbcVal.toFixed(1)} k/µL)`);
    } else {
      criteriaNotMet.push(`Normal WBC (${wbcVal.toFixed(1)} k/µL)`);
    }
  } else {
    undocumentedCriteria.push('WBC count undocumented');
  }

  const sirsCount = criteriaMet.length;

  const hasInfectionSign =
    text.includes('infection') ||
    text.includes('pneumonia') ||
    text.includes('fever') ||
    text.includes('chills') ||
    text.includes('purulent') ||
    text.includes('dysuria') ||
    text.includes('cellulitis') ||
    text.includes('abscess') ||
    text.includes('bacteremia') ||
    text.includes('septic');

  // Check for genuine emergency indicators of shock or acute organ dysfunction
  let systolic = 0;
  let diastolic = 0;
  if (vitals?.bloodPressure) {
    const bpMatch = vitals.bloodPressure.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bpMatch) {
      systolic = parseInt(bpMatch[1], 10);
      diastolic = parseInt(bpMatch[2], 10);
    }
  }
  const map = systolic > 0 && diastolic > 0 ? (systolic + 2 * diastolic) / 3 : 0;
  const hasHypotension = (systolic > 0 && systolic < 90) || (map > 0 && map < 65);
  const hasCriticalHypoxemia = !!(vitals?.spO2 && vitals.spO2 > 0 && vitals.spO2 < 90);
  const hasAlteredMental =
    text.includes('altered mental') ||
    text.includes('confusion') ||
    text.includes('confused') ||
    text.includes('encephalopathy') ||
    text.includes('obtunded') ||
    text.includes('lethargic');
  const hasLactateShock =
    text.includes('lactate >= 4') ||
    text.includes('lactate > 4') ||
    text.includes('septic shock') ||
    text.includes('refractory hypotension');
  const hasOliguria = text.includes('oliguria') || text.includes('anuria');

  const hasOrganDysfunctionOrShock =
    hasHypotension || hasCriticalHypoxemia || hasAlteredMental || hasLactateShock || hasOliguria;

  if (hasInfectionSign && hasOrganDysfunctionOrShock) {
    return {
      sirsCount,
      criteriaMet,
      criteriaNotMet,
      undocumentedCriteria,
      hasInfectionSign,
      hasOrganDysfunctionOrShock: true,
      isSepsisDiagnosed: false,
      recommendedAlertTitle: 'Suspected Sepsis with Hemodynamic Compromise / Shock',
      recommendedSeverity: 'immediate_life_threat',
      immediateAction:
        'Escalate immediately for urgent bedside clinician evaluation. Screen for septic shock and end-organ hypoperfusion. If septic shock or hypoperfusion is confirmed (persistent MAP < 65 mmHg or serum lactate >= 4 mmol/L despite initial fluid challenge), obtain blood cultures prior to antibiotics, administer targeted or broad-spectrum antimicrobials, and titrate crystalloids/vasopressors with continuous hemodynamic monitoring.',
      explanation: `Clinical signs of infection with objective indicators of hemodynamic compromise or organ hypoperfusion (BP ${vitals?.bloodPressure || 'hypotensive'}). Sepsis-3 requires infection-associated acute organ dysfunction.`,
    };
  }

  if (sirsCount >= 2 && hasInfectionSign) {
    return {
      sirsCount,
      criteriaMet,
      criteriaNotMet,
      undocumentedCriteria,
      hasInfectionSign,
      hasOrganDysfunctionOrShock: false,
      isSepsisDiagnosed: false,
      recommendedAlertTitle: 'SIRS Criteria Present (Systemic Inflammatory Response Screen)',
      recommendedSeverity: 'urgent_evaluation',
      immediateAction:
        'Perform prompt bedside clinical evaluation to identify infection source and evaluate for organ dysfunction (assess mental status, work of breathing, urine output, and peripheral perfusion). Do NOT automatically initiate 1-hour sepsis bundle, broad-spectrum IV antibiotics, or 30 mL/kg fluid bolus based solely on SIRS criteria without evidence of infection-associated organ dysfunction or shock. Tailor diagnostic workup and antimicrobial therapy to clinical assessment.',
      explanation: `Patient fulfills ${sirsCount} SIRS criteria: ${criteriaMet.join('; ')}. Criteria not met or normal: ${criteriaNotMet.join('; ')}. Undocumented: ${undocumentedCriteria.join('; ')}. CRITICAL: SIRS is a non-specific inflammatory screening tool and does NOT equate to a diagnosis of sepsis. Sepsis requires evidence of infection-associated acute organ dysfunction.`,
    };
  }

  return {
    sirsCount,
    criteriaMet,
    criteriaNotMet,
    undocumentedCriteria,
    hasInfectionSign,
    hasOrganDysfunctionOrShock: false,
    isSepsisDiagnosed: false,
    recommendedAlertTitle: '',
    recommendedSeverity: 'none',
    immediateAction: '',
    explanation: `SIRS criteria met: ${sirsCount} (< 2 required for alert).`,
  };
}

// ---------------------------------------------------------------------
// EMERGENCY RED FLAG CLINICAL EVALUATOR
// ---------------------------------------------------------------------
export function evaluateEmergencyRedFlags(
  vitals?: Partial<Vitals>,
  noteText?: string,
  chiefComplaint?: string
): EmergencyRedFlag[] {
  const flags: EmergencyRedFlag[] = [];
  const text = `${noteText || ''} ${chiefComplaint || ''}`.toLowerCase();

  // 1. Hypertensive Emergency / Crisis (BP >= 180 systolic or >= 120 diastolic)
  if (vitals?.bloodPressure) {
    const bpMatch = vitals.bloodPressure.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (bpMatch) {
      const sys = parseInt(bpMatch[1], 10);
      const dia = parseInt(bpMatch[2], 10);
      if (sys >= 180 || dia >= 120) {
        flags.push({
          id: 'redflag-htn-crisis',
          category: 'Hypertensive',
          severity: 'immediate_life_threat',
          title: `Hypertensive Crisis (BP ${sys}/${dia} mmHg)`,
          triggerDescription: `Blood pressure exceeds emergency threshold (>=180 systolic or >=120 diastolic).`,
          immediateAction: 'Assess for acute target-organ damage (chest pain, dyspnea, neurological deficits, papilledema). If organ damage present, transfer to Emergency Dept / ICU for IV antihypertensive titration (Nicardipine/Labetalol).',
          guidelineSource: 'ACC/AHA 2017 Hypertension Clinical Practice Guidelines',
        });
      }
    }
  }

  // 2. Acute Coronary Syndrome (ACS) Red Flags
  if (
    (text.includes('chest pain') || text.includes('substernal pressure') || text.includes('radiation to jaw') || text.includes('radiation to left arm')) &&
    (text.includes('diaphoresis') || text.includes('dyspnea') || text.includes('nausea') || text.includes('syncope'))
  ) {
    flags.push({
      id: 'redflag-acs',
      category: 'Cardiac',
      severity: 'immediate_life_threat',
      title: 'Suspicion of Acute Coronary Syndrome (ACS / STEMI)',
      triggerDescription: 'Chest pain accompanied by autonomic features (diaphoresis, dyspnea, or left arm radiation).',
      immediateAction: 'Acquire immediate 12-lead ECG (<10 min). Administer Chewable Aspirin 324mg (unless contraindicated). Establish IV access, obtain high-sensitivity troponin, and activate cath lab if ST-elevation is present.',
      guidelineSource: 'ACC/AHA 2021 Chest Pain Guidelines & ESC Guidelines for ACS',
    });
  }

  // 3. Severe Hypoxemia / Respiratory Failure
  if (vitals?.spO2 && vitals.spO2 > 0 && vitals.spO2 < 90) {
    flags.push({
      id: 'redflag-hypoxemia',
      category: 'Respiratory',
      severity: 'immediate_life_threat',
      title: `Critical Hypoxemia (SpO2 ${vitals.spO2}%)`,
      triggerDescription: `Oxygen saturation below critical threshold (<90% on room air).`,
      immediateAction: 'Apply supplemental oxygen immediately (nasal cannula or non-rebreather mask). Auscultate lung fields, order stat chest radiography, and check arterial blood gas (ABG) if clinically indicated.',
      guidelineSource: 'British Thoracic Society (BTS) Oxygen Guideline',
    });
  }

  // 4. Sepsis / Severe SIRS Trigger (Sepsis-3 & SIRS Screening Distinction)
  const sirsEval = evaluateSirsAndSepsisRisk(vitals, text);
  if (sirsEval.recommendedSeverity !== 'none') {
    flags.push({
      id: sirsEval.hasOrganDysfunctionOrShock ? 'redflag-sepsis' : 'redflag-sirs',
      category: 'Sepsis',
      severity: sirsEval.recommendedSeverity,
      title: sirsEval.recommendedAlertTitle,
      triggerDescription: sirsEval.explanation,
      immediateAction: sirsEval.immediateAction,
      guidelineSource: 'Surviving Sepsis Campaign 2021 & Sepsis-3 International Consensus Definitions',
    });
  }

  // 5. Acute Anaphylaxis
  if (
    (text.includes('stridor') || text.includes('wheezing') || text.includes('angioedema') || text.includes('lip swelling') || text.includes('tongue swelling')) &&
    (text.includes('urticaria') || text.includes('hives') || text.includes('rash') || text.includes('allergy') || text.includes('pruritus'))
  ) {
    flags.push({
      id: 'redflag-anaphylaxis',
      category: 'Anaphylaxis',
      severity: 'immediate_life_threat',
      title: 'Suspected Anaphylaxis (Airway / Cutaneous Compromise)',
      triggerDescription: 'Acute development of mucocutaneous symptoms combined with respiratory or airway compromise.',
      immediateAction: 'Administer Epinephrine 1:1,000 (0.3 mg IM for adults, 0.15 mg IM for pediatric) into anterolateral thigh immediately. Call code / emergency response. Position supine with elevated legs. Administer high-flow O2.',
      guidelineSource: 'World Allergy Organization (WAO) Anaphylaxis Guidelines 2020',
    });
  }

  return flags;
}

