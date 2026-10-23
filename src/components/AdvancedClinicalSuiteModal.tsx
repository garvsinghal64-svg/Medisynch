import React, { useState, useMemo } from 'react';
import {
  X,
  Activity,
  ClipboardCheck,
  Dna,
  HeartPulse,
  BookOpenCheck,
  Check,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  FileCode2,
  Copy,
  Upload,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  PatientRecord,
  SoapNote,
  ClinicalAnalysisResult,
  SavedEncounterRecord,
  PrescriptionOrder,
  SectionAttachment,
} from '../types/clinical';
import {
  calculateNews2,
  calculateQSofa,
  evaluateKdigoAki,
  computeLabDeltaChecks,
  derivePatientBaselineLabs,
  parseSystolicBp,
} from '../utils/longitudinalAnalyzer';
import {
  CPOE_ORDER_SETS,
  detectMedRecConflicts,
  buildCpoeFhirBundle,
  MedRecSafetyConflict,
} from '../utils/cpoeOrderEngine';
import {
  DEFAULT_PGX_PROFILES,
  PgxGenotypeProfile,
  evaluateCpicPharmacogenomics,
  CpicRecommendation,
} from '../utils/pgxEngine';
import {
  ABG_CLINICAL_PRESETS,
  AbgElectrolyteInput,
  interpretAbgAndElectrolytes,
  EcgParametersInput,
  interpret12LeadEcg,
} from '../utils/acidBaseAndEcgEngine';
import {
  analyzeReadability,
  simplifyToSixthGradeReadingLevel,
  buildVisualMedicationMatrix,
  generateTeachBackQuestions,
} from '../utils/avsTeachBackEngine';
import { trackedFetch } from '../services/apiDiagnosticsService';

export type AdvancedSuiteTab = 'longitudinal' | 'cpoe' | 'pgx' | 'abg_ecg' | 'avs_teachback';

interface AdvancedClinicalSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AdvancedSuiteTab;
  patient: PatientRecord;
  note: SoapNote;
  analysis: ClinicalAnalysisResult | null;
  savedEncounters: SavedEncounterRecord[];
  onUpdateNote: (updatedNote: SoapNote) => void;
  onUpdatePrescriptions: (updatedPrescriptions: PrescriptionOrder[]) => void;
  onInsertIntoSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan', content: string) => void;
  onAddAttachment?: (att: SectionAttachment) => void;
  onToast: (msg: string) => void;
}

export const AdvancedClinicalSuiteModal: React.FC<AdvancedClinicalSuiteModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'longitudinal',
  patient,
  note,
  analysis,
  savedEncounters,
  onUpdateNote,
  onUpdatePrescriptions,
  onInsertIntoSection,
  onAddAttachment,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<AdvancedSuiteTab>(initialTab);

  React.useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // ============================================================================
  // TAB 1: LONGITUDINAL LAB & VITAL TREND ANALYZER STATE
  // ============================================================================
  const [isHypercapnicScale2, setIsHypercapnicScale2] = useState(false);
  const [onSupplementalO2, setOnSupplementalO2] = useState(false);
  const [consciousness, setConsciousness] = useState<'Alert' | 'CVPU'>('Alert');
  const [baselineCrInput, setBaselineCrInput] = useState<string>('0.95');
  const [currentCrInput, setCurrentCrInput] = useState<string>(() => {
    const crLab = (note.labs || []).find((l) => l.testName.toLowerCase().includes('creatinine'));
    if (crLab) {
      const n = crLab.numericValue ?? parseFloat(String(crLab.value).replace(/[^0-9.-]/g, ''));
      if (!isNaN(n) && n > 0) return String(n);
    }
    return '1.45';
  });
  const [onRrt, setOnRrt] = useState(false);

  const parsedTemp = useMemo(() => {
    const raw = parseFloat(String(patient.vitals.temperature || '').replace(/[^0-9.]/g, ''));
    return isNaN(raw) || raw <= 0 ? undefined : raw;
  }, [patient.vitals.temperature]);

  const parsedSbp = useMemo(() => parseSystolicBp(patient.vitals.bloodPressure), [patient.vitals.bloodPressure]);

  const news2Result = useMemo(
    () =>
      calculateNews2({
        respiratoryRate: patient.vitals.respiratoryRate,
        spO2: patient.vitals.spO2,
        isHypercapnicScale2,
        onSupplementalO2,
        systolicBp: parsedSbp,
        heartRate: patient.vitals.heartRate,
        consciousness,
        temperature: parsedTemp,
      }),
    [patient.vitals, isHypercapnicScale2, onSupplementalO2, parsedSbp, consciousness, parsedTemp]
  );

  const qsofaResult = useMemo(
    () =>
      calculateQSofa({
        respiratoryRate: patient.vitals.respiratoryRate,
        systolicBp: parsedSbp,
        alteredMentation: consciousness === 'CVPU',
      }),
    [patient.vitals.respiratoryRate, parsedSbp, consciousness]
  );

  const kdigoResult = useMemo(() => {
    const base = parseFloat(baselineCrInput) || 0.95;
    const curr = parseFloat(currentCrInput) || 1.45;
    return evaluateKdigoAki(base, curr, onRrt);
  }, [baselineCrInput, currentCrInput, onRrt]);

  const deltaChecks = useMemo(() => {
    const prior = derivePatientBaselineLabs(patient, note.labs || [], savedEncounters);
    return computeLabDeltaChecks(prior, note.labs || []);
  }, [patient, note.labs, savedEncounters]);

  // ============================================================================
  // TAB 2: CLOSED-LOOP CPOE ORDER SET & MED REC WORKBENCH STATE
  // ============================================================================
  const [selectedOrderSetId, setSelectedOrderSetId] = useState<string>(CPOE_ORDER_SETS[0].id);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const set of CPOE_ORDER_SETS) {
      for (const ord of set.orders) {
        map[ord.id] = ord.selectedByDefault;
      }
    }
    return map;
  });
  const [showFhirPreview, setShowFhirPreview] = useState(false);
  const [copiedFhir, setCopiedFhir] = useState(false);
  const [resolvedConflictIds, setResolvedConflictIds] = useState<Record<string, boolean>>({});

  const activeOrderSet = useMemo(
    () => CPOE_ORDER_SETS.find((s) => s.id === selectedOrderSetId) || CPOE_ORDER_SETS[0],
    [selectedOrderSetId]
  );

  const medRecConflicts = useMemo(() => detectMedRecConflicts(note, patient), [note, patient]);

  const selectedOrdersForActiveSet = useMemo(
    () => activeOrderSet.orders.filter((o) => selectedOrderIds[o.id]),
    [activeOrderSet, selectedOrderIds]
  );

  const cpoeFhirBundle = useMemo(
    () => buildCpoeFhirBundle(patient, selectedOrdersForActiveSet),
    [patient, selectedOrdersForActiveSet]
  );

  const handleSubstituteConflict = (conflict: MedRecSafetyConflict) => {
    const filteredMeds = (note.medications || []).filter(
      (m) => m.toLowerCase() !== conflict.offendingMedication.toLowerCase()
    );
    const newMedStr = conflict.replacementMedication
      ? `${conflict.replacementMedication.medicationName} ${conflict.replacementMedication.dosage} ${conflict.replacementMedication.route} ${conflict.replacementMedication.frequency}`
      : null;

    const updatedMeds = newMedStr ? [...filteredMeds, newMedStr] : filteredMeds;

    const updatedPrescriptions: PrescriptionOrder[] = (note.prescriptions || []).map((rx) =>
      conflict.offendingMedication.toLowerCase().includes(rx.medicationName.toLowerCase())
        ? { ...rx, status: 'discontinued' }
        : rx
    );

    if (conflict.replacementMedication) {
      updatedPrescriptions.unshift({
        id: `rx-sub-${Date.now()}`,
        medicationName: conflict.replacementMedication.medicationName,
        dosage: conflict.replacementMedication.dosage,
        route: conflict.replacementMedication.route,
        frequency: conflict.replacementMedication.frequency,
        quantity: conflict.replacementMedication.quantity,
        refills: 1,
        indication: conflict.replacementMedication.indication,
        status: 'active',
        prescribedBy: 'Dr. Elena Rossi, MD',
        prescribedAt: new Date().toISOString().split('T')[0],
      });
    }

    const updatedPlan = note.plan
      ? `${note.plan}\n\n${conflict.planDocumentationNote}`
      : conflict.planDocumentationNote;

    onUpdateNote({
      ...note,
      medications: updatedMeds,
      prescriptions: updatedPrescriptions,
      plan: updatedPlan,
    });
    setResolvedConflictIds((prev) => ({ ...prev, [conflict.id]: true }));
    onToast(`Reconciled ${conflict.offendingMedication} and updated SOAP Plan & Active Rx.`);
  };

  const handleSignAndApplyOrderSet = () => {
    if (selectedOrdersForActiveSet.length === 0) {
      onToast('Select at least one order from the set before signing.');
      return;
    }

    const orderLines = selectedOrdersForActiveSet.map(
      (o) => `- [${o.priority}] ${o.title} (${o.loincOrRxNormCode}) — ${o.clinicalRationale}`
    );
    const block = `[CPOE SIGNED ORDER SET — ${activeOrderSet.name}]:\n${orderLines.join('\n')}`;

    const newRxOrders: PrescriptionOrder[] = [];
    const newMedStrings: string[] = [];

    for (const ord of selectedOrdersForActiveSet) {
      if (ord.medicationPayload) {
        const medLine = `${ord.medicationPayload.medicationName} ${ord.medicationPayload.dosage} ${ord.medicationPayload.route} ${ord.medicationPayload.frequency}`;
        if (!note.medications.some((m) => m.toLowerCase().includes(ord.medicationPayload!.medicationName.toLowerCase()))) {
          newMedStrings.push(medLine);
          newRxOrders.push({
            id: `rx-cpoe-${ord.id}-${Date.now()}`,
            medicationName: ord.medicationPayload.medicationName,
            dosage: ord.medicationPayload.dosage,
            route: ord.medicationPayload.route,
            frequency: ord.medicationPayload.frequency,
            quantity: ord.medicationPayload.quantity,
            refills: 0,
            indication: ord.medicationPayload.indication,
            status: 'active',
            prescribedBy: 'Dr. Elena Rossi, MD',
            prescribedAt: new Date().toISOString().split('T')[0],
          });
        }
      }
    }

    onUpdateNote({
      ...note,
      medications: [...note.medications, ...newMedStrings],
      prescriptions: [...newRxOrders, ...(note.prescriptions || [])],
      plan: note.plan ? `${note.plan}\n\n${block}` : block,
    });
    onToast(`Signed ${selectedOrdersForActiveSet.length} CPOE orders into SOAP Plan & eRx queue.`);
  };

  // ============================================================================
  // TAB 3: PHARMACOGENOMIC (PGx) CPIC GUIDELINE ENGINE STATE
  // ============================================================================
  const [selectedPgxPresetKey, setSelectedPgxPresetKey] = useState<string>('cardiovascular_high_risk');
  const [pgxProfile, setPgxProfile] = useState<PgxGenotypeProfile>(
    DEFAULT_PGX_PROFILES.cardiovascular_high_risk.profile
  );

  const cpicRecommendations = useMemo(
    () => evaluateCpicPharmacogenomics(pgxProfile, note.medications),
    [pgxProfile, note.medications]
  );

  const handleApplyPgxRecommendation = (rec: CpicRecommendation) => {
    const consultLine = `[CPIC PHARMACOGENOMICS CONSULT — ${rec.gene} ${rec.diplotype} (${rec.phenotype})]: ${rec.affectedDrug} → ${rec.therapeuticRecommendation} (${rec.guidelineCitation}).`;
    onInsertIntoSection('plan', consultLine);
    if (rec.alternativeMedication) {
      const altString = `${rec.alternativeMedication.name} ${rec.alternativeMedication.dosage}`;
      onToast(`Inserted CPIC ${rec.gene} consult into Plan (Recommended: ${altString}).`);
    } else {
      onToast(`Inserted CPIC ${rec.gene} pharmacogenomic consult into SOAP Plan.`);
    }
  };

  // ============================================================================
  // TAB 4: MULTIMODAL DIAGNOSTIC ARTIFACT, ABG & 12-LEAD ECG INTERPRETER STATE
  // ============================================================================
  const [abgInput, setAbgInput] = useState<AbgElectrolyteInput>(ABG_CLINICAL_PRESETS.mala_dka_hagma.input);
  const [ecgInput, setEcgInput] = useState<EcgParametersInput>({
    heartRate: patient.vitals.heartRate > 0 ? patient.vitals.heartRate : 94,
    rhythm: 'Normal Sinus Rhythm',
    prIntervalMs: 164,
    qrsDurationMs: 92,
    qtIntervalMs: 410,
    stElevationLeads: [],
    tWaveAbnormalities: 'None',
  });
  const [isAnalyzingArtifact, setIsAnalyzingArtifact] = useState(false);
  const [artifactResultText, setArtifactResultText] = useState<string | null>(null);

  const abgResult = useMemo(() => interpretAbgAndElectrolytes(abgInput), [abgInput]);
  const ecgResult = useMemo(() => interpret12LeadEcg(ecgInput), [ecgInput]);

  const handleToggleStLead = (leadGroup: EcgParametersInput['stElevationLeads'][number]) => {
    setEcgInput((prev) => {
      const exists = prev.stElevationLeads.includes(leadGroup);
      return {
        ...prev,
        stElevationLeads: exists
          ? prev.stElevationLeads.filter((l) => l !== leadGroup)
          : [...prev.stElevationLeads, leadGroup],
      };
    });
  };

  const handleUploadDiagnosticArtifact = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzingArtifact(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || '');
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
        try {
          const res = await trackedFetch('/api/clinical/analyze-attachment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              mimeType: file.type || 'image/png',
              section: 'objective',
              base64Data,
              patient,
            }),
          });
          if (res.ok) {
            const parsed = await res.json();
            setArtifactResultText(
              parsed.suggestedSectionText ||
                `${parsed.headline}: ${parsed.summary} (${(parsed.keyFindings || []).join('; ')})`
            );
            if (onAddAttachment) {
              onAddAttachment({
                id: `att-suite-${Date.now()}`,
                section: 'objective',
                fileName: file.name,
                fileType: file.type.startsWith('image/') ? 'image' : 'document',
                mimeType: file.type || 'application/octet-stream',
                dataUrl,
                fileSize: file.size,
                uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                analysis: parsed,
              });
            }
            onToast(`Analyzed diagnostic artifact "${file.name}".`);
          }
        } catch {
          setArtifactResultText(
            `[Diagnostic Artifact Summary — ${file.name}]: Uploaded for objective review. Correlate waveform/laboratory values with ABG & ECG calculator findings.`
          );
        } finally {
          setIsAnalyzingArtifact(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzingArtifact(false);
    }
  };

  // ============================================================================
  // TAB 5: PATIENT-FACING AVS READABILITY & TEACH-BACK GENERATOR STATE
  // ============================================================================
  const [avsDraftText, setAvsDraftText] = useState<string>(() => {
    return (
      analysis?.patientSummary?.plainLanguageOverview ||
      `You were evaluated today for ${patient.chiefComplaint || 'your symptoms'}. Continue taking your prescribed medications for hypertension or dyspnea. Discontinue any contraindicated agents that cause nephrotoxicity or hyperkalemia, and monitor for syncope or diaphoresis.`
    );
  });
  const [checkedTeachBackIds, setCheckedTeachBackIds] = useState<Record<string, boolean>>({
    'tb-meds': true,
    'tb-red-flags': true,
    'tb-followup': false,
  });

  const readabilityMetrics = useMemo(() => analyzeReadability(avsDraftText), [avsDraftText]);
  const visualMedMatrix = useMemo(() => buildVisualMedicationMatrix(note.medications || []), [note.medications]);
  const teachBackQuestions = useMemo(
    () => generateTeachBackQuestions(patient, note, analysis),
    [patient, note, analysis]
  );

  const handleSimplifyTo6thGrade = () => {
    const simplified = simplifyToSixthGradeReadingLevel(avsDraftText);
    setAvsDraftText(simplified);
    onToast('Simplified discharge summary to 6th-grade plain language.');
  };

  const handleDocumentTeachBackInPlan = () => {
    const completed = teachBackQuestions.filter((q) => checkedTeachBackIds[q.id]);
    if (completed.length === 0) {
      onToast('Check at least one Teach-Back domain verified with the patient.');
      return;
    }
    const domains = completed.map((c) => c.domain).join(', ');
    const noteLine = `[AHRQ TEACH-BACK VERIFICATION]: Patient demonstrated closed-loop teach-back comprehension across (${domains}). Discharge instructions provided at ${readabilityMetrics.fleschKincaidGradeLevel} grade reading level.`;
    onInsertIntoSection('plan', noteLine);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Advanced Clinical Intelligence & Decision Suite"
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white rounded-xl max-w-6xl w-full border border-stone-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center justify-between gap-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-amber-300 font-mono">
              <span>CLINICAL DECISION & PRECISION MEDICINE WORKBENCH</span>
              <span aria-hidden="true">·</span>
              <span>{patient.name || 'Active Patient'} ({patient.mrn || 'MRN'})</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
              Advanced Clinical Suite: Longitudinal Trends, CPOE, PGx CPIC, ABG/ECG & Teach-Back AVS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Advanced Clinical Suite"
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Tab Segmented Navigation */}
        <div className="bg-stone-100 border-b border-stone-200 px-6 py-2 flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('longitudinal')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'longitudinal'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>01. Longitudinal (NEWS2 / KDIGO)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cpoe')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'cpoe'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/80'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>02. CPOE & Med Rec</span>
            {medRecConflicts.length > 0 && (
              <span className="font-mono text-[11px] text-amber-400">
                ({medRecConflicts.length})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pgx')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'pgx'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/80'
            }`}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>03. PGx CPIC Genomics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('abg_ecg')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'abg_ecg'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/80'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>04. ABG & 12-Lead ECG</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('avs_teachback')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'avs_teachback'
                ? 'bg-stone-900 text-white shadow-2xs'
                : 'text-stone-700 hover:bg-stone-200/80'
            }`}
          >
            <BookOpenCheck className="w-3.5 h-3.5" />
            <span>05. 6th-Grade AVS & Teach-Back</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F5] space-y-6">
          {/* ====================================================================
              TAB 1: LONGITUDINAL LAB & VITAL TREND ANALYZER
              ==================================================================== */}
          {activeTab === 'longitudinal' && (
            <div className="space-y-6">
              {/* Top Row: NEWS2 & qSOFA */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* NEWS2 Panel */}
                <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3">
                    <div>
                      <div className="text-xs text-stone-500">
                        Royal College of Physicians · Acute Physiological Deterioration Track
                      </div>
                      <h3 className="text-base font-bold text-stone-900 mt-0.5">
                        National Early Warning Score 2 (NEWS2)
                      </h3>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-2xl font-bold text-stone-900">
                        {news2Result.totalScore}{' '}
                        <span className="text-xs font-normal text-stone-500">pts</span>
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          news2Result.riskBand === 'High'
                            ? 'text-red-700'
                            : news2Result.riskBand === 'Medium' || news2Result.riskBand === 'Low-Medium'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        Risk: {news2Result.riskBand}
                      </div>
                    </div>
                  </div>

                  {/* Missing Vitals Safety Notice */}
                  {news2Result.missingParameters.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Undocumented Vitals Detected: </span>
                        {news2Result.missingParameters.join(', ')} marked as{' '}
                        <span className="font-mono font-semibold">MISSING (Not measured)</span>. Missing SpO2 is never assumed normal (98%). Measure immediately to complete physiological scoring.
                      </div>
                    </div>
                  )}

                  {/* Interactive Physiological Modifiers */}
                  <div className="flex flex-wrap items-center gap-4 text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <label className="flex items-center gap-2 font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHypercapnicScale2}
                        onChange={(e) => setIsHypercapnicScale2(e.target.checked)}
                        className="rounded border-stone-300"
                      />
                      <span>SpO2 Scale 2 (Hypercapnic COPD target 88–92%)</span>
                    </label>
                    <label className="flex items-center gap-2 font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onSupplementalO2}
                        onChange={(e) => setOnSupplementalO2(e.target.checked)}
                        className="rounded border-stone-300"
                      />
                      <span>Supplemental O2 (+2 pts)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-600 font-medium">ACVPU:</span>
                      <select
                        aria-label="ACVPU Consciousness Status"
                        value={consciousness}
                        onChange={(e) => setConsciousness(e.target.value as 'Alert' | 'CVPU')}
                        className="bg-white border border-stone-300 rounded px-2 py-1 text-xs font-semibold"
                      >
                        <option value="Alert">Alert (0 pts)</option>
                        <option value="CVPU">New Confusion / V / P / U (+3 pts)</option>
                      </select>
                    </div>
                  </div>

                  {/* NEWS2 Parameter Breakdown Table */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
                        <tr>
                          <th className="py-2 px-3 font-semibold">Physiological Parameter</th>
                          <th className="py-2 px-3 font-semibold">Measured Value</th>
                          <th className="py-2 px-3 font-semibold text-right">NEWS2 Subscore</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono tabular-nums">
                        {news2Result.parameters.map((p, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/70">
                            <td className="py-2 px-3 font-sans font-medium text-stone-800">{p.parameter}</td>
                            <td
                              className={`py-2 px-3 ${
                                p.isMissing ? 'text-amber-700 font-semibold' : 'text-stone-700'
                              }`}
                            >
                              {p.valueDisplay}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-bold ${
                                p.points === 3
                                  ? 'text-red-700'
                                  : p.points > 0
                                  ? 'text-amber-700'
                                  : 'text-stone-600'
                              }`}
                            >
                              +{p.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-stone-600">{news2Result.clinicalResponse}</p>
                    <button
                      type="button"
                      onClick={() =>
                        onInsertIntoSection(
                          'objective',
                          `NEWS2 Physiological Score: ${news2Result.totalScore} pts (${news2Result.riskBand} Risk) — ${news2Result.parameters
                            .map((p) => `${p.parameter}: ${p.valueDisplay} [+${p.points}]`)
                            .join(', ')}. Recommendation: ${news2Result.clinicalResponse}`
                        )
                      }
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Insert NEWS2 into Objective
                    </button>
                  </div>
                </div>

                {/* Right Column: qSOFA + KDIGO AKI Staging */}
                <div className="lg:col-span-5 space-y-6">
                  {/* qSOFA Card */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between border-b border-stone-100 pb-2.5">
                      <div>
                        <div className="text-xs text-stone-500">Sepsis-3 Bedside Mortality Screen</div>
                        <h3 className="text-base font-bold text-stone-900">qSOFA Score (SIRS vs. Sepsis-3)</h3>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <span className="text-2xl font-bold text-stone-900">{qsofaResult.score}</span>
                        <span className="text-xs text-stone-500"> / 3</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono tabular-nums">
                      <div className="flex justify-between">
                        <span className="font-sans text-stone-700">Respiratory Rate ≥ 22 /min</span>
                        <span className={qsofaResult.criteria.respiratoryRateGe22 ? 'text-red-700 font-bold' : 'text-stone-500'}>
                          {qsofaResult.criteria.respiratoryRateGe22 ? 'Yes (+1)' : 'No (0)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-stone-700">Systolic BP ≤ 100 mmHg</span>
                        <span className={qsofaResult.criteria.systolicBpLe100 ? 'text-red-700 font-bold' : 'text-stone-500'}>
                          {qsofaResult.criteria.systolicBpLe100 ? 'Yes (+1)' : 'No (0)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-stone-700">Altered Mentation (GCS &lt; 15)</span>
                        <span className={qsofaResult.criteria.alteredMentation ? 'text-red-700 font-bold' : 'text-stone-500'}>
                          {qsofaResult.criteria.alteredMentation ? 'Yes (+1)' : 'No (0)'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-stone-600 leading-relaxed">{qsofaResult.clinicalInterpretation}</p>
                  </div>

                  {/* KDIGO AKI Staging Calculator */}
                  <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between border-b border-stone-100 pb-2.5">
                      <div>
                        <div className="text-xs text-stone-500">KDIGO Creatinine Trajectory Kinetic Stage</div>
                        <h3 className="text-base font-bold text-stone-900">KDIGO Acute Kidney Injury (AKI)</h3>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold tabular-nums ${
                          kdigoResult.stage >= 2
                            ? 'text-red-700'
                            : kdigoResult.stage === 1
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {kdigoResult.stageLabel}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label htmlFor="kdigo-baseline-cr" className="block text-stone-600 font-medium mb-1">
                          Baseline Creatinine (mg/dL)
                        </label>
                        <input
                          id="kdigo-baseline-cr"
                          type="number"
                          step="0.05"
                          min="0.1"
                          value={baselineCrInput}
                          onChange={(e) => setBaselineCrInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="kdigo-current-cr" className="block text-stone-600 font-medium mb-1">
                          Current Creatinine (mg/dL)
                        </label>
                        <input
                          id="kdigo-current-cr"
                          type="number"
                          step="0.05"
                          min="0.1"
                          value={currentCrInput}
                          onChange={(e) => setCurrentCrInput(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md font-mono tabular-nums"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onRrt}
                        onChange={(e) => setOnRrt(e.target.checked)}
                        className="rounded border-stone-300"
                      />
                      <span>Initiated on Renal Replacement Therapy (Stage 3 criteria)</span>
                    </label>

                    <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-lg border border-stone-200 font-mono tabular-nums">
                      {kdigoResult.rationale}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        onInsertIntoSection(
                          'assessment',
                          `Renal Kinetic Assessment (${kdigoResult.stageLabel}): ${kdigoResult.rationale} Actions: ${kdigoResult.recommendedActions.join(' ')}`
                        )
                      }
                      className="w-full py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Insert KDIGO AKI Assessment into SOAP
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Longitudinal Lab Delta Check Table */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-stone-500">Automated Serial Analyte Velocity & Delta Verification</div>
                    <h3 className="text-base font-bold text-stone-900">Serial Laboratory Delta Checks (Baseline vs. Active Encounter)</h3>
                  </div>
                </div>

                {deltaChecks.length === 0 ? (
                  <p className="text-xs text-stone-500 py-4">
                    No numeric laboratory results available on the current chart. Open the Labs & Rx Hub to add BMP, Cardiac Troponin, or CBC panels.
                  </p>
                ) : (
                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-stone-200 text-stone-500">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Analyte</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Prior Baseline</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Active Result</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Delta (Δ / %)</th>
                          <th className="py-2.5 px-3 font-semibold">Clinical Trajectory Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono tabular-nums">
                        {deltaChecks.map((d, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/70">
                            <td className="py-2.5 px-3 font-sans font-semibold text-stone-900">{d.testName}</td>
                            <td className="py-2.5 px-3 text-right text-stone-600">
                              {d.previousValue} {d.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-stone-900">
                              {d.currentValue} {d.unit}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-bold ${
                                d.severity === 'critical_delta'
                                  ? 'text-red-700'
                                  : d.severity === 'notable'
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {d.absoluteDelta > 0 ? `+${d.absoluteDelta}` : d.absoluteDelta} ({d.percentDelta > 0 ? `+${d.percentDelta}%` : `${d.percentDelta}%`})
                            </td>
                            <td className="py-2.5 px-3 font-sans text-stone-700">{d.interpretation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 2: CLOSED-LOOP CPOE ORDER SET & MED REC WORKBENCH
              ==================================================================== */}
          {activeTab === 'cpoe' && (
            <div className="space-y-6">
              {/* Medication Reconciliation & 1-Click Safe Substitution */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <div className="text-xs text-stone-500">
                      Closed-Loop Contraindication Intercept · Active Medications ({note.medications.length})
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      Automated Medication Reconciliation & 1-Click Therapeutic Substitution
                    </h3>
                  </div>
                </div>

                {medRecConflicts.length === 0 ? (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 text-xs text-emerald-950 flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      No active renal, hyperkalemic, or beta-lactam allergy contraindications detected in current medication list ({note.medications.join(', ') || 'None'}).
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medRecConflicts.map((conflict) => {
                      const isResolved = Boolean(resolvedConflictIds[conflict.id]);
                      return (
                        <div
                          key={conflict.id}
                          className="border border-red-200 bg-red-50/40 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-red-800 font-semibold">
                              <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                              <span>Offending Order: {conflict.offendingMedication}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono uppercase">{conflict.conflictType.replace(/_/g, ' ')}</span>
                            </div>
                            <p className="text-xs text-stone-800 leading-relaxed">{conflict.clinicalExplanation}</p>
                            {conflict.replacementMedication && (
                              <p className="text-xs text-stone-600">
                                <span className="font-semibold text-stone-900">Guideline Alternative: </span>
                                {conflict.replacementMedication.medicationName} {conflict.replacementMedication.dosage}{' '}
                                {conflict.replacementMedication.route} {conflict.replacementMedication.frequency} —{' '}
                                {conflict.replacementMedication.rationale}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isResolved}
                            onClick={() => handleSubstituteConflict(conflict)}
                            className="px-3.5 py-2 bg-red-800 hover:bg-red-900 disabled:bg-emerald-700 text-white text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                          >
                            {isResolved ? '✓ Reconciled in Chart' : conflict.recommendedActionLabel}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Condition-Specific CPOE Order Sets */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <div className="text-xs text-stone-500">
                      Evidence-Graded Clinical Pathways · LOINC & RxNorm Coded
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      CPOE Clinical Order Sets & FHIR R4 Bundle Generator
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Select CPOE Clinical Order Set"
                      value={selectedOrderSetId}
                      onChange={(e) => setSelectedOrderSetId(e.target.value)}
                      className="text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900"
                    >
                      {CPOE_ORDER_SETS.map((set) => (
                        <option key={set.id} value={set.id}>
                          {set.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-stone-700 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="font-semibold text-stone-900">{activeOrderSet.guidelineReference}: </span>
                    <span>{activeOrderSet.clinicalSafetyNote}</span>
                  </div>
                </div>

                {/* Order Checklist */}
                <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                  {activeOrderSet.orders.map((ord) => {
                    const checked = Boolean(selectedOrderIds[ord.id]);
                    return (
                      <label
                        key={ord.id}
                        className="p-3.5 flex items-start gap-3 hover:bg-stone-50 transition-colors cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedOrderIds((prev) => ({ ...prev, [ord.id]: e.target.checked }))
                          }
                          className="mt-0.5 rounded border-stone-300"
                        />
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900">{ord.title}</span>
                            <span className="text-stone-400" aria-hidden="true">·</span>
                            <span
                              className={`font-mono font-semibold ${
                                ord.priority === 'STAT' ? 'text-red-700' : 'text-amber-800'
                              }`}
                            >
                              {ord.priority}
                            </span>
                            <span className="text-stone-400" aria-hidden="true">·</span>
                            <span className="font-mono text-stone-500">{ord.loincOrRxNormCode}</span>
                            <span className="text-stone-400" aria-hidden="true">·</span>
                            <span className="text-stone-500">{ord.category}</span>
                          </div>
                          <p className="text-stone-600">{ord.clinicalRationale}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFhirPreview((prev) => !prev)}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>
                      {showFhirPreview
                        ? 'Hide FHIR R4 Order Bundle'
                        : `Inspect FHIR R4 Bundle (${selectedOrdersForActiveSet.length} resources)`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignAndApplyOrderSet}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Sign & Apply {selectedOrdersForActiveSet.length} Orders to SOAP Plan</span>
                  </button>
                </div>

                {showFhirPreview && (
                  <div className="bg-stone-900 text-stone-100 rounded-lg p-4 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300">
                        HL7 FHIR R4 Transaction Bundle (MedicationRequest & ServiceRequest)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(cpoeFhirBundle, null, 2));
                          setCopiedFhir(true);
                          setTimeout(() => setCopiedFhir(false), 2000);
                          onToast('Copied CPOE FHIR R4 Bundle JSON to clipboard.');
                        }}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedFhir ? 'Copied' : 'Copy JSON'}</span>
                      </button>
                    </div>
                    <pre className="max-h-56 overflow-y-auto text-[11px] leading-relaxed text-stone-300">
                      {JSON.stringify(cpoeFhirBundle, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 3: PHARMACOGENOMIC (PGx) CPIC GUIDELINE ENGINE
              ==================================================================== */}
          {activeTab === 'pgx' && (
            <div className="space-y-6">
              {/* Preset Selector & Genotype Matrix */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <div className="text-xs text-stone-500">
                      Clinical Pharmacogenetics Implementation Consortium (CPIC) Level A Rules
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      Patient Pharmacogenomic (PGx) Diplotype & Phenotype Panel
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-600 font-medium">Genotype Preset:</span>
                    <select
                      aria-label="Select Patient PGx Diplotype Preset"
                      value={selectedPgxPresetKey}
                      onChange={(e) => {
                        const key = e.target.value;
                        setSelectedPgxPresetKey(key);
                        if (DEFAULT_PGX_PROFILES[key]) {
                          setPgxProfile(DEFAULT_PGX_PROFILES[key].profile);
                        }
                      }}
                      className="text-xs font-semibold bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-900"
                    >
                      {Object.entries(DEFAULT_PGX_PROFILES).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive Allele Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      CYP2C19 (Clopidogrel / PPIs / SSRIs)
                    </label>
                    <select
                      value={pgxProfile.cyp2c19}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          cyp2c19: e.target.value as PgxGenotypeProfile['cyp2c19'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="*1/*1 (Normal Metabolizer)">*1/*1 (Normal Metabolizer)</option>
                      <option value="*1/*2 (Intermediate Metabolizer)">*1/*2 (Intermediate Metabolizer)</option>
                      <option value="*2/*2 (Poor Metabolizer)">*2/*2 (Poor Metabolizer)</option>
                      <option value="*17/*17 (Ultrarapid Metabolizer)">*17/*17 (Ultrarapid Metabolizer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      SLCO1B1 rs4149056 (Statin Myopathy Risk)
                    </label>
                    <select
                      value={pgxProfile.slco1b1}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          slco1b1: e.target.value as PgxGenotypeProfile['slco1b1'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="rs4149056 T/T (Normal Function)">rs4149056 T/T (Normal Function)</option>
                      <option value="rs4149056 T/C (Decreased Function)">rs4149056 T/C (Decreased Function)</option>
                      <option value="rs4149056 C/C (Poor Function)">rs4149056 C/C (Poor Function)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      CYP2D6 (Codeine / Tramadol / Beta-Blockers)
                    </label>
                    <select
                      value={pgxProfile.cyp2d6}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          cyp2d6: e.target.value as PgxGenotypeProfile['cyp2d6'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="*1/*1 (Normal Metabolizer)">*1/*1 (Normal Metabolizer)</option>
                      <option value="*4/*4 (Poor Metabolizer)">*4/*4 (Poor Metabolizer)</option>
                      <option value="*1/*2xN (Ultrarapid Metabolizer)">*1/*2xN (Ultrarapid Metabolizer)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      HLA-B*57:01 (Abacavir Hypersensitivity)
                    </label>
                    <select
                      value={pgxProfile.hlaB5701}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          hlaB5701: e.target.value as PgxGenotypeProfile['hlaB5701'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="Negative">Negative</option>
                      <option value="Positive (High Risk Carrier)">Positive (High Risk Carrier)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      HLA-B*15:02 (Carbamazepine SJS/TEN)
                    </label>
                    <select
                      value={pgxProfile.hlaB1502}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          hlaB1502: e.target.value as PgxGenotypeProfile['hlaB1502'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="Negative">Negative</option>
                      <option value="Positive (High Risk Carrier)">Positive (High Risk Carrier)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-600 font-semibold mb-1">
                      CYP2C9 + VKORC1 (Warfarin Sensitivity)
                    </label>
                    <select
                      value={pgxProfile.cyp2c9Vkorc1}
                      onChange={(e) =>
                        setPgxProfile((p) => ({
                          ...p,
                          cyp2c9Vkorc1: e.target.value as PgxGenotypeProfile['cyp2c9Vkorc1'],
                        }))
                      }
                      className="w-full px-2.5 py-1.5 border border-stone-300 rounded-md bg-white font-mono"
                    >
                      <option value="CYP2C9 *1/*1 + VKORC1 G/G (Normal Sensitivity)">
                        CYP2C9 *1/*1 + VKORC1 G/G (Normal)
                      </option>
                      <option value="CYP2C9 *1/*3 + VKORC1 A/G (Intermediate Sensitivity)">
                        CYP2C9 *1/*3 + VKORC1 A/G (Intermediate)
                      </option>
                      <option value="CYP2C9 *3/*3 + VKORC1 A/A (High Sensitivity / Bleed Risk)">
                        CYP2C9 *3/*3 + VKORC1 A/A (High Risk)
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* CPIC Actionable Recommendations List */}
              <div className="space-y-3">
                {cpicRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-white border border-stone-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-mono font-bold text-stone-900 text-sm">{rec.gene}</span>
                        <span className="text-stone-400" aria-hidden="true">·</span>
                        <span className="font-mono text-stone-700">{rec.diplotype}</span>
                        <span className="text-stone-400" aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            rec.severity === 'contraindicated'
                              ? 'text-red-700'
                              : rec.severity === 'dose_adjustment'
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {rec.phenotype}
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 font-mono">
                        {rec.cpicLevel} · Target: <strong className="text-stone-900">{rec.affectedDrug}</strong>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">{rec.clinicalImplication}</p>

                    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs space-y-1">
                      <div className="font-semibold text-stone-900">
                        CPIC Therapeutic Recommendation: {rec.therapeuticRecommendation}
                      </div>
                      {rec.alternativeMedication && (
                        <div className="text-stone-600">
                          Preferred Alternative: <strong>{rec.alternativeMedication.name}</strong> ({rec.alternativeMedication.dosage}) — {rec.alternativeMedication.rationale}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex items-center gap-3 text-stone-500">
                        <span>{rec.guidelineCitation}</span>
                        <a
                          href={rec.alphaGenomeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>AlphaGenome Atlas</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyPgxRecommendation(rec)}
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                      >
                        Insert CPIC Consult into Plan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 4: MULTIMODAL DIAGNOSTIC ARTIFACT, ABG & 12-LEAD ECG INTERPRETER
              ==================================================================== */}
          {activeTab === 'abg_ecg' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: ABG & Winter's Formula Calculator */}
                <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col gap-2.5 border-b border-stone-100 pb-3">
                    <div>
                      <div className="text-xs text-stone-500">
                        Physiological Acid-Base, Winter’s Formula & Delta AG / Delta HCO3- Ratio
                      </div>
                      <h3 className="text-base font-bold text-stone-900 mt-0.5">
                        Arterial Blood Gas (ABG) & Electrolyte Interpreter
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-stone-600 shrink-0">Clinical Scenario Preset:</span>
                      <select
                        aria-label="Load ABG Clinical Preset"
                        onChange={(e) => {
                          const preset = ABG_CLINICAL_PRESETS[e.target.value];
                          if (preset) setAbgInput(preset.input);
                        }}
                        className="w-full text-xs font-semibold bg-stone-50 border border-stone-300 rounded px-2.5 py-1.5 text-stone-800"
                      >
                        {Object.entries(ABG_CLINICAL_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Arterial pH</label>
                      <input
                        type="number"
                        step="0.01"
                        value={abgInput.ph}
                        onChange={(e) => setAbgInput((p) => ({ ...p, ph: parseFloat(e.target.value) || 7.4 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">PaCO2 (mmHg)</label>
                      <input
                        type="number"
                        step="1"
                        value={abgInput.paco2}
                        onChange={(e) => setAbgInput((p) => ({ ...p, paco2: parseFloat(e.target.value) || 40 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">HCO3- (mEq/L)</label>
                      <input
                        type="number"
                        step="1"
                        value={abgInput.hco3}
                        onChange={(e) => setAbgInput((p) => ({ ...p, hco3: parseFloat(e.target.value) || 24 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Lactate (mmol/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={abgInput.lactate ?? 1.2}
                        onChange={(e) => setAbgInput((p) => ({ ...p, lactate: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Na+ (mEq/L)</label>
                      <input
                        type="number"
                        step="1"
                        value={abgInput.sodium ?? 138}
                        onChange={(e) => setAbgInput((p) => ({ ...p, sodium: parseFloat(e.target.value) || 140 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Cl- (mEq/L)</label>
                      <input
                        type="number"
                        step="1"
                        value={abgInput.chloride ?? 100}
                        onChange={(e) => setAbgInput((p) => ({ ...p, chloride: parseFloat(e.target.value) || 100 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Albumin (g/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={abgInput.albumin ?? 4.0}
                        onChange={(e) => setAbgInput((p) => ({ ...p, albumin: parseFloat(e.target.value) || 4.0 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">PaO2 (mmHg)</label>
                      <input
                        type="number"
                        step="1"
                        value={abgInput.pao2 ?? 90}
                        onChange={(e) => setAbgInput((p) => ({ ...p, pao2: parseFloat(e.target.value) || 90 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-mono tabular-nums">
                      <span className="font-sans font-bold text-stone-900">{abgResult.primaryDisorder}</span>
                      <span className="text-amber-900 font-semibold">{abgResult.acidemiaOrAlkalemia}</span>
                    </div>
                    <p className="text-stone-700">{abgResult.compensationAssessment}</p>
                    {abgResult.albuminCorrectedAnionGap !== undefined && (
                      <div className="text-stone-700 font-mono tabular-nums">
                        Measured AG: <strong>{abgResult.anionGap} mEq/L</strong> · Albumin-Corrected AG:{' '}
                        <strong>{abgResult.albuminCorrectedAnionGap} mEq/L</strong>
                      </div>
                    )}
                    {abgResult.deltaDeltaInterpretation && (
                      <div className="text-stone-700 font-mono tabular-nums">
                        {abgResult.deltaDeltaInterpretation}
                      </div>
                    )}
                    {abgResult.oxygenationStatus && (
                      <div className="text-stone-600 font-mono tabular-nums">{abgResult.oxygenationStatus}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onInsertIntoSection('objective', abgResult.soapSummaryLine)}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Insert ABG & Winter’s Interpretation into SOAP Objective
                  </button>
                </div>

                {/* Right: 12-Lead ECG Territory & QTc Analyzer */}
                <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                  <div className="border-b border-stone-100 pb-3">
                    <div className="text-xs text-stone-500">
                      Bazett & Fridericia QTc · Contiguous Coronary Territory Localization
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      12-Lead ECG Waveform & Culprit Artery Interpreter
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Ventricular Rate</label>
                      <input
                        type="number"
                        value={ecgInput.heartRate}
                        onChange={(e) => setEcgInput((p) => ({ ...p, heartRate: parseInt(e.target.value, 10) || 80 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">PR (ms)</label>
                      <input
                        type="number"
                        value={ecgInput.prIntervalMs}
                        onChange={(e) => setEcgInput((p) => ({ ...p, prIntervalMs: parseInt(e.target.value, 10) || 160 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">QRS (ms)</label>
                      <input
                        type="number"
                        value={ecgInput.qrsDurationMs}
                        onChange={(e) => setEcgInput((p) => ({ ...p, qrsDurationMs: parseInt(e.target.value, 10) || 90 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block font-sans text-stone-600 font-medium mb-1">Measured QT (ms)</label>
                      <input
                        type="number"
                        value={ecgInput.qtIntervalMs}
                        onChange={(e) => setEcgInput((p) => ({ ...p, qtIntervalMs: parseInt(e.target.value, 10) || 400 }))}
                        className="w-full px-2 py-1.5 border border-stone-300 rounded"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-stone-700">Contiguous ST-Segment Elevation Leads:</div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          'V1-V2 (Septal)',
                          'V3-V4 (Anterior)',
                          'II, III, aVF (Inferior)',
                          'I, aVL, V5-V6 (Lateral)',
                        ] as const
                      ).map((lead) => {
                        const active = ecgInput.stElevationLeads.includes(lead);
                        return (
                          <button
                            key={lead}
                            type="button"
                            onClick={() => handleToggleStLead(lead)}
                            className={`px-2.5 py-1.5 rounded-md font-mono text-xs transition-colors cursor-pointer ${
                              active
                                ? 'bg-red-800 text-white font-semibold'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            {lead}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono tabular-nums">
                      <span>
                        QTc (Bazett): <strong>{ecgResult.qtcBazettMs} ms</strong> · Fridericia:{' '}
                        <strong>{ecgResult.qtcFridericiaMs} ms</strong>
                      </span>
                      <span
                        className={`font-semibold ${
                          ecgResult.qtcBazettMs >= 500 ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {ecgResult.qtcStatus}
                      </span>
                    </div>
                    {ecgResult.culpritTerritory && (
                      <div className="text-red-800 font-semibold">
                        Anatomical Territory: {ecgResult.culpritTerritory}
                      </div>
                    )}
                    <p className="text-stone-700">{ecgResult.clinicalActionPlan[0]}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInsertIntoSection('objective', ecgResult.soapObjectiveInsert)}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Insert 12-Lead ECG Interpretation into SOAP Objective
                  </button>
                </div>
              </div>

              {/* Multimodal Diagnostic Artifact Upload Bar */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-stone-500">
                    Gemini Vision Multimodal Clinical Extraction (/api/clinical/analyze-attachment)
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">
                    Upload Outside Lab PDF, ABG Printout, or 12-Lead ECG Strip Image
                  </h3>
                  {artifactResultText && (
                    <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded border border-stone-200 mt-2">
                      {artifactResultText}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isAnalyzingArtifact ? 'Extracting Artifact...' : 'Upload Diagnostic Image / PDF'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleUploadDiagnosticArtifact}
                      className="hidden"
                    />
                  </label>
                  {artifactResultText && (
                    <button
                      type="button"
                      onClick={() => onInsertIntoSection('objective', artifactResultText)}
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Insert into Objective
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              TAB 5: PATIENT-FACING AVS READABILITY & TEACH-BACK GENERATOR
              ==================================================================== */}
          {activeTab === 'avs_teachback' && (
            <div className="space-y-6">
              {/* Top Row: Flesch-Kincaid Readability Analyzer & 6th-Grade Simplifier */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <div className="text-xs text-stone-500">
                      AMA / NIH Health Literacy Standard (Target ≤ 6th-Grade Reading Level)
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      After-Visit Summary (AVS) Readability & Medical Jargon Simplifier
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
                    <div>
                      Grade Level:{' '}
                      <strong
                        className={
                          readabilityMetrics.fleschKincaidGradeLevel <= 6.5
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }
                      >
                        {readabilityMetrics.fleschKincaidGradeLevel}
                      </strong>
                    </div>
                    <span aria-hidden="true">·</span>
                    <div>
                      Reading Ease: <strong>{readabilityMetrics.fleschReadingEase}</strong>
                    </div>
                    <span aria-hidden="true">·</span>
                    <button
                      type="button"
                      onClick={handleSimplifyTo6thGrade}
                      className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-sans font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Auto-Simplify to 6th-Grade Level</span>
                    </button>
                  </div>
                </div>

                <textarea
                  aria-label="Patient Discharge Overview Text"
                  rows={3}
                  value={avsDraftText}
                  onChange={(e) => setAvsDraftText(e.target.value)}
                  className="w-full p-3 border border-stone-300 rounded-lg text-xs text-stone-800 leading-relaxed"
                />

                {readabilityMetrics.detectedJargonTerms.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-950">
                    <span className="font-semibold">Detected Clinical Jargon Terms: </span>
                    {readabilityMetrics.detectedJargonTerms
                      .map((j) => `"${j.jargon}" → "${j.plainAlternative}"`)
                      .join(' · ')}
                  </div>
                )}
              </div>

              {/* Middle Row: Visual Time-of-Day Medication Matrix */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div>
                  <div className="text-xs text-stone-500">Universal Medication Schedule (UMS) Time-of-Day Grid</div>
                  <h3 className="text-base font-bold text-stone-900 mt-0.5">
                    Patient Visual Daily Medication Schedule
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {visualMedMatrix.map((slot) => (
                    <div
                      key={slot.slot}
                      className="border border-stone-200 rounded-lg p-3 bg-stone-50/60 space-y-2"
                    >
                      <div className="text-xs font-bold text-stone-900 border-b border-stone-200 pb-1.5 font-mono">
                        {slot.slot}
                      </div>
                      {slot.medications.length === 0 ? (
                        <p className="text-[11px] text-stone-400">No scheduled doses</p>
                      ) : (
                        <div className="space-y-2">
                          {slot.medications.map((m, i) => (
                            <div key={i} className="bg-white border border-stone-200 rounded p-2 text-xs space-y-1">
                              <div className="font-bold text-stone-900">{m.doseAndInstructions}</div>
                              <div className="text-[11px] text-stone-600">{m.plainPurpose}</div>
                              <div className="text-[11px] text-amber-900">{m.safetyPearl}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row: AHRQ Clinician Teach-Back Checklist */}
              <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <div className="text-xs text-stone-500">
                      AHRQ Health Literacy Universal Precautions Toolkit
                    </div>
                    <h3 className="text-base font-bold text-stone-900 mt-0.5">
                      Closed-Loop Patient Teach-Back Verification Prompts
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleDocumentTeachBackInPlan}
                    className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Document Verified Teach-Back in SOAP Plan</span>
                  </button>
                </div>

                <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg">
                  {teachBackQuestions.map((tb) => (
                    <label
                      key={tb.id}
                      className="p-3.5 flex items-start gap-3 hover:bg-stone-50 transition-colors cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checkedTeachBackIds[tb.id])}
                        onChange={(e) =>
                          setCheckedTeachBackIds((prev) => ({ ...prev, [tb.id]: e.target.checked }))
                        }
                        className="mt-0.5 rounded border-stone-300"
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-stone-900">{tb.domain}</div>
                        <p className="text-stone-800 font-medium">{tb.clinicianPrompt}</p>
                        <p className="text-stone-500">Target Confirmation: {tb.expectedPatientUnderstanding}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
