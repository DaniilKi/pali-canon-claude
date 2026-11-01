// Ānandajoti Bhikkhu (Ancient Buddhist Texts) as an English translation source: link index, licence, live fetch.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { fetchPublic, ALLOWED_HOSTS } from '../src/http.mjs';
import { liveCache } from '../src/cache.mjs';

const index = JSON.parse(readFileSync(new URL('../server/data/anandajoti.json', import.meta.url), 'utf8'));
const entries = Object.entries(index.links);
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear?.(); });

function stubFetch(pages) {
  const calls = [];
  globalThis.fetch = async (url) => {
    const u = new URL(url);
    calls.push(decodeURI(u.pathname));
    const body = pages[decodeURI(u.pathname)];
    if (body === undefined) return new Response('missing', { status: 404 });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  };
  return calls;
}

const page = (inner) => `<!DOCTYPE html><html><head><title>Sample - Sample Discourse</title></head><body>
<p class="NavBar1"><script src="../../includes/Header.js"></script></p>
<p class="NavBar3"><a href="../index.htm">Text and Translations Home Page</a></p>
${inner}
<div id="infowrapper"><p>toggle commentary</p></div>
<p class="NavBar3"><a href="../../Miscellaneous/History.htm#New">last updated</a></p>
<footer><script src="../../includes/Footer.js"></script></footer></body></html>`;

test('the index records its licence, the date checked and the linking policy', () => {
  assert.equal(index.source.translator, 'Ānandajoti Bhikkhu');
  assert.match(index.source.license, /CC BY-SA 3\.0/);
  assert.match(index.source.notice_url, /^https:\/\/ancient-buddhist-texts\.net\/Miscellaneous\/Copyright-Notice\.htm$/);
  assert.match(index.source.checked, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(entries.length >= 100, `expected at least 100 audited links, got ${entries.length}`);
});

test('every link points at a real canon text, resolves back to it by URL, and stays in the translation section', () => {
  for (const [id, l] of entries) {
    assert.equal(canon.resolve(id).unit.id, id, id);
    assert.match(l.path, /^\/Texts-and-Translations\/[^?#]+\.htm$/, id);
    for (const p of l.parts || []) assert.doesNotThrow(() => english.anandajotiUrl(p), p);
    assert.equal(canon.resolve(`https://ancient-buddhist-texts.net${l.path}`).unit.id, id, l.path);
    assert.ok(l.coverage >= 0.6, `${id} coverage ${l.coverage}`);
  }
});

test('the site\'s own references resolve to the linked text with the bundled canon', () => {
  let checked = 0;
  for (const [id, l] of entries) {
    if (!/^(DN|MN|SN|AN|Ud|Snp|Dhp) /.test(l.reference)) continue;
    assert.equal(canon.resolve(l.reference).unit.id, id, `${l.reference} -> ${id}`);
    checked += 1;
  }
  assert.ok(checked >= 100, `checked ${checked}`);
});

test('SN and AN are never linked by number alone', () => {
  for (const [id, l] of entries) {
    if (/^(sn|an)\d/.test(id)) assert.match(l.match, /title/, id);
  }
  // The site numbers Titthāyatanasutta "AN 3.62"; in our numbering AN 3.62 is the Bhayasutta, so it must not be linked there.
  assert.equal(index.links['an3.62'], undefined);
});

test('available() lists the new source with an aj: translation_id and licence', () => {
  const unit = canon.resolve('Ud 1.10').unit;
  const aj = english.available(unit).find((a) => a.translation_id.startsWith('aj:'));
  assert.ok(aj, 'Ud 1.10 should have an Ānandajoti link');
  assert.equal(aj.translation_id, 'aj:Udana/1-Bodhivaggo-10');
  assert.equal(aj.translator, 'Ānandajoti Bhikkhu');
  assert.equal(aj.license, 'CC BY-SA 3.0');
  assert.match(aj.source, /Ancient Buddhist Texts/);
  const meta = canon.describe(unit);
  assert.ok(meta.english.some((e) => e.translation_id === 'aj:Udana/1-Bodhivaggo-10' && e.url === 'https://ancient-buddhist-texts.net/Texts-and-Translations/Udana/1-Bodhivaggo-10.htm'));
});

test('translation() fetches the page live and returns attribution, licence and labelled notes', async () => {
  const unit = canon.resolve('Ud 1.10').unit;
  const calls = stubFetch({
    '/Texts-and-Translations/Udana/1-Bodhivaggo-10.htm': page('<p><b>Evaṁ me sutaṁ:</b><br>Thus I heard:</p><p><b>Bāhiyo <span class="TT"><span>BJT reads Bāhiko</span><sup class="autonumber"></sup></span> Dārucīriyo</b><br>Bāhiya of the Bark Robe</p>'),
  });
  const t = await english.translation(unit, 'aj:Udana/1-Bodhivaggo-10');
  assert.deepEqual(calls, ['/Texts-and-Translations/Udana/1-Bodhivaggo-10.htm']);
  assert.equal(t.translator, 'Ānandajoti Bhikkhu');
  assert.equal(t.translation_id, 'aj:Udana/1-Bodhivaggo-10');
  assert.match(t.license, /CC BY-SA 3\.0/);
  assert.match(t.attribution, /Ānandajoti Bhikkhu/);
  assert.match(t.text, /Evaṁ me sutaṁ:\nThus I heard:/);
  assert.match(t.text, /\[Note: BJT reads Bāhiko\]/);
  assert.doesNotMatch(t.text, /Home Page|toggle|last updated/);
  assert.ok(t.notes.some((n) => /line-by-line/.test(n)));
});

test('a translator name without diacritics selects the Ānandajoti translation', async () => {
  const unit = canon.resolve('Ud 1.10').unit;
  stubFetch({ '/Texts-and-Translations/Udana/1-Bodhivaggo-10.htm': page('<p>Thus I heard</p>') });
  const t = await english.translation(unit, 'Anandajoti');
  assert.equal(t.translation_id, 'aj:Udana/1-Bodhivaggo-10');
});

test('commentary passages are labelled as commentary', async () => {
  const [id, l] = entries.find(([, x]) => x.commentary && !x.parts);
  const unit = canon.resolve(id).unit;
  stubFetch({ [l.path]: page('<p>Sutta line</p><div class="vannana"><p><b>Tattha</b><br>Herein</p></div><p>Next sutta line</p>') });
  const t = await english.translation(unit, english.available(unit).find((a) => a.translation_id.startsWith('aj:')).translation_id);
  assert.match(t.text, /\[Commentary \(Aṭṭhakathā\) begins\]\nTattha\nHerein\n\[Commentary ends\]/);
  assert.ok(t.notes.some((n) => /commentary \(Aṭṭhakathā\)/.test(n)));
  assert.ok(english.available(unit).some((a) => a.includes_commentary));
});

test('multi-page works are read only as far as needed and say so', async () => {
  const [id, l] = entries.find(([, x]) => x.parts && x.parts.length >= 3);
  const unit = canon.resolve(id).unit;
  const pages = Object.fromEntries(l.parts.map((p, i) => [p, page(`<p>${`Part ${i + 1} text. `.repeat(60)}</p>`)]));
  const calls = stubFetch(pages);
  const ajId = english.available(unit).find((a) => a.translation_id.startsWith('aj:')).translation_id;
  const first = await english.translation(unit, ajId, { limit: 600 });
  assert.equal(calls.length, 1);
  assert.equal(first.total_characters, null);
  assert.equal(first.next_offset, 600);
  assert.ok(first.notes.some((n) => /spread over/.test(n)));
  const more = await english.translation(unit, ajId, { offset: 600, limit: 2000 });
  assert.ok(calls.length >= 2);
  assert.match(more.text, /Part 2 text/);
});

test('a missing Ānandajoti translation is an error that lists what is available', async () => {
  const unit = canon.resolve('MN 10').unit;
  await assert.rejects(english.translation(unit, 'aj:Udana/1-Bodhivaggo-10'), /not linked for MN 10\. Available:/);
});

test('the host is allowlisted narrowly: only the Texts-and-Translations section', async () => {
  assert.ok(ALLOWED_HOSTS.includes('ancient-buddhist-texts.net'));
  globalThis.fetch = async () => { throw new Error('must not be called'); };
  await assert.rejects(fetchPublic('https://ancient-buddhist-texts.net/Reference/DPPN.htm', { json: false, retries: 0 }), /outside the supported public sources/);
  await assert.rejects(fetchPublic('http://ancient-buddhist-texts.net/Texts-and-Translations/Udana/index.htm', { json: false, retries: 0 }), /outside the supported public sources/);
  assert.throws(() => english.anandajotiUrl('/Texts-and-Translations/../Reference/DPPN.htm'), /Unsupported/);
  assert.throws(() => english.anandajotiUrl('/English-Texts/Exalted-Utterances/index.htm'), /Unsupported/);
});
