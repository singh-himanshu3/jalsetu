# Hosted example release — 11 October 2026

**Live website:** https://main.d2d0jtitb5ozce.amplifyapp.com

The existing JalSetu application is published on AWS in Mumbai. Amplify reports a successful manual frontend release, and CloudFormation reports `JalSetuDemo` as `CREATE_COMPLETE`. The public introduction is available without an account. Planning, saved sample projects and delivery reports require an invited JalSetu account; AWS console credentials are not application credentials.

The original example expiry is **17 October 2026 at 22:57:30 IST** (`2026-10-17T17:27:30Z`). It was not extended during access recovery. The account remains on its active free plan and the approved project budget remains **$100 in credits, zero out-of-pocket**. No AWS routing or AI calls, real vehicle dispatch, video or submission are added.

## What was checked on the actual hosted stack

| Check | Result |
| --- | --- |
| Actual HTML, built JS/CSS and matching public configuration | Passed; Amplify release succeeded |
| Sign-in authorization page | Responds successfully; browser callback still needs visual confirmation |
| Two separate invited users and protected API | SRP sign-in passed; anonymous requests denied |
| Project ownership | Second user cannot list/read the first user's project |
| Planning | Four independently validated strategies; workflow succeeded |
| Submission retry | Returns the same owner-scoped job |
| Approved delivery workflow | Loading, reported delivery, failure, 300-L recovery and closure recorded |
| Replanning and revision approval | Workflow succeeded; closed point excluded until explicit reopening |
| Water accounting | Exact depot, delivered and stranded totals checked; conservation valid |
| Concurrent/repeated updates | Stale writes rejected; repeated event does not duplicate delivery |
| Project archive/restore | Saved operations preserved |
| Storage and application limits | Private encrypted snapshots, state TTL, API 5 requests/s and burst 10, Lambda reservations 1/2, 100 planning jobs/day verified |
| Hosted visual/phone/map rendering | Pending; Computer Use stopped because it could not reliably verify the Windows browser URL |

Machine-readable public evidence: [frontend checks](audit/hosted-frontend-2026-10-11.json), [actual foundation checks](audit/hosted-foundation-2026-10-11.json), [hosted acceptance](audit/hosted-acceptance-2026-10-11.json). The evidence manifest verifies the real HTML/configuration over HTTPS before recording a deployed URL. Local desktop/phone/map checks remain in the earlier frontend reports; they are not presented as hosted screenshots.

All acceptance inputs and reported outcomes are **synthetic examples**. This establishes hosted software behavior, not real-world delivery performance or field impact. Authentication was exercised through the AWS-maintained Cognito SRP SDK and the real protected API. The complete browser PKCE callback and hosted interactive map still need a browser check.

## AWS use and safeguards

Amplify serves the built React/Vite frontend. Cognito protects invited sign-ins. API Gateway invokes the Lambda API; Step Functions coordinates the existing deterministic planner in a second Lambda. DynamoDB holds owner-scoped state pointers, S3 holds private snapshots and CloudWatch records service events with API body tracing disabled. EventBridge repairs failed/timed-out workflows. IAM separates temporary deployment access from application roles. No permanent IAM access keys or GitHub AWS secrets were created.

The earlier reviewed estimates remain $11.58 for the small example and $70.84 for the higher-use assumptions including contingency, before allowances/credits. These are estimates, not measured charges or a guaranteed monetary cap. Credit reporting can lag. The frontend publishing command now requires at least $30 remaining credits, preserving the additional $20 outside the authorized budget plus a $10 buffer. This is a release gate, not a real-time spending limit. No account-plan upgrade occurred.

## Changing the website after deployment

1. Edit the existing project and run relevant checks.
2. Renew the appropriate temporary AWS access.
3. For frontend changes, run `pwsh -File scripts/publish-hosted-web.ps1 -Profile <publishing-profile> -AwsCli <aws-cli-path>`.
4. Wait for Amplify success and verify **the same website URL**. `-CheckOnly` validates without uploading.
5. Backend/infrastructure changes require a separately reviewed CDK release and hosted acceptance.

A local edit or GitHub push does **not** automatically publish. No automatic repository-to-AWS connection is configured. The restricted deployment-session role does not include frontend upload or user-administration permissions; the explicitly approved temporary owner session was used for this initial publication and two test-user setups.

Invited demo passwords are provided in a separate private local file outside the public repository. Account 1 contains the synthetic hosted acceptance exercise; account 2 has a separate empty workspace. Do not publish shared passwords.

## Cleanup and remaining checks

The expiry closes planning and saved-record access. It does **not** schedule deletion of AWS infrastructure; the public introduction can remain available. A reviewed cleanup is still required at the deadline.

Two application attempts rolled back before successful deployment. Protected empty resources were retained: two state tables, two snapshot buckets, two user pools, six log groups and two API logging roles. Exact resource inventories remain private outside Git. API Gateway's regional logging configuration is shared and must be reviewed separately. Include the successful app, retained failed-attempt resources and bootstrap assets in cleanup; do not blindly remove retained data or shared settings.

Temporary root and deployment CLI sessions are logged out after final verification. The console login remains under the owner's control. No public production release, operational-record cloud upload or field trial is claimed.
