import { describe, expect, it } from "vitest";
import type { GlobalOptions } from "./index.js";

describe("types", () => {
  it("GlobalOptions interface compiles and is assignable", () => {
    const opts: GlobalOptions = { json: true, verbose: false, noColor: false };
    expect(opts.json).toBe(true);
  });

  it("GlobalOptions allows partial assignment", () => {
    const opts: GlobalOptions = {};
    expect(opts.json).toBeUndefined();
  });
});
