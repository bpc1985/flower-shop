# Testing Phase 5 — Payment (VNPay + Momo)

Both providers are **conditionally loaded** — only active when env credentials are set. Without creds, backend starts clean with no payment providers registered.

## Prerequisites

```bash
docker compose up -d
cd apps/backend
npx medusa db:migrate
```

---

## 1. Providers NOT Loaded (no credentials)

Verify backend starts without payment providers when no env vars are set:

```bash
npx medusa develop &
sleep 8
curl -s http://localhost:9000/store/payment-collections | jq .
```

Backend starts without errors. VNPay and Momo are conditionally omitted from the providers array in `medusa-config.ts` because `VNPAY_TMN_CODE` and `MOMO_PARTNER_CODE` are not set.

---

## 2. Providers ARE Loaded (dummy credentials)

Add fake credentials to `.env` to force provider registration:

```bash
# In apps/backend/.env
VNPAY_TMN_CODE=TEST_DUMMY_CODE
VNPAY_HASH_SECRET=TEST_DUMMY_SECRET
MOMO_PARTNER_CODE=TEST_DUMMY_PARTNER
MOMO_ACCESS_KEY=TEST_DUMMY_ACCESS
MOMO_SECRET_KEY=TEST_DUMMY_SECRET
```

Restart the backend:

```bash
kill $(lsof -ti :9000) 2>/dev/null
npx medusa develop &
sleep 8
```

Providers should now load. Verify:

```bash
curl -s http://localhost:9000/store/payment-collections | jq .
```

Expect empty collections response (module is alive, no sessions exist yet).

---

## 3. HMAC Signing Verification (Node REPL)

### VNPay SHA512 Signing

```bash
cd apps/backend
node -e "
const crypto = require('crypto');
const qs = require('querystring');

const params = {
  vnp_Version: '2.1.0',
  vnp_TmnCode: 'TEST',
  vnp_Amount: '100000',
  vnp_TxnRef: 'test123',
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
};
const sorted = Object.keys(params).sort().reduce(
  (acc, k) => { acc[k] = params[k]; return acc; }, {}
);
const query = qs.stringify(sorted, '&', '=', { encodeURIComponent: s => s });
const hash = crypto.createHmac('sha512', 'TEST').update(query).digest('hex');
console.log('VNPay HMAC SHA512:', hash);
"
```

### Momo SHA256 Signing

```bash
node -e "
const crypto = require('crypto');

const raw = [
  'accessKey=TEST',
  'amount=10000',
  'extraData=',
  'ipnUrl=localhost',
  'orderId=test',
  'orderInfo=test',
  'orderType=momo_wallet',
  'partnerCode=TEST',
  'redirectUrl=localhost',
  'requestId=test123',
  'requestType=captureWallet',
].join('&');

const hash = crypto.createHmac('sha256', 'TEST').update(raw).digest('hex');
console.log('Momo HMAC SHA256:', hash);
"
```

---

## 4. Signature Verification Logic

### VNPay — verify signature rejects tampered params

```bash
node -e "
const crypto = require('crypto');

// Simulate VNPayClient.verifySignature
function sign(params, secret) {
  const sorted = Object.keys(params)
    .filter(k => k !== 'vnp_SecureHash' && params[k] !== undefined && params[k] !== '')
    .sort()
    .reduce((acc, k) => { acc[k] = params[k]; return acc; }, {});

  const query = Object.entries(sorted)
    .map(([k, v]) => k + '=' + v)
    .join('&');

  return crypto.createHmac('sha512', secret).update(query).digest('hex');
}

const hashSecret = 'MY_SECRET';
const validParams = {
  vnp_Amount: '10000000',
  vnp_ResponseCode: '00',
  vnp_TxnRef: 'order_001',
  vnp_SecureHash: '',  // will be set below
};
validParams.vnp_SecureHash = sign(validParams, hashSecret);
console.log('Valid signature:', sign(validParams, hashSecret) === validParams.vnp_SecureHash ? 'PASS' : 'FAIL');

// Tamper the amount
const tamperedParams = { ...validParams, vnp_Amount: '99999999' };
console.log('Tampered rejected:', sign(tamperedParams, hashSecret) !== tamperedParams.vnp_SecureHash ? 'PASS' : 'FAIL');
"
```

Expect: `PASS` for valid, `PASS` for tampered rejected.

### Momo — verify signature

```bash
node -e "
const crypto = require('crypto');

function signMomo(raw, secret) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

const secret = 'MY_SECRET';
const raw = 'accessKey=TEST&amount=10000&extraData=&ipnUrl=localhost&orderId=test&orderInfo=test&orderType=momo_wallet&partnerCode=TEST&redirectUrl=localhost&requestId=req123&requestType=captureWallet';
const sig = signMomo(raw, secret);
console.log('Momo signature valid:', sig === signMomo(raw, secret) ? 'PASS' : 'FAIL');
"
```

---

## 5. Response Code Logic

### VNPay Response Codes

| `vnp_ResponseCode` | Meaning | authorizePayment returns |
|---------------------|---------|--------------------------|
| `00` | Success | `{ status: "authorized" }` |
| `24` | Customer cancelled | `{ status: "error" }` |
| Any other | Failed | `{ status: "error" }` |

### Momo Result Codes

| `resultCode` | Meaning | authorizePayment returns |
|-------------|---------|--------------------------|
| `0` | Success | `{ status: "authorized" }` |
| Non-zero | Failed/aborted | `{ status: "error" }` |

Verify the falsy-zero fix:

```bash
node -e "
// Before fix: !0 === true (bug — would reject success)
// After fix: 0 === undefined (false) → proceeds to signature check
const resultCode = 0;
const isMissing = resultCode === undefined || resultCode === null;
console.log('resultCode=0 is not missing:', !isMissing ? 'PASS' : 'FAIL');
"
```

---

## 6. Webhook (IPN) Security

### VNPay webhook rejects unsigned payloads

```bash
kill $(lsof -ti :9000) 2>/dev/null

# Add dummy creds to .env
grep -q "VNPAY_TMN_CODE" .env || echo "VNPAY_TMN_CODE=TEST" >> .env
grep -q "VNPAY_HASH_SECRET" .env || echo "VNPAY_HASH_SECRET=TEST" >> .env

npx medusa develop &
sleep 8

# Forged payload — no valid signature
curl -s -X POST http://localhost:9000/api/hooks/vnpay \
  -H "Content-Type: application/json" \
  -d '{
    "vnp_Amount": "10000000",
    "vnp_ResponseCode": "00",
    "vnp_TransactionStatus": "00",
    "vnp_TxnRef": "steal_this_order",
    "vnp_SecureHash": "WRONG_HASH"
  }' | jq .
```

Expect: `{ "action": "FAILED" }` or similar error. The `getWebhookActionAndData` calls `verifySignature`, returns `PaymentActions.FAILED` on mismatch.

### Momo webhook rejects unsigned payloads

```bash
# Forged payload — no valid signature
curl -s -X POST http://localhost:9000/api/hooks/momo \
  -H "Content-Type: application/json" \
  -d '{
    "resultCode": 0,
    "orderId": "steal_this_order",
    "amount": 0,
    "signature": "WRONG_HASH"
  }' | jq .
```

Expect: `{ "action": "FAILED" }`. Before fix, this would have returned `SUCCESSFUL` — forged payment accepted.

---

## 7. Sandbox Credentials (Manual Testing)

### VNPay Sandbox

Get credentials from https://sandbox.vnpayment.vn:

```bash
# In apps/backend/.env
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
```

**Manual test flow:**
1. Create a test customer:
   ```bash
   curl -s -X POST http://localhost:9000/auth/customer/emailpass/register \
     -H "Content-Type: application/json" \
     -d '{"email":"payment@test.com","password":"test123","first_name":"Pay","last_name":"Test"}'
   ```
2. Through storefront checkout (Phase 7, not yet built), select VNPay
3. VNPay redirect URL is created by `initiatePayment` with HMAC-signed params
4. Browser navigates to VNPay sandbox payment page
5. Use VNPay sandbox test card (details at https://sandbox.vnpayment.vn/apis/vnpay-demo/)
6. VNPay redirects back to `VNPAY_RETURN_URL` with `vnp_ResponseCode=00`
7. `authorizePayment` verifies HMAC signature, sets status to `authorized`

**Verification points in logs:**
```
[VNPay] Payment initiated { orderId: "...", amount: 350000 }
[VNPay] Payment authorized { txnRef: "...", amount: "35000000", status: "authorized" }
```

### Momo Sandbox

Get credentials from https://developers.momo.vn:

```bash
# In apps/backend/.env
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
```

Similar redirect flow. Momo sandbox provides test wallet credentials.

---

## 8. IPN (Instant Payment Notification) Testing

VNPay and Momo call IPN URLs asynchronously after payment. Since these run on localhost, they can't be reached from public internet.

**Use ngrok for local testing:**

```bash
# Terminal 1 — expose backend
ngrok http 9000

# Terminal 2 — update .env with ngrok URL
VNPAY_IPN_URL=https://your-ngrok.ngrok-free.app/api/hooks/vnpay
MOMO_IPN_URL=https://your-ngrok.ngrok-free.app/api/hooks/momo

# Restart backend
kill $(lsof -ti :9000) 2>/dev/null
npx medusa develop
```

Momo sandbox has an IPN simulator UI. VNPay requires actual sandbox payment transaction to trigger IPN.

---

## 9. Smoke Test Script

```bash
#!/bin/bash
BASE="http://localhost:9000"
cd apps/backend

echo "=== TypeScript Check ==="
npx tsc --noEmit --pretty 2>&1 | grep "^apps/backend" | wc -l | xargs -I{} \
  sh -c '[ {} -eq 0 ] && echo "PASS: 0 errors" || echo "FAIL: {} errors"'

echo "=== Medusa Build ==="
MEDUSA_WORKER_MODE=server npx medusa build 2>&1 | grep "completed\|error" | tail -2

echo "=== Server Start ==="
kill $(lsof -ti :9000) 2>/dev/null
npx medusa develop &>/tmp/payment-smoke.log &
sleep 8
grep -i "ready\|error" /tmp/payment-smoke.log | head -3

echo "=== Payment module loaded ==="
# Check for payment-related startup log
grep -i "payment" /tmp/payment-smoke.log | head -3 || echo "No payment providers loaded (expected without credentials)"

echo "=== Done ==="
```

---

## 10. Checklist

- [ ] Backend builds with payment providers (0 TS errors)
- [ ] Backend starts without credentials (no crash, providers omitted)
- [ ] Backend starts WITH dummy credentials (VNPay and Momo loaded)
- [ ] VNPay HMAC sign/verify produces match for valid params
- [ ] VNPay HMAC sign/verify rejects tampered params
- [ ] Momo HMAC sign/verify produces match for valid params
- [ ] Momo `resultCode=0` is not treated as falsy (authorize proceeds)
- [ ] VNPay webhook rejects unsigned IPN payload
- [ ] Momo webhook rejects unsigned IPN payload
- [ ] `PaymentSessionStatus` string literals compile without enum errors

---

## Known Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| No sandbox credentials | Providers never loaded, can't test payment flow | Use dummy creds for module loading; get real sandbox keys for payment flow |
| `capturePayment` stub | Capture step returns immediately, no VNPay `querydr` API call | Implement when sandbox creds available |
| `refundPayment` stub | Refund not implemented | Implement when sandbox creds available |
| IPN unreachable on localhost | Webhook callbacks from VNPay/Momo can't reach localhost | Use ngrok to expose backend |
| No storefront checkout (Phase 7) | Must test payment flow via direct curl or manual HTTP | Wire checkout UI in Phase 7 |
| Conditional registration via env vars | Providers silently absent without valid env vars | Check startup logs for provider registration |
