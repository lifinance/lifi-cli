import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerQuoteCommand } from './quote.js';

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

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
}));

import { api } from '../core/http-client.js';
import { input } from '@inquirer/prompts';

const mockedApi = vi.mocked(api);
const mockedInput = vi.mocked(input);

const QUOTE_FIXTURE = {
  tool: 'stargate',
  toolDetails: { name: 'Stargate' },
  action: {
    fromToken: { symbol: 'USDC' },
    toToken: { symbol: 'USDC' },
  },
  estimate: {
    toAmount: '999420000',
    toAmountDecimals: 6,
    executionDuration: 120,
    gasCosts: [{ amountUSD: '1.24' }],
  },
};

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerQuoteCommand(program);
  return program;
}

describe('quote command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('calls /quote with correct params', async () => {
    mockedApi.get.mockResolvedValue({ data: QUOTE_FIXTURE });
    const program = createProgram();
    await program.parseAsync([
      'node', 'test', 'quote',
      '--from', '1', '--to', '42161',
      '--from-token', 'USDC', '--to-token', 'USDC',
      '--amount', '1000000000', '--from-address', '0xabc',
      '--json',
    ]);
    expect(mockedApi.get).toHaveBeenCalledWith('/quote', expect.objectContaining({
      params: expect.objectContaining({
        fromChain: '1',
        toChain: '42161',
        fromToken: 'USDC',
        toToken: 'USDC',
      }),
    }));
  });

  it('prompts for missing flags in interactive mode', async () => {
    mockedInput
      .mockResolvedValueOnce('1')           // from chain
      .mockResolvedValueOnce('42161')       // to chain
      .mockResolvedValueOnce('USDC')        // from token
      .mockResolvedValueOnce('USDC')        // to token
      .mockResolvedValueOnce('1000000000')  // amount
      .mockResolvedValueOnce('0xabc');      // address
    mockedApi.get.mockResolvedValue({ data: QUOTE_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'quote', '--json']);
    expect(mockedInput).toHaveBeenCalledTimes(6);
    expect(mockedApi.get).toHaveBeenCalledWith('/quote', expect.objectContaining({
      params: expect.objectContaining({
        fromChain: '1',
        toChain: '42161',
      }),
    }));
  });

  it('outputs JSON when --json flag is set', async () => {
    mockedApi.get.mockResolvedValue({ data: QUOTE_FIXTURE });
    const program = createProgram();
    await program.parseAsync([
      'node', 'test', 'quote',
      '--from', '1', '--to', '42161',
      '--from-token', 'USDC', '--to-token', 'USDC',
      '--amount', '1000000000',
      '--json',
    ]);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.tool).toBe('stargate');
  });
});
