import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerStatusCommand } from "./status.js";

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
  registerStatusCommand(program);
  return program;
}

describe("status command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("calls /status with tx hash", async () => {
    mockedApi.get.mockResolvedValue({ data: { status: "DONE", substatus: "COMPLETED", tool: "stargate" } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "status", "0xabc123", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/status",
      expect.objectContaining({
        params: expect.objectContaining({ txHash: "0xabc123" }),
      }),
    );
  });

  it("outputs JSON when --json flag is set", async () => {
    mockedApi.get.mockResolvedValue({ data: { status: "DONE", substatus: "COMPLETED" } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "status", "0xabc123", "--json"]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.status).toBe("DONE");
  });

  it("passes bridge hint when provided", async () => {
    mockedApi.get.mockResolvedValue({ data: { status: "PENDING" } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "status", "0xabc123", "--bridge", "hop", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith(
      "/status",
      expect.objectContaining({
        params: expect.objectContaining({ bridge: "hop" }),
      }),
    );
  });
});
