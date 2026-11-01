# mcp.so

mcp.so is a community MCP directory. Submission is a web form at https://mcp.so/submit (sign-in needed). The site also takes requests as GitHub issues at https://github.com/chatmcp/mcpso/issues.

## Form fields

| Field | Value |
|---|---|
| Type | MCP Server |
| Name | Pali Canon |
| URL | https://github.com/DaniilKi/pali-canon-claude |
| Server config | see below |

Description, keywords and icon: use the [shared facts](README.md#shared-facts-use-the-same-words-everywhere).

Server config (works once npm is live, #4):

```json
{
  "mcpServers": {
    "pali-canon": {
      "command": "npx",
      "args": ["-y", "pali-canon-mcp"]
    }
  }
}
```
