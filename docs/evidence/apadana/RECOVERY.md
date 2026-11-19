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

The default full unit run initially found five stale current scope-screen counts, which were corrected without editing the frozen review artifacts. Its next run had no source assertions fail but one unrelated-folder child process exited without a code after fourteen successful offline API checks; that test passed standalone. The final exact `npm run check` passed with single-CPU process affinity to bound file concurrency: 1,422 tests, 1,383 passed, 39 skipped, zero failed; the exhaustive audit covered 8,544 texts with zero failures. No tests or timeouts were weakened. No result here claims exact-head remote CI, remote integration, deployment or live browser acceptance.

Chromium could not start in this executor: `process_singleton_posix.cc:297 socket() EPERM`. Therefore real browser normal/a11y journeys remain **unverified**, not passed. `scripts/web-reader-apadana-check.py` preserves the bounded acceptance journey for an environment with a working browser. Its `--mcp-only` mode does not imply a browser or accessibility pass.

## CI boundary

The parser/integration unit tests are discovered by ordinary CI. This local follow-up adds an `apadana` group to the existing `reader-browser-group` matrix, so the existing Chromium aggregate requires its normal, accessibility and isolated-package journeys. It checks out only the seven poem files and six rights/routing artifacts from the exact official revision, with `persist-credentials: false`, and checks all pins before retrieval. Source fixtures remain temporary job inputs, never committed or uploaded. Only three metadata reports are retained.

Fixture setup fetches the pinned public GitHub revision. The harness itself permits only its test HTTP server and hash-verified fixture transport, with no live publisher requests. The new group has not been run remotely by this local follow-up. The local browser socket error above still applies; configuring a CI gate is not a browser or accessibility pass.

## Independent reconciliation review

A separate reviewer fetched the thirteen exact official Git blobs independently, checked their identities and hashes, and compared the seven complete poems against all bundled VRI stanza boundaries. The [metadata-only receipt](INDEPENDENT_SOURCE_REVIEW.json) records 100 substantive publisher stanzas and 70 separately owned translator notes. All seven owners had zero English choices at the prior dev head `2f224e6`; this is seven first indexed English records, rather than only improved access to an existing shared translation. It does not create new translations or establish coverage of the remaining Apadāna.

The independent comparison found additional edition differences. The finite mapping notes now disclose poem1 verse2's count against `thi-ap1/7`, poem8 verse83's rebirth/appearance reading against `thi-ap8/14`, and poem9 verses101–102's posture/direction and deeds/destinations readings against `thi-ap9/12–13`. Translator notes6 and11 remain separately owned. These are editorial disclosures, never inserted into either English or Pāli wording. All raw, body, notes, preface, root and rights pins remain unchanged; poems4,5,10 remain held. The MCP and actual-source browser checks now require these disclosures outside poem wording.

Source approval and implementation acceptance are separate. The earlier CI and local receipts above describe their exact candidate, not this later metadata follow-up. Verify all workflows on the final commit before advancing dev; main and hosting remain outside this release.
