# Glama

Glama (https://glama.ai/mcp/servers) is a large MCP directory. It finds public GitHub repositories on its own and gives each a quality score. awesome-mcp-servers entries usually show Glama's score badge, so do this before the awesome-mcp-servers pull request.

## What is already prepared

- [`glama.json`](../../glama.json) at the top of the repository lists `DaniilKi` as maintainer. Glama uses this file to let us claim the listing (schema: https://glama.ai/mcp/schemas/server.json).

## Steps (a maintainer does these)

1. Go to https://glama.ai/mcp/servers and search for `pali-canon-claude`.
   - If it is listed, open it and press **Claim**. Sign in with the DaniilKi GitHub account.
   - If it is not listed, use the add-server option on the same page and give the repository URL: https://github.com/DaniilKi/pali-canon-claude
2. Fill in from the [shared facts](README.md#shared-facts-use-the-same-words-everywhere): name, one-line and long description, keywords, icon URL.
3. If Glama asks how to start the server: `npx -y pali-canon-mcp` (stdio, no environment variables), once npm is live (#4).
4. Note the listing URL (expected: `https://glama.ai/mcp/servers/DaniilKi/pali-canon-claude`) in the status table in [README.md](README.md) and check the badge link in [awesome-mcp-servers.md](awesome-mcp-servers.md).

If claiming fails, Glama's advice is to check that `glama.json` is valid JSON and names the GitHub user, then run the claim again.
