import { type Command, Option } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';
import type { Route, RoutesResponse, RouteOrder } from '../types/index.js';

export function registerRoutesCommand(program: Command): void {
  program
    .command('routes')
    .description('Get multiple route options for comparison (unlike quote, returns several alternatives)')
    .option('--from <chain>', 'Source chain name or ID (e.g. ethereum, 1)')
    .option('--to <chain>', 'Destination chain name or ID (e.g. arbitrum, 42161)')
    .option('--from-token <token>', 'Token to send — symbol or address (e.g. USDC)')
    .option('--to-token <token>', 'Token to receive — symbol or address')
    .option('--amount <amount>', 'Amount in smallest unit (e.g. 1000000 for 1 USDC)')
    .option('--from-address <address>', 'Sender wallet address (0x...)')
    .addOption(new Option('--order <order>', 'Sort preference').choices(['CHEAPEST', 'FASTEST', 'SAFEST', 'RECOMMENDED'] satisfies RouteOrder[]))
    .addHelpText('after', `
Examples:
  $ lifi routes --from 1 --to 42161 --from-token USDC --to-token USDC --amount 1000000000 --json
  $ lifi routes --from ethereum --to base --from-token USDC --to-token USDC --amount 1000000 --order CHEAPEST`)
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const body = {
          fromChainId: options.from,
          toChainId: options.to,
          fromTokenAddress: options.fromToken,
          toTokenAddress: options.toToken,
          fromAmount: options.amount,
          fromAddress: options.fromAddress || '0x0000000000000000000000000000000000000000',
          options: options.order ? { order: options.order } : undefined,
        };

        const { data } = await withSpinner('Fetching routes...', () =>
          api.post<RoutesResponse>('/advanced/routes', body),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const routes: Route[] = data.routes ?? [];
          const rows = routes.map((r, i) => [
            String(i + 1),
            r.steps.map((s: { tool: string }) => s.tool).join(' → '),
            r.toAmountUSD ? `$${r.toAmountUSD}` : 'N/A',
            r.gasCostUSD ? `$${r.gasCostUSD}` : 'N/A',
          ]);
          console.log(formatTable(['#', 'Steps', 'You Receive (USD)', 'Gas Cost'], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
