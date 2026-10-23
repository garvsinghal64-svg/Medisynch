import React from 'react';
import {
  BrainCircuit,
  Stethoscope,
  ListChecks,
  Microscope,
  AlertTriangle,
  Sparkles,
  FileText,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { LlmDiagnosticResponse } from '../services/llmDiagnosticService';
import { ProvenanceBadge } from './ProvenanceBadge';

export interface AiDiagnosticPanelProps {
  synthesis: LlmDiagnosticResponse | null;
  isLoading: boolean;
  scenarioLabel?: string;
  onGenerate?: () => void;
}

/**
 * Parses inline `[PMID: XXXXXXXX]` tags within clinical text and renders them
 * as clickable hyperlinks pointing to `https://pubmed.ncbi.nlm.nih.gov/XXXXXXXX/`.
 */
export function renderTextWithPmidLinks(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\[PMID:\s*\d+\])/gi);

  return parts.map((part, index) => {
    const match = part.match(/^\[PMID:\s*(\d+)\]$/i);
    if (match) {
      const pmid = match[1];
      return (
        <a
          key={`pmid-${pmid}-${index}`}
          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-950 border border-indigo-200 underline decoration-indigo-400 transition-colors"
          title={`Open PubMed article PMID ${pmid}`}
        >
          <span>[PMID: {pmid}]</span>
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const AiDiagnosticPanel: React.FC<AiDiagnosticPanelProps> = ({
  synthesis,
  isLoading,
  scenarioLabel,
  onGenerate,
}) => {
  return (
    <section
      aria-label="Tier-1 LLM Diagnostic Synthesis Panel"
      className="max-w-[1520px] w-full mx-auto border-x border-b border-stone-200/90 bg-[#FCFBF9] px-4 py-3.5 shadow-2xs"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-3 border-b border-stone-200/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-indigo-950 text-indigo-100 shadow-2xs">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                Tier-1 LLM Diagnostic Engine · PubMed RAG Synthesis
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-900 border border-indigo-200">
                Hybrid Tier-1 AI + NCBI RAG
              </span>
              {synthesis?.provenance && (
                <ProvenanceBadge provenance={synthesis.provenance} />
              )}
            </div>
            {scenarioLabel && (
              <p className="text-[11px] text-stone-500 mt-0.5">
                Synthesizing literature-grounded reasoning for:{' '}
                <strong className="text-stone-700">{scenarioLabel}</strong>
              </p>
            )}
          </div>
        </div>

        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-900 text-white hover:bg-indigo-800 disabled:opacity-60 transition-colors shadow-2xs cursor-pointer"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isLoading ? 'animate-spin text-indigo-200' : 'text-indigo-200'
              }`}
            />
            <span>
              {isLoading
                ? 'Synthesizing clinical data...'
                : 'Generate AI Diagnostic Synthesis'}
            </span>
          </button>
        )}
      </div>

      {/* Loading State: Pulsing Indicator & Skeleton Loader */}
      {isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-indigo-200/80 bg-white p-5 space-y-4 shadow-2xs"
        >
          <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-900 animate-pulse">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Synthesizing clinical data...</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
            <div className="space-y-2.5">
              <div className="h-3.5 w-40 bg-stone-200 rounded" />
              <div className="h-14 w-full bg-stone-100 rounded-lg border border-stone-200/60" />
              <div className="h-3.5 w-48 bg-stone-200 rounded mt-3" />
              <div className="h-20 w-full bg-stone-100 rounded-lg border border-stone-200/60" />
            </div>
            <div className="space-y-2.5">
              <div className="h-3.5 w-44 bg-stone-200 rounded" />
              <div className="h-16 w-full bg-stone-100 rounded-lg border border-stone-200/60" />
              <div className="h-3.5 w-40 bg-stone-200 rounded mt-3" />
              <div className="h-16 w-full bg-stone-100 rounded-lg border border-stone-200/60" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State when not yet generated */}
      {!isLoading && !synthesis && (
        <div className="rounded-xl border border-stone-200/90 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-600">
              <span className="font-semibold text-stone-900">
                Tier-1 Diagnostic Reasoning Ready:
              </span>{' '}
              Click <strong>&ldquo;Generate AI Diagnostic Synthesis&rdquo;</strong> to synthesize deep differential reasoning grounded in biomedical literature alongside the deterministic safety checks above.
            </div>
          </div>
        </div>
      )}

      {/* Populated Clinical Note Layout */}
      {!isLoading && synthesis && typeof synthesis.primaryDifferential === 'string' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left Column (5 cols): Primary & Secondary Differentials */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {/* Primary Differential */}
              <div className="rounded-lg border border-indigo-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <Stethoscope className="w-4 h-4 text-indigo-700 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-indigo-950">
                    Primary Differential
                  </h3>
                </div>
                <p className="text-xs font-bold text-stone-900 leading-relaxed">
                  {synthesis.primaryDifferential}
                </p>
              </div>

              {/* Secondary Differentials */}
              <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="w-4 h-4 text-stone-700 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    Secondary Differentials
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-800">
                  {(synthesis.secondaryDifferentials || []).map((diff, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="font-mono text-[11px] font-bold text-indigo-700 mt-0.5">
                        {idx + 1}.
                      </span>
                      <span className="font-medium">{diff.trim()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Column (7 cols): Clinical Reasoning & Recommended Workup */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Reasoning */}
              <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs">
                <div className="flex items-center gap-2 mb-1.5">
                  <BrainCircuit className="w-4 h-4 text-amber-800 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    Reasoning &amp; Pathophysiological Synthesis
                  </h3>
                </div>
                <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-line">
                  {renderTextWithPmidLinks(synthesis.reasoning || '')}
                </p>
              </div>

              {/* Workup */}
              <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Microscope className="w-4 h-4 text-teal-700 shrink-0" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-700">
                    Recommended Workup
                  </h3>
                </div>
                <ul className="space-y-1.5 text-xs text-stone-800">
                  {(synthesis.recommendedWorkup || []).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 leading-snug">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0 mt-1.5" />
                      <span>{renderTextWithPmidLinks(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* References & Evidence Section */}
          {Array.isArray(synthesis.references) && synthesis.references.length > 0 && (
            <div className="rounded-lg border border-stone-200 bg-white p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-indigo-700 shrink-0" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-800">
                  {synthesis.provenance?.engine === 'mock'
                    ? 'References & Evidence (Pre-built Demonstration Evidence)'
                    : synthesis.provenance?.evidenceStatus === 'unavailable'
                    ? 'References & Evidence (Live Retrieval Unavailable)'
                    : synthesis.provenance?.evidenceStatus === 'live-success'
                    ? 'References & Evidence (NCBI PubMed Live Grounding)'
                    : 'References & Evidence'}
                </h3>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-700">
                {synthesis.references.map((ref, idx) => {
                  const pmidMatch =
                    ref.match(/\[PMID:\s*(\d+)\]/i) || ref.match(/PMID:\s*(\d+)/i);
                  const pmid = pmidMatch ? pmidMatch[1] : null;
                  return (
                    <li
                      key={idx}
                      className="flex flex-wrap items-center justify-between gap-2 py-1 px-2.5 rounded bg-stone-50 border border-stone-200/70"
                    >
                      <span className="font-medium text-stone-800">
                        {renderTextWithPmidLinks(ref)}
                      </span>
                      {pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-950 underline shrink-0"
                        >
                          <span>pubmed.ncbi.nlm.nih.gov/{pmid}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Malformed Synthesis Fallback */}
      {!isLoading && synthesis && typeof synthesis.primaryDifferential !== 'string' && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-1">
          <p className="font-bold">Diagnostic Synthesis Schema Incomplete</p>
          <p>The diagnostic response returned non-standard data. Please re-run clinical analysis.</p>
        </div>
      )}

      {/* Permanent Mandatory Clinical Disclaimer */}
      <div className="mt-3 rounded-lg border border-amber-300/90 bg-amber-50/90 px-3.5 py-2 flex items-center gap-2.5 text-xs font-semibold text-amber-950">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
        <span>
          ⚠️ Tier-1 AI Synthesis: Not a substitute for clinical judgment. Refer to the Safety Intercept Banner for critical contraindications.
        </span>
      </div>
    </section>
  );
};
