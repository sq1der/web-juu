#!/usr/bin/env python3
"""
Smoke-test: проверяет все 35 API-эндпоинтов.
Запуск:  python3 test_endpoints.py
"""
import sys
import time
import uuid
import threading
import psycopg2
import requests
import websocket

BASE = "http://localhost:8000"
DB = dict(host="localhost", port=5434, dbname="washbook", user="washbook", password="secret")

TS            = str(int(time.time()))
CLIENT_EMAIL  = f"test_client_{TS}@test.com"
OWNER_EMAIL   = f"test_owner_{TS}@test.com"
PASSWORD      = "testpass123"

passed = []
failed = []


def ok(label, resp, expected):
    hit = resp.status_code == expected
    mark = "✅" if hit else "❌"
    print(f"  {mark} {label} — HTTP {resp.status_code}", end="")
    if not hit:
        print(f" (ожидали {expected}): {resp.text[:120]}")
        failed.append(label)
    else:
        print()
        passed.append(label)
    return hit


def ok_ws(label, url):
    result = {"conn": False, "err": ""}
    def run():
        try:
            ws = websocket.create_connection(url, timeout=4)
            ws.close()
            result["conn"] = True
        except Exception as e:
            result["err"] = str(e)
    t = threading.Thread(target=run)
    t.start()
    t.join(6)
    mark = "✅" if result["conn"] else "❌"
    print(f"  {mark} {label}", end="")
    if not result["conn"]:
        print(f": {result['err'][:100]}")
        failed.append(label)
    else:
        print()
        passed.append(label)


# ─── Health ───────────────────────────────────────────────────────────────────
print("\n── Health ──")
ok("GET /health", requests.get(f"{BASE}/health"), 200)


# ─── Auth ─────────────────────────────────────────────────────────────────────
print("\n── Auth ──")

r = requests.post(f"{BASE}/api/v1/auth/register", json={
    "email": CLIENT_EMAIL, "password": PASSWORD, "name": "Test Client", "role": "client"
})
ok("POST /auth/register (client)", r, 201)
client_id = r.json().get("id", "") if r.status_code == 201 else ""

r = requests.post(f"{BASE}/api/v1/auth/register", json={
    "email": OWNER_EMAIL, "password": PASSWORD, "name": "Test Owner", "role": "owner"
})
ok("POST /auth/register (owner)", r, 201)
owner_id = r.json().get("id", "") if r.status_code == 201 else ""

# login uses `identifier` field (email or phone)
r = requests.post(f"{BASE}/api/v1/auth/login", json={"identifier": CLIENT_EMAIL, "password": PASSWORD})
ok("POST /auth/login (client)", r, 200)
client_token  = r.json().get("access_token", "") if r.status_code == 200 else ""
refresh_token = r.json().get("refresh_token", "") if r.status_code == 200 else ""

r = requests.post(f"{BASE}/api/v1/auth/login", json={"identifier": OWNER_EMAIL, "password": PASSWORD})
ok("POST /auth/login (owner)", r, 200)
owner_token = r.json().get("access_token", "") if r.status_code == 200 else ""

C = {"Authorization": f"Bearer {client_token}"}
O = {"Authorization": f"Bearer {owner_token}"}

r = requests.post(f"{BASE}/api/v1/auth/refresh", json={"refresh_token": refresh_token})
ok("POST /auth/refresh", r, 200)

r = requests.get(f"{BASE}/api/v1/auth/me", headers=C)
ok("GET /auth/me", r, 200)


# ─── Seed: Carwash via direct DB insert ───────────────────────────────────────
print("\n── Seed: Carwash (DB) ──")
cw_id = str(uuid.uuid4())
try:
    conn = psycopg2.connect(**DB)
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO carwashes (id, name, address, lat, lng, owner_id, location, is_active, rating, reviews_count)
        VALUES (%s, 'Test Carwash', 'Test Address 1', 43.24, 76.88, %s,
                ST_MakePoint(76.88, 43.24), true, 0.0, 0)
    """, (cw_id, owner_id))
    conn.commit()
    cur.close()
    conn.close()
    print(f"  ✅ Carwash вставлен (id={cw_id})")
except Exception as e:
    print(f"  ❌ DB seed: {e}")
    sys.exit(1)


# ─── Operator ────────────────────────────────────────────────────────────────
print("\n── Operator ──")

r = requests.get(f"{BASE}/api/v1/operator/carwash", headers=O)
ok("GET /operator/carwash", r, 200)

r = requests.patch(f"{BASE}/api/v1/operator/carwash", headers=O, json={"name": "Updated Carwash"})
ok("PATCH /operator/carwash", r, 200)

r = requests.post(f"{BASE}/api/v1/operator/services", headers=O, json={
    "name": "Full Wash", "body_type": "sedan", "price": 5000, "duration_min": 30
})
ok("POST /operator/services", r, 201)
svc_id = r.json().get("id", "") if r.status_code == 201 else ""

r = requests.get(f"{BASE}/api/v1/operator/services", headers=O)
ok("GET /operator/services", r, 200)

if svc_id:
    r = requests.patch(f"{BASE}/api/v1/operator/services/{svc_id}", headers=O, json={
        "name": "Full Wash Pro", "body_type": "sedan", "price": 6000, "duration_min": 35
    })
    ok("PATCH /operator/services/{id}", r, 200)

r = requests.post(f"{BASE}/api/v1/operator/slots", headers=O, json={
    "slots": [{"starts_at": "2026-06-01T10:00:00+00:00", "capacity": 3}]
})
ok("POST /operator/slots", r, 201)

r = requests.get(f"{BASE}/api/v1/operator/slots", headers=O)
ok("GET /operator/slots", r, 200)
slot_id = r.json()[0]["id"] if r.status_code == 200 and r.json() else ""

if slot_id:
    r = requests.patch(f"{BASE}/api/v1/operator/slots/{slot_id}", headers=O, json={
        "starts_at": "2026-06-01T10:00:00+00:00", "capacity": 5
    })
    ok("PATCH /operator/slots/{id}", r, 200)

r = requests.get(f"{BASE}/api/v1/operator/bookings", headers=O)
ok("GET /operator/bookings", r, 200)


# ─── Carwashes ────────────────────────────────────────────────────────────────
print("\n── Carwashes ──")

r = requests.get(f"{BASE}/api/v1/carwashes", params={"lat": 43.24, "lng": 76.88})
ok("GET /carwashes?lat&lng", r, 200)

r = requests.get(f"{BASE}/api/v1/carwashes/{cw_id}")
ok("GET /carwashes/{id}", r, 200)

r = requests.get(f"{BASE}/api/v1/carwashes/{cw_id}/services")
ok("GET /carwashes/{id}/services", r, 200)

r = requests.get(f"{BASE}/api/v1/carwashes/{cw_id}/slots", headers=C, params={"date": "2026-06-01"})
ok("GET /carwashes/{id}/slots", r, 200)

r = requests.get(f"{BASE}/api/v1/carwashes/{cw_id}/reviews")
ok("GET /carwashes/{id}/reviews", r, 200)


# ─── Cars ────────────────────────────────────────────────────────────────────
print("\n── Cars ──")

r = requests.post(f"{BASE}/api/v1/cars", headers=C, json={
    "brand": "Toyota", "model": "Camry", "plate": f"ABC{TS[-4:]}",
    "body_type": "sedan", "color": "white"
})
ok("POST /cars", r, 201)
car_id = r.json().get("id", "") if r.status_code == 201 else ""

r = requests.get(f"{BASE}/api/v1/cars", headers=C)
ok("GET /cars", r, 200)

if car_id:
    r = requests.patch(f"{BASE}/api/v1/cars/{car_id}", headers=C, json={
        "brand": "Toyota", "model": "Camry", "plate": f"ABC{TS[-4:]}",
        "body_type": "sedan", "color": "black"
    })
    ok("PATCH /cars/{id}", r, 200)

    r = requests.patch(f"{BASE}/api/v1/cars/{car_id}/default", headers=C)
    ok("PATCH /cars/{id}/default", r, 200)


# ─── Bookings ────────────────────────────────────────────────────────────────
print("\n── Bookings ──")

booking_id = ""
if car_id and svc_id and slot_id:
    r = requests.post(f"{BASE}/api/v1/bookings", headers=C, json={
        "slot_id": slot_id, "service_id": svc_id, "car_id": car_id
    })
    ok("POST /bookings", r, 201)
    booking_id = r.json().get("id", "") if r.status_code == 201 else ""

r = requests.get(f"{BASE}/api/v1/bookings", headers=C)
ok("GET /bookings", r, 200)

if booking_id:
    r = requests.get(f"{BASE}/api/v1/bookings/{booking_id}", headers=C)
    ok("GET /bookings/{id}", r, 200)

    r = requests.post(f"{BASE}/api/v1/operator/bookings/{booking_id}/confirm", headers=O)
    ok("POST /operator/bookings/{id}/confirm", r, 200)

    r = requests.patch(f"{BASE}/api/v1/operator/bookings/{booking_id}/washstatus", headers=O,
                       json={"wash_status": "in_progress"})
    ok("PATCH /operator/bookings/{id}/washstatus", r, 200)

    r = requests.post(f"{BASE}/api/v1/operator/bookings/{booking_id}/cancel", headers=O,
                      json={"reason": "test cancel"})
    ok("POST /operator/bookings/{id}/cancel", r, 200)

# Вторая бронь — для теста отмены клиентом
booking2_id = ""
if car_id and svc_id and slot_id:
    r = requests.post(f"{BASE}/api/v1/bookings", headers=C, json={
        "slot_id": slot_id, "service_id": svc_id, "car_id": car_id
    })
    if r.status_code == 201:
        booking2_id = r.json().get("id", "")

if booking2_id:
    r = requests.post(f"{BASE}/api/v1/bookings/{booking2_id}/cancel", headers=C,
                      json={"reason": "передумал"})
    ok("POST /bookings/{id}/cancel", r, 200)


# ─── DELETE: проверяем на ресурсах без броней ─────────────────────────────────
print("\n── DELETE (clean resources) ──")

# Новая машина без броней → удаление
r2 = requests.post(f"{BASE}/api/v1/cars", headers=C, json={
    "brand": "Honda", "model": "Civic", "plate": f"DEL{TS[-4:]}",
    "body_type": "hatchback", "color": "red"
})
car2_id = r2.json().get("id", "") if r2.status_code == 201 else ""
if car2_id:
    r = requests.delete(f"{BASE}/api/v1/cars/{car2_id}", headers=C)
    ok("DELETE /cars/{id}", r, 200)

# Новый слот без броней → удаление
r2 = requests.post(f"{BASE}/api/v1/operator/slots", headers=O, json={
    "slots": [{"starts_at": "2026-07-01T10:00:00+00:00", "capacity": 1}]
})
if r2.status_code == 201:
    r2 = requests.get(f"{BASE}/api/v1/operator/slots", headers=O)
    all_slots = r2.json() if r2.status_code == 200 else []
    slot2_id = next((s["id"] for s in all_slots if s["id"] != slot_id), "")
    if slot2_id:
        r = requests.delete(f"{BASE}/api/v1/operator/slots/{slot2_id}", headers=O)
        ok("DELETE /operator/slots/{id}", r, 200)

# Новая услуга без броней → удаление
r2 = requests.post(f"{BASE}/api/v1/operator/services", headers=O, json={
    "name": "Delete Test Svc", "body_type": "suv", "price": 100, "duration_min": 10
})
svc2_id = r2.json().get("id", "") if r2.status_code == 201 else ""
if svc2_id:
    r = requests.delete(f"{BASE}/api/v1/operator/services/{svc2_id}", headers=O)
    ok("DELETE /operator/services/{id}", r, 200)


# ─── WebSocket ────────────────────────────────────────────────────────────────
print("\n── WebSocket ──")
ws_bk = booking_id or booking2_id or "00000000-0000-0000-0000-000000000001"
ok_ws(f"WS /ws/booking/{{id}}", f"ws://localhost:8000/ws/booking/{ws_bk}?token={client_token}")
ok_ws("WS /ws/operator",        f"ws://localhost:8000/ws/operator?token={owner_token}")


# ─── Итог ────────────────────────────────────────────────────────────────────
total = len(passed) + len(failed)
print(f"\n{'='*52}")
print(f"  ИТОГО: {len(passed)}/{total} эндпоинтов прошли")
if failed:
    print("\n  Провалившиеся:")
    for f in failed:
        print(f"    ❌ {f}")
print("="*52)
