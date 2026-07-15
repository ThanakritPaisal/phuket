"""In-process smoke test against the real `loma` Postgres DB.

Uses a dedicated hotel_id so it never collides with real data, and deletes its own
rows at the end. No server needed — drives the app via TestClient.
"""
from fastapi.testclient import TestClient

import main
from db import LOG_TABLE, get_conn

HOTEL = "htl_smoketest"


def cleanup():
    with get_conn() as conn:
        conn.execute(f"DELETE FROM {LOG_TABLE} WHERE hotel_id = %s", (HOTEL,))


cleanup()
c = TestClient(main.app)

# hotel creates + sends + shares a link
assert c.post("/events", json={"event_type": "link_created", "hotel_id": HOTEL, "recommendation_list_id": "rl_1"}).json()["ok"]
c.post("/events", json={"event_type": "link_sent", "hotel_id": HOTEL, "recommendation_list_id": "rl_1"})
c.post("/events", json={"event_type": "link_shared", "hotel_id": HOTEL, "channel": "LINE"})
c.post("/events", json={"event_type": "link_shared", "hotel_id": HOTEL, "metadata": {"channel": "WhatsApp"}})

# tourist funnel
c.post("/events/batch", json={"events": [
    {"event_type": "link_received", "hotel_id": HOTEL},
    {"event_type": "link_opened", "hotel_id": HOTEL},
    {"event_type": "visit_marked", "hotel_id": HOTEL, "provider_id": "p_1"},
]})

# self-serve views
c.post("/events", json={"event_type": "provider_card_viewed", "hotel_id": HOTEL, "provider_id": "p_1", "metadata": {"source": "explore"}})
c.post("/events", json={"event_type": "provider_card_viewed", "hotel_id": HOTEL, "provider_id": "p_1"})
c.post("/events", json={"event_type": "provider_card_viewed", "hotel_id": HOTEL, "provider_id": "p_2"})

# destination scan
c.post("/events", json={"event_type": "destination_scanned", "hotel_id": HOTEL, "provider_id": "p_1"})
c.post("/events", json={"event_type": "provider_confirmed_visit", "hotel_id": HOTEL, "provider_id": "p_1"})

hotel = c.get("/stats/hotel", params={"hotel_id": HOTEL}).json()
assert hotel["links_created"] == 1, hotel
assert hotel["links_sent"] == 1, hotel
assert hotel["links_shared"] == 2, hotel
assert hotel["shares_by_channel"] == {"LINE": 1, "WhatsApp": 1}, hotel

funnel = c.get("/stats/tourist-funnel", params={"hotel_id": HOTEL}).json()
assert funnel["received"] == 1 and funnel["opened"] == 1 and funnel["marked_going"] == 1, funnel

views = c.get("/stats/provider-views", params={"hotel_id": HOTEL}).json()["views_by_provider"]
assert {"provider_id": "p_1", "count": 2} in views, views
assert {"provider_id": "p_2", "count": 1} in views, views

scans = c.get("/stats/destination-scans", params={"hotel_id": HOTEL}).json()
assert scans["total_scans"] == 2, scans

summary = c.get("/stats/summary", params={"hotel_id": HOTEL}).json()
assert summary["hotel_actions"]["links_created"] == 1

evs = c.get("/events", params={"provider_id": "p_1", "hotel_id": HOTEL}).json()
assert evs["total"] >= 5, evs

cleanup()
print("ALL SMOKE TESTS PASSED (Postgres, self-cleaned)")
