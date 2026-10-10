# Local browser verification

## Public-road evidence — 10 October 2026

The built app at localhost:8788 showed More → About the example → What we checked on public roads. Checked the North Delhi public-road rows against saved results, the synthetic reference, shorter receiving hours with 2× travel (all four options 7,800 L), and stock shortage with 1.5× travel (all four 7,000 L, with different travel/fulfilment). Source disclosure showed the actual 11:35 IST retrieval, unknown map date, OSM/OSRM/FOSSGIS attribution and example/field limits. Final warning/error log query returned no entries. No saved operation or delivery was modified.

Desktop and phone viewport overrides were inspected and reset. At the phone override the actual CSS viewport was 355 px due to existing browser scaling; page width was 341 px and the 723-px comparison table scrolled within a 260-px wrapper. Scenario controls remained usable. Saved proof: `screenshots/public-road-evidence-desktop-2026-10-10.png` and `screenshots/public-road-evidence-phone-2026-10-10.png`. These are developer software checks, not external customer feedback.

Observed 8 October 2026 in the Codex in-app browser against localhost. All resources and reports were synthetic; no AWS service was called.

## Workflow verified

- Loaded the labelled eight-point example. Site closing and loading rules initially required explicit choices. The browser exercise selected finish-by-close and parallel loading solely for testing, not as team operating defaults.
- Generated four strategies. JalSetu scheduled 12,000 litres with 4,100 litres unmet. Comparison remained reviewable and each strategy exposed its own plan.
- Verified that planning inputs were disabled during calculation. Navigation returned to the top when changing pages.
- An earlier browser pass rejected an unknown point in CSV import and previewed a valid existing-point update before explicit application.
- Approved the checked plan under `Browser verification — synthetic exercise`. Approval left all 12,000 litres at the depot.
- Reported VEH-1 loaded with 5,000 litres, then reported 700 litres delivered to SITE-6. The ledger showed 7,000 at depot, 4,300 onboard and 700 reported delivered.
- Reported VEH-1 failed at the explicit exercise timestamp `2026-10-10T08:20:00+05:30`. The ledger moved 4,300 litres to stranded stock without adding them to depot water.
- Generated a revision at that same timestamp. The checked draft scheduled 7,000 additional litres using VEH-2 and VEH-3, preserved SITE-6's 700-litre report, and displayed 8,400 litres still unmet against original requests.
- Approved the revision under `Browser verification — synthetic revision`. Approved revision 2 retained the same physical ledger and all three immutable events.
- Inspected desktop and phone layouts using requested viewport overrides of 1280×720 and 390×844. Phone DOM width and scroll width matched; navigation and the history table use their own scroll containers. Temporary viewport overrides were reset. No browser console errors were returned in the final log check.

The saved exercise remains on this computer and is explicitly labelled as browser verification. These reports are not observations of real deliveries.

## Screenshots

- `screens/desktop-comparison.jpg` and `screens/desktop-plan.jpg`: planning and comparison.
- `screens/desktop-operations-viewport.jpg`: approved revision and conserved stock, visually inspected.
- `screens/mobile-operations-viewport.jpg`: wrapped phone layout, visually inspected.

Full-page capture files `desktop-operations.jpg` and `mobile-operations.jpg` were clipped by the browser capture during viewport changes; use the inspected viewport images as visual evidence.

## Export limitation

Clicking the CSV export produced no download event within the browser automation timeout; no matching file was found in the Downloads folder during the first check. The local CSV serialization checks pass, but successful browser saving of CSV, printable HTML and evidence JSON is **not verified**. This remains an acceptance item for a regular browser. It is not presented as a confirmed successful download.

These checks supplement automated tests; they do not prove every feature or the full specification is complete.

## 10 October next-phase browser check

The example comparison and five resource children completed in the updated browser. The extra vehicle tied scheduled litres and increased travel, which remained visible. Source metadata showed no fabricated public retrieval time and explicit missing weather/population. A fresh approval/loading/700-L cumulative report/failure/revision preserved 4,300 L stranded and 700 L reported; old/new quantities, vehicles and service times displayed correctly. New wide tables remain inside scroll wrappers at a 390px phone viewport; the override was reset. Proof images are in `docs/screenshots/phase-5-sources-2026-10-10.jpg`, `phase-6-revision-difference-2026-10-10.jpg`, `phase-7-scenarios-2026-10-10.jpg` and `phase-7-phone-2026-10-10.jpg`. These are developer smoke checks, not external coordinator feedback. The earlier browser file-saving limitation remains.

## Superseding local recovery check — 10 October 2026

The [local recovery checkpoint](local-recovery-completion-2026-10-10.md) records completed browser saving of the delivery CSV and printable HTML, and saved-byte checks. Those two customer exports no longer have the saving limitation reported above. A dedicated saved browser run also passed closure → excluded revision approval → explicit reopening → restored revision approval, with 12,000 L remaining at the depot and both reports preserved. Desktop/phone evidence and API snapshots are linked in that checkpoint. This is software validation, not external user feedback or cloud acceptance.

## Built local app — 10 October 2026

The actual `pnpm start` path served the compiled interface and API at port 8788 with a separate preview state directory. The guided journey passed welcome, explicit rules, planning, approval, loading and a 700-L delivery report, with 7,000 L depot/4,300 L onboard/700 L reported. Printable instructions saved as a real 5,295-byte HTML file with readable names and IST times. Console errors were not returned in the final check. See [production/release checkpoint](local-release-readiness-2026-10-10.md) and [proof](screenshots/production-journey-2026-10-10.jpg). The original developer server and normal saved data were not modified.
