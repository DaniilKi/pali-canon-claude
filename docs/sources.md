# Source decisions (v2.0.0)

This record explains why v2 changed its sources and how reliability and citation accuracy are achieved. Research date: 1 November 2026.

## Why not SuttaCentral as the source

SuttaCentral's data is excellent and largely CC0 or public domain, and it is fully mirrored on GitHub (`bilara-data`, `sc-data`). A check of 60 random texts found the API and both GitHub mirrors byte-identical. It would have been the most reliable choice technically. SuttaCentral has, however, asked clearly and repeatedly that its work not be used in AI tools:

- Its [licensing page](https://suttacentral.net/licensing) says: "We politely request that our content not be scraped or used in any way for the creation of datasets for generative AI or similar. This request applies to those who create applications directly, and those who build apps downstream of AI models…"
- 41 publication records in `bilara-data/_publication-v2.json` ask the same, including Bhikkhu Sujato's four Nikāyas and Brahmali's Vinaya: "please do not use this work in AI training datasets… or in any AI-derived technologies."
- Bhikkhu Sujato has repeated the request on SuttaCentral's forum ([2024](https://discourse.suttacentral.net/t/i-have-some-questions-regarding-the-use-of-sutta-central-s-data/35565), [2026](https://discourse.suttacentral.net/t/clarification-on-provenance-and-preservation-of-the-mahasa-giti-pali-witness-snp2-4-pli-ms/44774)).

The request is not legally binding, but a scripture tool for Buddhist users should honour the stated wishes of its sources. v2 therefore links to SuttaCentral for parallels and further translations but does not retrieve or bundle its content.

The one remaining use is narrow. The *numbering scheme* most readers cite (MN 10, SN 46.131–140, `pli-tv-bu-vb-pj1`) is shared nomenclature. To map those numbers onto the VRI text, the build reads file names and opening words of the Mahāsaṅgīti Pāli root, which is marked Public Domain Mark 1.0. Only the mapping and Pāli titles are kept.

## What v2 uses

| Need | Source | Terms | Availability strategy |
|---|---|---|---|
| Pāli text, whole Tipiṭaka | VRI Chaṭṭha Saṅgāyana ([tipitaka-xml](https://github.com/VipassanaTech/tipitaka-xml)) | Free for non-commercial use, attribute VRI | **Bundled** (5.6 MB compressed), pinned commit, works offline |
| PTS page references | VRI's own `<pb ed="P">` markers | as above | bundled |
| English (Ṭhānissaro Bhikkhu) | [dhammatalks.org](https://www.dhammatalks.org/suttas/) | CC BY-NC 4.0 | live, with fallback to his Access to Insight versions |
| English (many translators) | [Access to Insight](https://accesstoinsight.org/) (BCBS) | per page | live → [bcbsit/ati](https://github.com/bcbsit/ati) via GitHub raw → same via jsDelivr → [digitalpalireader/accesstoinsight](https://github.com/digitalpalireader/accesstoinsight) |
| Dictionary | [Digital Pāḷi Dictionary](https://www.dpdict.net/) | CC BY-NC-SA 4.0 | live, with retries |

Access to Insight is a preservation-only archive run by the Barre Center for Buddhist Studies. The repository `bcbsit/ati` is what deploys the live site, so it is an authoritative mirror rather than a third-party copy.

Considered and not used: the Buddha Jayanti Tipiṭaka (tipitaka.lk), whose CC BY-ND licence and Sinhala script make transformation problematic, and PTS texts on GRETIL, which are for scholarly use only. The Mahāsaṅgīti edition is itself derived from VRI, so it is not an independent witness.

## Numbering

There is no single universal numbering. In SN and AN the standard/Bodhi numbering and the older PTS numbering (used by Ṭhānissaro and Access to Insight) diverge in places. For example, PTS AN 7.64 is standard AN 7.68, and the Kālāma Sutta is AN 3.65 standard but AN 3.66 at dhammatalks.org. v2:

- uses standard IDs for citations;
- links translations by content (Pāli title, PTS page, neighbours' offsets), never by number alone in SN/AN;
- reports the other number whenever a translation uses it;
- treats the PTS volume/page as the edition-independent anchor, since both schemes share it.

## Verification

- An independent check against all 1,190 canonical Access to Insight pages and their PTS citations reports 0 problems.
- An exhaustive offline audit of all 8,544 texts covers ID, printed citation, rendered text, range members, PTS round-trips, non-overlap and translation links. It reports 0 failures.
- Simulated outages of each online source show the mirrors taking over. With all online sources down, the Pāli text, citation resolution and search still work.

- An independent review checked about 110 citations and every PTS lookup in its set. It found wrongly attached English links in the first draft. Links are now kept only with strong evidence and checked for consistency, and the cases it found are regression tests.
