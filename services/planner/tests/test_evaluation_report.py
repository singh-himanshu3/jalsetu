import json
from copy import deepcopy
from pathlib import Path

import pytest

from jalsetu_planner.evaluation import markdown

ROOT = Path(__file__).resolve().parents[3]


def test_report_preserves_all_results_and_tradeoffs():
    records = json.loads((ROOT / "docs/evaluation.json").read_text())
    output = markdown(records, ROOT / "data/evaluation/finish_by_close_parallel")
    for record in records:
        assert f"| {record['fixture'].removesuffix('.json')} | {record['strategy']} |" in output
    assert "No external coordinator" in output and "lowest recorded travel" in output


@pytest.mark.parametrize("damage", ["missing", "duplicate", "hash"])
def test_report_rejects_incomplete_or_stale_records(damage):
    records = deepcopy(json.loads((ROOT / "docs/evaluation.json").read_text()))
    if damage == "missing":
        records.pop()
    elif damage == "duplicate":
        records.append(records[0])
    else:
        records[0]["input_snapshot_sha256"] = "stale"
    with pytest.raises(ValueError):
        markdown(records, ROOT / "data/evaluation/finish_by_close_parallel")
