import pytest

from jalsetu_planner.explanation import explain


@pytest.fixture
def checked():
    return {"validation": {"valid": True}, "metrics": {"on_time_scheduled_litres": 1200, "unmet_requested_litres": 300, "served_site_count": 2}}


def test_forced_provider_failure_returns_deterministic_facts(checked):
    def unavailable(_):
        raise RuntimeError("Model access denied")
    assert explain(checked, unavailable) == explain(checked)


@pytest.mark.parametrize("response", [{"fact_ids": ["invented_999999"]}, {"fact_ids": ["unmet"], "text": "999999 litres"}, {"fact_ids": ["served", "served"]}, {"fact_ids": []}])
def test_ungrounded_content_is_discarded(checked, response):
    assert explain(checked, lambda _: response) == explain(checked)


def test_provider_can_only_select_locally_rendered_facts(checked):
    output = explain(checked, lambda _: {"fact_ids": ["unmet", "scheduled"]})
    assert output["mode"] == "grounded_fact_selection" and "300 litres" in output["text"] and "1,200" in output["text"]
    assert "2 confirmed" not in output["text"]
    with pytest.raises(ValueError):
        explain({**checked, "validation": {"valid": False}})
