import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq, ilike, or, and } from 'drizzle-orm';
import type { User } from '../../db/schema/users.js';
import { ConflictError } from '../../shared/errors/app-error.js';

function rethrowDbError(err: unknown): never {
  const msg = (err as any)?.message ?? '';
  if (msg.includes('duplicate key') || msg.includes('unique constraint') || (err as any)?.code === '23505') {
    if (msg.includes('email')) throw new ConflictError('A user with that email already exists');
    throw new ConflictError('A duplicate value violates a unique constraint');
  }
  throw err;
}

export async function findAll_users(filters?: {
  search?: string;
  role?: string;
  class?: string;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  const conditions = [];

  if (filters?.search) {
    conditions.push(or(ilike(users.name, `%${filters.search}%`), ilike(users.email, `%${filters.search}%`)));
  }

  if (filters?.role) {
    conditions.push(eq(users.role, filters.role as any));
  }

  if (filters?.class) {
    conditions.push(eq(users.class, filters.class));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(users)
    .where(where)
    .limit(filters?.limit || 10000)
    .offset(filters?.offset || 0);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function findUserById(id: string): Promise<User | undefined> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(data: {
  id: string;
  name: string;
  email: string;
  password: string;
  role?: User['role'];
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
  classTeacherOf?: string;
  initials?: string;
}): Promise<User> {
  try {
    const values = { ...data } as any;
    if (Array.isArray(values.assignedSubjects)) {
      values.assignedSubjects = JSON.stringify(values.assignedSubjects);
    }
    if (Array.isArray(values.assignedClasses)) {
      values.assignedClasses = JSON.stringify(values.assignedClasses);
    }
    const [user] = await db.insert(users).values(values).returning();
    return user;
  } catch (err) {
    rethrowDbError(err);
  }
}

export async function updateUser(
  id: string,
  data: Partial<
    Pick<
      User,
      | 'name'
      | 'password'
      | 'role'
      | 'email'
      | 'studentId'
      | 'teacherId'
      | 'adminId'
      | 'class'
      | 'session'
      | 'term'
      | 'sex'
      | 'admissionNo'
      | 'assignedSubjects'
      | 'assignedClasses'
      | 'isClassTeacher'
      | 'classTeacherOf'
      | 'initials'
    >
  >
): Promise<User | undefined> {
  try {
    const serialized = { ...data, updatedAt: new Date() };
    if (Array.isArray(serialized.assignedSubjects)) {
      serialized.assignedSubjects = JSON.stringify(serialized.assignedSubjects) as any;
    }
    if (Array.isArray(serialized.assignedClasses)) {
      serialized.assignedClasses = JSON.stringify(serialized.assignedClasses) as any;
    }
    const [user] = await db
      .update(users)
      .set(serialized)
      .where(eq(users.id, id))
      .returning();
    return user;
  } catch (err) {
    rethrowDbError(err);
  }
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
