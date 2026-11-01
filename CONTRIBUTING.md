# Contributing

Keep the project small and source-grounded. Open an issue or pull request for broken references, provider changes, or useful study workflows. Include the tool, sanitized arguments, expected source URL and observed result. Never include tokens, private conversations or account files.

Use Node 20+, run `npm ci`, make the change, then `npm run check` and `npm run smoke`. Run `npm run smoke -- --live` when changing retrieval behavior; this sends public example queries to the sources. Rebuild and commit `server/` so plugin users do not need a development install. `npm run pack:desktop` produces the desktop bundle in `dist/`.

Do not copy third-party implementation or corpus data without compatible permission. Preserve fetched text attribution and its own license. New providers need an exact public source, useful bounded retrieval, source-specific rights and a focused live check. A public API should be preferred over a new scraper or database.

For releases, keep the versions in `package.json`, `package-lock.json`, `manifest.json`, `.claude-plugin/plugin.json` and `src/index.mjs` consistent. Build, validate the plugin, package the desktop extension and attach the `.mcpb`, optional npm `.tgz` and checksums to the tagged GitHub release. A GitHub release does not constitute acceptance into Anthropic's directory.
