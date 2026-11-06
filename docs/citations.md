# Citation guide

How to refer to a text so the tool finds it, and how the tool handles the different numbering systems in use. Everything on this page works offline.

## The short version

Type a citation the way you would write it in an essay. All of these work:

```text
MN 10      SN 56.11      SN 56:11      AN 3.65      DN 16      Dhp 183      Dhp 1-20
Snp 1.8    Sn 1.8        Ud 1.10       Iti 27       Thag 1.1   Thig 5.1     Ja 1
Kp 9       Khp 9         Mil 1         Kv 1.1       Ds 1.1     Paṭṭhāna 1
Pj 1       Bu Pj 1       Bi Pc 5       Kd 1         Mv 1       Cv 4         Pvr 1.1
M i 55     S v 420       A i 188       D ii 72      Vin iii 1
https://suttacentral.net/mn10   https://www.accesstoinsight.org/tipitaka/mn/mn.010.than.html
https://www.dhammatalks.org/suttas/MN/MN10.html
https://ancient-buddhist-texts.net/Texts-and-Translations/Udana/1-Bodhivaggo-10.htm
```

Full names work too: "Majjhima Nikāya 10", "Dhammapada 183", "Theragāthā 1.1". Diacritics are optional, and dots, colons and spaces are interchangeable.

## Collections and their abbreviations

| Collection | Accepted |
|---|---|
| Dīgha Nikāya | DN, D, Digha |
| Majjhima Nikāya | MN, M, Majjhima |
| Saṃyutta Nikāya | SN, S, Samyutta |
| Aṅguttara Nikāya | AN, A, Anguttara |
| Khuddakapāṭha | Kp, Khp |
| Dhammapada | Dhp, Dh |
| Udāna | Ud |
| Itivuttaka | Iti, It |
| Sutta Nipāta | Snp, Sn (capital S, small n), Stnp |
| Vimānavatthu, Petavatthu | Vv, Pv |
| Theragāthā, Therīgāthā | Thag, Th; Thig, Thī |
| Apadāna | Ap, Thī Ap |
| Buddhavaṃsa, Cariyāpiṭaka | Bv, Cp |
| Jātaka | Ja, J |
| Mahāniddesa, Cūḷaniddesa | Mnd (Nidd I), Cnd (Nidd II) |
| Paṭisambhidāmagga | Ps, Paṭis |
| Milindapañha, Nettippakaraṇa, Peṭakopadesa | Mil, Ne (Nett), Pe (Peṭ) |
| Abhidhamma | Ds (Dhs), Vb (Vibh), Dt (Dhātuk), Pp (Pug), Kv, Ya (Yam), Paṭṭhāna (Paṭṭh) |

**Sn and SN are different.** "Sn 1.8" is the Sutta Nipāta; "SN 1.8" is the Saṃyutta Nikāya. This follows standard scholarly usage.

## The Vinaya

| You write | Meaning |
|---|---|
| Pj 1, Ss 3, Ay 1, Np 10, Pc 5, Pd 1, Sk 20, As 1 | Monks' rule by class: Pārājika, Saṅghādisesa, Aniyata, Nissaggiya Pācittiya, Pācittiya, Pāṭidesanīya, Sekhiya, Adhikaraṇasamatha |
| Bu Pj 1 | The same, explicitly for monks (*bhikkhu*) |
| Bi Pc 5 | Nuns' rule (*bhikkhunī*) |
| Kd 1 … Kd 22 | Khandhaka chapter |
| Mv 1 … Mv 10 | Mahāvagga chapter (= Kd 1–10) |
| Cv 1 … Cv 12 | Cūḷavagga chapter (= Kd 11–22; Cv 4 is Kd 14) |
| Pvr 1.1 | Parivāra section |
| Vin i 1 … Vin v | PTS volume and page |

For any of the 227 monks' rules, the `vinaya_rule` tool also links the section of Ṭhānissaro Bhikkhu's *Buddhist Monastic Code* that explains it. The book discusses Sekhiya 1–24 in pairs (1 and 2, 3 and 4, …) and Sk 61 with Sk 62, so those rules share a link. The VRI edition gives the seven adhikaraṇa-samathas (As 1–7) as one paragraph, so all seven point to that paragraph (`get_text("pli-tv-bu-vb-as2")`).

Khandhakas are cited by chapter only. Read the chapter to reach a section inside it.

## PTS volume and page

Scholarly works cite the Pali Text Society edition by volume (roman numeral) and page: **M i 55** is volume 1 of the Majjhima, page 55. The tool returns the text that **begins** on that page, or the one that runs across it, and tells you what else is on the page.

- Write a space or dot between the parts: "M i 55" or "M.i.55". This is how the tool tells "Iti 27" (a sutta number) from "It i 27".
- Verse collections (Sn, Thag, Thig, Dhp, Ud, Iti, Khp) are cited by number, not page. The tool will say so.

Results also show the PTS page of every text, so you can cite it either way.

## Thai, Myanmar and VRI edition pages

Readers in Thailand and Myanmar often cite their national printed editions by volume and page. The VRI files bundled here record where each page of three printed editions begins, and the tool shows and accepts them:

| Edition | Write | Example |
|---|---|---|
| Thai (Siam Raṭṭha) | `Thai <collection> <volume>.<page>` | Thai MN 1.103 |
| Myanmar (Sixth Council) | `Myanmar <collection> <volume>.<page>` | Myanmar MN 1.70 |
| VRI printed edition | `VRI <collection> <volume>.<page>` | VRI MN 1.71 |

All three point to the opening of MN 10 (Mahāsatipaṭṭhāna Sutta).

- **Always name the collection.** VRI numbers these volumes *within each collection* (MN volumes 1–3, SN volumes 1–5 and so on), not across the whole edition as the printed Thai set does. So "Thai 9.55" alone cannot be looked up; the tool asks for the collection.
- **Single-volume collections take the page only:** "Thai Dhp 15", "Myanmar Thag 220".
- **Sn is still the Sutta Nipāta:** "Thai Sn 330" is the same as "Thai Snp 330"; "Thai SN 1.5" is the Saṃyutta.
- **Apadāna:** VRI prints the Therāpadāna and the Therīapadāna in one book, so "Thai Ap 2.300" covers both. "Thai Thi Ap 2.300" or "Thai Tha Ap 2.200" narrow it, and a page that begins in the other part is refused with the plain "Ap" form to use.
- **Volumes are arabic numerals:** "Thai MN 1.103", not "Thai MN i 103" (the tool suggests the right form).
- **Some pages are not marked.** The VRI data has gaps in some editions' page markers (Myanmar Thag jumps from page 19 to 220, for example). A page inside a gap is refused, and the tool names the nearest marked pages either side.
- **The Vinaya is cited by book:** Pj (Pārājika), Pc (Pācittiya), Mv (Mahāvagga), Cv (Cūḷavagga), Pvr (Parivāra), for example "Thai Mv 1.10".
- **VRI edition, SN and AN:** VRI repeats its volume numbers across the books (vaggas and nipātas) of these two collections, so add the book in brackets: "VRI SN 1.20 (Nidānavaggo)". Diacritics and the ending are optional ("(Nidanavagga)"). Without the book the tool lists the possibilities rather than guessing.
- Looser forms also work: "Thai ed. MN vol. 1 p. 103", "Myanmar edition DN 2.55", "thai mn 1:103".
- The tool returns the text in which that page **begins**, notes the VRI paragraph, and lists other texts printed on the same page. A page that begins in a line between two texts (for example a recitation formula) returns the text that follows, with a note.
- Not every edition is marked for every book. The VRI data has no Thai pages for the Milindapañha, Nettippakaraṇa and Peṭakopadesa; the tool says so instead of guessing.

`get_text` shows these page breaks on each segment (`thai_page_begins`, `myanmar_page_begins`, `vri_page_begins`, next to `pts_page_begins`), and `get_metadata` / `resolve_reference` give each text's first and last page break and the break before it (`edition_pages`). Every label they show can be pasted back as a citation; the audit checks this for all 56,050 markers.

## Two numbering systems

There is no single universal numbering. In parts of the Saṃyutta and Aṅguttara Nikāyas, two systems differ:

| System | Used by | Example |
|---|---|---|
| **Standard** (Bhikkhu Bodhi, SuttaCentral) | Most modern books and websites; **this tool's citations** | AN 7.68 |
| **PTS-based** | Ṭhānissaro Bhikkhu (dhammatalks.org), Access to Insight | the same text is AN 7.64 |

Another example: the Kālāma Sutta is AN 3.65 in the standard numbering and AN 3.66 on dhammatalks.org.

Ancient Buddhist Texts (Ānandajoti Bhikkhu) mostly uses the standard numbers, but not always: its Titthāyatanasutta is headed "AN 3.62", which is AN 3.61 in the standard numbering (AN 3.62 is the Bhayasutta). Because its Pāli did not match AN 3.62, that page is not linked.

An Ancient Buddhist Texts link is understood as a citation only for a page in the link index. Where the site spreads one work over several pages (DN 16, MN 26, MN 85, MN 118, MN 119, Vibh 6, Vibh 7), the index page and every part page resolve to the whole work, for example `https://ancient-buddhist-texts.net/Texts-and-Translations/Mahaparinibbanasuttam/02-Prevent-Vajji-Decline.htm` resolves to DN 16, not to a passage within it.

What the tool does:

- uses the standard number for every citation;
- links translations **by content** (title, PTS page), never by number alone in SN and AN;
- **reports the translator's own number** whenever it differs, so you can give both;
- treats the PTS volume and page as the anchor both systems share.

## Sutta names and linked English titles

`resolve_reference` also accepts indexed Pāli names and stored English translation titles. For example, `A Gallon Measure` (or `Gallon Measure`) resolves to SN 3.13, and `King Udena` to Ud 7.10, using the existing dhammatalks captions. The result identifies the matched name and its source; an article-stripped alias can appear in `name_match.matched_name`.

Names shared by several texts retain all candidates and the existing explicit DN/MN convention; other ambiguous names are not guessed. A single common English word needs a marker such as `sutta` or `chapter`, and a name containing digits does not enter name lookup. Use a canonical citation when a title is ambiguous. This lookup uses bundled metadata and does not fetch translation pages.

## Texts printed together

The edition prints some texts as one block: AN 1.296–305, Dhp 1–20 (a chapter), SN 46.143–152. You can ask for the whole block or any one member ("AN 1.300", "Dhp 5"); the tool tells you the member is part of a larger block.

An ordinary range that is not recorded as a single source group, such as `MN 10–12`, returns its first text with an explicit note. Both endpoints must exist in the bundled index, at the same numbering depth, and the full end path must not precede the start. A missing endpoint is an error even when the first text exists. This validates the endpoints; it does not retrieve the whole range or establish that every intermediate number is separately indexed.

## Abbreviated texts (peyyāla)

The Pāli often abbreviates repeated passages with "…pe…" ("and so on"). The bundled citation index has 266 **approximate** mappings: 199 explicitly share an indexed source span with another record; 67 have no confirmed independent location. The flag alone does not establish that the VRI edition abbreviates or omits a text. Nothing is expanded or reconstructed.

Metadata distinguishes `alignment.kind: "shared_passage"` (with `shared_with`) from `"unverified_alignment"`. For example, AN 1.82 and 1.83 retain a provisional span covering VRI paragraphs 81–83; the bundle does not establish a safe independent standard-number mapping for them. AN 1.82–97 also reports its four unverified member mappings and warns that the group span may include neighbouring passages. Reading, scoped search, commentary, word analysis and parallels carry the caution. These labels change no source text, citation number, span, approximation flag or commentary assignment.

## Citing what you retrieved

A complete citation names:

1. **the text**: MN 10 (and the translator's number, if different);
2. **the place**: VRI paragraph or PTS page (M i 55);
3. **the translator and source**: Ṭhānissaro Bhikkhu, dhammatalks.org, with the URL.

Example: *MN 10 (M i 55), tr. Ṭhānissaro Bhikkhu, https://www.dhammatalks.org/suttas/MN/MN10.html*.

Keep the Pāli, the translation, any dictionary gloss and your own interpretation clearly apart.

## Post-canonical books: Visuddhimagga, Abhidhammatthasaṅgaha, Ṭīkā

These books are **not the canon**. They are later Pāli works from the same VRI edition: the sub-commentaries (Ṭīkā), and the "Añña" (other) books, such as the Visuddhimagga and its Mahāṭīkā, the Abhidhammatthasaṅgaha, the chronicles and the grammars. Every result for them says `canonical: false` and carries a label and VRI's attribution. The canon search leaves them out unless you ask for them.

```text
Vism 1.1     Vism I,1     Vism IV.12   Vism ch. 4   Vism IV      Vism §51     visuddhi. 1.51
Abhidh-s 1   Abhidh-s I   Abhidh-s 1.4   Abhidh-s
mahavamsa    mahavamsa 3  mulapannasa-tika 2   s0201t   vibhanga-mulatika 1.1   mahavamsa §12
```

**Visuddhimagga.** Scholars cite it in two ways, and both are recognised:

- **Chapter and paragraph**, as in Ñāṇamoli's *The Path of Purification*: "Vism 1.1", "Vism I,1", "Vism IV.12". The 23 chapters are the same in the VRI edition, so the tool always finds the chapter. VRI numbers its paragraphs differently (one series, 1 to 896, through the whole book, and much longer paragraphs), and no open concordance between the two numberings exists that we could use. So "Vism 4.1" is exact (the start of chapter 4), but "Vism 4.12" returns the whole of chapter 4, marked **approximate**, with a note. Search for a phrase to find the paragraph.
- **PTS page**: "Vism 3" or "Vism p. 3" is page 3 of the Pali Text Society edition. The VRI edition has no PTS page breaks for the Visuddhimagga (it marks only the Myanmar and VRI pages), and the PTS text on GRETIL was declined as a source ([sources](sources.md)). The tool recognises these citations but **does not locate them**, rather than guess. It says so and suggests another form.
- A bare number after "Vism" is always read as a PTS page, as in the PTS dictionaries. Write a chapter as "Vism ch. 4" or "Vism IV".
- **VRI paragraph**: "Vism §51". VRI's own cross-references write "visuddhi. 1.51" (volume 1, paragraph 51); that form works too. It is not the same as "Vism 1.51" (chapter 1, paragraph 51).

`get_text` marks the Myanmar and VRI page breaks (`myanmar_page_begins`, `vri_page_begins`, written volume.page).

**Abhidhammatthasaṅgaha.** "Abhidh-s 1" is chapter 1 (of 9), "Abhidh-s 1.4" is chapter 1, section 4. Section numbers are VRI's paragraph numbers, which restart in each chapter. Other editions and translations (for example Bhikkhu Bodhi's *Comprehensive Manual of Abhidhamma*) number their sections themselves, so check the text before citing their numbers. Chapter 1 includes the two opening verses printed before its heading.

**Other books** are cited by the id that `get_post_canonical` lists (made from VRI's title, for example `mulapannasa-tika`, `mahavamsa`), or by the VRI file name (`s0201t`), or by the title. Add a chapter ("mahavamsa 3": the third chapter heading in the VRI file), a chapter and VRI paragraph ("mahavamsa 3.12"), or a VRI paragraph ("mahavamsa §12"). Many books restart their paragraph numbers; then "§12" is refused and the tool lists the chapter-qualified forms. Search results cite each hit in the most precise of these forms that leads back to a passage containing it; where paragraph numbers repeat within a chapter (some grammars), that is the chapter or the book. The id `abhidhammatthasangaho` names the whole VRI file, which also holds the Abhidhammatthavibhāvinī (chapters 10–18 there); use "Abhidh-s" for the Saṅgaha itself.

## When a citation does not resolve

The tool explains why: an unknown abbreviation, a number past the end of a collection, a reversed range, or a PTS page for a collection that is not cited by page. Use the browse tool ("browse sn56") to see what exists. If you believe the tool is wrong, please [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the citation, what you expected and, ideally, the PTS page.

## Checking every citation in a piece of text

The `find_citations` tool reads a whole essay, talk transcript or reference list, finds every citation in it and checks each one, all offline. For each citation it returns where it is in the text (character offsets), the text it names (ID and title) or, if it does not resolve, the reason (for example "MN 999 is not in the canon index" or "Sn 1032 looks like a verse number"). It never corrects a citation for you.

Running text is read more strictly than a single citation typed into `resolve_reference`, so that ordinary sentences are not mistaken for citations:

- Abbreviations are case-sensitive: "MN 10" is a citation, "mn 10" and "Mn 10" are not. Lower-case IDs written without a space ("mn10", "sn56.11:5.1") are read.
- Abbreviations that look like English or other books before a bare number are skipped: single letters (D, M, S, A, J), Dh, It, Th, Thī, Ne, Pe, Peṭ, Ps (often Psalms), Pp, Ya, Dt and As. Use MN, SN, Iti, Thag, Paṭis and so on, or full names. Single letters still work for PTS pages ("M i 55", "S v 420").
- Mahāvagga and Cūḷavagga are read as Vinaya chapters only after "Vinaya" ("Vinaya Mahāvagga 1"), or as Mv and Cv.
- Printed edition pages retain their edition prefix: `Thai MN 1.103`, `Myanmar Dhp 15` and `VRI SN 1.20 (Nidānavaggo)` are page references, not sutta or verse numbers. Edition names are case-insensitive. Parenthetical book qualifiers are recognised against bundled source titles using the same prefix matching as direct page lookup; ordinary parenthetical prose remains separate. Missing or ambiguous pages remain unresolved.
- Links count only for suttacentral.net, accesstoinsight.org, dhammatalks.org and ancient-buddhist-texts.net. ABT landing and part-page links use the existing bundled mappings; unknown paths remain unresolved. URL paths remain case-sensitive, and spaces in prose URLs must be URL-encoded (`%20`). Link checking here is offline; pages are not fetched.
- A number glued to letters ("MN 10th") or written with thousands separators ("MN 10,000") is not a citation.

A citation written in a form the scanner does not recognise is not checked, so check doubtful ones with `resolve_reference`.
