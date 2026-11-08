# Coverage

What Pali Canon for Claude contains in version 2.1.0, computed directly from the bundled data (`server/data/canon.json.gz`, `server/data/translations.json` and `server/data/anandajoti.json`).

## Summary

| | |
|---|---|
| Edition | Chaṭṭha Saṅgāyana Tipiṭaka (Sixth Council, Yangon, 1954–56), Vipassana Research Institute, romanised text |
| Source version | [VipassanaTech/tipitaka-xml](https://github.com/VipassanaTech/tipitaka-xml), commit `2d134ff9ef60f70a1eb03c9370580228811a3070` |
| Books | 61 VRI files (all root texts, *mūla*, of the three piṭakas, plus the Milindapañha and Peṭakopadesa that the Burmese canon includes) |
| Size | about 2.8 million words of Pāli; 5.6 MB compressed |
| Citable texts | **8,544**, each with a standard citation ID |
| Grouped text members | 1,259 members of recorded source groups (AN 1.296–305, Dhp 1–20…) answer to their own number too; uncertain member alignments retain their warnings |
| Approximate citation mappings | 266: 199 explicitly share an indexed source span, and 67 have no confirmed independent location. The flag alone does not prove source abbreviation or omission |
| PTS page markers | 11,964 |
| Thai, Myanmar and VRI page markers | 56,050 (21,781 Thai, 16,687 Myanmar, 17,582 VRI), shown in `get_text` and accepted as citations such as "Thai MN 1.103"; 56,048 resolve back to a text containing the marker |
| Variant readings | 18,725 VRI notes; 16,632 (88.8%) give at least one reading attributed to editions by siglum (`get_text` `variants: "structured"`) |
| Scripts | Roman, plus Sinhala, Thai, Myanmar, Devanagari, Khmer, Lao and Lanna by transliteration. The first five are tested against VRI's own script editions; Lao and Lanna have no VRI edition and are tested by round trip only |
| English translation links | 2,574 links covering 1,447 texts directly, 1,870 including verses that share their chapter's translation (64 of them placed by the content-based linker, [#37](https://github.com/DaniilKi/pali-canon-claude/issues/37)). `list_sources` reports the same per collection as `translation_coverage`, counting grouped ranges through their members (1,421 and 1,844 of 8,445) |
| Commentary (Aṭṭhakathā) | VRI commentaries aligned to the texts by VRI paragraph number (`get_commentary`, `get_text` `commentary: true`): DN 34/34, MN 152/152, SN 1,800/1,954, AN 1,598/2,085, Dhp 449/449, Ja 512/547, Vinaya 370/443 texts; every text the commentary numbers is aligned except 8 known exceptions. `server/data/commentary.json.gz`, 10.8 MB |
| Post-canonical books | All 109 VRI Ṭīkā and Añña books (Visuddhimagga, its Mahāṭīkā, Abhidhammatthasaṅgaha, Mahāvaṃsa and the sub-commentaries), labelled `canonical: false` (`get_post_canonical`, `search_post_canonical`). `server/data/postcanonical.json.gz`, 14.5 MB |
| Word analysis | Digital Pāḷi Dictionary v0.4.20261026 subset: 89,763 headwords, 753 roots and the word forms of the bundled texts; 99.73% of words in the citable text passages are known (`analyse_passage`, offline `lookup_pali`). `server/data/dpd.json.gz`, 5.3 MB |
| Works offline | All Pāli reading, citation lookup, PTS and edition page lookup, Pāli search and script conversion |

Word analysis also accepts post-canonical citations and complete-root-book selections. The 99.73% figure above measures indexed canonical passages only; it does not measure later literature or file front matter. The DPD subset is unchanged. Other words remain unknown, and dictionary glosses are not translations.

"Texts" here means the units people cite: a sutta, a verse, a rule, a Khandhaka chapter, an Abhidhamma section. Some collections are counted by verse (Dhammapada) and some by chapter or story.

All 61 root files can also be read from beginning to end using `get_text` with a `book` ID from `browse_canon` (`node: "books"`). This includes source headings and front matter outside individual citation spans. These are source-book readings, not additional citable texts; the 8,544-unit count stays the same. See [complete source-book reading](citations.md#complete-vri-source-books).

## Sutta Piṭaka: discourses (6,999 texts)

| Collection | Citation | Texts | Grouped | Approximate | English (texts) |
|---|---|---:|---:|---:|---:|
| Dīgha Nikāya, long discourses | DN | 34 | | | 16 |
| Majjhima Nikāya, middle-length discourses | MN | 152 | | | 112 |
| Saṃyutta Nikāya, connected discourses | SN | 1,954 | 135 | 56 | 483 |
| Aṅguttara Nikāya, numbered discourses | AN | 2,085 | 677 | 141 | 390 |
| Khuddakapāṭha | Kp / Khp | 9 | | | 9 |
| Dhammapada | Dhp | 449 verses | 423 | | 449 (via 26 chapters) |
| Udāna | Ud | 80 | | | 80 |
| Itivuttaka | Iti | 112 | | | 109 |
| Sutta Nipāta | Snp (Sn) | 73 | | | 72 |
| Vimānavatthu | Vv | 85 | | | 2 |
| Petavatthu | Pv | 51 | | | 1 |
| Theragāthā | Thag | 264 | | | 109 |
| Therīgāthā | Thig | 73 | | | 36 |
| Apadāna (Thera and Therī) | Ap | 603 | | | — |
| Buddhavaṃsa | Bv | 29 | | | — |
| Cariyāpiṭaka | Cp | 35 | | | — |
| Jātaka (the verses of the 547 birth stories) | Ja | 547 | | | — |
| Mahāniddesa | Mnd | 16 | | | — |
| Cūḷaniddesa | Cnd | 23 | | | — |
| Paṭisambhidāmagga | Ps | 31 | | | — |
| Milindapañha | Mil | 248 | | | — |
| Nettippakaraṇa | Ne | 37 | | | — |
| Peṭakopadesa | Pe | 9 | | | — |

## Vinaya Piṭaka: monastic discipline (443 texts)

| Part | Citation | Texts | Approximate |
|---|---|---:|---:|
| Bhikkhu Vibhaṅga (monks' rules): Pārājika, Saṅghādisesa, Aniyata, Nissaggiya Pācittiya, Pācittiya, Pāṭidesanīya, Sekhiya, Adhikaraṇasamatha | Bu Pj 1 … Bu As 7 | 228 | 5 |
| Bhikkhunī Vibhaṅga (nuns' rules) | Bi Pj 5 … Bi As 7 | 142 | 12 |
| Khandhaka (Mahāvagga = Kd 1–10, Cūḷavagga = Kd 11–22) | Kd 1–22, Mv 1–10, Cv 1–12 | 22 | |
| Parivāra | Pvr 1.1 … | 51 | 1 |

Nuns' rules that are identical to monks' rules are not repeated in the Pāli, which is why the Bhikkhunī numbering has gaps. No English translation is linked yet.

## Abhidhamma Piṭaka: systematic teaching (1,102 texts)

| Book | Citation | Texts | Approximate | English (texts) |
|---|---|---:|---:|---:|
| Dhammasaṅgaṇī | Ds | 21 | | 2 |
| Vibhaṅga | Vb | 18 | | 2 |
| Dhātukathā | Dt | 19 | | — |
| Puggalapaññatti | Pp | 20 | | — |
| Kathāvatthu | Kv | 219 | | — |
| Yamaka | Ya | 77 | | — |
| Paṭṭhāna | Paṭṭhāna | 728 | 51 | — |

English is linked for four Abhidhamma texts, all from Ānandajoti Bhikkhu: two parts of the Dhammasaṅgaṇī mātikā and Vibhaṅga 6–7.

## English translations

Whole-unit counts exclude partial-unit and shared-page translation mappings. `npm run coverage -- --json` reports `partial_texts`, `partial_links` and separate `partial_dhammatalks`/`partial_ati`/`partial_anandajoti` counts. It counts all indexed records, including ranges, matching this document’s direct-link figures; `list_sources` counts grouped ranges through their members. Neither a partial link nor its containing unit implies whole-unit translation coverage. The public [citation export](export.md) preserves partial scope and keeps CSV whole-unit fields separate. Two reviewed ATI partial sources are activated: Ānanda VRI1037–1039 and Sirimaṇḍa448–452, with one partial-only unit. Exact consent and verse/Pāli/full-notice pins are mandatory; editorial prefaces are excluded. See [the partial pilot](data/thag-excerpt-review.md). Shared sources have separate runtime `shared_links`, `with_shared_english`, `shared_only` and `shared_by_source` counts. `shared_links` counts owner declarations once; member counts mean only that a shared publisher page names those texts, not that individual wording is aligned. The CLI similarly reports `shared_links`, `shared_texts` and per-provider `shared_*` counts. Twelve reviewed ATI shared publisher pages are activated separately: eight compilations and four condensed pages, `shared_links: 12`, 110 actual indexed subject records and 52 shared-only records. Five subjects are primary VRI peyyāla range records; their numbered children are not separately reviewed or counted. The additions do not increase whole-unit coverage. See [the pilot](data/luminous-shared-page-pilot.md), [paired-page review](data/paired-shared-page-expansion.md), [early-AN review](data/early-an-shared-page-expansion.md) [condensed source-range review](data/condensed-primary-ranges.md) [family/Protectors review](data/family-protectors-review.md) [seven-page attribution audit](data/iti-range-binding-audit.md) and [provider scope audit](data/provider-scope-audit.md) and [verse scope review](data/verse-scope-review.md).

| Source | Links | Notes |
|---|---:|---|
| Ṭhānissaro Bhikkhu, dhammatalks.org | 1,274 | Current versions of his translations |
| Access to Insight | 1,147 | Ṭhānissaro's earlier versions (854) and about 25 other translators, among them Maurice Walshe, John D. Ireland, Andrew Olendzki, Acharya Buddharakkhita, Nyanaponika Thera, Piyadassi Thera, Ñāṇamoli Thera and Bhikkhu Bodhi; each page keeps its own licence notice |
| Ānandajoti Bhikkhu, Ancient Buddhist Texts | 153 | Line-by-line Pāli and English (CC BY-SA 3.0): Udāna, Dhammapada chapters, most of the Pārāyanavagga, the Bhikkhunīsaṃyutta, DN 16, several MN, SN and AN suttas, two parts of the Dhammasaṅgaṇī mātikā and Vibhaṅga 6–7. Each link is checked against the Pāli on the page |

A translation is linked only on strong evidence: a matching number and title, a PTS start page that identifies exactly one text, or a confirmed title. When the evidence is ambiguous we leave the text unlinked, so some texts that do have a translation online are not linked yet. A second, content-based pass ([#37](https://github.com/DaniilKi/pali-canon-claude/issues/37)) places a page only when rare names in the English occur in exactly one nearby Pāli text, or its Pāli title names exactly one; each such link stores its evidence and is audited.

## Parallels and cross-references

`get_parallels` links a text to others in two ways, built offline from the bundled VRI edition ([D59](decisions.md)). Every link says which kind it is and how it was matched.

- **Commentary citations** (5,303): the traditional commentary on one text cites another. Most (4,755) are VRI's own references in brackets, confirmed by finding the quoted words in the cited paragraph; 401 are VRI references with no quotation to check (never used for SN or AN); 147 are suttas named in the commentary whose name, diacritics included, is the title of exactly one text and of no other text's title or Digital Pāḷi Dictionary sutta name, and whose neighbouring quotation, if any, comes from that text.
- **Shared passages** (1,517): two canonical texts share a passage word for word. Stock formulae (runs found in more than 4 texts, or built only from common phrases) are left out.

| Collection | Texts | With any link | With a commentary citation | With a shared passage |
|---|---:|---:|---:|---:|
| Dīgha Nikāya (DN) | 34 | 34 | 32 | 31 |
| Majjhima Nikāya (MN) | 152 | 148 | 136 | 110 |
| Saṃyutta Nikāya (SN) | 1,954 | 633 | 324 | 444 |
| Aṅguttara Nikāya (AN) | 2,085 | 661 | 323 | 493 |

Many short SN and AN texts have no link: the commentary passes over them, and their shared wording is the stock wording of their series. No link is given rather than a doubtful one. For parallels in Chinese, Sanskrit and Tibetan texts, each result links to SuttaCentral (link only).

## Not included yet

| Missing | Plan |
|---|---|
| Visuddhimagga PTS page citations ("Vism 3"): refused until an openly licensed PTS-page concordance is found | [#21](https://github.com/DaniilKi/pali-canon-claude/issues/21) |
| Lao and Lanna checked against a printed edition (VRI publishes none at the pinned commit) and by native readers | [#26](https://github.com/DaniilKi/pali-canon-claude/issues/26) |
| English for Vinaya, Abhidhamma and most of the Khuddaka Nikāya | [#34](https://github.com/DaniilKi/pali-canon-claude/issues/34) |
| Translations in other languages | [#35](https://github.com/DaniilKi/pali-canon-claude/issues/35) |

To regenerate these numbers, see [development.md](development.md#coverage-numbers).

## Offline delivery check

The 5 November 2026 installed-package audit read every page of all 8,544 canonical text records and all 109 post-canonical books through the shipped MCP server. The returned text, citations and continuation offsets matched the source corpus. The server ran in an isolated directory with network access disabled. Translation-link metadata also matched for every canonical record.

For the same 8,544 records, commentary was available for 6,070; 2,474 returned an explicit notice that no passage was aligned. This does not mean the traditional commentary is absent: it may skip a repeated text, or an alignment has not been established confidently. The 266 approximate citation mappings retain their flags; metadata distinguishes explicit source sharing from unverified independent alignment. English translation bodies are fetched live and are not part of the offline bundle.

Run `npm run audit:installed` to repeat the check. The optional JSON report lists every text without an aligned commentary passage; see [the development guide](development.md#verify-every-text-in-the-installed-bundle). Passing this check verifies delivery against the bundled source data, without claiming that every source gap has been filled.

## Commentary beyond verified alignments

All 47 included VRI Aṭṭhakathā books are now searchable with `search_commentary` and readable directly with `get_commentary` book references. This includes introductions and unaligned material already present in the bundle. Search hits identify their exact source segment and nearby context. Direct book results are labelled as commentary and do not claim a root-text alignment. The counts of confidently aligned texts and source abbreviations above are unchanged.
