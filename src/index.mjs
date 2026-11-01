// Stdio entry point (Claude Desktop, Claude Code, local clients). Tools, prompts and resources
// are registered in server.mjs, which the HTTP entry (http-server.mjs) shares.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.mjs';

createServer().connect(new StdioServerTransport()).catch((error) => {
  console.error(`Pali Canon MCP failed to start: ${error.message}`);
  process.exitCode = 1;
});
