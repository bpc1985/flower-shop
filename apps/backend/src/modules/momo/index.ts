import { AbstractPaymentProvider, PaymentActions, ModuleProvider, Modules } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Momo Payment Provider — Medusa 2.17 custom module
// Sandbox: https://test-payment.momo.vn
// Requires MOMO_PARTNER_CODE + MOMO_ACCESS_KEY + MOMO_SECRET_KEY to activate
// ---------------------------------------------------------------------------

interface MomoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  publicKey: string;
  endpoint: string;
  returnUrl: string;
  ipnUrl: string;
}

class MomoClient {
  constructor(private config: MomoConfig) {}

  sign(rawSignature: string): string {
    return crypto.createHmac("sha256", this.config.secretKey).update(rawSignature).digest("hex");
  }

  verifySignature(body: Record<string, unknown>): boolean {
    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `amount=${body.amount}`,
      `extraData=${body.extraData || ""}`,
      `ipnUrl=${this.config.ipnUrl}`,
      `orderId=${body.orderId}`,
      `orderInfo=${body.orderInfo}`,
      `orderType=${body.orderType || "momo_wallet"}`,
      `partnerCode=${this.config.partnerCode}`,
      `redirectUrl=${this.config.returnUrl}`,
      `requestId=${body.requestId}`,
      `requestType=captureWallet`,
    ].join("&");

    return this.sign(rawSignature) === String(body.signature || "");
  }

  async createPayment(params: { amount: number; orderId: string; orderInfo?: string }): Promise<{ payUrl: string; requestId: string }> {
    const requestId = `${this.config.partnerCode}${Date.now()}`;
    const orderInfo = params.orderInfo || `BloomWedding#${params.orderId}`;

    const rawSignature = [
      `accessKey=${this.config.accessKey}`,
      `amount=${params.amount}`,
      `extraData=`,
      `ipnUrl=${this.config.ipnUrl}`,
      `orderId=${params.orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=momo_wallet`,
      `partnerCode=${this.config.partnerCode}`,
      `redirectUrl=${this.config.returnUrl}`,
      `requestId=${requestId}`,
      `requestType=captureWallet`,
    ].join("&");

    const signature = this.sign(rawSignature);

    const response = await fetch(`${this.config.endpoint}/v2/gateway/api/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerCode: this.config.partnerCode,
        accessKey: this.config.accessKey,
        requestId,
        amount: params.amount.toString(),
        orderId: params.orderId,
        orderInfo,
        redirectUrl: this.config.returnUrl,
        ipnUrl: this.config.ipnUrl,
        extraData: "",
        requestType: "captureWallet",
        orderType: "momo_wallet",
        lang: "vi",
        signature,
      }),
    });

    const result = await response.json();
    if (result.resultCode !== 0) {
      throw new Error(`Momo error: ${result.message}`);
    }

    return { payUrl: result.payUrl, requestId };
  }
}

class MomoPaymentProvider extends AbstractPaymentProvider {
  static identifier = "momo";
  private client: MomoClient;

  constructor(cradle: Record<string, unknown>, options?: Record<string, unknown>) {
    super(cradle as any);

    const opts = (options || {}) as Record<string, string>;
    const config: MomoConfig = {
      partnerCode: opts.partnerCode || process.env.MOMO_PARTNER_CODE || "",
      accessKey: opts.accessKey || process.env.MOMO_ACCESS_KEY || "",
      secretKey: opts.secretKey || process.env.MOMO_SECRET_KEY || "",
      publicKey: opts.publicKey || process.env.MOMO_PUBLIC_KEY || "",
      endpoint: opts.endpoint || process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn",
      returnUrl: opts.returnUrl || process.env.MOMO_RETURN_URL || "http://localhost:8000/checkout/result/momo",
      ipnUrl: opts.ipnUrl || process.env.MOMO_IPN_URL || "http://localhost:9000/api/hooks/momo",
    };
    this.client = new MomoClient(config);
  }

  async initiatePayment(data: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amount = Number(data.amount);
    const orderId = String((data.context as any)?.payment?.id || `momo_${Date.now()}`);

    const result = await this.client.createPayment({ amount, orderId });

    return {
      id: orderId,
      data: { payUrl: result.payUrl, requestId: result.requestId, orderId, amount },
      status: "pending" as const,
    };
  }

  async authorizePayment(data: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const inner = (data.data || {}) as Record<string, unknown>;

    if (inner.resultCode === undefined || inner.resultCode === null) {
      return { data: inner, status: "error" as const };
    }

    if (!this.client.verifySignature(inner)) {
      return { data: inner, status: "error" as const };
    }

    const status = Number(inner.resultCode) === 0 ? "authorized" : "error";
    return { data: inner, status };
  }

  async capturePayment(data: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async refundPayment(data: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async cancelPayment(data: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async getPaymentStatus(_data: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" as const };
  }

  async deletePayment(_data: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return {};
  }

  async retrievePayment(data: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async updatePayment(data: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: (data.data || {}) as Record<string, unknown> };
  }

  async getWebhookActionAndData(
    payload: { data: Record<string, unknown>; rawData: string | Buffer; headers: Record<string, unknown> },
  ): Promise<WebhookActionResult> {
    const body = payload.data;

    if (!this.client.verifySignature(body)) {
      return { action: PaymentActions.FAILED };
    }

    if (Number(body.resultCode) === 0) {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: String(body.orderId || ""), amount: Number(body.amount || 0) },
      };
    }

    return { action: PaymentActions.FAILED };
  }
}

const services = [MomoPaymentProvider];
export default ModuleProvider(Modules.PAYMENT, { services });
