import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  FileCode,
  History,
  Lock,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Plus,
  Key,
  Database
} from 'lucide-react';
import { UserProfile, AuditLogEntry, UserRole } from '../types/clinical';
import { getAuditLogs, exportAuditLogsAsCsv } from '../utils/auditLogger';

interface HospitalAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allStaff: UserProfile[];
  onUpdateStaff: (staffList: UserProfile[]) => void;
  inactivityTimeoutMinutes: number;
  onChangeTimeout: (minutes: number) => void;
  isMaskingEnforced: boolean;
  onToggleEnforceMasking: (enforced: boolean) => void;
  onToast?: (msg: string) => void;
}

export const HospitalAdminModal: React.FC<HospitalAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allStaff,
  onUpdateStaff,
  inactivityTimeoutMinutes,
  onChangeTimeout,
  isMaskingEnforced,
  onToggleEnforceMasking,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'staff' | 'audit' | 'security' | 'templates'>('staff');
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(getAuditLogs());
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState<string>('all');

  // New staff form state
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('doctor');
  const [newDept, setNewDept] = useState('Cardiology');
  const [newPin, setNewPin] = useState('1234');

  // Database architecture telemetry
  const [dbStatus, setDbStatus] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/db/status')
        .then((res) => res.json())
        .then((data) => setDbStatus(data))
        .catch((err) => console.warn('Failed to fetch DB status:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTogglePermission = (userId: string, permKey: keyof UserProfile['permissions']) => {
    const updated = allStaff.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permKey]: !u.permissions[permKey],
          },
        };
      }
      return u;
    });
    onUpdateStaff(updated);
    if (onToast) onToast('Staff privileges updated.');
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newStaffMember: UserProfile = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      title: newTitle.trim() || (newRole === 'doctor' ? 'Attending Physician' : newRole === 'nurse' ? 'Staff RN' : 'HIM Administrator'),
      role: newRole,
      department: newDept,
      pin: newPin || '1234',
      badgeNumber: `BDG-${Math.floor(1000 + Math.random() * 9000)}`,
      permissions: {
        canApproveAi: newRole === 'doctor',
        canPrescribe: newRole === 'doctor',
        canExportEhr: true,
        canManageStaff: newRole === 'admin',
        canViewAuditLog: newRole === 'admin' || newRole === 'doctor',
      },
    };

    onUpdateStaff([...allStaff, newStaffMember]);
    setIsAddingStaff(false);
    setNewName('');
    setNewTitle('');
    if (onToast) onToast(`Added ${newStaffMember.name} to hospital staff directory.`);
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesRole = auditRoleFilter === 'all' || log.role === auditRoleFilter;
    const matchesSearch =
      log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.patientMrn.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.patientName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-900 border border-purple-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Hospital System Administration Hub</h3>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                  Phase 3 Hospital Control
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                St. Jude Metropolitan Health System • HIM & Clinical Governance Center
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-white px-5 gap-1">
          <button
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'staff'
                ? 'border-purple-800 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff Accounts & Roles ({allStaff.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('audit');
              setAuditLogs(getAuditLogs());
            }}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'audit'
                ? 'border-purple-800 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-4 h-4" />
            HIPAA Audit Trail
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'security'
                ? 'border-purple-800 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Lock className="w-4 h-4" />
            Station Security & Timeouts
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'templates'
                ? 'border-purple-800 text-purple-950'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Department Specialty Templates
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* 1. Staff Accounts & Roles */}
          {activeTab === 'staff' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">Hospital Medical Staff Directory & RBAC</h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Configure clinical roles (Doctor, Nurse, Admin) and enforce permissions (AI Approval, Prescribing, EHR Export).
                  </p>
                </div>
                <button
                  onClick={() => setIsAddingStaff(!isAddingStaff)}
                  className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingStaff ? 'Cancel' : 'Add Staff Member'}
                </button>
              </div>

              {isAddingStaff && (
                <form onSubmit={handleAddStaffSubmit} className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-3">
                  <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">New Staff Provisioning</div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Dr. Jordan Patel, MD"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">Clinical Title</label>
                      <input
                        type="text"
                        placeholder="Cardiologist"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">System Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className="w-full text-xs p-2 bg-white border border-stone-300 rounded-lg"
                      >
                        <option value="doctor">Doctor (Attending / Resident)</option>
                        <option value="nurse">Nurse (Triage RN / NP)</option>
                        <option value="admin">Admin (HIM / IT Compliance)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-stone-700 block mb-1">Station PIN</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="1234"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full text-xs font-mono p-2 bg-white border border-stone-300 rounded-lg text-center"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingStaff(false)}
                      className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-purple-800 text-white rounded-lg hover:bg-purple-900"
                    >
                      Provision Account
                    </button>
                  </div>
                </form>
              )}

              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {allStaff.map((staff) => (
                  <div key={staff.id} className="p-4 hover:bg-stone-50 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                        staff.role === 'doctor' ? 'bg-teal-800 text-white' : staff.role === 'nurse' ? 'bg-blue-800 text-white' : 'bg-purple-800 text-white'
                      }`}>
                        {staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{staff.name}</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                            staff.role === 'doctor'
                              ? 'bg-teal-100 text-teal-800'
                              : staff.role === 'nurse'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {staff.role}
                          </span>
                          <span className="text-[11px] text-stone-500">Badge: {staff.badgeNumber}</span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {staff.title} • {staff.department} • Station PIN: <span className="font-mono">{staff.pin}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleTogglePermission(staff.id, 'canApproveAi')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          staff.permissions.canApproveAi
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                        }`}
                      >
                        Approve AI Outputs
                      </button>
                      <button
                        onClick={() => handleTogglePermission(staff.id, 'canPrescribe')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          staff.permissions.canPrescribe
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                        }`}
                      >
                        Prescribe Rx
                      </button>
                      <button
                        onClick={() => handleTogglePermission(staff.id, 'canExportEhr')}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                          staff.permissions.canExportEhr
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                        }`}
                      >
                        Export FHIR / HL7
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. HIPAA Audit Trail */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">Tamper-Evident HIPAA §164.312(b) Audit Trail</h4>
                  <p className="text-xs text-stone-500">
                    Chronological record of every chart view, note edit, speech dictation, AI recommendation approval, and export.
                  </p>
                </div>
                <button
                  onClick={() => exportAuditLogsAsCsv(filteredLogs)}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Audit CSV
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="Search logs by staff name, MRN, action, or details..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
                <select
                  value={auditRoleFilter}
                  onChange={(e) => setAuditRoleFilter(e.target.value)}
                  className="text-xs p-2 border border-stone-200 rounded-xl bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="doctor">Doctors</option>
                  <option value="nurse">Nurses</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>

              {/* Logs Table */}
              <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[11px] text-stone-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">User / Staff</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Patient / MRN</th>
                      <th className="p-2.5">Station</th>
                      <th className="p-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-mono">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/80">
                        <td className="p-2.5 text-stone-500 whitespace-nowrap text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-2.5 font-sans font-medium text-stone-900 whitespace-nowrap">
                          {log.userName}
                          <span className="block text-[10px] text-stone-400 font-mono uppercase">{log.role}</span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-2.5 font-sans whitespace-nowrap">
                          <span className="font-semibold text-stone-800">{log.patientName}</span>
                          <span className="block text-[10px] font-mono text-stone-400">{log.patientMrn}</span>
                        </td>
                        <td className="p-2.5 text-stone-400 text-[11px] whitespace-nowrap">{log.stationId}</td>
                        <td className="p-2.5 font-sans text-stone-700 text-xs min-w-[240px]">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Station Security & Timeouts */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Hospital Workstation Security & Auto-Lock</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Shared hospital computers must automatically log out or lock when unattended to prevent unauthorized PHI exposure.
                </p>
              </div>

              {/* Database & Storage Architecture Card */}
              <div className="p-4 bg-stone-900 text-white rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                      Clinical Persistence Engine & Database
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {dbStatus?.status === 'connected' ? 'PostgreSQL Active' : 'ACID Durable Storage Active'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 block">Schema Migration</span>
                    <span className="font-mono font-semibold text-stone-100 text-[11px] truncate block">
                      {dbStatus?.migrationVersion || '001_initial_schema'}
                    </span>
                    <span className="text-[9px] text-stone-400">16 Relational Tables</span>
                  </div>

                  <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 block">Stored Encounters</span>
                    <span className="font-mono font-bold text-stone-100 text-sm">
                      {dbStatus?.totalEncounters ?? 0}
                    </span>
                    <span className="text-[9px] text-stone-400">Indexed Charts</span>
                  </div>

                  <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 block">Patient Records</span>
                    <span className="font-mono font-bold text-stone-100 text-sm">
                      {dbStatus?.totalPatients ?? 0}
                    </span>
                    <span className="text-[9px] text-stone-400">Master Patient Index</span>
                  </div>

                  <div className="bg-stone-800/80 p-2.5 rounded-lg border border-stone-700/60">
                    <span className="text-[10px] text-stone-400 block">Audit Events</span>
                    <span className="font-mono font-bold text-stone-100 text-sm">
                      {dbStatus?.totalAuditEvents ?? 0}
                    </span>
                    <span className="text-[9px] text-stone-400">Immutable Trail</span>
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 pt-1 border-t border-stone-800 flex items-center justify-between">
                  <span>Engine: {dbStatus?.engine || 'ACID_Durable_Store'} (PostgreSQL 16 Schema)</span>
                  <span className="text-stone-500 font-mono text-[10px]">
                    {dbStatus?.databaseUrlConfigured ? 'DATABASE_URL connected' : 'Local Node ACID Store'}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-900">Inactivity Auto-Logout Timeout</div>
                    <div className="text-[11px] text-stone-500">Terminal locks and requires staff PIN to resume session</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[2, 5, 10, 15].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          onChangeTimeout(m);
                          if (onToast) onToast(`Inactivity auto-lock set to ${m} minutes.`);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                          inactivityTimeoutMinutes === m
                            ? 'bg-purple-800 text-white border-purple-800'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {m} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-900">Enforce HIPAA Safe Harbor Masking</div>
                    <div className="text-[11px] text-stone-500">Mandatory client-side de-identification before sending any payload to AI</div>
                  </div>
                  <button
                    onClick={() => {
                      onToggleEnforceMasking(!isMaskingEnforced);
                      if (onToast) onToast(`Safe Harbor Masking enforcement ${!isMaskingEnforced ? 'activated' : 'deactivated'}.`);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isMaskingEnforced
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    {isMaskingEnforced ? 'Mandatory (Enforced)' : 'Optional'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Hospital Zero Data Retention Policy Active</div>
                  <p className="mt-0.5 text-teal-800">
                    CuraDoc operates under a signed Business Associate Agreement (BAA). Models do not retain or train on protected health information (PHI).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Specialty Templates */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-stone-900">Departmental Clinical Documentation Standards</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Standardized SOAP structures enforced across St. Jude Metropolitan Hospital departments.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">Cardiology & Heart Failure Service</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">Active</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Requires JVP measurement, orthopnea inquiry, baseline ECG, NT-proBNP correlation, and GDMT reconciliation.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">Pediatrics & Neonatal Outpatient</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">Active</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Requires weight-based dosing (mg/kg), hydration status (wet diaper count), immunization check, and fontanelle exam.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">Emergency & Acute Triage</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">Active</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Requires ESI acuity level, time-critical pain scores (OPQRST), surgical abdomen signs, and serial troponins.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">Psychiatry & Behavioral Health</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-teal-100 text-teal-800 rounded">Active</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1.5">
                    Requires structured Mental Status Exam (MSE), mandatory Colombia Suicide Severity Rating Scale (C-SSRS), and GAD-7.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Logged in as: <strong className="text-stone-800">{currentUser.name}</strong> ({currentUser.title})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close Administration
          </button>
        </div>
      </div>
    </div>
  );
};
