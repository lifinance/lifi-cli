import type { Chain } from "../types/index.js";
import { ExitCode } from "./constants.js";
import { CliError } from "./errors.js";
import { api } from "./http-client.js";

let chainsCache: Chain[] | null = null;
let inflight: Promise<Chain[]> | null = null;

export function _resetChainCache(): void {
  chainsCache = null;
  inflight = null;
}

async function fetchChains(): Promise<Chain[]> {
  if (chainsCache) return chainsCache;
  if (inflight) return inflight;

  inflight = api.get<{ chains: Chain[] }>("/chains?chainTypes=EVM,SVM").then(({ data }) => {
    chainsCache = data.chains;
    inflight = null;
    return chainsCache;
  });

  try {
    return await inflight;
  } catch (err) {
    inflight = null;
    throw err;
  }
}

export async function resolveChain(chainArg: string): Promise<Chain> {
  if (!chainArg) {
    throw new CliError("Chain is required", ExitCode.InvalidArgs);
  }

  const chains = await fetchChains();
  const isNumeric = /^\d+$/.test(chainArg);
  const needle = chainArg.toLowerCase();

  const match = isNumeric
    ? chains.find((c) => c.id === Number(chainArg))
    : chains.find(
        (c) =>
          c.name.toLowerCase() === needle ||
          c.key.toLowerCase() === needle ||
          c.metamask?.chainName?.toLowerCase() === needle,
      );

  if (!match) {
    throw new CliError(
      `Chain "${chainArg}" not found`,
      ExitCode.InvalidArgs,
      "Run: lifi chains  to see all available chains",
    );
  }

  return match;
}

export function resolveRpcUrls(chain: Chain, override?: string): string[] {
  if (override) return [override];
  const urls = chain.metamask?.rpcUrls ?? [];
  if (urls.length === 0) {
    throw new CliError(
      `No RPC URL available for chain "${chain.name}" (id ${chain.id})`,
      ExitCode.InvalidArgs,
      "Supply one with --rpc <url>",
    );
  }
  return urls;
}

// Solana base58 pubkeys are 32 bytes → typically 43-44 characters in base58 (no 0/O/I/l).
const BASE58_RE = /^[1-9A-HJ-NP-Za-km-z]+$/;
export function isSolanaAddress(s: string): boolean {
  if (typeof s !== "string") return false;
  if (s.length < 32 || s.length > 44) return false;
  if (s.startsWith("0x")) return false;
  return BASE58_RE.test(s);
}
