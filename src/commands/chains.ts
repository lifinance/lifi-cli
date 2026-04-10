import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerChainsCommand(program: Command): void {
  program
    .command('chains')
    .description('List all supported chains')
    .option('--type <type>', 'Filter by chain type (EVM, SVM, ...)')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching chains...', () => api.get('/chains'));

        let chains = data.chains || data;
        if (options.type) {
          chains = chains.filter((c: any) => c.chainType === options.type);
        }

        if (isJsonMode(opts)) {
          console.log(jsonOutput({ chains }));
        } else {
          const rows = chains.map((c: any) => [
            String(c.id),
            c.name,
            c.chainType,
            c.nativeToken?.symbol || '-',
          ]);
          console.log(formatTable(['ID', 'Name', 'Type', 'Native Token'], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
