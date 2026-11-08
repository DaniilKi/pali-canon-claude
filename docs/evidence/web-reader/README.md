# Standalone web-reader evidence

The feature branch is `feat/standalone-web-reader`, based on corpus checkpoint `f0906bd`. No merge into dev/main or deployment is covered by these receipts.

Start with the [current study-tool acceptance](STUDY_TOOLS.md). It records:

- 922 passing tests, one skipped, zero failures; production build and 8,544-text audit passed.
- 64 MCP smoke checks and 201 evaluation questions (six network questions skipped).
- [173 browser checks](browser-check.json) across four widths.
- [44 automated accessibility scans](accessibility-check.json), with manual-review limits retained.
- [Six extracted-package browser checks](packaged-study-check.json).

The [earlier follow-up review](FOLLOWUP_REVIEW.md) records the previous supplementary-reader scope. Its [101-check browser report](browser-check-supplementary.json) and [28-scan accessibility report](accessibility-check-supplementary.json) are retained separately so historical receipts do not silently change meaning.

Reports use real bundled data plus clearly identified synthetic failure fixtures. They do not claim production hosting, live upstream availability, full client/device support, human accessibility certification or scholarly review. See [the reader guide](../../web-app.md) for features, running instructions and next priorities.
