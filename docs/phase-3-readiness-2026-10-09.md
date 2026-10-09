# Phase 3 readiness checkpoint — 9 October 2026

This preserves the earlier Phase 3 checkpoint. Subsequent local work is recorded in [Phase 4 readiness](phase-4-readiness-2026-10-09.md) and [Phase 5 preparation](phase-5-preparation-2026-10-09.md). The estimator now defaults to Phase 4; use `node scripts/estimate-aws-cost.mjs --phase3` for this checkpoint’s arithmetic.

Continued the existing project after reviewing README, the unchanged specification, decisions, build status, Phase 2 completion and AWS foundation. The current chat's `outputs/jalsetu` path points to the original project. No rebuild, deployment, image push, account upgrade or new billable resources.

## Implemented and checked

- **Reversible project archive/restore** in the local and cloud adapters and existing React UI. The team chose archive with restoration while retaining approved operations and reports. Archived drafts are hidden from the active list and cannot be edited until restored. Conditional versions prevent stale writes; request receipts prevent duplicate state changes. Project and operations stores remain separate. The cloud limit of 20 saved projects includes archived drafts.
- **Real SDK boundary checks** using pinned boto3/botocore 1.43.110 and botocore Stubber, with inert credentials and HTTP send blocked. Seven tests cover consistent owner reads, S3 owner-prefix checks, conditional pointer writes/error translation, daily admission, busy leases and async invocation. These validate SDK parameter shapes and adapter behavior; AWS has not executed the expressions.
- **Container execution** using the pinned official Python 3.12 Lambda base digest and `linux/amd64`. The runtime requirements include the pinned SDK instead of depending on AWS's bundled version. The local image is about 283 MB. No ECR push.
- `pnpm test:container` ran with `--network none`. Twenty synthetic sites and five vehicles produced four validated, feasible comparison plans in 0.197 seconds. This single local measurement is not a response target or AWS cold-start benchmark. The Lambda runtime interface passed unauthenticated rejection, authenticated health/example, valid input and malformed-JSON checks using only inert credentials. No S3/DynamoDB state methods were called by that HTTP check.
- **Browser check:** created “Archive verification — synthetic”, archived version 1 into version 2, restored it as version 3 and reopened the exact draft. Policies remained unselected. The test draft remains available locally. [Screenshot](screenshots/archive-restore-2026-10-09.jpg).
- **Cost review preparation:** [seven-day estimate](aws-cost-estimate-2026-10-09.md), public regional price snapshot and `pnpm estimate:aws`. Small model $1.52; higher-use model $52.11, or $62.11 with contingency, before free allowances and credits.

## Verification

```powershell
pnpm test                 # 99 passed, three existing OR-Tools SWIG deprecation warnings
pnpm lint                 # TypeScript and Ruff passed
pnpm build                # production frontend passed
pnpm infra:test           # local CDK synthesis/assertions passed
pnpm test:projects        # persistence, stale writes, archive/restore and retries passed
pnpm test:storage         # passed
pnpm test:csv             # passed
pnpm test:exports         # passed; browser file-saving remains a separate historical gap
pnpm test:metrics         # passed
pnpm test:operations      # race and bounded revision-cache checks passed
pnpm test:api             # local planning, retries, conflicts and terminal failure passed
docker build --platform linux/amd64 --provenance=false -t jalsetu-local-check:2026-10-09 -f services/cloud/Dockerfile .
pnpm test:container       # offline solver + Lambda runtime checks passed
pnpm estimate:aws         # arithmetic only, no AWS account calls
```

The Docker engine is now working (server 29.7.2). Only the uniquely named offline test container was removed after checks; no unrelated containers or volumes were changed.

One later repeat of `test:operations` failed in the mocked revision-cache check with a durable `failed` job. The immediate rerun and ten diagnostic repetitions passed. The exception could not be reproduced; no speculative storage fix was made. Treat this as an unresolved intermittent local check, rather than claiming every run is stable.

## Live gate and next phase

**Phase 3 remains incomplete.** Signed-in Billing still shows $100 credits and a free plan, but Mumbai Lambda has only 10 unreserved slots. The current reserved-concurrency configuration requires 103. The team authorized requesting 103, but the form rejected it with a minimum of 1,000; no quota request was submitted. CloudShell is unavailable while AWS verifies the account, with the console advising up to two days. No safeguards were removed and no plan upgrade was attempted.

Resolve the quota, verify account-specific service eligibility and temporary deployment access, review the estimate/IAM changes, then select the actual seven-day expiry. Deploy the existing stack and manual frontend bundle. Run the specification's live acceptance gate: authenticated project create/reload; isolation from a second identity; deployed fixture solve; AWS-live frontend; structured correlation logs. Also exercise approval → load → delivery report → failure → revision approval and archive/restore through the hosted UI.

Phase 4 follows the live Phase 3 gate: Step Functions Standard, named stages, idempotent execution, durable results and failure recovery. Existing local/adapter jobs support part of this behavior; they do not establish Step Functions completion. Phase 5 public context and Amazon Location remain pending.

## Changed files

Application: `apps/web/src/App.tsx`, `Projects.tsx`, `scripts/local-projects.mjs`, `services/cloud/handler.py`.

Verification/runtime: `services/planner/requirements*.txt`, `services/cloud/Dockerfile`, `services/planner/tests/test_cloud_projects.py`, `test_cloud_sdk.py`, `scripts/test-projects.mjs`, `check-container.py`, `test-container.mjs`, `estimate-aws-cost.mjs`, `package.json`.

Records: README, decisions, build status, AWS foundation, this checkpoint, cost estimate, price snapshot and browser screenshot. The supplied specification and historical Phase 2 completion report remain unchanged.
