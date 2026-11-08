# Standalone web-reader evidence

Latest [daily-reading acceptance](DAILY_READING.md) adds the existing dated source rotation, exact previews and UTC refresh, with 36 browser and 36 installed-package checks plus 12 accessibility scans.

The independent [bookmark restore and CI acceptance](BOOKMARK_IMPORT.md) records all four successful b15fc13 workflows and the subsequent local restore feature.

Current [integration evidence](INTEGRATION.md) covers the isolated `integrate/web-reader-corpus-nov8` candidate: web `492169f` plus corpus `7b04173`. Dev/main and deployment remain untouched.

Earlier feature receipts below describe `feat/standalone-web-reader` at corpus checkpoint `f0906bd`; their original limits are historical, not rewritten as later successes.

Start with the [reading-plan acceptance](READING_PLANS.md): four existing schedules, bounded Pāli reading and local manual progress; 49 browser checks plus 49 extracted-package checks and 16 new accessibility scans.

See the [scoped-English acceptance](TRANSLATION_SCOPE.md) for translation guards and integration limits. Its 20 normal browser checks and 44 additional accessibility scans use explicitly labelled synthetic sources; compilation remains a forward UI fixture.

The [study-tool acceptance](STUDY_TOOLS.md) records the preceding slice:

- 922 passing tests, one skipped, zero failures; production build and 8,544-text audit passed.
- 64 MCP smoke checks and 201 evaluation questions (six network questions skipped).
- [173 browser checks](browser-check.json) across four widths.
- [44 automated accessibility scans](accessibility-check.json), with manual-review limits retained.
- [Six extracted-package browser checks](packaged-study-check.json).

The [earlier follow-up review](FOLLOWUP_REVIEW.md) records the previous supplementary-reader scope. Its [101-check browser report](browser-check-supplementary.json) and [28-scan accessibility report](accessibility-check-supplementary.json) are retained separately so historical receipts do not silently change meaning.

Reports use real bundled data plus clearly identified synthetic failure fixtures. They do not claim production hosting, live upstream availability, full client/device support, human accessibility certification or scholarly review. See [the reader guide](../../web-app.md) for features, running instructions and next priorities.
