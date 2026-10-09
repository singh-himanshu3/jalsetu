# Phase 5 preparation — 9 October 2026

This is researched implementation preparation, not an enabled public integration. The existing synthetic routing and resource labels remain in effect. A product question is pending: keep synthetic routing for the first demo, or use real Amazon Location road estimates for example coordinates after AWS access is ready. Neither option creates real requests, resources or confirmed deliveries.

## Findings that affect implementation

The current [Amazon Location v2 CalculateRouteMatrix contract](https://docs.aws.amazon.com/location/latest/APIReference/API_CalculateRouteMatrix.html) accepts WGS84 longitude/latitude positions and returns a row for each origin, with distance, duration and possible error for each destination. It charges by origin/destination pair. The existing maximum of one depot plus 20 sites means up to **441 pairs** for a full square matrix.

A default unbounded matrix permits only 100 pairs, so it cannot handle that maximum. An eventual adapter needs an explicit routing geometry that contains the selected nodes, or reviewed batching. Freeze node order, coordinates, departure/traffic/travel parameters and provider metadata in the cache identity. Reuse the stored snapshot for all compared strategies; do not recompute per strategy or UI poll.

The existing input schema supports missing route legs; preserve provider errors as unavailable legs and let the existing planner exclude unreachable sites. Never replace missing road values with toy estimates under a public-provider label. Provider failure may reuse an identical, previously accepted cached snapshot with its original retrieval time, hash and visible warning. A cache entry for changed coordinates or operating parameters is not an acceptable fallback.

The [Open-Meteo terms](https://open-meteo.com/en/terms) currently restrict the free API to non-commercial use, with request limits, and require attribution under CC BY 4.0. Whether a judged hackathon demo counts as promotional/commercial use needs checking before enabling ingestion. Reading documentation does not resolve that question. Weather context must show requested and returned grid locations, hourly represented times, retrieval time, units, source/terms links, content hash and limitations. Forecast context must not change confirmed requests or priority automatically.

## Offline implementation and evidence

`services/planner/jalsetu_planner/sources.py` contains pure helpers with no network clients. A source snapshot preserves explicit example/provider labels, represented/retrieval times, attribution, licence text supplied by the caller, coverage and limitations. Canonical JSON hashes bind its response, exact request and manifest. The v2 matrix adapter checks dimensions/node order/error count, conservatively rounds real values to whole metres/seconds, and preserves provider errors as missing legs. It never switches the planner’s configured provider.

Cached fallback requires an explicit caller-supplied freshness limit, matching request and intact hashes. It reports the true age, original timestamps and outage warning. No default freshness policy is silently chosen. 18 synthetic tests pass for asymmetric matrix order/rounding, missing route legs, malformed responses, changed coordinates/departure/traffic/node order, corrupted manifests/requests/content, stale/future cache entries and required attribution. The fixtures are fabricated API-shaped data, not downloaded AWS road estimates.

## Small next implementation steps

1. Retain the current synthetic release while the routing choice is unanswered.
2. Connect the tested pure response/snapshot helpers to owner-scoped storage and a provider client only after the routing choice. Decide the cache freshness policy explicitly.
3. Add a manual-refresh context endpoint and source freshness display with cached-age/outage tests. Leave scheduling and WorldPop disabled until their need and licensing are established.
4. If live road routing is selected, verify Mumbai service eligibility, least-privilege permissions, exact API/provider options, cache/storage terms and pricing; update the $100 estimate before making any paid request.
5. Collect live acceptance only after those gates and the account verification/quota block are resolved.

MapLibre/map styles, weather ingestion, storage/provider wiring, source UI and live source acceptance are **not implemented in this checkpoint**. The offline normalization/cache helpers are implemented. No AWS Location, weather API, WorldPop or Bedrock calls were made.

