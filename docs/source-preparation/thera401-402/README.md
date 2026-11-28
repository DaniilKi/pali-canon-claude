# Publisher poems 401–402: reviewed source preparation

This packet prepares two possible future English choices. It does not activate
translations, change application data, or authorize a release. The frozen
author profiles retain their original PENDING markers; the attached independent
review completes source-preparation review only. Parser, API, installed-reader,
browser and exact-candidate validation still have to follow.

| Publisher poem | Canonical identifier | Publisher title |
| --- | --- | --- |
| 401 | `tha-ap403` | Tissametteyya |
| 402 | `tha-ap404` | Puṇṇaka |

These correspondences were checked against titles, narratives and original XML,
rather than inferred from numbering. Held **publisher** poems 403 and 404 are
different items from the canonical identifiers above. All nine original publisher
holds (391, 392, 393, 403, 404, 405, 408, 409, 410) remain unchanged. The earlier
[publisher398–399 preparation](https://github.com/DaniilKi/pali-canon-claude/tree/wip/pali-source398399-prep-nov28/docs/source-preparation/thera398-399) is a separate scope.

The evidence preserves 49 poem paragraphs, 43 physical stanza paragraphs,
44 printed numbered stanzas, 36 notes and 16 500-character UTF-16 pages.
Publisher 401's ten speaker-label lines and separate unnoted 33-character chapter
heading remain distinct. Publisher 402's combined eight-line stanza paragraph
and complete published refrains remain intact; abbreviated VRI passages are not
expanded. Complete publisher-edition poems are not line-complete VRI translations.

Specific Walters/Whitman translation notices govern the English material:
**CC BY-NC-SA 4.0**, not the site's generic metadata licence. All six original
rights artifacts and the applicable VRI qualifications are pinned in the packet.
No audio, image, commercial-use or other media permission is established here.

`proposal/` preserves the original 14-member public packet and its manifest
without rewriting its evidence or status history. `INDEPENDENT_SOURCE_REVIEW.json`
records the separate raw-first review; `BLIND_SOURCE_RECORD.json` preserves its
presealed public facts. Verbatim bodies, notes, quotation strings and private
comparison fixtures are intentionally absent. Their hashes are evidence, not
files that should be fetched from this repository.

To reproduce source preparation, obtain the pinned official publisher checkout,
original VRI XML and canonical data identified in the packet, then run:

```sh
python3 proposal/prepare_pair.py \
  --publisher-root /path/to/exact-publisher-checkout \
  --canon-data /path/to/exact-883d/server/data \
  --vri-xml /path/to/original/romn/s0510m1.mul.xml \
  --out /path/to/fresh-output-outside-any-git-checkout
```

Keep generated private files outside Git. Captured absolute paths describe the
review environment; source revisions and content hashes identify the artifacts.
The application reference for this preparation is
`f03150ff03f75e20abfb735836093cf3a0bfe5c2`; consult actual Git refs and CI for
integration status. This documentation is not evidence of deployment, physical
device testing, human accessibility acceptance or specialist endorsement.
