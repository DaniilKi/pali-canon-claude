# English Khuddakapāṭha commentary candidate

Assessment on 6 November 2026 for [issue #36](https://github.com/DaniilKi/pali-canon-claude/issues/36). **Research only: no English commentary text, provider or translation link has been added.**

## Edition and provenance

The [candidate PDF](https://classicaltheravada.org/uploads/short-url/qR4bmqifCifXa5RIjsfsNaPkw5c.pdf) identifies Ñāṇamoli, PTS Translation Series 32, Oxford 2005, first publication 1960 and reprints in 1978, 1991, 1997 and 2005. The web reader reports 387 PDF pages. PTS's [catalogue](https://palitextsociety.org/product/the-minor-readings-and-the-illustrator-of-ultimate-meaning/) independently identifies the translation and commentary, including a 2005 edition and a later 2015 printing. This supports the work's identity, not this copy's completeness.

The exact attachment is linked in [forum post 17](https://classicaltheravada.org/t/please-help-live-list-of-pali-commentaries-english-translations/125), by RobertK on 24 April 2022. The uploader says it came from Scribd; the attachment name mentions 1960 and compression. That is a traceable third-party chain, not a publisher-supplied master or proof of unchanged pages. The attachment link was followed and resolved to the candidate URL above.

The web text layer was inspected, but PDF bytes were not acquired or hashed. The executor's network policy does not admit the PDF host; no alternate download route was attempted. The web screenshot operation supplied no inspectable image pixels. Consequently, no visual proofread, page-completeness comparison, or immutable artifact pin is claimed. Extracted diacritics and numbering show defects; their origin in printing, scanning or extraction has not been established. Do not correct them by guessing.

## Rights and intended use

PTS's [official copyright listing](https://palitextsociety.org/copyright-information/) names this title in its 8 April 2021 CC BY-NC 4.0 release. This assessment reconfirmed the indexed official page; direct page retrieval timed out. The PDF's older reserved-rights notice does not by itself negate that later grant. Third-party hosting alone is also not a reason to disregard an applicable CC grant.

The [licence](https://creativecommons.org/licenses/by-nc/4.0/legalcode) requires non-commercial use, retained attribution and supplied notices, a licence link, and identification of modifications. An approved transcription would need its own source and licence record, distinct from this repository's MIT code. The existing project prohibits paid features using non-commercial sources. Distribution through general-purpose AI clients does not by itself establish that every downstream use is non-commercial; source-specific notices must survive retrieval and packaging. No additional permission letter is presumed necessary for a use already covered by the grant, but the proposed delivery and source-policy checks still need to be completed.

## Candidate alignment for review

English chapter I §§9–16 occupy printed commentary pages 4–5, PDF pages 48–49 (one-based). Section II starts at §9; §17 starts before the end of page 5. Bracketed Pāli page references are separate from English paragraph numbers. Translator footnotes must remain separate.

The following locators refer to the **existing bundled Pāli**, not imported English. Prefix each `cN` with `commentary:s0501a.att.xml/`. The book is *Khuddakapāṭha-aṭṭhakathā*, work *Paramatthajotikā I*, pinned to VRI commit `2d134ff9ef60f70a1eb03c9370580228811a3070`.

| English candidate | Bundled Pāli candidate | Boundary constraint |
|---|---|---|
| §9 | part of c22, then c24 | c22 also ends §8; exclude that opening sentence and the intervening c23 heading |
| §10 | c25–c28 | Four complete verse segments |
| §11 | c29 | Five introductory questions |
| §§12–15 as a group | c30–c31 | Several English paragraphs share c30; the quoted procedure continues in c31 |
| §16 | c32–c33 | Includes the introduction's closing sentence |

This is a plausible small **many-to-many** candidate, requiring independent Pāli/English review and proofread English before adoption. It is not a verified concordance. The Pāli chapter heading is c34 and §17 begins at c36, outside the proposed selection. §9 needs a partial-segment boundary; do not round it out to all of c22. §§11–16 offer a smaller whole-segment starting point.

These passages occur in the Pāli introduction before `1. Saraṇattayavaṇṇanā`, unlike the English section arrangement. Their VRI paragraph fields are unnumbered. Current `get_commentary` for `kp1` reports no aligned passage; direct book reading exposes these segments without asserting root alignment. English §12 must never become `kp1/c12`, a VRI paragraph 12, or a root-text translation by numerical analogy.

## Adoption gates

1. Acquire a permitted, durable copy through supported access; retain bytes, SHA-256, complete front matter and provenance. Compare the proposed pages against a reliable printed or publisher copy and inspect page images.
2. Proofread the English, mark corrections, retain editorial notes separately, and have an independent bilingual reviewer confirm the grouped and partial boundaries against Pāli. Record edition variants rather than silently harmonising them.
3. Finish all five source-policy checks, including intended non-commercial delivery, notices and any publisher request about AI use. The licence listing is positive rights evidence; it does not certify this file's fidelity or every delivery mode.
4. Only then design explicit commentary-translation identifiers and guarded mappings, with rejected-boundary and continuation tests. Keep English commentary distinct from canon, Pāli commentary and translator notes. Audit the resulting package and retrieval before counting coverage.

Issue #36 remains open. This narrow lead does not establish English coverage for the rest of this commentary or other Aṭṭhakathā works. No publisher or reviewer was contacted.
