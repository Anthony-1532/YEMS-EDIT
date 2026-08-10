import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as attendanceService from './attendance.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';
import type { AuthUser } from '../../app/middleware.js';

function teacherClassScope(user: AuthUser): string[] {
  const teacherClasses = [...(user.assignedClasses || [])];
  if (user.isClassTeacher && user.classTeacherOf) {
    teacherClasses.push(user.classTeacherOf);
  }
  return Array.from(new Set(teacherClasses));
}

function assertTeacherCanAccessClass(user: AuthUser, className: string | null | undefined): void {
  if (user.role !== 'teacher') return;
  if (!className) throw new ForbiddenError('Class is required');
  if (!teacherClassScope(user).includes(className)) {
    throw new ForbiddenError('You can only access attendance for your assigned classes');
  }
}

export function createAttendanceRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 100);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    const type = c.req.query('type');
    if (type === 'period' || type === 'full_day') filters.type = type;
    if (c.req.query('class')) filters.class = c.req.query('class');
    if (c.req.query('subject')) filters.subject = c.req.query('subject');
    if (c.req.query('studentId')) filters.studentId = c.req.query('studentId');
    if (c.req.query('date')) filters.date = c.req.query('date');
    if (c.req.query('term')) filters.term = c.req.query('term');
    if (c.req.query('session')) filters.session = c.req.query('session');

    if (user?.role === 'teacher') {
      filters.classes = teacherClassScope(user);
    }

    const data = await attendanceService.getAllAttendance(filters);
    return c.json({ success: true, data });
  });

  app.get('/summary', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_READ), async (c: Context) => {
    const user = c.get('authUser');
    const cls = c.req.query('class');
    const date = c.req.query('date');
    const type = c.req.query('type') === 'period' ? 'period' : 'full_day';
    const subject = c.req.query('subject');

    if (!cls || !date) {
      return c.json({ success: false, error: 'class and date are required' }, 400);
    }

    const filters: any = { class: cls, date, type, limit: 10000 };
    if (subject) filters.subject = subject;
    if (user?.role === 'teacher') {
      filters.classes = teacherClassScope(user);
    }

    const records = await attendanceService.getAllAttendance(filters);
    const summary = {
      total: records.length,
      present: records.filter((r) => r.status === 'present').length,
      absent: records.filter((r) => r.status === 'absent').length,
      late: records.filter((r) => r.status === 'late').length,
      excused: records.filter((r) => r.status === 'excused').length,
    };
    return c.json({ success: true, data: summary });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();

    if (user?.role === 'teacher') {
      if (body.type === 'full_day') {
        const isClassTeacher = user.isClassTeacher && user.classTeacherOf === body.class;
        if (!isClassTeacher) {
          throw new ForbiddenError('Only the class teacher can record full-day attendance for a class');
        }
      } else {
        const teachesSubject = body.subject && user.assignedSubjects?.includes(body.subject);
        const inAssignedClass = body.class && user.assignedClasses?.includes(body.class);
        if (!teachesSubject || !inAssignedClass) {
          throw new ForbiddenError('You can only record period attendance for your assigned subjects in your assigned classes');
        }
      }
    }

    const data = await attendanceService.recordAttendance(body, user.id);
    return c.json({ success: true, data, count: data.length }, 201);
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await attendanceService.getAttendanceById(id);
    if (!data) return c.json({ success: false, error: 'Attendance record not found' }, 404);

    const user = c.get('authUser');
    assertTeacherCanAccessClass(user, data.class);

    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = c.get('authUser');

    const existing = await attendanceService.getAttendanceById(id);
    if (!existing) return c.json({ success: false, error: 'Attendance record not found' }, 404);

    if (user?.role === 'teacher') {
      if (existing.type === 'full_day') {
        const isClassTeacher = user.isClassTeacher && user.classTeacherOf === existing.class;
        if (!isClassTeacher) {
          throw new ForbiddenError('Only the class teacher can update full-day attendance');
        }
      } else {
        const teachesSubject = user.assignedSubjects?.includes(existing.subject ?? '');
        if (!teachesSubject) {
          throw new ForbiddenError('You can only update attendance for your assigned subjects');
        }
      }
    }

    const data = await attendanceService.updateAttendance(id, body);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.ATTENDANCE_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');

    const existing = await attendanceService.getAttendanceById(id);
    if (!existing) return c.json({ success: false, error: 'Attendance record not found' }, 404);

    assertTeacherCanAccessClass(user, existing.class);

    await attendanceService.deleteAttendance(id);
    return c.json({ success: true });
  });

  return app;
}
