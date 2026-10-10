# Production launcher and local release gate — 10 October 2026

The user selected **Production launcher and release checks** as the next two local milestones. Both are implemented and checked within the existing JalSetu project. This adds release validation to Phase 8 and a tested local fallback to Phase 10; it does not renumber the original phases or complete their cloud/submission gates.

## 1. Production launcher — complete locally

**Start JalSetu.cmd** now runs `pnpm start`: build the existing frontend, then serve the built app and existing API from one Node process at **http://127.0.0.1:8787**. Keep the terminal open; Ctrl+C stops the app and its workers. The default saved-data files remain `local-state/projects.json` and `local-state/operations.json`.

The development path remains `pnpm dev` at port 5173, using the API at 8787. Stop that copy before starting the built app. A second server on an occupied port exits with a readable message. Do not run two instances against the same saved-data folder.

Only the built entry page and supported assets are loaded for web serving. Source files, saved data, environment files, cloud configuration and path traversal are unavailable. The built document restricts connections to its own origin. The local route remains example-only and uses the existing deterministic planner; no cloud configuration, routing or AI call is enabled by this launcher.

Installed Node, pnpm and Python dependencies are required. The launcher builds locally without installing packages. This is a production build served on loopback, not a packaged desktop installer or public hosting deployment.

## 2. Release/restart checks — complete locally

`pnpm check:local` runs lint, the full Python suite, CSV/storage/operations/exports/projects/metrics/revision/IST/guide checks, then builds and runs the real isolated release check. It passed with **167 Python tests** and the three existing SWIG warnings.

`pnpm test:release` also runs independently. It starts the actual production server on an automatically assigned loopback port with a unique temporary state directory. It never points at the user's normal saved runs. Its five acceptance groups cover:

1. Built HTML, JavaScript and CSS, HEAD responses, same-origin connection policy, forbidden file/configuration paths and encoded traversal. A duplicate start exits with a readable port-conflict message.
2. An invalid-input job reaches `failed`, publishes no routes and releases the single calculation slot. A subsequent four-strategy comparison completes; retries do not create duplicate jobs and competing submissions receive busy responses.
3. Actual approval → loading → delivery → vehicle failure → explicit 300-L recovery → point closure → checked revision approval. The original request and exact depot/reported/stranded totals remain accounted for. Project archive keeps the operation accessible.
4. Real process restart preserves the full operation, Unicode project, archive state and write receipts. An old-version exact retry remains idempotent; a new stale write is rejected. Project restore succeeds. Transient job-cache entries intentionally disappear.
5. A corrupt saved file stops startup without being reset. Restoring the isolated test snapshot allows startup and identical operation reads again.

[Release evidence](audit/local-release-check-2026-10-10.json) records the final measured duration, acceptance groups and saved-operation digest. This is software validation with synthetic resources, not field feedback or a public workload benchmark.

## Browser evidence

The actual `pnpm start` path was launched at port 8788 with a separate preview state directory so the existing development server and its saved runs were left untouched. The built interface passed welcome → explicit rules → planning → approval → loading → a 700-L delivery report. The guide completed with 7,000 L at the depot, 4,300 L onboard and 700 L reported delivered.

The production printable-instructions control returned a completed download and a 5,295-byte saved file. Saved bytes contained readable resource names and IST times without the raw input-hash field. The browser returned no console errors in the final check. [Built-app proof](screenshots/production-journey-2026-10-10.jpg) shows the checked journey.

## Remaining original gates

- Phases 1, 2, 6, 7 and 8 have checked local acceptance for the selected example/depot workflow and deployment-only scope. Phase 7 uses deterministic explanations; the user excluded AWS routing/AI calls and customer JSON exports.
- Phase 0 retains deferred account/publication/operating choices. Phases 3 and 4 still need actual AWS deployment and live acceptance. Phase 5's external road/context integration remains a separate choice; the current release keeps its labelled synthetic matrix.
- Phase 9 video/submission/public publication is excluded by the user for now. Phase 10 local fallback and release checking are ready, but no submitted tag, deployed monitor, final submission freeze or cloud cleanup is claimed.

No AWS resource, paid call, account change, video, submission, public publication or new learning gate was introduced. No external participant or field outcome is claimed.
