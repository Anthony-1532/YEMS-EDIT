import { normalizeClass } from '../../shared/utils/class.utils.js';
import { isResourceAvailable } from '../../shared/utils/availability.js';

export function filterAssignmentsForUser<T extends { class?: string | null; availableFrom?: string | Date | null }>(
  assignments: T[],
  user?: { role?: string; class?: string | null }
): T[] {
  if (!user || user.role !== 'student') {
    return assignments;
  }

  const studentClass = user.class;
  const now = new Date();
  return assignments.filter((assignment) => {
    if (!assignment.class) {
      return false;
    }
    return normalizeClass(assignment.class) === normalizeClass(studentClass) && isResourceAvailable(assignment.availableFrom, now);
  });
}
