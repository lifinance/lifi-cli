import { beforeEach, describe, expect, it, vi } from "vitest";
import { CliError } from "./errors.js";
import { createEvmClient, isTransientRpcError, mapRpcError } from "./rpc-client.js";

// Mock viem so each test injects deterministic responses without network.
const getBalance = vi.fn();
const readContract = vi.fn();

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({ getBalance, readContract })),
    http: vi.fn(() => "http-transport"),
  };
});

const ADDR_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const ADDR_WALLET = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const ADDR_SPENDER = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isTransientRpcError", () => {
  it("returns true for 429 status", () => {
    expect(isTransientRpcError({ status: 429 })).toBe(true);
  });

  it("returns true for 5xx status", () => {
    expect(isTransientRpcError({ status: 503 })).toBe(true);
  });

  it("returns true for ECONNREFUSED", () => {
    expect(isTransientRpcError({ code: "ECONNREFUSED" })).toBe(true);
  });

  it("returns true for messages containing 'timeout'", () => {
    expect(isTransientRpcError({ message: "Request timed out" })).toBe(true);
  });

  it("returns false for revert errors", () => {
    expect(isTransientRpcError({ shortMessage: "execution reverted: ERC20: transfer to zero" })).toBe(false);
  });

  it("returns false for non-error inputs", () => {
    expect(isTransientRpcError(null)).toBe(false);
    expect(isTransientRpcError("string")).toBe(false);
  });
});

describe("mapRpcError", () => {
  it("extracts the revert reason and maps to ApiError", () => {
    const cli = mapRpcError({ shortMessage: "execution reverted: insufficient allowance" }, ["https://r"]);
    expect(cli).toBeInstanceOf(CliError);
    expect(cli.message).toBe("Execution reverted: insufficient allowance");
  });

  it("flags rate-limit hits with a --rpc hint", () => {
    const cli = mapRpcError({ status: 429, message: "too many requests" }, ["https://r"]);
    expect(cli.message).toMatch(/rate limited/i);
    expect(cli.hint).toMatch(/--rpc/);
  });

  it("preserves a CliError unchanged", () => {
    const orig = new CliError("boom");
    expect(mapRpcError(orig, [])).toBe(orig);
  });

  it("falls through with the tried-URL list in the hint", () => {
    const cli = mapRpcError({ message: "weird" }, ["https://a", "https://b"]);
    expect(cli.hint).toContain("https://a");
    expect(cli.hint).toContain("https://b");
  });
});

describe("createEvmClient", () => {
  it("throws when given zero RPC URLs", () => {
    expect(() => createEvmClient([])).toThrow(CliError);
  });

  it("getNativeBalance returns the bigint from viem", async () => {
    getBalance.mockResolvedValueOnce(123_456_789_000_000n);
    const client = createEvmClient(["https://rpc.example/eth"]);
    const bal = await client.getNativeBalance(ADDR_WALLET);
    expect(bal).toBe(123_456_789_000_000n);
    expect(getBalance).toHaveBeenCalledWith({ address: ADDR_WALLET });
  });

  it("getErc20Balance calls balanceOf with the right args", async () => {
    readContract.mockResolvedValueOnce(42n);
    const client = createEvmClient(["https://rpc.example/eth"]);
    const bal = await client.getErc20Balance(ADDR_TOKEN, ADDR_WALLET);
    expect(bal).toBe(42n);
    const call = readContract.mock.calls[0]?.[0];
    expect(call.functionName).toBe("balanceOf");
    expect(call.args).toEqual([ADDR_WALLET]);
  });

  it("getErc20Allowance calls allowance(owner, spender)", async () => {
    readContract.mockResolvedValueOnce(7n);
    const client = createEvmClient(["https://rpc.example/eth"]);
    const allow = await client.getErc20Allowance(ADDR_TOKEN, ADDR_WALLET, ADDR_SPENDER);
    expect(allow).toBe(7n);
    const call = readContract.mock.calls[0]?.[0];
    expect(call.functionName).toBe("allowance");
    expect(call.args).toEqual([ADDR_WALLET, ADDR_SPENDER]);
  });

  it("getErc20Metadata returns symbol + decimals when both succeed", async () => {
    readContract.mockResolvedValueOnce("USDC").mockResolvedValueOnce(6);
    const client = createEvmClient(["https://rpc.example/eth"]);
    const meta = await client.getErc20Metadata(ADDR_TOKEN);
    expect(meta).toEqual({ symbol: "USDC", decimals: 6 });
  });

  it("getErc20Metadata tolerates missing symbol()/decimals()", async () => {
    readContract.mockRejectedValue(new Error("execution reverted"));
    const client = createEvmClient(["https://rpc.example/eth"]);
    const meta = await client.getErc20Metadata(ADDR_TOKEN);
    expect(meta).toEqual({ symbol: "?", decimals: 0 });
  });

  it("falls back to the next RPC URL on a transient failure", async () => {
    const transient = Object.assign(new Error("rate limit hit"), { status: 429 });
    getBalance.mockRejectedValueOnce(transient).mockResolvedValueOnce(100n);
    const client = createEvmClient(["https://primary", "https://backup"]);
    const bal = await client.getNativeBalance(ADDR_WALLET);
    expect(bal).toBe(100n);
    expect(getBalance).toHaveBeenCalledTimes(2);
  });

  it("does NOT fall back on a deterministic (revert) failure", async () => {
    readContract.mockRejectedValueOnce(Object.assign(new Error("x"), { shortMessage: "execution reverted: nope" }));
    const client = createEvmClient(["https://primary", "https://backup"]);
    await expect(client.getErc20Balance(ADDR_TOKEN, ADDR_WALLET)).rejects.toBeInstanceOf(CliError);
    expect(readContract).toHaveBeenCalledTimes(1);
  });

  it("surfaces a CliError after all RPC URLs are exhausted", async () => {
    const transient = Object.assign(new Error("timeout"), { status: 503 });
    getBalance.mockRejectedValue(transient);
    const client = createEvmClient(["https://primary", "https://backup"]);
    await expect(client.getNativeBalance(ADDR_WALLET)).rejects.toBeInstanceOf(CliError);
    expect(getBalance).toHaveBeenCalledTimes(2);
  });
});
