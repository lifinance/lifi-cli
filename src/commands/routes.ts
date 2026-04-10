import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerRoutesCommand(program: Command): void {
  program
    .command('routes')
    .description('Get and compare cross-chain routes')
    .option('--from <chain>', 'Source chain (name or ID)')
    .option('--to <chain>', 'Destination chain (name or ID)')
    .option('--from-token <token>', 'Token to send')
    .option('--to-token <token>', 'Token to receive')
    .option('--amount <amount>', 'Amount in token units')
    .option('--from-address <address>', 'Sender wallet address')
    .option('--order <order>', 'Sort preference (CHEAPEST, FASTEST, SAFEST)')
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
          api.post('/advanced/routes', body),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const routes = data.routes || [];
          const rows = routes.map((r: any, i: number) => [
            String(i + 1),
            (r.steps || []).map((s: any) => s.tool).join(' → '),
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
