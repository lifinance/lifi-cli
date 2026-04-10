import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerHealthCommand(program: Command): void {
  program
    .command('health')
    .description('Check LI.FI API connectivity')
    .action(async (_options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const start = Date.now();
        const { data } = await withSpinner('Checking API health...', () =>
          api.get('/chains'),
        );
        const latency = Date.now() - start;

        const chains = data.chains || data;
        const result = {
          status: 'ok',
          latencyMs: latency,
          chainsAvailable: Array.isArray(chains) ? chains.length : 0,
        };

        if (isJsonMode(opts)) {
          console.log(jsonOutput(result));
        } else {
          console.log(`LI.FI API: ok (${latency}ms, ${result.chainsAvailable} chains available)`);
        }
      } catch (error) {
        handleError(error);
      }
    });
}
