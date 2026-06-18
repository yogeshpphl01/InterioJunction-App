<!--
  <document name="SECURITY_REVIEW" audience="Interiojunction eng + Play Store reviewer">
    Pre-launch security & Google Play policy review of the Interiojunction app
    (Expo/React Native client + FastAPI/MongoDB backend). Findings that were
    fixed in this branch are marked [FIXED]; items requiring your action before
    publishing are marked [ACTION].
  </document>
-->

# Interiojunction — Security & Google Play Compliance Review

**Reviewer role:** Senior Mobile App Security Engineer / Android Developer
**Scope:** `backend/server.py`, `frontend/` (Expo RN), `frontend/app.json`, repo config
**Date:** 2026-06-18
**Branch:** `claude/gallant-edison-714rmn`

> **Architecture note (important):** This is **not** a native Android project — it is an
> **Expo (React Native) SDK 54** app with a **FastAPI + MongoDB** backend. There is no
> hand-written `AndroidManifest.xml`; the manifest is **generated from `frontend/app.json`**.
> Permission, cleartext, and component-export review therefore happens against `app.json`
> (and any config plugins), not a checked-in manifest.

---

## 1. Summary report — readiness

| Area | Before review | After this branch |
|------|---------------|-------------------|
| Secrets in code | None found ✅ | None ✅ |
| OTP one-time-code handling | **Leaked to client + logs** 🔴 | Gated behind `DEMO_MODE` ✅ [FIXED] |
| CORS | `*` origin **with credentials** 🔴 | Credentials off, origins env-driven ✅ [FIXED] |
| Auth secret / OTP hashing | Weak (bare SHA-256), no key-length floor 🟠 | HMAC-SHA256 + 32-char `JWT_SECRET` floor ✅ [FIXED] |
| Input validation | None (unbounded strings) 🟠 | Pydantic length bounds ✅ [FIXED] |
| Error leakage (AI) | Raw exception returned 🟠 | Generic message ✅ [FIXED] |
| Permissions (`app.json`) | Camera only — minimal ✅ | Camera only ✅ |
| Privacy Policy / Data Safety | **Missing** 🔴 | Still **required from you** 🔴 [ACTION] |
| Cleartext/HTTPS enforcement | Not explicit 🟠 | Documented config below 🟠 [ACTION] |
| Rate limiting (login/OTP/lead) | None 🟠 | Recommended below 🟠 [ACTION] |
| Repo hygiene | 14.6k build-cache files committed 🟠 | Untracked ✅ [FIXED] |

**Verdict:** The app was **not submission-ready** as originally written, primarily due to the
OTP code disclosure, the CORS misconfiguration, and the **missing Privacy Policy / Data Safety
declaration**. The code-level issues are fixed in this branch. **Three launch blockers remain and
are your action items:** (1) publish a Privacy Policy + complete the Play **Data Safety** form,
(2) set `DEMO_MODE=false` and rotate/remove seeded demo credentials, (3) enforce HTTPS / disable
cleartext and add the env config below.

---

## 2. Google Play policy & safety compliance

### 2.1 Permissions — *Compliant* ✅
`frontend/app.json` requests exactly one runtime permission:

```jsonc
"android": { "permissions": ["android.permission.CAMERA"] }
"ios":     { "infoPlist": { "NSCameraUsageDescription": "Scan QR labels to track furniture parts" } }
```

- **No** `ACCESS_BACKGROUND_LOCATION`, `READ/SEND_SMS`, `READ_EXTERNAL_STORAGE`,
  `MANAGE_EXTERNAL_STORAGE`, `QUERY_ALL_PACKAGES`, contacts, or phone-state permissions.
- `CAMERA` is **justified and narrowly used** (QR part-scanning in `app/(factory)/index.tsx`) with a
  clear in-context rationale string — this is exactly what Play's Permissions policy expects.
- **Action [minor]:** Expo may merge `INTERNET` automatically (expected). Before upload, run
  `npx expo prebuild` and review the generated `android/app/src/main/AndroidManifest.xml` to confirm
  no transitive library adds an unexpected permission (e.g., ad SDKs). None are present today.

### 2.2 User-data & Data Safety — *Action required* 🔴 [ACTION]
The app **collects and transmits personal data**, so a **Privacy Policy URL** and a completed
**Data Safety** form are mandatory:

| Data type | Where | Collected/Shared | Notes |
|-----------|-------|------------------|-------|
| Name, phone | login/OTP, lead forms (`auth.py`, `/public/*`) | Collected | Account + lead capture |
| Email (staff) | `/auth/login` | Collected | Staff auth |
| Approx. identifiers | JWT `sub` (random UUID) | Collected | Not a hardware ID — good |
| Camera | factory scanner | Used, **not stored** | Declare "used, not collected" |
| Chat content | `/ai/chat` → OpenAI (via Emergent) | **Shared with third party** | Must disclose LLM processing |

- **Action:** Publish a privacy policy (hosted URL), declare the above in **Play Console → App content
  → Data safety**, and add the URL to the store listing. Disclose that design-assistant messages are
  processed by a third-party LLM provider.
- **Action:** Add account-deletion support/contact (Play requires a way to request data/account
  deletion for apps with accounts).

### 2.3 Device & Network Abuse / self-update — *Compliant* ✅
- **No self-update / DEX/native-code download** mechanism exists (no `expo-updates`, no APK
  side-loading, no remote code eval). This satisfies the "Device and Network Abuse" / unofficial-update
  policy. If you later add `expo-updates`, note Play **permits JS-only OTA** updates but **prohibits**
  shipping new **native** code outside Play — keep OTA to JS/asset bundles only.

---

## 3. OWASP Mobile Top-10 findings

Severity: 🔴 high · 🟠 medium · 🟡 low. "Before" line numbers refer to the original `backend/server.py`.

### F-1 🔴 [FIXED] — One-time OTP disclosed to client & logs *(M1 Improper Credential Usage / M9)*
**Before** (`server.py` ~L163-173): every OTP request **returned the code** (`dev_code`) in the HTTP
response **and** logged it in plaintext — unconditionally, even in production. Anyone hitting
`/auth/otp/request` for a victim's number received a valid login code.
```python
logger.info("OTP for %s: %s", phone, code)
return {"sent": True, "dev_code": code, "note": "..."}
```
**After:** echo + logging happen **only when `DEMO_MODE` is on** (a non-production flag, default-off in
prod). Production responses return `{"sent": true}` and nothing else.
```python
resp = {"sent": True}
if DEMO_MODE:
    logger.info("OTP for %s: %s", phone, code)
    resp["dev_code"] = code
return resp
```

### F-2 🔴 [FIXED] — CORS wildcard **with credentials** *(M3 Insecure Communication / misconfig)*
**Before** (`server.py` ~L476-477): `allow_origins=["*"]` together with `allow_credentials=True` and
wildcard methods/headers. This combination is spec-invalid and, if cookies were ever used, would expose
the API to cross-site credentialed calls.
```python
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
```
**After:** credentials disabled (this is a **bearer-token** API — no cookies to protect), explicit method/
header allow-lists, and origins from `ALLOWED_ORIGINS` env (lock down in prod):
```python
app.add_middleware(CORSMiddleware, allow_credentials=False,
                   allow_origins=ALLOWED_ORIGINS,
                   allow_methods=["GET","POST","PATCH","OPTIONS"],
                   allow_headers=["Authorization","Content-Type"])
```

### F-3 🟠 [FIXED] — Weak OTP hashing + no secret-strength floor *(M10 / Cryptography)*
**Before:** OTPs stored as bare `sha256(code)` (`sha()` ~L56) — a 6-digit space is trivially
rainbow-tabled; `JWT_SECRET` was read with no minimum length (`os.environ['JWT_SECRET']` ~L26).
**After:** OTP stored as **HMAC-SHA256 keyed with the server secret and bound to the phone**, compared in
**constant time**; boot **fails fast** unless `JWT_SECRET` ≥ 32 chars.
```python
def otp_hash(phone, code):
    return hmac.new(JWT_SECRET.encode(), f"{phone}|{code}".encode(), hashlib.sha256).hexdigest()
# verify: hmac.compare_digest(rec["code_hash"], otp_hash(phone, code))
```
*Passwords were already bcrypt — good. No MD5/SHA-1 anywhere.* ✅

### F-4 🟠 [FIXED] — No input validation / unbounded payloads *(M4 Insufficient Input Validation)*
**Before:** request models had no length/range limits (`str` everywhere) — enables oversized payloads and
junk data. **After:** every Pydantic model has `Field(min_length/max_length/ge/le)` bounds (e.g.,
`message ≤ 4000`, `parts 1..100`, phone `8..20`).

### F-5 🟠 [FIXED] — Internal error string leaked from AI endpoint *(M1 / information disclosure)*
**Before** (~L389): `raise HTTPException(502, f"AI service error: {e}")` returned the raw provider
exception (could include upstream URLs/keys) to the client. **After:** logs server-side, returns a generic
`"AI service is temporarily unavailable"`; also returns `503` if the LLM key is unconfigured.

### F-6 🟠 [ACTION] — Cleartext traffic not explicitly disabled *(M3 Insecure Communication)*
The client builds its base URL from `EXPO_PUBLIC_BACKEND_URL` (`frontend/src/api.ts`). Nothing enforces
HTTPS. **Action:** ensure that env var is `https://…` in all release builds and **disable cleartext** on
Android via `expo-build-properties`:
```bash
npx expo install expo-build-properties
```
```jsonc
// frontend/app.json → expo.plugins
["expo-build-properties", { "android": { "usesCleartextTraffic": false } }]
```
For sensitive endpoints, consider **TLS certificate pinning** (e.g., `react-native-ssl-pinning` or an
OkHttp `network_security_config`) — recommended given auth + PII flows.

### F-7 🟠 [ACTION] — No rate limiting on auth & public lead endpoints *(M1 / abuse)*
`/auth/login`, `/auth/otp/request`, `/public/quote`, `/public/callback` have no throttle. OTP *verify*
is capped at 5 attempts (good), but *request* is not → SMS-bomb / enumeration / lead-spam risk.
**Action:** add IP+phone rate limiting (e.g., `slowapi`, or a reverse-proxy/WAF rule), e.g. 5 OTP
requests / number / hour and 20 lead posts / IP / hour. Add a CAPTCHA on the public lead forms if abused.

### F-8 🟡 [ACTION] — Customer PII cached in plaintext AsyncStorage *(M2 Insecure Data Storage)*
`frontend/src/auth.tsx:43` stores the user profile (name/phone/email) via `storage.setItem("ij_user", …)`
(AsyncStorage = plaintext). The **token is correctly in SecureStore** (`secureSet("ij_token")`) ✅. Risk is
low (non-secret profile, app-private sandbox) but on a rooted device it's readable. **Action (optional):**
move `ij_user` to `secureSet`/`secureGet`, or store only the non-PII fields needed for first paint.

### F-9 🔴 [ACTION] — Demo accounts & `DEMO_MODE` must be disabled for production
Seeded staff use weak, well-known passwords (`Admin@123`, etc.), and the new reviewer accounts
(phone/email `1234567890`) plus the master demo OTP exist **only while `DEMO_MODE` is on**. **Action:**
in production set `DEMO_MODE=false` (disables OTP echo + master code) **and** remove or rotate all seeded
credentials. The startup logs a loud warning while `DEMO_MODE` is on.

### F-10 — Reviewed & acceptable ✅
- **Login user-enumeration:** `/auth/login` already returns one generic error for both bad-user and
  bad-password (`server.py`) — good.
- **Object-level authZ (IDOR):** `/projects` and `/projects/{code}` scope customers to their own
  `customer_id` and return **404** (not 403) on cross-customer access — good, no info leak.
- **NoSQL injection:** queries use Pydantic-typed **strings** (never raw user objects/`$`-operators), so
  Mongo operator injection isn't reachable. Low risk; keep models strict.
- **Component export / deep links:** Expo-managed; only the standard launcher activity is exported, and
  there are **no custom exported Services/Receivers/Providers**. The deep-link `scheme` is the default
  `"frontend"` — **Action [minor]:** rename to a branded scheme (e.g., `interiojunction`) and verify
  Android App Links if you handle inbound URLs.
- **Unsafe deserialization:** none (no `pickle`/`eval`/`yaml.load`; JSON only). ✅
- **Hardcoded secrets:** none found in tracked source; `.env*` is gitignored. ✅

---

## 4. Other production hardening (recommended)

- **Trim backend dependencies** (`backend/requirements.txt`): `python-jose`, `pandas`, `numpy`, `boto3`,
  `requests-oauthlib`, `jq`, `typer` are **not imported** by `server.py`. Unused packages = needless
  attack surface and image size. Remove what the app doesn't use (keep only fastapi/uvicorn/motor/pymongo/
  pydantic/pyjwt/passlib/bcrypt/python-dotenv/emergentintegrations/python-multipart/email-validator).
  *Note:* `python-jose` is a second JWT lib you don't use — drop it.
- **Counter docs instead of `count_documents()+offset`** for project/ticket numbering (race-safe IDs).
- **Security headers** are now added at the API (`X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`). Put the API behind TLS + a WAF/proxy that also sets HSTS.
- **Token lifetime:** JWTs live 14 days with no revocation. Consider shorter access tokens + refresh, or a
  server-side denylist for logout-everywhere.

---

## 5. Go-live checklist

- [ ] **Set `DEMO_MODE=false`** in the production backend env (disables OTP echo + master demo code).  [F-1, F-9]
- [ ] **Remove/rotate** all seeded demo credentials before the prod DB goes live.  [F-9]
- [ ] **Set `ALLOWED_ORIGINS`** to your real web origins (not `*`).  [F-2]
- [ ] **Set a strong `JWT_SECRET`** (≥ 32 random chars) and a real `MONGO_URL`/`DB_NAME`.  [F-3]
- [ ] **`EXPO_PUBLIC_BACKEND_URL` = https://** and add `expo-build-properties` cleartext=false.  [F-6]
- [ ] **Publish a Privacy Policy** + complete the Play **Data Safety** form (incl. LLM data sharing).  [2.2]
- [ ] Add **account/data-deletion** path.  [2.2]
- [ ] Add **rate limiting** to `/auth/*` and `/public/*`.  [F-7]
- [ ] (Optional) Move `ij_user` to SecureStore; add **TLS pinning**.  [F-8, F-6]
- [ ] Run `npx expo prebuild` and review the **generated** AndroidManifest for unexpected permissions.  [2.1]
- [ ] Rename deep-link `scheme` to a branded value; set up App Links if used.  [F-10]

*Items marked **[FIXED]** are already implemented in this branch (`backend/server.py`).*
