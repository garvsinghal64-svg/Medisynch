export interface HospitalAnalyticsData {
  notesCompletedToday: number;
  notesCompletedThisMonth: number;
  avgTimeSavedPerNoteMinutes: number;
  totalDoctorHoursSaved: number;
  codingAccuracyPercent: number;
  aiAcceptanceRatePercent: number;
  aiModifiedRatePercent: number;
  aiRejectedRatePercent: number;
  departmentBreakdown: Array<{
    name: string;
    encounters: number;
    hoursSaved: number;
    accuracyPercent: number;
  }>;
  recentCompletions: Array<{
    id: string;
    doctor: string;
    patientMrn: string;
    specialty: string;
    timeSavedMin: number;
    timestamp: string;
  }>;
}

export function getHospitalAnalytics(): HospitalAnalyticsData {
  return {
    notesCompletedToday: 18,
    notesCompletedThisMonth: 164,
    avgTimeSavedPerNoteMinutes: 18.5,
    totalDoctorHoursSaved: 50.6,
    codingAccuracyPercent: 98.4,
    aiAcceptanceRatePercent: 84.6,
    aiModifiedRatePercent: 11.2,
    aiRejectedRatePercent: 4.2,
    departmentBreakdown: [
      { name: 'Cardiology Clinic', encounters: 48, hoursSaved: 14.8, accuracyPercent: 99.1 },
      { name: 'Emergency Department', encounters: 52, hoursSaved: 16.0, accuracyPercent: 98.2 },
      { name: 'Pediatrics Outpatient', encounters: 36, hoursSaved: 11.1, accuracyPercent: 97.9 },
      { name: 'General Internal Medicine', encounters: 28, hoursSaved: 8.7, accuracyPercent: 98.6 },
    ],
    recentCompletions: [
      { id: '1', doctor: 'Dr. Elena Rossi, MD', patientMrn: 'MRN-782910', specialty: 'Cardiology', timeSavedMin: 19.2, timestamp: '12m ago' },
      { id: '2', doctor: 'Dr. Marcus Vance, DO', patientMrn: 'MRN-449102', specialty: 'Emergency', timeSavedMin: 22.0, timestamp: '34m ago' },
      { id: '3', doctor: 'Dr. Priya Patel, MD', patientMrn: 'MRN-902314', specialty: 'Pediatrics', timeSavedMin: 16.5, timestamp: '1h ago' },
      { id: '4', doctor: 'Dr. Elena Rossi, MD', patientMrn: 'MRN-330198', specialty: 'Cardiology', timeSavedMin: 18.0, timestamp: '2h ago' },
    ],
  };
}
