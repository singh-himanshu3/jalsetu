# Source and assumption ledger

| Source | Current use | Provenance / period | Attribution and limits |
|---|---|---|---|
| `data/public-roads/north-delhi-osrm.json` | Frozen public-road research; five scenarios, four strategies and public/synthetic/slower-travel settings | One real OSRM table response retrieved 10 October 2026, 11:35 IST; provider map date absent | © OpenStreetMap contributors, ODbL; OSRM/FOSSGIS public car profile. Example coordinates/resources/requests; not tanker access, traffic observations or actual relief outcomes. See [checkpoint](public-road-checkpoint-2026-10-10.md) |
| `data/evaluation/finish_by_close_parallel/*.json` | Five fixtures, four strategies each | Authored synthetic resources, requests, coordinates and matrix | JalSetu example fixtures; no actual needs, traffic or deliveries; project publication license pending |
| `data/evaluation-events/failure_after_delivery.json` | Loading, report, failure and revision evidence | Synthetic scheduled timestamps used as exercise events | Self-entered reports are not independently verified deliveries |
| Saved `travel_matrix` in each input | Every route calculation | `provenance=example`; public retrieval/represented timestamps absent | Straight-line toy estimates; not road geometry or navigation; UI displays original source fields |
| [Amazon Location matrix contract](https://docs.aws.amazon.com/location/latest/APIReference/API_CalculateRouteMatrix.html) | Offline response normalizer tests only | Synthetic API-shaped responses; no provider requests or retrieved road data | Missing/error legs remain unavailable; provider policy, boundary/batching and live acceptance pending |
| [Open-Meteo terms](https://open-meteo.com/en/terms) | Provider preparation only | No weather retrieved or stored | Applicable usage terms and routing/context product choice remain pending; no weather-derived demand |
| `docs/aws-price-snapshot-2026-10-09.json` | Offline seven-day estimate | Dated public AWS price feeds; original source URLs/SKUs retained in snapshot | Eighteen rates; usage assumptions and contingency disclosed; not a monetary cap or bill |
| Optional population context | Disabled | Nothing retrieved | Does not create requests; no coverage or population claim |
| OR-Tools / Pydantic and frontend libraries | Solver/contracts/interface | Pinned project dependencies | Dependency notices and AI assistance disclosure in [NOTICE](../NOTICE.md) |

Developer evidence retains source payloads, input/matrix hashes and original dates/attribution; customer JSON/raw-source exports were removed at the user's instruction. The public-road research panel displays readable quantities, dates, attribution and limits from its measured build-time summary. Viewing it makes no source requests and does not change the normal synthetic exercise. The separate offline cache helper still requires an explicit age policy; it is not a continuously refreshed operational source flow.

Evaluation policies are explicit test choices: finish by close, parallel loading, increment and seed stored per fixture. The team has not selected a final operating default. Marginal amounts and times are labelled examples and configurable; all changes preserve the original input and operations.
