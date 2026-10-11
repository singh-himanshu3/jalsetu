> **Latest source checkpoint — 11 October:** UI/workflow polish is implemented and verified locally. Subject-scoped run/draft restoration, report guidance, revision accounting, responsive navigation and map states are covered. `pnpm check:local` and `pnpm check:hosting` pass (240 Python tests). This revision has not been deployed; Cognito branding is deferred. [Implementation and limitations](ui-polish-2026-10-11.md). Earlier hosted checkpoints below remain historical.

> **Sign-in fix — 11 October:** Amplify release 3 is live. The host-added callback slash is handled correctly. The owner’s real sign-in and authenticated reload both open the workspace and onboarding. [Correction and evidence](signin-callback-fix-2026-10-11.md).

> **Current checkpoint — 11 October 2026:** The updated frontend and email-only Cognito configuration are deployed. Google sign-in is removed from scope. CloudFormation UPDATE_COMPLETE and Amplify release 2 SUCCEED were verified. Real signup-code receipt, password login and reset with the owner’s inbox remain pending. [Current release and checks](aws-email-ui-release-2026-10-11.md) supersede earlier activation/publishing statements below.

# Google and email/password checkpoint — 11 October 2026

The owner subsequently requested normal email/password access alongside Google. This extension is implemented locally: email-as-username signup, verification/resend, Cognito managed password sign-in/recovery, verified native claims and the same protected PKCE workspace flow. Existing username-schema settings and subject ownership are preserved. TypeScript/Ruff, 239 Python tests, Google/native frontend tests, production build, CDK assertions and hosting checks pass; signup layout fits 320/375/768/1024/1440px. Actual email delivery, reset acceptance, Google provider setup, AWS activation and publication remain pending. No AWS mutation or charge occurred. See `email-password-auth-2026-10-11.md`. Earlier checkpoints below are historical.

# Earlier Google-only access and frontend checkpoint — 11 October 2026

The requested public UI refinements, Cognito/Google PKCE implementation, protected workspace routes, profile/logout and compact first-time welcome with disruption/revision practice are implemented locally. Lint/type checking, production build, Google/frontend/onboarding tests, 238 Python tests, infrastructure/hosting checks and five local release groups pass. Browser checks cover 320/375/768/1024/1440px. Google client credentials, provider activation with fresh AWS access, manual frontend publication and live Google acceptance remain pending. No AWS resource was changed or charge incurred in this work. The existing invited-account live release and original expiry remain as documented below. See `google-auth-frontend-completion-2026-10-11.md` for all changed files, settings, callback URLs and manual steps.

# Earlier landing usability review checkpoint — 11 October 2026

The owner’s frontend review is implemented locally: readable phone text and touch targets, compact glass navigation, clearer animated preview states and map legend, earlier breakdown recovery, one combined workflow section and consistent service cards. The owner’s latest correction excludes invented example litres, percentages and performance totals. Production typecheck/build, guide/hosted-package checks and five release/restart groups pass; browser inspection covers 320, 375, 768, 1024 and 1440 pixels. See [the current review](frontend-identity-review-2026-10-11.md#landing-usability-review-and-no-invented-totals). This UI is not published to Amplify. Owner review precedes Google/email authentication work. Earlier checkpoints below are historical.

# Visual identity review checkpoint — 11 October 2026

The owner reviewed the navy/cyan version and requested lighter colors and a smaller centered closing card. The revised pale-blue/aqua interface, lighter schematic and compact “Try the guided example” card are implemented and checked locally. Further owner feedback removes the gradient heading and decorative link arrows and expands the shared footer with real navigation links. No dedicated AWS navigation or section; only a small hosting note. Typecheck/build, guided-example and hosted-package checks pass, with desktop and 390-pixel phone inspection. Owner review is pending before Google/email authentication work. This version is not published to Amplify. See [review checkpoint](frontend-identity-review-2026-10-11.md). Earlier checkpoints below are historical.

# Water-blue frontend checkpoint — 11 October 2026

The new blue public landing page, service showcase and smooth accessible FAQ are implemented locally. Typecheck/build, guided-example, hosted-package and five release/restart groups pass. Desktop and 390-pixel phone landing/FAQ checks pass locally. Amplify publication is pending; the existing live URL still serves the prior release. See [frontend checkpoint](frontend-blue-completion-2026-10-11.md). Authentication changes remain deferred.

# Hosted release checkpoint — 11 October 2026

**Live:** https://main.d2d0jtitb5ozce.amplifyapp.com. The application stack is CREATE_COMPLETE and Amplify publication succeeded. Five actual hosted acceptance groups pass: invited sign-ins/protected API, ownership, validated planning/retries, approved delivery/recovery/replanning with exact water accounting, and project archive/restore preserving operations. Built frontend/configuration/sign-in-page checks pass. Visual/phone/map and interactive browser callback checks remain pending because Computer Use could not reliably verify the Windows browser URL. See [the release report](aws-hosted-release-2026-10-11.md). Original expiry: 17 October 2026, 22:57:30 IST. AWS cleanup is explicit, not automatic. Previous checkpoints below are historical.

# Current AWS deployment checkpoint — 10 October 2026

The owner has now authorized deployment. Fresh AWS checks confirm FREE / ACTIVE, $100 remaining credits and 400 available Lambda slots. The exact reviewed CDKToolkit foundation is CREATE_COMPLETE. Application deployment stopped at AWS's rejection of root role assumption; the limited deployment IAM user is now explicitly approved, created and verified, with secure sign-in in progress. No JalSetuDemo stack, published frontend or live link is claimed. Public landing-page preparation and repeatable frontend publishing are added; typechecking/build/hosting package and Linux container checks pass. Hosted acceptance remains pending. See [deployment progress](aws-deployment-progress-2026-10-10.md). Earlier no-deployment/no-resources checkpoints are historical.

# Build status

Started 8 October 2026 (Asia/Kolkata).

## Current checkpoint: visual motion redesign and public source

[Frontend motion completion](frontend-motion-completion-2026-10-10.md) replaces the introductory layout with an original editorial water-relief identity, animated schematic route preview, selectable workflow stages, scroll reveals and shared navigation transitions. The existing forms, maps, comparison and reporting flow remain functional. Motion, Lucide and bundled fonts are version-pinned, with upstream notices retained. Local validation passes 237 Python tests, customer checks, five release/restart groups and hosted-bundle checks. Browser checks cover desktop, compact desktop, phone and a complete labelled synthetic example. The owner explicitly authorized public GitHub source publication, verified at [singh-himanshu3/jalsetu](https://github.com/singh-himanshu3/jalsetu). Authentication/authorization are deferred by the owner. AWS remains prepared and undeployed; no video, submission or field outcome is claimed. Older publication-deferred statements below describe earlier checkpoints.


## Current checkpoint: frontend workspace redesign

[Frontend completion and handoff](frontend-workspace-completion-2026-10-10.md) records the new shell/home, phone input cards, synchronized map/list/details, keyboard selection, preserved zoom, calculated comparison trade-offs and native report review. Full local checks pass 237 Python tests plus the customer/restart gates; desktop, compact and phone layouts and a deliberately blocked-tile fallback were checked in the browser. A synthetic approval/loading/delivery/breakdown/revision exercise preserves reported and stranded quantities. No framework rebuild, AWS deployment, field trial, publication or video is claimed.

## Current checkpoint: driver map and external directions

[Driver map completion](driver-map-completion-2026-10-10.md) adds per-vehicle numbered maps, phone-safe ordered Google Maps links, depot return, per-stop previews/current-location navigation and printable directions. Draft/example/status/closure and invalid-coordinate gates remain explicit. Full local checks pass 237 Python tests plus customer/directions/restart checks; final map rendering and phone layout are checked. The local server now permits only OpenStreetMap external tile images while retaining self-only script/API boundaries. No AWS deployment or live driver trial occurred.

## Current checkpoint: AWS access and deployment review

Final instruction: **keep prepared; do not deploy**. No AWS resources, image publication, hosted frontend or test users were created. Temporary local credentials were logged out/cleared. Fresh sign-in/checks and explicit deployment authorization are required to resume.

[Deployment review](aws-deployment-review-2026-10-10.md) records working temporary local CLI access, Mumbai's **400 unreserved slots**, an active free plan with **$100 credits**, and successful service reads/template/policy validation. All 18 rates were rechecked and unchanged. Today's container checks and direct CDK synthesis pass. A constrained bootstrap template is ready; root access is approved only for read-only checks. Creation and hosted acceptance remain pending. CloudShell fails verification but is no longer required. Video/publication/submission remain deferred.

## Current checkpoint: local original-plan comparison

The user selected the original dispatch plan with optional separate delivery records. [The comparison checkpoint](historical-comparison-completion-2026-10-10.md) implements CSV preview, preserved original stops/quantities/loading starts, identical-input road replay/checks, a fresh JalSetu proposal, separate exact reported outcomes and a printable evidence report. Full local checks pass **237 Python tests** plus release/restart and customer checks. Actual browser upload/report saving and desktop/phone layouts were checked with labelled synthetic records; no coordinator dataset or field benefit is claimed. Follow [the beginner guide](comparing-original-delivery-plans.md). AWS/video/publication remain deferred.

## Current checkpoint: local operational-record entry and matching roads

The user authorized the next priority: real-data entry/import and matching road estimates without AWS. [The local checkpoint](local-records-completion-2026-10-10.md) adds blank operator-entered projects, declared record source/date/review, receiving-point CSV preview/application, and explicit OSRM acquisition with saved source responses. Planning/approvals/reports verify the saved road matrix against its exact locations. The Python suite passes **205 tests**. The [beginner guide](using-operational-records.md) describes the workflow. No genuine coordinator records, historical outcome comparison or field benefit are claimed; synthetic test declarations are labelled. Prepared cloud hosting remains example-only.

Earlier checkpoints below are historical where superseded.

## Current checkpoint: public-road evidence and local release readiness

Public-data continuation: [first public-road evidence](public-road-checkpoint-2026-10-10.md) records one actual OSRM/OpenStreetMap request (nine example nodes/81 pairs), 80 retained and independently rechecked comparisons, and a readable customer research panel. The full suite now passes **185 tests**. Operational inputs remain examples; the guided exercise is not switched to public routing. AWS/live field acceptance is still pending. Earlier checkpoint counts below remain historical.

Remaining-phase continuation: [hosting-package readiness and current phase gates](remaining-phases-2026-10-10.md) records fresh read-only AWS checks (Mumbai quota 10; existing 1,000 request Case Opened; CloudShell verification pending). Built frontend/public configuration packaging and `pnpm check:hosting` are now locally checked. No AWS deployment or live phase acceptance occurred; the original user exclusions remain in effect.

10 October local release: [production launcher and release gate](local-release-readiness-2026-10-10.md) completes the two selected milestones. Start JalSetu.cmd now builds and serves the existing app/API from one loopback server. `pnpm check:local` passes 167 Python tests, customer checks, lint/build and the real isolated production-server restart/failure gate. Saved operations/projects/receipts, archive/restore, corrupt-file preservation, web boundaries and busy/terminal recovery are exercised. Browser guided setup → plan → approval → loading → delivery and printable saving pass in the production build. This advances local Phase 8 validation and Phase 10 fallback readiness without claiming submitted freeze or AWS acceptance.

10 October local recovery: [downloads and closure/reopening checkpoint](local-recovery-completion-2026-10-10.md) completes the authorized local follow-ups. Both customer exports now save actual files. Closure/reopening preserves water and prior reports, keeps unmet requests visible, blocks affected loading, and excludes closed points from revisions until explicitly reopened. 167 Python tests, the real localhost closure/reopening API journey, lint/build and customer checks pass. Desktop/phone browser checks passed. AWS and external validation remain pending; earlier checkpoints below retain their historical counts and download limitations.

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

- 167 Python tests passed in the latest 10 October local recovery checkpoint. They exercise four strategies across both closing policies and both loading modes, plus stock conservation, deterministic quantities/routes/metrics, validator corruption rejection, idempotency, revision approval, planning remainders and mocked cloud ownership/admission behavior.
- TypeScript checks, Ruff and the frontend production build passed. CSV parsing/export, atomic-storage/restart, conditional project persistence and metric-formatting checks passed. Local CDK synthesis/assertions passed without deployment.
- Planning/operations API integration passed through approval → loading → delivery report → failure → revision draft → revision approval. Stale writes and duplicate loading are covered.
- Five stored planning fixtures produced 20 checked comparison results. All published feasible results passed the validator. A separate failure-after-delivery event fixture records the original approval, reports, ledger and checked revision.
- The bounded local-load check passed: 100 concurrent health reads; ten competing planning submissions admitted one and returned busy for nine; the admitted job completed. It does not establish a public-demo concurrency target.

The browser exercise also completed approval → loading → delivery report → failure → checked revision → revision approval, preserving reported and stranded litres. Desktop and phone layouts were inspected. Actual saving of the delivery CSV and printable instructions passed in the latest local recovery checkpoint, superseding the earlier timeout. See `docs/browser-verification.md` for observed steps, screenshots and this limitation, and README for commands and scope.

## Phases and gaps

See `local-release-readiness-2026-10-10.md` for the latest checkpoint and `audit-2026-10-09.md` for the historical eleven-phase audit. No weighted completion percentage is claimed.

- Phase 0 remains partial: Mumbai, seven days and example-only hosting are confirmed. The observed free-plan credit balance is $100 and the current authorized ceiling is $100, with no out-of-pocket spending. Remaining service permissions/applicability, public repository/license and final operating rules remain open. Earlier $449/pause statements are historical and superseded.
- Phase 1 domain-core acceptance is exercised by the tests and recorded evaluation. Runtime/creation audit fields vary; the deterministic comparisons cover quantities, routes, site results, metrics and input hashes.
- Phase 2's local example-only acceptance gate is complete: project creation/save/reopen, depot/vehicle/site forms, separate validated CSV preview/application, checked plans with all metrics, comparison, schematics, labels and empty/loading/error states. Desktop/mobile and unconfirmed-site exclusion were checked. Operator onboarding is excluded by the team's example-only choice. Saving of customer delivery CSV/printable HTML now passes; hosted private-export acceptance remains separate.
- Phase 3 is locally prepared and tested, but incomplete: CDK foundation, Cognito frontend and ownership/version/job/operations/archive adapter exist. SDK and offline container checks pass. Resolve the Lambda quota and account eligibility, then deploy and collect live acceptance evidence. See `aws-foundation.md`.
- A local portion of operations/replanning is implemented beyond Phase 2. It supports immutable approvals/events, exact stock accounting and depot-based revisions using unused vehicles. It does not implement active-position revisions or every disruption/stop-state transition.
- Phase 4 is implemented and checked locally: Standard workflow definition, seven shared stages, immutable results, retry receipts, failure repair and frontend job details. Its live gate remains unverified. Phase 5 provider research is recorded; its routing choice is pending; pure response/metadata/cache helpers are tested and source visibility/export is implemented, but live providers are not connected. Phase 6 local acceptance is exercised with its difference view. Phase 7 scenario analysis and grounding/fallback preparation are tested; live optional model/export acceptance remains. Phase 8 local evaluation is reproducible and complete for the documented synthetic scope. Phase 9 drafts and Phase 10 contingency/manifest preparation exist; actual publication/submission/freeze remain pending. Field validation is not claimed.

No AWS resources, AWS traffic benchmark, pilot outcome, global optimization guarantee or zero-bug guarantee is claimed.

## Development issues resolved or bounded

Per-vehicle packing is now passed into routing, so the original North Delhi example schedules all 12,000 available modelled litres. Windows worker I/O is explicitly UTF-8. Numerical-library threads are capped at one following an observed memory-allocation failure. Build tools also encountered system memory pressure; stopping the development servers allowed the final checks to complete. The three OR-Tools SWIG deprecation warnings remain visible.
