# JalSetu build decisions

Updated 9 October 2026, Asia/Kolkata. This is a planning record, not evidence of deployment or application behavior.

## Confirmed instructions

- Build the supplied `build-specification.md`, using KISS and asking the team about uncertain product choices.
- NGO/coordinator workflow, Delhi, Heat and Water category, no new hardware.
- Public environmental context does not establish operational needs or resources.
- Clearly labelled synthetic resources are allowed. The team subsequently selected **example-only hosted mode**; real/operator onboarding is deferred.
- The supplied specification now includes one-trip vehicle routing, baseline comparisons, disruption accounting and marginal-resource analysis. This supersedes the allocation-only proposal as the requested plan.
- Work in phases, verifying the core before interface and cloud work. Do not add SQS, ECS or unrelated services without a measured need.
- AWS preparation resumed in the continuation chat on 9 October. The team replaced the earlier reported $449 ceiling with **$100 maximum** and asked us to verify the account ourselves. The signed-in Billing home now shows **$100.00 USD credits remaining**, **183 days remaining**, and a **free plan that does not get charged**. Preserve credits-only use and zero out-of-pocket spending. Do not upgrade the account plan or enable features that automatically upgrade it. Deployment still requires a reviewed estimate and completed prerequisites.
- Deployment region is Mumbai (`ap-south-1`); authorized hosting duration is seven days. Actual expiry is chosen only when deployment starts.
- Do not deploy billable resources or make paid cloud calls without a reviewed estimate and authorization.

## Decisions requested now

1. The team explicitly instructed us to proceed without focusing on kickoff confirmation. Git and application work start on 8 October 2026; exact kickoff compliance remains unverified, with no eligibility assurance.
2. The team approved a small North Delhi local demonstration with one depot, three synthetic vehicles, eight synthetic sites, and the documented local 100-litre increment and priority order.
3. Current scope is credits-only use up to $100, Mumbai, seven days and example-only hosting. Account balance and free-plan state are verified; service eligibility and a reviewed deployment estimate remain unresolved. No resources were deployed in this continuation.
4. The first hosted release must include the existing approval, delivery-reporting, failure/recovery and depot-based replanning workflow. A planning-only hosted release was not selected. Reuse the local domain implementation; additional disruptions and active-position replanning remain outside this change.
5. Removing a saved project archives its draft reversibly. Allow restore and keep approved operations and reports separately. Archive/restore does not extend the existing hosted demo retention or expiry.
6. After observing Mumbai's Lambda quota of 10, the team selected requesting an increase to **103**, keeping the worker/API reservations. Do not silently remove these safeguards or upgrade the free account plan.

## Remaining team decisions

- Team members and public repository owner.
- Exact pilot boundary; synthetic place names and coordinates do not imply NGO operations or venue permission.
- Real-mode scope if later requested; current hosted scope is example-only.
- AWS credit application, permissions, Location availability and pricing, optional Bedrock access.
- Budget alert recipients/thresholds and service-specific free-plan eligibility. Spend must remain within available credits, up to $100; no out-of-pocket spend is authorized. The console's 183-day account-plan remainder is observed data, not the seven-day deployment expiry.
- Solver/job response target and public-demo concurrency target.
- Retention periods for projects, exports and logs.
- Public repository license; no license is selected on behalf of the team yet.
- Prospective coordinator for an authorized usability test, if available.
- Hindi review availability, if bilingual output is desired.
- Final submission deadline from the live form/organizer.

## Product ambiguities to resolve before the affected implementation

- Site closing time: must unloading finish by closing, or is starting service by closing sufficient? The specification uses both time-window and service-duration language; do not silently choose a policy.
- Loading: can vehicles load concurrently, or is depot loading sequential? No loading-bay constraint is specified.
- In-progress vehicle replanning: actual position, remaining onboard water and departure time must be entered or frozen; do not teleport the vehicle to the depot.
- The global algorithm is heuristic. Proved optimal allocation does not imply globally optimal delivery routes.

## Current evidence

- Supplied specification copied without changes to `docs/build-specification.md`.
- Local Node, pnpm and Python executables are present.
- Isolated Python development dependencies are installed outside the deliverable project. `pip check` passed.
- Git initialized locally on 8 October. No remote repository has been created.
- Local planning, comparison, approval, immutable reporting, stock conservation and depot-based revision behavior are implemented. Tests and verification are recorded in `build-status.md` and README; incomplete cloud/operational scope remains explicit.
- No cloud resources, field impact or user validation is claimed.

## Phase 4 continuation — 9 October 2026

- Proceed with local preparation while account verification and quota resolution block deployment. Reuse the existing planner/validator and operations rules through a small seven-stage Standard workflow. Keep one worker and two API reserved slots, the global job lease and daily admission limit.
- Persist private intermediate snapshots and stage receipts; publish only independently checked final results. A private revision job receipt recovers an ambiguous operation-write response without duplicate installation.
- Retain synthetic routing and deterministic explanations. The pending Phase 5 choice concerns real road estimates for example coordinates; no provider switch or new paid integration is assumed.
- Include Standard workflow transitions and aggregate stage/recovery billing in the estimate. Default estimator scope is Phase 4 ($70.84 higher-use case with contingency before credits); the earlier Phase 3 arithmetic remains reproducible with --phase3. These workload estimates do not enforce $100.

- Phase 5 preparation adds pure source snapshots, v2 matrix normalization and integrity-checked cached fallback. These helpers make no network requests and are not wired into planning. Cache freshness must be supplied explicitly by the eventual caller; tests do not settle the product policy.

## Next-phase continuation — 10 October 2026

- Implement the requested remaining local work directly. Phase 6 differences distinguish previous commitments, preserved reports and new estimates. Phase 7 runs a fresh baseline and five bounded independent example solves using the existing job stages; no actual resource/operation changes. All applicable children are checked, including recomputed metrics; unavailable alternatives and withheld deltas remain explicit.
- Keep current synthetic routing while the earlier live-provider choice is unanswered. Source metadata/ledger UI is implemented; no weather or population was invented to fill it. Optional model fact selection is prepared offline with deterministic failure fallback; live Bedrock remains pending.
- Generate complete evaluation from stored fixtures and retain ties/losses. No external coordinator participated. Prepare honest submission/article/demo drafts and a freeze checklist without claiming a real video, submission or submitted tag.
- User selected their own GitHub account, verified as `singh-himanshu3`, then said not to focus on license/publication choices for now. Create a private `jalsetu` repository; leave licensing undecided and public acceptance pending. Do not block local implementation on it.
- The official schedule lists October 11 submission day but still withholds the exact cutoff hour; see the dated organizer-requirements check. Account verification and the rejected 103 quota request remain deployment blockers; no broader quota or upgrade is assumed.
