# Yasoja opening commentary and Kindada English coverage (D184)

This development batch adds one accepted commentary passage and one English
translation link. It does not change scripture wording, create a translation,
add a provider, merge main or deploy.

## Yasoja: what the source rebuild establishes

D183 fixed the canonical boundary but deliberately preserved the commentary
artifact. Its opening alignment was still unverified then. Rebuilding the
single Thag-a1 commentary source against the corrected canon with the unchanged
`build_commentary.py` now accepts that opening naturally:

- Source: VRI `romn/s0508a1.att.xml`, commit
  `2d134ff9ef60f70a1eb03c9370580228811a3070`.
- Source blocks 4941–4962 (end exclusive), under the explicit Yasoja heading.
- Root paragraph/verse 243; `paragraph+lemma`, 11 expressions checked, eight
  found. The biography and its Apadāna quotation are commentary, not canon.
- The complete rebuilt compact source book equals the existing source book.
  All earlier accepted passages are identical; exactly one is added.

The earlier incorrect root boundary had made the opening inconsistent with its
named owner. Correcting that input resolves this case without changing the
alignment rules. A matched quotation is evidence of the passage correspondence,
not independent proof of every historical claim within the commentary.

The [integration helper](../../scripts/canon/repair_yasoja_commentary.py)
rejects changed provenance, source blocks, evidence, removed passages and other
ownership changes. It inserts the accepted passage in source order, remaps all
numeric references and is idempotent. Every old passage's content and ownership
survives; only Yasoja gains material. Commentary passages increase from 14,337
to 14,338. The 47 complete source books, unit coverage and cited-unaligned list
are unchanged. Rebuild-derived parallels remain reproducible.

The [machine-readable preservation record](yasoja-commentary-repair.json)
contains the source XML hash, exact passage and before/after counts. Pipeline
commands are in the [build guide](../../scripts/canon/README.md).
Restart saved Yasoja aligned-commentary offsets: its opening now precedes its
later verses. Direct full-source-book segments and other canonical readers
retain their source content.

## Kindada: first English choice for SN 1.42

The official ATI mirror's
[complete Kindada page](https://github.com/bcbsit/ati/blob/45fedca341497120651efa20e756b04a13e61089/tipitaka/sn/sn01/sn01.042.than.html)
corresponds to the indexed **Kiṃdadasuttaṃ**, SN 1.42, VRI paragraph 42.
Evidence is the named discourse, PTS S i 32 and the complete ordered dialogue:
food gives strength; clothing beauty; a vehicle ease; a lamp vision; residence
everything; teaching Dhamma gives the Deathless. The Pāli has one numbered
paragraph containing three verse groups. This is not an inferred numeric
mapping or a word-by-word alignment.

This is one new, user-selectable English version for a previously unlinked
unit. The adjacent SN 1.41 and 1.43 do not receive its link. The
[review manifest](../../scripts/canon/reviewed_ati_stories.json) pins complete
HTML, including the notice, root verse wording and the complete root block scope (including headings and metadata). The reviewed path
validation now permits KN and SN pages only; general title/number linking
heuristics and runtime allowlisted hosts are unchanged.

Copyright 1997 Ṭhānissaro Bhikkhu, CC BY-NC 4.0. Original attribution, licence,
citation and the explicit mapping note accompany live reading. No English
body is bundled. Build hashes record the reviewed edition; the runtime reader
still uses supported live ATI/mirror copies and its existing continuation
checks, rather than claiming an immutable online edition.

Current totals: 2,550 English links, 1,408 directly linked units, 1,831 including
inherited verse links. The grouped-member tool view reports 1,382 / 1,805 of
8,445. These are access-link counts, not complete bilingual review.

## Remaining candidate ledger

The [baseline screen](ati-coverage-screen.json) keeps its historical statuses
and gains a separate D184 follow-up. SN 17.5's dung-beetle analogy matches a
candidate page, but the root explicitly abbreviates surrounding formulas.
That needs a reviewed scope/edition explanation before acceptance; no full
literal equivalence is claimed here. Other introductory, excerpted and
compilation pages remain individual reviews, not automatic whole-unit links.
Adding an eligible English-linked sutta changes the daily-sutta rotation pool.
The 2026-11-01 evaluation fixture consequently changes from Iti 103 to
SN 56.46; the rotation remains deterministic for this data version. No daily
selection algorithm was changed.

The work does not resolve unavailable translations elsewhere or manual client
and specialist review gates.

## Validation

See the completion receipt for exact-commit CI. Local checks include source
preservation, repair idempotence/rejection, commentary order and ownership,
reviewed-link hashes and adjacent-unit exclusion. The packaged stdio MCP
reader returned the complete 542-character Kindada translation with notices
and Yasoja's 20 commentary segments beginning at verse 243. The complete local test suite passed 889 tests with one skip; the final
17-check focused/evaluation suite and two repair checks also passed. All 195
non-network evaluation questions passed; six live questions remain explicitly
skipped. The installed-package audit read all 8,544 canonical texts, 47
commentary books and 109 post-canonical books with zero failures and zero
network attempts. The official ATI reference validator reported zero problems;
it is not itself evidence of the individually reviewed correspondence.
Offline smoke checks passed (34 tools, 64 checks), and the derived-parallels
reproducibility check passed. Exact-commit CI results are reported separately.
