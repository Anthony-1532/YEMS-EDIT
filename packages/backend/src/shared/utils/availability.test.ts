import { describe, expect, it } from 'vitest';
import { isResourceAvailable } from './availability.js';

describe('isResourceAvailable', () => {
  it('returns true when no availability date is set', () => {
    expect(isResourceAvailable(undefined, new Date('2026-01-01T10:00:00Z'))).toBe(true);
  });

  it('returns true when the current time is after the start time', () => {
    expect(isResourceAvailable('2026-01-01T09:00:00Z', new Date('2026-01-01T10:00:00Z'))).toBe(true);
  });

  it('returns false when the current time is before the start time', () => {
    expect(isResourceAvailable('2026-01-01T11:00:00Z', new Date('2026-01-01T10:00:00Z'))).toBe(false);
  });
});
