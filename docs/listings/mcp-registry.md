# Official MCP Registry

The official registry is at https://registry.modelcontextprotocol.io. It stores only a description of the server: the [`server.json`](../../server.json) file at the top of this repository. The program itself comes from npm. Other directories copy from this registry, so it is the most important listing.

Publishing guide: https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx

## What is already prepared

- [`server.json`](../../server.json), checked against the official schema of 2025-12-11 (https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json).
- The registry name `io.github.DaniilKi/pali-canon`. It starts with `io.github.DaniilKi/` so that signing in with the DaniilKi GitHub account proves we own it. The capital letters matter: the registry compares names letter for letter, including case ([registry issue #689](https://github.com/modelcontextprotocol/registry/issues/689)), and the GitHub login is `DaniilKi`.
- The icon at [`assets/icon.svg`](../../assets/icon.svg).
- A check: `node scripts/check-server-json.mjs --publish` lists anything still missing before publishing. Without `--publish`, the same check runs in the test suite.

## The hosted entry is a placeholder

`server.json` has a `remotes` entry whose address is `https://PLACEHOLDER-hosted-endpoint-issue-5.invalid/mcp`. The `.invalid` ending can never be a real website. It marks where the hosted address goes once [#5](https://github.com/DaniilKi/pali-canon-claude/issues/5) is live. **Do not publish it as it is.** Before publishing, either:

- replace the address with the live hosted URL (it must answer publicly), or
- delete the whole `"remotes": [...]` block and publish the npm entry alone.

The `--publish` check refuses to pass while the placeholder is there.

## Steps (a maintainer does these)

1. Make sure `pali-canon-mcp` is on npm at the same version as `server.json` (#4), and that the published `package.json` contains:

   ```json
   "mcpName": "io.github.DaniilKi/pali-canon"
   ```

   The registry reads this field from npm to confirm the package is ours.
2. Run `node scripts/check-server-json.mjs --publish`. It must say `server.json: OK (ready to publish)`.
3. Install `mcp-publisher`. On Windows (PowerShell), from the guide above:

   ```powershell
   $arch = if ([System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture -eq "Arm64") { "arm64" } else { "amd64" }; Invoke-WebRequest -Uri "https://github.com/modelcontextprotocol/registry/releases/latest/download/mcp-publisher_windows_$arch.tar.gz" -OutFile "mcp-publisher.tar.gz"; tar xf mcp-publisher.tar.gz mcp-publisher.exe; rm mcp-publisher.tar.gz
   ```

4. In the repository folder:

   ```sh
   mcp-publisher validate
   mcp-publisher login github     # GitHub device sign-in: sign in as DaniilKi
   mcp-publisher publish
   ```

5. Confirm the listing:

   ```sh
   curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=pali-canon"
   ```

## Every release after that

Each release needs a new registry version. Bump `version` and `packages[0].version` in `server.json` together with the other version fields (see Releasing in [docs/development.md](../development.md#releasing)); the test suite fails if they drift apart. Publish to npm first, then run `mcp-publisher publish`. This can later move into the release workflow with GitHub OIDC (`mcp-publisher login github-oidc`); see the registry's [GitHub Actions guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/github-actions.mdx).

## Optional later: the `.mcpb` bundle

The registry also accepts the Claude Desktop bundle from a GitHub release (`registryType: "mcpb"`, with the file's SHA-256 in `fileSha256`). Add it once releases carry the `.mcpb` file ([#2](https://github.com/DaniilKi/pali-canon-claude/issues/2)).
