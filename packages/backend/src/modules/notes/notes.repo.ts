import { db } from '../../config/db.js';
import { notes } from '../../db/schema/notes.js';
import { eq, ilike, or, and, inArray } from 'drizzle-orm';
import type { Note } from '../../db/schema/notes.js';

export async function findAllNotes(filters?: {
  subjectId?: string;
  createdBy?: string;
  search?: string;
  limit?: number;
  offset?: number;
  subjects?: string[];
  teacherClasses?: string[];
  class?: string;
}): Promise<Note[]> {
  const conditions = [];

  if (filters?.subjectId) {
    conditions.push(eq(notes.subjectId, filters.subjectId));
  }

  if (filters?.class) {
    conditions.push(eq(notes.class, filters.class));
  }

  if (filters?.teacherClasses && filters.teacherClasses.length > 0) {
    conditions.push(or(inArray(notes.class, filters.teacherClasses), eq(notes.createdBy, filters.createdBy || '')));
  }

  if (filters?.subjects && filters.subjects.length > 0) {
    if (filters.createdBy) {
      conditions.push(or(inArray(notes.subject, filters.subjects), eq(notes.createdBy, filters.createdBy)));
    } else {
      conditions.push(inArray(notes.subject, filters.subjects));
    }
  } else if (filters?.createdBy) {
    conditions.push(eq(notes.createdBy, filters.createdBy));
  }

  if (filters?.search) {
    conditions.push(or(ilike(notes.title, `%${filters.search}%`), ilike(notes.content, `%${filters.search}%`)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(notes)
    .where(where)
    .orderBy(notes.createdAt)
    .limit(filters?.limit || 50)
    .offset(filters?.offset || 0);
}

export async function findNoteById(id: string): Promise<Note | undefined> {
  const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  return result[0];
}

export async function createNote(data: {
  id: string;
  title: string;
  content?: string;
  subject?: string;
  subjectId?: string;
  week?: string;
  term?: string;
  date?: string;
  availableFrom?: Date | null;
  fileData?: string | null;
  fileName?: string | null;
  class?: string;
  createdBy: string;
}): Promise<Note> {
  const [note] = await db.insert(notes).values(data).returning();
  return note;
}

export async function updateNote(
  id: string,
  data: Partial<Pick<Note, 'title' | 'content' | 'subject' | 'subjectId' | 'class' | 'week' | 'term' | 'date' | 'availableFrom' | 'fileData' | 'fileName'>>
): Promise<Note | undefined> {
  const [note] = await db
    .update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(notes.id, id))
    .returning();
  return note;
}

export async function deleteNote(id: string): Promise<void> {
  await db.delete(notes).where(eq(notes.id, id));
}