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
| **Dictionary of Pāli Proper Names** (Malalasekera, 1937–38) | **Linked; ask permission** ([#32](https://github.com/DaniilKi/pali-canon-claude/issues/32)). `lookup_name` is built but ships no entries | People and places in the canon. Public-domain status could not be confirmed; see [DPPN licence research](#dppn-licence-research) | unconfirmed; probably in copyright | [revised edition (Ānandajoti)](https://ancient-buddhist-texts.net/Textual-Studies/DPPN/index.htm) · [palikanon.com](https://www.palikanon.com/english/pali_names/dic_idx.html) |
| **Buddhist Monastic Code** (Ṭhānissaro Bhikkhu) | **Planned, linked** ([#40](https://github.com/DaniilKi/pali-canon-claude/issues/40)) | Rule-by-rule explanation of the Vinaya | free distribution | [dhammatalks.org](https://www.dhammatalks.org/) |
| **Access to Insight General Index and Numerical Index** (Barre Center for Buddhist Studies) | **Bundled (topic names and links only)** | The `topic` and `list_topics` tools: 472 topics with 1,385 links to canon texts, from a long-standing, hand-made index. Pinned to commit `45fedca` of [bcbsit/ati](https://github.com/bcbsit/ati); built by `scripts/build_topics.mjs`. ATI's descriptive wording is not copied. SN, AN, Snp, Thag and Thig links are kept only when the bundled translation index already ties that exact page to a text; never by number alone ([#30](https://github.com/DaniilKi/pali-canon-claude/issues/30)) | CC BY 4.0 (the index pages); attribution returned with every result | [General Index](https://www.accesstoinsight.org/index-subject.html) · [Numerical Index](https://www.accesstoinsight.org/index-number.html) |
| **Numbered lists** (this project) | **Bundled** | The `dhamma_list` tool: 37 standard lists (four noble truths, five aggregates, the thirty-seven aids, ten fetters, twelve links…) with the canonical passage that sets each out. Every Pāli member name is checked in the VRI text of each defining passage by a test. English glosses are short labels written for the index, not translations. Later lists (the ten pāramīs) are labelled as later ([#31](https://github.com/DaniilKi/pali-canon-claude/issues/31)) | MIT (our curation); the Pāli is VRI's | [docs/topics.md](topics.md) |
| **DPD word families** as topics | **Not used yet** | Would need the full DPD database download (several hundred MB), larger than this build allows. Revisit with the offline dictionary ([#22](https://github.com/DaniilKi/pali-canon-claude/issues/22)) | CC BY-NC-SA 4.0 | [dpd-db releases](https://github.com/digitalpalidictionary/dpd-db/releases) |
| **Dictionary of Pāli Proper Names** (Malalasekera) | **Planned** ([#32](https://github.com/DaniilKi/pali-canon-claude/issues/32)) | People and places in the canon; the original is described as public domain | to confirm | [revised edition discussion](https://discourse.suttacentral.net/t/revised-edition-of-the-dictionary-of-pali-proper-names/39992) |
| **Buddhist Monastic Code**, Volume I (Ṭhānissaro Bhikkhu, third edition, revised 2025) | **Linked** ([#40](https://github.com/DaniilKi/pali-canon-claude/issues/40)): the `vinaya_rule` tool links each of the 227 monks' rules to the section that explains it. Only the section URLs are bundled, read from the book's own table of contents on 2026-11-01 (`scripts/build-bmc.mjs`); no text is fetched or stored. It is commentary, not scripture | Rule-by-rule explanation of the Vinaya by a living teacher, freely licensed | CC BY-NC 4.0; "commercial" includes any sale | [dhammatalks.org/vinaya/bmc](https://www.dhammatalks.org/vinaya/bmc/Section0000.html) |
| **A Practical Grammar of the Pāli Language** (Charles Duroiselle, 3rd ed. 1921) | **Linked** from `pali://pronunciation` ([#41](https://github.com/DaniilKi/pali-canon-claude/issues/41)) | The standard free beginner grammar | Public domain: published 1921 (before 1931, US); author died 1951 (life + 70 ended 2022) | [scan](https://archive.org/details/in.ernet.dli.2015.61817) · [record](https://archive.org/metadata/in.ernet.dli.2015.61817) · [author dates](https://whowaswho-indology.info/?p=1673) |
| **Handbook of Pāli** (Oscar Frankfurter, 1883) | **Linked** from `pali://pronunciation` | Early grammar with reader and glossary | Public domain (Internet Archive: NOT_IN_COPYRIGHT) | [scan](https://archive.org/details/handbookofpalibe00franuoft) · [record](https://archive.org/metadata/handbookofpalibe00franuoft) |
| **A Simplified Grammar of the Pāli Language** (Edward Müller, 1884) | **Linked** from `pali://pronunciation` | Short reference grammar | Public domain (Internet Archive: NOT_IN_COPYRIGHT) | [scan](https://archive.org/details/simplifiedgramma00mulliala) · [record](https://archive.org/metadata/simplifiedgramma00mulliala) |
| **Pāli Literatur und Sprache** (Wilhelm Geiger, 1916, German) | **Linked** from `pali://pronunciation` | Scholarly grammar including phonology | Public domain (Internet Archive: NOT_IN_COPYRIGHT; author died 1943). The English translation is not linked: status not verified | [scan](https://archive.org/details/paliliteraturund00geiguoft) · [record](https://archive.org/metadata/paliliteraturund00geiguoft) |
| *Introduction to Pali* (A. K. Warder); *A Pali Grammar for Students* (Steven Collins) | **Declined** (not linked) | Excellent, but in copyright with no open licence | in copyright | none |

## Commentaries

| Source | Status | Why | Terms | Link |
|---|---|---|---|---|
| **Aṭṭhakathā** (commentaries), VRI | **Planned** ([#20](https://github.com/DaniilKi/pali-canon-claude/issues/20)) | The traditional Theravāda reading of the texts; same pinned VRI source as our Pāli | as VRI | [tipitaka-xml (`.att`)](https://github.com/VipassanaTech/tipitaka-xml) |
| **Ṭīkā** (sub-commentaries), Visuddhimagga, Abhidhammatthasaṅgaha and the other VRI Añña books | **Bundled** ([#21](https://github.com/DaniilKi/pali-canon-claude/issues/21)): `server/data/postcanonical.json.gz`, all 109 books with their text (41 Ṭīkā-section and 68 Añña books, 14.5 MB), offline; nothing is downloaded. Labelled `canonical: false`. No PTS pages for the Visuddhimagga: the VRI edition has none, and the GRETIL PTS text is declined | Central to traditional study, especially Abhidhamma | as VRI | [tipitaka-xml (`.tik`, `.nrf`, `e01*`)](https://github.com/VipassanaTech/tipitaka-xml), same pinned commit |
| **PTS commentary translations** (Ñāṇamoli's *Dispeller of Delusion* (Vibhaṅga commentary) and *The Minor Readings and The Illustrator of the Ultimate Meaning* (Khuddakapāṭha with its commentary); his *The Guide*, *The Path of Discrimination* and *The Piṭaka Disclosure* translate texts that are in the bundled canon and follow the #34 route) | **Waiting** ([#36](https://github.com/DaniilKi/pali-canon-claude/issues/36)) | English access to the commentaries. Two blockers: no authorised digital text (see "PTS Creative Commons volumes" above), and the Pāli commentaries are not yet bundled ([#20](https://github.com/DaniilKi/pali-canon-claude/issues/20)), so there is no paragraph to link to | CC BY-NC 4.0 | [PTS](https://palitextsociety.org/copyright-information/) |
| **Ānandajoti Bhikkhu's commentary translations** | **Live, inside sutta pages only** | His editions of MN 44, MN 98, MN 146, AN 4.70 and AN 6.37 include the commentary (Majjhima and Aṅguttara Aṭṭhakathā) line by line. They are returned with the sutta and marked as commentary. His *Aggatherīvatthu* (stories of the foremost nuns) and *Jātakagāthāvaṇṇanā* are not linked until the commentaries are bundled (#20) | CC BY-SA 3.0 | [Texts and Translations](https://ancient-buddhist-texts.net/Texts-and-Translations/index.htm) |

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
| **Chanting books** (Amaravati, Abhayagiri) | **Permission not yet asked**: request letters drafted, not sent ([#44](https://github.com/DaniilKi/pali-canon-claude/issues/44)); the `paritta` tool already gives the Pāli of each chant from the bundled VRI text and links English from dhammatalks.org and Access to Insight. No chanting-book layout or English is included until a publisher agrees | Daily recitation in Pāli and English | ask publishers; letters drafted, not sent: [Amaravati](outreach/amaravati.md), [Abhayagiri](outreach/abhayagiri.md) | — |
| **Chant recordings** | **Deferred** ([#44](https://github.com/DaniilKi/pali-canon-claude/issues/44)): no recording source has been chosen or checked yet. The `paritta` tool links no audio | Hearing the chants | to check per source before any link is added | — |
| **Chanting books** (Amaravati, Abhayagiri) | **Planned, with permission** ([#44](https://github.com/DaniilKi/pali-canon-claude/issues/44)) | Daily recitation in Pāli and English | ask publishers | — |
| **Dhamma talks by Ṭhānissaro Bhikkhu**, dhammatalks.org | **Linked (live search, link-only)** ([#46](https://github.com/DaniilKi/pali-canon-claude/issues/46)) | Practitioners want teachings on a passage, not only the passage. `find_talks` asks the site's own [search page](https://www.dhammatalks.org/search/) for evening and morning talks and returns titles, dates and URLs only, never talk text or search snippets. The site has no passage-to-talk index, so a passage is searched by the exact title of Ṭhānissaro's translation (for example "To the Kalamas" for AN 3.65) and the result says the phrase appears, not that the talk is about the sutta. A title is searched only when it has three or more distinctive words, or a Pāli name and at least three words, and is not part of another of his translation titles; common phrases such as "Mindfulness of Breathing" and verse-only passages are not searched. Results are paged with a cursor so every match on the site stays reachable. Checked 1 November 2026: for the generic user-agent `*` in robots.txt (which covers this server's user agent), everything except `/Archive/MachineTranscripts/` is allowed (that path is never requested or linked); about fifteen named bots, such as SemrushBot, AhrefsBot and Bytespider, are disallowed from the whole site. The site publishes no other terms of use. Requests are cached and spaced at least one second apart | CC BY-NC 4.0; "commercial" includes any sale. Talks are commentary, not scripture | [dhammatalks.org/audio](https://www.dhammatalks.org/audio/) |
| **Small embedding models** (potion-base-8M, all-MiniLM-L6-v2, paraphrase-multilingual-MiniLM-L12-v2) | **Declined for now (quality)** ([#33](https://github.com/DaniilKi/pali-canon-claude/issues/33)) | Tested for search by meaning over the VRI Pāli: barely above chance for English questions, and none of the well-known answers was found, because no small model knows Pāli and the English translations may not be stored. Measurements in [semantic-search.md](semantic-search.md) | MIT, Apache-2.0 | [Hugging Face](https://huggingface.co/minishlab/potion-base-8M) |

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

## DPPN licence research

Checked on 1 November 2026 for [#32](https://github.com/DaniilKi/pali-canon-claude/issues/32). Result: **not confirmed as public domain or openly licensed**, so no entries are bundled.

| What we checked | What it says |
|---|---|
| The work | G. P. Malalasekera, *Dictionary of Pāli Proper Names*, 2 vols., London: John Murray for the Pali Text Society (Indian Texts Series), 1937–38; reprinted by the PTS and by Indian publishers. Library catalogues ([Wellcome Collection](https://content.wellcomecollection.org/works/n7umbnvr), [Penn Libraries](https://find.library.upenn.edu/catalog/99896953503681)) give the author's dates as 1899–1973 |
| Copyright term (our reading, not legal advice) | The UK and Sri Lanka protect works for the author's life plus 70 years, which would run to the end of 2043. In the United States a foreign work of 1937–38 still in copyright at home in 1996 would have had its copyright restored for 95 years from publication (to the end of 2032 and 2033). On none of these readings is it public domain today |
| [Pali Text Society copyright page](https://palitextsociety.org/copyright-information/) | Lists the works the PTS has released under Creative Commons (eleven in 2013 under CC BY-NC 3.0, including the *Pali-English Dictionary*; five Ñāṇamoli works in 2021 under CC BY-NC 4.0). The DPPN is **not** among them |
| [Ānandajoti Bhikkhu's revised edition](https://ancient-buddhist-texts.net/Textual-Studies/DPPN/index.htm) (Ancient Buddhist Texts) | States no licence or permission for the dictionary; its note asks that it not be quoted without checking the printed text. Ānandajoti's own translations are CC BY-SA, but that does not cover Malalasekera's text |
| [palikanon.com](https://www.palikanon.com/english/pali_names/dic_idx.html) | Says most entries are taken from Malalasekera and points to the printed edition from the PTS; states no licence |
| [aimwell.org](https://www.aimwell.org/DPPN) | States no licence |
| [Digital Pāḷi Dictionary](https://github.com/digitalpalidictionary/dpd-db) | Does not bundle the DPPN; its documentation lists the DPPN only as a separate dictionary users can install |
| [SuttaCentral forum thread](https://discourse.suttacentral.net/t/revised-edition-of-the-dictionary-of-pali-proper-names/39992) | A user calls the work "now public domain", without a source. Not enough on its own |

What happens now: `lookup_name` returns no dictionary entry, says why, links to the two online editions and lists the texts of the bundled VRI canon whose Pāli contains the name. Each word of the name is searched separately (Ajātasattu Vedehiputta, Mahā Moggallāna). Texts with the name in the title come first, then texts naming it in the opening paragraphs (the nidāna), then the rest. One-word names of five letters or fewer (Uda, Nanda) are matched as whole words with a case ending; `exactWord: true` does the same for longer names (Ānanda without ānandajāta, joyful). This is a word search, not a dictionary: the tool says so in its result. The data file is `server/data/dppn.json`; entries can be added there, each with its citations checked against the bundled canon by `tests/dppn.test.mjs`, once the Pali Text Society (or Ānandajoti Bhikkhu, for the revised edition) gives written permission. Their reply will be recorded here.

## Permission letters

We are writing to each source whose terms need confirming or whose permission we need. The letters, their contact routes and their status are in [outreach/](outreach/README.md). Replies are recorded in this file as they arrive; until then each source is used only as its published terms allow.

## Proposing a new source

Open an issue with the source, its licence or terms, where it is published, and what it would add. Check it against the five tests above. New live providers also need bounded retrieval and a live test; see [development.md](development.md).
