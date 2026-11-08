# Exact reading-position acceptance

[Baseline reproduction](position-before.json), built `79dec3c`: the viewport was
at `mn10/11`, but the saved link was only `#read?uid=mn10` and resume reopened
`mn10/1`. This was a real reading-continuity gap on long source pages.

## Change

A single browser-local locator now retains exact reference, offset, reported
source revision and corpus/plan identity. Stable visible segments/headings are
sampled after a 350 ms scroll debounce; pagehide also flushes. In-app navigation
cancels pending sampling, so scrolling to a header link does not erase the stable
point. Navigation before a stable sample can retain the previous point; this is
a viewport locator, never proof of comprehension or completed reading.

Resume checks revision and exact reference before wording is displayed. Split
plans still revalidate their source and current assigned window. Source drift
requires explicit current-source review at the same reference; missing refs still
fail. The pin detects reported revision drift, not independent content integrity
or a historical text snapshot. Old unpinned links/bookmarks keep their old rules.

Reference labels are exact source-pinned links. Copy reading link uses the stable
current-page locator (or its first source segment); clipboard refusal leaves an
accessible real link. No source body, notes, query or English consent is placed in
the locator. Scrolling does not rewrite URL/history. Commentary and later-work
modes stay distinct; English panels/consent are not restored or fetched.

Reading preferences can disable recording and remove the pointer. Automatic writes
refuse changed browser storage rather than overwriting another tab. Storage errors
leave an explicit warned tab-local resume. These are not account sync, transactional
multi-tab coordination or a guarantee against browser/OS storage eviction.

## Evidence

- [48 browser checks](position-browser.json), widths 320/390/768/1280.
- [48 extracted-package checks](position-package.json), outside the source tree.
- [16 accessibility scans](position-a11y.json), phone/desktop in light/night,
  zero detected violations and 48 functional assertions.
- Unit guards cover canonical/book/commentary/later/plan locators, exact pins,
  drift/ref requirements, bounds and exclusion of notes/URLs/English consent.
- Existing regressions passed: standalone reader 173, compact navigation 41,
  request recovery 36 and reading plans 49.

The primary browser flows use real VRI and supplementary sources plus the actual
plan day assignment. Changed source metadata, missing ref, clipboard denial,
competing browser write, storage failure and synthetic pagehide dispatch are
labelled fixtures, not historical/source findings. Normal contexts retain CSP;
audit contexts alone allow axe injection. No physical-device, native-reader,
screen-reader or human-accessibility certification is implied.

Run `node --test tests/web-reading-position.test.mjs` and
`python scripts/web-reader-position-check.py`, also `--a11y` and extracted
`--server-dir`. Hosted Chromium includes both browser modes. Exact-head CI and
Git refs remain the separate integration authority; no hosting was published.
