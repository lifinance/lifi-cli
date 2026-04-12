import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";

const API_BASE = "https://li.quest/v1";
const PARAMS = { integrator: "lifi-cli" };

const shouldRun = process.env["INTEGRATION"] === "1";

describe.skipIf(!shouldRun)("tools — integration (live API)", () => {
  let bridges: Array<{ key: string; name: string }>;
  let exchanges: Array<{ key: string; name: string }>;

  beforeAll(async () => {
    const { data } = await axios.get(`${API_BASE}/tools`, { params: PARAMS });
    bridges = data.bridges;
    exchanges = data.exchanges;
  });

  it("returns bridges and exchanges arrays", () => {
    expect(Array.isArray(bridges)).toBe(true);
    expect(Array.isArray(exchanges)).toBe(true);
    expect(bridges.length).toBeGreaterThan(0);
    expect(exchanges.length).toBeGreaterThan(0);
  });

  it("every bridge has key and name", () => {
    for (const bridge of bridges) {
      expect(typeof bridge.key).toBe("string");
      expect(typeof bridge.name).toBe("string");
      expect(bridge.key.length).toBeGreaterThan(0);
    }
  });

  it("every exchange has key and name", () => {
    for (const exchange of exchanges) {
      expect(typeof exchange.key).toBe("string");
      expect(typeof exchange.name).toBe("string");
      expect(exchange.key.length).toBeGreaterThan(0);
    }
  });

  it("filtering by chain returns a subset", async () => {
    const { data } = await axios.get(`${API_BASE}/tools`, {
      params: { ...PARAMS, chains: "1" },
    });
    // Ethereum-only tools should be <= total tools
    expect(data.bridges.length).toBeLessThanOrEqual(bridges.length);
    expect(data.exchanges.length).toBeLessThanOrEqual(exchanges.length);
    // Should still return some tools for Ethereum
    expect(data.bridges.length + data.exchanges.length).toBeGreaterThan(0);
  });

  it('known bridges like "stargate" are present', () => {
    const keys = bridges.map((b) => b.key);
    // stargate is a well-known bridge that should always be present
    expect(keys.some((k) => k.toLowerCase().includes("stargate"))).toBe(true);
  });
});
