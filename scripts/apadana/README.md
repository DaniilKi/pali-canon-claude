# Seven live Walters/Whitman Apadāna poems

This builder verifies the seven finite profiles in `src/apadana-profiles.mjs`.
It writes metadata and hashes only to `server/data/apadana.json`. It does not
write translation bodies, translator notes or publisher prefaces.

Use the exact official revision, never a floating branch or alternate archive:

```sh
git clone https://github.com/apadana-translation/apadana-site.git /path/to/apadana-site
git -C /path/to/apadana-site checkout fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4
node scripts/apadana/build.mjs --source /path/to/apadana-site --check
node scripts/apadana/build.mjs --live --check
```

Omit `--check` to reproduce the manifest from the already frozen profiles.
The command does not approve new poems, update expected hashes, fix root
boundaries or relax rights. Any drift fails closed and needs renewed review.
The builder reads the bundled canon directly, not the translation-merged
`canon.load()` snapshot. Six pinned rights/routing artifacts and seven complete
raw/body/notes/paratext/root mappings are checked separately.

The optional local-source tests do not retain official translation fixtures:

```sh
APADANA_SOURCE_CHECKOUT=/path/to/apadana-site APADANA_OFFICIAL_CHECKOUT=/path/to/apadana-site node --test tests/apadana-parser.test.mjs tests/apadana-integration.test.mjs
```

Those environment variables are POSIX shell syntax. On Windows, set both
variables using the shell's normal environment-variable syntax before running
`node --test`. Network-free synthetic tests run without either variable.

The actual restrictive grant is **CC BY-NC-SA 4.0**, not the generic stale
CC-BY field in `site.json`. Credit Jonathan S. Walters and Whitman College,
retain licence and source links, and describe presentation extraction changes.
Poems 4, 5 and 10 stay held. This local pilot does not establish coverage of
all 601 publisher poems or all 603 bundled Apadāna records.
