# Letter to Vipassana Research Institute (VRI)

| | |
|---|---|
| Status | **Draft, not sent** |
| Ask | Confirm the bundled VRI Pāli text (and planned commentaries and page markers) is acceptable under its non-commercial terms; preferred credit wording |
| Contact route | `help@tipitaka.org` (shown on https://www.tipitaka.org/ as "Contact the Webmaster") |
| Contact checked | 1 November 2026 |

## Before sending

- https://www.tipitaka.org/ shows `help@tipitaka.org`, labelled "Contact the Webmaster". There is no `/contact` page (it returns 404).
- VRI's main site is http://www.vridhamma.org/; no separate permissions address was found there in this check.
- The data repository is https://github.com/VipassanaTech/tipitaka-xml. Do not use public GitHub issues for this letter unless email gets no reply.
- Fill in the maintainer's name and reply-to address. Only the maintainer sends this letter; agents never send it.
- After sending, update the status in [README.md](README.md). Record the reply in [docs/sources.md](../sources.md).

## Letter

**Subject:** Permission request: the Chaṭṭha Saṅgāyana Tipiṭaka in a free scripture-study tool

Dear friends at the Vipassana Research Institute,

I maintain **Pali Canon for Claude** (https://github.com/DaniilKi/pali-canon-claude), a free, open-source tool that helps AI assistants such as Claude look up and quote the Pāli Canon accurately instead of paraphrasing it from memory. When someone asks about a sutta, the assistant retrieves the actual passage from a named source and gives its citation (for example "MN 10" or "M i 55"), the translator or editor, the licence and a link to the original page. The tool is a library, not a teacher: it gives no rulings on practice and does not rank teachers or traditions.

**How we use your work.** The heart of the tool is your Chaṭṭha Saṅgāyana Tipiṭaka. We bundle the Pāli root texts (the `*.mul.xml` files, plus the Milindapañha and Peṭakopadesa) from your tipitaka-xml repository, pinned to commit `2d134ff9ef60f70a1eb03c9370580228811a3070`, so that readers can look up any of 8,544 texts offline. We keep your paragraph numbers, variant notes and page markers, and every result credits VRI and links to tipitaka.org.

**What we would like to add.** Over the coming months we plan to use the same pinned repository for:

- the commentaries (aṭṭhakathā, `*.att.xml`) and sub-commentaries (ṭīkā, `*.tik.xml`), clearly labelled as commentary;
- the remaining `*.nrf.xml` books (for example the Visuddhimagga), marked as non-canonical;
- the Thai, Myanmar and VRI page references already present in your files;
- your editions in other scripts (Devanagari, Sinhala, Thai, Myanmar, Khmer, Lao, Lanna), used only to test our own script converter for accuracy, not shipped.

The tool is distributed free as an open-source package (GitHub, npm, a Docker image and AI-app plugin directories). We also plan a free public online version, which would keep only aggregate usage counts and no record of what people read.

These safeguards apply to everything the tool returns, and we would keep them for your work:

- **Attribution on every result.** Each passage comes back with the source's name, the translator or editor, the licence or terms, and a link to the original page.
- **Non-commercial.** The tool is free. There are no fees, paid tiers or advertising, and we do not sell or license anyone's content. The software itself is MIT-licensed; texts keep their own terms.
- **Word for word.** We never edit, rewrite or generate scripture or translations. Abbreviated passages are flagged as such, and we never silently swap one translation for another.
- **Not a training dataset.** We do not build or supply datasets for training AI models. A passage is handed to the assistant only in the conversation where a reader asked for it, so that it can be quoted and cited correctly.
- **Light, read-only access.** The tool reads only from a short list of approved sites, one page at a time when a reader asks; it does not crawl.
- **Your wishes come first.** SuttaCentral has asked not to be used in AI tools, so we only link to it. If you would prefer the same, we will switch to links only and record your wishes publicly in our source library (https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/sources.md).

**What we are asking.**

1. Please confirm that bundling and serving your Pāli text in this free, non-commercial tool, distributed through the channels above, is within your terms.
2. Please confirm that we may extend this to the commentaries, sub-commentaries and other books listed above on the same terms.
3. Please tell us the credit line you would like us to show (at present: "Chaṭṭha Saṅgāyana Tipiṭaka, Vipassana Research Institute, tipitaka.org").

If it would help, I am happy to send more detail, show you the tool working, or change how your work is presented. A short reply is plenty, and "no" is a perfectly good answer: we will follow it.

With thanks and respect for your work,

[Maintainer's name]
Maintainer, Pali Canon for Claude — https://github.com/DaniilKi/pali-canon-claude
Reply to: [maintainer's email address]
