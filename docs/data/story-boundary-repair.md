# Story-boundary repair: Vv and Pv

The Pāli wording was intact, but some citation spans started one verse too late.
As a result, a reader could receive the next story's opening verse with the
previous story. The fix uses the source's explicit story headings.

- Source: [VRI pinned edition](https://github.com/VipassanaTech/tipitaka-xml/tree/2d134ff9ef60f70a1eb03c9370580228811a3070/romn).
- 136 stories checked: 85 Vimānavatthu and 51 Petavatthu.
- 69 spans corrected; 11 existing commentary assignment lists updated.
- No source wording, citation IDs, collection counts, commentary passages or
  commentary coverage changed. No translations added or generated.
- Example: Pv 5 now covers VRI verses 14–25; Pv 6 starts with verse 26 and ends
  at 34. Previously Pv 5 included verse 26, while Pv 6 also included verse 35
  from the following story. Verse numbering can differ between editions.

The [machine-readable receipt](story-boundary-repair.json) lists every changed
span and commentary list, the source commit and XML SHA-256 values.
[Rebuild instructions](../../scripts/canon/README.md#vvpv-story-headings) explain
how to reproduce the repair. `tests/story-boundaries.test.mjs` checks every story
boundary and commentary assignment, the reported dialogue, and refusal to guess
on mismatched identities. Full-source equality was checked before repair; the
receipt records which other data remained unchanged.

## Translation leads at the D180 checkpoint

The following was the status when the boundary repair was published. The
subsequent [D181 source review](ati-story-links.md) resolved the three mappings
and page-specific rights notices and added their whole-story links separately.

The official [ATI mirror](https://github.com/bcbsit/ati/tree/45fedca341497120651efa20e756b04a13e61089/tipitaka/kn)
contains one Pv and two Vv translated pages. This is the same already-recorded
mirror commit, not a new provider. Page metadata identifies Thanissaro Bhikkhu's
Pv 1.5 (CC-BY-NC) and John D. Ireland's Vv 1.16/3.7 (BPS). The Pv page's verse
range agrees with Pv 5. The Vv pages' verse numbers differ from VRI, and Sesavati
is titled Pesavatī in VRI. Exact scope and BPS reuse terms need further review
before accepting those links or fetching their bodies through a reading tool.
The three candidates were not imported in this change.

These checks do not certify other editions, missing sources or actual signed-in
client behavior. Main and hosted deployments are outside this branch update.

## Validation for this branch update

- `npm run check`: build passed; 877 tests passed, one skipped; audit of 8,544
  canonical texts reported zero failures.
- `npm run smoke`: 64 checks passed across 34 tools, offline.
- `npm run evals`: 195 questions passed; six live-network questions skipped.
- `npm run audit:installed`: all 8,544 canonical texts, 47 commentary source
  books and 109 post-canonical books passed; zero failures/network attempts.
- Reapplying the repair to its own output made no changes. Source-wording and
  untouched-collection preservation checks passed.
- These are local cloud-executor checks. Remote CI is reported separately and
  is not inferred from these results.
