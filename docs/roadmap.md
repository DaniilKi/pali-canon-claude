# Roadmap

Where Pali Canon for Claude stands against the leading AI scripture tools of other traditions, and what we will build to close the gap. Everything here is tracked in GitHub issues under one roadmap issue: [#52](https://github.com/DaniilKi/pali-canon-claude/issues/52).

## The goal

Theravāda Buddhists should have AI study tools as good, and as widely available, as those that Christians, Muslims and Jews already have, built with the same care for sources that the tradition itself shows. That means:

- **Depth:** the canon, its commentaries, word-by-word analysis, parallels, and reference works, all retrieved and cited.
- **Reach:** available wherever people use AI: Claude (desktop, web, phone, Code), Codex, ChatGPT, Gemini, code editors, and the MCP directories.
- **Trust:** every passage from a named source, every claim checkable, sources' wishes honoured.

## How we compare today

Based on the public documentation of these tools, reviewed November 2026. "Bible", "Quran" and "Sefaria" stand for the leading MCP tools of each tradition (for example StudyBible MCP, Quran.com MCP and tafsir-mcp, and Sefaria's own MCP).

| Capability | Pali Canon v2 | Bible | Quran | Sefaria |
|---|---|---|---|---|
| Complete scripture text | ✓ (whole Tipiṭaka) | ✓ | ✓ | ✓ |
| Works offline | ✓ | some | — | — |
| Exact citation lookup, many formats | ✓ | ✓ | ✓ | ✓ |
| Several numbering systems reconciled | ✓ | partly | — | partly |
| Scholarly page references (PTS) | ✓ | — | — | ✓ |
| Full-text search | ✓ | ✓ | ✓ | ✓ |
| Translations side by side | ✓ (English) | ✓ | ✓ | ✓ |
| Translations in many languages | — | ✓ | ✓ (100+) | partly |
| Dictionary | ✓ (live) | ✓ | ✓ | ✓ |
| Word-by-word analysis of the original | — | ✓ (Strong's) | ✓ (morphology) | partly |
| Commentaries | — | ✓ | ✓ (tafsir) | ✓ |
| Cross-references and parallels | link only | ✓ | partly | ✓ (link graph) |
| Topics | via Access to Insight index | ✓ | partly | ✓ |
| People and places | — | ✓ | — | partly |
| Original scripts | Roman only | ✓ | ✓ | ✓ |
| Quote verification | — | some | some | some |
| Calendar (prayer times, church year…) | — | some | ✓ | ✓ |
| Recitation and chanting | — | — | ✓ | — |
| Daily verse and reading plans | — | ✓ | ✓ | ✓ |
| Hosted, no-install version | — | some | ✓ | ✓ |
| Available in many AI apps | Claude only | ✓ | ✓ | ✓ |

**Where we already lead:** the whole canon offline, PTS page lookup across numbering schemes, mirrored translations, a published audit of every text, and respect for sources that ask not to be used in AI tools. Other Buddhist AI tools exist ([sources.md](sources.md#peer-projects)), but none we found offers commentaries, other scripts, a calendar or chanting.

## The plan

### Distribution: reach every major AI app

Distribution comes first, because it multiplies the value of everything else.

| Priority | Item | Issue |
|---|---|---|
| must | GitHub release v2.0.0 and automatic releases | [#2](https://github.com/DaniilKi/pali-canon-claude/issues/2) |
| must | CI on every change; nightly live-source check | [#3](https://github.com/DaniilKi/pali-canon-claude/issues/3) |
| must | npm package (`npx -y pali-canon-mcp`), needed by most other apps | [#4](https://github.com/DaniilKi/pali-canon-claude/issues/4) |
| must | Hosted endpoint for Claude on the web and phone, ChatGPT and directories | [#5](https://github.com/DaniilKi/pali-canon-claude/issues/5) |
| must | Privacy policy, terms, security policy | [#6](https://github.com/DaniilKi/pali-canon-claude/issues/6) |
| must | Claude connector directory | [#7](https://github.com/DaniilKi/pali-canon-claude/issues/7) |
| must | Codex plugin | [#9](https://github.com/DaniilKi/pali-canon-claude/issues/9) |
| must | Official MCP Registry and community directories | [#14](https://github.com/DaniilKi/pali-canon-claude/issues/14) |
| should | Claude Code marketplace submission | [#8](https://github.com/DaniilKi/pali-canon-claude/issues/8) |
| should | Codex quick setup | [#10](https://github.com/DaniilKi/pali-canon-claude/issues/10) |
| should | ChatGPT app | [#11](https://github.com/DaniilKi/pali-canon-claude/issues/11) |
| should | Gemini CLI and Antigravity extension | [#12](https://github.com/DaniilKi/pali-canon-claude/issues/12) |
| should | Cursor, VS Code, Windsurf, Zed, Cline, Goose | [#13](https://github.com/DaniilKi/pali-canon-claude/issues/13) |
| should | Documentation site, llms.txt, bulk export | [#18](https://github.com/DaniilKi/pali-canon-claude/issues/18) |
| should | Answers in Sinhala, Thai, Burmese, Khmer, Lao, Vietnamese, Chinese, Spanish… | [#19](https://github.com/DaniilKi/pali-canon-claude/issues/19) |
| nice | Skill hubs, local AI apps, Docker | [#15](https://github.com/DaniilKi/pali-canon-claude/issues/15), [#16](https://github.com/DaniilKi/pali-canon-claude/issues/16), [#17](https://github.com/DaniilKi/pali-canon-claude/issues/17) |

### v2.1: the study layer

| Priority | Item | Issue |
|---|---|---|
| must | Commentaries (Aṭṭhakathā) beside each sutta | [#20](https://github.com/DaniilKi/pali-canon-claude/issues/20) |
| must | Quote verification | [#24](https://github.com/DaniilKi/pali-canon-claude/issues/24) |
| must | Sinhala, Thai, Myanmar, Devanagari, Khmer, Lao and Lanna scripts | [#26](https://github.com/DaniilKi/pali-canon-claude/issues/26) |
| must | Confirm AI-use permission with every source | [#51](https://github.com/DaniilKi/pali-canon-claude/issues/51) |
| should | Find every citation in a block of text | [#25](https://github.com/DaniilKi/pali-canon-claude/issues/25) |
| should | Thai, Myanmar and VRI page references | [#27](https://github.com/DaniilKi/pali-canon-claude/issues/27) |
| should | Study-method skill | [#38](https://github.com/DaniilKi/pali-canon-claude/issues/38) |
| should | Uposatha calendar and festivals | [#42](https://github.com/DaniilKi/pali-canon-claude/issues/42), [#43](https://github.com/DaniilKi/pali-canon-claude/issues/43) |
| should | Accuracy evaluation suite; polish | [#48](https://github.com/DaniilKi/pali-canon-claude/issues/48), [#49](https://github.com/DaniilKi/pali-canon-claude/issues/49) |

### v2.2: words, topics and people

| Priority | Item | Issue |
|---|---|---|
| must | Word-by-word analysis (DPD) | [#22](https://github.com/DaniilKi/pali-canon-claude/issues/22) |
| should | Offline dictionary fallback | [#23](https://github.com/DaniilKi/pali-canon-claude/issues/23) |
| should | Sub-commentaries, Visuddhimagga, Abhidhammatthasaṅgaha | [#21](https://github.com/DaniilKi/pali-canon-claude/issues/21) |
| should | Topic index; index of numbered teachings | [#30](https://github.com/DaniilKi/pali-canon-claude/issues/30), [#31](https://github.com/DaniilKi/pali-canon-claude/issues/31) |
| should | People and places (DPPN) | [#32](https://github.com/DaniilKi/pali-canon-claude/issues/32) |
| should | Daily text and reading plans | [#45](https://github.com/DaniilKi/pali-canon-claude/issues/45) |
| should | More texts linked to English; data refresh pipeline | [#37](https://github.com/DaniilKi/pali-canon-claude/issues/37), [#50](https://github.com/DaniilKi/pali-canon-claude/issues/50) |

### v2.3: reach and depth

| Priority | Item | Issue |
|---|---|---|
| must | Parallels and cross-references | [#29](https://github.com/DaniilKi/pali-canon-claude/issues/29) |
| should | More English translators; translations in other languages | [#34](https://github.com/DaniilKi/pali-canon-claude/issues/34), [#35](https://github.com/DaniilKi/pali-canon-claude/issues/35) |
| nice | Commentary translations; edition variants; search by meaning | [#36](https://github.com/DaniilKi/pali-canon-claude/issues/36), [#28](https://github.com/DaniilKi/pali-canon-claude/issues/28), [#33](https://github.com/DaniilKi/pali-canon-claude/issues/33) |
| nice | Abhidhamma navigation; Vinaya with the *Buddhist Monastic Code*; grammar guide | [#39](https://github.com/DaniilKi/pali-canon-claude/issues/39), [#40](https://github.com/DaniilKi/pali-canon-claude/issues/40), [#41](https://github.com/DaniilKi/pali-canon-claude/issues/41) |
| nice | Chanting and paritta; Dhamma talks; memorisation | [#44](https://github.com/DaniilKi/pali-canon-claude/issues/44), [#46](https://github.com/DaniilKi/pali-canon-claude/issues/46), [#47](https://github.com/DaniilKi/pali-canon-claude/issues/47) |

## What we will not do

- **Use content from sources that ask to be kept out of AI tools**, starting with SuttaCentral's texts and translations.
- **Generate scripture.** Claude may explain and translate on request, clearly labelled as its own, but the tool never presents generated text as the canon or a published translation.
- **Rank traditions or teachers**, or give rulings on practice or monastic discipline.
- **Sell content** or put it behind a paywall. The texts' licences are non-commercial.
- **Collect user data.** No accounts, analytics or stored questions.
