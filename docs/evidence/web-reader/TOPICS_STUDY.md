# Topic and teaching-list study acceptance

The engine already provided 472 ATI index entries and 37 curated teaching lists,
but the standalone reader did not expose those subject-study paths. The Library
now offers **Study by topic** and **Numbered teaching lists** without enlarging the
persistent header or adding another corpus/index/provider.

The topic catalogue reuses actual engine filtering, supported native Pāli input,
index selection and pagination. Topic pages preserve mapped canonical IDs,
publisher references and differing-number cautions. ATI cross-references lead to
other exact index entries. Original ATI pages and essays remain external links;
essays are labelled commentary, not scripture. Index metadata's CC BY 4.0 terms
do not grant translation redistribution rights.

List catalogues/details retain `canonical`, `canonical-later-name` or `later`, the
engine's status explanation, editorial-gloss warning, Pāli members, source groups,
defining passages and related lists. The thirty-seven aids remain seven grouped
entries; the UI does not manufacture a new flattened enumeration. Ten perfections
retain their later-list qualification while linking to Buddhavaṃsa 2.

Source actions use the emitted canonical command, never a guessed ATI number.
`web/topics-study.mjs` rejects mismatched selections, nonadvancing pages, missing
metadata and unsafe/mismatched reading commands before display. These are
structural checks, not new scholarly verification or source-rights approval.
Free filter text is URL/history state but is excluded from the tab title; topic
detail titles identify the public selected entry. No personal recommendation,
extra stored search history, scripture generation or automatic English fetch.

## Evidence

- Unit guards accepted every actual topic, all three catalogue index modes and
  every curated list, plus negative identity/command/status/URL cases.
- [48 browser checks](topics-browser.json), widths 320/390/768/1280.
- [48 extracted-package checks](topics-package.json), outside the source tree.
- [16 accessibility scans](topics-a11y.json), phone/desktop and light/night,
  zero detected violations, with 48 functional assertions repeated.
- Browser checks cover actual catalogues, mapped reading actions, number cautions,
  native query conversion, empty results, later statuses, grouped lists and
  keyboard filtering/retry. Malformed commands and delayed replies are explicitly
  controlled fixtures; they do not alter source data.

Normal tests retain production CSP. Audit-only contexts permit axe injection.
No physical-device, screen-reader, native-reader or human-accessibility
certification is implied. No new historical interpretation, translation,
canonical mapping, licence or deployment is established.

Run `node --test tests/web-topics-study.test.mjs` and
`python scripts/web-reader-topics-check.py`, also `--a11y` and extracted
`--server-dir`. Hosted Chromium includes both modes. Exact-head CI and remote
refs establish integration separately; this receipt alone does not publish a host.
