"""Grounded fact selection for a future optional model; no SDK or network calls.

An optional provider may select fact IDs only. All rendered prose and numeric
values are derived locally, preventing an unchecked free-form model claim.
"""
from collections.abc import Callable

from pydantic import Field

from .schemas import Contract


class Selection(Contract):
    fact_ids: list[str] = Field(min_length=1, max_length=3)


def explain(checked_plan, provider: Callable | None = None):
    if not checked_plan["validation"]["valid"]:
        raise ValueError("Explanations require a validated plan")
    metrics = checked_plan["metrics"]
    facts = {
        "scheduled": f"Schedules {metrics['on_time_scheduled_litres']:,} modelled litres within the declared windows.",
        "unmet": f"{metrics['unmet_requested_litres']:,} litres of confirmed requests remain unmet.",
        "served": f"{metrics['served_site_count']} confirmed points have scheduled visits.",
    }
    selected = list(facts)
    mode = "deterministic"
    if provider is not None:
        try:
            value = Selection.model_validate(provider({"allowed_facts": facts}))
            if len(set(value.fact_ids)) != len(value.fact_ids) or any(k not in facts for k in value.fact_ids):
                raise ValueError("Unknown or repeated fact")
            selected, mode = value.fact_ids, "grounded_fact_selection"
        except Exception:  # noqa: BLE001 -- Optional model failure cannot block checked output.
            selected, mode = list(facts), "deterministic"
    return {"mode": mode, "text": " ".join(facts[k] for k in selected) + " Estimates are not delivery reports; global optimality is not proved.", "fact_ids": selected}
