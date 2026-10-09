# JalSetu design refresh · 10 October 2026

The team requested a stronger visual presentation after sharing the Beacon Night Shift site as a reference. Its homepage and public Night Board were viewed in the browser. The award claim was not independently checked. No code or assets were copied from that site.

## What changed

- The existing React application now opens with the relief-planning story and a clearly labelled planning illustration. Project setup follows in an expandable workspace section.
- A cream, teal and dark-green palette, system body typography, Georgia display headings and an original water-drop mark carry across the existing screens. No new UI library, font service or image dependency was introduced.
- Top navigation and an explicit four-step workflow replace the fixed sidebar. All six destinations remain visible on phone screens.
- Checked-plan quantities and routes precede extended computation details. Unmet quantities retain a distinct colour. The comparison legend matches the updated bars.
- An operations vehicle board reads the existing water ledger and route assignments. It distinguishes not loaded, loaded, returned and failed vehicles and shows onboard/stranded litres.
- Saved-project creation, listing, archive and restore controls remain in the existing Projects component. Missing draft quantities are marked as incomplete in the overview rather than displayed as zero.

The planner, validator, API, approval semantics, conservation rules and deployment settings were preserved. Operating policies remain explicit choices. Synthetic labels and the distinction between planning estimates and reports remain visible.

## Verification

- TypeScript checks, Ruff and the frontend production build passed.
- 156 Python tests passed, with the same three OR-Tools SWIG deprecation warnings.
- Browser: the initial synthetic acknowledgement gates loading; loading opens editable inputs with both operating rules unselected. A labelled exercise selected finish-by-close and parallel loading, generated four checked plans, compared them, approved JalSetu and recorded a scheduled example load for VEH-1.
- The resulting ledger and vehicle board both showed 7,000 L at the depot and 5,000 L onboard; delivered and stranded quantities remained zero. This was an exercise report, not a real delivery.
- The saved-project drawer opened and the existing active drafts were listed successfully.
- Phone checks at 390 and 360 pixels: page width matched viewport width. Wide comparison tables scrolled within their panels. Evidence and source hashes did not widen the page. Temporary viewport overrides were reset.
- Desktop screenshots were visually inspected. Existing browser file-saving and live AWS acceptance limitations remain pending; this checkpoint does not claim either.

## Visual evidence

- [Overview](screenshots/design-overview-2026-10-10.jpg)
- [Checked plan](screenshots/design-plan-2026-10-10.jpg)
- [Recorded vehicle board](screenshots/design-operations-2026-10-10.jpg)
- [Phone overview](screenshots/design-phone-2026-10-10.jpg)

No AWS deployment or paid provider integration was performed for this design work.
