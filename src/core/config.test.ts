import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadConfig, saveConfig, getApiKey, getConfigPath, maskKey } from './config.js';
import { CliError } from './errors.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifi-cli-test-'));
    vi.stubEnv('XDG_CONFIG_HOME', tmpDir);
    vi.stubEnv('LIFI_API_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadConfig', () => {
    it('returns empty object when no config file exists', () => {
      const config = loadConfig();
      expect(config).toEqual({});
    });

    it('parses JSON from config file', () => {
      const configDir = path.join(tmpDir, 'lifi');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify({ apiKey: 'test-key-123' }),
      );
      const config = loadConfig();
      expect(config.apiKey).toBe('test-key-123');
    });

    it('throws CliError on corrupt JSON', () => {
      const configDir = path.join(tmpDir, 'lifi');
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(path.join(configDir, 'config.json'), '{broken json');
      expect(() => loadConfig()).toThrow(CliError);
    });
  });

  describe('saveConfig', () => {
    it('creates parent directory and writes config', () => {
      saveConfig({ apiKey: 'my-key' });
      const configPath = getConfigPath();
      expect(fs.existsSync(configPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(content.apiKey).toBe('my-key');
    });

    it('sets file permissions to 0o600', () => {
      saveConfig({ apiKey: 'secret' });
      const configPath = getConfigPath();
      const stats = fs.statSync(configPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);
    });

    it('merges with existing config', () => {
      saveConfig({ apiKey: 'first' });
      saveConfig({ apiKey: 'second' });
      const config = loadConfig();
      expect(config.apiKey).toBe('second');
    });
  });

  describe('getApiKey', () => {
    it('returns env var when LIFI_API_KEY is set', () => {
      vi.stubEnv('LIFI_API_KEY', 'env-key-456');
      expect(getApiKey()).toBe('env-key-456');
    });

    it('returns config file key when env var is not set', () => {
      vi.stubEnv('LIFI_API_KEY', '');
      saveConfig({ apiKey: 'file-key-789' });
      expect(getApiKey()).toBe('file-key-789');
    });

    it('returns undefined when no key is set anywhere', () => {
      vi.stubEnv('LIFI_API_KEY', '');
      expect(getApiKey()).toBeUndefined();
    });

    it('env var takes priority over config file', () => {
      vi.stubEnv('LIFI_API_KEY', 'env-key');
      saveConfig({ apiKey: 'file-key' });
      expect(getApiKey()).toBe('env-key');
    });
  });

  describe('getConfigPath', () => {
    it('uses XDG_CONFIG_HOME when set', () => {
      vi.stubEnv('XDG_CONFIG_HOME', '/custom/config');
      const p = getConfigPath();
      expect(p).toBe(path.join('/custom/config', 'lifi', 'config.json'));
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
