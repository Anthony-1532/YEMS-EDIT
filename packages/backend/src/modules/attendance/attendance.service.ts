import { generateId } from '../../shared/utils/auth.utils.js';
import * as attendanceRepo from './attendance.repo.js';
import type { Attendance } from '../../db/schema/attendance.js';
import { BadRequestError } from '../../shared/errors/app-error.js';

type AttendanceType = 'period' | 'full_day';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceEntryInput {
  studentId: string;
  status?: AttendanceStatus;
  remarks?: string;
}

export interface RecordAttendanceInput {
  type: AttendanceType;
  class: string;
  subject?: string;
  period?: string;
  date: string;
  term?: string;
  session?: string;
  entries: AttendanceEntryInput[];
}

export async function getAllAttendance(params?: attendanceRepo.AttendanceFilters): Promise<Attendance[]> {
  return attendanceRepo.findAllAttendance(params);
}

export async function getAttendanceById(id: string): Promise<Attendance | null> {
  const record = await attendanceRepo.findAttendanceById(id);
  return record || null;
}

/**
 * Record attendance for a roster in one call. `type` decides which fields are
 * required: period-level attendance must name a subject; full-day must not.
 */
export async function recordAttendance(
  input: RecordAttendanceInput,
  recordedBy: string
): Promise<Attendance[]> {
  if (!input.class || !input.date) {
    throw new BadRequestError('class and date are required');
  }
  if (!input.entries || input.entries.length === 0) {
    throw new BadRequestError('At least one attendance entry is required');
  }
  if (input.type === 'period' && !input.subject) {
    throw new BadRequestError('subject is required for period attendance');
  }
  if (input.type === 'full_day' && input.subject) {
    throw new BadRequestError('subject must not be set for full-day attendance');
  }

  const rows = input.entries.map((entry) => ({
    id: generateId(),
    type: input.type,
    studentId: entry.studentId,
    class: input.class,
    subject: input.type === 'period' ? input.subject : null,
    period: input.type === 'period' ? input.period : null,
    status: entry.status ?? ('present' as AttendanceStatus),
    date: input.date,
    term: input.term,
    session: input.session,
    remarks: entry.remarks,
    recordedBy,
  }));

  return attendanceRepo.createManyAttendance(rows);
}

export async function updateAttendance(
  id: string,
  data: Partial<Pick<Attendance, 'status' | 'remarks' | 'period' | 'subject'>>
): Promise<Attendance | null> {
  const record = await attendanceRepo.updateAttendance(id, data);
  return record || null;
}

export async function deleteAttendance(id: string): Promise<boolean> {
  await attendanceRepo.deleteAttendance(id);
  return true;
}
