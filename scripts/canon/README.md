# Rebuilding the canon data

`server/data/canon.json.gz` (Pāli text + citation index) and `server/data/translations.json` (translation links) are generated. Python 3.10+ and git are needed; nothing here runs at user install time.

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
git clone --depth 1 --filter=blob:none --no-checkout https://github.com/bcbsit/ati.git ati && cd ati
git sparse-checkout init --no-cone && printf '/tipitaka/\n' > .git/info/sparse-checkout && git checkout main && cd ..

cd /path/to/pali-canon-claude
python3 scripts/canon/build_canon.py $W/vri $VRI_COMMIT $W/bilara $W/canon.json.gz
python3 scripts/canon/build_indexes.py ati $W/ati $W/ati-index.json
python3 scripts/canon/build_indexes.py dhammatalks $W/dt-index.json
python3 scripts/canon/validate.py $W/canon.json.gz $W/ati-index.json          # must report TOTAL problems: 0
python3 scripts/canon/build_translations.py $W/canon.json.gz $W/dt-index.json $W/ati-index.json $W/translations.json
python3 scripts/canon/build_commentary.py $W/vri $VRI_COMMIT $W/canon.json.gz $W/commentary.json.gz   # writes commentary.json.gz.report.json
cp $W/canon.json.gz $W/translations.json $W/commentary.json.gz server/data/
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
- `build_commentary.py` aligns the commentaries (`*.att.xml`, same VRI commit) to the texts. Each commentary passage starts at a numbered paragraph, the VRI number of the root paragraph it explains; the heading and introduction that open a text's commentary, and a Dhammapada or Jātaka story told before its verse, go with it. The bold words the commentary quotes are looked up in that root paragraph (only words found in at most 2% of the book's paragraphs count). The passage is aligned when they confirm the number, or when nothing contradicts it; it is left out when they fit another paragraph within 8 better. Numbered introductions (opening verses numbered 1, 2, 3… before the numbering restarts) and numbers out of sequence are not aligned. The report gives, per collection, the passages aligned and rejected, the texts with commentary, and a control: how often the same check would accept the paragraph 7 further on (the false-alignment rate). `node scripts/audit.mjs` re-checks every alignment against the canon and spot-checks known passages.
- `validate.py` checks the result independently against Access to Insight's PTS citations and its Thai/CDB cross-numbering.
- `build_translations.py` links dhammatalks.org and ATI pages to texts by content (Pāli title, PTS page, neighbours' numbering offset), because both sites use PTS numbering for parts of SN and AN. Pages that cannot be matched with confidence are left unlinked.
