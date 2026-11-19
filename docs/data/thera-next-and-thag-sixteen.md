# Ten Therā sources and corrected Theragāthā boundaries (D248)

D248 adds ten first indexed English choices, publisher Therā poems31–40, individually matched to canonical `tha-ap33`–`tha-ap42`. The previous sixty Apadāna profiles, source choices and Pāli readings remain exact. Separately, two source-backed boundary corrections fix three Theragāthā records. English poems, notes and chapter wording remain live-only. This is complete **publisher-edition poem** coverage for the selected files; it does not establish line-complete VRI translation or full Apadāna coverage.

## Original sources and rights

The official `apadana-translation/apadana-site` revision stays `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`. Review compared all ten complete originals, their notes, six rights artifacts and category routing, and the full original VRI Apadāna XML. The literal title/story/colophon comparisons approve these ten mappings; a numerical offset is not authority for any other file.

Primary artifacts: [publisher31](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-3/poem-031.md), [publisher40](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-3/poem-040.md), [About](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_pages/about.md), [licence](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/LICENSE.md). The explicit Walters/Whitman **CC BY-NC-SA4.0** translation grant, attribution, source/licence/change links and no-endorsement statement remain. Generic site metadata does not relax those terms. Publisher35 has audio metadata; recording rights are outside this review, and the app neither fetches nor displays it.

Two independent extractions agree on111 printed stanza entries,141 body paragraphs and53 original poem-note definitions. The metadata-only [goldens](../evidence/apadana/THERA_NEXT_GOLDENS.json), [source findings](../evidence/apadana/THERA_NEXT_SOURCE_REVIEW.json), [rights](../evidence/apadana/THERA_NEXT_RIGHTS.json), [preservation](../evidence/apadana/THERA_NEXT_PRESERVATION.json) and [independent scope approval](../evidence/apadana/THERA_NEXT_SOURCE_APPROVAL.json) record the exact inputs. Publisher text remains outside the package.

## Presentation and edition differences

The finite Therā parser preserves publisher31's capitalized closing legend,32's original “This” opening of its speech colophon,33's completion typo and34's two combined eight-line entries. Publisher40 has exact paired c/cc diacritic displays in its poem and chapter apparatus. The reviewed display form is retained; arbitrary HTML is refused.

Publisher31's chapter preface remains separate from the poem and has zero notes. Publisher40's chapter apparatus also owns zero notes and binds root blocks3475–3480, refs `tha-ap42/10`–`/12`. This includes the canonical chapter colophon: VRI closes the chapter before giving its summary, while the publisher places the summary before its chapter closing. Both original orders remain explicit. The summary's stated112 verses differs from VRI's113 numbered chapter stanzas; it is not a coverage certificate.

The individual findings retain substantive differences as well as typographical ones: source32's broad power-element wording beside VRI's specific fire element; publisher35's boiled rice beside VRI's Buddha accepting with his own hand; source38's thirty reigns beside VRI's three and its enemies/weapons difference; original uncertain cross-references and title variants. No assistant-generated wording reconciles the editions. Titles, notes, summaries, prefaces and colophons remain outside stanza quotation evidence.

The existing closed edition-navigation control now offers forty Therī and thirty reviewed Therā poems, grouped by the actual reviewed chapters. It opens no English automatically, retains source/mapping pins and uses the existing private-draft navigation safeguards.

## Three Theragāthā records, two corrected cuts

The original VRI revision is `2d134ff9ef60f70a1eb03c9370580228811a3070`. Independent review compared all4,669 root blocks in `s0508m.mul.xml` and6,605 commentary blocks in `s0508a2.att.xml`, including recorded notes and pages. It confirmed both adjacent boundaries and the correct duplicate-name context.

| Record | Previous block span | Correct span | Correct VRI verses |
| --- | --- | --- | --- |
| `thag16.3` Telakāni |2973–3045|2973–3041|747–768|
| `thag16.4` Raṭṭhapāla |3045–3122|3041–3118|769–793|
| `thag16.5` Mālukyaputta |3122–3204|3118–3204|794–817|

Spans use an exclusive upper bound. The finite atomic helper and source-checking wrapper alter only these three metadata records, adding `thag16-3-5-v1`. All61 source books,8,541 other units, PTS ranges and existing English links remain unchanged. The [existing ATI translation](https://accesstoinsight.org/tipitaka/kn/thag/thag.16.04.than.html) identifies Raṭṭhapāla as769–793; its exact official archive artifact was checked independently. The [current dhammatalks page](https://www.dhammatalks.org/suttas/KN/Thag/thag16_4.html) retains the same three-section story context.

All439 accepted Thag commentary associations were independently recomputed: zero changes. The complete commentary dataset is byte/logically unchanged. Its unindexed opening quotations at769 and794 remain unaligned; this repair does not invent accepted commentary passages for them. Derived parallels are rebuilt against the corrected canonical metadata. [Repair](../evidence/thag/SIXTEEN_REPAIR.json), [original-source proof](../evidence/thag/SIXTEEN_SOURCE_PROOF.json), [independent approval](../evidence/thag/SIXTEEN_SOURCE_APPROVAL.json), [preservation](../evidence/thag/SIXTEEN_PRESERVATION.json), [exact inverse](../evidence/thag/SIXTEEN_INVERSE.json).

## Saved positions and reader disclosures

All77 historical relative root anchors receive an explicit mapping-version mismatch before replacement wording is read. The existing generic source-pin mechanism handles the correction; no private bookmark, note or draft is rewritten. Fresh Roman/Sinhala anchor, context, fingerprint and continuation commands use the new pin. Unchanged aligned commentary and complete root-book readers retain their authentic edition pins.

Bare `get_text` offsets have no expected-source input: they return the current mapping and its revision. They cannot identify which historical version a caller intended. A caller persisting positions must preserve and compare returned source/mapping pins, or use the versioned reader commands. Reopen old bare citations and check their printed verse or quotation; no automatic migration is claimed.

A real MCP/browser pilot reproduced a separate defect: after a valid cached English display, removing edition caveats still allowed wording to appear. Standalone, comparison and embedded readers now require exact finite `mapping_notes` and every mandatory caveat in the displayed `notes`. Refusal clears English and preserves Pāli. Widgetv23 refreshes the embedded seventy-profile table; metadata-choice shape is unchanged. Quotation extraction also refuses unknown AP selectors and contradictory scope declarations, and checks the reviewed body hash for every known source, including the legacy first ten.

## Coverage, validation and remaining work

Whole publisher-edition links total **2,653**: DT1,270, ATI1,160, Ānandajoti153 and Walters70(40Therī+30Therā). Indexed direct/inherited coverage is **1,549/1,972**; grouped member-aware coverage **1,523/1,946**. Partial22/shared12/110subjects/shared-only22 and daily eligibility1,288 stay unchanged. The boundary repair adds no English source choices.

Reproduction uses the pinned official checkout containing70 poems,6 rights artifacts and category routing, plus a separate pinned VRI checkout containing the two original XML files:

```sh
node scripts/apadana/build.mjs --source /path/to/apadana-pinned --check
APADANA_SOURCE_CHECKOUT=/path/to/apadana-pinned APADANA_OFFICIAL_CHECKOUT=/path/to/apadana-pinned node --test tests/apadana-thera-next.test.mjs
VRI_SOURCE_CHECKOUT=/path/to/vri-pinned node --test tests/thag-sixteen-boundaries.test.mjs tests/thag-sixteen-consumers.test.mjs
npm run check
```

Run both new actual-MCP browser harnesses in normal, `--a11y` and isolated-package `--server-dir` modes, retaining all previous gates. The two new20-minute CI groups bring the configured total to51; that is not a success claim before exact-commit results are checked. Independent local review, package/source exclusion checks and full audit gate the dev-only staging upload. This assignment permits pushes only to `dev/pali-reliability`; verify all51 checks on its exact commit before final completion. The integration branch remains local.

The remaining529 publisher Therā files, opening works and other source holds are unapproved. Chromium viewport/axe evidence is not physical-device, human assistive or specialist recension acceptance. Pinned-source fixture success does not prove deployed/live publisher availability. Main, deployment, force pushes and outreach remain outside this batch.
