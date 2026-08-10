import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as examsService from '../exams/exams.service.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { normalizeClass } from '../../shared/utils/class.utils.js';

export function createStudentRoutes() {
  const app = new Hono();

  app.get('/exams', authMiddleware, requirePermission(PERMISSIONS.EXAMS_READ), async (c: Context) => {
    const type = c.req.query('type');
    const search = c.req.query('search');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const user = c.get('authUser');
    const studentClass = user?.class;

    const exams = await examsService.getAllExams({ type, search, limit, offset });
    
    // Filter exams by student class level
    const filteredExams = exams.filter((exam) => {
      if (exam.class) {
        return normalizeClass(exam.class) === normalizeClass(studentClass);
      }
      return false;
    });

    return c.json({ success: true, data: filteredExams });
  });

  return app;
}