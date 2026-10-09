# Phase 4 local preparation — 9 October 2026

Continued the existing project and its tested planner. Phase 3 live acceptance is still blocked by account verification and the Mumbai Lambda quota. **No AWS deployment or billable AWS calls were made.** The selected scope remains example-only, seven days, credits only, maximum $100, without upgrading the free plan.

## Implemented

The CDK stack now defines a Step Functions **Standard** workflow:

`LoadAndValidate → GetRouteMatrix → SolveStrategies → ValidatePlans → PersistResult → ExplainResult → CompleteJob`

The workflow calls the existing worker image synchronously. It passes owner/job/correlation identifiers and a stage name; input and routes stay in private snapshots. StartExecution uses the stable job UUID and the originally stored correlation ID. Repeated HTTP requests reuse the existing job rather than start another execution.

Each stage stores its status before work and a conditional completion receipt afterwards. Completed stages skip safely on retry. Intermediate results remain private until completion. The independent validator checks serialized routes and exact normalized input hashes; revision validation also derives the pending input again from the captured operation and reports. An immutable owner-scoped RESULT snapshot records the checked result and original input hash.

Revision installation uses the captured operation version and a private job receipt in the same operation write. A lost response can retry without installing the draft twice; newer delivery reports still reject a stale revision. The original approvals, events and water-accounting rules remain in use.

Retries apply to explicit transient Lambda/storage errors, with two retries and exponential backoff. Domain errors are recorded and never retried. Catch paths write a safe terminal job and release its matching lease. The whole workflow has a six-minute timeout; an EventBridge failure/timeout/abort rule invokes terminal repair. GET retains the seven-minute recovery check. EventBridge delivery is best effort, so absolute recovery during an AWS outage is not established by local tests.

The explanation remains the planner's deterministic text. The explanation catch path retries that deterministic stage before completion. No Bedrock or Amazon Location requests, map credentials, new public-source ingestion or scheduled refresh were added.

The frontend has an accessible collapsible job panel with all recorded stage completions and safe error messages. Hosted polling uses two seconds and keeps a network read error distinct from a failed server job. The localhost comparison preview executes the same stage functions and publishes terminal status together with the final result. Its snapshots/job cache remain ephemeral; saved local operations and projects still use their existing separate file stores. Local operation revisions retain their existing composite worker status.

## Verification

- 130 Python tests pass (112 planner/cloud/workflow checks and 18 Phase 5 source checks), including duplicate-stage/one-solve behavior, private intermediate results, corrupted routes/hashes/incomplete comparisons, forced solver failure, timeout repair, expiry, transient retry classification, lost result/completion responses and revision-input tampering.
- TypeScript, Ruff, production build and CDK assertions pass. The synthesized graph checks every named state, bounded retries, failure catches, deterministic fallback, small payloads, Standard type and six-minute deadline.
- Local HTTP acceptance passes idempotency, recorded stage history, exact input hashes, checked approval, loading, delivery, vehicle failure, revision and revision approval.
- The Linux x86 container builds and runs solver, seven-stage offline workflow and Lambda runtime-interface checks with networking disabled and inert credentials.
- Browser comparison completed all seven stages and published four checked plans. [Recorded browser evidence](screenshots/phase-4-job-details-2026-10-09.jpg).

These are local checks, not evidence of real Step Functions execution, IAM integration, two-user AWS isolation, real Lambda timings or provider availability. The earlier intermittent local operations-cache failure remains documented in the Phase 3 readiness record; its cause is unverified.

## Cost and remaining gates

The estimator defaults to the staged Phase 4 stack. Paid regional rates before allowances/credits produce **$1.58** for the small scenario and **$60.84** for the higher-use scenario; a $10 contingency gives **$11.58 / $70.84**. The higher case allows 32 worker invocations/state transitions and 420 seconds of aggregate worker billing per job, including recovery allowance. These are workload assumptions, not a hard spending ceiling. `node scripts/estimate-aws-cost.mjs --phase3` reproduces the earlier $62.11 higher-use estimate including contingency.

Live acceptance still requires account/service eligibility, the quota decision, temporary authentication, an actual seven-day expiry, reviewed deployment and hosted fixture/two-identity/failure checks. The authorized quota target 103 was rejected by the console's minimum 1,000; no broader request was submitted. The question about 1,000 versus retaining 103 remains pending.

Phase 5 provider research is recorded separately in [Phase 5 preparation](phase-5-preparation-2026-10-09.md). Its routing product choice remains pending. No live/provider acceptance gate is marked complete.

References: [Standard workflow behavior](https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html), [Lambda integration](https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html), [error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html), [EventBridge status events and payloads](https://docs.aws.amazon.com/step-functions/latest/dg/eventbridge-integration.html).

