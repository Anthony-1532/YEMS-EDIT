import { generateId } from '../../shared/utils/auth.utils.js';
import * as notesRepo from './notes.repo.js';
import type { Note } from '../../db/schema/notes.js';

export async function getAllNotes(
  filters?: { subjectId?: string; createdBy?: string; search?: string; limit?: number; offset?: number; subjects?: string[]; teacherClasses?: string[]; class?: string }
): Promise<Note[]> {
  return notesRepo.findAllNotes(filters);
}

export async function getNoteById(id: string): Promise<Note | null> {
  const note = await notesRepo.findNoteById(id);
  return note || null;
}

export async function createNote(data: {
  title: string;
  content?: string;
  subject?: string;
  subjectId?: string;
  week?: string;
  term?: string;
  date?: string;
  availableFrom?: string;
  fileData?: string | null;
  fileName?: string | null;
  class?: string;
  createdBy: string;
}): Promise<Note> {
  return notesRepo.createNote({
    id: generateId(),
    ...data,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
  });
}

export async function updateNote(
  id: string,
  data: {
    title?: string;
    content?: string;
    subject?: string;
    subjectId?: string;
    class?: string;
    week?: string;
    term?: string;
    date?: string;
    availableFrom?: string;
    fileData?: string | null;
    fileName?: string | null;
  }
): Promise<Note | null> {
  const note = await notesRepo.updateNote(id, {
    ...data,
    availableFrom: data.availableFrom ? new Date(data.availableFrom) : undefined,
  });
  return note || null;
}

export async function deleteNote(id: string): Promise<boolean> {
  await notesRepo.deleteNote(id);
  return true;
}