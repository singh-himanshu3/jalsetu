"""Small immutable-event stock ledger. Approval alone never loads water."""

import json
from datetime import datetime


def derive_ledger(data, approved_routes, events):
    vehicles = {v.vehicle_id: {"capacity_litres": v.capacity_litres, "onboard_litres": 0, "stranded_litres": 0, "failed": False, "loaded": False, "at_depot": True, "trip_completed": False} for v in data.vehicles}
    planned = {(r["vehicle_id"], s["site_id"]): s["planned_litres"] for r in approved_routes for s in r["stops"]}
    depot = data.depot.available_stock_litres
    stock_adjustments = 0
    delivered = {s.site_id: 0 for s in data.sites}
    closed_sites = set()
    site_status_recorded = False
    reported = {}
    seen = {}
    history = []
    previous_time = None
    for event in events:
        key = event.get("idempotency_key")
        if not isinstance(key, str) or not key:
            raise ValueError("Event requires an idempotency key")
        fingerprint = json.dumps(event, sort_keys=True, separators=(",", ":"))
        if key in seen:
            if seen[key] != fingerprint:
                raise ValueError("IDEMPOTENCY_CONFLICT")
            continue
        when = datetime.fromisoformat(event["occurred_at"])
        if when.tzinfo is None or (previous_time is not None and when < previous_time):
            raise ValueError("Events require timezone-aware chronological timestamps")
        kind = event["event_type"]
        payload = event["payload"]
        vehicle = vehicles.get(payload.get("vehicle_id"))
        amount = payload.get("litres", 0)
        if type(amount) is not int or amount < 0:
            raise ValueError("Event litres must be non-negative integers")
        if kind == "vehicle_loaded":
            if vehicle is None or vehicle["failed"] or vehicle["loaded"]:
                raise ValueError("Vehicle cannot be loaded in its current state")
            if any(v == payload["vehicle_id"] and site in closed_sites for v, site in planned):
                raise ValueError("Update the approved plan before loading a route with a closed receiving point")
            route_load = sum(q for (v, _), q in planned.items() if v == payload["vehicle_id"])
            if amount <= 0 or amount > depot or amount > vehicle["capacity_litres"] or amount != route_load:
                raise ValueError("Loading must match approved route and available stock")
            vehicle["onboard_litres"] = amount
            vehicle["loaded"] = True
            vehicle["at_depot"] = False
            depot -= amount
        elif kind == "delivery_reported":
            if payload["site_id"] in closed_sites:
                raise ValueError("The receiving point is closed; record its reopening before another delivery")
            if vehicle is None or vehicle["failed"] or not vehicle["loaded"] or vehicle["at_depot"]:
                raise ValueError("Delivery requires an active loaded vehicle")
            assignment = (payload["vehicle_id"], payload["site_id"])
            if assignment not in planned:
                raise ValueError("No approved assignment for this delivery")
            old = reported.get(assignment, 0)
            if amount < old or amount > planned[assignment]:
                raise ValueError("Reported cumulative delivery is outside approved quantity")
            delta = amount - old
            if delta > vehicle["onboard_litres"]:
                raise ValueError("Delivery exceeds water actually loaded")
            vehicle["onboard_litres"] -= delta
            reported[assignment] = amount
            delivered[payload["site_id"]] += delta
            requested = next(s.requested_litres for s in data.sites if s.site_id == payload["site_id"])
            if delivered[payload["site_id"]] > requested:
                raise ValueError("Cumulative reports exceed the site's declared request")
        elif kind == "vehicle_failed":
            if vehicle is None or vehicle["failed"]:
                raise ValueError("Vehicle failure is already recorded or vehicle is unknown")
            vehicle["stranded_litres"] += vehicle["onboard_litres"]
            vehicle["onboard_litres"] = 0
            vehicle["failed"] = True
        elif kind == "water_recovered":
            if vehicle is None or not vehicle["failed"] or amount > vehicle["stranded_litres"]:
                raise ValueError("Recovery exceeds stranded water")
            vehicle["stranded_litres"] -= amount
            depot += amount
        elif kind == "vehicle_returned":
            if vehicle is None or not vehicle["loaded"] or vehicle["failed"] or vehicle["at_depot"]:
                raise ValueError("Vehicle cannot record a return in its current state")
            depot += vehicle["onboard_litres"]
            vehicle["onboard_litres"] = 0
            vehicle["at_depot"] = True
            vehicle["trip_completed"] = True
        elif kind == "depot_stock_adjusted":
            delta = payload.get("delta_litres")
            if type(delta) is not int or depot + delta < 0:
                raise ValueError("Stock adjustment would make depot water negative")
            depot += delta
            stock_adjustments += delta
        elif kind in ("site_closed", "site_reopened"):
            site_id = payload.get("site_id")
            if site_id not in delivered:
                raise ValueError("Unknown receiving point")
            if kind == "site_closed":
                if site_id in closed_sites:
                    raise ValueError("The receiving point is already closed")
                closed_sites.add(site_id)
            else:
                if site_id not in closed_sites:
                    raise ValueError("The receiving point is not closed")
                closed_sites.remove(site_id)
            site_status_recorded = True
        else:
            raise ValueError("Unknown stock-ledger event type")
        physical_total = depot + sum(v["onboard_litres"] + v["stranded_litres"] for v in vehicles.values()) + sum(delivered.values())
        if physical_total != data.depot.available_stock_litres + stock_adjustments:
            raise ValueError("Stock conservation failed")
        seen[key] = fingerprint
        history.append({"idempotency_key": key, "occurred_at": when.isoformat(), "depot_litres": depot, "physical_total_litres": physical_total})
        previous_time = when
    result = {"initial_stock_litres": data.depot.available_stock_litres, "stock_adjustments_litres": stock_adjustments, "depot_litres": depot, "vehicles": vehicles, "reported_delivered_litres": delivered, "conservation_valid": True, "history": history}
    # Preserve the shape of historical ledgers until a site-status event exists.
    if site_status_recorded:
        result["closed_site_ids"] = sorted(closed_sites)
    return result
