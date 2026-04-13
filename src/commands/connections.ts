import type { Command } from "commander";
import { handleError } from "../core/errors.js";
import { formatTable, isJsonMode, jsonOutput } from "../core/formatter.js";
import { api } from "../core/http-client.js";
import { withSpinner } from "../core/interactive.js";
import type { Connection, ConnectionsResponse } from "../types/index.js";

export function registerConnectionsCommand(program: Command): void {
  program
    .command("connections")
    .description("Check which token transfer routes exist between chains")
    .option("--from-chain <chainId>", "Source chain ID (e.g. 1)")
    .option("--to-chain <chainId>", "Destination chain ID (e.g. 42161)")
    .option("--from-token <token>", "Source token address (e.g. 0xa0b8...)")
    .option("--to-token <token>", "Destination token address")
    .addHelpText(
      "after",
      `
Examples:
  $ lifi connections --from-chain 1 --to-chain 42161
  $ lifi connections --from-chain 1 --to-chain 8453 --from-token USDC --json`,
    )
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = {};
        if (options["fromChain"]) params["fromChain"] = options["fromChain"] as string;
        if (options["toChain"]) params["toChain"] = options["toChain"] as string;
        if (options["fromToken"]) params["fromToken"] = options["fromToken"] as string;
        if (options["toToken"]) params["toToken"] = options["toToken"] as string;

        const { data } = await withSpinner("Fetching connections...", () =>
          api.get<ConnectionsResponse>("/connections", { params }),
        );

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          const connections: Connection[] = data.connections ?? [];
          if (connections.length === 0) {
            console.log("No connections found for the given filters.");
            return;
          }
          const rows = connections
            .slice(0, 50)
            .map((c: Connection) => [
              String(c.fromChainId),
              String(c.toChainId),
              c.fromToken?.symbol ?? "-",
              c.toToken?.symbol ?? "-",
            ]);
          console.log(formatTable(["From Chain", "To Chain", "From Token", "To Token"], rows));
          if (connections.length > 50) {
            console.log(`\n  Showing 50 of ${connections.length} connections. Use --json for full list.`);
          }
        }
      } catch (error) {
        handleError(error);
      }
    });
}
