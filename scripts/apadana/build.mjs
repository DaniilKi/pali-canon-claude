#!/usr/bin/env node
/** Reproduce metadata-only pins. No translated body, note or publisher preface is written. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { gunzipSync } from 'node:zlib';
import { readBundled } from '../../src/bundled-data.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_VRI_COMMIT, APADANA_RIGHTS, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR } from '../../src/apadana-profiles.mjs';
import { digest, rootDigest, parseApadana } from '../../src/apadana.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
const source = option('--source'), live = args.includes('--live'), check = args.includes('--check');
const output = resolve(option('--out') || join(root, 'server/data/apadana.json'));
const same = (a, b, label) => { if (a !== b) throw Error(`Pinned Apadāna ${label} differs; renewed source review required.`); };
if (!source && !live) throw Error('Use --source <official pinned checkout> or --live. No floating refs or substitute sources.');
if (source) same(execFileSync('git', ['-C', resolve(source), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), APADANA_COMMIT, 'commit');
async function read(path) {
  if (!live) return readFileSync(join(resolve(source), path), 'utf8');
  const url = `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/${path}`;
  const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw Error(`Official pinned source HTTP ${res.status}: ${path}`);
  return res.text();
}
// Read the bundled root directly: canon.load() merges this manifest and must not be a builder input.
const canon = JSON.parse(gunzipSync(readBundled(join(root, 'server/data/canon.json.gz'))));
same(canon.source.commit, APADANA_VRI_COMMIT, 'root revision');
const rights = [];
for (const artifact of APADANA_RIGHTS) {
  const text = await read(artifact.path);
  same(digest(text), artifact.sha256, `rights/routing artifact ${artifact.path}`);
  rights.push({ ...artifact });
}
const links = {};
for (const [id, p] of Object.entries(APADANA_PROFILES)) {
  const path = `src/_poems/chapter-4/poem-${String(p.poem).padStart(3, '0')}.md`;
  const raw = await read(path), extracted = parseApadana(raw, p), u = canon.units.find(u => u.id === id);
  same(digest(raw), p.raw_sha256, `${id} raw`);
  same(digest(extracted.text), p.body_sha256, `${id} body`);
  same(digest(JSON.stringify(extracted.translator_notes)), p.notes_sha256, `${id} notes`);
  same(digest(extracted.publisher_paratext), p.paratext_sha256, `${id} paratext`);
  same(rootDigest(u, canon.books[u.book]), p.root_sha256, `${id} complete root`);
  same(extracted.title, p.title, `${id} publisher title`);
  const rootNumbers = canon.books[u.book].blocks.slice(u.start, u.end).filter(b => b[0] === 'hangnum').map(b => Number(b[1]));
  same(JSON.stringify(rootNumbers), JSON.stringify(Array.from({ length: p.verses[1] - p.verses[0] + 1 }, (_, i) => p.verses[0] + i)), `${id} complete stanza range`);
  links[id] = { ...p, english: p.title, match: 'individually-reviewed-whole-poem' };
}
const manifest = {
  version: 1,
  source: { name: 'Legends of the Buddhist Saints (Apadāna)', site: 'https://apadanatranslation.com/', repository: 'https://github.com/apadana-translation/apadana-site', commit: APADANA_COMMIT,
    translator: APADANA_TRANSLATOR, publisher: 'Jonathan S. Walters and Whitman College', license: APADANA_LICENSE, license_url: APADANA_LICENSE_URL,
    notice_url: 'https://apadanatranslation.com/about/', checked: '2026-11-19', rights_artifacts: rights,
    rights_note: 'Explicit translation grant in About, LICENSE.md, footer and ePub metadata is CC BY-NC-SA 4.0. Conflicting generic CC-BY site.json does not relax those terms. No warranty or endorsement is implied.',
    policy: 'Live only, seven finite whole-poem mappings; bundle metadata and hashes only, never translation bodies, notes or prefaces. Complete raw/body/notes/paratext/root pins fail closed on drift. Publisher PTS/BJTS recension is not silently substituted for VRI.' },
  vri_commit: APADANA_VRI_COMMIT,
  held: { 'thi-ap4': 'Bundled VRI unit also owns the next heading and stanza37 (blocks6629–6651); poem4 alone is not its whole unit.',
    'thi-ap5': 'Bundled VRI unit starts at stanza38 (blocks6651–6675); publisher poem5 starts37. Repair/review ownership separately, not by loosening whole coverage.',
    'thi-ap10': 'Separate chapter summary and its note8 need independent selection and root-scope review. 601 publisher poems do not establish 603 VRI-unit coverage.' },
  links,
};
const serialized = JSON.stringify(manifest, null, 2) + '\n';
if (check) same(readFileSync(output, 'utf8'), serialized, 'bundled manifest');
else writeFileSync(output, serialized);
console.log(JSON.stringify({ mode: live ? 'live official pinned artifacts' : 'local official pinned checkout', check, source_commit: APADANA_COMMIT, roots: Object.keys(links), rights_artifacts: rights.length, bundled_translation_bodies: 0, pins: Object.fromEntries(Object.entries(links).map(([id, p]) => [id, { raw: p.raw_sha256, body: p.body_sha256, notes: p.notes_sha256, paratext: p.paratext_sha256, root: p.root_sha256 }])) }, null, 2));
