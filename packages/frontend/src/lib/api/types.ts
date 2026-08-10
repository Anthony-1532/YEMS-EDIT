// Shared types mirroring the YEMS backend schemas

export type Role =
  | 'student'
  | 'teacher'
  | 'admin'
  | 'superadmin'
  | 'accountant'
  | 'technician'
  | 'principal'
  | 'hod'
  | 'parent';

export interface User {
  id: string;
  name: string;
  initials?: string | null;
  email: string;
  role: Role;
  studentId?: string | null;
  teacherId?: string | null;
  adminId?: string | null;
  accountantId?: string | null;
  class?: string | null;
  session?: string | null;
  term?: string | null;
  sex?: string | null;
  admissionNo?: string | null;
  assignedSubjects?: string[] | null;
  assignedClasses?: string[] | null;
  isClassTeacher?: boolean | null;
  classTeacherOf?: string | null;
  emailVerified?: boolean | null;
  isSuspended?: boolean | null;
  profilePicture?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  category: string;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchoolClass {
  id: string;
  level: string;
  stream: string;
  displayName: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  status: string;
  actorId: string;
  details?: unknown;
  user: string;
}

export interface Admission {
  id: string;
  name?: string;
  email?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  [key: string]: unknown;
}

export interface Exam {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  subjectId?: string | null;
  type?: string;
  format?: string;
  category?: string;
  status?: string;
  duration?: number;
  startTime?: string | null;
  availableFrom?: string | null;
  createdBy?: string;
  class?: string | null;
  [key: string]: unknown;
}

export interface Note {
  id: string;
  title: string;
  content?: string | null;
  subject?: string | null;
  subjectId?: string | null;
  class?: string | null;
  week?: number | string | null;
  date?: string | null;
  availableFrom?: string | null;
  fileData?: string | null;
  fileName?: string | null;
  createdBy?: string;
  [key: string]: unknown;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  dueDate?: string | null;
  availableFrom?: string | null;
  status?: string;
  class?: string | null;
  createdBy?: string;
  [key: string]: unknown;
}

export interface Submission {
  id: string;
  examId?: string | null;
  studentId?: string | null;
  studentName?: string | null;
  studentClass?: string | null;
  answers?: Record<string, unknown> | null;
  score?: number | null;
  totalScore?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
}

export interface ResultRecord {
  id: string;
  studentId: string;
  studentName?: string;
  examId?: string | null;
  examTitle?: string | null;
  subject: string;
  score: number;
  totalScore: number;
  grade?: string | null;
  remarks?: string | null;
  class?: string | null;
  session?: string | null;
  term?: string | null;
  date?: string | null;
}

export interface SchemeOfWork {
  id: string;
  subject: string;
  class?: string | null;
  term?: string | null;
  week?: number | string | null;
  topic?: string;
  content?: string;
  createdBy?: string;
  [key: string]: unknown;
}

export interface LessonPlan {
  id: string;
  subject: string;
  class?: string | null;
  term?: string | null;
  week?: number | string | null;
  topic?: string;
  objectives?: string | null;
  materials?: string | null;
  createdBy?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: { limit: number; offset: number; total: number };
}

export interface Bill {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  amount: number;
  description: string;
  dueDate: string | null;
  status: 'pending' | 'paid' | 'overdue' | string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  billId: string | null;
  studentId: string;
  studentName: string;
  class: string;
  amount: number;
  paymentMethod: string | null;
  reference: string | null;
  status: string;
  paidAt?: string;
}

export interface AccountantSettings {
  id: string;
  feeAmount: number;
  threshold30: number;
  threshold70: number;
  schoolEmail: string;
  emailSubject: string;
  accountNumber: string;
}
