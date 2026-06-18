<!--
  <document name="README" purpose="Run the app, inspect the UI, demo credentials">
    Top-level guide for the Interiojunction mobile operations platform.
  </document>
-->

# Interiojunction — Mobile Operations Platform

Factory-direct modular-interiors app (modular kitchens, wardrobes, full-home interiors).
One app, three roles — **Customer**, **Factory**, **Sales/Admin** — with adaptive navigation.

- **Frontend:** Expo (React Native) SDK 54 + expo-router. Brand: cream `#FDFAF6` + black, Playfair
  Display + DM Sans (aligned to [interiojunction.in](https://interiojunction.in/)).
- **Backend:** FastAPI + MongoDB (motor), JWT auth (bcrypt staff / phone-OTP customers), gpt-4o design
  assistant.
- **Security & Play Store review:** see **[`SECURITY_REVIEW.md`](./SECURITY_REVIEW.md)**.

## Repo layout
```
backend/server.py        FastAPI app (sections are XML-tagged: search "<section name=")
frontend/app/            expo-router routes (index gate, login, (customer)/(factory)/(staff), project/[code])
frontend/src/            api client, auth, theme, components (ui, Header, LeadSheet, StageTimeline), screens
design_guidelines.json   brand tokens derived from the website
SECURITY_REVIEW.md       pre-launch security + Google Play compliance report
```
> Every source file opens with an XML navigation banner (`<screen>/<module>/<component>…`) so you (or
> Claude) can jump straight to a concern. Try: `grep -rn "<screen route=" frontend/app`.

## Run the backend
```bash
cd backend
pip install -r requirements.txt
# Required env (see SECURITY_REVIEW.md §5):
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="interiojunction"
export JWT_SECRET="$(python3 -c 'import secrets;print(secrets.token_urlsafe(48))')"  # >= 32 chars
export EMERGENT_LLM_KEY="…"          # optional; AI assistant returns 503 without it
export DEMO_MODE="true"              # dev only — enables demo sign-in. SET false IN PROD.
export ALLOWED_ORIGINS="*"           # lock down in prod
uvicorn server:app --host 0.0.0.0 --port 8000 --app-dir backend
```

## Run the frontend
```bash
cd frontend
yarn install
export EXPO_PUBLIC_BACKEND_URL="https://<your-backend-host>"   # must be https in prod
yarn start        # then press a (Android) / i (iOS) / w (web)
```

## Demo account — inspect the UI (requires `DEMO_MODE=true`)
The backend seeds a reviewer account on startup. **These work only while `DEMO_MODE` is on** and must be
removed/rotated for production.

| Role | How to sign in |
|------|----------------|
| **Customer** | Login → **Customer** tab → phone **`1234567890`** → Send OTP → enter OTP **`1234567890`** → Verify. (A demo project is seeded so the screens aren't empty.) |
| **Admin (staff)** | Login → **Staff** tab → email **`1234567890`** / password **`1234567890`**. |

Other pre-seeded staff (to inspect every surface): `admin@interiojunction.in / Admin@123`,
`sales@interiojunction.in / Sales@123`, `factory@interiojunction.in / Factory@123` (factory = QR scanner).

> In demo mode the customer OTP screen also auto-fills the dev code, and the master code `1234567890`
> is accepted for any number. Both behaviors are disabled when `DEMO_MODE=false`.

## Website-parity actions
The two public actions from the website are built in: **Get a Free Quote** and **Request a Callback**
(login screen *and* customer home). Submissions post to `POST /public/quote` and `POST /public/callback`
and land in the staff **Leads** CRM (tagged `app-quote` / `app-callback`).
