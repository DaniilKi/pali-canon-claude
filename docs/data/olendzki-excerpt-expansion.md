# Four more accurately bounded Olendzki excerpts

Decision D206; baseline `f03eae13dc9cc77976f8f0ecbb4407c90363f389`. [Machine-readable evidence](olendzki-excerpt-expansion.json) contains the complete-root, selected-Pāli, raw publisher HTML, extracted verse and full-notice hashes. Publisher English bodies remain outside the repository.

## What was checked and changed

Complete official ATI bodies, notices and entire indexed VRI roots were inspected individually, with independent review. ATI snapshot `45fedca341497120651efa20e756b04a13e61089`; VRI source `2d134ff9ef60f70a1eb03c9370580228811a3070`. This is source review and local reproduction, not a claim about current author-server availability or deployment.

| Publisher version | Approved contiguous Pāli span | Omitted material | Existing complete alternatives |
|---|---|---|---|
| [Kāḷudāyin: Crossing the Rohini](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.10.01.olen.html) | VRI 527–529, `thag10.1/3`–`/5` | Verses 530–536; editorial biography excluded | dhammatalks |
| [Udāyin: The Blooming Lotus](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.15.02.olen.html) | VRI 700–701, `thag15.2/13`–`/14` | Verses 689–699 and702–704; editorial historical interpretation excluded | dhammatalks |
| [Aṅgulimāla: The Moon Released](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.16.08.olen.html) | VRI 871–873, `thag16.8/7`–`/9` | Verses 866–870 and874–891; editorial biography/quoted prose excluded | dhammatalks and ATI Ṭhānissaro |
| [Heraññakāni: excerpt](https://www.accesstoinsight.org/tipitaka/kn/thag/thag.02.13x.olen.html) | VRI 145, `thag2.13/2` only | Verse 146 is absent; publisher page has no editorial preface | dhammatalks and ATI Ṭhānissaro |

The first three exact holds are retired only after verified partial activation. All other holds remain. Heraññakāni was a newly confirmed erroneous whole-unit binding: a one-verse translation cannot cover the repaired two-verse root. Its existing ordinary entry is replaced by one partial declaration. Canonical blocks, unit boundaries, locator revisions, saved notes and saved positions are unchanged.

Each page has one suitable verse container. The existing strict extractor, mandatory exact-version consent, complete notice/text/Pāli pins, separate cache and packaged partial registry apply without broadening their contracts. The registry rejects deletion of an entire scope container, wrong owners and changed attribution. Normal linker rebuilds withhold all six registered URLs from ordinary proposals; content activation requires the existing source/root/notice verifier. Discontinuous or ambiguous pages remain withheld.

## Per-page rights

All four complete notices independently retain Andrew Olendzki's ©2005 grant: copying/reformatting is free of charge, derivatives identify their source, and every copy/derivative includes the full licence. They are **not Creative Commons** and have no BPS 50-copy condition. The implementation returns the full page-specific citation and distribution notice with every fragment and identifies its derived extraction. No new grant is inferred from a translator's name or another page's licence.

## A demonstrated screening blind spot

The ordinary-link screen previously required a numeric range. It missed Heraññakāni's explicit `Thag 145` reference even though the repaired root contains 145–146. It also ignored its publisher `(excerpt)` title. Screening now includes explicit single-verse references with a matching verse-collection prefix, and explicit excerpt labels. PTS pages, `chapter:poem` citations, mismatched collection prefixes and bare numbers are not interpreted as single verses.

The expanded screen yields 223 entries: five frozen retained reviews and 218 unreviewed leads. Two newly prioritized hypotheses are `Sn 720` (`snp3.11`) and `Thag 675` (`thag15.1`). They are **not source approvals or confirmed errors**. A metadata range still cannot establish exact content, rights or alignment. These two leads need a separate complete-source review; no automatic hold is applied.

## Counts and reproduction

Ordinary links decrease 2,574→2,573 (ATI 1,147→1,146). Complete English coverage remains 1,447 direct/1,870 with inheritance; grouped runtime counts remain 1,421/1,844. Separately counted partial links increase 2→6, across six units; only Ānanda is partial-only. Shared scopes remain 12 pages / 110 actual subjects. The 1,269-item daily sutta pool and 2026-11-01 SN5.3 selection are unchanged. No complete-translation gain is claimed.

Verification commands use the pinned official checkout, never reconstructed translation bodies:

```sh
node scripts/canon/verify_partial_html.mjs scripts/canon/reviewed_partial_pages.json /tmp/pali-ati-source
node --test tests/ati-partial-pilot.test.mjs tests/partial-page-build.test.mjs tests/verse-scope-review.test.mjs
python3 scripts/web-reader-partial-pilot-check.py --source-root /tmp/pali-ati-source --report /tmp/excerpts-browser.json
python3 scripts/web-reader-partial-pilot-check.py --source-root /tmp/pali-ati-source --a11y --report /tmp/excerpts-a11y.json
npm run check
```

The actual-source browser check now covers all six registered pages, their individual complete alternatives, explicit consent, keyboard operation, original source references, exact verse hashes and full notices. Publisher content stays in local process memory; reports contain metadata/hashes. Installed-artifact audits use controlled synthetic providers and make no live author requests. Final test receipts accompany integration; this document does not certify upstream freshness, new rights, native-reader expertise or full-canon semantic review.

Local validation passed 1,050 tests with one skipped and zero failures; all 8,544 canonical records audited with zero failures. Smoke passed 64 checks. Browser, accessibility and extracted-npm-package modes each passed 78 cases; accessibility ran 72 scans with zero violations. The installed partial audit passed all eight modes. Actual source reproduction reconstructed all six excerpts in bounded 80-character pages, with full notices on every page, found verse quotations and rejected all five editorial-preface probes; Heraññakāni has no preface. These runs intercepted local pinned HTML and made zero upstream HTTP requests. Independent review approved all four source mappings and found no blocking diff issues after documentation corrections.
