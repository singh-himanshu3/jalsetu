# Phase 2 completion and Phase 3 checkpoint

Verified 9 October 2026, Asia/Kolkata. This report supersedes the earlier Phase 2 status in `audit-2026-10-09.md`; that audit remains a historical record.

## Outcome

Phase 2's **local example-only acceptance gate is complete**. The team explicitly selected example-only hosting, so real/operator onboarding is excluded from this checkpoint. Phase 3 has a locally tested foundation and adapter, but its live acceptance gate is **incomplete**. The team paused AWS work while resolving credit issues. No resources were deployed and no paid AWS calls were made.

## Phase 2 implementation

- Create an example project with an explicit name, operating date, data-mode choice and synthetic-data acknowledgement. Save/reopen drafts with conditional versions and atomic file storage. Incomplete drafts can be saved; planning still requires valid inputs.
- Edit depot stock/windows/coordinates, vehicle names/capacities/availability/windows, and point names/coordinates/requests/minimums/receiving limits/windows/priority reasons/confirmation. Add/remove resources within the prototype's five-vehicle/twenty-point limits. Coordinate or membership edits invalidate the route matrix. The explicit example-only rebuild action makes a labelled toy matrix; it is not a routing provider.
- Preview existing-point CSV updates through server validation, then apply separately. Editing the full input resets the CSV component, preventing an old preview from overwriting a newer draft.
- Generate four strategies through the bounded local API. Show all thirteen computed metrics, independent validation, readable failures, loading and empty states, stop sequence/times/remaining load, and fallback route lines with vehicle legends.
- Compare quantities on a common scale and inspect fulfilment at every point. Aggregate metrics explicitly cover confirmed requests; unconfirmed points remain visible and cannot receive scheduled visits.
- Preserve example/provenance labels throughout. No weather or population values generate requests or resource availability.

### Bugs corrected during verification

- Metric formatting previously matched the substring `ratio` inside `duration`, displaying travel seconds as a percentage. Only names ending in `_ratio` now receive percentage formatting. A regression check covers duration and ratio values.
- Completion timestamps now display in IST, matching the operating-date and receiving-window controls.
- Blank quantities remain missing values and fail validation instead of silently becoming zero. Validation messages identify the resource and field.
- Polling avoids overlapping reads and ignores responses after cancellation. Muted text and sidebar contrast were improved. CSV templates use the same attached-anchor/deferred-Blob-cleanup helper as the other exports.

## Verification evidence

| Check | Result |
|---|---|
| `node scripts/python.mjs -m pytest services/planner/tests -q` | 83 passed; three upstream SWIG deprecation warnings |
| `pnpm typecheck` | Passed after final UI edits |
| `node scripts/python.mjs -m ruff check services/planner services/cloud` | Passed |
| `pnpm build` | Passed after final UI edits |
| `node infra/test-foundation.mjs` | CDK synth and template assertions passed; no deployment |
| CSV, storage, operations, exports, projects and metrics Node checks | All six passed |
| Local API integration | Passed approval, loading, cumulative reporting, failure, revision and conditional/idempotent updates |
| Local load check | 100 health reads succeeded; ten competing planning requests admitted one and returned nine busy responses; accepted job completed |

The load test is a bounded localhost check, not an AWS/public visitor capacity claim. One initial attempt overlapped the API test's calculation and was rerun after that test completed. Test commands are listed in README.

Browser observations in the Codex in-app browser:

1. Created `Phase 2 verification · EXAMPLE`, saved/reopened it, and verified the explicit finish-by-close/parallel-loading test settings persisted. They remain selectable policies, not team defaults.
2. Made SITE-1 unconfirmed and generated plans: its scheduled quantity was zero, with an explicit unconfirmed reason.
3. Added incomplete resources and saved their draft. Planning rejected missing capacities, coordinates, priority/reason and matrix. Removed those temporary resources and explicitly rebuilt the synthetic matrix.
4. Validated a CSV update from SITE-1's 2,500 to 2,400 litres. Before Apply, the form still showed 2,500; after Apply it showed 2,400. Restored 2,500, saved version 5, reloaded the page and reopened that exact draft.
5. Generated a valid final JalSetu plan: 12,000 modelled litres scheduled, 4,100 unmet confirmed litres, eight points meeting their minimum, zero independent validation errors. The final run reported 0.172 seconds planner runtime and 2.891 seconds job runtime; these timings vary. Baselines and tradeoffs remained visible.
6. Inspected 1280×720 and 390×844 layouts. Page scroll width stayed within the viewport; wide tables scroll inside their containers. Verified the corrected 6,360-second travel metric and IST completion display. Temporary viewport overrides were reset. Final warning/error console query returned no entries.

Screenshots were saved and visually inspected:

- [Desktop comparison](screens/phase-2-desktop-2026-10-09.png)
- [Phone comparison](screens/phase-2-mobile-2026-10-09.png)

## Phase 3: prepared, not accepted live

Source defines Amplify hosting configuration, Cognito authorization-code sign-in with PKCE, API Gateway authorization, container Lambdas, DynamoDB, private S3 snapshots and CloudWatch logs. The adapter has authenticated ownership, conditional draft updates, idempotent jobs, an admission lease, a daily job limit, structured correlation logs and expiry rejection. Mock adapter tests exercise these behaviors without AWS.

CDK tests verify private S3, admin-created Cognito users, secretless clients, authorization on every non-OPTIONS API method, table TTL and bounded Lambda concurrency. Container images/ECR publication, SDK behavior, actual identity isolation, login, hosted frontend and CloudWatch delivery are **not live verified**. The source currently supports project create/read/update, not delete, and does not contain the local operations endpoints. It must not be deployed as a complete cloud version yet. Cleanup preparation is in `aws-foundation.md`.

Mumbai (`ap-south-1`), seven days and example-only hosting are confirmed. The reported $449 could not be verified in the signed-in account; the team requested that AWS be left alone while credits are resolved. No exact deployment expiry is chosen before deployment.

## Remaining limitations

- Browser downloads are unverified. The CSV template also returned no download event within eight seconds in the in-app browser. Serialization/HTML escaping/deferred cleanup tests pass; that does not establish successful browser saving. Regular-browser download acceptance remains in Phase 7.
- The broader specification is unfinished: AWS deployment, Step Functions, Amazon Location/public context ingestion, additional disruption states/active-position revisions, marginal-resource analysis, bilingual review, field feedback and submission remain open or partial.
- Schematics and toy matrices are synthetic, and physical delivery reports are self-entered. No real NGO operations or measured field impact are claimed.
- Targeted responsive/contrast/keyboard checks are not a full accessibility certification. Tests do not establish a universal zero-bug guarantee.
