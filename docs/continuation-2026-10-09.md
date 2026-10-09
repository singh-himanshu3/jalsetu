# Continuation review and cloud operations preparation

9 October 2026, Asia/Kolkata. This checkpoint updates Phase 3 preparation without changing Phase 2's completed local gate or claiming deployment.

## Existing project preserved

The continuation chat began with an empty `outputs` directory. Its `outputs/jalsetu` is now a Windows directory junction to the existing 7 October project's `outputs/jalsetu`. This preserves one checkout, the installed dependencies and saved local exercises. Do not treat the junction as a second independent project or recursively delete it as cleanup. Git is initialized, but has no commits; the project files are currently untracked. No remote or license was selected.

Read before implementation: README, build specification, decisions, build status, Phase 2 completion and AWS foundation. Reviewed the local API/storage/project/operation boundaries, domain schemas and ledger/revision logic, frontend API/auth/config/operations, cloud handler, container definition, infrastructure and existing tests.

## Updated team instructions and verified account facts

The team supplied a new **$100 maximum** and asked us to inspect the account. Signed-in Billing home displayed **$100.00 USD credits remaining**, **183 days remaining**, and **Your free plan account does not get charged**. Cost/usage breakdown was still being prepared; no exact usage total or credit expiration date is inferred. No account identifier or credential is stored here.

Retain credits-only use, zero out-of-pocket spending, Mumbai, seven days and example-only data. Preserve the free plan; do not upgrade it or enable an automatic-upgrade trigger. The balance is an account-wide credit pool, not a dedicated JalSetu allocation. Recheck it before deployment. These observations are not a deployment estimate or proof that every required service is eligible.

The team selected **the existing operations workflow** for the first hosted release. Planning/comparison alone is insufficient for that release.

## Implementation

- Cloud endpoints now support approval, saved-operation list/read, immutable reporting, revision submission and revision approval using the existing planner/ledger functions. No new domain model or AWS service was added.
- Operations are scoped to the authenticated owner. Approval and event audit records derive the actor ID from Cognito; a supplied coordinator label does not establish identity.
- Retry receipts live in the same private operation snapshot as the state change and share its conditional pointer write. Repeated accepted events/approvals return the current operation; changed payloads with a reused key are rejected. Receipts are omitted from public API responses.
- Revision jobs use the existing bounded worker and admission controls. The worker conditionally saves against the captured operation version; an event accepted after submission makes that revision fail rather than overwrite newer accounting. Failed/duplicate workers leave checked state intact.
- Hosted Operations wording distinguishes private AWS storage and signed-in attribution from local storage and unauthenticated labels. Physical reports remain self-entered example reports.

Changed implementation files: `services/cloud/handler.py`, `services/planner/tests/test_cloud_operations.py`, `apps/web/src/App.tsx`, `apps/web/src/Operations.tsx`. README, decisions, build status and AWS foundation were updated to reflect the new budget and scope.

## Verification

| Command | Observed result |
|---|---|
| `node scripts/python.mjs -m pytest services/planner/tests -q` | 89 passed; three existing OR-Tools SWIG warnings |
| `node scripts/python.mjs -m ruff check services/planner services/cloud` | Passed after import formatting repair |
| `pnpm typecheck` | Passed |
| `pnpm build` | Passed |
| `node infra/test-foundation.mjs` | Local synthesis and assertions passed; no deployment |
| `node scripts/test-csv.mjs` | Passed |
| `node scripts/test-storage.mjs` | Passed |
| `node scripts/test-local-operations.mjs` | Race and bounded revision-cache checks passed |
| `node scripts/test-exports.mjs` | Passed; browser saving still separate |
| `node scripts/test-projects.mjs` | Passed |
| `node scripts/test-metrics.mjs` | Passed |
| `docker version --format '{{.Server.Version}}'` | Docker Linux engine unavailable; container not built |

The six new tests use real domain calculations and a memory store. They cover owner isolation, authenticated audit attribution, retry/conflict/version behavior, the complete failure-after-delivery/recovery workflow, active-vehicle revision rejection, a newer event invalidating a submitted revision, duplicate worker execution and terminal invocation failure. They do not establish boto3 condition behavior, image compatibility or live AWS behavior. The existing localhost API was already running and was not restarted or subjected to a new integration exercise in this checkpoint.

## Next release prerequisites

1. Verify SDK conditions and container execution without deploying. Define project deletion/retention behavior before implementing deletion.
2. Verify free-plan service eligibility and prepare a complete current Mumbai estimate, including API reads/polling, operation snapshots, logs, hosting and retained resources. Use explicit workload assumptions and reserve headroom below $100. No complete estimate is recorded yet.
3. Review the concrete deployment configuration, actual seven-day expiry and cleanup plan. Only then deploy the full selected slice and run two-identity, complete-operation, logging and export acceptance checks.

No AWS resource was created, no paid planning/routing/model call was made, and no cleanup or account-plan change was performed. Browser downloads, Step Functions, public routing/context, additional disruption types and active-position replanning retain their previous limitations.
