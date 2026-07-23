import { AbstractFulfillmentProviderService, ModuleProvider, Modules } from "@medusajs/framework/utils";
import crypto from "node:crypto";

// ---------------------------------------------------------------------------
// GHN Fulfillment Provider — Medusa 2.17 custom module
// Sandbox: https://dev-online-gateway.ghn.vn
// Requires GHN_TOKEN + GHN_SHOP_ID env vars to activate
// Base class: AbstractFulfillmentProviderService (NOT AbstractFulfillmentProvider)
// ---------------------------------------------------------------------------

interface GHNConfig {
  token: string;
  shopId: number;
  fromDistrictId: number;
  fromWardCode: string;
  endpoint: string;
}

// ponytail: hardcoded delivery zones for initial launch.
// Add admin-configurable zones when expanding beyond HCMC.
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

class GHNClient {
  constructor(private config: GHNConfig) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Token: this.config.token,
      ShopId: String(this.config.shopId),
    };
  }

  async calculateFee(toDistrictId: number, toWardCode: string, insuranceValue: number): Promise<number> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/fee`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        from_district_id: this.config.fromDistrictId,
        from_ward_code: this.config.fromWardCode,
        to_district_id: toDistrictId,
        to_ward_code: toWardCode,
        weight: 500, // default flower box weight (grams)
        length: 30,
        width: 25,
        height: 25,
        service_type_id: 2, // 2 = standard
        insurance_value: insuranceValue,
      }),
    });

    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(`GHN fee error: ${data.message} (code: ${data.code})`);
    }

    return data.data.total;
  }

  async createOrder(params: {
    toName: string;
    toPhone: string;
    toAddress: string;
    toWardCode: string;
    toDistrictId: number;
    insuranceValue: number;
    items: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<{ orderCode: string; trackingUrl: string }> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/create`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        from_name: "Bloom Wedding",
        from_phone: "0900000000",
        from_address: "42 Nguyen Hue, Q1, HCMC",
        from_ward_code: this.config.fromWardCode,
        from_district_id: this.config.fromDistrictId,
        to_name: params.toName,
        to_phone: params.toPhone,
        to_address: params.toAddress,
        to_ward_code: params.toWardCode,
        to_district_id: params.toDistrictId,
        weight: 500,
        length: 30,
        width: 25,
        height: 25,
        service_type_id: 2,
        service_id: 0,
        payment_type_id: 2, // COD
        required_note: "CHOXEMHANGKHONGTHU",
        items: params.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        cod_amount: params.insuranceValue,
        insurance_value: params.insuranceValue,
      }),
    });

    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(`GHN order creation error: ${data.message} (code: ${data.code})`);
    }

    return {
      orderCode: data.data.order_code,
      trackingUrl: `https://donhang.ghn.vn/?order_code=${data.data.order_code}`,
    };
  }

  async getLabel(orderCode: string): Promise<string> {
    const response = await fetch(`${this.config.endpoint}/v2/shipping-order/a5`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ order_codes: [orderCode] }),
    });

    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(`GHN label error: ${data.message}`);
    }

    return data.data[0]?.url || "";
  }

  async cancelOrder(orderCode: string): Promise<void> {
    const response = await fetch(`${this.config.endpoint}/v2/switch-status/cancel`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ order_codes: [orderCode] }),
    });

    const data = await response.json();
    if (data.code !== 200) {
      throw new Error(`GHN cancel error: ${data.message}`);
    }
  }
}

class GHNFulfillmentProvider extends AbstractFulfillmentProviderService {
  static identifier = "ghn";
  private client: GHNClient;
  private config: GHNConfig;

  constructor(cradle: Record<string, unknown>, options?: Record<string, unknown>) {
    super(cradle as any);

    const opts = (options || {}) as Record<string, unknown>;
    const fromDistrictId = parseInt(String(opts.fromDistrictId || process.env.GHN_FROM_DISTRICT_ID || "0")) || 0;
    const fromWardCode = String(opts.fromWardCode || process.env.GHN_FROM_WARD_CODE || "");
    const shopId = parseInt(String(opts.shopId || process.env.GHN_SHOP_ID || "0")) || 0;

    this.config = {
      token: String(opts.token || process.env.GHN_TOKEN || ""),
      shopId,
      fromDistrictId,
      fromWardCode,
      endpoint: String(opts.endpoint || process.env.GHN_ENDPOINT || "https://dev-online-gateway.ghn.vn/shiip/public-api"),
    };

    this.client = new GHNClient(this.config);
  }

  async getFulfillmentOptions(): Promise<any> {
    return [
      {
        id: "ghn-express",
        name: "Giao hàng nhanh",
        description: "Giao trong 90 phút (nội thành) hoặc 2-3h (ngoại thành)",
        is_return: false,
      },
    ];
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    // Validate that the configured GHN provider has valid credentials
    return !!(this.config.token && this.config.shopId > 0);
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const wardCode = data.ward_code as string;
    const districtId = data.district_id as number;

    if (!wardCode || !districtId) {
      throw new Error("Thông tin địa chỉ giao hàng chưa đầy đủ");
    }

    const zone = getZone(districtId);
    if (!zone) {
      throw new Error("Khu vực này hiện chưa được hỗ trợ giao hàng nhanh");
    }

    return data;
  }

  async canCalculate(data: Record<string, unknown>): Promise<any> {
    const districtId = data.district_id as number;
    if (!districtId) return false;
    return !!getZone(districtId);
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    const districtId = data.district_id as number;
    const wardCode = data.ward_code as string;
    const insuranceValue = (data.insurance_value as number) || 0;

    const zone = getZone(districtId);
    if (!zone) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false };
    }

    // Zone-based fallback pricing
    let fee = zone.fee;

    if (this.config.token && wardCode) {
      try {
        fee = await this.client.calculateFee(districtId, wardCode, insuranceValue);
      } catch {
        // Fallback to zone fee on GHN API failure
      }
    }

    return { calculated_amount: fee, is_calculated_price_tax_inclusive: false };
  }

  async createFulfillment(
    fulfillmentData: Record<string, unknown>,
    fulfillmentItems: any[],
    _order: any,
    _context: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; labels: any[] }> {
    const items = (fulfillmentItems || []).map((item: any) => ({
      name: item.title || item.product_title || "Hoa",
      quantity: item.quantity || 1,
      price: item.unit_price || item.price || 0,
    }));

    const insuranceValue = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    try {
      const result = await this.client.createOrder({
        toName: (fulfillmentData.customer_name as string) || "Khách hàng",
        toPhone: (fulfillmentData.customer_phone as string) || "0900000000",
        toAddress: (fulfillmentData.address as string) || "",
        toWardCode: (fulfillmentData.ward_code as string) || "",
        toDistrictId: (fulfillmentData.district_id as number) || 0,
        insuranceValue,
        items,
      });

      return {
        data: {
          tracking_number: result.orderCode,
          courier_id: "ghn",
          tracking_url: result.trackingUrl,
        },
        labels: [
          {
            tracking_number: result.orderCode,
            label_url: result.trackingUrl,
            carrier: "GHN",
          },
        ],
      };
    } catch (err: any) {
      throw new Error(`GHN fulfillment creation failed: ${err.message}`);
    }
  }

  async cancelFulfillment(fulfillmentData: Record<string, unknown>): Promise<any> {
    const trackingCode = fulfillmentData.tracking_number as string;
    if (trackingCode) {
      try {
        await this.client.cancelOrder(trackingCode);
      } catch (err: any) {
        throw new Error(`GHN fulfillment cancellation failed: ${err.message}`);
      }
    }
    return {};
  }

  async getFulfillmentDocuments(fulfillmentData: Record<string, unknown>): Promise<any> {
    const trackingCode = fulfillmentData.tracking_number as string;
    if (!trackingCode) return [];

    try {
      const labelUrl = await this.client.getLabel(trackingCode);
      return [{ url: labelUrl, name: `Label_${trackingCode}.pdf` }];
    } catch {
      return [];
    }
  }

  async createReturnFulfillment(_data: Record<string, unknown>): Promise<any> {
    return {};
  }

  async retrieveDocuments(_data: Record<string, unknown>): Promise<any> {
    return [];
  }
}

const services = [GHNFulfillmentProvider];
export default ModuleProvider(Modules.FULFILLMENT, { services });
