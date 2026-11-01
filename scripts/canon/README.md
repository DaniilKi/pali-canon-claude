# Rebuilding the canon data

`server/data/canon.json.gz` (Pāli text + citation index) and `server/data/translations.json` (translation links) are generated. Python 3.10+ and git are needed; nothing here runs at user install time.

```sh
W=/tmp/pali-build && mkdir -p $W && cd $W
# 1. VRI Chaṭṭha Saṅgāyana XML (romanised root texts only)
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/VipassanaTech/tipitaka-xml.git vri && cd vri
git sparse-checkout init --no-cone && printf '/romn/*.mul.xml\n/romn/s0518m.nrf.xml\n/romn/s0520m.nrf.xml\n' > .git/info/sparse-checkout
git checkout main && VRI_COMMIT=$(git rev-parse HEAD) && cd ..
# 2. Public-domain Mahāsaṅgīti root (citation numbering alignment only)
git clone --depth 1 --filter=blob:none --no-checkout -b published https://github.com/suttacentral/bilara-data.git bilara && cd bilara
git sparse-checkout init --no-cone && printf '/root/pli/ms/\n' > .git/info/sparse-checkout && git checkout published && cd ..
# 3. Access to Insight (official BCBS repository) for translation links and validation
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/bcbsit/ati.git ati && cd ati
git sparse-checkout init --no-cone && printf '/tipitaka/\n' > .git/info/sparse-checkout && git checkout main && cd ..

cd /path/to/pali-canon-claude
python3 scripts/canon/build_canon.py $W/vri $VRI_COMMIT $W/bilara $W/canon.json.gz
python3 scripts/canon/build_indexes.py ati $W/ati $W/ati-index.json
python3 scripts/canon/build_indexes.py dhammatalks $W/dt-index.json
python3 scripts/canon/validate.py $W/canon.json.gz $W/ati-index.json          # must report TOTAL problems: 0
python3 scripts/canon/build_translations.py $W/canon.json.gz $W/dt-index.json $W/ati-index.json $W/translations.json
# Post-canonical books (#21): widen the VRI sparse checkout, then build (same pinned commit)
printf '/romn/*.tik.xml
/romn/*.nrf.xml
/romn/e0101n.mul.xml
/romn/e0102n.mul.xml
/romn/e0103n.att.xml
/romn/e0104n.att.xml
/tipitaka.org/romn/tree.json
' >> $W/vri/.git/info/sparse-checkout && git -C $W/vri sparse-checkout reapply
python3 scripts/canon/build_postcanonical.py $W/vri $VRI_COMMIT $W/postcanonical.json.gz $W/postcanonical-extra.json.gz   # prints sizes and the extra file's SHA-256
cp $W/postcanonical.json.gz server/data/   # the extra file is NOT copied: it is a release asset (see below)
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
- `validate.py` checks the result independently against Access to Insight's PTS citations and its Thai/CDB cross-numbering.
- `build_postcanonical.py` (#21) parses the VRI Ṭīkā and Añña books (`*.tik.xml`, `*.nrf.xml` except the Peṭakopadesa and Milindapañha already in the canon, the Visuddhimagga `e0101n`/`e0102n` and its Mahāṭīkā `e0103n`/`e0104n`) with `vri.py`, unchanged apart from markup removal. Titles and the Ṭīkā/Añña section come from VRI's own table of contents (`tipitaka.org/romn/tree.json`); ids are slugs of those titles. Output is gzip with mtime 0, so the same commit gives the same bytes. `server/data/postcanonical.json.gz` holds the index of every book and the text of the Ṭīkā section and the Visuddhimagga books (budget 12 MB); `postcanonical-extra.json.gz` holds the other Añña books and is published as the release asset `data-postcanonical-1/postcanonical-extra.json.gz`. After a rebuild that changes it, publish it under a **new** tag and update `EXTRA` (tag, url, sha256, bytes) in `src/postcanonical.mjs`; `node scripts/audit.mjs` fails if the pin and the data disagree.
- `build_translations.py` links dhammatalks.org and ATI pages to texts by content (Pāli title, PTS page, neighbours' numbering offset), because both sites use PTS numbering for parts of SN and AN. Pages that cannot be matched with confidence are left unlinked.
