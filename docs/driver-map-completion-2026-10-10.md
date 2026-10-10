# Driver map and Google Maps directions - 10 October 2026

The user selected **show the map and stop list, then open Google Maps for directions**. This extends the existing application; no AWS deployment, paid API or live GPS tracking was added.

## Customer workflow

1. Create a checked plan, or open an approved run in **Deliveries**.
2. In **Driver view**, choose a vehicle. Its load, ordered delivery stops, litres and estimated IST times remain visible.
3. Select **Load street map** to display OpenStreetMap tiles, a depot marker and numbered stops. The dashed line is the stop sequence, **not a road geometry**. Only that vehicle's scheduled points are shown.
4. Select **View route** for a short route, or open numbered route parts in order for a longer route. Parts preserve every stop and the return to the depot, with at most three intermediate waypoints per link for mobile browsers.
5. Each stop also has its own directions link. Approved operator-entered runs with recorded loading offer **Navigate to this stop**, using Google Maps' current-location handling. Drafts, unloaded vehicles and examples offer previews. Example coordinates must not be used for an actual delivery.
6. Download **vehicle instructions** for readable, mobile-openable HTML with ordered directions and the return link. The file can be shared manually with the driver; a loopback JalSetu URL is not a public or phone-accessible driver portal.

Opening directions does not report loading, completion or location to JalSetu. Reported litres remain separate. The user chooses which stop to navigate to; there is no automatic inference of the driver's current position or next unvisited point.

## Operational protections and limits

- Failed vehicles, completed trips and routes containing a currently closed point withhold directions in the current view and newly generated instructions. Unrelated point closures do not block other routes. Previously downloaded files cannot update themselves; they explicitly require checking the current approved revision and point availability.
- Missing, non-numeric, non-finite or out-of-range coordinates prevent directions for the whole route. A missing point is never skipped or replaced by an ambiguous name search.
- Google Maps computes its own road paths/times. These can differ from the stored planning matrix and do not update the checked plan. Driving directions do not guarantee tanker clearance, road permissions or unloading access.
- The map is opt-in. Visible tiles are requested directly from `tile.openstreetmap.org` with attribution, normal browser caching, no prefetch/offline download, and an origin-only image referrer. Links send selected coordinates to Google only when opened. No API key is used.
- OpenStreetMap's public tile service is best effort. A failed tile request leaves the stop list and external directions available with a readable message. Production usage must respect the provider policy; no service guarantee is claimed.

## Verification

`pnpm check:local` passed: 237 Python tests, lint/typechecks, frontend/customer checks, driver-direction checks and five real-process release/restart groups. Subsequent final frontend changes were built and the release gate rerun. New checks cover 1-20 stops, complete ordering across phone-safe parts, depot return, exact leg endpoints, current-location navigation, invalid coordinates, failure/return/closure gating and printable draft/example safeguards.

The initial production browser check found that the local server's image security policy blocked map tiles. The fix allows only the selected OpenStreetMap image host; script and API sources remain self-only, and page-level referrer protection remains. A release regression checks these boundaries. After restart, actual street tiles loaded with accessible depot/stop markers and no tile warning. Google Maps was opened with one synthetic part containing all declared intermediate coordinates in order; no navigation permission was granted or field run performed.

Browser checks exercised saved-run restoration and vehicle switching, a 390 x 844 phone override with no page overflow, and an actual instruction download. In the final phone check, browser scaling produced a 355-px CSS viewport with a 341-px document; all five markers for the four-stop vehicle remained in view. The final default preview loaded six street tiles without a warning; no warning/error console messages were returned. The final viewport override was reset. AWS and actual operational acceptance remain pending.

The downloaded example HTML was inspected: 9,907 bytes, 15 route/leg links, a depot return, mobile waypoint bounds, example preview labels and no current-location navigation or scripts. [Saved browser screenshot](screenshots/driver-map-2026-10-10.jpg) and [downloaded instructions](audit/driver-instructions-2026-10-10.html) are local development evidence, not an external-driver study.

## Sources

- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): keyless directions, ordered waypoints, platform limits and navigation/preview behavior.
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/): attribution, browser identification/referrer, caching, no bulk/offline collection and best-effort availability.
- [Leaflet documentation](https://leafletjs.com/reference.html): map, layers, markers and tile options. Leaflet 1.9.4's BSD notice is included in `NOTICE.md`.

The implementation uses the existing coordinates and selected/approved snapshot. It does not replace the stored road evidence or change allocation, approval, reporting, conservation or replanning rules.
