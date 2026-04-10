import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
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
            console.log(jsonOutput(data));
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
