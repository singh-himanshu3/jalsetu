# Public-road planning evidence

Public road estimates are used with **example requests, vehicles, stock, priorities and receiving locations**. This is a reproducible mixed-data software evaluation, not a real relief operation or observed delivery benefit.

Retrieved: 2026-10-10T06:05:23.340839+00:00. Provider map date: not supplied; unknown. All compared strategies reuse the same frozen road snapshot.

One table request covers nine example nodes (81 pairs). Returned road distances/durations are rounded upward to whole metres/seconds. Snapped endpoints must be within the declared 250-m research limit. Missing legs remain unavailable.

The 1.5× and 2× travel times are **invented sensitivity settings**, not measured traffic. The synthetic reference is re-solved alongside the public-road cases. Policies are finish-unloading-by-close and parallel loading; seed 42; five seconds per strategy; 100-L units. These are experiment settings, not coordinator instructions.

| Scenario | Source | Travel setting | Strategy | Scheduled L | Unmet L | Served points | Travel km | Lowest fulfilment | Status | Check |
|---|---|---:|---|---:|---:|---:|---:|---:|---|---|
| balanced_supply | synthetic_reference | 1× | equal_share | 8000 | 0 | 8 | 29.700 | 100.0% | feasible | passed |
| balanced_supply | synthetic_reference | 1× | demand_proportional | 8000 | 0 | 8 | 29.700 | 100.0% | feasible | passed |
| balanced_supply | synthetic_reference | 1× | greedy | 8000 | 0 | 8 | 29.700 | 100.0% | feasible | passed |
| balanced_supply | synthetic_reference | 1× | jalsetu | 8000 | 0 | 8 | 38.700 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1× | equal_share | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1× | demand_proportional | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1× | greedy | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1× | jalsetu | 8000 | 0 | 8 | 50.303 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1.5× | equal_share | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1.5× | demand_proportional | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1.5× | greedy | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 1.5× | jalsetu | 8000 | 0 | 8 | 50.303 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 2× | equal_share | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 2× | demand_proportional | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 2× | greedy | 8000 | 0 | 8 | 45.472 | 100.0% | feasible | passed |
| balanced_supply | public_roads | 2× | jalsetu | 8000 | 0 | 8 | 50.303 | 100.0% | feasible | passed |
| narrow_time_windows | synthetic_reference | 1× | equal_share | 7800 | 8300 | 4 | 21.600 | 0.0% | feasible | passed |
| narrow_time_windows | synthetic_reference | 1× | demand_proportional | 7800 | 8300 | 4 | 21.600 | 0.0% | feasible | passed |
| narrow_time_windows | synthetic_reference | 1× | greedy | 7800 | 8300 | 4 | 21.600 | 0.0% | feasible | passed |
| narrow_time_windows | synthetic_reference | 1× | jalsetu | 7800 | 8300 | 4 | 21.600 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1× | equal_share | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1× | demand_proportional | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1× | greedy | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1× | jalsetu | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1.5× | equal_share | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1.5× | demand_proportional | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1.5× | greedy | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 1.5× | jalsetu | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 2× | equal_share | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 2× | demand_proportional | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 2× | greedy | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| narrow_time_windows | public_roads | 2× | jalsetu | 7800 | 8300 | 4 | 36.365 | 0.0% | feasible | passed |
| north_delhi_example | synthetic_reference | 1× | equal_share | 10800 | 5300 | 7 | 32.400 | 0.0% | feasible | passed |
| north_delhi_example | synthetic_reference | 1× | demand_proportional | 11100 | 5000 | 7 | 34.200 | 0.0% | feasible | passed |
| north_delhi_example | synthetic_reference | 1× | greedy | 10800 | 5300 | 6 | 27.900 | 0.0% | feasible | passed |
| north_delhi_example | synthetic_reference | 1× | jalsetu | 12000 | 4100 | 8 | 35.100 | 29.2% | feasible | passed |
| north_delhi_example | public_roads | 1× | equal_share | 10800 | 5300 | 7 | 49.061 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1× | demand_proportional | 11100 | 5000 | 7 | 44.037 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1× | greedy | 10800 | 5300 | 6 | 39.345 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1× | jalsetu | 12000 | 4100 | 8 | 55.786 | 29.2% | feasible | passed |
| north_delhi_example | public_roads | 1.5× | equal_share | 10800 | 5300 | 7 | 49.061 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1.5× | demand_proportional | 11100 | 5000 | 7 | 44.037 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1.5× | greedy | 10800 | 5300 | 6 | 39.345 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 1.5× | jalsetu | 12000 | 4100 | 8 | 55.786 | 29.2% | feasible | passed |
| north_delhi_example | public_roads | 2× | equal_share | 10800 | 5300 | 7 | 49.061 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 2× | demand_proportional | 11100 | 5000 | 7 | 44.037 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 2× | greedy | 10800 | 5300 | 6 | 39.345 | 0.0% | feasible | passed |
| north_delhi_example | public_roads | 2× | jalsetu | 12000 | 4100 | 8 | 55.786 | 29.2% | feasible | passed |
| stock_shortage | synthetic_reference | 1× | equal_share | 7000 | 9100 | 8 | 29.700 | 30.0% | feasible | passed |
| stock_shortage | synthetic_reference | 1× | demand_proportional | 7000 | 9100 | 7 | 27.000 | 0.0% | feasible | passed |
| stock_shortage | synthetic_reference | 1× | greedy | 7000 | 9100 | 8 | 28.800 | 20.0% | feasible | passed |
| stock_shortage | synthetic_reference | 1× | jalsetu | 7000 | 9100 | 4 | 15.300 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 1× | equal_share | 7000 | 9100 | 8 | 45.472 | 30.0% | feasible | passed |
| stock_shortage | public_roads | 1× | demand_proportional | 7000 | 9100 | 7 | 43.719 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 1× | greedy | 7000 | 9100 | 8 | 50.220 | 20.0% | feasible | passed |
| stock_shortage | public_roads | 1× | jalsetu | 7000 | 9100 | 4 | 23.278 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 1.5× | equal_share | 7000 | 9100 | 8 | 45.472 | 30.0% | feasible | passed |
| stock_shortage | public_roads | 1.5× | demand_proportional | 7000 | 9100 | 7 | 43.719 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 1.5× | greedy | 7000 | 9100 | 8 | 50.220 | 20.0% | feasible | passed |
| stock_shortage | public_roads | 1.5× | jalsetu | 7000 | 9100 | 4 | 23.278 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 2× | equal_share | 7000 | 9100 | 8 | 45.472 | 30.0% | feasible | passed |
| stock_shortage | public_roads | 2× | demand_proportional | 7000 | 9100 | 7 | 43.719 | 0.0% | feasible | passed |
| stock_shortage | public_roads | 2× | greedy | 7000 | 9100 | 8 | 50.220 | 20.0% | feasible | passed |
| stock_shortage | public_roads | 2× | jalsetu | 7000 | 9100 | 4 | 23.278 | 0.0% | feasible | passed |
| vehicle_unavailable | synthetic_reference | 1× | equal_share | 7000 | 9100 | 7 | 26.100 | 0.0% | feasible | passed |
| vehicle_unavailable | synthetic_reference | 1× | demand_proportional | 6400 | 9700 | 6 | 22.500 | 0.0% | feasible | passed |
| vehicle_unavailable | synthetic_reference | 1× | greedy | 7000 | 9100 | 8 | 27.900 | 20.0% | feasible | passed |
| vehicle_unavailable | synthetic_reference | 1× | jalsetu | 7000 | 9100 | 4 | 17.100 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1× | equal_share | 7000 | 9100 | 7 | 39.766 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1× | demand_proportional | 6400 | 9700 | 6 | 34.239 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1× | greedy | 7000 | 9100 | 8 | 47.385 | 20.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1× | jalsetu | 7000 | 9100 | 4 | 27.403 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1.5× | equal_share | 7000 | 9100 | 7 | 39.766 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1.5× | demand_proportional | 6400 | 9700 | 6 | 34.239 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1.5× | greedy | 7000 | 9100 | 8 | 47.385 | 20.0% | feasible | passed |
| vehicle_unavailable | public_roads | 1.5× | jalsetu | 7000 | 9100 | 4 | 27.403 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 2× | equal_share | 7000 | 9100 | 7 | 39.766 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 2× | demand_proportional | 6400 | 9700 | 6 | 34.239 | 0.0% | feasible | passed |
| vehicle_unavailable | public_roads | 2× | greedy | 7000 | 9100 | 8 | 47.385 | 20.0% | feasible | passed |
| vehicle_unavailable | public_roads | 2× | jalsetu | 7000 | 9100 | 4 | 27.403 | 0.0% | feasible | passed |

## What this establishes

80 bounded calculations are retained, including ties, losses and failed statuses. 80 returned passing independent route checks. Checked feasibility does not prove optimality or establish a universal winner.

The provider uses a public car profile. It does not establish tanker accessibility, current congestion, service permission, water quality, actual stock, real requests or deliveries. No weather/population data created priorities or demand. A historical or current field backtest has not been performed.

To establish operational impact next, obtain anonymized confirmed requests/resources and the coordinator's original plan, then run a paired comparison with identical inputs. Collect observed arrival/delivery reports and coordinator feedback separately. Do not use modelled quantities as measured benefits.

## Sources and reproduction

© OpenStreetMap contributors; routing by OSRM, hosted by FOSSGIS. [OpenStreetMap data licence](https://www.openstreetmap.org/copyright), [OSRM HTTP API](https://project-osrm.org/docs/v5.24.0/api/), [FOSSGIS usage policy](https://routing.openstreetmap.de/about.html), [fix the map](https://www.openstreetmap.org/).

Run `pnpm evaluate:roads` to solve again from the saved snapshot **without network requests**. `pnpm render:roads` rebuilds the report and customer summary from saved measured results without solving. `pnpm collect:roads` makes one explicit collection request only if the snapshot file does not already exist. No background refresh, paid provider or AWS call is enabled.

The complete developer evidence retains raw response, ordered request, snapped positions, hashes, all inputs, routes, validation and metrics. The customer summary exposes readable quantities and source limits only.
