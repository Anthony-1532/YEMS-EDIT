// Generic CRUD-style resource modules mirroring backend routes.
import { api } from './client';
import type {
  Admission,
  ApiResponse,
  Assignment,
  Exam,
  LessonPlan,
  Note,
  ResultRecord,
  SchemeOfWork,
  Submission,
  User,
} from './types';

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error || res.message || 'Request failed');
  return res.data as T;
}

export const usersApi = {
  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`).then(unwrap),
};

export const examsApi = {
  getAll: (params?: { type?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<Exam[]>>(`/exams${suffix}`).then(unwrap);
  },
  getById: (id: string) => api.get<ApiResponse<Exam>>(`/exams/${id}`).then(unwrap),
  create: (data: Partial<Exam>) => api.post<ApiResponse<Exam>>('/exams', data).then(unwrap),
  update: (id: string, data: Partial<Exam>) => api.patch<ApiResponse<Exam>>(`/exams/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/exams/${id}`).then(unwrap),
  submit: (examId: string, studentId: string, answers: Record<string | number, string>) =>
    api.post<ApiResponse<any>>('/exams/submit', { examId, studentId, answers }).then(unwrap),
};

export const notesApi = {
  getAll: (params?: { search?: string; subjectId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.subjectId) qs.set('subjectId', params.subjectId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<Note[]>>(`/notes${suffix}`).then(unwrap);
  },
  create: (data: Partial<Note>) => api.post<ApiResponse<Note>>('/notes', data).then(unwrap),
  update: (id: string, data: Partial<Note>) => api.patch<ApiResponse<Note>>(`/notes/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/notes/${id}`).then(unwrap),
};

export const assignmentsApi = {
  getAll: (params?: { search?: string; subject?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.subject) qs.set('subject', params.subject);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<Assignment[]>>(`/assignments${suffix}`).then(unwrap);
  },
  create: (data: Partial<Assignment>) => api.post<ApiResponse<Assignment>>('/assignments', data).then(unwrap),
  update: (id: string, data: Partial<Assignment>) =>
    api.patch<ApiResponse<Assignment>>(`/assignments/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/assignments/${id}`).then(unwrap),
};

export const resultsApi = {
  getAll: () => api.get<ApiResponse<ResultRecord[]>>('/results').then(unwrap),
  getByStudent: (studentId: string) =>
    api.get<ApiResponse<ResultRecord[]>>(`/results/student/${studentId}`).then(unwrap),
  create: (data: Partial<ResultRecord>) => api.post<ApiResponse<ResultRecord>>('/results', data).then(unwrap),
  update: (id: string, data: Partial<ResultRecord>) =>
    api.patch<ApiResponse<ResultRecord>>(`/results/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/results/${id}`).then(unwrap),
};

export const schemesApi = {
  getAll: () => api.get<ApiResponse<SchemeOfWork[]>>('/schemes').then(unwrap),
  create: (data: Partial<SchemeOfWork>) => api.post<ApiResponse<SchemeOfWork>>('/schemes', data).then(unwrap),
  update: (id: string, data: Partial<SchemeOfWork>) =>
    api.patch<ApiResponse<SchemeOfWork>>(`/schemes/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/schemes/${id}`).then(unwrap),
};

export const lessonPlansApi = {
  getAll: () => api.get<ApiResponse<LessonPlan[]>>('/lesson-plans').then(unwrap),
  create: (data: Partial<LessonPlan>) => api.post<ApiResponse<LessonPlan>>('/lesson-plans', data).then(unwrap),
  update: (id: string, data: Partial<LessonPlan>) =>
    api.patch<ApiResponse<LessonPlan>>(`/lesson-plans/${id}`, data).then(unwrap),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/lesson-plans/${id}`).then(unwrap),
};

export const submissionsApi = {
  getAll: () => api.get<ApiResponse<Submission[]>>('/submissions').then(unwrap),
  getById: (id: string) => api.get<ApiResponse<Submission>>(`/submissions/${id}`).then(unwrap),
};

export const admissionsApi = {
  getAll: () => api.get<ApiResponse<Admission[]>>('/admissions').then(unwrap),
  getPending: () => api.get<ApiResponse<Admission[]>>('/admissions/pending').then(unwrap),
  approve: (id: string) => api.patch<ApiResponse<Admission>>(`/admissions/${id}/approve`, {}).then(unwrap),
  reject: (id: string, reason?: string) =>
    api.patch<ApiResponse<Admission>>(`/admissions/${id}/reject`, reason ? { reason } : {}).then(unwrap),
};

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt?: string;
}

export const notificationsApi = {
  getAll: () => api.get<ApiResponse<Notification[]>>('/notifications').then(unwrap),
  getUnreadCount: () => api.get<{ success: boolean; count: number }>('/notifications/unread-count'),
  markAsRead: (id: string) => api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`).then(unwrap),
  markAllAsRead: () => api.patch<ApiResponse<null>>('/notifications/read-all'),
  broadcast: (data: { type: string; title: string; message: string; targetRole: string }) =>
    api.post<ApiResponse<{ count: number }>>('/notifications/broadcast', data).then(unwrap),
  direct: (data: { type: string; title: string; message: string; toUserId: string }) =>
    api.post<ApiResponse<Notification>>('/notifications', data).then(unwrap),
};

export const teacherApi = {
  getExams: () => api.get<ApiResponse<Exam[]>>('/teacher/exams').then(unwrap),
  getMyClass: (className: string) =>
    api.get<ApiResponse<import('./types').User[]>>(`/admin/users?role=student&class=${encodeURIComponent(className)}`).then(unwrap),
};

export const accountantApi = {
  getStudents: (params?: { search?: string; role?: string; class?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.role) qs.set('role', params.role);
    if (params?.class) qs.set('class', params.class);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<User[]>>(`/accountant/students${suffix}`).then(unwrap);
  },
  getBills: (params?: { studentId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.studentId) qs.set('studentId', params.studentId);
    if (params?.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<import('./types').Bill[]>>(`/accountant/bills${suffix}`).then(unwrap);
  },
  createBill: (data: Partial<import('./types').Bill>) =>
    api.post<ApiResponse<import('./types').Bill>>('/accountant/bills', data).then(unwrap),
  updateBill: (id: string, data: Partial<import('./types').Bill>) =>
    api.patch<ApiResponse<import('./types').Bill>>(`/accountant/bills/${id}`, data).then(unwrap),
  getPayments: (params?: { studentId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.studentId) qs.set('studentId', params.studentId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return api.get<ApiResponse<import('./types').Payment[]>>(`/accountant/payments${suffix}`).then(unwrap);
  },
  createPayment: (data: Partial<import('./types').Payment>) =>
    api.post<ApiResponse<import('./types').Payment>>('/accountant/payments', data).then(unwrap),
  getSettings: () => api.get<ApiResponse<import('./types').AccountantSettings>>('/accountant/settings').then(unwrap),
  updateSettings: (data: Partial<import('./types').AccountantSettings>) =>
    api.patch<ApiResponse<import('./types').AccountantSettings>>('/accountant/settings', data).then(unwrap),
};
