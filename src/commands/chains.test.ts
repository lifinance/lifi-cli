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

describe('chain subcommand', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('looks up chain by numeric ID', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chain', '137', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.id).toBe(137);
    expect(parsed.name).toBe('Polygon');
  });

  it('looks up chain by name (case-insensitive)', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chain', 'ethereum', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.id).toBe(1);
    expect(parsed.name).toBe('Ethereum');
  });

  it('shows human-readable table for chain detail', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'chain', '1']);
    const output = consoleOutput.join('\n');
    expect(output).toContain('Ethereum');
    expect(output).toContain('ETH');
  });

  it('errors when chain not found', async () => {
    mockedApi.get.mockResolvedValue({ data: CHAINS_FIXTURE });
    const program = createProgram();
    let errorOutput = '';
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      errorOutput += args.join(' ');
    });
    // handleError calls process.exit, so mock it
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    await program.parseAsync(['node', 'test', 'chain', 'nonexistent']);
    expect(errorOutput).toContain('not found');
    exitSpy.mockRestore();
  });
});
