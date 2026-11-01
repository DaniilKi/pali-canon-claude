# Pāli Canon provider research

Verified 2026-10-31 by small public HTTP reads. No text corpus is bundled and no account or API key is required.

## SuttaCentral: primary live provider

Official API overview: https://suttacentral.net/api/docs/index.html ; specification https://suttacentral.net/api/spec . Some working routes are absent from the older Swagger specification, so source code and live reads are also needed.

- Search: `GET https://suttacentral.net/api/search/instant?query=metta&language=en&limit=2&offset=0&selectedLanguages=%5B%22en%22%2C%22pli%22%5D`. Returns `{total,hits,suttaplex,fuzzy_dictionary}`. `hits` include content results and dictionary additions; title matches arrive separately in `suttaplex`. Preserve those separately so repeated metadata does not crowd out paginated content. Upstream totals are not counts of unique suttas. `/api/search` is 404.
- Editions: `GET /api/suttaplex/mn1`. Returns an array with metadata, translator IDs, languages, segmented flags and root editions. Request the actual author ID; do not substitute an author if unavailable.
- Text metadata/legacy content: `GET /api/suttas/mn1/sujato?lang=en`. Provides `translation`, `root_text`, `segmented`, `suttaplex`, `bilara_root_text`, `bilara_translated_text`. Segmented objects contain edition metadata, not segment maps. A legacy edition such as `/mn1/horner?lang=en` has HTML in `translation.text`.
- Aligned text: `GET /api/bilarasuttas/mn1/sujato?lang=en`. Returns `root_text`, `translation_text`, `comment_text`, `variant_text`, `reference_text`, `html_text`, `keys_order`. Segment IDs such as `mn1:1.1` are stable references; display anchors use `https://suttacentral.net/mn1/en/sujato#1.1`. `keys_order` controls ordering. Root-only Pāli works with author `ms`, language `pli`.
- Relationships: `GET /api/parallels/mn1`. Dictionary keyed by source text/anchor; entries contain `to`, relationship `type`, `remark`, `resembling`. Full, partial and resembling relationships must remain distinct.
- Browse: `GET /api/menu/sutta`, `/api/menu/long`, `/api/menu/dn`, `/api/menu/pli-tv-ab`. Each returns a node and its immediate children. `pli-tv-ab` gives the seven Theravāda Abhidhamma books. `/api/menu/pli` returns an empty placeholder, not a Pāli canon root. `/api/menu` is a broad 168 KB list, avoid as a default response.
- Avoid `/api/dictionaries/lookup?from=pli&to=en&word=metta`: the word parameter is ignored and the route returns the entire approximately 32 MB dictionary.

Implementation sources: https://github.com/suttacentral/suttacentral/tree/main/server/src/search and https://github.com/suttacentral/bilara-data/tree/published . Use the published branch rather than unfinished translations. Bilara's dedicated license states CC0 for translations: https://github.com/suttacentral/bilara-data/blob/published/LICENSE.md . Do not apply that statement to all legacy translations; https://suttacentral.net/licensing is the general policy page. Available translation coverage differs across Sutta, Vinaya and Abhidhamma. This integration is corpus access, not a promise that every passage has an English translation.

## Digital Pāḷi Dictionary: live lookup

Verified `GET https://www.dpdict.net/search_json?q=metta` returns `{summary_html,dpd_html,license}`. The fragments contain definitions, grammar, roots and examples; they are HTML, not typed headword records. Strip presentation markup for model use, retain the author attribution and complete license object, link to `https://www.dpdict.net/?q=metta`. Full entries can exceed 100 KB; provide a disclosed excerpt and source link.

Official endpoints and licensing: https://docs.dpdict.net/technical/api_endpoints/ . Data is CC BY-NC-SA 4.0: noncommercial use, attribution, derivatives shared alike. The live service may return HTTP 503 when busy; surface the error and retry later. Do not infer that separately licensed audio or translation-search material shares this dictionary license.

## Access to Insight: selective archive and study guides

Verified title/reference index `https://www.accesstoinsight.org/index-sutta.html` and subject index `/index-subject.html`. Index entries provide links to canonical translations and study articles. A useful search can match normalized words within title/reference entries or a subject heading plus its entry. This must be described as index search, not full-text archive search.

Verified `https://www.accesstoinsight.org/tipitaka/mn/mn.001.than.html`. Extract the marked copyrighted-text region, preserve `F_provenance` (copyright/license) and `F_citation` (translator/edition/citation) from the footer. For this particular page the license is CC BY-NC 4.0 and the translator is Thanissaro Bhikkhu. Other pages use different free-distribution terms; never stamp a single archive-wide license on every document.

Primary policy and coverage: https://www.accesstoinsight.org/faq.html . Officially selective; not every sutta, author or article is represented. An existing reusable archive is https://github.com/alexgenaud/AccessToInsight ; its README explains retaining per-page copyright, license restatement and attribution when reformatting. Runtime retrieval avoids shipping a copied archive. Text offsets are extracted characters, not canonical verse references. Preserve any source anchor in the citation URL.

## Dhammatalks and existing Buddhist tools

`https://www.dhammatalks.org/suttas/MN/MN1.html` works and supplies a modern Thanissaro translation with notes and related references. No structured public API was established in this bounded research. The implemented release lists it as a supplementary reading destination, not an operational retrieval provider. See https://www.dhammatalks.org/suttas/ and per-publication free-distribution terms.

Existing Buddhist MCP: https://github.com/nbkhoi/sutta-mcp already wraps SuttaCentral search, segmented text, metadata, parallels and browsing. Its license is PolyForm Noncommercial 1.0.0, so do not copy its implementation into an MIT project. This release independently uses public provider endpoints and adds Claude plugin packaging, study workflows, dictionary and ATI retrieval. Do not claim the first Buddhist MCP server.

## Minimal delivery architecture and verification

Use one Node MCP server with read-only tools and three fixed-host live provider adapters. No custom vector database, embeddings, authentication, scraping job or large offline corpus is needed. Bundle the server for installability, add Claude plugin skills for cited study/translation comparison/quote verification, and provide ordinary MCP configuration for Desktop and other clients.

Focused live checks succeeded: search; metadata; English/Pāli aligned text; Horner legacy paragraphs; parallels; Abhidhamma browsing; DPD lookup; ATI subject search and text with per-page notices. Additional checks passed exact segment selection, missing/legacy segment rejection, and parallels pagination. Providers bound request size to 6 MB and time to 25 seconds, validate fixed public hosts across redirects, and return pagination/shortening notices.
