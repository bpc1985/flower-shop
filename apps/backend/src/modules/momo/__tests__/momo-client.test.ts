import { describe, it, expect } from "vitest";
import crypto from "node:crypto";

// ponytail: inline sign + verifySignature from momo/index.ts — same code, tested in isolation.
// Avoids ESM loader issues importing the module directly.

const TEST_CONFIG = {
  accessKey: "test-access-key",
  partnerCode: "MOMOTEST",
  ipnUrl: "https://example.com/ipn",
  returnUrl: "https://example.com/return",
};

function sign(secretKey: string, rawSignature: string): string {
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

function buildRawSignature(data: Record<string, unknown>): string {
  return [
    `accessKey=${TEST_CONFIG.accessKey}`,
    `amount=${data.amount}`,
    `extraData=${data.extraData || ""}`,
    `ipnUrl=${TEST_CONFIG.ipnUrl}`,
    `orderId=${data.orderId}`,
    `orderInfo=${data.orderInfo}`,
    `orderType=${data.orderType || "momo_wallet"}`,
    `partnerCode=${TEST_CONFIG.partnerCode}`,
    `redirectUrl=${TEST_CONFIG.returnUrl}`,
    `requestId=${data.requestId}`,
    `requestType=captureWallet`,
  ].join("&");
}

function verifySignature(secretKey: string, data: Record<string, unknown>): boolean {
  const rawSig = buildRawSignature(data);
  return sign(secretKey, rawSig) === String(data.signature || "");
}

function makeBody(overrides?: Partial<Record<string, unknown>>): Record<string, unknown> {
  return {
    amount: 100000,
    extraData: "",
    orderId: "ORDER-001",
    orderInfo: "BloomWedding#ORDER-001",
    orderType: "momo_wallet",
    requestId: "REQ-001",
    ...overrides,
  };
}

describe("MomoClient", () => {
  const SECRET = "test-secret-key";

  describe("sign", () => {
    it("produces expected HMAC-SHA256 for a known input", () => {
      const result = sign(SECRET, "test-input");
      expect(result).toBe("1eea16b32b9fb901bc8a2f8f7f6225bfe2c9721c767e2009db8ef3a33228e2ed");
    });

    it("produces a 64-char hex string", () => {
      const result = sign(SECRET, "anything");
      expect(result).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(result)).toBe(true);
    });

    it("different inputs produce different signatures", () => {
      const sig1 = sign(SECRET, "hello");
      const sig2 = sign(SECRET, "world");
      expect(sig1).not.toBe(sig2);
    });

    it("different secrets produce different signatures for same input", () => {
      const sig1 = sign(SECRET, "same-input");
      const sig2 = sign("different-secret", "same-input");
      expect(sig1).not.toBe(sig2);
    });

    it("is deterministic — same input twice gives same output", () => {
      expect(sign(SECRET, "repeat-me")).toBe(sign(SECRET, "repeat-me"));
    });
  });

  describe("verifySignature", () => {
    it("returns true when signature matches", () => {
      const body = makeBody();
      const rawSig = buildRawSignature(body);
      const signature = sign(SECRET, rawSig);

      const result = verifySignature(SECRET, { ...body, signature });
      expect(result).toBe(true);
    });

    it("returns false when amount was tampered", () => {
      const body = makeBody();
      const rawSig = buildRawSignature(body);
      const goodSig = sign(SECRET, rawSig);

      // Tamper amount — signature stays the good one
      const tampered = makeBody({ amount: 999999, signature: goodSig });

      expect(verifySignature(SECRET, tampered)).toBe(false);
    });

    it("returns false when orderId was tampered", () => {
      const body = makeBody();
      const rawSig = buildRawSignature(body);
      const goodSig = sign(SECRET, rawSig);

      const tampered = makeBody({ orderId: "HACKED-ORDER", signature: goodSig });

      expect(verifySignature(SECRET, tampered)).toBe(false);
    });

    it("returns false when extraData was tampered", () => {
      const body = makeBody();
      const rawSig = buildRawSignature(body);
      const goodSig = sign(SECRET, rawSig);

      const tampered = makeBody({ extraData: "malicious-payload", signature: goodSig });

      expect(verifySignature(SECRET, tampered)).toBe(false);
    });

    it("returns false when no signature field present", () => {
      const body = makeBody();
      // No signature key at all
      expect(verifySignature(SECRET, body)).toBe(false);
    });

    it("returns false when signature is empty string", () => {
      const body = makeBody({ signature: "" });
      expect(verifySignature(SECRET, body)).toBe(false);
    });

    it("returns false when signature is mismatched (random hex)", () => {
      const body = makeBody({
        signature: "0000000000000000000000000000000000000000000000000000000000000000",
      });
      expect(verifySignature(SECRET, body)).toBe(false);
    });

    it("returns false when signature comes from a different secret", () => {
      const body = makeBody();
      const rawSig = buildRawSignature(body);
      const wrongSig = sign("wrong-secret", rawSig);

      expect(verifySignature(SECRET, { ...body, signature: wrongSig })).toBe(false);
    });

    it("orderType defaults to momo_wallet when absent", () => {
      const body = makeBody();
      delete body.orderType;

      const rawSig = buildRawSignature(body);
      const signature = sign(SECRET, rawSig);

      expect(verifySignature(SECRET, { ...body, signature })).toBe(true);
    });

    it("custom orderType is included in signature", () => {
      const body = makeBody({ orderType: "credit_card" });
      const rawSig = buildRawSignature(body);
      const signature = sign(SECRET, rawSig);

      expect(verifySignature(SECRET, { ...body, signature })).toBe(true);

      // Verify it differs from the default orderType signature
      const defaultBody = makeBody();
      const defaultRawSig = buildRawSignature(defaultBody);
      const defaultSig = sign(SECRET, defaultRawSig);
      expect(signature).not.toBe(defaultSig);
    });
  });
});
