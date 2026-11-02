# How it works

A plain explanation of what happens inside the tool, how the data was built, and how we check it. No programming knowledge is needed for the first two sections.

## The pieces

```text
 You ──ask──▶ Claude ──calls a tool──▶ Pali Canon server (on your computer)
                                         │
                                         ├─ bundled Pāli canon (offline)
                                         │    text · citations · PTS pages · search
                                         │
                                         └─ live sources (online, with mirrors)
                                              dhammatalks.org · Access to Insight · Digital Pāḷi Dictionary
```

- **The server** is a small program that Claude talks to through the Model Context Protocol (MCP), the standard way AI apps connect to tools. It offers 31 tools, such as "resolve a citation", "get the text" and "compare translations" (listed in [development.md](development.md#tools)).
- **Skills and prompts** are written instructions that teach Claude good study habits: quote only retrieved text, cite precisely, keep translation and interpretation apart. Claude Code gets five skills (`study`, `compare`, `pali-word`, `method`, `memorise`); Claude Desktop gets equivalent prompts.
- **The bundled canon** is one compressed file (5.6 MB) holding the whole Pāli text and an index of every citation.
- **Live sources** are fetched only when you ask for an English translation, a dictionary entry or an Access to Insight page.

Nothing is sent anywhere except those public websites, and nothing you ask is stored.

## Why the data needed building

The Pāli text comes from VRI, which organises it by book and paragraph. People, though, cite it by **standard numbers** such as MN 10 or SN 56.11, and scholars by **PTS volume and page**. Neither of these is written in the VRI files in a form a computer can simply look up. In SN and AN especially, one VRI paragraph may hold several suttas, or one sutta may span many paragraphs. The project's main work was building an exact map from every citation to its place in the VRI text.

## How the map was built

This is done once, by the scripts in [`scripts/canon/`](../scripts/canon/README.md), and the result is shipped.

1. **Read the VRI books.** Each of the 61 files is split into headings, numbered paragraphs, verses, variant readings, and page markers for the PTS, Thai, Myanmar and VRI editions.
2. **Find each text by its opening words.** For each standard citation, the build takes the opening words from the public-domain Mahāsaṅgīti Pāli (which uses the standard numbering) and searches for them in the VRI text, within the right chapter. It prefers the rarest phrase, so stock openings ("Thus have I heard…") do not mislead it.
3. **Keep the order.** Texts must appear in citation order. Matches that would break the order are discarded (a "longest increasing subsequence"), so one bad match cannot drag its neighbours with it.
4. **Fill the gaps.** Where wording differs between editions, a text is placed by its verse number or by the numbered headings between its neighbours.
5. **Draw the boundaries.** Each text starts on a numbered boundary and ends where the next begins, so no two texts overlap. Texts the edition prints only in abbreviation are marked approximate, and texts printed as one block are recorded as groups.
6. **Attach PTS pages.** The PTS page where each text starts and ends is read from VRI's own page markers.
7. **Link translations conservatively.** A translation page is linked only when:
   - its number and title match;
   - its PTS start page identifies exactly one text;
   - it is a whole chapter; or
   - its English title is confirmed against another strongly matched page.

   In SN and AN, where numbering differs, the number alone is never trusted, and ordinals ("(1)", "(2)") must agree with the Pāli (*paṭhama*, *dutiya*). If in doubt, we do not link.

## How it is checked

| Check | What it proves | Result |
|---|---|---|
| **Full audit** (`scripts/audit.mjs`), all 8,544 texts | Each text resolves by its ID and its printed citation; renders non-empty text; grouped members resolve; its PTS page leads back to it; no two texts overlap; every translation link is well-formed | 0 failures |
| **Independent edition check** (`scripts/canon/validate.py`) | Our mapping agrees with Access to Insight's own PTS citations on all 1,190 of its canonical pages (MN 102/102, DN 17/17, all SN and AN pages); numbering-scheme differences are recognised as such | 0 problems |
| **Translation content check** | Bridged links were compared with Ṭhānissaro's Access to Insight versions of the same text | overlap 0.69–0.98, no mismatches |
| **Unit tests** (`tests/core.test.mjs`) | Citation parsing edge cases and every bug found in review stay fixed | pass |
| **Protocol test** (`scripts/smoke.mjs`) | The server works as an MCP server; with `--live`, every live source answers | pass |
| **Outage drill** (`scripts/outage.mjs`) | With each site switched off in turn, the mirrors take over; with all off, the Pāli still works | pass |
| **Independent review** | A separate reviewer spot-checked about 110 citations and every PTS lookup in its sample; its findings became tests | fixed |

These run before every release, and the build, tests and audit also run on every change in GitHub Actions.

## Safety and privacy by design

- The server only reads. It cannot write files, run commands or change accounts.
- It contacts a **fixed list of hosts**: dhammatalks.org, Access to Insight, the Digital Pāḷi Dictionary, the translation pages of Ancient Buddhist Texts, and the official mirrors. Redirects are re-checked against the list, so it cannot be used to reach other sites.
- Responses are size-limited, retried with backoff, and labelled with where they came from (including when a mirror was used).
- Retrieved text is treated as data, never as instructions to Claude.

## Where to look in the code

| Part | File |
|---|---|
| Tools, prompts and resources Claude sees | [`src/server.mjs`](../src/server.mjs) |
| Reading citations ("MN 10", "M i 55", links) | [`src/citations.mjs`](../src/citations.mjs) |
| The bundled canon: lookup, text, search, browse | [`src/canon.mjs`](../src/canon.mjs) |
| English translations and fallbacks | [`src/english.mjs`](../src/english.mjs) |
| Dictionary, Access to Insight, source list | [`src/providers.mjs`](../src/providers.mjs) |
| Network: allowlist, retries, mirrors | [`src/http.mjs`](../src/http.mjs) |
| Building the data | [`scripts/canon/`](../scripts/canon/README.md) |
