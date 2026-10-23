import React, { useState } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Check,
  Copy,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  FileCheck2,
} from 'lucide-react';
import { SectionAttachment } from '../types/clinical';

interface AttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: SectionAttachment | null;
  onAnalyze: (attachment: SectionAttachment) => void;
  onInsertIntoSection: (attachment: SectionAttachment) => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  isOpen,
  onClose,
  attachment,
  onAnalyze,
  onInsertIntoSection,
}) => {
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  if (!isOpen || !attachment) return null;

  const sectionName =
    attachment.section.charAt(0).toUpperCase() + attachment.section.slice(1);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    onInsertIntoSection(attachment);
    setInserted(true);
    setTimeout(() => setInserted(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-200/80 flex items-center justify-center text-stone-700">
              {attachment.fileType === 'image' ? (
                <ImageIcon className="w-5 h-5 text-stone-700" />
              ) : (
                <FileText className="w-5 h-5 text-stone-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900 text-sm md:text-base leading-snug">
                  {attachment.fileName}
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-800">
                  {sectionName} Section
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                {(attachment.fileSize / 1024).toFixed(1)} KB · {attachment.mimeType}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Visual Preview / Thumbnail Area */}
          <div className="border border-stone-200 rounded-lg p-3 bg-stone-50 flex flex-col items-center justify-center">
            {attachment.dataUrl && attachment.fileType === 'image' ? (
              <div className="max-h-64 overflow-hidden rounded border border-stone-200 shadow-2xs">
                <img
                  src={attachment.dataUrl}
                  alt={attachment.fileName}
                  className="max-h-64 object-contain mx-auto"
                />
              </div>
            ) : attachment.dataUrl && attachment.mimeType === 'application/pdf' ? (
              <div className="w-full flex flex-col items-center justify-center p-4">
                <div className="max-h-64 overflow-hidden rounded border border-stone-200 shadow-2xs">
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.fileName}
                    className="max-h-64 object-contain mx-auto"
                  />
                </div>
                <span className="text-xs text-stone-500 mt-2 font-mono">
                  Standard Clinical PDF Document Preview
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 text-stone-400">
                <FileText className="w-12 h-12 stroke-1 mb-2 text-stone-400" />
                <span className="text-xs font-mono">{attachment.fileName}</span>
              </div>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-amber-800">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <h4 className="font-semibold text-stone-900 text-sm">
                  Clinical AI Multimodal Analysis
                </h4>
              </div>

              {!attachment.analysis && !attachment.isAnalyzing && (
                <button
                  onClick={() => onAnalyze(attachment)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Analyze with AI</span>
                </button>
              )}

              {attachment.analysis && !attachment.isAnalyzing && (
                <button
                  onClick={() => onAnalyze(attachment)}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Re-analyze</span>
                </button>
              )}
            </div>

            {/* If analyzing */}
            {attachment.isAnalyzing && (
              <div className="p-8 border border-amber-200/80 bg-amber-50/50 rounded-lg flex flex-col items-center justify-center text-center">
                <div className="w-7 h-7 border-2 border-stone-900 border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-sm font-semibold text-stone-900">
                  Analyzing {attachment.fileType} with Gemini...
                </span>
                <span className="text-xs text-stone-500 mt-1 max-w-sm">
                  Extracting clinical measurements, interpreting diagnostic morphology, and structuring findings for the {sectionName} section.
                </span>
              </div>
            )}

            {/* If analysis exists */}
            {attachment.analysis && !attachment.isAnalyzing && (
              <div className="space-y-4 bg-stone-50/60 border border-stone-200 rounded-lg p-5">
                {/* Category & Headline */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/70 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                      {attachment.analysis.category}
                    </span>
                    <h5 className="font-bold text-stone-900 text-base mt-1">
                      {attachment.analysis.headline}
                    </h5>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h6 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Clinical Synthesis
                  </h6>
                  <p className="text-xs text-stone-800 leading-relaxed bg-white border border-stone-200 rounded p-3">
                    {attachment.analysis.summary}
                  </p>
                </div>

                {/* Key Findings */}
                {attachment.analysis.keyFindings && attachment.analysis.keyFindings.length > 0 && (
                  <div>
                    <h6 className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                      Key Diagnostic Findings
                    </h6>
                    <ul className="space-y-1.5 text-xs text-stone-700 bg-white border border-stone-200 rounded p-3">
                      {attachment.analysis.keyFindings.map((finding, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggested Section Text Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h6 className="text-xs font-semibold text-stone-900 uppercase tracking-wider">
                      Suggested Text for {sectionName} Section:
                    </h6>
                    <button
                      onClick={() => handleCopyText(attachment.analysis!.suggestedSectionText)}
                      className="flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy snippet</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-stone-900 text-stone-100 font-mono text-xs rounded-lg p-3.5 leading-relaxed whitespace-pre-wrap select-all border border-stone-800">
                    {attachment.analysis.suggestedSectionText}
                  </div>
                </div>

                {/* Insertion CTA */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">
                    {attachment.insertedIntoNote
                      ? '✓ Already inserted into section'
                      : 'Appends cleanly with attachment header into your note editor'}
                  </span>
                  <button
                    onClick={handleInsert}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                  >
                    {inserted || attachment.insertedIntoNote ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Inserted into {sectionName}!</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Insert into {sectionName} Note</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            CuraDoc AI Clinical Attachment Multimodal Reader
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
