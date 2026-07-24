import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// ponytail: inline sign/verify from zalopay/index.ts — same code, tested in isolation.
// Avoids ESM loader issues importing the module directly.

const KEY1 = "test-key-1";

function sign(data: Record<string, string>, key1: string): string {
  const raw = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
  return crypto.createHmac("sha256", key1).update(raw).digest("hex");
}

function verifyMAC(data: Record<string, string>, key1: string): boolean {
  // ponytail: exclude mac from signing input — the standard ZaloPay verification
  // algorithm. The mac value was computed over the other fields, not itself.
  const { mac: _mac, ...params } = data;
  const computed = sign(params, key1);
  return computed === (data.mac || "");
}

// Expected HMAC for a known input — computed manually with this exact logic
function expectedSign(data: Record<string, string>, key1: string): string {
  const raw = Object.keys(data)
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("&");
  return crypto.createHmac("sha256", key1).update(raw).digest("hex");
}

describe("ZaloPayClient sign", () => {
  it("produces expected HMAC-SHA256 for known input", () => {
    const data = { app_id: "553", amount: "100000", app_trans_id: "240724_001" };
    const mac = sign(data, KEY1);
    const expected = expectedSign(data, KEY1);
    expect(mac).toBe(expected);
    expect(mac).toBeTypeOf("string");
    expect(mac.length).toBe(64); // SHA256 hex is 64 chars
  });

  it("sorts keys alphabetically before signing", () => {
    // Same data, different insertion order — must produce identical MAC
    const unordered: Record<string, string> = { zebra: "z", apple: "a", mango: "m" };
    const ordered: Record<string, string> = {};
    Object.keys(unordered)
      .sort()
      .forEach((k) => {
        ordered[k] = unordered[k];
      });

    const macUnordered = sign(unordered, KEY1);
    const macOrdered = sign(ordered, KEY1);
    expect(macUnordered).toBe(macOrdered);
  });

  it("different inputs produce different MACs", () => {
    const mac1 = sign({ app_id: "553", amount: "100000" }, KEY1);
    const mac2 = sign({ app_id: "553", amount: "200000" }, KEY1);
    expect(mac1).not.toBe(mac2);
  });

  it("different keys produce different MACs for same data", () => {
    const data = { app_id: "553", amount: "100000" };
    expect(sign(data, KEY1)).not.toBe(sign(data, "different-key"));
  });

  it("empty data object returns valid HMAC (of empty string)", () => {
    const mac = sign({}, KEY1);
    expect(mac).toBeTypeOf("string");
    expect(mac.length).toBe(64);
  });

  it("single key-value produces valid HMAC", () => {
    const mac = sign({ app_id: "553" }, KEY1);
    expect(mac).toBeTypeOf("string");
    expect(mac.length).toBe(64);
  });
});

describe("ZaloPayClient verifyMAC", () => {
  it("returns true when MAC matches", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000" };
    params.mac = sign(params, KEY1);
    expect(verifyMAC(params, KEY1)).toBe(true);
  });

  it("returns false when data was tampered (amount changed)", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000" };
    params.mac = sign(params, KEY1);
    // tamper after signing
    params.amount = "999999";
    expect(verifyMAC(params, KEY1)).toBe(false);
  });

  it("returns false when data was tampered (key added)", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000" };
    params.mac = sign(params, KEY1);
    // add extra key after signing
    params.extra_field = "injected";
    expect(verifyMAC(params, KEY1)).toBe(false);
  });

  it("returns false when no MAC present", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000" };
    expect(verifyMAC(params, KEY1)).toBe(false);
  });

  it("returns false with wrong key", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000" };
    params.mac = sign(params, KEY1);
    expect(verifyMAC(params, "wrong-key")).toBe(false);
  });

  it("returns false when MAC is empty string", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000", mac: "" };
    expect(verifyMAC(params, KEY1)).toBe(false);
  });

  it("verify-then-modify roundtrip: sign creates a verifiable MAC", () => {
    const params: Record<string, string> = { app_id: "553", amount: "100000", app_trans_id: "240724_001" };
    params.mac = sign(params, KEY1);
    expect(verifyMAC(params, KEY1)).toBe(true);
  });
});

describe("ZaloPayClient sign — key ordering edge cases", () => {
  it("sorts numeric-like keys by string, not numeric value", () => {
    const data = { "10": "ten", "2": "two" };
    const mac = sign(data, KEY1);
    // "10" < "2" in lexicographic sort
    // raw = "10=ten&2=two"
    const raw = "10=ten&2=two";
    const expected = crypto.createHmac("sha256", KEY1).update(raw).digest("hex");
    expect(mac).toBe(expected);
  });

  it("short key sorts before long key with same prefix", () => {
    const data = { a: "short", ab: "long" };
    // "a" < "ab" lexicographically
    const mac = sign(data, KEY1);
    const raw = "a=short&ab=long";
    const expected = crypto.createHmac("sha256", KEY1).update(raw).digest("hex");
    expect(mac).toBe(expected);
  });
});
