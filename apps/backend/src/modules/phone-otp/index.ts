import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import { randomInt } from "node:crypto";
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/framework/types";

// ---------------------------------------------------------------------------
// Phone OTP Auth Provider — Medusa custom module
// Dev mode: logs OTP to console. Production: ESMS > SpeedSMS.
// ---------------------------------------------------------------------------

// ---- Types ----

interface OTPState {
  code: string;
  phone: string;
  expiresAt: number;
  attempts: number;
  resentAt: number;
  requestCount: number;
  windowStartAt: number;
}

interface SMSProvider {
  sendOTP(phone: string, code: string): Promise<{ success: boolean; provider: string }>;
}

const OTP_CONFIG = {
  codeLength: 6,
  ttlMinutes: 5,
  maxAttempts: 5,
  resendCooldownSeconds: 60,
  maxRequestsPerWindow: 3,
  windowMinutes: 5,
} as const;

const VN_PHONE_REGEX = /^(0|\+84)[35789]\d{8}$/;

// ---- Dev SMS ----

let devLogger: { info(msg: string, meta?: Record<string, unknown>): void } | null = null;

try {
  const m = require("../../lib/logger");
  devLogger = m.logger;
} catch {
  // Fallback: log to console only
}

class DevSMSProvider implements SMSProvider {
  async sendOTP(phone: string, code: string) {
    const log = devLogger || console;
    log.info(`[DEV SMS] OTP for ${phone}: ${code}`, { phone, code });
    console.log(`\n========================================`);
    console.log(`[DEV SMS] OTP for ${phone}: ${code}`);
    console.log(`========================================\n`);
    return { success: true, provider: "dev-sms" };
  }
}

// ---- ESMS Client ----

class ESMSClient implements SMSProvider {
  constructor(
    private apiKey: string,
    private secretKey: string,
  ) {}

  private normalizePhone(phone: string): string {
    if (phone.startsWith("+84")) return phone.slice(1);
    if (phone.startsWith("0")) return `84${phone.slice(1)}`;
    return phone;
  }

  async sendOTP(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const response = await fetch(
      "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ApiKey: this.apiKey,
          SecretKey: this.secretKey,
          Phone: normalizedPhone,
          Content: `Ma xac thuc Bloom Wedding: ${code}. Het han sau 5 phut.`,
          SmsType: "2",
          Brandname: "BloomWedding",
        }),
      },
    );

    const result = await response.json();
    if (result.CodeResult !== "100") {
      throw new Error(`ESMS error: ${result.ErrorMessage}`);
    }

    return { success: true, provider: "esms" };
  }
}

// ---- SpeedSMS Client ----

class SpeedSMSClient implements SMSProvider {
  constructor(
    private apiKey: string,
    private senderId: string,
  ) {}

  private normalizePhone(phone: string): string {
    if (phone.startsWith("+84")) return phone.slice(1);
    if (phone.startsWith("0")) return `84${phone.slice(1)}`;
    return phone;
  }

  async sendOTP(phone: string, code: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = `Basic ${Buffer.from(`${this.apiKey}:x`).toString("base64")}`;
    }

    const response = await fetch("https://api.speedsms.vn/index.php/sms/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: [normalizedPhone],
        content: `Ma xac thuc Bloom Wedding: ${code}. Het han sau 5 phut.`,
        sms_type: "2",
        sender: this.senderId,
      }),
    });

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(`SpeedSMS error: ${result.message}`);
    }

    return { success: true, provider: "speedsms" };
  }
}

// ---- OTP helpers ----

function generateOTP(): string {
  return randomInt(100000, 1000000).toString();
}

// ---- Auth Provider ----

import { AbstractAuthModuleProvider } from "@medusajs/framework/utils";

class PhoneOTPAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "phone-otp";
  static DISPLAY_NAME = "Phone OTP";

  private smsProvider: SMSProvider;

  constructor() {
    super();

    if (process.env.ESMS_API_KEY && process.env.ESMS_SECRET_KEY) {
      this.smsProvider = new ESMSClient(process.env.ESMS_API_KEY, process.env.ESMS_SECRET_KEY);
    } else if (process.env.SPEEDSMS_API_KEY && process.env.SPEEDSMS_SENDER_ID) {
      this.smsProvider = new SpeedSMSClient(process.env.SPEEDSMS_API_KEY, process.env.SPEEDSMS_SENDER_ID);
    } else {
      this.smsProvider = new DevSMSProvider();
    }
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService,
  ): Promise<AuthenticationResponse> {
    const phone = data.body?.phone;
    if (!phone) {
      return { success: false, error: "Số điện thoại không được để trống." };
    }

    if (!VN_PHONE_REGEX.test(phone)) {
      return { success: false, error: "Số điện thoại không hợp lệ." };
    }

    const stateKey = `otp:${phone}`;
    const existing = await authIdentityProviderService.getState(stateKey);
    const state: OTPState | null = existing as OTPState | null;
    const now = Date.now();

    if (state) {
      const windowMs = OTP_CONFIG.windowMinutes * 60 * 1000;
      if (now - state.windowStartAt < windowMs && state.requestCount >= OTP_CONFIG.maxRequestsPerWindow) {
        return {
          success: false,
          error: `Quá ${OTP_CONFIG.maxRequestsPerWindow} lần gửi mã trong ${OTP_CONFIG.windowMinutes} phút. Vui lòng thử lại sau.`,
        };
      }

      const cooldownMs = OTP_CONFIG.resendCooldownSeconds * 1000;
      if (now - state.resentAt < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - (now - state.resentAt)) / 1000);
        return {
          success: false,
          error: `Vui lòng đợi ${remaining}s trước khi gửi lại mã.`,
        };
      }
    }

    const code = generateOTP();
    const ttlMs = OTP_CONFIG.ttlMinutes * 60 * 1000;
    const newWindowStartAt =
      !state || now - state.windowStartAt >= OTP_CONFIG.windowMinutes * 60 * 1000
        ? now
        : state.windowStartAt;

    const newState: OTPState = {
      code,
      phone,
      expiresAt: now + ttlMs,
      attempts: 0,
      resentAt: now,
      requestCount: state ? state.requestCount + 1 : 1,
      windowStartAt: newWindowStartAt,
    };

    try {
      const result = await this.smsProvider.sendOTP(phone, code);
      if (!result.success) {
        return { success: false, error: "Không thể gửi mã OTP. Vui lòng thử lại sau." };
      }
    } catch (err) {
      return { success: false, error: "Không thể gửi mã OTP. Vui lòng thử lại sau." };
    }

    await authIdentityProviderService.setState(stateKey, newState as unknown as Record<string, unknown>);

    return { success: true, location: `/auth/customer/phone-otp/callback?phone=${encodeURIComponent(phone)}` };
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService,
  ): Promise<AuthenticationResponse> {
    const phone = data.body?.phone;
    const code = data.body?.code;

    if (!phone || !code) {
      return { success: false, error: "Thiếu số điện thoại hoặc mã OTP." };
    }

    const stateKey = `otp:${phone}`;
    const existing = await authIdentityProviderService.getState(stateKey);
    const state: OTPState | null = existing as OTPState | null;

    if (!state) {
      return { success: false, error: "Mã OTP không tồn tại hoặc đã hết hạn." };
    }

    if (Date.now() > state.expiresAt) {
      return { success: false, error: "Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới." };
    }

    if (state.attempts >= OTP_CONFIG.maxAttempts) {
      return { success: false, error: "Quá số lần thử. Vui lòng yêu cầu mã mới." };
    }

    if (state.code !== code) {
      state.attempts++;
      await authIdentityProviderService.setState(stateKey, state as unknown as Record<string, unknown>);
      return {
        success: false,
        error: `Mã OTP không đúng. Còn ${OTP_CONFIG.maxAttempts - state.attempts} lần thử.`,
      };
    }

    // Clean up OTP state after successful verification
    await authIdentityProviderService.setState(stateKey, null as unknown as Record<string, unknown>);

    try {
      const identity = await authIdentityProviderService.retrieve({ entity_id: phone });
      return { success: true, authIdentity: identity };
    } catch {
      const identity = await authIdentityProviderService.create({
        entity_id: phone,
        user_metadata: { phone },
      });
      return { success: true, authIdentity: identity };
    }
  }

  async register(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService,
  ): Promise<AuthenticationResponse> {
    const phone = data.body?.phone;
    if (!phone) {
      return { success: false, error: "Số điện thoại không được để trống." };
    }

    if (!VN_PHONE_REGEX.test(phone)) {
      return { success: false, error: "Số điện thoại không hợp lệ." };
    }

    try {
      await authIdentityProviderService.retrieve({ entity_id: phone });
      return { success: false, error: "Số điện thoại này đã được đăng ký." };
    } catch {
      // Identity doesn't exist — go ahead
    }

    const identity = await authIdentityProviderService.create({
      entity_id: phone,
      user_metadata: { phone },
    });

    return { success: true, authIdentity: identity };
  }
}

// ---- Module export ----

const services = [PhoneOTPAuthProvider];
export default ModuleProvider(Modules.AUTH, { services });
