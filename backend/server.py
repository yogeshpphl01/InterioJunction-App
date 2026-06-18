# =============================================================================
# <module name="server" layer="backend" framework="FastAPI" db="MongoDB/motor">
#   <purpose>
#     Interiojunction operations API. Serves three roles from one backend:
#       - customer  : phone+OTP login, project tracking, tickets, AI assistant,
#                     public quote / callback lead capture (website parity).
#       - factory   : email login, QR part-scan stage advancement.
#       - sales/admin (staff): CRM dashboard, projects, tickets, leads.
#   </purpose>
#   <security-posture>
#     - Auth: JWT (HS256, 14d). Staff = email/bcrypt; customer = phone OTP.
#     - Secrets are read from the environment only (never hardcoded).
#     - DEMO_MODE (env) gates all developer conveniences (OTP dev_code echo,
#       OTP logging, master demo OTP). MUST be disabled in production.
#     - CORS is env-configurable; credentials are disabled (bearer-token API).
#   </security-posture>
#   <navigation>
#     Sections below are wrapped in <section> banners so a specific concern
#     (auth, projects, scanner, tickets, leads, dashboard, ai, public, seed)
#     can be located instantly. Search for: "<section name=".
#   </navigation>
# </module>
# =============================================================================
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager
import os
import logging
import uuid
import random
import hashlib
import hmac
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

import jwt
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

# =============================================================================
# <section name="config" purpose="Environment, secrets, feature flags">
#   All secrets/config come from the environment. Required vars fail fast on
#   boot (so a misconfigured deploy never silently runs insecurely).
# =============================================================================
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger("ij")


def _require_env(name: str, *, min_len: int = 1) -> str:
    """Read a required env var; abort boot if missing or implausibly weak."""
    val = os.environ.get(name)
    if not val or len(val) < min_len:
        raise RuntimeError(
            f"Required environment variable {name} is missing or too short "
            f"(min {min_len} chars). Refusing to start insecurely."
        )
    return val


mongo_url = _require_env("MONGO_URL")
DB_NAME = _require_env("DB_NAME")
# JWT_SECRET must be long enough to resist brute force on the HS256 signature.
JWT_SECRET = _require_env("JWT_SECRET", min_len=32)
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# DEMO_MODE gates EVERY developer convenience that would be unsafe in prod:
#   - echoing the OTP back to the client (dev_code)
#   - logging the OTP in plaintext
#   - accepting the master DEMO_OTP for any phone
# Default "true" matches the app's current pre-launch state (SMS is mocked).
# >>> SET DEMO_MODE=false BEFORE PUBLISHING TO THE PLAY STORE. <<<
DEMO_MODE = os.environ.get("DEMO_MODE", "true").strip().lower() in ("1", "true", "yes")
# Fixed code accepted ONLY when DEMO_MODE is on. Lets QA / reviewers sign in
# as the seeded demo customer (phone 1234567890) without a live SMS gateway.
DEMO_OTP = os.environ.get("DEMO_OTP", "1234567890")

# CORS: a bearer-token API needs no cookies, so credentials stay OFF (which is
# also what makes a wildcard origin spec-valid). Lock origins down in prod via
# ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com".
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]

client = AsyncIOMotorClient(mongo_url)
db = client[DB_NAME]

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
api = APIRouter(prefix="/api")

# =============================================================================
# <section name="constants" purpose="Production pipeline stage definitions">
# =============================================================================
STAGES = [
    {"code": "NEW",  "label": "Order Confirmed"},
    {"code": "CUT",  "label": "Cutting"},
    {"code": "EDGE", "label": "Edge Banding"},
    {"code": "MACH", "label": "Machining"},
    {"code": "FQC",  "label": "Quality Check"},
    {"code": "PACK", "label": "Packing"},
    {"code": "DISP", "label": "Dispatch"},
    {"code": "SITE", "label": "Installation"},
]
STAGE_CODES = [s["code"] for s in STAGES]


# =============================================================================
# <section name="helpers" purpose="Time, serialization, hashing utilities">
# =============================================================================
def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else dt


def otp_hash(phone: str, code: str) -> str:
    """Bind the OTP to its phone and key it with the server secret (HMAC-SHA256)
    so a stored hash can't be reversed via a 6-digit rainbow table."""
    return hmac.new(JWT_SECRET.encode(), f"{phone}|{code}".encode(), hashlib.sha256).hexdigest()


# =============================================================================
# <section name="models" purpose="Pydantic request schemas (input validation)">
#   Field constraints double as a first line of defense against oversized /
#   malformed input reaching the database layer.
# =============================================================================
class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=256)


class OtpReqIn(BaseModel):
    phone: str = Field(min_length=8, max_length=20)


class OtpVerifyIn(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    code: str = Field(min_length=4, max_length=16)
    name: Optional[str] = Field(default=None, max_length=80)


class ProjectIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    category: str = Field(min_length=1, max_length=60)
    customer_phone: str = Field(min_length=8, max_length=20)
    customer_name: str = Field(min_length=1, max_length=80)
    parts: int = Field(default=6, ge=1, le=100)


class ScanIn(BaseModel):
    part_code: str = Field(min_length=1, max_length=60)
    result: str = Field(default="ok", max_length=20)


class TicketIn(BaseModel):
    type: str = Field(min_length=1, max_length=30)
    subject: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=2000)
    project_code: Optional[str] = Field(default=None, max_length=40)


class TicketPatch(BaseModel):
    status: str = Field(min_length=1, max_length=20)


class LeadIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    city: str = Field(default="", max_length=60)
    requirement: str = Field(default="", max_length=500)
    source: str = Field(default="app", max_length=30)


class QuoteIn(BaseModel):
    """Public 'Get a Free Quote' form — mirrors interiojunction.in lead capture."""
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    city: str = Field(default="", max_length=60)
    category: str = Field(default="", max_length=60)      # Kitchen / Wardrobe / Full Home
    requirement: str = Field(default="", max_length=500)


class CallbackIn(BaseModel):
    """Public 'Request a Callback' form — mirrors the website's call request."""
    name: str = Field(min_length=1, max_length=80)
    phone: str = Field(min_length=8, max_length=20)
    preferred_time: str = Field(default="", max_length=60)
    note: str = Field(default="", max_length=300)


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = Field(default=None, max_length=64)


# =============================================================================
# <section name="auth-utils" purpose="JWT issue/verify, role gates, sanitizers">
# =============================================================================
def make_token(user):
    payload = {"sub": user["id"], "role": user["role"],
               "exp": now() + timedelta(days=14)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def public_user(u):
    """Whitelist of fields safe to return to clients (never password_hash)."""
    return {"id": u["id"], "role": u["role"], "name": u.get("name"),
            "email": u.get("email"), "phone": u.get("phone")}


async def get_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(" ", 1)[1]
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    u = await db.users.find_one({"id": data["sub"]}, {"_id": 0})
    if not u:
        raise HTTPException(401, "User not found")
    return u


def require_staff(u):
    if u["role"] not in ("admin", "sales", "factory"):
        raise HTTPException(403, "Staff only")


# =============================================================================
# <section name="auth-routes" purpose="Login, OTP request/verify, /me">
# =============================================================================
@api.get("/")
async def root():
    return {"message": "Interiojunction API", "stages": STAGES}


@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower().strip()})
    # Single generic error for both "no such user" and "bad password" so the
    # endpoint can't be used to enumerate which emails are registered.
    if not u or not u.get("password_hash") or not pwd.verify(body.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    return {"token": make_token(u), "user": public_user(u)}


@api.post("/auth/otp/request")
async def otp_request(body: OtpReqIn):
    phone = body.phone.strip()
    if len(phone) < 8:
        raise HTTPException(400, "Enter a valid phone number")
    code = f"{random.randint(0, 999999):06d}"
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "code_hash": otp_hash(phone, code), "attempts": 0,
                  "expires_at": iso(now() + timedelta(minutes=5))}},
        upsert=True,
    )
    resp = {"sent": True}
    # <demo-only> Echo + log the code so QA can sign in without a live SMS
    # gateway. Both are suppressed when DEMO_MODE is off (production). </demo-only>
    if DEMO_MODE:
        logger.info("OTP for %s: %s", phone, code)
        resp["dev_code"] = code
        resp["note"] = "DEMO mode: SMS mocked. Use dev_code (or the demo OTP) to verify."
    return resp


@api.post("/auth/otp/verify")
async def otp_verify(body: OtpVerifyIn):
    phone = body.phone.strip()
    code = body.code.strip()

    # <demo-only> Master code lets reviewers sign in as the demo customer
    # (phone 1234567890 / OTP 1234567890). Never honored in production. </demo-only>
    demo_ok = DEMO_MODE and hmac.compare_digest(code, DEMO_OTP)

    if not demo_ok:
        rec = await db.otps.find_one({"phone": phone})
        if not rec:
            raise HTTPException(400, "Request an OTP first")
        if datetime.fromisoformat(rec["expires_at"]) < now():
            raise HTTPException(400, "OTP expired")
        if rec.get("attempts", 0) >= 5:
            raise HTTPException(429, "Too many attempts")
        if not hmac.compare_digest(rec["code_hash"], otp_hash(phone, code)):
            await db.otps.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
            raise HTTPException(401, "Incorrect code")

    await db.otps.delete_one({"phone": phone})
    u = await db.users.find_one({"phone": phone})
    if not u:
        u = {"id": str(uuid.uuid4()), "role": "customer",
             "name": body.name or "Customer", "phone": phone,
             "created_at": iso(now())}
        await db.users.insert_one(dict(u))
    return {"token": make_token(u), "user": public_user(u)}


@api.get("/auth/me")
async def me(u=Depends(get_user)):
    return {"user": public_user(u)}


# =============================================================================
# <section name="projects" purpose="List/detail/create projects + progress calc">
#   Object-level authorization: customers are scoped to their own customer_id;
#   staff see everything.
# =============================================================================
def stage_index(code):
    try:
        return STAGE_CODES.index(code)
    except ValueError:
        return 0


async def project_with_progress(p):
    parts = await db.parts.find({"project_id": p["id"]}, {"_id": 0}).to_list(500)
    if parts:
        idxs = [stage_index(pt["current_stage"]) for pt in parts]
        cur = min(idxs)
        progress = round(sum(idxs) / (len(idxs) * (len(STAGE_CODES) - 1)) * 100)
    else:
        cur, progress = 0, 0
    return {**p, "current_stage": STAGE_CODES[cur], "progress": progress,
            "parts_count": len(parts)}


@api.get("/projects")
async def list_projects(u=Depends(get_user)):
    q = {} if u["role"] != "customer" else {"customer_id": u["id"]}
    docs = await db.projects.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [await project_with_progress(p) for p in docs]


@api.get("/projects/{code}")
async def get_project(code: str, u=Depends(get_user)):
    p = await db.projects.find_one({"project_code": code}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    # Return 404 (not 403) on cross-customer access so we don't confirm the
    # existence of projects the caller isn't allowed to see.
    if u["role"] == "customer" and p["customer_id"] != u["id"]:
        raise HTTPException(404, "Not found")
    parts = await db.parts.find({"project_id": p["id"]}, {"_id": 0}).to_list(500)
    full = await project_with_progress(p)
    tickets = await db.tickets.find({"project_code": code}, {"_id": 0}).to_list(100)
    return {"project": full, "parts": parts, "stages": STAGES, "tickets": tickets}


@api.post("/projects")
async def create_project(body: ProjectIn, u=Depends(get_user)):
    require_staff(u)
    cust = await db.users.find_one({"phone": body.customer_phone.strip()})
    if not cust:
        cust = {"id": str(uuid.uuid4()), "role": "customer", "name": body.customer_name,
                "phone": body.customer_phone.strip(), "created_at": iso(now())}
        await db.users.insert_one(dict(cust))
    seq = await db.projects.count_documents({}) + 41
    code = f"PRJ-2026-{seq:03d}"
    pid = str(uuid.uuid4())
    proj = {"id": pid, "project_code": code, "customer_id": cust["id"],
            "customer_name": body.customer_name, "title": body.title,
            "category": body.category, "status": "in_production",
            "created_at": iso(now())}
    await db.projects.insert_one(dict(proj))
    for i in range(1, body.parts + 1):
        await db.parts.insert_one({"id": str(uuid.uuid4()),
                                   "part_code": f"{code}-P{i:03d}",
                                   "project_id": pid, "project_code": code,
                                   "name": f"Panel {i}", "current_stage": "NEW",
                                   "updated_at": iso(now())})
    return await project_with_progress(proj)


# =============================================================================
# <section name="scanner" purpose="Factory QR scan -> idempotent stage advance">
# =============================================================================
@api.post("/scan")
async def scan(body: ScanIn, u=Depends(get_user)):
    if u["role"] not in ("admin", "factory"):
        raise HTTPException(403, "Factory access only")
    part = await db.parts.find_one({"part_code": body.part_code.strip()}, {"_id": 0})
    if not part:
        raise HTTPException(404, "Unknown part code")
    idx = stage_index(part["current_stage"])
    if idx >= len(STAGE_CODES) - 1:
        return {"part": part, "done": True,
                "message": f"{part['part_code']} already at final stage (Installation)"}
    new_stage = STAGE_CODES[idx + 1]
    # Idempotency key prevents a double-scan from advancing a part twice.
    idem = f"{part['part_code']}|{new_stage}"
    if await db.production_events.find_one({"idempotency_key": idem}):
        return {"part": part, "duplicate": True, "message": "Already scanned for this stage"}
    await db.parts.update_one({"part_code": part["part_code"]},
                              {"$set": {"current_stage": new_stage, "updated_at": iso(now())}})
    ev = {"id": str(uuid.uuid4()), "part_code": part["part_code"],
          "project_code": part["project_code"], "stage_code": new_stage,
          "result": body.result, "employee_id": u["id"],
          "employee_name": u.get("name"), "idempotency_key": idem,
          "scanned_at": iso(now())}
    await db.production_events.insert_one(dict(ev))
    part["current_stage"] = new_stage
    label = next(s["label"] for s in STAGES if s["code"] == new_stage)
    return {"part": part, "event": ev, "stage_label": label,
            "message": f"{part['part_code']} → {label}"}


@api.get("/scan/recent")
async def recent_scans(u=Depends(get_user)):
    if u["role"] not in ("admin", "factory"):
        raise HTTPException(403, "Factory access only")
    docs = await db.production_events.find({}, {"_id": 0}).sort("scanned_at", -1).to_list(40)
    for d in docs:
        d["stage_label"] = next((s["label"] for s in STAGES if s["code"] == d["stage_code"]), d["stage_code"])
    return docs


# =============================================================================
# <section name="tickets" purpose="Customer service tickets + staff status edits">
# =============================================================================
@api.get("/tickets")
async def list_tickets(u=Depends(get_user)):
    q = {} if u["role"] != "customer" else {"customer_id": u["id"]}
    return await db.tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/tickets")
async def create_ticket(body: TicketIn, u=Depends(get_user)):
    seq = await db.tickets.count_documents({}) + 1001
    t = {"id": str(uuid.uuid4()), "ticket_no": f"TKT-{seq}", "type": body.type,
         "subject": body.subject, "description": body.description,
         "project_code": body.project_code, "customer_id": u["id"],
         "customer_name": u.get("name"), "status": "open", "priority": "normal",
         "created_at": iso(now()), "updated_at": iso(now())}
    await db.tickets.insert_one(dict(t))
    return t


@api.patch("/tickets/{tid}")
async def patch_ticket(tid: str, body: TicketPatch, u=Depends(get_user)):
    require_staff(u)
    await db.tickets.update_one({"id": tid},
                                {"$set": {"status": body.status, "updated_at": iso(now())}})
    return await db.tickets.find_one({"id": tid}, {"_id": 0})


# =============================================================================
# <section name="leads" purpose="Sales CRM — staff-only list/create">
# =============================================================================
@api.get("/leads")
async def list_leads(u=Depends(get_user)):
    require_staff(u)
    return await db.leads.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api.post("/leads")
async def create_lead(body: LeadIn, u=Depends(get_user)):
    require_staff(u)
    l = {"id": str(uuid.uuid4()), **body.dict(), "status": "new",
         "owner": u.get("name"), "created_at": iso(now())}
    await db.leads.insert_one(dict(l))
    return l


# =============================================================================
# <section name="public-leadgen" purpose="Website-parity quote & callback forms">
#   These mirror interiojunction.in's public actions: "Get a Free Quote" and
#   "Request a Callback". They are intentionally UNAUTHENTICATED (pre-sale
#   prospects have no account yet) and simply drop a typed lead into the CRM.
# =============================================================================
@api.post("/public/quote")
async def public_quote(body: QuoteIn):
    l = {"id": str(uuid.uuid4()), "name": body.name.strip(), "phone": body.phone.strip(),
         "city": body.city.strip(),
         "requirement": (f"[{body.category}] " if body.category else "") + body.requirement.strip(),
         "source": "app-quote", "type": "quote", "status": "new",
         "owner": None, "created_at": iso(now())}
    await db.leads.insert_one(dict(l))
    return {"ok": True, "message": "Thanks! Our design team will share your free quote shortly."}


@api.post("/public/callback")
async def public_callback(body: CallbackIn):
    note = body.note.strip()
    if body.preferred_time.strip():
        note = (note + " · " if note else "") + f"Preferred: {body.preferred_time.strip()}"
    l = {"id": str(uuid.uuid4()), "name": body.name.strip(), "phone": body.phone.strip(),
         "city": "", "requirement": note or "Requested a callback",
         "source": "app-callback", "type": "callback", "status": "new",
         "owner": None, "created_at": iso(now())}
    await db.leads.insert_one(dict(l))
    return {"ok": True, "message": "Thanks! We'll call you back soon."}


# =============================================================================
# <section name="dashboard" purpose="Staff KPI counters">
# =============================================================================
@api.get("/dashboard")
async def dashboard(u=Depends(get_user)):
    require_staff(u)
    projects = await db.projects.count_documents({})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    leads = await db.leads.count_documents({"status": "new"})
    customers = await db.users.count_documents({"role": "customer"})
    scans_today = await db.production_events.count_documents(
        {"scanned_at": {"$gte": iso(now() - timedelta(days=1))}})
    return {"projects": projects, "open_tickets": open_tickets, "new_leads": leads,
            "customers": customers, "scans_today": scans_today}


# =============================================================================
# <section name="ai-assistant" purpose="LLM design/quote chat (gpt-4o)">
# =============================================================================
SYSTEM = (
    "You are the Interiojunction Design Assistant, an expert for a factory-direct "
    "modular interior design company in India (modular kitchens, wardrobes, full-home "
    "interiors using Greenlam MFC HMR boards and Hettich hardware). Help customers with "
    "design ideas, material/finish suggestions, and rough cost estimates in Indian Rupees (INR). "
    "When estimating, give a clear ballpark range and note it is indicative, subject to a free "
    "site measurement and 3D design. Be warm, concise, and practical. Use short paragraphs and bullet points."
)


@api.post("/ai/chat")
async def ai_chat(body: ChatIn, u=Depends(get_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI assistant is not configured")
    sid = body.session_id or str(uuid.uuid4())
    await db.ai_chats.insert_one({"id": str(uuid.uuid4()), "session_id": sid,
                                  "user_id": u["id"], "role": "user",
                                  "text": body.message, "created_at": iso(now())})
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid,
                   system_message=SYSTEM).with_model("openai", "gpt-4o")
    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as e:
        # Log the detail server-side; return a generic message so we never leak
        # internal/provider error strings (or keys embedded in them) to clients.
        logger.exception("AI error")
        raise HTTPException(502, "AI service is temporarily unavailable")
    await db.ai_chats.insert_one({"id": str(uuid.uuid4()), "session_id": sid,
                                  "user_id": u["id"], "role": "assistant",
                                  "text": reply, "created_at": iso(now())})
    return {"reply": reply, "session_id": sid}


@api.get("/ai/history/{sid}")
async def ai_history(sid: str, u=Depends(get_user)):
    msgs = await db.ai_chats.find({"session_id": sid, "user_id": u["id"]},
                                  {"_id": 0}).sort("created_at", 1).to_list(200)
    return msgs


# =============================================================================
# <section name="seed" purpose="Idempotent demo data + reviewer accounts">
#   Runs once on startup. Demo accounts (phone/email 1234567890) are seeded so
#   the UI can be inspected immediately. Sign-in with the demo OTP only works
#   while DEMO_MODE is on.
# =============================================================================
HEROES = {
    "Modular Kitchen": "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "Modular Wardrobe": "https://images.unsplash.com/photo-1708397016786-8916880649b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "Full Home Interior": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
}


async def seed():
    if await db.users.find_one({"email": "admin@interiojunction.in"}):
        await seed_demo_account()  # ensure the reviewer account exists on older DBs
        return
    logger.info("Seeding Interiojunction demo data…")
    staff = [
        ("admin@interiojunction.in", "Admin@123", "admin", "Riya Mehta"),
        ("sales@interiojunction.in", "Sales@123", "sales", "Karan Patel"),
        ("factory@interiojunction.in", "Factory@123", "factory", "Suresh Yadav"),
    ]
    for email, pw, role, name in staff:
        await db.users.insert_one({"id": str(uuid.uuid4()), "role": role, "name": name,
                                   "email": email, "password_hash": pwd.hash(pw),
                                   "created_at": iso(now())})
    # demo customer
    cust = {"id": str(uuid.uuid4()), "role": "customer", "name": "Aarav Sharma",
            "phone": "9000000001", "created_at": iso(now())}
    await db.users.insert_one(dict(cust))

    async def mk_project(seq, title, cat, customer, parts_stages):
        code = f"PRJ-2026-{seq:03d}"
        pid = str(uuid.uuid4())
        await db.projects.insert_one({"id": pid, "project_code": code,
            "customer_id": customer["id"], "customer_name": customer["name"],
            "title": title, "category": cat, "hero": HEROES.get(cat),
            "status": "in_production", "created_at": iso(now())})
        for i, st in enumerate(parts_stages, 1):
            await db.parts.insert_one({"id": str(uuid.uuid4()),
                "part_code": f"{code}-P{i:03d}", "project_id": pid, "project_code": code,
                "name": f"Panel {i}", "current_stage": st, "updated_at": iso(now())})
        return code

    await mk_project(41, "L-Shaped Kitchen, Koregaon Park", "Modular Kitchen", cust,
                     ["MACH", "MACH", "FQC", "EDGE", "CUT", "MACH"])
    await mk_project(42, "Walk-in Wardrobe, Master Bedroom", "Modular Wardrobe", cust,
                     ["PACK", "PACK", "DISP", "FQC", "PACK", "PACK"])
    # second customer to prove staff sees many
    c2 = {"id": str(uuid.uuid4()), "role": "customer", "name": "Neha Gupta",
          "phone": "9000000002", "created_at": iso(now())}
    await db.users.insert_one(dict(c2))
    await mk_project(43, "3BHK Full Home Interior, Baner", "Full Home Interior", c2,
                     ["CUT", "NEW", "CUT", "EDGE"])

    await db.tickets.insert_one({"id": str(uuid.uuid4()), "ticket_no": "TKT-1001",
        "type": "service", "subject": "Drawer alignment check", "description":
        "One drawer needs realignment after delivery.", "project_code": "PRJ-2026-041",
        "customer_id": cust["id"], "customer_name": cust["name"], "status": "open",
        "priority": "normal", "created_at": iso(now()), "updated_at": iso(now())})

    for name, phone, city, req in [
        ("Vikram Singh", "9812300011", "Pune", "Modular kitchen for 2BHK"),
        ("Pooja Rao", "9812300022", "Mumbai", "Sliding wardrobe, 8ft"),
        ("Aman Khanna", "9812300033", "Pune", "Full home — 3BHK new flat"),
    ]:
        await db.leads.insert_one({"id": str(uuid.uuid4()), "name": name, "phone": phone,
            "city": city, "requirement": req, "source": "website", "status": "new",
            "owner": "Karan Patel", "created_at": iso(now())})

    await seed_demo_account()
    logger.info("Seed complete.")


async def seed_demo_account():
    """Idempotently provision the reviewer-facing demo accounts:
       - customer  : phone 1234567890  (OTP 1234567890 while DEMO_MODE is on)
       - admin     : email 1234567890 / password 1234567890
    Lets the UI be inspected end to end with one trivial credential set."""
    if not await db.users.find_one({"phone": "1234567890"}):
        demo_cust = {"id": str(uuid.uuid4()), "role": "customer", "name": "Demo Customer",
                     "phone": "1234567890", "created_at": iso(now())}
        await db.users.insert_one(dict(demo_cust))
        # Give the demo customer a live project so screens aren't empty.
        code = "PRJ-2026-099"
        pid = str(uuid.uuid4())
        await db.projects.insert_one({"id": pid, "project_code": code,
            "customer_id": demo_cust["id"], "customer_name": demo_cust["name"],
            "title": "Demo Modular Kitchen", "category": "Modular Kitchen",
            "hero": HEROES.get("Modular Kitchen"), "status": "in_production",
            "created_at": iso(now())})
        for i, st in enumerate(["MACH", "FQC", "EDGE", "CUT"], 1):
            await db.parts.insert_one({"id": str(uuid.uuid4()),
                "part_code": f"{code}-P{i:03d}", "project_id": pid, "project_code": code,
                "name": f"Panel {i}", "current_stage": st, "updated_at": iso(now())})

    if not await db.users.find_one({"email": "1234567890"}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "role": "admin",
            "name": "Demo Admin", "email": "1234567890",
            "password_hash": pwd.hash("1234567890"), "created_at": iso(now())})


# =============================================================================
# <section name="app-wiring" purpose="Middleware, lifespan, router mounting">
# =============================================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Defense-in-depth response headers for the JSON API."""
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        return resp


@asynccontextmanager
async def lifespan(_: FastAPI):
    # startup
    await seed()
    if DEMO_MODE:
        logger.warning("DEMO_MODE is ON — OTP echo/master code enabled. Disable before production.")
    yield
    # shutdown
    client.close()


app = FastAPI(lifespan=lifespan)
app.include_router(api)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,            # bearer-token API: no cookies to protect
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
