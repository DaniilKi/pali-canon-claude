# Dasabala commentary and exact subparagraph access (D209)

Baseline: dev `682ac0d9c5a7d9b41fa50fd3c850493f95c14c64`. Review: 8 November2026. [Machine-readable receipt](dasabala-commentary-and-subparagraph.json).

## SN12.21: restore its own short commentary

The pinned VRI `s0302a.att.xml` matches all978 bundled text/PTS-page blocks; the raw XML is separately pinned. The commentary compact format has no separate variant-note field. Blocks152–155 contain the vagga title, `1. Dasabalasuttavaṇṇanā`, and the one numbered paragraph21. That paragraph states that the first discourse is a summary of the second; it does not supply the second discourse's commentary itself.

After D208's root correction, the existing source builder naturally identifies only SN12.21 as owner. There are no bold lemmas to check: its actual evidence is `paragraph`, checked0/hits0, with the matching heading as an additional independent control. The migration appends `[10,152,155,12,21,21,0,0,"paragraph",0,1427]` at14338. Every existing passage, source book and other association is preserved. SN12.22 keeps passage3334; Paccaya20 keeps3333. No commentary is borrowed or generated.

The helper validates complete source parity, both repaired roots, heading/number/evidence, neighboring associations, prior coverage and absence of overlapping passage claims before mutation. It permits its exact repaired state idempotently and emits whole input/output dataset hashes. A normal `build_commentary.py` rebuild already derives this alignment; no generalized override is added. Source wording and canonical locator revisions stay unchanged. SN12.21’s aligned commentary now emits a separate locator revision derived from its actual passage tuples, retaining the authentic VRI commit. Old plain-commit commentary bookmarks refuse before showing replacement wording; explicit current-source review does not rewrite old notes, saved references or exports. Direct commentary-book and SN12.22 locators are unchanged.

SN coverage is again1,800 aligned of1,800 numbered texts (1,954 total). The temporary D208 exception is removed; the full SN floor remains100%. Total mapped canonical records6,070, with2,474 explicit no-alignment notices. These are availability measurements, not a claim every traditional commentary is complete or independently validated.

## SN12.22: one exact substring, not the whole paragraph

[Walshe's ATI page](https://www.accesstoinsight.org/tipitaka/sn/sn12/sn12.022x.wlsh.html) translates only the concluding exhortation. It starts after the lazy/energetic contrast inside bundled `sn12.22/4`, and does not translate the closing colophon. The original segment remains986 UTF-16 code units long. The approved substring is **[229,977)**,748 units, starting at `Na, bhikkhave, hīnena` and ending before `Dutiyaṃ.`. No Pāli blocks, segmentation or source references are changed.

Partial scope version2 pins the full `{ref,type,text}` segment, exact character bounds, and the selected `{ref,type,text}` substring separately. It emits the derived `pali_excerpt` and **no `read_with` or `read_pages` command** that could imply a whole paragraph translation. The ordinary Pāli reader remains context. The browser presents the exact excerpt and explains that the surrounding paragraph and discourse are untranslated by this source. This is passage-level scope, not word-level alignment. Older clients supporting only version1 must reject the unsupported version.

A strict `ati-chapter-prose-v1` extractor selects the single chapter paragraph before the notes container, rejecting duplicate paragraphs/containers and script/style additions. It strips the seven footnote reference markers; the editorial footnote bodies remain available on the publisher page and are not returned as scripture. No publisher English body is committed to this repository.

Build activation verifies the pinned official ATI raw HTML, extracted English and complete notice. Runtime verifies extracted text and notice before output or continuation. Cache keys include extractor type; source text, notice or scope drift refuses output. Exact version selection and explicit `allow_partial` consent are mandatory. Prefix and scope hashes protect continuation, with no outage substitution. The registered source cannot become an ordinary link by deleting its scope.

### Rights

The original **©1985 Buddhist Publication Society** notice is retained, including free distribution, source-identification, complete-notice and **at most50 reprinted copies** conditions. This is not a Creative Commons licence or new permission. Every response retains the complete source notice/citation. The output identifies the extraction as a derivative and explicitly distinguishes omitted editorial notes.

## Counts and limitations

Nine verse sources plus one prose substring make **ten partial sources**, including four partial-only units. Ordinary links stay2,566; whole-English grouped coverage stays1,416 direct/1,839 inherited, and the dated sutta pool stays1,265. No new whole SN12.22 English translation is claimed. The broader24 excerpt candidates remain review leads, not confirmed errors.

Source and migration hashes, archived prior hold, scope declaration and measured validation are in the JSON receipt. D207/D208 records remain historical. No main merge, deployment, upstream availability certification or human accessibility certification is implied.

Bulk citation JSON/CSV omit `pali_excerpt.text`, retaining exact coordinates/hashes and an explicit `text_omitted` marker. They remain scripture-free indexes; native metadata supplies the actual excerpt for consent review.

## Measured verification

Independent review confirmed unchanged canonical data, prior commentary source books/passages and all nine version1 scope descriptors. Focused subparagraph/locator tests6 passed; export/documentation tests25 passed. All eight installed partial-source audit modes passed. Browser partial-source checks133 normal/133 accessibility/133 installed; bookmark checks116/116/116. Accessibility automation ran120+68 scans with zero violations, without claiming human accessibility certification. Complete source verification covers all ten pinned pages and the raw VRI commentary, with no upstream network in the browser fixtures.

The final `npm run check` passed1,074 tests (one skipped) and audited all8,544 canonical records with zero failures. The final extracted package passed all eight partial-source audit modes, and MCP smoke passed64 checks across34 tools. Exact-head CI is verified after safe dev integration.
