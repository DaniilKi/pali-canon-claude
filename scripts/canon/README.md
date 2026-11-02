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
git clone --filter=blob:none --no-checkout https://github.com/bcbsit/ati.git ati && cd ati
git config core.protectNTFS false   # Windows only: one file name in the repository contains a quote
git sparse-checkout init --no-cone && printf '/tipitaka/\n!/tipitaka/kn/"*\n' > .git/info/sparse-checkout
git checkout 45fedca341497120651efa20e756b04a13e61089 && cd ..   # pinned; the same commit as topics.json

cd /path/to/pali-canon-claude
python3 scripts/canon/build_canon.py $W/vri $VRI_COMMIT $W/bilara $W/canon.json.gz
python3 scripts/canon/build_indexes.py ati $W/ati $W/ati-index.json
python3 scripts/canon/build_indexes.py dhammatalks $W/dt-index.json
python3 scripts/canon/validate.py $W/canon.json.gz $W/ati-index.json          # must report TOTAL problems: 0
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
- `validate.py` checks the result independently against Access to Insight's PTS citations and its Thai/CDB cross-numbering.
- `build_translations.py` links dhammatalks.org and ATI pages to texts by content (Pāli title, PTS page, neighbours' numbering offset), because both sites use PTS numbering for parts of SN and AN. Pages that cannot be matched with confidence are left unlinked.
- `--content` (#37) then reads the pages still unlinked (ATI from the checkout; dhammatalks.org pages fetched once, one a second, cached in `dt-cache`) and compares them with the Pāli of the texts within 15 numbers of the page's own number. Evidence is the names in the English (people, places, Pāli words the translator kept, the page's Pāli title), counted only when *rare* in the collection (in at most 2% of its texts). A link is added only by one of three rules: `content-pts+names` (the page's PTS page lies in the text and it has names no nearby text has), `content-number+names` (two or more rare names found in this text and in no other nearby, within 5 numbers), `content-title+number` (the Pāli title names exactly one nearby text, ordinals agreeing, within 5 numbers, and no other text has more of the names). Multi-text pages and introductions are skipped, ordinals must agree, and any collision with another proposal or an existing page from the same source drops the link. The matched names are stored as `evidence`, and `scripts/audit.mjs` re-checks them against the Pāli. Set `CONTENT_DEBUG=1` to print every decision. On Windows run Python with `PYTHONUTF8=1`.
- Access to Insight pages whose name ends in `x` (`sn22.084x.wlsh`) are another translation of the same sutta and count as the same page.
