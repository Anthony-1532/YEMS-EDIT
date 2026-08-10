import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as usersService from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error.js';
import { PERMISSIONS, hasPermission } from '../../shared/constants/permissions.js';

export function createUsersRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.USERS_READ), async (c: Context) => {
    const search = c.req.query('search');
    const role = c.req.query('role');
    const limit = Number(c.req.query('limit') || 10000);
    const offset = Number(c.req.query('offset') || 0);

    const users = await usersService.getAllUsers({ search, role, limit, offset });
    return c.json({ success: true, data: users });
  });

  app.get('/:id', authMiddleware, async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('User ID is required');
    }
    const authUser = c.get('authUser');

    // Allow user to fetch themselves, or a parent to fetch their child
    const isSelf = authUser.id === id;
    const isChild = authUser.role === 'parent' && authUser.studentId === id;
    const hasUsersRead = hasPermission(authUser.role, PERMISSIONS.USERS_READ);

    if (!isSelf && !isChild && !hasUsersRead) {
      return c.json({
        success: false,
        message: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSION',
        required: PERMISSIONS.USERS_READ,
        userRole: authUser.role
      }, 403);
    }

    const user = await usersService.getUserById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return c.json({ success: true, data: user });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.USERS_CREATE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = await usersService.createUser(parsed.data);
    return c.json({ success: true, data: user }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('User ID is required');
    }
    const body = await c.req.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = await usersService.updateUser(id, parsed.data);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return c.json({ success: true, data: user });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.USERS_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('User ID is required');
    }
    await usersService.deleteUser(id);
    return c.json({ success: true });
  });

  return app;
}