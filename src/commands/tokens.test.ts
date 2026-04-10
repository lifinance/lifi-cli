import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerTokensCommand } from './tokens.js';

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

const TOKENS_FIXTURE = {
  tokens: {
    '1': [
      { chainId: 1, address: '0xa0b8...', symbol: 'USDC', name: 'USD Coin', decimals: 6, priceUSD: '1.00' },
      { chainId: 1, address: '0xdac1...', symbol: 'USDT', name: 'Tether USD', decimals: 6, priceUSD: '1.00' },
      { chainId: 1, address: '0xc02a...', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18, priceUSD: '2200.00' },
    ],
  },
};

const TOKEN_DETAIL_FIXTURE = {
  address: '0xa0b8...',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  chainId: 1,
  priceUSD: '1.00',
};

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerTokensCommand(program);
  return program;
}

describe('tokens command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('fetches tokens with --chain filter', async () => {
    mockedApi.get.mockResolvedValue({ data: TOKENS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'tokens', '--chain', '1', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/tokens', expect.objectContaining({
      params: { chains: '1' },
    }));
  });

  it('filters by --min-price', async () => {
    mockedApi.get.mockResolvedValue({ data: TOKENS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'tokens', '--chain', '1', '--min-price', '100', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    const allTokens: any[] = [];
    for (const chainId of Object.keys(parsed.tokens)) {
      allTokens.push(...parsed.tokens[chainId]);
    }
    expect(allTokens.every((t: any) => Number(t.priceUSD) >= 100)).toBe(true);
    expect(allTokens.length).toBe(1); // only WETH at $2200
  });

  it('outputs JSON when --json flag is set', async () => {
    mockedApi.get.mockResolvedValue({ data: TOKENS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'tokens', '--chain', '1', '--json']);
    const parsed = JSON.parse(consoleOutput.join(''));
    expect(parsed.tokens).toBeDefined();
  });
});

describe('token subcommand', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('fetches a specific token by chain and symbol', async () => {
    mockedApi.get.mockResolvedValue({ data: TOKEN_DETAIL_FIXTURE });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'token', '1', 'USDC', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/token', expect.objectContaining({
      params: expect.objectContaining({ chain: '1', token: 'USDC' }),
    }));
  });
});
