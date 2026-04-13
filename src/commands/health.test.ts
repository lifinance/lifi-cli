import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerHealthCommand } from "./health.js";

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
  registerHealthCommand(program);
  return program;
}

describe("health command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("calls /chains as a health probe", async () => {
    mockedApi.get.mockResolvedValue({ data: { chains: [{}, {}, {}] } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "health", "--json"]);
    expect(mockedApi.get).toHaveBeenCalledWith("/chains");
  });

  it("outputs JSON with status, latency, and chain count", async () => {
    mockedApi.get.mockResolvedValue({ data: { chains: [{}, {}, {}] } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "health", "--json"]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.status).toBe("ok");
    expect(parsed.chainsAvailable).toBe(3);
    expect(typeof parsed.latencyMs).toBe("number");
  });

  it("shows human-readable status when TTY", async () => {
    const origIsTTY = process.stdout.isTTY;
    process.stdout.isTTY = true;
    mockedApi.get.mockResolvedValue({ data: { chains: [{}, {}] } });
    const program = createProgram();
    await program.parseAsync(["node", "test", "health"]);
    const output = consoleOutput.join("\n");
    expect(output).toContain("ok");
    expect(output).toContain("2 chains available");
    process.stdout.isTTY = origIsTTY;
  });
});
