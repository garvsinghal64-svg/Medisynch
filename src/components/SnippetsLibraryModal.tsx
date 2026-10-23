import React, { useState } from 'react';
import {
  X,
  Zap,
  Search,
  Copy,
  Check,
  Plus,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { ClinicalSnippet } from '../types/clinical';
import { getAllSnippets, saveCustomSnippet } from '../utils/clinicalSnippets';

interface SnippetsLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSnippet: (text: string, targetSection?: 'subjective' | 'objective' | 'assessment' | 'plan') => void;
  onToast?: (msg: string) => void;
}

export const SnippetsLibraryModal: React.FC<SnippetsLibraryModalProps> = ({
  isOpen,
  onClose,
  onInsertSnippet,
  onToast,
}) => {
  const [snippets, setSnippets] = useState<ClinicalSnippet[]>(getAllSnippets());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedTrigger, setCopiedTrigger] = useState<string | null>(null);
  const [defaultTargetSection, setDefaultTargetSection] = useState<'subjective' | 'objective' | 'assessment' | 'plan'>('objective');

  // New Custom Snippet state
  const [isCreating, setIsCreating] = useState(false);
  const [newTrigger, setNewTrigger] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<ClinicalSnippet['category']>('General');
  const [newDescription, setNewDescription] = useState('');
  const [newExpansion, setNewExpansion] = useState('');

  if (!isOpen) return null;

  const categories = ['all', 'Cardiology', 'General', 'Pediatrics', 'ER', 'Examination', 'Psychiatry', 'Procedures'];

  const getSmartSectionForSnippet = (snippet: ClinicalSnippet): 'subjective' | 'objective' | 'assessment' | 'plan' => {
    if (snippet.category === 'Examination') return 'objective';
    if (snippet.category === 'ER' || snippet.trigger === '.chestpain' || snippet.trigger === '.cp' || snippet.trigger === '.ros_neg' || snippet.trigger === '.ros') return 'subjective';
    if (snippet.category === 'Procedures' || snippet.trigger === '.precautions' || snippet.trigger === '.return' || snippet.trigger === '.consent') return 'plan';
    if (snippet.category === 'Cardiology' || snippet.category === 'Psychiatry' || snippet.trigger === '.htn' || snippet.trigger === '.dm2') return 'assessment';
    return defaultTargetSection;
  };

  const filtered = snippets.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesSearch =
      s.trigger.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.expansion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (snippet: ClinicalSnippet) => {
    navigator.clipboard.writeText(snippet.expansion);
    setCopiedTrigger(snippet.trigger);
    setTimeout(() => setCopiedTrigger(null), 2000);
    if (onToast) onToast(`Copied ${snippet.trigger} template to clipboard.`);
  };

  const handleInsert = (snippet: ClinicalSnippet, overrideSection?: 'subjective' | 'objective' | 'assessment' | 'plan') => {
    const sectionToUse = overrideSection || getSmartSectionForSnippet(snippet);
    onInsertSnippet(snippet.expansion, sectionToUse);
    if (onToast) onToast(`Inserted "${snippet.label}" into ${sectionToUse.toUpperCase()} section!`);
    onClose();
  };

  const handleCreateSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrigger.trim() || !newExpansion.trim()) return;

    const formattedTrigger = newTrigger.startsWith('.') ? newTrigger.trim() : `.${newTrigger.trim()}`;
    const newSnippet: ClinicalSnippet = {
      trigger: formattedTrigger,
      label: newLabel.trim() || formattedTrigger,
      category: newCategory,
      description: newDescription.trim() || 'Custom hospital snippet',
      expansion: newExpansion.trim(),
    };

    const updated = saveCustomSnippet(newSnippet);
    setSnippets(updated);
    setIsCreating(false);
    setNewTrigger('');
    setNewLabel('');
    setNewDescription('');
    setNewExpansion('');
    if (onToast) onToast(`Saved dot-phrase shortcut "${formattedTrigger}"!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Clinical Dot-Phrases & Quick Snippets</h3>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Keyboard Shortcuts
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Type dot-phrases like <code className="text-teal-700 font-bold">.htn</code>, <code className="text-teal-700 font-bold">.dm2</code>, or <code className="text-teal-700 font-bold">.chestpain</code> directly into any note section to expand templates instantly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-stone-200 bg-white flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dot phrases by name, trigger (e.g. .htn), or keyword..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
            <button
              onClick={() => setIsCreating(!isCreating)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {isCreating ? 'Cancel' : 'Add Snippet'}
            </button>
          </div>
        </div>

        {/* Create Custom Snippet Form Drawer */}
        {isCreating && (
          <form onSubmit={handleCreateSnippet} className="p-4 bg-amber-50/50 border-b border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-700" />
                Define New Custom Dot-Phrase
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Trigger (e.g. .uti or .headache)</label>
                <input
                  type="text"
                  required
                  placeholder=".uti"
                  value={newTrigger}
                  onChange={(e) => setNewTrigger(e.target.value)}
                  className="w-full text-xs font-mono p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Label Name</label>
                <input
                  type="text"
                  required
                  placeholder="Urinary Tract Infection"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-stone-700 block mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
                >
                  <option value="General">General</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="ER">ER</option>
                  <option value="Examination">Examination</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Procedures">Procedures</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-700 block mb-1">Expanded Template Content</label>
              <textarea
                required
                rows={3}
                placeholder="Enter the medical clinical text that should expand when this trigger is typed..."
                value={newExpansion}
                onChange={(e) => setNewExpansion(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-white border border-stone-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-lg shadow-2xs"
              >
                Save Dot-Phrase
              </button>
            </div>
          </form>
        )}

        {/* Snippets List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-stone-100 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              No snippets matched "{searchQuery}". Click "Add Snippet" to create one.
            </div>
          ) : (
            filtered.map((snippet) => (
              <div
                key={snippet.trigger}
                className="pt-3 first:pt-0 pb-2 group hover:bg-stone-50 p-2.5 rounded-xl transition-colors border border-transparent hover:border-stone-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-800 px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        {snippet.trigger}
                      </span>
                      <h4 className="text-xs font-bold text-stone-900">{snippet.label}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600 font-medium">
                        {snippet.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1">{snippet.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                    <button
                      onClick={() => handleCopy(snippet)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-md border border-stone-200 transition-colors"
                      title="Copy template"
                    >
                      {copiedTrigger === snippet.trigger ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsert(snippet)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                      title={`Insert directly into ${getSmartSectionForSnippet(snippet).toUpperCase()} section`}
                    >
                      <span>Insert into {getSmartSectionForSnippet(snippet).toUpperCase()}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs font-mono text-stone-600 bg-stone-100/70 p-2.5 rounded-lg whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed border border-stone-200/60">
                  {snippet.expansion}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>{snippets.length} clinical shortcuts available in system</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
