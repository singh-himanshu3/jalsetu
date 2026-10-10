# First public-road evidence — 10 October 2026

The user chose public data with labelled example requests because no coordinator/NGO operational records are available. The existing planner and customer interface were extended; the project was not rebuilt. No AWS resources, routing/AI calls, paid provider or background refresh were used.

## What is now sourced

One bounded OSRM table request retrieved road distances and car travel estimates for the existing nine North Delhi **example coordinates**. The saved response contains 81 origin/destination pairs with no missing legs. The greatest returned snap distance is 58.75 metres; the experiment's limit was fixed at 250 metres before collection. Ordered coordinates, request options, source links, retrieval time, snapped positions, response payload and integrity hashes are preserved in `data/public-roads/north-delhi-osrm.json`.

Retrieval was **10 October 2026, 11:35 IST**. The provider did not return its underlying map date; that date remains unknown. Requested coordinates are not public facility records, verified receiving points or evidence of permission. The sourced component is the road-network estimate, while stock, vehicles, requests, priorities, receiving windows and locations remain examples.

Attribution: © OpenStreetMap contributors; routing by OSRM, hosted by FOSSGIS. See [data attribution](../data/public-roads/README.md), [OSRM API](https://project-osrm.org/docs/v5.24.0/api/), [provider usage policy](https://routing.openstreetmap.de/about.html) and [OpenStreetMap copyright/licence](https://www.openstreetmap.org/copyright). The provider's car profile does not establish tanker clearance/access or observed congestion. A personal, non-commercial frozen research test was performed; production service eligibility, refresh frequency and provider guarantees are not inferred from it.

## What we measured

Five existing scenarios × four strategies × four travel settings produced **80 retained calculations**. Settings comprise a freshly solved synthetic reference, the frozen public-road estimate, and example 1.5×/2× durations. The slowdown multipliers are invented sensitivity tests, not measured traffic. All strategies use finish-by-close, parallel loading, 100-L increments, seed 42 and a five-second allowance. Each public-road comparison shares one stored matrix, with missing-leg and conservative rounding rules. There is no per-strategy provider call.

All 80 results had feasible status and passing independent route checks. Rendering the report also reconstructs each experiment input from its original fixture and road snapshot, checks its hash and independently recomputes route validation and metrics. Missing/duplicate records, altered inputs, source corruption, metrics or routes are rejected. Complete inputs, routes, metrics, statuses, runtime and validations remain in developer evidence, rather than only favourable aggregate rows.

For the North Delhi example using public-road estimates:

| Option | Modelled scheduled water | Unmet example request | Estimated travel | Lowest fulfilment across requested points |
|---|---:|---:|---:|---:|
| Equal share | 10,800 L | 5,300 L | 49.1 km | 0.0% |
| Demand proportional | 11,100 L | 5,000 L | 44.0 km | 0.0% |
| Priority first | 10,800 L | 5,300 L | 39.3 km | 0.0% |
| JalSetu | 12,000 L | 4,100 L | 55.8 km | 29.2% |

JalSetu schedules 900 more modelled litres than demand proportional here, but uses a longer estimated route. This is not a universal winner: under shorter receiving hours and 2× travel, all four options tie at 7,800 L. In the stock-shortage/1.5× case all four schedule 7,000 L, while equal share has 30% minimum fulfilment and JalSetu has 0%; JalSetu's priority-first objective can leave a point unserved. The [complete readable report](public-road-evaluation.md) retains every row.

## Customer presentation

**More → About the example → What we checked on public roads** presents the measured research comparison. Scenario and travel-assumption selectors expose all options, including the original synthetic reference and slower-travel ties/losses. Customer-visible fields are names, litres, distance, fulfilment, source dates and plain-language limits. No JSON, hashes, raw inputs or developer identifiers are displayed.

This research panel is separate from the customer's current exercise. The normal guided example still uses its synthetic matrix; existing saved projects, operations, rules and reports were not converted into public-road runs. The panel uses build-time measured summary data, makes no provider requests and does not dispatch vehicles or create delivery reports.

## Verification

- Full Python suite: **185 passed**, including 18 new offline public-road/evidence corruption regressions; three existing OR-Tools SWIG warnings remain.
- TypeScript/Ruff and the production frontend build passed. The updated production release/restart check was run separately; its measured evidence remains in `docs/audit/local-release-check-2026-10-10.json`.
- Browser checks at desktop and phone viewport overrides verified scenario/travel filtering, the original reference, public estimates, slowdown ties, source dates/attribution and absence of returned warning/error logs. At the phone override, the actual CSS viewport was 355 px (existing browser scaling); page width stayed at 341 px. The 723-px table scrolled within its 260-px wrapper. The viewport override was reset.
- [Desktop evidence](screenshots/public-road-evidence-desktop-2026-10-10.png) and [phone evidence](screenshots/public-road-evidence-phone-2026-10-10.png) were saved and visually inspected.

Reproduction: `pnpm evaluate:roads` solves from the frozen snapshot with no network calls; `pnpm render:roads` regenerates the report/summary without solving. `pnpm collect:roads` refuses to replace an existing snapshot and makes only one request when no snapshot exists. No automatic refresh is enabled, and the frozen response must not be presented as current traffic.

## What this proof does and does not establish

This demonstrates that the existing planner can consume sourced road estimates, produce independently checked schedules and expose comparative tradeoffs across resource and travel assumptions. It is mixed-data software evidence.

To establish actual operational benefit, the next input is an anonymized coordinator dataset: confirmed requests, stock, vehicle capacities/windows, receiving permissions/windows, the coordinator's comparison plan, and timestamped observed arrival/delivery reports. A paired test must hold inputs fixed and preserve unmet requests and losing metrics; feedback and observed outcomes need separate recording. Public weather or population cannot substitute for these records or automatically generate demand/priority.

Phase 5 now has a real frozen research road snapshot and replay evidence. Continuous provider wiring, live operational routing, weather/context ingestion, field validation and the original AWS acceptance gates remain incomplete. Video/public submission remain deferred.
