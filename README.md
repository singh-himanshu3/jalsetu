# JalSetu · local prototype

JalSetu turns confirmed water requests, limited stock and vehicle constraints into a checked delivery plan. It also records loading, cumulative delivery reports, failures and recovery, then replans using water that is actually available. The local prototype supports a labelled North Delhi practice exercise and blank record-based projects for small Delhi-area comparisons.

**New local workflow:** create an empty operational-record project, enter anonymized records, preview a full receiving-point CSV, and explicitly fetch matching public-road estimates. See the [beginner guide](docs/using-operational-records.md) and [implementation checkpoint](docs/local-records-completion-2026-10-10.md). The prepared hosted release remains example-only.

**This is working local application code, not the completed AWS product.** The normal example uses synthetic resources, locations and travel. A separate [public-road research check](docs/public-road-checkpoint-2026-10-10.md) now uses sourced OSRM/OpenStreetMap estimates with example relief inputs. No NGO inventory, permissions, traffic observations or field impact are claimed.

**Latest evidence:** 80 retained public-road/reference/sensitivity calculations passed independent checking; 205 Python tests pass. Open **More → About the example → What we checked on public roads** for readable comparisons. `pnpm evaluate:roads` reproduces the experiment from the saved response without network requests; `pnpm render:roads` regenerates the report without solving.

The [remaining-phase checkpoint](docs/remaining-phases-2026-10-10.md) adds validated frontend hosting-package preparation. `pnpm check:hosting` checks the built files and prepared infrastructure locally. Fresh console checks still show Mumbai Lambda quota 10, the increase request Case Opened and CloudShell verification pending; no AWS deployment is claimed.

The [production launcher and local release checkpoint](docs/local-release-readiness-2026-10-10.md) adds one-server startup and a complete isolated restart/failure gate. Open **Start JalSetu.cmd** for the built app, or run `pnpm check:local` for release validation.

The [local recovery checkpoint](docs/local-recovery-completion-2026-10-10.md) adds receiving-point closure and explicit reopening, preserves stock and reports, and verifies both actual customer downloads.

The [customer interface cleanup](docs/customer-interface-2026-10-10.md) removes JSON editors/downloads, hashes and developer diagnostics from the product, including delivery downloads.

The [deployment-only release checkpoint](docs/deployment-only-release-2026-10-10.md) keeps the prepared AWS backend/hosting stack while excluding Amazon Location and Bedrock calls. Printable instructions now include a coordinator overview, per-point unmet quantities and preserved reports for revisions.

The [10 October usability update](docs/usability-update-2026-10-10.md) makes the example a one-click start, breaks setup into three steps, and adds clear approval/reporting actions. It builds on the [design refresh](docs/design-refresh-2026-10-10.md) within the existing application.

## Open it on this computer

Dependencies are already installed in this workspace. Open **Start JalSetu.cmd**: it builds the app and starts one local server. Keep its terminal window open and visit **http://127.0.0.1:8787** once it is ready. Press Ctrl+C to stop it. If a development copy is running, stop it first; a second copy on the same API port will be rejected.

For development, `pnpm dev` still opens the Vite interface at **http://127.0.0.1:5173** with the API at 8787. The built launcher and developer path use the same normal saved-data files. Dependencies must be installed before using this local fallback; it is not a standalone installer.

The local API binds to `127.0.0.1:8787`. Neither service is exposed publicly. There are no AWS calls or cloud charges in this path.

## Try the complete example workflow

1. On **Home**, click **Try the example**, then **Start guided example**. A four-step guide follows your progress from setup to your first delivery report. **Explore without the guide** skips the guidance; **Hide guide** and **Show my example guide** keep your current exercise intact. The sample is labelled and unsaved. To persist a draft, expand **Saved projects & new exercises** and create a project with a name, operating date, explicit example mode and synthetic-data acknowledgement.
2. **Set up** has three steps: Water & timing, Vehicles, and Water requests. Choose the loading and closing rules explicitly; neither is preselected. Review stock, available vehicles and confirmed requests. Back/Next retains your edits. Hours, CSV import and resource editing are in expandable sections.
3. Click **Create delivery plan**. **Your plan** shows vehicle instructions, quantities and unmet requests. **Compare other options** lets you review each strategy before choosing.
4. Use **Review & approve**, enter your name or team label, then **Approve example plan & track deliveries**. Approval saves the plan; all water remains at the depot.
5. In **Deliveries**, choose **Water loaded**, select a vehicle, and enter the date/time in IST. The example helper can copy its planned loading time. Click **Save report**.
6. Choose **Delivery made**, select a receiving point on that vehicle, and enter the total delivered to that point so far. The example helper copies sample quantities and time. Saving the same cumulative total twice adds no water.
7. Record **Vehicle broke down** when applicable. Remaining onboard water becomes stranded. Expand **Need to update the remaining deliveries?**, choose an explicit time at or after the last event, and create an updated plan. Review the preserved reports and old/new assignments, enter a team label and approve it. Only unused vehicles at the depot can take new routes.
8. **More → Compare options** retains the four-strategy comparison and five configurable example resource alternatives. Each alternative and a fresh baseline is solved separately. The batch leaves saved resources and operations unchanged.
9. **More → About the example** explains the sample data, checks and practical limits in plain language.

For a receiving-point closure, choose **Point closed**, select the point, enter its IST report time and save. The summary keeps earlier deliveries and the unmet request visible. Affected routes cannot be loaded until updated or the point is explicitly reopened. **Record a reopening** saves availability only; review and approve a new revision to reschedule an unvisited point. Positive delivery reports remain fixed, even after reopening.

Recovery is separate: explicitly report litres recovered **at the depot** before they can be scheduled again. A vehicle return puts remaining onboard water back at the depot and ends that vehicle's only trip. Signed depot-stock adjustments are also supported.

The conservation equation is checked after every accepted event:

`depot + onboard + reported delivered + stranded = initial stock + signed adjustments`

Physical reports retain exact integer litres. A revision can schedule only complete configured planning units; any remainder stays at the depot and is explicitly disclosed. It is not rounded away from the physical ledger.

## Import, save and export

- CSV import previews **updates to existing example point IDs**. Unknown IDs, duplicate IDs, malformed fields and invalid planning inputs are rejected. Applying the validated preview changes the draft and clears its old planning results.
- Saved approvals, immutable events and revisions survive API restarts in `local-state/operations.json`. **Open a saved run** restores them. Do not publish that file or store real confidential operational data in this unauthenticated local adapter.
- Project drafts persist separately in `local-state/projects.json`, with conditional versions. Use **Save changes** in More setup options after edits. Unsaved changes, quick examples and background jobs remain in memory; planning results need regeneration after a restart. The local job cache retains up to 50 records.
- **Archive project** hides a saved draft; **Open archived projects** lets you restore it. Approved operations and reports stay in their separate store. This does not extend the hosted demo's expiry or existing retention period.
- Your plan and Deliveries export readable CSV delivery sheets and printable vehicle instructions. They use names, litres and IST times; internal hashes/job references are excluded. The CSV now has customer-facing column headings, so it does not preserve the earlier audit-export schema. Open the HTML file and use the browser's Print command to print or save as PDF.

## What is verified

As of 10 October 2026 (latest checkpoint: `docs/public-road-checkpoint-2026-10-10.md`; local release gate: `docs/local-release-readiness-2026-10-10.md`; earlier local UI gate: `docs/phase-2-completion-2026-10-09.md`):

- **205 Python tests pass**, covering both operating policies, all four strategies, validator corruption checks, deterministic routes, failure accounting, retries, revision approval, exact stock remainders, cloud ownership, SDK boundaries and public-road/evidence integrity. Current staged-workflow evidence is in `docs/phase-4-readiness-2026-10-09.md`; the earlier checkpoint is preserved in `docs/continuation-2026-10-09.md`.
- TypeScript checks, Ruff and the production frontend build pass. `pnpm check:local` runs all local release gates in one command, including an isolated real-process restart/failure check.
- Local API integration checks pass for request idempotency, stale-version rejection, approval, failure, completed-report preservation and revision approval. The production release check also preserves project archive state, operations and retry receipts through actual restart, rejects corrupt saved data without resetting it, and verifies web serving cannot expose source/state/cloud configuration.
- CSV parsing/export, durable-storage, conditional project save/reopen and metric-formatting checks pass, including Unicode handling. Local CDK synthesis and security/concurrency assertions pass without deployment.
- Added regressions verify delayed stale writes, the bounded revision cache, malformed persisted files and strategy-specific approval labels. Export contents and deferred Blob cleanup pass; an actual API restart preserved the complete saved operation.
- Browser checks passed project creation, save/reopen, separate CSV preview/application, invalid drafts, unconfirmed-site exclusion and comparison. Earlier checks passed approval, loading, delivery reporting, failure and revision approval; see `docs/browser-verification.md`. Desktop and phone layouts were inspected. The delivery CSV and printable HTML now return completed download events and saved files; their contents were checked. See the local recovery checkpoint for evidence. CSV-template and hosted private-export acceptance remain separate.
- A local burst of 100 health reads succeeded. A burst of ten planning submissions accepted one and returned a busy response for nine; the accepted job completed. This is **not a public visitor or AWS load benchmark**.

See `docs/evaluation.md` for all 20 measured synthetic comparison results, `docs/evaluation.json` for raw metrics, and `docs/local-load-check.json` for the bounded local-load check. Evaluation settings are explicitly **finish-by-close, parallel loading, 100-litre increments and seed 42**. These test settings do not settle the team's unanswered operating-policy choices.

JalSetu does not win every metric. The North Delhi example schedules 12,000 litres versus demand proportional's 11,100; equal share gives better minimum fulfilment in the stock-shortage fixture. The comparison keeps those tradeoffs visible. None of these numbers establish real-world impact.

On this Windows machine, memory pressure caused numerical-library and build-tool failures during development. Numerical-library threads are now bounded to one. The final frontend checks succeeded with the development servers stopped; running the build while other applications exhaust memory can still fail. Three OR-Tools SWIG deprecation warnings remain in the Python test output.

## Architecture kept simple

`React UI → loopback Node API → shared planning stages → bounded Python planner → independent validator → result`

The prepared AWS path uses API Gateway/Cognito → Step Functions Standard → the existing worker image. Job details show recorded stage completions. The local comparison preview runs those same stages without AWS; its job snapshots remain ephemeral.

The Python core uses Pydantic, OR-Tools CP-SAT for allocation, and OR-Tools routing for one-trip schedules. The allocation includes per-vehicle packing assignments and the router respects those assignments. Routing remains a bounded heuristic; globally optimal dispatch is not claimed. All strategies share the stored matrix and independent validator.

Operational updates use a small file store with atomic replacement, conditional record versions and idempotency keys. One local calculation/update is admitted at a time. Excess requests receive a clear busy response rather than spawning an unbounded worker backlog. This file adapter is a development component and will not be deployed as the public service.

## Remaining scope

The full supplied specification is preserved in `docs/build-specification.md`; it is not all implemented.

- Live AWS deployment and verification. The foundation, Cognito frontend and cloud project/job/operations adapter are locally prepared. Reversible archive/restore, SDK-boundary checks and offline container execution now pass. Mumbai's Lambda quota of 10 blocks the current stack's three reserved slots; at least 103 available slots are needed. Step Functions Standard is now locally prepared with named stages, retry receipts, immutable results and terminal failure repair; live acceptance remains pending.
- Operational road routing, public weather/source ingestion and cache/refresh wiring. Phase 5 now has a real frozen OSRM/OpenStreetMap research snapshot and 80 checked comparisons, alongside offline source/cache helpers. The research is separate from the guided example and does not enable live operator routing or refresh. Developer evidence remains in the repository; the customer interface shows readable comparisons and limits without raw records. Current route lines are schematics, not road navigation.
- Genuine operational records, historical comparison and independent coordinator feedback. Local operator onboarding, new-point CSV preview/application and explicit public-road acquisition are implemented. Real records remain unavailable; testing uses labelled synthetic declarations. The hosted release stays example-only.
- Active-vehicle position/fixed-stop replanning and additional disruption types. Receiving-point closure and explicit reopening are implemented. Current revisions support unused depot vehicles; any active vehicle blocks a depot-based revision until it returns or is reported failed. Any point with a positive delivery report stays fixed; a second visit is outside this prototype.
- Separate en-route/arrived stop transitions, reviewed bilingual output, live optional Bedrock integration, cloud load testing/security acceptance and pilot feedback. Resource scenarios and the local revision difference are implemented.

Revision route metrics describe **pending routes only**. `revision_accounting` separately preserves reported deliveries and computes remaining unmet demand against all originally confirmed requests, including deficits at points already visited. Reports are never presented as independently verified deliveries.

The current spending ceiling is **$100 in credits, with no out-of-pocket spending**, superseding the earlier reported $449. A read-only Billing check on 9 October showed **$100.00 USD remaining**, **183 days remaining** and a **free plan that does not get charged**. Preserve that plan; an upgrade is not authorized. **Mumbai (`ap-south-1`), seven days, example-only** hosting remains the selected scope, including the existing operations workflow. Preparation has resumed, but deployment still needs service eligibility, a reviewed estimate and completed release prerequisites. No billable resources have been deployed by this project. See `docs/aws-foundation.md`; budget alerts alone are not a monetary cap.

The team's operating choices remain open: must unloading finish by closing or only start by closing, and can depot vehicles load concurrently or only one at a time? The prototype supports both, but does not select them for the team.

## Reproduce on another computer

Use Node 24, pnpm 11.22.0 and Python 3.12. On Windows, from this folder:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r services/planner/requirements.txt
pnpm install --frozen-lockfile
pnpm start
# For development instead:
pnpm dev
```

On Linux/macOS, create `.venv` with `python3 -m venv .venv`, install the same requirements using `.venv/bin/python`, then run the same pnpm commands. Alternatively set `JALSETU_PYTHON` to an existing compatible interpreter.

Useful checks (the complete gate is `pnpm check:local`):

```powershell
pnpm check:local
pnpm test:release
pnpm test
pnpm lint
pnpm build
pnpm test:csv
pnpm test:storage
pnpm test:operations
# With the local API running:
pnpm test:site-closure
pnpm test:exports
pnpm test:projects
pnpm test:metrics
pnpm test:report-time
pnpm infra:test
pnpm estimate:aws
# Historical Phase 3 estimate:
node scripts/estimate-aws-cost.mjs --phase3
pnpm evaluate
```

With the local servers running, `pnpm test:api` creates clearly named synthetic test exercises. `node scripts/test-local-load.mjs` performs only the bounded localhost check. The tests never require AWS credentials.

The latest checkpoint has **167 passing Python tests**. With Docker's Linux engine running, build the Lambda image with `docker build --platform linux/amd64 --provenance=false -t jalsetu-local-check:2026-10-10 -f services/cloud/Dockerfile .`, then run `pnpm test:container`. Its checks disable networking and use inert credentials. See [Phase 4 readiness](docs/phase-4-readiness-2026-10-09.md) and [Phase 5 preparation](docs/phase-5-preparation-2026-10-09.md) and the [seven-day estimate](docs/aws-cost-estimate-2026-10-09.md); estimates are not monetary caps.

The `.env.example` flags describe reserved future cloud configuration; changing them does not enable an AWS deployment. No passwords or access keys belong in this repository.

The private repository is [singh-himanshu3/jalsetu](https://github.com/singh-himanshu3/jalsetu). The user deferred the project license/publication choice; a private backup does not meet the public-submission gate. Dependency notices and the AI tool disclosure are in `NOTICE.md`.

## Next-phase evidence

[Current checkpoint](docs/local-release-readiness-2026-10-10.md), [architecture](docs/architecture.md), [source ledger](docs/source-ledger.md), [limitations](docs/limitations.md), [demo script](docs/demo-script.md) and [freeze/contingency checklist](docs/freeze-and-contingency.md) document what is working and which gates remain. `pnpm evaluate` regenerates both raw results and the complete Markdown table. `pnpm evidence:manifest` hashes source/fixtures/evidence and keeps absent deployment/video/submission URLs explicit. Submission and Builder Center files are drafts. No external coordinator, live cloud execution, submitted release tag or public publication is claimed.
