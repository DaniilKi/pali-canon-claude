// Install-only audit instrumentation. Never imported by the production server.
import { readFile } from 'node:fs/promises';

/** Record before a synthetic provider returns, independently of stderr delivery. */
export function fetchRecorderSource(path) {
  return `const fixtureEvent=entry=>require('node:fs').appendFileSync(${JSON.stringify(path)},JSON.stringify(entry)+'\\n');
const recordSyntheticFetch=url=>{fixtureEvent({kind:'fetch',url});console.error('SYNTHETIC_FETCH '+url)};
const rejectUnexpectedNetwork=()=>{fixtureEvent({kind:'unexpected'});console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};`;
}

/** Missing, malformed or unknown evidence fails rather than implying zero requests. */
export async function readFetchLedger(path) {
  const text = await readFile(path, 'utf8');
  if (text && !text.endsWith('\n')) throw Error('Incomplete synthetic fetch ledger');
  return text.split('\n').filter(Boolean).map(line => {
    const row = JSON.parse(line);
    if (!row || !['fetch', 'unexpected'].includes(row.kind)
      || (row.kind === 'fetch' && (typeof row.url !== 'string' || !row.url))
      || Object.keys(row).some(key => !['kind', 'url'].includes(key))) throw Error('Invalid synthetic fetch ledger event');
    return row;
  });
}
