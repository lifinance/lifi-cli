import type { Command } from 'commander';
import { api } from '../core/http-client.js';
import { isJsonMode, jsonOutput, formatTable } from '../core/formatter.js';
import { withSpinner } from '../core/interactive.js';
import { handleError, CliError } from '../core/errors.js';
import { ExitCode } from '../core/constants.js';

export function registerChainsCommand(program: Command): void {
  program
    .command('chains')
    .description('List all supported chains')
    .option('--type <type>', 'Filter by chain type (EVM, SVM, ...)')
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching chains...', () => api.get('/chains'));

        let chains = data.chains || data;
        if (options.type) {
          chains = chains.filter((c: any) => c.chainType === options.type);
        }

        if (isJsonMode(opts)) {
          console.log(jsonOutput({ chains }));
        } else {
          const rows = chains.map((c: any) => [
            String(c.id),
            c.name,
            c.chainType,
            c.nativeToken?.symbol || '-',
          ]);
          console.log(formatTable(['ID', 'Name', 'Type', 'Native Token'], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('chain <idOrName>')
    .description('Get chain detail by ID or name')
    .action(async (idOrName, _options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const { data } = await withSpinner('Fetching chains...', () => api.get('/chains'));

        const allChains: any[] = data.chains || data;
        const isNumeric = /^\d+$/.test(idOrName);

        const chain = isNumeric
          ? allChains.find((c: any) => c.id === Number(idOrName))
          : allChains.find((c: any) => c.name.toLowerCase() === idOrName.toLowerCase());

        if (!chain) {
          handleError(new CliError(
            `Chain "${idOrName}" not found`,
            ExitCode.InvalidArgs,
            'Run: lifi chains  to see all available chains',
          ));
        }

        if (isJsonMode(opts)) {
          console.log(jsonOutput(chain));
        } else {
          const rows = [
            ['ID', String(chain.id)],
            ['Name', chain.name],
            ['Key', chain.key || '-'],
            ['Type', chain.chainType],
            ['Native Token', chain.nativeToken?.symbol || '-'],
            ['Mainnet', chain.mainnet ? 'Yes' : 'No'],
          ];
          console.log(formatTable(['Field', 'Value'], rows));
        }
      } catch (error) {
        handleError(error);
      }
    });
}
