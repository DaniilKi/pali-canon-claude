// Publisher bodies stay outside the repository. Actual-source tests opt into a pinned local checkout.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { getAtiText, translationCoverage } from '../src/providers.mjs';
import { liveCache } from '../src/cache.mjs';
import { readBundled } from '../src/bundled-data.mjs';
import { plainText } from '../src/http.mjs';
import { extractAtiSection } from '../src/ati-sections.mjs';
import { sectionHash, reviewedSectionLink, retainedAnMindShared, assertRegisteredSection, validateSectionRegistry } from '../src/ati-section-registry.mjs';
import { AN_MIND_SECTION_PROFILE, AN_MIND_SECTION_PATH, AN_MIND_SHARED_LINK_SHA256, AN_TEN_SECTION_PROFILE, ATI_RETAINED_SHARED_BINDINGS } from '../src/ati-section-profiles.mjs';
import { buildIndex, toCsv, CSV_COLUMNS } from '../scripts/export-index.mjs';
import { buildCoverage } from '../scripts/coverage.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(stable(value[key]))])) : value);
const hash = value => createHash('sha256').update(value).digest('hex');
const registry = JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json', 'utf8'));
const rows = registry.links.filter(row => row.section.profile === AN_MIND_SECTION_PROFILE);
const ids = Array.from({ length: 20 }, (_, i) => 'an1.' + (i + 21));
const bare = 'ati:' + AN_MIND_SECTION_PATH;
const exact = row => bare + '#' + row.anchor;
const target = row => canon.load().byId.get(row.unit_id);
const sourceRoot = process.env.PALI_ATI_SECTIONS_SOURCE_DIR;
const source = () => readFileSync(join(sourceRoot, AN_MIND_SECTION_PATH.slice(1) + '.html'), 'utf8');
const oldFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = oldFetch; liveCache.clear(); });
const legacyLink = () => canon.load().translations['an1.21'].find(link => link.shared_scope && link.path === AN_MIND_SECTION_PATH);
const validate = (r = registry, translations = canon.load().translations, corpus = canon.load().canon) => validateSectionRegistry(r, corpus, translations, unit => canon.segmentsFromCorpus(unit, corpus));

/** Independent literal paragraph selection, without the implementation's section extractor. */
function sourceTreatments(raw) {
  const chunk = english.atiContent(raw), paragraphs = [...chunk.matchAll(/<p>([^]*?)<\/p>/g)];
  assert.equal(paragraphs.length, 20);
  return paragraphs.map((paragraph, i) => {
    const number = i + 21, prefix = `<a id="sutta-${number}">${number}</a>.`;
    assert.ok(paragraph[1].startsWith(prefix));
    const body = plainText(paragraph[1].slice(prefix.length));
    assert.ok(body.startsWith('"I don\'t envision a single thing')); assert.doesNotMatch(body, /<|>/);
    return { number, text: body, paragraph: paragraph[0] };
  });
}
function provider(raw = source()) {
  const fetched = [];
  globalThis.fetch = async url => { fetched.push(String(url)); assert.equal(new URL(url).pathname, AN_MIND_SECTION_PATH + '.html'); assert.equal(new URL(url).hash, ''); return new Response(raw, { status: 200 }); };
  return fetched;
}

test('twenty actual numbered members preserve all fifteen old whole profiles, all older partial descriptors and the complete Pali corpus', () => {
  assert.equal(rows.length, 20); assert.deepEqual(rows.map(row => row.unit_id), ids);
  assert.equal(new Set(rows.map(exact)).size, 20);
  const old = registry.links.filter(row => row.section.profile !== AN_MIND_SECTION_PROFILE && row.section.profile !== AN_TEN_SECTION_PROFILE);
  assert.equal(old.length, 15); assert.equal(hash(stable(old)), '643441453f30c256abcde307267aebbcd8097e6aeed450186dfed7ce2173cb73');
  const partial = JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json', 'utf8')).links;
  assert.equal(hash(stable(partial.slice(0, 21))), 'eae9f955ef6f31a7fb56874ce67f72f78b69cacc319415d1ae58585e2586c212');
  assert.equal(hash(readBundled('server/data/canon.json.gz')), '130d2b68e7b1c678d7ae765239f6c96e854c4d17f9d08315a19e75a4e32009f3');
  assert.deepEqual(registry, JSON.parse(readFileSync('server/data/reviewed-ati-sections.json', 'utf8')));
  assert.doesNotThrow(() => validate());
});

test('printed N labels remain distinct from the parent page title and complete original root/ordinal/chapter metadata', () => {
  const ordinals = ['Paṭhamaṃ.', 'Dutiyaṃ.', 'Tatiyaṃ.', 'Catutthaṃ.', 'Pañcamaṃ.', 'Chaṭṭhaṃ.', 'Sattamaṃ.', 'Aṭṭhamaṃ.', 'Navamaṃ.', 'Dasamaṃ.'];
  for (const [i, row] of rows.entries()) {
    const n = i + 21, u = target(row), segments = canon.segments(u), at = n === 21 || n === 31 ? 1 : 0, body = segments[at];
    assert.equal(row.anchor, 'sutta-' + n); assert.equal(row.section.heading, n + '.');
    assert.equal(row.english_title, 'Ekadhamma Suttas: A Single Thing'); assert.notEqual(row.section.heading, row.source_reference);
    assert.equal(row.source_reference, `AN 1.${n} (publisher numbered treatment ${n})`);
    assert.match(row.mapping_note, /parent title/); assert.match(row.mapping_note, /not an individual discourse heading/); assert.match(row.mapping_note, /three.*bhikkhave/);
    assert.equal(row.section.first_ref, `${u.id}/${at + 1}`); assert.equal(row.section.last_ref, body.ref);
    assert.equal(body.type, 'prose'); assert.ok(body.text.endsWith(' ' + ordinals[i % 10]));
    assert.equal(sectionHash([{ ref: body.ref, type: body.type, text: body.text }]), row.section.pali_sha256);
    assert.equal(sectionHash(canon.load().canon.books[u.book].blocks.slice(u.start, u.end)), row.root.root_blocks_sha256);
    assert.deepEqual(row.untranslated_paratext, [{ ref: body.ref, text: ordinals[i % 10] }, ...segments.filter((_, index) => index !== at).map(({ ref, text }) => ({ ref, text }))]);
    if (at) assert.equal(segments[0].type, 'heading');
    assert.equal(segments.length, at + 1 + ([30, 40].includes(n) ? 1 : 0));
    const choices = english.available(u), ordinary = choices.filter(choice => !choice.translation_scope), shared = choices.filter(choice => choice.translation_scope);
    assert.equal(ordinary.length, 1); assert.equal(ordinary[0].translation_id, exact(row)); assert.deepEqual(ordinary[0].source_section, row.section);
    assert.equal(shared.length, 1); assert.equal(shared[0].translation_id, bare); assert.equal(shared[0].translation_scope.whole_unit_coverage, false);
  }
});

test('the exact legacy shared binding remains required and cannot be forged, moved or downgraded', () => {
  const link = legacyLink(), owner = target(rows[0]);
  assert.equal(hash(stable(link)), '67e00d1d18e2f94eb11d297d6b79e719d144a3c19c961b114af9c192556078cb');
  assert.equal(AN_MIND_SHARED_LINK_SHA256, hash(stable(link))); assert.equal(retainedAnMindShared(link, owner), true);
  assert.doesNotThrow(() => assertRegisteredSection(link, owner, registry));
  for (const delta of [{ source: 'dhammatalks' }, { translator: 'Another translator' }, { license: 'CC-BY' }, { mapping_note: 'changed' }, { shared_scope: {} }, { shared_scope: undefined }, { section: rows[0].section }, { url: link.url + '#sutta-21' }]) assert.throws(() => assertRegisteredSection({ ...link, ...delta }, owner, registry), /Registered ATI/);
  assert.equal(retainedAnMindShared(link, target(rows[1])), false); assert.throws(() => assertRegisteredSection(link, target(rows[1]), registry), /Registered ATI/);
  for (const mutate of [links => links['an1.21'] = links['an1.21'].filter(value => !value.shared_scope), links => links['an1.21'].push(clone(link)), links => links['an1.22'].push(clone(link)), links => { const page = links['an1.21'].find(value => value.shared_scope); delete page.shared_scope; }, links => links['an1.21'].push({ source: 'ati', path: AN_MIND_SECTION_PATH, url: link.url, shared_scope: {} })]) {
    const translations = clone(canon.load().translations); mutate(translations); assert.throws(() => validate(registry, translations), /Registered ATI/);
  }
});

test('missing numbered bindings, foreign ownership, altered root/section pins and invented fragments fail closed', () => {
  for (const mutate of [r => r.links.pop(), r => r.links.find(row => row.unit_id === 'an1.21').root.start++, r => r.links.find(row => row.unit_id === 'an1.22').section.first_ref = 'an1.22/2', r => r.links.find(row => row.unit_id === 'an1.31').untranslated_paratext.pop(), r => r.links.find(row => row.unit_id === 'an1.30').untranslated_paratext.pop(), r => r.links.find(row => row.unit_id === 'an1.21').section.heading = 'A newly invented title']) { const registry = clone(canon.load().sectionRegistry); mutate(registry); assert.throws(() => validate(registry), /Registered ATI/); }
  const row = rows[0], link = reviewedSectionLink(row, registry);
  for (const delta of [{ section: undefined }, { section: null }, { section: { ...row.section, anchor: 'sutta-22' } }, { source: 'other' }, { path: '/tipitaka/an/an01/arbitrary' }, { url: link.url.replace('#sutta-21', '#invented') }, { partial_scope: {} }, { shared_scope: {} }]) assert.throws(() => assertRegisteredSection({ ...link, ...delta }, target(row), registry), /Registered ATI/);
  const missing = clone(canon.load().translations); missing[row.unit_id] = missing[row.unit_id].filter(link => !link.section); assert.throws(() => validate(registry, missing), /Registered ATI/);
  for (const row of rows) assert.equal(canon.resolve(`https://www.accesstoinsight.org${row.path}.html#${row.anchor}`).unit.id, row.unit_id);
  for (const fragment of ['', '#top', '#sutta-20', '#sutta-41', '#sutta-021', '#invented']) assert.throws(() => canon.resolve(`https://accesstoinsight.org${AN_MIND_SECTION_PATH}.html${fragment}`), /anthology|Shared-page URL/);
});

test('Python reservation retains only the exact old shared binding and withholds all competing bare-page proposals', () => {
  const payload = { link: legacyLink(), control: { source: 'ati', path: '/tipitaka/mn/control', url: 'https://accesstoinsight.org/tipitaka/mn/control.html' } };
  const result = spawnSync('python', ['-c', `import sys,json,copy
sys.path.insert(0,'scripts/canon')
from reviewed_ati_sections import withhold_section_page_proposals
p=json.load(sys.stdin);old=p['link'];generic={k:v for k,v in old.items() if k!='shared_scope'};forged=copy.deepcopy(old);forged['shared_scope']['whole_unit_coverage']=True
data={'an1.21':[old,generic,forged],'an1.22':[copy.deepcopy(old)],'mn1':[p['control']]};before=copy.deepcopy(data)
out,removed=withhold_section_page_proposals(data)
assert data==before and out=={'an1.21':[old],'mn1':[p['control']]} and len(removed)==3,(out,removed)
print('exact shared binding retained; generic and forged proposals withheld')`], { encoding: 'utf8', input: JSON.stringify(payload), env: { ...process.env, PYTHONUTF8: '1' } });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /exact shared binding retained/);
});

test('Python activation refuses missing, duplicate, moved or forged required shared input before producing an output', () => {
  const payload = { retained: Object.fromEntries(ATI_RETAINED_SHARED_BINDINGS.map(({owner,path})=>[owner,canon.load().translations[owner].filter(link=>link.shared_scope&&link.path===path)])), legacy: legacyLink(), sections: Object.fromEntries(rows.map(row => [row.unit_id, reviewedSectionLink(row, registry)])) };
  const result = spawnSync('python', ['-c', `import sys,json,copy
sys.path.insert(0,'scripts/canon')
import reviewed_ati_sections as m
p=json.load(sys.stdin)
# Isolate the activation preservation policy; real source extraction/pins are
# independently tested against optional immutable artifacts in this same suite.
m.reviewed_section_links=lambda *args,**kwargs:copy.deepcopy(p['sections'])
valid=copy.deepcopy(p['retained']);assert len(valid)==5;before=copy.deepcopy(valid)
out,_=m.apply_reviewed_section_links(valid,{},'/unused-policy-fixture')
assert valid==before and [x for x in out['an1.21'] if 'shared_scope' in x]==[p['legacy']]
for change in [lambda t:t.pop('an1.21'),lambda t:t['an1.21'].append(copy.deepcopy(p['legacy'])),lambda t:t.update({'an1.22':t.pop('an1.21')}),lambda t:t['an1.21'][0].update({'license':'CC-BY'})]:
 case=copy.deepcopy(valid);change(case)
 before=copy.deepcopy(case)
 try:m.apply_reviewed_section_links(case,{},'/unused-policy-fixture')
 except ValueError:pass
 else:raise AssertionError('Required exact original shared binding was not enforced before activation')
 assert case==before
print('required original shared input is enforced before activation')`], { encoding: 'utf8', input: JSON.stringify(payload), env: { ...process.env, PYTHONUTF8: '1' } });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /required original shared input is enforced/);
});

test('exports count twenty separate whole versions while keeping all shared declarations and their original subject count', () => {
  const index = buildIndex(), exported = index.texts.filter(row => ids.includes(row.id)); assert.equal(exported.length, 20);
  for (const record of exported) {
    assert.equal(record.english_count, 1); assert.equal(record.shared_english_count, 1);
    const whole = record.english.find(link => link.source_section), shared = record.english.find(link => link.translation_scope);
    assert.equal(whole.whole_unit_coverage, true); assert.equal(whole.source_section.unit_id, record.id); assert.equal(shared.whole_unit_coverage, false); assert.equal(shared.translation_id, bare);
  }
  const csv = toCsv({ texts: exported }); assert.equal(csv.split('\r\n').filter(Boolean).length, 21);
  assert.ok(CSV_COLUMNS.includes('shared_english')); assert.match(csv, /#sutta-21/); assert.match(csv, /#sutta-40/);
  const totals = translationCoverage({ refresh: true }).total, coverage = buildCoverage();
  assert.deepEqual([totals.shared_links, totals.with_shared_english, totals.shared_only], [12, 110, 22]);
  assert.deepEqual([coverage.shared_links, coverage.shared_texts], [12, 110]);
  assert.equal(52 - totals.shared_only, 30, 'The twenty numbered and ten paragraph selections reduce the frozen old52 shared-only total by thirty');
});

test('actual numbered source and all20 body/notice pins match independent literal paragraph extraction', { skip: !sourceRoot }, () => {
  const raw = source(), expected = sourceTreatments(raw);
  assert.equal(hash(raw), 'df8afc7457b8720a55f487f52fb47bff94371e52455cf3596daecc5fbbfa65a4');
  for (const [i, row] of rows.entries()) {
    const selected = extractAtiSection(raw, row);
    assert.equal(selected.text, expected[i].text); assert.equal(selected.title, `${i + 21}.`); assert.deepEqual(selected.translator_notes, []);
    assert.equal(hash(expected[i].paragraph), row.section.section_html_sha256); assert.equal(sectionHash(expected[i].text), row.section.text_sha256); assert.equal(sectionHash(english.atiNotice(raw)), row.section.notice_sha256);
    for (const delta of [{ section: { ...row.section, text_sha256: '0'.repeat(64) } }, { section: { ...row.section, notes_sha256: '0'.repeat(64) } }, { section: { ...row.section, section_html_sha256: '0'.repeat(64) } }, { section: { ...row.section, heading: 'Unpublished heading' } }, { anchor: 'sutta-999' }]) assert.throws(() => extractAtiSection(raw, { ...row, ...delta }), /reviewed ATI/);
  }
  for (const changed of [raw.replace('id="sutta-21"', 'id="sutta-22"'), raw.replace('id="sutta-22"', 'id="invented"'), raw.replace('</p>', '<i>Added note</i></p>'), raw.replace('©2006', '©2007'), raw.replace('<p><a id="sutta-21">', '<p><a id="sutta-21">Injected '), raw + '\n']) assert.throws(() => extractAtiSection(changed, rows[0]), /reviewed ATI/);
});

test('actual MCP returns only each complete short body, real printed label and full2006notice; ordinary defaults never select the shared version', { skip: !sourceRoot }, async () => {
  const raw = source(), expected = sourceTreatments(raw), fetched = provider(raw), [a, b] = InMemoryTransport.createLinkedPair(), client = new Client({ name: 'an-numbered-source', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [i, row] of rows.entries()) {
      const received = await client.callTool({ name: 'get_translation', arguments: { uid: row.unit_id, translation: exact(row), limit: 500 } }); assert.ok(!received.isError, JSON.stringify(received));
      const page = JSON.parse(received.content[0].text);
      assert.equal(page.text, expected[i].text); assert.equal(page.title, `${i + 21}.`); assert.equal(page.translation_id, exact(row)); assert.equal(page.text_id, row.unit_id);
      assert.equal(page.url, `https://accesstoinsight.org${row.path}.html#${row.anchor}`); assert.deepEqual(page.source_section, row.section); assert.deepEqual(page.translator_notes, []);
      assert.equal(Object.hasOwn(page, 'translation_scope'), false); assert.notEqual(page.whole_unit_coverage, false); assert.equal(page.next_offset, null); assert.equal(page.continue_with, null);
      assert.equal(page.license, english.atiNotice(raw).licensing); assert.match(page.license, /©2006 Thanissaro Bhikkhu/); assert.match(page.license, /Attribution-NonCommercial 4\.0 International/); assert.equal(page.attribution, english.atiNotice(raw).citation);
      assert.match(page.notes.join(' '), /three.*bhikkhave/); assert.match(page.notes.join(' '), /not word-by-word/);
      for (const [j, other] of expected.entries()) if (j !== i) assert.ok(!page.text.includes(other.text));
      assert.equal((await english.translation(target(row))).translation_id, exact(row));
    }
    assert.equal(fetched.length, 20); assert.ok(fetched.every(url => !url.includes('#')));
  } finally { await client.close(); }
});

test('the unanchored legacy source still requires exact consent and returns page-level scope and unchanged pinned continuation', { skip: !sourceRoot }, async () => {
  const fetched = provider(), u = target(rows[0]), originalScope = canon.translationScope(legacyLink(), u);
  await assert.rejects(english.translation(u, bare), /shared/i); assert.equal(fetched.length, 0);
  const page = await english.translation(u, bare, { allow_shared: true, limit: 500 });
  assert.equal(page.text_id, null); assert.equal(page.requested_text_id, u.id); assert.equal(page.whole_unit_coverage, false); assert.equal(page.translation_id, bare); assert.deepEqual(page.translation_scope, originalScope); assert.equal(Object.hasOwn(page, 'source_section'), false);
  assert.deepEqual(originalScope.text_ids, ids); assert.equal(originalScope.individual_alignment_verified, false);
  const next = page.continue_with.arguments; assert.equal(next.translation, bare); assert.equal(next.allow_shared, true); assert.equal(next.scope_sha256, originalScope.scope_sha256);
  assert.equal(next.prefix_sha256, hash(plainText(english.atiContent(source())).slice(0, next.offset)));
  const { uid, translation, ...options } = next, continued = await english.translation(canon.resolve(uid).unit, translation, options);
  assert.equal(continued.translation_id, bare); assert.equal(continued.text_id, null); assert.deepEqual(continued.translation_scope, originalScope);
  await assert.rejects(english.translation(u, bare, { ...options, allow_shared: false }), /shared/);
  await assert.rejects(english.translation(u, bare, { ...options, scope_sha256: undefined }), /requires unchanged scope/);
  await assert.rejects(english.translation(u, bare, { ...options, scope_sha256: '0'.repeat(64) }), /mapping changed/);
  for (const requested of [bare + '#invented', bare + '#sutta-22']) await assert.rejects(english.translation(u, requested), /not linked/);
});

test('article, legacy shared page and individual numbered versions have isolated caches and no arbitrary article owner', { skip: !sourceRoot }, async () => {
  const fetched = provider(), raw = source(), expected = sourceTreatments(raw), article = await getAtiText({ path: AN_MIND_SECTION_PATH, limit: 30000 });
  assert.equal(Object.hasOwn(article, 'canon_text_id'), false, 'an anthology page is not one arbitrarily selected canonical text');
  const shared = await english.translation(target(rows[0]), bare, { allow_shared: true, limit: 12000 });
  const first = await english.translation(target(rows[0]), exact(rows[0])), second = await english.translation(target(rows[1]), exact(rows[1]));
  assert.equal(first.text, expected[0].text); assert.equal(second.text, expected[1].text); assert.equal(shared.text, plainText(english.atiContent(raw))); assert.equal(article.text, shared.text); assert.notEqual(first.text, article.text);
  assert.equal(fetched.length, 4); assert.equal([...liveCache.map.keys()].filter(key => key.startsWith('ati-section:')).length, 2);
  first.source_section.heading = 'Caller mutation'; first.translator_notes.push({ number: 1, text: 'Caller note' });
  const cached = await english.translation(target(rows[0]), exact(rows[0])); assert.equal(cached.source_section.heading, '21.'); assert.deepEqual(cached.translator_notes, []);
  await getAtiText({ path: AN_MIND_SECTION_PATH }); await english.translation(target(rows[0]), bare, { allow_shared: true }); assert.equal(fetched.length, 4);
});

test('whole verification attributes a numbered excerpt individually while explicit legacy verification stays page-level', { skip: !sourceRoot }, async () => {
  provider(); const expected = sourceTreatments(source())[0].text;
  const whole = await verifyQuote({ text: expected, language: 'english', texts: ['an1.21'], translation_ids: [exact(rows[0])] });
  assert.equal(whole.verdict, 'found'); assert.equal(whole.matches[0].text_id, 'an1.21'); assert.equal(whole.scope.translations_checked[0].translation_id, exact(rows[0]));
  await assert.rejects(verifyQuote({ text: expected, language: 'english', texts: ['an1.21'], translation_ids: [bare] }), /include_shared/);
  const shared = await verifyQuote({ text: expected, language: 'english', texts: ['an1.21', 'an1.22'], translation_ids: [bare], include_shared: true });
  assert.equal(shared.verdict, 'found'); assert.equal(shared.matches[0].text_id, null); assert.equal(shared.matches[0].whole_unit_coverage, false); assert.deepEqual(shared.matches[0].translation_scope.text_ids, ids); assert.equal(shared.scope.translations_checked.length, 1);
});

for (const [field, mutate] of [['body', value => value.text = 'Altered cached source body'], ['notes', value => value.translator_notes = [{ number: 1, text: 'Unreviewed cache note' }]], ['notice', value => value.license = 'Altered cached rights notice'], ['attribution', value => value.attribution = 'Another cached author'], ['printed label', value => value.title = 'An unpublished individual heading'], ['canonical URL', value => value.url = `https://accesstoinsight.org${AN_MIND_SECTION_PATH}.html#sutta-22`]]) {
  test(`a cached numbered section refuses ${field} drift before returning wording`, { skip: !sourceRoot }, async () => {
    provider(); await english.translation(target(rows[0]), exact(rows[0]));
    const cached = [...liveCache.map].find(([key]) => key.startsWith('ati-section:')); assert.ok(cached); mutate(cached[1].value);
    await assert.rejects(english.translation(target(rows[0]), exact(rows[0])), /changed|reviewed|snapshot|notice|source/i);
  });
}

test('cached sections still require the complete unchanged current legacy/numbered registry bindings', { skip: !sourceRoot }, async () => {
  provider(); const data = canon.load(), previous = data.translations, corpus = data.canon; await english.translation(target(rows[0]), exact(rows[0]));
  try {
    data.translations = { ...previous, 'an1.21': previous['an1.21'].filter(link => !link.shared_scope) };
    await assert.rejects(english.translation(target(rows[0]), exact(rows[0])), /Registered ATI/);
    data.translations = { ...previous, 'an1.22': previous['an1.22'].filter(link => !link.section) };
    await assert.rejects(english.translation(target(rows[0]), exact(rows[0])), /Registered ATI/);
    data.translations = previous;
    const books = [...corpus.books], book = { ...books[16], blocks: [...books[16].blocks] }, block = [...book.blocks[29]];
    block[2] += ' Changed root text'; book.blocks[29] = block; books[16] = book; data.canon = { ...corpus, books };
    await assert.rejects(english.translation(target(rows[0]), exact(rows[0])), /Registered ATI|Invalid or unreviewed shared-page/);
  } finally { data.translations = previous; data.canon = corpus; }
});
