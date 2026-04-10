import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerBalanceCommand } from './balance.js';

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
  registerBalanceCommand(program);
  return program;
}

describe('balance command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('fetches balance for chain and address', async () => {
    mockedApi.get.mockResolvedValue({ data: { amount: '1500000000000000000', decimals: 18, symbol: 'ETH' } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'balance', '1', '0xd8dA', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/token/balance/1/0xd8dA', expect.any(Object));
  });

  it('outputs JSON when --json flag is set', async () => {
    mockedApi.get.mockResolvedValue({ data: { amount: '1500000000000000000', decimals: 18, symbol: 'ETH' } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'balance', '1', '0xd8dA', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.amount).toBe('1500000000000000000');
  });
});
