import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError } from '../core/errors.js';
import type { GasPrices, GasSuggestion } from '../types/index.js';

export function registerGasCommand(program: Command): void {
  program
    .command('gas [chain]')
    .description('Get gas prices for all chains, or detailed suggestion for one chain')
    .addHelpText('after', `
Examples:
  $ lifi gas                       # All chains gas prices
  $ lifi gas 1                     # Ethereum gas suggestion (recommended cost in USD)
  $ lifi gas ethereum --json`)
    .action(async (chain, _options, command) => {
      const opts = command.optsWithGlobals();
      try {
        if (chain) {
          const { data } = await withSpinner(`Fetching gas for chain ${chain}...`, () =>
            api.get<GasSuggestion>(`/gas/suggestion/${chain}`),
          );
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            const rec = data.recommended;
            const rows = [
              ['Token', rec.token?.symbol || 'N/A'],
              ['Recommended cost', rec.amountUsd ? `$${rec.amountUsd}` : 'N/A'],
              ['Available', data.available ? 'Yes' : 'No'],
            ];
            console.log(formatTable(['Field', 'Value'], rows));
          }
        } else {
          const { data } = await withSpinner('Fetching gas prices...', () =>
            api.get<GasPrices>('/gas/prices'),
          );
          if (isJsonMode(opts)) {
            console.log(jsonOutput(data));
          } else {
            const chainIds = Object.keys(data).slice(0, 30);
            const rows = chainIds.map((id) => {
              const g = data[id];
              return [id, String(g?.standard ?? '-'), String(g?.fast ?? '-'), String(g?.fastest ?? '-')];
            });
            console.log(formatTable(['Chain ID', 'Standard (gwei)', 'Fast', 'Fastest'], rows));
            if (Object.keys(data).length > 30) {
              console.log(`\n  Showing 30 of ${Object.keys(data).length} chains. Use --json for full list.`);
            }
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
