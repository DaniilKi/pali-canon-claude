# Letter to Digital Pāḷi Dictionary (Bodhirasa Bhikkhu)

| | |
|---|---|
| Status | **Draft, not sent** |
| Ask | Confirm live lookups and a compact offline copy (CC BY-NC-SA 4.0) are welcome; preferred credit wording |
| Contact route | `digitalpalidictionary@gmail.com` (shown on https://docs.dpdict.net/contact/) |
| Contact checked | 1 November 2026 |

## Before sending

- https://docs.dpdict.net/contact/ shows `digitalpalidictionary@gmail.com`.
- Data releases: https://github.com/digitalpalidictionary/dpd-db/releases. Licence page: https://docs.dpdict.net/license/.
- Fill in the maintainer's name and reply-to address. Only the maintainer sends this letter; agents never send it.
- After sending, update the status in [README.md](README.md). Record the reply in [docs/sources.md](../sources.md).

## Letter

**Subject:** The Digital Pāḷi Dictionary in a free scripture-study tool: a courtesy note and two questions

Dear Venerable Bodhirasa, and friends of the Digital Pāḷi Dictionary,

I maintain **Pali Canon for Claude** (https://github.com/DaniilKi/pali-canon-claude), a free, open-source tool that helps AI assistants such as Claude look up and quote the Pāli Canon accurately instead of paraphrasing it from memory. When someone asks about a sutta, the assistant retrieves the actual passage from a named source and gives its citation (for example "MN 10" or "M i 55"), the translator or editor, the licence and a link to the original page. The tool is a library, not a teacher: it gives no rulings on practice and does not rank teachers or traditions.

**How we use your work.** When a reader asks what a Pāli word means, the tool looks it up live on dpdict.net and returns your entry with the credit "Digital Pāḷi Dictionary, Bodhirasa Bhikkhu", the CC BY-NC-SA 4.0 licence and a link back to dpdict.net. The tool sends a clear user-agent naming the project, fetches one entry at a time, and retries gently if the site is busy.

**What we would like to add.** We plan to build a compact offline copy from one of your published dpd-db releases (pinned by version and checksum): headwords, grammar, roots, short meanings, the compound and sandhi splits, and the inflection-to-headword map. It would be used when dpdict.net cannot be reached, and for a new feature that shows, word by word, how a passage breaks down. This derived file would be released under CC BY-NC-SA 4.0, with full credit, and refreshed from your releases rather than scraped from the website.

These safeguards apply to everything the tool returns, and we would keep them for your work:

- **Attribution on every result.** Each passage comes back with the source's name, the translator or editor, the licence or terms, and a link to the original page.
- **Non-commercial.** The tool is free. There are no fees, paid tiers or advertising, and we do not sell or license anyone's content. The software itself is MIT-licensed; texts keep their own terms.
- **Word for word.** We never edit, rewrite or generate scripture or translations. Abbreviated passages are flagged as such, and we never silently swap one translation for another.
- **Not a training dataset.** We do not build or supply datasets for training AI models. A passage is handed to the assistant only in the conversation where a reader asked for it, so that it can be quoted and cited correctly.
- **Light, read-only access.** The tool reads only from a short list of approved sites, one page at a time when a reader asks; it does not crawl.
- **Your wishes come first.** SuttaCentral has asked not to be used in AI tools, so we only link to it. If you would prefer the same, we will switch to links only and record your wishes publicly in our source library (https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/sources.md).

**What we are asking.**

1. Are you comfortable with the live lookups as described? If you would like us to cache results, limit the request rate or use a different address, we will.
2. May we publish the compact offline copy described above, under CC BY-NC-SA 4.0 with your credit? Is there a subset or format you would prefer?
3. Is there a credit line or link you would like us to use?

If it would help, I am happy to send more detail, show you the tool working, or change how your work is presented. A short reply is plenty, and "no" is a perfectly good answer: we will follow it.

With thanks and respect for your work,

[Maintainer's name]
Maintainer, Pali Canon for Claude — https://github.com/DaniilKi/pali-canon-claude
Reply to: [maintainer's email address]
