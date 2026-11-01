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
- `build_translations.py` links dhammatalks.org and ATI pages to texts by content (Pāli title, PTS page, neighbours' numbering offset), because both sites use PTS numbering for parts of SN and AN. Pages that cannot be matched with confidence are left unlinked.

## Rebuilding the dictionary subset (DPD)

`server/data/dpd.json.gz` is a compact subset of the Digital Pāḷi Dictionary (CC BY-NC-SA 4.0), used by `analyse_passage` and as the offline fallback of `lookup_pali`. Pin the release and check its SHA-256 (GitHub shows the digest on the release page) before building. The unpacked `dpd.db` is about 2.3 GB; delete it afterwards.

```sh
V=v0.4.20261026
curl -sSLO https://github.com/digitalpalidictionary/dpd-db/releases/download/$V/dpd.db.tar.xz
sha256sum dpd.db.tar.xz          # 62a3f55d285ae27f5e1d15492cd7bfa92e9e66a0b6bfed9ea97b58a28e346f49 for v0.4.20261026
tar -xJf dpd.db.tar.xz           # dpd.db
python scripts/dpd/build_dpd.py dpd.db server/data/canon.json.gz server/data/dpd.json.gz --archive-sha256 <sha256>
node scripts/audit.mjs           # checks the pin (DPD_PIN in src/analyse.mjs), licence and word coverage (>= 98.5%)
```

When moving to a new release, update `DPD_PIN` in `src/analyse.mjs` and the release line in `THIRD_PARTY.md`. Rebuild the subset whenever `canon.json.gz` changes (the audit compares the canon commit). The tokeniser in `build_dpd.py` must stay in step with `tokenize()` and `wordParts()` in `src/analyse.mjs`.
