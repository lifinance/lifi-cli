import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerGasCommand(program: Command): void {
  program
    .command('gas [chain]')
    .description('Get gas prices and suggestions')
    .action(async (chain, _options, command) => {
      const opts = command.optsWithGlobals();
      try {
        if (chain) {
          const { data } = await withSpinner(`Fetching gas for chain ${chain}...`, () =>
            api.get(`/gas/suggestion/${chain}`),
          );
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            const rec = data.recommended || {};
            const rows = [
              ['Token', rec.token?.symbol || 'N/A'],
              ['Recommended cost', rec.amountUsd ? `$${rec.amountUsd}` : 'N/A'],
              ['Available', data.available ? 'Yes' : 'No'],
            ];
            console.log(formatTable(['Field', 'Value'], rows));
          }
        } else {
          const { data } = await withSpinner('Fetching gas prices...', () =>
            api.get('/gas/prices'),
          );
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            console.log(jsonOutput(data));
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
