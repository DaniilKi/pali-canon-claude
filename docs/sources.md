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
| **Bhikkhu Sujato, Bhikkhu Brahmali** (SuttaCentral) | **Linked** | Excellent complete translations, but their authors and SuttaCentral ask that they not be used in AI tools. We honour that | CC0, with an explicit request (see below) | [suttacentral.net](https://suttacentral.net/) |
| **Ānandajoti Bhikkhu**, Ancient Buddhist Texts | **Live** (153 audited links, see below) | Careful line-by-line Pāli and English editions with notes, openly licensed. Adds 76 of the 80 Udāna suttas, most of the Pārāyanavagga, the Bhikkhunīsaṃyutta, Dhammapada chapters, DN 16, several MN, SN and AN suttas, two parts of the Dhammasaṅgaṇī mātikā, and the first English for Vibhaṅga 6 and 7 in this tool | CC BY-SA 3.0 Unported ([Copyright Notice](https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm), May 2013; page footers now link CC BY-SA 4.0). Attribute Ānandajoti Bhikkhu | [ancient-buddhist-texts.net](https://ancient-buddhist-texts.net/) |
| **Pali Text Society translations** (Horner, Woodward, Rhys Davids…) | **Waiting for an authorised digital text** ([#34](https://github.com/DaniilKi/pali-canon-claude/issues/34)) | PTS has released many volumes under Creative Commons; includes the only complete English Vinaya. Not linked yet: see "PTS Creative Commons volumes" below | CC BY-NC 3.0 (2013 list) or CC BY-NC 4.0 (2021 list) | [PTS copyright information](https://palitextsociety.org/copyright-information/) |
| **Bhikkhu Bodhi, Ñāṇamoli** (Wisdom Publications, BPS) | **Linked; ask permission** | The standard modern translations of MN, SN and AN, but under publisher copyright. A few are on Access to Insight with permission. Letters drafted, not sent: [Wisdom](outreach/wisdom-publications.md), [BPS](outreach/bps.md) | copyright | [Wisdom Publications](https://wisdomexperience.org/) · [BPS](https://www.bps.lk/) |
| **Translations in Sinhala, Thai, Burmese, Vietnamese, Chinese, German and others** | **Surveyed, none linked yet** ([#35](https://github.com/DaniilKi/pali-canon-claude/issues/35)) | Most Theravāda Buddhists read in these languages. See "Translations in other languages" below | per source | — |

### Ānandajoti Bhikkhu: how pages are linked

The index is `server/data/anandajoti.json`, built by `scripts/anandajoti/build.mjs` from the site's "Texts and Translations" section on 1 November 2026 (one page a second, cached outside the repository). Every page is printed line by line, Pāli above English, which lets the build check the text itself:

1. A page is a candidate only for the text the site itself names (its heading or index entry, for example "(MN 146 & MA 146 & AA 1.4.7)").
2. The page's Pāli must cover at least 60% of the VRI text of that unit (word 3-grams; the site follows the Sri Lankan Buddha Jayanti edition, so spellings differ slightly), and no other text in the same collection may come within 0.10 of it. Only the Pāli lines (printed in bold) are compared: the English lines and the translator's notes are set aside first. The VRI's list-item labels "(Ka)", "(Kha)" … are dropped, because the site prints lists without them. This catches renumbering and partial translations.
3. In SN and AN the Pāli title printed in the page's own heading must agree with ours as well (square brackets, the editor's additions, are ignored). The title is read from the site, never from our own data, and stored with the link as `pali_title`. A link is labelled `number+title+pali` only when such a title was read. Never by number alone.

Result: of 166 candidates (80 Udāna suttas, 26 Dhammapada chapters, 19 Pārāyanavagga sections, 10 Bhikkhunīsaṃyutta suttas and 31 other works), 153 are linked and 13 were rejected and left out:

- the site's "AN 3.62" (its Pāli is AN 3.61 in the standard numbering; its heading title is Titthāyatanasutta, ours for AN 3.62 is Bhayasutta);
- AN 8.52 (the site's heading title is Bhikkhunovādakasutta, ours is Ovādasutta) and SN 35.95 (the site spells Māluṅkyaputtasutta, ours Mālukyaputtasutta): the Pāli matches, but the SN/AN title rule is kept strict;
- Dhammasaṅgaṇī mātikā, pairs (Ds 1.2, match 0.57): the site follows another edition's spellings here (for example *saññojana* where the VRI has *saṃyojana*);
- DN 22 (the site's index links only some of its pages, so the build read an incomplete text);
- Ud 4.10, 5.10, 6.6 and 8.10, Dhp 383–423 and Snp 5.3, 5.6 and 5.19, whose match fell below the threshold or was not clearly the best.

An earlier build (first version of this pull request) had a broken pattern for the bold Pāli lines, so it compared the whole page, English included, and took the SN 5 titles from our own data. Both are fixed; the rebuild added Snp 5.2, 5.7 and 5.17 and the mātikā triads and discourse pairs (Ds 1.1, 1.3, once the "(Ka)" labels were dropped) and removed AN 8.52 and SN 35.95. `node scripts/anandajoti/audit.mjs` re-fetches a fixed sample of 30 links through the server's own allowlisted client and re-checks the match; on 1 November 2026 all 30 passed. Not linked in this pass: the Mahākhandhaka edition (it covers only the opening sections of Kd 1), the chanting books (excerpts and compilations), the Jātaka pages (they translate the commentary stories, not only the canonical verses), and the Apadāna selection (not attempted).

Retrieval: `get_translation` with `translation_id` `aj:<page>` (for example `aj:Udana/1-Bodhivaggo-10`) or the translator name. The page is fetched live from `ancient-buddhist-texts.net/Texts-and-Translations/` only (the allowlist admits no other path on that host), with the licence and attribution. The translator's notes are marked `[Note: …]`. Where a page also translates the commentary (MN 44, MN 98, MN 146, AN 4.70, AN 6.37) those passages are marked `[Commentary (Aṭṭhakathā) begins]` and the result says they are commentary. Works spread over several pages (DN 16, MN 26, MN 85, MN 118, MN 119, Vibh 6, Vibh 7) are read only as far as the requested characters. A link to any one of their pages (index or part) resolves as a citation of the whole work.

A letter asking Ānandajoti Bhikkhu to confirm the licence and that live retrieval is welcome is drafted, not sent ([outreach/anandajoti.md](outreach/anandajoti.md)). If he prefers links only, the `aj:` retrieval is switched off and the links kept.

### PTS Creative Commons volumes

The [PTS copyright page](https://palitextsociety.org/copyright-information/) (checked 1 November 2026) lists, under CC BY-NC 3.0 (10 May 2013): Horner's *Book of the Discipline* (6 vols) and *Middle Length Sayings* (3 vols), *Kindred Sayings* (5 vols), *Gradual Sayings* (5 vols), *Buddhist Manual of Psychological Ethics*, *The Book of Analysis*, *Discourse on Elements*, *Designation of Human Types*, *Points of Controversy* and *Conditional Relations* (2 vols); and under CC BY-NC 4.0 (8 April 2021): Ñāṇamoli's *Dispeller of Delusion*, *The Guide*, *The Minor Readings and The Illustrator of the Ultimate Meaning*, *The Path of Discrimination* and *The Piṭaka Disclosure*.

Why none is linked yet:

- **No authorised digital text found.** The PTS site's free "Downloads" category lists 24 items (1 November 2026); the 16 on its first page are Pāli texts and studies such as the *Jinacarita*, *Dāṭhāvaṃsa* and *Pāli Metre*, none of them these translations. The copyright page links no files. Scans posted elsewhere by third parties have no stated provenance, so we do not link or read them.
- **No stable section addresses.** Linking "by section" needs a page or anchor per sutta, rule or paragraph. A scanned PDF gives only volume and page, which we could not check against the text.
- **Next step.** The [PTS letter](outreach/pts.md) (drafted, not sent) asks whether there is an authorised digital source. When there is one, the volumes go through the same build-and-audit route as Ānandajoti's pages: Horner's Vinaya first, as it would be the first English for the Vinaya here.


### Translations in other languages

Surveyed for [#35](https://github.com/DaniilKi/pali-canon-claude/issues/35) on 1 November 2026. We link a source only when its licence is published and allows this use, and when its pages can be matched to texts with the same strong evidence as English. Nothing in this table is linked yet. "Not stated" means we found no licence on the pages we checked; it does not mean the work is free.

| Language | Source | What we found | Terms found | Status |
|---|---|---|---|---|
| Chinese | 《漢譯南傳大藏經》 (Chinese translation of the Pāli canon, Yuan Heng Temple), vols 1–70, in the CBETA collection | [CBETA's copyright page](https://www.cbeta.org/copyright.php) lists it as a base text, © 元亨寺 (Yuan Heng Temple), used with the copyright holder's permission | CBETA database [CC BY-NC-SA 3.0 Taiwan](https://creativecommons.org/licenses/by-nc-sa/3.0/tw/); non-profit use only; content must not be substantially changed; credit required | **Candidate.** Openly licensed for non-commercial use. Needs a text-by-text mapping to our IDs with strong evidence before any link |
| German | [palikanon.com](https://www.palikanon.com/) (German translations of the Tipiṭaka) | The home page lists German translations of texts from all three piṭakas | Not stated on the home page | **To evaluate.** Licence must be confirmed per translator |
| Sinhala | [tipitaka.lk](https://tipitaka.lk/) (Buddha Jayanti Tripiṭaka) | Already recorded above for its Pāli edition | CC BY-ND, as recorded in the Pāli text table | **Declined for now**, with the edition (no-derivatives licence; see [#26](https://github.com/DaniilKi/pali-canon-claude/issues/26)) |
| Thai | [84000.org](https://www.84000.org/) (Thai Tipiṭaka site) | Our automated check was refused (HTTP 403) | Not checked | **To evaluate** by hand |
| Vietnamese | [budsas.org](https://www.budsas.org/) (BuddhaSasana, Binh Anson) | The home page has a Vietnamese section | Not stated on the home page | **To evaluate** |
| Burmese | — | No source checked yet | — | **Open** |

"Done" for #35 needs at least three languages linked; that waits on licences being confirmed. Letters to these sources are not drafted yet.

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
| **PTS commentary translations** (Ñāṇamoli's *Dispeller of Delusion* (Vibhaṅga commentary) and *The Minor Readings and The Illustrator of the Ultimate Meaning* (Khuddakapāṭha with its commentary); his *The Guide*, *The Path of Discrimination* and *The Piṭaka Disclosure* translate texts that are in the bundled canon and follow the #34 route) | **Waiting** ([#36](https://github.com/DaniilKi/pali-canon-claude/issues/36)) | English access to the commentaries. Two blockers: no authorised digital text (see "PTS Creative Commons volumes" above), and the Pāli commentaries are not yet bundled ([#20](https://github.com/DaniilKi/pali-canon-claude/issues/20)), so there is no paragraph to link to | CC BY-NC 4.0 | [PTS](https://palitextsociety.org/copyright-information/) |
| **Ānandajoti Bhikkhu's commentary translations** | **Live, inside sutta pages only** | His editions of MN 44, MN 98, MN 146, AN 4.70 and AN 6.37 include the commentary (Majjhima and Aṅguttara Aṭṭhakathā) line by line. They are returned with the sutta and marked as commentary. His *Aggatherīvatthu* (stories of the foremost nuns) and *Jātakagāthāvaṇṇanā* are not linked until the commentaries are bundled (#20) | CC BY-SA 3.0 | [Texts and Translations](https://ancient-buddhist-texts.net/Texts-and-Translations/index.htm) |

## Parallels, calendars, scripts and practice

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **SuttaCentral parallels** | **Linked** | The best parallels database; we link to it for every text | request not to use in AI | [suttacentral.net](https://suttacentral.net/) |
| **DharmaNexus** (now part of Dharmamitra) | **To evaluate; ask first** ([#29](https://github.com/DaniilKi/pali-canon-claude/issues/29)) | Computed text reuse across the Pāli canon | unstated; [permission letter drafted](outreach/dharmanexus.md) | [DharmaNexus](https://dharmamitra.org/db) |
| **splendidmoons**, **uposatha** | **Planned** ([#42](https://github.com/DaniilKi/pali-canon-claude/issues/42)) | Uposatha and festival calendars by tradition | MIT | [splendidmoons](https://pypi.org/project/splendidmoons/) · [uposatha](https://github.com/jhanarato/uposatha) |
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
| Ānandajoti Bhikkhu | Quote, share and adapt with credit to Ānandajoti Bhikkhu, under the same licence (CC BY-SA 3.0) | Republish adaptations under other terms |
| Access to Insight pages | Follow each page's notice, returned with its text | Sell it |
| Digital Pāḷi Dictionary | Use and adapt with credit, sharing alike (CC BY-NC-SA 4.0) | Use commercially |
| This software | Anything the MIT licence allows | — |

Full licence notices: [THIRD_PARTY.md](../THIRD_PARTY.md).

## Permission letters

We are writing to each source whose terms need confirming or whose permission we need. The letters, their contact routes and their status are in [outreach/](outreach/README.md). Replies are recorded in this file as they arrive; until then each source is used only as its published terms allow.

## Proposing a new source

Open an issue with the source, its licence or terms, where it is published, and what it would add. Check it against the five tests above. New live providers also need bounded retrieval and a live test; see [development.md](development.md).
