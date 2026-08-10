import { and, eq, gte, lte, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { attendance } from '../../db/schema/attendance.js';
import { results } from '../../db/schema/results.js';
import { bills, payments } from '../../db/schema/accountant.js';
import { reportCards } from '../../db/schema/report-cards.js';
import { admissions } from '../../db/schema/admissions.js';
import { staffRequests } from '../../db/schema/staff-requests.js';
import { expenses } from '../../db/schema/expenses.js';
import { disciplineIncidents } from '../../db/schema/discipline.js';
import { schemes } from '../../db/schema/schemes.js';
import { lessonPlans } from '../../db/schema/lesson-plans.js';
import { exams } from '../../db/schema/exams.js';

// The principal portal is a read/oversight layer: it never mutates domain data,
// it rolls up the numbers the workflow modules already own so the frontend can
// hit one endpoint instead of fanning out to a dozen. All the write actions
// (approve/reject/resolve/…) live in their respective modules.

// Attendance below this weekly rate (%) raises a dashboard alert.
export const ATTENDANCE_ALERT_THRESHOLD = 75;
// Fee outstanding above this share (%) of expected raises a dashboard alert.
export const FEE_OUTSTANDING_ALERT_THRESHOLD = 40;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toDateStr(d);
}

// Attendance statuses that count as "in attendance" for a presence rate.
const PRESENT_STATUSES = ['present', 'late', 'excused'] as const;

function rate(present: number, total: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  category: 'attendance' | 'finance' | 'approvals' | 'discipline';
  message: string;
  href?: string;
}

// ---------------------------------------------------------------------------
// Enrollment
// ---------------------------------------------------------------------------
async function getEnrollment() {
  const [activeRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.isSuspended, false)));

  const [withdrawnRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, 'student'), eq(users.isSuspended, true)));

  // "New" = admissions approved this session cycle (proxy for incoming pupils).
  const [newRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(admissions)
    .where(eq(admissions.status, 'approved'));

  return {
    active: activeRow?.count ?? 0,
    newAdmissions: newRow?.count ?? 0,
    withdrawals: withdrawnRow?.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Attendance (today / this week / trend vs last week), full-day rows only
// ---------------------------------------------------------------------------
async function getAttendanceOverview() {
  const today = toDateStr(new Date());
  const weekAgo = daysAgoStr(6); // inclusive 7-day window ending today
  const twoWeeksAgo = daysAgoStr(13);
  const lastWeekEnd = daysAgoStr(7);

  async function windowRate(from: string, to: string) {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        present: sql<number>`sum(case when ${attendance.status} in ('present','late','excused') then 1 else 0 end)::int`,
      })
      .from(attendance)
      .where(and(eq(attendance.type, 'full_day'), gte(attendance.date, from), lte(attendance.date, to)));
    return { total: row?.total ?? 0, present: row?.present ?? 0 };
  }

  const todayWin = await windowRate(today, today);
  const thisWeek = await windowRate(weekAgo, today);
  const lastWeek = await windowRate(twoWeeksAgo, lastWeekEnd);

  const thisWeekRate = rate(thisWeek.present, thisWeek.total);
  const lastWeekRate = rate(lastWeek.present, lastWeek.total);

  return {
    todayRate: rate(todayWin.present, todayWin.total),
    todayRecords: todayWin.total,
    weekRate: thisWeekRate,
    lastWeekRate,
    trend: thisWeekRate - lastWeekRate,
  };
}

// Per-class weekly attendance rate — used both for the dashboard breakdown and
// to derive low-attendance alerts.
async function getAttendanceByClass(from: string, to: string) {
  const rows = await db
    .select({
      class: attendance.class,
      total: sql<number>`count(*)::int`,
      present: sql<number>`sum(case when ${attendance.status} in ('present','late','excused') then 1 else 0 end)::int`,
    })
    .from(attendance)
    .where(and(eq(attendance.type, 'full_day'), gte(attendance.date, from), lte(attendance.date, to)))
    .groupBy(attendance.class);

  return rows
    .map((r) => ({ class: r.class, total: r.total, rate: rate(r.present, r.total) }))
    .sort((a, b) => a.rate - b.rate);
}

// ---------------------------------------------------------------------------
// Fees (collected vs expected, outstanding %, by class)
// ---------------------------------------------------------------------------
async function getFeeOverview() {
  const [expectedRow] = await db
    .select({ sum: sql<number>`coalesce(sum(${bills.amount}),0)::int` })
    .from(bills);
  const [collectedRow] = await db
    .select({ sum: sql<number>`coalesce(sum(${payments.amount}),0)::int` })
    .from(payments);

  const expected = expectedRow?.sum ?? 0;
  const collected = collectedRow?.sum ?? 0;
  const outstanding = Math.max(expected - collected, 0);
  const outstandingPct = expected ? Math.round((outstanding / expected) * 100) : 0;

  const billedByClass = await db
    .select({ class: bills.class, sum: sql<number>`coalesce(sum(${bills.amount}),0)::int` })
    .from(bills)
    .groupBy(bills.class);
  const paidByClass = await db
    .select({ class: payments.class, sum: sql<number>`coalesce(sum(${payments.amount}),0)::int` })
    .from(payments)
    .groupBy(payments.class);

  const paidMap = new Map(paidByClass.map((r) => [r.class ?? 'Unassigned', r.sum]));
  const byClass = billedByClass
    .map((r) => {
      const cls = r.class ?? 'Unassigned';
      const paid = paidMap.get(cls) ?? 0;
      const owed = Math.max(r.sum - paid, 0);
      return {
        class: cls,
        expected: r.sum,
        collected: paid,
        outstanding: owed,
        outstandingPct: r.sum ? Math.round((owed / r.sum) * 100) : 0,
      };
    })
    .sort((a, b) => b.outstanding - a.outstanding);

  return { expected, collected, outstanding, outstandingPct, byClass };
}

// ---------------------------------------------------------------------------
// Pending-approvals queue counts (clickable on the dashboard)
// ---------------------------------------------------------------------------
async function getPendingApprovals() {
  const [reportCardsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reportCards)
    .where(eq(reportCards.status, 'submitted'));
  const [admissionsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(admissions)
    .where(eq(admissions.status, 'pending'));
  const [staffRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(staffRequests)
    .where(eq(staffRequests.status, 'pending'));
  const [expensesRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(expenses)
    .where(eq(expenses.status, 'pending'));
  const [disciplineRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(disciplineIncidents)
    .where(eq(disciplineIncidents.status, 'escalated'));

  const reportCardsCount = reportCardsRow?.count ?? 0;
  const admissionsCount = admissionsRow?.count ?? 0;
  const staffRequestsCount = staffRow?.count ?? 0;
  const expensesCount = expensesRow?.count ?? 0;
  const disciplineCount = disciplineRow?.count ?? 0;

  return {
    reportCards: reportCardsCount,
    admissions: admissionsCount,
    staffRequests: staffRequestsCount,
    expenses: expensesCount,
    discipline: disciplineCount,
    total: reportCardsCount + admissionsCount + staffRequestsCount + expensesCount + disciplineCount,
  };
}

// ---------------------------------------------------------------------------
// Alerts — threshold-driven anomalies surfaced on the dashboard
// ---------------------------------------------------------------------------
function buildAlerts(input: {
  attendanceByClass: { class: string; rate: number; total: number }[];
  fees: { outstandingPct: number };
  approvals: { discipline: number; expenses: number };
}): Alert[] {
  const alerts: Alert[] = [];

  for (const c of input.attendanceByClass) {
    if (c.total > 0 && c.rate < ATTENDANCE_ALERT_THRESHOLD) {
      alerts.push({
        id: `attendance-${c.class}`,
        severity: c.rate < 60 ? 'danger' : 'warning',
        category: 'attendance',
        message: `${c.class} attendance is ${c.rate}% this week (below ${ATTENDANCE_ALERT_THRESHOLD}%).`,
        href: '/principal/reports',
      });
    }
  }

  if (input.fees.outstandingPct >= FEE_OUTSTANDING_ALERT_THRESHOLD) {
    alerts.push({
      id: 'fees-outstanding',
      severity: input.fees.outstandingPct >= 60 ? 'danger' : 'warning',
      category: 'finance',
      message: `${input.fees.outstandingPct}% of expected fees are still outstanding.`,
      href: '/principal/financial',
    });
  }

  if (input.approvals.discipline > 0) {
    alerts.push({
      id: 'discipline-escalated',
      severity: 'warning',
      category: 'discipline',
      message: `${input.approvals.discipline} discipline case(s) escalated and awaiting your decision.`,
      href: '/principal/discipline',
    });
  }

  if (input.approvals.expenses > 0) {
    alerts.push({
      id: 'expenses-pending',
      severity: 'info',
      category: 'finance',
      message: `${input.approvals.expenses} expense(s) above threshold awaiting sign-off.`,
      href: '/principal/financial',
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Dashboard summary — the single call the principal landing page makes
// ---------------------------------------------------------------------------
export async function getDashboardSummary() {
  const weekAgo = daysAgoStr(6);
  const today = toDateStr(new Date());

  const [enrollment, attendanceOverview, fees, approvals, attendanceByClass] = await Promise.all([
    getEnrollment(),
    getAttendanceOverview(),
    getFeeOverview(),
    getPendingApprovals(),
    getAttendanceByClass(weekAgo, today),
  ]);

  const alerts = buildAlerts({
    attendanceByClass,
    fees: { outstandingPct: fees.outstandingPct },
    approvals: { discipline: approvals.discipline, expenses: approvals.expenses },
  });

  return {
    enrollment,
    attendance: { ...attendanceOverview, byClass: attendanceByClass },
    fees,
    approvals,
    alerts,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Staff oversight — directory + activity signals
// ---------------------------------------------------------------------------
export async function getStaffActivity() {
  const staff = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      assignedSubjects: users.assignedSubjects,
      assignedClasses: users.assignedClasses,
      isClassTeacher: users.isClassTeacher,
      classTeacherOf: users.classTeacherOf,
      isSuspended: users.isSuspended,
    })
    .from(users)
    .where(inArray(users.role, ['teacher', 'hod']));

  const staffIds = staff.map((s) => s.id);
  if (staffIds.length === 0) return [];

  // Activity signals we can derive honestly from existing tables: schemes of
  // work authored, lesson plans authored, and exams created. (There is no
  // teacher FK on results, so "grades entered" is not attributed per-teacher.)
  const schemeCounts = await db
    .select({ createdBy: schemes.createdBy, count: sql<number>`count(*)::int` })
    .from(schemes)
    .where(inArray(schemes.createdBy, staffIds))
    .groupBy(schemes.createdBy);
  const planCounts = await db
    .select({ createdBy: lessonPlans.createdBy, count: sql<number>`count(*)::int` })
    .from(lessonPlans)
    .where(inArray(lessonPlans.createdBy, staffIds))
    .groupBy(lessonPlans.createdBy);
  const examCounts = await db
    .select({ createdBy: exams.createdBy, count: sql<number>`count(*)::int` })
    .from(exams)
    .where(inArray(exams.createdBy, staffIds))
    .groupBy(exams.createdBy);

  const schemeMap = new Map(schemeCounts.map((r) => [r.createdBy, r.count]));
  const planMap = new Map(planCounts.map((r) => [r.createdBy, r.count]));
  const examMap = new Map(examCounts.map((r) => [r.createdBy, r.count]));

  return staff.map((s) => {
    const schemesSubmitted = schemeMap.get(s.id) ?? 0;
    const lessonPlansSubmitted = planMap.get(s.id) ?? 0;
    const examsCreated = examMap.get(s.id) ?? 0;
    return {
      ...s,
      schemesSubmitted,
      lessonPlansSubmitted,
      examsCreated,
      // A coarse activity flag for the directory: has the teacher submitted any
      // planning material at all?
      hasSubmittedPlans: schemesSubmitted > 0 || lessonPlansSubmitted > 0,
      status: s.isSuspended ? 'suspended' : 'active',
    };
  });
}

// ---------------------------------------------------------------------------
// Academic oversight — average performance per class per subject
// ---------------------------------------------------------------------------
export async function getAcademicPerformance(filters?: { class?: string; term?: string; session?: string }) {
  const conditions = [] as any[];
  if (filters?.class) conditions.push(eq(results.class, filters.class));
  if (filters?.term) conditions.push(eq(results.term, filters.term));
  if (filters?.session) conditions.push(eq(results.session, filters.session));

  const rows = await db
    .select({
      class: results.class,
      subject: results.subject,
      avgPercent: sql<number>`round(avg(${results.score}::numeric / nullif(${results.totalScore}, 0) * 100))::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(results)
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(results.class, results.subject);

  return rows
    .map((r) => ({
      class: r.class ?? 'Unassigned',
      subject: r.subject,
      avgPercent: r.avgPercent ?? 0,
      count: r.count,
    }))
    .sort((a, b) => (a.class ?? '').localeCompare(b.class ?? '') || b.avgPercent - a.avgPercent);
}

// ---------------------------------------------------------------------------
// Attendance trends — daily presence rate over the last N days (for charts)
// ---------------------------------------------------------------------------
export async function getAttendanceTrends(days = 14) {
  const boundedDays = Math.min(Math.max(days, 1), 90);
  const from = daysAgoStr(boundedDays - 1);
  const to = toDateStr(new Date());

  const rows = await db
    .select({
      date: attendance.date,
      total: sql<number>`count(*)::int`,
      present: sql<number>`sum(case when ${attendance.status} in ('present','late','excused') then 1 else 0 end)::int`,
    })
    .from(attendance)
    .where(and(eq(attendance.type, 'full_day'), gte(attendance.date, from), lte(attendance.date, to)))
    .groupBy(attendance.date)
    .orderBy(attendance.date);

  return rows.map((r) => ({ date: r.date, rate: rate(r.present, r.total), records: r.total }));
}
