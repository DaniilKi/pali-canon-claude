# Revision-pinned canonical search (D228)

## Reproduced gap

At dev `ce4a338`, global canonical search emitted reading commands and references without their actual reading revisions. The browser built unpinned reading links. In particular, the authentic source revision for the repaired SN 12.21 ownership differs from the plain VRI edition commit. An unpinned result could not reject changed mapping ownership before showing wording. This was a missing guard, not evidence that the current returned passage was wrong.

The browser also combined title matches and body matches into one ID-deduplicated list, so a matching title could hide the same discourse's actual body excerpt and match position.

## Implementation and limits

- `canon.search` supplies the authentic `readingSource(unit)` on every title and body hit, plus original VRI edition provenance on the response. Existing ranking, counts, commands, references and independent continuations remain unchanged. Per-hit mapping revisions are distinct from the edition commit.
- The `search_texts` boundary echoes the schema-validated original request in `selection`: query, offset, limit, collection (null when absent), canonical script name, English mode and post-canonical option. It is created before native conversion or inference. This is request identity metadata, not a signed or independently authenticated search receipt.
- The canonical browser route validates selection, canonical IDs/citations, complete source terms, edition agreement, actual revision shape, exact commands/ref/offset relationships, counts and continuations before installing any excerpts or result links. Query validation reuses shared native conversion, explicit normalization labels and the existing finite Unicode equivalences; it does not rerun corpus-dependent spelling or English inference.
- A body hit opens the actual emitted paragraph with `source`, `ref` and `offset`. A title hit opens a revision-pinned source page at offset zero using `page_source`; it never invents a first-paragraph match. Existing browser-reader guards refuse changed versions before wording, with explicit current-source review retaining the original identity and position. MCP read_with commands keep their existing input schema: direct tool consumers should compare the hit’s source.locator_revision (or source.commit) with the returned get_text revision before treating new wording as that prior match. This is not an atomic pinned-get_text API.
- Separate **Matching titles** and **Matching Pāli passages** preserve both result streams, including the same ID in both. Alignment/approximation and native/keyboard/English notes remain visible, and full VRI source terms appear on the search page. There is no automatic English retrieval.

Pagination retains the existing common offset over independently counted title/body streams. Every hit has its actual reading revision; this is **not** a globally frozen search-index cursor or a claim that different visited pages share an immutable index snapshot. The existing additional `english_expansion_results` side stream remains API-only, as before. Commentary and later-work search retain their separate routes and APIs.

No source text, translation binding, licence, private-data schema, source cache, account sync or deployment changes are introduced. Search URLs do not become saved reading positions; private note drafts stay in the existing local store.

## Review and acceptance

Independent review checked 470 links across all eight scripts and found the Unicode edge case: the backend silently NFC-normalizes and folds niggahīta spellings without labelling those as an inferred spelling change. A pure shared `foldNiggahita` helper extracts the exact existing replacements at both backend call sites. The browser accepts these finite equivalences for ordinary queries; source-phrase bypasses remain exact. Actual MCP regressions cover decomposed text, `saṁyutta`, uppercase and quoted variants. No new normalization behavior is introduced to the backend.

The first full local suite exposed an expected contract-test mismatch: native queries now legitimately differ in their original-request `selection.query`. The unit test and installed search-input audit now assert that complete selection explicitly for every request, then retain full equality of all prior search results across scripts. Other search tools' selection fields remain compared unchanged.

An initial browser run also exposed a harness navigation issue after malformed metadata: navigating to the identical error URL did not start another request. The changed-source scenarios now navigate through Saved before returning, ensuring a fresh route. All malformed metadata fixtures remain.

Final local and exact-head CI acceptance is recorded externally after the final build. Automated engine/accessibility checks do not establish physical-device, OS font-shaping or human screen-reader acceptance.


### Local acceptance, November 18

- Focused backend/web/input/inference checks: 41 pass. Independent read-only review checked 470 links across all eight scripts; the reported Unicode edge case was corrected and independently reverified, with source-phrase byte-exact refusal retained.
- Final full check: 1,248 tests, 1,246 pass, zero failures, two existing optional-baseline skips. Audit: 8,544 canonical records, zero failures.
- Search browser: 36 normal checks; 72 across both themes in axe mode, 88 scans and zero violations; 36 checks against the isolated npm package. Actual above-dot query coverage is included. Representative viewports: 320/390/768/1280px.
- Existing reader: 173 checks; compact reader: 45; installed Chromium compatibility journey: 72. Official installed Firefox/WebKit jobs cover the expanded search flow on the exact integration commit; local Chromium does not substitute for those engines or physical devices.
- Installed search-input audit: both stdio and HTTP pass, 567 requests per transport, four search tools and eight scripts; zero external network attempts. The new request metadata is asserted explicitly, with previous search result parity retained.
- MCP smoke: 34 tools, 64 checks. Offline evaluations: 195 pass, six network questions skipped.

The first local full run's native-metadata contract failure and initial harness same-URL failure are preserved as diagnosis, not relabelled as acceptance. The final results above use corrected assertions and the final runtime build. Exact-head CI remains a separate release gate, checked externally rather than promised by this document.
