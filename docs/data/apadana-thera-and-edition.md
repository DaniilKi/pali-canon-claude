# Therā source batch and reviewed-edition navigation (D247)

D247 adds **twenty complete publisher-edition poems**, Therā publisher11–30, explicitly reviewed against canonical `tha-ap13`–`tha-ap32`. All forty earlier Therī profiles and Pāli sequences remain unchanged. These are complete poems in the publisher’s edition, **not line-complete VRI translations, all Therā poems, or complete Apadāna English coverage**.

## What the assessment found

All four Therī chapter summaries, the final collection summary, prefaces and separately owned notes were already present. There was no justification to invent more apparatus. The actual reader gap was navigation: the correct forty-poem English catalogue led to isolated reading pages, with no next/previous reviewed-edition or chapter-summary source controls. Reproduction at390/1280px confirmed the gap without retrieving English.

In parallel, source research ranked the next useful corpus opportunities. The chosen two Therā chapters provide twenty coherent new choices with327printed stanza entries and153notes. The first Therā chapter has much longer sources and more apparatus, including229Sāriputta notes and third-party audio metadata; the opening Buddha/Pacceka texts have distinct source contracts. Previously investigated Vinaya candidates still need accessible raw artifacts and full recension/markup work; exhausted ATI/Milinda and other held candidates do not become approved merely through ranking. [Primary-source ranking](../evidence/apadana/THERA_RANKING.json).

## Source authority and scope

The sole source remains `apadana-translation/apadana-site` at `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`, files `src/_poems/chapter-3/poem-011.md` through `poem-030.md`. Twenty poem blobs, six rights artifacts and the category routing file were independently checked. Review the [first selected poem](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-3/poem-011.md), [last selected poem](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_poems/chapter-3/poem-030.md), [official About grant](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/src/_pages/about.md) and [licence](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/LICENSE.md). The same explicit **CC BY-NC-SA4.0** translation grant applies, with Walters/Whitman attribution, source/licence links, declared changes, share-alike terms and no implied endorsement. Generic site metadata does not relax it. No rights to audio or other third-party content are inferred.

Publisher and canonical numbers are not interchangeable. Canonical1/2 are Buddha/Pacceka works in other publisher categories; every new mapping was checked by complete title, story, notes and colophons. A constant offset is not a rule for the unreviewed catalogue:559publisher Therā files do not equal563indexed canonical Tha records.

[Source review](../evidence/apadana/THERA_SOURCE_REVIEW.json), [independent extraction goldens](../evidence/apadana/THERA_GOLDENS.json), [source activation review](../evidence/apadana/THERA_ACTIVATION_REVIEW.json). English bodies, notes and paratext remain live-only. The package contains metadata, integrity hashes and original numerical labels, not those texts.

## Finite extraction and original differences

A separate Therā data module and parser dispatch by exact profile membership and fixed chapter/path, never by a shared poem number. The old forty Thi objects remain frozen and unchanged. Shared presentation helpers preserve their prior behaviour; the new family alone additionally removes the reviewed local definition and abbreviation-link wrappers while retaining their words.

The batch contains327printed stanza entries,387body paragraphs and153poem notes. Publisher28/Uttiya has no note definitions and exactly zero notes. Preserve the malformed source19suffix `(10 [793]`, duplicate local6 in28, combined entries, global-only stanzas and unmatched emphasis. No numbering or editorial uncertainty is silently repaired.

The source17third-recitation ending is separately owned **after the poem’s two colophons**. The source30fourth-recitation ending follows its separate chapter summary. Both own zero notes and retain exact positions; they are not invented before-stanza divisions. The two chapter summaries also own zero notes. Readers show no empty apparatus-note headings. Source30’s summary retains its original two paragraphs, including its chapter closing in the nine-line paragraph.

Keep explicit lexical and interpretive differences visible: Subhūti’s homeless/householder and forest-dweller readings, Upavāna’s lamp, umbrella and speaker differences,500versus75wheel-turning reigns in the precept poems, omitted half-stanzas, title variants and translator uncertainties. Publisher summary20states137against VRI’s stated138/actual140numbered stanzas; summary30states185against188actual VRI stanzas. These are attributed edition differences, not defects to correct by generating words. Only substantive stanzas enter quotation matching; titles, notes, prefaces, both summaries, recitations and colophons stay outside it.

## Boundary, commentary and private-position repairs

Original VRI root/commentary XML and all compact blocks, including notes/pages, were independently verified. Two atomic boundaries change:19/20at2364→2360, and23/24at2671→2667. Only four canonical metadata records receive `apadana-thera11-30-v1`; all8,540other units, all61source books and all prior forty Thi profiles/Pāli remain unchanged.

A separate concrete misattribution was also found: commentary passage8918opens Raṭṭhapāla but was attached to Upasena19as well as its correct owner20. Remove only the false19edge, preserving the passage, all words, correct20association and every other association. Global accepted associations change16474→16473; passage and text-coverage counters remain unchanged. The derived parallels rebuild adds five now-unambiguous commentary citations; these are paragraph/range-start links, not guaranteed exact quotation anchors.

Aligned19commentary now has7segments rather than39. Its source exposes an exact tuple-derived locator revision while keeping the authentic VRI commit. Saved/continued old Pāli and commentary locators refuse before replacement words, including vanished commentary `/c8`–`/c39`. Widget preflight checks the selected commentary mapping before exact-anchor lookup and emits that pin in read/context/continuation arguments. The same change corrects acceptance of the already-existing SN21commentary pin; its namespace and all unrelated source versions remain unchanged. Compact pins fit the existing native-tool schema; it is not widened. Private notes, drafts and exports remain local and are never rewritten or silently rebased.

[Atomic repair evidence](../evidence/apadana/THERA_REPAIR.json), [preservation evidence](../evidence/apadana/THERA_PRESERVATION.json). Historical receipts explicitly reverse these four canonical records and the sole commentary edge before the earlier D246/D245/D244/D243 chains; old evidence is retained.

## Reader experience

The existing Study & sources panel gains a default-closed disclosure containing separate reviewed Therī and Therā edition navigation: next/previous reviewed poems, a compact chapter-grouped selector, and an approved chapter-summary source link. Families remain isolated. Every destination comes from a literal reviewed profile and an exact source/locator pin; unreviewed IDs and forged revision/terms are refused. There is no new route grammar, MCP tool, storage schema or automatic English download. Existing navigation, focus and private-draft safeguards apply.

The Therā selector is explicitly a reviewed subset. No controls imply that publisher1–10or31onward are approved. New post-poem/post-summary recitation captions preserve their actual positions; widgetv22 also preserves the new commentary pins.

## Measured gain and remaining work

Whole publisher-edition links become **2,643**: DT1,270, ATI1,160, Ānandajoti153, Walters60(40Therī+20Therā). Indexed direct/inherited whole coverage is **1,539/1,962**; grouped member-aware coverage **1,513/1,936**. Partial22, shared12/110subjects, shared-only22 and daily eligibility1,288 remain unchanged.

Other source/rights holds remain. The remaining539publisher Therā files and opening Buddha/Pacceka material are unapproved. A pre-existing Thag16.4boundary observation is a separate review lead, not an automatic repair in this batch. Physical-device, human assistive and specialist recension acceptance remain open; automated source and browser checks do not establish them.

Reproduce with the pinned official checkout(40Thi+20Therā+6rights+categoryrouting), `scripts/apadana/build.mjs --check`, source-enabled Therā tests, commentary-locator/native-tool tests, edition-navigation tests and both new browser harnesses normal/`--a11y`/isolated-package `--server-dir`. Retain all five earlier Apadāna suites. Require independent review, full `npm run check`, smoke/evals, matching package artifacts and exact-commit CI before advancing dev. Two new20-minute groups retain existing gates:49checks configured, not success claims. Main, deployment, force pushes and outreach remain outside this work.
