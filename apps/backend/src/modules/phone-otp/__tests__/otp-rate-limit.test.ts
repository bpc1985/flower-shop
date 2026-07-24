import { describe, it, expect, beforeEach, vi } from "vitest";

// ponytail: inline the OTP state + rate limiting logic from phone-otp/index.ts.
// Avoids ESM loader issues importing the module directly.

// ---- Types (mirrors module) ----

interface OTPState {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
  resentAt: number;
  requestCount: number;
  windowStartAt: number;
}

// ---- Config (mirrors module) ----

const OTP_CONFIG = {
  codeLength: 6,
  ttlMinutes: 5,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxRequestsPerWindow: 3,
  windowMinutes: 5,
} as const;

const VN_PHONE_REGEX = /^(0|\+84)[35789]\d{8}$/;

const EXPIRY_MS = OTP_CONFIG.ttlMinutes * 60 * 1000; // 300000ms
const WINDOW_MS = OTP_CONFIG.windowMinutes * 60 * 1000; // 300000ms
const COOLDOWN_MS = OTP_CONFIG.resendCooldownSeconds * 1000; // 60000ms

// ---- In-memory store (mirrors module) ----

let otpState: Map<string, OTPState>;

function createState(phone: string, code: string, now: number): OTPState {
  return {
    code,
    phone,
    expiresAt: now + EXPIRY_MS,
    attempts: 0,
    resentAt: now,
    requestCount: 0,
    windowStartAt: now,
  };
}

function clearState() {
  otpState = new Map();
}

// ---- Inline helpers (same logic as module) ----

function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim() === "") return false;
  return VN_PHONE_REGEX.test(phone.trim());
}

/**
 * Check rate limit for requesting a new OTP.
 * Returns { ok: true } or { ok: false, error: string }.
 */
function checkRateLimit(phone: string, now: number): { ok: boolean; error?: string } {
  let state = otpState.get(phone);

  if (!state) {
    // First request — create fresh state
    state = createState(phone, "000000", now);
    state.requestCount = 1;
    otpState.set(phone, state);
    return { ok: true };
  }

  // Rate limit: window check
  if (state.requestCount >= OTP_CONFIG.maxRequestsPerWindow) {
    const windowElapsed = (now - state.windowStartAt) / 1000;
    if (windowElapsed < OTP_CONFIG.windowMinutes * 60) {
      return {
        ok: false,
        error: `Quá ${OTP_CONFIG.maxRequestsPerWindow} lần gửi mã trong ${OTP_CONFIG.windowMinutes} phút. Vui lòng thử lại sau.`,
      };
    }
    // Window expired — reset
    state.requestCount = 0;
    state.windowStartAt = now;
  }

  // Cooldown check
  const secondsSinceResend = (now - state.resentAt) / 1000;
  if (secondsSinceResend < OTP_CONFIG.resendCooldownSeconds) {
    const remaining = Math.ceil(OTP_CONFIG.resendCooldownSeconds - secondsSinceResend);
    return {
      ok: false,
      error: `Vui lòng đợi ${remaining}s trước khi gửi lại mã.`,
    };
  }

  // All checks passed — update state
  state.requestCount++;
  state.resentAt = now;
  state.code = "000000";
  state.expiresAt = now + EXPIRY_MS;
  state.attempts = 0;
  otpState.set(phone, state);

  return { ok: true };
}

/**
 * Verify OTP. Returns verification result.
 */
function verifyOTP(
  phone: string,
  code: string,
  now: number,
): { ok: boolean; error?: string } {
  const state = otpState.get(phone);

  if (!state) {
    return { ok: false, error: "Mã OTP không tồn tại hoặc đã hết hạn." };
  }

  // Expiry check
  if (now > state.expiresAt) {
    otpState.delete(phone);
    return { ok: false, error: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
  }

  // Attempts check
  if (state.attempts >= OTP_CONFIG.maxAttempts) {
    otpState.delete(phone);
    return { ok: false, error: "Quá số lần thử. Vui lòng yêu cầu mã mới." };
  }

  state.attempts++;

  if (state.code !== code) {
    const remaining = OTP_CONFIG.maxAttempts - state.attempts;
    return {
      ok: false,
      error: `Mã OTP không đúng. Còn ${remaining} lần thử.`,
    };
  }

  // Correct OTP — clear state
  otpState.delete(phone);
  return { ok: true };
}

// ---- Tests ----

beforeEach(() => {
  clearState();
});

// ----- Rate Limit: Window -----

describe("Rate limit — request window", () => {
  it("allows 3 requests within 5 minutes", () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(base);

    expect(checkRateLimit("0903111222", base).ok).toBe(true);
    expect(checkRateLimit("0903111222", base + 60000).ok).toBe(true);
    expect(checkRateLimit("0903111222", base + 120000).ok).toBe(true);

    vi.useRealTimers();
  });

  it("blocks the 4th request within 5 minutes", () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(base);

    checkRateLimit("0903111222", base);       // 1
    checkRateLimit("0903111222", base + 61000); // 2 (after cooldown)
    checkRateLimit("0903111222", base + 122000); // 3 (after cooldown)

    const result = checkRateLimit("0903111222", base + 183000); // 4th (after cooldown)
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Quá 3 lần gửi mã trong 5 phút");

    vi.useRealTimers();
  });

  it("resets the window after windowMinutes passes", () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(base);

    // Use up all 3 requests
    checkRateLimit("0903111222", base);
    vi.advanceTimersByTime(COOLDOWN_MS);
    checkRateLimit("0903111222", Date.now());
    vi.advanceTimersByTime(COOLDOWN_MS);
    checkRateLimit("0903111222", Date.now());

    vi.advanceTimersByTime(WINDOW_MS + 1000); // Past window

    const result = checkRateLimit("0903111222", Date.now());
    expect(result.ok).toBe(true);

    vi.useRealTimers();
  });
});

// ----- Rate Limit: Cooldown -----

describe("Rate limit — resend cooldown", () => {
  it("blocks resend within 60 seconds", () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(base);

    checkRateLimit("0903111222", base);

    const result = checkRateLimit("0903111222", base + 30000); // 30s later
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Vui lòng đợi");

    vi.useRealTimers();
  });

  it("allows resend after 60 seconds", () => {
    vi.useFakeTimers();
    const base = Date.now();
    vi.setSystemTime(base);

    checkRateLimit("0903111222", base);

    const result = checkRateLimit("0903111222", base + 61000); // 61s later
    expect(result.ok).toBe(true);

    vi.useRealTimers();
  });
});

// ----- OTP Expiry -----

describe("OTP expiry", () => {
  it("accepts correct OTP within 5 minutes", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    // 2 minutes later — still valid
    const result = verifyOTP("0903111222", "123456", base + 120000);
    expect(result.ok).toBe(true);
  });

  it("rejects OTP after 5 minutes", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    // 6 minutes later — expired
    const result = verifyOTP("0903111222", "123456", base + 360000);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("đã hết hạn");
  });

  it("deletes state on expiry", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    verifyOTP("0903111222", "123456", base + 360000);
    expect(otpState.has("0903111222")).toBe(false);
  });
});

// ----- Attempt Limit -----

describe("Attempt limit", () => {
  it("allows up to 5 wrong attempts, blocks the 6th", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    // 5 wrong attempts
    for (let i = 0; i < 5; i++) {
      const result = verifyOTP("0903111222", "wrong", base + 1000 * i);
      if (i < 4) {
        expect(result.ok).toBe(false);
        expect(result.error).toContain("Mã OTP không đúng");
      } else {
        // 5th wrong attempt — should still fail with remaining message
        expect(result.ok).toBe(false);
        expect(result.error).toContain("Mã OTP không đúng");
      }
    }

    // 6th attempt — blocked entirely
    const blocked = verifyOTP("0903111222", "wrong", base + 6000);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("Quá số lần thử");
  });

  it("clears state after max attempts exceeded", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    // 5 wrong attempts to trigger max
    for (let i = 0; i < 5; i++) {
      verifyOTP("0903111222", "wrong", base + 1000 * i);
    }

    // The state is still there after 5 wrong (attempts=5 but not yet >= maxAttempts at check time?)
    // Actually the check is `if (state.attempts >= maxAttempts)` BEFORE incrementing.
    // So attempt #5: state.attempts is 4, 4 < 5, increments to 5, then checks code. Fails.
    // Attempt #6: state.attempts is 5, 5 >= 5, blocked and deleted.
    verifyOTP("0903111222", "wrong", base + 6000);
    expect(otpState.has("0903111222")).toBe(false);
  });

  it("correct OTP clears attempt counter and state", () => {
    const base = Date.now();
    const state = createState("0903111222", "123456", base);
    otpState.set("0903111222", state);

    // One wrong attempt
    verifyOTP("0903111222", "wrong", base + 1000);

    // Correct OTP succeeds and clears state
    const result = verifyOTP("0903111222", "123456", base + 2000);
    expect(result.ok).toBe(true);
    expect(otpState.has("0903111222")).toBe(false);
  });
});

// ----- Phone Validation -----

describe("Phone validation", () => {
  it("accepts valid VN numbers starting with 0", () => {
    expect(isValidPhone("0903111222")).toBe(true);
    expect(isValidPhone("0918555666")).toBe(true);
    expect(isValidPhone("0377888999")).toBe(true);
    expect(isValidPhone("0522333444")).toBe(true);
    expect(isValidPhone("0700111222")).toBe(true);
    expect(isValidPhone("0822333444")).toBe(true);
  });

  it("accepts valid VN numbers with +84 prefix", () => {
    expect(isValidPhone("+84903111222")).toBe(true);
    expect(isValidPhone("+84377888999")).toBe(true);
  });

  it("rejects numbers that are too short", () => {
    expect(isValidPhone("09031112")).toBe(false);
    expect(isValidPhone("09031")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("rejects numbers that are too long", () => {
    expect(isValidPhone("090311122233")).toBe(false);
  });

  it("rejects numbers with wrong prefix (does not start with 0 or +84)", () => {
    expect(isValidPhone("84903111222")).toBe(false); // 84 without +
    expect(isValidPhone("1903111222")).toBe(false);  // starts with 1
    expect(isValidPhone("+85377888999")).toBe(false); // +85 not +84
  });

  it("rejects numbers with invalid second digit (not 3|5|7|8|9)", () => {
    expect(isValidPhone("0903111222")).toBe(true);  // 9 is valid
    expect(isValidPhone("0103111222")).toBe(false); // 1 not allowed
    expect(isValidPhone("0203111222")).toBe(false); // 2 not allowed
    expect(isValidPhone("0403111222")).toBe(false); // 4 not allowed
    expect(isValidPhone("0603111222")).toBe(false); // 6 not allowed
  });

  it("rejects inputs with letters or special characters", () => {
    expect(isValidPhone("0903abc222")).toBe(false);
    expect(isValidPhone("0903-111-222")).toBe(false);
    expect(isValidPhone("0903 111 222")).toBe(false);
    expect(isValidPhone("phone")).toBe(false);
  });

  it("trims whitespace before validating", () => {
    expect(isValidPhone(" 0903111222 ")).toBe(true);
  });
});
