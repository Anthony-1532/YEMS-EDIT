import { generateId } from '../../shared/utils/auth.utils.js';
import * as disciplineRepo from './discipline.repo.js';
import type { DisciplineIncident } from '../../db/schema/discipline.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

export type Severity = 'minor' | 'moderate' | 'serious' | 'severe';
export type DisciplineAction =
  | 'none'
  | 'warning'
  | 'detention'
  | 'parent_meeting'
  | 'suspension'
  | 'expulsion'
  | 'counseling';

// Incidents at or above this severity auto-escalate to the principal on log.
const AUTO_ESCALATE_SEVERITIES: Severity[] = ['serious', 'severe'];

// An incident can still be edited by the reporter while it is open or escalated
// (i.e. before a principal has recorded a final decision).
const EDITABLE_STATUSES: string[] = ['open', 'escalated'];

export interface LogIncidentInput {
  studentId: string;
  studentName?: string;
  class: string;
  category: string;
  severity?: Severity;
  description: string;
  incidentDate?: string;
  reporterName?: string;
  term?: string;
  session?: string;
}

export interface UpdateIncidentInput {
  studentName?: string;
  category?: string;
  severity?: Severity;
  description?: string;
  incidentDate?: string;
  term?: string;
  session?: string;
}

export interface ResolveIncidentInput {
  action: DisciplineAction;
  actionDetail?: string;
  note?: string;
}

export async function getAllIncidents(
  filters?: disciplineRepo.DisciplineFilters
): Promise<DisciplineIncident[]> {
  return disciplineRepo.findAllIncidents(filters);
}

export async function getIncidentById(id: string): Promise<DisciplineIncident | null> {
  const row = await disciplineRepo.findIncidentById(id);
  return row || null;
}

/**
 * Log a new incident. Serious/severe incidents auto-escalate to the principal;
 * everything else starts as `open` and can be escalated manually later.
 */
export async function logIncident(
  input: LogIncidentInput,
  reportedBy: string
): Promise<DisciplineIncident> {
  if (!input.studentId || !input.class || !input.category || !input.description) {
    throw new BadRequestError('studentId, class, category and description are required');
  }

  const severity: Severity = input.severity ?? 'minor';
  const autoEscalate = AUTO_ESCALATE_SEVERITIES.includes(severity);
  const now = new Date();

  return disciplineRepo.createIncident({
    id: generateId(),
    studentId: input.studentId,
    studentName: input.studentName ?? null,
    class: input.class,
    category: input.category,
    severity,
    description: input.description,
    incidentDate: input.incidentDate ?? now.toISOString().slice(0, 10),
    status: autoEscalate ? 'escalated' : 'open',
    reportedBy,
    reporterName: input.reporterName ?? null,
    escalatedBy: autoEscalate ? reportedBy : null,
    escalatedAt: autoEscalate ? now : null,
    action: 'none',
    term: input.term ?? null,
    session: input.session ?? null,
  });
}

export async function updateIncident(
  id: string,
  input: UpdateIncidentInput
): Promise<DisciplineIncident | null> {
  const existing = await disciplineRepo.findIncidentById(id);
  if (!existing) throw new NotFoundError('Discipline incident not found');
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw new ConflictError(`Cannot edit an incident in "${existing.status}" state`);
  }

  const patch: Record<string, unknown> = {};
  if (input.studentName !== undefined) patch.studentName = input.studentName;
  if (input.category !== undefined) patch.category = input.category;
  if (input.severity !== undefined) patch.severity = input.severity;
  if (input.description !== undefined) patch.description = input.description;
  if (input.incidentDate !== undefined) patch.incidentDate = input.incidentDate;
  if (input.term !== undefined) patch.term = input.term;
  if (input.session !== undefined) patch.session = input.session;

  const row = await disciplineRepo.updateIncident(id, patch);
  return row || null;
}

/** Manual escalation by a class teacher/HOD: only meaningful from `open`. */
export async function escalateIncident(
  id: string,
  escalatedBy: string
): Promise<DisciplineIncident | null> {
  const existing = await disciplineRepo.findIncidentById(id);
  if (!existing) throw new NotFoundError('Discipline incident not found');
  if (existing.status !== 'open') {
    throw new BadRequestError('Only open incidents can be escalated');
  }

  const row = await disciplineRepo.updateIncident(id, {
    status: 'escalated',
    escalatedBy,
    escalatedAt: new Date(),
  });
  return row || null;
}

/** Principal records the final decision. Allowed from open or escalated. */
export async function resolveIncident(
  id: string,
  resolvedBy: string,
  input: ResolveIncidentInput
): Promise<DisciplineIncident | null> {
  const existing = await disciplineRepo.findIncidentById(id);
  if (!existing) throw new NotFoundError('Discipline incident not found');
  if (existing.status === 'resolved' || existing.status === 'dismissed') {
    throw new BadRequestError(`Incident is already ${existing.status}`);
  }
  if (!input.action || input.action === 'none') {
    throw new BadRequestError('A final action/decision is required to resolve an incident');
  }

  const row = await disciplineRepo.updateIncident(id, {
    status: 'resolved',
    action: input.action,
    actionDetail: input.actionDetail ?? null,
    resolutionNote: input.note ?? null,
    resolvedBy,
    resolvedAt: new Date(),
  });
  return row || null;
}

/** Dismiss an incident (no action warranted). Requires a reason for the log. */
export async function dismissIncident(
  id: string,
  resolvedBy: string,
  reason: string
): Promise<DisciplineIncident | null> {
  const existing = await disciplineRepo.findIncidentById(id);
  if (!existing) throw new NotFoundError('Discipline incident not found');
  if (existing.status === 'resolved' || existing.status === 'dismissed') {
    throw new BadRequestError(`Incident is already ${existing.status}`);
  }
  if (!reason || !reason.trim()) {
    throw new BadRequestError('A reason is required to dismiss an incident');
  }

  const row = await disciplineRepo.updateIncident(id, {
    status: 'dismissed',
    action: 'none',
    resolutionNote: reason,
    resolvedBy,
    resolvedAt: new Date(),
  });
  return row || null;
}

export async function deleteIncident(id: string): Promise<boolean> {
  await disciplineRepo.deleteIncident(id);
  return true;
}
