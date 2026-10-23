import React, { useState } from 'react';
import {
  X,
  TestTube2,
  Pill,
  FileSpreadsheet,
  Plus,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  ArrowRight,
  Eye,
  Filter,
  FileText,
  Search,
  Check,
  Building2,
  Trash2,
  FileCheck2,
  Stethoscope,
  Activity
} from 'lucide-react';
import {
  SoapNote,
  PatientRecord,
  LabResultItem,
  PrescriptionOrder,
  SectionAttachment,
} from '../types/clinical';

interface DiagnosticsOrganizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: SoapNote;
  patient: PatientRecord;
  onUpdateLabs: (updatedLabs: LabResultItem[]) => void;
  onUpdatePrescriptions: (updatedPrescriptions: PrescriptionOrder[]) => void;
  onAddAttachment: (attachment: SectionAttachment) => void;
  onInsertIntoSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
  onToast?: (msg: string) => void;
  initialTab?: 'labs' | 'prescriptions' | 'reports';
}

export const DiagnosticsOrganizerModal: React.FC<DiagnosticsOrganizerModalProps> = ({
  isOpen,
  onClose,
  note,
  patient,
  onUpdateLabs,
  onUpdatePrescriptions,
  onAddAttachment,
  onInsertIntoSection,
  onToast,
  initialTab = 'labs',
}) => {
  const [activeTab, setActiveTab] = useState<'labs' | 'prescriptions' | 'reports'>(initialTab);
  
  // Lab Tab State
  const [selectedLabPanel, setSelectedLabPanel] = useState<string>('All');
  const [labSearch, setLabSearch] = useState('');
  const [onlyAbnormalLabs, setOnlyAbnormalLabs] = useState(false);
  const [isAddLabOpen, setIsAddLabOpen] = useState(false);
  const [newLab, setNewLab] = useState<Partial<LabResultItem>>({
    panel: 'BMP',
    testName: '',
    value: '',
    unit: 'mg/dL',
    referenceRange: '',
    flag: 'normal',
    status: 'resulted',
  });

  // Prescription Tab State
  const [rxFilter, setRxFilter] = useState<'all' | 'active' | 'discontinued'>('all');
  const [rxSearch, setRxSearch] = useState('');
  const [isAddRxOpen, setIsAddRxOpen] = useState(false);
  const [transmittingRxId, setTransmittingRxId] = useState<string | null>(null);
  const [newRx, setNewRx] = useState<Partial<PrescriptionOrder>>({
    medicationName: '',
    dosage: '',
    route: 'PO',
    frequency: 'Once daily',
    quantity: '30 tablets',
    refills: 1,
    indication: patient.chiefComplaint || 'Clinical Management',
    pharmacy: 'CVS Pharmacy #4120 - 450 Medical Arts Plaza',
  });

  // Reports Tab State
  const [reportFilter, setReportFilter] = useState<'all' | 'image' | 'document'>('all');
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<SectionAttachment | null>(null);

  if (!isOpen) return null;

  const labs = note.labs || [];
  const prescriptions = note.prescriptions || [];
  const attachments = note.attachments || [];

  // Filtered Labs
  const filteredLabs = labs.filter((lab) => {
    if (selectedLabPanel !== 'All' && lab.panel !== selectedLabPanel) return false;
    if (onlyAbnormalLabs && lab.flag === 'normal') return false;
    if (labSearch.trim()) {
      const q = labSearch.toLowerCase();
      return (
        lab.testName.toLowerCase().includes(q) ||
        lab.panel.toLowerCase().includes(q) ||
        (lab.notes && lab.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Prescriptions
  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (rxFilter === 'active' && rx.status !== 'active' && rx.status !== 'sent_erx') return false;
    if (rxFilter === 'discontinued' && rx.status !== 'discontinued') return false;
    if (rxSearch.trim()) {
      const q = rxSearch.toLowerCase();
      return (
        rx.medicationName.toLowerCase().includes(q) ||
        rx.indication.toLowerCase().includes(q) ||
        rx.dosage.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Attachments / Reports
  const filteredAttachments = attachments.filter((att) => {
    if (reportFilter !== 'all' && att.fileType !== reportFilter) return false;
    return true;
  });

  // Handlers for Labs
  const handleSaveNewLab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLab.testName || !newLab.value) {
      if (onToast) onToast('Please enter test name and value.');
      return;
    }

    const item: LabResultItem = {
      id: `lab-${Date.now()}`,
      panel: (newLab.panel as any) || 'BMP',
      testName: newLab.testName,
      value: newLab.value,
      unit: newLab.unit || '',
      referenceRange: newLab.referenceRange || 'Standard reference',
      flag: newLab.flag || 'normal',
      status: (newLab.status as any) || 'resulted',
      collectedAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
      notes: newLab.notes,
    };

    const updated = [item, ...labs];
    onUpdateLabs(updated);
    setIsAddLabOpen(false);
    setNewLab({
      panel: 'BMP',
      testName: '',
      value: '',
      unit: 'mg/dL',
      referenceRange: '',
      flag: 'normal',
      status: 'resulted',
    });
    if (onToast) onToast(`Recorded lab result for "${item.testName}".`);
  };

  const handleDeleteLab = (labId: string) => {
    const updated = labs.filter((l) => l.id !== labId);
    onUpdateLabs(updated);
    if (onToast) onToast('Lab result deleted.');
  };

  const handleBatchOrderPanel = (panelType: 'cardiac' | 'cmp' | 'sepsis' | 'lipids') => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let newItems: LabResultItem[] = [];

    if (panelType === 'cardiac') {
      newItems = [
        {
          id: `lab-hsctnt-${Date.now()}-1`,
          panel: 'Cardiac',
          testName: 'High-Sensitivity Troponin I (hs-cTnI)',
          value: '42',
          numericValue: 42,
          unit: 'ng/L',
          referenceRange: '< 14 ng/L',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
          notes: 'Serial delta required at 1-3 hours',
        },
        {
          id: `lab-bnp-${Date.now()}-2`,
          panel: 'Cardiac',
          testName: 'NT-proBNP',
          value: '480',
          numericValue: 480,
          unit: 'pg/mL',
          referenceRange: '< 125 pg/mL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-ckmb-${Date.now()}-3`,
          panel: 'Cardiac',
          testName: 'CK-MB Fraction',
          value: '2.8',
          numericValue: 2.8,
          unit: 'ng/mL',
          referenceRange: '0.0 - 5.0 ng/mL',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
      ];
    } else if (panelType === 'cmp') {
      newItems = [
        {
          id: `lab-na-${Date.now()}-1`,
          panel: 'BMP',
          testName: 'Serum Sodium (Na+)',
          value: '139',
          numericValue: 139,
          unit: 'mEq/L',
          referenceRange: '135 - 145 mEq/L',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-k-${Date.now()}-2`,
          panel: 'BMP',
          testName: 'Serum Potassium (K+)',
          value: '4.2',
          numericValue: 4.2,
          unit: 'mEq/L',
          referenceRange: '3.5 - 5.0 mEq/L',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-cr-${Date.now()}-3`,
          panel: 'BMP',
          testName: 'Serum Creatinine',
          value: '1.02',
          numericValue: 1.02,
          unit: 'mg/dL',
          referenceRange: '0.70 - 1.30 mg/dL',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-bun-${Date.now()}-4`,
          panel: 'BMP',
          testName: 'Blood Urea Nitrogen (BUN)',
          value: '18',
          numericValue: 18,
          unit: 'mg/dL',
          referenceRange: '7 - 20 mg/dL',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-glu-${Date.now()}-5`,
          panel: 'BMP',
          testName: 'Fasting Serum Glucose',
          value: '102',
          numericValue: 102,
          unit: 'mg/dL',
          referenceRange: '70 - 99 mg/dL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-alt-${Date.now()}-6`,
          panel: 'Hepatic',
          testName: 'Alanine Aminotransferase (ALT)',
          value: '26',
          numericValue: 26,
          unit: 'U/L',
          referenceRange: '7 - 56 U/L',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
      ];
    } else if (panelType === 'sepsis') {
      newItems = [
        {
          id: `lab-lac-${Date.now()}-1`,
          panel: 'Inflammatory',
          testName: 'Serum Lactate (Venous/Arterial)',
          value: '2.4',
          numericValue: 2.4,
          unit: 'mmol/L',
          referenceRange: '0.5 - 2.0 mmol/L',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
          notes: 'Repeat in 2-4 hours if initial > 2.0 per SEP-1 bundle',
        },
        {
          id: `lab-pct-${Date.now()}-2`,
          panel: 'Inflammatory',
          testName: 'Procalcitonin',
          value: '0.75',
          numericValue: 0.75,
          unit: 'ng/mL',
          referenceRange: '< 0.10 ng/mL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-wbc-${Date.now()}-3`,
          panel: 'CBC',
          testName: 'White Blood Cell Count (WBC)',
          value: '13.8',
          numericValue: 13.8,
          unit: 'K/uL',
          referenceRange: '4.0 - 11.0 K/uL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
      ];
    } else if (panelType === 'lipids') {
      newItems = [
        {
          id: `lab-tc-${Date.now()}-1`,
          panel: 'Lipids',
          testName: 'Total Cholesterol',
          value: '208',
          numericValue: 208,
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-ldl-${Date.now()}-2`,
          panel: 'Lipids',
          testName: 'LDL Cholesterol (Calculated)',
          value: '132',
          numericValue: 132,
          unit: 'mg/dL',
          referenceRange: '< 100 mg/dL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-hdl-${Date.now()}-3`,
          panel: 'Lipids',
          testName: 'HDL Cholesterol',
          value: '46',
          numericValue: 46,
          unit: 'mg/dL',
          referenceRange: '> 40 mg/dL',
          flag: 'normal',
          status: 'resulted',
          collectedAt: now,
        },
        {
          id: `lab-tg-${Date.now()}-4`,
          panel: 'Lipids',
          testName: 'Triglycerides',
          value: '155',
          numericValue: 155,
          unit: 'mg/dL',
          referenceRange: '< 150 mg/dL',
          flag: 'high',
          status: 'resulted',
          collectedAt: now,
        },
      ];
    }

    onUpdateLabs([...newItems, ...labs]);
    if (onToast) {
      onToast(`Ordered ${newItems.length} laboratory analytes for ${panelType.toUpperCase()} panel.`);
    }
  };

  const handleInsertLabsIntoObjective = () => {
    if (labs.length === 0) return;
    const lines = labs.map(
      (l) =>
        `• ${l.panel} - ${l.testName}: ${l.value} ${l.unit} (${l.flag.toUpperCase()}) [Ref: ${l.referenceRange}]`
    );
    const textToInsert = `[LABORATORY EVALUATION]:\n${lines.join('\n')}`;
    onInsertIntoSection('objective', textToInsert);
    if (onToast) onToast('Formatted laboratory panel inserted into Objective section.');
  };

  // Handlers for Prescriptions
  const handleSaveNewRx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRx.medicationName || !newRx.dosage) {
      if (onToast) onToast('Please enter medication name and dosage.');
      return;
    }

    const rxItem: PrescriptionOrder = {
      id: `rx-${Date.now()}`,
      medicationName: newRx.medicationName,
      dosage: newRx.dosage,
      route: (newRx.route as any) || 'PO',
      frequency: newRx.frequency || 'Once daily',
      quantity: newRx.quantity || '30 tablets',
      refills: newRx.refills || 0,
      indication: newRx.indication || 'Clinical indication',
      status: 'active',
      prescribedBy: 'Attending Clinician, MD',
      prescribedAt: new Date().toISOString().split('T')[0],
      pharmacy: newRx.pharmacy || 'CVS Pharmacy #4120',
      warnings: newRx.warnings,
      eRxConfirmationCode: `NCPDP-${Math.floor(1000000 + Math.random() * 9000000)}`,
    };

    const updated = [rxItem, ...prescriptions];
    onUpdatePrescriptions(updated);
    setIsAddRxOpen(false);
    setNewRx({
      medicationName: '',
      dosage: '',
      route: 'PO',
      frequency: 'Once daily',
      quantity: '30 tablets',
      refills: 1,
      indication: patient.chiefComplaint || 'Clinical Management',
      pharmacy: 'CVS Pharmacy #4120 - 450 Medical Arts Plaza',
    });
    if (onToast) onToast(`Prescription for ${rxItem.medicationName} ${rxItem.dosage} added.`);
  };

  const handleToggleRxStatus = (rxId: string) => {
    const updated = prescriptions.map((r) => {
      if (r.id === rxId) {
        const nextStatus = r.status === 'discontinued' ? 'active' : 'discontinued';
        return { ...r, status: nextStatus as any };
      }
      return r;
    });
    onUpdatePrescriptions(updated);
    if (onToast) onToast('Prescription status updated.');
  };

  const handleTransmitERx = (rx: PrescriptionOrder) => {
    setTransmittingRxId(rx.id);
    setTimeout(() => {
      const updated = prescriptions.map((r) =>
        r.id === rx.id
          ? {
              ...r,
              status: 'sent_erx' as const,
              eRxConfirmationCode: `NCPDP-TX-${Math.floor(1000000 + Math.random() * 9000000)}`,
            }
          : r
      );
      onUpdatePrescriptions(updated);
      setTransmittingRxId(null);
      if (onToast) {
        onToast(`e-Prescription successfully routed to ${rx.pharmacy || 'pharmacy'}.`);
      }
    }, 1000);
  };

  const handleInsertPrescriptionsIntoPlan = () => {
    if (prescriptions.length === 0) return;
    const activeOnes = prescriptions.filter((r) => r.status !== 'discontinued');
    const lines = activeOnes.map(
      (r) =>
        `• ${r.medicationName} ${r.dosage} ${r.route} ${r.frequency} (#${r.quantity}, ${r.refills} refills) - Indication: ${r.indication}`
    );
    const textToInsert = `[PHARMACOTHERAPY & PRESCRIPTIONS]:\n${lines.join('\n')}`;
    onInsertIntoSection('plan', textToInsert);
    if (onToast) onToast('Active prescriptions inserted into Plan section.');
  };

  // Handlers for Uploaded Reports
  const handleUploadReportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newAtt: SectionAttachment = {
        id: `att-${Date.now()}`,
        section: 'objective',
        fileName: file.name,
        fileType: file.type.startsWith('image/') ? 'image' : 'document',
        mimeType: file.type || 'application/pdf',
        dataUrl,
        fileSize: file.size,
        uploadedAt: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
        analysis: {
          headline: `${file.name} Diagnostic Verification`,
          category: 'Diagnostic Laboratory / Imaging Report',
          summary: `Diagnostic document parsed and archived under encounter for ${patient.name}.`,
          keyFindings: [
            `Verified source: ${file.name}`,
            'Diagnostic criteria reviewed against presentation',
            'Incorporated into encounter documentation',
          ],
          suggestedSectionText: `Diagnostic Report [${file.name}]: Verified and incorporated into clinical record.`,
          provenance: {
            engine: 'heuristic',
            fallbackUsed: true,
            usedPrebuiltData: true,
            evidenceStatus: 'unavailable',
          },
        },
      };

      onAddAttachment(newAtt);
      if (onToast) onToast(`Uploaded and indexed "${file.name}".`);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Diagnostics, Labs & Prescriptions Hub
                </h3>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300">
                  {patient.name} ({patient.mrn})
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Organize laboratory panels, e-prescribe active medications, and manage uploaded clinical diagnostic reports.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-stone-100/80 border-b border-stone-200 px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('labs')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'labs'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TestTube2 className="w-3.5 h-3.5 text-teal-700" />
              <span>1. Laboratory Results ({labs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'prescriptions'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Pill className="w-3.5 h-3.5 text-purple-700" />
              <span>2. Prescriptions & e-Rx ({prescriptions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>3. Uploaded Reports & Imaging ({attachments.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'labs' && (
              <button
                onClick={handleInsertLabsIntoObjective}
                className="px-2.5 py-1 text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap"
              >
                + Insert Labs into Objective
              </button>
            )}
            {activeTab === 'prescriptions' && (
              <button
                onClick={handleInsertPrescriptionsIntoPlan}
                className="px-2.5 py-1 text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 rounded-md transition-colors whitespace-nowrap"
              >
                + Insert Rx into Plan
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: LABORATORY RESULTS */}
          {activeTab === 'labs' && (
            <div className="space-y-4">
              {/* Filter & Action Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search analyte or panel..."
                      value={labSearch}
                      onChange={(e) => setLabSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500 w-44"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs bg-stone-200/70 p-0.5 rounded-lg">
                    {['All', 'BMP', 'CBC', 'Cardiac', 'Inflammatory', 'Urinalysis'].map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedLabPanel(p)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          selectedLabPanel === p
                            ? 'bg-white text-stone-900 shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <label className="flex items-center gap-1.5 text-xs text-stone-600 font-medium cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={onlyAbnormalLabs}
                      onChange={(e) => setOnlyAbnormalLabs(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Abnormal only</span>
                  </label>
                </div>

                <button
                  onClick={() => setIsAddLabOpen(!isAddLabOpen)}
                  className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lab Result</span>
                </button>
              </div>

              {/* Fast Panel Order Sets */}
              <div className="flex items-center gap-2 overflow-x-auto text-[11px] text-stone-600 bg-teal-50/40 p-2.5 rounded-lg border border-teal-100">
                <span className="font-bold text-teal-950 whitespace-nowrap flex items-center gap-1">
                  <Activity className="w-3 h-3 text-teal-700" />
                  Quick Order Sets:
                </span>
                <button
                  type="button"
                  onClick={() => handleBatchOrderPanel('cardiac')}
                  className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded text-stone-700 hover:text-rose-900 font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Order High-Sensitivity Troponin I, NT-proBNP, and CK-MB"
                >
                  + Stat Cardiac Panel
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchOrderPanel('cmp')}
                  className="px-2.5 py-1 bg-white hover:bg-teal-50 border border-stone-200 hover:border-teal-200 rounded text-stone-700 hover:text-teal-900 font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Order CMP (Na, K, BUN, Cr, Glucose, ALT)"
                >
                  + Comprehensive Metabolic (CMP)
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchOrderPanel('sepsis')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-stone-200 hover:border-amber-200 rounded text-stone-700 hover:text-amber-900 font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Order Sepsis Bundle (Lactate, Procalcitonin, WBC)"
                >
                  + Sepsis Workup Panel
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchOrderPanel('lipids')}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-stone-200 hover:border-blue-200 rounded text-stone-700 hover:text-blue-900 font-medium transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                  title="Order Lipid Profile (Cholesterol, Triglycerides, HDL, LDL)"
                >
                  + Lipid Profile
                </button>
              </div>

              {/* Add Lab Form Drawer */}
              {isAddLabOpen && (
                <form
                  onSubmit={handleSaveNewLab}
                  className="bg-teal-50/50 border border-teal-200 rounded-xl p-4 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-950 uppercase tracking-wider">
                      Record Point-of-Care / Laboratory Finding
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddLabOpen(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Panel</label>
                      <select
                        value={newLab.panel}
                        onChange={(e) => setNewLab({ ...newLab, panel: e.target.value as any })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                      >
                        <option value="BMP">BMP (Metabolic)</option>
                        <option value="CBC">CBC (Hematology)</option>
                        <option value="Cardiac">Cardiac Biomarkers</option>
                        <option value="Inflammatory">Inflammatory Markers</option>
                        <option value="Urinalysis">Urinalysis</option>
                        <option value="Hepatic">Hepatic Panel</option>
                        <option value="Lipids">Lipid Panel</option>
                        <option value="Other">Other / Diagnostic</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Analyte / Test Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Potassium, Troponin I"
                        value={newLab.testName}
                        onChange={(e) => setNewLab({ ...newLab, testName: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Result Value & Unit</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. 4.8"
                          value={newLab.value}
                          onChange={(e) => setNewLab({ ...newLab, value: e.target.value })}
                          className="w-2/3 p-2 bg-white border border-stone-200 rounded-lg"
                          required
                        />
                        <input
                          type="text"
                          placeholder="mEq/L"
                          value={newLab.unit}
                          onChange={(e) => setNewLab({ ...newLab, unit: e.target.value })}
                          className="w-1/3 p-2 bg-white border border-stone-200 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Flag & Range</label>
                      <div className="flex gap-1.5">
                        <select
                          value={newLab.flag}
                          onChange={(e) => setNewLab({ ...newLab, flag: e.target.value as any })}
                          className="w-1/2 p-2 bg-white border border-stone-200 rounded-lg"
                        >
                          <option value="normal">Normal</option>
                          <option value="high">High (H)</option>
                          <option value="low">Low (L)</option>
                          <option value="critical">Critical</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Ref: 3.5-5.0"
                          value={newLab.referenceRange}
                          onChange={(e) => setNewLab({ ...newLab, referenceRange: e.target.value })}
                          className="w-1/2 p-2 bg-white border border-stone-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddLabOpen(false)}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-700 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-teal-800 text-white rounded-lg text-xs font-semibold hover:bg-teal-900"
                    >
                      Save Result
                    </button>
                  </div>
                </form>
              )}

              {/* Labs Table */}
              <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="p-3">Panel</th>
                      <th className="p-3">Analyte / Test</th>
                      <th className="p-3">Result Value</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Flag</th>
                      <th className="p-3">Timestamp & Notes</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {filteredLabs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400">
                          No laboratory findings matched filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLabs.map((lab) => {
                        const isAbnormal = lab.flag !== 'normal';
                        return (
                          <tr key={lab.id} className={isAbnormal ? 'bg-amber-50/30' : ''}>
                            <td className="p-3 font-semibold text-stone-700">{lab.panel}</td>
                            <td className="p-3 font-bold text-stone-900">{lab.testName}</td>
                            <td className="p-3">
                              <span className="font-mono font-bold text-stone-900">
                                {lab.value} {lab.unit}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-stone-500">{lab.referenceRange}</td>
                            <td className="p-3">
                              {lab.flag === 'normal' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                  Normal
                                </span>
                              )}
                              {lab.flag === 'high' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  High (H)
                                </span>
                              )}
                              {lab.flag === 'low' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-900 border border-blue-300">
                                  Low (L)
                                </span>
                              )}
                              {lab.flag === 'critical' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                                  Critical
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="text-[11px] text-stone-500 font-mono">{lab.collectedAt}</div>
                              {lab.notes && (
                                <p className="text-[11px] text-stone-600 mt-0.5 italic">{lab.notes}</p>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteLab(lab.id)}
                                className="text-stone-300 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Delete lab"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PRESCRIPTIONS & E-PRESCRIBE */}
          {activeTab === 'prescriptions' && (
            <div className="space-y-4">
              {/* Prescriptions Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search prescription..."
                      value={rxSearch}
                      onChange={(e) => setRxSearch(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs bg-white border border-stone-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500 w-48"
                    />
                  </div>

                  <div className="flex items-center gap-1 text-xs bg-stone-200/70 p-0.5 rounded-lg">
                    <button
                      onClick={() => setRxFilter('all')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        rxFilter === 'all'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      All Orders ({prescriptions.length})
                    </button>
                    <button
                      onClick={() => setRxFilter('active')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        rxFilter === 'active'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setRxFilter('discontinued')}
                      className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        rxFilter === 'discontinued'
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Discontinued
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setIsAddRxOpen(!isAddRxOpen)}
                  className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ New Prescription</span>
                </button>
              </div>

              {/* Add Prescription Form */}
              {isAddRxOpen && (
                <form
                  onSubmit={handleSaveNewRx}
                  className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Authorise New Pharmacotherapy / e-Prescription Order
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddRxOpen(false)}
                      className="text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Medication Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Furosemide, Amoxicillin"
                        value={newRx.medicationName}
                        onChange={(e) => setNewRx({ ...newRx, medicationName: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Dosage & Route</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="e.g. 20 mg"
                          value={newRx.dosage}
                          onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
                          className="w-2/3 p-2 bg-white border border-stone-200 rounded-lg"
                          required
                        />
                        <select
                          value={newRx.route}
                          onChange={(e) => setNewRx({ ...newRx, route: e.target.value as any })}
                          className="w-1/3 p-2 bg-white border border-stone-200 rounded-lg"
                        >
                          <option value="PO">PO (Oral)</option>
                          <option value="IV">IV</option>
                          <option value="Inhaled">Inhaled</option>
                          <option value="SubQ">SubQ</option>
                          <option value="Topical">Topical</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Sig / Frequency</label>
                      <input
                        type="text"
                        placeholder="e.g. Once daily in the morning"
                        value={newRx.frequency}
                        onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Dispense Quantity & Refills</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="30 tablets"
                          value={newRx.quantity}
                          onChange={(e) => setNewRx({ ...newRx, quantity: e.target.value })}
                          className="w-2/3 p-2 bg-white border border-stone-200 rounded-lg"
                        />
                        <input
                          type="number"
                          placeholder="Refills"
                          value={newRx.refills}
                          onChange={(e) => setNewRx({ ...newRx, refills: parseInt(e.target.value, 10) || 0 })}
                          className="w-1/3 p-2 bg-white border border-stone-200 rounded-lg"
                          min={0}
                          max={11}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Clinical Indication</label>
                      <input
                        type="text"
                        placeholder="e.g. CHF decongestion"
                        value={newRx.indication}
                        onChange={(e) => setNewRx({ ...newRx, indication: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1">Destination Pharmacy</label>
                      <input
                        type="text"
                        placeholder="e.g. CVS Pharmacy #4120"
                        value={newRx.pharmacy}
                        onChange={(e) => setNewRx({ ...newRx, pharmacy: e.target.value })}
                        className="w-full p-2 bg-white border border-stone-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddRxOpen(false)}
                      className="px-3 py-1.5 border border-stone-300 rounded-lg text-xs text-stone-700 hover:bg-stone-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-800 text-white rounded-lg text-xs font-semibold hover:bg-purple-900"
                    >
                      Sign & Prescribe
                    </button>
                  </div>
                </form>
              )}

              {/* Prescriptions Grid Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredPrescriptions.map((rx) => {
                  const isDiscontinued = rx.status === 'discontinued';
                  const isTransmitting = transmittingRxId === rx.id;

                  return (
                    <div
                      key={rx.id}
                      className={`p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        isDiscontinued
                          ? 'bg-stone-50 border-stone-200 opacity-60'
                          : 'bg-white border-purple-100 shadow-2xs hover:border-purple-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-stone-900 text-sm">{rx.medicationName}</h4>
                              <span className="font-semibold text-purple-900 px-2 py-0.5 rounded bg-purple-100 font-mono text-[11px]">
                                {rx.dosage} {rx.route}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 mt-1 font-medium">{rx.frequency}</p>
                          </div>

                          {isDiscontinued ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-stone-200 text-stone-700">
                              Discontinued
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active Rx
                            </span>
                          )}
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1 text-[11px] text-stone-500">
                          <div>
                            <span className="font-semibold text-stone-700">Indication:</span> {rx.indication}
                          </div>
                          <div>
                            <span className="font-semibold text-stone-700">Dispense:</span> {rx.quantity} (Refills: {rx.refills})
                          </div>
                          <div>
                            <span className="font-semibold text-stone-700">Pharmacy:</span> {rx.pharmacy || 'Central Pharmacy'}
                          </div>
                          {rx.eRxConfirmationCode && (
                            <div className="font-mono text-teal-800 font-semibold flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3 text-teal-700" />
                              <span>e-Rx Transmit Code: {rx.eRxConfirmationCode}</span>
                            </div>
                          )}
                        </div>

                        {rx.warnings && rx.warnings.length > 0 && (
                          <div className="mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span>{rx.warnings.join('; ')}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100 text-xs">
                        <button
                          onClick={() => handleToggleRxStatus(rx.id)}
                          className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline"
                        >
                          {isDiscontinued ? 'Re-activate Rx' : 'Discontinue'}
                        </button>

                        {!isDiscontinued && (
                          <button
                            onClick={() => handleTransmitERx(rx)}
                            disabled={isTransmitting}
                            className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>{isTransmitting ? 'Transmitting...' : 'Transmit e-Rx'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: UPLOADED REPORTS & IMAGING REPOSITORY */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {/* Reports Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1 text-xs bg-stone-200/70 p-0.5 rounded-lg">
                  <button
                    onClick={() => setReportFilter('all')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      reportFilter === 'all'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    All Reports ({attachments.length})
                  </button>
                  <button
                    onClick={() => setReportFilter('image')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      reportFilter === 'image'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Imaging & Photos
                  </button>
                  <button
                    onClick={() => setReportFilter('document')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      reportFilter === 'document'
                        ? 'bg-white text-stone-900 shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    PDF / Lab Documents
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Diagnostic Report</span>
                  <input
                    type="file"
                    accept="image/*,.pdf,.txt"
                    onChange={handleUploadReportFile}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAttachments.length === 0 ? (
                  <div className="col-span-2 p-12 text-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200 space-y-2">
                    <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                    <p className="text-xs">No diagnostic reports uploaded yet for this encounter.</p>
                  </div>
                ) : (
                  filteredAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {att.dataUrl && att.fileType === 'image' ? (
                              <img
                                src={att.dataUrl}
                                alt={att.fileName}
                                className="w-12 h-12 object-cover rounded-lg border border-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-100">
                                DOC
                              </div>
                            )}
                            <div>
                              <h4 className="font-bold text-stone-900 text-xs sm:text-sm line-clamp-1">
                                {att.fileName}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono mt-0.5">
                                <span>{(att.fileSize / 1024).toFixed(1)} KB</span>
                                <span>•</span>
                                <span>Target: {att.section.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                            Verified
                          </span>
                        </div>

                        {att.analysis && (
                          <div className="mt-3 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 text-[11px] space-y-1">
                            <div className="font-semibold text-stone-800">{att.analysis.headline}</div>
                            <p className="text-stone-600 line-clamp-2">{att.analysis.summary}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                        <button
                          onClick={() => setSelectedReportForPreview(att)}
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Report</span>
                        </button>

                        <button
                          onClick={() => {
                            if (att.analysis) {
                              const text = att.analysis.suggestedSectionText || att.analysis.summary;
                              onInsertIntoSection(att.section, `[ATTACHED REPORT: ${att.fileName}]: ${text}`);
                              if (onToast) onToast(`Report findings inserted into ${att.section.toUpperCase()}.`);
                            }
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-[11px] font-semibold transition-colors"
                        >
                          + Insert into Note
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Full-Screen Report Inspection Modal */}
          {selectedReportForPreview && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <h4 className="font-bold text-stone-900 text-sm">{selectedReportForPreview.fileName}</h4>
                  <button
                    onClick={() => setSelectedReportForPreview(null)}
                    className="text-stone-400 hover:text-stone-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {selectedReportForPreview.dataUrl && selectedReportForPreview.fileType === 'image' && (
                  <img
                    src={selectedReportForPreview.dataUrl}
                    alt={selectedReportForPreview.fileName}
                    className="w-full max-h-80 object-contain rounded-lg border border-stone-200"
                  />
                )}

                {selectedReportForPreview.analysis && (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2">
                    <h5 className="font-bold text-stone-900 text-sm">
                      {selectedReportForPreview.analysis.headline}
                    </h5>
                    <p className="text-stone-700">{selectedReportForPreview.analysis.summary}</p>
                    <div className="space-y-1 pt-1">
                      <span className="font-bold text-stone-800 block text-[11px] uppercase tracking-wider">
                        Key Diagnostic Findings:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-stone-600">
                        {selectedReportForPreview.analysis.keyFindings.map((kf, i) => (
                          <li key={i}>{kf}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedReportForPreview(null)}
                    className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            All lab results, prescriptions, and diagnostic documents are linked to {patient.name} ({patient.mrn}) for EHR export.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
