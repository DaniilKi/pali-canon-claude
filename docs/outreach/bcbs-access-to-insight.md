# Letter to Barre Center for Buddhist Studies / Access to Insight

| | |
|---|---|
| Status | **Draft, not sent** |
| Ask | Confirm live retrieval (and official GitHub/CDN mirrors) of ATI pages with each page's own notice; confirm the sutta and subject index pages may be read to find texts; study-guide reading plan as titles and links |
| Contact route | `contact@buddhistinquiry.org` (shown in the Access to Insight FAQ, https://www.accesstoinsight.org/faq.html#contact) |
| Contact checked | 1 November 2026 |

## Before sending

- The Access to Insight FAQ (https://www.accesstoinsight.org/faq.html, "How can I contact you?") gives `contact@buddhistinquiry.org`.
- The FAQ asks that copyright questions about a particular text go to its author or original publisher. This letter is about the site as a whole; per-author questions are covered by the other letters.
- BCBS site: https://bcbsdharma.org.
- Fill in the maintainer's name and reply-to address. Only the maintainer sends this letter; agents never send it.
- After sending, update the status in [README.md](README.md). Record the reply in [docs/sources.md](../sources.md).

## Letter

**Subject:** Access to Insight in a free scripture-study tool: how we use it, and a request

Dear friends at the Barre Center for Buddhist Studies,

I maintain **Pali Canon for Claude** (https://github.com/DaniilKi/pali-canon-claude), a free, open-source tool that helps AI assistants such as Claude look up and quote the Pāli Canon accurately instead of paraphrasing it from memory. When someone asks about a sutta, the assistant retrieves the actual passage from a named source and gives its citation (for example "MN 10" or "M i 55"), the translator or editor, the licence and a link to the original page. The tool is a library, not a teacher: it gives no rulings on practice and does not rank teachers or traditions.

**How we use your work.** The tool holds about 1,050 links to translations on Access to Insight, by roughly 25 translators. When a reader asks for one, the tool fetches that single page and returns it together with the page's own copyright notice (CC BY-NC 4.0, BPS free distribution, public domain or other), the translator and a link to the page. If accesstoinsight.org is unreachable, the tool reads the same page from the official `bcbsit/ati` repository on GitHub (directly or through the jsDelivr CDN), and then from the `digitalpalireader/accesstoinsight` copy. To help readers find texts by title or topic, the tool also reads your sutta index and subject index pages (through the same mirrors) and matches titles itself; it does not use a site search and returns only titles and links from those pages.

**What we would like to add.** We would like to offer a reading plan that follows one of your study guides, as titles and links only (not the articles themselves).

These safeguards apply to everything the tool returns, and we would keep them for your work:

- **Attribution on every result.** Each passage comes back with the source's name, the translator or editor, the licence or terms, and a link to the original page.
- **Non-commercial.** The tool is free. There are no fees, paid tiers or advertising, and we do not sell or license anyone's content. The software itself is MIT-licensed; texts keep their own terms.
- **Word for word.** We never edit, rewrite or generate scripture or translations. Abbreviated passages are flagged as such, and we never silently swap one translation for another.
- **Not a training dataset.** We do not build or supply datasets for training AI models. A passage is handed to the assistant only in the conversation where a reader asked for it, so that it can be quoted and cited correctly.
- **Light, read-only access.** The tool reads only from a short list of approved sites, one page at a time when a reader asks; it does not crawl.
- **Your wishes come first.** SuttaCentral has asked not to be used in AI tools, so we only link to it. If you would prefer the same, we will switch to links only and record your wishes publicly in our source library (https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/sources.md).

**What we are asking.**

1. Please confirm that the live retrieval described above, including the fallback to your official GitHub repository and its CDN copy, is acceptable.
2. Please confirm that reading the sutta and subject index pages to find texts by title or topic, as described above, is acceptable, and tell us whether the study-guide reading plan (titles and links only) would be welcome.
3. Are there any pages, translators or sections you would like us to leave out or link to only?

If it would help, I am happy to send more detail, show you the tool working, or change how your work is presented. A short reply is plenty, and "no" is a perfectly good answer: we will follow it.

With thanks and respect for your work,

[Maintainer's name]
Maintainer, Pali Canon for Claude — https://github.com/DaniilKi/pali-canon-claude
Reply to: [maintainer's email address]
