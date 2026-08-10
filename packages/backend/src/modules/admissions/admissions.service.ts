import { generateId } from '../../shared/utils/auth.utils.js';
import * as admissionsRepo from './admissions.repo.js';
import type { Admission } from '../../db/schema/admissions.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

export interface GetAdmissionsParams {
  search?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  limit?: number;
  offset?: number;
}

export interface DecisionInput {
  decidedBy?: string;
  reason?: string;
}

export async function getAllAdmissions(params?: GetAdmissionsParams): Promise<Admission[]> {
  return admissionsRepo.findAllAdmissions(params);
}

export async function getAdmissionsByUserId(userId: string): Promise<Admission[]> {
  return admissionsRepo.findAdmissionsByUserId(userId);
}

export async function getPendingAdmissions(): Promise<Admission[]> {
  return admissionsRepo.findPendingAdmissions();
}

export async function getWaitlist(): Promise<Admission[]> {
  return admissionsRepo.findWaitlist();
}

export async function getAdmissionById(id: string): Promise<Admission | null> {
  const admission = await admissionsRepo.findAdmissionById(id);
  return admission || null;
}

export async function createAdmission(data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  class?: string;
  parentName?: string;
  parentPhone?: string;
  score?: number;
  session?: string;
}): Promise<Admission> {
  if (!data.firstName || !data.lastName) {
    throw new Error('First name and last name are required');
  }

  return admissionsRepo.createAdmission({
    id: generateId(),
    ...data,
  });
}

export async function updateAdmission(
  id: string,
  data: Partial<Pick<Admission, 'firstName' | 'lastName' | 'email' | 'phone' | 'score' | 'session'>>
): Promise<Admission | null> {
  const admission = await admissionsRepo.updateAdmission(id, data);
  return admission || null;
}

export async function approveAdmission(id: string, decision?: DecisionInput): Promise<Admission | null> {
  const admission = await admissionsRepo.approveAdmission(id, {
    decidedBy: decision?.decidedBy ?? null,
    decisionReason: decision?.reason?.trim() || null,
  });
  return admission || null;
}

export async function rejectAdmission(id: string, decision?: DecisionInput): Promise<Admission | null> {
  const admission = await admissionsRepo.rejectAdmission(id, {
    decidedBy: decision?.decidedBy ?? null,
    decisionReason: decision?.reason?.trim() || null,
  });
  return admission || null;
}

// Move a pending application onto the waitlist, appending it to the queue.
export async function waitlistAdmission(
  id: string,
  input?: DecisionInput & { score?: number }
): Promise<Admission | null> {
  const existing = await admissionsRepo.findAdmissionById(id);
  if (!existing) throw new NotFoundError('Admission not found');
  if (existing.status !== 'pending') {
    throw new ConflictError(`Only pending applications can be waitlisted (currently ${existing.status})`);
  }

  const current = await admissionsRepo.findWaitlist();
  const nextRank = current.reduce((max, a) => Math.max(max, a.waitlistRank ?? 0), 0) + 1;

  const updated = await admissionsRepo.waitlistAdmission(id, {
    waitlistRank: nextRank,
    score: input?.score,
    decidedBy: input?.decidedBy ?? null,
    decisionReason: input?.reason?.trim() || null,
  });
  return updated || null;
}

// Reorder the entire waitlist. `orderedIds` must be a permutation of every
// currently-waitlisted application; ranks are reassigned 1..N in that order.
export async function rankWaitlist(orderedIds: string[]): Promise<Admission[]> {
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    throw new BadRequestError('orderedIds must be a non-empty array');
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new BadRequestError('orderedIds contains duplicate ids');
  }

  const waitlist = await admissionsRepo.findWaitlist();
  if (orderedIds.length !== waitlist.length) {
    throw new BadRequestError('orderedIds must include every waitlisted application');
  }
  const waitlistIds = new Set(waitlist.map((a) => a.id));
  for (const id of orderedIds) {
    if (!waitlistIds.has(id)) {
      throw new BadRequestError(`Application ${id} is not on the waitlist`);
    }
  }

  const updated: Admission[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    const row = await admissionsRepo.setWaitlistRank(orderedIds[i]!, i + 1);
    if (row) updated.push(row);
  }
  return updated;
}

// Promote a waitlisted applicant to an offer (approved).
export async function promoteFromWaitlist(id: string, decision?: DecisionInput): Promise<Admission | null> {
  const existing = await admissionsRepo.findAdmissionById(id);
  if (!existing) throw new NotFoundError('Admission not found');
  if (existing.status !== 'waitlisted') {
    throw new BadRequestError('Only waitlisted applications can be promoted');
  }

  const updated = await admissionsRepo.approveAdmission(id, {
    decidedBy: decision?.decidedBy ?? null,
    decisionReason: decision?.reason?.trim() || 'Promoted from waitlist',
  });
  return updated || null;
}

export async function deleteAdmission(id: string): Promise<boolean> {
  await admissionsRepo.deleteAdmission(id);
  return true;
}
