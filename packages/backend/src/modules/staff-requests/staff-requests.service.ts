import { generateId } from '../../shared/utils/auth.utils.js';
import * as staffRequestsRepo from './staff-requests.repo.js';
import type { StaffRequest } from '../../db/schema/staff-requests.js';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors/app-error.js';

export type StaffRequestType = 'leave' | 'resource' | 'facility' | 'other';
export type Priority = 'low' | 'normal' | 'high';

export interface CreateStaffRequestInput {
  staffName?: string;
  staffRole?: string;
  type?: StaffRequestType;
  title: string;
  details?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  amount?: number;
  term?: string;
  session?: string;
}

export interface UpdateStaffRequestInput {
  type?: StaffRequestType;
  title?: string;
  details?: string;
  priority?: Priority;
  startDate?: string;
  endDate?: string;
  amount?: number;
}

export async function getAllRequests(
  filters?: staffRequestsRepo.StaffRequestFilters
): Promise<StaffRequest[]> {
  return staffRequestsRepo.findAllRequests(filters);
}

export async function getRequestById(id: string): Promise<StaffRequest | null> {
  const row = await staffRequestsRepo.findRequestById(id);
  return row || null;
}

export async function createRequest(
  input: CreateStaffRequestInput,
  staffId: string
): Promise<StaffRequest> {
  if (!input.title || !input.title.trim()) {
    throw new BadRequestError('A request title is required');
  }

  return staffRequestsRepo.createRequest({
    id: generateId(),
    staffId,
    staffName: input.staffName ?? null,
    staffRole: input.staffRole ?? null,
    type: input.type ?? 'other',
    title: input.title.trim(),
    details: input.details ?? null,
    priority: input.priority ?? 'normal',
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    amount: input.amount ?? null,
    status: 'pending',
    term: input.term ?? null,
    session: input.session ?? null,
  });
}

export async function updateRequest(
  id: string,
  input: UpdateStaffRequestInput
): Promise<StaffRequest | null> {
  const existing = await staffRequestsRepo.findRequestById(id);
  if (!existing) throw new NotFoundError('Staff request not found');
  if (existing.status !== 'pending') {
    throw new ConflictError(`Cannot edit a request that is already ${existing.status}`);
  }

  const patch: Record<string, unknown> = {};
  if (input.type !== undefined) patch.type = input.type;
  if (input.title !== undefined) patch.title = input.title;
  if (input.details !== undefined) patch.details = input.details;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  if (input.amount !== undefined) patch.amount = input.amount;

  const row = await staffRequestsRepo.updateRequest(id, patch);
  return row || null;
}

export async function approveRequest(
  id: string,
  decidedBy: string,
  reason?: string
): Promise<StaffRequest | null> {
  const existing = await staffRequestsRepo.findRequestById(id);
  if (!existing) throw new NotFoundError('Staff request not found');
  if (existing.status !== 'pending') {
    throw new BadRequestError(`Only pending requests can be approved (this one is ${existing.status})`);
  }

  const row = await staffRequestsRepo.updateRequest(id, {
    status: 'approved',
    decidedBy,
    decidedAt: new Date(),
    decisionReason: reason ?? null,
  });
  return row || null;
}

export async function rejectRequest(
  id: string,
  decidedBy: string,
  reason: string
): Promise<StaffRequest | null> {
  const existing = await staffRequestsRepo.findRequestById(id);
  if (!existing) throw new NotFoundError('Staff request not found');
  if (existing.status !== 'pending') {
    throw new BadRequestError(`Only pending requests can be rejected (this one is ${existing.status})`);
  }
  if (!reason || !reason.trim()) {
    throw new BadRequestError('A reason is required when rejecting a request');
  }

  const row = await staffRequestsRepo.updateRequest(id, {
    status: 'rejected',
    decidedBy,
    decidedAt: new Date(),
    decisionReason: reason,
  });
  return row || null;
}

/** A staff member withdraws their own still-pending request. */
export async function cancelRequest(id: string, staffId: string): Promise<StaffRequest | null> {
  const existing = await staffRequestsRepo.findRequestById(id);
  if (!existing) throw new NotFoundError('Staff request not found');
  if (existing.staffId !== staffId) {
    throw new BadRequestError('You can only cancel your own requests');
  }
  if (existing.status !== 'pending') {
    throw new BadRequestError(`Only pending requests can be cancelled (this one is ${existing.status})`);
  }

  const row = await staffRequestsRepo.updateRequest(id, { status: 'cancelled' });
  return row || null;
}

export async function deleteRequest(id: string): Promise<boolean> {
  await staffRequestsRepo.deleteRequest(id);
  return true;
}
