import axios from "axios";
import { beforeAll, describe, expect, it } from "vitest";

const API_BASE = "https://li.quest/v1";
const PARAMS = { integrator: "lifi-cli" };

const shouldRun = process.env["INTEGRATION"] === "1";

describe.skipIf(!shouldRun)("chains — integration (live API)", () => {
  let chains: Array<{
    id: number;
    name: string;
    key: string;
    chainType: string;
    nativeToken: { symbol: string };
    mainnet: boolean;
  }>;

  beforeAll(async () => {
    const { data } = await axios.get(`${API_BASE}/chains`, { params: PARAMS });
    chains = data.chains;
  });

  it("returns a non-empty array of chains", () => {
    expect(Array.isArray(chains)).toBe(true);
    expect(chains.length).toBeGreaterThan(0);
  });

  it("every chain has required fields", () => {
    for (const chain of chains) {
      expect(chain).toHaveProperty("id");
      expect(chain).toHaveProperty("name");
      expect(chain).toHaveProperty("key");
      expect(chain).toHaveProperty("chainType");
      expect(chain).toHaveProperty("nativeToken");
      expect(chain.nativeToken).toHaveProperty("symbol");
    }
  });

  it("includes Ethereum (id=1) and Polygon (id=137)", () => {
    const ids = chains.map((c) => c.id);
    expect(ids).toContain(1);
    expect(ids).toContain(137);
  });

  it("chainType is one of the known types", () => {
    const known = new Set(["EVM", "SVM", "UTXO", "MVM"]);
    for (const chain of chains) {
      expect(known.has(chain.chainType)).toBe(true);
    }
  });
});
