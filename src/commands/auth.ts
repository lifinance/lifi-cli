import type { Command } from 'commander';
import { handleError } from '../core/errors.js';
import { getApiKey, maskKey } from '../core/config.js';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';

export function registerAuthCommand(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage API key (set via LIFI_API_KEY env var)');

  auth
    .command('show')
    .description('Display current API key (masked) and its source')
    .action(async (_options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const key = getApiKey();
        if (!key) {
          console.log('No API key configured.');
          console.log('Set one with: export LIFI_API_KEY=<your-key>');
          return;
        }
        if (isJsonMode(opts)) {
          console.log(jsonOutput({ key: maskKey(key) }));
        } else {
          console.log(`API Key: ${maskKey(key)}`);
          console.log('Source:  LIFI_API_KEY env var');
        }
      } catch (error) {
        handleError(error);
      }
    });

  auth
    .command('test')
    .description('Validate API key against the LI.FI API')
    .action(async (_options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Testing API key...', () =>
          api.get('/keys/test'),
        );
        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          console.log('API key is valid.');
        }
      } catch (error) {
        handleError(error);
      }
    });
}
