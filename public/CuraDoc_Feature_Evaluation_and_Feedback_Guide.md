# CuraDoc: Product Feature Evaluation & Stakeholder Feedback Guide

> **Purpose:** Use this document to collect opinions, ratings, and strategic feedback from physicians, clinical staff, healthcare administrators, and product advisors on what features should be prioritized next—and which ones should be deliberately avoided.

---

## 1. Executive Summary & Current App Baseline

**App Name:** CuraDoc (Clinical AI Documentation & Longitudinal Vitals Suite)  
**Target Users:** Primary care physicians, specialists, nurse practitioners, clinical residents, scribes.  
**Core Value Proposition:** Dramatically reduce physician documentation burden and chart fatigue by combining real-time speech dictation, multimodal document/imaging AI analysis, structured SOAP note generation, and longitudinal vitals tracking.

### Currently Implemented Capabilities:
1. **Interactive SOAP Note Editor:** Real-time structured editing across Subjective, Objective, Assessment, and Plan with clinical macro chips.
2. **Hands-Free Voice Dictation:** Web Speech API microphone dictation for each SOAP section with live visual feedback.
3. **Multimodal Medical Attachments & AI Extraction:** Upload clinical photos (rashes, surgical wounds, X-rays) and lab/PDF reports with automated AI interpretation and section merging.
4. **Longitudinal Vitals Trend Charts:** Multi-visit BP (Systolic/Diastolic), Heart Rate, and Weight/BMI interactive SVG tracking with clinical threshold indicators.
5. **Encounter & Patient Management:** Local multi-visit persistence, patient demographics, clinical presets, and FHIR/Markdown/PDF export.

---

## 2. "What to Add" — High-Impact Feature Candidates

Rate each candidate on a scale of **1 (Skip / Low priority)** to **5 (Must Have / Urgent)**:

| # | Proposed Feature | Clinical Value | Priority (1–5) | Your Notes / Conditions |
|---|------------------|----------------|----------------|--------------------------|
| **A1** | **EHR / EMR Direct Integration (SMART on FHIR / HL7)** | Sync encounters directly into Epic, Cerner, or AthenaHealth without manual copy-paste. | `[ ]` | |
| **A2** | **ICD-10 & CPT Billing Code Suggester** | Auto-suggest billable diagnosis (ICD-10-CM) and evaluation & management (E&M / CPT) codes from the Assessment & Plan. | `[ ]` | |
| **A3** | **Differential Diagnosis (DDx) Reasoning Assistant** | Provide an evidence-grounded differential list with red flags and recommended confirmatory workups. | `[ ]` | |
| **A4** | **Drug-Drug & Drug-Allergy Interaction Checker** | Cross-reference active patient medications and documented allergies when prescribing in the Plan. | `[ ]` | |
| **A5** | **Patient-Facing After-Visit Summary (AVS)** | 1-click translation of clinical jargon into 6th-grade reading level patient discharge instructions in multiple languages. | `[ ]` | |
| **A6** | **Ambient Scribe Mode (Multi-Speaker Dialogue)** | Record conversational physician-patient dialogue in the room and separate doctor questions from patient answers automatically. | `[ ]` | |
| **A7** | **Lab Order & Prescription Generator** | Pre-fill structured laboratory requisition slips and e-prescription payloads based on Plan items. | `[ ]` | |
| **A8** | **Offline PWA & Local Encrypted Cache** | Full offline capability during hospital rounds in dead zones with encrypted SQLite/IndexedDB storage. | `[ ]` | |
| **A9** | **Specialty SOAP Templates** | One-click templates for Pediatrics (growth percentiles), Psychiatry (Mental Status Exam), Orthopedics (range-of-motion), and Dermatology. | `[ ]` | |

---

## 3. "What NOT to Add" — Red Lines & Scope Traps

In healthcare and clinical software, adding the wrong features can introduce severe malpractice liability, regulatory hurdles, or physician burnout.

| Proposed Anti-Pattern / Scope Trap | Why We Should NOT Add It | Agreement (Agree / Disagree) | Stakeholder Feedback |
|-------------------------------------|--------------------------|------------------------------|----------------------|
| **Autonomous Medication Ordering** | AI should never independently submit drug orders or dispense medications without strict human physician sign-off. | `[ Agree / Disagree ]` | |
| **Generic Chatbot Clutter in the Note Canvas** | Floating, intrusive conversational chatbots distract from rapid chart documentation and slow down clinic workflows. | `[ Agree / Disagree ]` | |
| **Opaque Black-Box Diagnostic "Certainty"** | The AI must never declare definitive medical diagnoses ("Patient HAS disease X"); it must strictly suggest differentials for physician review. | `[ Agree / Disagree ]` | |
| **Complex Multi-Step Form Wizards** | Physicians hate multi-page rigid clinical forms that require 30 clicks before saving a simple 5-minute follow-up note. | `[ Agree / Disagree ]` | |
| **Cloud Storage of Unredacted Raw Audio** | Storing raw patient room recordings on non-BAA cloud servers presents immense HIPAA/GDPR liability. Audio should be processed ephemerally. | `[ Agree / Disagree ]` | |
| **Social / Gamified Features** | Clinical tools should maintain high professional gravity; badges, leaderboards, or social sharing within clinical records compromise trust. | `[ Agree / Disagree ]` | |

---

## 4. Stakeholder Feedback Form (Copy & Fill Out)

```text
===================================================================
CURADOC STAKEHOLDER OPINION FORM
===================================================================
Reviewer Name: ____________________________________________________
Role (e.g., Doctor, Nurse, Medical Student, IT Admin, Patient): ___
Clinical Specialty (if applicable): _______________________________
Date: _____________________________________________________________

1. OVERALL IMPRESSION
   How useful is the combination of Voice Dictation + AI Document 
   Analysis + Longitudinal Vitals Tracking for your workflow?
   [ ] 5 - Essential / Game-changer
   [ ] 4 - Very useful
   [ ] 3 - Moderately useful
   [ ] 2 - Needs significant changes
   [ ] 1 - Not practical

2. TOP 3 FEATURES WE MUST ADD NEXT:
   1. _____________________________________________________________
   2. _____________________________________________________________
   3. _____________________________________________________________

3. TOP 2 THINGS WE SHOULD NEVER ADD OR REMOVE TO PRESERVE QUALITY:
   1. _____________________________________________________________
   2. _____________________________________________________________

4. CLINICAL SAFETY & TRUST:
   What would give you 100% confidence to use this in real patient visits?
   (e.g., HIPAA compliance certification, EHR export, audit logging):
   _________________________________________________________________
   _________________________________________________________________

5. ANY ADDITIONAL THOUGHTS OR FEEDBACK:
   _________________________________________________________________
   _________________________________________________________________
===================================================================
```

---

## 5. Next Steps & Implementation Roadmap

1. **Collect 5–10 Responses:** Distribute this file or form to colleagues in different roles (clinical, technical, administrative).
2. **Tally Scorecard:** Sum the 1–5 priority scores for Section 2 candidates.
3. **Execute Top 2 Priorities:** Implement the highest-ranked features into the CuraDoc codebase.
