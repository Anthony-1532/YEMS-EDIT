import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as submissionsService from './submissions.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { ForbiddenError } from '../../shared/errors/app-error.js';

export function createSubmissionsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_READ), async (c: Context) => {
    const user = c.get('authUser');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);
    const data = await submissionsService.getAllSubmissions(user.id, user.role, { limit, offset });
    if (user?.role === 'teacher') {
      const allowedClasses = new Set([...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean) as string[]);
      return c.json({ success: true, data: data.filter((submission) => {
        const submissionClass = (submission as any).class || (submission as any).studentClass;
        return !submissionClass || allowedClasses.has(submissionClass);
      }) });
    }
    return c.json({ success: true, data });
  });

  app.get('/exam/:examId', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_READ), async (c: Context) => {
    const examId = c.req.param('examId') ?? '';
    const user = c.get('authUser');
    const data = await submissionsService.getSubmissionsByExamId(examId);
    if (user?.role === 'teacher') {
      const allowedClasses = new Set([...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean) as string[]);
      return c.json({ success: true, data: data.filter((submission) => {
        const submissionClass = (submission as any).class || (submission as any).studentClass;
        return !submissionClass || allowedClasses.has(submissionClass);
      }) });
    }
    return c.json({ success: true, data });
  });

  app.get('/student/:studentId', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_READ), async (c: Context) => {
    const studentId = c.req.param('studentId') ?? '';
    const user = c.get('authUser');
    const data = await submissionsService.getSubmissionsByStudentId(studentId);
    if (user?.role === 'teacher') {
      const allowedClasses = new Set([...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean) as string[]);
      return c.json({ success: true, data: data.filter((submission) => {
        const submissionClass = (submission as any).class || (submission as any).studentClass;
        return !submissionClass || allowedClasses.has(submissionClass);
      }) });
    }
    return c.json({ success: true, data });
  });

  app.get('/assignment/:assignmentId', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_READ), async (c: Context) => {
    const assignmentId = c.req.param('assignmentId') ?? '';
    const user = c.get('authUser');
    const data = await submissionsService.getSubmissionsByAssignmentId(assignmentId);
    if (user?.role === 'teacher') {
      const allowedClasses = new Set([...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean) as string[]);
      return c.json({ success: true, data: data.filter((submission) => {
        const submissionClass = (submission as any).class || (submission as any).studentClass;
        return !submissionClass || allowedClasses.has(submissionClass);
      }) });
    }
    return c.json({ success: true, data });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const user = c.get('authUser');
    const data = await submissionsService.getSubmissionDetails(id);
    if (!data) return c.json({ success: false, error: 'Submission not found' }, 404);
    if (user?.role === 'teacher') {
      const allowedClasses = new Set([...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean) as string[]);
      const submissionClass = data.studentClass || (data as any).class || (data as any).studentClass;
      if (submissionClass && !allowedClasses.has(submissionClass)) {
        throw new ForbiddenError('You are not allowed to view this submission');
      }
    }
    return c.json({ success: true, data });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_CREATE), async (c: Context) => {
    const user = c.get('authUser');
    const body = await c.req.json();
    const data = await submissionsService.createSubmission({
      examId: body.examId,
      studentId: user.id,
      answers: body.answers,
    });
    return c.json({ success: true, data }, 201);
  });

  app.patch('/:id/grade', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_GRADE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const user = c.get('authUser');
    const data = await submissionsService.gradeSubmission(id, {
      score: body.score,
      totalScore: body.totalScore,
      gradedBy: user.id,
      feedback: body.feedback,
    });
    return c.json({ success: true, data });
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    const body = await c.req.json();
    const data = await submissionsService.updateSubmission(id, { answers: body.answers });
    if (!data) return c.json({ success: false, error: 'Submission not found' }, 404);
    return c.json({ success: true, data });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.SUBMISSIONS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    await submissionsService.deleteSubmission(id);
    return c.json({ success: true });
  });

  return app;
}