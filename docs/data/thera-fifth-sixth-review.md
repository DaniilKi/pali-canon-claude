# Nineteen further Therā publisher-edition poems (D249)

This batch adds nineteen individually reviewed English choices: publisher poems41 and43–60, mapped to canonical `tha-ap43` and `tha-ap45`–`tha-ap62`. The previous seventy choices, all canonical wording, source books, commentary and saved-position revisions stay unchanged. Each new choice covers the complete poem in the named publisher edition. Edition differences remain visible; this does not establish line-complete VRI translation coverage.

## Approved source scope

The official Walters/Whitman source is pinned to `fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4`. Two independent source groups verified each title, narrative, colophon, original notes and neighbouring VRI boundaries. A separate Python/ElementTree review reproduced all19 extracted bodies and all14,645 original VRI source-book blocks, including notes and page markers, without importing the production parsers.

| Publisher poem | Canonical owner | Publisher title | Printed stanza entries | Poem notes |
|---|---|---|---:|---:|
| 41 | `tha-ap43` | Upāli | 24 | 14 |
| 43 | `tha-ap45` | Bhaddiya-Kaḷigodhāya-Putta | 16 | 7 |
| 44 | `tha-ap46` | Sannidhāpaka | 7 | 9 |
| 45 | `tha-ap47` | Pañcahatthiya | 6 | 6 |
| 46 | `tha-ap48` | Padumacchadaniya | 5 | 4 |
| 47 | `tha-ap49` | Sayanadāyaka | 5 | 3 |
| 48 | `tha-ap50` | Cankamadāyaka | 8 | 1 |
| 49 | `tha-ap51` | Subhadda | 24 | 12 |
| 50 | `tha-ap52` | Cunda | 19 | 11 |
| 51 | `tha-ap53` | Vidhūpanadāyaka | 7 | 2 |
| 52 | `tha-ap54` | Sataraŋsika | 12 | 5 |
| 53 | `tha-ap55` | Sayanadāyaka | 5 | 2 |
| 54 | `tha-ap56` | Gandhodaka | 8 | 3 |
| 55 | `tha-ap57` | Opavuyha | 10 | 13 |
| 56 | `tha-ap58` | Saparivārāsana | 7 | 4 |
| 57 | `tha-ap59` | Pañcadīpika | 7 | 8 |
| 58 | `tha-ap60` | Dhajadāyaka | 9 | 8 |
| 59 | `tha-ap61` | Paduma | 11 | 7 |
| 60 | `tha-ap62` | Asanabodhiya | 15 | 7 |

The approved nine-poem fifth-chapter subset has114 entries,141 body paragraphs and67 notes. The ten-poem sixth publisher chapter has91 entries,121 body paragraphs and59 notes. Combined: **205 printed entries,262 body paragraphs and126 poem-owned notes**. Separately owned chapter prefaces, recitation and summaries do not become stanza or quotation evidence.

Publisher42 (`tha-ap44`) remains held. Its source contains a deliberate hiatus marker and original note12 outside its28 translated entries, versus29 numbered VRI stanzas. A future finite editorial-apparatus contract must preserve that marker and note, display their ownership and exclude them from poem quotation evidence. Neither filling the omitted VRI stanza nor silently dropping the marker is acceptable. The fifth publisher chapter is therefore a reviewed subset, not a complete ten-poem chapter.

## Exact wording and apparatus

- Source41 preserves the nephew-Upāli identification and the publisher's own narrative uncertainty, distinct from the earlier Vinaya-reciter poem. Its chapter preface owns no notes.
- Source43 retains the malformed double-opening bracket in global1180, six-line entries and capitalized Legend;44 retains the notes attached to both colophons;46 retains its comma and original Padumu spelling.
- Source49's exact fifth-recitation line shares a raw paragraph with local15/global1229. A finite split keeps the four stanza lines intact and displays the zero-note recitation in a separate apparatus section, identifying its original position before that stanza. It stays outside poem text and quotation evidence and reuses the existing before-label descriptor, with no new apparatus schema.
- Source57 retains the printed1312-before1311 order and note7 inside the global-label brackets. Source58 retains its six-line entries and compound1317–1318 labels. No label or note is moved to make the numbering regular.
- Source50's summary binds original root3935–3940/refs`tha-ap52/23`–`/25`; source60 binds4238–4243/refs`tha-ap62/19`–`/21`. Both include their chapter colophon and own zero notes. Source50's original144 count remains alongside the independently observed143 VRI stanzas and142 publisher entries across that chapter; it is not a validated coverage total.

Each profile carries its independently recorded edition caveats, including substantive number, name, speaker and interpretation differences. Exact raw/body/notes/paratext/root hashes and finite descriptor ownership fail closed on drift. Individual, comparison-policy and embedded readers retain mandatory caveats and note checks. Widgetv24 refreshes the finite89-profile table. Ordinary comparison UI still requires multiple distinct real sources; these individual poems currently have one approved English choice each.

## Rights, preservation and reproducibility

The explicit translation grant remains **CC BY-NC-SA4.0**, crediting Jonathan S. Walters and Whitman College and retaining source, licence, presentation-change notices and no endorsement. The generic site CC-BY setting does not relax this grant. English bodies, notes and paratext remain live-only and are excluded from the package. No recording, image or media right is inferred or activated.

The canonical dataset and every commentary/data shard except the finite Apadāna link manifest remain unchanged. The previous70 profile and link objects remain exact. Private local notes, drafts and existing locator revisions are not migrated.

Source evidence: [fifth review](../evidence/apadana/THERA_FIFTH_SOURCE_REVIEW.json), [fifth approval and hold](../evidence/apadana/THERA_FIFTH_SOURCE_APPROVAL.json), [sixth review](../evidence/apadana/THERA_SIXTH_SOURCE_REVIEW.json), [independent source approval](../evidence/apadana/THERA_EXPANSION_SOURCE_APPROVAL.json), [independent extraction comparison](../evidence/apadana/THERA_EXPANSION_EXTRACTION_COMPARISON.json).

The standard-library replay imports neither production parser, fetches no sources, builds nothing and writes metadata/hash receipts only:

```sh
node scripts/shard-data.mjs --unpack server/data /tmp/pali-inputs
python scripts/apadana/review_thera_fifth_sixth.py \
  --source-root /path/to/pinned-publisher \
  --goldens docs/evidence/apadana/THERA_FIFTH_GOLDENS.json \
  --goldens docs/evidence/apadana/THERA_SIXTH_GOLDENS.json \
  --canon /tmp/pali-inputs/canon.json.gz \
  --xml /path/to/pinned-vri/romn/s0510m1.mul.xml \
  --output-dir /tmp/pali-independent-d249
node scripts/apadana/build.mjs --source /path/to/pinned-publisher --check
APADANA_SOURCE_CHECKOUT=/path/to/pinned-publisher APADANA_OFFICIAL_CHECKOUT=/path/to/pinned-publisher node --test tests/apadana-thera-fifth.test.mjs tests/apadana-thera-sixth.test.mjs
npm run check
```

The source fixture contains97 files:90 original poems (including held42 for refusal checks),6 rights artifacts and routing. The runtime allows only89 reviewed poem paths. Run the new `web-reader-apadana-thera-expansion-check.py` in normal, `--a11y` and isolated-package `--server-dir` modes. Retain all earlier gates, independent frozen source/runtime/package review and exact final dev CI. One additional20-minute group brings the configured total to52 checks and40 named source/browser steps; configuration is not a passing-result claim. Only `dev/pali-reliability` may be pushed, through a normal fast-forward. Keep integration local; no main merge, deployment or force-push.

## Coverage and outstanding acceptance

Current whole links: **2,672** (Walters89:40Therī+49Therā). Indexed direct/inherited coverage: **1,568/1,991**; grouped member-aware coverage: **1,542/1,965**. Partial22/shared12/110subjects/shared-only22 and daily eligibility1,288 stay unchanged. The remaining510 publisher Therā files include held42; opening works and all other source/rights holds remain separate.

A bounded reader probe on the prior `a154013` bundle passed30 focus workflows and24 text-spacing workflows. No defect was reproduced. Native window focus, actual browser zoom and OS scaling could not be established with the available headless tooling. Those observations precede this rebuild and are not final release acceptance. Automated viewport/axe checks, fixture availability and independent source review do not establish physical-device, human assistive, specialist recension or live publisher-host acceptance.
