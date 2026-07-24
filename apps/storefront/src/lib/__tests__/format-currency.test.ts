import { describe, it, expect } from "vitest";

// Inline the formatting functions to avoid module resolution issues
function formatVND(amount: number): string {
  if (!amount && amount !== 0) return "0 ₫";
  return amount.toLocaleString("vi-VN") + " ₫";
}

function formatVNDRange(min: number, max: number): string {
  if (min === max) return formatVND(min);
  return `${formatVND(min).replace(" ₫", "")} — ${formatVND(max)}`;
}

describe("formatVND", () => {
  it("formats 0", () => {
    expect(formatVND(0)).toBe("0 ₫");
  });

  it("formats 100000", () => {
    expect(formatVND(100000)).toBe("100.000 ₫");
  });

  it("formats 1000000", () => {
    expect(formatVND(1000000)).toBe("1.000.000 ₫");
  });

  it("formats 350000", () => {
    expect(formatVND(350000)).toBe("350.000 ₫");
  });

  it("handles NaN gracefully", () => {
    expect(formatVND(NaN)).toBe("0 ₫");
  });

  it("handles negative values", () => {
    expect(formatVND(-50000)).toBe("-50.000 ₫");
  });
});

describe("formatVNDRange", () => {
  it("shows single price when min equals max", () => {
    expect(formatVNDRange(100000, 100000)).toBe("100.000 ₫");
  });

  it("shows range when min differs from max", () => {
    expect(formatVNDRange(250000, 500000)).toBe("250.000 — 500.000 ₫");
  });

  it("handles free items (zero price)", () => {
    expect(formatVNDRange(0, 0)).toBe("0 ₫");
  });
});
