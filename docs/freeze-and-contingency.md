# Local release and cloud contingency

The [10 October release checkpoint](local-release-readiness-2026-10-10.md) verifies the built local app and its release/restart gate. It is a local readiness checkpoint, not a submitted freeze. The user currently excludes video/submission work. No submitted tag, public demo or recurring monitor exists.

## Working local fallback

1. With dependencies installed, stop an existing `pnpm dev` copy before starting the built app. Open **Start JalSetu.cmd** or run `pnpm start`, then use **http://127.0.0.1:8787**. The app binds to loopback only and serves the existing example workflow without AWS calls.
2. Use **Try the example** and choose both operating rules explicitly. Generate, review and approve a plan; record loading and delivery separately. Keep the example labels and unmet requests visible. Saved projects/runs can be reopened through the existing controls.
3. Run `pnpm check:local` before a release handoff. It includes the built-server check with actual process restart, failure recovery, persisted receipts and web-file boundaries. The release check uses its own state directory and does not modify normal saved data.
4. Stop the app before copying `local-state/` to a private backup location. Keep the two saved-data files together. Do not publish that folder. If startup rejects a saved file, preserve it; do not reset it to an empty store. Restore a known local backup while the app is stopped, or investigate the file. The isolated release check exercises preservation and snapshot restoration without touching user files.
5. Approved plans, events, revisions, project drafts and write receipts persist. Pending/completed job-cache entries and guide progress remain in memory and disappear on restart; regenerate a comparison for new planning. An interrupted, unsaved report is not a confirmed record.
6. Keep `data/evaluation/`, `data/evaluation-events/failure_after_delivery.json`, readable exports and the verified evidence manifest with the reviewed code. Both local customer download controls now save actual files. Generate the manifest only after committing source/evidence, then verify it against saved bytes and that source commit.

The local app requires its installed Node/pnpm/Python dependencies; it is not a portable installer. Never run two server instances against one saved-data folder. No field delivery or external user validation follows from the fallback.

## Original cloud/submission gates, still pending

When the user resumes AWS work, recheck account eligibility, quota approval, permissions, remaining shared credits and a current estimate. The latest recorded request is for 1,000 account concurrency; it does not change worker/API reservations of 1/2. Preserve the free plan, Mumbai, seven-day example-only scope, credits-only ceiling up to $100 and no out-of-pocket spending. Do not treat estimates or budget alerts as a hard cap.

Actual cloud deployment still needs live ownership/expiry/orchestration/export acceptance and workload evidence. AWS routing and AI calls are excluded from the selected release. If future publication/submission is authorized, record the actual submitted commit and URLs, then tag that exact commit. No fake submitted tag or real-video claim should be added to local evidence.

During an authorized seven-day deployment, use the existing AWS runbook for usage/expiry and cleanup. No recurring task has been enabled. At expiry follow [AWS foundation cleanup](aws-foundation.md); review retained stores/images and do not delete unrelated account resources.
