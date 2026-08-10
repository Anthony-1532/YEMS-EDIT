import { generateId } from '../../shared/utils/auth.utils.js';
import * as schemesRepo from './schemes.repo.js';
import type { Scheme } from '../../db/schema/schemes.js';

export async function getAllSchemes(params?: schemesRepo.SchemeFilters): Promise<Scheme[]> {
  return schemesRepo.findAllSchemes(params);
}

export async function getSchemesBySubject(subject: string): Promise<Scheme[]> {
  return schemesRepo.findSchemesBySubject(subject);
}

export async function getSchemesByClass(className: string): Promise<Scheme[]> {
  return schemesRepo.findSchemesByClass(className);
}

export async function getSchemeById(id: string): Promise<Scheme | null> {
  const scheme = await schemesRepo.findSchemeById(id);
  return scheme || null;
}

export async function createScheme(data: {
  subject: string;
  title: string;
  description?: string;
  week?: string;
  term?: string;
  class?: string;
  createdBy?: string;
}): Promise<Scheme> {
  if (!data.subject || !data.title) {
    throw new Error('Subject and title are required');
  }

  return schemesRepo.createScheme({
    id: generateId(),
    ...data,
  });
}

export async function updateScheme(
  id: string,
  data: Partial<Pick<Scheme, 'title' | 'description' | 'week' | 'term'>>
): Promise<Scheme | null> {
  const scheme = await schemesRepo.updateScheme(id, data);
  return scheme || null;
}

export async function deleteScheme(id: string): Promise<boolean> {
  await schemesRepo.deleteScheme(id);
  return true;
}