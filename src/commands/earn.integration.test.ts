import { beforeAll, describe, expect, it } from "vitest";
import { earnApi } from "../core/http-client.js";

const shouldRun = process.env["INTEGRATION"] === "1";

describe.skipIf(!shouldRun)("earn — integration (live API)", () => {
  let chains: Array<Record<string, unknown>>;
  let protocols: Array<Record<string, unknown>>;
  let vaults: Array<Record<string, unknown>>;
  let positions: Array<Record<string, unknown>>;

  beforeAll(async () => {
    const [chainsResponse, protocolsResponse, vaultsResponse, positionsResponse] = await Promise.all([
      earnApi.get("/chains"),
      earnApi.get("/protocols"),
      earnApi.get("/vaults", {
        params: { limit: 10, sortBy: "apy" },
      }),
      earnApi.get("/portfolio/0xFCd7c4ff5b124c9A73A53ea9F03BE43aC5BFb632/positions"),
    ]);

    const positionsData = positionsResponse.data;

    chains = chainsResponse.data;
    protocols = protocolsResponse.data;
    vaults = vaultsResponse.data.data;
    positions = positionsData.positions;
  });

  it("returns supported Earn chains", () => {
    expect(Array.isArray(chains)).toBe(true);
    expect(chains.length).toBeGreaterThan(0);

    for (const chain of chains) {
      expect(typeof chain["chainId"]).toBe("number");
      expect(typeof chain["name"]).toBe("string");
    }
  });

  it("returns supported Earn protocols", () => {
    expect(Array.isArray(protocols)).toBe(true);
    expect(protocols.length).toBeGreaterThan(0);

    for (const protocol of protocols) {
      expect(typeof protocol["name"]).toBe("string");
      expect((protocol["name"] as string).length).toBeGreaterThan(0);
    }
  });

  it("returns Earn vaults with required display fields", () => {
    expect(Array.isArray(vaults)).toBe(true);
    expect(vaults.length).toBeGreaterThan(0);

    for (const vault of vaults) {
      expect(typeof vault["chainId"]).toBe("number");
      expect(typeof vault["protocol"]).toBe("object");
      expect(vault["name"] || vault["slug"]).toBeTruthy();
    }
  });

  it("returns wallet Earn positions by address", () => {
    expect(Array.isArray(positions)).toBe(true);

    if (positions.length === 0) {
      expect(positions).toEqual([]);
      return;
    }

    const position = positions[0];
    expect(typeof position["chainId"]).toBe("number");
    expect(typeof position["address"]).toBe("string");
    expect(typeof position["protocolName"]).toBe("string");
    expect(typeof position["balanceUsd"]).toBe("string");
    expect(typeof position["balanceNative"]).toBe("string");
  });

  it("returns one Earn vault by chain ID and address", async () => {
    const vault = vaults.find((item) => typeof item["chainId"] === "number" && typeof item["address"] === "string");

    expect(vault).toBeDefined();

    const { data } = await earnApi.get(`/vaults/${vault?.["chainId"]}/${vault?.["address"]}`);

    expect(data.chainId).toBe(vault?.["chainId"]);
    expect(data.address).toBe(vault?.["address"]);
    expect(data.name || data.slug).toBeTruthy();
  });
});
