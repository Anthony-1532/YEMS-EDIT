import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as resultsService from './results.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';

export function createResultsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.RESULTS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const filters: any = { limit, offset };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      filters.classes = Array.from(new Set(teacherClasses));
    }

    const data = await resultsService.getAllResults(user.id, user.role, filters);
    return c.json({ success: true, data });
  });

  app.get('/student/:studentId', authMiddleware, requirePermission(PERMISSIONS.RESULTS_READ), async (c: Context) => {
    const studentId = c.req.param('studentId') ?? '';
    const user = c.get('authUser');

    if (user?.role === 'parent' && user.studentId !== studentId) {
      throw new ForbiddenError('You can only view results of your own child');
    }
    if (user?.role === 'student' && user.id !== studentId) {
      throw new ForbiddenError('You can only view your own results');
    }

    if (user?.role === 'teacher') {
      // Find student to check class
      const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1).then(r => r[0]);
      if (!student) return c.json({ success: false, error: 'Student not found' }, 404);

      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      const isStudentInAllowedClass = student.class && allowedClasses.includes(student.class);

      if (!isStudentInAllowedClass) {
        // If not in allowed class, the teacher can only see results for their own subjects!
        const data = await resultsService.getResultsByStudentId(studentId, user?.role);
        const filteredData = data.filter(r => user.assignedSubjects?.includes(r.subject));
        return c.json({ success: true, data: filteredData });
      }
    }

    const data = await resultsService.getResultsByStudentId(studentId, user?.role);
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.RESULTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const data = await resultsService.getResultById(id);
    if (!data) return c.json({ success: false, error: 'Result not found' }, 404);

    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      const inAllowedClass = data.class && allowedClasses.includes(data.class);
      const teachesSubject = user.assignedSubjects?.includes(data.subject);

      if (!inAllowedClass && !teachesSubject) {
        throw new ForbiddenError('You are not allowed to view this result');
      }
    }
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.RESULTS_CREATE), async (c: Context) => {
    const body = await c.req.json();
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const teachesSubject = body.subject && user.assignedSubjects?.includes(body.subject);
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      const inAllowedClass = body.class && allowedClasses.includes(body.class);

      if (!teachesSubject && !inAllowedClass) {
        throw new ForbiddenError('You can only create results for your assigned subjects or classes');
      }
    }

    const data = await resultsService.createResult(body);
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.RESULTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const existing = await resultsService.getResultById(id);
      if (!existing) return c.json({ success: false, error: 'Result not found' }, 404);

      const teachesSubject = user.assignedSubjects?.includes(existing.subject);
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      const inAllowedClass = existing.class && allowedClasses.includes(existing.class);

      if (!teachesSubject && !inAllowedClass) {
        throw new ForbiddenError('You can only modify results for your assigned subjects or classes');
      }
    }

    const data = await resultsService.updateResult(id, body);
    if (!data) return c.json({ success: false, error: 'Result not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.RESULTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');

    if (user?.role === 'teacher') {
      const existing = await resultsService.getResultById(id);
      if (!existing) return c.json({ success: false, error: 'Result not found' }, 404);

      const teachesSubject = user.assignedSubjects?.includes(existing.subject);
      const teacherClasses = [...(user.assignedClasses || [])];
      if (user.isClassTeacher && user.classTeacherOf) {
        teacherClasses.push(user.classTeacherOf);
      }
      const allowedClasses = Array.from(new Set(teacherClasses));
      const inAllowedClass = existing.class && allowedClasses.includes(existing.class);

      if (!teachesSubject && !inAllowedClass) {
        throw new ForbiddenError('You can only delete results for your assigned subjects or classes');
      }
    }

    await resultsService.deleteResult(id);
    return c.json({ success: true });
  });

  return app;
}