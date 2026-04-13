import type { Command } from "commander";
import { handleError } from "../core/errors.js";
import { formatTable, isJsonMode, jsonOutput } from "../core/formatter.js";
import { api } from "../core/http-client.js";
import { withSpinner } from "../core/interactive.js";
import type { ToolsResponse } from "../types/index.js";

export function registerToolsCommand(program: Command): void {
  program
    .command("tools")
    .description("List available bridges and DEX aggregators — use keys in quote --allow-bridges/--allow-exchanges")
    .option("--chain <chainId>", "Filter by chain ID (e.g. 1)")
    .addHelpText(
      "after",
      `
Examples:
  $ lifi tools
  $ lifi tools --json | jq '.bridges[] | .key'`,
    )
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const params: Record<string, string> = {};
        if (options["chain"]) params["chains"] = options["chain"] as string;

        const { data } = await withSpinner("Fetching tools...", () => api.get<ToolsResponse>("/tools", { params }));

        if (isJsonMode(opts)) {
          console.log(jsonOutput(data));
        } else {
          console.log("\nBridges:");
          const bridgeRows = data.bridges.map((b) => [b.key, b.name]);
          console.log(formatTable(["Key", "Name"], bridgeRows));

          console.log("\nExchanges:");
          const exchangeRows = data.exchanges.map((e) => [e.key, e.name]);
          console.log(formatTable(["Key", "Name"], exchangeRows));

          console.log("\n  Use keys with: lifi quote --allow-bridges <key> --allow-exchanges <key>");
        }
      } catch (error) {
        handleError(error);
      }
    });
}
