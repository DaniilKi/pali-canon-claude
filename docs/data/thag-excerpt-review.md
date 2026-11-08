# Theragāthā excerpt review and the first real partial-source pilot

Decision D205; baseline `4934f86e1eafa8f747581a7430fe3b75e94fc69e`. [Evidence](thag-excerpt-review.json) records complete-root/source/notice hashes and production-provider reproduction against the official pinned BCBS checkout. No publisher English bodies are bundled. These results do not establish current upstream availability or deployed behaviour.

## The three priority leads

All three are confirmed excerpts after complete-body and complete-root review, not merely because the metadata mentions several ranges.

- [Thag10.2 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.10.02.olen.html) translates537–541 and544–545, omitting542–543 and546. Its preface explicitly says the final awakening verse is untranslated. Its ordinary binding is withheld; existing DT and ATI Thanissaro links remain.
- [Thag17.3 Hecker/Khema](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.17.03.hekh.html) combines selected passages corresponding to1027–1032,1037–1039,1042 and1049. The final stanza resembles1052's qualifications combined with1050's extinction wording; no exact final-verse alignment is claimed. Withhold the whole-unit binding. A contiguous partial declaration cannot honestly cover this page's omissions and blend.
- [Thag17.3 Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.17.03.olen.html) contains one three-verse poem corresponding by reviewed content to VRI1037–1039. Publisher labels1034–1036 remain unchanged in the returned wording and are identified separately in metadata. Its preface quotes different attendant-service material corresponding to1044–1047. The preface must not enter quotation verification as part of the selected three verses.

**Ānanda had no other complete translation link.** Removing its two erroneous whole-unit claims decreases direct whole-English coverage by one. The new pilot supplies partial-only access, not a new whole translation.

## Two deliberately narrow partial mappings

| Version | Exact indexed Pāli span | Returned English |
|---|---|---|
| Ānanda, Olendzki | `thag17.3/22`–`/24`, VRI1037–1039 | One verse container,417 characters; original publisher numbering preserved. |
| [Sirimaṇḍa, Olendzki](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.06.13.olen.html) | `thag6.13/3`–`/7`, VRI448–452 | One verse container,624 characters; untranslated447 remains outside the declaration. |

Only Sirimaṇḍa's exact former hold is retired. Its independent DT/ATI Thanissaro versions remain. All other previous excerpt holds remain, plus the new Thag10.2 and Ānanda Hecker/Khema holds. The registered pilot URLs are unconditionally removed from ordinary linker proposals; only verified content activation may add their exact partial mappings.

The runtime requires exact-ID `allow_partial`, reviewed contiguous Pāli and extracted-text pins, a canonical ATI URL/path, the `ati-freeverse-v1` extraction contract, and a complete-notice pin. The extractor requires exactly one bounded copyrighted chunk and one non-nested verse container. Missing, duplicate, nested or changed structures fail; editorial prefaces/notes are excluded. Partial and whole-article cache entries are separate. Text and complete notice are checked before wording on every request, including cached responses and continuations. Cached approved bytes do not imply a fresh upstream check.

An authoritative packaged registry prevents either approved source from losing its **entire** `partial_scope` and becoming ordinary. It also freezes its owner, version, URL, translator, derivative note and mapping fields. Metadata, URL resolution, coverage, daily eligibility and retrieval fail on such a downgrade. The source manifest is copied into `server/data` by the build; it contains metadata and hashes only.

Build-time activation validates the complete pinned roots, raw HTML hash, actual extraction, full notice and exact Pāli span. No-content rebuilds withhold proposals instead of recreating whole-unit bindings. Manifest/root/source drift, symlink escape and invalid metadata are rejection cases, not new approvals. All validation precedes output changes.

The same explicit scope is preserved by browser consent and native quotation verification. Negative results concern only the selected excerpt. No word-level alignment, missing-verse reconstruction, default fallback or noncontiguous-span support is added.

## Rights and evidence

Both pilots retain Andrew Olendzki's ©2005 free-distribution, source-identification and complete-notice requirements. They are **not CC**. Every returned fragment carries the full notice and attribution, plus identification as a derived verse excerpt with the editorial preface excluded. Hecker/Khema's separate BPS1980 notice and reprint conditions remain unchanged; withholding grants no new rights.

Production-provider local reproduction assembled Ānanda in six80-character pages and Sirimaṇḍa in eight, with the full notice on every page. Selected-verse quotation probes were found;90-word editorial-preface probes were not found in scope. Exactly two intercepted source reads were used and zero upstream HTTP requests occurred. This exercises real pinned source snapshots, not live author servers.

Actual browser checks passed26 cases in each normal, accessibility and extracted-npm-package mode. Accessibility ran24 scans with zero violations. They checked default no-fetch behaviour, explicit consent, exact spans, returned verse hashes, complete notices, excluded prefaces, publisher numbering and preserved alternatives. The reproducible browser command requires `--source-root`; no author text is stored in test reports or the repository.

## Honest counts and continuation

Ordinary links2,577→2,574, ATI1,150→1,147. Direct whole-English coverage1,448→1,447; including inherited sources1,871→1,870. Grouped runtime counts1,421/1,844 of8,445. There are two separately counted partial sources and one partial-only unit. Shared scopes remain12 pages/110 actual subjects/52 shared-only. The daily sutta pool remains1,269 and its2026-11-01 result remains SN5.3 because Theragāthā is outside that pool.

The default ordinary-link screen now has221 entries: five retained snapshot reviews and216 unreviewed leads. This batch resolves the three former priority leads; it does not approve the other216. Wider source review should also look for explicit excerpt markers and editorial material, not assume a reference range or an `EXTENT=complete` label proves completeness.

Run the source verifier and actual-source browser check with the pinned checkout; run `tests/ati-partial-pilot.test.mjs`, `tests/partial-page-build.test.mjs`, partial/scope regressions, the expanded installed partial audit, full `npm run check` and exact-head CI before integration. The installed audit uses synthetic providers plus real registered metadata and guards; it makes no live author request.

Local release validation completed: `npm run check` passed1,048 tests with one skipped and audited all8,544 canonical records with zero failures. Smoke passed64 checks; offline evaluations passed195 questions with six live questions intentionally skipped. The installed partial audit passed eight modes and the shared audit passed34, with zero upstream requests. Export regressions require the new internal licence code to have a documented readable non-CC name and preserve existing partial counts when a synthetic fixture is added. Independent source, implementation and documentation review found no blocking issue. Final exact-head CI is separate release evidence.
