# Reviewed live Walters/Whitman Apadāna intake

The builder verifies 129 finite profiles: 40 Therī and 89 Therā. It writes metadata and hashes only to `server/data/apadana.json`; translated bodies, notes, prefaces and editorial text stay live-only. The approved Therā publisher subset is 11–69 and 71–100, with explicit individual mappings. The 470 unapproved Therā files include the first ten and held poem 70. Do not infer mappings from numbers or treat a complete PTS/BJTS publisher poem as a line-complete VRI translation.

Use the exact official revision:

```sh
git clone https://github.com/apadana-translation/apadana-site.git /path/to/apadana-site
git -C /path/to/apadana-site checkout fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4
node scripts/apadana/build.mjs --source /path/to/apadana-site --check
```

`--live --check` verifies the same exact raw GitHub revision. Omitting `--check` reproduces metadata from already approved, frozen profiles; it does not approve new poems or relax extraction, rights or root boundaries. The builder reads the canonical data directly, avoiding a translation-manifest feedback loop. Six shared notice/routing artifacts retain the restrictive CC BY-NC-SA 4.0 grant despite generic site metadata mentioning CC BY 4.0. Source reviews also pin the Therā chapter-category routing artifact separately. Credit Jonathan S. Walters and Whitman College, link terms and changes, and preserve all notices; no media reuse or paid features are approved.

Current approved source scopes and independent golden seals live in `docs/evidence/apadana/THERA_SCALED_APPROVAL.json`. Historical cohort snapshots and source reviews must remain immutable. Source 42’s original hiatus marker and note 12, source 100’s tenth-chapter summary/note 3 and first-hundred summary/note 4 are separately pinned. Foreign, missing or altered descriptors fail before English. Never synthesize scripture or silently fix edition differences.

Run source-enabled tests against a checkout, with both environment variables set using your shell's syntax:

```sh
APADANA_SOURCE_CHECKOUT=/path/to/apadana-site APADANA_OFFICIAL_CHECKOUT=/path/to/apadana-site node --test tests/apadana-*.test.mjs tests/held42-editorial-gap.test.mjs tests/thera-hundred-client.test.mjs
```

The standalone standard-library `review_thera_scaled.py` independently replays exact publisher artifacts and all 14,645 original VRI blocks without production imports. It requires five exact sealed review inputs and the complete unchanged canonical snapshot. The old D249 `review_thera_fifth_sixth.py` remains an independent historical gate. [D250 reproduction commands and limits](../../docs/data/thera-scaled-intake.md) describe source, browser, installed-package and CI checks. No official English fixtures may be committed or packaged. Physical-device, human assistive and specialist acceptance remains separate.
