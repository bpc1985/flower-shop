# Testing Phase 4 — Authentication

Phase 4 implements three auth providers: Email/Password, Phone OTP, Google OAuth. All testable without external credentials except Google.

## Prerequisites

```bash
docker compose up -d       # PostgreSQL 16 + Redis 7 + MinIO
cd apps/backend
npx medusa db:migrate      # Ensure migrations run
npx medusa develop         # Start backend on :9000
```

No env vars needed for email + phone OTP. Backend uses DevSMS (code printed to console).

---

## 1. Email/Password

### Register

```bash
curl -s -X POST http://localhost:9000/auth/customer/emailpass/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234","first_name":"An","last_name":"Nguyen"}' | jq .
```

Expect: `{ "token": "eyJ..." }`

### Login (success)

```bash
curl -s -X POST http://localhost:9000/auth/customer/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}' | jq .
```

Expect: `{ "token": "eyJ..." }`

### Login (wrong password)

```bash
curl -s -X POST http://localhost:9000/auth/customer/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}' | jq .
```

Expect: `{ "type": "unauthorized", "message": "..." }`

---

## 2. Phone OTP

### Request OTP

```bash
curl -s -X POST http://localhost:9000/auth/customer/phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"0909123456"}' | jq .
```

Expect: `{ "location": "/auth/customer/phone-otp/callback?phone=0909123456" }`

**Check backend console** for the 6-digit code:

```
========================================
[DEV SMS] OTP for 0909123456: 482917
========================================
```

### Verify OTP (correct code)

```bash
curl -s -X POST http://localhost:9000/auth/customer/phone-otp/callback \
  -H "Content-Type: application/json" \
  -d '{"phone":"0909123456","code":"482917"}' | jq .
```

Expect: `{ "token": "eyJ..." }`

### Verify OTP (wrong code)

```bash
curl -s -X POST http://localhost:9000/auth/customer/phone-otp/callback \
  -H "Content-Type: application/json" \
  -d '{"phone":"0909123456","code":"000000"}' | jq .message
```

Expect: `"Mã OTP không đúng. Còn 4 lần thử."`

### Invalid phone format

```bash
curl -s -X POST http://localhost:9000/auth/customer/phone-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"abc123"}' | jq .error
```

Expect: `"Số điện thoại không hợp lệ."`

### Missing phone

```bash
curl -s -X POST http://localhost:9000/auth/customer/phone-otp \
  -H "Content-Type: application/json" \
  -d '{}' | jq .error
```

Expect: `"Số điện thoại không được để trống."`

---

## 3. Rate Limiting

### Max requests per window (3 per 5 min)

```bash
for i in $(seq 1 4); do
  echo "Request $i:"
  curl -s -X POST http://localhost:9000/auth/customer/phone-otp \
    -H "Content-Type: application/json" \
    -d '{"phone":"0909123457"}' | jq '.error // .location'
done
```

Request 4 expects: `"Quá 3 lần gửi mã trong 5 phút. Vui lòng thử lại sau."`

### Max failed attempts (5 per code)

```bash
for i in $(seq 1 6); do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:9000/auth/customer/phone-otp/callback \
    -H "Content-Type: application/json" \
    -d '{"phone":"0909123456","code":"000000"}' | jq .message
done
```

Attempt 6 expects: `"Quá số lần thử. Vui lòng yêu cầu mã mới."`

---

## 4. Storefront UI

```bash
cd apps/storefront
npx next dev --port 8000
```

Open `http://localhost:8000`. Click user icon in header.

| Test | Steps | Expected |
|------|-------|----------|
| Email login | Enter registered email + password, submit | Toast: "Đăng nhập thành công", dialog closes, user icon shows |
| Phone OTP | Switch to phone tab, enter phone, click "Gửi mã OTP" | OTP input appears, code in backend console |
| OTP verify | Enter correct code | Toast: "Xác thực thành công", dialog closes |
| Register | Toggle to register mode, fill form, submit | Toast: "Đăng ký thành công" |
| Logout | Click log-out icon | User icon reverts to login button |
| Validation | Submit empty login form | Inline Zod error: email + password required |
| Language switch | Switch locale to EN | All auth strings in English |
| Resend cooldown | Request OTP, then try again immediately | Button disabled, countdown: "Gửi lại sau 59s" |

---

## 5. Google OAuth

Provider auto-disabled when `GOOGLE_CLIENT_ID` is absent. Not testable without GCP project.

To enable:

```bash
# In apps/backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

Restart backend. Visit `http://localhost:9000/auth/customer/google` — should redirect to Google consent.

---

## 6. Smoke Test Script

```bash
#!/bin/bash
BASE="http://localhost:9000"

echo "=== Register ==="
TOKEN=$(curl -s -X POST "$BASE/auth/customer/emailpass/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"smoke123","first_name":"A","last_name":"B"}' | jq -r '.token')
[ -n "$TOKEN" ] && echo "PASS: got token" || echo "FAIL: no token"

echo "=== Login ==="
TOKEN=$(curl -s -X POST "$BASE/auth/customer/emailpass" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"smoke123"}' | jq -r '.token')
[ -n "$TOKEN" ] && echo "PASS: login ok" || echo "FAIL: login failed"

echo "=== Phone OTP request ==="
LOC=$(curl -s -X POST "$BASE/auth/customer/phone-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0987654321"}' | jq -r '.location')
[[ "$LOC" == *callback* ]] && echo "PASS: got callback location" || echo "FAIL: $LOC"

echo "=== Wrong OTP ==="
MSG=$(curl -s -X POST "$BASE/auth/customer/phone-otp/callback" \
  -H "Content-Type: application/json" \
  -d '{"phone":"0987654321","code":"000000"}' | jq -r '.message')
[[ "$MSG" == *"không đúng"* ]] && echo "PASS: wrong code rejected" || echo "FAIL: $MSG"

echo "=== Invalid phone ==="
ERR=$(curl -s -X POST "$BASE/auth/customer/phone-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"abc"}' | jq -r '.error')
[[ "$ERR" == *"không hợp lệ"* ]] && echo "PASS: invalid phone rejected" || echo "FAIL: $ERR"

echo "=== Done ==="
```

All 5 checks should pass.

---

## 7. Known Limitations

| Item | Impact | Workaround |
|------|--------|------------|
| OTP state in-memory only | Lost on restart | Use Redis-backed state for production (`setState` API supports it) |
| DevSMS logs OTP to console | Must watch server logs | Real SMS via `ESMS_API_KEY` or `SPEEDSMS_API_KEY` env vars |
| Google OAuth needs GCP | Can't test redirect flow | Provider auto-disabled when credentials missing |
| No email verification | User can register with any email | Add email verification flow if needed |
