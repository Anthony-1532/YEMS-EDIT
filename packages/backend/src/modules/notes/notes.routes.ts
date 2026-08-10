import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware, requirePermission } from '../../app/middleware.js';
import * as notesService from './notes.service.js';
import { createNoteSchema, updateNoteSchema } from './notes.schema.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js';
import { PERMISSIONS } from '../../shared/constants/permissions.js';
import { isResourceAvailable } from '../../shared/utils/availability.js';

export function createNotesRoutes() {
  const app = new Hono();

  app.get('/', authMiddleware, requirePermission(PERMISSIONS.NOTES_READ), async (c: Context) => {
    const subjectId = c.req.query('subjectId');
    const search = c.req.query('search');
    const limit = Number(c.req.query('limit') || 50);
    const offset = Number(c.req.query('offset') || 0);

    const user = c.get('authUser');
    const filters: any = { subjectId, search, limit, offset, class: c.req.query('class') || undefined };
    if (user?.role === 'teacher') {
      filters.subjects = user.assignedSubjects || [];
      filters.createdBy = user.id;
      filters.teacherClasses = [...(user.assignedClasses || []), user.classTeacherOf].filter(Boolean);
    }

    const notes = await notesService.getAllNotes(filters);
    if (user?.role === 'student') {
      const now = new Date();
      return c.json({ success: true, data: notes.filter((note) => isResourceAvailable(note.availableFrom, now)) });
    }
    return c.json({ success: true, data: notes });
  });

  app.get('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTES_READ), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Note ID is required');
    }
    const note = await notesService.getNoteById(id);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    const user = c.get('authUser');
    if (user?.role === 'student' && !isResourceAvailable(note.availableFrom)) {
      throw new ForbiddenError('This note is not available yet');
    }
    if (user?.role === 'teacher' && note.createdBy !== user.id && (!note.subject || !user.assignedSubjects?.includes(note.subject))) {
      throw new ForbiddenError('You are not allowed to view this note');
    }
    return c.json({ success: true, data: note });
  });

  app.post('/', authMiddleware, requirePermission(PERMISSIONS.NOTES_CREATE), async (c: Context) => {
    const body = await c.req.json().catch(() => null);
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher' && parsed.data.subject && !user.assignedSubjects?.includes(parsed.data.subject)) {
      throw new ForbiddenError('You can only create notes for your assigned subjects');
    }
    const note = await notesService.createNote({ ...parsed.data, createdBy: user!.id });
    return c.json({ success: true, data: note }, 201);
  });

  app.patch('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTES_UPDATE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Note ID is required');
    }
    const body = await c.req.json().catch(() => null);
    const parsed = updateNoteSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingNote = await notesService.getNoteById(id);
      if (!existingNote) {
        throw new NotFoundError('Note not found');
      }
      if (existingNote.createdBy !== user.id) {
        throw new ForbiddenError('You can only modify notes that you created');
      }
    }

    const note = await notesService.updateNote(id, parsed.data);
    if (!note) {
      throw new NotFoundError('Note not found');
    }
    return c.json({ success: true, data: note });
  });

  app.delete('/:id', authMiddleware, requirePermission(PERMISSIONS.NOTES_DELETE), async (c: Context) => {
    const id = c.req.param('id') ?? '';
    if (!id) {
      throw new BadRequestError('Note ID is required');
    }
    const user = c.get('authUser');
    if (user?.role === 'teacher') {
      const existingNote = await notesService.getNoteById(id);
      if (!existingNote) {
        throw new NotFoundError('Note not found');
      }
      if (existingNote.createdBy !== user.id) {
        throw new ForbiddenError('You can only delete notes that you created');
      }
    }

    await notesService.deleteNote(id);
    return c.json({ success: true });
  });

  return app;
}