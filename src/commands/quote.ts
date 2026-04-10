import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable, formatAmount } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerQuoteCommand(program: Command): void {
  program
    .command('quote')
    .description('Get a cross-chain swap quote')
    .option('--from <chain>', 'Source chain (name or ID)')
    .option('--to <chain>', 'Destination chain (name or ID)')
    .option('--from-token <token>', 'Token to send (symbol or address)')
    .option('--to-token <token>', 'Token to receive (symbol or address)')
    .option('--amount <amount>', 'Amount in token units')
    .option('--from-address <address>', 'Sender wallet address')
    .option('--slippage <slippage>', 'Max slippage (e.g. 0.03 for 3%)', '0.03')
    .option('--order <order>', 'Route preference (CHEAPEST, FASTEST, SAFEST)')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = {
          fromChain: options.from,
          toChain: options.to,
          fromToken: options.fromToken,
          toToken: options.toToken,
          fromAmount: options.amount,
          fromAddress: options.fromAddress || '0x0000000000000000000000000000000000000000',
          slippage: options.slippage,
        };
        if (options.order) params.order = options.order;

        const { data } = await withSpinner('Fetching quote...', () =>
          api.get('/quote', { params }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const estimate = data.estimate || {};
          const rows = [
            ['You receive', `${formatAmount(estimate.toAmount || '0', estimate.toAmountDecimals || 18)} ${data.action?.toToken?.symbol || ''}`],
            ['Bridge', data.toolDetails?.name || data.tool || 'N/A'],
            ['Est. time', estimate.executionDuration ? `~${Math.round(estimate.executionDuration / 60)} min` : 'N/A'],
            ['Gas cost', estimate.gasCosts?.[0]?.amountUSD ? `~$${estimate.gasCosts[0].amountUSD}` : 'N/A'],
            ['Slippage', `${Number(options.slippage) * 100}%`],
          ];
          console.log(formatTable(['', ''], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
