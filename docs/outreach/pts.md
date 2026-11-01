# Letter to Pali Text Society (PTS)

| | |
|---|---|
| Status | **Draft, not sent** |
| Ask | Confirm use of the CC BY-NC volumes (Horner, Woodward, Ñāṇamoli and others) in a free tool; advice on an authorised digital source; DPPN rights |
| Contact route | `info@palitextsociety.org` (shown on https://palitextsociety.org/contact/) |
| Contact checked | 1 November 2026 |

## Before sending

- https://palitextsociety.org/contact/ gives `info@palitextsociety.org` (written "info [at] palitextsociety.org"), a phone number and a mail-only postal address in Oxford. No separate permissions contact is named.
- The Office Administrator works Monday to Thursday.
- Licences: https://palitextsociety.org/copyright-information/ (CC BY-NC 3.0 from 2013; CC BY-NC 4.0 for five Ñāṇamoli volumes from 2021).
- Fill in the maintainer's name and reply-to address. Only the maintainer sends this letter; agents never send it.
- After sending, update the status in [README.md](README.md). Record the reply in [docs/sources.md](../sources.md).

## Letter

**Subject:** PTS page references and Creative Commons volumes in a free scripture-study tool

Dear Pali Text Society,

I maintain **Pali Canon for Claude** (https://github.com/DaniilKi/pali-canon-claude), a free, open-source tool that helps AI assistants such as Claude look up and quote the Pāli Canon accurately instead of paraphrasing it from memory. When someone asks about a sutta, the assistant retrieves the actual passage from a named source and gives its citation (for example "MN 10" or "M i 55"), the translator or editor, the licence and a link to the original page. The tool is a library, not a teacher: it gives no rulings on practice and does not rank teachers or traditions.

**How we use your work.** Your page numbers are how scholars cite the canon, so the tool accepts and returns PTS references ("M i 55", "S v 421") for about 12,000 page breaks. These come from the page markers in the VRI edition, not from your text, and every result shows them as PTS references.

**What we would like to add.** Your copyright page explains that many translations are available under Creative Commons, non-commercial licences, including Horner's *Book of the Discipline* and *Middle Length Sayings*, the *Kindred Sayings* and *Gradual Sayings*, and Ñāṇamoli's *Dispeller of Delusion* and *The Guide*. These would give our readers their first English for the Vinaya and parts of the Abhidhamma and commentaries. We would like to link to, and where an authorised digital text exists, quote these by section, with the translator, "Pali Text Society", the exact licence and a link.

These safeguards apply to everything the tool returns, and we would keep them for your work:

- **Attribution on every result.** Each passage comes back with the source's name, the translator or editor, the licence or terms, and a link to the original page.
- **Non-commercial.** The tool is free. There are no fees, paid tiers or advertising, and we do not sell or license anyone's content. The software itself is MIT-licensed; texts keep their own terms.
- **Word for word.** We never edit, rewrite or generate scripture or translations. Abbreviated passages are flagged as such, and we never silently swap one translation for another.
- **Not a training dataset.** We do not build or supply datasets for training AI models. A passage is handed to the assistant only in the conversation where a reader asked for it, so that it can be quoted and cited correctly.
- **Light, read-only access.** The tool reads only from a short list of approved sites, one page at a time when a reader asks; it does not crawl.
- **Your wishes come first.** SuttaCentral has asked not to be used in AI tools, so we only link to it. If you would prefer the same, we will switch to links only and record your wishes publicly in our source library (https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/sources.md).

**What we are asking.**

1. Please confirm that use of the CC-licensed volumes as described, in a free and non-commercial tool, is in keeping with the Society's wishes.
2. Is there an authorised or preferred digital source for these volumes (for example, files the Society publishes) that we should link to or read from?
3. Does the Society hold, or know who holds, the rights in Malalasekera's *Dictionary of Pāli Proper Names* (1937–38)? We would only use it if its status is clear.
4. Is there a credit line you would like us to use?

If it would help, I am happy to send more detail, show you the tool working, or change how your work is presented. A short reply is plenty, and "no" is a perfectly good answer: we will follow it.

With thanks and respect for your work,

[Maintainer's name]
Maintainer, Pali Canon for Claude — https://github.com/DaniilKi/pali-canon-claude
Reply to: [maintainer's email address]
