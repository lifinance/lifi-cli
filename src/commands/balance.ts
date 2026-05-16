import type { Command } from "commander";
import { type Address, isAddress } from "viem";
import { resolveChain, resolveRpcUrls } from "../core/chain-resolver.js";
import { ExitCode } from "../core/constants.js";
import { CliError, handleError } from "../core/errors.js";
import { formatAmount, formatTable, isJsonMode, jsonOutput } from "../core/formatter.js";
import { withSpinner } from "../core/interactive.js";
import { createEvmClient, createSolanaClient, parseSolanaAddress } from "../core/rpc-client.js";
import type { AllowanceResult, Chain, NativeBalanceResult, TokenBalanceResult } from "../types/index.js";

function assertEvm(chain: Chain, operation: string): void {
  if (chain.chainType !== "EVM") {
    throw new CliError(
      `${operation} is only supported on EVM chains (got ${chain.chainType} chain "${chain.name}").`,
      ExitCode.InvalidArgs,
    );
  }
}

function assertEvmAddress(label: string, value: string): Address {
  if (!isAddress(value)) {
    throw new CliError(`Invalid ${label} address: ${value}`, ExitCode.InvalidArgs);
  }
  return value as Address;
}

export function registerBalanceCommand(program: Command): void {
  const balance = program.command("balance").description("Read on-chain balances and ERC-20 allowances");

  // -------- balance native --------
  balance
    .command("native")
    .description("Read the native-token balance of an address")
    .requiredOption("--chain <chain>", "Chain id, name, or key (e.g. 1, ethereum, eth)")
    .requiredOption("--address <address>", "Wallet address")
    .option("--rpc <url>", "Override the RPC URL")
    .addHelpText(
      "after",
      `
Examples:
  $ lifi balance native --chain ethereum --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  $ lifi balance native --chain 137 --address 0x... --json
  $ lifi balance native --chain arbitrum --address 0x... --rpc https://arb1.example/v1`,
    )
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const chain = await withSpinner("Resolving chain...", () => resolveChain(options.chain));
        const rpcUrls = resolveRpcUrls(chain, options.rpc);

        let result: NativeBalanceResult;
        if (chain.chainType === "EVM") {
          const address = assertEvmAddress("wallet", options.address);
          const client = createEvmClient(rpcUrls);
          const raw = await withSpinner(`Fetching ${chain.nativeToken.symbol} balance...`, () =>
            client.getNativeBalance(address),
          );
          result = {
            address,
            balance: raw.toString(),
            tokenSymbol: chain.nativeToken.symbol,
            chainId: chain.id,
            decimals: chain.nativeToken.decimals,
          };
        } else if (chain.chainType === "SVM") {
          const owner = parseSolanaAddress("wallet", options.address);
          const client = createSolanaClient(rpcUrls);
          const raw = await withSpinner(`Fetching ${chain.nativeToken.symbol} balance...`, () =>
            client.getNativeBalance(owner),
          );
          result = {
            address: options.address,
            balance: raw.toString(),
            tokenSymbol: chain.nativeToken.symbol,
            chainId: chain.id,
            decimals: chain.nativeToken.decimals,
          };
        } else {
          throw new CliError(`Unsupported chain type: ${chain.chainType}`, ExitCode.InvalidArgs);
        }

        if (isJsonMode(opts)) {
          console.log(jsonOutput(result));
        } else {
          console.log(
            formatTable(
              ["Field", "Value"],
              [
                ["Chain", `${chain.name} (${chain.id})`],
                ["Address", result.address],
                ["Balance", `${formatAmount(result.balance, result.decimals)} ${result.tokenSymbol}`],
                ["Raw", result.balance],
              ],
            ),
          );
        }
      } catch (error) {
        handleError(error);
      }
    });

  // -------- balance token --------
  balance
    .command("token")
    .description("Read the ERC-20 balance of a wallet for a specific token")
    .requiredOption("--chain <chain>", "Chain id, name, or key")
    .requiredOption("--token <address>", "ERC-20 contract address")
    .requiredOption("--wallet <address>", "Wallet address")
    .option("--rpc <url>", "Override the RPC URL")
    .addHelpText(
      "after",
      `
Examples:
  $ lifi balance token --chain ethereum \\
      --token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
      --wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`,
    )
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const chain = await withSpinner("Resolving chain...", () => resolveChain(options.chain));
        const rpcUrls = resolveRpcUrls(chain, options.rpc);

        let result: TokenBalanceResult;
        if (chain.chainType === "EVM") {
          const token = assertEvmAddress("token", options.token);
          const wallet = assertEvmAddress("wallet", options.wallet);
          const client = createEvmClient(rpcUrls);
          const [rawBalance, meta] = await withSpinner("Fetching ERC-20 balance...", () =>
            Promise.all([client.getErc20Balance(token, wallet), client.getErc20Metadata(token)]),
          );
          result = {
            walletAddress: wallet,
            tokenAddress: token,
            balance: rawBalance.toString(),
            tokenSymbol: meta.symbol,
            decimals: meta.decimals,
            chainId: chain.id,
          };
        } else if (chain.chainType === "SVM") {
          const mint = parseSolanaAddress("token", options.token);
          const owner = parseSolanaAddress("wallet", options.wallet);
          const client = createSolanaClient(rpcUrls);
          const splResult = await withSpinner("Fetching SPL token balance...", () => client.getSplBalance(owner, mint));
          // SPL accounts don't expose symbol on-chain — that's metadata-program data, out of scope here.
          result = {
            walletAddress: options.wallet,
            tokenAddress: options.token,
            balance: splResult.amount.toString(),
            tokenSymbol: "?",
            decimals: splResult.decimals,
            chainId: chain.id,
          };
        } else {
          throw new CliError(`Unsupported chain type: ${chain.chainType}`, ExitCode.InvalidArgs);
        }

        if (isJsonMode(opts)) {
          console.log(jsonOutput(result));
        } else {
          console.log(
            formatTable(
              ["Field", "Value"],
              [
                ["Chain", `${chain.name} (${chain.id})`],
                ["Wallet", result.walletAddress],
                ["Token", `${result.tokenSymbol} (${result.tokenAddress})`],
                ["Balance", `${formatAmount(result.balance, result.decimals)} ${result.tokenSymbol}`],
                ["Raw", result.balance],
              ],
            ),
          );
        }
      } catch (error) {
        handleError(error);
      }
    });

  // -------- balance allowance --------
  balance
    .command("allowance")
    .description("Read the ERC-20 allowance an owner has granted to a spender")
    .requiredOption("--chain <chain>", "Chain id, name, or key")
    .requiredOption("--token <address>", "ERC-20 contract address")
    .requiredOption("--owner <address>", "Token owner (wallet) address")
    .requiredOption("--spender <address>", "Spender address (typically the LI.FI Diamond)")
    .option("--rpc <url>", "Override the RPC URL")
    .addHelpText(
      "after",
      `
Examples:
  $ lifi balance allowance --chain ethereum \\
      --token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \\
      --owner 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \\
      --spender 0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE

Note: Allowance is an EVM-only concept. On Solana, programs use token-account
authority instead of ERC-20-style approvals.`,
    )
    .action(async (options, command) => {
      const opts = command.optsWithGlobals();
      try {
        const token = assertEvmAddress("token", options.token);
        const owner = assertEvmAddress("owner", options.owner);
        const spender = assertEvmAddress("spender", options.spender);
        const chain = await withSpinner("Resolving chain...", () => resolveChain(options.chain));
        assertEvm(chain, "Allowance");
        const rpcUrls = resolveRpcUrls(chain, options.rpc);
        const client = createEvmClient(rpcUrls);

        const [rawAllowance, meta] = await withSpinner("Fetching allowance...", () =>
          Promise.all([client.getErc20Allowance(token, owner, spender), client.getErc20Metadata(token)]),
        );

        const result: AllowanceResult = {
          tokenAddress: token,
          ownerAddress: owner,
          spenderAddress: spender,
          allowance: rawAllowance.toString(),
          tokenSymbol: meta.symbol,
          decimals: meta.decimals,
          chainId: chain.id,
        };

        if (isJsonMode(opts)) {
          console.log(jsonOutput(result));
        } else {
          console.log(
            formatTable(
              ["Field", "Value"],
              [
                ["Chain", `${chain.name} (${chain.id})`],
                ["Token", `${meta.symbol} (${token})`],
                ["Owner", owner],
                ["Spender", spender],
                ["Allowance", `${formatAmount(result.allowance, result.decimals)} ${result.tokenSymbol}`],
                ["Raw", result.allowance],
              ],
            ),
          );
        }
      } catch (error) {
        handleError(error);
      }
    });
}
