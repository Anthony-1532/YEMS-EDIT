import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { db } from '../../config/db.js';
import { refreshTokens } from '../../db/schema/refresh-tokens.js';
import { eq, and, gt } from 'drizzle-orm';
import type { User } from '../../db/schema/users.js';
import { comparePassword, hashPassword } from '../../shared/utils/auth.utils.js';
import { generateId } from '../../shared/utils/auth.utils.js';
import type { TokenPair } from '../../shared/types/auth.js';
import * as authRepo from './auth.repo.js';
import { enqueueWelcomeEmailJob } from '../email/email.queue.js';
import { UnauthorizedError, ConflictError, BadRequestError } from '../../shared/errors/app-error.js';
import { clearFailedLoginAttempts, getLockoutStatus, registerFailedLoginAttempt } from './auth.lockout.js';
import { passwordPolicySchema } from '../../shared/validators/password.validator.js';

type UserWithoutPassword = Omit<User, 'password'>;

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return value.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function sanitizeUser(user: User): UserWithoutPassword {
  const { password: _password, ...rest } = user;
  return {
    ...rest,
    assignedSubjects: parseStringArray(rest.assignedSubjects),
    assignedClasses: parseStringArray(rest.assignedClasses),
  } as UserWithoutPassword;
}

export async function login(email: string, password: string, _clientIp?: string): Promise<{ user: UserWithoutPassword; tokens: TokenPair }> {
  const lockoutStatus = await getLockoutStatus(email);
  if (lockoutStatus.locked) {
    throw new UnauthorizedError(
      `Account temporarily locked. Try again in ${lockoutStatus.retryAfterSeconds} seconds.`
    );
  }

  const user = await authRepo.findUserByEmail(email);
  if (!user) {
    await registerFailedLoginAttempt(email);
    throw new UnauthorizedError('Invalid credentials');
  }

  const validPassword = await comparePassword(password, user.password);
  if (!validPassword) {
    const failedAttempt = await registerFailedLoginAttempt(email);
    if (failedAttempt.locked) {
      throw new UnauthorizedError(
        `Account temporarily locked. Try again in ${failedAttempt.retryAfterSeconds} seconds.`
      );
    }
    throw new UnauthorizedError('Invalid credentials');
  }

  await clearFailedLoginAttempts(email);
  const tokens = await generateTokens(user);
  return { user: sanitizeUser(user), tokens };
}

export async function register(data: {
  name: string;
  email: string;
  password: string;
}): Promise<{ user: UserWithoutPassword; tokens: TokenPair }> {
  const existing = await authRepo.findUserByEmail(data.email);
  if (existing) {
    throw new ConflictError('Email already exists');
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await authRepo.createUser({
    id: generateId(),
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: 'student',
  });
  await enqueueWelcomeEmailJob({ to: user.email, name: user.name });

  const tokens = await generateTokens(user);
  return { user: sanitizeUser(user), tokens };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const [stored] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.token, refreshToken), eq(refreshTokens.revoked, false), gt(refreshTokens.expiresAt, new Date())))
    .limit(1);

  if (!stored) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await authRepo.findUserById(stored.userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Revoke the old token
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.token, refreshToken));

  return generateTokens(user);
}

export async function logout(userId: string): Promise<void> {
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.userId, userId));
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  const valid = await comparePassword(oldPassword, user.password);
  if (!valid) {
    throw new BadRequestError('Current password is incorrect');
  }

  // Enforce the same password policy as admin-side user management
  // (min 8 chars + upper/lower/number/special) rather than a weaker inline rule.
  const passwordValidation = passwordPolicySchema.safeParse(newPassword);
  if (!passwordValidation.success) {
    throw new BadRequestError(passwordValidation.error.issues[0]?.message || 'Invalid password');
  }

  const hashed = await hashPassword(newPassword);
  await authRepo.updateUser(userId, { password: hashed });
}

export async function updateProfile(userId: string, data: { name?: string; email?: string; profilePicture?: string }): Promise<Omit<User, 'password'>> {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw new BadRequestError('User not found');
  }

  if (data.email) {
    const existing = await authRepo.findUserByEmail(data.email);
    if (existing && existing.id !== userId) {
      throw new BadRequestError('Email is already taken by another account');
    }
  }

  const updated = await authRepo.updateUser(userId, {
    name: data.name,
    email: data.email,
    profilePicture: data.profilePicture,
  });

  if (!updated) {
    throw new BadRequestError('Failed to update profile');
  }

  return sanitizeUser(updated);
}

async function generateTokens(user: User): Promise<TokenPair> {
  const sessionId = generateId();
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, sessionId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokens).values({
    id: sessionId,
    userId: user.id,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
}