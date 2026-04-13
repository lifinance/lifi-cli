import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerConnectionsCommand } from "./connections.js";

vi.mock("../core/http-client.js", () => ({
  api: { get: vi.fn() },
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

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--json", "Output raw JSON");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerConnectionsCommand(program);
  return program;
}

describe("connections command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("calls /connections", async () => {
    mockedApi.get.mockResolvedValue({ data: { connections: [] } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "connections", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith("/connections", expect.any(Object));
  });

  it("passes from/to chain params", async () => {
    mockedApi.get.mockResolvedValue({ data: { connections: [] } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "connections", "--from-chain", "1", "--to-chain", "42161", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/connections",
      expect.objectContaining({
        params: expect.objectContaining({ fromChain: "1", toChain: "42161" }),
      }),
    );
  });
});
