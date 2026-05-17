import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerBalanceCommand } from "./balance.js";

const resolveChain = vi.fn();
const resolveRpcUrls = vi.fn();
const getNativeBalance = vi.fn();
const getErc20Balance = vi.fn();
const getErc20Allowance = vi.fn();
const getErc20Metadata = vi.fn();
const solGetNativeBalance = vi.fn();
const solGetSplBalance = vi.fn();
const parseSolanaAddress = vi.fn();

vi.mock("../core/chain-resolver.js", () => ({
  resolveChain: (...a: unknown[]) => resolveChain(...a),
  resolveRpcUrls: (...a: unknown[]) => resolveRpcUrls(...a),
}));

vi.mock("../core/rpc-client.js", () => ({
  createEvmClient: () => ({
    rpcUrls: ["https://rpc"],
    getNativeBalance: (...a: unknown[]) => getNativeBalance(...a),
    getErc20Balance: (...a: unknown[]) => getErc20Balance(...a),
    getErc20Allowance: (...a: unknown[]) => getErc20Allowance(...a),
    getErc20Metadata: (...a: unknown[]) => getErc20Metadata(...a),
  }),
  createSolanaClient: () => ({
    rpcUrls: ["https://rpc"],
    getNativeBalance: (...a: unknown[]) => solGetNativeBalance(...a),
    getSplBalance: (...a: unknown[]) => solGetSplBalance(...a),
  }),
  parseSolanaAddress: (...a: unknown[]) => parseSolanaAddress(...a),
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

const ETHEREUM = {
  id: 1,
  key: "eth",
  name: "Ethereum",
  chainType: "EVM" as const,
  nativeToken: { symbol: "ETH", decimals: 18, address: "0x0", chainId: 1, name: "Ether" },
  metamask: { rpcUrls: ["https://rpc"] },
};

const SOLANA = {
  id: 1151111081099710,
  key: "sol",
  name: "Solana",
  chainType: "SVM" as const,
  nativeToken: { symbol: "SOL", decimals: 9, address: "0x0", chainId: 1151111081099710, name: "SOL" },
  metamask: { rpcUrls: ["https://api.mainnet-beta.solana.com"] },
};

const WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const SPENDER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";
const SOL_WALLET = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const SOL_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC mint

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--json", "Output raw JSON");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerBalanceCommand(program);
  return program;
}

let consoleOutput: string[];
let errorOutput: string;

beforeEach(() => {
  vi.clearAllMocks();
  consoleOutput = [];
  errorOutput = "";
  vi.spyOn(console, "log").mockImplementation((...args) => {
    consoleOutput.push(args.join(" "));
  });
  vi.spyOn(console, "error").mockImplementation((...args) => {
    errorOutput += args.join(" ");
  });
  vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  resolveChain.mockResolvedValue(ETHEREUM);
  resolveRpcUrls.mockReturnValue(["https://rpc"]);
  parseSolanaAddress.mockImplementation((_label: string, value: string) => ({ toBase58: () => value }));
});

describe("balance native", () => {
  it("returns the native balance in JSON shape matching NativeBalanceResult", async () => {
    getNativeBalance.mockResolvedValue(1_500_000_000_000_000_000n); // 1.5 ETH
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "native",
      "--chain",
      "ethereum",
      "--address",
      WALLET,
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed).toEqual({
      address: WALLET,
      balance: "1500000000000000000",
      tokenSymbol: "ETH",
      chainId: 1,
      decimals: 18,
    });
    expect(getNativeBalance).toHaveBeenCalledWith(WALLET);
  });

  it("fetches a Solana native (SOL) balance on an SVM chain", async () => {
    resolveChain.mockResolvedValue(SOLANA);
    solGetNativeBalance.mockResolvedValue(2_500_000_000n); // 2.5 SOL (lamports)
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "native",
      "--chain",
      "solana",
      "--address",
      SOL_WALLET,
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed).toEqual({
      address: SOL_WALLET,
      balance: "2500000000",
      tokenSymbol: "SOL",
      chainId: SOLANA.id,
      decimals: 9,
    });
    expect(parseSolanaAddress).toHaveBeenCalledWith("wallet", SOL_WALLET);
    expect(getNativeBalance).not.toHaveBeenCalled();
  });

  it("rejects an invalid EVM address before any RPC call", async () => {
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "native",
      "--chain",
      "ethereum",
      "--address",
      "not-an-address",
      "--json",
    ]);
    expect(errorOutput).toMatch(/Invalid wallet address/);
    expect(getNativeBalance).not.toHaveBeenCalled();
  });

  it("passes --rpc through to resolveRpcUrls", async () => {
    getNativeBalance.mockResolvedValue(0n);
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "native",
      "--chain",
      "ethereum",
      "--address",
      WALLET,
      "--rpc",
      "https://my.rpc",
      "--json",
    ]);
    expect(resolveRpcUrls).toHaveBeenCalledWith(ETHEREUM, "https://my.rpc");
  });
});

describe("balance token", () => {
  it("returns the ERC-20 balance with metadata", async () => {
    getErc20Balance.mockResolvedValue(2_000_000n); // 2 USDC at 6 decimals
    getErc20Metadata.mockResolvedValue({ symbol: "USDC", decimals: 6 });
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "token",
      "--chain",
      "ethereum",
      "--token",
      TOKEN,
      "--wallet",
      WALLET,
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed).toEqual({
      walletAddress: WALLET,
      tokenAddress: TOKEN,
      balance: "2000000",
      tokenSymbol: "USDC",
      decimals: 6,
      chainId: 1,
    });
    expect(getErc20Balance).toHaveBeenCalledWith(TOKEN, WALLET);
  });

  it("rejects an invalid token address", async () => {
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "token",
      "--chain",
      "ethereum",
      "--token",
      "0xnope",
      "--wallet",
      WALLET,
      "--json",
    ]);
    expect(errorOutput).toMatch(/Invalid token address/);
    expect(getErc20Balance).not.toHaveBeenCalled();
  });

  it("returns the SPL token balance on an SVM chain", async () => {
    resolveChain.mockResolvedValue(SOLANA);
    solGetSplBalance.mockResolvedValue({ amount: 12_345_678n, decimals: 6 });
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "token",
      "--chain",
      "solana",
      "--token",
      SOL_MINT,
      "--wallet",
      SOL_WALLET,
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed).toEqual({
      walletAddress: SOL_WALLET,
      tokenAddress: SOL_MINT,
      balance: "12345678",
      tokenSymbol: "?",
      decimals: 6,
      chainId: SOLANA.id,
    });
    expect(getErc20Balance).not.toHaveBeenCalled();
  });
});

describe("balance allowance", () => {
  it("returns the allowance with token metadata", async () => {
    getErc20Allowance.mockResolvedValue(1_000_000n);
    getErc20Metadata.mockResolvedValue({ symbol: "USDC", decimals: 6 });
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "allowance",
      "--chain",
      "ethereum",
      "--token",
      TOKEN,
      "--owner",
      WALLET,
      "--spender",
      SPENDER,
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed).toEqual({
      tokenAddress: TOKEN,
      ownerAddress: WALLET,
      spenderAddress: SPENDER,
      allowance: "1000000",
      tokenSymbol: "USDC",
      decimals: 6,
      chainId: 1,
    });
    expect(getErc20Allowance).toHaveBeenCalledWith(TOKEN, WALLET, SPENDER);
  });

  it("rejects a non-EVM chain with the EVM-only message", async () => {
    resolveChain.mockResolvedValue(SOLANA);
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "allowance",
      "--chain",
      "solana",
      "--token",
      TOKEN,
      "--owner",
      WALLET,
      "--spender",
      SPENDER,
      "--json",
    ]);
    expect(errorOutput).toMatch(/only supported on EVM/i);
    expect(getErc20Allowance).not.toHaveBeenCalled();
  });

  it("rejects an invalid spender address", async () => {
    await createProgram().parseAsync([
      "node",
      "test",
      "balance",
      "allowance",
      "--chain",
      "ethereum",
      "--token",
      TOKEN,
      "--owner",
      WALLET,
      "--spender",
      "0xnope",
      "--json",
    ]);
    expect(errorOutput).toMatch(/Invalid spender address/);
  });
});
