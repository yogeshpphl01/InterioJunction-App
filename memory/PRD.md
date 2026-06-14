# Interiojunction — Mobile Operations Platform (PRD)

## Original Problem Statement
Build a mobile app from the shared zip (a PHP "security spine" for the Interiojunction operations platform — a factory-direct modular interior design company). Color scheme must align with the website https://interiojunction.in/ (warm cream #FDFAF6 + black, minimal editorial aesthetic).

## Architecture
- **Frontend:** React Native (Expo SDK 54) + expo-router file-based routing. Role-based tab groups: `(customer)`, `(factory)`, `(staff)`. Custom fonts Playfair Display (display) + DM Sans (text). Theme tokens in `src/theme.ts`.
- **Backend:** FastAPI + MongoDB (motor). JWT auth (pyjwt + passlib/bcrypt). Idempotent startup seeding.
- **Integrations:** Emergent LLM key (gpt-4o) for AI design/quote assistant. SMS OTP delivery is **MOCKED** (dev_code returned in response — Twilio not wired, no keys provided).

## User Personas
- **Customer** — phone+OTP login; tracks project production stages, parts, raises tickets, uses AI assistant.
- **Factory staff** — email login; scans QR part labels (camera or manual) to advance production stages.
- **Sales/Admin** — email login; dashboard KPIs, manage projects, tickets, leads (CRM).

## Core Requirements (static)
- Role-based single app with adaptive navigation.
- Production pipeline: NEW → CUT → EDGE → MACH → FQC → PACK → DISP → SITE.
- Object-level scoping: customers only see their own projects.

## Implemented (2026-06-14)
- Auth: JWT email/password (staff) + phone OTP (customers, mocked SMS). `/auth/login`, `/auth/otp/request`, `/auth/otp/verify`, `/auth/me`.
- Customer: project list + detail with stage timeline & parts breakdown; tickets list/create; AI chat assistant (₹ quotes).
- Factory: camera QR scanner (expo-camera) + manual entry; idempotent stage advance; recent scans.
- Staff: dashboard stats; projects list + create; tickets list + status change; leads list + create.
- Brand-aligned UI (cream + black, Playfair/DM Sans), permission handling, safe-area headers, testIDs.
- Seeded demo data + test credentials in `/app/memory/test_credentials.md`.
- Tested: 30/30 backend pytest pass; all critical frontend flows pass.

## Backlog / Next
- **P1:** Real SMS OTP via Twilio (needs Account SID, Auth Token, Verify Service SID); image/photo uploads for projects & tickets (object storage); push-style status updates.
- **P1:** AI assistant streaming responses + persisted chat history per customer.
- **P2:** Lead → project conversion flow; assign tickets to staff; project search/filter; export reports.
- **P2:** Pin `bcrypt<4` to silence benign passlib startup warning; replace `count_documents+offset` code sequence with a counter doc.
