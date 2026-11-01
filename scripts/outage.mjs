// Failover test: simulates outages of the online sources and checks that mirrors and offline text keep working.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const scenarios = [
  ['accesstoinsight.org', 'ATI site down'],
  ['accesstoinsight.org,raw.githubusercontent.com', 'ATI site + GitHub raw down'],
  ['www.dhammatalks.org', 'dhammatalks.org down'],
  ['www.dhammatalks.org,accesstoinsight.org,raw.githubusercontent.com,cdn.jsdelivr.net,www.dpdict.net', 'everything online down'],
];
for (const [hosts, label] of scenarios) {
  const client = new Client({ name: 'outage', version: '1' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: ['server/index.cjs'], env: { ...process.env, PALI_CANON_SIMULATE_OUTAGE: hosts } }));
  const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 }); const d = JSON.parse(r.content[0].text); return { err: r.isError, d }; };
  console.log(`\n### ${label}`);
  let r = await call('get_translation', { uid: 'AN 3.65', translation: 'ati:/tipitaka/an/an03/an03.065.than' });
  console.log(' ATI translation  :', r.err ? 'ERROR ' + r.d.error.slice(0, 120) : `ok via ${r.d.fetched_from}; ${r.d.notes.join(' ').slice(0, 90)}`);
  r = await call('get_translation', { uid: 'MN 10' });
  console.log(' default (Ṭhān.)  :', r.err ? 'ERROR ' + r.d.error.slice(0, 120) : `ok via ${r.d.fetched_from} (${r.d.source}); ${r.d.notes.join(' ').slice(0, 110)}`);
  r = await call('get_text', { uid: 'SN 56.11', limit: 2 });
  console.log(' Pāli text        :', r.err ? 'ERROR' : `ok, ${r.d.total_segments} segments (offline)`);
  r = await call('search_access_to_insight', { query: 'metta', limit: 2 });
  console.log(' ATI search       :', r.err ? 'ERROR ' + r.d.error.slice(0, 120) : `ok ${r.d.results.length} results ${r.d.note || ''}`);
  r = await call('lookup_pali', { word: 'metta' });
  console.log(' dictionary       :', r.err ? 'ERROR ' + r.d.error.slice(0, 140) : 'ok');
  await client.close();
}
