import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerToolsCommand } from "./tools.js";

vi.mock("../core/http-client.js", () => ({
  api: {
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

import { api } from "../core/http-client.js";

const mockedApi = vi.mocked(api);

const TOOLS_FIXTURE = {
  bridges: [
    { key: "stargate", name: "Stargate", supportedChains: [{ fromChainId: 1, toChainId: 42161 }] },
    { key: "hop", name: "Hop", supportedChains: [{ fromChainId: 1, toChainId: 137 }] },
  ],
  exchanges: [{ key: "uniswap", name: "Uniswap", supportedChains: [1, 137] }],
};

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--json", "Output raw JSON");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerToolsCommand(program);
  return program;
}

describe("tools command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("fetches and displays tools", async () => {
    mockedApi.get.mockResolvedValue({ data: TOOLS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(["node", "test", "tools", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith("/tools", expect.objectContaining({ params: {} }));
    expect(consoleOutput.length).toBeGreaterThan(0);
  });

  it("outputs JSON when --json flag is set", async () => {
    mockedApi.get.mockResolvedValue({ data: TOOLS_FIXTURE });
    const program = createProgram();
    await program.parseAsync(["node", "test", "tools", "--json"]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.bridges).toBeDefined();
    expect(parsed.exchanges).toBeDefined();
  });
});
