import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerAuthCommand } from './auth.js';

vi.mock('../core/http-client.js', () => ({
  api: { get: vi.fn() },
}));

vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('../core/config.js', () => ({
  saveConfig: vi.fn(),
  getConfigPath: vi.fn().mockReturnValue('/tmp/test/.lifi/config.json'),
  getApiKey: vi.fn(),
  maskKey: vi.fn((key: string) => `${key.slice(0, 3)}...${key.slice(-3)}`),
}));

import { api } from '../core/http-client.js';
import { saveConfig, getApiKey, maskKey } from '../core/config.js';

const mockedApi = vi.mocked(api);
const mockedSaveConfig = vi.mocked(saveConfig);
const mockedGetApiKey = vi.mocked(getApiKey);

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerAuthCommand(program);
  return program;
}

describe('auth command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  describe('auth set', () => {
    it('saves the API key to config', async () => {
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'set', 'my-api-key-123']);
      expect(mockedSaveConfig).toHaveBeenCalledWith({ apiKey: 'my-api-key-123' });
    });

    it('prints confirmation message', async () => {
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'set', 'my-api-key-123']);
      expect(consoleOutput.some(l => l.includes('API key saved'))).toBe(true);
    });
  });

  describe('auth show', () => {
    it('prints masked key when key exists', async () => {
      mockedGetApiKey.mockReturnValue('test-key-12345');
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'show']);
      expect(consoleOutput.some(l => l.includes('tes...345'))).toBe(true);
    });

    it('prints no key message when no key set', async () => {
      mockedGetApiKey.mockReturnValue(undefined);
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'show']);
      expect(consoleOutput.some(l => l.includes('No API key'))).toBe(true);
    });
  });

  describe('auth test', () => {
    it('calls /keys/test endpoint', async () => {
      mockedApi.get.mockResolvedValue({ data: { valid: true } });
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'test']);
      expect(mockedApi.get).toHaveBeenCalledWith('/keys/test');
    });

    it('prints success message on valid key', async () => {
      mockedApi.get.mockResolvedValue({ data: { valid: true } });
      const program = createProgram();
      await program.parseAsync(['node', 'test', 'auth', 'test']);
      expect(consoleOutput.some(l => l.includes('valid'))).toBe(true);
    });
  });
});
