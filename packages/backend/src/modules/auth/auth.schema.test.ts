import { describe, it, expect } from 'vitest';
import { registerSchema } from './auth.schema.js';

describe('auth schema', () => {
  it('accepts strong passwords during registration', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass1!',
    });

    expect(result.success).toBe(true);
  });

  it('rejects weak passwords during registration', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'weakpass',
    });

    expect(result.success).toBe(false);
  });

  it('rejects role field in public registration payload', () => {
    const result = registerSchema.safeParse({
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongPass1!',
      role: 'superadmin',
    });

    expect(result.success).toBe(false);
  });
});
