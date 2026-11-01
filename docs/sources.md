# Source library

Every source this project uses, links to, plans to use, or has decided not to use, with the reason and a direct link. The aim is that anyone, scholar or newcomer, can see exactly where each word comes from and go to the original.

Last reviewed: 1 November 2026 (v2.0.0).

## How we choose sources

A source is used only when it meets all five tests:

1. **Standing.** It is an edition or translation that the tradition or the scholarly community recognises.
2. **Permission.** Its licence or terms allow this use, and we follow them (attribution, non-commercial, share-alike).
3. **Respect.** Its authors or publishers have not asked that their work be kept out of AI tools. If they have, we link to them instead.
4. **Durability.** It is published somewhere stable (a versioned repository, an official mirror), so citations keep working.
5. **Verifiability.** It has stable identifiers (paragraph numbers, page numbers, URLs), so every passage can be checked.

## Status key

| Status | Meaning |
|---|---|
| **Bundled** | Shipped inside the tool; works offline |
| **Live** | Fetched from the source when you ask, with mirrors where available |
| **Build only** | Used once to build the data; nothing of it is shipped |
| **Linked** | We point you to it but do not fetch its content |
| **Planned** | On the roadmap, with an issue number |
| **To evaluate** | Promising; licence or quality still to confirm |
| **Declined** | Considered and not used, for the reason given |

## Pāli text

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **Chaṭṭha Saṅgāyana Tipiṭaka**, Vipassana Research Institute (VRI) | **Bundled** | The text of the Sixth Council (Yangon, 1954–56), the most widely used modern edition. Complete, carefully proofread, published as versioned XML with page markers for four other editions | Free for non-commercial use; attribute VRI | [tipitaka.org](https://www.tipitaka.org) · [GitHub](https://github.com/VipassanaTech/tipitaka-xml) |
| **Mahāsaṅgīti Tipiṭaka** (SuttaCentral's Pāli) | **Build only** | Used once to match standard citation numbers (MN 10, SN 46.131–140) to the VRI text. It is derived from VRI, so it is not an independent witness, and it is not shipped | Public Domain Mark 1.0 | [bilara-data](https://github.com/suttacentral/bilara-data) |
| **Pali Text Society editions** | **Bundled (page numbers only)** | The standard scholarly citation system ("M i 55"). We use VRI's own markers for PTS page breaks, not the PTS text | page numbers are facts | [palitextsociety.org](https://palitextsociety.org/) |
| **PTS texts on GRETIL** | **Declined** | Provided for scholarly use only | restricted | [GRETIL](https://gretil.sub.uni-goettingen.de/) |
| **Buddha Jayanti Tripiṭaka** (Sri Lanka) | **Declined for now** | Important Sinhala edition, but its no-derivatives licence and Sinhala-script source make conversion problematic. Revisit with the publisher for script support ([#26](https://github.com/DaniilKi/pali-canon-claude/issues/26)) | CC BY-ND | [tipitaka.lk](https://tipitaka.lk/) |
| **Thai Royal edition (Siam Raṭṭha) and Khmer edition** | **To evaluate** | Variant readings already arrive through VRI's notes; separate digital editions would add independent witnesses ([#28](https://github.com/DaniilKi/pali-canon-claude/issues/28)) | unconfirmed | — |

## English translations

| Translator / source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **Ṭhānissaro Bhikkhu**, dhammatalks.org | **Live** (fallback: his Access to Insight versions) | The largest freely licensed body of English sutta translations by one translator, actively maintained | CC BY-NC 4.0; "commercial" includes any sale | [dhammatalks.org/suttas](https://www.dhammatalks.org/suttas/) |
| **Access to Insight**, Barre Center for Buddhist Studies | **Live** (mirrors below) | Long-standing archive of translations by about 25 translators, with study guides and a subject index | Varies by page: CC BY-NC 4.0, BPS free distribution, public domain and others. Each page's notice is returned with its text | [accesstoinsight.org](https://www.accesstoinsight.org/) |
| **Access to Insight study guides** by Ṭhānissaro Bhikkhu ([Into the Stream](https://www.accesstoinsight.org/lib/study/into_the_stream.html), [The Four Noble Truths](https://www.accesstoinsight.org/lib/study/truths.html)) | **Linked** (reading plans, [#45](https://github.com/DaniilKi/pali-canon-claude/issues/45)) | Ready-made study sequences by a respected translator. `reading_plan` stores only the order of the texts each guide cites, checked against the verified link index; citations it cannot place on exactly one text are listed as omitted | CC BY-NC 4.0 (© Metta Forest Monastery); link only, no guide text is stored | [accesstoinsight.org/lib/study](https://www.accesstoinsight.org/lib/study/) |
| **Bhikkhu Sujato, Bhikkhu Brahmali** (SuttaCentral) | **Linked** | Excellent complete translations, but their authors and SuttaCentral ask that they not be used in AI tools. We honour that | CC0, with an explicit request (see below) | [suttacentral.net](https://suttacentral.net/) |
| **Ānandajoti Bhikkhu**, Ancient Buddhist Texts | **Planned** ([#34](https://github.com/DaniilKi/pali-canon-claude/issues/34)) | Careful text-and-translation editions, openly licensed | CC BY-SA 3.0 | [ancient-buddhist-texts.net](https://www.ancient-buddhist-texts.net/) |
| **Pali Text Society translations** (Horner, Woodward, Rhys Davids…) | **Planned** ([#34](https://github.com/DaniilKi/pali-canon-claude/issues/34)) | PTS has released many volumes under Creative Commons; includes the only complete English Vinaya | CC BY-NC (per volume) | [PTS copyright information](https://palitextsociety.org/copyright-information/) |
| **Bhikkhu Bodhi, Ñāṇamoli** (Wisdom Publications, BPS) | **Linked; ask permission** | The standard modern translations of MN, SN and AN, but under publisher copyright. A few are on Access to Insight with permission | copyright | [Wisdom Publications](https://wisdomexperience.org/) · [BPS](https://www.bps.lk/) |
| **Translations in Sinhala, Thai, Burmese, Vietnamese, Chinese, German and others** | **To evaluate** ([#35](https://github.com/DaniilKi/pali-canon-claude/issues/35)) | Most Theravāda Buddhists read in these languages | per source | — |

## Dictionaries and reference works

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **Digital Pāḷi Dictionary** (Bodhirasa Bhikkhu) | **Live**; offline copy **planned** ([#22](https://github.com/DaniilKi/pali-canon-claude/issues/22), [#23](https://github.com/DaniilKi/pali-canon-claude/issues/23)) | The most complete and actively maintained Pāli dictionary, with grammar, roots, compounds and inflections | CC BY-NC-SA 4.0 | [dpdict.net](https://www.dpdict.net/) · [data releases](https://github.com/digitalpalidictionary/dpd-db/releases) · [licence](https://docs.dpdict.net/license/) |
| **PTS Pāli–English Dictionary** (Rhys Davids & Stede, 1921–25) | **To evaluate** | The classic dictionary; age suggests public domain in many countries | to confirm | [Digital Dictionaries of South Asia](https://dsal.uchicago.edu/dictionaries/pali/) |
| **Dictionary of Pāli Proper Names** (Malalasekera) | **Planned** ([#32](https://github.com/DaniilKi/pali-canon-claude/issues/32)) | People and places in the canon; the original is described as public domain | to confirm | [revised edition discussion](https://discourse.suttacentral.net/t/revised-edition-of-the-dictionary-of-pali-proper-names/39992) |
| **Buddhist Monastic Code** (Ṭhānissaro Bhikkhu) | **Planned, linked** ([#40](https://github.com/DaniilKi/pali-canon-claude/issues/40)) | Rule-by-rule explanation of the Vinaya | free distribution | [dhammatalks.org](https://www.dhammatalks.org/) |

## Commentaries

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **Aṭṭhakathā** (commentaries), VRI | **Planned** ([#20](https://github.com/DaniilKi/pali-canon-claude/issues/20)) | The traditional Theravāda reading of the texts; same pinned VRI source as our Pāli | as VRI | [tipitaka-xml (`.att`)](https://github.com/VipassanaTech/tipitaka-xml) |
| **Ṭīkā** (sub-commentaries), Visuddhimagga, Abhidhammatthasaṅgaha, VRI | **Planned** ([#21](https://github.com/DaniilKi/pali-canon-claude/issues/21)) | Central to traditional study, especially Abhidhamma | as VRI | [tipitaka-xml (`.tik`, `.nrf`)](https://github.com/VipassanaTech/tipitaka-xml) |
| **PTS commentary translations** (for example Ñāṇamoli's *Dispeller of Delusion*) | **Planned** ([#36](https://github.com/DaniilKi/pali-canon-claude/issues/36)) | English access to the commentaries | CC BY-NC | [PTS](https://palitextsociety.org/copyright-information/) |

## Parallels, calendars, scripts and practice

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **SuttaCentral parallels** | **Linked** | The best parallels database; we link to it for every text | request not to use in AI | [suttacentral.net](https://suttacentral.net/) |
| **DharmaNexus** (now part of Dharmamitra) | **To evaluate; ask first** ([#29](https://github.com/DaniilKi/pali-canon-claude/issues/29)) | Computed text reuse across the Pāli canon | unstated; [permission letter drafted](outreach/dharmanexus.md) | [DharmaNexus](https://dharmamitra.org/db) |
| **splendidmoons** (Thai Mahānikāya calendar) | **Bundled (code port)** ([#42](https://github.com/DaniilKi/pali-canon-claude/issues/42)) | Thai lunar-calendar rules behind the `uposatha` and `festivals` tools; its published calendar is a test reference | MIT (code); dates are facts | [splendidmoons](https://splendidmoons.github.io/) · [code](https://github.com/splendidmoons/splendidmoons) |
| **pythaidate** (Pakkhagaṇanā) | **Bundled (code port)** ([#42](https://github.com/DaniilKi/pali-canon-claude/issues/42)) | The Dhammayut fortnight reckoning | MIT | [pythaidate](https://github.com/hmmbug/pythaidate) |
| **mmcal / ceMmDateTime** (Burmese calendar) | **Bundled (code port)** ([#42](https://github.com/DaniilKi/pali-canon-claude/issues/42)) | Myanmar calendar arithmetic | MIT | [mmcal](https://github.com/yan9a/mmcal) |
| **Meeus, *Astronomical Algorithms*** | **Bundled (formulas)** | Moon phases, moon and sun longitude for Sri Lankan poya days | published formulas | — |
| **Published uposatha and holiday lists** (Wat Metta, Sri Lanka gazettes, Myanmar Department of Civil Aviation holiday circulars, Krungsri Myanmar holidays) | **Build only (test reference)** | 2024–2026 dates the calendar is checked against; nothing is shipped | facts, cited with URLs | [docs/calendar.md](calendar.md#checked-against-published-calendars-20242026) |
| **uposatha** (jhanarato) | **Not used** | Python library for a Western forest-monastery calendar; the four traditions above are covered by the other sources | MIT | [uposatha](https://github.com/jhanarato/uposatha) |
| **Aksharamukha** | **Declined (licence)**; own transliterator planned ([#26](https://github.com/DaniilKi/pali-canon-claude/issues/26)) | Excellent script converter, but AGPL-3.0 would force that licence on the whole tool | AGPL-3.0 | [Aksharamukha](https://pypi.org/project/aksharamukha) |
| **Chanting books** (Amaravati, Abhayagiri) | **Planned, with permission** ([#44](https://github.com/DaniilKi/pali-canon-claude/issues/44)) | Daily recitation in Pāli and English | ask publishers | — |

## Peer projects

We are not the only Buddhist AI project. These are related, and we learn from them:

| Project | What it is | How we differ |
|---|---|---|
| [tripitaka-mcp](https://github.com/dhamma-seeker/tripitaka-mcp) | MCP server built on SuttaCentral's data and translations | We do not use SuttaCentral content, because SuttaCentral asks AI tools not to |
| [dhamma.gift MCP](https://dhamma.gift/docs/tech/mcp) | Search and comparison across editions | We bundle the whole canon offline and resolve PTS pages |
| [nbkhoi/sutta-mcp](https://github.com/nbkhoi/sutta-mcp) | Early MCP integration over SuttaCentral | Independent code; none copied |

Tools from other traditions that set the bar we measure against (details in the [roadmap](roadmap.md)): [Quran.com MCP](https://github.com/quran/quran-mcp), [Sefaria MCP](https://developers.sefaria.org/docs/the-sefaria-mcp), [StudyBible MCP](https://github.com/djayatillake/studybible-mcp), [tafsir-mcp](https://github.com/tafsircenter/tafsir-mcp).

## Mirrors: what happens when a site is down

| Need | Tried in order |
|---|---|
| Pāli text | Bundled; no network needed |
| Access to Insight | accesstoinsight.org → [bcbsit/ati](https://github.com/bcbsit/ati) on GitHub (the repository that deploys the site) → the same through the jsDelivr CDN → [digitalpalireader/accesstoinsight](https://github.com/digitalpalireader/accesstoinsight) |
| Ṭhānissaro Bhikkhu | dhammatalks.org → his earlier version on Access to Insight (and its mirrors), with a note that it is the earlier version |
| Dictionary | dpdict.net with retries; offline copy planned ([#23](https://github.com/DaniilKi/pali-canon-claude/issues/23)) |

## Why SuttaCentral is linked, not used

SuttaCentral's data is excellent and largely CC0 or public domain, and it is fully mirrored on GitHub (`bilara-data`, `sc-data`). Technically it would have been the most reliable choice. SuttaCentral has, however, asked clearly and repeatedly that its work not be used in AI tools:

- Its [licensing page](https://suttacentral.net/licensing) requests that its content "not be scraped or used in any way for the creation of datasets for generative AI or similar", including by apps built downstream of AI models.
- 41 publication records in `bilara-data/_publication-v2.json` repeat the request, including Bhikkhu Sujato's four Nikāyas and Bhikkhu Brahmali's Vinaya.
- Bhikkhu Sujato has repeated it on SuttaCentral's forum ([2024](https://discourse.suttacentral.net/t/i-have-some-questions-regarding-the-use-of-sutta-central-s-data/35565), [2026](https://discourse.suttacentral.net/t/clarification-on-provenance-and-preservation-of-the-mahasa-giti-pali-witness-snp2-4-pli-ms/44774)).

The request is not legally binding, but a scripture tool for Buddhists should honour the stated wishes of its sources. So we link to SuttaCentral for parallels and other translations and never fetch or bundle its content.

The one remaining use is narrow. The *numbering* most readers cite (MN 10, SN 46.131–140, `pli-tv-bu-vb-pj1`) is shared nomenclature, like chapter and verse. To place those numbers on the VRI text, the build once read the file names and opening words of the public-domain Mahāsaṅgīti Pāli. Only the number-to-location mapping and Pāli titles were kept.

## What you may do with retrieved text

| Content | You may | Please don't |
|---|---|---|
| VRI Pāli | Read, quote, share with credit to VRI | Sell it |
| Ṭhānissaro Bhikkhu | Quote and share with credit (CC BY-NC 4.0) | Sell it in any form |
| Access to Insight pages | Follow each page's notice, returned with its text | Sell it |
| Digital Pāḷi Dictionary | Use and adapt with credit, sharing alike (CC BY-NC-SA 4.0) | Use commercially |
| This software | Anything the MIT licence allows | — |

Full licence notices: [THIRD_PARTY.md](../THIRD_PARTY.md).

## Permission letters

We are writing to each source whose terms need confirming or whose permission we need. The letters, their contact routes and their status are in [outreach/](outreach/README.md). Replies are recorded in this file as they arrive; until then each source is used only as its published terms allow.

## Proposing a new source

Open an issue with the source, its licence or terms, where it is published, and what it would add. Check it against the five tests above. New live providers also need bounded retrieval and a live test; see [development.md](development.md).
