# Professional visual identity — review checkpoint, 11 October 2026

The owner authorized the proposed sequence but requested a review of the visual identity **before** proceeding with Google/email authentication. The owner reviewed the navy version and requested lighter colors, a consistent page background and a compact centered closing card. This revision addresses that feedback and leaves the next UI review pending.

## Interface changes

- Pale ice blue runs from the header through the page, with aqua/periwinkle cards, dark readable type and blue actions. The hero, schematic and planning card are lighter, avoiding the previous full-width navy-to-white contrast.
- The closing call-to-action is a centered card capped at 640 pixels, with the shorter functional heading “Try the guided example.” Its mobile layout remains within the content column.
- The owner’s subsequent feedback removes the gradient from “planning,” using solid blue instead. Decorative link arrows are removed from the receiving-point card and comparison illustration. Map selection and Fit route no longer show an external-link arrow; actual destinations retain appropriate navigation cues.
- A shared, larger footer adds product context, working landing section links (or workspace navigation), a GitHub destination and a separate context row. No contact details, legal promises or signup links are invented.
- Headings describe the functions directly: water delivery planning, allocating water, comparing strategies, reviewing driver routes and revising a disrupted plan. Removed the previous slogan-style lines, including “Every litre has a place in the plan.”
- The schematic uses more legible controls and selected-stop details. Its third point was repositioned within the illustration so the detail card does not obscure it; actual coordinates, road snapshots and calculated plans are unchanged.
- AWS is mentioned naturally by a small **Hosted on AWS** note. Following the owner's correction, there is no AWS navigation item or dedicated AWS deployment section.
- The existing smooth accessible questions, guide actions and workspace boundaries remain. No new authentication behavior or cloud resource is created in this iteration.

## Verification

Typechecking, production build, guided-example progress and hosted-package checks pass. The subsequent solid-color/arrow/footer revision passes a fresh build, hosted-package and driver-directions checks. Desktop inspection confirms solid heading color and removal of the false receiving-point arrow. The expanded footer was inspected at desktop and 390-pixel phone widths; its What we do link was exercised and reached the services section. The lighter revision was built again and the hosting and guided-example checks passed. Browser inspection covers the desktop hero, centered closing card and 390-pixel phone FAQ and closing card. FAQ opening and keyboard Space closure were checked; the existing animation and reduced-motion behavior are retained. The existing public landing component is rendered by the isolated local review harness; production HTTPS/callback checks remain intact.

Preview on this computer: http://127.0.0.1:50019/ . The preview's sign-in buttons demonstrate the UI only. This iteration is not yet published to Amplify. The existing live release and original expiry remain unchanged.

## Next step after owner review

Implement the requested Google and email signup/sign-in journey using the existing Cognito foundation, preserving account ownership. Review the existing pool configuration and required Google OAuth setup before any infrastructure release. The owner accepts labelled examples if suitable public operational records cannot be obtained; no NGO data, user study or real delivery benefit is claimed.

The owner also wants AWS use represented clearly for the hackathon. Additional integrations are future scope and must serve a concrete function within the existing cost authorization. This UI checkpoint introduces no new AWS calls or charges.

## Focused navbar and delivery animation revision

The owner requested only a glass navbar and a continuously looping delivery-step illustration, then specified centered connectors and smaller boxes with larger text. The public navbar now uses translucent pale blue with backdrop blur/saturation and an opaque fallback. The delivery illustration is capped at 240 pixels, with centered boxes, 13-pixel text, glowing connectors and sequential four-second dot pulses. Decorative connectors are hidden from assistive technology; reduced-motion preferences stop the dot animation. The existing map animation is unchanged. Production build/typechecking, hosted-package checks and diff checks pass. Browser inspection confirms the glass header while scrolling and successive dot positions across repeated cycles. This is a local preview revision, not a new Amplify publication.

## Connector bounds and consistent service text

The owner requested only two further corrections: prevent the dot from appearing on a delivery box, and match text across the other service cards without redesigning their boxes. The dot now travels from 3 to 18 pixels within each 28-pixel connector; vertical clipping confines its glow to that gap, and it fades before the next box. Service headings share a size at each breakpoint, labels/body text use 13 pixels with consistent line spacing, and supporting notes use 11 pixels. Existing box widths, borders, colors, padding and layout are retained; text naturally takes the space it needs. Build/typechecking, hosted-package checks and diff checks pass. Desktop browser inspection confirms matching service text and dot positions confined to the connector gaps. This remains a local preview revision.


## Landing usability review and no invented totals

The owner authorized the supplied frontend review, then explicitly instructed: **do not add example numbers**. The landing illustration contains no invented litres, demand percentages, delivery totals or performance claims. Step numbers and stop-selection identifiers remain navigation aids; actual workspace quantities continue to come from the current input and computed plan.

- Mobile headings use 40–44 pixels at narrow phone widths, body copy uses 16 pixels, and small supporting labels use at least 12 pixels. Map labels scale to readable sizes; point buttons and workflow controls are at least 44 pixels.
- The glass header uses a single row with the logo, sign-in action and accessible menu at phone/tablet widths. Section selection closes the menu; Escape closes it and returns focus to its button.
- Plan, Review and Report update the active tab, selected-point explanation, prominent status and route presentation. Reporting uses checked markers and a dashed remaining path. Transitions last 250 milliseconds; the existing finite route drawing and Replay action remain. Stable detail/result regions and a persistent legend avoid content jumping between stages.
- One compact illustration disclosure replaces repeated nearby warnings. The schematic remains visibly distinct from calculated road routes and real records.
- Breakdown recovery now follows the main preview. The capabilities/process sections are combined into one input → plan → approve → report → replan flow. Its actions enter the existing guide/workspace; they do not calculate, approve or record an operation automatically.
- White service/evidence panels separate the light-blue page and stronger recovery panel. Four service cards share typography, border, radius, padding and icon foundations, with responsive columns and tighter section spacing. Decorative allocation bars and fabricated quantities are absent.
- Existing FAQ transitions, keyboard controls, visible focus, hover/active feedback and reduced-motion handling are preserved. There are no new decorative bitmap assets to lazy-load; the existing actual driver map remains loaded separately.

Verification: production typecheck/build, hosted-package checks, guided-example checks and five real localhost release/restart acceptance groups pass. Browser inspection covers 320, 375, 768, 1024 and 1440 CSS-pixel widths, including mobile menu selection/Escape focus return, receiving-point selection, preview stage changes, FAQ opening and keyboard Space closure, and desktop cards/footer. The narrowest preview detail and result text fit their reserved regions. Core text/button colour pairs were checked mathematically: primary text 10.58:1, muted body text 5.10:1, pale-banner text 5.94:1 and white-on-blue actions 5.48:1. These are targeted checks, not a complete accessibility audit or external customer study. Reduced-motion paths were inspected in code.

Review URL: http://127.0.0.1:50019/ . This harness renders the actual public landing component; its sign-in action demonstrates the interface only. The live Amplify URL still serves the earlier published release. Google/email authentication and republishing remain subsequent work after owner review. No AWS resources or calls were added.

## Google-auth handoff

The final targeted UI changes, public/protected routing and compact onboarding are recorded in `google-auth-frontend-completion-2026-10-11.md`. The preview now uses qualitative states and the shortened disclosure, with a real disruption scroll/highlight action. All five requested widths and anonymous/missing-configuration behavior were checked. The screenshot in `docs/screenshots/google-ui-desktop-2026-10-11.png` is the local review, not a hosted Google release.
