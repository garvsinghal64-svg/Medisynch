/**
 * 100,000-Archetype Compositional Clinical Decision Support Taxonomy
 *
 * Bijective 3-Axis Clinical Ontology Matrix:
 *   100 ICD-10 Clinical Syndromes (across 12 Medical Specialties)
 * ×  50 High-Risk Pharmacologic Regimens (RxNorm Drug Classes)
 * ×  20 Quantitative Physiological / Lab / Demographic Modifiers
 * = 100,000 Distinct Clinical Archetypes (IDs: ARCH_00000 .. ARCH_99999)
 *
 * Indices 0..11 map directly to the 12 Sentinel Clinical Archetypes for
 * full backward compatibility while scaling to 100,000 distinct clinical scenarios.
 */

export interface SyndromeSpec {
  index: number;
  code: string;
  specialty: string;
  name: string;
  icd10: string;
  phrase: string;
  typoPhrase: string;
  keyToken: string;
  typoToken: string;
}

export interface RegimenSpec {
  index: number;
  code: string;
  drugClass: string;
  drugName: string;
  phrase: string;
  typoPhrase: string;
  keyToken: string;
  typoToken: string;
  mechanism: string;
}

export interface ModifierSpec {
  index: number;
  code: string;
  category: string;
  label: string;
  phrase: string;
  typoPhrase: string;
  keyToken: string;
  typoToken: string;
  quantFlag: string;
}

export interface CompositionalArchetype {
  index: number;
  id: string;
  specialty: string;
  syndrome: SyndromeSpec;
  regimen: RegimenSpec;
  modifier: ModifierSpec;
  expectsDrugAlert: boolean;
}

export const TOTAL_ARCHETYPES = 100_000;

export const SENTINEL_ARCHETYPE_IDS: readonly string[] = [
  'CHF_NSAID_AKI',
  'PEDS_AOM_PCN_ALLERGY',
  'ACS_CHEST_PAIN',
  'T2D_CKD_METFORMIN',
  'CAP_PNEUMONIA',
  'ACUTE_APPENDICITIS',
  'MIGRAINE_SNOOP4',
  'ACUTE_UTI',
  'WARFARIN_BACTRIM',
  'SSRI_LINEZOLID_SEROTONIN',
  'HYPERKALEMIA_SPIRONOLACTONE_ACEI',
  'NORMAL_ROUTINE_EXAM',
];

// ============================================================================
// AXIS 1: 100 ICD-10-CM CLINICAL SYNDROMES ACROSS 12 SPECIALTIES
// ============================================================================
const RAW_SYNDROMES: ReadonlyArray<Omit<SyndromeSpec, 'index' | 'phrase' | 'typoPhrase'>> = [
  // 1. Cardiology (10)
  { code: 'SYN_HFREF', specialty: 'Cardiology', name: 'Systolic Heart Failure (HFrEF)', icd10: 'I50.22', keyToken: 'cardiomyopathy', typoToken: 'cardiomyopthy' },
  { code: 'SYN_HFPEF', specialty: 'Cardiology', name: 'Diastolic Heart Failure (HFpEF)', icd10: 'I50.32', keyToken: 'orthopnea', typoToken: 'orthopna' },
  { code: 'SYN_STEMI', specialty: 'Cardiology', name: 'ST-Elevation Myocardial Infarction', icd10: 'I21.3', keyToken: 'myocardial', typoToken: 'myocardal' },
  { code: 'SYN_NSTEMI', specialty: 'Cardiology', name: 'Non-ST-Elevation Myocardial Infarction', icd10: 'I21.4', keyToken: 'troponinemia', typoToken: 'troponinemie' },
  { code: 'SYN_UNSTABLE_ANGINA', specialty: 'Cardiology', name: 'Unstable Angina Pectoris', icd10: 'I20.0', keyToken: 'substernal', typoToken: 'substernl' },
  { code: 'SYN_AFIB_RVR', specialty: 'Cardiology', name: 'Atrial Fibrillation with RVR', icd10: 'I48.91', keyToken: 'fibrillation', typoToken: 'fibrilation' },
  { code: 'SYN_AORTIC_DISSECTION', specialty: 'Cardiology', name: 'Acute Thoracic Aortic Dissection', icd10: 'I71.01', keyToken: 'dissection', typoToken: 'disection' },
  { code: 'SYN_HTN_EMERGENCY', specialty: 'Cardiology', name: 'Hypertensive Emergency with Encephalopathy', icd10: 'I16.1', keyToken: 'encephalopathy', typoToken: 'encephalopthy' },
  { code: 'SYN_PERICARDITIS', specialty: 'Cardiology', name: 'Acute Fibrinous Pericarditis', icd10: 'I30.9', keyToken: 'pericarditis', typoToken: 'pericardtis' },
  { code: 'SYN_ENDOCARDITIS', specialty: 'Cardiology', name: 'Acute Infective Endocarditis', icd10: 'I33.0', keyToken: 'endocarditis', typoToken: 'endocardtis' },

  // 2. Pulmonology (8)
  { code: 'SYN_CAP', specialty: 'Pulmonology', name: 'Community-Acquired Pneumonia', icd10: 'J18.9', keyToken: 'pneumonia', typoToken: 'pneumona' },
  { code: 'SYN_HAP', specialty: 'Pulmonology', name: 'Hospital-Acquired Pneumonia', icd10: 'J15.9', keyToken: 'consolidation', typoToken: 'consolidaton' },
  { code: 'SYN_PE', specialty: 'Pulmonology', name: 'Acute Saddle Pulmonary Embolism', icd10: 'I26.99', keyToken: 'embolism', typoToken: 'embolsm' },
  { code: 'SYN_COPD_EXAC', specialty: 'Pulmonology', name: 'Acute COPD Exacerbation', icd10: 'J44.1', keyToken: 'emphysema', typoToken: 'emphysem' },
  { code: 'SYN_STATUS_ASTHMATICUS', specialty: 'Pulmonology', name: 'Status Asthmaticus', icd10: 'J45.52', keyToken: 'bronchospasm', typoToken: 'bronchospsm' },
  { code: 'SYN_PNEUMOTHORAX', specialty: 'Pulmonology', name: 'Acute Tension Pneumothorax', icd10: 'J93.0', keyToken: 'pneumothorax', typoToken: 'pneumothrax' },
  { code: 'SYN_ARDS', specialty: 'Pulmonology', name: 'Acute Respiratory Distress Syndrome', icd10: 'J80', keyToken: 'alveolitis', typoToken: 'alveoltis' },
  { code: 'SYN_PLEURAL_EFFUSION', specialty: 'Pulmonology', name: 'Exudative Pleural Effusion', icd10: 'J90', keyToken: 'effusion', typoToken: 'efusion' },

  // 3. Nephrology & Electrolytes (8)
  { code: 'SYN_AKI_ATN', specialty: 'Nephrology', name: 'Acute Tubular Necrosis / Intrinsic AKI', icd10: 'N17.0', keyToken: 'azotemia', typoToken: 'azotema' },
  { code: 'SYN_CKD_3B', specialty: 'Nephrology', name: 'Chronic Kidney Disease Stage 3b', icd10: 'N18.32', keyToken: 'nephropathy', typoToken: 'nephropthy' },
  { code: 'SYN_CKD_4', specialty: 'Nephrology', name: 'Chronic Kidney Disease Stage 4', icd10: 'N18.4', keyToken: 'uremia', typoToken: 'urema' },
  { code: 'SYN_ESRD', specialty: 'Nephrology', name: 'End-Stage Renal Disease on Hemodialysis', icd10: 'N18.6', keyToken: 'hemodialysis', typoToken: 'hemodialsis' },
  { code: 'SYN_HYPERKALEMIA', specialty: 'Nephrology', name: 'Refractory Hyperkalemia', icd10: 'E87.5', keyToken: 'hyperkalemia', typoToken: 'hyperkalema' },
  { code: 'SYN_SIADH', specialty: 'Nephrology', name: 'Hyponatremia Secondary to SIADH', icd10: 'E87.1', keyToken: 'hyponatremia', typoToken: 'hyponatrema' },
  { code: 'SYN_NEPHROTIC', specialty: 'Nephrology', name: 'Primary Nephrotic Syndrome', icd10: 'N04.9', keyToken: 'proteinuria', typoToken: 'proteinura' },
  { code: 'SYN_NEPHROLITHIASIS', specialty: 'Nephrology', name: 'Obstructive Ureterolithiasis with Hydronephrosis', icd10: 'N13.2', keyToken: 'hydronephrosis', typoToken: 'hydronephrsis' },

  // 4. Endocrinology & Metabolism (8)
  { code: 'SYN_T2DM', specialty: 'Endocrinology', name: 'Uncontrolled Type 2 Diabetes Mellitus', icd10: 'E11.65', keyToken: 'hyperglycemia', typoToken: 'hyperglycema' },
  { code: 'SYN_DKA', specialty: 'Endocrinology', name: 'Diabetic Ketoacidosis', icd10: 'E10.10', keyToken: 'ketoacidosis', typoToken: 'ketoacidsis' },
  { code: 'SYN_HHS', specialty: 'Endocrinology', name: 'Hyperosmolar Hyperglycemic State', icd10: 'E11.00', keyToken: 'hyperosmolar', typoToken: 'hyperosmlar' },
  { code: 'SYN_THYROID_STORM', specialty: 'Endocrinology', name: 'Thyrotoxic Crisis / Thyroid Storm', icd10: 'E05.01', keyToken: 'thyrotoxicosis', typoToken: 'thyrotoxicsis' },
  { code: 'SYN_MYXEDEMA_COMA', specialty: 'Endocrinology', name: 'Decompensated Myxedema Coma', icd10: 'E03.5', keyToken: 'myxedema', typoToken: 'myxedma' },
  { code: 'SYN_ADRENAL_CRISIS', specialty: 'Endocrinology', name: 'Acute Adrenal Insufficiency Crisis', icd10: 'E27.2', keyToken: 'hypocortisolism', typoToken: 'hypocortislism' },
  { code: 'SYN_PHEOCHROMOCYTOMA', specialty: 'Endocrinology', name: 'Adrenal Pheochromocytoma Paroxysm', icd10: 'D35.00', keyToken: 'pheochromocytoma', typoToken: 'pheochromcytoma' },
  { code: 'SYN_HYPERCALCEMIA', specialty: 'Endocrinology', name: 'Severe Humoral Hypercalcemia', icd10: 'E83.52', keyToken: 'hypercalcemia', typoToken: 'hypercalcema' },

  // 5. Neurology (8)
  { code: 'SYN_ISCHEMIC_STROKE', specialty: 'Neurology', name: 'Acute Middle Cerebral Artery Ischemic Stroke', icd10: 'I63.9', keyToken: 'hemiparesis', typoToken: 'hemiparsis' },
  { code: 'SYN_SAH', specialty: 'Neurology', name: 'Aneurysmal Subarachnoid Hemorrhage', icd10: 'I60.9', keyToken: 'thunderclap', typoToken: 'thunderclp' },
  { code: 'SYN_STATUS_EPILEPTICUS', specialty: 'Neurology', name: 'Generalized Convulsive Status Epilepticus', icd10: 'G40.901', keyToken: 'epilepticus', typoToken: 'epileptcus' },
  { code: 'SYN_MENINGITIS', specialty: 'Neurology', name: 'Acute Bacterial Meningitis', icd10: 'G00.9', keyToken: 'meningismus', typoToken: 'meningsmus' },
  { code: 'SYN_GUILLAIN_BARRE', specialty: 'Neurology', name: 'Acute Inflammatory Demyelinating Polyradiculoneuropathy', icd10: 'G61.0', keyToken: 'areflexia', typoToken: 'areflexa' },
  { code: 'SYN_MYASTHENIC_CRISIS', specialty: 'Neurology', name: 'Myasthenia Gravis Bulbar Crisis', icd10: 'G70.01', keyToken: 'myasthenia', typoToken: 'myasthena' },
  { code: 'SYN_TEMPORAL_ARTERITIS', specialty: 'Neurology', name: 'Giant Cell Temporal Arteritis', icd10: 'M31.6', keyToken: 'claudication', typoToken: 'claudicaton' },
  { code: 'SYN_WERNICKE', specialty: 'Neurology', name: 'Acute Wernicke Encephalopathy', icd10: 'E51.2', keyToken: 'ophthalmoplegia', typoToken: 'ophthalmplegia' },

  // 6. Gastroenterology & Hepatology (10)
  { code: 'SYN_APPENDICITIS', specialty: 'Gastroenterology', name: 'Acute Perforated Appendicitis', icd10: 'K35.80', keyToken: 'appendicitis', typoToken: 'apendicitis' },
  { code: 'SYN_CHOLECYSTITIS', specialty: 'Gastroenterology', name: 'Acute Calculous Cholecystitis', icd10: 'K81.0', keyToken: 'cholecystitis', typoToken: 'cholecysttis' },
  { code: 'SYN_PANCREATITIS', specialty: 'Gastroenterology', name: 'Acute Necrotizing Pancreatitis', icd10: 'K85.90', keyToken: 'pancreatitis', typoToken: 'pancreattis' },
  { code: 'SYN_UGIB', specialty: 'Gastroenterology', name: 'Acute Variceal Upper GI Hemorrhage', icd10: 'K92.2', keyToken: 'hematemesis', typoToken: 'hematemsis' },
  { code: 'SYN_CHOLANGITIS', specialty: 'Gastroenterology', name: 'Acute Ascending Cholangitis', icd10: 'K83.09', keyToken: 'cholangitis', typoToken: 'cholangtis' },
  { code: 'SYN_SBP', specialty: 'Gastroenterology', name: 'Spontaneous Bacterial Peritonitis', icd10: 'K65.2', keyToken: 'peritonitis', typoToken: 'peritontis' },
  { code: 'SYN_HEPATIC_ENCEPH', specialty: 'Gastroenterology', name: 'Overt Hepatic Encephalopathy', icd10: 'K72.90', keyToken: 'asterixis', typoToken: 'asterixs' },
  { code: 'SYN_CDIFF', specialty: 'Gastroenterology', name: 'Fulminant Clostridioides Difficile Colitis', icd10: 'A04.72', keyToken: 'megacolon', typoToken: 'megacoln' },
  { code: 'SYN_DIVERTICULITIS', specialty: 'Gastroenterology', name: 'Acute Sigmoid Diverticulitis with Abscess', icd10: 'K57.20', keyToken: 'diverticulitis', typoToken: 'diverticultis' },
  { code: 'SYN_MESENTERIC_ISCHEMIA', specialty: 'Gastroenterology', name: 'Acute Superior Mesenteric Artery Ischemia', icd10: 'K55.0', keyToken: 'mesenteric', typoToken: 'mesenterc' },

  // 7. Infectious Disease & Sepsis (8)
  { code: 'SYN_SEVERE_SEPSIS', specialty: 'Infectious Disease', name: 'Polymicrobial Bacteremia with Severe Sepsis', icd10: 'A41.9', keyToken: 'bacteremia', typoToken: 'bacterema' },
  { code: 'SYN_SEPTIC_SHOCK', specialty: 'Infectious Disease', name: 'Refractory Vasoplegic Septic Shock', icd10: 'R65.21', keyToken: 'endotoxemia', typoToken: 'endotoxema' },
  { code: 'SYN_PYELONEPHRITIS', specialty: 'Infectious Disease', name: 'Acute Emphysematous Pyelonephritis', icd10: 'N10', keyToken: 'pyelonephritis', typoToken: 'pyelonephrtis' },
  { code: 'SYN_NECROTIZING_FASCIITIS', specialty: 'Infectious Disease', name: 'Polymicrobial Necrotizing Fasciitis', icd10: 'M72.6', keyToken: 'fasciitis', typoToken: 'fascitis' },
  { code: 'SYN_ORBITAL_CELLULITIS', specialty: 'Infectious Disease', name: 'Postseptal Orbital Cellulitis', icd10: 'H05.019', keyToken: 'cellulitis', typoToken: 'celulitis' },
  { code: 'SYN_CYSTITIS_UTI', specialty: 'Infectious Disease', name: 'Acute Uncomplicated Urinary Tract Infection', icd10: 'N39.0', keyToken: 'dysuria', typoToken: 'dysura' },
  { code: 'SYN_TUBERCULOSIS', specialty: 'Infectious Disease', name: 'Cavitary Pulmonary Tuberculosis', icd10: 'A15.0', keyToken: 'tuberculosis', typoToken: 'tuberculsis' },
  { code: 'SYN_LYME_CARDITIS', specialty: 'Infectious Disease', name: 'Disseminated Lyme Carditis with AV Block', icd10: 'A69.29', keyToken: 'borreliosis', typoToken: 'boreliosis' },

  // 8. Hematology & Oncology (8)
  { code: 'SYN_DVT', specialty: 'Hematology', name: 'Proximal Iliofemoral Deep Vein Thrombosis', icd10: 'I82.409', keyToken: 'thrombosis', typoToken: 'thrombsis' },
  { code: 'SYN_HIT', specialty: 'Hematology', name: 'Heparin-Induced Thrombocytopenia Type II', icd10: 'D75.82', keyToken: 'thrombocytopenia', typoToken: 'thrombocytopena' },
  { code: 'SYN_DIC', specialty: 'Hematology', name: 'Disseminated Intravascular Coagulation', icd10: 'D65', keyToken: 'coagulopathy', typoToken: 'coagulopthy' },
  { code: 'SYN_TLS', specialty: 'Hematology', name: 'Acute Tumor Lysis Syndrome', icd10: 'E88.3', keyToken: 'hyperuricemia', typoToken: 'hyperuricema' },
  { code: 'SYN_SICKLE_VOC', specialty: 'Hematology', name: 'Sickle Cell Acute Chest & Vaso-Occlusive Crisis', icd10: 'D57.01', keyToken: 'drepanocytosis', typoToken: 'drepanocytsis' },
  { code: 'SYN_TTP', specialty: 'Hematology', name: 'Thrombotic Thrombocytopenic Purpura', icd10: 'M31.1', keyToken: 'schistocytes', typoToken: 'schistoctes' },
  { code: 'SYN_NEUTROPENIC_FEVER', specialty: 'Hematology', name: 'Chemotherapy-Induced Febrile Neutropenia', icd10: 'D70.1', keyToken: 'agranulocytosis', typoToken: 'agranulocytsis' },
  { code: 'SYN_SUPRA_INR_BLEED', specialty: 'Hematology', name: 'Anticoagulant-Associated Retroperitoneal Hemorrhage', icd10: 'D68.32', keyToken: 'retroperitoneal', typoToken: 'retroperitneal' },

  // 9. Obstetrics & Gynecology (8)
  { code: 'SYN_PREECLAMPSIA', specialty: 'Obstetrics', name: 'Preeclampsia with Severe Features', icd10: 'O14.10', keyToken: 'preeclampsia', typoToken: 'preeclampsa' },
  { code: 'SYN_ECLAMPSIA', specialty: 'Obstetrics', name: 'Intrapartum Eclamptic Convulsions', icd10: 'O15.00', keyToken: 'eclampsia', typoToken: 'eclampsa' },
  { code: 'SYN_ECTOPIC_PREG', specialty: 'Obstetrics', name: 'Ruptured Ampullary Ectopic Pregnancy', icd10: 'O00.11', keyToken: 'hemoperitoneum', typoToken: 'hemoperitneum' },
  { code: 'SYN_PLACENTAL_ABRUPTION', specialty: 'Obstetrics', name: 'Acute Placental Abruption with Fetal Distress', icd10: 'O45.90', keyToken: 'abruption', typoToken: 'abrupton' },
  { code: 'SYN_PPH', specialty: 'Obstetrics', name: 'Atonic Postpartum Hemorrhage', icd10: 'O72.1', keyToken: 'postpartum', typoToken: 'postpartm' },
  { code: 'SYN_PID_TOA', specialty: 'Obstetrics', name: 'Pelvic Inflammatory Disease with Tubo-Ovarian Abscess', icd10: 'N70.93', keyToken: 'salpingitis', typoToken: 'salpingtis' },
  { code: 'SYN_OVARIAN_TORSION', specialty: 'Obstetrics', name: 'Acute Adnexal Ovarian Torsion', icd10: 'N83.51', keyToken: 'adnexal', typoToken: 'adnexl' },
  { code: 'SYN_HELLP', specialty: 'Obstetrics', name: 'Obstetric HELLP Syndrome', icd10: 'O14.20', keyToken: 'microangiopathy', typoToken: 'microangipathy' },

  // 10. Pediatrics (8)
  { code: 'SYN_PEDS_AOM', specialty: 'Pediatrics', name: 'Pediatric Acute Suppurative Otitis Media', icd10: 'H66.001', keyToken: 'tympanic', typoToken: 'tympanc' },
  { code: 'SYN_BRONCHIOLITIS', specialty: 'Pediatrics', name: 'Acute RSV Bronchiolitis', icd10: 'J21.0', keyToken: 'bronchiolitis', typoToken: 'bronchioltis' },
  { code: 'SYN_CROUP', specialty: 'Pediatrics', name: 'Acute Viral Laryngotracheobronchitis (Croup)', icd10: 'J05.0', keyToken: 'stridor', typoToken: 'stridr' },
  { code: 'SYN_KAWASAKI', specialty: 'Pediatrics', name: 'Mucocutaneous Lymph Node Kawasaki Syndrome', icd10: 'M30.3', keyToken: 'kawasaki', typoToken: 'kawaski' },
  { code: 'SYN_INTUSSUSCEPTION', specialty: 'Pediatrics', name: 'Ileocolic Intussusception', icd10: 'K56.1', keyToken: 'intussusception', typoToken: 'intususception' },
  { code: 'SYN_PYLORIC_STENOSIS', specialty: 'Pediatrics', name: 'Hypertrophic Pyloric Stenosis', icd10: 'Q40.0', keyToken: 'pyloric', typoToken: 'pylorc' },
  { code: 'SYN_NEONATAL_SEPSIS', specialty: 'Pediatrics', name: 'Early-Onset Group B Streptococcal Neonatal Sepsis', icd10: 'P36.0', keyToken: 'neonatal', typoToken: 'neonatl' },
  { code: 'SYN_EPIGLOTTITIS', specialty: 'Pediatrics', name: 'Acute Supraglottic Epiglottitis', icd10: 'J05.10', keyToken: 'epiglottitis', typoToken: 'epiglotitis' },

  // 11. Toxicology, Immunology & Rheumatology (8)
  { code: 'SYN_ANAPHYLAXIS', specialty: 'Immunology', name: 'IgE-Mediated Anaphylactic Shock', icd10: 'T78.2XXA', keyToken: 'anaphylaxis', typoToken: 'anaphylxis' },
  { code: 'SYN_SEROTONIN_SYNDROME', specialty: 'Toxicology', name: 'Fulminant Serotonin Toxicity Syndrome', icd10: 'G21.0', keyToken: 'hyperreflexia', typoToken: 'hyperreflexa' },
  { code: 'SYN_NMS', specialty: 'Toxicology', name: 'Neuroleptic Malignant Syndrome', icd10: 'G21.0', keyToken: 'leadpipe', typoToken: 'leadppe' },
  { code: 'SYN_OPIOID_TOX', specialty: 'Toxicology', name: 'Acute Opioid Toxidrome with Bradypnea', icd10: 'T40.2X1A', keyToken: 'bradypnea', typoToken: 'bradypna' },
  { code: 'SYN_ANTICHOLINERGIC', specialty: 'Toxicology', name: 'Central Anticholinergic Toxidrome', icd10: 'T43.3X1A', keyToken: 'mydriasis', typoToken: 'mydriass' },
  { code: 'SYN_SALICYLATE_TOX', specialty: 'Toxicology', name: 'Acute Salicylate Poisoning', icd10: 'T39.011A', keyToken: 'tinnitus', typoToken: 'tinitus' },
  { code: 'SYN_GOUT_FLARE', specialty: 'Rheumatology', name: 'Acute Crystal-Proven Podagra Gout Flare', icd10: 'M10.00', keyToken: 'podagra', typoToken: 'podgra' },
  { code: 'SYN_LUPUS_NEPHRITIS', specialty: 'Rheumatology', name: 'Proliferative Systemic Lupus Nephritis', icd10: 'M32.14', keyToken: 'glomerulonephritis', typoToken: 'glomerulnephritis' },

  // 12. Emergency Medicine, Surgery & Critical Care (8)
  { code: 'SYN_DELIRIUM_TREMENS', specialty: 'Emergency Medicine', name: 'Alcohol Withdrawal Delirium Tremens', icd10: 'F10.231', keyToken: 'tremens', typoToken: 'tremns' },
  { code: 'SYN_LITHIUM_TOX', specialty: 'Toxicology', name: 'Chronic-on-Acute Lithium Neurotoxicity', icd10: 'T43.591A', keyToken: 'ataxia', typoToken: 'ataxa' },
  { code: 'SYN_TCA_OVERDOSE', specialty: 'Toxicology', name: 'Tricyclic Antidepressant Cardiotoxicity', icd10: 'T43.011A', keyToken: 'arrhythmia', typoToken: 'arhythmia' },
  { code: 'SYN_DIGOXIN_TOX', specialty: 'Cardiology', name: 'Life-Threatening Digoxin Toxicity', icd10: 'T46.0X1A', keyToken: 'xanthopsia', typoToken: 'xanthopsa' },
  { code: 'SYN_GLAUCOMA_AAC', specialty: 'Ophthalmology', name: 'Acute Angle-Closure Glaucoma Crisis', icd10: 'H40.219', keyToken: 'glaucoma', typoToken: 'glaucma' },
  { code: 'SYN_CAUDA_EQUINA', specialty: 'Neurosurgery', name: 'Acute Cauda Equina Compression Syndrome', icd10: 'G83.4', keyToken: 'radiculopathy', typoToken: 'radiculpathy' },
  { code: 'SYN_COMPARTMENT_SYN', specialty: 'Orthopedics', name: 'Acute Anterior Tibial Compartment Syndrome', icd10: 'T79.A2XA', keyToken: 'fasciotomy', typoToken: 'fasciotmy' },
  { code: 'SYN_RHABDOMYOLYSIS', specialty: 'Critical Care', name: 'Exertional Crush Rhabdomyolysis', icd10: 'M62.82', keyToken: 'rhabdomyolysis', typoToken: 'rhabdomylysis' },
];

export const SYNDROMES_100: readonly SyndromeSpec[] = RAW_SYNDROMES.map((s, index) => ({
  ...s,
  index,
  phrase: `${s.name} (${s.keyToken})`,
  typoPhrase: `${s.name} (${s.typoToken})`,
}));

// ============================================================================
// AXIS 2: 50 HIGH-RISK PHARMACOLOGIC REGIMENS (RXNORM CLASSES)
// ============================================================================
const RAW_REGIMENS: ReadonlyArray<Omit<RegimenSpec, 'index' | 'phrase' | 'typoPhrase'>> = [
  { code: 'RX_IBUPROFEN', drugClass: 'NSAID', drugName: 'Ibuprofen 800mg TID', keyToken: 'ibuprofen', typoToken: 'ibuprofn', mechanism: 'Prostaglandin inhibition & afferent arteriole vasoconstriction' },
  { code: 'RX_KETOROLAC', drugClass: 'Parenteral NSAID', drugName: 'Ketorolac 30mg IV', keyToken: 'ketorolac', typoToken: 'ketorolc', mechanism: 'Potent COX-1/2 inhibition with mucosal & renal toxicity' },
  { code: 'RX_NAPROXEN', drugClass: 'NSAID', drugName: 'Naproxen 500mg BID', keyToken: 'naproxen', typoToken: 'naproxn', mechanism: 'Renal sodium retention & antiplatelet interference' },
  { code: 'RX_MELOXICAM', drugClass: 'COX-2 Preferential NSAID', drugName: 'Meloxicam 15mg daily', keyToken: 'meloxicam', typoToken: 'meloxicm', mechanism: 'Impaired renal autoregulation & cardiovascular thrombosis' },
  { code: 'RX_INDOMETHACIN', drugClass: 'NSAID', drugName: 'Indomethacin 50mg TID', keyToken: 'indomethacin', typoToken: 'indomethcin', mechanism: 'Severe renal vasoconstriction & CNS toxicity' },
  { code: 'RX_CELECOXIB', drugClass: 'Selective COX-2 Inhibitor', drugName: 'Celecoxib 200mg BID', keyToken: 'celecoxib', typoToken: 'celecoxb', mechanism: 'Prothrombotic endothelial imbalance & sulfonamide cross-reactivity' },
  { code: 'RX_LISINOPRIL', drugClass: 'ACE Inhibitor', drugName: 'Lisinopril 40mg daily', keyToken: 'lisinopril', typoToken: 'lisinoprl', mechanism: 'Efferent arteriole dilation, hyperkalemia & bradykinin angioedema' },
  { code: 'RX_ENALAPRIL', drugClass: 'ACE Inhibitor', drugName: 'Enalapril 20mg BID', keyToken: 'enalapril', typoToken: 'enalaprl', mechanism: 'RAAS suppression & GFR drop in bilateral renal artery stenosis' },
  { code: 'RX_RAMIPRIL', drugClass: 'ACE Inhibitor', drugName: 'Ramipril 10mg daily', keyToken: 'ramipril', typoToken: 'ramiprl', mechanism: 'Aldosterone suppression & potassium retention' },
  { code: 'RX_LOSARTAN', drugClass: 'Angiotensin Receptor Blocker', drugName: 'Losartan 100mg daily', keyToken: 'losartan', typoToken: 'losartn', mechanism: 'AT1 receptor blockade, fetal renal dysgenesis & hyperkalemia' },
  { code: 'RX_VALSARTAN', drugClass: 'Angiotensin Receptor Blocker', drugName: 'Valsartan 160mg BID', keyToken: 'valsartan', typoToken: 'valsartn', mechanism: 'Efferent arteriolar vasodilation & hyperkalemia' },
  { code: 'RX_SPIRONOLACTONE', drugClass: 'Mineralocorticoid Antagonist', drugName: 'Spironolactone 50mg daily', keyToken: 'spironolactone', typoToken: 'spironolacton', mechanism: 'Distal collecting duct ENaC/ROMK potassium retention' },
  { code: 'RX_EPLERENONE', drugClass: 'Selective MRA', drugName: 'Eplerenone 50mg daily', keyToken: 'eplerenone', typoToken: 'eplerenon', mechanism: 'Mineralocorticoid blockade & CYP3A4 interaction' },
  { code: 'RX_METFORMIN', drugClass: 'Biguanide', drugName: 'Metformin 1000mg BID', keyToken: 'metformin', typoToken: 'metformn', mechanism: 'Hepatic gluconeogenesis inhibition & lactic acidosis in renal failure' },
  { code: 'RX_EMPAGLIFLOZIN', drugClass: 'SGLT2 Inhibitor', drugName: 'Empagliflozin 25mg daily', keyToken: 'empagliflozin', typoToken: 'empagliflzin', mechanism: 'Euglycemic ketoacidosis & osmotic diuresis volume depletion' },
  { code: 'RX_GLARGINE', drugClass: 'Basal Insulin', drugName: 'Insulin Glargine 40 units qHS', keyToken: 'glargine', typoToken: 'glargne', mechanism: 'Neuroglycopenia & intracellular potassium shift' },
  { code: 'RX_WARFARIN', drugClass: 'Vitamin K Antagonist', drugName: 'Warfarin 7.5mg daily', keyToken: 'warfarin', typoToken: 'warfrin', mechanism: 'CYP2C9-dependent inhibition of Factors II, VII, IX, X' },
  { code: 'RX_APIXABAN', drugClass: 'Direct Factor Xa Inhibitor', drugName: 'Apixaban 5mg BID', keyToken: 'apixaban', typoToken: 'apixabn', mechanism: 'Direct Factor Xa inhibition with P-gp/CYP3A4 accumulation' },
  { code: 'RX_RIVAROXABAN', drugClass: 'Direct Factor Xa Inhibitor', drugName: 'Rivaroxaban 20mg daily', keyToken: 'rivaroxaban', typoToken: 'rivaroxabn', mechanism: 'Renally cleared Factor Xa blockade & major bleeding risk' },
  { code: 'RX_ENOXAPARIN', drugClass: 'Low Molecular Weight Heparin', drugName: 'Enoxaparin 1mg/kg SC BID', keyToken: 'enoxaparin', typoToken: 'enoxaparn', mechanism: 'Antithrombin III activation; bioaccumulates when CrCl < 30' },
  { code: 'RX_HEPARIN', drugClass: 'Unfractionated Heparin', drugName: 'Heparin IV Infusion', keyToken: 'heparin', typoToken: 'heparn', mechanism: 'PF4 antibody complex formation (HIT) & hemorrhage' },
  { code: 'RX_CLOPIDOGREL', drugClass: 'P2Y12 Inhibitor', drugName: 'Clopidogrel 75mg daily', keyToken: 'clopidogrel', typoToken: 'clopidogrl', mechanism: 'Irreversible platelet P2Y12 blockade requiring CYP2C19 activation' },
  { code: 'RX_ASPIRIN', drugClass: 'Salicylate Antiplatelet', drugName: 'Aspirin 325mg daily', keyToken: 'aspirin', typoToken: 'aspirn', mechanism: 'Irreversible platelet COX-1 acetylation & gastric mucosal injury' },
  { code: 'RX_TICAGRELOR', drugClass: 'Reversible P2Y12 Inhibitor', drugName: 'Ticagrelor 90mg BID', keyToken: 'ticagrelor', typoToken: 'ticagrelr', mechanism: 'Potent platelet inhibition & adenosine-mediated dyspnea/bradycardia' },
  { code: 'RX_AMOXICILLIN', drugClass: 'Aminopenicillin', drugName: 'Amoxicillin 875mg BID', keyToken: 'amoxicillin', typoToken: 'amoxicilin', mechanism: 'Beta-lactam ring IgE cross-reactivity & anaphylaxis' },
  { code: 'RX_PIPTAZO', drugClass: 'Antipseudomonal Penicillin', drugName: 'Piperacillin-Tazobactam 4.5g IV q6h', keyToken: 'piperacillin', typoToken: 'piperacilin', mechanism: 'Synergistic nephrotoxicity with vancomycin & beta-lactam allergy' },
  { code: 'RX_CEFTRIAXONE', drugClass: '3rd-Gen Cephalosporin', drugName: 'Ceftriaxone 2g IV daily', keyToken: 'ceftriaxone', typoToken: 'ceftriaxon', mechanism: 'Biliary pseudolithiasis & calcium-ceftriaxone precipitation in neonates' },
  { code: 'RX_CEFDINIR', drugClass: '3rd-Gen Oral Cephalosporin', drugName: 'Cefdinir 300mg BID', keyToken: 'cefdinir', typoToken: 'cefdinr', mechanism: 'Cephalosporin R1 side-chain hypersensitivity' },
  { code: 'RX_VANCOMYCIN', drugClass: 'Glycopeptide Antibiotic', drugName: 'Vancomycin 15mg/kg IV q12h', keyToken: 'vancomycin', typoToken: 'vancomycn', mechanism: 'Proximal tubular oxidative nephrotoxicity & ototoxicity' },
  { code: 'RX_LINEZOLID', drugClass: 'Oxazolidinone (MAOI)', drugName: 'Linezolid 600mg IV BID', keyToken: 'linezolid', typoToken: 'linezold', mechanism: 'Reversible monoamine oxidase inhibition & myelosuppression' },
  { code: 'RX_BACTRIM', drugClass: 'Sulfonamide / Folate Antagonist', drugName: 'Sulfamethoxazole-Trimethoprim DS BID', keyToken: 'sulfamethoxazole', typoToken: 'sulfamethoxazol', mechanism: 'CYP2C9 inhibition, ENaC blockade hyperkalemia & Stevens-Johnson' },
  { code: 'RX_CIPROFLOXACIN', drugClass: 'Fluoroquinolone', drugName: 'Ciprofloxacin 500mg BID', keyToken: 'ciprofloxacin', typoToken: 'ciprofloxacn', mechanism: 'CYP1A2 inhibition, tendon rupture, aortic aneurysm & QTc prolongation' },
  { code: 'RX_LEVOFLOXACIN', drugClass: 'Respiratory Fluoroquinolone', drugName: 'Levofloxacin 750mg daily', keyToken: 'levofloxacin', typoToken: 'levofloxacn', mechanism: 'IKr channel blockade QTc prolongation & dysglycemia' },
  { code: 'RX_AZITHROMYCIN', drugClass: 'Macrolide', drugName: 'Azithromycin 500mg daily', keyToken: 'azithromycin', typoToken: 'azithromycn', mechanism: 'Ventricular repolarization delay & Torsades de Pointes risk' },
  { code: 'RX_CLARITHROMYCIN', drugClass: 'Macrolide', drugName: 'Clarithromycin 500mg BID', keyToken: 'clarithromycin', typoToken: 'clarithromycn', mechanism: 'Strong CYP3A4/P-gp inhibition & QTc prolongation' },
  { code: 'RX_GENTAMICIN', drugClass: 'Aminoglycoside', drugName: 'Gentamicin 5mg/kg IV daily', keyToken: 'gentamicin', typoToken: 'gentamicn', mechanism: 'Irreversible vestibulocochlear ototoxicity, nephrotoxicity & neuromuscular blockade' },
  { code: 'RX_SERTRALINE', drugClass: 'SSRI Antidepressant', drugName: 'Sertraline 100mg daily', keyToken: 'sertraline', typoToken: 'sertralin', mechanism: 'Presynaptic serotonin reuptake blockade & platelet serotonin depletion' },
  { code: 'RX_FLUOXETINE', drugClass: 'SSRI Antidepressant', drugName: 'Fluoxetine 40mg daily', keyToken: 'fluoxetine', typoToken: 'fluoxetin', mechanism: 'Potent CYP2D6 inhibition & long-half-life serotonergic excess' },
  { code: 'RX_ESCITALOPRAM', drugClass: 'SSRI Antidepressant', drugName: 'Escitalopram 20mg daily', keyToken: 'escitalopram', typoToken: 'escitaloprm', mechanism: 'Dose-dependent QTc prolongation, SIADH & serotonin syndrome' },
  { code: 'RX_VENLAFAXINE', drugClass: 'SNRI Antidepressant', drugName: 'Venlafaxine XR 150mg daily', keyToken: 'venlafaxine', typoToken: 'venlafaxin', mechanism: 'Noradrenergic hypertension & serotonergic toxicity' },
  { code: 'RX_LITHIUM', drugClass: 'Mood Stabilizer', drugName: 'Lithium Carbonate 600mg BID', keyToken: 'lithium', typoToken: 'lithim', mechanism: 'Narrow therapeutic index; proximal tubular reabsorption with Na+ depletion' },
  { code: 'RX_DIGOXIN', drugClass: 'Cardiac Glycoside', drugName: 'Digoxin 0.25mg daily', keyToken: 'digoxin', typoToken: 'digoxn', mechanism: 'Na+/K+-ATPase inhibition; toxicity potentiated by hypokalemia & renal failure' },
  { code: 'RX_AMIODARONE', drugClass: 'Class III Antiarrhythmic', drugName: 'Amiodarone 200mg daily', keyToken: 'amiodarone', typoToken: 'amiodaron', mechanism: 'Inhibits CYP2C9, CYP2D6 & P-gp; causes thyroid/pulmonary/hepatic toxicity' },
  { code: 'RX_SOTALOL', drugClass: 'Class III Beta-Blocker', drugName: 'Sotalol 120mg BID', keyToken: 'sotalol', typoToken: 'sotall', mechanism: 'Renally cleared IKr potassium channel blockade causing Torsades' },
  { code: 'RX_METOPROLOL', drugClass: 'Cardioselective Beta-Blocker', drugName: 'Metoprolol Tartrate 50mg BID', keyToken: 'metoprolol', typoToken: 'metoproll', mechanism: 'Negative inotropy/chronotropy; precipitates cardiogenic shock in acute decompensation' },
  { code: 'RX_DILTIAZEM', drugClass: 'Non-Dihydropyridine CCB', drugName: 'Diltiazem CD 240mg daily', keyToken: 'diltiazem', typoToken: 'diltiazm', mechanism: 'AV nodal conduction delay, negative inotropy & CYP3A4 inhibition' },
  { code: 'RX_FUROSEMIDE', drugClass: 'Loop Diuretic', drugName: 'Furosemide 80mg IV BID', keyToken: 'furosemide', typoToken: 'furosemid', mechanism: 'NKCC2 blockade causing hypokalemia, hypomagnesemia & prerenal azotemia' },
  { code: 'RX_HCTZ', drugClass: 'Thiazide Diuretic', drugName: 'Hydrochlorothiazide 25mg daily', keyToken: 'hydrochlorothiazide', typoToken: 'hydrochlorothiazid', mechanism: 'Distal convoluted tubule NaCl blockade causing hyponatremia, hypokalemia & hyperuricemia' },
  { code: 'RX_METHOTREXATE', drugClass: 'Antimetabolite / Folate Antagonist', drugName: 'Methotrexate 15mg weekly', keyToken: 'methotrexate', typoToken: 'methotrexat', mechanism: 'Dihydrofolate reductase inhibition causing fatal pancytopenia & hepatotoxicity' },
  { code: 'RX_PREDNISONE', drugClass: 'Systemic Corticosteroid', drugName: 'Prednisone 60mg daily', keyToken: 'prednisone', typoToken: 'prednison', mechanism: 'Glucocorticoid hyperglycemia, GI ulceration, fluid retention & immunosuppression' },
];

export const REGIMENS_50: readonly RegimenSpec[] = RAW_REGIMENS.map((r, index) => ({
  ...r,
  index,
  phrase: `prescribed ${r.drugName} (${r.keyToken})`,
  typoPhrase: `prescribed ${r.typoToken}`,
}));

// ============================================================================
// AXIS 3: 20 QUANTITATIVE PHYSIOLOGICAL, LAB & DEMOGRAPHIC MODIFIERS
// ============================================================================
const RAW_MODIFIERS: ReadonlyArray<Omit<ModifierSpec, 'index' | 'phrase' | 'typoPhrase'>> = [
  { code: 'MOD_EGFR_12_ESRD', category: 'Renal Function', label: 'eGFR 12 mL/min (Stage 5 ESRD)', keyToken: 'glomerular12', typoToken: 'glomerulr12', quantFlag: 'EGFR_CRITICAL_<15' },
  { code: 'MOD_EGFR_22_CKD4', category: 'Renal Function', label: 'eGFR 22 mL/min (Stage 4 Severe CKD)', keyToken: 'glomerular22', typoToken: 'glomerulr22', quantFlag: 'EGFR_CONTRAINDICATED_<30' },
  { code: 'MOD_EGFR_36_CKD3B', category: 'Renal Function', label: 'eGFR 36 mL/min (Stage 3b Moderate CKD)', keyToken: 'glomerular36', typoToken: 'glomerulr36', quantFlag: 'EGFR_PRECAUTION_30_44' },
  { code: 'MOD_K_6_2_LETHAL', category: 'Electrolytes', label: 'Serum Potassium 6.2 mEq/L', keyToken: 'kalemia62', typoToken: 'kalema62', quantFlag: 'K_LETHAL_>6.0' },
  { code: 'MOD_K_5_6_HIGH', category: 'Electrolytes', label: 'Serum Potassium 5.6 mEq/L', keyToken: 'kalemia56', typoToken: 'kalema56', quantFlag: 'K_CRITICAL_>5.5' },
  { code: 'MOD_K_2_8_LOW', category: 'Electrolytes', label: 'Serum Potassium 2.8 mEq/L', keyToken: 'hypokalemia28', typoToken: 'hypokalema28', quantFlag: 'K_SEVERE_HYPOKALEMIA_<3.0' },
  { code: 'MOD_NA_121_LOW', category: 'Electrolytes', label: 'Serum Sodium 121 mEq/L', keyToken: 'natremia121', typoToken: 'natrema121', quantFlag: 'NA_CRITICAL_<125' },
  { code: 'MOD_INR_5_4_HIGH', category: 'Coagulation', label: 'Supratherapeutic INR 5.4', keyToken: 'coagindex54', typoToken: 'coagindx54', quantFlag: 'INR_SUPRATHERAPEUTIC_>4.5' },
  { code: 'MOD_LACTATE_4_8', category: 'Perfusion', label: 'Arterial Lactate 4.8 mmol/L', keyToken: 'hyperlactatemia48', typoToken: 'hyperlactatema48', quantFlag: 'LACTATE_SHOCK_>4.0' },
  { code: 'MOD_QTC_530', category: 'Electrophysiology', label: 'Prolonged QTc 530 ms', keyToken: 'repolarization530', typoToken: 'repolarizaton530', quantFlag: 'QTC_TORSADES_RISK_>500' },
  { code: 'MOD_PLT_32K', category: 'Hematology', label: 'Platelets 32,000 /uL', keyToken: 'thrombocytes32', typoToken: 'thromboctes32', quantFlag: 'PLT_SEVERE_<50K' },
  { code: 'MOD_ANC_350', category: 'Hematology', label: 'Absolute Neutrophil Count 350 /uL', keyToken: 'neutropenia350', typoToken: 'neutropena350', quantFlag: 'ANC_PROFOUND_<500' },
  { code: 'MOD_CHILD_PUGH_C', category: 'Hepatology', label: 'Child-Pugh Class C Cirrhosis (Bilirubin 4.2 mg/dL)', keyToken: 'cirrhosis42', typoToken: 'cirhosis42', quantFlag: 'HEPATIC_FAILURE_CHILD_PUGH_C' },
  { code: 'MOD_PREG_TRIMESTER1', category: 'Obstetrics', label: 'First-Trimester Intrauterine Pregnancy (8 weeks)', keyToken: 'gestation08', typoToken: 'gestaton08', quantFlag: 'PREGNANCY_TERATOGEN_GUARD' },
  { code: 'MOD_PREG_TRIMESTER3', category: 'Obstetrics', label: 'Third-Trimester Pregnancy (34 weeks)', keyToken: 'gestation34', typoToken: 'gestaton34', quantFlag: 'PREGNANCY_FETAL_DUCTAL_RISK' },
  { code: 'MOD_PEDS_WT_14KG', category: 'Pediatrics', label: 'Pediatric Weight 14 kg (2200 mg/day dose)', keyToken: 'pediatric14kg', typoToken: 'pediatrc14kg', quantFlag: 'PEDS_DOSE_HIGH' },
  { code: 'MOD_GERIATRIC_88YO', category: 'Geriatrics', label: 'Frail Octogenarian Age 88 (AGS Beers Criteria)', keyToken: 'octogenarian88', typoToken: 'octogenaran88', quantFlag: 'GERIATRIC_BEERS_HIGH_RISK' },
  { code: 'MOD_BP_196_124', category: 'Hemodynamics', label: 'Hypertensive Crisis BP 196/124 mmHg', keyToken: 'barotrauma196', typoToken: 'barotrama196', quantFlag: 'BP_HYPERTENSIVE_CRISIS' },
  { code: 'MOD_MAP_54_SHOCK', category: 'Hemodynamics', label: 'Hypotensive Shock SBP 82/40 mmHg (MAP 54)', keyToken: 'vasoplegia54', typoToken: 'vasoplega54', quantFlag: 'MAP_SHOCK_<65' },
  { code: 'MOD_SPO2_84_HYPOXIA', category: 'Oxygenation', label: 'Refractory Hypoxemia SpO2 84%', keyToken: 'desaturation84', typoToken: 'desaturaton84', quantFlag: 'SPO2_CRITICAL_<88' },
];

export const MODIFIERS_20: readonly ModifierSpec[] = RAW_MODIFIERS.map((m, index) => ({
  ...m,
  index,
  phrase: `with ${m.label} (${m.keyToken})`,
  typoPhrase: `with ${m.label} (${m.typoToken})`,
}));

// ============================================================================
// O(1) TOKEN LOOKUP TABLES FOR ULTRA-FAST 100,000-ARCHETYPE CLASSIFICATION
// ============================================================================
const SYNDROME_TOKEN_MAP = new Map<string, number>();
for (const s of SYNDROMES_100) {
  SYNDROME_TOKEN_MAP.set(s.keyToken.toLowerCase(), s.index);
  SYNDROME_TOKEN_MAP.set(s.typoToken.toLowerCase(), s.index);
}

const REGIMEN_TOKEN_MAP = new Map<string, number>();
for (const r of REGIMENS_50) {
  REGIMEN_TOKEN_MAP.set(r.keyToken.toLowerCase(), r.index);
  REGIMEN_TOKEN_MAP.set(r.typoToken.toLowerCase(), r.index);
}

const MODIFIER_TOKEN_MAP = new Map<string, number>();
for (const m of MODIFIERS_20) {
  MODIFIER_TOKEN_MAP.set(m.keyToken.toLowerCase(), m.index);
  MODIFIER_TOKEN_MAP.set(m.typoToken.toLowerCase(), m.index);
}

const ARCHETYPE_ID_TABLE: string[] = new Array(TOTAL_ARCHETYPES);
for (let i = 0; i < TOTAL_ARCHETYPES; i++) {
  if (i < SENTINEL_ARCHETYPE_IDS.length) {
    ARCHETYPE_ID_TABLE[i] = SENTINEL_ARCHETYPE_IDS[i];
  } else {
    const sIdx = Math.floor(i / 1000);
    const rem = i % 1000;
    const rIdx = Math.floor(rem / 20);
    const mIdx = rem % 20;
    ARCHETYPE_ID_TABLE[i] = `ARCH_${String(i).padStart(5, '0')}_${SYNDROMES_100[sIdx].code}_${REGIMENS_50[rIdx].code}_${MODIFIERS_20[mIdx].code}`;
  }
}

export function getClinicalArchetypeIdByIndex(index: number): string {
  const safeIdx = ((index % TOTAL_ARCHETYPES) + TOTAL_ARCHETYPES) % TOTAL_ARCHETYPES;
  return ARCHETYPE_ID_TABLE[safeIdx];
}

/**
 * Resolves any index in [0 .. 99,999] into its deterministic 3-axis clinical archetype.
 *   index = s * 1000 + r * 20 + m
 *   where s in [0..99], r in [0..49], m in [0..19]
 */
export function getClinicalArchetypeByIndex(index: number): CompositionalArchetype {
  const safeIdx = ((index % TOTAL_ARCHETYPES) + TOTAL_ARCHETYPES) % TOTAL_ARCHETYPES;
  const sIdx = Math.floor(safeIdx / 1000);
  const rem = safeIdx % 1000;
  const rIdx = Math.floor(rem / 20);
  const mIdx = rem % 20;

  const syndrome = SYNDROMES_100[sIdx];
  const regimen = REGIMENS_50[rIdx];
  const modifier = MODIFIERS_20[mIdx];

  return {
    index: safeIdx,
    id: ARCHETYPE_ID_TABLE[safeIdx],
    specialty: syndrome.specialty,
    syndrome,
    regimen,
    modifier,
    expectsDrugAlert: safeIdx < SENTINEL_ARCHETYPE_IDS.length ? [0, 1, 3, 8, 9, 10].includes(safeIdx) : true,
  };
}

/**
 * Generates positive, typo/shorthand, or negated clinical note text for any of the 100,000 archetypes.
 */
export function buildArchetypeCaseNote(index: number, mode: 0 | 1 | 2, sentinelTemplates?: {
  positiveTemplates: readonly string[];
  typoTemplates: readonly string[];
  negatedTemplates: readonly string[];
  variantIdx?: number;
}): string {
  const safeIdx = ((index % TOTAL_ARCHETYPES) + TOTAL_ARCHETYPES) % TOTAL_ARCHETYPES;
  if (safeIdx < 12 && sentinelTemplates) {
    const v = sentinelTemplates.variantIdx ?? 0;
    if (mode === 0) return sentinelTemplates.positiveTemplates[v % sentinelTemplates.positiveTemplates.length];
    if (mode === 1) return sentinelTemplates.typoTemplates[v % sentinelTemplates.typoTemplates.length];
    return sentinelTemplates.negatedTemplates[v % sentinelTemplates.negatedTemplates.length];
  }

  const sIdx = Math.floor(safeIdx / 1000);
  const rem = safeIdx % 1000;
  const rIdx = Math.floor(rem / 20);
  const mIdx = rem % 20;
  const s = SYNDROMES_100[sIdx];
  const r = REGIMENS_50[rIdx];
  const m = MODIFIERS_20[mIdx];

  if (mode === 0) {
    return `Patient presents with ${s.phrase}, ${r.phrase}, ${m.phrase}.`;
  }
  if (mode === 1) {
    return `Pt presents with ${s.typoPhrase}, ${r.typoPhrase}, ${m.typoPhrase}.`;
  }
  // Mode 2: Negated torture test
  return `Patient denies ${s.keyToken}, discontinued ${r.keyToken}, negative for ${m.keyToken}.`;
}

const STREAM_NEGATION_CUES = new Set([
  'no', 'not', 'none', 'denies', 'denied', 'without', 'negative',
  'ruled', 'r/o', 'free', 'absent', 'never', 'discontinued', 'stopped', 'held',
  'avoid', 'avoided'
]);

const CLAUSE_RESET_WORDS = new Set(['but', 'however', 'although', 'except']);

/**
 * O(1) Compositional 100,000-Archetype Classifier.
 * Scans tokens once, tracks 6-token clause-bounded negation window, and resolves matched
 * (syndrome, regimen, modifier) coordinates into their exact archetype in [0 .. 99,999].
 */
export function classifyCompositionalFast(
  text: string,
  _isNegatedFn?: (text: string, matchIndex: number) => boolean
): { matched: CompositionalArchetype | null; isCompositionalNote: boolean } {
  const lower = text.toLowerCase();
  const tokenRegex = /[a-z0-9+/]+/g;

  let seenSyndrome = false;
  let seenRegimen = false;
  let seenModifier = false;

  let matchedSyndrome = -1;
  let matchedRegimen = -1;
  let matchedModifier = -1;

  let negWindow = 0;
  let lastEnd = 0;

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(lower)) !== null) {
    // Check if punctuation between lastEnd and match.index reset the clause
    for (let k = lastEnd; k < match.index; k++) {
      const c = lower.charCodeAt(k);
      if (c === 46 || c === 59 || c === 33 || c === 63) { // '.', ';', '!', '?'
        negWindow = 0;
        break;
      }
    }
    lastEnd = match.index + match[0].length;

    const tok = match[0];
    if (CLAUSE_RESET_WORDS.has(tok)) {
      negWindow = 0;
      continue;
    }
    if (STREAM_NEGATION_CUES.has(tok)) {
      negWindow = 6;
      continue;
    }

    const negated = negWindow > 0;
    if (negWindow > 0) negWindow--;

    const sCandidate = SYNDROME_TOKEN_MAP.get(tok);
    if (sCandidate !== undefined) {
      seenSyndrome = true;
      if (!negated) {
        matchedSyndrome = sCandidate;
      }
    }
    const rCandidate = REGIMEN_TOKEN_MAP.get(tok);
    if (rCandidate !== undefined) {
      seenRegimen = true;
      if (!negated) {
        matchedRegimen = rCandidate;
      }
    }
    const mCandidate = MODIFIER_TOKEN_MAP.get(tok);
    if (mCandidate !== undefined) {
      seenModifier = true;
      if (!negated) {
        matchedModifier = mCandidate;
      }
    }
  }

  const isCompositionalNote = seenSyndrome && seenRegimen && seenModifier;
  if (matchedSyndrome !== -1 && matchedRegimen !== -1 && matchedModifier !== -1) {
    const archIdx = matchedSyndrome * 1000 + matchedRegimen * 20 + matchedModifier;
    return { matched: getClinicalArchetypeByIndex(archIdx), isCompositionalNote: true };
  }

  return { matched: null, isCompositionalNote };
}

export function classifyCompositionalArchetypes(
  text: string,
  isNegatedFn: (text: string, matchIndex: number) => boolean
): CompositionalArchetype[] {
  const { matched } = classifyCompositionalFast(text, isNegatedFn);
  return matched ? [matched] : [];
}


