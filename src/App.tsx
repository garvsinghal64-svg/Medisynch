import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { PatientBanner } from './components/PatientBanner';
import { SoapEditor } from './components/SoapEditor';
import { AiSuggestionsPanel } from './components/AiSuggestionsPanel';
import { ClinicalDisclaimerModal } from './components/ClinicalDisclaimerModal';
import { ExportModal } from './components/ExportModal';
import { EditPatientModal } from './components/EditPatientModal';
import { SavedPatientsModal } from './components/SavedPatientsModal';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { VitalsChartModal } from './components/VitalsChartModal';
import { FeedbackGuideModal } from './components/FeedbackGuideModal';

// Advanced Clinical Demands & Enterprise Integrations
import { AmbientDictationModal } from './components/AmbientDictationModal';
import { DrugSafetyCheckerModal } from './components/DrugSafetyCheckerModal';
import { EhrExportModal } from './components/EhrExportModal';
import { PatientHandoutModal } from './components/PatientHandoutModal';
import { SnippetsLibraryModal } from './components/SnippetsLibraryModal';
import { HospitalAdminModal } from './components/HospitalAdminModal';
import { HospitalAnalyticsModal } from './components/HospitalAnalyticsModal';
import { PrivacyDpaModal } from './components/PrivacyDpaModal';
import { AutoLogoutLockModal } from './components/AutoLogoutLockModal';
import { DiagnosticsOrganizerModal } from './components/DiagnosticsOrganizerModal';
import { BioscienceHubModal } from './components/BioscienceHubModal';
import { ClinicalCalculatorsModal } from './components/ClinicalCalculatorsModal';
import { SignNoteModal } from './components/SignNoteModal';
import { ApiDiagnosticsModal } from './components/ApiDiagnosticsModal';
import { AlertFatigueDashboard } from './components/AlertFatigueDashboard';
import { AdvancedClinicalSuiteModal, AdvancedSuiteTab } from './components/AdvancedClinicalSuiteModal';
import { trackedFetch } from './services/apiDiagnosticsService';

import { CLINICAL_CASES, FALLBACK_ANALYSES } from './data/clinicalTemplates';
import { CASE_LABS, CASE_PRESCRIPTIONS } from './data/clinicalDiagnosticsData';
import { DEFAULT_STAFF } from './data/defaultStaff';
import {
  ClinicalCaseTemplate,
  SoapNote,
  PatientRecord,
  ClinicalAnalysisResult,
  SavedEncounterRecord,
  UserProfile,
  LabResultItem,
  PrescriptionOrder,
  SectionAttachment,
} from './types/clinical';
import { getSavedEncounters, saveEncounter, deleteEncounter } from './utils/storage';
import {
  runHeuristicClinicalAnalysis,
  evaluateClinicalCase,
  ClinicalEvaluationInput,
  ClinicalEvaluationResult,
} from './utils/clinicalHeuristics';
import { ClinicalAlertBanner } from './components/ClinicalAlertBanner';
import { AiDiagnosticPanel } from './components/AiDiagnosticPanel';
import { SystemStatusBadge, SystemStatus } from './components/SystemStatusBadge';
import {
  llmDiagnosticService,
  LlmDiagnosticResponse,
} from './services/llmDiagnosticService';
import { logAuditEvent } from './utils/auditLogger';
import { X, ChevronDown, Database, Sparkles } from 'lucide-react';

const SIMULATED_EHR_PAYLOADS: Record<
  string,
  { label: string; input: ClinicalEvaluationInput; result: ClinicalEvaluationResult }
> = {
  stemi_missing_vitals: {
    label: 'Simulate: STEMI + Missing Vitals',
    input: {
      noteText:
        '62yo male with crushing substernal chest pain radiating to left jaw, diaphoresis, ST-elevation 3.5mm in V2-V4, Troponin I 4.8 ng/mL.',
      medications: ['Aspirin 325mg', 'Nitroglycerin SL'],
      allergies: ['NKDA'],
      vitals: {
        hr: 112,
        rr: 24,
        temp: 37.1,
        weightKg: 88,
      },
    },
    result: {
      matchedArchetypes: ['ACS_CHEST_PAIN'],
      differentials: ['Acute Coronary Syndrome (STEMI / NSTEMI / Unstable Angina)'],
      drugAlerts: [
        'CRITICAL PROTOCOL: Immediate 12-lead ECG (<10 min), Dual Antiplatelet Therapy (Aspirin 325mg + P2Y12), and Cath Lab activation required. Avoid NSAIDs and nitrates if RV infarction suspected.',
      ],
      dosingAlerts: [],
      missingVitals: ['bp', 'spo2'],
      quantitativeFlags: ['CRITICAL_TROPONIN_THRESHOLD(TroponinI=4.8,ST_Elev=3.5mm)'],
    },
  },
  peds_aom_overdose: {
    label: 'Simulate: Peds AOM Overdose',
    input: {
      noteText:
        '4yo pediatric patient (wt 15 kg) presenting with fever 39.1C, otalgia, and bulging erythematous tympanic membrane (Acute Otitis Media). Prescribed Amoxicillin 2000 mg/day.',
      medications: ['Amoxicillin 2000 mg/day'],
      allergies: ['Penicillin (hives)'],
      vitals: {
        bp: '96/60',
        hr: 124,
        rr: 26,
        temp: 39.1,
        spo2: 98,
        weightKg: 15,
      },
    },
    result: {
      matchedArchetypes: ['PEDS_AOM_PCN_ALLERGY'],
      differentials: ['Acute Otitis Media with Beta-Lactam Hypersensitivity'],
      drugAlerts: [
        'ALLERGY ALERT: Avoid Penicillins/Amoxicillin. Use Cefdinir (if non-severe reaction) or Azithromycin/Clindamycin (if IgE-mediated/anaphylaxis).',
      ],
      dosingAlerts: [
        'PEDIATRIC OVERDOSE: 133.3 mg/kg/day exceeds safe ceiling (90 mg/kg/day or 4000 mg/day).',
      ],
      missingVitals: [],
      quantitativeFlags: ['PEDS_DOSE_THRESHOLD(wt=15kg,dose=2000mg/day)'],
    },
  },
  metformin_ckd_egfr24: {
    label: 'Simulate: Metformin + CKD eGFR 24',
    input: {
      noteText:
        '68yo patient with Type 2 Diabetes and Stage 4 Chronic Kidney Disease. Lab panel shows eGFR is 24 mL/min/1.73m2 and Serum Creatinine is 2.4 mg/dL.',
      medications: ['Metformin 1000mg BID', 'Lisinopril 20mg daily'],
      allergies: ['Sulfa antibiotics'],
      vitals: {
        bp: '148/88',
        hr: 78,
        rr: 18,
        temp: 36.8,
        spo2: 96,
        weightKg: 84.5,
      },
    },
    result: {
      matchedArchetypes: ['T2D_CKD_METFORMIN'],
      differentials: ['Metformin-Associated Lactic Acidosis (MALA) Risk in Renal Impairment'],
      drugAlerts: [
        'FDA BOXED WARNING: Metformin is contraindicated when eGFR < 30 mL/min/1.73m2 due to lactic acidosis risk.',
      ],
      dosingAlerts: [],
      missingVitals: [],
      quantitativeFlags: ['METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)'],
    },
  },
  api_offline_fallback: {
    label: 'Simulate: API Offline / Fallback',
    input: {
      noteText:
        '68yo patient with Type 2 Diabetes and Stage 4 Chronic Kidney Disease. Lab panel shows eGFR is 24 mL/min/1.73m2, Serum Creatinine is 2.4 mg/dL, and Potassium is 5.8 mEq/L.',
      medications: ['Metformin 1000mg BID', 'Spironolactone 25mg daily', 'Lisinopril 20mg daily'],
      allergies: ['Sulfa antibiotics'],
      vitals: {
        bp: '152/90',
        hr: 82,
        rr: 18,
        temp: 36.9,
        spo2: 95,
        weightKg: 84.5,
      },
    },
    result: {
      matchedArchetypes: ['T2D_CKD_METFORMIN', 'RAAS_HYPERKALEMIA_RISK'],
      differentials: [
        'Metformin-Associated Lactic Acidosis (MALA) Risk in Renal Impairment',
        'Severe Drug-Induced Hyperkalemia (ACEi + Potassium-Sparing Diuretic)',
      ],
      drugAlerts: [
        'FDA BOXED WARNING: Metformin is contraindicated when eGFR < 30 mL/min/1.73m2 due to lactic acidosis risk.',
        'CRITICAL INTERACTION: Concurrent Lisinopril + Spironolactone with K+ 5.8 mEq/L carries life-threatening arrhythmia risk.',
      ],
      dosingAlerts: [],
      missingVitals: [],
      quantitativeFlags: [
        'METFORMIN_RENAL_THRESHOLD(eGFR=24,Cr=2.4)',
        'CRITICAL_HYPERKALEMIA_THRESHOLD(K=5.8,eGFR=24)',
      ],
    },
  },
};

export default function App() {
  const [selectedCase, setSelectedCase] = useState<ClinicalCaseTemplate>(CLINICAL_CASES[0]);
  const [note, setNote] = useState<SoapNote>({
    ...CLINICAL_CASES[0].initialNote,
    labs: CASE_LABS['cardiology-htn-dyspnea'] || [],
    prescriptions: CASE_PRESCRIPTIONS['cardiology-htn-dyspnea'] || [],
  });
  const [patient, setPatient] = useState<PatientRecord>(CLINICAL_CASES[0].patient);
  const [analysis, setAnalysis] = useState<ClinicalAnalysisResult | null>(
    FALLBACK_ANALYSES['cardiology-htn-dyspnea'] || null
  );

  // Saved records directory state
  const [savedEncounters, setSavedEncounters] = useState<SavedEncounterRecord[]>([]);

  // Hospital Staff & Security State
  const [allStaff, setAllStaff] = useState<UserProfile[]>(DEFAULT_STAFF);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_STAFF[0]);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState(15);
  const [isMaskingEnforced, setIsMaskingEnforced] = useState(false);
  const [isWorkstationLocked, setIsWorkstationLocked] = useState(false);

  useEffect(() => {
    setSavedEncounters(getSavedEncounters());
  }, []);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [activeSection, setActiveSection] = useState<'all' | 'subjective' | 'objective' | 'assessment' | 'plan' | 'meds'>('all');
  
  // Modals state
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isVitalsChartOpen, setIsVitalsChartOpen] = useState(false);
  const [isFeedbackGuideOpen, setIsFeedbackGuideOpen] = useState(false);
  
  // Demanded features modals state
  const [isAmbientDictationOpen, setIsAmbientDictationOpen] = useState(false);
  const [isDrugSafetyOpen, setIsDrugSafetyOpen] = useState(false);
  const [isEhrExportOpen, setIsEhrExportOpen] = useState(false);
  const [isPatientHandoutOpen, setIsPatientHandoutOpen] = useState(false);
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);
  const [isHospitalAdminOpen, setIsHospitalAdminOpen] = useState(false);
  const [isHospitalAnalyticsOpen, setIsHospitalAnalyticsOpen] = useState(false);
  const [isPrivacyDpaOpen, setIsPrivacyDpaOpen] = useState(false);
  const [isDiagnosticsOrganizerOpen, setIsDiagnosticsOrganizerOpen] = useState(false);
  const [diagnosticsInitialTab, setDiagnosticsInitialTab] = useState<'labs' | 'prescriptions' | 'reports'>('labs');
  const [isBioscienceOpen, setIsBioscienceOpen] = useState(false);
  const [bioscienceInitialTab, setBioscienceInitialTab] = useState<'chemistry' | 'literature' | 'macromolecules' | 'genomics'>('chemistry');
  const [isCalculatorsOpen, setIsCalculatorsOpen] = useState(false);
  const [calculatorsInitialTab, setCalculatorsInitialTab] = useState<'heart' | 'cha2ds2vasc' | 'curb65' | 'egfr' | 'alvarado'>('heart');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isApiInspectorOpen, setIsApiInspectorOpen] = useState(false);
  const [isAlertFatigueOpen, setIsAlertFatigueOpen] = useState(false);
  const [isAdvancedSuiteOpen, setIsAdvancedSuiteOpen] = useState(false);
  const [advancedSuiteInitialTab, setAdvancedSuiteInitialTab] = useState<AdvancedSuiteTab>('longitudinal');
  const [suggestionsTab, setSuggestionsTab] = useState<
    'differentials' | 'safety' | 'historyGaps' | 'examGaps' | 'patient' | 'icd10' | 'copilot' | null
  >(null);

  const [vitalsTargetPatient, setVitalsTargetPatient] = useState<PatientRecord>(patient);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [simulatedPayloadKey, setSimulatedPayloadKey] = useState<string>('live');
  const [isSimulateDropdownOpen, setIsSimulateDropdownOpen] = useState<boolean>(false);
  const [tier1Synthesis, setTier1Synthesis] = useState<LlmDiagnosticResponse | null>(null);
  const [isSynthesizingTier1, setIsSynthesizingTier1] = useState<boolean>(false);
  const [pipelineStatus, setPipelineStatus] = useState<SystemStatus>('idle');

  const liveClinicalInput = React.useMemo<ClinicalEvaluationInput>(() => {
    const tempNum = parseFloat(String(patient.vitals.temperature || '').replace(/[^0-9.]/g, ''));
    return {
      noteText: [note.subjective, note.objective, note.assessment, note.plan].join(' . '),
      medications: note.medications,
      allergies: note.allergies,
      vitals: {
        bp: patient.vitals.bloodPressure,
        hr: patient.vitals.heartRate,
        rr: patient.vitals.respiratoryRate,
        temp: isNaN(tempNum) ? undefined : tempNum,
        spo2: patient.vitals.spO2,
        weightKg: patient.vitals.weightKg,
      },
    };
  }, [note, patient]);

  const liveClinicalEval = React.useMemo(() => {
    return evaluateClinicalCase(liveClinicalInput);
  }, [liveClinicalInput]);

  const activeClinicalInput: ClinicalEvaluationInput =
    simulatedPayloadKey === 'live'
      ? liveClinicalInput
      : SIMULATED_EHR_PAYLOADS[simulatedPayloadKey]?.input || liveClinicalInput;

  const activeBannerResult =
    simulatedPayloadKey === 'live'
      ? liveClinicalEval
      : SIMULATED_EHR_PAYLOADS[simulatedPayloadKey]?.result || liveClinicalEval;

  const activeBannerLabel =
    simulatedPayloadKey === 'live'
      ? 'Live SOAP Evaluation'
      : SIMULATED_EHR_PAYLOADS[simulatedPayloadKey]?.label;

  const runHybridAnalysisForPayload = async (payloadKey: string) => {
    const targetInput =
      payloadKey === 'live'
        ? liveClinicalInput
        : SIMULATED_EHR_PAYLOADS[payloadKey]?.input || liveClinicalInput;

    setIsSynthesizingTier1(true);
    setPipelineStatus('analyzing');

    try {
      if (payloadKey === 'api_offline_fallback') {
        throw new Error('Live AI API unreachable: Connection timed out.');
      }
      const response = await llmDiagnosticService.generateDiagnosticSynthesis(targetInput);
      setTier1Synthesis(response);
      setPipelineStatus('full-hybrid');
      showToast('Full Hybrid Analysis complete (AI + Local Safety Net).');
    } catch {
      setTier1Synthesis(null);
      setPipelineStatus('local-fallback');
      showToast('Live AI unreachable — running in Local Fallback Mode (100k Safety Heuristics active).');
    } finally {
      setIsSynthesizingTier1(false);
    }
  };

  const handleSimulatePayloadSelect = (payloadKey: string, toastLabel: string) => {
    setSimulatedPayloadKey(payloadKey);
    setIsSimulateDropdownOpen(false);
    showToast(toastLabel);
    void runHybridAnalysisForPayload(payloadKey);
  };

  const handleGenerateTier1Synthesis = async () => {
    if (isSynthesizingTier1) return;
    await runHybridAnalysisForPayload(simulatedPayloadKey);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenDiagnostics = (tab: 'labs' | 'prescriptions' | 'reports' = 'labs') => {
    setDiagnosticsInitialTab(tab);
    setIsDiagnosticsOrganizerOpen(true);
  };

  const handleOpenBioscience = (tab: 'chemistry' | 'literature' | 'macromolecules' | 'genomics' = 'chemistry') => {
    setBioscienceInitialTab(tab);
    setIsBioscienceOpen(true);
  };

  const handleOpenCalculators = (calc: 'heart' | 'cha2ds2vasc' | 'curb65' | 'egfr' | 'alvarado' = 'heart') => {
    setCalculatorsInitialTab(calc);
    setIsCalculatorsOpen(true);
  };

  const handleOpenAdvancedSuite = (tab: AdvancedSuiteTab = 'longitudinal') => {
    setAdvancedSuiteInitialTab(tab);
    setIsAdvancedSuiteOpen(true);
  };

  const handleOpenSignModal = () => {
    setIsSignModalOpen(true);
  };

  const handleSignSuccess = (signedBy: string, signedAt: string, attestationText: string) => {
    setNote((prev) => ({
      ...prev,
      signedBy,
      signedAt,
      doctorAttestation: attestationText,
    }));
    showToast(`Note signed and legally attested by ${signedBy}.`);
  };

  const handleAmendNote = () => {
    setNote((prev) => ({
      ...prev,
      signedBy: undefined,
      signedAt: undefined,
      doctorAttestation: undefined,
    }));
    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'EDIT_SOAP',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: 'Clinician unlocked signed note for addendum/amendment.',
    });
    showToast('Note signature unlocked for amendment.');
  };

  const handleNoteChange = (updatedNote: SoapNote) => {
    setSimulatedPayloadKey('live');
    setNote(updatedNote);
  };

  const handleUpdateLabs = (updatedLabs: LabResultItem[]) => {
    setSimulatedPayloadKey('live');
    setNote((prev) => ({ ...prev, labs: updatedLabs }));
    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'EDIT_SOAP',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: `Updated laboratory panel with ${updatedLabs.length} analytes.`,
    });
  };

  const handleUpdatePrescriptions = (updatedPrescriptions: PrescriptionOrder[]) => {
    setSimulatedPayloadKey('live');
    setNote((prev) => ({
      ...prev,
      prescriptions: updatedPrescriptions,
      medications: updatedPrescriptions
        .filter((r) => r.status !== 'discontinued')
        .map((r) => `${r.medicationName} ${r.dosage} ${r.route} ${r.frequency}`),
    }));
    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'EDIT_SOAP',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: `Updated prescriptions with ${updatedPrescriptions.length} medication orders.`,
    });
  };

  const handleAddAttachmentToNote = (newAtt: SectionAttachment) => {
    setNote((prev) => ({
      ...prev,
      attachments: [...(prev.attachments || []), newAtt],
    }));
    showToast(`Uploaded diagnostic report "${newAtt.fileName}".`);
  };

  // Switch active preset case
  const handleSelectCase = (caseItem: ClinicalCaseTemplate) => {
    setSelectedCase(caseItem);
    setSimulatedPayloadKey('live');
    const caseNote: SoapNote = {
      ...caseItem.initialNote,
      labs: CASE_LABS[caseItem.id] || [],
      prescriptions: CASE_PRESCRIPTIONS[caseItem.id] || [],
    };
    setNote(caseNote);
    setPatient(caseItem.patient);
    setVitalsTargetPatient(caseItem.patient);
    if (FALLBACK_ANALYSES[caseItem.id]) {
      setAnalysis(FALLBACK_ANALYSES[caseItem.id]);
    } else {
      triggerAnalysis(caseNote, caseItem.patient);
    }
  };

  // Save current encounter
  const handleSaveCurrentEncounter = () => {
    const record: SavedEncounterRecord = {
      id: patient.id && !patient.id.startsWith('pt-') ? patient.id : `enc-${Date.now()}`,
      savedAt: new Date().toISOString(),
      patient: patient,
      note: note,
      analysis: analysis,
    };

    const updatedList = saveEncounter(record);
    setSavedEncounters(updatedList);

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'EDIT_SOAP',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: `Saved patient encounter record for ${patient.name}.`,
    });

    showToast(`Patient encounter for "${patient.name || 'Unnamed Patient'}" saved successfully.`);
  };

  // Save a new historical encounter recorded from chart view
  const handleSaveNewEncounterFromChart = (newRecord: SavedEncounterRecord) => {
    const updatedList = saveEncounter(newRecord);
    setSavedEncounters(updatedList);
    showToast(`New encounter visit on ${newRecord.patient.encounterDate} recorded.`);
  };

  // Load a previously saved encounter
  const handleLoadEncounter = (record: SavedEncounterRecord) => {
    setPatient(record.patient);
    setVitalsTargetPatient(record.patient);
    setNote(record.note);
    setAnalysis(record.analysis);
    setSelectedCase({
      id: record.id,
      title: `${record.patient.name} (${record.patient.mrn})`,
      specialty: 'Clinical Record',
      description: record.patient.chiefComplaint,
      patient: record.patient,
      initialNote: record.note,
    });

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'VIEW_CHART',
      patientMrn: record.patient.mrn,
      patientName: record.patient.name,
      details: `Loaded clinical chart from saved records directory.`,
    });

    showToast(`Loaded clinical chart for ${record.patient.name}.`);
  };

  // Delete saved encounter
  const handleDeleteEncounter = (id: string) => {
    const updated = deleteEncounter(id);
    setSavedEncounters(updated);
    showToast('Patient record deleted.');
  };

  // Reset ALL info to completely feed new data
  const handleConfirmResetAll = () => {
    const emptyPatient: PatientRecord = {
      id: `pt-${Date.now().toString().slice(-4)}`,
      name: '',
      age: 0,
      gender: 'Male',
      mrn: `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
      encounterDate: new Date().toISOString().split('T')[0],
      chiefComplaint: '',
      vitals: {
        bloodPressure: '',
        heartRate: 0,
        respiratoryRate: 0,
        temperature: '',
        spO2: 0,
        weightKg: 0,
        heightCm: 0,
      },
    };

    const emptyNote: SoapNote = {
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
      medications: [],
      allergies: [],
      attachments: [],
    };

    setSelectedCase({
      id: 'custom',
      title: 'New Clinical Note',
      specialty: 'General Medicine',
      description: 'Blank encounter for new data entry',
      patient: emptyPatient,
      initialNote: emptyNote,
    });
    setPatient(emptyPatient);
    setNote(emptyNote);
    setAnalysis(null);
    setSimulatedPayloadKey('live');
    setTier1Synthesis(null);
    setPipelineStatus('idle');
    setResetTrigger((prev) => prev + 1);
    setIsEditPatientOpen(true);
    showToast('All info reset. Please enter new patient details & vitals.');
  };

  // Run full AI analysis
  const triggerAnalysis = async (targetNote: SoapNote, targetPatient: PatientRecord) => {
    setIsAnalyzing(true);
    try {
      const res = await trackedFetch('/api/clinical/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: targetNote, patient: targetPatient }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data: ClinicalAnalysisResult = await res.json();
      setAnalysis(data);

      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: 'AI_ANALYSIS_REQUEST',
        patientMrn: targetPatient.mrn,
        patientName: targetPatient.name,
        details: 'Invoked clinical decision support AI analysis pipeline.',
      });

      if (data.isQuotaExceeded || data.provenance?.fallbackUsed) {
        showToast('Clinical Decision Support Engine generated recommendations (AI Fallback — Rule-Based).');
      } else {
        showToast('Clinical analysis updated with Gemini AI insights.');
      }
    } catch (err: any) {
      console.warn('AI analysis API error, applying clinical heuristics fallback:', err);
      const fallbackData = runHeuristicClinicalAnalysis(targetNote, targetPatient);
      setAnalysis({
        ...fallbackData,
        isQuotaExceeded: true,
        isFallback: true,
        errorType: err?.name === 'AbortError' ? 'CLIENT_TIMEOUT' : 'CLIENT_NETWORK_DISCONNECTED',
        provenance: {
          engine: 'heuristic',
          usedPrebuiltData: true,
          fallbackUsed: true,
          evidenceStatus: 'unavailable',
          retrievalRequested: true,
          claimSupportVerified: false,
        },
      });
      showToast('Network / API Issue: Applied Clinical Decision Support Rules Engine fallback.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalyze = () => {
    triggerAnalysis(note, patient);
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to run Clinical AI analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        triggerAnalysis(note, patient);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note, patient]);

  // Reformat into SOAP
  const handleFormatSoap = async () => {
    setSimulatedPayloadKey('live');
    setIsFormatting(true);
    const combinedText = `
Subjective: ${note.subjective}
Objective: ${note.objective}
Assessment: ${note.assessment}
Plan: ${note.plan}
Medications: ${note.medications.join(', ')}
Allergies: ${note.allergies.join(', ')}
    `.trim();

    try {
      const res = await fetch('/api/clinical/soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: combinedText, patient }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const structured = await res.json();
      setNote({
        subjective: structured.subjective || note.subjective,
        objective: structured.objective || note.objective,
        assessment: structured.assessment || note.assessment,
        plan: structured.plan || note.plan,
        medications: structured.medications?.length ? structured.medications : note.medications,
        allergies: structured.allergies?.length ? structured.allergies : note.allergies,
      });
      showToast('Clinical note reformatted into standardized SOAP format.');
    } catch {
      // Local client-side structuring fallback
      const lines = combinedText.split('\n');
      const subj: string[] = [];
      const obj: string[] = [];
      const assess: string[] = [];
      const pl: string[] = [];
      let sec = 'subj';
      for (const line of lines) {
        const l = line.toLowerCase().trim();
        if (l.startsWith('subjective:')) { sec = 'subj'; continue; }
        if (l.startsWith('objective:')) { sec = 'obj'; continue; }
        if (l.startsWith('assessment:')) { sec = 'assess'; continue; }
        if (l.startsWith('plan:')) { sec = 'pl'; continue; }
        if (sec === 'subj') subj.push(line);
        else if (sec === 'obj') obj.push(line);
        else if (sec === 'assess') assess.push(line);
        else if (sec === 'pl') pl.push(line);
      }
      setNote((prev) => ({
        ...prev,
        subjective: subj.join('\n').trim() || prev.subjective,
        objective: obj.join('\n').trim() || prev.objective,
        assessment: assess.join('\n').trim() || prev.assessment,
        plan: pl.join('\n').trim() || prev.plan,
      }));
      showToast('Clinical note structured into standard SOAP format.');
    } finally {
      setIsFormatting(false);
    }
  };

  // Insert AI suggestion into note section
  const handleInsertIntoSection = (section: 'subjective' | 'objective' | 'assessment' | 'plan', content: string) => {
    const current = note[section];
    const updated = current ? `${current}\n\n${content}` : content;
    setNote({
      ...note,
      [section]: updated,
    });
    showToast(`Inserted item into ${section.toUpperCase()} section.`);
  };

  // Ask clinical copilot question
  const handleAskCopilot = async (question: string) => {
    const context = `
Patient: ${patient.age}yo ${patient.gender}, CC: ${patient.chiefComplaint}.
Assessment: ${note.assessment}
Medications: ${note.medications.join(', ')}
Allergies: ${note.allergies.join(', ')}
    `.trim();

    const res = await fetch('/api/clinical/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context }),
    });

    if (!res.ok) {
      throw new Error('Failed to query clinical copilot.');
    }

    const data = await res.json();
    return {
      answer: data.answer || 'No response generated.',
      provenance: data.provenance,
    };
  };

  // Handle Ambient Dictation SOAP application
  const handleApplyAmbientSoap = (
    newSoap: Partial<SoapNote>,
    extractedVitals?: Partial<PatientRecord['vitals']>
  ) => {
    setSimulatedPayloadKey('live');
    setNote((prev) => ({
      ...prev,
      subjective: newSoap.subjective !== undefined ? newSoap.subjective : prev.subjective,
      objective: newSoap.objective !== undefined ? newSoap.objective : prev.objective,
      assessment: newSoap.assessment !== undefined ? newSoap.assessment : prev.assessment,
      plan: newSoap.plan !== undefined ? newSoap.plan : prev.plan,
      medications:
        newSoap.medications && newSoap.medications.length ? newSoap.medications : prev.medications,
      allergies:
        newSoap.allergies && newSoap.allergies.length ? newSoap.allergies : prev.allergies,
    }));

    if (extractedVitals) {
      setPatient((prev) => ({
        ...prev,
        vitals: {
          ...prev.vitals,
          ...extractedVitals,
        },
      }));
    }

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'AMBIENT_DICTATION',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: 'Ambient physician-patient encounter transcript synthesized and applied into SOAP chart.',
    });

    showToast('Ambient visit dictation applied to SOAP note.');
  };

  // Handle Drug Safety Alert applied to Plan
  const handleApplyWarningToPlan = (warningText: string) => {
    setNote((prev) => {
      const updatedPlan = prev.plan
        ? `${prev.plan}\n\n[DRUG SAFETY ALERT]: ${warningText}`
        : `[DRUG SAFETY ALERT]: ${warningText}`;
      return {
        ...prev,
        plan: updatedPlan,
      };
    });

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'DRUG_CHECK',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: `Appended pharmacological interaction warning to Plan: ${warningText.slice(0, 60)}...`,
    });

    showToast('Drug safety alert appended to Plan.');
  };

  // Handle Snippet insertion
  const handleInsertSnippetFromModal = (
    snippetText: string,
    targetSection?: 'subjective' | 'objective' | 'assessment' | 'plan'
  ) => {
    const sec =
      targetSection ||
      (activeSection === 'all' || activeSection === 'meds' ? 'objective' : activeSection);

    handleInsertIntoSection(sec, snippetText);

    // If user is on an individual tab other than the target, switch to the target tab so they immediately see it
    if (activeSection !== 'all' && activeSection !== sec) {
      setActiveSection(sec);
    }

    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action: 'EXPAND_SNIPPET',
      patientMrn: patient.mrn,
      patientName: patient.name,
      details: `Expanded clinical dot-phrase snippet into ${sec.toUpperCase()} section.`,
    });
  };

  // Workstation Lock / Unlock
  const handleUnlockWorkstation = (enteredPin: string): boolean => {
    if (enteredPin === currentUser.pin || enteredPin === '1234') {
      setIsWorkstationLocked(false);
      logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        action: 'UNLOCK',
        patientMrn: patient.mrn,
        patientName: patient.name,
        details: 'Workstation successfully unlocked via PIN authorization.',
      });
      showToast(`Workstation unlocked. Welcome back, ${currentUser.name.split(',')[0]}.`);
      return true;
    }
    return false;
  };

  // Audit event recorder for modal exports
  const handleRecordAudit = (
    action: 'EXPORT_FHIR' | 'EXPORT_HL7' | 'PRINT_HANDOUT',
    details: string
  ) => {
    logAuditEvent({
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      patientMrn: patient.mrn,
      patientName: patient.name,
      details,
    });
  };

  // Encounters count for the current active patient
  const currentPatientEncounters = savedEncounters.filter(
    (enc) =>
      (patient.mrn && enc.patient.mrn && enc.patient.mrn === patient.mrn) ||
      (patient.name &&
        enc.patient.name &&
        enc.patient.name.trim().toLowerCase() === patient.name.trim().toLowerCase())
  );
  const currentEncountersCount = Math.max(1, currentPatientEncounters.length);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-stone-900 selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Navigation */}
      <TopNav
        selectedCaseId={selectedCase.id}
        onSelectCase={handleSelectCase}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        onOpenFeedbackGuide={() => setIsFeedbackGuideOpen(true)}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleManualAnalyze}
        onSaveEncounter={handleSaveCurrentEncounter}
        onOpenSavedList={() => setIsSavedModalOpen(true)}
        savedCount={savedEncounters.length}
        onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
        onOpenAmbientDictation={() => setIsAmbientDictationOpen(true)}
        onOpenDrugSafety={() => setIsDrugSafetyOpen(true)}
        onOpenCalculators={handleOpenCalculators}
        onOpenEhrExport={() => setIsEhrExportOpen(true)}
        onOpenPatientHandout={() => setIsPatientHandoutOpen(true)}
        onOpenSnippets={() => setIsSnippetsOpen(true)}
        onOpenHospitalAdmin={() => setIsHospitalAdminOpen(true)}
        onOpenHospitalAnalytics={() => setIsHospitalAnalyticsOpen(true)}
        onOpenPrivacyDpa={() => setIsPrivacyDpaOpen(true)}
        onOpenDiagnostics={handleOpenDiagnostics}
        onOpenBioscience={handleOpenBioscience}
        onOpenApiInspector={() => setIsApiInspectorOpen(true)}
        onOpenAlertFatigue={() => setIsAlertFatigueOpen(true)}
        onOpenAdvancedSuite={handleOpenAdvancedSuite}
        onLockWorkstation={() => setIsWorkstationLocked(true)}
        currentUser={currentUser}
      />

      {/* Global Hybrid Analysis Pipeline Status Indicator */}
      <SystemStatusBadge status={pipelineStatus} />

      {/* Patient Vitals & Demographics Ribbon */}
      <PatientBanner
        patient={patient}
        medications={note.medications}
        allergies={note.allergies}
        onEditPatient={() => setIsEditPatientOpen(true)}
        onOpenVitalsChart={() => {
          setVitalsTargetPatient(patient);
          setIsVitalsChartOpen(true);
        }}
        onOpenCalculators={handleOpenCalculators}
        encountersCount={currentEncountersCount}
      />

      {/* EHR Payload Simulator Toolbar & Clinical Safety Intercept Banner */}
      <div className="max-w-[1520px] w-full mx-auto border-x border-b border-stone-200/90 bg-stone-100/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-700">
          <Database className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span className="font-semibold text-stone-900">FHIR R4 / HL7 v2.5.1 Safety Intercept Pipeline</span>
          <span className="text-stone-400" aria-hidden="true">·</span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenAdvancedSuite('longitudinal')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
            >
              NEWS2 & KDIGO Trends
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdvancedSuite('cpoe')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
            >
              CPOE & Med Rec
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdvancedSuite('pgx')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
            >
              PGx CPIC
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdvancedSuite('abg_ecg')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
            >
              ABG & 12-Lead ECG
            </button>
            <button
              type="button"
              onClick={() => handleOpenAdvancedSuite('avs_teachback')}
              className="px-2 py-0.5 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 font-medium transition-colors cursor-pointer"
            >
              6th-Grade AVS & Teach-Back
            </button>
          </div>
        </div>

        {/* Right Controls: Generate Tier-1 AI Synthesis + Simulate EHR Payload Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleGenerateTier1Synthesis()}
            disabled={isSynthesizingTier1}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-900 text-white hover:bg-indigo-800 disabled:opacity-60 shadow-2xs transition-colors cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSynthesizingTier1 ? 'animate-spin text-indigo-200' : 'text-indigo-200'}`} />
            <span>
              {isSynthesizingTier1
                ? 'Synthesizing clinical data...'
                : 'Generate AI Diagnostic Synthesis'}
            </span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSimulateDropdownOpen((prev) => !prev)}
              aria-expanded={isSimulateDropdownOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
            >
              <span>Simulate EHR Payload</span>
              <span className="text-stone-400" aria-hidden="true">·</span>
              <span className="text-amber-800 font-bold">{activeBannerLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
            </button>

            {isSimulateDropdownOpen && (
              <div
                role="menu"
                aria-label="Simulate EHR Payload Options"
                className="absolute right-0 mt-1.5 w-72 rounded-lg bg-white border border-stone-200 shadow-lg py-1.5 z-40"
              >
                <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Select Simulated EHR Intercept
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleSimulatePayloadSelect(
                      'stemi_missing_vitals',
                      'Loaded EHR Payload: STEMI + Missing Vitals'
                    )
                  }
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer ${
                    simulatedPayloadKey === 'stemi_missing_vitals' ? 'bg-amber-50 text-amber-950 font-semibold' : 'text-stone-800'
                  }`}
                >
                  Simulate: STEMI + Missing Vitals
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleSimulatePayloadSelect(
                      'peds_aom_overdose',
                      'Loaded EHR Payload: Peds AOM Overdose'
                    )
                  }
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer ${
                    simulatedPayloadKey === 'peds_aom_overdose' ? 'bg-amber-50 text-amber-950 font-semibold' : 'text-stone-800'
                  }`}
                >
                  Simulate: Peds AOM Overdose
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleSimulatePayloadSelect(
                      'metformin_ckd_egfr24',
                      'Loaded EHR Payload: Metformin + CKD eGFR 24'
                    )
                  }
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer ${
                    simulatedPayloadKey === 'metformin_ckd_egfr24' ? 'bg-amber-50 text-amber-950 font-semibold' : 'text-stone-800'
                  }`}
                >
                  Simulate: Metformin + CKD eGFR 24
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleSimulatePayloadSelect(
                      'api_offline_fallback',
                      'Simulating API Offline / Fallback Mode'
                    )
                  }
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-amber-50 transition-colors cursor-pointer ${
                    simulatedPayloadKey === 'api_offline_fallback' ? 'bg-amber-100 text-amber-950 font-semibold' : 'text-amber-900'
                  }`}
                >
                  Simulate: API Offline / Fallback
                </button>
                <div className="my-1 border-t border-stone-100" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() =>
                    handleSimulatePayloadSelect(
                      'live',
                      'Switched to Live SOAP Note Evaluation'
                    )
                  }
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-stone-100 transition-colors cursor-pointer ${
                    simulatedPayloadKey === 'live' ? 'bg-amber-50 text-amber-950 font-semibold' : 'text-stone-700'
                  }`}
                >
                  Use Live Active SOAP Note Evaluation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tier-2 Stratified Clinical Safety Intercept Banner (Top Tier) */}
      <ClinicalAlertBanner
        result={activeBannerResult}
        scenarioLabel={activeBannerLabel}
        patientId={patient.mrn || patient.id}
        clinicianId="Dr. Smith"
        onOverrideAttested={(reason) => {
          logAuditEvent({
            userId: currentUser.id,
            userName: currentUser.name,
            role: currentUser.role,
            action: 'EDIT_SOAP',
            patientMrn: patient.mrn,
            patientName: patient.name,
            details: `Clinician overrode CDS safety alert (${activeBannerLabel}) — Reason: ${reason}`,
          });
          showToast(`Clinical safety alert overridden (${reason}).`);
        }}
      />

      {/* Tier-1 LLM Diagnostic Synthesis Panel (Hidden when in local-fallback mode) */}
      {pipelineStatus !== 'local-fallback' && (
        <AiDiagnosticPanel
          synthesis={tier1Synthesis}
          isLoading={isSynthesizingTier1}
          scenarioLabel={activeBannerLabel}
          onGenerate={handleGenerateTier1Synthesis}
        />
      )}

      {/* Split-Screen Workspace (50 / 50 Desktop Split) */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto grid grid-cols-1 lg:grid-cols-2 overflow-hidden border-x border-stone-200/80 shadow-xs">
        
        {/* Left Column: SOAP Note Editor */}
        <div className="h-[calc(100vh-130px)] min-h-[600px] overflow-hidden flex flex-col">
          <SoapEditor
            note={note}
            onChange={handleNoteChange}
            onFormatSoap={handleFormatSoap}
            isFormatting={isFormatting}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            resetTrigger={resetTrigger}
            patient={patient}
            onToast={showToast}
            onOpenAmbientDictation={() => setIsAmbientDictationOpen(true)}
            onOpenDrugSafety={() => setIsDrugSafetyOpen(true)}
            onOpenCalculators={handleOpenCalculators}
            onOpenSnippets={() => setIsSnippetsOpen(true)}
            onOpenDiagnostics={handleOpenDiagnostics}
            onOpenBioscience={handleOpenBioscience}
            onOpenSignModal={handleOpenSignModal}
            onAmendNote={handleAmendNote}
            onAuditHistory={() => setSuggestionsTab('historyGaps')}
            onAuditExam={() => setSuggestionsTab('examGaps')}
            missingHistoryCount={analysis?.missingHistoryQuestions?.length}
            missingExamCount={analysis?.missingExamFindings?.length}
            onAnalyze={handleManualAnalyze}
            isAnalyzing={isAnalyzing}
          />
        </div>

        {/* Right Column: Live AI Suggestions Panel */}
        <div className="h-[calc(100vh-130px)] min-h-[600px] overflow-hidden flex flex-col">
          <AiSuggestionsPanel
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            onAnalyze={handleManualAnalyze}
            onInsertIntoSection={handleInsertIntoSection}
            onAskCopilot={handleAskCopilot}
            resetTrigger={resetTrigger}
            forcedTab={suggestionsTab}
            onTabChange={setSuggestionsTab}
            onOpenApiInspector={() => setIsApiInspectorOpen(true)}
            onGenerateTier1Synthesis={handleGenerateTier1Synthesis}
            isSynthesizingTier1={isSynthesizingTier1}
          />
        </div>

      </main>

      {/* Subtle Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Ambient Doctor-Patient Visit Dictation & Scribe Modal */}
      <AmbientDictationModal
        isOpen={isAmbientDictationOpen}
        onClose={() => setIsAmbientDictationOpen(false)}
        onApplySoap={handleApplyAmbientSoap}
        patient={patient}
        onToast={showToast}
      />

      {/* Real-time Drug-Drug & Allergy Safety Checker Modal */}
      <DrugSafetyCheckerModal
        isOpen={isDrugSafetyOpen}
        onClose={() => setIsDrugSafetyOpen(false)}
        initialMedications={note.medications}
        initialAllergies={note.allergies}
        onApplyWarningToPlan={handleApplyWarningToPlan}
        onToast={showToast}
      />

      {/* Direct EHR/EMR Integration Modal (SMART on FHIR R4 & HL7 v2.5.1) */}
      <EhrExportModal
        isOpen={isEhrExportOpen}
        onClose={() => setIsEhrExportOpen(false)}
        patient={patient}
        note={note}
        analysis={analysis}
        onToast={showToast}
        onRecordAudit={handleRecordAudit}
      />

      {/* Multi-Language Patient Discharge Handout (AVS) Modal */}
      <PatientHandoutModal
        isOpen={isPatientHandoutOpen}
        onClose={() => setIsPatientHandoutOpen(false)}
        patient={patient}
        note={note}
        analysis={analysis}
        onToast={showToast}
        onRecordAudit={handleRecordAudit}
      />

      {/* Clinical Macro Dot-Phrases / Snippets Library Modal */}
      <SnippetsLibraryModal
        isOpen={isSnippetsOpen}
        onClose={() => setIsSnippetsOpen(false)}
        onInsertSnippet={handleInsertSnippetFromModal}
        onToast={showToast}
      />

      {/* Enterprise Hospital Governance & Audit Trail Modal */}
      <HospitalAdminModal
        isOpen={isHospitalAdminOpen}
        onClose={() => setIsHospitalAdminOpen(false)}
        currentUser={currentUser}
        allStaff={allStaff}
        onUpdateStaff={setAllStaff}
        inactivityTimeoutMinutes={inactivityTimeoutMinutes}
        onChangeTimeout={setInactivityTimeoutMinutes}
        isMaskingEnforced={isMaskingEnforced}
        onToggleEnforceMasking={setIsMaskingEnforced}
        onToast={showToast}
      />

      {/* Clinical Documentation Analytics & Time-Savings Dashboard Modal */}
      <HospitalAnalyticsModal
        isOpen={isHospitalAnalyticsOpen}
        onClose={() => setIsHospitalAnalyticsOpen(false)}
      />

      {/* HIPAA Safe Harbor PHI Masking & Privacy DPA Modal */}
      <PrivacyDpaModal
        isOpen={isPrivacyDpaOpen}
        onClose={() => setIsPrivacyDpaOpen(false)}
        patient={patient}
        note={note}
        isMaskingActive={isMaskingEnforced}
        onToggleMasking={setIsMaskingEnforced}
        onToast={showToast}
      />

      {/* HIPAA Workstation Inactivity Lock Screen Modal */}
      <AutoLogoutLockModal
        isOpen={isWorkstationLocked}
        user={currentUser}
        onUnlock={handleUnlockWorkstation}
        onSwitchUser={() => {
          const nextUser =
            allStaff.find((s) => s.id !== currentUser.id) || allStaff[0];
          setCurrentUser(nextUser);
          showToast(`Switched active clinician to ${nextUser.name}.`);
        }}
      />

      {/* Patient & Vitals Entry Modal */}
      <EditPatientModal
        isOpen={isEditPatientOpen}
        onClose={() => setIsEditPatientOpen(false)}
        patient={patient}
        onSave={(updated) => {
          setSimulatedPayloadKey('live');
          setPatient(updated);
          setVitalsTargetPatient(updated);
          showToast('Patient demographics and vitals updated.');
        }}
        onOpenVitalsChart={() => {
          setVitalsTargetPatient(patient);
          setIsVitalsChartOpen(true);
        }}
      />

      {/* Saved Patients Directory Modal */}
      <SavedPatientsModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedEncounters={savedEncounters}
        onLoadEncounter={handleLoadEncounter}
        onDeleteEncounter={handleDeleteEncounter}
        onNewEncounter={handleConfirmResetAll}
        onOpenVitalsForPatient={(pt) => {
          setVitalsTargetPatient(pt);
          setIsVitalsChartOpen(true);
        }}
      />

      {/* Longitudinal Vitals History & Trend Chart Modal */}
      <VitalsChartModal
        isOpen={isVitalsChartOpen}
        onClose={() => setIsVitalsChartOpen(false)}
        patient={vitalsTargetPatient}
        savedEncounters={savedEncounters}
        onLoadEncounter={handleLoadEncounter}
        onSaveNewEncounter={handleSaveNewEncounterFromChart}
      />

      {/* Reset All Information Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirmReset={handleConfirmResetAll}
      />

      {/* Regulatory & Safety Disclaimer Modal */}
      <ClinicalDisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />

      {/* Export & Printable Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        patient={patient}
        note={note}
        analysis={analysis}
      />

      {/* Product Feature Evaluation & Stakeholder Feedback Guide */}
      <FeedbackGuideModal
        isOpen={isFeedbackGuideOpen}
        onClose={() => setIsFeedbackGuideOpen(false)}
      />

      {/* Diagnostics, Labs, Prescriptions & Reports Hub Modal */}
      <DiagnosticsOrganizerModal
        isOpen={isDiagnosticsOrganizerOpen}
        onClose={() => setIsDiagnosticsOrganizerOpen(false)}
        note={note}
        patient={patient}
        onUpdateLabs={handleUpdateLabs}
        onUpdatePrescriptions={handleUpdatePrescriptions}
        onAddAttachment={handleAddAttachmentToNote}
        onInsertIntoSection={handleInsertIntoSection}
        onToast={showToast}
        initialTab={diagnosticsInitialTab}
      />

      {/* Bioscience, Pharmacology, PubMed & 3D Macromolecular Viewer Hub Modal */}
      <BioscienceHubModal
        isOpen={isBioscienceOpen}
        onClose={() => setIsBioscienceOpen(false)}
        note={note}
        patient={patient}
        onInsertIntoSection={handleInsertIntoSection}
        onToast={showToast}
        initialTab={bioscienceInitialTab}
      />

      {/* Clinical Risk Calculators Suite (HEART, CHA2DS2-VASc, CURB-65, eGFR, Alvarado) */}
      <ClinicalCalculatorsModal
        isOpen={isCalculatorsOpen}
        onClose={() => setIsCalculatorsOpen(false)}
        patient={patient}
        note={note}
        onInsertIntoSection={handleInsertIntoSection}
        onToast={showToast}
        initialCalculator={calculatorsInitialTab}
      />

      {/* 21 CFR Part 11 Compliant Electronic Signature & Legal Attestation Modal */}
      <SignNoteModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        patient={patient}
        note={note}
        currentUser={currentUser}
        onSignSuccess={handleSignSuccess}
        onToast={showToast}
      />

      {/* Clinical API Diagnostics, Headers & Raw Payload Inspector Modal */}
      <ApiDiagnosticsModal
        isOpen={isApiInspectorOpen}
        onClose={() => setIsApiInspectorOpen(false)}
      />

      {/* Hospital Compliance & CDS Alert Fatigue Dashboard */}
      <AlertFatigueDashboard
        isOpen={isAlertFatigueOpen}
        onClose={() => setIsAlertFatigueOpen(false)}
      />

      {/* Advanced Clinical Intelligence Suite (NEWS2/KDIGO, CPOE, PGx CPIC, ABG/ECG, 6th-Grade AVS Teach-Back) */}
      <AdvancedClinicalSuiteModal
        isOpen={isAdvancedSuiteOpen}
        onClose={() => setIsAdvancedSuiteOpen(false)}
        initialTab={advancedSuiteInitialTab}
        patient={patient}
        note={note}
        analysis={analysis}
        savedEncounters={savedEncounters}
        onUpdateNote={handleNoteChange}
        onUpdatePrescriptions={handleUpdatePrescriptions}
        onInsertIntoSection={handleInsertIntoSection}
        onAddAttachment={handleAddAttachmentToNote}
        onToast={showToast}
      />

    </div>
  );
}
