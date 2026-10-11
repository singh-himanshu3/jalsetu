# Deployment progress — 10 October 2026

**Final checkpoint — 11 October:** [Actual hosted release and acceptance](aws-hosted-release-2026-10-11.md). Application creation and Amplify publication succeeded; five hosted acceptance groups pass. The original expiry is preserved. Statements below about pending sign-in/publication describe the earlier stages.

The owner explicitly requested deployment and a shareable live link. This supersedes the previous decision to keep AWS prepared without deploying. Mumbai, example-only data, the active free account plan, $100 credits-only, no out-of-pocket spending and a maximum seven-day release remain the boundaries. No AWS routing or AI calls are added.

## Resume checkpoint — 11 October 2026

The limited deployment-user sign-in and assumption of the reviewed roles succeeded on 10 October. CDK wrote actual application outputs at 23:40 IST. The frontend hosting address currently serves AWS's placeholder page, so it is **not yet a released JalSetu website**. Its configured security headers are present. Fresh CloudFormation status, account-plan/credits checks, frontend publication and hosted acceptance await renewed temporary owner authorization; the earlier session expired while work was paused. The original expiry remains **17 October 2026, 22:57:30 IST**.

Three narrowly scoped deployment corrections were made: bootstrap-version `ssm:GetParameters` access; attachment of the standard Lambda basic logging policy only to the two JalSetu Lambda role prefixes; and explicit JalSetu names for the planning state machine and failure rule so they match the reviewed resource boundaries. No administrator policy was granted to the deployment user. Infrastructure tests, typechecking and built public-package checks pass locally.

Two failed application attempts rolled back. Their failed stack records were removed only after resource status checks, retaining the protected resources. Private recovery inventories are outside the public repository. The cleanup review must include two empty state tables, two snapshot buckets, two retained user pools, six log groups and two retained API logging roles from those attempts, plus the successful stack and bootstrap assets. The API Gateway account logging configuration is a shared regional setting; do not blindly delete or change it. These retained resources are not automatically removed by the expiry tag.

The checkpoints below describe the earlier deployment stages and are retained as history.

## Verified account and resources

Fresh temporary CLI sign-in succeeded. The AWS account-plan API reports FREE / ACTIVE and $100 USD remaining credits. Lambda reports 400 available unreserved slots and zero functions. Before creation, neither project stack existed and there were no IAM users. The production build, infrastructure synthesis assertions, public hosting-package checks and Linux container/runtime checks passed.

The exact reviewed `infra/bootstrap-template.json` was deployed as **CDKToolkit**, with project/example-only/expiry tags and AWS-managed encryption. Its actual CloudFormation status is **CREATE_COMPLETE**. The expiry tag is **17 October 2026 at 17:27:30 UTC** (22:57:30 IST). An initial create request failed tag validation without creating resources; the structured JSON tag request succeeded. This foundation contains the asset bucket/repository and reviewed deployment roles. No app stack, container publication, application user, frontend upload or live URL is claimed.

AWS rejected the next step, assuming `LocalDeploymentSessionRole`, with **“Roles may not be assumed by root accounts.”** The reviewed release procedure prohibits silently falling back to root application deployment. The owner subsequently approved a dedicated IAM deployment user. `jalsetu-deployer` was created with the AWS-managed SignInLocalDevelopmentAccess policy (two sign-in OAuth actions) and one inline permission to assume exactly LocalDeploymentSessionRole. IAM policy validation and readback passed; zero access keys and no group memberships were verified. The owner set its console password directly in AWS, with PasswordResetRequired false. Its secure IAM sign-in is in progress; role assumption and app deployment remain pending. The agent did not enter, retrieve or save the password.

The original review is historical: its statements that no resources exist and deployment is unauthorized are superseded only by this checkpoint. Root access was used for the newly authorized bootstrap creation and read-only preflight; application deployment is still blocked at the constrained-role step.

## Shareable frontend and updates

The frontend now has a prepared anonymous landing page reusing the existing animated introduction. Invited users sign in before planning or accessing private sample records. Expired workspaces display a closed-workspace notice. This change passed typechecking/build/package checks; its hosted browser verification remains pending.

`scripts/publish-hosted-web.ps1` prepares repeatable frontend releases after the application stack exists. It checks the active free plan and at least $10 remaining credits, reads the existing stack, verifies the hosting identity, builds the frontend, validates the seven public configuration fields and original expiry, uploads only the prepared public bundle, and waits for Amplify success. It does not create IAM access, connect GitHub, upgrade the account, alter infrastructure or extend expiry. Signed upload URLs remain in memory and are omitted from upload-failure messages. Account-specific outputs remain outside the repository.

This command is implemented and PowerShell syntax-checked; an actual upload and successful release have not yet been exercised. Its credential profile needs read access to account-plan/stack/app metadata and permission for the existing Amplify app's create/start/get deployment operations. The bootstrap session role alone does not have those publishing permissions.

After an initial successful release, the update process is:

1. Edit the existing code and run the relevant checks.
2. Authenticate with the appropriate temporary AWS deployment/publishing profile.
3. For frontend changes, run `pwsh -File scripts/publish-hosted-web.ps1 -Profile <publishing-profile>`. Use `-AwsCli <absolute-cli-path>` if the CLI is not on PATH; `-CheckOnly` builds and validates without uploading.
4. Wait for a successful release and verify the same public link. Local edits or a GitHub push alone do not change the live site.
5. Backend/infrastructure changes require a separate reviewed CDK release and hosted acceptance. They are not included in the frontend publishing command.

No automatic GitHub deployment or long-lived GitHub AWS credentials are configured. The cost estimate remains $11.58 for the small example / $70.84 for higher assumed use including contingency, before allowances and credits. These are estimates, not measured charges or enforced monetary caps. The fresh credits response can lag actual consumption.

## Remaining deployment gates

- Complete the approved limited deployment identity’s secure sign-in (user creation and owner-entered password setup are verified).
- Assume the reviewed session role, publish container assets and deploy only JalSetuDemo.
- Build using actual deployed public outputs and publish the frontend.
- Configure secure invited test-user sign-ins; verify two-user isolation and the full planning/approval/reporting/archive workflow.
- Verify the anonymous live landing page, phone layout, street tiles/directions, private storage, expiry and workflow repair.
- Record the verified live link and actual hosted evidence.

The expiry tag is a review deadline, not scheduled infrastructure deletion. Empty bootstrap resources now exist and must be included in the later exact cleanup review; storage can consume credits once assets are uploaded. Retained app data and shared bootstrap resources must not be blindly deleted.

Temporary root CLI credentials were logged out after the initial blocked deployment turn, then securely refreshed for the explicitly approved IAM-user creation. Previously issued access tokens can remain valid for up to 15 minutes. No permanent access key was created.
