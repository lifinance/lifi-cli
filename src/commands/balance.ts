import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatAmount } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerBalanceCommand(program: Command): void {
  program
    .command('balance <chain> <address>')
    .description('Check token balance for a wallet')
    .option('--token <token>', 'Token address (omit for native)')
    .action(async (chain, address, options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching balance...', () =>
          api.get(`/token/balance/${chain}/${address}`, { params: options.token ? { token: options.token } : {} }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const amount = data.amount || data.balance || '0';
          const decimals = data.decimals || 18;
          const symbol = data.symbol || '';
          console.log(`Balance: ${formatAmount(amount, decimals)} ${symbol}`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
