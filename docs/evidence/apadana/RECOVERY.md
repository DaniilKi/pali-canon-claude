# Walters Apadāna pilot: local recovery checkpoint

Base: `2f224e6e2d1d819e0feb3d9f05733dbf700b765a`. This is a local candidate, not evidence of remote integration, publication, deployment, or publisher outreach.

## Source and rights

[Legends of the Buddhist Saints](https://apadanatranslation.com/) is translated by Jonathan S. Walters and published by Jonathan S. Walters and Whitman College. The [project explanation](https://apadanatranslation.com/about/) names the PTS and Buddha Jayanthi Tripitaka Series editions and explains its notation for alternative readings and translator additions. The project explanation and rendered footer explicitly identify [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), consistent with the [pinned repository licence](https://github.com/apadana-translation/apadana-site/blob/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/LICENSE.md). The generic CC-BY field in `src/_data/site.json` does not remove the explicit noncommercial or share-alike terms.

The official artifact revision is `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`, `src/_poems/chapter-4/poem-NNN.md`. The [publisher's contents](https://apadanatranslation.com/text/) links to the reader edition, for example [4.1 Sumedhā](https://apadanatranslation.com/text/chapter-4/poem-001/) and [4.9 Pañcadīpikā](https://apadanatranslation.com/text/chapter-4/poem-009/). The structured plaintext display is an extraction of that Markdown, not the publisher's original layout.

## Whole-poem boundary

| Canon ID | Publisher poem | VRI stanza range | Publisher note definitions |
|---|---:|---:|---:|
| `thi-ap1` | 4.1 | 1–19 | 22 |
| `thi-ap2` | 4.2 | 20–25 | 6 |
| `thi-ap3` | 4.3 | 26–30 | 2 |
| `thi-ap6` | 4.6 | 46–59 | 8 |
| `thi-ap7` | 4.7 | 60–70 | 4 |
| `thi-ap8` | 4.8 | 71–90 | 14 |
| `thi-ap9` | 4.9 | 91–115 | 14 |

The prior complete-poem review identified these as the seven whole-unit candidates. Source numbers are publisher metadata, not VRI segment offsets or a word-level alignment. The poem 1 introduction is publisher paratext. Translation notes, numbering, interpolations, headings and colophons must not become verse quotation candidates. Keep wording and notes out of committed bundles and evidence files; store only identification, mapping and integrity metadata.

Hold 4 and 5: the indexed `thi-ap4` extends into the next heading and VRI verse 37; indexed `thi-ap5` starts at 38. Hold 10: its separate chapter summary must be resolved before acceptance. Do not extrapolate numbering or coverage to the 601 publisher poems or 603 indexed VRI records.

## Verification status

The official rendered About page, footer and example links were rechecked during recovery. All six manifest rights-artifact SHA-256 hashes also matched the exact official Git blobs. The ePub metadata agrees with the restrictive grant. The recovered candidate passed fresh local and live reproductions of all seven raw/body/notes/paratext/root pins and all six rights/routing artifacts. All seven sources also passed through actual live provider retrieval. Seventy translator notes remain separate from the 100 substantive stanzas. The focused parser, browser-policy, widget, quotation and continuation checks passed against the official pinned checkout. A bounded 233-fragment scan found no translated body, note or preface wording in the six rebuilt bundle/data outputs; this is a bounded probe, not an exhaustive information-flow proof.

MCP-only source journeys passed against both the rebuilt HTTP bundle and an extracted npm package, including all seven sources and six 500-character poem-one continuation pages. `npm run smoke` passed 64 checks across 34 tools. `npm run evals` scored 100% on 201 questions, with six live questions skipped.

The default full unit run initially found five stale current scope-screen counts, which were corrected without editing the frozen review artifacts. Its next run had no source assertions fail but one unrelated-folder child process exited without a code after fourteen successful offline API checks; that test passed standalone. The final bounded-concurrency aggregate result is recorded below when available. No result here claims exact-head remote CI, remote integration, deployment or live browser acceptance.

Chromium could not start in this executor: `process_singleton_posix.cc:297 socket() EPERM`. Therefore real browser normal/a11y journeys remain **unverified**, not passed. `scripts/web-reader-apadana-check.py` preserves the bounded acceptance journey for an environment with a working browser. Its `--mcp-only` mode does not imply a browser or accessibility pass.
