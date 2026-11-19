# First indexed Vinaya English selections (D232)

Reviewed against dev `6a409114ce285d933412714520038a4771f58b8b` on19 November2026. These are two published English selections inside larger canonical Khandhakas. Neither is a whole-Khandhaka translation, a new translation by this project, or word-level alignment.

## Sources, rights and exact boundaries

Both source artifacts come from the existing official BCBS/Access to Insight repository at `45fedca341497120651efa20e756b04a13e61089`. Candidate discovery and independent source/scope review separately retrieved and byte-compared the exact files, read their complete chapter bodies and notices, and compared the selected bundled Pāli with adjacent segments. No SuttaCentral content, third-party transcription, inferred missing wording or rights-hold override was used.

| Published source | Exact bundled Pāli selection | Included and excluded material |
|---|---|---|
| [Mv6.40.1, Vinaya-samukkamsa](https://www.accesstoinsight.org/tipitaka/vin/mv/mv.06.40.01.than.html), Ṭhānissaro Bhikkhu, ©1996 | `pli-tv-kd6/195` only, VRI305 | All five publisher paragraphs: the uncertainty framing and four allowable/not-allowable principles. The preceding heading and following food-duration applications at /196 are outside the mapping. |
| [Mv8.26.1–8, Kucchivikāra-vatthu](https://www.accesstoinsight.org/tipitaka/vin/mv/mv.08.26.01-08.than.html), Ṭhānissaro Bhikkhu, ©1997 | `pli-tv-kd8/174`–`/178`, VRI365–366 | All22 publisher paragraphs: the care narrative, community obligations and four complete five-quality patient/nurse lists. The /179 colophon, /180 heading and /181 dead-monk-property discussion are outside the mapping. |

The complete page-specific provenance and citation notices explicitly supply **CC BY-NC4.0**. They accompany every retrieved excerpt; no BPS50-copy restriction or broader relicensing is inferred. The first page records a translator-supplied file for *That the True Dhamma Might Last a Long Time*. Publisher references to Horner's English volumes remain distinct from VRI paragraph numbers and Pāli Vinaya volume/page labels. The source's bracketed “[all the monks in that community]” remains the translator's addition; “dysentery” remains publisher wording, not an independent medical diagnosis. No supplied source note is omitted in either approved body.

The pinned VRI source is unchanged at `2d134ff9ef60f70a1eb03c9370580228811a3070`. Complete canonical unit block hashes, selected ref/type/text hashes, exact extracted English and full-notice hashes live in `scripts/canon/reviewed_partial_pages.json`. English bodies are fetched on demand and are not bundled into the package.

| Pin | Kd6 selection | Kd8 selection |
|---|---|---|
| Source HTML SHA256 | `352d5868754b83fdd11bc643889e3ac9ee96eafc3880c2c6cee75f61244b1546` | `631d970295145c6eac6ae98c4d01ce016fc5dea20b749db93ec54e91f779e579` |
| Extracted English characters | 914 | 5,165 |
| Selected Pāli segments | 1 | 5 |
| Complete Khandhaka translated | No | No |

## Guarded implementation

Two exact owner/path/author/licence/version profiles reuse the existing no-notes paragraph parser with finite counts5 and22. The first body permits plain paragraph text; the second permits only the publisher's balanced bare named anchors `ananda`, `patient` and `nurse`. Unexpected note markers, tags, attributes, extra/missing paragraphs or containers fail closed. Review caught that the generic selector could otherwise silently strip an added inline note; the new profiles reject that change before extraction. The earlier18 extractors and descriptors remain unchanged.

Activation verified all20 exact pinned ATI HTML files and every root/English/notice scope pin. The translation index changed only at the two previously absent owner keys. All earlier translations, all8,544 canonical records, commentaries and later-work data are preserved. The old18-row manifest hash remains `d55eab78d8820f2b9ef8c4988c936eaa17e11b51298ccb29c2b015760ff7ad36`; historical fixtures retain their original subsets and hashes.

Retrieval requires the exact translation ID and fresh `allow_partial:true` scope review. Default/translator-only requests do not imply consent. Continuation retains source/selection/prefix pins, stops at the finite English excerpt and never changes versions. The ordinary Pāli reader can show surrounding untranslated material; generic continuation is not claimed to be translated. Browser review preserves that distinction, attribution and notices.

## Measured coverage change

Partial source choices increase **18→20** and partial-only units **12→14**. These are the first indexed Vinaya translation choices; both remain partial. Whole-unit counts stay **2,538 links**, **1,434 directly covered indexed records /1,857 including inherited verse links**, or **1,408/1,831** under the grouped-member provider count. Whole-Vinaya translation coverage stays zero. The1,257-item Sutta daily pool and all12 shared publisher pages remain unchanged.

The English finder now lists1,896 records with a choice, including66 scoped-only records;1,830 have whole choices and6,284 have no indexed choice. Its Vinaya linked view contains only Kd6 and Kd8. These catalogue counts are distinct from whole-translation and independently aligned-text counts.

## Verification and remaining review

Source/scope review approved the exact selections and notices independently. Final code review, local full checks and exact-commit CI are recorded separately after the final runtime build. Browser source acquisition uses only the two immutable official GitHub artifacts, checks their hashes and serves them through an offline test-only provider preload. This verifies the pinned source/parser/UI path; it is not evidence of current live-publisher availability. No English body is written to reports or repository files.

Final independent code review passed33 focused tests with no skips, including the added-note reproductions against both actual frozen artifacts. The local full check passed1,281 tests:1,279 pass, zero failures and two existing optional-baseline skips. Both new actual-source tests were enabled with the pinned source directory; all8,544 canonical records audited with zero failures. Smoke passed34 tools/64 checks, offline evaluations195/6 network skips, documentation19. New browser acceptance passed18 checks,88 axe scans/zero violations, and18 checks from the isolated npm package. The expanded Chromium compatibility journey passed88; existing reader173, the historical18-source browser pilot260 and English finder48 passed. The finder verified all20 partial owners and66 scoped-only records. All36 packaged files matched current source/runtime/documentation bytes. These local results do not imply a future CI result; the final-commit checks remain a separate gate.

Paṭṭhāna still lacks a provenance-verified raw author artifact and extraction/full-notice pins. PTS's English commentary grant is positive, but exact digital artifact/proofreading and bilingual boundaries remain unresolved. The Chinese pilot still needs release-specific rights and bilingual review. None was activated. Broader linguistic review, physical devices, native font shaping and human screen-reader acceptance remain separate. A reproduced next accessibility issue is that actual source heading segments are visually styled paragraphs rather than semantic headings; it was left for a separate batch after prioritizing these genuine coverage additions.
