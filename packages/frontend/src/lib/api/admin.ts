import { api } from './client';
import type { ApiResponse, AuditLog, SchoolClass, Subject, User } from './types';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error || res.message || 'Request failed');
  return res.data as T;
}

export const adminApi = {
  // Users
  getUsers: (params?: { search?: string; role?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.role) qs.set('role', params.role);
    qs.set('limit', String(params?.limit || 10000));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<User[]>>(`/admin/users${suffix}`).then(unwrap);
  },
  getUser: (id: string) => api.get<ApiResponse<User>>(`/admin/users/${id}`).then(unwrap),
  createUser: (data: Partial<User> & { password: string }) =>
    api.post<ApiResponse<User>>('/admin/users', data).then(unwrap),
  updateUser: (id: string, data: Partial<User>) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}`, data).then(unwrap),
  updateUserRole: (id: string, role: string) =>
    api.patch<ApiResponse<User>>(`/admin/users/${id}/role`, { role }).then(unwrap),
  suspendUser: (id: string) => api.post<ApiResponse<User>>(`/admin/users/${id}/suspend`, {}).then(unwrap),
  unsuspendUser: (id: string) => api.post<ApiResponse<User>>(`/admin/users/${id}/unsuspend`, {}).then(unwrap),
  unlockAccount: (id: string) => api.post<ApiResponse<null>>(`/admin/users/${id}/unlock-account`, {}).then(unwrap),
  getLockoutStatus: (id: string) =>
    api.get<ApiResponse<{ locked: boolean; retryAfterSeconds: number; remainingAttempts: number }>>(
      `/admin/users/${id}/lockout-status`
    ).then(unwrap),
  deleteUser: (id: string) => api.delete<ApiResponse<null>>(`/admin/users/${id}`).then(unwrap),

  // Subjects
  getSubjects: (params?: { search?: string; category?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<Subject[]>>(`/admin/subjects${suffix}`).then(unwrap);
  },
  createSubject: (data: Partial<Subject>) => api.post<ApiResponse<Subject>>('/admin/subjects', data).then(unwrap),
  updateSubject: (id: string, data: Partial<Subject>) =>
    api.patch<ApiResponse<Subject>>(`/admin/subjects/${id}`, data).then(unwrap),
  deleteSubject: (id: string) => api.delete<ApiResponse<null>>(`/admin/subjects/${id}`).then(unwrap),

  // Classes
  getClasses: () => api.get<ApiResponse<SchoolClass[]>>('/admin/classes').then(unwrap),
  createClass: (data: { level: string; stream: string }) =>
    api.post<ApiResponse<SchoolClass>>('/admin/classes', data).then(unwrap),
  deleteClass: (id: string) => api.delete<ApiResponse<null>>(`/admin/classes/${id}`).then(unwrap),

  // Audit logs
  getAuditLogs: (limit = 50) =>
    api.get<ApiResponse<AuditLog[]>>(`/admin/audit/logs?limit=${limit}`).then(unwrap),

  // Health
  getHealth: () => api.get<ApiResponse<unknown>>('/admin/health').then(unwrap),

  // Stats
  getStats: () =>
    api.get<ApiResponse<{ total: number; students: number; teachers: number; subjects: number; classes: number }>>('/admin/stats').then(unwrap),
};
