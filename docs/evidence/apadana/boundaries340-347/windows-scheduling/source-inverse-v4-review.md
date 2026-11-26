# Runner follow-up source-map review

**GO for root binding** of map `21c6076b…` and loader `73e11f44…`, under path plan `fef6a96c…`. No source-preservation blocker found.

All 37 rows and 62 unique inverse hunks restore the entire sealed C1 source files byte-for-byte. The other 667 originals are unchanged. All 36 prior raw JSON row-value spans are byte-identical to map `8109fc35…`. The sole added row is `scripts/test.mjs`, restoring original `c0396da9…`.

The generation receipt binds 17 new files; the separately sealed loader completes all 18 planned paths. The only added new file is the scheduling probe. The loader changes only its map-hash literal and the ordered path-list insertion of `scripts/test.mjs`; its code and guards are otherwise unchanged. Original helper bodies and assertions carry forward through identical source hashes.

The exact driver/probe semantic review remains separate. This approval does not establish Windows CI success or turn the bounded serial diagnostic into full acceptance. Root can copy the exact reviewed map/loader and preserve both previous maps in history, then bind copied bytes and exact-commit CI results. The 39 packaged app files remain separately bound and unchanged.

Only metadata/source reads and in-memory inverse comparisons were performed. No app, helper, driver, tests, build, Git or network execution and no tracked edit was performed by this reviewer.
