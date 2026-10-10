# AWS preflight — 10 October 2026

**Latest recheck:** the remaining-phase continuation again read Mumbai's applied quota **10** and the existing 1,000 request **Case Opened**. CloudShell still reports verification in progress and cannot create its environment. Billing was not refreshed. No duplicate request, environment deletion or deployment was attempted. [Current gates and local package readiness](remaining-phases-2026-10-10.md) records this continuation.

The user signed in and authorized continuing AWS preparation within the existing Mumbai, seven-day, example-only scope, preserving the free account plan, $100 credits-only ceiling and zero out-of-pocket spending.

## Observed account state

- Signed-in Billing home showed **$100.00 USD credits remaining**, **183 days remaining**, and the free-plan statement that the account does not get charged.
- Cost and forecast data were unavailable; this does not establish zero account usage. Billing reported that initial data preparation can take up to 24 hours. No budget was created.
- Mumbai CloudShell reported **account verification in progress**, possibly taking up to two days for new accounts. Its environment did not start. No environment deletion, paid upgrade or support message was performed.
- The Lambda dashboard opened but its service content did not load. An independent Mumbai Service Quotas check confirmed **Concurrent executions: applied account quota 10**, AWS default 1,000, utilization 0. The previous rejected 103 request remains unresolved.
- The user reported receiving an activation email. A freshly navigated CloudShell page still showed verification pending. These signals conflict; account activation should not be assumed to be the sole cause or CloudShell readiness claimed.

[Verification evidence](screenshots/aws-verification-pending-2026-10-10.jpg) excludes the account identifier.

## Local checks

`pnpm infra:test` passed local CDK synthesis and foundation assertions. `pnpm estimate:aws` passed and reproduced the prepared estimate: $1.58 before contingency for small usage; $70.84 including $10 contingency for higher usage, before credits. These estimates use the documented pricing snapshot and assumptions; they are not a spending cap or live billing evidence.

## Remaining deployment gates

CloudShell readiness, regional quota resolution, account-specific service eligibility, reviewed deployment access and an actual seven-day expiry remain required. Keep worker/API reservations and the free plan. After inspecting the current form's 1,000 minimum, the user explicitly authorized requesting 1,000 while retaining application limits of worker 1/API 2. This does not authorize an account upgrade. No JalSetu stack, image assets or hosted application was deployed in this preflight.

After activation, recheck the Mumbai quota and eligibility, then complete the reviewed deployment and live acceptance gates in `aws-foundation.md`. Historical build-status and readiness documents remain valid preparation evidence; this note records the new read-only check.

## Authorized quota request

The 1,000 request was submitted after explicit user approval. AWS confirmed “Quota increase requested for Concurrent executions” and created a support case. The displayed applied quota remained 10: submission is not approval. See [submission evidence](screenshots/aws-quota-requested-2026-10-10.jpg). No separate support message was sent and no application limits were changed.
