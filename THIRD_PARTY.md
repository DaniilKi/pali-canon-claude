# Third-party content and dependencies

The [MIT licence](LICENSE) covers this project's original software and documentation. It does **not** relicense retrieved scriptures, translations, dictionary entries, commentary, names, or upstream services. Source text is retrieved on demand rather than bundled as an offline corpus.

## SuttaCentral

Text, translations, parallels, search results, and catalogue information come from [SuttaCentral](https://suttacentral.net/), its [server/API source](https://github.com/suttacentral/suttacentral/tree/main/server), and related data projects such as [Bilara data](https://github.com/suttacentral/bilara-data). Preserve translator attribution and the licence identified for each work. Do not assume that every translation has the same licence. See [SuttaCentral licensing](https://suttacentral.net/licensing) and the relevant source repository or publication for authoritative terms.

## Access to Insight

[Access to Insight](https://www.accesstoinsight.org/) hosts selected translations and modern articles under varying page-specific licences. Its [copyright FAQ](https://www.accesstoinsight.org/faq.html#copyright) requires free distribution of copied or derived texts, with attribution, copyright notice, and licence terms retained. Most content is not public domain; the Sri Lanka Tripitaka Project files are an identified exception. Follow the individual page's licence. Do not sell fetched ATI content or silently apply this repository's MIT licence to it.

## Digital Pali Dictionary

[Digital Pali Dictionary](https://dpdict.net/) is a separate dictionary project. Its [licensing documentation](https://docs.dpdict.net/license/) specifies [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/): attribution, noncommercial use, and share-alike obligations. Linking to DPD does not include its database in this repository. Dictionary content actually obtained from DPD retains its own conditions; dictionary material from other sources retains their terms.

## Runtime dependencies

The bundled server includes the Model Context Protocol TypeScript SDK and its bundled dependency code. Relevant licence notices are distributed beside the generated server in `server/`; inspect those notices and `package-lock.json` for the actual versions and dependency tree. Build tools and MCPB packaging tools are development dependencies, not source-data licences. Regenerating the server must preserve bundled licence notices.

This project is independent and is not endorsed by Anthropic, SuttaCentral, Access to Insight, or Digital Pali Dictionary.
