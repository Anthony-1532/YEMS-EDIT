import { generateId } from '../../shared/utils/auth.utils.js';
import * as reportCardsRepo from './report-cards.repo.js';
import type { ReportCard, ReportCardSubjectRow } from '../../db/schema/report-cards.js';
import { BadRequestError, ConflictError } from '../../shared/errors/app-error.js';

export interface CompileReportCardInput {
  studentId: string;
  studentName?: string;
  class: string;
  term: string;
  session: string;
  subjects?: ReportCardSubjectRow[];
  position?: string;
  attendanceSummary?: string;
  classTeacherRemark?: string;
}

export interface UpdateReportCardInput {
  studentName?: string;
  subjects?: ReportCardSubjectRow[];
  position?: string;
  attendanceSummary?: string;
  classTeacherRemark?: string;
}

// Content is only editable before the card leaves the class teacher's hands.
const EDITABLE_STATUSES: ReportCard['status'][] = ['draft', 'returned'];

function computeTotals(subjects: ReportCardSubjectRow[]): { overallTotal: number; overallAverage: number } {
  const totals = subjects
    .map((s) => (typeof s.totalScore === 'number' ? s.totalScore : 0))
    .filter((n) => !Number.isNaN(n));
  const overallTotal = totals.reduce((sum, n) => sum + n, 0);
  const overallAverage = subjects.length > 0 ? Math.round(overallTotal / subjects.length) : 0;
  return { overallTotal, overallAverage };
}

export async function getAllReportCards(
  params?: reportCardsRepo.ReportCardFilters
): Promise<ReportCard[]> {
  return reportCardsRepo.findAllReportCards(params);
}

export async function getReportCardById(id: string): Promise<ReportCard | null> {
  const record = await reportCardsRepo.findReportCardById(id);
  return record || null;
}

/**
 * Compile a new report card in `draft`. One card per student/term/session — a
 * repeat compilation is a conflict, not a silent duplicate.
 */
export async function compileReportCard(
  input: CompileReportCardInput,
  compiledBy: string
): Promise<ReportCard> {
  if (!input.studentId || !input.class || !input.term || !input.session) {
    throw new BadRequestError('studentId, class, term and session are required');
  }

  const existing = await reportCardsRepo.findAllReportCards({
    studentId: input.studentId,
    term: input.term,
    session: input.session,
    limit: 1,
  });
  if (existing.length > 0) {
    throw new ConflictError('A report card already exists for this student, term and session');
  }

  const subjects = input.subjects ?? [];
  const { overallTotal, overallAverage } = computeTotals(subjects);

  return reportCardsRepo.createReportCard({
    id: generateId(),
    studentId: input.studentId,
    studentName: input.studentName,
    class: input.class,
    term: input.term,
    session: input.session,
    status: 'draft',
    subjects,
    overallTotal,
    overallAverage,
    position: input.position,
    attendanceSummary: input.attendanceSummary,
    classTeacherRemark: input.classTeacherRemark,
    compiledBy,
  });
}

export async function updateReportCard(
  id: string,
  input: UpdateReportCardInput
): Promise<ReportCard | null> {
  const existing = await reportCardsRepo.findReportCardById(id);
  if (!existing) return null;
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new ConflictError(`Cannot edit a report card in "${existing.status}" state`);
  }

  const patch: Parameters<typeof reportCardsRepo.updateReportCard>[1] = {};
  if (typeof input.studentName === 'string') patch.studentName = input.studentName;
  if (typeof input.position === 'string') patch.position = input.position;
  if (typeof input.attendanceSummary === 'string') patch.attendanceSummary = input.attendanceSummary;
  if (typeof input.classTeacherRemark === 'string') patch.classTeacherRemark = input.classTeacherRemark;
  if (Array.isArray(input.subjects)) {
    patch.subjects = input.subjects;
    const { overallTotal, overallAverage } = computeTotals(input.subjects);
    patch.overallTotal = overallTotal;
    patch.overallAverage = overallAverage;
  }

  const record = await reportCardsRepo.updateReportCard(id, patch);
  return record || null;
}

/**
 * Class teacher submits a draft (or a returned card) for principal review.
 */
export async function submitReportCard(id: string): Promise<ReportCard | null> {
  const existing = await reportCardsRepo.findReportCardById(id);
  if (!existing) return null;
  if (existing.status !== 'draft' && existing.status !== 'returned') {
    throw new ConflictError(`Only draft or returned report cards can be submitted (current: "${existing.status}")`);
  }
  if (!existing.subjects || existing.subjects.length === 0) {
    throw new BadRequestError('Cannot submit a report card with no subject scores');
  }

  const record = await reportCardsRepo.updateReportCard(id, {
    status: 'submitted',
    submittedAt: new Date(),
  });
  return record || null;
}

/**
 * Principal approves a submitted card; it becomes sendable to the parent.
 */
export async function approveReportCard(id: string, reviewedBy: string, comment?: string): Promise<ReportCard | null> {
  const existing = await reportCardsRepo.findReportCardById(id);
  if (!existing) return null;
  if (existing.status !== 'submitted') {
    throw new ConflictError(`Only submitted report cards can be approved (current: "${existing.status}")`);
  }

  const record = await reportCardsRepo.updateReportCard(id, {
    status: 'principal_approved',
    reviewedBy,
    reviewedAt: new Date(),
    principalComment: comment ?? existing.principalComment,
  });
  return record || null;
}

/**
 * Principal returns a submitted card to the class teacher with a required
 * comment explaining what needs revision.
 */
export async function returnReportCard(id: string, reviewedBy: string, comment: string): Promise<ReportCard | null> {
  const existing = await reportCardsRepo.findReportCardById(id);
  if (!existing) return null;
  if (existing.status !== 'submitted') {
    throw new ConflictError(`Only submitted report cards can be returned (current: "${existing.status}")`);
  }
  if (!comment || !comment.trim()) {
    throw new BadRequestError('A comment is required when returning a report card for revision');
  }

  const record = await reportCardsRepo.updateReportCard(id, {
    status: 'returned',
    reviewedBy,
    reviewedAt: new Date(),
    principalComment: comment,
  });
  return record || null;
}

/**
 * Release an approved card to the parent (terminal state).
 */
export async function sendReportCard(id: string): Promise<ReportCard | null> {
  const existing = await reportCardsRepo.findReportCardById(id);
  if (!existing) return null;
  if (existing.status !== 'principal_approved') {
    throw new ConflictError(`Only principal-approved report cards can be sent (current: "${existing.status}")`);
  }

  const record = await reportCardsRepo.updateReportCard(id, {
    status: 'sent',
    sentAt: new Date(),
  });
  return record || null;
}

export async function deleteReportCard(id: string): Promise<boolean> {
  await reportCardsRepo.deleteReportCard(id);
  return true;
}
