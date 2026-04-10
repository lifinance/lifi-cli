import { describe, it, expect, vi } from 'vitest';
import { getApiKey, maskKey } from './config.js';

describe('config', () => {
  describe('getApiKey', () => {
    it('returns LIFI_API_KEY env var when set', () => {
      vi.stubEnv('LIFI_API_KEY', 'test-key-123');
      expect(getApiKey()).toBe('test-key-123');
      vi.unstubAllEnvs();
    });

    it('returns undefined when env var is not set', () => {
      vi.stubEnv('LIFI_API_KEY', '');
      expect(getApiKey()).toBeUndefined();
      vi.unstubAllEnvs();
    });
  });

  describe('maskKey', () => {
    it('masks the middle of a key', () => {
      expect(maskKey('lk-abc123xyz')).toBe('lk-...xyz');
    });

    it('handles short keys', () => {
      expect(maskKey('abc')).toBe('***');
    });

    it('returns empty string for empty input', () => {
      expect(maskKey('')).toBe('');
    });
  });
});
