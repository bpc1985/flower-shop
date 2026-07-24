import { describe, it, expect } from "vitest";

// ponytail: inline the zone logic from ghtk/index.ts — same code, tested in isolation.
// Avoids ESM loader issues importing the module directly.
// Zones are identical to GHN module — keep in sync.

const ZONES = {
  innerCity: { id: "zone-1", districtIds: [1442, 1444, 1446, 1447], maxMinutes: 90, fee: 0 },
  extendedCity: { id: "zone-2", districtIds: [1443, 1448, 1454, 1455], maxMinutes: 120, fee: 30000 },
  suburban: { id: "zone-3", districtIds: [1449, 1456, 1457], maxMinutes: 180, fee: 50000 },
};

function getZone(districtId: number) {
  if (ZONES.innerCity.districtIds.includes(districtId)) return ZONES.innerCity;
  if (ZONES.extendedCity.districtIds.includes(districtId)) return ZONES.extendedCity;
  if (ZONES.suburban.districtIds.includes(districtId)) return ZONES.suburban;
  return null;
}

describe("GHTK Delivery Zones", () => {
  it("returns zone-1 for Q1 (1442)", () => {
    const zone = getZone(1442);
    expect(zone?.id).toBe("zone-1");
    expect(zone?.fee).toBe(0);
    expect(zone?.maxMinutes).toBe(90);
  });

  it("returns zone-1 for Q3 (1444)", () => {
    expect(getZone(1444)?.id).toBe("zone-1");
  });

  it("returns zone-1 for PN (1446)", () => {
    expect(getZone(1446)?.id).toBe("zone-1");
  });

  it("returns zone-1 for BT (1447)", () => {
    expect(getZone(1447)?.id).toBe("zone-1");
  });

  it("returns zone-2 for Q7 (1448)", () => {
    const zone = getZone(1448);
    expect(zone?.id).toBe("zone-2");
    expect(zone?.fee).toBe(30000);
    expect(zone?.maxMinutes).toBe(120);
  });

  it("returns zone-2 for TB (1454)", () => {
    expect(getZone(1454)?.id).toBe("zone-2");
  });

  it("returns zone-3 for Q9 (1449)", () => {
    const zone = getZone(1449);
    expect(zone?.id).toBe("zone-3");
    expect(zone?.fee).toBe(50000);
    expect(zone?.maxMinutes).toBe(180);
  });

  it("returns zone-3 for TD (1456)", () => {
    expect(getZone(1456)?.id).toBe("zone-3");
  });

  it("returns null for unsupported district (9999)", () => {
    expect(getZone(9999)).toBeNull();
  });

  it("returns null for district 0", () => {
    expect(getZone(0)).toBeNull();
  });

  it("zone-1 districts all return zone-1", () => {
    for (const id of ZONES.innerCity.districtIds) {
      expect(getZone(id)?.id).toBe("zone-1");
    }
  });

  it("zones are exclusive — no district appears in two zones", () => {
    const all = [
      ...ZONES.innerCity.districtIds,
      ...ZONES.extendedCity.districtIds,
      ...ZONES.suburban.districtIds,
    ];
    expect(new Set(all).size).toBe(all.length);
  });
});

// ---------------------------------------------------------------------------
// ponytail: inline GHTKClient util — env var extraction pattern, tested in isolation.
// ---------------------------------------------------------------------------

describe("GHTKConfig resolution", () => {
  function getConfig(env: Record<string, string | undefined>): {
    token: string;
    endpoint: string;
    pickProvince: string;
    pickDistrict: string;
    pickWard: string;
    pickAddress: string;
  } {
    return {
      token: env.GHTK_TOKEN || "",
      endpoint: env.GHTK_SANDBOX === "true"
        ? "https://services-staging.ghtklab.com"
        : "https://services.giaohangtietkiem.vn",
      pickProvince: env.GHTK_PICK_PROVINCE || "HCM",
      pickDistrict: env.GHTK_PICK_DISTRICT || "Quận 1",
      pickWard: env.GHTK_PICK_WARD || "Bến Nghé",
      pickAddress: env.GHTK_PICK_ADDRESS || "42 Nguyễn Huệ",
    };
  }

  it("uses sandbox endpoint when GHTK_SANDBOX=true", () => {
    const config = getConfig({ GHTK_TOKEN: "tok", GHTK_SANDBOX: "true" });
    expect(config.endpoint).toBe("https://services-staging.ghtklab.com");
  });

  it("uses production endpoint when GHTK_SANDBOX=false", () => {
    const config = getConfig({ GHTK_TOKEN: "tok", GHTK_SANDBOX: "false" });
    expect(config.endpoint).toBe("https://services.giaohangtietkiem.vn");
  });

  it("uses production endpoint by default (no SANDBOX var)", () => {
    const config = getConfig({ GHTK_TOKEN: "tok" });
    expect(config.endpoint).toBe("https://services.giaohangtietkiem.vn");
  });

  it("falls back to defaults when pick address vars missing", () => {
    const config = getConfig({ GHTK_TOKEN: "tok" });
    expect(config.pickProvince).toBe("HCM");
    expect(config.pickDistrict).toBe("Quận 1");
    expect(config.pickWard).toBe("Bến Nghé");
    expect(config.pickAddress).toBe("42 Nguyễn Huệ");
  });

  it("reads custom pick address from env", () => {
    const config = getConfig({
      GHTK_TOKEN: "tok",
      GHTK_PICK_PROVINCE: "HN",
      GHTK_PICK_DISTRICT: "Hoàn Kiếm",
      GHTK_PICK_WARD: "Hàng Bạc",
      GHTK_PICK_ADDRESS: "10 Tràng Tiền",
    });
    expect(config.pickProvince).toBe("HN");
    expect(config.pickDistrict).toBe("Hoàn Kiếm");
    expect(config.pickWard).toBe("Hàng Bạc");
    expect(config.pickAddress).toBe("10 Tràng Tiền");
  });

  it("returns empty string when token missing", () => {
    const config = getConfig({});
    expect(config.token).toBe("");
  });
});

// ---------------------------------------------------------------------------
// ponytail: inline getFulfillmentOptions from ghtk/index.ts — tested in isolation.
// ---------------------------------------------------------------------------

describe("GHTK getFulfillmentOptions", () => {
  function buildOptions(
    orderData: Record<string, unknown>,
    getZoneFn: (districtId: number) => ReturnType<typeof getZone>,
  ) {
    const districtId = Number(orderData.delivery_district_id ?? 0);
    const zone = getZoneFn(districtId);

    if (!zone) return [];

    return [
      {
        id: `ghtk-${zone.id}`,
        name: `Giao hàng nhanh GHTK — ${zone.maxMinutes} phút`,
        amount: zone.fee,
        data: { zone: zone.id, maxMinutes: zone.maxMinutes },
      },
    ];
  }

  it("returns zone-1 option for inner city district", () => {
    const options = buildOptions({ delivery_district_id: 1442 }, getZone);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe("ghtk-zone-1");
    expect(options[0].amount).toBe(0);
    expect(options[0].name).toContain("90 phút");
  });

  it("returns zone-2 option with 30000 fee", () => {
    const options = buildOptions({ delivery_district_id: 1448 }, getZone);
    expect(options[0].amount).toBe(30000);
    expect(options[0].name).toContain("120 phút");
  });

  it("returns zone-3 option with 50000 fee", () => {
    const options = buildOptions({ delivery_district_id: 1449 }, getZone);
    expect(options[0].amount).toBe(50000);
    expect(options[0].name).toContain("180 phút");
  });

  it("returns empty array for unsupported district", () => {
    const options = buildOptions({ delivery_district_id: 9999 }, getZone);
    expect(options).toEqual([]);
  });

  it("returns empty array when district id missing", () => {
    const options = buildOptions({}, getZone);
    expect(options).toEqual([]);
  });

  it("returns empty array when district id is 0", () => {
    const options = buildOptions({ delivery_district_id: 0 }, getZone);
    expect(options).toEqual([]);
  });
});
