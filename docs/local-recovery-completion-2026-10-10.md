# Local downloads and receiving-point recovery — 10 October 2026

Completed the two requested local follow-ups without AWS: verify actual customer downloads and support receiving-point closure/reopening in the existing operations workflow. This extends the existing application and does not change the original phase numbering or complete deployment acceptance.

## Customer workflow

In **Deliveries**, choose **Point closed**, select a receiving point, enter when it happened in IST and save the report. The closed-points summary shows its previously reported water and still-unmet request. A closure changes availability only; stock and earlier reports remain unchanged.

The point stays closed for this run until a coordinator explicitly saves **A receiving point reopened**. **Record a reopening** opens that report directly. Saving a reopening does not approve a route. Generate, review and approve a new revision to reschedule an unvisited point.

An affected old route cannot be loaded while its point is closed. Deliveries to that point require reopening first. New revisions exclude closed points but keep their original requests in shortfall accounting. A checked revision also rejects a tampered route that includes a closed point. Every availability report invalidates an older draft, and retries retain existing receipt/version safeguards.

Active vehicles still block depot-based replanning until explicitly returned or reported failed. A returned vehicle has completed its one trip; it cannot be dispatched again. Any positive delivery report keeps that point fixed in subsequent revisions, including after reopening; additional visits remain outside this implementation. If all points close, the checked draft schedules no water and cannot be approved under the existing rules.

## Actual downloads

Both existing customer controls produced completed browser download events and actual saved files in the local Downloads folder:

- `jalsetu-example-deliveries.csv`: 2,105 bytes, eight readable receiving-point rows, 12,000 planned litres in total.
- `jalsetu-example-plan-and-task-cards.html`: 5,307 bytes, printable instructions, requests/shortfall and reported-water labels.

These came from the saved **Guided example check**, revision 1. The saved bytes were read and checked for readable names, IST times, example labels and absence of raw job/hash fields. File hashes are recorded in [download evidence](audit/download-saving-2026-10-10.json). This resolves the earlier local browser-saving limitation for these two customer exports. Hosted private-download expiry and unrelated CSV-template saving are not established by this check.

## Verification

- Full Python suite: **167 passing tests**, including eleven new availability/recovery checks; three existing OR-Tools SWIG warnings remain.
- TypeScript, Ruff and production frontend build pass. Existing guide, revision-difference, IST-picker and customer-export checks pass.
- `pnpm test:site-closure` runs the real localhost API through approval → closure → revised approval → explicit reopening → revised approval. It checks request retries, stale versions, excluded/restored visits, unchanged 12,000-L stock, immutable original input/plan, two saved reports and persisted reads. [Synthetic API snapshots](audit/site-closure-example-2026-10-10.json) record the result.
- Browser walkthrough **Browser site-closure check** confirmed the affected loading button is disabled, closed-point shortfall is visible, revision 2 excludes Example point 6, explicit reopening restores its 700-L visit, and revision 3 retains all water at the depot. Reopening alone did not change the approved revision. The closure and reopening reports remain in readable history. The run was reopened from saved storage after the browser tab closed.
- At a 390 × 844 phone viewport, the closure summary and action wrapped without page overflow; measured content and viewport widths both equalled 375 px after scrollbar space. The viewport override was reset. Browser console errors were not reported in the final check.

Desktop proof: [closed point](screenshots/closed-point-2026-10-10.jpg). Phone proof: [closed point on phone](screenshots/closed-point-phone-2026-10-10.jpg). Reopening proof: [recorded reopening](screenshots/reopened-point-2026-10-10.jpg).

No AWS deployment, paid call, video, submission, public publication, field delivery or external participant validation was performed. Cloud account/quota and live acceptance remain pending. The selected release continues to exclude AWS routing and AI calls.
