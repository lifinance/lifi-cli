import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerConnectionsCommand(program: Command): void {
  program
    .command('connections')
    .description('Get available connections between chains/tokens')
    .option('--from-chain <chainId>', 'Source chain ID')
    .option('--to-chain <chainId>', 'Destination chain ID')
    .option('--from-token <token>', 'Source token address')
    .option('--to-token <token>', 'Destination token address')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = {};
        if (options.fromChain) params.fromChain = options.fromChain;
        if (options.toChain) params.toChain = options.toChain;
        if (options.fromToken) params.fromToken = options.fromToken;
        if (options.toToken) params.toToken = options.toToken;

        const { data } = await withSpinner('Fetching connections...', () =>
          api.get('/connections', { params }),
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
