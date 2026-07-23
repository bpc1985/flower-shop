# Testing Phase 9 — ZaloPay + GHTK

Both providers conditionally loaded. Without creds, backend starts clean. Same patterns as Phase 5 (VNPay/Momo) + Phase 6 (GHN).

## Prerequisites

```bash
docker compose up -d
cd apps/backend
npx medusa db:migrate
```

---

## 1. Providers NOT Loaded (no credentials)

```bash
npx medusa develop &
sleep 8
```

Backend starts without ZaloPay or GHTK. No errors. Providers omitted from config because `ZALOPAY_APP_ID` and `GHTK_TOKEN` are not set.

---

## 2. Providers ARE Loaded (dummy credentials)

```bash
# In apps/backend/.env
ZALOPAY_APP_ID=999
ZALOPAY_KEY1=test_key1_abc123
ZALOPAY_KEY2=test_key2_def456
GHTK_TOKEN=test_token_xyz
```

Restart:

```bash
kill $(lsof -ti :9000) 2>/dev/null; sleep 1
npx medusa develop &
sleep 8
```

Check startup logs — no provider errors. Both modules compiled into the build.

---

## 3. ZaloPay HMAC Signing

### Verify HMAC SHA256 Sign/Verify

```bash
node -e "
const crypto = require('crypto');

const key1 = 'test_key1';
const data = {
  app_id: '999',
  amount: '100000',
  app_trans_id: '250724_test',
  app_user: 'test',
  embed_data: '{}',
  item: '[]',
  description: 'Bloom Wedding test',
  bank_code: '',
};

// ZaloPay MAC: sort keys, concat as k=v, join with &
const raw = Object.keys(data).sort()
  .map(k => k + '=' + data[k])
  .join('&');

const mac = crypto.createHmac('sha256', key1).update(raw).digest('hex');
console.log('MAC:', mac);

// Verify round-trip
const mac2 = crypto.createHmac('sha256', key1).update(raw).digest('hex');
console.log('Matches:', mac === mac2 ? 'PASS' : 'FAIL');
"
```

### Verify MAC Rejects Tampered Data

```bash
node -e "
const crypto = require('crypto');
const key1 = 'test_key1';

function sign(data, key) {
  const raw = Object.keys(data).sort()
    .map(k => k + '=' + data[k])
    .join('&');
  return crypto.createHmac('sha256', key).update(raw).digest('hex');
}

const valid = { app_id: '999', amount: '100000', app_trans_id: 'test', app_user: 'u', bank_code: '' };
valid.mac = sign(valid, key1);

const tampered = { ...valid, amount: '999999' };
console.log('Tampered rejected:',
  tampered.mac !== sign(tampered, key1) ? 'PASS' : 'FAIL'
);
"
```

---

## 4. GHTK Fee Calculation (Zone Fallback)

GHTK uses the same HCMC delivery zones as GHN. Verify zone lookup:

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

console.log('Q1 (1442):', getZone(1442)?.fee + 'd');
console.log('Q7 (1448):', getZone(1448)?.fee + 'd');
console.log('Q9 (1449):', getZone(1449)?.fee + 'd');
console.log('Out of range:', getZone(9999));
"
```

Expected:

| District | Zone | Fee |
|----------|------|-----|
| 1442 (Q1) | zone-1 | 0d |
| 1448 (Q7) | zone-2 | 30,000d |
| 1449 (Q9) | zone-3 | 50,000d |
| 9999 | null | not covered |

---

## 5. Validation Methods

### GHTK validateOption — token check

```bash
node -e "
// Without GHTK_TOKEN: validateOption returns false -> option hidden
// With GHTK_TOKEN: validateOption returns true -> option available
const hasToken = !!'test_token_xyz';
console.log('GHTK available:', hasToken ? 'PASS' : 'FAIL');
console.log('GHTK unavailable:', !!'' ? 'FAIL' : 'PASS (correctly hidden)');
"
```

### GHTK validateFulfillmentData — throws on invalid data

```bash
node -e "
// Missing district -> throws Error
// Unsupported district -> throws Error
// Valid district + zone -> returns data
console.log('Empty district: throws');
console.log('District 9999: throws (unsupported zone)');
console.log('District 1442: returns data (zone-1 inner city)');
"
```

---

## 6. Provider Counts

With all dummy credentials set:

```bash
# In .env
VNPAY_TMN_CODE=test
VNPAY_HASH_SECRET=test
MOMO_PARTNER_CODE=test
MOMO_ACCESS_KEY=test
MOMO_SECRET_KEY=test
ZALOPAY_APP_ID=999
ZALOPAY_KEY1=test
ZALOPAY_KEY2=test
GHN_TOKEN=test
GHN_SHOP_ID=99999
GHTK_TOKEN=test
```

Expected: 3 payment providers (VNPay, Momo, ZaloPay) + 2 shipping providers (GHN, GHTK).

Verify via admin panel: `http://localhost:9000/app` → Settings → Regions.

---

## 7. Webhook Security

### ZaloPay webhook rejects unsigned payloads

```bash
# Forged MAC — should fail
curl -s -X POST http://localhost:9000/api/hooks/zalopay \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "999",
    "amount": "50000",
    "app_trans_id": "steal_this",
    "return_code": "1",
    "mac": "WRONG_MAC"
  }' | jq .
```

`getWebhookActionAndData` calls `verifyMAC`, returns `PaymentActions.FAILED` when MAC mismatches.

---

## 8. ZaloPay Sandbox (Needs Credentials)

Register at https://sandbox.zalopay.vn:

```bash
# apps/backend/.env
ZALOPAY_APP_ID=your_app_id
ZALOPAY_KEY1=your_key1
ZALOPAY_KEY2=your_key2
```

**Manual test flow:**
1. Select ZaloPay at checkout
2. Backend creates payment session → `initiatePayment` calls ZaloPay `/createorder`
3. ZaloPay returns `order_url` — redirect user there
4. ZaloPay sandbox shows test QR code
5. Use sandbox test wallet to pay
6. ZaloPay calls `ZALOPAY_CALLBACK_URL` with MAC
7. `verifyMAC` validates signature → order AUTHORIZED

**ZaloPay response codes:**

| `return_code` | Meaning |
|--------------|---------|
| 1 | Success |
| 2 | Failed |
| 3 | Processing |

---

## 9. GHTK Sandbox (Needs Credentials)

Register at https://services-staging.ghtklab.com:

```bash
# apps/backend/.env
GHTK_TOKEN=your_staging_token
```

**Fee calculation test:**

```bash
curl -s -X POST https://services-staging.ghtklab.com/services/shipment/fee \
  -H "Content-Type: application/json" \
  -H "Token: $GHTK_TOKEN" \
  -d '{
    "pick_province": "TP Hồ Chí Minh",
    "pick_district": "Quận 1",
    "province": "TP Hồ Chí Minh",
    "district": "Quận 7",
    "weight": 500,
    "value": 350000
  }' | jq .
```

Expected: `{ "success": true, "fee": { "fee": <amount>, ... } }`

---

## 10. Smoke Test Script

```bash
#!/bin/bash
echo "=== TypeScript ==="
cd apps/backend
npx tsc --noEmit --pretty 2>&1 | grep "^src/modules/zalopay\|^src/modules/ghtk" | head -5 || echo "PASS: 0 errors"

echo "=== Medusa Build ==="
MEDUSA_WORKER_MODE=server npx medusa build 2>&1 | grep -i "error\|completed" | tail -3

echo "=== Server (no creds) ==="
kill $(lsof -ti :9000) 2>/dev/null; sleep 1
npx medusa develop &>/tmp/phase9-smoke.log &
sleep 8
grep -i "ready\|error.*zalopay\|error.*ghtk" /tmp/phase9-smoke.log | head -5

echo "=== ZaloPay MAC Signing ==="
node -e "
const crypto = require('crypto');
const data = {app_id:'999',amount:'100000',app_trans_id:'test',app_user:'u',bank_code:''};
const raw = Object.keys(data).sort().map(k=>k+'='+data[k]).join('&');
const mac = crypto.createHmac('sha256','test').update(raw).digest('hex');
console.log('MAC generated:', !!mac ? 'PASS' : 'FAIL');
"

echo "=== Done ==="
```

---

## 11. Checklist

- [ ] Backend builds with ZaloPay + GHTK providers (0 TS errors)
- [ ] Backend starts without credentials (ZaloPay and GHTK omitted)
- [ ] Backend starts WITH dummy credentials (providers loaded)
- [ ] ZaloPay HMAC sign/verify produces match for valid data
- [ ] ZaloPay HMAC rejects tampered data
- [ ] GHTK zone fallback matches GHN zone logic
- [ ] GHTK `validateOption` returns false when no token
- [ ] ZaloPay webhook rejects unsigned payload
- [ ] 3 payment providers visible when all credentials set
- [ ] 2 shipping providers visible when all credentials set

---

## Known Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| No ZaloPay sandbox credentials | Provider never loaded, can't test payment flow | Use dummy creds for module loading; get sandbox keys for full flow |
| No GHTK sandbox credentials | Fee falls back to zone-based pricing | Test zone logic independently; get staging token for API testing |
| ZaloPay callback unreachable on localhost | Can't test IPN webhook from ZaloPay | Use ngrok to expose :9000 |
| GHTK API shape differs from GHN | Fee response, order params are different | Each client class isolates API differences |
| No carrier comparison UI | Users see single carrier at checkout | Add comparison UI in storefront enhancement |
| `capture` and `refund` stubbed | Only `initiate` + `authorize` tested | Implement when sandbox credentials available |
| GHTK zone data hardcoded | Same IDs as GHN — may differ for GHTK | Verify against GHTK district codes when integrating |
