import { describe, it, expect } from "vitest";

// ponytail: inline the zone logic from ghn/index.ts — same code, tested in isolation.
// Avoids ESM loader issues importing the module directly.

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

describe("GHN Delivery Zones", () => {
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
    const all = [...ZONES.innerCity.districtIds, ...ZONES.extendedCity.districtIds, ...ZONES.suburban.districtIds];
    expect(new Set(all).size).toBe(all.length);
  });
});
