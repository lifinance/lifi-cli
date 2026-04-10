import type { Command } from 'commander';
import { input } from '@inquirer/prompts';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable, formatAmount } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

async function promptIfMissing(value: string | undefined, message: string): Promise<string> {
  if (value) return value;
  return input({ message });
}

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
        const fromChain = await promptIfMissing(options.from, 'Source chain (name or ID):');
        const toChain = await promptIfMissing(options.to, 'Destination chain (name or ID):');
        const fromToken = await promptIfMissing(options.fromToken, 'Token to send (symbol or address):');
        const toToken = await promptIfMissing(options.toToken, 'Token to receive (symbol or address):');
        const fromAmount = await promptIfMissing(options.amount, 'Amount (in token units):');
        const fromAddress = await promptIfMissing(options.fromAddress, 'Your wallet address:');

        const params: Record<string, string> = {
          fromChain,
          toChain,
          fromToken,
          toToken,
          fromAmount,
          fromAddress,
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
