import { vi } from 'vitest';

export const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
};

export const resetDbMock = () => {
  Object.keys(mockDb).forEach(key => {
    if (typeof mockDb[key as keyof typeof mockDb] === 'function') {
      vi.mocked(mockDb[key as keyof typeof mockDb]).mockReset();
    }
  });
};

export const mockSelectResult = <T>(data: T[]) => {
  return vi.fn().mockImplementation(() => ({
    where: () => ({
      orderBy: () => ({
        limit: () => ({
          offset: () => Promise.resolve(data),
        }),
      }),
    }),
    orderBy: () => ({
      limit: () => ({
        offset: () => Promise.resolve(data),
      }),
    }),
    limit: () => ({
      offset: () => Promise.resolve(data),
    }),
  }));
};