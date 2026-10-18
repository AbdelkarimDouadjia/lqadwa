# LQADWA Android — quiet momentum

The native app should feel like a small, useful companion, not a compressed landing page. A compact toolbar, a stable bottom navigation bar and one clear primary action establish predictable movement. Search, reservations, maps and account settings remain separate destinations. Pharmacy controls stay inside the pharmacy workspace.

Warm ivory (#F6F5F0) gives the light theme a softer foundation. Deep ink (#19352F) carries headings, teal (#08776B) identifies primary actions, and pale sky (#DCEAF8) and apricot (#FFE2CC) distinguish discovery and scanning. Accents are supporting surfaces, never the only indication of meaning. The dark theme uses deep green-black surfaces with mint text accents rather than washing every element in blue.

Native system typography preserves Arabic shaping, font scaling and familiar text input. Titles use confident bold weights; body text stays at readable 16sp. The existing rounded brand mark remains consistent. An original clay pharmacy illustration belongs only to welcome: it is decorative, never presented as real inventory or a registered pharmacy.

Motion expresses a destination change, not a network refresh. Short fade-and-rise transitions respect both the Android animation scale and the app's reduced-motion preference. Native Material ripples provide press feedback. No looping ornament, forced carousel or additional permission prompt is introduced.

Forms stay native. Sign-in becomes a full-screen task with a normal Back action, while confirmations and filters remain dialogs. The map appears before route controls, with enough visible area for panning. A compact action grid replaces the search screen's stack of equally weighted buttons. Roles, consent, OCR review and server authorization are unchanged.

Account now opens an in-app, numbered three-step service guide. It explains medicine/location search, pharmacist confirmation and two-hour pickup, then the required in-person handoff—without implying delivery or online payment. The guide keeps the same 220 ms destination transition, respects reduced motion and returns to Account with Android Back.

```
[ rounded mark / destination             theme | language ]
[ title / short guidance                                  ]
[ medicine + area + primary search                        ]
[ scan illustration/action       | nearby map action       ]
[ catalog / filters                                       ]
[ Search       Reservations       Map        Account      ]
```

Implementation uses Java, existing Material components and MapLibre. The web-focused shadcn and design-taste skills inform hierarchy only; React components and website composition are intentionally not imported into Android. Canvas design informs this art direction and the welcome artwork. Verification must include release compilation, lint and actual native screen inspection; an emulator is not a physical-phone test.

## Artwork

Generated with the built-in image-generation tool, generation mode, 15 October 2026. Original PNG: `C:/Users/pc/.codex/generated_images/01a0ca8a-800c-7be0-b296-98c4080cc8ea/exec-c6424c4c-7bb5-4a06-b689-aebcbeb70232.png`. Optimized app asset: `android/app/src/main/res/drawable/welcome_pharmacy.webp` (30,692 bytes). Visual inspection: clean cross silhouette, gentle path and blue location pin; no lettering or implied real pharmacy identity.

Prompt: “Original polished editorial 3D clay illustration for the welcome screen of LQADWA, an Algerian pharmacy-finding Android app. A small ivory neighborhood pharmacy with a deep teal cross, pale apricot path and sky blue location pin; warm soft lighting and tactile matte materials. Ivory #F6F5F0, teal #08776B and #173B36, sky #DCEAF8, apricot #FFE2CC. Landscape 3:2, generous breathing room. No people, words, UI, phone mockup, medicine brands or watermark. Decorative onboarding illustration, not an actual pharmacy.”

The installed ui-ux-pro-max search-script path is a 34-byte redirect file with no executable scripts at that location. Its mobile design and accessibility checklist was applied directly instead.

## External visual research

I reviewed public Dribbble concepts for their healthcare color restraint, compact medicine search, map-first pharmacy discovery and readable card hierarchy: [PharmaNova](https://dribbble.com/shots/27146214-PharmaNova-Modern-Online-Pharmacy-Mobile-App-UI) and [PharmaVite](https://dribbble.com/shots/26942512-PharmaVite-Pharmacy-Finder-Delivery-App-UI). These are visual references, not assets or copied screens. LQADWA deliberately removes checkout and delivery patterns and instead emphasizes pharmacist confirmation, an expiring pickup reservation, and directions for in-person collection.
