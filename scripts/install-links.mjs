// One-click install links for editors and agent apps (docs/install/ide.md, README buttons).
// Run `node scripts/install-links.mjs` to print them; tests/core.test.mjs checks the docs match.
//
// Formats, checked against each product's documentation (November 2026):
// - Cursor: cursor://anysphere.cursor-deeplink/mcp/install?name=NAME&config=BASE64(JSON of the server object)
//   https://cursor.com/docs/context/mcp/install-links
// - VS Code: vscode:mcp/install?URLENCODED(JSON with "name") ; Insiders uses vscode-insiders:
//   https://code.visualstudio.com/api/extension-guides/ai/mcp
// - Goose: goose://extension?cmd=npx&arg=...&arg=...&id=&name=&description=&timeout=
//   https://github.com/aaif-goose/goose/blob/main/documentation/docs/getting-started/using-extensions.md
// GitHub strips custom-scheme links (cursor:, vscode:, goose:) from Markdown, so README buttons
// go through https pages that hand off to the app: cursor.com/en/install-mcp and vscode.dev/redirect.

import { pathToFileURL } from 'node:url';

export const SERVER_NAME = 'pali-canon';
export const PACKAGE = 'pali-canon-mcp';
export const COMMAND = 'npx';
export const ARGS = ['-y', PACKAGE];
export const DESCRIPTION = 'The Pali Canon: read and cite the Tipitaka, with translations and a Pali dictionary';

export function installLinks() {
  const cursorConfig = { command: COMMAND, args: ARGS };
  const cursorB64 = Buffer.from(JSON.stringify(cursorConfig)).toString('base64');
  const cursorQuery = `name=${encodeURIComponent(SERVER_NAME)}&config=${encodeURIComponent(cursorB64)}`;

  const vscodeConfig = { name: SERVER_NAME, type: 'stdio', command: COMMAND, args: ARGS };
  const vscodeJson = encodeURIComponent(JSON.stringify(vscodeConfig));
  const vscode = `vscode:mcp/install?${vscodeJson}`;
  const vscodeInsiders = `vscode-insiders:mcp/install?${vscodeJson}`;

  const goose = 'goose://extension?' + [
    `cmd=${COMMAND}`,
    ...ARGS.map((a) => `arg=${encodeURIComponent(a)}`),
    `id=${encodeURIComponent(SERVER_NAME)}`,
    `name=${encodeURIComponent('Pali Canon')}`,
    `description=${encodeURIComponent(DESCRIPTION)}`,
    'timeout=300',
  ].join('&');

  return {
    cursor: `cursor://anysphere.cursor-deeplink/mcp/install?${cursorQuery}`,
    cursorWeb: `https://cursor.com/en/install-mcp?${cursorQuery}`,
    vscode,
    vscodeInsiders,
    vscodeWeb: `https://vscode.dev/redirect?url=${encodeURIComponent(vscode)}`,
    vscodeInsidersWeb: `https://vscode.dev/redirect?url=${encodeURIComponent(vscodeInsiders)}`,
    vscodeCli: `code --add-mcp '${JSON.stringify(vscodeConfig)}'`,
    goose,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const [key, value] of Object.entries(installLinks())) console.log(`${key}\n${value}\n`);
}
