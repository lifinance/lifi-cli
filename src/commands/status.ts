import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError, CliError } from '../core/errors.js';
import { ExitCode } from '../core/constants.js';
import type { StatusResponse, TransferStatus } from '../types/index.js';
import { TERMINAL_STATUSES } from '../types/index.js';
const MAX_POLL_ATTEMPTS = 60; // 60 × 5s = 5 minutes

export function registerStatusCommand(program: Command): void {
  program
    .command('status <txHash>')
    .description('Check cross-chain transfer status by transaction hash')
    .option('--bridge <bridge>', 'Bridge key hint to speed up lookup (e.g. stargate, hop, across)')
    .option('--from-chain <chainId>', 'Source chain ID (e.g. 1)')
    .option('--to-chain <chainId>', 'Destination chain ID (e.g. 42161)')
    .option('--watch', 'Poll every 5s until DONE or FAILED (max 5 min)')
    .addHelpText('after', `
Examples:
  $ lifi status 0xabc123def456...
  $ lifi status 0xabc123... --watch
  $ lifi status 0xabc123... --bridge stargate --from-chain 1 --to-chain 42161`)
    .action(async (txHash, options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = { txHash };
        if (options['bridge']) params['bridge'] = options['bridge'] as string;
        if (options['fromChain']) params['fromChain'] = options['fromChain'] as string;
        if (options['toChain']) params['toChain'] = options['toChain'] as string;

        const fetchStatus = () => api.get<StatusResponse>('/status', { params });

        if (options.watch) {
          let lastData: StatusResponse | null = null;
          let status: TransferStatus = 'PENDING';

          for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
            const response = await withSpinner(`Status: ${status} (${attempt + 1}/${MAX_POLL_ATTEMPTS})`, fetchStatus);
            const data: StatusResponse = response.data;
            status = data.status ?? 'UNKNOWN';
            lastData = data;

            if (!isJsonMode(opts)) {
              console.log(`Status: ${status} | Substatus: ${data.substatus ?? 'N/A'}`);
            }

            if (TERMINAL_STATUSES.has(status)) break;

            await new Promise((r) => setTimeout(r, 5000));
          }

          if (isJsonMode(opts)) {
            console.log(jsonOutput(lastData));
          }

          if (!TERMINAL_STATUSES.has(status)) {
            throw new CliError(
              `Polling timed out after ${MAX_POLL_ATTEMPTS * 5}s — last status: ${status}`,
              ExitCode.General,
              'Try again with: lifi status ' + txHash + ' --watch',
            );
          }
        } else {
          const { data } = await withSpinner('Checking status...', fetchStatus);
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            const rows = [
              ['Status', data.status ?? 'N/A'],
              ['Substatus', data.substatus ?? 'N/A'],
              ['Bridge', data.tool ?? 'N/A'],
            ];
            console.log(formatTable(['Field', 'Value'], rows));
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
