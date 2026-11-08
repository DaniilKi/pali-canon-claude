# Version-aware bookmark reopening

## Observed boundary

Baseline `3e7496e91cad5f27440b9dfc61c211eaf38a0bbd` stored `source_commit`, exact
segment refs and offsets in new bookmarks, but Saved links omitted the revision.
The reader warned about an old saved revision only after rendering the current
wording. It was therefore not silent, but weaker than the pre-wording refusal
already provided for source-pinned resume/share links. No actual upstream text
corruption is alleged; drift tests use explicitly synthetic old metadata.

## Repair

`web/bookmark-location.mjs` reuses `readingPosition` to preserve a versioned
bookmark's revision, exact offset/ref and existing source kind. The existing
`assertPositionPin` runs before heading/passage rendering. A mismatch therefore
shows no wording until the reader chooses **Review current source at this
reference**. That keeps the ref, offset and reading kind, but deliberately
removes the old source guard. The original bookmark and private note are not
rewritten or rebound.

Legacy records without a saved revision remain usable, with explicit disclosure
that they open the current source. Missing/invalid position metadata on a
versioned record, or an invalid pin, is never silently downgraded. The record and
its personal note remain available for editing/export, with no unsafe read link.
Invalid exports remain recovery material; ordinary restoration still requires
supported metadata. No existing profile is automatically migrated or deleted.

These checks trust the revision metadata from the source engine. They are not a
historical archive, publisher authentication or per-segment cryptographic
snapshot. They cannot detect every remapping under an unchanged revision. No
claim is made that an older edition is retrieved. English source/consent rules,
source data, licence terms, storage guards and backend APIs are unchanged.

## Completed acceptance

- Four helper tests in `tests/web-bookmark-location.test.mjs`.
- [48 browser checks](bookmark-pin-browser.json), actual canonical, complete root
  book, later-work, direct commentary and aligned-commentary readings.
- [48 extracted-package checks](bookmark-pin-installed.json), outside checkout.
- [48 checks with 28 accessibility scans](bookmark-pin-a11y.json), both themes;
  zero automated violations detected.
- [34 import regressions](bookmark-pin-import.json).
- [44 saved-navigation/draft/export regressions](bookmark-pin-saved.json).
- [48 exact-position regressions](bookmark-pin-position.json).
- `npm run check`: 1,003 passed, one explicit skip; 8,544-text audit, zero failures.
- An additional CI report-retention contract test passed independently after the
  main test list had already been started; it is included in subsequent full CI.
- `npm run smoke`: 64 passed; offline evals: 195 passed, six live-network skips.

Independent AI review reran all four helper and 48 browser checks, found no
blocking source defect, and confirmed legacy/invalid metadata remains intact.
It found missing artifact paths for recent browser reports. Those paths are now
explicitly retained, with a generic regression requiring every report produced
by the browser matrix to be present in its upload list. No old tests were removed
or per-job timeout raised. A separate provenance group keeps the source-pin
checks bounded and participates in the existing aggregate browser gate.

Repeat with `python scripts/web-reader-bookmark-pin-check.py`, optionally
`--a11y` or `--server-dir /path/to/installed/server`. Physical devices, human
screen-reader acceptance and actual publisher revision transitions remain
unverified. No main merge or deployment is part of this change. Hosted exact-head
CI is a separate integration result.


## Long-metadata recovery follow-up

An adversarial 500-character invalid saved title (within the supported title
bound) exposed a 5,354px document on a 320px viewport. Recovery rows now inherit
`overflow-wrap:anywhere`, scoped only to Saved results. The bookmark-pin runner
explicitly checks viewport bounds for real current records and invalid long
metadata while retaining refusal, no-request and exact-export assertions.
Rebuild, five targeted unit/CI-contract tests, the 48-case browser and installed
package checks, 28 accessibility scans and 44 saved-library checks pass. Full
engine gates above are retained because this follow-up changes only scoped CSS
and test fixtures. Independent read-only review confirmed that wrapping does not
change source wording, notes or export data. Final exact-head CI is still required.
