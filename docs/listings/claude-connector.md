# Claude Connectors Directory submission packet

Everything a maintainer needs to list the **hosted** Pali Canon server in Claude's Connectors Directory, the catalog people browse in Claude on the web, desktop and phone. Nothing here has been submitted yet. Submitting is a human step: it needs a signed-in claude.ai account on a paid plan, and the maintainer accepts Anthropic's directory terms. Tracked in [issue #7](https://github.com/DaniilKi/pali-canon-claude/issues/7).

A **connector** is an MCP server that Claude reaches over the internet. People add it with one click and nothing is installed on their computer. Shared wording (names, keywords, descriptions) is in [README.md](README.md#shared-facts-use-the-same-words-everywhere) in this folder.

Checked against Anthropic's documentation on 1 November 2026:

- [Submit a connector to the directory](https://claude.com/docs/connectors/building/submission)
- [Connector pre-submission checklist (review criteria)](https://claude.com/docs/connectors/building/review-criteria)
- [Anthropic Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) and [Terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms)

## What can be submitted, and where

| What | Route | Status |
|---|---|---|
| **Hosted server** (Streamable HTTP at `<address>/mcp`) | Developer portal [claude.ai/directory/manage](https://claude.ai/directory/manage) → **Submit new** → **MCP connector**. The portal only takes an `https://` address. | **Waits for [#5](https://github.com/DaniilKi/pali-canon-claude/issues/5)** (the hosted endpoint is built but not deployed). |
| **Desktop extension** (`.mcpb`) | No longer possible on its own: the docs say desktop extension listings are deprecated and the directory "no longer accepts local servers packaged as MCP Bundles". A local server reaches the directory only inside a **plugin**. | Use the plugin route in [claude-code-marketplace.md](claude-code-marketplace.md) (blocked by the 5 MiB file limit; see that packet). |
| **Skills** | Not a separate submission type; they travel inside the plugin. | See [skills.md](skills.md). |

The docs also say that when a plugin points at a server, the server should be submitted as a connector as well, so both listings can be paired. Do the connector once the hosted address is live, and the plugin when its blocker is fixed.

## Before submitting: open items

| # | Item | Severity | What to do |
|---|---|---|---|
| 1 | **Hosted endpoint not live.** | **Blocker** | Deploy (#5), add it in Claude → Settings → Connectors → Add custom connector, and call every tool from a conversation. Also run every tool through the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector). The portal's *Test & launch* step asks you to confirm both. |
| 2 | **Tools have no `title`.** The directory requires "a `title` and the applicable `readOnlyHint` or `destructiveHint`" on every tool, and the portal flags tools without them. Our tools set the hints but not titles. | **Blocker** until done | Give every tool the `title` from the [review table](#tool-annotations-review) in `src/server.mjs` (a maintainer change, because that file is shared by every feature; a ready-made snippet is in the description of [PR #82](https://github.com/DaniilKi/pali-canon-claude/pull/82)). **Done when** `tools/list` (or the MCP Inspector) shows a title on every tool. From then on `tests/connector-listing.test.mjs` fails if a live title differs from this table. |
| 3 | **Third-party content.** The [Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy) says (read 1 November 2026): "Developers must verify that they own or control any API endpoint, domain, or user interface their Software connects to, as well as any external resources it retrieves or renders." The review criteria add: "Your server must call your own first-party APIs, or APIs you legitimately proxy." The translations and dictionary entries this server retrieves and renders are exactly such external resources. The Pāli text is bundled (our own copy of the VRI edition), but English translations and dictionary entries are fetched live from dhammatalks.org, Access to Insight (and its GitHub/jsDelivr mirrors) and the Digital Pāḷi Dictionary, which we do not control. The portal's *Data handling* step does offer "a third party's API you don't control" as an answer. | **Risk: maintainer decision** | Answer that step truthfully (see [Data handling](#7-data-handling)). If a reviewer objects, the answers are the permission letters in [docs/outreach/](../outreach/README.md) or listing an offline-only variant. Do not hide the live fetches. |
| 4 | **Domain should match the service.** The review criteria say "the MCP server domain should match your service". A `*.fly.dev` or `*.onrender.com` address is weak evidence of that. | Recommended | Prefer a project domain if one is ever registered; otherwise make sure the documentation URL (the GitHub repository) names the exact hosted address so it can be checked. |
| 5 | **Origin header.** The hosted server answers every origin (`Access-Control-Allow-Origin: *`). The MCP transport specification asks Streamable HTTP servers to validate the `Origin` header against DNS-rebinding attacks. The risk is low for a public, read-only, no-sign-in server, but reviewers check server security. | Check before submitting | Decide whether to reject browser requests from unexpected origins in `src/http-server.mjs`; record the decision in `docs/decisions.md`. |
| 6 | **Privacy policy completeness.** "Missing or incomplete privacy policies result in immediate rejection." The policy must cover collection, use and storage, third-party sharing, retention and contact. [PRIVACY.md](../../PRIVACY.md) covers all of these. Its hosted section says what is kept (aggregate counts) but not how long, and it does not mention that the server holds each visitor's IP address in memory for one minute for the rate limit, as [docs/hosting.md](../hosting.md) says. | Recommended | **Done when** the hosted section of PRIVACY.md states both points: each visitor's internet address is held in memory for one minute to enforce the rate limit and then forgotten, and the counts live only in memory and reset when the server restarts; nothing is written to disk. Suggested wording is in the description of [PR #82](https://github.com/DaniilKi/pali-canon-claude/pull/82). |

Already satisfied, with evidence in the repository:

- **Read-only.** Every tool has `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint` set to whether it uses the network (`tests/connector-listing.test.mjs`).
- **Tool names** are all under 64 characters, and no catch-all request tool exists (no tool takes an HTTP method or an arbitrary host; network access is limited to the `ALLOWED` list in `src/http.mjs`).
- **Descriptions** say what each tool does without telling Claude how to behave, calling other software, or pulling instructions from elsewhere. The server instructions tell Claude to treat source content as data, never instructions.
- **Errors** are specific and actionable (for example a missing translation lists what is available, and an unknown citation suggests `browse_canon`), never a bare "Bad Request".
- **Response size.** `get_text` is paginated (`offset`, `limit`), search results are limited, and variant readings and translations are opt-in.
- **No conversation data.** The server receives only the arguments of each call and does not log them (see [docs/hosting.md](../hosting.md)).
- **Authentication:** none. All content is public, so there is no OAuth and no account to create. Note the conflict: the review criteria list "Test credentials" as required (for "a fully populated account"). That requirement assumes a server with sign-in; this one has none. In the portal, enter **"Not applicable: no authentication. The server is public and read-only; every tool works without credentials."** and point to the test steps in [section 8](#8-test--launch).
- **Transport:** Streamable HTTP, stateless, at `/mcp`.
- **Not an unsupported use case**: no payments, no AI media generation, no advertising.

## Portal answers (copy into the form)

Field limits are from the submission docs: name up to 100 characters, one-liner up to 200, description up to 2,000, one to five categories. The URL slug is permanent once published.

### 1. Connection

| Field | Value |
|---|---|
| Server URL | `<hosted address>/mcp`, for example `https://pali-canon-mcp.fly.dev/mcp` once #5 deploys it. Fill in the real address; do not guess. |
| Users connect to different URLs | No (one shared address) |

### 2. Tools

Synced from the server. Expect one tool per row of the [review table](#tool-annotations-review) (the test keeps the two in step), all under **read-only**, plus the server's prompts and resources. If any tool is flagged, fix it on the server first (item 2 above).

### 3. Listing

| Field | Value |
|---|---|
| Server name | `Pali Canon` |
| URL slug | `pali-canon` |
| Categories | Pick from the portal's list, at most five. Closest fits, in order: Education, Research, Reference, Religion and spirituality (if offered). |
| Documentation URL | https://github.com/DaniilKi/pali-canon-claude#readme (hosted setup: https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/hosting.md) |
| Privacy policy URL | https://github.com/DaniilKi/pali-canon-claude/blob/main/PRIVACY.md (the same address as `privacy_policies` in `manifest.json`) |
| Support contact | https://github.com/DaniilKi/pali-canon-claude/issues (security reports: https://github.com/DaniilKi/pali-canon-claude/security, see [SECURITY.md](../../SECURITY.md)). If the portal insists on an email, the maintainer chooses one; do not invent it here. |
| Icon | [`assets/icon.png`](../../assets/icon.png), 512 × 512 PNG made from [`assets/icon.svg`](../../assets/icon.svg) by `python scripts/render-icon.py` |

#### One-liner (≤ 200 characters)

> The complete Pāli Canon (Theravāda Buddhist scripture) for Claude: read the real text, resolve any sutta or PTS citation, search the whole Tipiṭaka, and compare English translations.

#### Description (≤ 2,000 characters)

> Pali Canon gives Claude the complete Pāli Tipiṭaka, the scripture of Theravāda Buddhism, so it quotes and cites the real text instead of paraphrasing from memory.
>
> It holds the whole VRI Chaṭṭha Saṅgāyana edition: 8,544 citable texts, about 2.8 million words. It understands the citations people actually use, such as MN 10, SN 56:11, AN 3.65, Dhp 183 and Snp 1.8, PTS page references such as M i 55, and links to SuttaCentral, Access to Insight and dhammatalks.org. It returns the Pāli with VRI paragraph numbers and PTS page breaks, and searches the full text with or without diacritics.
>
> English translations by Ṭhānissaro Bhikkhu (dhammatalks.org) and from Access to Insight are fetched live from those sites, with backup mirrors, and always come with the translator's name and licence. Two to four translations can be compared side by side. Word lookups use the Digital Pāḷi Dictionary. Where editions number a text differently, the difference is reported, not hidden; a missing translation is never silently replaced by another.
>
> It is a library, not a teacher: it retrieves and cites, and leaves interpretation to you. Read-only, no sign-in, no tracking. The texts keep their own non-commercial licences. Open source (MIT) at github.com/DaniilKi/pali-canon-claude.

### 4. Use cases

| Field | Value |
|---|---|
| Primary use cases | Reading a sutta in Pāli with an English translation; checking or resolving a citation or PTS page; finding passages on a topic or Pāli term; comparing translations; looking up Pāli words. |
| What users need before connecting | Nothing: no account, plan or setup. |
| Reads, writes or both | **Reads data only.** |

#### Example prompts (the policy asks for at least three)

Every citation below is checked against the bundled canon by `tests/connector-listing.test.mjs`.

1. "Show me the Pāli of MN 10 with an English translation." (resolve, `get_text` with `translation: "default"`)
2. "Which text starts on PTS page S v 420, and what is it about?" (PTS lookup: SN 56:11)
3. "Compare the English translations of Dhp 183." (`compare_translations`)
4. "Find passages where *mettā* and *karuṇā* appear together." (`search_texts`)
5. "What does the Pāli word *sati* mean, grammatically?" (`lookup_pali`; a dictionary gloss, labelled as such)
6. "AN 3.65 is the Kālāma Sutta in some books and AN 3.66 in others. Which is right here?" (numbering notes)
7. "I have a reference to M i 55. Which sutta is that, and where does Snp 1.8 begin?" (PTS page and verse collections)

### 5. Company

| Field | Value |
|---|---|
| Company name | Maintainer's choice (an individual open-source project; do not invent a company) |
| Website | https://github.com/DaniilKi/pali-canon-claude |
| Primary contact | Maintainer's own contact for review updates (entered by the maintainer) |

### 6. Authentication

| Field | Value |
|---|---|
| Authentication requirement | **None** (the server never asks users to sign in) |
| Authentication methods | Not applicable |
| Test credentials (if asked) | "Not applicable: no authentication." The review criteria call test credentials required, but they exist only for servers with sign-in; this server has none (see the note under *Already satisfied*). |

### 7. Data handling

| Question | Answer |
|---|---|
| Whose API is it? | Mixed, answered plainly: the Pāli text and all citation data are served from the server's own bundled copy of the VRI edition. English translations and dictionary entries are fetched live from public websites the project does not control (dhammatalks.org, accesstoinsight.org and its official GitHub/jsDelivr mirrors, dpdict.net), always with attribution and licence. If only one choice is allowed, choose **a third party's API you don't control** and explain in the notes. |
| Personal health data | No |
| Sponsored content | No |

### 8. Test & launch

> No account or sign-in is needed, so there are no test credentials (if the form insists, enter "Not applicable: no authentication"). Add `<hosted address>/mcp` as a custom connector (or open it in the MCP Inspector with the Streamable HTTP transport) and try: `resolve_reference` with "S v 420"; `get_text` with "MN 10" and translation "default"; `compare_translations` with "Dhp 183"; `search_texts` with "mettā karuṇā"; `lookup_pali` with "sati"; `browse_canon` with "sn56"; `list_sources`. `GET <hosted address>/healthz` reports status. Live tools depend on the source sites; they fall back to mirrors and say so.

Then tick the confirmation that every tool was run (MCP Inspector or custom connector).

### 9. Compliance

Seven acknowledgments (directory guidelines, first-party API usage, financial transactions, AI media generation, prompt injection, conversation data collection, public documentation). The maintainer reads and accepts them personally. Note for "first-party API usage": see item 3 above.

### 10. Review and submit

Read any quality warnings the portal shows; they go to the reviewers with the submission.

## Tool annotations review

What every tool declares, and the proposed `title`. "Open-world" (`openWorldHint`) is `yes` exactly for tools that may contact a website; all others work entirely from the bundled data. All tools are also `idempotentHint: true`. The test compares this table with the live server.

| Tool | Proposed title | Read-only | Destructive | Open-world | Why |
|---|---|---|---|---|---|
| `resolve_reference` | Resolve citation | yes | no | no | Parses a citation and looks it up in the bundled canon. |
| `get_metadata` | Text details | yes | no | no | Bundled metadata and stored translation links; nothing is fetched. |
| `get_text` | Read Pāli text | yes | no | yes | The Pāli is offline, but the optional `translation` argument fetches English live. |
| `get_translation` | Read English translation | yes | no | yes | Fetches dhammatalks.org or Access to Insight (with mirrors). |
| `compare_translations` | Compare translations | yes | no | yes | Fetches two to four translations live. |
| `search_texts` | Search the Tipiṭaka | yes | no | no | Searches the bundled text and stored titles only. |
| `browse_canon` | Browse the canon | yes | no | no | Bundled table of contents. |
| `lookup_pali` | Pāli dictionary lookup | yes | no | yes | Queries the Digital Pāḷi Dictionary. |
| `search_access_to_insight` | Search Access to Insight | yes | no | yes | Reads Access to Insight's indexes (or its GitHub mirror). |
| `get_access_to_insight_text` | Read Access to Insight page | yes | no | yes | Fetches one Access to Insight page by path. |
| `list_sources` | List sources and licences | yes | no | no | Static list. |
| `abhidhamma_matika` | Abhidhamma mātikā | yes | no | no | Bundled VRI Dhammasaṅgaṇī mātikā (triads and dyads). |
| `patthana_condition` | Paṭṭhāna condition | yes | no | no | The 24 conditions and their definitions from the bundled VRI Paṭṭhāna. |
| `uposatha` | Uposatha days | yes | no | no | Computes observance days offline from the stated lunar rule. |
| `festivals` | Festival dates | yes | no | no | Computes festival dates offline and lists the associated canonical texts. |
| `daily_text` | Text of the day | yes | no | no | Fixed rotation through the bundled canon; English is links only. |
| `reading_plan` | Reading plans | yes | no | no | Bundled reading plans; each day gives citations and links. |
| `lookup_name` | Proper name lookup | yes | no | no | Bundled Dictionary of Pāli Proper Names entries (when bundled), links to the online editions and canon occurrences; nothing is fetched. |
| `find_citations` | Find citations in text | yes | no | no | Parses citations in the given text and checks them against the bundled canon. |
| `paritta` | Paritta chants | yes | no | no | Bundled VRI Pāli of commonly recited texts; English is links only. |
| `find_talks` | Find Dhamma talks | yes | no | yes | Queries dhammatalks.org search; returns links only, never talk text. |
| `topic` | Texts on a topic | yes | no | no | Bundled Access to Insight subject and numerical index entries. |
| `list_topics` | Browse topics | yes | no | no | Bundled topic index. |
| `dhamma_list` | Numbered teaching lists | yes | no | no | Bundled lists with Pāli members and their canonical passages. |
| `verify_quote` | Verify a quotation | yes | no | yes | Pāli is matched offline; English quotations fetch the named translations live. |
| `vinaya_rule` | Pātimokkha rule | yes | no | no | Bundled VRI Vinaya text plus a stored link to the Buddhist Monastic Code. |

No tool writes, deletes, sends or stores anything, so none needs `destructiveHint: true`. The table must list exactly the live tools: `tests/connector-listing.test.mjs` fails when a tool (for example one added through `src/features/`) has no row here, or a row names a tool that no longer exists. Add the row in the same change that adds the tool; the directory re-reviews material changes to tools.

## Screenshots plan

Standard connectors do not need screenshots; the carousel is only for MCP Apps (interactive UI), which this server is not. Still capture these for the README, the docs and any reviewer who asks. Use the hosted connector in Claude on the web, a light theme, a window at least 1,000 px wide, PNG, cropped to Claude's answer. Keep the prompt text with each file.

| # | Prompt | What the picture must show |
|---|---|---|
| 1 | "Show me the Pāli of MN 10 with an English translation." | Pāli with VRI paragraph numbers and PTS page breaks next to Ṭhānissaro's English, with the translator and licence line. |
| 2 | "Which text starts on PTS page S v 420?" | The answer naming SN 56:11 (Dhammacakkappavattanasutta) and its citation details. |
| 3 | "Compare the English translations of Dhp 183." | Two translations side by side, each attributed. |
| 4 | "AN 3.65 is the Kālāma Sutta in some books and AN 3.66 in others. Which is right here?" | The numbering note, showing differences are reported, not hidden. |
| 5 | The connector's tool list in Claude's settings | All tools shown as read-only. |

Do not stage or edit answers: capture what the connector really returns. Save them under `docs/listings/screenshots/` (create it when there is something to save).

## Handoff

1. When #5 is deployed and items 2, 5 and 6 above are done: add the hosted address as a custom connector in Claude, run every tool, and run it through the MCP Inspector.
2. Open [claude.ai/directory/manage](https://claude.ai/directory/manage) → **Submit new** → **MCP connector**, and copy the answers above.
3. Record the submission date and status in the table in [README.md](README.md#status) and tick #7. Escalations: `mcp-review@anthropic.com` (from the submission docs). Status appears in the portal.
4. Once listed, add the listing link to the README's install section and close #7.
