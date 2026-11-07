# ChatGPT app

This packet lists Pali Canon as an **app in ChatGPT**, built on OpenAI's Apps SDK. ChatGPT connects to
the hosted web version of the server (the `/mcp` address, see [hosting.md](../hosting.md)) and shows a
**reading view**: the Pāli text and an English translation side by side, with the citation, the PTS
page and the translator's name. Issue: [#11](https://github.com/DaniilKi/pali-canon-claude/issues/11).

Nothing here has been submitted. A maintainer does the steps below, because they need an OpenAI account,
a verified developer identity and the hosted address, none of which exist yet.

Checked against OpenAI's documentation on 1 November 2026:
[Apps SDK](https://developers.openai.com/apps-sdk),
[ChatGPT UI](https://developers.openai.com/plugins/build/chatgpt-ui),
[reference](https://developers.openai.com/apps-sdk/reference),
[connect from ChatGPT](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt),
[submission](https://developers.openai.com/apps-sdk/deploy/submission) and
[submission guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines).
OpenAI now calls a submitted app a **plugin**; the words below follow its dashboard.

## What the app adds

The hosted server gains one extra tool and its page when the setting `CHATGPT_WIDGET=1` is on
(`fly.toml` and `render.yaml` turn it on). The local server used by Claude, Codex and Gemini is not changed.

| Part | Value |
|---|---|
| Tool | `read_passage_widget` (read-only; fetches English live, so `openWorldHint: true`) |
| Inputs | `uid` (an individual citation in a supported script, or source link), `translation`, `english` (true/false), `offset` and `limit` (Pāli segments), `english_offset` (English characters). Native input is labelled; the widget displays Roman Pāli and unchanged English |
| Returns | Pāli segments with VRI paragraph and PTS page markers, VRI attribution and licence; one English translation with translator, source link, attribution and licence; numbering notes; a SuttaCentral link (link only) |
| Page (MCP Apps standard) | `ui://pali-canon/reader-v3.html`, type `text/html;profile=mcp-app`, linked by `_meta.ui.resourceUri` |
| Page (Apps SDK alias) | `ui://pali-canon/reader-v3.skybridge.html`, type `text/html+skybridge`, linked by `_meta["openai/outputTemplate"]` |
| Content security | The page loads nothing from the internet: `connectDomains`, `resourceDomains` and `frameDomains` are all empty. Links open through ChatGPT (`openExternal`). `openai/widgetCSP.redirect_domains` lists the only link targets as trusted redirect destinations: `https://www.dhammatalks.org`, `https://dhammatalks.org`, `https://www.accesstoinsight.org`, `https://accesstoinsight.org`, `https://ancient-buddhist-texts.net` (the English sources, already on the `src/http.mjs` allowlist) and `https://suttacentral.net` (link only, never fetched). `_meta.ui.csp` has no field for this, so it is set only in the Apps SDK key. |
| Source | [`src/chatgpt-widget.mjs`](../../src/chatgpt-widget.mjs), tests in [`tests/chatgpt-widget.test.mjs`](../../tests/chatgpt-widget.test.mjs) |

When the page HTML changes in a way that could break a cached copy, raise `WIDGET_VERSION` (the current revision is `v3`)
so the addresses change, as OpenAI asks.

If no English translation is linked for a text, or the reader turns English off, the view shows the Pāli
alone and says so. It never puts a different translation in its place.

Long texts are shown in parts. Each call shows up to 40 Pāli segments and up to 6,000 characters of the
English. For a long sutta such as MN 10 the view says where each column stops; asking for more calls the
tool again with `offset` (Pāli). For English, use the returned `english.continue_with` tool name and arguments: the next character offset is pinned to the exact translation ID. A non-zero `english_offset` without that ID is rejected for English while the Pāli remains readable. An outage fallback to another version cannot reuse the old character offset; restart that version from its beginning. `get_translation`
with `offset` also returns the rest of the English as plain text, and the source page link is always shown.

The `v3` page clears the previous passage, citation and source links on a failed read, including errors
delivered through the Apps SDK full-result metadata or MCP Apps error envelope. The tool includes its
error object in `structuredContent` so the Apps SDK can display it. Multi-page translations with an
unknown total show continuation positions without inventing a total character count.

The automated tests execute the actual embedded script with a minimal DOM and both bridge event
shapes, plus mocked source recovery/outage cases and HTTP tool calls. They do not prove rendering,
navigation or frame behaviour in a signed-in ChatGPT client. Those manual tests below are still needed.
Bridge contracts: [OpenAI reference](https://developers.openai.com/plugins/reference),
[MCP Apps tool errors](https://modelcontextprotocol.github.io/ext-apps/api/classes/app.App.html).

## Step 1: put the server online

The hosted address is needed first ([#5](https://github.com/DaniilKi/pali-canon-claude/issues/5)).
Deploy with Fly.io or Render as in [hosting.md](../hosting.md). The address will look like
`https://pali-canon-mcp.fly.dev/mcp` (the real name depends on the app name you choose). Check that
`https://<address>/healthz` shows `"chatgpt_widget": true`.

To try it before deploying, run it on your own computer:

```sh
CHATGPT_WIDGET=1 node server/http.cjs
```

On Windows PowerShell: `$env:CHATGPT_WIDGET = "1"; node server/http.cjs`. ChatGPT cannot reach
`localhost`, so for a local test use OpenAI's *Secure MCP Tunnel* option, or any HTTPS tunnel you trust.

## Step 2: try it in ChatGPT

1. Sign in to ChatGPT with the account that will own the app. Workspace policies may block custom servers;
   use a personal account or ask the workspace admin.
2. Open [chatgpt.com/plugins](https://chatgpt.com/plugins), choose **+**, then **Add custom MCP server**.
3. Name: `Pali Canon`. Description: the short description from the [shared facts](README.md#shared-facts-use-the-same-words-everywhere).
4. Connection: **Public endpoint**, and paste the `/mcp` address. Authentication: none (the server is public and read-only).
5. Read the risk warning, choose **I understand and want to continue**, then **Create as a plugin**.
6. Check that ChatGPT lists 35 tools: the 34 server tools plus `read_passage_widget`.
7. In a new chat, try the five test prompts below on the computer **and** on a phone. The reading view
   should show the Pāli on the left, English on the right (stacked on a phone), with PTS page and translator.
8. After a server change: redeploy, open the connection on chatgpt.com/plugins, choose **Refresh**, and start a new chat.

Record the result on issue #11 ("Works in ChatGPT developer mode").

## Step 3: submit

1. Make sure the OpenAI organization that will own the app has completed **individual or business
   verification** (organization settings), so the app can be published under the maintainer's name.
2. Record a short screen video of the five test prompts working, and upload it somewhere a reviewer can
   watch without signing in (for example an unlisted YouTube video). This is the demo recording.
3. Go to [platform.openai.com/plugins](https://platform.openai.com/plugins) and choose
   **Upload new or existing plugin**. Follow the dashboard: connect the MCP server, complete **domain
   verification** for the hosted address, and wait for the tool scan.
4. Fill in the fields from the table below and the test cases.
5. **Submit for review** and read the policy attestations before accepting them (a maintainer decision).
6. Feedback arrives by email. After approval, choose **Publish plugin**.

Record the submission on issue #11 ("Submitted to the app directory"), and update the status table in
[README.md](README.md).

## Listing fields

| Field | Value |
|---|---|
| Name (`name`, ≤64; stable identifier: lowercase letters, numbers, single hyphens) | `pali-canon` |
| Display name (`displayName`, ≤30) | Pali Canon |
| Subtitle (`shortDescription`, ≤30) | Read and cite the Tipiṭaka |
| Developer name (≤80) | the maintainer's verified name |
| Category | Education (or the closest reference / education category the dashboard offers) |
| Logo | [`assets/logo.png`](../../assets/logo.png) (512 × 512 PNG) |
| Website URL | https://github.com/DaniilKi/pali-canon-claude |
| Support URL | https://github.com/DaniilKi/pali-canon-claude/issues |
| Privacy policy URL | https://github.com/DaniilKi/pali-canon-claude/blob/main/PRIVACY.md |
| Terms of service URL | https://github.com/DaniilKi/pali-canon-claude/blob/main/TERMS.md |
| MCP server URL | the hosted `/mcp` address from step 1 |
| Authentication | None. No demo account is needed. |
| Demo recording URL | the video from step 3 |

**Long description** (`longDescription`, ≤4000):

> Pali Canon lets ChatGPT read and cite the real text of the Pāli Tipiṭaka, the scripture of Theravāda
> Buddhism, instead of paraphrasing from memory. It holds the whole VRI Chaṭṭha Saṅgāyana edition
> (8,544 citable texts, about 2.8 million words). Ask for a sutta by its usual reference (MN 10, SN 56:11,
> AN 3.65, Dhp 183, Snp 1.8) or by a PTS page (M i 55) and the app opens a reading view with the Pāli and an
> English translation side by side, showing the citation, the PTS page and the translator. English
> translations by Ṭhānissaro Bhikkhu (dhammatalks.org), Access to Insight and Ānandajoti Bhikkhu (Ancient Buddhist Texts) are fetched live and
> always attributed. The app can also search the Pāli, browse the canon, compare translations and look up
> words in the Digital Pāḷi Dictionary. Numbering differences between editions are reported, not hidden.
> If a translation does not exist, the app says so rather than substituting another. It is a library, not
> a teacher: it shows the texts and leaves interpretation to the reader. It is free, read-only, needs no
> account and keeps no record of what you read. The texts keep their own non-commercial licences.

## Test cases

Every citation here resolves in the bundled canon (checked in `tests/chatgpt-widget.test.mjs`).

**Positive cases** (five required):

| Description | Prompt | Tools triggered | Expected behaviour |
|---|---|---|---|
| Read a sutta | "Show me the Satipaṭṭhāna Sutta, MN 10, in Pāli and English." | `read_passage_widget` | Reading view for MN 10, PTS M i 55, Pāli segments and Ṭhānissaro Bhikkhu's translation with dhammatalks.org attribution and licence. |
| PTS page citation | "Which text starts on PTS page S v 420? Show it." | `resolve_reference`, `read_passage_widget` | Resolves to SN 56.11 and shows it with PTS S v 420 and a translator. |
| A verse | "Read Dhammapada verse 183 with a translation." | `read_passage_widget` | Reading view for Dhp 183: the Pāli verse and one attributed English translation. |
| Compare translations | "Compare the English translations of Snp 1.8." | `compare_translations` | Lists the available translators by name and quotes each with attribution. |
| Pāli only | "Show me the Pāli of the first Pārājika rule, without English." | `read_passage_widget` (`english: false`) | Pāli of Pj 1 with VRI paragraph numbers and the VRI attribution; no translation shown. |

**Negative cases** (three required):

| Prompt | Why the app should not act |
|---|---|
| "Which meditation teacher is best for me?" | The app is a library, not a teacher; it does not rank teachers or give practice rulings. |
| "Write a new sutta about social media in the style of the Buddha." | The app retrieves real scripture only; it never generates or reconstructs texts. |
| "What's the weather in Colombo?" | Unrelated to the Pāli Canon. |

## Review answers

**Tool annotations.** Every tool is read-only: `readOnlyHint: true`, `destructiveHint: false`,
`idempotentHint: true`. `openWorldHint` is `true` for the tools that fetch public websites
(`get_text` with a translation, `get_translation`, `compare_translations`, `lookup_pali`,
`search_access_to_insight`, `get_access_to_insight_text`, `read_passage_widget`) and `false` for the tools
that read only the bundled canon.

**Data collected.** None. The tools take a citation, a search phrase or a Pāli word, nothing personal, and
never ask for conversation history or location. The hosted server keeps no logs of requests; see
[PRIVACY.md](../../PRIVACY.md).

**Content.** Public scripture and openly licensed translations for general audiences. Each result carries
its source's attribution and licence. The licences are non-commercial, so the app is free, with no ads,
subscriptions or upgrades.

**Third parties.** The server fetches only from dhammatalks.org, Access to Insight and its official mirrors,
and the Digital Pāḷi Dictionary (a fixed list in `src/http.mjs`). It links to SuttaCentral but never fetches
its content, at SuttaCentral's request.
