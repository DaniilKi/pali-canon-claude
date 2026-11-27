# Five-source Apadāna intake

This development candidate adds five first indexed, complete publisher-edition English choices. It preserves the previous 375 choices and every canonical locator, bookmark, note and export format. It does not include the separate proposed 389/390 boundary repair.

| Publisher poem | Canonical identifier |
| --- | --- |
| 381 | `tha-ap383` |
| 383 | `tha-ap385` |
| 384 | `tha-ap386` |
| 385 | `tha-ap387` |
| 386 | `tha-ap388` |

The source is Jonathan S. Walters / Whitman College, *Legends of the Buddhist Saints*, pinned at publisher revision `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`. Its specific 2017 CC BY-NC-SA 4.0 notice controls over generic site metadata. Publisher wording and translator notes are fetched from that pinned source, not bundled. Existing rights, scope and alignment holds remain in place.

Source review verified 43 body paragraphs, 20 notes, 28 Pāli quotations and 13 page boundaries. Publisher 384 note 4 ends with an incomplete parenthesis: the original is retained with a visible qualification; nothing is invented to complete it. The chapter heading on 381 is separately owned, note-free paratext. Completeness refers to the publisher edition and does not claim a line-complete translation of the VRI recension or approval of the whole chapter.

The catalogue contains 380 Apadāna choices (40 Therī, 340 Therā), with 2,963 whole-unit translation links overall. Actual CLI coverage is 1,859 direct and 2,282 including inherited links. The public stdio MCP reports 1,833 direct and 2,256 including inherited of 8,445 member-aware records. These are different accounting views, not contradictory totals. Canonical coverage remains 8,544 records in 61 books; partial and shared-source totals are unchanged.

Source approval, original-to-parser parity, a rebuilt catalogue, compilation and the full catalogue audit have passed locally. Runtime inventories, package installation, browser flows and exact-commit native CI have distinct acceptance receipts and must also pass before dev integration. Consult the branch and actual CI receipts for release status; this document does not declare production updated.

The fixed current-380 authority reuses the sealed pure 375-source decoder and five independent source objects. It validates actual current runtime data rather than projecting the application back to 375. Historical expectations and all existing test methods, assertions, bounds and required CI gates remain intact. Source-only evidence is in `docs/evidence/apadana/english381-386-five/`.

Useful checks include `npm run build`, `npm run audit:data`, the focused `tests/thera381-386-five.test.mjs` source/API cases, retained seven-source acceptance, and the mandatory CI suite. Source-enabled tests require the separately pinned publisher checkout; tests must not substitute invented wording or silently treat a skipped source check as acceptance.

Automated browser tests and device emulation do not establish physical-phone or tablet acceptance, human screen-reader usability, or behaviour inside a signed-in external host. Those manual checks remain explicit. Main and production are outside this dev-only intake.
