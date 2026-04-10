import { describe, it, expect, vi } from 'vitest';
import { withSpinner } from './interactive.js';

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

describe('interactive', () => {
  describe('withSpinner', () => {
    it('executes the async function and returns its result', async () => {
      const result = await withSpinner('Loading...', async () => 42);
      expect(result).toBe(42);
    });

    it('propagates errors from the async function', async () => {
      await expect(
        withSpinner('Loading...', async () => {
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
    });
  });
});
