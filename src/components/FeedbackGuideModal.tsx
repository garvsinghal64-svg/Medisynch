import React, { useState } from 'react';
import {
  X,
  FileText,
  Copy,
  Check,
  Download,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  HelpCircle,
  Share2
} from 'lucide-react';

interface FeedbackGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEEDBACK_FORM_TEXT = `===================================================================
CURADOC CLINICAL AI - STAKEHOLDER OPINION & FEEDBACK FORM
===================================================================
Reviewer Name: ____________________________________________________
Role (Doctor, Resident, Nurse Practitioner, Medical Scribe, Healthcare IT): ___
Clinical Specialty (if applicable): _______________________________
Date: _____________________________________________________________

1. OVERALL UTILITY & IMPACT:
   How impactful is the combination of Voice Dictation + AI Document 
   Interpretation + Longitudinal Vitals Trend Tracking for your practice?
   [ ] 5 - Essential / Significant time saver
   [ ] 4 - Very useful
   [ ] 3 - Moderately useful
   [ ] 2 - Needs major adjustments
   [ ] 1 - Not practical for clinical workflow

2. CANDIDATE FEATURES TO ADD NEXT (Rate 1-5, where 5 is highest):
   [ ] A1: Direct EHR/EMR Integration (SMART on FHIR / HL7 sync to Epic/Cerner)
   [ ] A2: ICD-10 & CPT Billing Code Suggester (Auto-code E&M from A/P)
   [ ] A3: Differential Diagnosis (DDx) Assistant with Red-Flag Warnings
   [ ] A4: Drug-Drug & Drug-Allergy Interaction Checker
   [ ] A5: Patient After-Visit Summary (AVS) Translation in Plain Language
   [ ] A6: Ambient Room Dictation (Separating Doctor & Patient voices)
   [ ] A7: Specialty SOAP Templates (Pediatrics, Orthopedics, Psych)

3. FEATURES WE MUST AVOID / RED LINES (Check if you agree we should NEVER add):
   [ ] Agree: Never allow AI to autonomously order drugs without physician sign-off
   [ ] Agree: Never add floating, intrusive chat widgets that block the chart
   [ ] Agree: Never store unencrypted raw room audio recordings
   [ ] Agree: Avoid complex 30-click form wizards

4. TOP 3 THINGS YOU PERSONALLY WANT ADDED:
   1. _____________________________________________________________
   2. _____________________________________________________________
   3. _____________________________________________________________

5. WHAT WOULD GIVE YOU 100% TRUST IN THIS APP FOR REAL PATIENTS?
   _________________________________________________________________
   _________________________________________________________________
===================================================================`;

const FULL_GUIDE_MARKDOWN = `# CuraDoc: Product Feature Evaluation & Stakeholder Feedback Guide

> Use this document to collect opinions, ratings, and strategic feedback from physicians, clinical staff, healthcare administrators, and product advisors on what features should be prioritized next—and which ones should be deliberately avoided.

---

## 1. Executive Summary & Current App Baseline

- **App Name:** CuraDoc (Clinical AI Documentation & Longitudinal Vitals Suite)
- **Target Users:** Primary care physicians, specialists, nurse practitioners, clinical residents, scribes.
- **Core Value:** Dramatically reduce physician documentation burden and chart fatigue by combining real-time speech dictation, multimodal document/imaging AI analysis, structured SOAP note generation, and longitudinal vitals tracking.

### Currently Implemented:
1. **Interactive SOAP Note Editor:** Real-time structured editing with clinical macro chips.
2. **Hands-Free Voice Dictation:** Web Speech API microphone dictation for each SOAP section.
3. **Multimodal Medical Attachments & AI Extraction:** Upload clinical photos/PDFs with automatic AI interpretation and section merging.
4. **Longitudinal Vitals Trend Charts:** Multi-visit BP (Systolic/Diastolic), Heart Rate, and Weight/BMI interactive SVG tracking.
5. **Encounter & Patient Management:** Multi-visit persistence, patient demographics, clinical presets, and FHIR/Markdown/PDF export.

---

## 2. "What to Add" — High-Impact Feature Candidates (Rate 1 to 5)

- **A1. Direct EHR/EMR Integration (SMART on FHIR / HL7):** Sync encounters directly into Epic, Cerner, or AthenaHealth without manual copy-paste.
- **A2. ICD-10 & CPT Billing Code Suggester:** Auto-suggest billable diagnosis (ICD-10-CM) and evaluation & management (E&M / CPT) codes from the Assessment & Plan.
- **A3. Differential Diagnosis (DDx) Reasoning Assistant:** Provide an evidence-grounded differential list with red flags and recommended confirmatory workups.
- **A4. Drug-Drug & Drug-Allergy Interaction Checker:** Cross-reference active patient medications and documented allergies when prescribing in the Plan.
- **A5. Patient-Facing After-Visit Summary (AVS):** 1-click translation of clinical jargon into 6th-grade reading level patient discharge instructions in multiple languages.
- **A6. Ambient Scribe Mode (Multi-Speaker Dialogue):** Record conversational physician-patient dialogue in the room and separate doctor questions from patient answers automatically.
- **A7. Lab Order & Prescription Generator:** Pre-fill structured laboratory requisition slips and e-prescription payloads based on Plan items.
- **A8. Offline PWA & Local Encrypted Cache:** Full offline capability during hospital rounds in dead zones with encrypted storage.
- **A9. Specialty SOAP Templates:** One-click templates for Pediatrics (growth percentiles), Psychiatry (Mental Status Exam), Orthopedics, and Dermatology.

---

## 3. "What NOT to Add" — Red Lines & Scope Traps

1. **Autonomous Medication Ordering:** AI should never independently submit drug orders or dispense medications without strict human physician sign-off.
2. **Generic Chatbot Clutter in the Note Canvas:** Floating, intrusive conversational chatbots distract from rapid chart documentation and slow down clinic workflows.
3. **Opaque Black-Box Diagnostic "Certainty":** The AI must never declare definitive medical diagnoses ("Patient HAS disease X"); it must strictly suggest differentials for physician review.
4. **Complex Multi-Step Form Wizards:** Physicians hate multi-page rigid clinical forms that require 30 clicks before saving a simple 5-minute follow-up note.
5. **Cloud Storage of Unredacted Raw Audio:** Storing raw patient room recordings on non-BAA cloud servers presents immense HIPAA/GDPR liability. Audio should be processed ephemerally.
6. **Social / Gamified Features:** Clinical tools should maintain high professional gravity; badges, leaderboards, or social sharing within clinical records compromise trust.

---

## 4. Stakeholder Feedback Form

${FEEDBACK_FORM_TEXT}
`;

export const FeedbackGuideModal: React.FC<FeedbackGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedForm, setCopiedForm] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [activeTab, setActiveTab] = useState<'what_to_add' | 'what_not_to_add' | 'survey'>('what_to_add');

  if (!isOpen) return null;

  const handleCopyForm = () => {
    navigator.clipboard.writeText(FEEDBACK_FORM_TEXT);
    setCopiedForm(true);
    setTimeout(() => setCopiedForm(false), 2000);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(FULL_GUIDE_MARKDOWN);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([FULL_GUIDE_MARKDOWN], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'CuraDoc_Feature_Evaluation_and_Feedback_Guide.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-800 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                <span>App Feature Evaluation & Feedback Guide</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                  Shareable Document
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                A structured document to gather opinions from doctors, mentors, and peers on what to add and what to avoid.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-800 hover:bg-amber-900 px-3 py-1.5 rounded-md shadow-xs transition-colors"
              title="Download Markdown file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .MD File</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-stone-200 bg-white">
          <button
            onClick={() => setActiveTab('what_to_add')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'what_to_add'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>1. What to Add (Candidates)</span>
          </button>

          <button
            onClick={() => setActiveTab('what_not_to_add')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'what_not_to_add'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
            <span>2. What NOT to Add (Red Lines)</span>
          </button>

          <button
            onClick={() => setActiveTab('survey')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'survey'
                ? 'border-amber-800 text-amber-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Ready-to-Send Questionnaire</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1 text-stone-800">

          {/* TAB 1: WHAT TO ADD */}
          {activeTab === 'what_to_add' && (
            <div className="space-y-4">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">How to use this candidate list with reviewers:</p>
                  <p className="text-stone-600 mt-0.5">
                    Ask your reviewers (physicians, nurses, or product advisors) to score each candidate from 1 to 5 based on clinical value in real-world clinic workflows.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    code: 'A1',
                    title: 'EHR / EMR Direct Integration (FHIR/HL7)',
                    desc: 'Sync notes and vitals directly into Epic, Cerner, or AthenaHealth without manual copy-paste.',
                    priority: 'Tier 1 Priority',
                    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  },
                  {
                    code: 'A2',
                    title: 'ICD-10 & CPT Billing Code Suggester',
                    desc: 'Automatically suggest ICD-10-CM diagnosis codes and evaluation & management (E&M) billing codes from Assessment & Plan.',
                    priority: 'Revenue & Ops',
                    badge: 'bg-blue-100 text-blue-800 border-blue-200'
                  },
                  {
                    code: 'A3',
                    title: 'Differential Diagnosis (DDx) Assistant',
                    desc: 'Synthesize symptoms and vitals to suggest evidence-grounded differential diagnoses with red flags.',
                    priority: 'Clinical Decision',
                    badge: 'bg-purple-100 text-purple-800 border-purple-200'
                  },
                  {
                    code: 'A4',
                    title: 'Drug-Drug & Drug-Allergy Interaction Alert',
                    desc: 'Cross-reference active medications and documented patient allergies against prescribed therapies in the Plan.',
                    priority: 'Patient Safety',
                    badge: 'bg-rose-100 text-rose-800 border-rose-200'
                  },
                  {
                    code: 'A5',
                    title: 'Patient After-Visit Summary (AVS) Generator',
                    desc: '1-click conversion of clinical medical jargon into plain 6th-grade language discharge instructions for the patient.',
                    priority: 'Patient Compliance',
                    badge: 'bg-amber-100 text-amber-800 border-amber-200'
                  },
                  {
                    code: 'A6',
                    title: 'Ambient Scribe Mode (Doctor-Patient Dialogue)',
                    desc: 'Passively listen to the clinical conversation in the exam room and segregate doctor questions from patient answers.',
                    priority: 'Hands-Free Scribing',
                    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  },
                  {
                    code: 'A7',
                    title: 'Specialty-Specific SOAP Templates',
                    desc: 'Tailored templates for Pediatrics (percentiles), Psychiatry (Mental Status Exam), Orthopedics, and Dermatology.',
                    priority: 'Workflow Speed',
                    badge: 'bg-stone-100 text-stone-800 border-stone-200'
                  },
                  {
                    code: 'A8',
                    title: 'Offline PWA & Hospital Rounds Mode',
                    desc: 'Full offline operability during hospital rounds in basement or low-connectivity clinic zones with encrypted sync.',
                    priority: 'Infrastructure',
                    badge: 'bg-teal-100 text-teal-800 border-teal-200'
                  },
                ].map((item) => (
                  <div key={item.code} className="p-3.5 bg-white border border-stone-200 rounded-lg hover:border-amber-300 transition-colors shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                        {item.code}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badge}`}>
                        {item.priority}
                      </span>
                    </div>
                    <h4 className="font-semibold text-stone-900 text-xs">{item.title}</h4>
                    <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: WHAT NOT TO ADD */}
          {activeTab === 'what_not_to_add' && (
            <div className="space-y-4">
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-lg p-3.5 text-xs text-rose-900 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Why Defining "What NOT to Add" is Crucial:</p>
                  <p className="text-stone-600 mt-0.5">
                    Many health-tech apps fail due to feature bloat, liability hazards, or annoying doctors with slow multi-click interfaces. Here are strict clinical red lines:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: '1. Autonomous Medication Ordering',
                    reason: 'AI should NEVER independently transmit prescriptions to pharmacies without explicit physician review and cryptographic digital sign-off (DEA/FDA regulations).'
                  },
                  {
                    title: '2. Cluttered Floating Chatbots',
                    reason: 'Physicians find floating "Ask AI" widgets distracting and clumsy on clinical workstations. Scribes need crisp note-taking, not conversation clutter.'
                  },
                  {
                    title: '3. Black-Box Diagnostic "Certainty"',
                    reason: 'The app must never state "This patient has Disease X." It must always frame outputs as suggestions, differential considerations, and supportive documentation for the licensed provider.'
                  },
                  {
                    title: '4. Multi-Step Form Wizards (Click Fatigue)',
                    reason: 'Mandatory 20-click wizards ruin clinic velocity. Keep note fields rapid, free-flowing, and keyboard-first.'
                  },
                  {
                    title: '5. Unredacted Raw Audio Storage in Cloud',
                    reason: 'Storing unredacted conversation audio on external servers poses grave HIPAA liability. Voice speech should be transcribed ephemerally on-device or via zero-retention HIPAA BAA pipelines.'
                  },
                  {
                    title: '6. Gamification / Social Badges',
                    reason: 'Medical records require institutional gravitas. Avoid superficial badges, streaks, or gamified awards in clinical charting.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 bg-white border border-rose-100 rounded-lg flex items-start gap-3 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      ✕
                    </span>
                    <div>
                      <h4 className="font-semibold text-stone-900 text-xs">{item.title}</h4>
                      <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: READY-TO-SEND QUESTIONNAIRE */}
          {activeTab === 'survey' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-600">
                  Copy this questionnaire and send it to your advisors, doctors, or colleagues to gather their feedback:
                </p>
                <button
                  onClick={handleCopyForm}
                  className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 px-3 py-1.5 rounded-md transition-colors"
                >
                  {copiedForm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedForm ? 'Copied to Clipboard!' : 'Copy Form'}</span>
                </button>
              </div>

              <div className="p-4 bg-stone-900 text-stone-100 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre selection:bg-amber-500 selection:text-stone-900">
                {FEEDBACK_FORM_TEXT}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-300 hover:bg-stone-100 px-3 py-1.5 rounded-md shadow-2xs transition-colors"
            >
              {copiedMarkdown ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMarkdown ? 'Copied Full Document!' : 'Copy Full Markdown'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-100 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
