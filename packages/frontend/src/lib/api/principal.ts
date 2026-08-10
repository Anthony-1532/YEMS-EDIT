// API client for the principal oversight portal.
// - `principalApi` hits the backend aggregation module (/api/principal).
// - the resource wrappers below hit the existing workflow modules
//   (report-cards, discipline, staff-requests, expenses, admissions) which
//   own their own write/permission logic.
import { api } from './client';
import type { ApiResponse } from './types';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error || res.message || 'Request failed');
  return res.data as T;
}

// ── Dashboard payload types (mirror principal.service.ts) ──
export interface EnrollmentSummary { active: number; newAdmissions: number; withdrawals: number; }
export interface AttendanceClassRate { class: string; total: number; rate: number; }
export interface AttendanceSummary {
  todayRate: number; todayRecords: number; weekRate: number; lastWeekRate: number;
  trend: number; byClass: AttendanceClassRate[];
}
export interface FeeClassRow { class: string; expected: number; collected: number; outstanding: number; outstandingPct: number; }
export interface FeeSummary { expected: number; collected: number; outstanding: number; outstandingPct: number; byClass: FeeClassRow[]; }
export interface ApprovalsSummary { reportCards: number; admissions: number; staffRequests: number; expenses: number; discipline: number; total: number; }
export interface PrincipalAlert {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  category: 'attendance' | 'finance' | 'approvals' | 'discipline';
  message: string;
  href?: string;
}
export interface DashboardSummary {
  enrollment: EnrollmentSummary;
  attendance: AttendanceSummary;
  fees: FeeSummary;
  approvals: ApprovalsSummary;
  alerts: PrincipalAlert[];
  generatedAt: string;
}
export interface StaffActivityRow {
  id: string; name: string; email: string; role: string;
  assignedSubjects?: string[] | null; assignedClasses?: string[] | null;
  isClassTeacher?: boolean | null; classTeacherOf?: string | null; isSuspended?: boolean | null;
  schemesSubmitted: number; lessonPlansSubmitted: number; examsCreated: number;
  hasSubmittedPlans: boolean; status: string;
}
export interface AcademicRow { class: string; subject: string; avgPercent: number; count: number; }
export interface AttendanceTrendPoint { date: string; rate: number; records: number; }

export const principalApi = {
  getDashboard: () => api.get<ApiResponse<DashboardSummary>>('/principal/dashboard').then(unwrap),
  getStaffActivity: () => api.get<ApiResponse<StaffActivityRow[]>>('/principal/staff-activity').then(unwrap),
  getAcademicPerformance: (params?: { class?: string; term?: string; session?: string }) => {
    const qs = new URLSearchParams();
    if (params?.class) qs.set('class', params.class);
    if (params?.term) qs.set('term', params.term);
    if (params?.session) qs.set('session', params.session);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<AcademicRow[]>>(`/principal/academic/performance${suffix}`).then(unwrap);
  },
  getAttendanceTrends: (days = 14) =>
    api.get<ApiResponse<AttendanceTrendPoint[]>>(`/principal/attendance/trends?days=${days}`).then(unwrap),
};
// ── Report cards (approval gate: draft → submitted → principal_approved → sent) ──
export interface ReportCardRow {
  id: string; studentId: string; studentName?: string | null; class: string;
  term: string; session: string;
  status: 'draft' | 'submitted' | 'principal_approved' | 'returned' | 'sent' | string;
  overallTotal?: number | null; overallAverage?: number | null; position?: string | null;
  classTeacherRemark?: string | null; principalComment?: string | null;
  subjects?: Array<{ subject: string; totalScore?: number; grade?: string; remark?: string }>;
  submittedAt?: string | null; reviewedAt?: string | null; createdAt?: string;
  [key: string]: unknown;
}

export const reportCardsApi = {
  getAll: (params?: { status?: string; class?: string; term?: string; session?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.class) qs.set('class', params.class);
    if (params?.term) qs.set('term', params.term);
    if (params?.session) qs.set('session', params.session);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<ReportCardRow[]>>(`/report-cards${suffix}`).then(unwrap);
  },
  getQueue: () => api.get<ApiResponse<ReportCardRow[]>>('/report-cards/queue').then(unwrap),
  approve: (id: string, comment?: string) =>
    api.post<ApiResponse<ReportCardRow>>(`/report-cards/${id}/approve`, comment ? { comment } : {}).then(unwrap),
  return: (id: string, comment: string) =>
    api.post<ApiResponse<ReportCardRow>>(`/report-cards/${id}/return`, { comment }).then(unwrap),
  send: (id: string) => api.post<ApiResponse<ReportCardRow>>(`/report-cards/${id}/send`, {}).then(unwrap),
};

// ── Discipline (school-wide log + escalation queue + final decision) ──
export interface DisciplineRow {
  id: string; studentId: string; studentName?: string | null; class: string;
  category: string; severity: 'minor' | 'moderate' | 'serious' | 'severe' | string;
  description: string; incidentDate: string;
  status: 'open' | 'escalated' | 'resolved' | 'dismissed' | string;
  reporterName?: string | null;
  action: 'none' | 'warning' | 'detention' | 'parent_meeting' | 'suspension' | 'expulsion' | 'counseling' | string;
  actionDetail?: string | null; resolutionNote?: string | null;
  term?: string | null; session?: string | null; createdAt?: string;
  [key: string]: unknown;
}

export const disciplineApi = {
  getAll: (params?: { class?: string; severity?: string; status?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.class) qs.set('class', params.class);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.status) qs.set('status', params.status);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<DisciplineRow[]>>(`/discipline${suffix}`).then(unwrap);
  },
  getQueue: () => api.get<ApiResponse<DisciplineRow[]>>('/discipline/queue').then(unwrap),
  resolve: (id: string, data: { action: string; actionDetail?: string; resolutionNote?: string }) =>
    api.post<ApiResponse<DisciplineRow>>(`/discipline/${id}/resolve`, data).then(unwrap),
  dismiss: (id: string, reason: string) =>
    api.post<ApiResponse<DisciplineRow>>(`/discipline/${id}/dismiss`, { reason }).then(unwrap),
};

// ── Staff requests (leave/resource asks, approve/reject with reason) ──
export interface StaffRequestRow {
  id: string; staffId: string; staffName?: string | null; staffRole?: string | null;
  type: 'leave' | 'resource' | 'facility' | 'other' | string;
  title: string; details?: string | null;
  priority: 'low' | 'normal' | 'high' | string;
  startDate?: string | null; endDate?: string | null; amount?: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | string;
  decisionReason?: string | null; createdAt?: string;
  [key: string]: unknown;
}

export const staffRequestsApi = {
  getAll: (params?: { status?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.type) qs.set('type', params.type);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<StaffRequestRow[]>>(`/staff-requests${suffix}`).then(unwrap);
  },
  getQueue: () => api.get<ApiResponse<StaffRequestRow[]>>('/staff-requests/queue').then(unwrap),
  approve: (id: string, reason?: string) =>
    api.post<ApiResponse<StaffRequestRow>>(`/staff-requests/${id}/approve`, reason ? { reason } : {}).then(unwrap),
  reject: (id: string, reason: string) =>
    api.post<ApiResponse<StaffRequestRow>>(`/staff-requests/${id}/reject`, { reason }).then(unwrap),
};

// ── Expenses (view-only financial layer + above-threshold sign-off) ──
export interface ExpenseRow {
  id: string; category: string; title: string; description?: string | null;
  amount: number; vendor?: string | null; expenseDate: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  recordedByName?: string | null; decisionReason?: string | null;
  term?: string | null; session?: string | null; createdAt?: string;
  [key: string]: unknown;
}
export interface ExpenseSummary {
  totalApproved: number; totalPending: number; totalRejected: number;
  pendingCount: number; byCategory: Record<string, number>;
}

export const expensesApi = {
  getAll: (params?: { status?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.category) qs.set('category', params.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<ExpenseRow[]>>(`/expenses${suffix}`).then(unwrap);
  },
  getSummary: () => api.get<ApiResponse<ExpenseSummary>>('/expenses/summary').then(unwrap),
  getQueue: () => api.get<ApiResponse<ExpenseRow[]>>('/expenses/queue').then(unwrap),
  approve: (id: string, reason?: string) =>
    api.post<ApiResponse<ExpenseRow>>(`/expenses/${id}/approve`, reason ? { reason } : {}).then(unwrap),
  reject: (id: string, reason: string) =>
    api.post<ApiResponse<ExpenseRow>>(`/expenses/${id}/reject`, { reason }).then(unwrap),
};

// ── Admissions (final decision + waitlist management) ──
export interface AdmissionRow {
  id: string; firstName: string; lastName: string; email?: string | null; phone?: string | null;
  class?: string | null; parentName?: string | null; parentPhone?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted' | string;
  score?: number | null; waitlistRank?: number | null; decisionReason?: string | null;
  session?: string | null; createdAt?: string;
  [key: string]: unknown;
}

export const admissionsOversightApi = {
  getAll: () => api.get<ApiResponse<AdmissionRow[]>>('/admissions').then(unwrap),
  getPending: () => api.get<ApiResponse<AdmissionRow[]>>('/admissions/pending').then(unwrap),
  getWaitlist: () => api.get<ApiResponse<AdmissionRow[]>>('/admissions/waitlist').then(unwrap),
  approve: (id: string, reason?: string) =>
    api.patch<ApiResponse<AdmissionRow>>(`/admissions/${id}/approve`, reason ? { reason } : {}).then(unwrap),
  reject: (id: string, reason?: string) =>
    api.patch<ApiResponse<AdmissionRow>>(`/admissions/${id}/reject`, reason ? { reason } : {}).then(unwrap),
  waitlist: (id: string, score?: number) =>
    api.patch<ApiResponse<AdmissionRow>>(`/admissions/${id}/waitlist`, typeof score === 'number' ? { score } : {}).then(unwrap),
  promote: (id: string, reason?: string) =>
    api.patch<ApiResponse<AdmissionRow>>(`/admissions/${id}/promote`, reason ? { reason } : {}).then(unwrap),
  rankWaitlist: (orderedIds: string[]) =>
    api.patch<ApiResponse<AdmissionRow[]>>('/admissions/waitlist/rank', { orderedIds }).then(unwrap),
};
