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

- Browse the canonical collections and all complete root source books, including front matter.
- Search canonical Pāli bodies and Pāli/English titles using the existing search tool. English query expansion is labelled, not presented as full English-translation search.
- Open a citation directly and read the exact source segments with visible references and source terms. Continue long texts and books page by page.
- Choose a linked English translator, with live retrieval and unchanged continuation arguments. Failed retrieval is displayed; no replacement text is generated.
- Read available traditional commentary separately from the root text, including pagination.
- Change text size, paper/night theme and the supported Pāli transliteration script. Lao/Lanna still require native-reader validation. Installed device fonts affect glyph availability; selecting a script does not install fonts.
- Save individual passage references and personal notes. Reopen the reading position and export bookmarks/notes as JSON.
- Copy a reading link, use browser back/forward, and navigate with a keyboard.

## Storage and source boundaries

Personal preferences, the last reading link and up to 500 saved references/notes remain in this browser's local storage. Scripture and English bodies are not downloaded into an offline web library. Data is not synced between devices, and clearing browser storage removes it. JSON export is a backup; import and account sync are not implemented. Storage failures are reported without preventing reading. Source revisions are retained on bookmarks, and a changed revision is flagged on reopening; a bookmark is not a frozen scripture copy.

Canonical Pāli works **without upstream source access on the server**. That is different from the web app working without access to its server: this version has no service worker/offline browser mode. English needs an available approved live provider. All source terms and alignment/abbreviation cautions continue to apply. No SuttaCentral source is imported or fetched.

There are no app accounts or server-side personal notes. The HTTP service retains its existing transient IP rate limiter and aggregate counters. Hosts/reverse proxies may retain their own infrastructure logs. See [privacy](../PRIVACY.md).

## API and integration

The UI calls the existing schema-validated MCP tools over same-origin `/mcp` using JSON-RPC with JSON response negotiation. It has no alternate content database or arbitrary URL proxy. Tool errors, HTTP errors and finite request deadlines remain explicit. Navigation and study requests have separate generation guards: a late result cannot replace a newly selected text or study panel. Retrieved strings are inserted using DOM text nodes, never HTML.

`src/web-reader.mjs` serves only four fixed routes. The build copies `web/` into `server/web/` for portable npm/container installation. The Docker build includes the source assets. Changes to `web/` must rebuild and commit `server/web/` and `server/http.cjs`.

## Design research and priorities

The useful patterns from established scripture readers are calm typography, visible context, multiple translations, bookmarks, notes and comfortable reading preferences. We used these as functional guidance, not as evidence of a conversion or learning improvement:

- [Quran.com product notes](https://quran.com/product-updates): bookmarks, verse context, study mode, translation reading and personal notes. Those are distinct features rather than justification for adding a social network to this library.
- [dhammatalks.org Sutta collection](https://www.dhammatalks.org/suttas/): explicit collection introductions, translator attribution and the advantages of properly licensed eBook formats for offline reading. This does not grant new redistribution rights.

Next priorities, in order:

1. Extend the same UI to post-canonical and direct commentary catalogues/search, dictionary, parallels and quotation verification. Keep canonical status and uncertain mappings visible.
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
```

The browser runner requires Python Playwright and Chromium (set `PALI_BROWSER` to the installed executable if needed). It starts/stops its own local built server. Real Pāli and commentary are tested against the bundled corpus; upstream translation outages and late-response tests are explicitly synthetic. Browser screenshots are written to `/tmp/pali-web-reader/`. No live-source translation availability or human accessibility certification is implied by these checks.
