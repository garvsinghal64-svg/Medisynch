import React, { useRef, useState } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Trash2,
  Eye,
  Plus,
  Check,
  ChevronDown,
  Upload,
} from 'lucide-react';
import { SectionAttachment } from '../types/clinical';
import { SAMPLE_ATTACHMENTS } from '../data/demoAttachments';

interface SectionAttachmentsListProps {
  section: 'subjective' | 'objective' | 'assessment' | 'plan';
  attachments: SectionAttachment[];
  onAddAttachment: (attachment: SectionAttachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onAnalyzeAttachment: (attachment: SectionAttachment) => void;
  onInsertSummary: (attachment: SectionAttachment) => void;
  onViewAttachment: (attachment: SectionAttachment) => void;
}

export const SectionAttachmentsList: React.FC<SectionAttachmentsListProps> = ({
  section,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onAnalyzeAttachment,
  onInsertSummary,
  onViewAttachment,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const sectionAttachments = attachments.filter((att) => att.section === section);
  const sectionLabel = section.charAt(0).toUpperCase() + section.slice(1);

  // Filter sample attachments relevant to this section, or available
  const relevantSamples = SAMPLE_ATTACHMENTS.filter(
    (s) => s.section === section || attachments.length === 0
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();

      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newAttachment: SectionAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          section,
          fileName: file.name,
          fileType: isImage ? 'image' : 'document',
          mimeType: file.type || (isImage ? 'image/jpeg' : isPdf ? 'application/pdf' : 'text/plain'),
          dataUrl,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        };

        onAddAttachment(newAttachment);
        // Automatically trigger AI analysis
        onAnalyzeAttachment(newAttachment);
      };

      if (isImage || isPdf) {
        reader.readAsDataURL(file);
      } else {
        // Text / plain document
        reader.readAsText(file);
        // Also read as data URL for consistency
        const urlReader = new FileReader();
        urlReader.onload = () => {
          const dataUrl = urlReader.result as string;
          const newAttachment: SectionAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            section,
            fileName: file.name,
            fileType: 'document',
            mimeType: file.type || 'text/plain',
            dataUrl,
            fileSize: file.size,
            uploadedAt: new Date().toISOString(),
          };
          onAddAttachment(newAttachment);
          onAnalyzeAttachment(newAttachment);
        };
        urlReader.readAsDataURL(file);
        return;
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectDemo = (sample: (typeof SAMPLE_ATTACHMENTS)[0]) => {
    const newAttachment: SectionAttachment = {
      ...sample.attachment,
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      section,
      uploadedAt: new Date().toISOString(),
    };
    onAddAttachment(newAttachment);
    onAnalyzeAttachment(newAttachment);
    setShowDemoMenu(false);
  };

  return (
    <div className="space-y-2 mt-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.doc,.docx,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action Row: Attach button + Demo dropdown */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-2.5 py-1 rounded-md shadow-2xs transition-colors"
          title={`Attach photo or document to ${sectionLabel} section`}
        >
          <Paperclip className="w-3 h-3 text-stone-600" />
          <span>Add Photo / Doc</span>
        </button>

        {/* Demo Samples Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDemoMenu(!showDemoMenu)}
            className="flex items-center gap-1 text-[11px] font-medium text-stone-600 bg-white hover:bg-stone-50 border border-stone-200/90 px-2 py-1 rounded-md shadow-2xs transition-colors"
            title="Load ready-made clinical sample for testing"
          >
            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
            <span>Sample {section === 'objective' ? 'ECG/Labs' : 'File'}</span>
            <ChevronDown className="w-2.5 h-2.5 text-stone-400" />
          </button>

          {showDemoMenu && (
            <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-stone-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
              <div className="px-3 py-1 text-[10px] uppercase font-mono font-bold text-stone-400 border-b border-stone-100 mb-1">
                Attach Sample Data
              </div>
              {SAMPLE_ATTACHMENTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectDemo(sample)}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-100 flex items-center justify-between text-stone-700 hover:text-stone-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {sample.attachment.fileType === 'image' ? (
                      <ImageIcon className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-700" />
                    )}
                    <span className="truncate">{sample.label}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 uppercase font-mono">
                    {sample.attachment.fileType}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render list of attached items for this section */}
      {sectionAttachments.length > 0 && (
        <div className="grid grid-cols-1 gap-2 pt-1">
          {sectionAttachments.map((att) => (
            <div
              key={att.id}
              className={`rounded-lg border p-2.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                att.analysis
                  ? 'bg-amber-50/40 border-amber-200/70'
                  : 'bg-stone-50 border-stone-200'
              }`}
            >
              {/* Left: Thumbnail & Meta */}
              <div
                className="flex items-center gap-2.5 cursor-pointer min-w-0"
                onClick={() => onViewAttachment(att)}
                title="Click to view file and full AI analysis"
              >
                {att.dataUrl && att.fileType === 'image' ? (
                  <div className="w-10 h-10 rounded border border-stone-200 overflow-hidden bg-white shrink-0 shadow-2xs">
                    <img
                      src={att.dataUrl}
                      alt={att.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded border border-stone-200 bg-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-5 h-5 text-stone-600" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-stone-900 truncate max-w-[200px] md:max-w-xs hover:underline">
                      {att.fileName}
                    </span>
                    {att.analysis && (
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                        {att.analysis.category.split('/')[0]}
                      </span>
                    )}
                  </div>

                  {att.isAnalyzing ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-0.5">
                      <div className="w-2.5 h-2.5 border border-amber-700 border-t-transparent rounded-full animate-spin" />
                      <span>AI analyzing content...</span>
                    </div>
                  ) : att.analysis ? (
                    <p className="text-[11px] text-stone-600 truncate max-w-sm mt-0.5">
                      {att.analysis.summary}
                    </p>
                  ) : (
                    <span className="text-[10px] text-stone-400 font-mono">
                      {(att.fileSize / 1024).toFixed(1)} KB · Ready to analyze
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {!att.analysis && !att.isAnalyzing && (
                  <button
                    type="button"
                    onClick={() => onAnalyzeAttachment(att)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-white bg-stone-900 hover:bg-stone-800 px-2.5 py-1 rounded shadow-2xs transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Analyze</span>
                  </button>
                )}

                {att.analysis && (
                  <button
                    type="button"
                    onClick={() => onInsertSummary(att)}
                    className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded shadow-2xs transition-colors ${
                      att.insertedIntoNote
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    }`}
                    title={`Insert AI summary directly into ${sectionLabel} note text`}
                  >
                    {att.insertedIntoNote ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Inserted</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>Insert Summary</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onViewAttachment(att)}
                  className="p-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-200/50 transition-colors"
                  title="View details & full findings"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.id)}
                  className="p-1 rounded text-stone-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Remove attachment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
