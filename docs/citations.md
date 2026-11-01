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

Khandhakas are cited by chapter only. Read the chapter to reach a section inside it.

## PTS volume and page

Scholarly works cite the Pali Text Society edition by volume (roman numeral) and page: **M i 55** is volume 1 of the Majjhima, page 55. The tool returns the text that **begins** on that page, or the one that runs across it, and tells you what else is on the page.

- Write a space or dot between the parts: "M i 55" or "M.i.55". This is how the tool tells "Iti 27" (a sutta number) from "It i 27".
- Verse collections (Sn, Thag, Thig, Dhp, Ud, Iti, Khp) are cited by number, not page. The tool will say so.

Results also show the PTS page of every text, so you can cite it either way.

## Two numbering systems

There is no single universal numbering. In parts of the Saṃyutta and Aṅguttara Nikāyas, two systems differ:

| System | Used by | Example |
|---|---|---|
| **Standard** (Bhikkhu Bodhi, SuttaCentral) | Most modern books and websites; **this tool's citations** | AN 7.68 |
| **PTS-based** | Ṭhānissaro Bhikkhu (dhammatalks.org), Access to Insight | the same text is AN 7.64 |

Another example: the Kālāma Sutta is AN 3.65 in the standard numbering and AN 3.66 on dhammatalks.org.

What the tool does:

- uses the standard number for every citation;
- links translations **by content** (title, PTS page), never by number alone in SN and AN;
- **reports the translator's own number** whenever it differs, so you can give both;
- treats the PTS volume and page as the anchor both systems share.

## Texts printed together

The edition prints some texts as one block: AN 1.296–305, Dhp 1–20 (a chapter), SN 46.143–152. You can ask for the whole block or any one member ("AN 1.300", "Dhp 5"); the tool tells you the member is part of a larger block.

## Abbreviated texts (peyyāla)

The Pāli often abbreviates repeated passages with "…pe…" ("and so on"). Where the edition does not print a text in full, the tool marks it **approximate** and points to the passage where the abbreviation occurs. There are 266 such texts, mostly in SN and AN repetition series, the Paṭṭhāna, and Vinaya rules recited together.

## Citing what you retrieved

A complete citation names:

1. **the text**: MN 10 (and the translator's number, if different);
2. **the place**: VRI paragraph or PTS page (M i 55);
3. **the translator and source**: Ṭhānissaro Bhikkhu, dhammatalks.org, with the URL.

Example: *MN 10 (M i 55), tr. Ṭhānissaro Bhikkhu, https://www.dhammatalks.org/suttas/MN/MN10.html*.

Keep the Pāli, the translation, any dictionary gloss and your own interpretation clearly apart.

## When a citation does not resolve

The tool explains why: an unknown abbreviation, a number past the end of a collection, a reversed range, or a PTS page for a collection that is not cited by page. Use the browse tool ("browse sn56") to see what exists. If you believe the tool is wrong, please [open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the citation, what you expected and, ideally, the PTS page.

## Checking every citation in a piece of text

The `find_citations` tool reads a whole essay, talk transcript or reference list, finds every citation in it and checks each one, all offline. For each citation it returns where it is in the text (character offsets), the text it names (ID and title) or, if it does not resolve, the reason (for example "MN 999 is not in the canon index" or "Sn 1032 looks like a verse number"). It never corrects a citation for you.

Running text is read more strictly than a single citation typed into `resolve_reference`, so that ordinary sentences are not mistaken for citations:

- Abbreviations are case-sensitive: "MN 10" is a citation, "mn 10" and "Mn 10" are not. Lower-case IDs written without a space ("mn10", "sn56.11:5.1") are read.
- Abbreviations that look like English or other books before a bare number are skipped: single letters (D, M, S, A, J), Dh, It, Th, Thī, Ne, Pe, Peṭ, Ps (often Psalms), Pp, Ya, Dt and As. Use MN, SN, Iti, Thag, Paṭis and so on, or full names. Single letters still work for PTS pages ("M i 55", "S v 420").
- Mahāvagga and Cūḷavagga are read as Vinaya chapters only after "Vinaya" ("Vinaya Mahāvagga 1"), or as Mv and Cv.
- Links count only for suttacentral.net, accesstoinsight.org and dhammatalks.org.
- A number glued to letters ("MN 10th") or written with thousands separators ("MN 10,000") is not a citation.

A citation written in a form the scanner does not recognise is not checked, so check doubtful ones with `resolve_reference`.
