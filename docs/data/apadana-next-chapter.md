# Next complete publisher-edition Apadāna chapter

D244 adds the first indexed complete publisher-edition English for Therī Apadāna11–20. The next ten-poem chapter was selected after surveying all30remaining Therī poems. The later two chapters need additional numbering, boundary and chapter/collection-summary handling; they remain unactivated.

**Scope:** complete poems in the publisher’s PTS/BJTS-based edition, not line-complete translations of every VRI stanza. Specific missing/differing VRI material remains explicit in response notices. No verse, reading or incomplete original translator note is repaired or generated.

| Record | Publisher title | Printed stanza entries | Poem-owned notes |
|---|---|---:|---:|
| thi-ap11 | Ekūposathikā | 20 | 6 |
| thi-ap12 | Salalapupphikā | 8 | 1 |
| thi-ap13 | Modakadāyikā | 7 | 2 |
| thi-ap14 | Ekāsanadāyikā | 24 | 11 |
| thi-ap15 | Pañcadīpikā | 25 | 8 |
| thi-ap16 | Sālamālikā | 12 | 8 |
| thi-ap17 | Gotamī | 186 | 119 |
| thi-ap18 | Khemā | 94 | 82 |
| thi-ap19 | Uppalavaṇṇā | 79 | 85 |
| thi-ap20 | Paṭācārā | 43 | 26 |

Total:498printed entries and348poem-owned notes. Recitation note21 and chapter-summary note27 are separately owned, making350original note definitions. The first ten profiles remain exactly unchanged.

Four atomic index splits move to7192,7802,8340,8478. Only seven records15–21 gain `apadana-theri11-20-v1`; all61sourcebooks,8537otherunits and existing commentary remain unchanged. The original XML Gitblob/full compact book (including notes/pages) is verified, and migration is idempotent. Source21 receives its own opening but gains no English link. Prior4/5repair and the remaining four held defects are preserved. Saved links and widget cursors with old mappings refuse before replacement words; private notes/exports are never rewritten.

Finite parsing preserves original local/global labels, combined ranges and absent labels. Source16’s final local12 has no global; no226 is invented. Source17 retains compound labels and separately exposes its recitation marker/note21, before publisher local22/global248. Poem-owned notes stay1–20,22–120, without renumbering. Source18 retains diacritics from its exact paired display spans and keeps original editorial placeholders. Source19 gains only one paragraph break between534 and535; square-bracketed local59 remains. Source20’s summary stays at original corrected refs48–51/blocks8472–8478, with its own note27 and original count discrepancies.

Examples of retained differences: source11 lacks a separate counterpart to VRI19’s repeated refrain; source17 lacks a separate counterpart to VRI101 and differs on named figures and cosmology; source18’s original note7 ends with an unresolved placeholder; source19 note69 is incomplete; source20’s summary says496, VRI’s summary509, while VRI’s final number is511. All original wording and source-specific caveats remain. These differences are not permission to activate arbitrary excerpts as complete sources.

Only substantive publisher stanza entries are quotation evidence. Prefaces, headings, recitation/chapter apparatus, colophons and all editorial notes remain outside it. New profile `root_verses` identifies canonical stanza numbers separately from publisher labels; it does not assert alignment. All raw/body/note/paratext/root pins and finite source metadata fail closed on drift. Only exact known source IDs may exceed32notes or retain sparse numbers. The standalone and embedded v19readers render each ownership scope separately.

Reuse remains CC BY-NC-SA4.0 with Jonathan S. Walters/Whitman attribution, full licence links and change notices. English bodies, notes and apparatus remain live-only. Bundles contain metadata/hashes, not translated bodies. Source choice, revision/prefix continuation and foreign-owner refusal remain mandatory.

Current links2603(Walters20), indexed direct/inherited1499/1922, grouped1473/1896. Daily1288, partial22, shared12/110subjects and other source holds remain unchanged. These are ten new indexed complete publisher-poem choices, not newly authored translations or newVRIwording.

Evidence: [final source approval](../evidence/apadana/NEXT_CHAPTER_SOURCE_APPROVAL.json), [independent source review](../evidence/apadana/NEXT_CHAPTER_SOURCE_REVIEW.json), [source goldens](../evidence/apadana/NEXT_CHAPTER_GOLDENS.json), [actual repair](../evidence/apadana/NEXT_CHAPTER_REPAIR.json), [preservation](../evidence/apadana/NEXT_CHAPTER_PRESERVATION.json), [remaining source holds](../evidence/apadana/NEXT_HELD_READINESS.json). Historical receipts remain untouched and tests check the explicit metadata repair chain.

Automated candidate evidence: all498entries,350notes and528poem paragraphs match independent pins. Actual MCP, phone/desktop390/1280 and both-theme browser checks pass;220axe scans show zero violations. Stale saves, vanished references, drafts/exports and fresh locators are exercised. These are emulation, not physical-device, human assistive or specialist acceptance. Final package/commit acceptance remains a distinct gate.

Reproduce with `node scripts/apadana/build.mjs --source "$APADANA_CHECKOUT" --check`; run source-enabled `tests/apadana-next.test.mjs`, `tests/apadana-next-client.test.mjs`, `tests/apadana-next-boundaries.test.mjs`, plus `scripts/web-reader-apadana-next-check.py` normal/`--a11y`/outside-source `--server-dir`. Preserve both earlier Apadāna browser suites. Run `npm run check`, smoke/evals and exact-final-commit CI. The independent `apadananext` group has20minutes;45CIjobs are configured, not a claim that they have passed.
