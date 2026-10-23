import { PatientRecord, SavedEncounterRecord } from '../types/clinical';

export interface VitalDataPoint {
  encounterId: string;
  date: string;
  formattedDate: string;
  timestamp: number;
  chiefComplaint: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  weightKg: number | null;
  weightLbs: number | null;
  bmi: number | null;
  rawBP: string;
  encounterRecord?: SavedEncounterRecord;
}

export interface VitalsSummaryMetrics {
  count: number;
  firstDate: string;
  latestDate: string;
  // BP
  latestSystolic: number | null;
  latestDiastolic: number | null;
  deltaSystolic: number | null;
  deltaDiastolic: number | null;
  bpCategory: string;
  // HR
  latestHeartRate: number | null;
  deltaHeartRate: number | null;
  hrCategory: string;
  // Weight
  latestWeightKg: number | null;
  latestWeightLbs: number | null;
  deltaWeightKg: number | null;
  deltaWeightLbs: number | null;
  // BMI
  latestBmi: number | null;
  deltaBmi: number | null;
}

/**
 * Parses systolic and diastolic integers from strings like "154/92 mmHg", "120/80", "138 / 86"
 */
export function parseBloodPressure(bpString?: string): { systolic: number | null; diastolic: number | null } {
  if (!bpString) return { systolic: null, diastolic: null };
  
  const match = bpString.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (!match) return { systolic: null, diastolic: null };
  
  const sys = parseInt(match[1], 10);
  const dia = parseInt(match[2], 10);
  
  return {
    systolic: isNaN(sys) ? null : sys,
    diastolic: isNaN(dia) ? null : dia,
  };
}

/**
 * Calculates Mean Arterial Pressure (MAP) using standard formula: DBP + 1/3(SBP - DBP)
 */
export function computeMeanArterialPressure(systolic: number, diastolic: number): number {
  return diastolic + (systolic - diastolic) / 3;
}

/**
 * Parses and normalizes temperature strings to Celsius and Fahrenheit
 */
export function parseTemperature(tempStr?: string): { celsius: number; fahrenheit: number } | null {
  if (!tempStr) return null;
  const match = tempStr.match(/(\d{2,3}(?:\.\d+)?)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (tempStr.toLowerCase().includes('f') || val > 50) {
    const celsius = (val - 32) * (5 / 9);
    return { celsius: Math.round(celsius * 10) / 10, fahrenheit: Math.round(val * 10) / 10 };
  } else {
    const fahrenheit = (val * 9) / 5 + 32;
    return { celsius: Math.round(val * 10) / 10, fahrenheit: Math.round(fahrenheit * 10) / 10 };
  }
}


/**
 * Categorizes BP according to AHA/ACC guidelines
 */
export function getBloodPressureCategory(systolic: number | null, diastolic: number | null): {
  label: string;
  colorClass: string;
  severity: 'normal' | 'elevated' | 'stage1' | 'stage2' | 'crisis' | 'unknown';
} {
  if (systolic === null || diastolic === null) {
    return { label: 'Incomplete BP', colorClass: 'text-stone-500 bg-stone-100', severity: 'unknown' };
  }

  if (systolic >= 180 || diastolic >= 120) {
    return { label: 'Hypertensive Crisis', colorClass: 'text-rose-700 bg-rose-100 border border-rose-300', severity: 'crisis' };
  }
  if (systolic >= 140 || diastolic >= 90) {
    return { label: 'Stage 2 HTN', colorClass: 'text-rose-600 bg-rose-50 border border-rose-200', severity: 'stage2' };
  }
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
    return { label: 'Stage 1 HTN', colorClass: 'text-amber-700 bg-amber-50 border border-amber-200', severity: 'stage1' };
  }
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    return { label: 'Elevated BP', colorClass: 'text-yellow-700 bg-yellow-50 border border-yellow-200', severity: 'elevated' };
  }
  if (systolic < 120 && diastolic < 80) {
    return { label: 'Normal BP', colorClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200', severity: 'normal' };
  }

  return { label: 'Documented BP', colorClass: 'text-stone-700 bg-stone-100', severity: 'normal' };
}

/**
 * Categorizes heart rate
 */
export function getHeartRateCategory(hr: number | null): {
  label: string;
  colorClass: string;
  severity: 'normal' | 'bradycardia' | 'tachycardia' | 'unknown';
} {
  if (hr === null || hr <= 0) {
    return { label: 'No HR', colorClass: 'text-stone-500 bg-stone-100', severity: 'unknown' };
  }
  if (hr < 60) {
    return { label: 'Bradycardia (<60 bpm)', colorClass: 'text-amber-700 bg-amber-50 border border-amber-200', severity: 'bradycardia' };
  }
  if (hr > 100) {
    return { label: 'Tachycardia (>100 bpm)', colorClass: 'text-rose-700 bg-rose-50 border border-rose-200', severity: 'tachycardia' };
  }
  return { label: 'Normal (60-100 bpm)', colorClass: 'text-emerald-700 bg-emerald-50 border border-emerald-200', severity: 'normal' };
}

/**
 * Formats date into a clean clinical label
 */
export function formatEncounterDate(dateStr?: string): string {
  if (!dateStr) return 'Unknown Date';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Extracts and prepares chronological data points from a list of encounters
 */
export function extractVitalsHistory(
  encounters: SavedEncounterRecord[],
  currentPatient?: PatientRecord
): VitalDataPoint[] {
  const points: VitalDataPoint[] = [];

  // Add encounters
  for (const enc of encounters) {
    const rawDate = enc.patient.encounterDate || enc.savedAt?.split('T')[0] || '';
    const dateObj = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00`);
    const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();

    const { systolic, diastolic } = parseBloodPressure(enc.patient.vitals.bloodPressure);
    const hr = enc.patient.vitals.heartRate > 0 ? enc.patient.vitals.heartRate : null;
    const wtKg = enc.patient.vitals.weightKg > 0 ? enc.patient.vitals.weightKg : null;
    const wtLbs = wtKg ? Number((wtKg * 2.20462).toFixed(1)) : null;

    let bmi: number | null = null;
    const heightM = enc.patient.vitals.heightCm / 100;
    if (heightM > 0 && wtKg) {
      bmi = Number((wtKg / (heightM * heightM)).toFixed(1));
    }

    points.push({
      encounterId: enc.id,
      date: rawDate,
      formattedDate: formatEncounterDate(rawDate),
      timestamp,
      chiefComplaint: enc.patient.chiefComplaint || 'Encounter',
      systolic,
      diastolic,
      heartRate: hr,
      weightKg: wtKg,
      weightLbs: wtLbs,
      bmi,
      rawBP: enc.patient.vitals.bloodPressure || '',
      encounterRecord: enc,
    });
  }

  // If current patient is not in the saved encounters list, we can add it as a potential current point
  if (
    currentPatient &&
    currentPatient.name &&
    !points.some((p) => p.encounterId === currentPatient.id)
  ) {
    const rawDate = currentPatient.encounterDate || new Date().toISOString().split('T')[0];
    const dateObj = new Date(rawDate.includes('T') ? rawDate : `${rawDate}T12:00:00`);
    const timestamp = isNaN(dateObj.getTime()) ? Date.now() : dateObj.getTime();

    const { systolic, diastolic } = parseBloodPressure(currentPatient.vitals.bloodPressure);
    const hr = currentPatient.vitals.heartRate > 0 ? currentPatient.vitals.heartRate : null;
    const wtKg = currentPatient.vitals.weightKg > 0 ? currentPatient.vitals.weightKg : null;
    const wtLbs = wtKg ? Number((wtKg * 2.20462).toFixed(1)) : null;

    let bmi: number | null = null;
    const heightM = currentPatient.vitals.heightCm / 100;
    if (heightM > 0 && wtKg) {
      bmi = Number((wtKg / (heightM * heightM)).toFixed(1));
    }

    // Only add if it has at least one vital documented
    if (systolic !== null || hr !== null || wtKg !== null) {
      points.push({
        encounterId: currentPatient.id,
        date: rawDate,
        formattedDate: `${formatEncounterDate(rawDate)} (Current Draft)`,
        timestamp,
        chiefComplaint: currentPatient.chiefComplaint || 'Current active session',
        systolic,
        diastolic,
        heartRate: hr,
        weightKg: wtKg,
        weightLbs: wtLbs,
        bmi,
        rawBP: currentPatient.vitals.bloodPressure || '',
      });
    }
  }

  // Sort chronologically ascending (oldest to newest)
  points.sort((a, b) => a.timestamp - b.timestamp);

  return points;
}

/**
 * Computes summary change metrics across encounters
 */
export function computeVitalsMetrics(history: VitalDataPoint[]): VitalsSummaryMetrics {
  const empty: VitalsSummaryMetrics = {
    count: history.length,
    firstDate: history[0]?.formattedDate || '',
    latestDate: history[history.length - 1]?.formattedDate || '',
    latestSystolic: null,
    latestDiastolic: null,
    deltaSystolic: null,
    deltaDiastolic: null,
    bpCategory: 'No Data',
    latestHeartRate: null,
    deltaHeartRate: null,
    hrCategory: 'No Data',
    latestWeightKg: null,
    latestWeightLbs: null,
    deltaWeightKg: null,
    deltaWeightLbs: null,
    latestBmi: null,
    deltaBmi: null,
  };

  if (history.length === 0) return empty;

  const validBP = history.filter((p) => p.systolic !== null && p.diastolic !== null);
  const validHR = history.filter((p) => p.heartRate !== null);
  const validWeight = history.filter((p) => p.weightKg !== null);
  const validBMI = history.filter((p) => p.bmi !== null);

  const latestBP = validBP[validBP.length - 1];
  const firstBP = validBP[0];
  const deltaSys =
    latestBP && firstBP && validBP.length > 1
      ? latestBP.systolic! - firstBP.systolic!
      : null;
  const deltaDia =
    latestBP && firstBP && validBP.length > 1
      ? latestBP.diastolic! - firstBP.diastolic!
      : null;

  const latestHR = validHR[validHR.length - 1];
  const firstHR = validHR[0];
  const deltaHR =
    latestHR && firstHR && validHR.length > 1
      ? latestHR.heartRate! - firstHR.heartRate!
      : null;

  const latestWt = validWeight[validWeight.length - 1];
  const firstWt = validWeight[0];
  const deltaWtKg =
    latestWt && firstWt && validWeight.length > 1
      ? Number((latestWt.weightKg! - firstWt.weightKg!).toFixed(1))
      : null;
  const deltaWtLbs =
    latestWt && firstWt && validWeight.length > 1
      ? Number((latestWt.weightLbs! - firstWt.weightLbs!).toFixed(1))
      : null;

  const latestB = validBMI[validBMI.length - 1];
  const firstB = validBMI[0];
  const deltaB =
    latestB && firstB && validBMI.length > 1
      ? Number((latestB.bmi! - firstB.bmi!).toFixed(1))
      : null;

  return {
    count: history.length,
    firstDate: history[0]?.formattedDate || '',
    latestDate: history[history.length - 1]?.formattedDate || '',
    latestSystolic: latestBP?.systolic ?? null,
    latestDiastolic: latestBP?.diastolic ?? null,
    deltaSystolic: deltaSys,
    deltaDiastolic: deltaDia,
    bpCategory: latestBP
      ? getBloodPressureCategory(latestBP.systolic, latestBP.diastolic).label
      : 'No Data',
    latestHeartRate: latestHR?.heartRate ?? null,
    deltaHeartRate: deltaHR,
    hrCategory: latestHR
      ? getHeartRateCategory(latestHR.heartRate).label
      : 'No Data',
    latestWeightKg: latestWt?.weightKg ?? null,
    latestWeightLbs: latestWt?.weightLbs ?? null,
    deltaWeightKg: deltaWtKg,
    deltaWeightLbs: deltaWtLbs,
    latestBmi: latestB?.bmi ?? null,
    deltaBmi: deltaB,
  };
}
