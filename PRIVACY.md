# Privacy policy

**Pali Canon for Claude** · effective 1 November 2026

This page explains, in plain English, what happens to your information when you use this tool. The short version: **we do not collect your questions, your citations or anything that identifies you.**

The tool can be used in two ways, and they are covered separately below.

## 1. On your own computer (local mode)

This is how the tool runs today: as a Claude Desktop extension, a Claude Code plugin, or any app that starts the server on your machine.

- **We collect nothing.** There are no accounts, no analytics, no tracking, no usage statistics and no crash reports. Nothing you ask is sent to us, because there is no "us" in the loop: the server runs only on your computer.
- **The Pāli texts are read from your computer.** The whole Tipiṭaka is bundled with the tool, so looking up, reading and searching the Pāli never leaves your machine.
- **Some requests go to public websites.** When you ask for an English translation or a dictionary entry, the tool fetches that page from the site that publishes it:
  - [dhammatalks.org](https://www.dhammatalks.org) (Ṭhānissaro Bhikkhu's translations),
  - [Access to Insight](https://www.accesstoinsight.org) and its official mirrors on GitHub and jsDelivr,
  - the [Digital Pāḷi Dictionary](https://www.dpdict.net).

  These are the only sites the tool can contact; the list is fixed in the code. The request contains only what is needed to fetch the page (for example, the address of a sutta or the Pāli word you looked up) and a label naming this tool. Like any website, those sites and mirrors may keep ordinary web server logs, such as your internet address and the page requested. Their own privacy policies apply to those logs.
- **Your AI app has its own policy.** Your conversation with Claude (or another assistant) is handled by that app's provider under its own privacy policy. This tool does not see or store your conversation; it only receives the specific lookups the assistant asks it to make.

## 2. Hosted version (hosted mode)

A hosted version, so the tool works in Claude on the web and phone without installing anything, is planned ([issue #5](https://github.com/DaniilKi/pali-canon-claude/issues/5)). When the project runs an official hosted version, these commitments apply to it:

- **No request content is logged.** We do not record your questions, the citations you look up, your search terms, the words you look up in the dictionary, or the text returned to you.
- **Only aggregate counts are kept.** To keep the service running, we keep totals such as how many times each tool was used, how many requests failed, and response times, added up over periods of time. These totals cannot be traced back to a person or a request.
- **No accounts, no profiles, no tracking.** There is no sign-in, no cookies for tracking, no advertising and no selling or sharing of data.
- **No storage of your identity by us.** We do not store your internet address alongside anything you asked. The hosting company that runs the servers may keep short-lived network and security logs (for example, to block attacks), under its own policy; we do not use them to look at what people ask.
- **Translation and dictionary lookups** still go from the hosted server to the public websites listed above, so those sites see the hosted server's address, not yours.

If someone else runs their own copy of this open-source server, their own privacy policy applies, not this one.

## Children

The tool does not ask for or knowingly collect any personal information from anyone, including children.

## Changes to this policy

Any change is made in public in this file, and the history is visible on [GitHub](https://github.com/DaniilKi/pali-canon-claude/commits/main/PRIVACY.md). We will not weaken these commitments without saying so clearly at the top of this page.

## Questions

Please [open an issue on GitHub](https://github.com/DaniilKi/pali-canon-claude/issues). For a security or privacy problem you do not want to discuss in public, see [SECURITY.md](SECURITY.md).

See also: [Terms of use](TERMS.md) · [Security policy](SECURITY.md) · [Licences of the texts](THIRD_PARTY.md)
