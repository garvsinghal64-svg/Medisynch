import React from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Award,
  Zap,
  Building2,
  FileCheck2,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import { getHospitalAnalytics } from '../utils/hospitalAnalytics';

interface HospitalAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HospitalAnalyticsModal: React.FC<HospitalAnalyticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const stats = getHospitalAnalytics();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-900 tracking-tight">Hospital Clinical Analytics & Time-Savings Report</h3>
                <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Phase 3 Governance
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                St. Jude Metropolitan Health System • Executive Documentation & Efficiency Dashboard
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

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Key KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-teal-50/70 rounded-2xl border border-teal-200/80">
              <div className="flex items-center justify-between text-teal-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Notes Completed</span>
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-teal-950">{stats.notesCompletedThisMonth}</div>
              <p className="text-[11px] text-teal-700 mt-1">
                <strong>+{stats.notesCompletedToday}</strong> signed today
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80">
              <div className="flex items-center justify-between text-amber-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Avg Time Saved</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-amber-950">{stats.avgTimeSavedPerNoteMinutes} min</div>
              <p className="text-[11px] text-amber-700 mt-1">
                Per patient encounter (vs manual)
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Doctor Hours Saved</span>
                <Zap className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-emerald-950">{stats.totalDoctorHoursSaved} hrs</div>
              <p className="text-[11px] text-emerald-700 mt-1">
                ~6.3 physician shifts reclaimed
              </p>
            </div>

            <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80">
              <div className="flex items-center justify-between text-blue-800 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Coding Accuracy</span>
                <Award className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-blue-950">{stats.codingAccuracyPercent}%</div>
              <p className="text-[11px] text-blue-700 mt-1">
                ICD-10 & HCC specificity rate
              </p>
            </div>
          </div>

          {/* AI Decision Support Trust & Physician Approval Breakdown */}
          <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ThumbsUp className="w-4 h-4 text-teal-700" />
                  Clinical Governance: Physician Approval Breakdown
                </h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Under hospital policy, AI suggestions never enter clinical records automatically.
                </p>
              </div>
              <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-1 rounded-full border border-teal-200">
                {stats.aiAcceptanceRatePercent}% Physician Adoption
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-4 rounded-full bg-stone-200 overflow-hidden flex">
              <div
                style={{ width: `${stats.aiAcceptanceRatePercent}%` }}
                className="bg-emerald-600 h-full flex items-center justify-center text-[10px] text-white font-bold"
                title={`Approved As-Is: ${stats.aiAcceptanceRatePercent}%`}
              >
                {stats.aiAcceptanceRatePercent}%
              </div>
              <div
                style={{ width: `${stats.aiModifiedRatePercent}%` }}
                className="bg-amber-500 h-full flex items-center justify-center text-[10px] text-white font-bold"
                title={`Modified by Doctor: ${stats.aiModifiedRatePercent}%`}
              >
                {stats.aiModifiedRatePercent}%
              </div>
              <div
                style={{ width: `${stats.aiRejectedRatePercent}%` }}
                className="bg-rose-500 h-full flex items-center justify-center text-[10px] text-white font-bold"
                title={`Rejected / Dismissed: ${stats.aiRejectedRatePercent}%`}
              >
                {stats.aiRejectedRatePercent}%
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 text-stone-600">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
                <span>Approved As-Is (<strong>{stats.aiAcceptanceRatePercent}%</strong>)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Modified by Doctor (<strong>{stats.aiModifiedRatePercent}%</strong>)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Dismissed with Clinical Rationale (<strong>{stats.aiRejectedRatePercent}%</strong>)</span>
              </div>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-stone-600" />
              Department Efficiency & Coding Metric Breakdown
            </h4>

            <div className="border border-stone-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[11px] text-stone-600 font-semibold uppercase">
                  <tr>
                    <th className="p-3">Clinical Department</th>
                    <th className="p-3">Monthly Encounters</th>
                    <th className="p-3">Doctor Hours Saved</th>
                    <th className="p-3">Documentation Completeness</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {stats.departmentBreakdown.map((dept, i) => (
                    <tr key={i} className="hover:bg-stone-50">
                      <td className="p-3 font-semibold text-stone-900">{dept.name}</td>
                      <td className="p-3 font-mono text-stone-700">{dept.encounters}</td>
                      <td className="p-3 font-mono text-emerald-800 font-bold">{dept.hoursSaved} hrs</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          {dept.accuracyPercent}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Completed Records */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Recent Attested Encounters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stats.recentCompletions.map((rec) => (
                <div key={rec.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900">{rec.doctor}</span>
                    <div className="text-[11px] text-stone-500">{rec.specialty} • {rec.patientMrn}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-emerald-800 font-bold">+{rec.timeSavedMin}m saved</span>
                    <span className="block text-[10px] text-stone-400">{rec.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-xs text-stone-500">
          <span>Hospital Quality Assurance & Physician Wellness Committee Validated</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-medium transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
