# AWS deployment review — 10 October 2026

**Final user decision: “Keep prepared; do not deploy.”** No AWS resources were created, no container assets were published, no test identities were created and no frontend was uploaded. The temporary CLI login cache was cleared with `aws logout` (zero cache files remain). Already-issued tokens can remain valid for up to 15 minutes; no active deployment/tool process is using them. Future deployment requires a new explicit go-ahead and fresh checks. The review below records completed preparation and proposed actions only.

**Ready for resource-creation approval; not deployed.** Authenticated local AWS CLI access works. Mumbai Lambda reports **400 total/unreserved slots**, zero functions; the 1,000 request remains `CASE_OPENED`. There is no need to switch regions. CloudShell still fails verification and has not been reset/deleted; the local path avoids it.

## Account and cost evidence

Read-only `GetAccountPlanState` reports **FREE / ACTIVE / $100.00 USD remaining credits**. Service list/read calls succeed for Lambda, CloudFormation, Amplify, Cognito, ECR, DynamoDB and Step Functions. No existing `JalSetuDemo` or `CDKToolkit` stack was found. Successful reads and template validation do not guarantee creation permissions or service eligibility; stop if AWS requests a plan upgrade or rejects a service.

Fresh official regional price files confirm all **18 SKU/unit/tier rates unchanged**: [price recheck](aws-price-recheck-2026-10-10.json). The existing seven-day model remains **$11.58 small / $70.84 higher usage**, including $10 contingency, before allowances or credits. Higher-case modelled headroom is $29.16 against the observed shared credit balance. This is not a hard spending cap; traffic, duration, storage and other account usage can differ. Preserve the free plan and zero out-of-pocket requirement. See [workload assumptions](aws-cost-estimate-2026-10-09.md) and [AWS free-plan rules](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html).

## Exact proposed changes

| Stack | Resources and access |
|---|---|
| `CDKToolkit` | Private encrypted staging S3, container ECR repository, bootstrap-version parameter and six deployment/publishing/lookup/execution/session roles. Use [the reviewed template](../infra/bootstrap-template.json). AWS-managed encryption avoids a new customer-managed KMS key. No cross-account trust is configured. |
| `JalSetuDemo` | One Amplify app/main branch; admin-created Cognito users with PKCE; one authorized REST API; two container Lambdas; one on-demand DynamoDB table; one private S3 snapshot bucket; three week-retained log groups; one Standard planning workflow and failure-repair rule. Four application/service roles and three inline policies connect these services. |

Worker/API concurrency stays **1/2**, API throttle **5/second, burst 10**, daily planning admission **100**, workflow timeout **six minutes**. Hosted data stays example-only. No AWS routing/AI calls, Organizations, Control Tower, plan upgrade, domain purchase, email or SMS sending is included. The frontend will be public; operational API access requires Cognito sign-in.

Execution permissions list required service actions. IAM management is restricted to `JalSetuDemo-*` roles; passing them is restricted to Lambda, Step Functions and API Gateway. Lambda/table/bucket/log/workflow/rule mutations use project prefixes. Cognito and Amplify creation/management need region-wide wildcard resources. API Gateway management includes Mumbai REST APIs and the regional account logging setting. Deploy-role CloudFormation writes target `JalSetuDemo`. These are reviewed permissions, not proof of a universal project-only boundary. Inline role-policy management is security-sensitive and requires approval.

Read-only API Gateway checks show **zero existing REST APIs and no account logging role set** in Mumbai; this deployment would set that regional logging role. Bootstrap roles persist after application removal; retained storage, Cognito and logs require explicit cleanup. Do not remove unrelated resources or later-shared bootstrap assets.

## Checks completed

- CLI **2.37.12** authenticated using the approved temporary root session. No permanent key was created; configuration/cache and account-specific assemblies are outside Git. Approval currently covers **read-only checks**, not creation.
- AWS accepts both exact CloudFormation templates and reports IAM capability requirements. IAM validation returns **no findings** for execution/deploy/lookup/local-session policies: [report](aws-policy-validation-2026-10-10.json). This is not deployment or security certification.
- Foundation synthesis/security assertions pass. Direct CDK execution through the Windows junction now works; the old entry comparison silently skipped execution.
- Today's Linux image was rebuilt. Maximum-size/four-strategy, seven-stage, resource-scenario and Lambda runtime checks pass. The check now defaults to the documented 10 October image instead of yesterday's stale image.
- Docker/CDK assets exclude temporary folders, environment variants, local state and credentials. The actual staged assembly contains no environment, credential or saved operation/project files.

## Execution after approval

1. Recheck free plan, credits, available quota and regional API Gateway account configuration. Choose actual expiry within seven days and regenerate the account-specific assembly outside Git; never reuse a stale expiry.
2. Create `CDKToolkit` using `infra/bootstrap-template.json`, AWS-managed encryption and JalSetu/example-only/expiry tags. Use temporary root access for the specifically approved bootstrap creation, then run CDK from `LocalDeploymentSessionRole`. This role has metadata-read and scoped role-assumption permissions, with no direct infrastructure writes; fallback cannot become a root deployment. Stop if role assumption fails. Manual frontend publication and test-user administration require explicitly approved access to the new app/pool.
3. Publish container assets and deploy only `JalSetuDemo`. Stop on upgrade prompts, unexpected permissions or unrelated changes. Keep real output identifiers outside Git.
4. Build, run `pnpm prepare:hosting` against real stack outputs and upload the real bundle to Amplify main. Test identity/password entry belongs to the user's secure process.
5. Verify hosted sign-in, two-user isolation, planning/operations/archive, private export/expiry/logging, Standard workflow and terminal repair. Until actual acceptance passes, hosted Phases 3/4 remain incomplete.
6. Review usage/credits during the seven-day run; expiry stops application requests but does not remove infrastructure. Follow [exact-resource cleanup](aws-foundation.md) with deletion approval and end temporary local access when no longer needed.

No support message, duplicate quota request or resource creation occurred. Video, publication and submission remain deferred. Bootstrap provenance: official AWS CDK CLI **2.1145.0** `bootstrap --show-template`, modified for the reviewed permissions. [AWS bootstrap documentation](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html). Do not overwrite this variant with the default administrator template.
