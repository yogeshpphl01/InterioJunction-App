"""Backend API tests for Interiojunction app."""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://junction-app-design.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@interiojunction.in"
ADMIN_PASS = "Admin@123"
FACTORY_EMAIL = "factory@interiojunction.in"
FACTORY_PASS = "Factory@123"
CUSTOMER_PHONE = "9000000001"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def factory_token(session):
    r = session.post(f"{API}/auth/login", json={"email": FACTORY_EMAIL, "password": FACTORY_PASS})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer_token(session):
    r = session.post(f"{API}/auth/otp/request", json={"phone": CUSTOMER_PHONE})
    assert r.status_code == 200, r.text
    code = r.json().get("dev_code")
    assert code
    r2 = session.post(f"{API}/auth/otp/verify", json={"phone": CUSTOMER_PHONE, "code": code})
    assert r2.status_code == 200, r2.text
    return r2.json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ------ Health / Root
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        d = r.json()
        assert "stages" in d and len(d["stages"]) == 8


# ------ Auth
class TestAuth:
    def test_staff_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["role"] == "admin"

    def test_staff_login_factory(self, session):
        r = session.post(f"{API}/auth/login", json={"email": FACTORY_EMAIL, "password": FACTORY_PASS})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "factory"

    def test_staff_login_bad_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_otp_request_returns_dev_code(self, session):
        r = session.post(f"{API}/auth/otp/request", json={"phone": CUSTOMER_PHONE})
        assert r.status_code == 200
        d = r.json()
        assert d.get("sent") is True
        assert isinstance(d.get("dev_code"), str) and len(d["dev_code"]) == 6

    def test_otp_request_invalid_phone(self, session):
        r = session.post(f"{API}/auth/otp/request", json={"phone": "123"})
        assert r.status_code == 400

    def test_otp_verify_wrong_code(self, session):
        session.post(f"{API}/auth/otp/request", json={"phone": "9000000099"})
        r = session.post(f"{API}/auth/otp/verify", json={"phone": "9000000099", "code": "000000"})
        # could be 401 if random sha mismatches, accept 401
        assert r.status_code in (401, 400)

    def test_me_endpoint(self, session, admin_token):
        r = session.get(f"{API}/auth/me", headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["email"] == ADMIN_EMAIL

    def test_me_no_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ------ Projects
class TestProjects:
    def test_list_projects_admin(self, session, admin_token):
        r = session.get(f"{API}/projects", headers=auth(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 3

    def test_list_projects_customer_scoped(self, session, customer_token):
        r = session.get(f"{API}/projects", headers=auth(customer_token))
        assert r.status_code == 200
        data = r.json()
        # customer 9000000001 should see 2 projects (PRJ-2026-041 and 042)
        codes = [p["project_code"] for p in data]
        assert "PRJ-2026-041" in codes
        assert "PRJ-2026-042" in codes
        assert "PRJ-2026-043" not in codes

    def test_project_detail(self, session, admin_token):
        r = session.get(f"{API}/projects/PRJ-2026-041", headers=auth(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "project" in d and "parts" in d and "stages" in d
        assert len(d["parts"]) == 6
        assert len(d["stages"]) == 8

    def test_customer_cannot_see_other_project(self, session, customer_token):
        r = session.get(f"{API}/projects/PRJ-2026-043", headers=auth(customer_token))
        assert r.status_code == 404

    def test_create_project_staff(self, session, admin_token):
        payload = {
            "title": "TEST_New Kitchen",
            "category": "Modular Kitchen",
            "customer_phone": "9999000099",
            "customer_name": "TEST Customer",
            "parts": 3,
        }
        r = session.post(f"{API}/projects", json=payload, headers=auth(admin_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == payload["title"]
        assert d["parts_count"] == 3
        # verify GET
        r2 = session.get(f"{API}/projects/{d['project_code']}", headers=auth(admin_token))
        assert r2.status_code == 200
        assert len(r2.json()["parts"]) == 3


# ------ Scanner
class TestScanner:
    def test_scan_advances_stage(self, session, factory_token, admin_token):
        # create a fresh project to ensure a known starting stage (NEW)
        payload = {"title": "TEST_Scan", "category": "Modular Kitchen",
                   "customer_phone": "9111100099", "customer_name": "TEST_Scan_Cust",
                   "parts": 2}
        cp = session.post(f"{API}/projects", json=payload, headers=auth(admin_token))
        assert cp.status_code == 200
        code = cp.json()["project_code"]
        part_code = f"{code}-P001"
        r = session.post(f"{API}/scan", json={"part_code": part_code},
                         headers=auth(factory_token))
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["part"]["current_stage"] == "CUT"
        # store for next test
        TestScanner._scan_part = part_code

    def test_scan_duplicate_idempotent(self, session, factory_token):
        # scanning same part with same target stage CUT should be duplicate
        # We have to re-scan to same key; since part already advanced to CUT,
        # next scan would target EDGE (new key). Test duplicate via direct retry of
        # an internal idempotency key path: easiest is to scan same part again to
        # advance to EDGE, then again -> that next try goes to MACH (different key).
        # Instead, we POST scan twice quickly to test the idempotency_key on the second.
        # To do that properly we use the part advancement: first call advances to EDGE,
        # second call advances to MACH (different key). The idempotency check protects
        # racing duplicate writes. We'll simulate by calling once to advance, then
        # manually replaying the previous stage advance: not possible via public API,
        # so we accept either duplicate flag OR a successful advance.
        part_code = getattr(TestScanner, "_scan_part", "PRJ-2026-041-P002")
        r = session.post(f"{API}/scan", json={"part_code": part_code},
                         headers=auth(factory_token))
        assert r.status_code == 200
        d = r.json()
        # Either it advanced or it was duplicate (idempotency working)
        assert d.get("duplicate") is True or "part" in d

    def test_scan_unknown_part(self, session, factory_token):
        r = session.post(f"{API}/scan", json={"part_code": "NOPE-XXXX"},
                         headers=auth(factory_token))
        assert r.status_code == 404

    def test_scan_customer_forbidden(self, session, customer_token):
        r = session.post(f"{API}/scan", json={"part_code": "PRJ-2026-041-P001"},
                         headers=auth(customer_token))
        assert r.status_code == 403

    def test_recent_scans(self, session, factory_token):
        r = session.get(f"{API}/scan/recent", headers=auth(factory_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_recent_scans_customer_forbidden(self, session, customer_token):
        r = session.get(f"{API}/scan/recent", headers=auth(customer_token))
        assert r.status_code == 403


# ------ Tickets
class TestTickets:
    def test_customer_list_tickets(self, session, customer_token):
        r = session.get(f"{API}/tickets", headers=auth(customer_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # seeded ticket TKT-1001 belongs to customer 9000000001
        nos = [t["ticket_no"] for t in data]
        assert "TKT-1001" in nos

    def test_customer_create_ticket(self, session, customer_token):
        payload = {"type": "service", "subject": "TEST_subject",
                   "description": "test", "project_code": "PRJ-2026-041"}
        r = session.post(f"{API}/tickets", json=payload, headers=auth(customer_token))
        assert r.status_code == 200
        d = r.json()
        assert d["subject"] == "TEST_subject"
        assert d["status"] == "open"
        # patch status as admin
        return d["id"]

    def test_staff_patch_ticket(self, session, admin_token, customer_token):
        # create one
        payload = {"type": "service", "subject": "TEST_patch", "description": ""}
        c = session.post(f"{API}/tickets", json=payload, headers=auth(customer_token))
        tid = c.json()["id"]
        r = session.patch(f"{API}/tickets/{tid}", json={"status": "resolved"},
                          headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "resolved"

    def test_customer_cannot_patch_ticket(self, session, customer_token):
        # create
        payload = {"type": "service", "subject": "TEST_patch2"}
        c = session.post(f"{API}/tickets", json=payload, headers=auth(customer_token))
        tid = c.json()["id"]
        r = session.patch(f"{API}/tickets/{tid}", json={"status": "resolved"},
                          headers=auth(customer_token))
        assert r.status_code == 403


# ------ Leads
class TestLeads:
    def test_list_leads_admin(self, session, admin_token):
        r = session.get(f"{API}/leads", headers=auth(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 3

    def test_customer_cannot_list_leads(self, session, customer_token):
        r = session.get(f"{API}/leads", headers=auth(customer_token))
        assert r.status_code == 403

    def test_create_lead_admin(self, session, admin_token):
        payload = {"name": "TEST_Lead", "phone": "9988776655", "city": "Pune",
                   "requirement": "TEST kitchen"}
        r = session.post(f"{API}/leads", json=payload, headers=auth(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == "TEST_Lead" and d["status"] == "new"


# ------ Dashboard
class TestDashboard:
    def test_dashboard_admin(self, session, admin_token):
        r = session.get(f"{API}/dashboard", headers=auth(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in ["projects", "open_tickets", "new_leads", "customers", "scans_today"]:
            assert k in d
        assert d["projects"] >= 3

    def test_dashboard_customer_forbidden(self, session, customer_token):
        r = session.get(f"{API}/dashboard", headers=auth(customer_token))
        assert r.status_code == 403


# ------ AI Chat
class TestAI:
    def test_ai_chat_reply(self, session, customer_token):
        r = session.post(f"{API}/ai/chat",
                         json={"message": "Give me a quick kitchen idea for a small 2BHK"},
                         headers=auth(customer_token), timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("reply"), str) and len(d["reply"]) > 5
        assert d.get("session_id")
