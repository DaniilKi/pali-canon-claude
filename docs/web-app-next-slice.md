# Standalone web reader: architecture assessment and next slice

The project has a substantial scripture engine and an embedded reader. It does
**not yet have a standalone browser reading app**. The next useful release is
**browse → select → read → continue**, using that engine rather than rebuilding
or copying it. Build and test locally first; this plan does not authorize a
main merge or deployment in the current batch.

## What exists

| Component | Existing value | Boundary |
|---|---|---|
| `site/`, `scripts/build-site.mjs`, Pages workflow | Responsive documentation, dark styling, citation export | Documentation shell, no passage/browse application |
| `src/http-server.mjs`, worker | Stateless `/mcp`, health, read-only tools, admission control and cache | Root is not an app; no fixed browser-asset routes |
| `src/chatgpt-widget.mjs` | `readPassage`, multiple source kinds, script conversion, exact/context selection, independent Pāli/English continuation and source pins | `WIDGET_HTML` depends on ChatGPT/MCP Apps host bridges |
| `src/canon.mjs` and tool modules | Canon/source-book reading; names/citations, search, commentary, postcanonical texts, glossary/dictionary, parallels, verification, daily reading/plans | Capabilities exist as tools, not a finished browser experience |
| `scripts/export-index.mjs` | Complete metadata catalogue including grouped/approximate records | No scripture bodies; should not be mistaken for a translation catalogue |
| Widget/browser tests | Keyboard/focus/live status, stale/cancelled/error handling, two bridges, Chromium phone/desktop and zoom checks | Not standalone Safari/Android/screen-reader acceptance |

The engine's 8,544 citable records and source books, English link coverage,
commentary and postcanonical collections are different scopes. English remains
partial. DPPN biographies are unbundled pending rights; native-script review is
not complete. A web app must preserve those distinctions rather than advertise
that every feature or every text is fully translated or reviewed.

## Recommended implementation boundary

Create a small, separately bundled `/reader/` shell (`web/reader` assets and a
build entry) served through fixed routes in `src/http-server.mjs`. Use the
installed MCP SDK and existing esbuild tooling for a **fixed same-origin**
adapter. Reuse the existing worker, tools, admission/cache and reading contracts.
Do not add a second canon/database, arbitrary fetch proxy, external CDN or user
account requirement for public reading.

Use `browse_canon`, `resolve_reference`, metadata and `read_passage_widget` /
shared `readPassage` service where appropriate. Extract a transport-independent
presenter only where it helps preserve the widget's tested behavior. Keep host
bridge adapters and widget versioning separate; embedding its HTML unchanged
will not make a normal browser reader work. Bundle assets inside `server/` so
normal package/container paths include them.

Ordinary `canon.browse` deliberately omits approximate records. For complete
catalogue access, expose the full exported metadata or explicit source-book
navigation, with scope labels. Do not silently hide uncertain/grouped entries
while claiming all-record browsing. Load catalogue metadata lazily; do not ship
or decompress the entire dictionary/canon into every phone for the first slice.

## First usable interface

1. **Browse:** collections/sections and a clear source-book alternative. Include
   grouped/approximate labels and catalogue scope. Search by citation/title;
   show explicit choices for ambiguous results instead of guessing.
2. **Read:** a quiet passage view with source edition, canonical reference,
   publisher/version and licence always available. Preserve `canonical: false`,
   source-book and commentary labels. Exact segment links must open the cited
   selection with context disclosed, not a convenient nearby paragraph.
3. **English:** use exact translation IDs and publisher references. Distinguish
   inherited chapter sources, partial spans, shared pages and unavailable
   English. The first slice may expose scoped metadata/publisher links while
   leaving retrieval disabled; a later page-level pane must explicitly accept
   scope and never imply sentence-by-sentence Pāli/English alignment.
4. **Continue:** independent Pāli/English controls follow returned commands and
   pins, never UI-invented offsets. Deep links/back/forward preserve source
   commit, selection, script and exact version. Discard stale responses after
   navigation/cancel; busy/error/retry states must not restore an older passage.
5. **Preferences:** readable text size, theme and supported script selection.
   Phone Pāli/English/Both modes and desktop columns should preserve the same
   semantics. Use `textContent`, semantic landmarks, labels and live status.
   Local preferences/reading position can follow without accounts or a new DB.

The pilot AN 1.49–52 is a useful acceptance case: one shared compilation, four
subjects, no whole-unit translation count and explicit page-level consent. The
current ordinary widget has no `allow_shared` / `allow_partial` controls, so
browser work must not accidentally bypass its refusal.

## Acceptance before calling the slice ready

Test MN 10 continuation; no-English Vinaya; Dhp inherited chapter; ambiguous AN
numbering; grouped/approximate records; source-book front matter; canonical vs
postcanonical selections; and shared-only AN 1.49–52 metadata. Cover publisher
errors, busy/cancel/retry, stale replies, browser history and pinned deep links.

Reuse existing protocol/state tests and `scripts/widget-browser-check.py`
patterns. Add standalone browser checks at **320 / 768 / 1280 px**, **200% and
400% zoom**, keyboard-only navigation, focus recovery and overflow. Separately
record actual iOS/Android and screen-reader acceptance; do not claim those from
Chromium viewport simulation. Native scripts retain independent reader review.

## Later product slices, without rebuilding the engine

After the first reader is useful: full-text/glossary/dictionary UI; persistent
local bookmarks/highlights; commentary/parallels and source-aware quotation
checking; daily reading/plans and memorisation; then deliberate offline packages,
audio/chanting links and optional cross-device sync. Each needs its own rights,
accessibility and behavior evidence. The current project supplies many tool
capabilities, but none implies those browser features, accounts, complete audio,
all-English coverage or a deployed public endpoint already exist.
