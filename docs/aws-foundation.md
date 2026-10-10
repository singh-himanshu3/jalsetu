# AWS foundation: local preparation only

AWS preparation resumed on 9 October after the team supplied a new $100 ceiling. A read-only check of signed-in Billing home showed $100.00 USD credits remaining, 183 days remaining and a free plan that does not get charged. Preserve that free plan; do not upgrade it or enable features that automatically upgrade it. Do not deploy until service eligibility, a concrete cost estimate and remaining release prerequisites are verified. Confirmed scope: Mumbai (`ap-south-1`), example-only, seven days, credits only, maximum $100 and no out-of-pocket spending.

## What exists

`infra/app.mjs` defines two container Lambdas, Cognito, an authorized REST API, DynamoDB, private encrypted S3 snapshots, Amplify manual hosting, week-retained logs, a Standard planning workflow and an EventBridge terminal-failure repair rule. CDK's image assets would be published to its bootstrapped ECR repository during deployment; this has not happened. No AWS credentials are stored in frontend configuration. `services/cloud/handler.py` is the shared-planner adapter. Hosted configuration fails closed when absent/invalid; localhost continues to use the local API.

Run `pnpm infra:test` for local synthesis/assertions. The test's 2099 expiry is deliberately test data, not a live hosting choice. The pinned Linux x86 Lambda image builds locally, and `pnpm test:container` passes solver/runtime checks with networking disabled. Image publishing and live API acceptance remain pending.

The worker admits one planning job at a time, with a lease and daily admission limit. API/Lambda throttles provide busy responses. These controls do not establish a hard monetary cap. Expiry rejection stops application API work; it does not delete infrastructure or stop all hosting/storage/log charges.

## Before a live deployment

The team selected the existing operations workflow for the first hosted release. Cloud approval/list/read/event/replan/revision-approval endpoints are now locally implemented and tested with the real domain logic and a memory store. Request receipts and event/approval state changes share a conditional operation-pointer write; async revisions cannot overwrite a newer event. The signed-in subject supplies audit attribution. This is not live acceptance evidence.

The team selected reversible project archive/restore while retaining separate operations and reports. This is implemented in both adapters and the UI, with conditional versions and retry receipts. Archived projects still count toward the cloud's 20-project limit. Archiving does not extend the seven-day expiry or the existing snapshot lifecycle.

SDK-boundary and offline image checks now pass; real AWS conditions/state integration remain unverified. See [readiness evidence](phase-3-readiness-2026-10-09.md). The [estimate](aws-cost-estimate-2026-10-09.md) now models $1.58 for a small staged demo and $70.84 including contingency for higher usage, before free allowances/credits. Account-specific service eligibility and the reviewed deployment remain pending.

The signed-in Mumbai Lambda dashboard shows full/unreserved concurrency **10**. Current worker/API reservations total three, requiring at least **103 available unreserved slots before deployment** under AWS's 100-slot minimum. Keep the existing reservations until the quota is resolved. Do not attempt a deployment that is known to fail.

The authorized 103 request was rejected by the console form's 1,000 minimum. On 10 October the user authorized the 1,000 request, which AWS acknowledged with a support case; approval remains pending. Keep application reservations at 1/2. The user reports receiving an activation email, but CloudShell still reports verification pending. No upgrade or resource deletion was attempted. See [current preflight](aws-preflight-2026-10-10.md).

The `infra/app.mjs` command entry validates the live scope before synthesis: Mumbai only and a valid explicit UTC expiry in the future, at most seven days away. Unit synthesis can still use fixed test data through `createFoundation`. This guard is not account eligibility, a budget cap, or automatic cleanup.

Then choose the actual seven-day expiry, deploy through a least-privilege account flow, populate public `config.json` from stack outputs and run the specification's two-identity/live-fixture/logging acceptance checks plus the selected operations and archive workflows. The Phase 4 Standard workflow and shared stages are now locally prepared; their real execution/IAM/failure acceptance still requires AWS access. See [Phase 4 evidence](phase-4-readiness-2026-10-09.md).

Account-plan and budget facts: [AWS plan comparison](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html) describes the free-plan no-charge protection and automatic-upgrade triggers. [AWS Budgets documentation](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html) explains alert delays; budget alerts do not provide that protection themselves. No account IDs, credit IDs or credentials are stored in this repository.

## Cleanup checklist for the eventual deployment

No cleanup commands should be executed against the account now; there is no deployed JalSetu stack.

1. At the end of the authorized period, disable frontend/API access and stop new jobs. Verify in-flight work is finished or terminal and export any example evidence that must be retained.
2. Review the exact stack's CloudFormation resources and outputs in the confirmed account/region. Delete that JalSetu stack only after reviewing the retained resources. Do not delete unrelated account services or a shared CDK bootstrap stack/repository.
3. DynamoDB, snapshot S3, Cognito and log groups deliberately use retention on stack deletion. List these exact retained resources before removing them. Verify the bucket/object names and table/pool IDs against the JalSetu stack outputs; obtain final deletion approval when applicable. Empty/delete only the JalSetu snapshot bucket, delete its table/pool and the named JalSetu log groups when the team has no remaining retention need.
4. Verify the Amplify app/branch is removed and its public URL is unavailable. Identify the JalSetu container asset digest before removing an ECR image; keep shared bootstrap infrastructure and other applications' images.
5. Check for project-tagged leftovers and billing usage. Record the cleanup date and remaining resources. S3 lifecycle expiry and DynamoDB TTL are asynchronous and do not replace explicit cleanup verification.

These are preparation instructions, not evidence that cleanup, deployment or cost containment has occurred.
