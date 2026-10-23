import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  BookOpen,
  Send,
  Plus,
  Check,
  Copy,
  Info,
  ShieldCheck,
  RotateCcw,
  HelpCircle,
  Activity,
  ClipboardCheck,
  ListTodo,
  CheckSquare,
  ArrowRight,
  CheckCircle2,
  XCircle,
  CheckCheck,
  ShieldAlert,
  ExternalLink,
  ServerCrash,
} from 'lucide-react';
import {
  ClinicalAnalysisResult,
  ClinicalDifferential,
  DrugSafetyAlert,
  Icd10Suggestion,
  ResultProvenance,
} from '../types/clinical';
import { ProvenanceBadge } from './ProvenanceBadge';

interface AiSuggestionsPanelProps {
  analysis: ClinicalAnalysisResult | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onInsertIntoSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan', content: string) => void;
  onAskCopilot: (
    question: string
  ) => Promise<string | { answer: string; provenance?: ResultProvenance }>;
  resetTrigger?: number;
  forcedTab?: 'differentials' | 'safety' | 'historyGaps' | 'examGaps' | 'patient' | 'icd10' | 'copilot' | null;
  onTabChange?: (tab: 'differentials' | 'safety' | 'historyGaps' | 'examGaps' | 'patient' | 'icd10' | 'copilot') => void;
  onOpenApiInspector?: () => void;
  onGenerateTier1Synthesis?: () => void;
  isSynthesizingTier1?: boolean;
}

export const AiSuggestionsPanel: React.FC<AiSuggestionsPanelProps> = ({
  analysis,
  isAnalyzing,
  onAnalyze,
  onInsertIntoSection,
  onAskCopilot,
  resetTrigger,
  forcedTab,
  onTabChange,
  onOpenApiInspector,
  onGenerateTier1Synthesis,
  isSynthesizingTier1,
}) => {
  const [activeTab, setActiveTab] = useState<
    'differentials' | 'safety' | 'historyGaps' | 'examGaps' | 'patient' | 'icd10' | 'copilot'
  >('differentials');
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'unasked' | 'asked_negative' | 'asked_positive'>>({});
  const [examStatuses, setExamStatuses] = useState<Record<string, 'unexamined' | 'normal' | 'abnormal'>>({});
  const [confirmingHistory, setConfirmingHistory] = useState<{ id: string; type: 'negative' | 'positive' } | null>(null);
  const [confirmingExam, setConfirmingExam] = useState<{ id: string; type: 'normal' | 'abnormal' } | null>(null);
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotProvenance, setCopilotProvenance] = useState<ResultProvenance | null>(null);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);
  const [copiedPatientSummary, setCopiedPatientSummary] = useState(false);
  const [insertedItems, setInsertedItems] = useState<Record<string, boolean>>({});
  const [differentialApprovals, setDifferentialApprovals] = useState<Record<string, { status: 'approved' | 'rejected' | 'modified'; note?: string }>>({});
  const [safetyOverrides, setSafetyOverrides] = useState<Record<string, { overridden: boolean; rationale?: string }>>({});
  const [overrideInputOpen, setOverrideInputOpen] = useState<Record<string, boolean>>({});
  const [overrideRationales, setOverrideRationales] = useState<Record<string, string>>({});

  const handleSelectTab = (tab: 'differentials' | 'safety' | 'historyGaps' | 'examGaps' | 'patient' | 'icd10' | 'copilot') => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
    }
  }, [forcedTab]);

  // Reset internal guidelines question, answer, and tab when resetTrigger triggers or analysis is cleared
  useEffect(() => {
    setCopilotQuestion('');
    setCopilotAnswer(null);
    setCopilotProvenance(null);
    setInsertedItems({});
    setDifferentialApprovals({});
    setSafetyOverrides({});
    setConfirmingHistory(null);
    setConfirmingExam(null);
    setOverrideInputOpen({});
    setOverrideRationales({});
    setActiveTab('differentials');
  }, [resetTrigger]);

  useEffect(() => {
    if (analysis === null) {
      setCopilotQuestion('');
      setCopilotAnswer(null);
      setCopilotProvenance(null);
      setInsertedItems({});
      setDifferentialApprovals({});
      setSafetyOverrides({});
      setConfirmingHistory(null);
      setConfirmingExam(null);
      setOverrideInputOpen({});
      setOverrideRationales({});
    }
  }, [analysis]);

  const markInserted = (key: string) => {
    setInsertedItems((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setInsertedItems((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuestion.trim() || isCopilotLoading) return;

    setIsCopilotLoading(true);
    setCopilotAnswer(null);
    setCopilotProvenance(null);
    try {
      const res = await onAskCopilot(copilotQuestion);
      if (typeof res === 'string') {
        setCopilotAnswer(res);
        setCopilotProvenance({
          engine: 'unknown',
          usedPrebuiltData: false,
          fallbackUsed: false,
          evidenceStatus: 'unavailable',
        });
      } else {
        setCopilotAnswer(res.answer);
        setCopilotProvenance(
          res.provenance || {
            engine: 'unknown',
            usedPrebuiltData: false,
            fallbackUsed: false,
            evidenceStatus: 'unavailable',
          }
        );
      }
    } catch {
      setCopilotAnswer('Failed to retrieve clinical response. Please try again.');
      setCopilotProvenance({
        engine: 'unknown',
        usedPrebuiltData: false,
        fallbackUsed: true,
        evidenceStatus: 'unavailable',
      });
    } finally {
      setIsCopilotLoading(false);
    }
  };

  const handleCopyPatientSummary = async () => {
    if (!analysis?.patientSummary) return;
    const ps = analysis.patientSummary;
    const text = `${ps.headline}
=============================

${ps.plainLanguageOverview}

KEY INSTRUCTIONS:
${ps.keyInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

MEDICATION INSTRUCTIONS:
${ps.medicationSchedule.map((m) => `• ${m.name}: ${m.instructions} (Purpose: ${m.purpose})`).join('\n')}

RED FLAG SYMPTOMS TO SEEK IMMEDIATE CARE:
${ps.redFlagSymptoms.map((rf) => `! ${rf}`).join('\n')}

FOLLOW-UP:
${ps.followUp}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedPatientSummary(true);
        setTimeout(() => setCopiedPatientSummary(false), 2000);
      }
    } catch {
      setCopiedPatientSummary(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FAF8F5]">
      
      {/* Suggestions Panel Header */}
      <div className="bg-white border-b border-stone-200/80 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-800" />
          <h2 className="text-sm font-bold text-stone-900">Clinical Intelligence Co-Pilot</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onGenerateTier1Synthesis && (
            <button
              type="button"
              onClick={onGenerateTier1Synthesis}
              disabled={isSynthesizingTier1}
              title="Run Tier-1 LLM Diagnostic Synthesis on active EHR payload"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-indigo-700 ${isSynthesizingTier1 ? 'animate-spin' : ''}`} />
              <span>
                {isSynthesizingTier1 ? 'Synthesizing...' : 'Generate AI Diagnostic Synthesis'}
              </span>
            </button>
          )}
          {onOpenApiInspector && (
            <button
              type="button"
              onClick={onOpenApiInspector}
              title="Inspect recent API response headers and raw payload logs"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-stone-600" />
              <span>API Logs</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            title="Analyze active SOAP note & patient vitals with Clinical Decision AI (Ctrl+Enter)"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Run Clinical AI'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-stone-50/80 border-b border-stone-200/70 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => handleSelectTab('differentials')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'differentials'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5 text-stone-500" />
          <span>Differentials ({analysis?.differentials.length || 0})</span>
        </button>

        <button
          onClick={() => handleSelectTab('safety')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'safety'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${analysis?.safetyAlerts.length ? 'text-amber-700' : 'text-stone-500'}`} />
          <span>Safety & Alerts ({analysis?.safetyAlerts.length || 0})</span>
        </button>

        <button
          onClick={() => handleSelectTab('historyGaps')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'historyGaps'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <HelpCircle className={`w-3.5 h-3.5 ${(analysis?.missingHistoryQuestions?.length || 0) > 0 ? 'text-blue-700' : 'text-stone-500'}`} />
          <span>Missing History ({analysis?.missingHistoryQuestions?.length || 0})</span>
        </button>

        <button
          onClick={() => handleSelectTab('examGaps')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'examGaps'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ClipboardCheck className={`w-3.5 h-3.5 ${(analysis?.missingExamFindings?.length || 0) > 0 ? 'text-teal-700' : 'text-stone-500'}`} />
          <span>Missing Exam ({analysis?.missingExamFindings?.length || 0})</span>
        </button>

        <button
          onClick={() => handleSelectTab('patient')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'patient'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <HeartPulse className="w-3.5 h-3.5 text-rose-700" />
          <span>Patient Translation</span>
        </button>

        <button
          onClick={() => handleSelectTab('icd10')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'icd10'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-stone-500" />
          <span>ICD-10 ({analysis?.icd10Suggestions.length || 0})</span>
        </button>

        <button
          onClick={() => handleSelectTab('copilot')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'copilot'
              ? 'bg-white text-stone-900 shadow-2xs font-semibold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Ask Guidelines</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        
        {/* Loading State Skeleton */}
        {isAnalyzing && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-stone-200/70 rounded w-1/3"></div>
            <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
              <div className="h-4 bg-stone-200/70 rounded w-3/4"></div>
              <div className="h-3 bg-stone-100 rounded w-full"></div>
              <div className="h-3 bg-stone-100 rounded w-5/6"></div>
            </div>
            <div className="bg-white rounded-lg border border-stone-200 p-4 space-y-3">
              <div className="h-4 bg-stone-200/70 rounded w-2/3"></div>
              <div className="h-3 bg-stone-100 rounded w-full"></div>
            </div>
          </div>
        )}

        {/* Honest Fallback Banner */}
        {!isAnalyzing && analysis?.isFallback && (
          <div className="mb-4 bg-rose-50/80 border border-rose-200/90 rounded-lg p-3 text-xs text-rose-950">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <ServerCrash className="w-4 h-4 text-rose-800 shrink-0" />
                <span>Live Clinical Databases Unreachable</span>
              </div>
              {onOpenApiInspector && (
                <button
                  type="button"
                  onClick={onOpenApiInspector}
                  className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 rounded text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Activity className="w-3 h-3 text-rose-700" />
                  <span>Inspect API Logs</span>
                </button>
              )}
            </div>
            <p className="mt-1 text-rose-900 text-[11px] leading-relaxed">
              Unable to fetch real-time FDA or PubMed data. Displaying limited deterministic safety checks.
            </p>
          </div>
        )}

        {/* Clinical Documentation Gaps Callout */}
        {!isAnalyzing &&
          ((analysis?.missingHistoryQuestions?.length || 0) > 0 ||
            (analysis?.missingExamFindings?.length || 0) > 0) && (
            <div className="mb-4 bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <ClipboardCheck className="w-4 h-4 text-blue-700" />
                  <span>Clinical Documentation Gaps Identified</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {analysis?.provenance && (
                    <ProvenanceBadge provenance={analysis.provenance} />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    Quality Audit
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                CuraDoc AI detected vital history questions and physical examination maneuvers that have not yet been documented for this clinical presentation.
              </p>
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                {(analysis?.missingHistoryQuestions?.length || 0) > 0 && (
                  <button
                    onClick={() => setActiveTab('historyGaps')}
                    className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg text-[11px] font-semibold text-blue-900 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3 text-blue-700" />
                    <span>Review {analysis?.missingHistoryQuestions?.length} Missing History Questions</span>
                  </button>
                )}
                {(analysis?.missingExamFindings?.length || 0) > 0 && (
                  <button
                    onClick={() => setActiveTab('examGaps')}
                    className="px-2.5 py-1 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg text-[11px] font-semibold text-teal-900 flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Activity className="w-3 h-3 text-teal-700" />
                    <span>Review {analysis?.missingExamFindings?.length} Missing Exam Maneuvers</span>
                  </button>
                )}
              </div>
            </div>
          )}

        {/* Missing Info Alert Box */}
        {!isAnalyzing && analysis?.clinicalMissingInfoAlerts && analysis.clinicalMissingInfoAlerts.length > 0 && (
          <div className="mb-4 bg-stone-100/90 border border-stone-300/80 rounded-lg p-3 text-xs text-stone-800">
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
              <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                <Info className="w-3.5 h-3.5 text-stone-600" />
                <span>Recommended Information to Obtain:</span>
              </div>
              {analysis?.provenance && (
                <ProvenanceBadge provenance={analysis.provenance} />
              )}
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-stone-700 pl-1">
              {analysis.clinicalMissingInfoAlerts.map((alert, i) => (
                <li key={i}>{alert}</li>
              ))}
            </ul>
          </div>
        )}

        {/* TAB 1: DIFFERENTIAL DIAGNOSES */}
        {!isAnalyzing && activeTab === 'differentials' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span>Differential considerations prioritized by clinical probability:</span>
              <span className="font-mono text-[11px]">{analysis?.differentials.length || 0} findings</span>
            </div>

            {(!analysis || analysis.differentials.length === 0) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-3">
                <Stethoscope className="w-8 h-8 text-stone-400 mx-auto" />
                <p>No differentials analyzed yet.</p>
                <button
                  onClick={onAnalyze}
                  className="px-4 py-2 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Analyze Note with Clinical AI
                </button>
              </div>
            ) : (
              analysis.differentials.map((diff, idx) => {
                const itemKey = `diff-${idx}`;
                const isInserted = insertedItems[itemKey];
                const approval = differentialApprovals[itemKey];
                const isApproved = approval?.status === 'approved';
                const isRejected = approval?.status === 'rejected';

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-4 shadow-2xs space-y-2.5 transition-all ${
                      isApproved
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                        : isRejected
                        ? 'bg-stone-100/60 border-stone-300 opacity-60'
                        : 'bg-white border-stone-200/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm font-bold ${isRejected ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                            {diff.diagnosis}
                          </h3>
                          <span className="text-stone-400 font-mono text-xs">·</span>
                          <span className="font-mono text-xs text-stone-600 font-medium">{diff.icd10}</span>
                          {isApproved && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                              <CheckCheck className="w-3 h-3 text-emerald-700" />
                              Selected for Assessment
                            </span>
                          )}
                          {isRejected && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3 text-stone-500" />
                              Ruled Out / Excluded
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">
                          Likelihood:{' '}
                          <span
                            className={`font-semibold ${
                              diff.likelihood === 'High'
                                ? 'text-amber-800'
                                : diff.likelihood === 'Moderate'
                                ? 'text-stone-700'
                                : 'text-stone-500'
                            }`}
                          >
                            {diff.likelihood} Probability
                          </span>
                        </div>
                      </div>

                      {/* Top-Right Provenance & Clinician Governance Actions */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {analysis?.provenance && (
                          <ProvenanceBadge provenance={analysis.provenance} />
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {!isApproved && !isRejected ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setDifferentialApprovals((prev) => ({
                                  ...prev,
                                  [itemKey]: { status: 'approved' },
                                }));
                                const insertionText = `• ${diff.diagnosis} (${diff.icd10}) [${diff.likelihood} probability - Selected for Assessment]\n  Reasoning: ${diff.reasoning}`;
                                onInsertIntoSection('assessment', insertionText);
                                markInserted(itemKey);
                              }}
                              className="flex items-center gap-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer"
                              title="Select diagnostic consideration and include in Assessment"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Include in Assessment</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDifferentialApprovals((prev) => ({
                                  ...prev,
                                  [itemKey]: { status: 'rejected' },
                                }));
                              }}
                              className="flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-rose-700 bg-stone-50 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 px-2 py-1 rounded transition-colors cursor-pointer"
                              title="Clinician exclusion: rule out diagnosis"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Rule Out</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDifferentialApprovals((prev) => {
                                const next = { ...prev };
                                delete next[itemKey];
                                return next;
                              });
                            }}
                            className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 underline px-1 py-0.5 cursor-pointer"
                          >
                            Reset Decision
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const insertionText = `• ${diff.diagnosis} (${diff.icd10}) [${diff.likelihood} probability]\n  Reasoning: ${diff.reasoning}`;
                            onInsertIntoSection('assessment', insertionText);
                            markInserted(itemKey);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-stone-100/80 hover:bg-stone-200/80 border border-stone-200 px-2 py-1 rounded transition-colors shrink-0 cursor-pointer"
                          title="Insert text into Assessment section"
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span className="text-emerald-800">Inserted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Insert</span>
                            </>
                          )}
                        </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {diff.reasoning}
                    </p>

                    {diff.recommendedWorkup && diff.recommendedWorkup.length > 0 && (
                      <div className="bg-stone-50/80 border border-stone-200/60 rounded p-2.5 text-xs space-y-1">
                        <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider block">
                          Suggested Diagnostic Workup:
                        </span>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-stone-600">
                          {diff.recommendedWorkup.map((wk, i) => (
                            <span key={i} className="inline-flex items-center gap-1">
                              <span className="text-stone-400 font-mono">→</span> {wk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {diff.sourceUrl || diff.pmid ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex-wrap">
                        <BookOpen className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>Guideline Source:</span>
                        {diff.guidelineName && (
                          <span className="font-semibold text-stone-700">{diff.guidelineName}</span>
                        )}
                        {diff.evidenceLevel && (
                          <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[10px] border border-emerald-200 font-bold">
                            {diff.evidenceLevel}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded font-mono text-[9px] border font-medium ${
                            diff.claimSupportVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-50 text-stone-600 border-stone-200'
                          }`}
                          title={
                            diff.claimSupportVerified
                              ? 'Direct claim support verified in clinical guideline'
                              : 'Source retrieved via search/RAG (claim support not independently verified)'
                          }
                        >
                          {diff.claimSupportVerified ? 'Claim Support: Verified' : 'Source Retrieved (Unverified Claim Support)'}
                        </span>
                        <a 
                          href={diff.sourceUrl || `https://pubmed.ncbi.nlm.nih.gov/${diff.pmid}/`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-mono text-[10px] border border-emerald-200 font-bold hover:bg-emerald-100 transition-colors ml-auto"
                        >
                          {diff.pmid ? `PMID: ${diff.pmid}` : 'View Source'}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                        {diff.evidenceLimitation && (
                          <div className="w-full text-[10px] text-amber-800 bg-amber-50/90 px-2 py-1 rounded border border-amber-200/80 mt-1 flex items-center gap-1">
                            <span className="font-semibold">⚠️ Evidence Limitation:</span> {diff.evidenceLimitation}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-100">
                        Insufficient data for live citation.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: SAFETY & DRUG ALERTS */}
        {!isAnalyzing && activeTab === 'safety' && (
          <div className="space-y-3">
            <div className="text-xs text-stone-500 mb-1">
              Safety monitoring for drug interactions, allergies, and contraindications:
            </div>

            {(!analysis || analysis.safetyAlerts.length === 0) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-2">
                <ShieldCheck className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="font-semibold text-stone-800">No alerts generated; this does not confirm that all risks were assessed</p>
                <p className="text-stone-500">Automated safety screening did not return high-risk alerts for the entered text. Independent clinical review of interactions and allergies is required.</p>
              </div>
            ) : (
              analysis.safetyAlerts.map((alert, idx) => {
                const itemKey = `alert-${idx}`;
                const isInserted = insertedItems[itemKey];

                const isCritical = alert.severity === 'critical';
                const isOverridden = safetyOverrides[itemKey]?.overridden;

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-4 shadow-2xs space-y-2.5 transition-all ${
                      isOverridden
                        ? 'bg-stone-50/70 border-stone-300'
                        : isCritical
                        ? 'bg-amber-50/50 border-amber-300'
                        : 'bg-white border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <AlertTriangle className={`w-4 h-4 shrink-0 ${isCritical ? 'text-rose-700' : 'text-amber-700'}`} />
                          <h3 className="text-sm font-bold text-stone-900">{alert.title}</h3>
                          {isOverridden && (
                            <span
                              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-stone-200 text-stone-800 border border-stone-300 px-2 py-0.5 rounded-full"
                              title={safetyOverrides[itemKey]?.rationale}
                            >
                              <ShieldCheck className="w-3 h-3 text-stone-600" />
                              {safetyOverrides[itemKey]?.rationale && safetyOverrides[itemKey]?.rationale !== 'Alert Acknowledged (No Rationale Documented)'
                                ? 'Override Documented'
                                : 'Alert Acknowledged (No Rationale Documented)'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-600 mt-1 flex items-center gap-2 flex-wrap">
                          <span>Severity: <strong className={isCritical ? 'text-rose-800' : 'text-amber-800'}>{alert.severity.toUpperCase()}</strong></span>
                          <span className="text-stone-300 font-mono">·</span>
                          <span>Involved: {alert.substances.join(' + ')}</span>
                        </div>
                      </div>

                      {/* Top-Right Provenance & Clinician Action Buttons */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {analysis?.provenance && (
                          <ProvenanceBadge provenance={analysis.provenance} />
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            if (isOverridden) {
                              setSafetyOverrides((prev) => {
                                const next = { ...prev };
                                delete next[itemKey];
                                return next;
                              });
                            } else {
                              setOverrideInputOpen((prev) => ({
                                ...prev,
                                [itemKey]: !prev[itemKey],
                              }));
                            }
                          }}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded shadow-2xs transition-colors cursor-pointer ${
                            isOverridden
                              ? 'bg-stone-200 text-stone-800 hover:bg-stone-300 border border-stone-300'
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300'
                          }`}
                          title="Acknowledge warning with clinical override"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-stone-600" />
                          <span>{isOverridden ? 'Remove Override' : 'Override Alert'}</span>
                        </button>

                        <button
                          onClick={() => {
                            const insertionText = `SAFETY PRECAUTION: ${alert.title}\nRecommendation: ${alert.recommendation}`;
                            onInsertIntoSection('plan', insertionText);
                            markInserted(itemKey);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 px-2 py-1 rounded shadow-2xs transition-colors shrink-0 cursor-pointer"
                          title="Insert safety precaution into Plan"
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-700" />
                              <span className="text-emerald-800">Inserted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>Insert</span>
                            </>
                          )}
                        </button>
                        </div>
                      </div>
                    </div>

                    {overrideInputOpen[itemKey] && !isOverridden && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded p-3 text-xs space-y-2">
                        <label className="font-semibold text-stone-800 block">
                          Clinician Override Rationale:
                        </label>
                        <input
                          type="text"
                          value={overrideRationales[itemKey] || ''}
                          onChange={(e) =>
                            setOverrideRationales((prev) => ({
                              ...prev,
                              [itemKey]: e.target.value,
                            }))
                          }
                          placeholder="Document clinical rationale (or leave empty for unrecorded rationale)..."
                          className="w-full text-xs border border-stone-300 rounded px-2.5 py-1.5 bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              setOverrideInputOpen((prev) => ({
                                ...prev,
                                [itemKey]: false,
                              }))
                            }
                            className="text-stone-600 hover:text-stone-900 text-xs px-2 py-1 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const entered = overrideRationales[itemKey]?.trim();
                              const rationale = entered && entered.length > 0
                                ? entered
                                : 'Alert Acknowledged (No Rationale Documented)';
                              setSafetyOverrides((prev) => ({
                                ...prev,
                                [itemKey]: { overridden: true, rationale },
                              }));
                              setOverrideInputOpen((prev) => ({
                                ...prev,
                                [itemKey]: false,
                              }));
                            }}
                            className="bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs px-3 py-1 rounded shadow-2xs cursor-pointer"
                          >
                            Confirm Override
                          </button>
                        </div>
                      </div>
                    )}

                    {isOverridden && safetyOverrides[itemKey]?.rationale && (
                      <div className="bg-stone-100 border border-stone-200 rounded p-2 text-xs text-stone-700">
                        <span className="font-semibold text-stone-800">Documented Override:</span> {safetyOverrides[itemKey]?.rationale}
                      </div>
                    )}

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {alert.description}
                    </p>

                    {alert.clinicalMechanism && (
                      <div className="bg-stone-50 border border-stone-200/60 rounded p-2 text-[11px] text-stone-700 space-y-0.5">
                        <span className="font-semibold text-stone-800 uppercase text-[10px] tracking-wider block">
                          Pharmacological Mechanism:
                        </span>
                        <p>{alert.clinicalMechanism}</p>
                      </div>
                    )}

                    <div className="bg-stone-50 border border-stone-200/80 rounded p-2.5 text-xs text-stone-800">
                      <strong className="text-stone-900">Clinical Recommendation:</strong> {alert.recommendation}
                    </div>

                    {alert.sourceUrl ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-1 border-t border-stone-100 flex-wrap">
                        <ShieldCheck className="w-3 h-3 text-amber-800 shrink-0" />
                        <span>FDA Label Data:</span>
                        {alert.guidelineSource && (
                          <span className="font-semibold text-stone-700">({alert.guidelineSource})</span>
                        )}
                        <a 
                          href={alert.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[10px] border border-amber-200 font-bold hover:bg-amber-100 transition-colors ml-auto"
                        >
                          View Official Label
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ) : (
                      <div className="text-[10px] text-stone-400 font-mono pt-1 border-t border-stone-100">
                        No official FDA label matched.
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: MISSING HISTORY QUESTIONS */}
        {!isAnalyzing && activeTab === 'historyGaps' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1 flex-wrap gap-2">
              <span>Unasked diagnostic history questions to establish chronology & rule-outs:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {analysis?.provenance && (
                  <ProvenanceBadge provenance={analysis.provenance} />
                )}
                <span className="font-mono text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {analysis?.missingHistoryQuestions?.length || 0} questions
                </span>
              </div>
            </div>

            {(!analysis?.missingHistoryQuestions || analysis.missingHistoryQuestions.length === 0) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="font-semibold text-stone-800">No gaps were generated; completeness has not been independently verified.</p>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Automated screening did not identify additional history questions. Clinicians must perform full anamnesis.
                </p>
              </div>
            ) : (
              analysis.missingHistoryQuestions.map((q, idx) => {
                const itemKey = `hist-${q.id || idx}`;
                const isInserted = insertedItems[itemKey];
                const status = questionStatuses[q.id] || q.status;

                return (
                  <div
                    key={q.id || idx}
                    className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                      status === 'asked_negative'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : status === 'asked_positive'
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-stone-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                            {q.domain}
                          </span>
                          {status === 'asked_negative' && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Asked · Pertinent Negative
                            </span>
                          )}
                          {status === 'asked_positive' && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                              Asked · Positive Finding
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-stone-900 text-xs sm:text-sm mt-2 leading-snug">
                          "{q.question}"
                        </h4>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {analysis?.provenance && (
                          <ProvenanceBadge provenance={analysis.provenance} />
                        )}
                        <button
                          onClick={() => {
                            onInsertIntoSection('subjective', q.suggestedInsert);
                            markInserted(itemKey);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                          title="Insert into Subjective"
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-emerald-800">Inserted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Insert to Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-stone-50 border border-stone-200/80 rounded-lg p-2.5 text-xs text-stone-700">
                      <strong className="text-stone-900">Clinical Rationale:</strong> {q.rationale}
                    </div>

                    {/* Quick Response Toggles with Confirmation Step */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                      <span className="text-stone-400 font-medium">Clinician Response Audit:</span>
                      <div className="flex items-center gap-1.5">
                        {confirmingHistory?.id === q.id ? (
                          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2 py-1 rounded text-[11px]">
                            <span className="text-stone-700 font-medium">
                              Confirm insert {confirmingHistory.type === 'negative' ? 'Pertinent Negative' : 'Positive Finding'}?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const isNeg = confirmingHistory.type === 'negative';
                                setQuestionStatuses((prev) => ({
                                  ...prev,
                                  [q.id]: isNeg ? 'asked_negative' : 'asked_positive',
                                }));
                                onInsertIntoSection(
                                  'subjective',
                                  isNeg
                                    ? `Pertinent Negative: Patient screened for ${q.domain.toLowerCase()} and denies symptoms.`
                                    : `Positive Finding: Patient confirms symptoms regarding ${q.domain.toLowerCase()}.`
                                );
                                setConfirmingHistory(null);
                              }}
                              className="font-bold text-blue-900 bg-blue-200 hover:bg-blue-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingHistory(null)}
                              className="text-stone-500 hover:text-stone-800 px-1 py-0.5 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingHistory({ id: q.id, type: 'negative' });
                              }}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                status === 'asked_negative'
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              Mark Negative
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingHistory({ id: q.id, type: 'positive' });
                              }}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                status === 'asked_positive'
                                  ? 'bg-amber-600 text-white font-bold'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              Mark Positive
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: MISSING PHYSICAL EXAMINATION MANEUVERS */}
        {!isAnalyzing && activeTab === 'examGaps' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1 flex-wrap gap-2">
              <span>High-yield bedside physical examination maneuvers recommended for this presentation:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {analysis?.provenance && (
                  <ProvenanceBadge provenance={analysis.provenance} />
                )}
                <span className="font-mono text-[11px] font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {analysis?.missingExamFindings?.length || 0} maneuvers
                </span>
              </div>
            </div>

            {(!analysis?.missingExamFindings || analysis.missingExamFindings.length === 0) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="font-semibold text-stone-800">No gaps were generated; completeness has not been independently verified.</p>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Automated screening did not identify missing physical examination maneuvers. Clinicians must conduct a comprehensive targeted exam.
                </p>
              </div>
            ) : (
              analysis.missingExamFindings.map((m, idx) => {
                const itemKey = `exam-${m.id || idx}`;
                const isInserted = insertedItems[itemKey];
                const status = examStatuses[m.id] || m.status;

                return (
                  <div
                    key={m.id || idx}
                    className={`bg-white rounded-xl border p-4 shadow-2xs space-y-3 transition-all ${
                      status === 'normal'
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : status === 'abnormal'
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'border-stone-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                            {m.organSystem}
                          </span>
                          {status === 'normal' && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Completed · Normal / Benign
                            </span>
                          )}
                          {status === 'abnormal' && (
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-900">
                              Completed · Pathological / Positive
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-stone-900 text-xs sm:text-sm mt-2">
                          {m.maneuver}
                        </h4>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {analysis?.provenance && (
                          <ProvenanceBadge provenance={analysis.provenance} />
                        )}
                        <button
                          onClick={() => {
                            onInsertIntoSection('objective', m.suggestedInsert);
                            markInserted(itemKey);
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer"
                          title="Insert maneuver into Objective"
                        >
                          {isInserted ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-emerald-800">Inserted</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Insert to Note</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-stone-700 leading-relaxed">
                      {m.clinicalSignificance}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100 text-emerald-950">
                        <strong className="block text-emerald-900 font-bold mb-0.5">Normal Finding:</strong>
                        <span>{m.normalExpectation}</span>
                      </div>
                      <div className="bg-amber-50/60 p-2.5 rounded-lg border border-amber-100 text-amber-950">
                        <strong className="block text-amber-900 font-bold mb-0.5">Abnormal Finding:</strong>
                        <span>{m.abnormalIndication}</span>
                      </div>
                    </div>

                    {/* Quick Finding Documentation with Confirmation Step */}
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[11px]">
                      <span className="text-stone-400 font-medium">Record Examination Outcome:</span>
                      <div className="flex items-center gap-1.5">
                        {confirmingExam?.id === m.id ? (
                          <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 px-2 py-1 rounded text-[11px]">
                            <span className="text-stone-700 font-medium">
                              Confirm insert {confirmingExam.type === 'normal' ? 'Normal Finding' : 'Abnormal Finding'}?
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const isNorm = confirmingExam.type === 'normal';
                                setExamStatuses((prev) => ({
                                  ...prev,
                                  [m.id]: isNorm ? 'normal' : 'abnormal',
                                }));
                                onInsertIntoSection(
                                  'objective',
                                  isNorm
                                    ? `${m.organSystem}: ${m.maneuver} evaluated - normal finding: ${m.normalExpectation}`
                                    : `${m.organSystem}: ${m.maneuver} evaluated - positive abnormal finding: ${m.abnormalIndication}`
                                );
                                setConfirmingExam(null);
                              }}
                              className="font-bold text-teal-900 bg-teal-200 hover:bg-teal-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingExam(null)}
                              className="text-stone-500 hover:text-stone-800 px-1 py-0.5 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingExam({ id: m.id, type: 'normal' });
                              }}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                status === 'normal'
                                  ? 'bg-emerald-600 text-white font-bold'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              Document Normal
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingExam({ id: m.id, type: 'abnormal' });
                              }}
                              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                                status === 'abnormal'
                                  ? 'bg-rose-600 text-white font-bold'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                            >
                              Document Abnormal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB: PATIENT TRANSLATION */}
        {!isAnalyzing && activeTab === 'patient' && (
          <div className="space-y-4">
            {(!analysis || !analysis.patientSummary) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-3">
                <HeartPulse className="w-8 h-8 text-stone-400 mx-auto" />
                <p>Run analysis to generate patient-accessible 6th-grade discharge instructions.</p>
                <button
                  onClick={onAnalyze}
                  className="px-4 py-2 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Generate Patient Summary
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-stone-200 p-5 shadow-2xs space-y-4">
                
                {/* Header & Copy Button */}
                <div className="flex items-start justify-between gap-3 border-b border-stone-200/80 pb-3 flex-wrap">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      {analysis.patientSummary.headline}
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Plain-language discharge guidance written for patient & caregiver understanding.
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {analysis?.provenance && (
                      <ProvenanceBadge provenance={analysis.provenance} />
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleCopyPatientSummary}
                        className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/70 border border-stone-300 px-2.5 py-1.5 rounded transition-colors"
                      >
                        {copiedPatientSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy for Patient</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          const fullDischarge = `PATIENT DISCHARGE INSTRUCTIONS:\n${analysis.patientSummary.plainLanguageOverview}\n\nInstructions:\n${analysis.patientSummary.keyInstructions.join('\n')}\n\nFollow-up:\n${analysis.patientSummary.followUp}`;
                          onInsertIntoSection('plan', fullDischarge);
                          markInserted('patient-summary-insert');
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 px-2.5 py-1.5 rounded transition-colors"
                      >
                        {insertedItems['patient-summary-insert'] ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>Insert into Plan</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Plain language overview */}
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    What Is Happening In Your Body:
                  </span>
                  <p className="text-xs md:text-sm text-stone-800 leading-relaxed bg-stone-50/70 rounded p-3 border border-stone-200/60">
                    {analysis.patientSummary.plainLanguageOverview}
                  </p>
                </div>

                {/* Key Instructions */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Steps to Follow at Home:
                  </span>
                  <ul className="space-y-1.5 text-xs text-stone-800">
                    {analysis.patientSummary.keyInstructions.map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 bg-stone-50/40 p-2 rounded border border-stone-100">
                        <span className="font-mono text-stone-500 font-semibold">{i + 1}.</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Medication Schedule */}
                {analysis.patientSummary.medicationSchedule && analysis.patientSummary.medicationSchedule.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      How to Take Your Medicine:
                    </span>
                    <div className="space-y-1.5">
                      {analysis.patientSummary.medicationSchedule.map((med, i) => (
                        <div key={i} className="bg-stone-50 rounded border border-stone-200/70 p-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <strong className="text-stone-900">{med.name}</strong>
                            <p className="text-stone-600 mt-0.5">{med.instructions}</p>
                          </div>
                          <span className="text-[11px] text-stone-500 italic shrink-0">
                            For: {med.purpose}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flag Symptoms */}
                <div className="space-y-1.5 bg-rose-50/50 border border-rose-200/80 rounded-lg p-3 text-xs">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                    When to Seek Immediate Emergency Medical Care:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-rose-950 pl-1 mt-1">
                    {analysis.patientSummary.redFlagSymptoms.map((rf, i) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                </div>

                {/* Follow up */}
                <div className="text-xs text-stone-700 border-t border-stone-200/80 pt-3">
                  <strong>Follow-up Appointment:</strong> {analysis.patientSummary.followUp}
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: ICD-10 & CODING */}
        {!isAnalyzing && activeTab === 'icd10' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
              <span>Suggested ICD-10-CM diagnostic codes based on documentation:</span>
              <span className="font-mono text-[11px]">{analysis?.icd10Suggestions.length || 0} codes</span>
            </div>

            {(!analysis || analysis.icd10Suggestions.length === 0) ? (
              <div className="bg-white rounded-lg border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-3">
                <BookOpen className="w-8 h-8 text-stone-400 mx-auto" />
                <p>No ICD-10 suggestions loaded.</p>
                <button
                  onClick={onAnalyze}
                  className="px-4 py-2 bg-stone-900 text-white rounded-md text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Generate ICD-10 Suggestions
                </button>
              </div>
            ) : (
              analysis.icd10Suggestions.map((icd, idx) => {
                const itemKey = `icd-${idx}`;
                const isInserted = insertedItems[itemKey];

                return (
                  <div key={idx} className="bg-white rounded-lg border border-stone-200 p-3.5 shadow-2xs flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded">
                          {icd.code}
                        </span>
                        <span className="text-xs font-semibold text-stone-800">{icd.description}</span>
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-2">
                        <span>Category: {icd.category}</span>
                        <span className="text-stone-300 font-mono">·</span>
                        <span className="italic">{icd.rationale}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {analysis?.provenance && (
                        <ProvenanceBadge provenance={analysis.provenance} />
                      )}
                      <button
                        onClick={() => {
                          const insertion = `• ICD-10 ${icd.code}: ${icd.description}`;
                          onInsertIntoSection('assessment', insertion);
                          markInserted(itemKey);
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 px-2 py-1 rounded transition-colors shrink-0"
                        title="Insert code into Assessment"
                      >
                        {isInserted ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span className="text-emerald-800">Inserted</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            <span>Insert</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 5: ASK CLINICAL COPILOT */}
        {!isAnalyzing && activeTab === 'copilot' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Ask Evidence-Based Clinical Assistant
              </h3>
              <p className="text-xs text-stone-500">
                Query clinical guidelines, drug dosing adjustments, antibiotic coverage, or differential workup algorithms.
              </p>

              {/* Preset prompt buttons */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  onClick={() => setCopilotQuestion('What are guideline-directed medical therapies (GDMT) for newly diagnosed heart failure?')}
                  className="bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded px-2 py-1 transition-colors text-left"
                >
                  Heart Failure GDMT Guidelines
                </button>
                <button
                  onClick={() => setCopilotQuestion('First-line alternative antibiotics for pediatric otitis media with severe penicillin allergy?')}
                  className="bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded px-2 py-1 transition-colors text-left"
                >
                  Pediatric AOM Allergy Alternatives
                </button>
                <button
                  onClick={() => setCopilotQuestion('Renal dosing adjustments and safety monitoring for SGLT2 inhibitors and ACE inhibitors in CKD Stage 3?')}
                  className="bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded px-2 py-1 transition-colors text-left"
                >
                  SGLT2 & ACEi Renal Dosing
                </button>
              </div>

              <form onSubmit={handleAsk} className="flex gap-2">
                <input
                  type="text"
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  placeholder="e.g. What is the rule-out algorithm for atypical chest pain with low HEART score?"
                  className="flex-1 text-xs border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-400 bg-stone-50/50"
                />
                <button
                  type="submit"
                  disabled={isCopilotLoading || !copilotQuestion.trim()}
                  className="bg-stone-900 text-white rounded-md px-3.5 py-2 text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isCopilotLoading ? 'Thinking...' : 'Ask'}</span>
                </button>
              </form>
            </div>

            {copilotAnswer && (
              <div className="bg-white rounded-lg border border-stone-200 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-800">Clinical Co-Pilot Response:</span>
                    <ProvenanceBadge
                      provenance={
                        copilotProvenance ||
                        analysis?.provenance || {
                          engine: 'heuristic',
                          usedPrebuiltData: true,
                          fallbackUsed: true,
                          evidenceStatus: 'curated-fallback',
                        }
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCopilotAnswer(null);
                        setCopilotProvenance(null);
                        setCopilotQuestion('');
                      }}
                      className="flex items-center gap-1 text-stone-500 hover:text-rose-700 transition-colors"
                      title="Clear query and response"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Query</span>
                    </button>
                    <span className="text-stone-300 font-mono">·</span>
                    <button
                      onClick={() => onInsertIntoSection('plan', `Clinical Guidance:\n${copilotAnswer}`)}
                      className="flex items-center gap-1 text-stone-700 hover:text-stone-900 font-medium"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert into Plan</span>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-stone-800 leading-relaxed whitespace-pre-wrap font-sans">
                  {copilotAnswer}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
