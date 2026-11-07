# Paṭṭhāna opening translation candidate

**7 November 2026: assessment only.** No English text or runtime translation link was added. All 728 indexed Paṭṭhāna units still have no linked English translation. This is a candidate for a partial-unit translation, not evidence of whole-book English coverage.

## Author source and terms

The [author-published Paccayuddesaniddesa](https://ancient-buddhist-texts.net/Texts-and-Translations/Short-Pieces/Paccayuddesaniddesa.htm) identifies Ānandajoti Bhikkhu as translator and its Pāli as a Burmese Chaṭṭha Saṅgayana text. The rendered page ends with an October 2013 update label. Its two opening headings introduce the enumeration and explanation of the conditions, followed by 24 numbered explanations. The site's own [index](https://ancient-buddhist-texts.net/Texts-and-Translations/) labels this “Paṭṭhāna 1 & 2”; those are not repository text IDs.

The [May 2013 copyright notice](https://ancient-buddhist-texts.net/Miscellaneous/Copyright-Notice.htm), inspected again on 7 November 2026, assigns introductions, translations and notes outside its named exceptions to **CC BY-SA 3.0 Unported**, with attribution to Anandajoti Bhikkhu. This work is not named among those exceptions. This is positive rights evidence for the author's translation and notes, not an assertion that every item on the website has the same rights. Existing project records also note CC BY-SA 4.0 links in some page footers; no release-specific relicensing is inferred. Bundled VRI Pāli keeps its separate attribution and non-commercial terms. An eventual reader must retain those distinct notices, translator notes and editorial labels.

Rendered web text was inspected through the supported research tool. No raw HTML artifact was acquired or hashed. The current executor's publisher-access restrictions were not retried or bypassed. Consequently, the metadata hashes below are hashes of manually transcribed Pāli sections after the stated normalization, **not hashes of the author's HTML file**. The research tool's render does not establish actual markup or footnote extraction fidelity.

## Actual repository boundaries

The VRI edition is pinned to `2d134ff9ef60f70a1eb03c9370580228811a3070`, file `abh03m7.mul.xml`. Its broad first indexed unit is `patthana1.1`, titled Nikkhepavāra, with **139 reader segments**. Do not treat that title or the author's section numbers as independent confirmation of a whole-unit mapping.

| Candidate material | Bundled reader boundary | Status |
|---|---|---|
| Enumeration heading and complete list | `patthana1.1/6`–`/7` | Complete list compared after normalization |
| Explanation heading | `patthana1.1/8` | Structural boundary |
| Complete first/root-condition explanation | `patthana1.1/9` | Complete Pāli explanation compared after normalization |
| Remaining explanations, through the last non-disappearance-condition sentence | Candidate extends through `patthana1.1/63` | Complete rendered aggregate matches after normalization; raw HTML classification remains unverified |
| Closing label | `patthana1.1/64` | Outside the proposed content span |
| Pucchāvāra heading and subsequent material | Starts at `patthana1.1/65` | Not translated by this candidate page |
| Next indexed unit | `patthana1.2` (Kusalattikaṃ) | A different large unit; not the author's second section |

The proposed source span is `/6`–`/63`, not the complete indexed unit. There are another **76 segments after `/63`**, in addition to the five opening segments before `/6`. Reading that candidate Pāli span is possible with `get_text` and `{ "uid": "patthana1.1", "offset": 5, "limit": 58 }`; its ordinary continuation would leave the candidate span and must not be described as mapped English coverage.

## Deterministic evidence and its limits

[Candidate metadata](candidates/paccayuddesaniddesa.json) records two complete-section probes: the 24-condition enumeration and the first explanation. Case/diacritic folding followed by retaining only ASCII letters ignores punctuation, hyphenation and spacing, including joined/separate quotation particles. This is a character-level alignment aid; it does not establish unchanged spelling, translation accuracy or semantic equivalence.

The normalized strings have 345 and 90 characters respectively. Each matches its entire target segment, and containment checks across **all 8,544 indexed canonical units** return only `patthana1.1/7` and `patthana1.1/9` respectively. This uniqueness claim is limited to the bundled canonical segment index, not all commentaries or the textual tradition.

A broader rendered-view diagnostic also found an exact normalized match for the **complete proposed span**. All rendered lines 17–1597 were present. Selecting alternating nonempty lines as a Pāli-classification hypothesis gives 481 of 962 lines and **13,678 normalized characters**, exactly matching the concatenated VRI `/6`–`/63` span. Its SHA-256 is `2904f22000eb9f099597fddad63f15936d331c6499c4c4174f02b07af1884264`. Whole-span containment checks across the concatenated segments of all 8,544 indexed units identify only `patthana1.1`.

The existing builder’s word-3-gram diagnostic scores the same rendered Pāli at **49.4% of the whole indexed unit**, below its 60% threshold; the nearest competing Paṭṭhāna unit scores 4.7%. This independently supports keeping the candidate separate from whole-unit adoption.

This supports the complete opening-subspan hypothesis, including all 24 explanations. It does **not** verify the raw HTML's Pāli/English classification, English translation accuracy, word boundaries or diacritics discarded by normalization, or actual footnote extraction. It must not approve a whole-unit runtime link. The metadata distinguishes this rendered comparison from `html_boundaries_verified: false`; its source-file hash remains absent.

Run the offline guard:

```sh
node scripts/audit-patthana-candidate.mjs --report patthana-candidate.report.json
```

It checks the VRI pin, boundaries, normalized target hashes, competing canonical matches and assessment-only adoption state. Regression tests reject whole-unit claims, incorrect text/segment IDs, changed target hashes and an overextended endpoint. The guard does not reacquire the source or certify raw HTML/English extraction. No source-language content was added to runtime data.

## Work before a runtime pilot

1. Through supported source access, inspect and retain a reproducible author-page snapshot; check actual Pāli/English markup, footnotes and retained notices. Do not work around the existing executor restriction.
2. Confirm the rendered aggregate against the actual Pāli/English HTML structure and each explanation boundary, recording edition differences. The two section probes and normalized aggregate do not approve English or footnote extraction.
3. Add explicit partial-unit scope to translation metadata, retrieval, quotation verification and coverage accounting. The current whole-unit link path must not count this excerpt as a full translation of `patthana1.1`, `patthana1.2` or all 728 units. A bounded source excerpt must stay distinct from its containing unit.
4. Complete the remaining source-policy/intended-use checks and obtain independent review of the proposed boundaries before activating a pilot. Do not presume that an extra permission letter is legally necessary for a use already covered by the CC grant.

The related [Mahākhandhako source](https://ancient-buddhist-texts.net/Texts-and-Translations/Mahakhandhako/index.htm) explicitly covers only its opening sections and includes commentary and parallel annotations. Existing project records already exclude treating it as a whole Kd 1 translation. The site's Ja 1 lead likewise needs canonical verse versus commentary-story boundaries. Neither follow-on lead was approved or added in this assessment.
