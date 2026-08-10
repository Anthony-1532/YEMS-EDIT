import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as examsService from './exams.service.js';
import { createExamSchema, updateExamSchema } from './exams.schema.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import * as resultsService from '../results/results.service.js';
import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';
import { normalizeClass } from '../../shared/utils/class.utils.js';
import { isResourceAvailable } from '../../shared/utils/availability.js';

export function createExamsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.EXAMS_READ), async (c: Context) => {
    const type = c.req.query('type');
    const search = c.req.query('search');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const user = c.get('authUser');
    const filters: any = { type, search, limit, offset };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
      filters.createdBy = user.id;
    }

    let exams = await examsService.getAllExams(filters);
    if (user?.role === 'student') {
      const studentClass = user.class;
      const now = new Date();
      exams = exams.filter((exam) => {
        const classOk = !exam.class || !studentClass || normalizeClass(exam.class) === normalizeClass(studentClass);
        return classOk && isResourceAvailable(exam.availableFrom, now);
      });
    }
    return c.json({ success: true, data: exams });
  });

  app.get('/type/:type', authMiddleware, requirePermission(PERMISSIONS.EXAMS_READ), async (c: Context) => {
    const type = c.req.param('type');
    const user = c.get('authUser');
    const filters: any = { type, limit: 50, offset: 0 };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
      filters.createdBy = user.id;
    }
    let exams = await examsService.getAllExams(filters);
    if (user?.role === 'student') {
      const studentClass = user.class;
      const now = new Date();
      exams = exams.filter((exam) => {
        const classOk = !exam.class || !studentClass || normalizeClass(exam.class) === normalizeClass(studentClass);
        return classOk && isResourceAvailable(exam.availableFrom, now);
      });
    }
    return c.json({ success: true, data: exams });
  });

  app.post('/start', authMiddleware, requirePermission(PERMISSIONS.EXAMS_TAKE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const { examId, studentId } = body || {};

    if (!examId || !studentId) {
      throw new BadRequestError('examId and studentId are required');
    }

    const authUser = c.get('authUser');
    if (authUser.role === 'student' && authUser.id !== studentId) {
      throw new ForbiddenError('Cannot start exam on behalf of another student');
    }

    const exam = await examsService.getExamById(examId);
    if (!exam) {
      throw new NotFoundError('Exam not found');
    }

    return c.json({
      success: true,
      data: {
        examId,
        studentId,
        startedAt: new Date().toISOString(),
        status: 'in_progress'
      }
    });
  });

  app.post('/submit', authMiddleware, requirePermission(PERMISSIONS.EXAMS_TAKE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const { examId, studentId, answers } = body || {};

    if (!examId || !studentId) {
      throw new BadRequestError('examId and studentId are required');
    }

    const authUser = c.get('authUser');
    if (authUser.role === 'student' && authUser.id !== studentId) {
      throw new ForbiddenError('Cannot submit exam on behalf of another student');
    }

    const exam = await examsService.getExamById(examId);
    if (!exam) {
      throw new NotFoundError('Exam not found');
    }

    // Load student to get name and class
    const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1).then((r) => r[0]);
    if (!student) {
      throw new NotFoundError('Student not found');
    }

    const format = exam.format || 'mcq';
    const isTheory = format.toLowerCase().includes('theory') || format.toLowerCase().includes('written');

    let score = 0;
    let totalScore = 0;

    const qList = (exam.questionsList || exam.questions || []) as any[];
    if (isTheory) {
      // Theory papers are graded manually; expose the total obtainable marks only.
      totalScore = qList.reduce((sum, q) => sum + (q.marks ?? q.points ?? 5), 0);
    } else {
      // MCQ auto-grading against the exam's real answer key. No mock fallback.
      const graded = examsService.gradeMcqAnswers(qList, answers || {});
      score = graded.score;
      totalScore = graded.totalScore;
    }

    const percentage = totalScore > 0 ? score / totalScore : 0;
    const grade = isTheory || totalScore === 0
      ? 'Pending'
      : (percentage >= 0.85 ? 'A' : percentage >= 0.7 ? 'B' : 'C');
    const remarks = isTheory ? 'Awaiting grading' : 'Automatically graded MCQ sheet';

    const resultRecord = await resultsService.createResult({
      studentId,
      examId,
      examTitle: exam.title,
      subject: exam.subject || 'Core Subject',
      score,
      totalScore,
      grade,
      remarks,
      class: student.class || 'N/A',
      session: student.session || '2025/2026',
      term: student.term || '1st Term',
    });

    return c.json({
      success: true,
      data: resultRecord
    });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.EXAMS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Exam ID is required');
    }
    const exam = await examsService.getExamById(id);
    if (!exam) {
      throw new NotFoundError('Exam not found');
    }
    const user = c.get('authUser');
    if (user?.role === 'teacher' && exam.createdBy !== user.id && (!exam.subject || !user.assignedSubjects?.includes(exam.subject))) {
      throw new ForbiddenError('You are not allowed to view this exam');
    }
    if (user?.role === 'student') {
      if (!exam.class || normalizeClass(exam.class) !== normalizeClass(user.class)) {
        throw new ForbiddenError('You are not allowed to view this exam');
      }
      if (!isResourceAvailable(exam.availableFrom)) {
        throw new ForbiddenError('This exam is not available yet');
      }
    }
    return c.json({ success: true, data: exam });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.EXAMS_CREATE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createExamSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher' && parsed.data.subject && !user.assignedSubjects?.includes(parsed.data.subject)) {
      throw new ForbiddenError('You can only create exams for your assigned subjects');
    }
    const exam = await examsService.createExam({ ...parsed.data, createdBy: user!.id });
    return c.json({ success: true, data: exam }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.EXAMS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Exam ID is required');
    }
    const body = await c.req.json().catch(() => null);
    const parsed = updateExamSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingExam = await examsService.getExamById(id);
      if (!existingExam) {
        throw new NotFoundError('Exam not found');
      }
      if (existingExam.createdBy !== user.id) {
        throw new ForbiddenError('You can only modify exams that you created');
      }
    }

    const exam = await examsService.updateExam(id, parsed.data);
    if (!exam) {
      throw new NotFoundError('Exam not found');
    }
    return c.json({ success: true, data: exam });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.EXAMS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Exam ID is required');
    }
    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingExam = await examsService.getExamById(id);
      if (!existingExam) {
        throw new NotFoundError('Exam not found');
      }
      if (existingExam.createdBy !== user.id) {
        throw new ForbiddenError('You can only delete exams that you created');
      }
    }

    await examsService.deleteExam(id);
    return c.json({ success: true });
  });

  return app;
}