import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerToolsCommand(program: Command): void {
  program
    .command('tools')
    .description('List available bridges and DEXes')
    .option('--chain <chainId>', 'Filter by chain ID')
    .action(async (_options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching tools...', () => api.get('/tools'));

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          console.log('\nBridges:');
          const bridgeRows = (data.bridges || []).map((b: any) => [b.key, b.name]);
          console.log(formatTable(['Key', 'Name'], bridgeRows));

          console.log('\nExchanges:');
          const exchangeRows = (data.exchanges || []).map((e: any) => [e.key, e.name]);
          console.log(formatTable(['Key', 'Name'], exchangeRows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
