# Contributing

Keep the project small and source-grounded. Open an issue or pull request for a citation that resolves wrongly, a broken translation link, or a useful study workflow. Include the citation you used, the result you expected (ideally with a PTS page) and what you got.

Use Node 20+. Run `npm ci`, make the change, then:

```sh
npm run check            # build + unit tests
node scripts/audit.mjs   # exhaustive offline audit of all 8,541 texts
npm run smoke            # MCP protocol (add -- --live for network sources)
node scripts/outage.mjs  # mirror failover
```

Commit the rebuilt `server/` (including `server/data/`) so plugin users never need a development install. To rebuild the canon data from newer VRI corrections, follow [scripts/canon/README.md](scripts/canon/README.md) and re-run the validator and audit before committing.

Respect source wishes and licences. Do not add SuttaCentral content retrieval: SuttaCentral asks that its work not be used in AI tools. New providers need a public source, terms that permit this use, bounded retrieval and a focused live check.

For releases, keep the versions in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json` and `src/index.mjs` in step. Then build, run all checks, package the desktop extension and attach the `.mcpb` with checksums to the tagged GitHub release.
