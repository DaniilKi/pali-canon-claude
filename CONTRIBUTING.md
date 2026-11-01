# Contributing

Thank you for helping. This project aims to be a trustworthy library of Theravāda texts for the age of AI, so care with sources matters more than speed.

## Ways to help, no programming needed

- **Report a wrong citation or translation link.** [Open an issue](https://github.com/DaniilKi/pali-canon-claude/issues) with the citation you used, what you expected (ideally with a PTS page such as "M i 55") and what you got.
- **Suggest a source.** Tell us about an edition, translation, dictionary or reference work, with its licence. We check every source against the five tests in [docs/sources.md](docs/sources.md#how-we-choose-sources).
- **Review in your language.** Native speakers of Sinhala, Thai, Burmese, Khmer, Lao, Vietnamese and other languages are needed for scripts and translated instructions (issues labelled [help wanted](https://github.com/DaniilKi/pali-canon-claude/labels/help%20wanted)).
- **Scholars and monastics:** help check commentary alignment, numbering notes and the study-method guidance.
- **Pick up a roadmap item.** See [#52](https://github.com/DaniilKi/pali-canon-claude/issues/52) and [docs/roadmap.md](docs/roadmap.md).

## Code contributions

Read [AGENTS.md](AGENTS.md) (the rules and full context, for humans and AI agents alike) and [docs/development.md](docs/development.md). In short:

```sh
npm ci
npm run check            # build + unit tests + audit of all 8,544 texts (must pass)
npm run smoke            # MCP protocol (add -- --live for network sources)
npm run outage           # mirror failover
```

- Commit the rebuilt `server/` (including `server/data/`) so plugin users never need a development install.
- Add a regression test for every bug you fix.
- To rebuild the canon data, follow [scripts/canon/README.md](scripts/canon/README.md); the validator must report 0 problems and the audit 0 failures.
- Keep the documentation in step: [README.md](README.md), [docs/coverage.md](docs/coverage.md) (`npm run coverage`), [docs/sources.md](docs/sources.md), and a new entry in [docs/decisions.md](docs/decisions.md) for any significant decision.

## Source rules

- Do not add SuttaCentral content retrieval. SuttaCentral asks that its work not be used in AI tools; we link to it instead.
- New providers need a public source, terms that permit this use, bounded retrieval, an allowlist entry, a live check and an outage case.
- Never generate or reconstruct scripture, and never substitute one translation for another silently.

## Releases

Keep the versions in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json` and `src/index.mjs` in step, run every check, package the desktop extension and attach the `.mcpb` with checksums to the tagged GitHub release. Details: [docs/development.md](docs/development.md#releasing).
