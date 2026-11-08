# Pāli Library web reader

A standalone, responsive reader is available at the HTTP server's root URL. It does not require an AI account or the ChatGPT widget. This is the first complete reading slice, not feature parity with every tool in an AI client.

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
- Choose a search scope: canonical texts, commentary, or later works. Supplementary searches open the exact selection returned by their existing tools without reinterpreting it as a canonical citation. Search canonical Pāli bodies and Pāli/English titles using the existing search tool. English query expansion is labelled, not presented as full English-translation search.
- Open a citation directly and read the exact source segments with visible references and source terms. Continue long texts and books page by page.
- Choose a linked English translator, with live retrieval and unchanged continuation arguments. Failed retrieval is displayed; no replacement text is generated.
- Read available traditional commentary separately from the root text, including pagination. Direct commentary-book reading and search hits do not claim verified root-text alignment. Later-work and commentary bookmarks retain their corpus and exact reading position.
- Change text size, paper/night theme and the supported Pāli transliteration script. Lao/Lanna still require native-reader validation. Installed device fonts affect glyph availability; selecting a script does not install fonts.
- Save individual passage references and personal notes. Reopen the reading position and export bookmarks/notes as JSON.
- Look up English or Pāli terms in the bundled glossary, including supported native-script input. Every result identifies its DPD or curated-list source; glosses are not passage translations.
- Open **Study words** on a body segment in a canonical text, complete root book or later work. See the bundled DPD analyses, alternative parses, grammar, computed split suggestions and unknown forms. Commentary analysis is not supported by the current backend; the app does not substitute root-text analysis.
- Open **Related texts** for canonical selections. Shared-word matching and commentary citations are labelled separately with their evidence. Reading links retain the emitted source segment or exact commentary reference. External parallels are a link only.
- Copy a reading link, use browser back/forward, and navigate with a keyboard.

## Storage and source boundaries

Personal preferences, the last reading link and up to 500 saved references/notes remain in this browser's local storage. Scripture and English bodies are not downloaded into an offline web library. Data is not synced between devices, and clearing browser storage removes it. JSON export is a backup; import and account sync are not implemented. Storage failures are reported without preventing reading. Source revisions are retained on bookmarks, and a changed revision is flagged on reopening; a bookmark is not a frozen scripture copy.

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

1. Extend the same UI to quotation verification and additional study tools. The glossary, contextual DPD word study, related-text evidence and supplementary catalogues/search/readers are now implemented. Keep canonical status and uncertain mappings visible.
2. Improve accessible translation comparison, exact source links and reading-position management. Test in Safari and Firefox, with screen readers and native-script readers, on physical iOS/Android devices.
3. Add bookmark import with schema validation, device-local reading plans and optional passage highlighting. Personal reflections must never be labelled scripture.
4. Design explicitly user-requested, versioned offline packs only after source-specific rights/storage review. Don't silently cache live translations or claim whole-corpus English coverage.
5. Audio, cross-device accounts/sync, reminders, community features and native app-store distribution require separate rights, privacy, security and operating-cost decisions. No synthesized sacred narration is provided by this slice.

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
