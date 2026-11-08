# Four Walshe excerpt selections (D210)

Reviewed 8 November 2026 against dev `e24a1eb42fff6ef39c6ced0bff619f7a8b87f6a6`. The [machine receipt](walshe-excerpt-batch.json) records original links, complete-root and HTML hashes, selected-text/notice pins, alternatives and measured counts.

Each page previously counted as a whole English translation. Complete publisher bodies and complete indexed Pāli units establish that all four are excerpts. The merged provider catalogue has no other indexed English version for any of them. We preserve useful, deliberately narrower selections rather than present their whole articles as complete discourses.

| Indexed text | Selected publisher content | Canonical scope | Material excluded from this retrieval |
|---|---|---|---|
| SN12.60 | Chapter paragraph 2 of 2 | `sn12.60/3` | Condensed opening narrative and later root teaching/similes |
| SN22.87 | Paragraph 11 of 11 | `sn22.87/4` | Heading, editorial summary, earlier translated dialogue and later untranslated root material |
| SN35.244; publisher SN35.203 | Paragraph 1 of 4 | `sn35.244/2` | Ellipsis and disconnected/condensed later selections |
| SN56.22 | Single preformatted verse container | `sn56.22/5`–`/8` | Opening prose and editorial See-also links |

SN56.22’s last bundled verse segment includes the original inline `dutiyaṃ;` colophon. It remains unchanged and is explicitly identified as untranslated paratext. The source covers four stanzas, not every token of their rendered segments. None of these mappings asserts word-level alignment or whole-discourse coverage.

For SN22.87, the broader publisher excerpt starts inside `/3` and continues through `/4`; only the complete `/4` reply is returned here. For SN35.244, the broader page is discontinuous. We do not pretend those larger scopes fit existing formats. Additional publisher material remains available at the original source URL; excluding it from this narrower retrieval does not declare it unavailable or unlicensed.

## Extraction and safety

Version1 partial scope already represents complete contiguous rendered segments, including prose. Three new finite paragraph selectors require the reviewed chapter, exact paragraph count, notes boundary, and—where present—the exact heading. They remove inline footnote reference markers and return only the selected paragraph. Extra/deleted paragraphs, nested containers, scripts and unexpected headings refuse extraction.

SN56.22 uses an `excerpt verse` container with one `pre`, not `freeverse`. Its separate strict extractor excludes See-also material and rejects duplicate chapter/verse/pre structures. None accepts arbitrary caller selectors.

The Python activation profiles bind exact source paths, indexed identities, translator, licence label, version and extractor. Full raw HTML, selected English, complete notice, complete root and selected Pāli pins must agree before activation. Registered versions cannot be downgraded to ordinary links. The browser displays source-specific selection and omission notes before asking for consent, including the untranslated colophon. Runtime requires explicit exact-version partial consent, preserves text/notice/scope/prefix checks, and never substitutes another source. The previous ten scope descriptors remain unchanged. Structured JSON/CSV exports retain mapping notes, including the untranslated colophon disclosure, without adding scripture bodies.

No canonical blocks, notes, numbering, source references, commentary, personal notes or saved-position locators change in this batch. The publisher’s SN35.203 label is retained alongside indexed SN35.244. No scripture is generated, reconstructed or fetched from SuttaCentral. Publisher English bodies are not committed.

## Rights

Every page retains its complete **©1985 Buddhist Publication Society** notice: free copies, no more than 50 reprinted copies, identified source/derivatives and full notice retention; otherwise rights are reserved. The 1985 anthology and authorized 2007 transcription remain credited. SN56.22’s ATI revision is **1 July 2010**; the other three are **30 November 2013**. Notices are independently pinned per page, not replaced by a generic grant. Every response includes the complete source notice/citation and identifies the extraction as a derivative.

## Honest coverage and historical schedules

Ordinary English links fall from 2,566 to **2,562**: ATI 1,139→1,135. Whole-unit coverage is **1,438 direct / 1,861 inherited** indexed records; grouped runtime totals **1,412 / 1,835**. Partial sources rise from 10 to **14**, with **8 partial-only units**. Twelve shared pages/110 subject records remain separate. This repairs four inflated whole-translation claims; it is not four new whole translations.

The sutta daily pool falls from 1,265 to **1,261**. For the fixed regression date 2026-11-01, the current result is **SN55.32**, without changing the selection algorithm. A test-only `d209` epoch preserves the prior 1,265/DN32 result by filtering the existing frozen eligibility metadata. Historical entries cannot authorize source retrieval or restore obsolete whole-English links.

The ordinary-excerpt queue now has **21 flags: one previously retained snapshot and 20 unreviewed bindings**. Flags remain hypotheses; they overlap the broader metadata queue. Source choices and source-specific consent remain mandatory.

## Verification

Independent source and implementation review approved the four narrower selections. Six selector/registry tests include20 invalid profile cases and frozen hashes for all ten older descriptors. Focused core checks18, source/UI/documentation checks44, export-note checks26 and shared-baseline checks6 passed. The final full suite passed1,081 tests (one skipped); the audit checked all8,544 records with zero failures. MCP smoke passed64 checks.

The actual-source browser run passed185 checks in each of normal, accessibility and extracted-package modes. Accessibility automation ran168 scans with zero violations. All eight installed native partial-source audit modes passed. These tests use pinned local official HTML and synthetic drift fixtures; they do not establish current upstream availability, physical-device or human accessibility certification, new rights, or whole-discourse English coverage. Exact-head CI is verified after safe dev integration; main and deployment remain untouched.

The optional local implementation comparison runs only when its separate checkout is still at the exact baseline commit. After integration advances that checkout, this optional comparison is explicitly skipped; the independent frozen hashes for all ten older descriptors remain mandatory in every environment.
