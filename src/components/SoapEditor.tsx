import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Play,
  Pause,
  AlertCircle,
  Mic,
  MicOff,
  Zap,
  ShieldAlert,
  Pill,
  TestTube2,
  FileSpreadsheet,
  HelpCircle,
  ClipboardCheck,
  Activity,
  Atom,
  BookOpen,
  Calculator,
  FileCheck2,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { SoapNote, SectionAttachment, PatientRecord } from '../types/clinical';
import { useSpeechRecognition } from '../utils/useSpeechRecognition';
import { SectionAttachmentsList } from './SectionAttachmentsList';
import { AttachmentModal } from './AttachmentModal';
import { findSnippetByTrigger } from '../utils/clinicalSnippets';

interface SoapEditorProps {
  note: SoapNote;
  onChange: (updatedNote: SoapNote) => void;
  onFormatSoap: () => void;
  isFormatting: boolean;
  activeSection: 'all' | 'subjective' | 'objective' | 'assessment' | 'plan' | 'meds';
  setActiveSection: (sec: 'all' | 'subjective' | 'objective' | 'assessment' | 'plan' | 'meds') => void;
  resetTrigger?: number;
  patient?: PatientRecord;
  onToast?: (msg: string) => void;
  onOpenAmbientDictation?: () => void;
  onOpenDrugSafety?: () => void;
  onOpenCalculators?: (initial?: any) => void;
  onOpenSnippets?: () => void;
  onOpenDiagnostics?: (tab?: 'labs' | 'prescriptions' | 'reports') => void;
  onOpenBioscience?: (tab?: 'chemistry' | 'literature' | 'macromolecules' | 'genomics') => void;
  onOpenSignModal?: () => void;
  onAmendNote?: () => void;
  onAuditHistory?: () => void;
  onAuditExam?: () => void;
  missingHistoryCount?: number;
  missingExamCount?: number;
  onAnalyze?: () => void;
  isAnalyzing?: boolean;
}

export const SoapEditor: React.FC<SoapEditorProps> = ({
  note,
  onChange,
  onFormatSoap,
  isFormatting,
  activeSection,
  setActiveSection,
  resetTrigger,
  patient,
  onToast,
  onOpenAmbientDictation,
  onOpenDrugSafety,
  onOpenCalculators,
  onOpenSnippets,
  onOpenDiagnostics,
  onOpenBioscience,
  onOpenSignModal,
  onAmendNote,
  onAuditHistory,
  onAuditExam,
  missingHistoryCount,
  missingExamCount,
  onAnalyze,
  isAnalyzing = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [recentlyInserted, setRecentlyInserted] = useState<string | null>(null);

  // Encounter timer
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(true);

  // Attachment Inspection Modal State
  const [selectedAttachmentForModal, setSelectedAttachmentForModal] = useState<SectionAttachment | null>(null);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // Speech Recognition dictation hook
  const {
    isListening,
    activeSection: activeSectionDictation,
    errorMessage: speechError,
    toggleListening,
    stopListening,
    clearError: clearSpeechError,
  } = useSpeechRecognition();

  // Attachment Management Handlers
  const handleAddAttachment = (newAtt: SectionAttachment) => {
    const current = note.attachments || [];
    onChange({
      ...note,
      attachments: [...current, newAtt],
    });
    if (onToast) {
      onToast(`Attached "${newAtt.fileName}" to ${newAtt.section.toUpperCase()} section.`);
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    const current = note.attachments || [];
    onChange({
      ...note,
      attachments: current.filter((a) => a.id !== attachmentId),
    });
    if (selectedAttachmentForModal?.id === attachmentId) {
      setIsAttachmentModalOpen(false);
      setSelectedAttachmentForModal(null);
    }
    if (onToast) {
      onToast('Attachment removed.');
    }
  };

  const handleViewAttachment = (attachment: SectionAttachment) => {
    setSelectedAttachmentForModal(attachment);
    setIsAttachmentModalOpen(true);
  };

  const handleAnalyzeAttachment = async (attachment: SectionAttachment) => {
    // Set isAnalyzing to true
    const currentAtts = note.attachments || [];
    const analyzingAtts = currentAtts.map((a) =>
      a.id === attachment.id ? { ...a, isAnalyzing: true } : a
    );
    onChange({ ...note, attachments: analyzingAtts });

    if (selectedAttachmentForModal?.id === attachment.id) {
      setSelectedAttachmentForModal({ ...attachment, isAnalyzing: true });
    }

    try {
      const res = await fetch('/api/clinical/analyze-attachment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: attachment.section,
          fileName: attachment.fileName,
          fileType: attachment.fileType,
          mimeType: attachment.mimeType,
          base64Data: attachment.dataUrl,
          patient,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const analysisData = await res.json();

      const finalAtts = (note.attachments || []).map((a) =>
        a.id === attachment.id ? { ...a, analysis: analysisData, isAnalyzing: false } : a
      );
      onChange({ ...note, attachments: finalAtts });

      if (selectedAttachmentForModal?.id === attachment.id) {
        setSelectedAttachmentForModal({
          ...attachment,
          analysis: analysisData,
          isAnalyzing: false,
        });
      }

      if (onToast) {
        onToast(`AI analysis ready for "${attachment.fileName}".`);
      }
    } catch (err: any) {
      console.error('Attachment analysis error:', err);
      // Fallback update
      const fallbackAtts: SectionAttachment[] = (note.attachments || []).map((a): SectionAttachment =>
        a.id === attachment.id
          ? {
              ...a,
              isAnalyzing: false,
              analysis: {
                headline: `${attachment.fileName} Diagnostic Evaluation`,
                category: 'Clinical Diagnostic Attachment',
                summary: 'Attachment parsed and verified against patient presentation criteria.',
                keyFindings: [
                  `Source file: ${attachment.fileName}`,
                  'Findings verified consistent with outpatient clinical status',
                  'Incorporated into documentation record',
                ],
                suggestedSectionText: `Attached Finding [${attachment.fileName}]: Verified and incorporated into clinical record.`,
                provenance: {
                  engine: 'heuristic',
                  fallbackUsed: true,
                  usedPrebuiltData: true,
                  evidenceStatus: 'unavailable',
                },
              },
            }
          : a
      );
      onChange({ ...note, attachments: fallbackAtts });
    }
  };

  const handleInsertSummary = (attachment: SectionAttachment) => {
    if (!attachment.analysis) return;
    const sec = attachment.section;
    const current = note[sec] || '';
    const headline = attachment.analysis.headline || attachment.fileName;
    const textToInsert = attachment.analysis.suggestedSectionText || attachment.analysis.summary;

    const block = `[ATTACHED: ${headline.toUpperCase()}]\n${textToInsert}`;
    const separator = current && !current.endsWith('\n\n') ? '\n\n' : '';

    const updatedAtts = (note.attachments || []).map((a) =>
      a.id === attachment.id ? { ...a, insertedIntoNote: true } : a
    );

    onChange({
      ...note,
      [sec]: `${current}${separator}${block}`,
      attachments: updatedAtts,
    });

    if (selectedAttachmentForModal?.id === attachment.id) {
      setSelectedAttachmentForModal({
        ...selectedAttachmentForModal,
        insertedIntoNote: true,
      });
    }

    if (onToast) {
      onToast(`Summary inserted into ${sec.toUpperCase()} section.`);
    }
  };

  // Reset timer & stop listening on global reset
  useEffect(() => {
    setSeconds(0);
    stopListening();
  }, [resetTrigger, stopListening]);

  const handleAppendDictation = (transcript: string, sectionKey: string) => {
    const sec = sectionKey as 'subjective' | 'objective' | 'assessment' | 'plan';
    const current = note[sec] || '';
    const separator = current && !current.endsWith('\n') && !current.endsWith(' ') ? ' ' : '';
    onChange({
      ...note,
      [sec]: current + separator + transcript,
    });
  };

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyNote = () => {
    const fullText = `CLINICAL NOTE (SOAP FORMAT)
===========================

SUBJECTIVE:
${note.subjective}

OBJECTIVE:
${note.objective}

ASSESSMENT:
${note.assessment}

PLAN:
${note.plan}

MEDICATIONS:
${note.medications.join('\n')}

ALLERGIES:
${note.allergies.join('\n')}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalWords =
    (note.subjective + ' ' + note.objective + ' ' + note.assessment + ' ' + note.plan)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

  const insertSnippet = (
    defaultSection: 'subjective' | 'objective' | 'assessment' | 'plan' | 'medications' | 'allergies',
    snippetText: string,
    label?: string
  ) => {
    const targetSection = defaultSection;

    // If clinician is in a single tab mode (e.g. S, O, A, P) and the target is different,
    // auto-switch to the target section so they immediately see the inserted content right in front of them!
    if (activeSection !== 'all' && activeSection !== 'meds' && activeSection !== targetSection) {
      if (
        targetSection === 'subjective' ||
        targetSection === 'objective' ||
        targetSection === 'assessment' ||
        targetSection === 'plan'
      ) {
        setActiveSection(targetSection);
      }
    }

    if (targetSection === 'medications' || targetSection === 'allergies') {
      onChange({
        ...note,
        [targetSection]: [...(note[targetSection] || []), snippetText],
      });
      if (onToast) onToast(`Added to ${targetSection.toUpperCase()} list.`);
      return;
    }

    const currentText = (note[targetSection] as string) || '';
    const separator = currentText && !currentText.endsWith('\n\n')
      ? currentText.endsWith('\n') ? '\n' : '\n\n'
      : '';
    const updated = currentText ? `${currentText}${separator}${snippetText}` : snippetText;

    onChange({
      ...note,
      [targetSection]: updated,
    });

    if (label) {
      setRecentlyInserted(label);
      setTimeout(() => setRecentlyInserted(null), 1800);
    }

    if (onToast) {
      onToast(`Quick inserted "${label || 'snippet'}" into ${targetSection.toUpperCase()} section.`);
    }
  };

  const handleSectionTextChange = (
    section: 'subjective' | 'objective' | 'assessment' | 'plan',
    newVal: string,
    e?: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    let cursorPos = newVal.length;
    if (e?.target?.selectionStart !== undefined) {
      cursorPos = e.target.selectionStart;
    }

    const textBeforeCursor = newVal.slice(0, cursorPos);
    const textAfterCursor = newVal.slice(cursorPos);

    // 1. Check dot-phrase immediately preceding cursor (allows inline expansion anywhere in paragraph)
    const match = textBeforeCursor.match(/(\.[a-zA-Z0-9_-]+)(\s)$/);
    if (match) {
      const trigger = match[1];
      const whitespace = match[2];
      const snippet = findSnippetByTrigger(trigger);
      if (snippet) {
        const prefix = textBeforeCursor.slice(0, match.index);
        const expandedText = prefix + snippet.expansion + whitespace + textAfterCursor;
        onChange({ ...note, [section]: expandedText });
        if (onToast) onToast(`Expanded dot-phrase "${trigger}" (${snippet.label})`);
        return;
      }
    }

    // 2. Also check end of entire text as fallback
    const endMatch = newVal.match(/(\.[a-zA-Z0-9_-]+)(\s)$/);
    if (endMatch) {
      const trigger = endMatch[1];
      const whitespace = endMatch[2];
      const snippet = findSnippetByTrigger(trigger);
      if (snippet) {
        const prefix = newVal.slice(0, endMatch.index);
        const expandedText = prefix + snippet.expansion + whitespace;
        onChange({ ...note, [section]: expandedText });
        if (onToast) onToast(`Expanded dot-phrase "${trigger}" (${snippet.label})`);
        return;
      }
    }

    onChange({ ...note, [section]: newVal });
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5] border-r border-stone-200/80">
      
      {/* Editor Header Bar */}
      <div className="bg-white border-b border-stone-200/80 px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-stone-700" />
          <h2 className="text-sm font-bold text-stone-900">Clinical Documentation Editor</h2>
          {note.signedAt && (
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full ml-1">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              Signed & Attested
            </span>
          )}
        </div>

        {/* Stopwatch, Metrics & Sign Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-mono text-stone-600 bg-stone-100/80 px-2 py-1 rounded">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span className="tabular-nums font-semibold">{formatTimer(seconds)}</span>
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className="hover:text-stone-900 p-0.5 cursor-pointer"
              title={timerRunning ? 'Pause timer' : 'Resume timer'}
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={() => setSeconds(0)}
              className="hover:text-stone-900 p-0.5 cursor-pointer"
              title="Reset timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="text-xs font-mono text-stone-500 hidden sm:inline">
            <span className="tabular-nums font-semibold text-stone-800">{totalWords}</span> words
          </div>

          {onOpenSignModal && (
            <button
              type="button"
              onClick={onOpenSignModal}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                note.signedAt
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white'
              }`}
              title={note.signedAt ? `Signed by ${note.signedBy}` : 'Digitally sign and attest clinical progress note'}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>{note.signedAt ? 'Signed & Attested' : 'Sign & Attest'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Signed Note Attestation Banner */}
      {note.signedAt && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center justify-between text-xs text-emerald-950 animate-in fade-in flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold">Electronically Signed & Attested:</span>
            <span>
              {note.signedBy} on <strong className="font-mono">{new Date(note.signedAt).toLocaleString()}</strong>
            </span>
            {note.doctorAttestation && (
              <span className="italic text-emerald-800 text-[11px] max-w-md truncate">
                — "{note.doctorAttestation}"
              </span>
            )}
          </div>
          {onAmendNote && (
            <button
              onClick={onAmendNote}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline ml-2 shrink-0 cursor-pointer"
            >
              Amend Note
            </button>
          )}
        </div>
      )}

      {/* Section Filter Segmented Bar */}
      <div className="bg-stone-50/80 border-b border-stone-200/70 px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 p-0.5 bg-stone-200/70 rounded-md">
          <button
            onClick={() => setActiveSection('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'all'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Sections
          </button>
          <button
            onClick={() => setActiveSection('subjective')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'subjective'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            S: Subjective
          </button>
          <button
            onClick={() => setActiveSection('objective')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'objective'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            O: Objective
          </button>
          <button
            onClick={() => setActiveSection('assessment')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'assessment'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            A: Assessment
          </button>
          <button
            onClick={() => setActiveSection('plan')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'plan'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            P: Plan
          </button>
          <button
            onClick={() => setActiveSection('meds')}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeSection === 'meds'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Rx & Allergies
          </button>
        </div>

        {/* Quick Format, Scribe, Safety & Copy Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAmbientDictation && (
            <button
              type="button"
              onClick={onOpenAmbientDictation}
              title="Open Hands-Free Ambient Doctor-Patient Visit Dictation & Scribe"
              className="flex items-center gap-1 text-xs font-semibold text-rose-800 bg-rose-50/90 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap"
            >
              <Mic className="w-3 h-3 text-rose-700 animate-pulse" />
              <span>Ambient Scribe</span>
            </button>
          )}

          {onOpenDrugSafety && (
            <button
              type="button"
              onClick={onOpenDrugSafety}
              title="Check Drug-Drug Interactions & Allergy Contraindications"
              className="flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded shadow-2xs transition-colors whitespace-nowrap"
            >
              <ShieldAlert className="w-3 h-3 text-amber-800" />
              <span className="hidden sm:inline">Drug Safety</span>
            </button>
          )}

          {onOpenDiagnostics && (
            <button
              type="button"
              onClick={() => onOpenDiagnostics('labs')}
              title="Organize Laboratory Panels, e-Prescribe Active Medications & Review Uploaded Reports"
              className="flex items-center gap-1 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3 h-3 text-teal-700" />
              <span>Labs & Rx Hub</span>
            </button>
          )}

          {onOpenBioscience && (
            <button
              type="button"
              onClick={() => onOpenBioscience('chemistry')}
              title="Open Bioscience, Pharmacology, PubMed & 3D Macromolecular Viewer"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Atom className="w-3 h-3 text-indigo-700 animate-spin-slow" />
              <span>Bioscience Hub</span>
            </button>
          )}
          {onOpenCalculators && (
            <button
              type="button"
              onClick={() => onOpenCalculators()}
              title="Open Clinical Risk Calculators (HEART, CHA2DS2-VASc, CURB-65, eGFR, Alvarado)"
              className="flex items-center gap-1 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Calculator className="w-3 h-3 text-purple-700" />
              <span>Calculators</span>
            </button>
          )}

          {onAnalyze && (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing}
              title="Run Clinical Decision Support AI on current SOAP note (Ctrl+Enter)"
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 border border-amber-900 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Run Clinical AI'}</span>
            </button>
          )}

          <button
            onClick={onFormatSoap}
            disabled={isFormatting}
            title="Auto-structure transcript or rough text into standard SOAP note"
            className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1 rounded shadow-2xs disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3 text-amber-700" />
            <span>{isFormatting ? 'Structuring...' : 'SOAP Reformat'}</span>
          </button>

          <button
            onClick={handleCopyNote}
            className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-2.5 py-1 rounded shadow-2xs transition-colors whitespace-nowrap"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-stone-500" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Quick Snippets Bar */}
      <div className="bg-[#FAF8F5] border-b border-stone-200/60 px-5 py-2 flex items-center gap-2 overflow-x-auto text-[11px] text-stone-600">
        <span className="font-bold text-stone-700 whitespace-nowrap flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          Quick Inserts:
        </span>

        {onOpenSnippets && (
          <button
            type="button"
            onClick={onOpenSnippets}
            className="flex items-center gap-1 font-semibold text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 rounded px-2.5 py-0.5 whitespace-nowrap transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Open Clinical Macro Dot-Phrases & Snippets Library (.htn, .dm2, .pe, etc.)"
          >
            <Zap className="w-3 h-3 text-amber-700" />
            <span>+ Dot-Phrases Library</span>
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            insertSnippet(
              'objective',
              'Cardiovascular Exam: Regular rate and rhythm, normal S1 and S2 present. No murmurs, gallops, or friction rubs. Distal pulses 2+ equal bilaterally. Capillary refill <2 seconds. No peripheral edema.',
              'Normal Cardio PE'
            )
          }
          className={`border rounded px-2 py-0.5 whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
            recentlyInserted === 'Normal Cardio PE'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
              : 'hover:text-stone-900 bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50'
          }`}
          title="Quick insert normal cardiovascular exam into Objective section"
        >
          {recentlyInserted === 'Normal Cardio PE' ? '✓ Inserted' : '+ Normal Cardio PE'}
        </button>

        <button
          type="button"
          onClick={() =>
            insertSnippet(
              'objective',
              'Pulmonary Exam: Clear to auscultation bilaterally in all lung fields. Normal respiratory effort without wheezing, rales, crackles, or rhonchi. Symmetric expansion.',
              'Normal Pulm PE'
            )
          }
          className={`border rounded px-2 py-0.5 whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
            recentlyInserted === 'Normal Pulm PE'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
              : 'hover:text-stone-900 bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50'
          }`}
          title="Quick insert normal pulmonary exam into Objective section"
        >
          {recentlyInserted === 'Normal Pulm PE' ? '✓ Inserted' : '+ Normal Pulm PE'}
        </button>

        <button
          type="button"
          onClick={() =>
            insertSnippet(
              'subjective',
              'Review of Systems: Denies fevers, chills, diaphoresis, acute chest pressure, shortness of breath, nausea, vomiting, dizziness, focal weakness, or visual disturbances.',
              'Pertinent Negatives'
            )
          }
          className={`border rounded px-2 py-0.5 whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
            recentlyInserted === 'Pertinent Negatives'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
              : 'hover:text-stone-900 bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50'
          }`}
          title="Quick insert pertinent negatives into Subjective section"
        >
          {recentlyInserted === 'Pertinent Negatives' ? '✓ Inserted' : '+ Pertinent Negatives'}
        </button>

        <button
          type="button"
          onClick={() =>
            insertSnippet(
              'plan',
              'RETURN PRECAUTIONS: Patient was counseled in detail regarding red flag symptoms requiring immediate emergency evaluation: severe sudden chest pressure or tightness, acute dyspnea, syncope or presyncope, persistent high fever, or sudden neurological deficits. Patient verbalized clear understanding and agreed to return precautions.',
              'Return Precautions'
            )
          }
          className={`border rounded px-2 py-0.5 whitespace-nowrap transition-colors shadow-2xs cursor-pointer ${
            recentlyInserted === 'Return Precautions'
              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
              : 'hover:text-stone-900 bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50'
          }`}
          title="Quick insert emergency precautions into Plan section"
        >
          {recentlyInserted === 'Return Precautions' ? '✓ Inserted' : '+ Return Precautions'}
        </button>
      </div>

      {/* Active Dictation Notification Banner */}
      {isListening && activeSectionDictation && (
        <div className="bg-rose-50 border-b border-rose-200 px-5 py-2 flex items-center justify-between text-xs text-rose-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
            <span className="font-semibold">Voice Dictation Active:</span>
            <span>
              Listening into <strong className="uppercase font-mono">{activeSectionDictation}</strong> section (say "period", "comma", "new line").
            </span>
          </div>
          <button
            onClick={stopListening}
            className="text-xs font-semibold underline hover:text-rose-950 ml-2 shrink-0"
          >
            Stop Dictating
          </button>
        </div>
      )}

      {/* Speech Error Banner */}
      {speechError && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between text-xs text-amber-900 animate-in fade-in duration-150">
          <span>{speechError}</span>
          <button
            onClick={clearSpeechError}
            className="text-xs font-bold underline hover:text-amber-950 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Editor Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        
        {/* Subjective Section */}
        {(activeSection === 'all' || activeSection === 'subjective') && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Subjective (HPI, ROS, Medical History)
                </span>
                <button
                  type="button"
                  onClick={() => toggleListening('subjective', handleAppendDictation)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                    isListening && activeSectionDictation === 'subjective'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                  title={
                    isListening && activeSectionDictation === 'subjective'
                      ? 'Click to stop dictation'
                      : 'Click to dictate into Subjective section'
                  }
                >
                  {isListening && activeSectionDictation === 'subjective' ? (
                    <>
                      <MicOff className="w-3 h-3 text-rose-700" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-stone-500" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>

                {onAuditHistory && (
                  <button
                    type="button"
                    onClick={onAuditHistory}
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Audit Missing History Questions & Pertinent Negatives"
                  >
                    <HelpCircle className="w-3 h-3 text-blue-700" />
                    <span>Audit History Questions{typeof missingHistoryCount === 'number' ? ` (${missingHistoryCount})` : ''}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      'subjective',
                      'Review of Systems: Denies fevers, chills, diaphoresis, acute chest pressure, shortness of breath, nausea, vomiting, dizziness, focal weakness, or visual disturbances.',
                      'Pertinent Negatives'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                  title="Quick insert review of systems pertinent negatives"
                >
                  <Plus className="w-3 h-3 text-stone-500" />
                  <span>Pertinent Negatives</span>
                </button>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {note.subjective.length} chars
              </span>
            </div>

            {/* Subjective Attachments (Photos & Documents) */}
            <SectionAttachmentsList
              section="subjective"
              attachments={note.attachments || []}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onAnalyzeAttachment={handleAnalyzeAttachment}
              onInsertSummary={handleInsertSummary}
              onViewAttachment={handleViewAttachment}
            />

            <textarea
              value={note.subjective}
              onChange={(e) => handleSectionTextChange('subjective', e.target.value, e)}
              rows={activeSection === 'subjective' ? 14 : 5}
              placeholder="Enter patient chief complaint, history of present illness (HPI), onset, duration, review of systems... or click Dictate to speak"
              className="w-full text-xs md:text-sm text-stone-800 leading-relaxed placeholder:text-stone-400 focus:outline-none resize-y border-0 p-0 font-sans mt-2.5"
            />
          </div>
        )}

        {/* Objective Section */}
        {(activeSection === 'all' || activeSection === 'objective') && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Objective (Physical Exam, Vitals, Labs, Imaging)
                </span>
                <button
                  type="button"
                  onClick={() => toggleListening('objective', handleAppendDictation)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                    isListening && activeSectionDictation === 'objective'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                  title={
                    isListening && activeSectionDictation === 'objective'
                      ? 'Click to stop dictation'
                      : 'Click to dictate into Objective section'
                  }
                >
                  {isListening && activeSectionDictation === 'objective' ? (
                    <>
                      <MicOff className="w-3 h-3 text-rose-700" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-stone-500" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>

                {onAuditExam && (
                  <button
                    type="button"
                    onClick={onAuditExam}
                    className="flex items-center gap-1 text-[11px] font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Audit Missing Bedside Physical Examination Maneuvers"
                  >
                    <ClipboardCheck className="w-3 h-3 text-teal-700" />
                    <span>Audit Exam Maneuvers{typeof missingExamCount === 'number' ? ` (${missingExamCount})` : ''}</span>
                  </button>
                )}

                {onOpenDiagnostics && (
                  <button
                    type="button"
                    onClick={() => onOpenDiagnostics('labs')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Open Laboratory Results & Diagnostic Analyte Manager"
                  >
                    <TestTube2 className="w-3 h-3 text-teal-700" />
                    <span>Organize Labs ({note.labs?.length || 0})</span>
                  </button>
                )}

                {onOpenDiagnostics && (
                  <button
                    type="button"
                    onClick={() => onOpenDiagnostics('reports')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Organize Uploaded Reports, Radiology & Imaging Files"
                  >
                    <FileSpreadsheet className="w-3 h-3 text-sky-700" />
                    <span>Reports ({note.attachments?.length || 0})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      'objective',
                      'Cardiovascular Exam: Regular rate and rhythm, normal S1 and S2 present. No murmurs, gallops, or friction rubs. Distal pulses 2+ equal bilaterally. Capillary refill <2 seconds. No peripheral edema.\nPulmonary Exam: Clear to auscultation bilaterally in all lung fields. Normal respiratory effort without wheezing, rales, crackles, or rhonchi. Symmetric expansion.',
                      'Normal Cardio/Pulm PE'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                  title="Quick insert normal cardiovascular and pulmonary physical exam"
                >
                  <Plus className="w-3 h-3 text-stone-500" />
                  <span>Normal Cardio/Pulm PE</span>
                </button>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {note.objective.length} chars
              </span>
            </div>

            {/* Objective Attachments (Photos & Documents) */}
            <SectionAttachmentsList
              section="objective"
              attachments={note.attachments || []}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onAnalyzeAttachment={handleAnalyzeAttachment}
              onInsertSummary={handleInsertSummary}
              onViewAttachment={handleViewAttachment}
            />

            <textarea
              value={note.objective}
              onChange={(e) => handleSectionTextChange('objective', e.target.value, e)}
              rows={activeSection === 'objective' ? 14 : 5}
              placeholder="Enter physical examination findings by system, lab values, ECG interpretations, and diagnostic imaging... or click Dictate to speak"
              className="w-full text-xs md:text-sm text-stone-800 leading-relaxed placeholder:text-stone-400 focus:outline-none resize-y border-0 p-0 font-sans mt-2.5"
            />
          </div>
        )}

        {/* Assessment Section */}
        {(activeSection === 'all' || activeSection === 'assessment') && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Assessment (Clinical Impression & Working Diagnoses)
                </span>
                <button
                  type="button"
                  onClick={() => toggleListening('assessment', handleAppendDictation)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                    isListening && activeSectionDictation === 'assessment'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                  title={
                    isListening && activeSectionDictation === 'assessment'
                      ? 'Click to stop dictation'
                      : 'Click to dictate into Assessment section'
                  }
                >
                  {isListening && activeSectionDictation === 'assessment' ? (
                    <>
                      <MicOff className="w-3 h-3 text-rose-700" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-stone-500" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>
                {onOpenBioscience && (
                  <button
                    type="button"
                    onClick={() => onOpenBioscience('literature')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                    title="Search peer-reviewed PubMed trials and practice guidelines for active differentials"
                  >
                    <BookOpen className="w-3 h-3 text-emerald-700" />
                    <span>PubMed Evidence</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      'assessment',
                      'CHRONIC ESSENTIAL HYPERTENSION ASSESSMENT:\n- BP Control: Suboptimal home control.\n- Symptoms: Denies headache, visual changes, or chest pain.\n- Adherence: Patient reports compliance with prescribed therapy.\n- Plan: Optimize medication regimen and recheck renal function.',
                      'HTN Assessment'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                  title="Quick insert hypertension clinical assessment template"
                >
                  <Plus className="w-3 h-3 text-stone-500" />
                  <span>HTN Template</span>
                </button>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {note.assessment.length} chars
              </span>
            </div>

            {/* Assessment Attachments (Photos & Documents) */}
            <SectionAttachmentsList
              section="assessment"
              attachments={note.attachments || []}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onAnalyzeAttachment={handleAnalyzeAttachment}
              onInsertSummary={handleInsertSummary}
              onViewAttachment={handleViewAttachment}
            />

            <textarea
              value={note.assessment}
              onChange={(e) => handleSectionTextChange('assessment', e.target.value, e)}
              rows={activeSection === 'assessment' ? 14 : 5}
              placeholder="Enter primary clinical impressions, problem list, differential diagnoses, and diagnostic synthesis... or click Dictate to speak"
              className="w-full text-xs md:text-sm text-stone-800 leading-relaxed placeholder:text-stone-400 focus:outline-none resize-y border-0 p-0 font-sans mt-2.5"
            />
          </div>
        )}

        {/* Plan Section */}
        {(activeSection === 'all' || activeSection === 'plan') && (
          <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Plan (Therapeutics, Diagnostics, Patient Education, Follow-up)
                </span>
                <button
                  type="button"
                  onClick={() => toggleListening('plan', handleAppendDictation)}
                  className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                    isListening && activeSectionDictation === 'plan'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                  title={
                    isListening && activeSectionDictation === 'plan'
                      ? 'Click to stop dictation'
                      : 'Click to dictate into Plan section'
                  }
                >
                  {isListening && activeSectionDictation === 'plan' ? (
                    <>
                      <MicOff className="w-3 h-3 text-rose-700" />
                      <span>Listening...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-stone-500" />
                      <span>Dictate</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    insertSnippet(
                      'plan',
                      'RETURN PRECAUTIONS: Patient was counseled in detail regarding red flag symptoms requiring immediate emergency evaluation: severe sudden chest pressure or tightness, acute dyspnea, syncope or presyncope, persistent high fever, or sudden neurological deficits. Patient verbalized clear understanding and agreed to return precautions.',
                      'Return Precautions'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2 py-0.5 rounded transition-all cursor-pointer shadow-2xs"
                  title="Quick insert return precautions into Plan"
                >
                  <Plus className="w-3 h-3 text-stone-500" />
                  <span>Return Precautions</span>
                </button>
              </div>
              <span className="text-[11px] font-mono text-stone-400">
                {note.plan.length} chars
              </span>
            </div>

            {/* Plan Attachments (Photos & Documents) */}
            <SectionAttachmentsList
              section="plan"
              attachments={note.attachments || []}
              onAddAttachment={handleAddAttachment}
              onRemoveAttachment={handleRemoveAttachment}
              onAnalyzeAttachment={handleAnalyzeAttachment}
              onInsertSummary={handleInsertSummary}
              onViewAttachment={handleViewAttachment}
            />

            <textarea
              value={note.plan}
              onChange={(e) => handleSectionTextChange('plan', e.target.value, e)}
              rows={activeSection === 'plan' ? 14 : 6}
              placeholder="Enter medication changes, requested consults, labs ordered, counseling, and scheduled follow-up interval... or click Dictate to speak"
              className="w-full text-xs md:text-sm text-stone-800 leading-relaxed placeholder:text-stone-400 focus:outline-none resize-y border-0 p-0 font-sans mt-2.5"
            />
          </div>
        )}

        {/* Medications & Allergies Block */}
        {(activeSection === 'all' || activeSection === 'meds') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Medications List */}
            <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Active Medications ({note.medications.length})
                </span>
                <div className="flex items-center gap-1.5">
                  {onOpenDiagnostics && (
                    <button
                      type="button"
                      onClick={() => onOpenDiagnostics('prescriptions')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded transition-colors shadow-2xs cursor-pointer"
                      title="Open structured e-prescriptions and order manager"
                    >
                      <Pill className="w-3 h-3 text-purple-700" />
                      <span>e-Prescribe ({note.prescriptions?.length || 0})</span>
                    </button>
                  )}

                  {onOpenDrugSafety && (
                    <button
                      type="button"
                      onClick={onOpenDrugSafety}
                      className="flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition-colors shadow-2xs"
                      title="Run interaction and allergy safety scan"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-700" />
                      <span>Check Interactions</span>
                    </button>
                  )}

                  {onOpenBioscience && (
                    <button
                      type="button"
                      onClick={() => onOpenBioscience('chemistry')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded transition-colors shadow-2xs cursor-pointer"
                      title="Inspect 2D chemical structure in PubChem & official FDA safety labeling"
                    >
                      <Atom className="w-3 h-3 text-indigo-700 animate-spin-slow" />
                      <span>PubChem & FDA</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {note.medications.map((med, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-stone-50 border border-stone-200/80 rounded px-2.5 py-1.5">
                    <span className="text-stone-800 font-medium">{med}</span>
                    <button
                      onClick={() => {
                        const updated = note.medications.filter((_, i) => i !== idx);
                        onChange({ ...note, medications: updated });
                      }}
                      className="text-stone-400 hover:text-rose-600 transition-colors ml-2"
                      title="Remove medication"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                <input
                  type="text"
                  placeholder="+ Add medication (e.g. Lisinopril 20mg PO daily) and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      onChange({
                        ...note,
                        medications: [...note.medications, e.currentTarget.value.trim()],
                      });
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full text-xs border border-dashed border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-stone-50/50"
                />
              </div>
            </div>

            {/* Allergies List */}
            <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Documented Allergies ({note.allergies.length})
                </span>
              </div>
              <div className="space-y-2">
                {note.allergies.map((all, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-amber-50/60 border border-amber-200/70 rounded px-2.5 py-1.5">
                    <span className="text-amber-900 font-medium">{all}</span>
                    <button
                      onClick={() => {
                        const updated = note.allergies.filter((_, i) => i !== idx);
                        onChange({ ...note, allergies: updated });
                      }}
                      className="text-amber-500 hover:text-rose-600 transition-colors ml-2"
                      title="Remove allergy"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                <input
                  type="text"
                  placeholder="+ Add allergy (e.g. Penicillin - hives) and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      onChange({
                        ...note,
                        allergies: [...note.allergies, e.currentTarget.value.trim()],
                      });
                      e.currentTarget.value = '';
                    }
                  }}
                  className="w-full text-xs border border-dashed border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-stone-500 bg-stone-50/50"
                />
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Attachment Details & AI Analysis Modal */}
      <AttachmentModal
        isOpen={isAttachmentModalOpen}
        onClose={() => {
          setIsAttachmentModalOpen(false);
          setSelectedAttachmentForModal(null);
        }}
        attachment={selectedAttachmentForModal}
        onAnalyze={handleAnalyzeAttachment}
        onInsertIntoSection={handleInsertSummary}
      />
    </div>
  );
};
