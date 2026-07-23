import { AbstractFulfillmentProviderService, ModuleProvider, Modules } from "@medusajs/framework/utils";

// ---------------------------------------------------------------------------
// GHTK Fulfillment Provider — Medusa 2.17 custom module
// Sandbox: https://services-staging.ghtklab.com
// Requires GHTK_TOKEN env var to activate. Follows same pattern as GHN.
// Base class: AbstractFulfillmentProviderService (NOT AbstractFulfillmentProvider)
// ---------------------------------------------------------------------------

interface GHTKConfig {
  token: string;
  endpoint: string;
  pickProvince: string;
  pickDistrict: string;
  pickWard: string;
  pickAddress: string;
}

// ponytail: same hardcoded delivery zones as GHN module. Keep in sync.
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

class GHTKClient {
  constructor(private config: GHTKConfig) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Token: this.config.token,
    };
  }

  async calculateFee(params: { pickProvince: string; pickDistrict: string; province: string; district: string; weight?: number; value?: number }): Promise<{ fee: number; estimatedMinutes: number }> {
    const response = await fetch(`${this.config.endpoint}/services/shipment/fee`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        pick_province: params.pickProvince,
        pick_district: params.pickDistrict,
        province: params.province,
        district: params.district,
        weight: (params.weight || 500) * 1.0, // grams to GHTK weight unit
        value: params.value || 0,
        transport: "road",
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(`GHTK fee error: ${data.message}`);
    }

    return {
      fee: data.fee?.fee || 0,
      estimatedMinutes: data.fee?.estimated_delivery_time_minutes || 120,
    };
  }

  async createOrder(params: {
    toName: string; toPhone: string; toAddress: string;
    toProvince: string; toDistrict: string; toWard: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    codAmount?: number;
  }): Promise<{ label: string; trackingId: string }> {
    const products = params.items.map((item) => ({
      name: item.name,
      weight: 0.5,
      quantity: item.quantity,
      product_code: "flower",
    }));

    const orderValue = params.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const response = await fetch(`${this.config.endpoint}/services/shipment/order/?ver=1.5`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        products,
        order: {
          id: `bloom_${Date.now()}`,
          pick_name: "Bloom Wedding",
          pick_address: this.config.pickAddress,
          pick_province: this.config.pickProvince,
          pick_district: this.config.pickDistrict,
          pick_ward: this.config.pickWard,
          pick_tel: "0900000000",
          name: params.toName,
          address: params.toAddress,
          province: params.toProvince,
          district: params.toDistrict,
          ward: params.toWard,
          hamlet: "Khac",
          tel: params.toPhone,
          note: "CHOXEMHANGKHONGTHU",
          is_freeship: "0",
          pick_money: params.codAmount || orderValue,
          value: orderValue,
        },
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(`GHTK order error: ${data.message}`);
    }

    return {
      label: data.order?.label || "",
      trackingId: data.order?.label || "",
    };
  }

  async cancelOrder(trackingId: string): Promise<void> {
    const response = await fetch(`${this.config.endpoint}/services/shipment/cancel/${trackingId}`, {
      method: "POST",
      headers: this.headers(),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(`GHTK cancel error: ${data.message}`);
    }
  }
}

class GHTKFulfillmentProvider extends AbstractFulfillmentProviderService {
  static identifier = "ghtk";
  private client: GHTKClient | null = null;

  constructor(_cradle: Record<string, unknown>, options?: Record<string, unknown>) {
    super();

    const token = (options as any)?.token || process.env.GHTK_TOKEN;
    if (token) {
      this.client = new GHTKClient({
        token,
        endpoint: (options as any)?.endpoint || process.env.GHTK_ENDPOINT || "https://services-staging.ghtklab.com",
        pickProvince: (options as any)?.pickProvince || process.env.GHTK_PICK_PROVINCE || "TP Hồ Chí Minh",
        pickDistrict: (options as any)?.pickDistrict || process.env.GHTK_PICK_DISTRICT || "Quận 1",
        pickWard: (options as any)?.pickWard || process.env.GHTK_PICK_WARD || "Phường Bến Nghé",
        pickAddress: (options as any)?.pickAddress || process.env.GHTK_PICK_ADDRESS || "42 Nguyễn Huệ, Q1, TP.HCM",
      });
    }
  }

  async getFulfillmentOptions(): Promise<any> {
    return [
      {
        id: "ghtk-standard",
        name: "GHTK — Giao hàng tiết kiệm",
        description: "Giao trong 2-4h (nội thành), COD hỗ trợ",
        is_return: false,
      },
    ];
  }

  async validateOption(_data: Record<string, unknown>): Promise<boolean> {
    return !!this.client;
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const district = data.district as string;
    if (!district) throw new Error("Thông tin địa chỉ giao hàng chưa đầy đủ");
    const zone = getZone(Number(district));
    if (!zone) throw new Error("Khu vực này hiện chưa được hỗ trợ giao hàng nhanh");
    return data;
  }

  async canCalculate(data: any): Promise<boolean> {
    if (!this.client) return false;
    const districtId = data.district_id as number;
    return districtId ? !!getZone(districtId) : false;
  }

  async calculatePrice(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    const districtId = data.district_id as number;
    const zone = getZone(districtId);

    if (!zone || !this.client) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false };
    }

    try {
      const result = await this.client.calculateFee({
        pickProvince: this.client["config"].pickProvince,
        pickDistrict: this.client["config"].pickDistrict,
        province: (data.province as string) || "TP Hồ Chí Minh",
        district: String(districtId),
      });
      return { calculated_amount: result.fee, is_calculated_price_tax_inclusive: false };
    } catch {
      return { calculated_amount: zone.fee, is_calculated_price_tax_inclusive: false };
    }
  }

  async createFulfillment(
    fulfillmentData: Record<string, unknown>,
    fulfillmentItems: any[],
    _order: any,
    _context: Record<string, unknown>,
  ): Promise<{ data: Record<string, unknown>; labels: any[] }> {
    if (!this.client) throw new Error("GHTK not configured");

    const items = (fulfillmentItems || []).map((item: any) => ({
      name: item.title || item.product_title || "Hoa",
      quantity: item.quantity || 1,
      price: item.unit_price || item.price || 0,
    }));

    const codAmount = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    try {
      const result = await this.client.createOrder({
        toName: (fulfillmentData.customer_name as string) || "Khách hàng",
        toPhone: (fulfillmentData.customer_phone as string) || "0900000000",
        toAddress: (fulfillmentData.address as string) || "",
        toProvince: (fulfillmentData.province as string) || "TP Hồ Chí Minh",
        toDistrict: String(fulfillmentData.district_id || ""),
        toWard: (fulfillmentData.ward as string) || "",
        items,
        codAmount,
      });

      return {
        data: {
          tracking_number: result.trackingId,
          courier_id: "ghtk",
          label_url: result.label,
        },
        labels: [{
          tracking_number: result.trackingId,
          label_url: result.label,
          courier: "GHTK",
        }],
      };
    } catch (err: any) {
      throw new Error(`GHTK fulfillment creation failed: ${err.message}`);
    }
  }

  async cancelFulfillment(fulfillmentData: Record<string, unknown>): Promise<any> {
    const trackingCode = fulfillmentData.tracking_number as string;
    if (trackingCode && this.client) {
      try {
        await this.client.cancelOrder(trackingCode);
      } catch (err: any) {
        throw new Error(`GHTK cancellation failed: ${err.message}`);
      }
    }
    return {};
  }

  async getFulfillmentDocuments(fulfillmentData: Record<string, unknown>): Promise<any> {
    return [];
  }

  async createReturnFulfillment(_data: Record<string, unknown>): Promise<any> { return {}; }
  async retrieveDocuments(_data: Record<string, unknown>): Promise<any> { return []; }
}

const services = [GHTKFulfillmentProvider];
export default ModuleProvider(Modules.FULFILLMENT, { services });
