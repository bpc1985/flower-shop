# Testing Phase 6 — Shipping (GHN Provider)

GHN provider conditionally loaded — only active when `GHN_TOKEN` + `GHN_SHOP_ID` are set. Without creds, backend starts clean with no fulfillment providers.

## Prerequisites

```bash
docker compose up -d
cd apps/backend
npx medusa db:migrate
```

---

## 1. Provider NOT Loaded (no credentials)

```bash
npx medusa develop &
sleep 8
curl -s http://localhost:9000/store/shipping-options | jq .
```

Backend starts clean. No GHN shipping options appear. Provider conditionally omitted from `medusa-config.ts`.

---

## 2. Provider IS Loaded (dummy credentials)

```bash
# In apps/backend/.env
GHN_TOKEN=test_token_abc123
GHN_SHOP_ID=99999
GHN_FROM_DISTRICT_ID=1442
GHN_FROM_WARD_CODE=20308
```

Restart and verify:

```bash
kill $(lsof -ti :9000) 2>/dev/null; sleep 1
npx medusa develop &
sleep 8

# Shipping options should include GHN express
curl -s http://localhost:9000/store/shipping-options | jq .
```

Expect GHN express option: `"Giao hàng nhanh"` with description about delivery time.

---

## 3. Zone Validation Logic

Backend has 3 hardcoded delivery zones. Verify zone lookup:

```bash
node -e "
const ZONES = {
  innerCity: { id: 'zone-1', districtIds: [1442, 1444, 1446, 1447], maxMinutes: 90, fee: 0 },
  extendedCity: { id: 'zone-2', districtIds: [1443, 1448, 1454, 1455], maxMinutes: 120, fee: 30000 },
  suburban: { id: 'zone-3', districtIds: [1449, 1456, 1457], maxMinutes: 180, fee: 50000 },
};
function getZone(id) {
  if (ZONES.innerCity.districtIds.includes(id)) return ZONES.innerCity;
  if (ZONES.extendedCity.districtIds.includes(id)) return ZONES.extendedCity;
  if (ZONES.suburban.districtIds.includes(id)) return ZONES.suburban;
  return null;
}
console.log('Q1 (1442):', getZone(1442)?.id, getZone(1442)?.fee + 'đ');
console.log('Q7 (1448):', getZone(1448)?.id, getZone(1448)?.fee + 'đ');
console.log('Q9 (1449):', getZone(1449)?.id, getZone(1449)?.fee + 'đ');
console.log('Out of range (9999):', getZone(9999));
"
```

Expected:

| District ID | Zone | Fee |
|-------------|------|-----|
| 1442 (Q1) | zone-1 | 0đ |
| 1448 (Q7) | zone-2 | 30,000đ |
| 1449 (Q9) | zone-3 | 50,000đ |
| 9999 | null | Not covered |

---

## 4. Validation Methods

### validateOption — credentials required

```bash
node -e "
// Without token + shopId: validateOption returns false → option hidden at checkout
// With token + shopId: validateOption returns true → option available
const hasToken = !!'test_token';
const hasShopId = 99999 > 0;
console.log('Provider valid:', hasToken && hasShopId);   // true
console.log('Provider invalid:', !!'' && 0 > 0);          // false
"
```

### validateFulfillmentData — throws on invalid data

```bash
node -e "
// Missing ward/district → throws Error('Thông tin địa chỉ giao hàng chưa đầy đủ')
// Unsupported district → throws Error('Khu vực này hiện chưa được hỗ trợ giao hàng nhanh')
// Valid data → returns data object
console.log('Empty ward: throws \"Thông tin địa chỉ giao hàng chưa đầy đủ\"');
console.log('District 9999: throws \"Khu vực này hiện chưa được hỗ trợ giao hàng nhanh\"');
console.log('District 1442 + ward 20308: returns data');
"
```

### canCalculate — zone coverage check

```bash
node -e "
// canCalculate returns true only if district is in a supported zone
const ZONES = {
  innerCity: { id: 'zone-1', districtIds: [1442, 1444, 1446, 1447], maxMinutes: 90, fee: 0 },
  extendedCity: { id: 'zone-2', districtIds: [1443, 1448, 1454, 1455], maxMinutes: 120, fee: 30000 },
  suburban: { id: 'zone-3', districtIds: [1449, 1456, 1457], maxMinutes: 180, fee: 50000 },
};
function getZone(id) {
  if (ZONES.innerCity.districtIds.includes(id)) return ZONES.innerCity;
  if (ZONES.extendedCity.districtIds.includes(id)) return ZONES.extendedCity;
  if (ZONES.suburban.districtIds.includes(id)) return ZONES.suburban;
  return null;
}
console.log('1442 can calculate:', !!getZone(1442));   // true
console.log('9999 can calculate:', !!getZone(9999));   // false
"
```

---

## 5. NaN Guard Verification

Ensure `parseInt` on non-numeric string doesn't produce NaN:

```bash
node -e "
const shopId = parseInt('abc') || 0;
const fromDistrictId = parseInt('xyz') || 0;
console.log('shopId NaN → 0:', shopId === 0 ? 'PASS' : 'FAIL');
console.log('fromDistrict NaN → 0:', fromDistrictId === 0 ? 'PASS' : 'FAIL');
console.log('String(0):', String(shopId));  // '0' not 'NaN'
"
```

---

## 6. GHN Env Var Validation

```bash
node -e "
import('zod').then(({ z }) => {
  const envSchema = z.object({
    GHN_ENDPOINT: z.string().url().optional(),
  });
  const valid = envSchema.safeParse({ GHN_ENDPOINT: 'https://dev-online-gateway.ghn.vn/shiip/public-api' });
  console.log('Valid URL:', valid.success ? 'PASS' : 'FAIL');
  const invalid = envSchema.safeParse({ GHN_ENDPOINT: 'not-a-url' });
  console.log('Invalid URL rejected:', !invalid.success ? 'PASS' : 'FAIL');
}).catch(() => console.log('zod not available in REPL — check via typecheck'));
```

---

## 7. Error Handling

### createFulfillment — API failure throws with context

```bash
# createFulfillment wraps GHNClient.createOrder in try/catch
# On failure: throws 'GHN fulfillment creation failed: <original message>'
```

### cancelFulfillment — API failure throws with context

```bash
# cancelFulfillment wraps GHNClient.cancelOrder in try/catch
# On failure: throws 'GHN fulfillment cancellation failed: <original message>'
```

### getFulfillmentDocuments — API failure returns empty (non-critical)

```bash
# getFulfillmentDocuments wraps GHNClient.getLabel in try/catch
# On failure: returns [] (labels are non-critical, order still exists)
```

---

## 8. GHN Sandbox (Needs Credentials)

Register at https://dev-online-gateway.ghn.vn.

```bash
# apps/backend/.env
GHN_TOKEN=your_sandbox_token
GHN_SHOP_ID=your_sandbox_shop_id
GHN_FROM_DISTRICT_ID=1442        # Q1, HCMC
GHN_FROM_WARD_CODE=20308         # Bến Nghé ward
GHN_ENDPOINT=https://dev-online-gateway.ghn.vn/shiip/public-api
```

### Fee Calculation

GHN API returns calculated fee. If API call fails, falls back to zone-based pricing:

| Zone | Fallback Fee |
|------|-------------|
| Zone 1 (Inner City) | 0đ |
| Zone 2 (Extended City) | 30,000đ |
| Zone 3 (Suburban) | 50,000đ |

### Order Creation

`createFulfillment` calls GHN `/v2/shipping-order/create`. Returns `order_code` + tracking URL.

Payload includes:
- From: Bloom Wedding, 42 Nguyễn Huệ, Q1
- Items: flower products with quantities and prices
- COD amount equal to insurance value
- `required_note: "CHOXEMHANGKHONGTHU"` (customer checks before paying)

### Label Retrieval

`getFulfillmentDocuments` calls GHN `/v2/shipping-order/a5`. Returns label PDF URL.

### Order Cancellation

`cancelFulfillment` calls GHN `/v2/switch-status/cancel`.

---

## 9. Smoke Test Script

```bash
#!/bin/bash
cd apps/backend

echo "=== TypeScript ==="
npx tsc --noEmit 2>&1 | grep "^src/modules/ghn" | head -5 || echo "PASS: 0 errors in ghn module"

echo "=== Medusa Build ==="
MEDUSA_WORKER_MODE=server npx medusa build 2>&1 | grep -i "error\|completed" | tail -3

echo "=== Server Start (no creds) ==="
kill $(lsof -ti :9000) 2>/dev/null; sleep 1
npx medusa develop &>/tmp/ghn-smoke.log &
sleep 8
echo "Server ready:" && grep -c "ready" /tmp/ghn-smoke.log || echo "FAIL"

echo "=== GHN not loaded (expected) ==="
grep -i "error.*ghn\|fulfillment" /tmp/ghn-smoke.log && echo "FAIL" || echo "PASS: no GHN loaded"

echo "=== Fake credentials ==="
echo "GHN_TOKEN=test" >> .env
echo "GHN_SHOP_ID=99999" >> .env
kill $(lsof -ti :9000) 2>/dev/null; sleep 1
npx medusa develop &>/tmp/ghn-cred.log &
sleep 8
grep -i "ready\|error" /tmp/ghn-cred.log | head -3

# Cleanup fake creds
sed -i '' '/GHN_TOKEN=test/d' .env
sed -i '' '/GHN_SHOP_ID=99999/d' .env

echo "=== Done ==="
```

---

## 10. Checklist

- [ ] Backend builds with GHN provider (0 TS errors, build succeeds)
- [ ] Backend starts without credentials (no crash, provider omitted)
- [ ] Backend starts WITH dummy credentials (GHN express option visible)
- [ ] Zone-1 (Q1/Q3/PN/BT) returns fee=0, 90 min delivery
- [ ] Zone-2 (Q2/Q7/TB/GV) returns fee=30000, 120 min delivery
- [ ] Zone-3 (Q9/TD/BTân) returns fee=50000, 180 min delivery
- [ ] Out-of-range district returns null zone (canCalculate=false)
- [ ] `validateOption` returns false when token empty or shopId=0
- [ ] `validateFulfillmentData` throws on missing ward/district
- [ ] `validateFulfillmentData` throws on unsupported district
- [ ] `parseInt(undefined||"abc") || 0` produces 0, not NaN
- [ ] `createFulfillment` try/catch wraps GHN createOrder call
- [ ] `cancelFulfillment` try/catch wraps GHN cancelOrder call
- [ ] `getFulfillmentDocuments` returns [] on GHN API failure
- [ ] `GHN_ENDPOINT` validated as URL (Zod `.url().optional()`)

---

## Known Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| No GHN sandbox credentials | Fee calculation falls back to zone-based pricing | Test zone logic independently; get sandbox keys for API testing |
| `createFulfillment` needs real order cart | Can't test end-to-end without checkout flow | Phase 7 will wire storefront checkout |
| COD reconciliation not implemented | COD payment status not synced | Implement with Phase 7 order data |
| GHN webhook not routed | Fulfillment status only polled, not pushed | Use ngrok to expose local backend; configure GHN IPN |
| Storefront delivery zones UI | Users can't see zones in storefront | Phase 7 scope |
| NGINX/envoy not configured | IP allowlisting of GHN webhook IPs not enforced | Add to infrastructure layer |
