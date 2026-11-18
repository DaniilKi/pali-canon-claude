# Later-work search source identity and bounded context (D231)

## Demonstrated gap

At dev `57377d2`, later-work search used the remaining legacy web search path. It rendered unvalidated excerpts and links without source revisions and discarded literal `context_with` commands. An actual `sati` search returned9,712 matches across109 bundled post-canonical books. Its first hit points to `dhammasangani-mulatika/4`; the existing tool's bounded context returns /3,/4,/5, while the old link began reading at /4 and omitted the preceding source segment.

## Existing sources and selection bounds

The web reader now validates the later-work search response before presenting excerpts and uses the actual source revision, literal citation, match ref and reading offset in its existing reading links. It does not invent a canonical citation or open a different translation/edition. A match link opens the normal reader from the matched source position; the reader's ordinary page length remains30 segments within that selection, rather than adopting the search tool's single-segment command limit.

**Read surrounding context** executes the existing `get_post_canonical` command with its original citation, offset and limit3. Context is clipped by the selected citation's actual bounds. A chapter or paragraph selection is never widened to a physical file or logical work. This retains Visuddhimagga volume/chapter distinctions and keeps the Saṅgaha separate from the Vibhāvinī appended in the same VRI file. **Continue from match in source selection** opens the existing source-pinned reading route for that same selection.

The preview shows complete returned source segments and their actual references, marks the matching segment, and keeps all source notes, approximate/numbering qualifications, edition page markers, VRI paragraph labels, attribution and licence terms. These are source-selection positions, not canonical text numbers. Text is rendered through textContent; no scripture is generated or expanded.

## Shared interaction and validation

Commentary and later-work previews now share one lifecycle renderer. Their separate pure validators, tool names and exact source identities remain distinct. One preview is active at a time. Close, Stop, retry, switching matches and navigation retain the prior epoch/generation/connected-view guards and reject late bodies. Async completion moves focus only when the current preview owns it. Private draft Maps and stored bookmark identities remain unchanged.

Validation rejects unsupported/duplicate route fields before a tool call, follows the tool's actual query/offset limits and checks query provenance through the existing finite native/Unicode/explicit-normalization helper. Search results must describe the current unfiltered109-book scope, correct counts, literal commands and matching refs. Context must match the complete source signature, actual book/section/title identity, selected citation, exact requested offset/limit and consecutive returned refs with the match exactly once. Source changes fail inline until an explicit fresh search. Metadata consistency does not cryptographically authenticate source wording, and global search pagination is not a frozen index cursor.

No backend tool, text dataset, source licence/consent, saved-data schema, external provider fetch or offline cache is added.

## Verification boundaries

Final helper acceptance passed8/8 with actual MCP output in all eight scripts, single-codepoint Sinhala input, a299-character native query whose Romanization expands to449 characters, finite Unicode equivalences, explicit normalization and exact source phrases. An additional sweep validated203 first/last contexts across105 books represented in the global `sati` search; this is not a full traversal of all possible searches. Independent review separately passed26 focused tests across five relevant files and found no remaining code/config blocker.

Review strengthened request bounds, special source-file/volume identity, required numbering cautions and selected-paragraph metadata. The real `Vism §365` selection begins with volume2 opening headings, so validation preserves its authentic absence of a summary chapter instead of guessing chapter12 from the hit's surrounding chapter name. Native input bounds apply to the original request; explicitly labelled Romanization can be longer. No source wording or API semantics was changed to satisfy a test.

The full local check passed1,276 tests:1,274 pass, zero failures and two existing optional-baseline skips. All8,544 canonical records audited with zero failures. Local Chromium155 acceptance passed32 normal checks,64 checks across both themes with88 axe scans/zero violations, and32 checks from the isolated npm package. The expanded installed Chromium compatibility journey passed84 checks. Existing reader173, compact45 and commentary-context20 checks passed. Smoke passed34 tools/64 checks; offline evaluations195 pass/6 network skips; documentation19 pass. All36 shipped package files matched current runtime/documentation bytes.

Browser fixtures were corrected to use the app's actual top-level error structure and current unsaved-draft export semantics; stored-note/no-write assertions remain. Final normal, accessibility and installed runs use the corrected fixture expectations. Real bundled-source reading is kept separate from explicit malformed/stale metadata and interrupted-transport fixtures. Automated Linux engines do not certify physical devices, OS glyph shaping or human screen-reader acceptance. Final-commit CI is a separate release gate; the local counts do not imply a future CI result.

The previous D230 integration's personal-data CI job spent seven minutes installing Chromium and reached its ten-minute job limit while tests were still passing; an unchanged targeted retry then passed. This batch gives that existing long personal-data group and the new normal/a11y/installed later-work group the same20-minute budget already used for backup/conflict groups. No checks or assertions are removed, and the budget does not make normally fast runs wait longer.
