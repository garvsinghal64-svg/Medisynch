import { UserProfile } from '../types/clinical';

export const DEFAULT_STAFF: UserProfile[] = [
  {
    id: 'usr-doc-01',
    name: 'Dr. Elena Rossi, MD',
    title: 'Attending Physician & Cardiologist',
    role: 'doctor',
    department: 'Cardiovascular Medicine',
    pin: '1234',
    badgeNumber: 'BDG-4921',
    permissions: {
      canApproveAi: true,
      canPrescribe: true,
      canExportEhr: true,
      canManageStaff: false,
      canViewAuditLog: true,
    },
  },
  {
    id: 'usr-rn-02',
    name: 'Marcus Chen, BSN, RN',
    title: 'Charge Nurse & Clinical Triage',
    role: 'nurse',
    department: 'Acute Care & Triage',
    pin: '2345',
    badgeNumber: 'BDG-8812',
    permissions: {
      canApproveAi: false,
      canPrescribe: false,
      canExportEhr: true,
      canManageStaff: false,
      canViewAuditLog: false,
    },
  },
  {
    id: 'usr-admin-01',
    name: 'Sarah Vance, RHIA',
    title: 'HIM Director & HIPAA Privacy Officer',
    role: 'admin',
    department: 'Health Informatics & Governance',
    pin: '9999',
    badgeNumber: 'BDG-1002',
    permissions: {
      canApproveAi: false,
      canPrescribe: false,
      canExportEhr: true,
      canManageStaff: true,
      canViewAuditLog: true,
    },
  },
];
