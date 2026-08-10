import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as assignmentsRepo from './assignments.repo.js';
import * as assignmentsService from './assignments.service.js';
import { filterAssignmentsForUser } from './assignments.utils.js';

describe('Assignments module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the class when creating an assignment', async () => {
    const createSpy = vi.spyOn(assignmentsRepo, 'createAssignment').mockResolvedValue({ id: 'a1' } as any);

    await assignmentsService.createAssignment({
      title: 'Homework',
      createdBy: 'teacher-1',
      class: 'SS3',
    } as any);

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ class: 'SS3' }));
  });

  it('filters assignments for a student by class', () => {
    const assignments = [
      { id: '1', title: 'Math', class: 'SS3' },
      { id: '2', title: 'Science', class: 'SS2' },
    ] as any[];

    const result = filterAssignmentsForUser(assignments, { role: 'student', class: 'SS3' } as any);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });
});
