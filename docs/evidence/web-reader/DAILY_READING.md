# Daily reading acceptance

Independent branch `feat/web-daily-reading`, based on bookmark/notes restore `c1fe35f` and integration candidate `b15fc13`. Corpus baseline remains `7b04173`. Prepared 8 November 2026; no dev/main update or deployment.

## Delivered

- Header **Daily** opens the existing engine's dated Dhammapada verse or discourse opening. UTC date/type controls and explicit current-day refresh; no new selection algorithm, personalized recommendation or daily-history/progress store.
- Verse text includes its supplied source references. Discourse text is explicitly an opening preview, with the actual total source-segment count and a full-reader action. Canonical source and returned chapter-context links are distinct.
- Source revision, VRI attribution/terms, inherited-source notes and engine rotation explanation remain visible. Same date/kind/data version defines selection; the UI does not promise an unchanged selection after index updates.
- Native-script display reuses `localizeText`, explicitly labelled as display transliteration rather than independent script-edition collation. Lao/Lanna native-reader review remains pending.
- English bodies are not automatically retrieved. Full-source actions reuse the existing reader with its source choice, shared/partial consent, dictionary/commentary, exact refs and bookmarks. No provider, corpus, source right, tool schema or runtime dependency changed.
- Invalid or mismatched dates/kinds/selection/source/rotation/verse bounds fail before daily text display; impossible dates do not fall back to today. Late results cannot replace a newer route. Today refreshes even when already on the same hash route, allowing an overnight tab to request engine UTC again.

## Validation

- `npm run check`: production build; **966 tests, 965 passed, one skipped, zero failed**; **8,544-text audit, zero failures**.
- `npm run smoke`: **34 tools, 64 checks**; `npm run evals`: **195 passed of 201**, six live-network questions skipped.

- **Five daily policy tests**, including every actual selection through all **423 verses and 1,271 eligible discourses**, bad date/kind/identity/source/rotation, exact verse refs, chapter bounds and leap-date handling. They validate the existing engine output rather than implementing a second rotation.
- [36 browser checks](daily-reading-browser.json), **320/390/768/1280px**: actual engine text/refs/terms; date/type keyboard form; shared native-script rendering compared with canonical `get_text`; review cautions; exact full-source/chapter actions; same-route UTC refresh; invalid date; missing provenance; stale response and zero automatic English requests.
- [12 axe-core scans](daily-reading-a11y.json), phone/desktop and paper/night, zero detected violations; 36 functional assertions repeated. Only audit contexts bypass CSP to inject the checker. Incomplete/manual-review rules remain recorded; human accessibility certification is not implied.
- [36 extracted-package checks](daily-reading-package.json) with the installed server running outside the checkout and no checkout runtime dependencies.
- Broader **173 reader**, **49 plan**, **20 scoped-source** and **34 bookmark-restore** browser checks passed again.

Two interaction corrections preceded acceptance: the reading-type select now has a separate explicit label, and Today is a refresh action even on its current route. The browser runner also waits for completed canonical/error views instead of reading transient old DOM. Only final completed runs are evidence; no source rule or assertion was removed to get a pass.

## Repeat

```sh
npm run check
npm run smoke
npm run evals
python scripts/web-reader-daily-check.py --report /tmp/daily.json
python scripts/web-reader-daily-check.py --a11y --report /tmp/daily-a11y.json
# Optional extracted artifact:
python scripts/web-reader-daily-check.py --server-dir /path/to/package/server --report /tmp/installed-daily.json
```

Python Playwright and Chromium are required; use `PALI_BROWSER` if needed. Both daily runs are defined in CI. Feature-branch push filters do not launch the full hosted suite; do not claim b15fc13's green workflows cover these later changes.

Missing-provenance and delayed-response cases are controlled fixtures. Actual daily and canonical source outputs remain real bundled data. This does not approve additional sources/rights, individual English alignment, or all human interpretations. Browser dates support years 0001–9999; a rotation date is not a historical publication date. Physical iOS/Android, Safari/Firefox, human screen-reader/contrast/native-script and true zoom acceptance remain outstanding. Daily needs a reachable app server; it does not install an offline browser library, reminder service or account system.
