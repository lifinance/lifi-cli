import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';

export function registerStatusCommand(program: Command): void {
  program
    .command('status <txHash>')
    .description('Check transaction status')
    .option('--bridge <bridge>', 'Bridge hint (speeds up lookup)')
    .option('--from-chain <chainId>', 'Source chain ID')
    .option('--to-chain <chainId>', 'Destination chain ID')
    .option('--watch', 'Poll until complete or failed')
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
