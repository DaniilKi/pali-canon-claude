# Pāli Library web reader

A standalone, responsive reader is available at the HTTP server's root URL. It does not require an AI account or the ChatGPT widget. This is the first complete reading slice, not feature parity with every tool in an AI client.

The reader includes the combined source-aware interface, study tools, reading plans, local restore, daily reading and compact phone layout, based on corpus `7b04173` and integrated reader `6e44c1c`, with the Pāli quotation checker described in [its acceptance receipt](evidence/web-reader/QUOTE_CHECK.md). See the [dev integration checkpoint](evidence/web-reader/DEV_INTEGRATION.md) for branch/gate verification. Older feature receipts retain their historical scope; they are not the current branch-status authority. A Git integration does not deploy a public host.

## Run it

From the repository, using Node 20 or newer:

```sh
npm ci
npm run build
npm run serve
```

Open **http://localhost:8080/** in a browser. The server uses the same port and configuration documented in [hosting](hosting.md). A phone can use the server through a reachable HTTPS host; localhost on a phone refers to the phone, not your computer. This branch does not deploy or publish a host. Do not expose an unencrypted personal computer directly to the internet.

The npm package and container include `server/web/`. The HTML, stylesheet and browser script are first-party files with a restrictive Content Security Policy. There are no external fonts, trackers or JavaScript frameworks. `/mcp`, `/healthz` and the optional ChatGPT widget keep their existing contracts. `/reader` is an alternative entry URL.

## What you can do

- Browse the canonical collections and all complete root source books, including front matter. Separate catalogues expose all 47 bundled commentary books and 109 later Pāli works; both are visibly labelled **not canon**.
- From **Library**, choose **Find English sources**. Filter existing confirmed-location canonical records by collection and by all links, ordinary whole-unit/chapter links, scoped-only choices, or no indexed English link. Partial and shared choices are labelled separately; inherited chapter links retain their context. Counts describe this index, not complete translation correspondence or the absence of translations elsewhere. Opening a result reads Pāli; English still requires selecting a source and any applicable scope consent. Filters and pagination survive copied URLs and browser navigation without storing personal data.
- Complete VRI source books also offer **Search this source book** from their catalogue and Reading tools. This searches the whole file, including front matter, with exact version-pinned source-file result links. It does not assign a match to a standard discourse or rule citation; see [scope and acceptance](evidence/web-reader/SOURCE_BOOK_SEARCH.md).
- Choose a search scope: canonical texts, commentary, or later works. Supplementary searches open the exact selection returned by their existing tools without reinterpreting it as a canonical citation. Search canonical Pāli bodies and Pāli/English titles using the existing search tool. English query expansion is labelled, not presented as full English-translation search.
- Open a citation directly and read the exact source segments with visible references and source terms. Continue long texts and books page by page.
- Choose an exact linked English source (on phones, open **Study & sources** first). Shared condensed/compilation pages and partial-unit sources require a visible scope review and an unchecked consent box before retrieval. Shared pages list every member, retain the publisher’s page reference and never claim a separately aligned translation of the selected discourse. Partial sources show their declared segment bounds. Checked continuation retains the version, source-prefix pin and scope consent; unknown or changed scopes fail closed. Failed retrieval is displayed; no replacement text is generated.
- Compare 2–4explicitly selected ordinary English source versions from **English sources**. Each column retains its exact version, attribution, source terms, independent pages and retry. Columns are not aligned passages and can include different editions by the same translator. Shared/partial sources keep their separate individual scope review; comparison does not fetch them. No English is retrieved merely by opening the picker or selecting checkboxes. See [comparison boundaries and acceptance](evidence/web-reader/TRANSLATION_COMPARISON.md).
- Read available traditional commentary separately from the root text, including pagination. Direct commentary-book reading and search hits do not claim verified root-text alignment. Later-work and commentary bookmarks retain their corpus and exact reading position.
- Change text size, paper/night theme and the supported Pāli transliteration script. Lao/Lanna still require native-reader validation. Installed device fonts affect glyph availability; selecting a script does not install fonts.
- Open **Daily** for a dated Dhammapada verse or a discourse opening from the existing fixed rotation. Dates are UTC, not personalized; discourse previews are not full readings. Open the actual Pāli source/chapter context to continue or choose English sources.
- Follow four sourced **Plans**: Dhammapada chapters, the Majjhima Nikāya year plan, and two link-only ATI study-guide citation orders. Split readings stop at their assigned Pāli boundary. Mark days manually, undo marks, and export/restore browser-local progress after a preview; source/assignment changes are not silently credited.
- Add or edit a personal note directly beside a Pāli segment in any source type, or use **Saved**. Notes remain separate from scripture and keep their source/reference metadata. Closing an editor preserves drafts in this tab; Save makes them durable, and export includes unsaved drafts. Removing a noted bookmark requires confirmation, and a failed storage write preserves the note for recovery. Changed source versions require review; legacy notes stay unversioned. The same JSON restore remains additive. See [notes and privacy boundaries](evidence/web-reader/PASSAGE_NOTES.md).
- Open **Study backup** from Saved or Plans to download notes (including drafts), saved references, plan marks and an optional reading reference in one local file. Preview restore before applying; existing notes and conflicting marks stay intact by default. Review differing notes side by side and explicitly choose incoming text only when both saved references have the same source revision and exact position. Other notes, titles, pins and conflicting marks stay intact. Download the current backup first to keep both versions. The reference is opt-in and never changes the remembering preference. Export works without a server call; restoring marks checks the plan catalogue without uploading your file. See [backup scope and interrupted-flow checks](evidence/web-reader/STUDY_BACKUP.md).
- From **Library**, choose **Study by topic** to browse/filter the actual ATI subject and numerical indexes, or **Numbered teaching lists** for the curated reference catalogue. Index entries and English glosses are not scripture. Mapped Pāli actions use canonical IDs; publisher-number differences remain labelled. Later lists and later collective names keep their qualifications.
- Look up English or Pāli terms in the bundled glossary, including supported native-script input. Every result identifies its DPD or curated-list source; glosses are not passage translations.
- Open **Study words** on a body segment in a canonical text, complete root book or later work. See the bundled DPD analyses, alternative parses, grammar, computed split suggestions and unknown forms. Commentary analysis is not supported by the current backend; the app does not substitute root-text analysis.
- Open **Related texts** for canonical selections. Shared-word matching and commentary citations are labelled separately with their evidence. Reading links retain the emitted source segment or exact commentary reference. External parallels are a link only.
- Open **Check quote** to compare a Pāli quotation with the whole bundled canonical Tipiṭaka using `verify_quote`. Roman and supported native Pāli input are accepted; English verification is not exposed in this slice. Results retain normalization, ties, scope and source terms. Open exact match starts to inspect context. A match is not proof of authorship, verbatim wording or correct spelling; a negative result concerns only the searched corpus.
- Stop waiting for a pending reading or study request, then retry explicitly. Changing pages or study panels cancels obsolete browser waits. This does not guarantee that the server stops its work.
- Resume the last visible Pāli passage with its exact reference, offset and source version. Copy a source-pinned reading link, or copy/open a passage reference directly. Turn off **Remember reading position on this device** to clear the pointer and stop recording it. Use browser back/forward and keyboard navigation.

Source-reading pages also offer revision-pinned Next/Previous and **Go to source position**, bounded by the actual work or current plan assignment. Positions are not traditional citation numbers; exact saved-paragraph links keep their separate reference pins. See [navigation scope and validation](evidence/web-reader/SOURCE_NAVIGATION.md).

## Storage and source boundaries

Personal preferences, the last reading link and up to 500 saved references/notes remain in this browser's local storage. Scripture and English bodies are not downloaded into an offline web library. Data is not synced between devices, and clearing browser storage removes it. JSON export is a backup; previewed local bookmark restore is supported, while account sync is not implemented. Storage failures are reported without preventing reading. Source revisions are retained on bookmarks. Versioned bookmarks check the recorded revision before displaying wording; a changed revision requires explicit current-source review. A bookmark is not a frozen scripture copy.

Canonical Pāli works **without upstream source access on the server**. That is different from the web app working without access to its server: this version has no service worker/offline browser mode. English needs an available approved live provider. All source terms and alignment/abbreviation cautions continue to apply. No SuttaCentral source is imported or fetched.

There are no app accounts or server-side personal notes. The HTTP service retains its existing transient IP rate limiter and aggregate counters. Hosts/reverse proxies may retain their own infrastructure logs. See [privacy](../PRIVACY.md).

## API and integration

The UI calls the existing schema-validated MCP tools over same-origin `/mcp` using JSON-RPC with JSON response negotiation. It has no alternate content database or arbitrary URL proxy. Tool errors, HTTP errors and finite request deadlines remain explicit. Navigation and study requests have separate generation guards: a late result cannot replace a newly selected text or study panel. Retrieved strings are inserted using DOM text nodes, never HTML.

`src/web-reader.mjs` serves only four fixed routes. The build copies HTML/CSS from `web/` and bundles `web/reader.js` into `server/web/reader.js` for portable npm/container installation. The browser bundle imports the existing `localizeText` implementation from `src/script.mjs`, so native-script passage validation uses the same renderer as the source tool rather than a second transliterator. Unbundled HTTP-module tests also serve the checked-in compiled assets, never the raw module source. The Docker build includes the source assets. Changes to `web/` must rebuild and commit `server/web/` and `server/http.cjs`.

## Design research and priorities

The useful patterns from established scripture readers are calm typography, visible context, multiple translations, bookmarks, notes and comfortable reading preferences. We used these as functional guidance, not as evidence of a conversion or learning improvement:

- [Quran.com product notes](https://quran.com/product-updates): bookmarks, verse context, study mode, translation reading and personal notes. Those are distinct features rather than justification for adding a social network to this library.
- [dhammatalks.org Sutta collection](https://www.dhammatalks.org/suttas/): explicit collection introductions, translator attribution and the advantages of properly licensed eBook formats for offline reading. This does not grant new redistribution rights.

Next priorities, in order:

1. Extend the same UI to additional study tools. Pāli quotation checking, the glossary, contextual DPD word study, related-text evidence and supplementary catalogues/search/readers are now implemented. Keep canonical status and uncertain mappings visible.
2. Ordinary-source comparison, exact source links and versioned reading positions are implemented. A dedicated installed-package Firefox/WebKit journey now complements Chromium acceptance; see [recorded compatibility scope](evidence/web-reader/BROWSER_COMPATIBILITY.md). Physical Safari/iOS/Android, screen-reader and native-reader review remain separate.
3. Optional whole-passage highlighting now follows exact source-pinned saved references; see [highlighting scope](evidence/web-reader/SAVED_HIGHLIGHTS.md). Arbitrary word-range annotations remain future work. Previewed reading-progress restore is now supported. Bookmark/notes restore now has bounded schema validation, preview and an additive merge. Personal reflections must never be labelled scripture.
4. Design explicitly user-requested, versioned offline packs only after source-specific rights/storage review. Don't silently cache live translations or claim whole-corpus English coverage.
5. Audio, cross-device accounts/sync, reminders, community features and native app-store distribution require separate rights, privacy, security and operating-cost decisions. No synthesized sacred narration is provided by this slice.

Later-work chapter navigation and compact source context are now implemented; see [scope, phone measurements and acceptance](evidence/web-reader/CHAPTER_READING_CONTEXT.md). Logical-work menus remain distinct from physical source-file headings. Original background explanations remain inside Reading tools and in source printing, while critical/unknown warnings stay visible. Every actual printed heading and passage remains intact. Further work should prioritize demonstrated reading/source gaps rather than further small backup refinements.

## Verification

```sh
npm run check
npm run smoke
npm run evals
node --test tests/web-reader.test.mjs
python scripts/web-reader-browser-check.py
python scripts/web-reader-a11y-check.py
```

The browser runner requires Python Playwright and Chromium (set `PALI_BROWSER` to the installed executable if needed). It starts/stops its own local built server. Real Pāli and commentary are tested against the bundled corpus; upstream translation outages and late-response tests are explicitly synthetic. Browser screenshots are written to `/tmp/pali-web-reader/`. No live-source translation availability or human accessibility certification is implied by these checks.


## Follow-up review

A second-pass source/behavior review found and repaired the first slice’s skip-link routing defect: keyboard “Skip to reading” now focuses the current passage rather than navigating away. Supplementary-source bookmarks now keep the selected corpus and a selection-relative offset, including exact commentary segment references; no global segment number is applied to a one-segment selection. Long source references and Pāli titles wrap on narrow screens.

The supplementary search tools and data are unchanged. No new source, licence claim, data transformation, permission, content endpoint or deployment was added. Browser tests explicitly distinguish canonical, direct commentary and later-work scope. Synthetic hostile-looking text and unsafe source URLs test DOM rendering without modifying corpus data.

The pinned `axe-core` dependency is **development-only**, used by `scripts/web-reader-a11y-check.py`. That audit uses a separate browser context permitting checker injection; production CSP remains restrictive and is checked separately. Its automatic WCAG-rule results and incomplete/manual-review rules are recorded. These are not a human accessibility certification or independent scholarly review.


## Study-tool source integrity

The glossary uses the existing offline `glossary` tool, not live `lookup_pali`. It supplies a limited, sourced term index rather than full dictionary articles. Word study uses `analyse_passage` on the **selected** reference and paginates words within that selection. Before displaying a result, the UI checks its segment reference, VRI source revision and actual displayed wording. For native-script reading, it renders the returned Roman segment through the same core `localizeText` function and compares that output with the passage already shown. A mismatch produces a visible retry/reload error without displaying substituted meanings. Dictionary source/version/CC BY-NC-SA terms are shown separately from VRI passage source/non-commercial terms. DPD can list several analyses; the UI does not choose a supposedly correct meaning or turn them into a translation.

Related-text results use `get_parallels`. A shared-word score is not a probability or a claim of equivalent teaching. Commentary evidence is opened with `get_commentary`, explicitly labelled not canon, and its original aligned reference is preserved in bookmarks using a distinct selector. No new linkage or relationship is inferred by the interface. Results and study panels have the same stale-response guards as translations; a delayed word study cannot replace a newly requested relation panel.

## Scoped English-source acceptance

The browser consumes the backend’s `translation_scope`; it does not approve source rights or create mappings. Consent applies to the reviewed source version and complete scope disclosure for the current Pāli selection. It is not stored in bookmarks/preferences and must be given again after navigation or reload. Unknown declarations are withheld. Missing provenance, a changed scope/version, a shared page attributed to one discourse, or an unsafe continuation is an error before text is displayed. Ordinary unscoped responses retain exact canonical identity; a listed backend fallback is visibly labelled using the returned version.

The original [scope acceptance](evidence/web-reader/TRANSLATION_SCOPE.md) used corpus `f0906bd` and a labelled forward compilation fixture. That receipt remains historical. The isolated candidate now includes corpus `7b04173` and tests the three actual reviewed shared compilations through the worker-backed server and browser, with exact source/notice hashes and page-level identities. See [integration evidence](evidence/web-reader/INTEGRATION.md). This does not establish new individual wording alignment or publish the candidate to dev/main.

Repeat the isolated guards with `python scripts/web-reader-scope-check.py --report /tmp/scope.json`. Add `--a11y` for the separate automated audit in both themes (that context alone bypasses CSP to inject axe-core). No publisher network access or committed corpus modifications are involved.

## Reading plans and manual progress

Open **Plans** in the header. The existing `reading_plan` engine supplies all four reading orders and day assignments. There is no new recommendation algorithm, deadline, streak or AI-written reading. Days may be opened in any order. The ATI plans display guide attribution, terms and unplaced links; their guide prose is not reproduced. English bodies are not automatically fetched.

When an assignment covers part of a discourse, its reading link carries the plan name/day and source identity. The reader re-requests the engine assignment, validates the selected text and source pin, and paginates strictly within its Pāli segment bounds. Out-of-span URLs or changed/incomplete source responses fail before display. Whole-text English and related materials are explicitly distinguished from this assigned Pāli part. Ordinary reading outside a plan remains available in Library. Bookmarks preserve exact passage references; reopening one is ordinary reading, not a claim to remain inside the plan assignment.

Day marks are self-reported, stored only in this browser and individually reversible. They are bound to the day’s text IDs, offsets/limits and VRI revision. A changed assignment/source does not inherit a previous completed state. Catalogue counts are labelled saved marks, not verified current completion. Export progress from the Plans list; clearing site data loses it. Progress restore is previewed and additive; there is no sync, cloud backup or automatic inference of comprehension. If storage fails, tab-local marks remain exportable and the interface warns that they are not durable.

Run `python scripts/web-reader-plans-check.py --report /tmp/plans.json` and add `--a11y` for the separate audit. The same runner accepts `--server-dir /path/to/extracted/package/server` to test an installed bundle from outside the checkout. See [reading-plan evidence](evidence/web-reader/READING_PLANS.md).

## Restore bookmarks and personal notes

In **Saved**, choose a Pāli Library bookmark JSON export. The browser reads it locally and shows new/duplicate counts before anything changes. Confirm to add new `(source selector, passage reference)` keys; existing notes and revisions are retained. Cancel makes no changes. The entire file is refused if it is malformed, has duplicate references within itself, unsupported fields, invalid values, over 500 records, exceeds 16 MiB or would exceed the current 500-bookmark capacity. No partial import or silent truncation occurs.

This restores personal reading metadata, not scripture or proof of source authenticity. Imported titles/notes render as inert text. Exact passage references are checked when opened; missing/stale references fail explicitly with no nearby-text substitution. Commentary and later-work selectors keep their non-canonical reader modes. Browser storage failure gives a tab-only warning; export remains available. There is no file upload or account sync; plan-progress exports have their own separate restore control in Plans. See [acceptance and checkpoint CI](evidence/web-reader/BOOKMARK_IMPORT.md).

## Daily reading

**Daily** reuses `daily_text`; the source engine supplies the UTC date, kind, rotation position, canonical selection, notes and provenance. Choose a date and either a Dhammapada verse or a discourse opening. The current index rotates through 423 verses and 1,271 discourses with an ordinary English source linked. This is a navigation aid, not a personalized recommendation, new selection algorithm or historical claim about a date. A changed data index may change a date's selection.

Verse previews show the supplied verse references and exact text. Discourse previews show only the source-supplied opening, labelled as a preview, with its total segment count and a link to the full canonical reader. English source bodies are never fetched automatically. The ordinary reader retains source choice, consent, commentary, dictionary, bookmark and pagination behavior. Verse chapter-context links use the explicit returned canonical chapter ID.

Script display reuses the existing renderer, with a notice that this is display transliteration from VRI Roman rather than separate script-edition collation. Lao/Lanna native-reader validation remains pending. **Use today’s UTC date** always re-queries the engine, including when already on the same route, so a tab left open overnight can refresh without guessing from the device timezone. The app does not add a daily-date/history/progress store, reminder, account, notification or offline browser mode; normal browser URL history and existing server/provider limitations still apply.

Missing/mismatched date, source, selection, rotation or verse/context metadata fail before displaying a daily passage. Impossible dates are errors, not a fallback to today. Late responses cannot overwrite another route. Browser date controls cover years 0001–9999; daily rotation dates are not historical publication dates. See [daily acceptance](evidence/web-reader/DAILY_READING.md).

## Compact phone reading

On narrow screens, **Find a passage** opens the citation/search controls and collection links. Submitting either form closes the phone finder and focuses the main result region; submitting the current URL refreshes the source/results instead of leaving the drawer open. Reading preferences remain directly available. **Study & sources** opens the canonical reader’s English, commentary, related-text and copy-link controls. Picking a study action closes that phone disclosure and focuses the resulting panel. Desktop search/study controls remain exposed; this uses the same controls and source APIs rather than a second mobile reader.

Disclosure state follows the responsive breakpoint and is not stored as a personal preference. When a focused control is collapsed by a breakpoint change, focus moves to its visible summary. Resizing does not recreate the source-review pane or reset existing per-view scope consent. Exact deep-linked passages retain their position. Continue-reading links appear away from the current reading, avoiding a redundant current-page action above the text.

Browser tab titles identify the current source/view; search uses a generic title and personal notes are never put into a title. On two measured default-font phone viewports, the first passage moved from below the viewport into view; this is not a universal fold guarantee for all devices, fonts, titles or text-size choices. See [measurements and acceptance](evidence/web-reader/COMPACT_READING.md).

## Pāli quotation checker

**Check quote** uses the existing `verify_quote` engine with explicit `language: pali`
and five results. This bounded interface never chooses English mode, fetches translations,
or adds a separate matching algorithm. It accepts up to 2,000 characters; the engine also
checks its 120-comparison-word limit after native-script conversion. Native input is a
Pāli transliteration assumption, not translation of a regional language.

The request is sent to the same server, not stored in browser-local notes or a shareable
URL. The page title stays generic. Infrastructure may retain request logs. Results show
the submitted quotation, actual source wording, normalization or literal-source method,
stock-passage ties, searched scope, terms and the engine's explanation. Similarity is
not a probability of truth. Lower-scoring negative candidates are labelled accordingly.
Source links retain the exact segment start and offset, with ordinary context/pagination;
they do not claim every displayed segment belongs to the matching excerpt. No source
words are rewritten or generated. `web/quote-check.mjs` rejects request/scope mismatches
and invalid reading commands before any verdict or source excerpt is displayed.

The UI currently has no English scope/version picker for this tool. Existing English
reading and its explicit partial/shared consent remain separate and unchanged. Keyboard,
small-screen, malformed-result, delayed-navigation and no-live-English regressions are in
`scripts/web-reader-quote-check.py`; run normal, `--a11y` and extracted `--server-dir` modes.
The automated accessibility scans are not a substitute for screen-reader or device review.

## Restore reading progress

In **Plans**, choose a reading-progress JSON export, review the additions, then
confirm. Cancel changes nothing. The file is read on your device, never uploaded.
Export it from one browser and transfer that file yourself to restore on another.
This is a manual backup/restore workflow, not automatic sync or an account.

The parser checks every mark and its nested assignment/source signature. It
accepts only the current catalogue's plan names and day ranges. Foreign exports,
unknown plans, duplicate days, invalid commands/metadata, extra fields, files over
16 MiB and totals over 1,600 marks fail atomically. Existing marks win on duplicate
or conflicting days; conflict counts are shown before confirmation. Restoring an
older signature does not replace it with the current source/assignment. A stale
mark is visibly inactive when its day opens. Saved counts remain personal marks,
not verified completion; imported files are not evidence that reading occurred.
If browser data changes during preview, confirmation refuses to overwrite it and
asks for a fresh preview after reload. This is not transactional multi-tab sync.

If browser storage fails, restored marks remain in this tab with an explicit
warning and can still be exported. Clearing site data loses unexported progress.
Delayed file reads cannot replace a newer route. See
[restore acceptance](evidence/web-reader/PROGRESS_RESTORE.md) and run
`scripts/web-reader-progress-check.py` in normal, `--a11y` and extracted
`--server-dir` modes. Source text, English consent and plan generation are unchanged.

## Topics and numbered teaching lists

The Library's study buttons expose `list_topics`, `topic` and `dhamma_list` without
adding another index or generating interpretations. Topic-name filtering reuses
the engine's matching and native Pāli conversion. Topic pages preserve the ATI
index note, numbering/alignment cautions, cross-references, exact canonical reader
commands and source attribution/version. Original ATI entries and further-reading
essays are links only; essays are labelled commentary, not scripture. CC BY 4.0
applies to the index metadata, not automatically to the linked translations.

The teaching-list catalogue shows the engine's historical-status label for every
entry. Details preserve Pāli members, editorial English-gloss cautions, source
groups, defining passages, related lists and VRI terms. A later collective name is
not silently promoted to an early canonical label. For example, the thirty-seven
aids remain seven source groups, with the engine's later-name note and a visible
explanation of the traditional total. The ten perfections retain their later-list
qualification while linking to the actual Buddhavaṃsa source. Read the full Pāli
or an explicitly chosen named translation before quoting; English labels are not
passage translations.

Filters are shareable URL state and appear in browser history; filter queries do
not appear in tab titles or a separate stored search history. Topic titles identify
public source entries. The interface adds no account, personal recommendation,
content cache, source licence or automatic translation retrieval. This works from
bundled index data on the server; it is not an offline browser download.

`web/topics-study.mjs` checks page/selection identity, pagination, supported source
metadata/status labels and emitted canonical reading commands before rendering.
These structural guards do not establish new scholarly mappings or provenance.
Tests cover every actual topic and teaching list, then browser navigation,
keyboard filtering/retry, native input, differing publisher numbers, empty results,
malformed commands and late responses. See [acceptance](evidence/web-reader/TOPICS_STUDY.md).

## Slow-request controls and recovery

A pending request has a keyboard-accessible **Stop waiting** control with a short
reading/study label. The sticky controls remain available while scrolling. Labels
do not include quotations, filter terms, notes or raw API arguments. Controls
and timers disappear when their request finishes, fails or is stopped. Focus
returns to the reading area or the study panel when its active stop button is
removed; completing a different request does not rebuild the remaining controls.

Stopping aborts this browser's fetch and settles the UI wait even if a transport
ignores abort. It does **not** promise to cancel a server job or undo a request
already received. The existing three-minute browser deadline stays finite and
is distinguished from user cancellation. Neither stopping nor a timeout selects
replacement scripture, starts an automatic retry or changes source permissions.
Use the visible retry action or select the study tool again when ready.

New navigation cancels obsolete browser requests. A new study panel cancels old
study waits while keeping the current Pāli reading intact. Existing navigation
and source-validation guards remain active. Stopping a reviewed English source
keeps exact version/scope consent pins for an explicit retry in the current view;
it does not silently switch versions or fetch another source. Navigating away
still invalidates the view and its ephemeral consent.

The implementation is `web/request-lifecycle.mjs` plus the same-origin tool
wrapper. Tests cover normal/failure cleanup, independent requests, deadlines,
immediate stop, superseding navigation, abort-ignoring transports, safe retry,
shared-source consent pins and unchanged Pāli. See [acceptance](evidence/web-reader/REQUEST_RECOVERY.md).
No backend/provider API, source data, network policy or licence is changed.

## Exact reading position

Continue reading now retains a single source-pinned visible passage locator,
rather than only the start of the last page. After scrolling settles for 350 ms,
the first visible source segment or heading is recorded locally. Page hide also
flushes a visible position. Ordinary in-app navigation cancels pending scroll
sampling so the scroll needed to reach a header link does not erase the stable
reading point. Very rapid navigation before the debounce can retain the previous
stable position. This is viewport location, not evidence of reading/comprehension.

The locator stores selection/corpus, offset, reference, source revision and any
bounded-plan identity. It stores no scripture, notes, translation body or English
scope consent. Opening it revalidates the source revision and exact reference;
plan links also revalidate the current assignment/window. A changed source is
refused before wording is displayed. **Review current source at this reference**
explicitly removes the revision pin but keeps the reference and plan constraints;
a missing reference still fails rather than opening nearby text. The pin detects
reported revision changes; it is not a frozen text copy or independent source
integrity certificate. Old unpinned bookmarks/links retain their existing rules.

Passage-reference links carry the exact locator for long-press/copy/share. **Copy
reading link** copies the stable recorded point on the current page (or its first
source segment if no position is retained). Clipboard refusal exposes a real link
beside the button. This does not write a new browser-history entry while scrolling;
opening a locator is ordinary explicit navigation. English panels are not restored
or fetched, and commentary/later-work readers retain their non-canonical mode.

Disable **Remember reading position on this device** in Reading preferences to
remove the pointer and stop automatic position writes; other saved notes and plan
marks remain. There is no position history, account sync or automatic cross-device
transfer; share a locator yourself. Automatic pointer writes refuse to overwrite
browser data changed by another tab. Reload to reconcile that conflict; this is
not transactional multi-tab sync. Storage failure preserves a warned tab-local
resume until that tab closes. Browser storage may otherwise be cleared by the
browser/OS, so a position is not a backup guarantee.

See [baseline and acceptance](evidence/web-reader/READING_POSITION.md). Tests cover
normal/audit/extracted-package flows, source/ref refusal, plan limits, opt-out,
clipboard fallback, pagehide and storage/conflict cases. Physical-device,
screen-reader and native-reader acceptance remains separate.

## Stale-tab saves and recovery

Browser-data saves now compare the currently stored raw snapshot with the one
this tab last loaded or saved. If another tab changed personal data, the stale save is
refused before writing. A validated reading-locator-only change is handled
separately, as described below. After a private-data conflict, the tab remains blocked from later personal writes until reload;
changing a preference, deleting a bookmark or marking a plan day cannot silently
replace the newer profile. Notes, plan marks and source attribution are not
automatically merged or chosen between. This synchronous optimistic check is
best-effort; it is not atomic compare-and-swap, transactional multi-tab storage,
a lock against simultaneous/noncooperating writers, or cross-device sync.

**Keep this tab’s changes** offers local recovery downloads for bookmarks/notes
and plan marks. These include this tab's pending edits, not the newer other-tab
version. Reload has a separate review/cancel step explaining that tab-only
changes will be discarded. Download recovery first, then reload the intact stored
data and compare conflicts manually. Existing bookmark import keeps the stored
note on duplicate keys; a conflicting recovered note may need manual copying.
Exports are not uploaded. Keep these personal files private like your own notes.

Unsaved note drafts survive navigation within the same tab in memory. They are
not silently persisted by reading-position/preference writes. Save note commits
an edit only when storage is current; ordinary and recovery exports include the
latest unsaved drafts. Closing/reloading discards unsaved/unexported drafts. This
is not a durable draft database or an account backup. Removing a bookmark also
removes its in-tab draft. Quota/permission failure keeps recovery available;
a successful retry can clear that warning. Initially unreadable/malformed stored
profiles are never replaced by empty defaults; preserving them does not repair
corrupted data, which may require manual browser-data recovery.

See [baseline and acceptance](evidence/web-reader/STORAGE_RECOVERY.md). Tests use
two actual same-origin tabs with explicitly synthetic private-note fixtures and
actual plan/library tools. They cover newer-note preservation, draft export,
plan/pref/delete refusal, keyboard reload review, denied writes and malformed
existing data. Human/device acceptance and truly simultaneous writes remain
outside these guarantees.

### Reading in another tab

Opening or scrolling a text in another tab no longer blocks an otherwise current
note save or progress-file preview/confirmation. The exception is narrow: only a
validated `last` reading locator may differ. The save preserves the newer locator
when this tab did not change it. Changes to notes, plan marks, preferences or
unknown fields still require recovery/reload rather than automatic merging.

Automatic position recording writes only that locator into the currently stored
profile, preserving newer notes/marks/preferences. It retains this tab’s old
personal-data baseline, so reading cannot make a later stale note edit appear
current. An observed position opt-out in another tab stops recording and clears
the local pointer. There is no general personal-data merge, immediate live sync,
account sync or atomic protection against truly simultaneous writers.
See [reproduction, safety tests and limits](evidence/web-reader/POINTER_RECONCILIATION.md).

## Print a Pāli page or save it as PDF

Open a Pāli passage, then choose **Print loaded Pāli page**. Your browser's print
window lets you choose a printer or Save as PDF where supported. Browser print
(Ctrl+P / Command+P) uses the same source-aware view.

This prints only the Pāli segments currently loaded, with the title, canonical
or non-canonical label, segment range, source warnings, attribution, licence
links and reading URL. It does **not** fetch or print the complete work, English,
study panes, saved bookmarks or private notes. Open the next page separately to
print more. Native-script output follows your chosen script; installed fonts and
the browser determine its PDF/printer rendering. Source non-commercial terms
continue to apply. Review the preview before sharing a PDF. Browser-added headers/footers are
controlled by your print settings; turn them off if they expose a sensitive URL.

Non-reading, loading and failed-reading screens print an explanatory message,
not a previously opened passage. Printed sheets always use black text on white
paper regardless of the reading theme. No files or notes are uploaded by this
feature. Actual physical printers, Safari and tagged-PDF accessibility remain
outside automated acceptance. See [print checks](evidence/web-reader/PRINT_PAGE.md).

## Find a saved passage

**Saved** now displays at most 25 note editors at a time, with Previous/Next
saved-page controls. Search saved titles, references and notes; a search such as
`metta` also matches `mettā`. This searches personal bookmark metadata, not the
full scripture or English translations. A source filter distinguishes canonical
texts, complete root source books, commentary and later works.

Search and filter choices remain in tab memory only, never in the URL, page title
or server requests. Leaving Saved and returning keeps that tab's choices; a
reload resets them. Unsaved note drafts survive filtering and paging, and join
exports even when off the visible page. **Save note** is still required to write
them durably. Clear saved filters restores the full list; exports include all
bookmarks, not just matching ones. Source checks still happen when a reference
is opened. This adds no cloud storage or sync, and keeps the existing cross-tab
conflict protection.

## Reopen a saved source version

New bookmarks retain the source-revision metadata and exact position returned
when you saved them. Opening one now applies the same revision/ref check as an
exact reading-position link **before** displaying passage wording. If the
revision changed, the app offers **Review current source at this reference**.
That is an explicit choice to read the current source, not retrieval of an
archived edition. It keeps the original saved revision and personal note; no
notes are silently rebound or overwritten.

Older bookmarks without a revision remain usable, labelled as unversioned and
opening the current source. Invalid version/position metadata is shown with an
explanation rather than dropping the pin or guessing a version. It remains
exportable and editable as a personal note. Source checks use the revision
metadata supplied by the existing source engine; they do not independently
certify publisher provenance, detect every remapping under an unchanged revision,
or make the bookmark a cryptographic snapshot of scripture.

## Review conflicting notes in a study backup

The combined backup preview shows differing duplicate notes in pages of ten, including current unsaved drafts. Every replacement starts unchecked. Only unique, valid references with identical work, paragraph reference, saved source revision and offset can use incoming note text. Legacy, ambiguous and mismatched references stay read-only. Matching saved metadata is not a fresh verification of the source library; opening a reference still checks its source. Empty incoming text explicitly clears that note. No source pin, title or conflicting plan mark is replaced.

Choices stay in the current preview only. Apply rechecks private data and browser storage before a single guarded write; selected drafts are cleared only after confirmed success. Failed writes retain the previous state, drafts and choices for recovery. This optimistic guard is not atomic multi-tab synchronization. Download your current study backup before replacing notes to keep the old versions; there is no persistent undo history. The file format, size limits and old additive individual import remain unchanged. See [conflict policy and acceptance](evidence/web-reader/BACKUP_NOTE_CONFLICTS.md).
