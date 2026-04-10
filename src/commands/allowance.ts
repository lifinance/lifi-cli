import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerAllowanceCommand(program: Command): void {
  program
    .command('allowance <chain> <token> <address>')
    .description('Check token approval/allowance status')
    .action(async (chain, token, address, _options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Checking allowance...', () =>
          api.get('/approval', {
            params: { chain, token, address },
          }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          console.log(jsonOutput(data));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
