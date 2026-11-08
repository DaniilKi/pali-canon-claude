// Failover test: simulates outages of the online sources and checks that mirrors and offline text keep working.
// Exits non-zero when a result is not what the failover design promises (the nightly workflow relies on this):
// with one site down every call must still succeed through a mirror; with everything down the offline Pāli
// text and the bundled dictionary subset must still work and every other online call must fail cleanly with an
// error message, not crash.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ALLOWED_HOSTS } from '../src/http.mjs';
import { outageError } from './outage-diagnostics.mjs';
const scenarios = [
  ['accesstoinsight.org', 'ATI site down'],
  ['accesstoinsight.org,raw.githubusercontent.com', 'ATI site + GitHub raw down'],
  ['www.dhammatalks.org', 'dhammatalks.org down'],
  // Every allowlisted host, so the result does not depend on which host variant (www or not) a call or redirect uses.
  [ALLOWED_HOSTS.join(','), 'everything online down', true],
];
const failures = [];
// online: the call needs the network. In a total outage it must report an error; otherwise it must succeed.
function expect(label, what, r, { online = true, total = false } = {}) {
  const wantError = online && total;
  if (r.err !== wantError) failures.push(`${label}: ${what} ${r.err ? 'failed' : 'succeeded'} but should have ${wantError ? 'failed cleanly' : 'succeeded'}`);
}
for (const [hosts, label, total = false] of scenarios) {
  const client = new Client({ name: 'outage', version: '1' });
  try {
    await client.connect(new StdioClientTransport({ command: process.execPath, args: ['server/index.cjs'], env: { ...process.env, PALI_CANON_SIMULATE_OUTAGE: hosts } }));
    const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }, undefined, { timeout: 180000 }); const d = JSON.parse(r.content[0].text); return { err: Boolean(r.isError), d }; };
    console.log(`\n### ${label}`);
    let r = await call('get_translation', { uid: 'AN 3.65', translation: 'ati:/tipitaka/an/an03/an03.065.than' });
    console.log(' ATI translation  :', r.err ? 'ERROR ' + outageError(r.d.error) : `ok via ${r.d.fetched_from}; ${r.d.notes.join(' ').slice(0, 90)}`);
    expect(label, 'ATI translation', r, { total });
    r = await call('get_translation', { uid: 'MN 10' });
    console.log(' default (Ṭhān.)  :', r.err ? 'ERROR ' + outageError(r.d.error) : `ok via ${r.d.fetched_from} (${r.d.source}); ${r.d.notes.join(' ').slice(0, 110)}`);
    expect(label, 'default translation', r, { total });
    r = await call('get_text', { uid: 'SN 56.11', limit: 2 });
    console.log(' Pāli text        :', r.err ? 'ERROR' : `ok, ${r.d.total_segments} segments (offline)`);
    expect(label, 'offline Pāli text', r, { online: false });
    r = await call('search_access_to_insight', { query: 'metta', limit: 2 });
    // Keep every index/mirror error: the old 120-character prefix hid the CDN failure in #107.
    console.log(' ATI search       :', r.err ? 'ERROR ' + outageError(r.d.error) : `ok ${r.d.results.length} results ${r.d.note || ''}`);
    if (!r.err) console.log(' ATI index sources:', JSON.stringify(r.d.index_sources));
    expect(label, 'ATI search', r, { total });
    r = await call('lookup_pali', { word: 'metta' });
    console.log(' dictionary       :', r.err ? 'ERROR ' + outageError(r.d.error) : `ok${r.d.offline ? ` (offline DPD ${r.d.dictionary.version}, ${r.d.entries.length} entries)` : ''}`);
    // The dictionary falls back to the bundled DPD subset (#23), so it must answer even in a total outage,
    // labelled as offline, with entries and the DPD licence.
    expect(label, 'dictionary', r, { online: false });
    if (total && !r.err && !(r.d.offline && r.d.entries.length && r.d.license?.name === 'CC BY-NC-SA 4.0' && /unreachable/.test(r.d.note || ''))) {
      failures.push(`${label}: dictionary fallback is not labelled offline with entries and the DPD licence`);
    }
  } catch (error) {
    failures.push(`${label}: crashed (${error.message})`);
  } finally {
    await client.close().catch(() => {});
  }
}
if (failures.length) {
  console.error(`\nOUTAGE CHECK FAILED (${failures.length}):\n${failures.map((f) => ` - ${f}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nOutage check passed: mirrors and offline text behave as designed.');
}
