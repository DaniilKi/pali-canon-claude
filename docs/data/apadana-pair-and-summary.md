# Three Apadāna translations: paired boundary and chapter-summary ownership

D243 adds the first indexed whole-English choice for Therī Apadāna4,5,10, at the same fixed Walters/Whitman revision used by the previous seven. These three contain30 publisher stanzas and16 notes. Poem10’s note8 belongs solely to its chapter summary; its poem owns notes1–7. No scripture or translation wording is generated or corrected.

| Record | Before | Reviewed implementation |
|---|---|---|
| thi-ap4 | Blocks6629–6651 included the following heading and stanza37 | Blocks6629–6647, six stanzas31–36 |
| thi-ap5 | Blocks6651–6675 started at stanza38 | Blocks6647–6675, original heading and nine stanzas37–45 |
| thi-ap10 | Whole root retained, English withheld | Original root6885–6936 retained; poem body6885–6930, chapter paratext6930–6936 separately identified |

The repair changes only four/five boundary, range and locator metadata. All61 canonical source books,8,542 other units and existing commentary remain unchanged. The original pinned XML Git blob is checked, the complete parsed book (text/notes/pages) must match, and rerunning the repair produces identical output. Full-source rebuilding applies the same finite helper. Derived parallels are rebuilt against the current canonical hash.

Both repaired records have `apadana-theri45-v1` locators. Saved links and widget cursors from the old mapping refuse before displaying replacement words. Explicitly reviewing a current location may reopen it, but a vanished old reference stays refused. Private notes, bookmark identifiers and exported old metadata are never rewritten. Actual VRI `source.commit` remains unchanged; Embedded reader v18 prevents cached v17 HTML from interpreting the new summary/cursor contract; widget `source_commit` cursor values carry `locator_revision || commit`.

Poem5 retains its exact printed labels:37,38,39-40,40,42,41,43,44,45, and local1–9. There is no automatic relabelling or line-alignment claim. Source-specific Buddha names, worship wording, tree/road and karma/water differences remain visible in mapping notes. The original seven profile objects remain exactly equal to their previous values.

Poem10’s typed `chapter_summary` contains a metadata descriptor plus separately fetched text and notes. Its canonical context is original refs `thi-ap10/19–22`; it creates no new canonical unit. Root/body/note pins bind ownership. The publisher’s paragraph order, spelling and118-stanza count remain distinct from VRI’s order and130 count. Summary and all editorial notes are excluded from poem quotation matching, body offsets, prefix hashes and stanza counts. Both web and embedded readers display the summary and note8 separately.

The explicit translation licence remains **CC BY-NC-SA4.0**, with Jonathan S. Walters/Whitman attribution and presentation-change notices. Conflicting generic site metadata does not relax it. Only the immutable official raw Markdown paths can be fetched. Bundles contain metadata/hashes, never English poem, summary, note or preface bodies.

Coverage: links2590→2593; indexed direct/inherited1486/1909→1489/1912; grouped1460/1883→1463/1886. Walters7→10. Daily1288, partial22, shared12/110subjects and all other source holds remain unchanged. The general heuristic screening queue gains three ordinary records; it does not import this finite source approval or grant new source rights.

Evidence: [source approval](../evidence/apadana/THREE_SOURCE_APPROVAL.json), [independent full-source review](../evidence/apadana/THREE_SOURCE_REVIEW.json), [paired repair receipt](../evidence/apadana/PAIR_REPAIR.json), [preservation](../evidence/apadana/PAIR_PRESERVATION.json). Historical held-source and earlier index-repair evidence is preserved; tests verify the explicit subsequent metadata chain instead of editing old receipts.

Reproduce with the official exact-ref checkout and original XML in temporary directories:

```sh
node scripts/apadana/build.mjs --source "$APADANA_CHECKOUT" --check
APADANA_SOURCE_CHECKOUT="$APADANA_CHECKOUT" APADANA_OFFICIAL_CHECKOUT="$APADANA_CHECKOUT" node --test tests/apadana-parser.test.mjs tests/apadana-integration.test.mjs tests/apadana-pair-boundary.test.mjs tests/apadana-three.test.mjs
python scripts/web-reader-apadana-check.py --source-root "$APADANA_CHECKOUT"
python scripts/web-reader-apadana-three-check.py --source-root "$APADANA_CHECKOUT"
python scripts/web-reader-apadana-three-check.py --source-root "$APADANA_CHECKOUT" --a11y
# Also run both scripts with --server-dir pointing outside the source tree to an extracted npm package.
npm run check
npm run smoke
npm run evals
```

Independent original-source replay and actual MCP/browser journeys pass on the candidate. Four390/1280×light/dark browser contexts include stale saved pins, private drafts/export, source continuation, edition caveats, quotation exclusion and drift refusals. Eighty axe scans have zero violations. These are automated browser emulations. Physical devices, human assistive-technology acceptance and specialist review remain outstanding. Candidate receipts do not prove final-commit CI, publication, main merge or deployment; final release receipts must identify the exact tested commit.
