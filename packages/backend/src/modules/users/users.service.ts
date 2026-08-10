import { hashPassword } from '../../shared/utils/auth.utils.js';
import { generateId } from '../../shared/utils/auth.utils.js';
import * as usersRepo from './users.repo.js';
import type { User } from '../../db/schema/users.js';
import { BadRequestError } from '../../shared/errors/app-error.js';
import { passwordPolicySchema } from '../../shared/validators/password.validator.js';

type UserRole = User['role'];

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    const result = [...new Set(value.flatMap((v) => normalizeStringArray(v)))];
    return result;
  }
  if (typeof value !== 'string') return [];

  let current = value.trim();

  // Recursively unwrap escaped/JSON-encoded strings (max 5 iterations to prevent infinite loop)
  for (let i = 0; i < 5; i++) {
    // Strip surrounding quotes if present
    if ((current.startsWith('"') && current.endsWith('"')) || (current.startsWith("'") && current.endsWith("'"))) {
      try {
        const unquoted = JSON.parse(current);
        if (typeof unquoted === 'string') {
          current = unquoted;
          continue;
        }
      } catch {
        // Not valid JSON with quotes — just strip the outer quotes
        current = current.slice(1, -1);
        continue;
      }
    }

    // Try parsing as JSON array
    try {
      const parsed = JSON.parse(current);
      if (Array.isArray(parsed)) {
        return parsed.filter((v: unknown): v is string => typeof v === 'string');
      }
      if (typeof parsed === 'string') {
        current = parsed;
        continue;
      }
    } catch {
      // Not JSON — fall through
    }

    break;
  }

  // Final fallback: treat as comma-separated or single value
  if (current.startsWith('{') && current.endsWith('}')) {
    // PostgreSQL array format {a,b,c}
    current = current.slice(1, -1);
  }

  const parts = current.split(',').map((s: string) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  return parts.length > 0 ? parts : [];
}

export async function getAllUsers(
  filters?: { search?: string; role?: string; class?: string; limit?: number; offset?: number },
  excludePassword = true
): Promise<Omit<User, 'password'>[]> {
  const users = await usersRepo.findAll_users(filters);
  const processed = users.map(u => {
    const assignedSubjects = normalizeStringArray(u.assignedSubjects);
    const assignedClasses = normalizeStringArray(u.assignedClasses);
    // Return user with normalized arrays
    const user = {
      ...u,
      assignedSubjects,
      assignedClasses,
    };
    if (excludePassword) {
      const { password: _password, ...rest } = user;
      return rest;
    }
    return user;
  });
  return processed;
}

function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password: _password, ...rest } = user;
  return {
    ...rest,
    assignedSubjects: normalizeStringArray(rest.assignedSubjects),
    assignedClasses: normalizeStringArray(rest.assignedClasses),
  } as Omit<User, 'password'>;
}

export async function getUserById(id: string): Promise<Omit<User, 'password'> | null> {
  const user = await usersRepo.findUserById(id);
  if (!user) return null;
  return sanitizeUser(user);
}

export async function getUserByEmail(email: string): Promise<Omit<User, 'password'> | null> {
  const user = await usersRepo.findUserByEmail(email);
  if (!user) return null;
  return sanitizeUser(user);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  studentId?: string;
  class?: string;
  sex?: string;
  admissionNo?: string;
  session?: string;
  term?: string;
  teacherId?: string;
  assignedSubjects?: string[];
  assignedClasses?: string[];
  isClassTeacher?: boolean;
  classTeacherOf?: string;
  initials?: string;
}): Promise<Omit<User, 'password'>> {
  const passwordValidation = passwordPolicySchema.safeParse(data.password);
  if (!passwordValidation.success) {
    throw new BadRequestError(passwordValidation.error.issues[0]?.message || 'Invalid password');
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await usersRepo.createUser({
    id: generateId(),
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: (data.role || 'student') as User['role'],
    studentId: data.studentId,
    class: data.class,
    sex: data.sex,
    admissionNo: data.admissionNo,
    session: data.session,
    term: data.term,
    teacherId: data.teacherId,
    assignedSubjects: data.assignedSubjects,
    assignedClasses: data.assignedClasses,
    isClassTeacher: data.isClassTeacher,
    classTeacherOf: data.classTeacherOf,
    initials: data.initials,
  });
  return sanitizeUser(user);
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    studentId?: string;
    teacherId?: string;
    adminId?: string;
    class?: string;
    session?: string;
    term?: string;
    sex?: string;
    admissionNo?: string;
    assignedSubjects?: string[];
    assignedClasses?: string[];
    isClassTeacher?: boolean;
    classTeacherOf?: string | null;
    initials?: string;
  }
): Promise<Omit<User, 'password'> | null> {
  const updateData: {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    studentId?: string;
    teacherId?: string;
    adminId?: string;
    class?: string;
    session?: string;
    term?: string;
    sex?: string;
    admissionNo?: string;
    assignedSubjects?: string[];
    assignedClasses?: string[];
    isClassTeacher?: boolean;
    classTeacherOf?: string | null;
    initials?: string;
  } = {};
  if (data.password) {
    const passwordValidation = passwordPolicySchema.safeParse(data.password);
    if (!passwordValidation.success) {
      throw new BadRequestError(passwordValidation.error.issues[0]?.message || 'Invalid password');
    }
    updateData.password = await hashPassword(data.password);
  }
  if (data.name) updateData.name = data.name;
  if (typeof data.email === 'string') updateData.email = data.email;
  if (data.role) updateData.role = data.role as User['role'];
  if (typeof data.studentId === 'string') updateData.studentId = data.studentId;
  if (typeof data.teacherId === 'string') updateData.teacherId = data.teacherId;
  if (typeof data.adminId === 'string') updateData.adminId = data.adminId;
  if (typeof data.class === 'string') updateData.class = data.class;
  if (typeof data.session === 'string') updateData.session = data.session;
  if (typeof data.term === 'string') updateData.term = data.term;
  if (typeof data.sex === 'string') updateData.sex = data.sex;
  if (typeof data.admissionNo === 'string') updateData.admissionNo = data.admissionNo;
  if (Array.isArray(data.assignedSubjects)) updateData.assignedSubjects = data.assignedSubjects;
  if (Array.isArray(data.assignedClasses)) updateData.assignedClasses = data.assignedClasses;
  if (typeof data.isClassTeacher === 'boolean') updateData.isClassTeacher = data.isClassTeacher;
  if (Object.prototype.hasOwnProperty.call(data, 'classTeacherOf')) {
    updateData.classTeacherOf = data.classTeacherOf;
  }
  if (typeof data.initials === 'string') updateData.initials = data.initials;

  const user = await usersRepo.updateUser(id, updateData);
  if (!user) return null;
  return sanitizeUser(user);
}

export async function deleteUser(id: string): Promise<boolean> {
  await usersRepo.deleteUser(id);
  return true;
}
