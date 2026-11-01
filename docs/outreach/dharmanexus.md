# Letter to DharmaNexus (Dharmamitra)

| | |
|---|---|
| Status | **Draft, not sent** |
| Ask | Permission and licence terms to use DharmaNexus computed Pāli parallels (or link to them by passage) with attribution |
| Contact route | contact page: https://dharmamitra.org/people (email link on the page; address not readable by our check) and https://github.com/dharmamitra |
| Contact checked | 1 November 2026 |

## Before sending

- dharmanexus.org now redirects to https://dharmamitra.org/db. The older address in our source library (buddhanexus2.kc-tbts.uni-hamburg.de) no longer resolves.
- Dharmamitra is described on its site as a collaboration of the Tsadra Foundation, Tohoku University and UC Berkeley's AI Research Lab. Sebastian Nehrdich is listed as co-founder, director and principal investigator.
- The site and https://dharmamitra.org/people show an email link, but the address is hidden from automated reading. Open the page in a browser to get it. The guides (https://dharmamitra.github.io/dharmamitra-guides/) say datasets are provided "in either public-domain or under Creative Commons licensing", without naming the licence for the Pāli parallels.
- Fill in the maintainer's name and reply-to address. Only the maintainer sends this letter; agents never send it.
- After sending, update the status in [README.md](README.md). Record the reply in [docs/sources.md](../sources.md).

## Letter

**Subject:** Permission enquiry: DharmaNexus Pāli parallels in a free scripture-study tool

Dear Dharmamitra and DharmaNexus team,

I maintain **Pali Canon for Claude** (https://github.com/DaniilKi/pali-canon-claude), a free, open-source tool that helps AI assistants such as Claude look up and quote the Pāli Canon accurately instead of paraphrasing it from memory. When someone asks about a sutta, the assistant retrieves the actual passage from a named source and gives its citation (for example "MN 10" or "M i 55"), the translator or editor, the licence and a link to the original page. The tool is a library, not a teacher: it gives no rulings on practice and does not rank teachers or traditions.

**How we would use your work.** We plan a feature that, for any text, lists other passages that share wording with it. We will build part of this ourselves from the VRI edition and from the commentaries' own cross-references. Your computed text-reuse data for the Pāli canon would make it far better. We would show each parallel with "DharmaNexus" as its source, the licence you specify and a link to the passage in your database.

These safeguards apply to everything the tool returns, and we would keep them for your work:

- **Attribution on every result.** Each passage comes back with the source's name, the translator or editor, the licence or terms, and a link to the original page.
- **Non-commercial.** The tool is free. There are no fees, paid tiers or advertising, and we do not sell or license anyone's content. The software itself is MIT-licensed; texts keep their own terms.
- **Word for word.** We never edit, rewrite or generate scripture or translations. Abbreviated passages are flagged as such, and we never silently swap one translation for another.
- **Not a training dataset.** We do not build or supply datasets for training AI models. A passage is handed to the assistant only in the conversation where a reader asked for it, so that it can be quoted and cited correctly.
- **Light, read-only access.** The tool reads only from a short list of approved sites, one page at a time when a reader asks; it does not crawl.
- **Your wishes come first.** SuttaCentral has asked not to be used in AI tools, so we only link to it. If you would prefer the same, we will switch to links only and record your wishes publicly in our source library (https://github.com/DaniilKi/pali-canon-claude/blob/main/docs/sources.md).

**What we are asking.**

1. Under what licence is the DharmaNexus Pāli parallels data available, and may we use it, in a compact derived form, in this free tool with attribution?
2. If you would rather we did not copy the data, may we link to the matching DharmaNexus page for each text? Is there a stable URL format we should use?
3. How would you like to be credited (for example, a paper to cite)?

If it would help, I am happy to send more detail, show you the tool working, or change how your work is presented. A short reply is plenty, and "no" is a perfectly good answer: we will follow it.

With thanks and respect for your work,

[Maintainer's name]
Maintainer, Pali Canon for Claude — https://github.com/DaniilKi/pali-canon-claude
Reply to: [maintainer's email address]
