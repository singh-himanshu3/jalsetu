# JalSetu build decisions

Updated 10 October 2026, Asia/Kolkata. This is a planning record, not evidence of deployment or application behavior.

## Driver map choice - 10 October 2026

- User selected a map and stop list with Google Maps directions, rather than in-app live GPS navigation. Use keyless external links, no new paid service or AWS routing calls.
- Show the complete ordered itinerary and depot return. Split long links at the mobile waypoint limit without dropping stops. Maps computes road directions separately from the checked planning estimates.
- Keep example/draft labels; only loaded approved operator-entered routes expose current-location navigation. Failed/returned vehicles and affected closed-point routes withhold directions. Do not mark delivery or infer driver position/next stop from opening a link.
- Load public OpenStreetMap tiles explicitly with visible attribution and browser caching. Preserve existing script/API security restrictions and allow only the selected image host.

## Latest AWS continuation — 10 October 2026

- After reviewing the concrete stacks, roles, frontend exposure and estimate, the user chose **Keep prepared; do not deploy**. No AWS resources were created. CLI cached credentials were logged out/cleared. Do not deploy or create test identities until the user explicitly resumes that scope.

- User permits a different region if Mumbai's quota is insufficient. Fresh API results show 400 unreserved slots, so keep Mumbai and worker/API reservations 1/2.
- User approved temporary root CLI access **for read-only checks**. It is working; no permanent key was created. Creating resources through this session needs a separate concrete approval.
- Preserve FREE / ACTIVE plan and observed $100 remaining credits. Use the existing example-only backend/hosting stack without AWS routing or AI. All 18 rates were rechecked unchanged; estimates are not hard caps.
- Prepare the reviewed bootstrap template instead of default AdministratorAccess or cross-account trust. IAM/resource creation and frontend exposure remain pending approval. Template/policy validation and fresh offline container checks pass; live acceptance is not claimed. See `aws-deployment-review-2026-10-10.md`.

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

- After reviewing the team's visual reference, refresh the existing frontend without replacing its domain or workflow. Lead with the heat-relief purpose; use native SVG/CSS, system typography and the existing components. Keep synthetic data explicit and render vehicle status from the recorded ledger. See the dated design checkpoint for verification and screenshots.

- Implement the requested remaining local work directly. Phase 6 differences distinguish previous commitments, preserved reports and new estimates. Phase 7 runs a fresh baseline and five bounded independent example solves using the existing job stages; no actual resource/operation changes. All applicable children are checked, including recomputed metrics; unavailable alternatives and withheld deltas remain explicit.
- Keep current synthetic routing while the earlier live-provider choice is unanswered. Source metadata/ledger UI is implemented; no weather or population was invented to fill it. Optional model fact selection is prepared offline with deterministic failure fallback; live Bedrock remains pending.
- Generate complete evaluation from stored fixtures and retain ties/losses. No external coordinator participated. Prepare honest submission/article/demo drafts and a freeze checklist without claiming a real video, submission or submitted tag.
- User selected their own GitHub account, verified as `singh-himanshu3`, then said not to focus on license/publication choices for now. Create a private `jalsetu` repository; leave licensing undecided and public acceptance pending. Do not block local implementation on it.
- The official schedule lists October 11 submission day but still withholds the exact cutoff hour; see the dated organizer-requirements check. Account verification and the rejected 103 quota request remain deployment blockers; no broader quota or upgrade is assumed.

## Example-first usability — 10 October 2026

- User asked for a customer to use the product with less learning and selected **Try the example first**. Implement this directly within the existing frontend.
- Remove the read-only quick-example acknowledgement gate while keeping clear sample labels. Saved project creation, plan approval and report saving remain explicit actions. Do not silently choose the loading/closing policies or interpret planned times as physical observations.
- Keep setup in three steps; put optional technical information behind native disclosures. Use IST pickers and readable resource names. See the dated usability checkpoint for actual verification and limits.

## Customer interface correction — 10 October 2026

- User explicitly said users should not see JSON or related technical material. Remove those controls and downloads entirely from the product. Do not add a developer toggle to expose them. Internal APIs, integrity checks and evidence files may retain their existing formats.
- Remove displayed hashes, job IDs/stages, generic metric dumps, solver runtimes and raw source snapshots. Preserve plain quantities, names, timing, approval/report actions and honest example limits. Customer downloads use readable names and IST dates/times with no internal hashes or job references; the earlier audit CSV schema is superseded for these downloads.

## Deployment-only AWS scope — 10 October 2026

- User explicitly selected keeping the prepared hosting/backend stack while avoiding AWS routing and AI calls. Cognito/API/storage/Standard workflow remain deployment infrastructure; do not add Amazon Location or Bedrock clients, permissions or paid calls.
- Deterministic planning, independent checks, explanations and resource alternatives run through the existing shared application code. Optional Bedrock integration is excluded from this release, rather than a required incomplete gate.
- External road routing remains a separate pending product choice. Retain the labelled synthetic matrix until the user chooses a provider path. Do not infer requests or priority from public weather/population.
- Finish customer-facing coordinator exports locally while AWS quota/account access remains unresolved. Preserve reports separately from new planned routes and expose unmet quantities in the printout.
- The user subsequently authorized the console's minimum 1,000 Lambda quota request; AWS acknowledged submission, not approval. Preserve application reservations at worker 1/API 2 and the free plan.

## Guided first-use and validation — 10 October 2026

- User requested a familiar first-use guide for Try the example, then explicitly rejected video/submission work. Implement the customer journey and local validation directly; do not record or publish a video, submit the project or treat Phase 9 publication as authorized by this request.
- The requested two product milestones are guided example onboarding and local journey/evaluation validation. These are not replacements for the original phase numbering or evidence that cloud/publication gates are complete.
- Show a brief accessible welcome, then a progress guide based on actual setup/plan/approval/report state. Allow skipping, hiding and resuming within the exercise. Keep operating-rule choices, approvals and reports explicit; no automatic dispatch or outcome reporting.
- A fresh sample clears the selected operation in memory while retaining saved approvals/events in their existing store. Opening a saved project/run exits the fresh-example guide so historical reports cannot complete a new walkthrough.
- No external participant was available in this implementation session; record browser walkthroughs as software checks. Keep all synthetic evaluation rows, including ties and losing results.

## Receiving-point recovery — 10 October 2026

- User authorized local work without AWS and selected **Require an explicit reopening report**. Keep a point closed for that run until a coordinator explicitly reports reopening. Preserve earlier deliveries and unmet requests.
- Reuse append-only events, the existing stock ledger and conservative depot-based revisions. A closure changes availability only; block affected old-route loading and deliveries while closed. New drafts exclude closed points; approval independently rejects a closed stop. A reopening invalidates stale drafts and does not approve new routes.
- Keep active-vehicle and one-trip/positive-report restrictions. No automatic water recovery, vehicle return, additional visit or real-world delivery claim. Preserve historical ledger shape before the first availability report.
- Verify both actual customer downloads through browser saving and saved-byte checks. The prior local saving limitation is superseded for delivery CSV and printable HTML, while hosted private-export acceptance remains pending.

## Production launcher and release gate — 10 October 2026

- User selected **Production launcher and release checks** as the next two local milestones. Keep the existing app/domain; serve the built frontend and API from one loopback server, retain the normal saved-data paths and keep Vite available for development.
- Add `pnpm check:local` and an isolated real-server gate covering restart, receipts, archive/restore, failed-job recovery, corrupt-file preservation and web boundaries. Do not point tests or the separate browser preview at user saved runs.
- A launcher rebuilds before startup; an occupied port rejects a second server. Built assets are loaded into memory and cloud configuration is excluded from this local web path. Pending jobs remain transient rather than adding a new durable queue.
- This is local Phase 8 validation/Phase 10 fallback readiness. Do not create a submitted tag, start monitoring, deploy, record video or publish/submit on the basis of these milestones.

## Remaining-phase continuation — 10 October 2026

- User requested completion of the remaining phases. Preserve the previously selected hosting-only AWS stack and credit/free-plan safeguards, with video/publication/submission deferred. Do not interpret this general continuation as a reversal of those specific choices.
- Read the current Mumbai quota/request and CloudShell state before attempting deployment. Applied concurrency is still 10, the existing 1,000 request remains Case Opened, and CloudShell verification is pending. Preserve the reserved application slots; do not duplicate the request, delete an environment or upgrade the account.
- Finish the missing manual-hosting package preparation locally. Extract only the existing stack's seven public browser fields, validate matched regional endpoints/callback and a future expiry within seven days, copy supported built assets only, and reject an existing destination. Do not fabricate real stack outputs, upload a synthetic configuration or treat package validation as live AWS acceptance.

## Public-data evidence — 10 October 2026

- User asked to begin real-data work for stronger evidence, then selected public data with labelled example requests because no coordinator/NGO records are available. Complete a bounded road-network experiment directly; retain the customer-guided example and saved runs.
- Choose a single frozen OSRM/OpenStreetMap public-car matrix for the existing nine example coordinates. Fix a 250-m snap limit before collection, preserve node/coordinate/options identity and attribution, reject provider/straight-line fallback errors, round upward and keep missing legs unavailable. Preserve unknown map date rather than replacing it with retrieval time. No AWS routing, paid service, weather-derived demand or automatic refresh.
- Re-solve the five fixtures/four strategies under public-road estimates, 1.5×/2× example travel times and a fresh synthetic reference. Keep every measured row and full developer evidence, independently recheck report routes/metrics/inputs, and display plain customer comparisons without JSON or hashes. Keep losing travel/fulfilment results and ties visible.
- This establishes mixed-data software evidence, not field impact or full Phase 5 operational acceptance. Anonymized confirmed requests/resources, comparison plans and observed delivery records are needed before any operational benefit claim.

## Local operational records and roads — 10 October 2026

- User authorized the stated next priority: real-data entry/import and matching roads, without AWS. Extend the existing local app; retain example-first onboarding and the prepared example-only cloud release.
- Start operator projects blank: no inherited quantities, vehicles, points, coordinates or operating windows. Retain declared source/reference, record date and an explicit review acknowledgement with each planning snapshot. Operator-entered means declared, not independently verified.
- Preserve the existing small Delhi envelope, five vehicles, twenty points and one trip. Derive a tight area from the entered locations before review; reject larger/outside areas. Keep policy choices explicit and quantity increments configurable; reject mismatches rather than rounding real records.
- CSV uses customer headings, imports the entire draft receiving-point list with a preview and separate apply action, and clears roads/plans. No raw JSON, developer hashes or pasted raw CSV are presented in this new workflow.
- Fetch OSRM only after record validation and coordinate-sharing acknowledgement, one bounded request per action with local admission/cooldown. Coordinates may be provider-logged. Store the full source response in ignored local state; check its hashes, exact node order/coordinates, conservative rounding and matrix equality before local planning and operation actions. Never replace failed or stale routing with sample estimates. No automatic refresh, AWS routing/AI or field dispatch.
- Validate with explicitly synthetic operational declarations and downloaded public-road estimates. No actual coordinator records, pilot deliveries or outcome improvement are invented. Source notes and road attribution remain readable in the product and printable instructions.

## Original-plan comparison — 10 October 2026

- User selected original planned stops with optional separate delivery records. Extend the local record workflow without AWS, video or publication. No genuine coordinator dataset is available.
- Use readable-name CSV matching, preserved quantities/stop order/loading starts, and reconstructed travel/waiting on the exact saved road matrix. No repair, favourable filtering, inferred outcomes or live dispatch. Reject ambiguous/unsupported imports; retain readable invalid originals with check failures and withhold feasible metrics/differences.
- Reuse the independent validator and fresh bounded JalSetu solve under identical inputs. Retain ties/losses and all tradeoffs. Reported cumulative point totals stay exact, use recorded start/finish timing for the chosen rule, and remain separate from operation events. Missing records stay unknown.
- Keep the comparison read-only and temporary; provide a self-contained printable HTML report with resource constraints, record/source references and limitations. No raw JSON or hashes appear in customer screens/downloads. Original records must also be retained locally; no per-user vault is added.

## Frontend workspace redesign — 10 October 2026

- Treat the supplied frontend brief as recommendations and preserve the user's scope: continue the existing app, KISS, guided example first, no customer JSON, no AWS deployment/routing/AI calls and no video.
- Keep React/TypeScript/Vite, Leaflet, native forms/dialogs, local SVG icons and shared-scale bars. Add a workspace stylesheet and navigation component instead of a new UI framework. Record compatible alternatives and official references in the frontend checkpoint.
- Map/list selections share one selected-stop state. Vehicle/revision changes reset it; marker selection and container resizing preserve manual zoom. Only new route geometry and the explicit Fit route action fit the bounds. Phone users can switch between map and stop sequence.
- Report review captures the payload and conditional version before confirmation; cancelling before confirmation writes nothing. Retain backend accounting, approval, closure/reopening and recovery rules. Planned quantities and reported totals remain distinct.
- Comparison summaries use actual returned JalSetu and demand-proportional metrics. Show gains, ties, losses and travel costs; missing metrics remain unknown. Never infer field impact from a modelled plan.
- Browser testing uses an isolated synthetic store. A separate read-only test server tightens CSP to verify tile failure; the normal application security policy is not weakened. See docs/frontend-workspace-completion-2026-10-10.md for checks, screenshots and release limits.

## 10 October 2026 — motion identity and public repository

The owner explicitly requested a stronger visual frontend, permitted libraries and authorized making the existing GitHub repository public. Authentication/authorization are reserved for later work. The supplied reference was inspected for visual hierarchy and product storytelling; no branding or assets were copied. The new original home uses cream, evergreen and lime, DM Sans/DM Serif typography and an interactive schematic planning illustration. Motion handles finite route drawing, reveals, stage/navigation selection and screen entry. Reduced-motion preferences remove the new transitions/path drawing, and explicit operational scrolling now checks the same preference. Motion 14.0.0, Lucide React 1.54.0 and Fontsource font packages 5.3.0 are pinned. No framework replacement, backend-rule change, paid UI service or AWS deployment is needed.

Public visibility is authorized for `singh-himanshu3/jalsetu`; no application license is invented. A credential-pattern scan reviewed 601 Git objects and the publishable working files, with no findings for the checked credential patterns or sensitive paths. Local operational stores, environment credentials, dependency caches and built files remain excluded. Publication does not represent independently verified security, a field trial, deployed hosting or submitted hackathon entry. The manifest's optional `--verify-public-repository` flag performs an explicit read-only GitHub visibility check; its default operation stays offline.
## 10 October 2026 — authorized deployment and constrained-access blocker

The owner explicitly requested deployment and a shareable live link, superseding the previous pause. Retain Mumbai, the prepared stack, example-only hosting, the active free plan, credits only up to $100, no out-of-pocket spending, no AWS routing/AI calls and a maximum seven days. Fresh account checks and the reviewed bootstrap creation are complete. AWS rejects root AssumeRole; do not silently use root for the application deployment. Ask for explicit approval of a dedicated limited IAM console user with temporary developer sign-in and role assumption, without a permanent access key. No new console credential is entered by the agent.

Reuse the existing introduction as a public landing page; sign-in protects sample planning and records. Prepare a manual repeatable frontend publishing command that validates the existing hosting identity and original expiry, keeps signed URLs private and preserves the free account plan. Local edits and GitHub pushes are not automatic live updates. Do not add GitHub IAM trust or long-lived AWS secrets without a separately reviewed authorization. Live browser/upload acceptance remains pending.

## 11 October 2026 — verified hosted example release

Deploy the existing prepared stack through the approved limited IAM user and reviewed roles. Fix only the observed bootstrap-version read, two project Lambda logging-policy attachments and project workflow/rule naming. Preserve the original seven-day expiry and $100 credits-only scope; additional account credits do not expand that budget. The initial frontend publication and two Cognito test-user setups use the explicitly approved temporary owner session. No permanent IAM key, GitHub deployment trust, paid account upgrade, AWS routing/AI or cloud upload of real operational records is added.

Serve the existing animated introduction publicly; invited users retain separate sample plans/reports. Manual frontend publication updates the same URL after successful checks. Keep passwords, temporary codes, full AWS outputs and recovery inventories outside Git. Record actual cloud acceptance and HTTP evidence, while leaving hosted visual/PKCE callback checks pending after Computer Use stopped for uncertain URL enforcement. Protected failed-attempt resources are preserved for exact reviewed cleanup; expiry is an application access boundary, not automatic infrastructure deletion.

## 11 October 2026 — water-blue services landing

Follow the owner’s UI-only request with a blue/navy/sky identity, denser service storytelling and an animated accessible FAQ. Reuse React, Motion and Lucide; no new framework or package. The public landing explains the product while existing sign-in gates workspace actions. Keep invited accounts, ownership and original expiry; worldwide signup is deferred. Decorative visuals remain labelled illustrations rather than claimed allocation or field results. Correct workflow-card buttons that returned the load handler instead of calling it. New local code is not a live-update claim until the existing manual publication succeeds.
