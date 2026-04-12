import axios from "axios";
import { describe, expect, it } from "vitest";

const API_BASE = "https://li.quest/v1";
const PARAMS = { integrator: "lifi-cli" };

const shouldRun = process.env["INTEGRATION"] === "1";

describe.skipIf(!shouldRun)("tokens — integration (live API)", () => {
  it("returns tokens for Ethereum (chain 1)", async () => {
    const { data } = await axios.get(`${API_BASE}/tokens`, {
      params: { ...PARAMS, chains: "1" },
    });
    expect(data).toHaveProperty("tokens");
    const ethTokens: unknown[] = data.tokens["1"];
    expect(Array.isArray(ethTokens)).toBe(true);
    expect(ethTokens.length).toBeGreaterThan(0);
  });

  it("each token has address, symbol, decimals, chainId", async () => {
    const { data } = await axios.get(`${API_BASE}/tokens`, {
      params: { ...PARAMS, chains: "1" },
    });
    const ethTokens: Array<Record<string, unknown>> = data.tokens["1"];
    for (const token of ethTokens.slice(0, 20)) {
      expect(token).toHaveProperty("address");
      expect(token).toHaveProperty("symbol");
      expect(token).toHaveProperty("decimals");
      expect(token).toHaveProperty("chainId");
      expect(token["chainId"]).toBe(1);
    }
  });

  it("single token lookup returns USDC on Ethereum", async () => {
    const { data } = await axios.get(`${API_BASE}/token`, {
      params: { ...PARAMS, chain: "1", token: "USDC" },
    });
    expect(data.symbol).toBe("USDC");
    expect(data.chainId).toBe(1);
    expect(typeof data.address).toBe("string");
    expect(data.decimals).toBe(6);
  });

  it("single token lookup returns MATIC on Polygon", async () => {
    const { data } = await axios.get(`${API_BASE}/token`, {
      params: { ...PARAMS, chain: "137", token: "POL" },
    });
    expect(data.chainId).toBe(137);
    expect(typeof data.symbol).toBe("string");
    expect(typeof data.decimals).toBe("number");
  });
});
