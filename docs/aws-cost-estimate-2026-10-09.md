# Seven-day AWS estimate — 9 October 2026

Mumbai (`ap-south-1`), example-only, staged Phase 4 planning and existing operations workflow. **No resources deployed.** This is an arithmetic estimate for review, not an AWS runtime measurement or an enforced spending ceiling.

Signed-in Billing home showed **$100.00 USD credits**, **183 days remaining**, and “Your free plan account does not get charged”. Preserve that plan. No paid-plan upgrade, advanced-feature activation or automatic-upgrade action is authorized. The account balance is shared with other AWS usage.

## Estimated usage

All figures below use paid rates **before** free allowances and credits. The small case is an illustrative workload. The higher-use case includes every API invocation taking its full configured timeout; API volume, storage, visitors and transfer remain assumptions.

| Assumption | Small demo | Higher-use example |
|---|---:|---:|
| Planning/revision jobs in seven days | 100 | 800 |
| Worker memory × billed duration per job | 2 GB × 20 aggregate seconds | 2 GB × 420 aggregate seconds |
| Worker invocations / state transitions per job | 8 | 32 |
| API invocations, including polling | 10,000 | 200,000 |
| API memory × billed duration per invocation | 0.5 GB × 0.25 seconds | 0.5 GB × 25 seconds |
| DynamoDB read / write units | 100,000 / 5,000 | 2,000,000 / 50,000 |
| S3 GET / PUT requests | 100,000 / 5,000 | 2,000,000 / 50,000 |
| S3 / DynamoDB storage, GB-months | 0.1 / 0.01 | 2 / 0.1 |
| Log ingestion | 0.05 GB | 2 GB |
| Log storage allowance | seven days of ingested volume | seven days of ingested volume |
| Users billed across calendar months | 40 user-months | 40 user-months |
| ECR image storage | 2 GB-months | 2 GB-months |
| Amplify build allowance / stored frontend | 30 minutes / 0.1 GB-months | same |
| Amplify / API internet transfer | 1 / 0.5 GB | 10 / 10 GB |

The app admits 100 jobs per UTC date. Seven days can overlap eight UTC dates, hence 800 admissions in the higher-use example. This is not a bound on all AWS work: duplicate event handling, other requests, infrastructure retention, account activity and service charges are separate. Hosted polling now uses two seconds. 800 workflows lasting six minutes could produce about 144,000 polls, before other calls or timeout recovery. The higher case allows 32 invocations/transitions and 420 aggregate billed worker seconds per job, including recovery allowance; these are assumptions, not measured worst-case bounds.

The higher-use arithmetic deliberately does not reduce billed durations for the API's two reserved slots. Two slots could not sustain 200,000 full 25-second invocations in seven days; summing those hypothetical durations pads the estimate. It still does not bound request/transfer volume or establish a monetary cap.

| Service group | Small demo, USD | Higher-use example, USD |
|---|---:|---:|
| Lambda compute and requests | 0.0897 | 52.9119 |
| REST API requests and internet transfer | 0.0897 | 1.7930 |
| DynamoDB reads, writes and storage | 0.0207 | 0.3490 |
| S3 requests and storage | 0.0675 | 1.1000 |
| CloudWatch log ingestion and storage | 0.0339 | 1.3540 |
| Cognito Essentials | 0.6000 | 0.6000 |
| ECR image storage | 0.2000 | 0.2000 |
| Amplify build allowance, storage and transfer | 0.4523 | 1.8023 |
| Step Functions Standard transitions | 0.0228 | 0.7296 |
| **Total before allowances or credits** | **1.58** | **60.84** |
| **With $10 contingency** | **11.58** | **70.84** |

Cognito uses the default Essentials tier; 20 users are allowed for across two calendar months in this model. No SMS, paid email integration, SSR, WAF, custom domain, NAT gateway, public routing calls or Bedrock is included in this release. Amplify deployment is manual; build minutes are a contingency allowance. Storage estimates include bootstrap artifacts and a month of image retention; cleanup must still be verified.

## Rates and reproducibility

Run `pnpm estimate:aws`. It performs arithmetic only, with no account access. The reviewed [price snapshot](aws-price-snapshot-2026-10-09.json) records 18 Mumbai rates, SKU/rate codes, publication dates, immutable versioned source URLs and source SHA-256 values. Source files were fetched from the official public [AWS price-list service](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/using-the-aws-price-list-bulk-api.html), not through paid account calls.

The estimator defaults to Phase 4. `node scripts/estimate-aws-cost.mjs --phase3` reproduces the earlier monolithic-worker estimate: $1.52 / $52.11 before credits, or $11.52 / $62.11 with contingency.

Key rates: Standard workflow transitions $0.0000285 each; Lambda $0.0000166667/GB-second and $0.20/million requests; REST API $3.50/million requests; DynamoDB $0.1425/million read units and $0.71/million write units; logs $0.67/GB ingested. Internet transfer uses the regional price-file rate **$0.1093/GB**, rather than the $0.09 example on the API Gateway pricing page. Free allowances were deliberately not deducted. Taxes and unsupported/extra services are not calculated; zero out-of-pocket spending relies on preserving the account's free-plan protection. The $10 contingency is not a tax or credit-applicability guarantee.

## Before deployment

The read-only Mumbai Lambda dashboard shows **full concurrency 10**, **unreserved concurrency 10**, and **zero functions**. The stack reserves one worker slot and two API slots. AWS requires 100 slots to remain unreserved, so it needs at least **103 available unreserved slots before deployment**. See [Lambda concurrency requirements](https://docs.aws.amazon.com/lambda/latest/api/API_PutFunctionConcurrency.html). Deployment of the current configuration is blocked until this is resolved; synthesis does not test account quotas.

The team authorized requesting 103. The Service Quotas form rejected this value because requests must be at least the default **1,000**; no request was submitted. CloudShell could not start because account verification is pending, with the console advising up to two days for new accounts. No environment was deleted, no upgrade was attempted and no broader quota was requested. [Verification blocker screenshot](screenshots/aws-verification-pending-2026-10-09.jpg).

The [current service list](https://docs.aws.amazon.com/accounts/latest/reference/supported-services-sign-up-new.html) includes the proposed core services, but expressly applies to the newly rolling-out signup experience. This account uses the classic console; that list alone does not prove account-specific eligibility. Lambda's Mumbai console is accessible without an upgrade gate. Exact Cognito, Amplify, ECR and other creation permissions/free-plan restrictions still need authenticated preflight checks. Stop on any upgrade requirement.

Before creating resources, recheck plan/credits, regional quotas, service permissions, the selected expiry and this estimate. Use temporary local authentication; never put keys in the repository or chat. Review the exact stack and IAM changes. Budget alerts are delayed and do not enforce $100. Keep at least the $29.16 remaining headroom in the higher-use example, review usage during the demo, stop new work before credits run low, and follow [cleanup instructions](aws-foundation.md). Expiry disables app requests but leaves hosting/storage resources until cleanup.

## 10 October scenario preparation

The new read-only analysis batch uses one existing admitted job and the same seven stages. A fresh baseline and five children share at most six × eight solve-seconds (48 seconds), within the existing worker stage allowance. The higher-use estimate already budgets 420 aggregate worker-seconds and 32 invocations/transitions per admitted job, exceeding this scenario batch allowance; no new service/rate is enabled. Source/model preparation is offline. Recheck usage assumptions and available credits before a live run; no live provider calls are included.
