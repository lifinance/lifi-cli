import { Connection, PublicKey } from "@solana/web3.js";
import { type Address, createPublicClient, erc20Abi, http, type PublicClient } from "viem";
import { ExitCode } from "./constants.js";
import { CliError } from "./errors.js";

// ---- Error classification ----

interface RpcLikeError {
  message?: string;
  shortMessage?: string;
  status?: number;
  code?: number | string;
  cause?: { status?: number; code?: number | string; message?: string };
  details?: string;
}

function getStatus(e: RpcLikeError): number | undefined {
  if (typeof e.status === "number") return e.status;
  if (typeof e.cause?.status === "number") return e.cause.status;
  return undefined;
}

function getMessage(e: RpcLikeError): string {
  return e.shortMessage || e.message || e.details || "RPC error";
}

// Transient errors warrant trying the next RPC URL. Deterministic errors (revert,
// invalid call) don't — the next RPC will give the same answer.
export function isTransientRpcError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as RpcLikeError;
  const status = getStatus(e);
  if (status === 429 || (typeof status === "number" && status >= 500)) return true;

  const code = e.code ?? e.cause?.code;
  if (code === "ECONNREFUSED" || code === "ECONNRESET" || code === "ETIMEDOUT" || code === "EAI_AGAIN") return true;
  if (code === -32005) return true; // Common "limit exceeded" RPC error

  const msg = `${getMessage(e)} ${e.cause?.message ?? ""}`.toLowerCase();
  if (msg.includes("rate limit") || msg.includes("too many requests")) return true;
  if (msg.includes("timeout") || msg.includes("timed out")) return true;
  if (msg.includes("fetch failed") || msg.includes("network")) return true;

  return false;
}

export function mapRpcError(err: unknown, rpcUrls: string[]): CliError {
  if (err instanceof CliError) return err;
  if (!err || typeof err !== "object") {
    return new CliError(String(err ?? "Unknown RPC error"), ExitCode.NetworkError);
  }
  const e = err as RpcLikeError;
  const raw = getMessage(e);

  // viem surfaces revert reasons under shortMessage / details. Extract them.
  const revertMatch = raw.match(/execution reverted(?:: (.+))?/i);
  if (revertMatch) {
    const reason = revertMatch[1]?.trim();
    return new CliError(
      reason ? `Execution reverted: ${reason}` : "Execution reverted",
      ExitCode.ApiError,
      "The contract rejected the call. Check that the address is an ERC-20 and the chain is correct.",
    );
  }

  const status = getStatus(e);
  if (status === 429 || /rate limit|too many requests/i.test(raw)) {
    return new CliError(
      "RPC rate limited",
      ExitCode.NetworkError,
      "Retry shortly or pass --rpc <url> to use a private RPC.",
    );
  }
  if (/timeout|timed out/i.test(raw)) {
    return new CliError(
      "RPC timed out",
      ExitCode.NetworkError,
      `Tried: ${rpcUrls.join(", ")}. Pass --rpc <url> to override.`,
    );
  }

  return new CliError(raw, ExitCode.NetworkError, `RPC URLs tried: ${rpcUrls.join(", ")}`);
}

// ---- EVM client with RPC fallback ----

export interface EvmClient {
  rpcUrls: string[];
  getNativeBalance(address: Address): Promise<bigint>;
  getErc20Balance(token: Address, wallet: Address): Promise<bigint>;
  getErc20Allowance(token: Address, owner: Address, spender: Address): Promise<bigint>;
  // Returns "?" if the contract doesn't implement symbol(). Returns 0 if no decimals().
  getErc20Metadata(token: Address): Promise<{ symbol: string; decimals: number }>;
}

function makeClient(rpcUrl: string): PublicClient {
  return createPublicClient({ transport: http(rpcUrl, { timeout: 15_000, retryCount: 0 }) });
}

async function withFallback<T>(rpcUrls: string[], op: (client: PublicClient) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const url of rpcUrls) {
    try {
      return await op(makeClient(url));
    } catch (err) {
      lastErr = err;
      if (!isTransientRpcError(err)) break;
    }
  }
  throw mapRpcError(lastErr, rpcUrls);
}

export function createEvmClient(rpcUrls: string[]): EvmClient {
  if (rpcUrls.length === 0) {
    throw new CliError("No RPC URLs provided", ExitCode.InvalidArgs);
  }

  return {
    rpcUrls,
    getNativeBalance: (address) => withFallback(rpcUrls, (c) => c.getBalance({ address })),

    getErc20Balance: (token, wallet) =>
      withFallback(rpcUrls, (c) =>
        c.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [wallet] }),
      ),

    getErc20Allowance: (token, owner, spender) =>
      withFallback(rpcUrls, (c) =>
        c.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [owner, spender] }),
      ),

    getErc20Metadata: async (token) => {
      // symbol() and decimals() are run in parallel but each tolerates failure independently.
      const [symbolRes, decimalsRes] = await Promise.allSettled([
        withFallback(rpcUrls, (c) => c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" })),
        withFallback(rpcUrls, (c) => c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" })),
      ]);
      const symbol = symbolRes.status === "fulfilled" ? symbolRes.value : "?";
      const decimals = decimalsRes.status === "fulfilled" ? Number(decimalsRes.value) : 0;
      return { symbol, decimals };
    },
  };
}

// ---- Solana client with RPC fallback ----

export interface SolanaClient {
  rpcUrls: string[];
  // Native (SOL) balance in lamports.
  getNativeBalance(owner: PublicKey): Promise<bigint>;
  // Sum of all SPL token-account balances for the (owner, mint) pair, plus the mint's decimals.
  getSplBalance(owner: PublicKey, mint: PublicKey): Promise<{ amount: bigint; decimals: number }>;
}

async function withSolanaFallback<T>(rpcUrls: string[], op: (conn: Connection) => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (const url of rpcUrls) {
    try {
      return await op(new Connection(url, "confirmed"));
    } catch (err) {
      lastErr = err;
      if (!isTransientRpcError(err)) break;
    }
  }
  throw mapRpcError(lastErr, rpcUrls);
}

export function createSolanaClient(rpcUrls: string[]): SolanaClient {
  if (rpcUrls.length === 0) {
    throw new CliError("No RPC URLs provided", ExitCode.InvalidArgs);
  }

  return {
    rpcUrls,
    getNativeBalance: async (owner) => {
      const lamports = await withSolanaFallback(rpcUrls, (c) => c.getBalance(owner));
      return BigInt(lamports);
    },
    getSplBalance: async (owner, mint) => {
      const result = await withSolanaFallback(rpcUrls, (c) => c.getParsedTokenAccountsByOwner(owner, { mint }));
      let total = 0n;
      let decimals = 0;
      for (const { account } of result.value) {
        const parsed = account.data.parsed as
          | { info?: { tokenAmount?: { amount?: string; decimals?: number } } }
          | undefined;
        const info = parsed?.info?.tokenAmount;
        if (info?.amount) total += BigInt(info.amount);
        if (typeof info?.decimals === "number") decimals = info.decimals;
      }
      return { amount: total, decimals };
    },
  };
}

export function parseSolanaAddress(label: string, value: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw new CliError(`Invalid ${label} address: ${value}`, ExitCode.InvalidArgs);
  }
}
