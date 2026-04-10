import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerTokensCommand(program: Command): void {
  program
    .command('tokens')
    .description('List supported tokens')
    .option('--chain <chainId>', 'Filter by chain ID')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = {};
        if (options.chain) params.chains = options.chain;

        const { data } = await withSpinner('Fetching tokens...', () =>
          api.get('/tokens', { params }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const tokens = data.tokens;
          const allTokens: any[] = [];
          for (const chainId of Object.keys(tokens)) {
            allTokens.push(...tokens[chainId]);
          }
          const rows = allTokens.slice(0, 50).map((t: any) => [
            t.symbol,
            t.name,
            t.address?.slice(0, 10) + '...',
            String(t.decimals),
            String(t.chainId),
          ]);
          console.log(formatTable(['Symbol', 'Name', 'Address', 'Decimals', 'Chain'], rows));
          if (allTokens.length > 50) {
            console.log(`\n  Showing 50 of ${allTokens.length} tokens. Use --json for full list.`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('token <chain> <symbol>')
    .description('Get details for a specific token')
    .action(async (chain, symbol, _options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching token...', () =>
          api.get('/token', { params: { chain, token: symbol } }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const rows = [
            ['Symbol', data.symbol],
            ['Name', data.name],
            ['Address', data.address],
            ['Decimals', String(data.decimals)],
            ['Chain ID', String(data.chainId)],
            ['Price (USD)', data.priceUSD || 'N/A'],
          ];
          console.log(formatTable(['Field', 'Value'], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
