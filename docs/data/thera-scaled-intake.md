# D250: forty reviewed Therā additions and scaled intake

The approved Walters/Whitman registry grows from 89 to 129 profiles: 40 Therī and 89 Therā publisher-edition poems. New publisher poems 42, 61–69 and 71–100 supply 40 first indexed English choices: 278 printed entries, 398 poem paragraphs, 137 poem-owned notes and three separately owned apparatus notes. These are existing translations made accurately accessible, not newly translated scripture or line-complete VRI English.

All 89 earlier profile/link objects, all 8,544 canonical records, all 61 source books, accepted commentary and user-location revisions are preserved. Publisher 70 remains held: ambiguous orphaned Pandoc display fragments occur in the chapter summary, alongside separately owned note 5 and a stated source count that differs from actual entries. The 470 unapproved Therā publisher files include the first ten and held poem 70. Opening Buddha/Pacceka categories remain outside this approval. A filename, matching number or research shortlist is not approval.

## Source identity, reuse and review

Publisher revision `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4` and VRI revision `2d134ff9ef60f70a1eb03c9370580228811a3070` remain unchanged. Every original, six shared notice/routing artifacts and the Therā chapter-category routing artifact are pinned by SHA-256 and Git blob identity. The explicit Walters/Whitman translation grant is CC BY-NC-SA 4.0; generic site CC BY 4.0 metadata does not relax it. English bodies, notes, prefaces and editorial text stay live-only, with attribution, exact revision, source links, restrictive terms and edition notices. No media rights or commercial reuse are inferred.

Two source agents read the complete originals for poems 61–80 and 81–100, including notes and adjoining boundaries. A separate source contract reviews poem 42. The independent reviewer replays every approved raw/body/note/layout/scope/root pin and all 14,645 original VRI blocks, and reads the original English bodies, notes and apparatus for poems 61–100 and 42, with direct VRI checks for material edition differences. This is an AI-assisted review, not human specialist acceptance. Source reviews disclose their actual methods and limitations.

The five sealed golden files and `THERA_SCALED_APPROVAL.json` record explicit mappings and current curatorial scope. Production profiles and manifests cannot approve themselves. Test helpers read that independent fixture for current whitelists while retaining exact historical cohorts and hash receipts. The portable standard-library `review_thera_scaled.py` imports no production parser and refuses changed review seals, altered/stale canonical snapshots, wrong source arity, raw/notes/root drift and ambiguous scopes. Historical D249 receipts and its independent replay remain unchanged.

## Special source scopes

- Publisher 42 → `tha-ap44`: original hiatus marker and note 12 form one exact `editorial_gap`. It is displayed separately with its original placement between local 25/global 1164 and local 26/global 1165. Poem notes 1–11 and 13 retain their original numbering. Nothing is invented for the missing VRI content; no new stanza, canonical reference or alignment is created. All clients validate its exact ten-key metadata, original content and notes before English; foreign or missing fields fail closed. The bounded synchronous SHA helper has independently checked Unicode, padding and length behavior and adds no runtime dependencies.
- Publisher 70 stays held. The other approved sources preserve reversed/combined labels, edition names, counts and narrative differences. Publisher 74’s recitation ending and 86’s empty notes are finite, source-specific cases.
- Publisher 100 → `tha-ap102`: poem notes 1–2, tenth-chapter summary/note 3 at root blocks 5140–5145, and first-hundred chapter summary/colophons/note 4 at blocks 5145–5152 remain distinct. The last is labelled explicitly as the first hundred, not the end of all Therā Apadāna. The source’s stated counts of 1455 and 60 are edition statements, not validated coverage totals.

## Reproduce

Obtain exact official publisher and VRI checkouts outside the package, then run:

```sh
node scripts/apadana/build.mjs --source /path/to/apadana-site --check
APADANA_SOURCE_CHECKOUT=/path/to/apadana-site APADANA_OFFICIAL_CHECKOUT=/path/to/apadana-site node --test tests/apadana-thera-scaled.test.mjs tests/held42-editorial-gap.test.mjs tests/editorial-content-sha256.test.mjs tests/thera-hundred-client.test.mjs
node scripts/shard-data.mjs --unpack server/data /tmp/pali-scaled-inputs
python scripts/apadana/review_thera_scaled.py \
  --source-root /path/to/apadana-site \
  --goldens docs/evidence/apadana/THERA_SEVENTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_EIGHTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_NINTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_TENTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_EDITORIAL_GAP_GOLDENS.json \
  --canon /tmp/pali-scaled-inputs/canon.json.gz \
  --xml /path/to/tipitaka-xml/romn/s0510m1.mul.xml \
  --output-dir /tmp/pali-scaled-source-review
npm run check
npm run smoke
npm run evals
```

Run `scripts/web-reader-apadana-thera-scaled-check.py` separately with `--batch 61-80`, `--batch 81-100` or `--batch held42`, the same `--source-root`, and an external `--report` path. Each batch has normal, `--a11y` and isolated npm `--server-dir /path/to/extracted/package/server` modes. Begin with bounded `--pilot --batch held42` and `--pilot --pilot-poem 100 --batch 81-100`; pilots are preliminary and do not replace full modes. Actual command flags are documented by `--help`. Use the documented browser executable through `PALI_BROWSER` if automatic discovery is unavailable.

Three 20-minute CI groups (`apadanatherascaled61`, `apadanatherascaled81`, `apadanatheraeditorial`) retain every earlier gate, adding source-enabled tests, independent extraction and all three browser/package modes. Reports distinguish actual MCP/source checks, synthetic privacy drafts and emulated Apps SDK/MCP Apps hosts. Browser viewport emulation and axe do not imply signed-in-host, physical-device, human assistive or specialist acceptance. Exact-final-commit CI is a release gate; configured jobs alone are not passing evidence.

## Coverage and remaining limits

Whole-unit links grow from 2,672 to 2,712; Apadāna choices from 89 to 129; directly indexed texts from 1,568 to 1,608 and inherited coverage from 1,991 to 2,031. Grouped member-aware counts grow from 1,542/1,965 to 1,582/2,005. All 40 additions were absent from the prior English choices. The 22 partial sources, 12 shared sources, 110 shared subjects, 22 shared-only subjects and 1,288 daily-eligible texts remain unchanged. No canonical wording, commentary association, private data or saved-location migration is changed. Root or publisher edition differences are disclosed rather than harmonized.

Physical-device testing, human assistive acceptance, specialist review, rights-held material, untranslated canonical areas and app-store/client publication remain separate. This development batch does not complete the entire project or authorize main merge or deployment. The release stays on `dev/pali-reliability`.

## Recorded corrections and independent evidence

The first browser pilots found a review-fixture classification error for the original centred closing colophon at `tha-ap102/15`. Only its type changed from prose to heading; source wording and all scope/root/content hashes remained unchanged. The repair receipt and independent review retain the old and new seals. The renewed independent replay verifies all 423 reader segments as well as every source extraction and original VRI block.

Pilots also reproduced actual client integrity defects for new apparatus and injected prefaces. The repair hashes actual content and original note definitions for the exact new owners, while preserving all 89 earlier client contracts. Real-source tests cover all 40 new profiles; synthetic policy fixtures retain all 89 prior positives and the 31 additional new profiles whose content can be synthetic without forging a pinned apparatus. Nine new profiles require their actual source fixtures for these positive checks.

- [Content-integrity repair review](../evidence/apadana/THERA_SCALED_CLIENT_INTEGRITY_REPAIR_REVIEW.json)
- [Independent implementation/source review](../evidence/apadana/THERA_SCALED_IMPLEMENTATION_SOURCE_REVIEW.json)
- [Package exclusion, preservation and curation review](../evidence/apadana/THERA_SCALED_PRESERVATION_AND_CURATION_REVIEW.json)
- [CI configuration review](../evidence/apadana/THERA_SCALED_CI_CONFIGURATION_REVIEW.json)

These review receipts explicitly distinguish source, implementation, package and configured CI evidence from final exact-commit CI and human acceptance. Failed pilot logs remain preserved outside the repository with the release records; no failed check is reported as passed.

## CI follow-up: strict widget identity and bounded setup

The first staged commit `62fc22f` did not pass CI. The installed widget differed from source HTML because esbuild changed local names and formatting inside an imported function serialized with `toString()`. The repair freezes the unchanged original helper source as a build-time literal; direct source execution uses that same original source. The strict complete-resource equality audit remains unchanged. A real esbuild negative control reproduces the mismatch without the define, while the defined build produces exact source HTML despite conflicting surrounding names.

Other first-run setup failures were a missing read-only helper input in the isolated source-load container, a shallow checkout missing the immutable historical baseline, and one missed current whitelist in the older three-poem harness. Their repairs retain the existing network/memory/accessibility/source checks, fetch just the exact baseline commit, and use the independently approved current IDs while preserving the historical owned cohort. No source approval, canonical wording, extraction boundary or helper algorithm was changed by these repairs.

The first package and its complete nine-mode browser acceptance remain preserved as evidence for that earlier runtime. The rebuilt package receives fresh source/client checks, the original strict installed-widget audit, appropriate local browser checks and all required exact-final-commit CI jobs. Old-runtime receipts are not relabelled as new-runtime acceptance. Physical-device, human assistive and specialist acceptance remain separate.
