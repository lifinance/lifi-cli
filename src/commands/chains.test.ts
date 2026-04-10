import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerChainsCommand } from './chains.js';

vi.mock('../core/http-client.js', () => ({
  api: {
    get: vi.fn(),
  },
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

const CHAINS_FIXTURE = {
  chains: [
    { id: 1, name: 'Ethereum', chainType: 'EVM', nativeToken: { symbol: 'ETH' } },
    { id: 137, name: 'Polygon', chainType: 'EVM', nativeToken: { symbol: 'MATIC' } },
    { id: 501, name: 'Solana', chainType: 'SVM', nativeToken: { symbol: 'SOL' } },
  ],
};

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  registerChainsCommand(program);
  return program;
}

describe('chains command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('fetches and displays chains', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chains', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/chains');
    expect(consoleOutput.length).toBeGreaterThan(0);
  });

  it('outputs JSON when --json flag is set', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chains', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.chains).toBeDefined();
  });

  it('filters by --type flag', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chains', '--type', 'EVM', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.chains.every((c: any) => c.chainType === 'EVM')).toBe(true);
  });
});
