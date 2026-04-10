import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerAllowanceCommand } from './allowance.js';

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

import { api } from '../core/http-client.js';

const mockedApi = vi.mocked(api);

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerAllowanceCommand(program);
  return program;
}

describe('allowance command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('calls /approval with correct params', async () => {
    mockedApi.get.mockResolvedValue({ data: { allowance: '1000000' } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'allowance', '1', 'USDC', '0xd8dA', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/approval', expect.objectContaining({
      params: expect.objectContaining({ chain: '1', token: 'USDC', address: '0xd8dA' }),
    }));
  });

  it('outputs JSON when --json flag is set', async () => {
    mockedApi.get.mockResolvedValue({ data: { allowance: '1000000' } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'allowance', '1', 'USDC', '0xd8dA', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.allowance).toBe('1000000');
  });
});
