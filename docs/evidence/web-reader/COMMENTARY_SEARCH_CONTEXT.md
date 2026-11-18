# Commentary matches in their surrounding source (D230)

## Demonstrated gap

At dev `684f62d`, `search_commentary` already returned a literal `context_with` command, but the web search ignored it. Opening the first `sati` hit read only `commentary:abh01a.att.xml/c28`: one paragraph with no continuation. Its actual context command reads the containing book at offset26 with limit3, returning c27–c29. The web layer also omitted source/ref pins from commentary result links.

## Implementation and boundaries

Commentary results retain their exact-match anchor and gain an explicit **Read surrounding context** action. The inline preview executes the returned direct-book command with its original offset and three-segment limit. Only one preview is active. It shows complete source paragraphs, actual refs, commentary PTS markers when present, the source's not-canon and unaligned-book qualifications, attribution and terms. The matching paragraph has a visible **Search match** label; this is separate from personal bookmark highlighting.

**Continue from match in source book** explicitly opens the normal full-book reader at the actual match offset. Exact-result and source-book reading links use their actual source revision and returned ref. These are different existing selector identities; bookmarks and private notes are never silently moved between them. Source positions are not canonical passage numbers and a search hit does not establish a verified alignment to the root text.

Before showing excerpts or context, pure validators check route uniqueness and bounds, query interpretation, current all47-book scope, source identity/terms, exact book/ref/command relationships, native output, and pagination. Context must match the complete search source metadata and book identity, requested offset/limit, consecutive refs and match type/page markers. It must contain the actual matched ref exactly once. The shared finite query-equivalence validator retains existing source-book behavior; no corpus vocabulary inference is duplicated in the browser.

Changed or malformed context fails inline without replacing the search results or displaying replacement wording. A source change offers an explicit new search. Stop, retry, another result, Close and route changes use the existing request pool plus generation/connected-view guards; cancelled server work may still finish but cannot repopulate a closed or superseded preview. Asynchronous completion moves focus only while the current preview owns it. Private draft Maps, storage schemas and saved identities are unchanged. Query and request titles remain generic.

This adds access to existing bundled commentary, not new source coverage, a new tool, a frozen global search cursor, source authentication, account sync or a source cache. The search and context response remain trusted local tool data after consistency validation; revision metadata is not a cryptographic proof of each returned paragraph. No source text, source rights or consent scope changes.

## Verification

Focused helper acceptance passed24/24 across commentary, source-book and printed-heading tests. Actual MCP checks cover all eight output scripts, native input, explicitly labelled keyboard normalization, exact source phrases and finite NFC/niggahīta equivalences. Context checks include real first-segment and last-segment boundaries; the latter returns two paragraphs rather than inventing a missing neighbor. Native search excerpts can differ from a substring of a transliterated complete paragraph at truncation boundaries, so the validator checks source/book/command/ref/type/page identity rather than claiming a cryptographic excerpt-to-body proof.

Independent read-only review passed, with no production blocker. It separately ran8 new commentary tests and21 related existing regressions. It identified a test-only incorrect highlight selector; the browser suite was corrected to exercise `.personal-highlight` and `highlight_saved` before final acceptance.

Local Chromium155 acceptance passed20 normal checks across320/390/768/1280px and40 checks across both themes in accessibility mode, with48 axe scans and zero violations. The isolated npm package passed the same20 normal checks. Existing reader173, compact45 and source-book-search31 checks passed. MCP smoke passed34 tools/64 checks; offline evaluations195 pass/6 network skips; documentation19 pass. All36 shipped package files match the current runtime/documentation bytes.

The full local check passed1,268 tests:1,266 pass, zero failures, two existing optional-baseline skips. The audit checked all8,544 canonical records with zero failures. The expanded installed Chromium compatibility journey passed80 checks, including keyboard/native commentary context, exact source identity and private note preservation.

Browser fixtures for source drift, malformed metadata and interrupted transports are distinguished from actual bundled-source reading. Automated Linux browsers do not establish physical-device, OS glyph shaping or human screen-reader acceptance. Full repository audit and final-commit CI are separate release gates; no future CI result is implied by these local counts.

## Next substantive gap

An independent read-only check reproduced the analogous later-work search gap: `search_post_canonical` for `sati`, Roman output, offset0/limit15 returned9,712 matches across109 books. The first hit `dhammasangani-mulatika/4` has a literal context command at offset2/limit3, returning /3,/4,/5. The existing later-work web search still drops that command and builds an unpinned reading URL starting at /4. A separate bounded batch should validate those results and expose exact source/context commands, preserving Visuddhimagga volume boundaries and the Saṅgaha/Vibhāvinī distinction. This commentary batch does not claim to fix that path.
