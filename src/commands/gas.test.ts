import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerGasCommand } from './gas.js';

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
  registerGasCommand(program);
  return program;
}

describe('gas command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('calls /gas/prices when no chain specified', async () => {
    mockedApi.get.mockResolvedValue({ data: { prices: {} } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'gas', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/gas/prices');
  });

  it('calls /gas/suggestion/<chain> when chain specified', async () => {
    mockedApi.get.mockResolvedValue({ data: { suggestion: {} } });
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'gas', '1', '--json']);
    expect(mockedApi.get).toHaveBeenCalledWith('/gas/suggestion/1');
  });
});
