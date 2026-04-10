import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status <txHash>')
    .description('Check cross-chain transfer status by transaction hash')
    .option('--bridge <bridge>', 'Bridge key hint to speed up lookup (e.g. stargate, hop, across)')
    .option('--from-chain <chainId>', 'Source chain ID (e.g. 1)')
    .option('--to-chain <chainId>', 'Destination chain ID (e.g. 42161)')
    .option('--watch', 'Poll every 5s until DONE or FAILED')
    .addHelpText('after', `
Examples:
  $ lifi status 0xabc123def456...
  $ lifi status 0xabc123... --watch
  $ lifi status 0xabc123... --bridge stargate --from-chain 1 --to-chain 42161`)
    .action(async (txHash, options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = { txHash };
        if (options.bridge) params.bridge = options.bridge;
        if (options.fromChain) params.fromChain = options.fromChain;
        if (options.toChain) params.toChain = options.toChain;

        const fetchStatus = () => api.get('/status', { params });

        if (options.watch) {
          let status = 'PENDING';
          while (status !== 'DONE' && status !== 'FAILED') {
            const { data } = await withSpinner(`Status: ${status}`, fetchStatus);
            status = data.status || 'UNKNOWN';
            if (isJsonMode(opts)) {
              console.log(jsonOutput(data));
            } else {
              console.log(`Status: ${status} | Substatus: ${data.substatus || 'N/A'}`);
            }
            if (status !== 'DONE' && status !== 'FAILED') {
              await new Promise((r) => setTimeout(r, 5000));
            }
          }
        } else {
          const { data } = await withSpinner('Checking status...', fetchStatus);
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            const rows = [
              ['Status', data.status || 'N/A'],
              ['Substatus', data.substatus || 'N/A'],
              ['Bridge', data.tool || 'N/A'],
            ];
            console.log(formatTable(['Field', 'Value'], rows));
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
