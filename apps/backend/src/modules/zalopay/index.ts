import { AbstractPaymentProvider, PaymentActions, ModuleProvider, Modules } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput, InitiatePaymentOutput, AuthorizePaymentInput, AuthorizePaymentOutput,
  CapturePaymentInput, CapturePaymentOutput, RefundPaymentInput, RefundPaymentOutput,
  CancelPaymentInput, CancelPaymentOutput, GetPaymentStatusInput, GetPaymentStatusOutput,
  DeletePaymentInput, DeletePaymentOutput, RetrievePaymentInput, RetrievePaymentOutput,
  UpdatePaymentInput, UpdatePaymentOutput, WebhookActionResult,
} from "@medusajs/framework/types";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// ZaloPay Payment Provider — Medusa 2.17 custom module
// Sandbox: https://sandbox.zalopay.vn
// Requires ZALOPAY_APP_ID + ZALOPAY_KEY1 + ZALOPAY_KEY2 to activate
// ---------------------------------------------------------------------------

interface ZaloPayConfig {
  appId: string;
  key1: string;
  key2: string;
  endpoint: string;
  callbackUrl: string;
}

function getConfig(): ZaloPayConfig {
  return {
    appId: process.env.ZALOPAY_APP_ID || "",
    key1: process.env.ZALOPAY_KEY1 || "",
    key2: process.env.ZALOPAY_KEY2 || "",
    endpoint: process.env.ZALOPAY_ENDPOINT || "https://sandbox.zalopay.vn/v001/tpe",
    callbackUrl: process.env.ZALOPAY_CALLBACK_URL || "http://localhost:9000/api/hooks/zalopay",
  };
}

class ZaloPayClient {
  constructor(private config: ZaloPayConfig) {}

  sign(data: Record<string, string>): string {
    const raw = Object.keys(data).sort()
      .map((k) => `${k}=${data[k]}`)
      .join("&");
    return crypto.createHmac("sha256", this.config.key1).update(raw).digest("hex");
  }

  verifyMAC(data: Record<string, string>): boolean {
    const mac = this.sign(data);
    return mac === (data.mac || "");
  }

  async createOrder(params: { amount: number; orderId: string; description?: string }): Promise<string> {
    const embedData = JSON.stringify({ redirecturl: this.config.callbackUrl });
    const orderData: Record<string, string> = {
      app_id: this.config.appId,
      app_user: "bloom_customer",
      app_time: String(Math.floor(Date.now() / 1000)),
      amount: String(params.amount),
      app_trans_id: `${new Date().toISOString().slice(2, 10).replace(/-/g, "")}_${params.orderId}`,
      embed_data: embedData,
      item: JSON.stringify([{ itemid: "flower", itemname: params.description || "Bloom Wedding", itemprice: params.amount, itemquantity: 1 }]),
      description: params.description || `Bloom Wedding #${params.orderId}`,
      bank_code: "",
    };

    orderData.mac = this.sign(orderData);

    const response = await fetch(`${this.config.endpoint}/createorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    if (data.return_code !== 1) {
      throw new Error(`ZaloPay error: ${data.return_message}`);
    }

    return data.order_url;
  }
}

class ZaloPayPaymentProvider extends AbstractPaymentProvider {
  static identifier = "zalopay";
  private client: ZaloPayClient;

  constructor(cradle: Record<string, unknown>, options?: Record<string, unknown>) {
    super(cradle as any);
    const opts = (options || {}) as Record<string, string>;
    const config = getConfig();
    this.client = new ZaloPayClient({
      appId: opts.appId || config.appId,
      key1: opts.key1 || config.key1,
      key2: opts.key2 || config.key2,
      endpoint: opts.endpoint || config.endpoint,
      callbackUrl: opts.callbackUrl || config.callbackUrl,
    });
  }

  async initiatePayment(data: any): Promise<any> {
    const amount = Number(data.amount);
    const orderId = `zp_${Date.now()}`;

    const payUrl = await this.client.createOrder({
      amount,
      orderId,
      description: `BloomWedding#${orderId}`,
    });

    return {
      id: orderId,
      data: { payUrl, orderId, amount },
      status: "pending" as const,
    };
  }

  async authorizePayment(data: any): Promise<any> {
    const inner = (data.data || {}) as Record<string, string>;
    if (!this.client.verifyMAC(inner)) {
      return { data: inner as any, status: "error" as const };
    }
    const status = Number(inner.return_code) === 1 ? "authorized" : "error";
    return { data: inner as any, status };
  }

  async capturePayment(data: any): Promise<any> { return { data: (data.data || {}) as any }; }
  async refundPayment(data: any): Promise<any> { return { data: (data.data || {}) as any }; }
  async cancelPayment(data: any): Promise<any> { return { data: (data.data || {}) as any }; }
  async getPaymentStatus(_data: any): Promise<any> { return { status: "pending" as const }; }
  async deletePayment(_data: any): Promise<any> { return {}; }
  async retrievePayment(data: any): Promise<any> { return { data: (data.data || {}) as any }; }
  async updatePayment(data: any): Promise<any> { return { data: (data.data || {}) as any }; }

  async getWebhookActionAndData(payload: any): Promise<WebhookActionResult> {
    const body = payload.data as Record<string, string>;
    if (!this.client.verifyMAC(body)) return { action: PaymentActions.FAILED };
    if (Number(body.return_code) === 1) {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: { session_id: body.app_trans_id || "", amount: Number(body.amount || 0) },
      };
    }
    return { action: PaymentActions.FAILED };
  }
}

const services = [ZaloPayPaymentProvider];
export default ModuleProvider(Modules.PAYMENT, { services });
