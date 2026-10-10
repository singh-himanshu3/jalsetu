# Local operational-record entry and matching roads — 10 October 2026

The user authorized the next priority: real-data entry/import and matching public-road estimates, without AWS. The existing app was extended. This milestone supplies a local record-based workflow, not genuine coordinator data or proof of field benefit. Prepared cloud projects remain example-only.

## Implemented

- Blank local operator-entered projects with save/reopen/archive support. No example stock, vehicles, points, locations or windows are copied into real-record fields.
- Declared source/reference, record date and review acknowledgement retained in planning and approval snapshots. These are operator declarations, not independent verification. Existing example snapshots remain byte-equivalent when the optional record source is absent.
- Existing three-step forms support manually entered records, explicit operating policies, configurable quantity steps, and the existing one-depot/five-vehicle/twenty-point small Delhi bounds. The review derives tight bounds from the actual entered locations and rejects larger/outside areas.
- A blank receiving-point CSV with readable headings, strict whole-litre/time parsing, full-list server validation, readable preview and separate apply action. Applying clears previous roads/plans and leaves approved operations unchanged. Depot and vehicles remain manual entry. This new import replaces all draft points, rather than merging by internal IDs.
- Explicit OSRM acquisition only after validation and coordinate-sharing acknowledgement. One bounded request per action, a local admission/cooldown guard, no retries or background refresh, and no fallback to sample roads. Provider source responses are retained in ignored local state. Car routing does not establish tanker access, current traffic, site permission or actual need.
- Exact request/node/coordinate checks, retained source hashes, conservative rounding, missing-leg handling and matrix equality before local planning/approval/events/replanning. Snapshot lookup uses a bounded derived filename and recognizes equivalent UTC Z/+00:00 serialization through approval and restart. Changing locations or point membership clears roads.
- Record-aware customer banners, source information and printable/CSV labels. Example loading/delivery autofill is absent for record projects. Printable instructions include declared source/date and public-road attribution. Customer screens do not expose raw JSON, road responses or integrity hashes.

## Observed checks

- Python suite: **205 passed**, with three existing OR-Tools SWIG warnings. Twenty new record regressions cover pre-network rejection, source/provenance checks, matching/stale/corrupt roads, no fallback, default/cloud rejection, local checked approval and preservation of historical example inputs.
- `pnpm check:local` passed the 205-test suite, lint, customer/storage/operations/project checks, record integration and the isolated production release/restart gate. Subsequent printable-label/notes corrections passed the strengthened export checks, lint/build and the production release gate again. The extended record integration additionally verified loading/delivery reports and their real-process restart persistence; after a UTC serialization lookup correction it passed again.
- `pnpm test:records` covers blank project creation, readable CSV parsing, missing/invalid values, resource limits, sharing acknowledgement, admission/cooldown, saved source responses, four checked strategies, approval, loading and delivery reporting, project/report restart persistence, and stale/tampered/missing road rejection. Its operational records are explicitly synthetic; it makes no provider calls.
- Browser: created an empty project, entered explicitly labelled synthetic test records manually, fetched one actual two-coordinate/four-pair OSRM response at **10 October 2026, 14:26:31 IST**, saved the draft and generated a checked 1,000-L proposal. This is software evidence, not an actual request or delivery. The source response is retained in the separate ignored preview store; it is not a replacement for the original published nine-node research dataset.
- Browser: downloaded the blank template and checked its headings/absence of example values; uploaded a labelled synthetic CSV, observed the separate validated preview, then applied it and verified that roads cleared. No second provider fetch was needed for that invalidation check.
- Final build: the record-project form was visually inspected and [captured](screenshots/local-record-project-2026-10-10.png). The final tab returned no warning/error logs. This milestone does not claim external user testing, a new phone-layout acceptance gate or hosted acceptance.

## Use and remaining work

Follow the [beginner guide](using-operational-records.md). Start with genuine permitted records from one delivery day. Importing them does not independently verify their origin. Preserve the coordinator's original dispatch plan and actual arrival/delivery records separately: automated historical-plan import/evaluation and field feedback are still remaining work. No genuine coordinator dataset, observed outcome improvement, automatic dispatch, AWS resources, paid routing or AI calls are claimed.

Local snapshots and records are stored on this computer, outside the source repository. The loopback application has no per-user authentication or encrypted vault; use anonymized records rather than confidential operational data. Normal saved runs were not changed by tests or the separate preview.
