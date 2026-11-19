# Upatissa’s question: exact Vinaya prose/verse selection (D233)

Reviewed on 19 November 2026 against dev `c7a79344a73f6d812f5275c76fafdc56f4bb347d`. This adds access to an existing published translation of twelve Pāli segments. It is not a new translation, a whole-Khandhaka translation, or word-level alignment.

## Source, rights and scope

[Upatissa-pasine: Upatissa’s (Sariputta’s) Question](https://www.accesstoinsight.org/tipitaka/vin/mv/mv.01.23.01-10.than.html), Mv 1.23.1–10, Ṭhānissaro Bhikkhu, is taken from the existing official BCBS/Access to Insight repository at `45fedca341497120651efa20e756b04a13e61089`. Two separate source/scope reviewers retrieved the exact official GitHub artifact, checked its original body and complete notice, and compared the bundled Pāli and adjacent boundaries. The independently retrieved Git blob is `3115aba53216f6d99cbf01b1c9cb282d2f7ffafd`. No other provider or inferred scripture was used.

The complete page-specific notice supplies ©1996 Ṭhānissaro Bhikkhu, CC BY-NC4.0, translator-supplied file provenance and the ATI/BCBS citation last revised 30 November 2013. Runtime preserves the complete notice and attribution. This does not clear a held source or grant commercial reuse.

The approved scope is **`pli-tv-kd1/190–201` only**: six prose segments alternating with six verse segments, VRI60–61, Pāli PTS Vin i40–42. The preceding /189 heading and subsequent /202 journey, wandering ascetics and ordination narrative are outside it. Publisher references to Horner’s **English volume4 pp52ff** remain distinct from Pāli Vin i40–42 and VRI paragraph numbers.

| Publisher blocks | Exact Pāli selection |
|---|---|
| Prose1–8 | /190 |
| Stanza1, prose9, stanza2, prose10, stanza3 | /191–195 |
| Prose11–19 | /196 |
| Stanza4, prose20, stanza5, prose21, stanza6 | /197–201 |

Retain the source’s explicit ellipsis abbreviating a previously supplied physical description, the parentheticals `(asoka)` and `(by us)`, name spelling Sañjaya versus VRI sañcayo, and published quotation punctuation. Do not reconstruct omitted wording or pretend to collate editions. No editorial notes are supplied inside this exact approved body.

## Extraction and preservation

The reserved `ati-vinaya-mv1-mixed21p6v-v1` profile permits exactly21 prose paragraphs and six freeverse blocks in the verified27-child order. Seven bare balanced named anchors must occupy their original paragraphs. Unknown tags, added notes, changed attributes, reordered/missing/extra blocks or outside wording fail closed. Each child uses the existing plain-text normalization, preserving stanza line breaks, followed by a blank-line join. This preserves wording and verse separation, not byte-identical HTML indentation.

The 15,107-byte original HTML has SHA256 `fa8b361272b360c55045a696083875a2b017443c95d1a7848831b314dd005aa5`. The extracted English is **5,452 characters**, SHA256 `5bb1fbe0b09f27c63e546b70c7510e08304fcf02135e7de6eb23fdec0cd7343d`. Full-notice, complete-root and selected-Pāli pins live in the manifest and the companion JSON receipt. English bodies remain fetched on demand and are not bundled or copied into reports.

The build verified all21 pinned partial artifacts. Only the previously absent `pli-tv-kd1` translation owner was added; all1,448 previous translation-key values and earlier20 descriptors are unchanged. The20-row descriptor hash remains `65c4a2780a628e8cd17f21c91bdb2dbde8525841832ec50b37d85a99535904cf`; the older18-row hash also remains unchanged. Historical tests use their exact prior subsets rather than changing frozen hashes. All8,544 canonical records, prior alternatives and saved identities are preserved.

Exact translation-ID and fresh `allow_partial:true` consent remain required. Continuation must preserve scope/selection and prefix pins and stops at the finite English excerpt. At the ordinary browser’s6,000-character limit this source fits on one page; tests do not fabricate a Next button. Actual MCP tests force500-character pages and reassemble the same5,452 characters. Ordinary Pāli continuation can show untranslated surrounding context and is not represented as continued English.

## Honest coverage change

Partial choices **20→21**; partial-only units **14→15**. Three Vinaya Khandhakas now have a precise English selection: Kd1, Kd6 and Kd8. **Whole-Vinaya coverage stays zero.** Ordinary whole-source links remain2,538, whole-covered indexed records1,434/1,857 including inherited verses, and provider grouped counts1,408/1,831. The1,257-item Sutta daily pool and12 shared pages are unchanged.

The English finder lists1,897 records with an indexed choice:1,830 with whole choices and67 scoped-only;6,283 have none. These are catalogue-choice counts, not independently aligned complete translations.

## Verification and remaining limits

The actual-source browser suite acquires only the three immutable official ATI artifacts, verifies their hashes and serves them through a strictly offline test provider. It checks the newly mixed body, exact source scope, consent, all wording and line breaks, finite continuation, full notice, source drift refusal, native Pāli and private unsaved note/export preservation. Reports contain metadata and hashes, never publisher bodies. These checks establish the pinned artifact/parser/UI path, not current live-publisher availability.

Independent code review passed83 of84 focused tests, with zero failures and one existing optional historical-baseline skip. Nine extra malformed actual-source cases were independently refused; a separate HTMLParser reproduced the complete27-block English hash without using the implementation selector. Local acceptance passed27 Vinaya browser checks,152 axe scans with zero violations,27 checks from an isolated npm package, and88 Chromium compatibility checks. Existing reader173, historical18-source pilot260, English finder48, documentation19, smoke34tools/64checks, offline evaluations195/6network skips and the isolated cross-tool evidence audit also passed. The audit followed11,983 reading commands,478 plan days and472 topics without network requests. Final full-suite and exact-commit CI evidence remain separate release gates. Automated engine/viewport and axe checks do not certify physical devices, native font shaping, professional bilingual accuracy or human screen-reader experience. Paṭṭhāna raw-source pins, PTS commentary digital-artifact/bilingual review and the Chinese pilot’s release-specific rights remain unresolved; none was activated.
