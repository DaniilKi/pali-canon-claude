# Four complete Therā publisher-edition poems: 331–334

This local intake adds four first indexed English choices for canonical `tha-ap333–336`, over base `ac620911e349b089eedeb93906675c62c9523b24`. Apadāna access becomes **343 choices: 40 Therī and 303 Therā**. These are complete poems in the publisher edition, **not line-complete translations of VRI**. Source/normalization approval, runtime acceptance and remote integration remain separate gates. Final Git refs and exact-commit CI receipts determine promotion; this guide does not claim a release, deployment or complete project acceptance.

## Exact source scope

| Publisher poem | Corrected canonical unit | VRI block range, end exclusive | Printed physical entries | Printed global labels | Original note ownership |
|---|---|---|---:|---|---|
| 331 Gandhathūpiya | `tha-ap333` | `[9767,9789)` | 5 | 2931–2936 | Chapter preface 1; poem 2–4 |
| 332 Udakapūjaka | `tha-ap334` | `[9789,9812)` | 7 | 2937–2943 | Poem 1–6 |
| 333 Punnāgapupphiya | `tha-ap335` | `[9812,9829)` | 5 | 2944–2948 | Poem 1–4 |
| 334 Ekadussadāyaka | `tha-ap336` | `[9829,9890)` | 19 | 2949–2968 | Poem 1–9 |

The originals are pinned at publisher revision `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`; VRI remains `2d134ff9ef60f70a1eb03c9370580228811a3070`. Narrative, title, neighboring source boundaries and both colophons establish each mapping independently. A numerical offset or a publisher note alleging a duplicate is not a mapping authority. Publisher 335 is an acquired **boundary witness only**, with no new English activation. All earlier holds remain, including canonical `tha-ap72`, `tha-ap142`, `tha-ap160`, `tha-ap161`, `tha-ap262`, `tha-ap268`, `tha-ap282`, `tha-ap308`, `tha-ap309`, prior publisher 291/297/300/306/307/311/320 and publisher 322/327/328/330.

The [curation](../evidence/apadana/THERA_331_334_APPROVAL.json) binds the [original-source review](../evidence/apadana/THERA_331_334_ORIGINAL_SOURCE_REVIEW.json), [source scopes](../evidence/apadana/THERA_331_334_SOURCE_SCOPES.json), [independent normalization review](../evidence/apadana/THERA_331_334_INDEPENDENT_NORMALIZATION_REVIEW.json), [goldens](../evidence/apadana/THERA_331_334_GOLDENS.json) and [full339 preservation authority](../evidence/apadana/THERA_331_334_BASELINE339_COMPACT.json). The [explicit schema adapter](../evidence/apadana/THERA_331_334_NORMALIZATION_SCHEMA_ADAPTER.json) preserves the independently sealed wording and hashes while representing the chapter heading once as nonempty paratext, beside its metadata-only preface descriptor. It does not supply a second copy of the heading.

## Notes, numbering and edition limits

The exact four scopes have **48 body paragraphs, 36 physical stanza entries, 38 global labels and all 23 original notes**: 22 poem notes plus one independently owned chapter note. The source-derived 500-character continuation plan has 14 pages. Publisher 331's final one-character page remains part of the complete text.

Publisher 331's chapter heading and original note 1 remain separate from poem text, poem notes 2–4 and quotation evidence. Its supplied Gandhathūpiya chapter spelling is distinct from VRI Gandhodakavaggo; the original publisher discussion of PTS/BJTS readings remains attributed. The chapter heading appears once; its separately owned note is retained with its original number.

Publisher 332–334 retain their complete **BJTS-only** fancy-brace headings, literal asterisks and original heading-note calls. Their 31 physical stanza entries print global labels only; local labels remain absent rather than inferred from VRI. Publisher 332's long note 2 belongs to its poem heading even though it explains chapter-wide omissions and diverging PTS/BJTS numbering. That explanation is the translator's edition statement, not a new manuscript collation.

Two original eight-line entries remain combined: publisher 331 local 3–4/global 2933–2934, and publisher 334 global 2951–2952. Publisher 334 globals 2957–2959 cross VRI 27–28's stanza boundaries; no one-entry/one-VRI-stanza equivalence is implied. The English attainments formulas are the publisher's own wording while VRI peyyāla stays abbreviated. Original title differences, uncertain etymologies, repeated wording, mixed quotation punctuation and note 4's amendment/English-number tension remain unchanged and visible. No missing words, numbers or source explanations are reconstructed.

## Coverage and preservation

The recorded local CLI measurement is **2,926 whole English links**, with **1,822 units directly / 2,245 including inherited links**, including 343 Apadāna choices. The four new choices are previously unavailable whole publisher-edition mappings. Earlier point-in-time public stdio MCP `list_sources` coverage was **1,792 direct / 2,215 including inherited of 8,445** at the 339-choice stage. That figure is historical, uses member-aware accounting and is not the new total; A fresh actual public stdio `list_sources` observation at the 343-choice build reports **1,796 direct / 2,219 including inherited of 8,445**, with 2,926 links and 343 Apadāna choices. These are observed values, not arithmetic inferred from the earlier result.

All 339 preceding full profile/link objects, their ordering, canonical Pāli/source books, commentary/source-note data and unrelated bundled data remain preserved. This English intake does not repeat the earlier [four-unit canonical repair](apadana-four-boundaries.md); it binds its already-corrected logical canon `46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8` and `apadana-thera333-336-v1` citation namespace. Old versioned and unversioned positions retain their refusal/review semantics. Saved notes, citations, selections and unsaved private drafts are not automatically migrated or sent to a provider.

## Rights and validation

The controlling Walters/Whitman translation grant is **CC BY-NC-SA 4.0**, not the generic site metadata's CC BY label. Retain translator/publisher attribution, source and revision, licence/disclaimer notices, disclosed presentation changes, noncommercial/share-alike conditions and no endorsement. Six exact original rights artifacts are pinned. Only metadata and integrity hashes are packaged; complete English bodies, notes and publisher apparatus remain live-only. No audio/media or commercial permission is added, and no source is substituted when the pinned edition is unavailable.

The stdlib-only producer reproduces the original-derived metadata, never an approval by itself. From this checkout, with the pinned source files/rights and reconstructed corrected canonical gzip, use a fresh external output directory:

```sh
python3 scripts/apadana/review_thera331_334.py \
  --source /path/to/pinned-apadana-site \
  --canon /path/to/corrected-canon.json.gz \
  --xml /path/to/pinned-vri/romn/s0510m1.mul.xml \
  --source-review docs/evidence/apadana/THERA_331_334_ORIGINAL_SOURCE_REVIEW.json \
  --out /tmp/apadana343-fresh-replay
```

The producer derives source text only in memory and writes metadata/hashes. Source/client corruption and ownership checks, full validation, genuine installed/offline note access, strict packaged widget equality, independent final review and exact-commit CI must have their own receipts for the final snapshot. Earlier boundary-reader acceptance does not certify these new English paths. This is a local candidate until those final Git/CI receipts establish development integration; no main merge or deployment is part of the intake. Physical phones/tablets, human assistive technology, signed-in host clients and live-provider availability are unverified. The [manual device/accessibility matrix](../qa/manual-device-accessibility-matrix.md) remains a plan, not evidence of a physical-device or human session.
