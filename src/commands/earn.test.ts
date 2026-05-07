import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerEarnCommand } from "./earn.js";

vi.mock("../core/http-client.js", () => ({
  earnApi: {
    get: vi.fn(),
  },
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
  }),
}));

import { earnApi } from "../core/http-client.js";

const mockedEarnApi = vi.mocked(earnApi);

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--json", "Output raw JSON");
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  registerEarnCommand(program);
  return program;
}

describe("earn command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("lists vaults with filters", async () => {
    mockedEarnApi.get.mockResolvedValue({
      data: {
        data: [
          {
            chainId: 8453,
            protocol: { id: "aave", name: "Aave" },
            name: "USDC Vault",
            underlyingTokens: [{ symbol: "USDC" }],
            analytics: { apy: { total: 0.0525 }, tvl: { usd: "123456" } },
          },
        ],
      },
    });

    const program = createProgram();
    await program.parseAsync([
      "node",
      "test",
      "earn",
      "vaults",
      "--chain",
      "8453",
      "--asset",
      "USDC",
      "--composer-supported",
      "--json",
    ]);

    expect(mockedEarnApi.get).toHaveBeenCalledWith("/vaults", {
      params: { chainId: "8453", asset: "USDC", isComposerSupported: true },
    });
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.data[0].name).toBe("USDC Vault");
  });

  it("gets a single vault", async () => {
    mockedEarnApi.get.mockResolvedValue({
      data: {
        chainId: 8453,
        address: "0xvault",
        protocol: { name: "Aave" },
        name: "USDC Vault",
        underlyingTokens: [{ symbol: "USDC" }],
      },
    });

    const program = createProgram();
    await program.parseAsync(["node", "test", "earn", "vault", "8453", "0xvault", "--json"]);

    expect(mockedEarnApi.get).toHaveBeenCalledWith("/vaults/8453/0xvault");
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.name).toBe("USDC Vault");
  });

  it("lists Earn chains", async () => {
    mockedEarnApi.get.mockResolvedValue({
      data: [{ chainId: 8453, name: "Base", networkCaip: "eip155:8453" }],
    });

    const program = createProgram();
    await program.parseAsync(["node", "test", "earn", "chains", "--json"]);

    expect(mockedEarnApi.get).toHaveBeenCalledWith("/chains");
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed[0].name).toBe("Base");
  });

  it("lists Earn protocols", async () => {
    mockedEarnApi.get.mockResolvedValue({ data: [{ id: "aave", name: "Aave" }] });

    const program = createProgram();
    await program.parseAsync(["node", "test", "earn", "protocols", "--json"]);

    expect(mockedEarnApi.get).toHaveBeenCalledWith("/protocols");
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed[0].id).toBe("aave");
  });

  it("lists wallet positions", async () => {
    mockedEarnApi.get.mockResolvedValue({
      data: {
        positions: [
          {
            chainId: 8453,
            protocol: "aave",
            asset: { symbol: "USDC" },
            amount: "100",
            amountUsd: "100",
          },
        ],
      },
    });

    const program = createProgram();
    await program.parseAsync(["node", "test", "earn", "positions", "0xabc", "--json"]);

    expect(mockedEarnApi.get).toHaveBeenCalledWith("/portfolio/0xabc/positions");
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.positions[0].amount).toBe("100");
  });
});
