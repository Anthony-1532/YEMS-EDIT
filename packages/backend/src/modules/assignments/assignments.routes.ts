import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as assignmentsService from './assignments.service.js';
import { createAssignmentSchema, updateAssignmentSchema } from './assignments.schema.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { isResourceAvailable } from '../../shared/utils/availability.js';
import { filterAssignmentsForUser } from './assignments.utils.js';

export function createAssignmentsRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_READ), async (c: Context) => {
    const subject = c.req.query('subject');
    const status = c.req.query('status');
    const search = c.req.query('search');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const user = c.get('authUser');
    const filters: any = { subject, status, search, limit, offset };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
      filters.createdBy = user.id;
    }

    const assignments = await assignmentsService.getAllAssignments(filters);
    const visibleAssignments = filterAssignmentsForUser(assignments, user);
    return c.json({ success: true, data: visibleAssignments });
  });

  app.delete('/', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_MANAGE), async (c: Context) => {
    const user = c.get('authUser');
    if (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'principal' && user?.role !== 'hod') {
      throw new ForbiddenError('Only admins can bulk delete assignments');
    }
    await assignmentsService.deleteAllAssignments();
    return c.json({ success: true, message: 'All assignments deleted' });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Assignment ID is required');
    }
    const assignment = await assignmentsService.getAssignmentById(id);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }
    const user = c.get('authUser');
    if (user?.role === 'teacher' && assignment.createdBy !== user.id && (!assignment.subject || !user.assignedSubjects?.includes(assignment.subject))) {
      throw new ForbiddenError('You are not allowed to view this assignment');
    }
    if (user?.role === 'student') {
      if (!assignment.class || assignment.class !== user.class) {
        throw new ForbiddenError('You are not allowed to view this assignment');
      }
      if (!isResourceAvailable(assignment.availableFrom)) {
        throw new ForbiddenError('This assignment is not available yet');
      }
    }
    return c.json({ success: true, data: assignment });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_CREATE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher' && parsed.data.subject && !user.assignedSubjects?.includes(parsed.data.subject)) {
      throw new ForbiddenError('You can only create assignments for your assigned subjects');
    }
    const assignment = await assignmentsService.createAssignment({ ...parsed.data, createdBy: user!.id });
    return c.json({ success: true, data: assignment }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Assignment ID is required');
    }
    const body = await c.req.json().catch(() => null);
    const parsed = updateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingAssignment = await assignmentsService.getAssignmentById(id);
      if (!existingAssignment) {
        throw new NotFoundError('Assignment not found');
      }
      if (existingAssignment.createdBy !== user.id) {
        throw new ForbiddenError('You can only modify assignments that you created');
      }
    }

    const assignment = await assignmentsService.updateAssignment(id, parsed.data);
    if (!assignment) {
      throw new NotFoundError('Assignment not found');
    }
    return c.json({ success: true, data: assignment });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.ASSIGNMENTS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Assignment ID is required');
    }
    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingAssignment = await assignmentsService.getAssignmentById(id);
      if (!existingAssignment) {
        throw new NotFoundError('Assignment not found');
      }
      if (existingAssignment.createdBy !== user.id) {
        throw new ForbiddenError('You can only delete assignments that you created');
      }
    }

    await assignmentsService.deleteAssignment(id);
    return c.json({ success: true });
  });

  return app;
}