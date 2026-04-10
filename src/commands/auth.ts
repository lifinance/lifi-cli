import type { Command } from 'commander';
import { handleError } from '../core/errors.js';
import { saveConfig, getConfigPath, getApiKey, maskKey } from '../core/config.js';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';

export function registerAuthCommand(program: Command): void {
  const auth = program
    .command('auth')
    .description('Manage API key authentication');

  auth
    .command('set <api-key>')
    .description('Store API key in config')
    .action(async (apiKey) => {
      try {
        saveConfig({ apiKey });
        console.log(`API key saved to ${getConfigPath()}`);
      } catch (error) {
        handleError(error);
      }
    });

  auth
    .command('show')
    .description('Display current API key (masked)')
    .action(async (_options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const key = getApiKey();
        if (!key) {
          console.log('No API key configured.');
          return;
        }
        if (isJsonMode(opts)) {
          console.log(jsonOutput({ key: maskKey(key), source: process.env.LIFI_API_KEY ? 'env' : 'config', configPath: getConfigPath() }));
        } else {
          console.log(`API Key: ${maskKey(key)}`);
          console.log(`Source:  ${process.env.LIFI_API_KEY ? 'LIFI_API_KEY env var' : getConfigPath()}`);
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
