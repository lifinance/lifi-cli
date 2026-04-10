import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
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
          const connections = data.connections || [];
          if (connections.length === 0) {
            console.log('No connections found for the given filters.');
            return;
          }
          const rows = connections.slice(0, 50).map((c: any) => [
            String(c.fromChainId || '-'),
            String(c.toChainId || '-'),
            c.fromToken?.symbol || '-',
            c.toToken?.symbol || '-',
          ]);
          console.log(formatTable(['From Chain', 'To Chain', 'From Token', 'To Token'], rows));
          if (connections.length > 50) {
            console.log(`\n  Showing 50 of ${connections.length} connections. Use --json for full list.`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
