# Uposatha and festival calendar

The `uposatha` and `festivals` tools say when the [uposatha](glossary.md#practice) (observance) days and the main Theravāda festivals fall, for four traditions. They work offline.

**Every date is computed, not official.** Each answer gives the rule it used and is labelled `status: "computed"`. National authorities, Sangha bodies and individual monasteries publish the dates they actually keep, and these can differ, usually by one day. If a date matters, check the list your monastery or government publishes.

## What you can ask

| Tool | Input | Output |
|---|---|---|
| `uposatha` | `from`, `to` (YYYY-MM-DD, up to two years apart), `tradition` | Every full-moon, new-moon and half-moon (8th day) observance day, with its weekday, lunar day and lunar month |
| `festivals` | `year`, `tradition` | Māgha Pūjā, Vesak (Visākha Pūjā), Āsāḷha Pūjā, start and end of the Rains Retreat (Vassa), Pavāraṇā and the Kaṭhina season, each with the canonical texts associated with it |

Traditions: `thai-mahanikaya`, `thai-dhammayut`, `myanmar`, `sri-lanka`. Years 1950–2100.

## The four reckonings

The traditions do not use one calendar. They differ in how they count months and in which day they call the full moon. All times are local: Thailand UTC+7, Myanmar UTC+6:30, Sri Lanka UTC+5:30.

### Thai Mahānikāya: the Thai lunar calendar

The Thai civil lunar calendar, the one printed in Thai diaries and used for public holidays.

- Months alternate 29 days (odd months) and 30 days (even months). Each month has a waxing half of 15 days and a waning half of 14 or 15 days.
- A year is **common** (354 days), **adhikavāra** (355 days: month 7 gets a 30th day) or **adhikamāsa** (384 days: a second month 8, "second Āsāḷha"). Which one is decided by the Suriyayatra rules of the Chulasakarat era: from the year's *horakhun* (days since the era began), *kammacubala*, *avoman* and the moon's age (*tithi*) at New Year.
- Uposatha falls on the 8th and 15th (full moon) of the waxing half and on the 8th and last day (new moon) of the waning half.
- In an adhikamāsa year, Māgha Pūjā moves from month 3 to month 4, Visākha Pūjā from month 6 to month 7, and Āsāḷha Pūjā to the second month 8.

The code is a JavaScript port of [splendidmoons](https://github.com/splendidmoons/splendidmoons) by Gambhiro Bhikkhu (MIT), which follows J. C. Eade's published rules; see its [explanation](https://splendidmoons.github.io/how-to-calculate-uposathas).

### Thai Dhammayut: Pakkhagaṇanā

The Dhammayut order counts fortnights with **Pakkhagaṇanā** (ปักขคณนา), a reckoning designed to stay closer to the real moon than the civil calendar. Fortnights of 14 or 15 days are laid out on a counting board in nested cycles (of 16,168, 1,447, 251, 59 and 15 days) from an epoch of 28 January 1736. Uposatha falls on the 8th and the last day of each fortnight. As a result, some Dhammayut uposatha days differ from the Mahānikāya ones by one day, earlier or later. In 2024–2026 there are 40 such days: on 14 the Pakkhagaṇanā day is one day earlier (for example 8 August 2025, against 9 August), on 26 one day later.

The code is a port of `PakDate` in [pythaidate](https://github.com/hmmbug/pythaidate) by Mark Hollow (MIT). Every Dhammayut day also gives `mahanikaya_date`, the matching Mahānikāya day, so you can see where the two differ. Festival months follow the Thai lunar calendar; each festival takes the Dhammayut full moon nearest the Mahānikāya one. Where the two differ, `festivals` also gives `mahanikaya_date` (`mahanikaya_start` and `mahanikaya_end` for the Kaṭhina season), names those festivals in a note, and repeats the caveat about Wat Metta's lists (below).

### Myanmar: the Burmese calendar

- The Burmese lunisolar calendar, in the form used since independence (the "third era", from 1312 ME = 1950 CE).
- The year is fixed by the mean full moon of (second) Waso.
- In **watat** years a 30-day First Waso is inserted. In **big watat** years Nayon also gets a 30th day.
- Months alternate 29 and 30 days.
- Uposatha (ဥပုသ်) falls on the 8th, 15th (full moon) and 23rd day and on the last day (new moon) of each month.

The code is a port of [ceMmDateTime.js](https://github.com/yan9a/mmcal) by Yan Naing Aye (MIT), which documents the algorithm in [Algorithm, Program and Calculation of Myanmar Calendar](https://cool-emerald.blogspot.com/2013/06/algorithm-program-and-calculation-of.html). Only the rules of the third era and of the second era (1217–1311 ME, needed for January–March 1950) are ported, which is why the tools start at 1950.

### Sri Lanka: poya days

Sri Lankan poya days follow the lunar day (*tithi*). One tithi is the time it takes the moon to move 12° further ahead of the sun. The full-moon tithi (*pūrṇimā*) runs from an elongation of 168° to the full moon at 180°.

- **Rule.** The poya is the day at whose evening (18:00 Sri Lanka time) the full-moon tithi is current. If no 18:00 falls inside the tithi, which happens when it starts after 18:00 and ends before the next 18:00, the poya is the day of the full moon itself.
- **Why this rule.** No official statement of the rule was found. This one was chosen because it reproduces all 37 poya days in the 2024–2026 gazettes (below). Simpler rules do not: "the calendar day of the full moon" matches only 13 of the 37.
- **Months.** A month runs from new moon to new moon. It is named by the sidereal sign of the sun at the new moon that opens it, using the Lahiri ayanāṃsa. For example, the sun in Mesha (Aries) gives Vaiśākha, which is Vesak.
- **Adhi months.** A month in which the sun does not change sign is an *adhi* (extra) month and takes the next month's name. An example is Adhi Poson on 30 May 2026.
- **Festivals** are kept in the regular month, not the adhi one.
- **Other phases.** New-moon and half-moon days use the same rule with tithis 30, 8 and 23. They are not public holidays and have not been checked against a published list.

The astronomy follows Jean Meeus, *Astronomical Algorithms* (2nd edition, 1998):

- **Moon phases:** chapter 49, with all the periodic and additional corrections.
- **Moon longitude:** chapter 47, using its 26 largest terms. That is accurate to about 0.01°, or about a minute of time at a tithi boundary.
- **Sun longitude:** chapter 25.
- **ΔT:** the Espenak–Meeus polynomials.
- **Time:** everything is computed in UTC and then converted to local time.

## Festival rules

| Festival | Thai (both orders) | Myanmar | Sri Lanka |
|---|---|---|---|
| Māgha Pūjā | Full moon of month 3 (month 4 in an adhikamāsa year) | Not given (see below) | Navam poya |
| Vesak / Visākha Pūjā | Full moon of month 6 (7 in an adhikamāsa year) | Full moon of Kason | Vesak poya |
| Āsāḷha Pūjā | Full moon of month 8 (the second 8 in an adhikamāsa year) | Full moon of (second) Waso | Esala poya |
| Vassa begins | The next day | The next day | The next day |
| Pavāraṇā / Vassa ends | Full moon of month 11 | Full moon of Thadingyut | Vap poya |
| Kaṭhina season | From the day after Pavāraṇā to the full moon of month 12 | To the full moon of Tazaungmon | To Il poya |

**Myanmar and Māgha Pūjā.** Māgha Pūjā is not among the full-moon public holidays in the official Myanmar lists for 2024–2026, and no published source was found that names the Burmese full moon on which it is kept. The tool returns `date: null` with that reason rather than guess a month.

The traditions do not always agree on the month. In 2026 Sri Lanka keeps Vesak on 1 May, Myanmar on 30 April and Thailand on 31 May. Thailand has a second Āsāḷha month that year, and Sri Lanka an Adhi Poson.

## Texts linked to each festival

Each festival returns the texts associated with it, resolved to the bundled Pāli canon. A test checks that every citation resolves to the intended text.

| Festival | Texts |
|---|---|
| Uposatha | Kd 2 (Uposathakkhandhaka), AN 3.70 (Uposathasutta), AN 8.41 (Saṅkhittūposathasutta) |
| Māgha Pūjā | DN 14 (contains the Ovāda-pāṭimokkha), Dhp 183–185 |
| Vesak | MN 123, Ud 1.1, Kd 1, DN 16 |
| Āsāḷha Pūjā | SN 56.11 (Dhammacakkappavattanasutta), SN 22.59 (Anattalakkhaṇasutta), Kd 1 |
| Vassa begins | Kd 3, which rules that the earlier rains residence is entered on the day after the Āsāḷha full moon (paraphrase; a test checks the passage is in the bundled Kd 3) |
| Vassa ends, Pavāraṇā | Kd 3, Kd 4 (Pavāraṇākkhandhaka), SN 8.7 (Pavāraṇāsutta) |
| Kaṭhina | Kd 7 (Kaṭhinakkhandhaka) |

The canon itself does not say that the birth, awakening and passing fell on the Vesākha full moon, that the first discourse was given on the Āsāḷha full moon, or that the Ovāda-pāṭimokkha was taught on the Māgha full moon. Those dates come from the commentaries and tradition. The tools say so in an `association` note and do not present them as scripture.

## Checked against published calendars, 2024–2026

The reference dates are in [`tests/fixtures/calendar-reference.json`](../tests/fixtures/calendar-reference.json), with the URL of each source. They were copied from the sources, not computed. [`tests/calendar.test.mjs`](../tests/calendar.test.mjs) compares them with the computed dates.

| Tradition | Published source | Result |
|---|---|---|
| Thai Mahānikāya | [splendidmoons Mahānikāya calendar](https://splendidmoons.github.io/calendars/mahanikaya.csv): 148 uposatha days and 18 festival days | All match |
| Thai Mahānikāya festivals | Festival lines of the Wat Metta lists (below) | All 15 match |
| Thai Dhammayut festivals | The same 15 Wat Metta festival lines | 12 match. The other 3 (Vesak 2025, Vassa end 2025, Vassa end 2026) are from May 2025 on; the published date is the one the tool returns as `mahanikaya_date`, and the output says so |
| Thai Dhammayut | Metta Forest Monastery (Wat Metta), "Uposatha dates for the Dhammayut Order in Thailand": [2024](https://web.archive.org/web/20240705131558/https://www.watmetta.org/news/Uposatha2024.pdf), [2025](https://web.archive.org/web/20250826150659/https://www.watmetta.org/news/Uposatha2025.pdf), [2026](https://web.archive.org/web/20250826191237/https://www.watmetta.org/news/Uposatha2026.pdf); 148 days | 131 match; 17 explained below |
| Sri Lanka | Government gazettes under the Holidays Act: [No. 2341/46](https://web.archive.org/web/20251016125151/https://documents.gov.lk/view/extra-gazettes/2023/7/2341-46_E.pdf) (2024), [No. 2395/33](https://web.archive.org/web/20251212082428/https://documents.gov.lk/view/extra-gazettes/2024/7/2395-33_E.pdf) (2025), [No. 2438/22](https://web.archive.org/web/20251030070904/https://documents.gov.lk/view/extra-gazettes/2025/5/2438-22_E.pdf) (2026); 37 full-moon poya days with their names | All match, including Adhi Poson 2026 |
| Myanmar | Department of Civil Aviation, Aeronautical Information Services, "Myanmar Public Holidays for Year …": [AIC A 03/2024](https://ais.gov.mm/wp-content/uploads/2024/01/AIC-03-2024.pdf), [AIC A 03/2025](https://ais.gov.mm/wp-content/uploads/2025/01/AIC-03-2025.pdf), [AIC A 03/2026](https://ais.gov.mm/wp-content/uploads/2025/12/AIC-03-2026.pdf); full moons of Tabaung, Kason, Waso, Thadingyut (Lighting Festival) and Tazaungmon, 15 holidays. Second check for 2025: Bank of Ayudhya (Krungsri), Yangon office, [public holidays in Myanmar 2025](https://web.archive.org/web/20250620012051/https://www.krungsri.com/en/international-banking/myanmar/about-us/bank-holiday) | All 11 one-day holidays equal the computed full moon; the 4 multi-day holidays contain it. The Krungsri 2025 list agrees |

### The 17 Dhammayut differences

Wat Metta's lists match the Pakkhagaṇanā count exactly from January 2024 to April 2025. That includes the 21 days marked with an asterisk ("the Mahānikāya dates fall one day earlier"), where Pakkhagaṇanā and the civil calendar really do differ.

From May 2025 Wat Metta gives the Mahānikāya date on every day where the two reckonings differ. These 17 days are:

- **2025:** 11, 19, 26 May; 3 June; 9, 17 August; 7, 15 October; 5, 13 December.
- **2026:** 13, 21, 28 August; 5 September; 26 October; 3 November; 24 December.

Its 2026 list says the dates are "for both the Dhammayut Order and the Mahānikāya Order in Thailand". So the published list stopped following Pakkhagaṇanā that month. Pakkhagaṇanā itself did not change.

The tool keeps the Pakkhagaṇanā day and reports the Mahānikāya day next to it, because the reason for the change was not found in any source. The test lists the 17 days. It fails if any other difference appears, or if any of the 17 is not the Mahānikāya date.

### Myanmar reference

The original official references are Department of Civil Aviation circulars for 2024–2026. They are plain PDFs. The fixture records their SHA-256 values as retrieved on 2026-11-01; those byte hashes were not reverified during the later web-text review below. The 2024 list prints the Waso holiday as "Beginning of Buddhist" (the word after it is cut off); its date is the Waso full moon.

One-day holidays must equal the computed full moon. The Lighting Festival (Thadingyut) and, in 2026, Tazaungmon are given as two- or three-day ranges, so for those the test checks only that the full moon falls inside the range.

An earlier version of the fixture used the Krungsri bank-holiday page for 2026. That page is now behind a bot check and was never archived, so it has been replaced by the government list.

## Additional published evidence (6 November 2026)

The offline facts in [`calendar-published-samples.json`](../tests/fixtures/calendar-published-samples.json) were transcribed from original publications and checked against outputs by [`calendar-evidence.test.mjs`](../tests/calendar-evidence.test.mjs). Calendar arithmetic and defaults were unchanged.

- **Myanmar eighth-day samples.** MOI's Global New Light of Myanmar mastheads identify [10 January 2026](https://www.moi.gov.mm/nlm/file-download/download/public/4792) as waning 8 of Pyatho 1387 and [25 January 2026](https://www.moi.gov.mm/nlm/file-download/download/public/4826) as waxing 8 of Tabodwe 1387. The [26 December 2025 edition](https://www.moi.gov.mm/nlm/sites/default/files/newspaper-pdf/2025-12/26_Dec_25_gnlm.pdf) identifies its own date as waxing 8 of Pyatho 1387 (page 1), and also states the January 25 mapping in announcement 170/2025 (page 3). All three date mappings agree with the tool. These are lunar-calendar labels, not independent uposatha announcements or astronomical quarter measurements. They provide three narrow eighth-day checks, not a published all-days observance list; no new-moon sample was established.
- **Myanmar 2027 holidays.** [DICA/MyCO's Business Calendar](https://myco.dica.gov.mm/public/Holidays.aspx) lists exact full-moon holidays for Tabaung (22 March), Kasong/Kason (20 May) and Waso (18 July). All three match. Thadingyut (14–16 October) and Tazaungmone (12–13 November) are holiday windows; the computed full moons fall inside them. Those are two range checks, not two exact-date validations.
- **A real source discrepancy.** MyCO gives 25–27 October for the 2026 Thadingyut holiday, while [aviation AIC A 03/2026](https://ais.gov.mm/wp-content/uploads/2025/12/AIC-03-2026.pdf) gives 26–27 October. Both contain the computed 26 October full moon. Different holiday-window bounds do not establish an incorrect full-moon calculation, so neither source is silently substituted for the other.
- **Wat Metta's current link.** The [events page](https://www.watmetta.org/events/) now links [this 2026 PDF](https://watmetta-photos.b-cdn.net/uposatha2026.pdf); the old `/news/Uposatha2026.pdf` URL returned 404. All 49 date cells and five existing festival/retreat entries match the preserved fixture. The PDF describes both orders, but does not establish a permanent, order-wide Dhammayut convention. The default and side-by-side caveat remain unchanged; human confirmation is still required.

Verification used original PDF text and the official HTML table. Executor downloads were blocked by a proxy and MOI screenshot fetches timed out, so no new PDF byte checksums are claimed. The candidate [Sri Lankan 2026 desk calendar](https://moha.gov.lk/web/images/latest_document/government_holidays/2026/2026_E.pdf) could not be fetched during this review, and contributed no fixture. Astronomical phase dates must be distinguished from poya observance dates before using any such calendar as evidence for the tool's tithi-based observance rule.

### Still not established

- **Myanmar new-moon and half-moon observance coverage** remains incomplete. The three newspaper eighth-day mappings above do not validate an entire observance list or any new-moon date.
- **Sri Lankan new-moon and half-moon days** are not public holidays and have not been checked against a published list.
- **Myanmar Māgha Pūjā** has no date (above).

## Limits

- The Sri Lankan rule is fitted to three years of gazettes. In a year where the full-moon tithi begins very close to 18:00, a gazette may differ by a day. The 2026 Poson month is decided by the sun being 0.2° from a sign boundary, which is about four hours of the sun's motion.
- Myanmar dates are not computed before 1950, because the first era (before 1217 ME) uses other rules.
- Dhammayut monasteries outside Thailand, and some inside it, publish their own lists. Use the tool as a guide and the monastery's list as the authority.

## Code and licences

[`src/calendar.mjs`](../src/calendar.mjs) is plain JavaScript with no data files or network access. It contains ports of three MIT-licensed programs: splendidmoons (© 2023 Gambhiro Bhikkhu), pythaidate (© 2023 Mark Hollow) and ceMmDateTime.js (© 2018 Yan Naing Aye). Their notices are in [THIRD_PARTY.md](../THIRD_PARTY.md).
