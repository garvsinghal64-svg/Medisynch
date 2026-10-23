import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Atom,
  TestTube,
  BookOpen,
  Dna,
  ExternalLink,
  Search,
  Check,
  Copy,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  FileText,
  RotateCcw,
  ZoomIn,
  Eye,
  Info,
  FlaskConical,
  Layers,
} from 'lucide-react';
import {
  SoapNote,
  PatientRecord,
  PubChemCompoundData,
  OpenFdaDrugData,
  PubMedArticle,
  ClinVarVariant,
  DrugTargetStructure,
  ClinicalTrialStudy,
  RxNormConcept,
} from '../types/clinical';

interface BioscienceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: SoapNote;
  patient: PatientRecord;
  onInsertIntoSection: (section: 'subjective' | 'objective' | 'assessment' | 'plan', text: string) => void;
  onToast?: (msg: string) => void;
  initialTab?: 'chemistry' | 'literature' | 'macromolecules' | 'genomics' | 'trials';
}

export const BioscienceHubModal: React.FC<BioscienceHubModalProps> = ({
  isOpen,
  onClose,
  note,
  patient,
  onInsertIntoSection,
  onToast,
  initialTab = 'chemistry',
}) => {
  const [activeTab, setActiveTab] = useState<'chemistry' | 'literature' | 'macromolecules' | 'genomics' | 'trials'>(initialTab);

  // 1. Chemistry, openFDA & RxNorm state
  const [chemQuery, setChemQuery] = useState('Lisinopril');
  const [compoundData, setCompoundData] = useState<PubChemCompoundData | null>(null);
  const [fdaData, setFdaData] = useState<OpenFdaDrugData | null>(null);
  const [rxnormConcepts, setRxnormConcepts] = useState<RxNormConcept[]>([]);
  const [isChemLoading, setIsChemLoading] = useState(false);
  const [copiedSmiles, setCopiedSmiles] = useState(false);

  // 2. PubMed state
  const [pubmedQuery, setPubmedQuery] = useState(
    patient.chiefComplaint ? `${patient.chiefComplaint} clinical guidelines` : 'Heart failure preserved ejection fraction'
  );
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [isPubmedLoading, setIsPubmedLoading] = useState(false);
  const [citedPmids, setCitedPmids] = useState<Record<string, boolean>>({});

  // 3. 3D Macromolecular Viewer state
  const [targets, setTargets] = useState<DrugTargetStructure[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('ace');
  const [viewerStyle, setViewerStyle] = useState<'plddt' | 'spectrum' | 'sticks'>('plddt');
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<any>(null);
  const [is3DLoading, setIs3DLoading] = useState(false);

  // 4. ClinVar & AlphaGenome state
  const [variants, setVariants] = useState<ClinVarVariant[]>([]);
  const [isGenomicsLoading, setIsGenomicsLoading] = useState(false);

  // 5. ClinicalTrials.gov state
  const [trialsQuery, setTrialsQuery] = useState(
    patient.chiefComplaint ? patient.chiefComplaint.split(' ')[0] : 'Heart failure'
  );
  const [trials, setTrials] = useState<ClinicalTrialStudy[]>([]);
  const [isTrialsLoading, setIsTrialsLoading] = useState(false);

  // Load chemistry, openFDA & RxNorm data
  const fetchChemistryData = async (drugName: string) => {
    if (!drugName.trim()) return;
    setIsChemLoading(true);
    try {
      const [pubchemRes, fdaRes, rxnormRes] = await Promise.all([
        fetch(`/api/science/pubchem?query=${encodeURIComponent(drugName.trim())}`),
        fetch(`/api/science/openfda?drug=${encodeURIComponent(drugName.trim())}`),
        fetch(`/api/science/rxnorm?drug=${encodeURIComponent(drugName.trim())}`),
      ]);

      if (pubchemRes.ok) {
        const pData = await pubchemRes.json();
        setCompoundData(pData);
      } else {
        setCompoundData(null);
      }
      if (fdaRes.ok) {
        const fData = await fdaRes.json();
        setFdaData(fData);
      } else {
        setFdaData(null);
      }
      if (rxnormRes.ok) {
        const rData = await rxnormRes.json();
        setRxnormConcepts(rData.concepts || []);
      } else {
        setRxnormConcepts([]);
      }
    } catch (err) {
      console.error('Failed to fetch chemistry/FDA data:', err);
      setCompoundData(null);
      setFdaData(null);
      setRxnormConcepts([]);
    } finally {
      setIsChemLoading(false);
    }
  };

  // Load ClinicalTrials.gov studies
  const fetchTrialsData = async (term: string) => {
    if (!term.trim()) return;
    setIsTrialsLoading(true);
    try {
      const res = await fetch(`/api/science/trials?term=${encodeURIComponent(term.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrials(data.studies || []);
      }
    } catch (err) {
      console.error('Failed to fetch clinical trials:', err);
    } finally {
      setIsTrialsLoading(false);
    }
  };

  // Load PubMed articles
  const fetchPubMedData = async (term: string) => {
    if (!term.trim()) return;
    setIsPubmedLoading(true);
    try {
      const res = await fetch(`/api/science/pubmed?term=${encodeURIComponent(term.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
      }
    } catch (err) {
      console.error('Failed to fetch PubMed articles:', err);
    } finally {
      setIsPubmedLoading(false);
    }
  };

  // Load ClinVar variants
  const fetchGenomicsData = async () => {
    setIsGenomicsLoading(true);
    try {
      const res = await fetch('/api/science/clinvar?query=cardiology');
      if (res.ok) {
        const data = await res.json();
        setVariants(data.variants || []);
      }
    } catch (err) {
      console.error('Failed to fetch ClinVar data:', err);
    } finally {
      setIsGenomicsLoading(false);
    }
  };

  // Load 3D Targets catalog
  const fetchTargets = async () => {
    try {
      const res = await fetch('/api/science/target-structures');
      if (res.ok) {
        const data = await res.json();
        setTargets(data.targets || []);
      }
    } catch (err) {
      console.error('Failed to fetch 3D targets:', err);
    }
  };

  // Sync initial tab & immediately load chemistry data when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      let targetMed = 'Lisinopril';
      if (note.medications && note.medications.length > 0) {
        const firstMed = note.medications[0].split(' ')[0].replace(/[^a-zA-Z]/g, '');
        if (firstMed) targetMed = firstMed;
      }
      setChemQuery(targetMed);
      fetchChemistryData(targetMed);
      fetchPubMedData(pubmedQuery);
      fetchTrialsData(trialsQuery);
      fetchGenomicsData();
      fetchTargets();
    }
  }, [isOpen, initialTab]);


  // Initialize and update 3Dmol viewer
  useEffect(() => {
    if (!isOpen || activeTab !== 'macromolecules') return;

    let isCancelled = false;

    const render3DStructure = async () => {
      const target = targets.find((t) => t.id === selectedTargetId) || targets[0];
      if (!target || !viewerContainerRef.current) return;

      setIs3DLoading(true);

      try {
        // Dynamically load 3Dmol to ensure WebGL context readiness
        const $3Dmol = await import('3dmol');
        if (isCancelled || !viewerContainerRef.current) return;

        // Clear existing canvas
        viewerContainerRef.current.innerHTML = '';

        const viewer = $3Dmol.createViewer(viewerContainerRef.current, {
          defaultcolors: ($3Dmol as any).rasmolElementColors || $3Dmol.elementColors,
          backgroundColor: '#0f172a',
        });
        viewerInstanceRef.current = viewer;

        // Fetch mmCIF from RCSB PDB or AlphaFold DB
        const pdbId = target.pdbId.toUpperCase();
        let cifData = '';

        try {
          const res = await fetch(`https://files.rcsb.org/download/${pdbId}.cif`);
          if (res.ok) {
            cifData = await res.text();
          }
        } catch (fetchErr) {
          console.warn('RCSB PDB direct fetch failed, trying AlphaFold DB:', fetchErr);
        }

        if (!cifData) {
          // Fallback to AlphaFold DB
          const afRes = await fetch(`https://alphafold.ebi.ac.uk/files/AF-${target.uniprotId}-F1-model_v6.cif`);
          if (afRes.ok) {
            cifData = await afRes.text();
          }
        }

        if (cifData && !isCancelled) {
          viewer.addModel(cifData, 'cif');

          if (viewerStyle === 'plddt') {
            // AlphaFold canonical pLDDT confidence coloring
            viewer.setStyle(
              {},
              {
                cartoon: {
                  colorfunc: (atom: any) => {
                    const b = atom.b || 85;
                    if (b > 90) return '#0053D6'; // Very high (>90): Dark Blue
                    if (b > 70) return '#65CBF3'; // Confident (70-90): Light Blue
                    if (b > 50) return '#FFDB13'; // Low (50-70): Yellow
                    return '#FF7D45'; // Very low (<50): Orange
                  },
                },
              }
            );
          } else if (viewerStyle === 'spectrum') {
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
          } else {
            viewer.setStyle({}, { stick: { radius: 0.25, colorscheme: 'Jmol' } });
          }

          viewer.zoomTo();
          viewer.render();
        }
      } catch (e) {
        console.warn('3Dmol render notice:', e);
      } finally {
        if (!isCancelled) setIs3DLoading(false);
      }
    };

    const timer = setTimeout(() => {
      render3DStructure();
    }, 100);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, activeTab, selectedTargetId, viewerStyle, targets]);

  if (!isOpen) return null;

  const handleCopySmiles = () => {
    if (!compoundData?.canonicalSmiles) return;
    navigator.clipboard.writeText(compoundData.canonicalSmiles);
    setCopiedSmiles(true);
    setTimeout(() => setCopiedSmiles(false), 2000);
    if (onToast) onToast('Canonical SMILES copied to clipboard.');
  };

  const handleInsertPharmacologyNote = () => {
    if (!compoundData) return;
    const block = `[BIOPHARMA EVALUATION: ${compoundData.name.toUpperCase()}]
• Formula: ${compoundData.molecularFormula} (MW: ${compoundData.molecularWeight} g/mol) | CID: ${compoundData.cid}
• SMILES: ${compoundData.canonicalSmiles}
• Lipinski Parameters: XLogP: ${compoundData.xlogp ?? 'N/A'}, TPSA: ${compoundData.tpsa ?? 'N/A'} Å², H-Donors: ${compoundData.hBondDonors ?? 0}, H-Acceptors: ${compoundData.hBondAcceptors ?? 0}
${fdaData?.mechanismOfAction ? `• Mechanism of Action: ${fdaData.mechanismOfAction.slice(0, 200)}...` : ''}
${fdaData?.boxedWarnings && fdaData.boxedWarnings.length > 0 ? `• FDA Boxed Warning: ${fdaData.boxedWarnings[0].slice(0, 220)}...` : ''}`;

    onInsertIntoSection('plan', block);
    if (onToast) onToast(`Pharmacology data for ${compoundData.name} inserted into Plan.`);
  };

  const handleCiteArticle = (art: PubMedArticle) => {
    const citation = `[Evidence Reference: ${art.citationString} - "${art.title.slice(0, 80)}..."]`;
    onInsertIntoSection('assessment', citation);
    setCitedPmids((prev) => ({ ...prev, [art.pmid]: true }));
    if (onToast) onToast(`PubMed citation [PMID: ${art.pmid}] appended to Assessment.`);
  };

  const handleInsertGenomicRisk = (variant: ClinVarVariant) => {
    const noteText = `[PRECISION GENOMICS: ${variant.title}]
• Clinical Significance: ${variant.clinicalSignificance} (${variant.reviewStatus})
• Associated Phenotypes: ${variant.conditions.join(', ')}
• AlphaGenome Atlas: ${variant.alphaGenomeUrl}`;

    onInsertIntoSection('assessment', noteText);
    if (onToast) onToast(`Genomic variant ${variant.gene} recorded in Assessment.`);
  };

  const handleInsertTrialToPlan = (trial: ClinicalTrialStudy) => {
    const noteText = `[CLINICAL TRIAL EVIDENCE - ${trial.nctId}]: ${trial.title}
• Phase & Status: ${trial.phase} (${trial.status})
• Interventions: ${trial.interventions.join(', ')}
• Sponsor: ${trial.leadSponsor}
• Evidence URL: ${trial.url}`;

    onInsertIntoSection('plan', noteText);
    if (onToast) onToast(`Trial ${trial.nctId} evidence inserted into Plan.`);
  };

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
              <Atom className="w-5 h-5 text-indigo-700 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Bioscience, Pharmacology & Evidence Hub
                </h3>
                <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-900 border border-indigo-300">
                  Google DeepMind Science Skills
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Molecular structures (PubChem), FDA safety (openFDA), peer-reviewed trials (PubMed), 3D macromolecules (AlphaFold DB), and genomic variants (ClinVar).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-stone-100/80 border-b border-stone-200 px-5 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('chemistry')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'chemistry'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TestTube className="w-3.5 h-3.5 text-indigo-700" />
              <span>1. BioPharma & openFDA</span>
            </button>

            <button
              onClick={() => setActiveTab('literature')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'literature'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. PubMed & Guidelines</span>
            </button>

            <button
              onClick={() => setActiveTab('macromolecules')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'macromolecules'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Atom className="w-3.5 h-3.5 text-blue-700" />
              <span>3. 3D Drug Targets (AlphaFold DB)</span>
            </button>

            <button
              onClick={() => setActiveTab('genomics')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'genomics'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Dna className="w-3.5 h-3.5 text-rose-700" />
              <span>4. Precision Genomics</span>
            </button>

            <button
              onClick={() => setActiveTab('trials')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'trials'
                  ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5 text-amber-700" />
              <span>5. ClinicalTrials.gov</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'chemistry' && compoundData && (
              <button
                onClick={handleInsertPharmacologyNote}
                className="px-2.5 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                + Insert Pharmacology to Plan
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: BIOPHARMA, PUBCHEM & OPENFDA */}
          {activeTab === 'chemistry' && (
            <div className="space-y-4">
              {/* Search Bar & Quick Prescription Buttons */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchChemistryData(chemQuery);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search active drug molecule in PubChem & openFDA (e.g. Lisinopril, Furosemide, Atorvastatin)..."
                      value={chemQuery}
                      onChange={(e) => setChemQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isChemLoading}
                    className="px-3.5 py-1.5 bg-indigo-800 hover:bg-indigo-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChemLoading ? 'animate-spin' : ''}`} />
                    <span>Query PubChem & FDA</span>
                  </button>
                </form>

                {/* Patient Medication Quick Tags */}
                {note.medications && note.medications.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="text-stone-400 font-medium">Patient Rx Shortcuts:</span>
                    {note.medications.map((m, idx) => {
                      const drugName = m.split(' ')[0].replace(/[^a-zA-Z]/g, '');
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setChemQuery(drugName);
                            fetchChemistryData(drugName);
                          }}
                          className="px-2 py-0.5 rounded bg-white hover:bg-indigo-50 border border-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                        >
                          {drugName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chemical Structure & Pharmacological Properties Card */}
              {isChemLoading && !compoundData && (
                <div className="py-16 text-center text-xs text-stone-500 bg-stone-50/70 border border-stone-200 rounded-xl flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-700" />
                  <span className="font-semibold text-stone-700">Loading PubChem structure and openFDA data...</span>
                </div>
              )}
              {compoundData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: 2D Chemical Diagram from PubChem PUG REST */}
                  <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs flex flex-col items-center justify-between text-center space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        2D Chemical Diagram (PubChem PUG REST)
                      </span>
                      <h4 className="font-bold text-stone-900 text-base mt-1">{compoundData.name}</h4>
                      <p className="font-mono text-xs text-indigo-700 font-semibold">{compoundData.molecularFormula}</p>
                    </div>

                    <div className="w-48 h-48 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-center p-2 overflow-hidden shadow-inner">
                      {compoundData.imageUrl ? (
                        <img
                          src={compoundData.imageUrl}
                          alt={compoundData.name}
                          className="max-h-full max-w-full object-contain filter contrast-125"
                          loading="lazy"
                        />
                      ) : (
                        <TestTube className="w-12 h-12 text-stone-300" />
                      )}
                    </div>

                    <div className="w-full pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span className="font-mono text-[11px]">PubChem CID: {compoundData.cid}</span>
                      <a
                        href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compoundData.cid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-700 hover:text-indigo-900 flex items-center gap-1 font-semibold text-[11px]"
                      >
                        <span>PubChem</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Middle & Right: Physicochemical & Lipinski Properties */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                          Physicochemical & Drug-Likeness Metrics
                        </span>
                        <button
                          onClick={handleCopySmiles}
                          className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded cursor-pointer"
                        >
                          {copiedSmiles ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedSmiles ? 'Copied' : 'Copy SMILES'}</span>
                        </button>
                      </div>

                      {/* Properties Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">Molecular Weight</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.molecularWeight} g/mol</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">XLogP (Lipophilicity)</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.xlogp ?? 'N/A'}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">Polar Surface Area</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.tpsa ?? 'N/A'} Å²</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">Rotatable Bonds</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.rotatableBonds ?? 0}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">H-Bond Donors</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.hBondDonors ?? 0}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80">
                          <span className="text-[10px] text-stone-400 font-medium block">H-Bond Acceptors</span>
                          <span className="font-bold text-stone-900 font-mono">{compoundData.hBondAcceptors ?? 0}</span>
                        </div>
                        <div className="bg-stone-50 p-2 rounded-lg border border-stone-200/80 sm:col-span-2">
                          <span className="text-[10px] text-stone-400 font-medium block">InChIKey</span>
                          <span className="font-mono text-[11px] text-stone-700 truncate block">
                            {compoundData.inchiKey || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Canonical SMILES code block */}
                      <div className="bg-stone-900 text-stone-200 rounded-lg p-2.5 font-mono text-[11px] break-all select-all">
                        <span className="text-stone-400 block text-[10px] font-sans font-semibold mb-0.5">
                          Canonical SMILES (Open Chemical Specification):
                        </span>
                        {compoundData.canonicalSmiles}
                      </div>

                      {/* NIH RxNorm Concepts (RxCUI) */}
                      {rxnormConcepts.length > 0 && (
                        <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-indigo-700" />
                              NIH RxNorm Terminology & RxCUIs
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              Unified Medical Language System (UMLS)
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {rxnormConcepts.slice(0, 6).map((c) => (
                              <div
                                key={c.rxcui}
                                className="text-[10px] bg-stone-50 border border-stone-200 rounded px-2 py-1 flex items-center gap-1.5"
                              >
                                <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-1 rounded">
                                  {c.rxcui}
                                </span>
                                <span className="font-medium text-stone-800">{c.name}</span>
                                <span className="text-stone-400 font-mono">({c.tty})</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* openFDA Regulatory Labeling & Safety Section */}
                    {fdaData && (
                      <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-amber-700" />
                            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                              openFDA Official Labeling & FAERS Pharmacovigilance
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                            FDA SPL Verified
                          </span>
                        </div>

                        {/* Boxed Warnings */}
                        {fdaData.boxedWarnings && fdaData.boxedWarnings.length > 0 && (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-950 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-rose-900">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                              <span>FDA Boxed Warning (Black Box)</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-rose-900">
                              {fdaData.boxedWarnings[0]}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                            <strong className="block text-stone-900 font-bold mb-1">FDA Mechanism of Action:</strong>
                            <p className="text-stone-600 text-[11px] leading-relaxed line-clamp-3">
                              {fdaData.mechanismOfAction || 'Standard pharmacodynamic pathway.'}
                            </p>
                          </div>
                          <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80">
                            <strong className="block text-stone-900 font-bold mb-1">Clinical Contraindications:</strong>
                            <p className="text-stone-600 text-[11px] leading-relaxed line-clamp-3">
                              {fdaData.contraindications || 'Hypersensitivity to active drug component.'}
                            </p>
                          </div>
                        </div>

                        {/* FAERS Top Reported Adverse Reactions */}
                        {fdaData.topAdverseEvents && fdaData.topAdverseEvents.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-stone-800 block mb-1.5">
                              Top Reported Adverse Events (FDA FAERS Post-Marketing Surveillance):
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {fdaData.topAdverseEvents.slice(0, 6).map((ev, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-medium bg-stone-100 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-full flex items-center gap-1"
                                >
                                  <span>{ev.term}</span>
                                  <span className="font-mono text-stone-500 font-bold">({ev.count.toLocaleString()})</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!compoundData && !isChemLoading && !fdaData && (
                <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl">
                  No verified compound structure or FDA record found for "{chemQuery}". Search a valid generic drug name (e.g. Lisinopril, Furosemide, Atorvastatin, Amoxicillin).
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PUBMED & CLINICAL PRACTICE GUIDELINES */}
          {activeTab === 'literature' && (
            <div className="space-y-4">
              {/* Search Toolbar */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchPubMedData(pubmedQuery);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search peer-reviewed literature in NCBI PubMed (e.g. Heart failure preserved ejection fraction, SGLT2 inhibitor trials)..."
                      value={pubmedQuery}
                      onChange={(e) => setPubmedQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPubmedLoading}
                    className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPubmedLoading ? 'animate-spin' : ''}`} />
                    <span>Search PubMed</span>
                  </button>
                </form>

                {/* Preset Searches */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-stone-400 font-medium">High-Yield Clinical Guidelines:</span>
                  {[
                    'Heart Failure ACC/AHA 2022',
                    'Hypertension Blood Pressure Guidelines',
                    'SGLT2 inhibitors clinical trials',
                    'Acute otitis media AAP guidelines',
                  ].map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPubmedQuery(preset);
                        fetchPubMedData(preset);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Articles List */}
              <div className="space-y-3">
                {articles.map((art) => {
                  const isCited = citedPmids[art.pmid];

                  return (
                    <div
                      key={art.pmid}
                      className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2 hover:border-emerald-300 transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-emerald-900 bg-emerald-100/80 px-2 py-0.5 rounded text-[10px] font-mono">
                              PMID: {art.pmid}
                            </span>
                            <span className="font-semibold text-stone-700 text-[11px]">
                              {art.journal} ({art.pubdate})
                            </span>
                            {art.doi && (
                              <span className="font-mono text-stone-400 text-[10px]">DOI: {art.doi}</span>
                            )}
                          </div>
                          <h4 className="font-bold text-stone-900 text-sm mt-1.5 leading-snug">
                            {art.title}
                          </h4>
                          <p className="text-stone-500 text-[11px] mt-1">
                            {art.authors.join(', ')}
                          </p>
                        </div>

                        <button
                          onClick={() => handleCiteArticle(art)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all shrink-0 shadow-2xs cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300"
                          title="Append citation to Assessment & Plan in Note"
                        >
                          {isCited ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Cited</span>
                            </>
                          ) : (
                            <>
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>+ Cite in Note</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                        <span className="font-mono text-stone-500">{art.citationString}</span>
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${art.pmid}/`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 font-semibold"
                        >
                          <span>Open on PubMed</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 3D MACROMOLECULAR DRUG TARGETS (3DMOL.JS & ALPHAFOLD DB) */}
          {activeTab === 'macromolecules' && (
            <div className="space-y-4">
              {/* Controls Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="font-semibold text-stone-700">Target Receptor:</label>
                  <select
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="p-1.5 bg-white border border-stone-300 rounded-lg font-medium text-stone-800"
                  >
                    {targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.geneSymbol} / UniProt: {t.uniprotId})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 bg-stone-200/70 p-0.5 rounded-lg ml-2">
                    <button
                      onClick={() => setViewerStyle('plddt')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        viewerStyle === 'plddt' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                      title="AlphaFold pLDDT confidence coloring: Dark Blue >90, Light Blue 70-90, Yellow 50-70, Orange <50"
                    >
                      AlphaFold pLDDT
                    </button>
                    <button
                      onClick={() => setViewerStyle('spectrum')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        viewerStyle === 'spectrum' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      Chain Spectrum
                    </button>
                    <button
                      onClick={() => setViewerStyle('sticks')}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                        viewerStyle === 'sticks' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                      }`}
                    >
                      Chemical Sticks
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-stone-500">
                    PDB: {selectedTarget?.pdbId} · UniProt: {selectedTarget?.uniprotId}
                  </span>
                </div>
              </div>

              {/* 3D Canvas + Biological Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 3D Viewer Container */}
                <div className="md:col-span-2 relative bg-slate-950 rounded-xl overflow-hidden h-[420px] shadow-lg border border-slate-800 flex items-center justify-center">
                  <div ref={viewerContainerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

                  {is3DLoading && (
                    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-white text-xs gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Loading mmCIF Coordinates & AlphaFold Model...</span>
                    </div>
                  )}

                  {/* Overlay Controls & Legend */}
                  <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs border border-slate-800 rounded-lg p-2 text-[10px] text-slate-300 space-y-1">
                    <span className="font-bold text-slate-100 block">AlphaFold Confidence Scale:</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0053D6]" /> &gt;90 (Very High)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#65CBF3]" /> 70-90 (Confident)
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFDB13]" /> 50-70 (Low)
                      </span>
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 font-mono">
                    Drag: Rotate · Scroll: Zoom · Right-click: Pan
                  </div>
                </div>

                {/* Biological Target Details Card */}
                {selectedTarget && (
                  <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between text-xs">
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {selectedTarget.geneSymbol} · UniProt {selectedTarget.uniprotId}
                        </span>
                        <h4 className="font-bold text-stone-900 text-sm mt-1.5">{selectedTarget.name}</h4>
                        <p className="text-stone-600 text-xs mt-1 leading-relaxed">{selectedTarget.description}</p>
                      </div>

                      <div className="bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 space-y-1 text-[11px]">
                        <strong className="block text-stone-900 font-bold">Clinical Significance:</strong>
                        <p className="text-stone-700 leading-relaxed">{selectedTarget.functionSummary}</p>
                      </div>

                      <div>
                        <strong className="block text-stone-800 font-bold text-[11px] mb-1">
                          Modulating Drugs in Clinical Use:
                        </strong>
                        <div className="flex items-center gap-1 flex-wrap">
                          {selectedTarget.drugs.map((d, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      {selectedTarget.plddtConfidence && (
                        <div className="text-[11px] text-stone-500 font-medium">
                          Confidence: <strong className="text-emerald-700">{selectedTarget.plddtConfidence}</strong>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <a
                        href={`https://alphafold.ebi.ac.uk/entry/${selectedTarget.uniprotId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:text-blue-900 flex items-center gap-1 font-semibold"
                      >
                        <span>AlphaFold DB</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <a
                        href={`https://www.rcsb.org/structure/${selectedTarget.pdbId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-600 hover:text-stone-900 flex items-center gap-1 font-semibold"
                      >
                        <span>RCSB PDB</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PRECISION GENOMICS & CLINVAR */}
          {activeTab === 'genomics' && (
            <div className="space-y-4">
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 text-xs text-rose-950 flex items-start gap-2.5">
                <Dna className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-rose-900 font-bold">Pharmacogenomics & Clinical Variant Annotation:</strong>
                  <p className="text-[11px] text-rose-900 mt-0.5 leading-relaxed">
                    NCBI ClinVar curated genomic variants affecting cardiovascular outcomes, drug response (CPIC Level A guidelines), and familial conditions with AlphaGenome Atlas deep-links.
                  </p>
                </div>
              </div>

              {/* Variants Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:border-rose-300 transition-all text-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-rose-900 bg-rose-100/80 px-2 py-0.5 rounded text-[10px] font-mono">
                              {v.gene}
                            </span>
                            <span className="font-semibold text-stone-900 text-xs sm:text-sm">
                              {v.title}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-500 font-mono">
                            <span>ClinVar ID: {v.id}</span>
                            <span>•</span>
                            <span className="font-semibold text-rose-800">{v.clinicalSignificance}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInsertGenomicRisk(v)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                        >
                          + Record in Assessment
                        </button>
                      </div>

                      <div className="mt-2.5 bg-stone-50 p-2.5 rounded-lg border border-stone-200/80 space-y-1 text-[11px]">
                        <strong className="text-stone-800 block font-semibold">Conditions & Drug Phenotypes:</strong>
                        <ul className="list-disc list-inside text-stone-600 space-y-0.5">
                          {v.conditions.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                      <span className="text-stone-400 font-medium">{v.reviewStatus}</span>
                      <a
                        href={v.alphaGenomeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-700 hover:text-rose-900 flex items-center gap-1 font-semibold"
                      >
                        <span>AlphaGenome Atlas</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CLINICALTRIALS.GOV EVIDENCE */}
          {activeTab === 'trials' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    fetchTrialsData(trialsQuery);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ClinicalTrials.gov (e.g. Heart failure, Lisinopril, Hypertension, Otitis media)..."
                      value={trialsQuery}
                      onChange={(e) => setTrialsQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isTrialsLoading}
                    className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTrialsLoading ? 'animate-spin' : ''}`} />
                    <span>Search Trials</span>
                  </button>
                </form>

                {/* Quick Presets for Current Encounter */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1 border-t border-stone-200/60">
                  <span className="text-stone-400 font-medium">Quick Searches:</span>
                  {['Heart Failure HFpEF', 'Hypertension SPRINT', 'Diabetes CKD', 'Pediatric Otitis'].map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setTrialsQuery(term);
                        fetchTrialsData(term);
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-amber-50 border border-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trials Results Grid */}
              <div className="space-y-3">
                {isTrialsLoading ? (
                  <div className="py-12 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                    <span>Querying ClinicalTrials.gov official database...</span>
                  </div>
                ) : trials.length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                    No clinical trials found matching "{trialsQuery}". Try a broader condition term.
                  </div>
                ) : (
                  trials.map((study) => (
                    <div
                      key={study.nctId}
                      className="bg-white border border-stone-200 rounded-xl p-4 shadow-2xs space-y-2.5 hover:border-amber-300 transition-all text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/80">
                              {study.nctId}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                              {study.phase}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                study.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              }`}
                            >
                              {study.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-stone-900 text-sm leading-snug">
                            {study.title}
                          </h4>
                          <p className="text-[11px] text-stone-500 font-medium">
                            Lead Sponsor: {study.leadSponsor}
                          </p>
                        </div>

                        <button
                          onClick={() => handleInsertTrialToPlan(study)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          + Insert Trial to Plan
                        </button>
                      </div>

                      <p className="text-stone-600 text-[11px] leading-relaxed bg-stone-50 p-2.5 rounded-lg border border-stone-200/70">
                        {study.briefSummary}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <div className="flex items-center gap-2 text-stone-500 flex-wrap">
                          <span className="font-semibold text-stone-700">Interventions:</span>
                          <span>{study.interventions.join(', ') || 'Standard medical therapy'}</span>
                        </div>
                        <a
                          href={study.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-800 hover:text-amber-950 flex items-center gap-1 font-semibold whitespace-nowrap"
                        >
                          <span>ClinicalTrials.gov</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
