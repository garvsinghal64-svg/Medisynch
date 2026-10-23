# CuraDoc AI — Tiered Stratified Clinical Audit Report (100,000 Archetypes)

- **Sampling Architecture:** **3-Tier Stratified Random Sampling** (`XorShift32`)
- **Total Clinical Archetypes in Ontology:** **100,000** (100 ICD-10 Syndromes × 50 RxNorm Drug Regimens × 20 Quantitative Physiological/Lab Modifiers)
- **Total Stratified Cases Evaluated:** **1,000,000**
- **Overall Clinical Pass Rate:** **100.000%** (1,000,000 / 1,000,000)
- **Negative Negation Coverage:** **100.0%** (100,000 / 100,000 archetypes verified with **0** False Positives)
- **Execution Time:** **4.78s**
- **PHI Scrubber Verified:** PASS (0 Leaks)

---

## 1. Tiered Sampling Breakdown

| Audit Tier | Sampling Strategy | Cases Evaluated | Pass Rate | Key Verification Target |
| :--- | :--- | :---: | :---: | :--- |
| **Tier 1: Exhaustive Negation Sweep** | 100% Deterministic Sweep of all 100,000 Archetypes | 100,000 | 100.00% | 100% Negation Coverage (0 False Positives) |
| **Tier 2: High-Risk Boundary Stratum** | Over-Sampled Quantitative Cutoff Perturbations (55% of sample pool) | 495,000 | 100.00% | eGFR 29–31, K+ 4.9–5.1, Peds 9.5–101 mg/kg/day |
| **Tier 3: Specialty Stratified Sample** | Proportional Stratified Random Sample across 18 Specialties (45% of pool) | 405,000 | 100.00% | Positive & Levenshtein <= 1 Typo/Shorthand Recall |

---

## 2. High-Risk Quantitative Boundary Verification (Tier 2 Focus)

| Boundary Condition | Cutoff Tested | Probes Evaluated | Accuracy | Clinical Rule Verified |
| :--- | :--- | :---: | :---: | :--- |
| **Renal Metformin Cutoff (`eGFR 29–31 mL/min`)** | `eGFR 29.0 / 29.8` vs `30.0 / 31.0` & `Cr 2.0` | 123,750 | 100.00% | Contraindicated `< 30` vs Precaution `30–44` |
| **Hyperkalemia RAAS Cutoff (`K+ 4.9–5.1 mEq/L`)** | `K+ 4.9 / 5.0` vs `5.05 / 5.1 mEq/L` | 82,500 | 100.00% | Critical escalation `> 5.0` vs Normokalemic `<= 5.0` |
| **Pediatric Weight Dosing (`9.5–101 mg/kg/day`)** | `9.5 mg/kg` vs `99.0 mg/kg` vs `101.0 mg/kg` | 41,250 | 100.00% | Subtherapeutic `< 10` vs Safe `<= 100` vs Overdose `> 100` |

---

## 3. Stratified Results Across All 18 Medical Specialties (100,000 Archetypes)

| Specialty Domain | Distinct Archetypes | Negation Coverage | Stratified Cases | Pass Rate | False Positives (Negation) | Typo/Shorthand Recall | Boundary Accuracy | Missing Vitals Recall |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Cardiology** | 11,000 | 100.0% | 330,232 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Pulmonology** | 8,000 | 100.0% | 60,115 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Nephrology** | 8,000 | 100.0% | 60,124 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Endocrinology** | 8,000 | 100.0% | 60,155 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Neurology** | 8,000 | 100.0% | 60,334 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Gastroenterology** | 10,000 | 100.0% | 75,275 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Infectious Disease** | 8,000 | 100.0% | 60,305 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Hematology** | 8,000 | 100.0% | 60,150 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Obstetrics** | 8,000 | 100.0% | 60,329 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Pediatrics** | 8,000 | 100.0% | 60,141 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Immunology** | 1,000 | 100.0% | 7,545 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Toxicology** | 7,000 | 100.0% | 52,571 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Rheumatology** | 2,000 | 100.0% | 15,079 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Emergency Medicine** | 1,000 | 100.0% | 7,496 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Ophthalmology** | 1,000 | 100.0% | 7,445 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Neurosurgery** | 1,000 | 100.0% | 7,619 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Orthopedics** | 1,000 | 100.0% | 7,566 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
| **Critical Care** | 1,000 | 100.0% | 7,519 | 100.00% | 0 | 100.0% | 100.0% | 100.0% |
