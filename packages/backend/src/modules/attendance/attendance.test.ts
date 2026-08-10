import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as attendanceRepo from '../attendance/attendance.repo.js';
import * as attendanceService from '../attendance/attendance.service.js';

vi.mock('../../config/db.js', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: () => Promise.resolve([]),
            }),
          }),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe('Attendance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAttendance', () => {
    it('should return all attendance records', async () => {
      const mock = [
        { id: '1', type: 'full_day', class: 'JSS1 A', status: 'present' },
        { id: '2', type: 'period', class: 'JSS1 A', subject: 'Math', status: 'absent' },
      ];
      vi.spyOn(attendanceRepo, 'findAllAttendance').mockResolvedValue(mock as any);

      const result = await attendanceService.getAllAttendance();

      expect(result).toEqual(mock);
    });
  });

  describe('getAttendanceById', () => {
    it('should return record when found', async () => {
      const mock = { id: '1', type: 'full_day' };
      vi.spyOn(attendanceRepo, 'findAttendanceById').mockResolvedValue(mock as any);

      const result = await attendanceService.getAttendanceById('1');

      expect(result).toEqual(mock);
    });

    it('should return null when not found', async () => {
      vi.spyOn(attendanceRepo, 'findAttendanceById').mockResolvedValue(undefined);

      const result = await attendanceService.getAttendanceById('999');

      expect(result).toBeNull();
    });
  });

  describe('recordAttendance', () => {
    it('should record full-day attendance for a roster', async () => {
      const created = [
        { id: 'a', type: 'full_day', studentId: 's1', status: 'present' },
        { id: 'b', type: 'full_day', studentId: 's2', status: 'absent' },
      ];
      vi.spyOn(attendanceRepo, 'createManyAttendance').mockResolvedValue(created as any);

      const result = await attendanceService.recordAttendance(
        {
          type: 'full_day',
          class: 'JSS1 A',
          date: '2026-08-08',
          entries: [
            { studentId: 's1', status: 'present' },
            { studentId: 's2', status: 'absent' },
          ],
        },
        'teacher-1'
      );

      expect(result).toHaveLength(2);
    });

    it('should require a subject for period attendance', async () => {
      await expect(
        attendanceService.recordAttendance(
          { type: 'period', class: 'JSS1 A', date: '2026-08-08', entries: [{ studentId: 's1' }] },
          'teacher-1'
        )
      ).rejects.toThrow('subject is required for period attendance');
    });

    it('should reject a subject on full-day attendance', async () => {
      await expect(
        attendanceService.recordAttendance(
          { type: 'full_day', class: 'JSS1 A', subject: 'Math', date: '2026-08-08', entries: [{ studentId: 's1' }] },
          'teacher-1'
        )
      ).rejects.toThrow('subject must not be set for full-day attendance');
    });

    it('should require at least one entry', async () => {
      await expect(
        attendanceService.recordAttendance(
          { type: 'full_day', class: 'JSS1 A', date: '2026-08-08', entries: [] },
          'teacher-1'
        )
      ).rejects.toThrow('At least one attendance entry is required');
    });

    it('should require class and date', async () => {
      await expect(
        attendanceService.recordAttendance(
          { type: 'full_day', class: '', date: '', entries: [{ studentId: 's1' }] },
          'teacher-1'
        )
      ).rejects.toThrow('class and date are required');
    });
  });

  describe('updateAttendance', () => {
    it('should update a record', async () => {
      const updated = { id: '1', status: 'late' };
      vi.spyOn(attendanceRepo, 'updateAttendance').mockResolvedValue(updated as any);

      const result = await attendanceService.updateAttendance('1', { status: 'late' });

      expect(result?.status).toBe('late');
    });
  });

  describe('deleteAttendance', () => {
    it('should return true after deletion', async () => {
      vi.spyOn(attendanceRepo, 'deleteAttendance').mockResolvedValue(undefined);

      const result = await attendanceService.deleteAttendance('1');

      expect(result).toBe(true);
    });
  });
});
