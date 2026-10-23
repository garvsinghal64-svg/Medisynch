export interface Vitals {
  bloodPressure: string;
  heartRate: number;
  respiratoryRate: number;
  temperature: string;
  spO2: number;
  weightKg: number;
  heightCm: number;
}

export interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  encounterDate: string;
  chiefComplaint: string;
  vitals: Vitals;
}

export type ProvenanceEngine = 'gemini' | 'heuristic' | 'hybrid' | 'mock' | 'unknown';

export type EvidenceRetrievalStatus =
  | 'live-success'
  | 'live-partial'
  | 'no-results'
  | 'incomplete-metadata'
  | 'failed'
  | 'not-requested'
  | 'unavailable'
  | 'curated-fallback';

export interface ResultProvenance {
  engine: ProvenanceEngine;
  model?: string;
  usedPrebuiltData: boolean;
  fallbackUsed: boolean;
  evidenceStatus: EvidenceRetrievalStatus;
  retrievalRequested?: boolean;
  claimSupportVerified?: boolean;
}

export interface AttachmentAnalysisResult {
  headline: string;
  category: string;
  summary: string;
  keyFindings: string[];
  suggestedSectionText: string;
  confidenceNote?: string;
  provenance: ResultProvenance;
}

export interface SectionAttachment {
  id: string;
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
  fileName: string;
  fileType: 'image' | 'document';
  mimeType: string;
  dataUrl?: string; // base64 / blob URL for display/preview
  fileSize: number;
  uploadedAt: string;
  analysis?: AttachmentAnalysisResult;
  isAnalyzing?: boolean;
  insertedIntoNote?: boolean;
}

export interface LabResultItem {
  id: string;
  panel: 'BMP' | 'CBC' | 'Cardiac' | 'Hepatic' | 'Lipids' | 'Urinalysis' | 'Inflammatory' | 'Other';
  testName: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange: string;
  flag: 'normal' | 'high' | 'low' | 'critical';
  status: 'resulted' | 'pending' | 'ordered';
  collectedAt: string;
  notes?: string;
}

export interface PrescriptionOrder {
  id: string;
  medicationName: string;
  dosage: string;
  route: 'PO' | 'IV' | 'Inhaled' | 'SubQ' | 'Topical' | 'Ophthalmic' | 'Otic';
  frequency: string;
  quantity: string;
  refills: number;
  indication: string;
  status: 'active' | 'pending_erx' | 'sent_erx' | 'discontinued';
  prescribedBy: string;
  prescribedAt: string;
  pharmacy?: string;
  warnings?: string[];
  eRxConfirmationCode?: string;
}

export interface MissingHistoryQuestion {
  id: string;
  domain: string;
  question: string;
  rationale: string;
  suggestedInsert: string;
  status: 'unasked' | 'asked_negative' | 'asked_positive';
}

export interface MissingExamManeuver {
  id: string;
  organSystem: 'Cardiovascular' | 'Pulmonary' | 'Abdominal' | 'HEENT' | 'Musculoskeletal' | 'Neurological' | 'Vascular';
  maneuver: string;
  clinicalSignificance: string;
  normalExpectation: string;
  abnormalIndication: string;
  suggestedInsert: string;
  status: 'unexamined' | 'normal' | 'abnormal';
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  medications: string[];
  allergies: string[];
  attachments?: SectionAttachment[];
  labs?: LabResultItem[];
  prescriptions?: PrescriptionOrder[];
  signedBy?: string;
  signedAt?: string;
  doctorAttestation?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'modified' | 'rejected';

export interface ClinicalDifferential {
  id?: string;
  diagnosis: string;
  icd10: string;
  likelihood: 'High' | 'Moderate' | 'Consider';
  reasoning: string;
  recommendedWorkup: string[];
  guidelineName?: string;
  evidenceLevel?: string;
  guidelineSummary?: string;
  sourceUrl?: string;
  pmid?: string;
  evidenceLimitation?: string;
  claimSupportVerified?: boolean;
  approvalStatus?: ApprovalStatus;
  approvalNotes?: string;
}

export interface DrugSafetyAlert {
  id?: string;
  type: 'interaction' | 'contraindication' | 'dosage_warning' | 'allergy';
  severity: 'critical' | 'moderate' | 'informational';
  substances: string[];
  title: string;
  description: string;
  recommendation: string;
  guidelineSource?: string;
  clinicalMechanism?: string;
  sourceUrl?: string;
  evidenceLimitation?: string;
  claimSupportVerified?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface Icd10Suggestion {
  id?: string;
  code: string;
  description: string;
  category: string;
  rationale: string;
  approvalStatus?: ApprovalStatus;
}

export interface PatientDischargeSummary {
  headline: string;
  plainLanguageOverview: string;
  keyInstructions: string[];
  medicationSchedule: Array<{
    name: string;
    instructions: string;
    purpose: string;
  }>;
  redFlagSymptoms: string[];
  followUp: string;
}

export interface ClinicalAnalysisResult {
  differentials: ClinicalDifferential[];
  safetyAlerts: DrugSafetyAlert[];
  icd10Suggestions: Icd10Suggestion[];
  patientSummary: PatientDischargeSummary;
  clinicalMissingInfoAlerts: string[];
  missingHistoryQuestions?: MissingHistoryQuestion[];
  missingExamFindings?: MissingExamManeuver[];
  isQuotaExceeded?: boolean;
  isFallback?: boolean;
  errorType?: string;
  dataMasked?: boolean;
  provenance: ResultProvenance;
}

export interface ClinicalCaseTemplate {
  id: string;
  title: string;
  specialty: string;
  patient: PatientRecord;
  initialNote: SoapNote;
  description: string;
}

export interface SavedEncounterRecord {
  id: string;
  savedAt: string;
  patient: PatientRecord;
  note: SoapNote;
  analysis: ClinicalAnalysisResult | null;
  syncedToEhr?: boolean;
  ehrSyncTimestamp?: string;
}

// User & Role Management
export type UserRole = 'doctor' | 'nurse' | 'admin';

export interface UserPermissions {
  canApproveAi: boolean;
  canPrescribe: boolean;
  canExportEhr: boolean;
  canManageStaff: boolean;
  canViewAuditLog: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  title: string;
  role: UserRole;
  department: string;
  pin: string;
  badgeNumber: string;
  permissions: UserPermissions;
}

// HIPAA Audit Trail
export type AuditActionType =
  | 'VIEW_CHART'
  | 'EDIT_SOAP'
  | 'AMBIENT_DICTATION'
  | 'EXPAND_SNIPPET'
  | 'AI_ANALYSIS_REQUEST'
  | 'APPROVE_AI_OUTPUT'
  | 'REJECT_AI_OUTPUT'
  | 'SIGN_NOTE'
  | 'DRUG_CHECK'
  | 'EXPORT_FHIR'
  | 'EXPORT_HL7'
  | 'PRINT_HANDOUT'
  | 'TOGGLE_DATA_MASK'
  | 'LOGIN'
  | 'AUTO_LOCK'
  | 'UNLOCK';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: AuditActionType;
  patientMrn: string;
  patientName: string;
  details: string;
  stationId: string;
}

// Clinical Dot-Phrases / Snippets
export interface ClinicalSnippet {
  trigger: string; // e.g. '.htn'
  label: string;
  category: 'Cardiology' | 'General' | 'Pediatrics' | 'ER' | 'Psychiatry' | 'Examination' | 'Procedures';
  expansion: string;
  description: string;
}

// Multi-Language Patient Education
export type SupportedLanguage = 'en' | 'es' | 'zh' | 'hi' | 'fr' | 'tl' | 'ar';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export interface EhrPushResult {
  status: 'success' | 'failed';
  systemName: 'Epic Systems' | 'Cerner / Oracle Health' | 'AthenaHealth';
  transactionId: string;
  resourceCount: number;
  timestamp: string;
  message: string;
}

// Bioscience & Pharmacology Skills
export interface PubChemCompoundData {
  cid: number;
  name: string;
  molecularFormula: string;
  molecularWeight: string;
  canonicalSmiles: string;
  inchiKey?: string;
  xlogp?: number;
  tpsa?: number;
  hBondDonors?: number;
  hBondAcceptors?: number;
  rotatableBonds?: number;
  complexity?: number;
  iupacName?: string;
  imageUrl?: string;
}

export interface OpenFdaDrugData {
  brandName: string;
  genericName: string;
  boxedWarnings: string[];
  indications: string;
  contraindications: string;
  mechanismOfAction: string;
  adverseReactions: string;
  topAdverseEvents: Array<{ term: string; count: number }>;
}

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  pubdate: string;
  doi?: string;
  abstract?: string;
  citationString: string;
}

export interface ClinVarVariant {
  id: string;
  title: string;
  gene: string;
  clinicalSignificance: string;
  reviewStatus: string;
  conditions: string[];
  alphaGenomeUrl: string;
}

export interface DrugTargetStructure {
  id: string;
  name: string;
  geneSymbol: string;
  uniprotId: string;
  pdbId: string;
  description: string;
  drugs: string[];
  functionSummary: string;
  plddtConfidence?: string;
}

export interface ClinicalTrialStudy {
  nctId: string;
  title: string;
  briefSummary: string;
  phase: string;
  status: string;
  conditions: string[];
  interventions: string[];
  leadSponsor: string;
  url: string;
}

export interface RxNormConcept {
  rxcui: string;
  name: string;
  synonym?: string;
  tty: string; // Term type: IN (Ingredient), BN (Brand Name), SBD (Semantic Branded Drug), SCD (Semantic Clinical Drug)
  activeIngredients?: string[];
}

export interface EuropePmcArticle {
  id: string;
  source: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title: string;
  authorString: string;
  journalTitle: string;
  pubYear: string;
  citedByCount?: number;
  isOpenAccess: boolean;
  abstractText?: string;
}

export interface EmergencyRedFlag {
  id: string;
  category: 'Cardiac' | 'Respiratory' | 'Neurological' | 'Sepsis' | 'Vascular' | 'Anaphylaxis' | 'Hypertensive';
  severity: 'immediate_life_threat' | 'urgent_evaluation' | 'high_priority';
  title: string;
  triggerDescription: string;
  immediateAction: string;
  guidelineSource: string;
}

export interface RenalPrecaution {
  drugKeyword: string;
  minEgfrThreshold: number;
  action: 'contraindicated' | 'dose_reduction_50' | 'monitor_closely' | 'hold_in_aki';
  clinicalRationale: string;
  guidelineSource: string;
}

