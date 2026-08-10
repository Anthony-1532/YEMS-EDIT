import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function hashPassword(password: string): Promise<string> {
  return import('bcryptjs').then((bcrypt) => bcrypt.hash(password, 10));
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return import('bcryptjs').then((bcrypt) => bcrypt.compare(password, hash));
}

export function createTokenPayload(user: { id: string; email: string; name: string; role: string }) {
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}