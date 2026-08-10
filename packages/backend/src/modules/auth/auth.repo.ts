import { db } from '../../config/db.js';
import { users } from '../../db/schema/users.js';
import { eq } from 'drizzle-orm';
import type { User } from '../../db/schema/users.js';

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
}): Promise<User> {
  const [user] = await db.insert(users).values({
    ...data,
    role: data.role || 'student',
  } as any).returning();
  return user;
}

export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'email' | 'password' | 'role' | 'profilePicture'>>
): Promise<User | undefined> {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}