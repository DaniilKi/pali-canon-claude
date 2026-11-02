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

## Monthly data refresh

`.github/workflows/data-refresh.yml` runs on the 3rd of every month (and on demand, with an optional VRI ref and DPD tag). It follows the commands above against upstream HEAD: VRI tipitaka-xml, the Mahāsaṅgīti root (numbering only), Access to Insight and the dhammatalks.org sitemap. It also rebuilds the commentary, post-canonical books and DPD subset when their build scripts and data files are present. The DPD release asset is checked against GitHub's SHA-256 digest when the release has one, and `update_dpd_pin.py` moves `DPD_PIN` in `src/analyse.mjs` with it. The workflow then runs `validate.py`, `npm run audit` and `npm test`, and opens (or updates) a pull request from the `data-refresh` branch. Its body is the report from `diff_report.py`: upstream commits and checksums, check results, texts added, removed and moved, PTS page changes, page-marker counts, wording changes per collection and translation-link changes. The report also runs two checks of its own: the rebuilt data plus the server bundle and the other packaged files must stay within the 60 MB package budget, and every unit ID or citation in the separately built `anandajoti.json`, `topics.json` and `dhamma_lists.json` must still resolve in the new canon. Ānandajoti links on texts whose wording changed are listed so `scripts/anandajoti/build.mjs` can be rerun. The pull request is a draft when any check fails; when a refresh pull request is already open, the run converts it to a draft or marks it ready to match this month's checks. It is never merged automatically. If nothing changed in content, no pull request is opened. A report longer than a PR body allows is cut at a section boundary by `pr_body.py`; the full report is in the run's artifact.

Run the report by hand on any two copies of `server/data/`:

```sh
python scripts/canon/diff_report.py old/ server/data/ --out report.md --json summary.json
```

Files whose bytes differ but whose parsed content is the same (for example, a different gzip header) count as unchanged.
