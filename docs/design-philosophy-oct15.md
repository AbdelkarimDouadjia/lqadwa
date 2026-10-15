# Neighbourhood Relief

Care takes a physical form: a doorway at the end of a street. The composition follows that quiet passage from uncertainty to arrival. Meticulously crafted architecture gives the eye a destination, while open space around it keeps the experience unhurried.

Mineral white, deep petrol and soft mint belong to the same material world. Light behaves like Mediterranean daylight, revealing plaster, glass and painted metal. Painstaking attention to these surfaces replaces ornamental effects with tangible detail.

Scale does the expressive work. A sentence may become a landscape; a doorway may occupy an entire frame. Small details remain exact and purposeful, the product of deep expertise rather than accumulated decoration.

Rhythm alternates between broad fields and close observation. Rounded openings refer to the passage through a neighbourhood, not floating interface ornaments. The image should feel carefully composed at every crop, with master-level execution of edges, shadows and negative space.

The reference is the final, human step of pharmacy collection in Algeria. These are commissioned conceptual illustrations, not photographs of participating pharmacies or claims about coverage.

## Implementation direction

- Requested skills: ui-ux-pro-max (accessibility/mobile checklist; installed search script link is broken), frontend-design (tokens/composition), redesign-existing-projects (audit and preserve behavior), canvas-design (this philosophy and generated PNG artwork), shadcn-ui (existing Button/Dialog/Dropdown primitives), imagegen (original raster art), design-taste-frontend (direction/inspection/critique), web-design-guidelines (current review rules).
- Direction: The sentence is the layout; seed 641364919. Existing brand palette/type roles retained. No random redraws. Showcase shortened from a 300vh pinned sequence because long compulsory scrolling conflicts with fast medicine discovery and mobile accessibility.
- Idea: LQADWA's name, "find medicine", becomes a two-line sentence with the pharmacy doorway pictured within it; its online-to-counter journey continues through the page.
- Live element: existing real approved-pharmacy directory, with city and duty filters. No mock inventory or statistics.
- Inventory: Arabic first, French/Kabyle/English, Algeria, wilaya search, original prescription at pickup, pharmacist confirmation, temporary reservation, no delivery, no medicine-sale commission, free patients, pharmacy offer through September 2027, native Android.
- Claim/proof sequence: medicine orientation → illustrated destination and real directory; request/confirmation/pickup → ordered explanation; reading a prescription → OCR with mandatory user checking; pharmacist control → stock/availability account CTA; free introductory offer → 300 DA crossed out and September 2027 deadline; questions → factual answers; support → actual email.
- Palette: mineral #f3f6f2, ink #133c37, mint #cde8dd, pale sky #e3edf1, action #175d50; dark ground #101f1d, ink #eff7f3. Existing logo retained, not regenerated.
- Type: Plex Arabic for Arabic; locally bundled distinctive sans for Latin. Keep glyph shaping and avoid Arabic letter spacing.
- Layout: poster headline / large illustration / live directory / stepped journey / two unequal illustrated feature cards / single offer / open question rows / support close.
- Motion: short hero reveal, section-specific entrances, image settle, press feedback. No scroll hijacking, endless loops, hidden no-JS content, or motion under reduced-motion preferences.

## Before inspection

The existing public page had 11 taste-inspector failures: eyebrows, ornamental numbering, gradient grid, resting shadows, thin rules, outlined cards, repeated icon cards, too few pictures, no motion, mobile heading wrapping and small text. The redesign removes these patterns instead of adding another layer of similar sections.

## Visual critique

ROUND 1
Seen in one second: the large medicine sentence and a coastal pharmacy doorway.
Idea (one sentence): the journey from finding medicine online to collecting it locally becomes a sentence and a sequence of neighbourhood views.
Live thing: city/duty filtering in the real pharmacy directory (local screenshots use isolated fixtures, never published).
Layout words by section: hero=poster / directory=list / journey=steps / tools=asymmetric-pair / pharmacy=split / offer=statement / Android=compact-split / FAQ=open-rows / footer=contact.
Scores: design 7.5 · usability 7 · creativity 7 · content 8 → overall 7.3
Caps applied: initial automated gate failures cap this round at 6.0; competitor-test creativity cap 7.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Tablet-page-01: the main action wraps into a narrow column. Give the supporting copy and action separate rows at tablet widths.
2. Mobile-page-02: the support address leaves a single final letter on its own. Add a deliberate break opportunity at the email domain and use a 22px mobile contact size.
3. Mobile-page-01: the long directory becomes a wall of boxes. Use open result rows; scope interface annotations to individual results and filters, not the whole list.

The Android 32-bit download was incorrectly classified as an eyebrow above the next section. Its actual download-link navigation now has semantic navigation markup. The six repeated map icons belonged to real directory results, not marketing feature cards. No results are hidden to pass inspection. Existing shadows are explicitly removed, not introduced. No documentary footage exists for this project; a short image-settle animation supplies motion without pretending a stock video depicts participating pharmacies.

## Asset prompt

ROUND 2
Seen in one second: medicine first, with the pharmacy doorway inside the sentence.
Idea (one sentence): a local, physical destination connects the headline, directory, journey and pedestrian imagery.
Live thing: the existing city/duty directory and its real navigation links.
Layout words by section: hero=poster / directory=open-list / journey=steps / tools=asymmetric-pair / pharmacy=split / offer=statement / Android=compact-split / FAQ=open-rows / footer=contact.
Scores: design 8 · usability 7.5 · creativity 7 · content 8 → overall 7.7
Caps applied: creativity limited to 7 because the approach is not unique to this brand; no inspector failures.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. A browser accessibility run caught the price at reduced opacity during its entrance, although settled screenshots look correct. Reproduced opacity 0.3 during motion and 1 after it. Remove opacity from text/surface entrances, retaining transforms.
2. The size-count warning remains: display, section, card, form and support roles produce eleven rounded measured sizes. Retain the fluid scale and readable product controls rather than forcing all content into five fixed sizes.
3. No documentary footage is available; retain generated conceptual pictures and their short settle motion, with a visible disclosure, rather than adding unrelated stock footage.

ROUND 3
Seen in one second: a readable, oversized promise paired with a local destination.
Idea (one sentence): medicine discovery ends at the neighbourhood counter, not a delivery checkout.
Live thing: approved-pharmacy city/duty filtering.
Layout words by section: hero=poster / directory=open-list / journey=steps / tools=asymmetric-pair / pharmacy=split / offer=statement / Android=compact-split / FAQ=open-rows / footer=contact.
Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8
Caps applied: creativity cap 7; this is an internal design review, not an Awwwards award or independent score.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. No further visible blocking defect in the desktop/tablet/mobile sheets; spacing and footer wrapping fixes are confirmed.
2. Illustrated rather than documentary imagery remains a deliberate limitation; replace with consented participating-pharmacy photography when available.
3. Kabyle needs fluent human review before relying on it for health-related instructions; no native-speaker approval is claimed.

## Verification before publishing

- Production build passed; TypeScript and source/security/branding/map/workspace/OCR static checks passed.
- ESLint: zero errors, 23 warnings (existing warnings plus deliberate, locally optimized raster img elements).
- Taste source gate: zero failures/warnings. Browser gate: zero failures, two documented warnings; 23 animated elements, four unique raster illustrations, two-line English headings at 1440/768/390.
- Chromium: four languages × two themes × four widths (320/390/768/1440), eight axe checks without violations, decoded artwork, keyboard menu, real directory anchor, reduced-motion mode, no-JS reading, public/private login layout and rounded branding passed. No live sign-ins or records were changed.
- Public artwork is four compressed WebP files (~630 KB total). Original generated PNGs remain in the local generated-images directory and ignored release/art-originals folder; prompts are below. Fonts are locally served with the included OFL licence.
- A final 320px text-line check found the French hero wrapping to three lines. Lowered only the narrow-screen fluid type floor and added a heading-line assertion to the existing four-language browser matrix.
- CI caught French navigation overflow at 1024px in all three engines. Reproduced the sign-in action extending to 1036px; moved the public compact-menu breakpoint to 1200px. Kept the existing eight-width test matrix intact.
- No schema migration, authentication-policy change, paid service or new runtime dependency. Existing signed Android 1.0.9 downloads are unchanged. Real-device, mailbox and native Kabyle acceptance remain outside this visual release.

## Generation instructions

Built-in image generation. Original editorial illustration of a fictional Algerian neighbourhood pharmacy entrance and pedestrian street, mineral-white plaster and petrol-green storefront, soft mint and sky tones, carefully constructed architectural model rendered with tactile painted surfaces, Mediterranean daylight, no people, no readable text, no medicine branding, no delivery vehicles, no logos or watermark. Wide composition with a visually clear doorway as the destination. Illustrative, not documentary; never imply this is a participating pharmacy. Secondary artwork: prescription reading, pharmacy shelving and pedestrian wayfinding in the same material language.
