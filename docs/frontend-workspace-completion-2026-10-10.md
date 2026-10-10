# JalSetu frontend workspace redesign

10 October 2026 · local implementation and browser verification.

## Result and scope

The existing React application now has a cohesive water-relief workspace, a clearer first-use experience, linked map/stop selection, phone-friendly inputs and report review. Planning, approval, cumulative reports, closures, recovery, original-plan comparisons and exports continue to use the existing API and deterministic domain rules.

The supplied frontend brief was reviewed as design recommendations. It did not override the user's instructions: keep the project, keep implementation simple, try the example first, do not show raw JSON to customers, keep AWS prepared without deploying, avoid AWS routing/AI calls and skip video work. No framework rebuild, paid service, publication, resource creation or new frontend dependency was introduced in this redesign.

## Audit and design decisions

The previous interface had horizontal navigation, oversized introductory sections, several small text styles and a standalone driver map followed by a long stop list. Selecting a map marker did not select the corresponding list/detail view. Receiving-point input tables required considerable horizontal scrolling on phones. Comparisons needed a clearer explanation of quantity-versus-travel trade-offs. Reports were saved directly from the form.

The new design uses navy navigation, teal actions, white surfaces, consistent sans-serif typography, tabular quantities and amber warnings with written explanations. The first action remains the guided example, with explicit operating-rule choices. Native SVG artwork is labelled an illustration and contains no invented impact figures.

| Technology | Decision | Reason / trade-off |
|---|---|---|
| React, TypeScript and Vite | Keep | Preserves the working app and its production build. [React effect lifecycle](https://react.dev/reference/react/useEffect), [Vite guide](https://vite.dev/guide/). |
| Existing CSS and local SVG icons | Keep; add a workspace foundation stylesheet | Creates a consistent shell and component states without a framework migration. Existing domain-specific styles remain; a later cleanup could remove obsolete overrides. |
| Tailwind and shadcn/ui | Defer | Compatible options, but the app does not already use them. Their setup adds configuration and a styling migration without resolving a missing component here. [Official Vite installation](https://ui.shadcn.com/docs/installation/vite). |
| Leaflet 1.9.4 | Keep | Existing map works with the current package/types. Add selection, keyboard handling and resize behavior in its React lifecycle. Retain attribution and opt-in tile requests. The public reference has multiple versions; use the installed package/types for compatibility. [Reference versions](https://leafletjs.com/reference-versions.html). |
| MapLibre / Amazon Location | Defer | A second renderer/provider is unnecessary for the requested map and external directions. Amazon Location would also conflict with the user's deployment-only AWS choice. [MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/). |
| Recharts / Motion / additional icon packages | Defer | Shared-scale bars, exact tables, existing SVG icons and native reduced-motion handling cover this release. No dependency or licence changes needed for this redesign. |
| Native HTML dialogs and controls | Keep / extend | Preserve semantic forms and modal behavior. Explicit focus restoration added for introductions and report review. A saved report captures the reviewed payload and conditional version. |

## Implemented workflows

- **Home and navigation:** dedicated desktop sidebar, compact phone navigation, visible example/evidence entry points, project/date/mode and operations revision context. The home illustration explains depot → stops → return. The three workflow cards open the existing steps. Empty planning screens can start the example directly.
- **Setup:** consistent step states, larger fields, priority reasons visible and request cards on phones. Cards share the same input state as the desktop table. Back/Next and explicit rule selection remain intact. Invalid/missing quantities are not presented as zero on Home.
- **Route workspace:** map beside a selected-stop detail panel and stop sequence; numbered receiving points and a square depot marker. Map clicks select the list/detail item; list clicks select and bring the marker into view. Enter and Space work on markers. Details distinguish planned quantity from reported quantity and show IST arrival/departure, request and declared priority reason. Vehicle changes reset selection appropriately.
- **Map controls:** explicit Load street map, Fit route, phone Map/Stop list switch, retained attribution and a usable list/directions fallback. Resizing invalidates the map dimensions without resetting manual zoom. A new route and Fit route are the only fit operations. Dashed geometry remains explicitly a stop sequence, not roads to drive.
- **Comparison:** shared-scale scheduled/unmet bars, readable point names and a calculated summary against demand proportional. Gains, ties, losses and missing metrics are handled separately. The normal synthetic example shows 900 L more scheduled water and 0.9 km more estimated travel; neither is described as measured field benefit.
- **Reports and disruptions:** a native review dialog lists the report type, vehicle/point, exact quantity and IST time before saving. Back/Escape before confirmation cancels without changing totals; controls and Escape are blocked while a confirmed write is pending. A nonzero stranded-water card uses amber. Existing revision checks, preserved reports and exports remain intact.

## Files and commands

Core edits: `App.tsx`, `Overview.tsx`, `WorkspaceNav.tsx`, `Setup.tsx`, `RouteMap.tsx`, `Operations.tsx`, `ExampleGuide.tsx`, `ComparisonCharts.tsx`, `comparison-summary.ts`, `driver-route.ts`, `main.tsx` and `workspace.css`, under `apps/web/src/`. The historical navigation guard follows the extracted navigation component. `test-comparison-summary.mjs` checks gains/ties/losses, exact litres and missing metrics and is included in the local gate. Earlier driver-map/export work was preserved.

From the repository root:

```text
pnpm dev                  Development app + API
pnpm start                Build and serve the normal local workspace
pnpm check:local          Complete local release gate
pnpm test:release         Build plus real restart/failure checks
pnpm test:hosting         Offline hosted-bundle checks; no AWS calls
pnpm test:comparison-summary
```

The visible preview is `http://127.0.0.1:49996/`. It uses the separate synthetic browser-check store in `work/driver-map-state`; it does not edit the user's normal saved workspace. The server was restarted after building because it caches the built frontend files at startup.

## Verification

**Automated:** the final complete `pnpm check:local` passes TypeScript, Ruff, **237 Python tests**, CSV/storage/operations/export/project/metrics/revision/time/guide/history/records/directions/comparison checks and five real-process release acceptance groups. Three existing OR-Tools SWIG deprecation warnings remain. After the final warning/dialog adjustment, `pnpm build`, `node scripts/test-local-release.mjs` and `pnpm test:hosting` were run again. These are local/offline checks, not AWS acceptance.

An initial rapid revision-cache write check failed once. Its isolated rerun and final complete gate passed; the cause was not established and no storage/backend change was made. A source-location assertion was updated after navigation extraction. Browser inspection caught and corrected a Windows text-encoding issue before the final gate.

**Actual browser checks:**

1. Introduction opens as a modal, Escape closes it and focus returns to Try the example. Setup moves focus to its step heading.
2. Missing operating rules show a readable error; no rule is silently selected. The three-step example generates a checked 12,000 L plan with 4,100 L unmet.
3. Map and list selection work in both directions; selected names, quantities and times agree. Actual OSM street tiles render. Enter and Space select markers.
4. Comparison shows the synthetic 900 L gain and 0.9 km travel cost with exact values in the table. Point names replace internal IDs.
5. Approval leaves 12,000 L at the depot. Cancelling a 5,000 L loading review leaves those totals unchanged. Confirming records depot 7,000 L / onboard 5,000 L. A cumulative 700 L delivery report records depot 7,000 L / onboard 4,300 L / delivered 700 L. The guide reaches Example complete.
6. After restarting, that synthetic saved run reopens. A confirmed breakdown preserves 700 L reported and marks 4,300 L stranded. Replanning schedules 7,000 additional modelled litres with the unused vehicles. Approving revision 2 preserves those reported and stranded quantities and displays the new routes/times.
7. Street-tile failure was deliberately induced through a separate read-only localhost test server that tightened CSP to block external tile images. The warning appears while selection, full stop sequence and Google Maps links remain usable. That temporary tab/server was closed; production CSP was unchanged by this test.
8. Desktop **1440×900**, compact **1024×768** and phone **390×844** render without page-level horizontal overflow. Earlier checks also covered a narrower 355 CSS-pixel phone viewport. A long receiving-point name wraps in request cards and selected-stop details. Phone Map/Stop list switching retains the selected stop. Manual zoom survives marker selection and desktop-to-compact resizing; measured marker separation stayed the same, allowing subpixel rounding. Fit route remains available.
9. The normal preview's final console check returned no warnings/errors. Reduced-motion styles and map options were inspected; the OS preference was not changed for a dedicated simulation.

**Contrast:** calculated normal-text ratios for selected tokens are body 13.80:1, muted 6.24:1, white primary-button text 5.47:1, sidebar 9.51:1, eyebrow 6.50:1, small step number 4.73:1 and warning 6.56:1. These checks use the [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). New controls aim for useful touch areas; the [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) informed the layout. This is not a full accessibility certification, screen-reader audit or performance score.

### Screenshots

- [Original home](screenshots/frontend-before-2026-10-10.jpg)
- [Redesigned desktop home](screenshots/frontend-home-desktop-2026-10-10.jpg)
- [Redesigned phone home](screenshots/frontend-home-mobile-2026-10-10.jpg)
- [Revised desktop route workspace](screenshots/frontend-plan-desktop-2026-10-10.jpg)
- [Phone route workspace](screenshots/frontend-route-mobile-2026-10-10.jpg)
- [Long-name phone request-card excerpt](screenshots/frontend-requests-mobile-2026-10-10.jpg)
- [Blocked-tile diagnostic capture](screenshots/frontend-map-fallback-2026-10-10.jpg)

## Demo sequence and release limits

Open Home → Try the example → Start guided example. Choose the two rules, review vehicles/requests and create the plan. Load the map and select a stop from both map and list. Compare options, review the quantity/travel trade-off and return to the chosen plan. Approve under a clearly labelled demo coordinator. Review and save example loading, then a delivery report. Optionally record a breakdown, create/approve a revision and show preserved reported/stranded water.

The demo is synthetic. A genuine coordinator dataset and field trial remain absent. Public-road research is separate from the normal synthetic example. Google Maps provides external road directions; JalSetu has no live GPS, traffic feed, tanker-access guarantee or automatic delivery reporting. The map needs internet for street tiles and is not an offline map. The local API has no production authentication. AWS deployment/live acceptance, public publication and user validation remain pending; video is intentionally excluded. No judge outcome is guaranteed by visual polish.
