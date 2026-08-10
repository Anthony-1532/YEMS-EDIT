import { describe, it, expect } from 'vitest';
import { updateUserSchema } from './users.schema.js';

describe('users schema', () => {
  it('rejects role updates from generic user update payloads', () => {
    const result = updateUserSchema.safeParse({
      name: 'Updated Name',
      role: 'superadmin',
    });

    expect(result.success).toBe(false);
  });
});
