import { readFile, writeFile } from 'node:fs/promises';
const rows = JSON.parse(await readFile(new URL('../docs/evaluation.json', import.meta.url), 'utf8'));
const text = [
  '# Synthetic planning evaluation', '',
  'These are local, synthetic scenario results. Settings: unloading finishes by closing; parallel loading; 100-litre increments; seed 42; five-second allowance per strategy. These settings are explicit evaluation choices, not a decision made for the team’s operating policy.', '',
  'All strategies use the same resources, requests and stored matrix within each scenario. No result establishes real traffic, NGO impact, global optimality or a guarantee that JalSetu always wins.', '',
  '| Scenario | Strategy | Scheduled L | Unmet L | Critical minimum L | Lowest fulfilment | Travel km | Validator |',
  '|---|---|---:|---:|---:|---:|---:|---|',
  ...rows.map(r => `| ${r.fixture.replace('.json', '')} | ${r.strategy} | ${r.metrics.on_time_scheduled_litres} | ${r.metrics.unmet_requested_litres} | ${r.metrics.critical_minimum_litres} | ${(r.metrics.minimum_fulfilment_ratio * 100).toFixed(1)}% | ${(r.metrics.total_travel_distance_metres / 1000).toFixed(1)} | ${r.validation.valid ? 'passed' : 'FAILED'} |`), '',
  'Raw metrics, input hashes, solver status and observed runtime are in `evaluation.json`. The complete source inputs are in `data/evaluation/finish_by_close_parallel/`. Runtime and creation timestamps vary; quantities, route sequences, metrics and snapshot hashes are the deterministic outputs checked by the test suite.', '',
  'The separate `data/evaluation-events/failure_after_delivery.json` preserves an approved example, loading, a reported delivery, a failure, exact stock accounting and a checked revision draft. It is not a real dispatch report.', '',
].join('\n');
await writeFile(new URL('../docs/evaluation.md', import.meta.url), text);
console.log(`Wrote evaluation note for ${rows.length} measured strategy results.`);
