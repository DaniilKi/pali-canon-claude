# Personal notes beside a passage (D219)

Baseline: dev `70036b4bdab030b128f586e3fed00ff754500fa1`, 9 November 2026.

## The reading workflow

Readers previously had to save a passage, leave the text and open Saved to write a note. The reader now provides **Add personal note** beside each displayed segment in canonical texts, complete root books, commentary and later works. Existing notes and tab-local drafts can be viewed and edited beside their source. The note is visibly labelled personal and separate from scripture.

Adding a note saves that passage reference, not its wording. The same editor serves the reading and Saved screens, using the existing bookmark format, exact source selector/reference, absolute position and source revision. Notes remain limited to 4,000 characters and 500 saved references; reaching the limit never evicts another note. Existing JSON export/import continues to work without a migration or new account.

**Save note** writes the note to this browser. Closing the editor, changing pages or visiting Saved preserves unsaved edits in this tab; export includes those drafts even when their editors are offscreen. Save or export before closing/reloading the browser. A failed first reference save remains recoverable in the tab, and is explicitly reported as not durable.

## Source versions and private data

A saved note with a different source revision or invalid reference/version metadata is not attached to the currently loaded wording. The reader directs the user to Saved, where the personal note remains available for editing/export while its source pin stays unchanged. Legacy bookmarks retain an unversioned warning and are never silently upgraded to a current source version. This is source-metadata checking, not an archived scripture snapshot or independent provenance certification.

Removing a bookmark with a stored note or an unsaved note draft requires an inline confirmation. **Cancel removal** keeps both. Confirming removes only that exact saved reference and its note/draft. Empty references remain quick to remove. If persistence fails or conflicts with another tab, the local saved record and draft are restored, the failure stays visible, and recovery export remains available. Stale editors and stale removal confirmations cannot overwrite a changed record or newly edited draft.

Only personal note text and existing reference metadata are stored. The app does not automatically copy scripture into notes, send notes to MCP tools/providers, put them in URLs/titles, or include them in the Pāli print sheet. Notes do not become part of the canonical text, commentary, translations, word-study input or source licensing. There is no new server database or browser storage format.

The existing optimistic local-storage checks remain best-effort: they are not an atomic cross-tab transaction or account sync. Reading-position-only changes retain their special compatibility behavior; unseen private changes still block stale writes. Recovery/import preserves existing notes on duplicate references rather than choosing one person's wording automatically.

## Implementation and evidence boundaries

`web/passage-notes.mjs` supplies pure eligibility/transaction/rollback policies and reuses the established bookmark grammar. Reading/Saved share the editor and removal handlers. Failed saves preserve the latest input; failed removals preserve exact draft presence/value. Malformed deeply nested records are blocked without cloning rejected metadata into a reading error. Existing records remain stored/exportable. Cloning uses bounded JSON/Map operations compatible with the existing ES2020 browser build; no new browser-global or package dependency is introduced.

Browser acceptance uses actual bundled Pāli and catalogue-derived source IDs, segments, offsets and revisions. Typed private strings, capacity fixtures, quota failure and changed-revision metadata are explicit synthetic test inputs. Tests do not acquire publisher English, approve sources or claim live-provider freshness. They cover 320/390/768/1280 pixels at the 30px reading setting, keyboard/focus, both themes, all four source types, save/reload, shared drafts/export, confirmation/cancellation/rollback, legacy/stale pins, capacity and private-data boundaries. Automated axe checks do not certify physical devices, Safari/Firefox or human screen-reader accessibility.

Independent policy/UI cross-review found no remaining concrete issue after the compatibility and malformed-record fixes. The notes acceptance checks have their own bounded browser CI group; existing Saved/storage tests now explicitly confirm intentional note removal instead of expecting silent deletion.

Local verification passed 64 normal checks, 64 installed checks and 128 light/dark checks; 136 automated accessibility scans found 0 violations. Existing Saved/storage/reader regressions passed 44/38/173 checks. Policy/import/location checks passed 21 tests, including 11 new note-policy tests. The full local gate passed 1,172 tests: 1,170 passed, 0 failed and 2 existing optional skips (live publisher unavailable and historical checkout unavailable/advanced; frozen source descriptors remain enforced), followed by the 8,544-text audit with 0 failures. Smoke passed 64 checks across 34 tools; 195 offline evaluation questions passed with 6 live questions intentionally skipped. Final exact-head CI is the external integration receipt. [Machine-readable local evidence](PASSAGE_NOTES.json).
