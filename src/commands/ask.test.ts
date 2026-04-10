import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import { registerAskCommand } from './ask.js';

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option('--json', 'Output raw JSON');
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerAskCommand(program);
  return program;
}

describe('ask command', () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  it('prints the question back', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'ask', 'What', 'is', 'the', 'cheapest', 'bridge?']);
    expect(consoleOutput.some(l => l.includes('What is the cheapest bridge?'))).toBe(true);
  });

  it('prints experimental notice', async () => {
    const program = createProgram();
    await program.parseAsync(['node', 'test', 'ask', 'test question']);
    expect(consoleOutput.some(l => l.includes('Experimental'))).toBe(true);
  });
});
