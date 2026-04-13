import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerRoutesCommand } from "./routes.js";

vi.mock("../core/http-client.js", () => ({
  api: { get: vi.fn(), post: vi.fn() },
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

const ROUTES_FIXTURE = {
  routes: [
    { steps: [{ tool: "stargate" }], toAmountUSD: "999.42", gasCostUSD: "1.24" },
    { steps: [{ tool: "hop" }], toAmountUSD: "998.50", gasCostUSD: "0.80" },
  ],
};

function createProgram(): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--json", "Output raw JSON");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerRoutesCommand(program);
  return program;
}

describe("routes command", () => {
  let consoleOutput: string[];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleOutput = [];
    vi.spyOn(console, "log").mockImplementation((...args) => {
      consoleOutput.push(args.join(" "));
    });
  });

  it("calls POST /advanced/routes", async () => {
    mockedApi.post.mockResolvedValue({ data: ROUTES_FIXTURE });
    const program = createProgram();
    await program.parseAsync([
      "node",
      "test",
      "routes",
      "--from",
      "1",
      "--to",
      "42161",
      "--from-token",
      "USDC",
      "--to-token",
      "USDC",
      "--amount",
      "1000000000",
      "--json",
    ]);
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/advanced/routes",
      expect.objectContaining({
        fromChainId: "1",
        toChainId: "42161",
      }),
    );
  });

  it("outputs JSON when --json flag is set", async () => {
    mockedApi.post.mockResolvedValue({ data: ROUTES_FIXTURE });
    const program = createProgram();
    await program.parseAsync([
      "node",
      "test",
      "routes",
      "--from",
      "1",
      "--to",
      "42161",
      "--from-token",
      "USDC",
      "--to-token",
      "USDC",
      "--amount",
      "1000000000",
      "--json",
    ]);
    const parsed = JSON.parse(consoleOutput.join(""));
    expect(parsed.routes).toHaveLength(2);
  });
});
