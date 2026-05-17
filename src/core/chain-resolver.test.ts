import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetChainCache, isSolanaAddress, resolveChain, resolveRpcUrls } from "./chain-resolver.js";
import { CliError } from "./errors.js";

vi.mock("./http-client.js", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "./http-client.js";

const mockedApi = vi.mocked(api);

const FIXTURE = {
  chains: [
    {
      id: 1,
      key: "eth",
      name: "Ethereum",
      chainType: "EVM",
      metamask: {
        chainName: "Ethereum Mainnet",
        rpcUrls: ["https://rpc.ankr.com/eth", "https://eth.llamarpc.com"],
      },
    },
    {
      id: 137,
      key: "pol",
      name: "Polygon",
      chainType: "EVM",
      metamask: { chainName: "Polygon Mainnet", rpcUrls: ["https://polygon-rpc.com"] },
    },
    {
      id: 1151111081099710,
      key: "sol",
      name: "Solana",
      chainType: "SVM",
      metamask: { chainName: "Solana", rpcUrls: ["https://api.mainnet-beta.solana.com"] },
    },
    { id: 999, key: "noRpc", name: "NoRpc", chainType: "EVM" },
  ],
};

describe("resolveChain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetChainCache();
    mockedApi.get.mockResolvedValue({ data: FIXTURE });
  });

  it("resolves by numeric id", async () => {
    const chain = await resolveChain("137");
    expect(chain.id).toBe(137);
  });

  it("resolves by name case-insensitively", async () => {
    const chain = await resolveChain("ethereum");
    expect(chain.id).toBe(1);
  });

  it("resolves by key", async () => {
    const chain = await resolveChain("pol");
    expect(chain.id).toBe(137);
  });

  it("resolves by metamask.chainName", async () => {
    const chain = await resolveChain("Polygon Mainnet");
    expect(chain.id).toBe(137);
  });

  it("throws CliError when chain not found", async () => {
    await expect(resolveChain("nope")).rejects.toBeInstanceOf(CliError);
  });

  it("caches the /chains response across calls", async () => {
    await resolveChain("ethereum");
    await resolveChain("polygon");
    expect(mockedApi.get).toHaveBeenCalledTimes(1);
  });
});

describe("resolveRpcUrls", () => {
  it("returns [override] when provided", () => {
    const urls = resolveRpcUrls(FIXTURE.chains[0] as never, "https://my.rpc");
    expect(urls).toEqual(["https://my.rpc"]);
  });

  it("returns chain.metamask.rpcUrls when no override", () => {
    const urls = resolveRpcUrls(FIXTURE.chains[0] as never);
    expect(urls).toEqual(["https://rpc.ankr.com/eth", "https://eth.llamarpc.com"]);
  });

  it("throws when chain has no RPC URLs and no override", () => {
    expect(() => resolveRpcUrls(FIXTURE.chains[3] as never)).toThrow(CliError);
  });
});

describe("isSolanaAddress", () => {
  it("returns true for a 44-char base58 string", () => {
    expect(isSolanaAddress("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM")).toBe(true);
  });

  it("returns false for a 0x EVM address", () => {
    expect(isSolanaAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(false);
  });

  it("returns false for strings outside the 32-44 length window", () => {
    expect(isSolanaAddress("abc")).toBe(false);
    expect(isSolanaAddress("1".repeat(50))).toBe(false);
  });

  it("returns false for strings with invalid base58 characters", () => {
    expect(isSolanaAddress("0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl")).toBe(false);
  });
});
