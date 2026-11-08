# Privacy policy

**Pali Canon for Claude** · effective 8 November 2026

This page explains, in plain English, what happens to your information when you use this tool. The short version: **we do not collect your questions, your citations or anything that identifies you.**

The local and hosted servers are covered below, followed by the standalone browser reader.

## 1. On your own computer (local mode)

This is how the tool runs today: as a Claude Desktop extension, a Claude Code plugin, or any app that starts the server on your machine.

- **We collect nothing.** There are no accounts, no analytics, no tracking, no usage statistics and no crash reports. Nothing you ask is sent to us, because there is no "us" in the loop: the server runs only on your computer.
- **The Pāli texts are read from your computer.** The whole Tipiṭaka is bundled with the tool, so looking up, reading and searching the Pāli never leaves your machine.
- **Some requests go to public websites.** When you ask for an English translation or a dictionary entry, the tool fetches that page from the site that publishes it:
  - [dhammatalks.org](https://www.dhammatalks.org) (Ṭhānissaro Bhikkhu's translations),
  - [Access to Insight](https://www.accesstoinsight.org) and its official mirrors on GitHub and jsDelivr,
  - [Ancient Buddhist Texts](https://ancient-buddhist-texts.net) (Ānandajoti Bhikkhu’s translations),
  - the [Digital Pāḷi Dictionary](https://www.dpdict.net).

  Approved source and mirror destinations are restricted by the fixed allowlist in `src/http.mjs`; see the current [source register](docs/sources.md). The request contains only what is needed to fetch the page (for example, the address of a sutta or the Pāli word you looked up) and a label naming this tool. Like any website, those sites and mirrors may keep ordinary web server logs, such as your internet address and the page requested. Their own privacy policies apply to those logs.
- **Your AI app has its own policy.** Your conversation with Claude (or another assistant) is handled by that app's provider under its own privacy policy. This tool does not see or store your conversation; it only receives the specific lookups the assistant asks it to make.

## 2. Hosted version (hosted mode)

A hosted version, so the tool works in Claude on the web and phone without installing anything, is planned ([issue #5](https://github.com/DaniilKi/pali-canon-claude/issues/5)). When the project runs an official hosted version, these commitments apply to it:

- **No request content is logged.** We do not record your questions, the citations you look up, your search terms, the words you look up in the dictionary, or the text returned to you.
- **Only aggregate counts are kept.** To keep the service running, we keep totals such as how many times each tool was used, how many requests failed, and response times, added up over periods of time. These totals cannot be traced back to a person or a request.
- **No accounts, no profiles, no tracking.** There is no sign-in, no cookies for tracking, no advertising and no selling or sharing of data.
- **No storage of your identity by us.** We do not store your internet address alongside anything you asked. The hosting company that runs the servers may keep short-lived network and security logs (for example, to block attacks), under its own policy; we do not use them to look at what people ask.
- **Translation and dictionary lookups** still go from the hosted server to the public websites listed above, so those sites see the hosted server's address, not yours.

If someone else runs their own copy of this open-source server, their own privacy policy applies, not this one.

## 3. Standalone browser reader

The optional reader at the HTTP server’s root works without an AI account. It sends browse, search and reading requests to the same server, so the hosted-mode protections and deployment-provider limitations above apply when that server is remote.

- **Personal reading stays in your browser.** Bookmarked passage references, personal notes, manual reading-plan marks and their assignment/source signatures, a single last visible-passage locator (reference, offset and source revision), theme, font size and script preferences are saved in this browser’s local storage. Stored personal metadata is not uploaded or synced to an account. Opening a reading locator requests its source selection/offset through the ordinary reading API; the locator’s revision is checked in the browser. Anyone with access to this browser profile may be able to read them.
- **You control the saved data.** Individual bookmarks can be removed and manual plan-day marks can be undone. Switching off “Remember reading position on this device” removes the last-position pointer and stops recording it. Removing a bookmark also removes its note. Browser site-data controls can erase the local data. JSON export saves bookmarks/notes or reading-plan progress as a file on your device; you decide where that file goes. Clearing browser data, private browsing or disabled storage may prevent persistence.
- **Restore stays local.** You can select a supported bookmark/notes export for a local preview. The file is never uploaded. Confirmation adds new passage keys; existing bookmarks and notes are kept. Unsupported, duplicate-reference or oversized files are rejected. Imported references are not authenticated scripture; opening them retrieves and checks the actual source reference. Reading-plan progress has a separate local preview/restore in Plans; existing conflicting marks and source signatures are retained.
- **No silent offline library.** This slice does not install a service worker or persist scripture/English bodies into an offline web collection. Normal browser caching is still controlled by the browser and response headers.
- **No new tracking.** The reader loads no third-party scripts, fonts or analytics. Selecting a translation asks the server to retrieve the named source; opening an external source link visits that publisher directly under its own policy. The reader’s response sets a no-referrer policy.

See the [reader guide](docs/web-app.md) for the current feature and storage limits.

## Children

The tool does not ask for or knowingly collect any personal information from anyone, including children.

## Changes to this policy

Any change is made in public in this file, and the history is visible on [GitHub](https://github.com/DaniilKi/pali-canon-claude/commits/main/PRIVACY.md). We will not weaken these commitments without saying so clearly at the top of this page.

## Questions

Please [open an issue on GitHub](https://github.com/DaniilKi/pali-canon-claude/issues). For a security or privacy problem you do not want to discuss in public, see [SECURITY.md](SECURITY.md).

See also: [Terms of use](TERMS.md) · [Security policy](SECURITY.md) · [Licences of the texts](THIRD_PARTY.md)
