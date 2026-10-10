# Build status

Started 8 October 2026 (Asia/Kolkata).

## Current checkpoint: local operations, scenarios and reproducible evaluation

10 October guided first-use: [onboarding and validation checkpoint](guided-example-validation-2026-10-10.md) completes the requested local guide and software-validation milestones. The user excluded video/submission work. Welcome/skip/hide/resume, explicit rules, approval → loading → delivery and phone layouts were exercised. Evaluation regenerated 20 results; 156 Python tests, guide assertions, lint/build and bounded local workload checks pass. No external user or cloud acceptance is claimed.

10 October deployment-only scope: keep the prepared AWS stack but exclude AWS routing and AI calls for this release. Phase 7 now includes a printable coordinator overview with per-point shortfall and separate preserved delivery reports. Export checks, lint and production build pass; the rendered revision report was inspected locally. See [release checkpoint](deployment-only-release-2026-10-10.md). Live road-provider selection and external user validation remain separate choices; local completion does not establish AWS acceptance.

10 October AWS continuation: the user authorized and submitted the console's minimum **1,000 Lambda concurrency** request; approval is pending and the applied Mumbai quota remains 10. Worker/API limits remain 1/2. The user reports an activation email, while CloudShell still reports verification pending. See [AWS preflight](aws-preflight-2026-10-10.md). The CDK command entry now rejects regions outside Mumbai and expiries outside the next seven days; scope regression checks and local foundation assertions pass. No live phase is marked complete.

10 October customer-interface correction: per the user’s explicit request, JSON editors/downloads, hashes, solver diagnostics and raw source records are removed from the product, rather than merely collapsed. Delivery CSV/printouts use readable names and IST times without internal references. About the example preserves practical limits. See [customer interface cleanup](customer-interface-2026-10-10.md); earlier UI evidence below is historical where superseded.

10 October usability continuation: the user selected **Try the example first**. The [usability update](usability-update-2026-10-10.md) adds three-step setup, plain navigation, persistent next actions and IST report pickers. Browser checks passed generation, approval, loading and cumulative delivery reporting; time edits and narrow phone layouts were checked. 156 Python tests, lint, build, export-content checks and the new time-conversion checks pass. This is a local browser walkthrough, not customer validation; AWS remains pending.

10 October design continuation: [design refresh](design-refresh-2026-10-10.md) puts the relief-planning story before setup, unifies the existing workflow screens and adds a ledger-driven vehicle board. Desktop and narrow phone layouts were checked; example generation, comparison, approval and loading were exercised. TypeScript, Ruff, production build and 156 Python tests pass. AWS deployment remains pending.

10 October: [next-phase implementation](next-phases-2026-10-10.md) adds revision differences, independently solved resource children, source visibility/ledger export, grounded explanation safeguards, reproducible evaluation and release drafts. The private GitHub owner/repository is selected; licensing/publication details are deferred. Local Phase 6 and modelled Phase 8 gates are exercised; live gates remain pending.

Continuation checkpoint, 9 October: the signed-in AWS account now shows $100.00 USD credits remaining on a free plan, with 183 days remaining. The team replaced the previous reported $449 ceiling with $100 and selected the existing operations workflow for the hosted release. Preparation resumed; deployment remains pending. See `continuation-2026-10-09.md` for current work and verification; older checkpoint statements below describe the earlier pause.

Cloud operations endpoints reuse the tested domain logic. Reversible project archive/restore is implemented in both adapters and the UI. **156 Python tests pass**, including seven real-SDK boundary tests and three cloud-project tests. TypeScript, Ruff, frontend build, local CDK assertions, seven Node checks and offline Docker solver/Lambda-runtime checks pass. Browser archive/restore/reopen passed. See [Phase 3 readiness](phase-3-readiness-2026-10-09.md) and the [cost estimate](aws-cost-estimate-2026-10-09.md).

No live AWS workflow is claimed. Mumbai's Lambda quota is 10; the current reservations need at least 103 available slots. The team selected requesting that increase, retaining the safeguards. Account-specific eligibility, deployment access and live acceptance remain unresolved.

The earlier quota form rejected 103 because its minimum is 1,000. The subsequent authorized 1,000 request is recorded above. CloudShell still reports pending account verification. One repeated local operations-cache check failed intermittently, then passed on rerun and ten diagnostic repetitions; its cause remains unverified.

The supplied specification is preserved unchanged in `docs/build-specification.md`. User instructions take precedence over the document. Decisions are tracked in `docs/decisions.md`.

The team explicitly instructed us to proceed without focusing on kickoff confirmation. Work began on 8 October; exact organizer kickoff compliance remains unverified. No eligibility assurance is made.

Latest evidence: [Phase 4 readiness](phase-4-readiness-2026-10-09.md), [Phase 5 preparation](phase-5-preparation-2026-10-09.md). The staged stack estimate is $70.84 including contingency in the higher-use scenario before credits; it is not a monetary ceiling.

## Observed verification

- 156 Python tests passed in the latest 10 October local checkpoint. They exercise four strategies across both closing policies and both loading modes, plus stock conservation, deterministic quantities/routes/metrics, validator corruption rejection, idempotency, revision approval, planning remainders and mocked cloud ownership/admission behavior.
- TypeScript checks, Ruff and the frontend production build passed. CSV parsing/export, atomic-storage/restart, conditional project persistence and metric-formatting checks passed. Local CDK synthesis/assertions passed without deployment.
- Planning/operations API integration passed through approval → loading → delivery report → failure → revision draft → revision approval. Stale writes and duplicate loading are covered.
- Five stored planning fixtures produced 20 checked comparison results. All published feasible results passed the validator. A separate failure-after-delivery event fixture records the original approval, reports, ledger and checked revision.
- The bounded local-load check passed: 100 concurrent health reads; ten competing planning submissions admitted one and returned busy for nine; the admitted job completed. It does not establish a public-demo concurrency target.

The browser exercise also completed approval → loading → delivery report → failure → checked revision → revision approval, preserving reported and stranded litres. Desktop and phone layouts were inspected. Browser file saving remains unverified after the in-app CSV download timed out. See `docs/browser-verification.md` for observed steps, screenshots and this limitation, and README for commands and scope.

## Phases and gaps

See `next-phases-2026-10-10.md` for the latest checkpoint and `audit-2026-10-09.md` for the historical eleven-phase audit. No weighted completion percentage is claimed.

- Phase 0 remains partial: Mumbai, seven days and example-only hosting are confirmed. The observed free-plan credit balance is $100 and the current authorized ceiling is $100, with no out-of-pocket spending. Remaining service permissions/applicability, public repository/license and final operating rules remain open. Earlier $449/pause statements are historical and superseded.
- Phase 1 domain-core acceptance is exercised by the tests and recorded evaluation. Runtime/creation audit fields vary; the deterministic comparisons cover quantities, routes, site results, metrics and input hashes.
- Phase 2's local example-only acceptance gate is complete: project creation/save/reopen, depot/vehicle/site forms, separate validated CSV preview/application, checked plans with all metrics, comparison, schematics, labels and empty/loading/error states. Desktop/mobile and unconfirmed-site exclusion were checked. Operator onboarding is excluded by the team's example-only choice. Browser file saving remains unverified under the separate export acceptance work.
- Phase 3 is locally prepared and tested, but incomplete: CDK foundation, Cognito frontend and ownership/version/job/operations/archive adapter exist. SDK and offline container checks pass. Resolve the Lambda quota and account eligibility, then deploy and collect live acceptance evidence. See `aws-foundation.md`.
- A local portion of operations/replanning is implemented beyond Phase 2. It supports immutable approvals/events, exact stock accounting and depot-based revisions using unused vehicles. It does not implement active-position revisions or every disruption/stop-state transition.
- Phase 4 is implemented and checked locally: Standard workflow definition, seven shared stages, immutable results, retry receipts, failure repair and frontend job details. Its live gate remains unverified. Phase 5 provider research is recorded; its routing choice is pending; pure response/metadata/cache helpers are tested and source visibility/export is implemented, but live providers are not connected. Phase 6 local acceptance is exercised with its difference view. Phase 7 scenario analysis and grounding/fallback preparation are tested; live optional model/export acceptance remains. Phase 8 local evaluation is reproducible and complete for the documented synthetic scope. Phase 9 drafts and Phase 10 contingency/manifest preparation exist; actual publication/submission/freeze remain pending. Field validation is not claimed.

No AWS resources, AWS traffic benchmark, pilot outcome, global optimization guarantee or zero-bug guarantee is claimed.

## Development issues resolved or bounded

Per-vehicle packing is now passed into routing, so the original North Delhi example schedules all 12,000 available modelled litres. Windows worker I/O is explicitly UTF-8. Numerical-library threads are capped at one following an observed memory-allocation failure. Build tools also encountered system memory pressure; stopping the development servers allowed the final checks to complete. The three OR-Tools SWIG deprecation warnings remain visible.
