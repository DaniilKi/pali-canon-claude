# Smithery

Smithery (https://smithery.ai) lists servers and installs them into many AI apps. Publishing guide: https://smithery.ai/docs/build/publish. Smithery takes two kinds of server:

- **Local (stdio)**: a prebuilt `.mcpb` bundle that people download and run on their own computer. This fits us today.
- **Remote (URL)**: a public Streamable HTTP address. This fits once the hosted version is live ([#5](https://github.com/DaniilKi/pali-canon-claude/issues/5)). Smithery does not host it for us.

## Steps for the local bundle (a maintainer does these)

1. Build the bundle: `npm run pack:desktop` makes the `.mcpb` file in `dist/` (or take the `.mcpb` from the GitHub release, [#2](https://github.com/DaniilKi/pali-canon-claude/issues/2)).
2. Go to https://smithery.ai/new and sign in, or use the Smithery CLI:

   ```sh
   smithery mcp publish ./dist/<file>.mcpb -n DaniilKi/pali-canon
   ```

   Use the real file name from `dist/`.
3. Fill in the page from the [shared facts](README.md#shared-facts-use-the-same-words-everywhere). No configuration is needed: the server takes no settings and no API key.
4. Optional: open **Settings → Verification** on the server page and complete the checklist.

## Later: the hosted URL

When #5 is live, publish the hosted address too: `smithery mcp publish "<hosted URL>" -n DaniilKi/pali-canon`, or the URL option on https://smithery.ai/new. The server needs no sign-in, so Smithery's automatic scan should read the tools by itself.
