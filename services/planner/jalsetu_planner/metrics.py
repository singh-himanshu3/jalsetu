from statistics import mean, median


def compute_metrics(data, routes):
    allocated = {s.site_id: 0 for s in data.sites}
    for route in routes:
        for stop in route["stops"]:
            allocated[stop["site_id"]] += stop["planned_litres"]
    confirmed = [s for s in data.sites if s.confirmation_status == "confirmed" and s.requested_litres > 0]
    ratios = [allocated[s.site_id] / s.requested_litres for s in confirmed]
    total = sum(allocated.values())
    return {
        "on_time_scheduled_litres": total,
        "unmet_requested_litres": sum(s.requested_litres for s in confirmed) - total,
        "served_site_count": sum(allocated[s.site_id] > 0 for s in confirmed),
        "sites_meeting_minimum": sum(allocated[s.site_id] > 0 and allocated[s.site_id] >= s.minimum_useful_litres for s in confirmed),
        "minimum_fulfilment_ratio": min(ratios, default=0),
        "median_fulfilment_ratio": median(ratios) if ratios else 0,
        "mean_fulfilment_ratio": mean(ratios) if ratios else 0,
        "critical_minimum_litres": sum(min(allocated[s.site_id], s.minimum_useful_litres) for s in confirmed if s.priority_class == "critical"),
        "high_minimum_litres": sum(min(allocated[s.site_id], s.minimum_useful_litres) for s in confirmed if s.priority_class == "high"),
        "total_travel_distance_metres": sum(r["travel_distance_metres"] for r in routes),
        "total_travel_duration_seconds": sum(r["travel_duration_seconds"] for r in routes),
        "latest_route_completion_time": max((r["estimated_return"] for r in routes), default=None),
        "unserved_site_count": sum(allocated[s.site_id] == 0 for s in confirmed),
    }
