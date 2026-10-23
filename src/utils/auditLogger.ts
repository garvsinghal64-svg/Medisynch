import { AuditLogEntry, AuditActionType, UserRole } from '../types/clinical';

const AUDIT_LOG_STORAGE_KEY = 'curadoc_hipaa_audit_trail_v1';

// Initial preloaded mock audit log entries for realistic hospital auditing experience
const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    userId: 'usr-doc-01',
    userName: 'Dr. Elena Rossi, MD',
    role: 'doctor',
    action: 'VIEW_CHART',
    patientMrn: 'MRN-782910',
    patientName: 'Arthur Pendelton',
    details: 'Opened clinical chart and prior encounter notes from General Cardiology Clinic.',
    stationId: 'WS-CARDIOLOGY-04',
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 3600000 * 2.1).toISOString(),
    userId: 'usr-rn-02',
    userName: 'Marcus Chen, BSN, RN',
    role: 'nurse',
    action: 'EDIT_SOAP',
    patientMrn: 'MRN-782910',
    patientName: 'Arthur Pendelton',
    details: 'Recorded triage vitals: BP 154/92 mmHg, HR 84, SpO2 95%, weight 91.5 kg.',
    stationId: 'WS-TRIAGE-02',
  },
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    userId: 'usr-doc-01',
    userName: 'Dr. Elena Rossi, MD',
    role: 'doctor',
    action: 'AI_ANALYSIS_REQUEST',
    patientMrn: 'MRN-782910',
    patientName: 'Arthur Pendelton',
    details: 'Triggered Clinical Decision Support Engine with HIPAA Safe Harbor Masking enabled.',
    stationId: 'WS-CARDIOLOGY-04',
  },
  {
    id: 'log-004',
    timestamp: new Date(Date.now() - 3600000 * 1.6).toISOString(),
    userId: 'usr-doc-01',
    userName: 'Dr. Elena Rossi, MD',
    role: 'doctor',
    action: 'APPROVE_AI_OUTPUT',
    patientMrn: 'MRN-782910',
    patientName: 'Arthur Pendelton',
    details: 'Physician approved differential: "Acute Decompensated Heart Failure (HFpEF)" citing ACC/AHA guidelines.',
    stationId: 'WS-CARDIOLOGY-04',
  },
  {
    id: 'log-005',
    timestamp: new Date(Date.now() - 3600000 * 0.9).toISOString(),
    userId: 'usr-admin-01',
    userName: 'Sarah Vance, RHIA',
    role: 'admin',
    action: 'VIEW_CHART',
    patientMrn: 'MRN-782910',
    patientName: 'Arthur Pendelton',
    details: 'Health Information Management quarterly chart compliance review.',
    stationId: 'WS-HIM-ADMIN-01',
  },
];

let inMemoryAuditLogs: AuditLogEntry[] = [...INITIAL_AUDIT_LOGS];

export function getAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return inMemoryAuditLogs;
  }
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(raw);
  } catch {
    return inMemoryAuditLogs;
  }
}

export const getAuditLog = getAuditLogs;

export function logAuditEvent(entry: {
  userId: string;
  userName: string;
  role: UserRole;
  action: AuditActionType;
  patientMrn: string;
  patientName: string;
  details: string;
  stationId?: string;
}): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    id: `log-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`,
    timestamp: new Date().toISOString(),
    userId: entry.userId,
    userName: entry.userName,
    role: entry.role,
    action: entry.action,
    patientMrn: entry.patientMrn || 'N/A',
    patientName: entry.patientName || 'Unknown Patient',
    details: entry.details,
    stationId: entry.stationId || 'WS-CLINIC-STATION',
  };

  try {
    const current = getAuditLogs();
    const updated = [newEntry, ...current].slice(0, 500); // retain last 500 actions
    inMemoryAuditLogs = updated;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error('Failed to commit HIPAA audit log entry', err);
  }

  return newEntry;
}

export function exportAuditLogsAsCsv(logs: AuditLogEntry[]): void {
  const headers = ['Timestamp', 'Log ID', 'User Name', 'Role', 'Action', 'Patient MRN', 'Patient Name', 'Station ID', 'Details'];
  const rows = logs.map((l) => [
    `"${l.timestamp}"`,
    `"${l.id}"`,
    `"${l.userName}"`,
    `"${l.role.toUpperCase()}"`,
    `"${l.action}"`,
    `"${l.patientMrn}"`,
    `"${l.patientName}"`,
    `"${l.stationId}"`,
    `"${l.details.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CuraDoc_HIPAA_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
