# Rebuilding the canon data

`server/data/canon.json.gz` (Pāli text + citation index) and `server/data/translations.json` (translation links) are generated. Python 3.10+ and git are needed; nothing here runs at user install time.

## Bundled shards and Python build inputs

The four large gzip datasets (`canon`, `commentary`, `postcanonical`, `dpd`) ship as 4 MiB byte shards and a `<name>.json.gz.parts.json` manifest. These are pieces of the **original compressed bytes**, not separately compressed JSON records. The manifest records their order, byte counts and SHA-256 hashes, plus the original gzip hash. Runtime loaders verify and join them in memory, then decompress as before. No download or disk cache is needed. Legacy monolithic files are still accepted.

Before passing committed data to a Python builder, validator, diff report or experiment, unpack it into a separate working directory from the repository root:

```sh
node scripts/shard-data.mjs --unpack server/data /tmp/pali-inputs
# Use /tmp/pali-inputs/canon.json.gz (and the other original filenames) as Python inputs.
```

For the embedding experiment, set `PALI_CANON_DATA_DIR` to that directory. Python builders continue to write ordinary `.json.gz` files. Install rebuilt outputs in `server/data/`, then run `npm run build`: it splits files of 5 MiB or more deterministically, verifies the shards and removes obsolete parts. The monthly refresh unpacks old data into its working directory and re-shards installed outputs during the bundle build. `npm run audit` checks the 5 MiB data-file ceiling and shard integrity as well as the existing full-text checks.

## Rebuild from pinned sources

### Vv/Pv story headings

The final build now snaps all 136 Vimānavatthu/Petavatthu units to explicit
VRI story headings, after checking citation order and the full titles. Verse
anchors alone could start in the middle of a dialogue and give its first verse
to the preceding story. The three known title variants are explicit pairs in
`story_spans.py`, not fuzzy matches. Unexpected titles or missing headings stop
the build rather than guessing. This does not change VRI wording or numbering.

For the legacy bundled pair, unpack as above, download `romn/s0506m.mul.xml`,
`romn/s0507m.mul.xml` and `romn/s0508m.mul.xml` from the **canon's pinned source commit**, then run:

```sh
python3 scripts/canon/repair_story_spans.py /tmp/pali-inputs/canon.json.gz /tmp/pali-inputs/commentary.json.gz /tmp/pali-vri /tmp/canon-fixed.gz /tmp/commentary-fixed.gz
cp /tmp/canon-fixed.gz server/data/canon.json.gz
cp /tmp/commentary-fixed.gz server/data/commentary.json.gz
node scripts/shard-data.mjs
node scripts/parallels/build.mjs
npm run check
```

The repair requires complete source blocks, notes and page markers to match the
bundled edition before writing anything. It uses the existing commentary
paragraph evidence to refresh story membership, not to invent new alignments.
All 69 corrected spans and 11 changed assignment lists, source hashes and
preservation checks are recorded in
[`docs/data/story-boundary-repair.json`](../../docs/data/story-boundary-repair.json).
Current coverage totals are unchanged.

The same helper also applies the separately reviewed Vassika/Yasoja boundary:
Thag 3.8 ends before the unique Yasoja heading, and Thag 3.9 starts there with
verse 243. It verifies both titles, adjacency, the following heading and both
three-verse sequences before editing. It never renumbers the citation IDs or
generalizes this correction to other Theragāthā poems. See the
[Yasoja/Vaṅgīsa follow-up](../../docs/data/yasoja-and-vangisa.md).

The legacy repair CLI now needs the same pinned `romn/s0508m.mul.xml` as well as
the two Vv/Pv files. It reannotates changed units only and preserves existing
commentary root-segment boundaries when refreshing assignments. It does not
invent an alignment for Yasoja verse 243, which lacked accepted evidence in D183. The source rebuild follow-up below verifies that opening separately (D184).

### Reviewed ATI story links

The final `--content` pass of `build_translations.py` applies the individually reviewed
whole-text links in `reviewed_ati_stories.json` after the general linker. It checks the
entire upstream HTML hash (including the rights notice), root wording hash,
title and verse scope before adding a whole-text link. These edition-specific verse
numbers must not be inferred from the generic SN/AN/PTS heuristics.

The manifest can record multiple translators for the same unit; accepted versions
are preserved independently. Unreviewed competing ATI destinations still stop the
build instead of silently replacing either page.

To add only these links to an existing translation index without refetching
other sources:

```sh
python3 scripts/canon/reviewed_ati_stories.py /tmp/pali-inputs/canon.json.gz server/data/translations.json /tmp/pali-ati /tmp/translations-stories.json
```

Use the corrected canon and the official ATI checkout at the commit in the
manifest. Inspect the output, install it as `server/data/translations.json`,
then run the normal build/check gates. Changed sources, identity conflicts or
changed story bounds fail closed and require review, not updated hashes alone.
This command adds metadata only; it never copies English text into the package.
For the Vaṅgīsa page, an additional source-marker check expands its explicit
1235–36 label and requires complete, ordered coverage of ATI 1209–1279. It does
not infer VRI alignment from those numbers or repair the publisher's heading
numerals. Missing, repeated or reordered source verse markers fail closed.

### Repairing legacy shared-passage bounds

The builder refreshes records marked `shares_passage_with` after its final boundary clipping and before aggregating groups. Legacy indexes copied some abbreviated Vinaya records before clipping, leaving their ends past the declared owner. To repair an old bundled pair without fetching sources, unpack to a separate directory and run:

```sh
node scripts/shard-data.mjs --unpack server/data /tmp/pali-legacy-input
python3 scripts/canon/shared_spans.py /tmp/pali-legacy-input/canon.json.gz /tmp/pali-canon-fixed.json.gz /tmp/pali-legacy-input/commentary.json.gz /tmp/pali-commentary-fixed.json.gz
cp /tmp/pali-canon-fixed.json.gz server/data/canon.json.gz
cp /tmp/pali-commentary-fixed.json.gz server/data/commentary.json.gz
node scripts/parallels/build.mjs
npm run build
npm run check
```

Use the corresponding legacy canon and commentary inputs together. The repair follows existing explicit sharing relationships, refreshes affected group metadata, and removes commentary assignments outside the already aligned owner/member sets. It never creates text or new alignments. Changed group starts, page-volume changes, invalid sharing relationships or loss of commentary coverage require a source rebuild instead. Gzip output is deterministic; source books, paragraphs, variant notes and page markers remain byte-equivalent as JSON values. The committed correction changes five abbreviated records, their parent group and six commentary mapping lists. Rebuild the derived parallels index to record the corrected input hashes; source content and text coverage totals are unchanged.

### Full source rebuild

```sh
W=/tmp/pali-build && mkdir -p $W && cd $W
# 1. VRI Chaṭṭha Saṅgāyana XML (romanised root texts only)
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/VipassanaTech/tipitaka-xml.git vri && cd vri
git sparse-checkout init --no-cone && printf '/romn/*.mul.xml\n/romn/*.att.xml\n/romn/s0518m.nrf.xml\n/romn/s0520m.nrf.xml\n' > .git/info/sparse-checkout
git checkout main && VRI_COMMIT=$(git rev-parse HEAD) && cd ..
# 2. Public-domain Mahāsaṅgīti root (citation numbering alignment only)
git clone --depth 1 --filter=blob:none --no-checkout -b published https://github.com/suttacentral/bilara-data.git bilara && cd bilara
git sparse-checkout init --no-cone && printf '/root/pli/ms/\n' > .git/info/sparse-checkout && git checkout published && cd ..
# 3. Access to Insight (official BCBS repository) for translation links and validation
git clone --filter=blob:none --no-checkout https://github.com/bcbsit/ati.git ati && cd ati
git config core.protectNTFS false   # Windows only: one file name in the repository contains a quote
git sparse-checkout init --no-cone && printf '/tipitaka/\n!/tipitaka/kn/"*\n' > .git/info/sparse-checkout
git checkout 45fedca341497120651efa20e756b04a13e61089 && cd ..   # pinned; the same commit as topics.json

cd /path/to/pali-canon-claude
python3 scripts/canon/build_canon.py $W/vri $VRI_COMMIT $W/bilara $W/canon.json.gz
python3 scripts/canon/build_indexes.py ati $W/ati $W/ati-index.json
python3 scripts/canon/build_indexes.py dhammatalks $W/dt-index.json
python3 scripts/canon/validate.py $W/canon.json.gz $W/ati-index.json          # must report TOTAL problems: 0
python3 scripts/canon/build_translations.py $W/canon.json.gz $W/dt-index.json $W/ati-index.json $W/translations.json
python3 scripts/canon/build_commentary.py $W/vri $VRI_COMMIT $W/canon.json.gz $W/commentary.json.gz   # writes commentary.json.gz.report.json
cp $W/canon.json.gz $W/translations.json $W/commentary.json.gz server/data/
# Post-canonical books (#21): widen the VRI sparse checkout, then build (same pinned commit)
printf '/romn/*.tik.xml
/romn/*.nrf.xml
/romn/e0101n.mul.xml
/romn/e0102n.mul.xml
/romn/e0103n.att.xml
/romn/e0104n.att.xml
/tipitaka.org/romn/tree.json
' >> $W/vri/.git/info/sparse-checkout && git -C $W/vri sparse-checkout reapply
python3 scripts/canon/build_postcanonical.py $W/vri $VRI_COMMIT $W/postcanonical.json.gz   # prints the size and SHA-256
cp $W/postcanonical.json.gz server/data/
python3 scripts/canon/build_translations.py $W/canon.json.gz $W/dt-index.json $W/ati-index.json $W/translations.json --content $W/ati $W/dt-cache
cp $W/canon.json.gz $W/translations.json server/data/
node scripts/audit.mjs                                                         # must report failures: 0
npm run check && npm run smoke -- --live
```

## How it works

- `vri.py` parses each VRI book into blocks: headings, numbered paragraphs, verse lines, variant-reading notes and page markers for the PTS, Myanmar, VRI and Thai editions.
- `build_canon.py` aligns every standard citation ID to the VRI text:
  - It anchors on the rarest opening window of each text, searched within its own saṃyutta, nipāta or book.
  - It keeps anchors in citation order (longest increasing subsequence) and snaps starts to numbered boundaries.
  - It places texts whose wording differs by verse number or by the numbered headings between neighbours.
  - It caps each text at the next one, so no two texts overlap.
  - Texts that VRI abbreviates are flagged `approximate`.
  - It writes a report (`canon.json.gz.report.json`) of unplaced members and title differences.
- `build_commentary.py` aligns the commentaries (`*.att.xml`, same VRI commit) to the texts. Each commentary passage starts at a numbered paragraph, the VRI number of the root paragraph it explains; the heading and introduction that open a text's commentary, and a Dhammapada or Jātaka story told before its verse, go with it. The bold words the commentary quotes are looked up in that root paragraph (only words found in at most 2% of the book's paragraphs count). The passage is aligned when they confirm the number, or when nothing contradicts it; it is left out when they fit another paragraph within 8 better. Numbered introductions (opening verses numbered 1, 2, 3… before the numbering restarts) and numbers out of sequence are not aligned. A numbered heading that opens a text ("3. Dukkhalakkhaṇavatthu", "2. Mahākoṭṭhikattheragāthāvaṇṇanā") always starts the next passage, never ends the one before; book front matter (n="0", "Namo tassa…") belongs to none. Books that restart their paragraph numbers (Jātaka, Apadāna, Buddhavaṃsa, Cariyāpiṭaka, Paṭisambhidāmagga, several Abhidhamma books) are split into segments, and a passage goes to one segment only (the one whose verse it quotes or whose paragraph its quotations fit, or on a tie the one the previous passage went to), else it stays unaligned. A quoted stanza that is the neighbouring paragraph's verse, or an opening heading that names a neighbouring text, rejects the number; the paragraph's own verse quoted in full, or a heading naming the text, confirms it when the quotations point elsewhere. The report gives, per collection, the passages aligned and rejected, the texts with commentary, the texts the commentary numbers (`cited`, `cited_aligned`, with the unaligned ones listed), and a control: how often the same check would accept the paragraph 7 further on (the false-alignment rate). `node scripts/audit.mjs` re-checks every alignment against the canon (in its segment), checks that no passage carries the next text's opening heading, holds coverage of the numbered texts to floors with a list of known exceptions, and spot-checks known passages in both directions.
- `validate.py` checks the result independently against Access to Insight's PTS citations and its Thai/CDB cross-numbering.
- `build_postcanonical.py` (#21) parses the VRI Ṭīkā and Añña books (`*.tik.xml`, `*.nrf.xml` except the Peṭakopadesa and Milindapañha already in the canon, the Visuddhimagga `e0101n`/`e0102n` and its Mahāṭīkā `e0103n`/`e0104n`) with `vri.py`, unchanged apart from markup removal. Titles and the Ṭīkā/Añña section come from VRI's own table of contents (`tipitaka.org/romn/tree.json`); ids are slugs of those titles. Output is gzip with mtime 0 (the bytes can still differ between zlib builds; nothing depends on them). `server/data/postcanonical.json.gz` holds every book with its text (about 14.5 MB gz, over the 12 MB target and accepted in decision D-21a: the package stays well under 60 MB, and the server needs no download, extra host or disk cache). `node scripts/audit.mjs` round-trips every block's citation (the one search returns) and fails above 16 MB.
- `build_translations.py` links dhammatalks.org and ATI pages to texts by content (Pāli title, PTS page, neighbours' numbering offset), because both sites use PTS numbering for parts of SN and AN. Pages that cannot be matched with confidence are left unlinked.

## Rebuilding the dictionary subset (DPD)

`server/data/dpd.json.gz` is a compact subset of the Digital Pāḷi Dictionary (CC BY-NC-SA 4.0), used by `analyse_passage` and as the offline fallback of `lookup_pali`. Pin the release and check its SHA-256 (GitHub shows the digest on the release page) before building. The unpacked `dpd.db` is about 2.3 GB; delete it afterwards.

```sh
V=v0.4.20261026
curl -sSLO https://github.com/digitalpalidictionary/dpd-db/releases/download/$V/dpd.db.tar.xz
sha256sum dpd.db.tar.xz          # 62a3f55d285ae27f5e1d15492cd7bfa92e9e66a0b6bfed9ea97b58a28e346f49 for v0.4.20261026
tar -xJf dpd.db.tar.xz           # dpd.db
python scripts/dpd/build_dpd.py dpd.db server/data/canon.json.gz server/data/dpd.json.gz --archive-sha256 <sha256>
python -I scripts/dpd/build_glossary.py dpd.db server/data/canon.json.gz server/data/dpd.json.gz server/data/glossary.json.gz --archive-sha256 <sha256>
node scripts/audit.mjs           # checks the pin (DPD_PIN in src/analyse.mjs), licence and word coverage (>= 98.5%)
```

When moving to a new release, update `DPD_PIN` in `src/analyse.mjs` and the release line in `THIRD_PARTY.md`. Rebuild the subset whenever `canon.json.gz` changes (the audit compares the canon commit). The tokeniser in `build_dpd.py` must stay in step with `tokenize()` and `wordParts()` in `src/analyse.mjs`.
- `--content` (#37) then reads the pages still unlinked (ATI from the checkout; dhammatalks.org pages fetched once, one a second, cached in `dt-cache`) and compares them with the Pāli of the texts within 15 numbers of the page's own number. Evidence is the names in the English (people, places, Pāli words the translator kept, the page's Pāli title), counted only when *rare* in the collection (in at most 2% of its texts). A link is added only by one of three rules: `content-pts+names` (the page's PTS page lies in the text and it has names no nearby text has), `content-number+names` (two or more rare names found in this text and in no other nearby, within 5 numbers), `content-title+number` (the Pāli title names exactly one nearby text, ordinals agreeing, within 5 numbers, and no other text has more of the names). Multi-text pages and introductions are skipped, ordinals must agree, and any collision with another proposal or an existing page from the same source drops the link. The matched names are stored as `evidence`, and `scripts/audit.mjs` re-checks them against the Pāli. Set `CONTENT_DEBUG=1` to print every decision. On Windows run Python with `PYTHONUTF8=1`.
- Access to Insight pages whose name ends in `x` (`sn22.084x.wlsh`) are another translation of the same sutta and count as the same page.
## Monthly data refresh

`.github/workflows/data-refresh.yml` runs on the 3rd of every month (and on demand, with an optional VRI ref and DPD tag). It follows the commands above against upstream HEAD: VRI tipitaka-xml, the Mahāsaṅgīti root (numbering only), Access to Insight and the dhammatalks.org sitemap. It also rebuilds the commentary, post-canonical books and DPD subset when their build scripts and data files are present. The DPD release asset is checked against GitHub's SHA-256 digest when the release has one, and `update_dpd_pin.py` moves `DPD_PIN` in `src/analyse.mjs` with it. The workflow then runs `validate.py`, `npm run audit` and `npm test`, and opens (or updates) a pull request from the `data-refresh` branch. Its body is the report from `diff_report.py`: upstream commits and checksums, check results, texts added, removed and moved, PTS page changes, page-marker counts, wording changes per collection and translation-link changes. The report also runs two checks of its own: the rebuilt data plus the server bundle and the other packaged files must stay within the 60 MB package budget, and every unit ID or citation in the separately built `anandajoti.json`, `topics.json` and `dhamma_lists.json` must still resolve in the new canon. Ānandajoti links on texts whose wording changed are listed so `scripts/anandajoti/build.mjs` can be rerun. The pull request is a draft when any check fails; when a refresh pull request is already open, the run converts it to a draft or marks it ready to match this month's checks. It is never merged automatically. If nothing changed in content, no pull request is opened. A report longer than a PR body allows is cut at a section boundary by `pr_body.py`; the full report is in the run's artifact.

Run the report by hand on any two copies of `server/data/`:

```sh
python scripts/canon/diff_report.py old/ server/data/ --out report.md --json summary.json
```

Files whose bytes differ but whose parsed content is the same (for example, a different gzip header) count as unchanged.

### Verify and integrate Yasoja's opening commentary (D184)

With the corrected canon, the unchanged `build_commentary.py` accepts the
Thag-a1 opening passage for verse 243 (`paragraph+lemma`, 8/11 expressions).
Use pinned `romn/s0508a1.att.xml` alongside the root XML in a working source
directory containing only that commentary book; rebuild with the normal CLI.
Then integrate its one reviewed addition into the unpacked complete dataset:

```sh
python3 scripts/canon/build_commentary.py /tmp/pali-vri 2d134ff9ef60f70a1eb03c9370580228811a3070 /tmp/pali-inputs/canon.json.gz /tmp/thag-a1.gz
python3 scripts/canon/repair_yasoja_commentary.py /tmp/pali-inputs/commentary.json.gz /tmp/thag-a1.gz server/data/commentary.json.gz
node scripts/shard-data.mjs
node scripts/parallels/build.mjs
npm run check
```

The integration rejects source-block/provenance drift, deleted passages, changed
evidence and additional ownership changes. It inserts in source order and
remaps all numeric passage references, preserving every earlier passage's
identity. It is idempotent. No source wording or alignment thresholds change.
The full normal builder needs no special-case alignment override.

### Reviewed SN discourse scope (D185)

Every individually reviewed SN page must pin `root_blocks_sha256`, the SHA-256
of the complete unit block slice serialized as UTF-8 JSON with unescaped Unicode
and compact separators. A verse hash alone cannot detect a changed prose
introduction, ending or an all-prose discourse. SN 4.8 is distinguished from
SN 1.12 by its Māra prose context; shared verses alone are insufficient.
SN 17.5 and SN 3.7 keep VRI's explicit abbreviations and disclose differences
from the English edition. Complete source pages are linked, not synthesized.
See [the review](../../docs/data/ati-sn-coverage.md) for exact evidence.

### Prepare the remaining ATI review queue without approving it (D187)

```sh
python3 scripts/canon/ati_review_packet.py /tmp/pali-inputs/canon.json.gz server/data/translations.json /tmp/pali-ati docs/data/ati-coverage-screen.json > /tmp/ati-review-packet.json
```

The source checkout must be clean at the manifest's pinned ATI commit; accepted
reviews are revalidated first. This offline, read-only command emits source
metadata, full-page hashes, licence/notice-container indicators and every
PTS-overlapping possible unit with its current English availability. It
omits approved/already linked pages and never copies English bodies. It
rejects stale provenance, missing source files, duplicate paths and path
escapes. Output candidates always remain unapproved; PTS overlap, a complete
extent label or a licence label does not establish identity, scope or rights.
Manually compare content and boundaries, inspect the full rights notice, then
add an explicit manifest record and regression tests using the existing flow.
See the [workflow assessment](../../docs/data/ati-paired-discourses-and-review-workflow.md).
