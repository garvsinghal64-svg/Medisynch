# CuraDoc AI — Clinical Documentation & Intelligence Workspace

CuraDoc AI is an AI-powered clinical workspace designed for healthcare professionals, medical students, and clinical researchers. It combines a structured split-screen medical editor (with SOAP, H&P, and consultation formats) with a real-time Gemini-powered clinical suggestions panel providing differential diagnostic considerations, pharmacology safety alerts, ICD-10 code recommendations, and layperson patient discharge summaries.

***

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices have been tailored directly to your preferences from Phase 1. Please review them before proceeding:

*   **Domain & Use Case**: Medical documentation, clinical decision support, and patient communication assistant (**Confirmed**).
*   **Interface Layout**: Two-column split-screen editor with synchronized live AI suggestions panel, collapsible clinical quick-insert toolbar, and case selector (**Confirmed**).
*   **Visual Direction**: Warm minimalist aesthetic with neutral tones (linen/sand surfaces, warm stone typography, muted terracotta and sage accents, strict zero-pill discipline) (**Confirmed**).
*   **Clinical Safety Guardrails**: Prominent non-intrusive clinical disclaimer, confidence indicators, and strict distinction between physician-authored notes and AI-suggested considerations.
*   **Pre-loaded Clinical Templates**: Cardiology (HTN/Dyspnea), Pediatrics (Otitis Media + allergy check), Endocrinology (Type 2 Diabetes), and Emergency/Urgent (Atypical Chest Pain) for instant testing.

***

### 1. Overview & Core Concept

*   **What It Does**: CuraDoc AI streamlines clinical documentation workflows. Clinicians and students can draft or paste consultation notes, patient histories, or bulleted clinical findings. As they type or click "Analyze Note", the AI suggestions panel provides real-time clinical insights:
    1.  **SOAP Structuring**: Automatically formats rough notes into standardized Subjective, Objective, Assessment, and Plan sections.
    2.  **Differential Diagnostic Considerations**: Ranked potential diagnoses with clinical justification and recommended workup/tests.
    3.  **Pharmacology Safety Prober**: Flags drug-drug interactions, contraindications, and dosage precautions based on noted medications and allergies.
    4.  **Patient Discharge Instructions (Layperson Mode)**: Translates clinical notes into clear, compassionate, 6th-grade reading level instructions for patients and caregivers.
    5.  **Billing & Coding Assistant**: Suggests relevant ICD-10-CM diagnostic codes and CPT evaluation codes.
*   **Target Audience**: Physicians, nurse practitioners, physician assistants, medical students, clinical scribes, and health informatics researchers.
*   **Key Value**: Reduces clinical documentation burnout, minimizes medication oversight errors, and ensures patient discharge instructions are accessible and easy to understand.

***

### 2. User Experience & Visual Design

#### Key User Flows
1.  **Template / Quick-Start Selection**: The user enters the workspace with an immediate choice of four rich pre-loaded clinical scenarios or a clean empty note.
2.  **Split-Screen Editing**:
    *   **Left Pane (Clinical Note Editor)**: Rich multi-section editor with quick-tag buttons (Subjective, Objective, Assessment, Plan, Medications, Allergies), word count, clinical elapsed timer, and one-click actions ("Format as SOAP", "Copy Note", "Export Markdown", "Print Summary").
    *   **Right Pane (Live AI Clinical Copilot)**: Tabbed suggestions panel with:
        *   *Differentials & Workup*: Ranked differentials with probability bands and recommended labs/imaging.
        *   *Med Safety*: Drug-drug interaction cross-checks and allergy warnings.
        *   *Patient Summary*: Empathetic patient-facing instructions with medication schedules and red-flag symptoms.
        *   *Coding & Billing*: ICD-10 diagnostic code suggestions with descriptions.
        *   *Clinical Query*: Direct interactive Q&A for clinical guidelines.
3.  **Synchronized Insertion**: Users can hover over any AI-generated finding, differential, or ICD-10 code and click "Insert into Note" to immediately append or merge it into the active editor section.

#### Visual Identity & Theme
*   **Aesthetic Direction**: Warm minimalist editorial clinical design. Grounded, calm, human, and publication-grade. Replaces sterile blue/white or generic dark AI templates with a warm organic paper/stone canvas.
*   **Color Palette**:
    *   *Canvas & Surface*: Warm linen canvas (`#FAF8F5`), clean card surfaces (`#FFFFFF`), muted panel borders (`#E7E3DC`).
    *   *Typography*: Warm charcoal body (`#292524`), deep umber headings (`#1C1917`), muted stone metadata (`#78716C`).
    *   *Semantic Clinical Accents*:
        *   Primary Action: Warm Terracotta / Amber (`#C2410C` / `#D97706`).
        *   Safety / Normal: Calming Botanical Sage (`#047857` / `#065F46`).
        *   Clinical Caution / Interactions: Muted Ochre (`#B45309`).
        *   Critical Alert / Contraindication: Deep Crimson (`#991B1B`).
*   **Typography**:
    *   *Headings & Brand*: `Plus Jakarta Sans` / `Outfit` (600/700 weight, refined letter-spacing).
    *   *Body & Clinical Notes*: `Public Sans` / `Inter` (regular 400, line-height 1.6, 15px).
    *   *Clinical Measurements, Codes & Timestamps*: `JetBrains Mono` with `tabular-nums` for vitals, blood pressure, lab values, and ICD-10 codes.
*   **Anti-Slop Discipline**:
    *   Zero static pill enclosures or candy badges; metadata rendered as clean unboxed typography separated by `·`.
    *   No fake status tickers or ornamental telemetry tickers.
    *   No thick left accent borders (`border-l-4`).
    *   Refined 1px hairline borders and subtle single-elevation elevation.

***

### 3. Key Product Decisions & Trade-Offs

*   **Decision 1: Full-Stack Architecture with Server-Side Gemini API**:
    *   *Chosen Approach*: Express server running on port 3000 proxies calls to `@google/genai` using `gemini-3.8-flash` via structured JSON and streaming endpoints.
    *   *Why*: Keeps the Gemini API key secure on the server while supporting fast response generation and structured schema validation.
    *   *Alternatives Considered*: Client-side calls (prohibited by AI Studio security rules).
*   **Decision 2: Integrated Clinical Reference & Fallback Knowledge Engine**:
    *   *Chosen Approach*: The backend incorporates high-precision clinical reasoning prompts along with deterministic fallback heuristics for instant instant response if API rate limits or network hiccups occur.
    *   *Why*: Guarantees zero latency on pre-loaded templates and complete reliability during testing.
*   **Decision 3: Sectional Insert & Merge Control**:
    *   *Chosen Approach*: Each AI suggestion card has a dedicated "Insert into Note" button that targets the specific SOAP section (e.g. inserting an ICD-10 code into Assessment or an alert into Plan).
    *   *Why*: Empowers the clinician with final editorial authority over the documentation.

***

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CuraDoc AI Top Bar                            │
│  [Wordmark: CuraDoc AI]  —  [Template Selector]  —  [Export / Print]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       Left: Clinical Editor          │  │  Right: AI Suggestion Panel  │
│  - Patient Demographics & Vitals Bar │  │  - Tab Switcher:             │
│  - SOAP Note Section Tabs:           │  │    * Differentials & Workup  │
│    * Subjective (HPI, ROS)           │  │    * Drug Safety & Alerts    │
│    * Objective (Vitals, Physical)    │  │    * Patient Translation     │
│    * Assessment (Diagnoses, ICD-10)  │  │    * ICD-10 / Coding         │
│    * Plan (Medications, Follow-up)   │  │    * Ask Clinical Copilot    │
│  - Quick-Insert Terms & Snippets     │  │  - Synchronized Cards with   │
│  - Character & Word Tabular Counter  │  │    "Insert into Note" Action │
│  - Format as SOAP Action Trigger     │  │  - Real-time Gemini Stream   │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │                                     │
                   └─────────────────┬───────────────────┘
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │    Express Full-Stack Server      │
                   │  - POST /api/clinical/analyze     │
                   │  - POST /api/clinical/soap        │
                   │  - POST /api/clinical/translate   │
                   │  - POST /api/clinical/query       │
                   │  - @google/genai (gemini-3.8-flash│
                   └───────────────────────────────────┘
```

#### Core Data Entities
```typescript
interface PatientRecord {
  id: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  encounterDate: string;
  vitals: {
    bloodPressure: string;
    heartRate: number;
    respiratoryRate: number;
    temperature: string;
    spO2: number;
    weightKg: number;
  };
}

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  medications: string[];
  allergies: string[];
}

interface ClinicalSuggestion {
  differentials: Array<{
    diagnosis: string;
    icd10: string;
    likelihood: 'High' | 'Moderate' | 'Consider';
    reasoning: string;
    recommendedWorkup: string[];
  }>;
  safetyAlerts: Array<{
    type: 'interaction' | 'contraindication' | 'dosage_warning';
    severity: 'critical' | 'moderate' | 'informational';
    substanceA: string;
    substanceB?: string;
    description: string;
    recommendation: string;
  }>;
  icd10Codes: Array<{
    code: string;
    description: string;
    relevance: string;
  }>;
  patientDischargeSummary: {
    conditionOverview: string;
    keyInstructions: string[];
    medicationSchedule: Array<{ medication: string; instructions: string }>;
    warningSignsToSeekCare: string[];
  };
}
```

***

### 5. Step-by-Step Implementation Strategy

1.  **Configure App Metadata & HTML Header**:
    *   Update `metadata.json` with app title and description.
    *   Synchronize `index.html` with title, meta tags, and Google Fonts (`Plus Jakarta Sans` + `JetBrains Mono`).
2.  **Backend Services (`server.ts`)**:
    *   Implement Express server with `@google/genai` using model `'gemini-3.8-flash'`.
    *   Create endpoints:
        *   `POST /api/clinical/analyze`: Generates full diagnostic, safety, and ICD-10 breakdown.
        *   `POST /api/clinical/soap`: Transcribes raw bullet notes into standard SOAP format.
        *   `POST /api/clinical/translate`: Generates patient-accessible discharge explanations.
        *   `POST /api/clinical/query`: Answers clinical questions.
        *   Health check and graceful fallback handler.
3.  **Clinical Templates & Data Store (`src/data/clinicalTemplates.ts`)**:
    *   Build 4 realistic clinical cases with complete vitals, notes, medications, and allergies.
4.  **UI Component Layer**:
    *   `TopNav.tsx`: Clean 3-zone header with case selector and export triggers.
    *   `PatientBanner.tsx`: Compact vitals bar with tabular numerals and unit notation.
    *   `SoapEditor.tsx`: Split-screen left panel with section navigation, rich editing, and word counter.
    *   `AiSuggestionsPanel.tsx`: Right panel with tabbed navigation for Differentials, Drug Safety, Patient Discharge, and Coding.
    *   `ClinicalDisclaimerModal.tsx`: Explicit medical device & educational disclaimer.
    *   `PrintExportModal.tsx`: Clean printable and exportable clinical document view.
5.  **Build Verification**:
    *   Compile applet with `compile_applet` and test end-to-end flows.
