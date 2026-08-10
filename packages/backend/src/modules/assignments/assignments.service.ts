import { generateId } from '../../shared/utils/auth.utils.js';
import * as assignmentsRepo from './assignments.repo.js';
import type { Assignment } from '../../db/schema/assignments.js';

export async function getAllAssignments(
  filters?: { subject?: string; status?: string; createdBy?: string; search?: string; limit?: number; offset?: number; subjects?: string[] }
): Promise<Assignment[]> {
  return assignmentsRepo.findAllAssignments(filters);
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const assignment = await assignmentsRepo.findAssignmentById(id);
  return assignment || null;
}

export async function createAssignment(data: {
  title: string;
  description?: string;
  subject?: string;
  status?: 'active' | 'draft' | 'archived';
  dueDate?: string;
  availableFrom?: string;
  class?: string;
  createdBy: string;
}): Promise<Assignment> {
  const { description, dueDate, availableFrom, ...rest } = data;
  return assignmentsRepo.createAssignment({
    id: generateId(),
    ...rest,
    desc: description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    availableFrom: availableFrom ? new Date(availableFrom) : undefined,
  });
}

export async function updateAssignment(
  id: string,
  data: { title?: string; description?: string; subject?: string; status?: 'active' | 'draft' | 'archived'; dueDate?: string; availableFrom?: string; class?: string }
): Promise<Assignment | null> {
  const { description, dueDate, availableFrom, ...rest } = data;
  const assignment = await assignmentsRepo.updateAssignment(id, {
    ...rest,
    desc: description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    availableFrom: availableFrom ? new Date(availableFrom) : undefined,
  });
  return assignment || null;
}

export async function deleteAssignment(id: string): Promise<boolean> {
  await assignmentsRepo.deleteAssignment(id);
  return true;
}

export async function deleteAllAssignments(): Promise<boolean> {
  await assignmentsRepo.deleteAllAssignments();
  return true;
}