# Six finite Therā publisher-edition scopes (D266)

Publisher 321,323,324,325,326 and 329 map independently to canonical `tha-ap323`, `tha-ap325`–`tha-ap328`, and `tha-ap331`. They add six first indexed English choices over exact dev baseline `d4dac33e76b449412d7e0cb7a6b93d6189549337`:339 Apadāna choices,40 Therī and299 Therā. All 333 previous complete profile/link objects and their order remain exact. Source-only, normalized-metadata, runtime-inventory, installed behavior and remote release approvals are separate gates.

The pinned publisher revision is `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`; VRI remains `2d134ff9ef60f70a1eb03c9370580228811a3070`. The [curation](../evidence/apadana/THERA_321_329_APPROVAL.json) binds independent original-first source, rights, normalization and full333-preservation evidence. Only metadata and integrity hashes are packaged; no English bodies, notes or apparatus are bundled.

The exact six scopes contain56 body paragraphs, 38 physical verse entries, 41 printed labels and 28 complete poem notes. The 500-character API continuation plan has 17 pages; the public widget uses its actual 6000-character default. Publisher 321's chapter heading is separately owned, note-free paratext, excluded from poem quotations. Six exact paired display occurrences retain the reviewed diacritic member:321 body,324 note 7,325 body, and 329 heading/two colophons. Three combined eight-line entries remain combined:324 local 3–4,326 local 1–2,329 local 1–2. Publisher 329 note 2 retains its literal `xxx` and terminal ellipsis; no editorial repair or missing wording is inferred. Title spellings, abbreviated VRI formulas, reordered clauses, translator uncertainties and other edition differences remain visible. Complete publisher-edition poems do not imply line-complete VRI English coverage.

All nine formal canonical holds remain: `tha-ap72`,`tha-ap142`,`tha-ap160`,`tha-ap161`,`tha-ap262`,`tha-ap268`,`tha-ap282`,`tha-ap308`,`tha-ap309`. Prior unapproved publisher 291,297,300,306,307,311,320 remain excluded. Newly reviewed 322 (malformed heading),327 (labels/division/unfinished note),328 (edition extra) and330 (summary/apparatus) remain held;331 is boundary evidence only. A note cross-reference to held material grants no activation.

The specific Walters/Whitman textual grant remains **CC BY-NC-SA4.0**: retain translator/publisher attribution, source/revision, licence, disclaimer and extraction/change notices, noncommercial/share-alike terms and no endorsement. Generic site CC BY metadata does not relax it. No audio/media or commercial permission is inferred. Live-only English requires the exact pinned official source; provider availability is a separate operational check and missing source wording is not reconstructed.

Measured CLI coverage is 2,922 whole links, 1,818 units directly and 2,241 including inherited links. A point-in-time public stdio MCP `list_sources` call measured 1,792 direct / 2,215 including inherited of 8,445, with 2,922 links and 339 Apadāna links. Its member-aware accounting differs from the CLI index. Twenty-two partial links (16 partial-only units) and 12 shared declarations/110 listed members remain separate, unchanged scopes. These totals do not claim complete canon translation coverage.

The expected runtime remains 34 files, with only Apadāna metadata, three CJS bundles and the reader bundle changing; installed archive scope remains 39 members. Preserve historical canonical 325 and333 authorities, all earlier gates, exact citation/span identities, source-note ownership, strict whole-widget equality and local-only private drafts. The held234 preflight explicitly retains the 333→325 historical bridge before current 339→333.

## Reproduce reviewed metadata

The stdlib-only producer was replayed against exact pinned inputs. It reproduces source-derived profiles, links and goldens; it grants no new source, runtime or release approval. Run from this checkout with the pinned publisher source/rights files, the canonical gzip reconstructed from committed shards, and the exact VRI XML revision above:

```sh
python3 scripts/apadana/review_thera321_329.py   --source /path/to/pinned-apadana-site   --canon /path/to/reconstructed/canon.json.gz   --xml /path/to/pinned-tipitaka-xml/romn/s0510m1.mul.xml   --out /tmp/apadana339-fresh-replay
```

The output directory must not already exist and must be outside both the project and publisher checkout. Its outputs contain metadata/hashes and the chapter title, not English bodies or notes. A successful reproduction does not imply installed-reader, live-provider or remote-CI acceptance.

**Validation gates:** source/normalization approval and the separate [runtime-inventory review](../evidence/apadana/runtime339/INDEPENDENT339_RUNTIME_REVIEW.json) bind the reviewed application snapshot. Genuine installed acceptance and remote CI must be checked against the exact final commit and its receipts. Git refs and those receipts determine promotion; this guide grants none. No main merge or deployment is part of the intake. Physical phones/tablets, human assistive technology, signed-in host clients and live-provider availability are unverified. The [manual device/accessibility matrix](../qa/manual-device-accessibility-matrix.md) is a plan with all sessions **NOT RUN**, not acceptance evidence.
