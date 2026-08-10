import { generateId } from '../../shared/utils/auth.utils.js';
import * as reportsRepo from './reports.repo.js';
import type { Report } from '../../db/schema/reports.js';

export interface GetReportsParams {
  read?: boolean;
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function getAllReports(userId: string, userRole: string, params?: GetReportsParams): Promise<Report[]> {
  if (['admin', 'superadmin', 'principal', 'hod'].includes(userRole)) {
    return reportsRepo.findAllReports(params);
  }
  return reportsRepo.findReportsByUserId(userId);
}

export async function getUnreadReports(): Promise<Report[]> {
  return reportsRepo.findUnreadReports();
}

export async function getReportsByUserId(userId: string): Promise<Report[]> {
  return reportsRepo.findReportsByUserId(userId);
}

export async function getReportById(id: string): Promise<Report | null> {
  const report = await reportsRepo.findReportById(id);
  return report || null;
}

export async function createReport(data: {
  userId: string;
  userName?: string;
  category: Report['category'];
  description: string;
}): Promise<Report> {
  if (!data.description || !data.category) {
    throw new Error('Category and description are required');
  }

  return reportsRepo.createReport({
    id: generateId(),
    ...data,
  });
}

export async function markAsRead(id: string): Promise<Report | null> {
  const report = await reportsRepo.markAsRead(id);
  return report || null;
}

export async function updateStatus(id: string, status: string): Promise<Report | null> {
  const report = await reportsRepo.updateStatus(id, status);
  return report || null;
}

export async function resolveReport(id: string): Promise<Report | null> {
  const report = await reportsRepo.resolveReport(id);
  return report || null;
}

export async function deleteReport(id: string): Promise<boolean> {
  await reportsRepo.deleteReport(id);
  return true;
}