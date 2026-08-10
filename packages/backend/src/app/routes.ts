import { swaggerUI } from '@hono/swagger-ui';
import { createAuthRoutes } from '../modules/auth/auth.routes.js';
import { createUsersRoutes } from '../modules/users/users.routes.js';
import { createNotesRoutes } from '../modules/notes/notes.routes.js';
import { createAssignmentsRoutes } from '../modules/assignments/assignments.routes.js';
import { createExamsRoutes } from '../modules/exams/exams.routes.js';
import { createStorageRoutes } from '../modules/storage/storage.routes.js';
import { createAdminRoutes } from '../modules/admin/admin.routes.js';
import { createTechnicianRoutes } from '../modules/technician/technician.routes.js';
import { createTeacherRoutes } from '../modules/teacher/teacher.routes.js';
import { createStudentRoutes } from '../modules/student/student.routes.js';
import { createResultsRoutes } from '../modules/results/results.routes.js';
import { createNotificationsRoutes } from '../modules/notifications/notifications.routes.js';
import { createLessonsRoutes } from '../modules/lessons/lessons.routes.js';
import { createSubmissionsRoutes } from '../modules/submissions/submissions.routes.js';
import { createSchemesRoutes } from '../modules/schemes/schemes.routes.js';
import { createLessonPlansRoutes } from '../modules/lesson-plans/lesson-plans.routes.js';
import { createMidtermResultsRoutes } from '../modules/midterm-results/midterm-results.routes.js';
import { createAttendanceRoutes } from '../modules/attendance/attendance.routes.js';
import { createReportCardsRoutes } from '../modules/report-cards/report-cards.routes.js';
import { createDisciplineRoutes } from '../modules/discipline/discipline.routes.js';
import { createStaffRequestsRoutes } from '../modules/staff-requests/staff-requests.routes.js';
import { createExpensesRoutes } from '../modules/expenses/expenses.routes.js';
import { createReportsRoutes } from '../modules/reports/reports.routes.js';
import { createAdmissionsRoutes } from '../modules/admissions/admissions.routes.js';
import { createAccountantRoutes } from '../modules/accountant/accountant.routes.js';
import { createSuperadminRoutes } from '../modules/superadmin/superadmin.routes.js';
import { createPrincipalRoutes } from '../modules/principal/principal.routes.js';
import { db } from '../config/db.js';
import { sql } from 'drizzle-orm';
import { storageClient, STORAGE_BUCKET } from '../config/storage.js';
import { emailQueue } from '../modules/email/email.queue.js';
import { ensureRedisConnection } from '../queue/redis.js';
import logger from '../config/logger.js';

export function registerRoutes(app: any) {
  // API Info
  app.get('/api', (c: any) => c.json({
    name: 'YEMS API',
    version: '1.0.0',
    docs: '/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      notes: '/api/notes',
      assignments: '/api/assignments',
      exams: '/api/exams',
      storage: '/api/storage',
      admin: '/api/admin',
      teacher: '/api/teacher',
      student: '/api/student',
      results: '/api/results',
      notifications: '/api/notifications',
      lessons: '/api/lessons',
      submissions: '/api/submissions',
      schemes: '/api/schemes',
      'lesson-plans': '/api/lesson-plans',
      'midterm-results': '/api/midterm-results',
      attendance: '/api/attendance',
      'report-cards': '/api/report-cards',
      discipline: '/api/discipline',
      'staff-requests': '/api/staff-requests',
      expenses: '/api/expenses',
      reports: '/api/reports',
      admissions: '/api/admissions',
      accountant: '/api/accountant',
      superadmin: '/api/superadmin',
      principal: '/api/principal',
    }
  }));

  // Swagger UI
  app.get('/docs', swaggerUI({ url: '/api/docs' }));

  // Health
  app.get('/health', (c: any) => c.json({ ok: true }));
  app.get('/api/health', (c: any) => c.json({ ok: true }));
  
  app.get('/health/db', async (c: any) => {
    try {
      await db.execute(sql`SELECT 1`);
      return c.json({ ok: true, db: 'ready' });
    } catch (error: unknown) {
      logger.error('Health check failed: db', { error: (error as Error).message });
      return c.json({ ok: false, db: 'error', message: 'Database unavailable' }, 500);
    }
  });

  app.get('/health/storage', async (c: any) => {
    try {
      const exists = await storageClient.bucketExists(STORAGE_BUCKET);
      return c.json({ ok: true, storage: exists ? 'ready' : 'bucket_missing' });
    } catch (error: unknown) {
      logger.error('Health check failed: storage', { error: (error as Error).message });
      return c.json({ ok: false, storage: 'error', message: 'Storage unavailable' }, 500);
    }
  });

  app.get('/health/queue', async (c: any) => {
    if (!emailQueue) {
      return c.json({ ok: false, queue: 'unavailable', message: 'Queue not initialized (Redis too old or unavailable)' }, 503);
    }
    try {
      await ensureRedisConnection();
      const waiting = await emailQueue.getWaitingCount();
      const active = await emailQueue.getActiveCount();
      return c.json({ ok: true, queue: 'ready', emailJobs: { waiting, active } });
    } catch (error: unknown) {
      logger.error('Health check failed: queue', { error: (error as Error).message });
      return c.json({ ok: false, queue: 'error', message: 'Queue unavailable' }, 500);
    }
  });

  app.get('/metrics', async (c: any) => {
    const metrics = {
      requests: { total: 0, success: 0, failed: 0 },
      responseTime: { avg: 0, min: 0, max: 0 },
      timestamp: new Date().toISOString(),
    };
    return c.json({ success: true, data: metrics });
  });

  app.get('/api/metrics', async (c: any) => {
    const metrics = {
      requests: { total: 0, success: 0, failed: 0 },
      responseTime: { avg: 0, min: 0, max: 0 },
      timestamp: new Date().toISOString(),
    };
    return c.json({ success: true, data: metrics });
  });

  app.get('/status/metrics', async (c: any) => {
    const statusMetrics = {
      api: { status: 'operational', latency: 0 },
      database: { status: 'operational', connections: 0 },
      storage: { status: 'operational', used: 0 },
      timestamp: new Date().toISOString(),
    };
    return c.json({ success: true, data: statusMetrics });
  });

  app.get('/api/status/metrics', async (c: any) => {
    const statusMetrics = {
      api: { status: 'operational', latency: 0 },
      database: { status: 'operational', connections: 0 },
      storage: { status: 'operational', used: 0 },
      timestamp: new Date().toISOString(),
    };
    return c.json({ success: true, data: statusMetrics });
  });

  // API Routes
  app.route('/api/auth', createAuthRoutes());
  app.route('/api/users', createUsersRoutes());
  app.route('/api/notes', createNotesRoutes());
  app.route('/api/assignments', createAssignmentsRoutes());
  app.route('/api/exams', createExamsRoutes());
  app.route('/api/storage', createStorageRoutes());
  app.route('/api/admin', createAdminRoutes());
  app.route('/api/technician', createTechnicianRoutes());
  app.route('/api/teacher', createTeacherRoutes());
  app.route('/api/student', createStudentRoutes());
  app.route('/api/results', createResultsRoutes());
  app.route('/api/notifications', createNotificationsRoutes());
  app.route('/api/lessons', createLessonsRoutes());
  app.route('/api/submissions', createSubmissionsRoutes());
  app.route('/api/schemes', createSchemesRoutes());
  app.route('/api/lesson-plans', createLessonPlansRoutes());
  app.route('/api/midterm-results', createMidtermResultsRoutes());
  app.route('/api/attendance', createAttendanceRoutes());
  app.route('/api/report-cards', createReportCardsRoutes());
  app.route('/api/discipline', createDisciplineRoutes());
  app.route('/api/staff-requests', createStaffRequestsRoutes());
  app.route('/api/expenses', createExpensesRoutes());
  app.route('/api/reports', createReportsRoutes());
  app.route('/api/admissions', createAdmissionsRoutes());
  app.route('/api/accountant', createAccountantRoutes());
  app.route('/api/superadmin', createSuperadminRoutes());
  app.route('/api/principal', createPrincipalRoutes());
}
