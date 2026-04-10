import { Command } from 'commander';
import { handleError } from '../core/errors.js';
import { registerAuthCommand } from '../commands/auth.js';
import { registerChainsCommand } from '../commands/chains.js';
import { registerTokensCommand } from '../commands/tokens.js';
import { registerQuoteCommand } from '../commands/quote.js';
import { registerRoutesCommand } from '../commands/routes.js';
import { registerStatusCommand } from '../commands/status.js';
import { registerConnectionsCommand } from '../commands/connections.js';
import { registerToolsCommand } from '../commands/tools.js';
import { registerGasCommand } from '../commands/gas.js';
import { registerBalanceCommand } from '../commands/balance.js';
import { registerAllowanceCommand } from '../commands/allowance.js';
import { registerAskCommand } from '../commands/ask.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('lifi')
    .description('CLI for the LI.FI cross-chain bridge & DEX aggregation API')
    .version('0.1.0')
    .option('--json', 'Output raw JSON instead of formatted tables')
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Show verbose output including full API responses');

  registerAuthCommand(program);
  registerChainsCommand(program);
  registerTokensCommand(program);
  registerQuoteCommand(program);
  registerRoutesCommand(program);
  registerStatusCommand(program);
  registerConnectionsCommand(program);
  registerToolsCommand(program);
  registerGasCommand(program);
  registerBalanceCommand(program);
  registerAllowanceCommand(program);
  registerAskCommand(program);

  return program;
}

if (process.env.VITEST === undefined) {
  const program = createProgram();
  program.parseAsync(process.argv).catch(handleError);
}
