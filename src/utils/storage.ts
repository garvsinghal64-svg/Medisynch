import { SavedEncounterRecord } from '../types/clinical';
import { CLINICAL_CASES, FALLBACK_ANALYSES } from '../data/clinicalTemplates';

const STORAGE_KEY = 'curadoc_saved_encounters_v2';
const LEGACY_STORAGE_KEY = 'curadoc_saved_encounters_v1';

// Seeded historical encounters to demonstrate multi-visit vitals trajectory
const HISTORICAL_ENCOUNTERS_SEED: SavedEncounterRecord[] = [
  // --- Arthur Pendelton (Cardiology / HTN) ---
  {
    id: 'enc-arthur-1',
    savedAt: '2026-04-12T09:30:00Z',
    patient: {
      id: 'pt-8821',
      name: 'Arthur Pendelton',
      age: 64,
      gender: 'Male',
      mrn: 'MRN-782910',
      encounterDate: '2026-04-12',
      chiefComplaint: 'Routine 6-month HTN checkup. Blood pressure controlled on Lisinopril 20mg.',
      vitals: {
        bloodPressure: '136/84 mmHg',
        heartRate: 74,
        respiratoryRate: 16,
        temperature: '36.7 °C (98.0 °F)',
        spO2: 97,
        weightKg: 88.5,
        heightCm: 178,
      },
    },
    note: {
      subjective: 'Patient returns for semi-annual HTN monitoring. Denies chest pain, orthopnea, or dyspnea.',
      objective: 'Alert, well-appearing. BP 136/84 mmHg, HR 74 bpm regular. Clear lung fields bilaterally. No edema.',
      assessment: 'Essential hypertension, adequately controlled on monotherapy.',
      plan: 'Continue Lisinopril 20mg daily. Routine labs in 6 months.',
      medications: ['Lisinopril 20mg PO daily', 'Atorvastatin 20mg PO daily'],
      allergies: ['Sulfa drugs (rash)'],
    },
    analysis: null,
  },
  {
    id: 'enc-arthur-2',
    savedAt: '2026-07-20T11:15:00Z',
    patient: {
      id: 'pt-8821',
      name: 'Arthur Pendelton',
      age: 64,
      gender: 'Male',
      mrn: 'MRN-782910',
      encounterDate: '2026-07-20',
      chiefComplaint: 'Follow-up for mild bilateral knee pain; noted slight weight gain.',
      vitals: {
        bloodPressure: '144/88 mmHg',
        heartRate: 78,
        respiratoryRate: 16,
        temperature: '36.8 °C (98.2 °F)',
        spO2: 96,
        weightKg: 89.8,
        heightCm: 178,
      },
    },
    note: {
      subjective: 'Patient reports left knee stiffness with climbing stairs. Has been less active recently.',
      objective: 'BP 144/88 mmHg, HR 78 bpm. Lungs clear. Mild crepitus left knee with full flexion. No peripheral edema.',
      assessment: '1. Essential hypertension, borderline elevation. 2. Mild knee osteoarthritis.',
      plan: 'Emphasize low-impact walking and dietary sodium restriction. Avoid chronic NSAID use.',
      medications: ['Lisinopril 20mg PO daily', 'Atorvastatin 20mg PO daily'],
      allergies: ['Sulfa drugs (rash)'],
    },
    analysis: null,
  },
  {
    id: 'cardiology-htn-dyspnea',
    savedAt: '2026-10-17T14:20:00Z',
    patient: CLINICAL_CASES[0].patient,
    note: CLINICAL_CASES[0].initialNote,
    analysis: FALLBACK_ANALYSES['cardiology-htn-dyspnea'] || null,
  },

  // --- Elena Rostova (Endocrinology / T2D) ---
  {
    id: 'enc-elena-1',
    savedAt: '2025-11-10T10:00:00Z',
    patient: {
      id: 'pt-5120',
      name: 'Elena Rostova',
      age: 52,
      gender: 'Female',
      mrn: 'MRN-609124',
      encounterDate: '2025-11-10',
      chiefComplaint: 'Annual comprehensive diabetic examination and routine lab check.',
      vitals: {
        bloodPressure: '144/90 mmHg',
        heartRate: 80,
        respiratoryRate: 16,
        temperature: '36.9 °C (98.4 °F)',
        spO2: 98,
        weightKg: 87.2,
        heightCm: 165,
      },
    },
    note: {
      subjective: '52yo female with Type 2 Diabetes for annual review. Adherent to Metformin 1000mg BID.',
      objective: 'BP 144/90 mmHg, HR 80 bpm, BMI 32.0. Foot sensation intact. No ulcers.',
      assessment: '1. T2D, suboptimal glycemic control. 2. Hypertension, stage 2.',
      plan: 'Reinforce nutritional counseling and exercise. Repeat HbA1c in 6 months.',
      medications: ['Metformin 1000mg BID'],
      allergies: [],
    },
    analysis: null,
  },
  {
    id: 'enc-elena-2',
    savedAt: '2026-04-18T13:45:00Z',
    patient: {
      id: 'pt-5120',
      name: 'Elena Rostova',
      age: 52,
      gender: 'Female',
      mrn: 'MRN-609124',
      encounterDate: '2026-04-18',
      chiefComplaint: 'Semi-annual diabetic checkup; weight loss of ~1.8 kg following diet changes.',
      vitals: {
        bloodPressure: '140/88 mmHg',
        heartRate: 76,
        respiratoryRate: 16,
        temperature: '37.0 °C (98.6 °F)',
        spO2: 98,
        weightKg: 85.4,
        heightCm: 165,
      },
    },
    note: {
      subjective: 'Patient feels more energetic. Has incorporated 30 min daily walking.',
      objective: 'BP 140/88 mmHg, HR 76 bpm, BMI 31.4. Monofilament exam normal.',
      assessment: '1. T2D, improving weight trajectory. 2. Stage 1 HTN.',
      plan: 'Encourage ongoing dietary adjustments. Continue Metformin 1000mg BID.',
      medications: ['Metformin 1000mg BID', 'Atorvastatin 20mg PO daily'],
      allergies: [],
    },
    analysis: null,
  },
  {
    id: 'endocrinology-t2d-renal',
    savedAt: '2026-10-17T15:30:00Z',
    patient: CLINICAL_CASES[2].patient,
    note: CLINICAL_CASES[2].initialNote,
    analysis: FALLBACK_ANALYSES['endocrinology-t2d-renal'] || null,
  },

  // --- Maya Chen (Pediatrics) ---
  {
    id: 'enc-maya-1',
    savedAt: '2026-06-02T10:30:00Z',
    patient: {
      id: 'pt-3394',
      name: 'Maya Chen',
      age: 4,
      gender: 'Female',
      mrn: 'MRN-442109',
      encounterDate: '2026-06-02',
      chiefComplaint: 'Well-child 4-year examination and preschool physical.',
      vitals: {
        bloodPressure: '94/58 mmHg',
        heartRate: 104,
        respiratoryRate: 22,
        temperature: '36.8 °C (98.2 °F)',
        spO2: 100,
        weightKg: 15.1,
        heightCm: 101,
      },
    },
    note: {
      subjective: 'Mother brings Maya for routine 4-year checkup. No current complaints or illnesses.',
      objective: 'Happy, playful 4yo female. Vitals: HR 104, RR 22, BP 94/58, Wt 15.1 kg. Ears clear bilaterally.',
      assessment: 'Healthy 4-year-old child. Normal developmental milestones.',
      plan: 'Routine immunizations administered. Dental referral.',
      medications: ['Pediatric multivitamin'],
      allergies: ['Penicillins (Amoxicillin: hives, periorbital edema)'],
    },
    analysis: null,
  },
  {
    id: 'pediatrics-otitis-media',
    savedAt: '2026-10-17T16:00:00Z',
    patient: CLINICAL_CASES[1].patient,
    note: CLINICAL_CASES[1].initialNote,
    analysis: FALLBACK_ANALYSES['pediatrics-otitis-media'] || null,
  },

  // --- Marcus Vance (Emergency / Chest Pain) ---
  {
    id: 'enc-marcus-1',
    savedAt: '2025-12-05T09:15:00Z',
    patient: {
      id: 'pt-9034',
      name: 'Marcus Vance',
      age: 48,
      gender: 'Male',
      mrn: 'MRN-194038',
      encounterDate: '2025-12-05',
      chiefComplaint: 'Routine annual physical exam. Quit smoking 2 years ago.',
      vitals: {
        bloodPressure: '134/82 mmHg',
        heartRate: 72,
        respiratoryRate: 14,
        temperature: '36.8 °C (98.2 °F)',
        spO2: 99,
        weightKg: 84.0,
        heightCm: 175,
      },
    },
    note: {
      subjective: '48yo male for annual exam. No current chest pain or shortness of breath.',
      objective: 'BP 134/82 mmHg, HR 72 bpm. Heart and lung sounds normal.',
      assessment: '1. Stage 1 hypertension. 2. Former tobacco smoker (15 pack-years).',
      plan: 'Encourage aerobic exercise and heart-healthy diet.',
      medications: ['Rosuvastatin 10mg PO daily'],
      allergies: ['Codeine (nausea/dizziness)'],
    },
    analysis: null,
  },
  {
    id: 'enc-marcus-2',
    savedAt: '2026-06-14T14:30:00Z',
    patient: {
      id: 'pt-9034',
      name: 'Marcus Vance',
      age: 48,
      gender: 'Male',
      mrn: 'MRN-194038',
      encounterDate: '2026-06-14',
      chiefComplaint: 'Follow-up for mild dyspepsia and reflux after heavy dinners.',
      vitals: {
        bloodPressure: '138/84 mmHg',
        heartRate: 74,
        respiratoryRate: 16,
        temperature: '36.9 °C (98.4 °F)',
        spO2: 98,
        weightKg: 85.2,
        heightCm: 175,
      },
    },
    note: {
      subjective: 'Reports occasional heartburn after spicy foods. Denies exertional chest tightness.',
      objective: 'BP 138/84 mmHg, HR 74 bpm. Abdomen soft, mild epigastric tenderness. ECG normal.',
      assessment: 'Gastroesophageal reflux disease (GERD).',
      plan: 'Start Famotidine 20mg PRN. Return precautions reviewed.',
      medications: ['Rosuvastatin 10mg PO daily', 'Famotidine 20mg PRN'],
      allergies: ['Codeine (nausea/dizziness)'],
    },
    analysis: null,
  },
  {
    id: 'emergency-chest-pain',
    savedAt: '2026-10-17T17:15:00Z',
    patient: CLINICAL_CASES[3].patient,
    note: CLINICAL_CASES[3].initialNote,
    analysis: FALLBACK_ANALYSES['emergency-chest-pain'] || null,
  },
];

export function getSavedEncounters(): SavedEncounterRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check if legacy storage exists
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      let list = [...HISTORICAL_ENCOUNTERS_SEED];

      if (legacyRaw) {
        try {
          const legacyItems: SavedEncounterRecord[] = JSON.parse(legacyRaw);
          // Merge user-saved legacy encounters if they have unique IDs
          for (const item of legacyItems) {
            if (!list.some((existing) => existing.id === item.id)) {
              list.push(item);
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list;
    }

    const parsed: SavedEncounterRecord[] = JSON.parse(raw);

    // Ensure our historical seed records are present for seamless demo if user has only 1 record
    const hasArthurHistory = parsed.some((p) => p.id === 'enc-arthur-1');
    if (!hasArthurHistory) {
      const merged = [...parsed, ...HISTORICAL_ENCOUNTERS_SEED.filter((s) => !parsed.some((p) => p.id === s.id))];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    return parsed;
  } catch (err) {
    console.error('Failed to load saved encounters from localStorage:', err);
    return HISTORICAL_ENCOUNTERS_SEED;
  }
}

/**
 * Saves or updates an encounter in localStorage.
 * Distinguishes different encounters by unique encounter ID or by encounter date for the same patient.
 */
export function saveEncounter(record: SavedEncounterRecord): SavedEncounterRecord[] {
  try {
    const current = getSavedEncounters();
    
    // An encounter is matched if:
    // 1) Same encounter ID
    // OR 2) Same patient MRN AND same encounterDate (updating the same day's encounter)
    const existingIndex = current.findIndex(
      (item) =>
        item.id === record.id ||
        (record.patient.mrn &&
          item.patient.mrn === record.patient.mrn &&
          item.patient.encounterDate === record.patient.encounterDate)
    );

    let updated: SavedEncounterRecord[];

    if (existingIndex >= 0) {
      // Update existing record
      updated = [...current];
      updated[existingIndex] = {
        ...record,
        id: updated[existingIndex].id, // preserve ID
        savedAt: new Date().toISOString(),
      };
    } else {
      // Insert new encounter at the beginning
      updated = [
        {
          ...record,
          id: record.id || `enc-${Date.now()}`,
          savedAt: new Date().toISOString(),
        },
        ...current,
      ];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Asynchronously synchronize with backend database layer
    const savedRecord = updated[existingIndex >= 0 ? existingIndex : 0];
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savedRecord),
      }).catch((err) => {
        console.warn('Background server encounter persistence notice (offline resilient):', err);
      });
    }

    return updated;
  } catch (err) {
    console.error('Failed to save encounter to localStorage:', err);
    return getSavedEncounters();
  }
}

export function deleteEncounter(id: string): SavedEncounterRecord[] {
  try {
    const current = getSavedEncounters();
    const filtered = current.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    // Synchronize delete with backend
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(`/api/encounters/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch((err) => {
        console.warn('Background server encounter deletion notice:', err);
      });
    }

    return filtered;
  } catch (err) {
    console.error('Failed to delete encounter from localStorage:', err);
    return getSavedEncounters();
  }
}

export async function fetchServerEncounters(): Promise<SavedEncounterRecord[] | null> {
  try {
    const res = await fetch('/api/encounters?limit=100');
    if (!res.ok) return null;
    const data = await res.json();
    return data.items || null;
  } catch {
    return null;
  }
}


/**
 * Returns all encounters belonging to a specific patient by MRN or name
 */
export function getEncountersForPatient(mrn?: string, name?: string): SavedEncounterRecord[] {
  const all = getSavedEncounters();
  if (!mrn && !name) return [];

  return all.filter((enc) => {
    if (mrn && enc.patient.mrn && enc.patient.mrn === mrn) {
      return true;
    }
    if (name && enc.patient.name && enc.patient.name.trim().toLowerCase() === name.trim().toLowerCase()) {
      return true;
    }
    return false;
  });
}
