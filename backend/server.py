from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import logging
import uuid
import random
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta

import jwt
from passlib.context import CryptContext
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("ij")

# ---------------------------------------------------------------- constants
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


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat() if isinstance(dt, datetime) else dt


def sha(v: str) -> str:
    return hashlib.sha256(v.encode()).hexdigest()


def clean_reply(text: str) -> str:
    """Strip Markdown / formatting noise so chat replies read as clean plain text.

    The LLM occasionally emits Markdown (``#`` headings, ``**bold**``, ``*`` bullets,
    backticks, ``$`` math delimiters) which surfaces as stray filler characters in the
    chat bubbles. This converts that into natural, readable prose."""
    if not text:
        return text
    t = text.replace("\r\n", "\n")
    # Fenced / inline code markers
    t = re.sub(r"```[a-zA-Z0-9]*\n?", "", t)
    t = t.replace("`", "")
    # Headings -> plain line
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)
    # Blockquotes
    t = re.sub(r"(?m)^\s{0,3}>\s?", "", t)
    # Markdown links [label](url) -> label (url)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", t)
    # Bold / italic emphasis
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"__(.+?)__", r"\1", t)
    t = re.sub(r"\*(.+?)\*", r"\1", t)
    t = re.sub(r"(?<!\w)_(.+?)_(?!\w)", r"\1", t)
    # Horizontal rules
    t = re.sub(r"(?m)^\s*([-*_])\1{2,}\s*$", "", t)
    # Bullet markers -> clean bullet
    t = re.sub(r"(?m)^(\s*)[-*+]\s+", r"\1• ", t)
    # Strip any leftover markdown / math filler characters
    t = t.replace("$", "")
    t = re.sub(r"[*#`~]+", "", t)
    # Tidy whitespace
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


# ---------------------------------------------------------------- models
class LoginIn(BaseModel):
    email: str
    password: str


class OtpReqIn(BaseModel):
    phone: str


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None


class ProjectIn(BaseModel):
    title: str
    category: str
    customer_phone: str
    customer_name: str
    parts: int = 6


class ScanIn(BaseModel):
    part_code: str
    result: str = "ok"


class TicketIn(BaseModel):
    type: str
    subject: str
    description: str = ""
    project_code: Optional[str] = None


class TicketPatch(BaseModel):
    status: str


class LeadIn(BaseModel):
    name: str
    phone: str
    city: str = ""
    requirement: str = ""
    source: str = "app"


class ChatIn(BaseModel):
    message: str
    session_id: Optional[str] = None


class GuestIn(BaseModel):
    name: Optional[str] = None


class PaymentIn(BaseModel):
    category: str
    total_amount: float
    project_code: Optional[str] = None
    method: str = "card"


# ---------------------------------------------------------------- auth utils
def make_token(user):
    payload = {"sub": user["id"], "role": user["role"],
               "exp": now() + timedelta(days=14)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def public_user(u):
    return {"id": u["id"], "role": u["role"], "name": u.get("name"),
            "email": u.get("email"), "phone": u.get("phone"),
            "is_guest": bool(u.get("is_guest", False))}


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


# ---------------------------------------------------------------- auth routes
@api.get("/")
async def root():
    return {"message": "Interiojunction API", "stages": STAGES}


@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email.lower().strip()})
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
        {"$set": {"phone": phone, "code_hash": sha(code), "attempts": 0,
                  "expires_at": iso(now() + timedelta(minutes=5))}},
        upsert=True,
    )
    # SMS delivery is MOCKED in dev — code returned for testing.
    logger.info("OTP for %s: %s", phone, code)
    return {"sent": True, "dev_code": code,
            "note": "SMS delivery mocked in dev. Use dev_code to verify."}


@api.post("/auth/otp/verify")
async def otp_verify(body: OtpVerifyIn):
    phone = body.phone.strip()
    rec = await db.otps.find_one({"phone": phone})
    if not rec:
        raise HTTPException(400, "Request an OTP first")
    if datetime.fromisoformat(rec["expires_at"]) < now():
        raise HTTPException(400, "OTP expired")
    if rec.get("attempts", 0) >= 5:
        raise HTTPException(429, "Too many attempts")
    if rec["code_hash"] != sha(body.code.strip()):
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


@api.post("/auth/guest")
async def guest_login(body: GuestIn):
    """Instant guest access — browse + AI assistant + Start Your Project, no OTP.
    Service requests / complaints stay gated to onboarded clients."""
    u = {"id": str(uuid.uuid4()), "role": "customer", "is_guest": True,
         "name": (body.name or "").strip() or "Guest", "created_at": iso(now())}
    await db.users.insert_one(dict(u))
    return {"token": make_token(u), "user": public_user(u)}


@api.get("/auth/me")
async def me(u=Depends(get_user)):
    return {"user": public_user(u)}


# ---------------------------------------------------------------- projects
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


# ---------------------------------------------------------------- scanner
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


# ---------------------------------------------------------------- tickets
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


# ---------------------------------------------------------------- leads (CRM)
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


# ---------------------------------------------------------------- dashboard
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


# ---------------------------------------------------------------- AI assistant
SYSTEM = (
    "You are the Interiojunction Design Assistant, an expert for a factory-direct "
    "modular interior design company in India (modular kitchens, wardrobes, full-home "
    "interiors using Greenlam MFC HMR boards and Hettich hardware). Help customers with "
    "design ideas, material/finish suggestions, and rough cost estimates in Indian Rupees (INR). "
    "When estimating, give a clear ballpark range and note it is indicative, subject to a free "
    "site measurement and 3D design. Be warm, concise, and practical. Use short paragraphs and simple bullet points. "
    "IMPORTANT — formatting: reply in plain, natural text only. Do NOT use any Markdown. "
    "Never use asterisks (*), hash/pound signs (#), backticks (`), underscores for emphasis, or dollar signs ($). "
    "For lists, start each line with a simple hyphen. Always write money amounts in Indian Rupees using the ₹ symbol (e.g. ₹1,20,000)."
)


@api.post("/ai/chat")
async def ai_chat(body: ChatIn, u=Depends(get_user)):
    sid = body.session_id or str(uuid.uuid4())
    await db.ai_chats.insert_one({"id": str(uuid.uuid4()), "session_id": sid,
                                  "user_id": u["id"], "role": "user",
                                  "text": body.message, "created_at": iso(now())})
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid,
                   system_message=SYSTEM).with_model("openai", "gpt-4o")
    try:
        reply = await chat.send_message(UserMessage(text=body.message))
    except Exception as e:
        logger.exception("AI error")
        raise HTTPException(502, f"AI service error: {e}")
    reply = clean_reply(reply)
    await db.ai_chats.insert_one({"id": str(uuid.uuid4()), "session_id": sid,
                                  "user_id": u["id"], "role": "assistant",
                                  "text": reply, "created_at": iso(now())})
    return {"reply": reply, "session_id": sid}


@api.get("/ai/history/{sid}")
async def ai_history(sid: str, u=Depends(get_user)):
    msgs = await db.ai_chats.find({"session_id": sid, "user_id": u["id"]},
                                  {"_id": 0}).sort("created_at", 1).to_list(200)
    return msgs


# ---------------------------------------------------------------- payments (booking)
BOOKING_PCT = 10  # customers pay 10% of total project cost to start


@api.post("/payments")
async def create_payment(body: PaymentIn, u=Depends(get_user)):
    """Records a 10% booking payment that kicks off a project.

    This is a mock gateway (no real charge) but the record shape mirrors a real
    PSP (Razorpay/Stripe) so it can be swapped in without touching the client."""
    if body.total_amount <= 0:
        raise HTTPException(400, "Enter a valid project cost")
    amount = round(body.total_amount * BOOKING_PCT / 100, 2)
    seq = await db.payments.count_documents({}) + 5001
    rec = {
        "id": str(uuid.uuid4()),
        "receipt_no": f"IJ-PAY-{seq}",
        "customer_id": u["id"],
        "customer_name": u.get("name"),
        "category": body.category,
        "project_code": body.project_code,
        "total_amount": round(body.total_amount, 2),
        "booking_pct": BOOKING_PCT,
        "amount": amount,
        "currency": "INR",
        "method": body.method,
        "status": "paid",
        "gateway": "mock",
        "created_at": iso(now()),
    }
    await db.payments.insert_one(dict(rec))
    return rec


@api.get("/payments")
async def list_payments(u=Depends(get_user)):
    q = {} if u["role"] != "customer" else {"customer_id": u["id"]}
    return await db.payments.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)


# ---------------------------------------------------------------- seed
HEROES = {
    "Modular Kitchen": "https://images.unsplash.com/photo-1663811396777-05505d999151?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "Modular Wardrobe": "https://images.unsplash.com/photo-1708397016786-8916880649b8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    "Full Home Interior": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
}


async def seed():
    if await db.users.find_one({"email": "admin@interiojunction.in"}):
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
    logger.info("Seed complete.")


# Staff members who sign in with phone + OTP (primary login). Idempotent —
# runs on every startup so access can be granted without wiping the database.
STAFF_PHONES = [
    {"phone": "9028597888", "name": "Yogesh", "role": "admin"},
]


async def ensure_core_accounts():
    for s in STAFF_PHONES:
        existing = await db.users.find_one({"phone": s["phone"]})
        if existing:
            # Promote any pre-existing customer record to its staff role.
            if existing.get("role") != s["role"] or existing.get("is_guest"):
                await db.users.update_one(
                    {"id": existing["id"]},
                    {"$set": {"role": s["role"], "is_guest": False,
                              "name": existing.get("name") or s["name"]}})
                logger.info("Granted %s access to %s", s["role"], s["phone"])
            continue
        await db.users.insert_one({"id": str(uuid.uuid4()), "role": s["role"],
                                   "name": s["name"], "phone": s["phone"],
                                   "created_at": iso(now())})
        logger.info("Created %s staff account for %s", s["role"], s["phone"])


@app.on_event("startup")
async def on_start():
    await seed()
    await ensure_core_accounts()


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("shutdown")
async def shutdown():
    client.close()
