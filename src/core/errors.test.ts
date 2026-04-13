import { describe, expect, it } from "vitest";
import { ExitCode } from "./constants.js";
import { CliError, formatError, mapAxiosError } from "./errors.js";

describe("CliError", () => {
  it("stores exitCode, message, and hint", () => {
    const err = new CliError("Something broke", ExitCode.General, "Try again");
    expect(err.message).toBe("Something broke");
    expect(err.exitCode).toBe(ExitCode.General);
    expect(err.hint).toBe("Try again");
    expect(err).toBeInstanceOf(Error);
  });

  it("hint is optional", () => {
    const err = new CliError("Oops", ExitCode.General);
    expect(err.hint).toBeUndefined();
  });
});

describe("formatError", () => {
  it("formats error with hint in spec format", () => {
    const err = new CliError("Token not found", ExitCode.General, "Run: lifi tokens --chain 1");
    const output = formatError(err);
    expect(output).toContain("Error: Token not found");
    expect(output).toContain("Run: lifi tokens --chain 1");
  });

  it("formats error without hint", () => {
    const err = new CliError("Unknown failure", ExitCode.General);
    const output = formatError(err);
    expect(output).toContain("Error: Unknown failure");
    expect(output).not.toContain("undefined");
  });

  it("formats non-CliError as generic error", () => {
    const err = new Error("random crash");
    const output = formatError(err);
    expect(output).toContain("Error: random crash");
  });

  it("formats non-Error values", () => {
    const output = formatError("string error");
    expect(output).toContain("Error: An unexpected error occurred");
  });
});

describe("mapAxiosError", () => {
  it("maps 401 to AuthError (exit 3)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 401, data: { message: "Invalid API key" } },
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.AuthError);
    expect(err.message).toContain("Invalid API key");
  });

  it("maps 403 to AuthError (exit 3)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 403, data: { message: "Forbidden" } },
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.AuthError);
  });

  it("maps 429 to ApiError (exit 4)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 429, data: { message: "Rate limited" } },
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.ApiError);
    expect(err.message).toContain("Rate limited");
  });

  it("maps 500 to ApiError (exit 4)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: { status: 500, data: { message: "Internal server error" } },
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.ApiError);
  });

  it("maps network error (no response) to NetworkError (exit 5)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: undefined,
      code: "ECONNREFUSED",
      message: "connect ECONNREFUSED",
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.NetworkError);
  });

  it("maps timeout error to NetworkError (exit 5)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: undefined,
      code: "ECONNABORTED",
      message: "timeout of 10000ms exceeded",
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.NetworkError);
  });

  it("maps unknown axios error to General (exit 1)", () => {
    const axiosErr = {
      isAxiosError: true,
      response: undefined,
      code: undefined,
      message: "something weird",
    };
    const err = mapAxiosError(axiosErr);
    expect(err.exitCode).toBe(ExitCode.General);
  });
});
