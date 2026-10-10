# Local original-plan comparison — 10 October 2026

The user authorized the next engineering priority and selected **original planned stops plus optional separate delivery records**. The existing local record workflow was extended without AWS, video or publication. No genuine coordinator records have been obtained; added software checks use labelled synthetic declarations.

## Implemented

- **More → Compare original plan** in local record projects, independent of normal generated plans. Blank readable CSV templates, source/reference, file preview and separate review/calculation. No JSON, internal IDs or hashes in customer screens/downloads.
- Original quantity, stop order and loading starts preserved. Arrival/return timing reconstructed from the exact saved road estimates, multiplier, loading/service durations and waiting until opening. Both plans use identical declared resources and the existing independent validator. JalSetu is freshly solved within the existing allowance.
- Readable originals with stock/capacity/window/minimum/increment failures retain quantities/issues; feasible metrics and improvement differences are withheld. Ambiguous names/stop numbers, duplicate visits, unsupported trips, wrong-day times and unavailable legs are rejected rather than repaired.
- All thirteen comparison metrics, travel/priority tradeoffs, ties and losses retained. A non-approvable JalSetu proposal also withholds the difference.
- Optional delivery rows preserve exact integer litres, including values below the planning increment. Missing reports stay unknown. Recorded arrival/finish times use the selected receiving-window rule. Oversupply, unconfirmed points and totals above initial stock are flagged without altering totals. Rows do not verify vehicle travel/capacity/stock movements and never become operation events.
- Self-contained printable HTML with resource constraints, both routes, per-point quantities, metrics, source references/dates/attribution, reported outcomes and evidence limits. Reports are temporary until downloaded; retain original source files too. Later-road/hindsight limits and no measured-improvement claim are explicit.
- Saved-source checks reused before solving. Admission prevents overlapping historical solves, normal planning and operation changes. Drafts/projects/approvals/events remain unchanged.

## Observed verification

- Full `pnpm check:local` passed **237 Python tests**, lint, customer/storage/history/records gates and five real-process production release/restart groups. Three existing OR-Tools SWIG warnings remain.
- Thirty-two new Python regressions cover preservation, constraint failures, ambiguity/day/scope rejection, ties/losses, missing/zero/partial outcomes, both closing rules, inconsistent totals, missing legs, trusted local-only use and saved-source enforcement.
- Node checks cover strict readable CSV/templates, exact outcomes, printable escaping, negative/withheld differences, local-only UI, stale-input remount and admission. Actual API integration retains a tie, withholds an invalid original, rejects corrupt roads and proves stored project/operation equality after comparison.
- After adding printable resource/constraint details: lint, historical Node checks, record integration and build passed again. Final acknowledgement styling passed lint/build. Final historical Node checks, all 32 historical Python tests and all five production release/restart groups passed again after the last code changes.
- Browser, separate `work/history-preview/state`: original CSV upload → preview → acknowledgement → model report passed without a delivery file; outcomes stayed unknown. Optional synthetic delivery CSV preserved **713 L** and other points stayed unknown.
- Actual browser HTML download: **10,704 bytes** checked for references, resources, requests, both routes, exact reported quantities, source/unknown map date and limitations; no raw hashes or executable scripts. This is a synthetic software-check report.
- Final desktop and 390×844 phone entry/report layouts visually inspected. Page width stayed within the viewport; tables scroll inside wrappers and file controls stay within their column. Final browser warning/error query returned no entries; viewport reset. [Desktop proof](screenshots/historical-comparison-desktop-2026-10-10.png), [phone proof](screenshots/historical-comparison-phone-2026-10-10.png).

## Use and remaining work

Follow [the beginner comparison guide](comparing-original-delivery-plans.md). Obtain anonymized original-day stock, capacity, requests, dispatch and separately recorded outcomes for a genuine comparison. External coordinator review, field trial and measured benefit remain unverified. Cloud projects stay example-only. Normal user state was not changed by tests/preview.
