// Link-rot check: opens the translation links in server/data/translations.json and reports dead ones.
// Every request goes through src/http.mjs (same allowlist, User-Agent, size limit and redirect rules as the server),
// one at a time with a pause between requests, so the sites are not hammered.
//
//   node scripts/linkcheck.mjs              check today's rotating sample (default 250 links; all links are covered every few days)
//   node scripts/linkcheck.mjs --all        check every link
//   node scripts/linkcheck.mjs --limit 50 --delay 2000 --day 3
//
// Exits non-zero when a link is dead (HTTP 404/410), is refused by the allowlist, or when every checked link on a
// host was unreachable (the host looks down). A single network hiccup is only a warning.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fetchPublic, fetchMirrors } from '../src/http.mjs';
import { atiMirrors } from '../src/english.mjs';

/** Unique links from translations.json, sorted so the daily rotation is stable. */
export function collectLinks(translations) {
  const byUrl = new Map();
  for (const [uid, entries] of Object.entries(translations)) {
    for (const entry of entries) {
      if (!entry.url) continue;
      const known = byUrl.get(entry.url);
      if (known) known.uids.push(uid);
      else byUrl.set(entry.url, { url: entry.url, path: entry.path, source: entry.source, uids: [uid] });
    }
  }
  return [...byUrl.values()].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}

/** The slice for a given day: consecutive days walk through the whole list, wrapping around. */
export function dailySample(items, limit, day) {
  if (!limit || limit >= items.length) return items.slice();
  const start = ((day * limit) % items.length + items.length) % items.length;
  return Array.from({ length: limit }, (_, i) => items[(start + i) % items.length]);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function option(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
}

async function main() {
  const translations = JSON.parse(await readFile(new URL('../server/data/translations.json', import.meta.url), 'utf8'));
  const links = collectLinks(translations);
  const all = process.argv.includes('--all');
  const limit = all ? 0 : option('--limit', 250);
  const delay = option('--delay', 1000);
  const day = option('--day', Math.floor(Date.now() / 86400000));
  const sample = dailySample(links, limit, day);
  console.log(`Checking ${sample.length} of ${links.length} translation links (${all ? 'all' : `day ${day} sample`}), ${delay} ms apart.`);

  const dead = [];
  const unreachable = [];
  const hosts = new Map();
  for (const [i, link] of sample.entries()) {
    if (i > 0) await wait(delay);
    const host = new URL(link.url).hostname;
    const stats = hosts.get(host) ?? { checked: 0, unreachable: 0 };
    stats.checked += 1;
    hosts.set(host, stats);
    try {
      await fetchPublic(link.url, { json: false, retries: 1, timeout: 20000 });
      continue;
    } catch (error) {
      const where = `${link.url} (${link.uids.slice(0, 3).join(', ')}${link.uids.length > 3 ? ', …' : ''})`;
      if (error.status === 404 || error.status === 410) {
        dead.push(`${where}: HTTP ${error.status}`);
        console.log(`DEAD ${where}: HTTP ${error.status}`);
      } else if (error.status === 0 && error.retryable === false) {
        dead.push(`${where}: ${error.message}`);
        console.log(`DEAD ${where}: ${error.message}`);
      } else {
        stats.unreachable += 1;
        // For Access to Insight, say whether the page is still served by a mirror (readers would still get the text).
        let mirror = '';
        if (link.source === 'ati' && link.path) {
          try {
            const r = await fetchMirrors(atiMirrors(link.path).slice(1), { timeout: 15000 });
            mirror = `; mirror ok (${new URL(r.url).hostname})`;
          } catch { mirror = '; mirrors failed too'; }
        }
        unreachable.push(`${where}: ${error.message}${mirror}`);
        console.log(`WARN ${where}: ${error.message}${mirror}`);
      }
    }
  }

  const downHosts = [...hosts].filter(([, s]) => s.checked > 0 && s.unreachable === s.checked).map(([h]) => h);
  console.log(`\nChecked ${sample.length}: ${sample.length - dead.length - unreachable.length} ok, ${dead.length} dead, ${unreachable.length} unreachable.`);
  for (const [host, s] of hosts) console.log(` ${host}: ${s.checked} checked, ${s.unreachable} unreachable`);
  if (dead.length || downHosts.length) {
    console.error(`\nLINK CHECK FAILED:`);
    for (const d of dead) console.error(` - dead: ${d}`);
    for (const h of downHosts) console.error(` - ${h}: every checked link was unreachable (site down?)`);
    process.exitCode = 1;
  } else {
    console.log('\nLink check passed: no dead links in this sample.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
