import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { liveCache } from '../src/cache.mjs';
import { findTalks, parseTalkResults, parseCursor, phraseFromReference, plainTerms, politely, searchUrl, sharedPhrase, register, TALKS_SOURCE } from '../src/talks.mjs';

// Synthetic page in the structure of https://www.dhammatalks.org/search/ (titles are made up for the test).
const PAGE = `
<ol class="list-group list-group-flush search-results">
<li id="150630-example-one" class="list-group-item li-audio search-result"><button class="play" data-link="/Archive/y2015/150630_Example_One.mp3"></button><a href="/audio/evening/2015/150630-example-one.html" class="audio" title="download talk"><span>Example <mark>One</mark> &amp; Two</span></a><div class="snippet">SNIPPET-TRANSCRIPT-TEXT</div>
<nav class="breadcrumbs"><ol><li><a href="/audio/evening/2015/#2015.06">Evening Talks (2015)</a></li></ol></nav></li>
<li id="991399-bad-date" class="list-group-item li-audio search-result"><button class="play" data-link="/Archive/MachineTranscripts/x.mp3"></button><a href="/audio/morning/2014/991399-bad-date.html" class="audio"><span>Example Morning</span></a><div class="snippet">SNIPPET-TRANSCRIPT-TEXT</div></li>
<li class="list-group-item search-result"><a href="/suttas/MN/MN118.html"><span>MN 118 Not a talk</span></a></li>
<li id="150101-elsewhere" class="list-group-item li-audio search-result"><a href="https://example.com/audio/evening/2015/x.html" class="audio"><span>Off site</span></a></li>
</ol>
<a href="/search/?q=x&amp;cat=evening&amp;page=2">2</a>`;

function mockFetch(pages = {}) {
  const calls = [];
  const fetchHtml = async (url) => { calls.push(url); return pages[url] ?? PAGE; };
  return { calls, fetchHtml };
}

test('every citation used in these tests resolves with the bundled canon', () => {
  for (const [ref, id] of [['AN 3.65', 'an3.65'], ['MN 118', 'mn118'], ['AN 7.64', 'an7.64'], ['Dhp 183', 'dhp183'], ['Snp 1.8', 'snp1.8'], ['SN 56.11', 'sn56.11'], ['SN 48.42', 'sn48.42']]) {
    assert.equal(canon.resolve(ref).unit.id, id, ref);
  }
});

test('search results are parsed to talk titles and URLs only', () => {
  const results = parseTalkResults(PAGE);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0], {
    title: 'Example One & Two', url: 'https://www.dhammatalks.org/audio/evening/2015/150630-example-one.html',
    category: 'evening', year: 2015, date: '2015-06-30', audio_url: 'https://www.dhammatalks.org/Archive/y2015/150630_Example_One.mp3',
  });
  // A date is only reported when the id agrees with the year in the URL; robots-disallowed paths are never linked.
  assert.equal(results[1].date, undefined);
  assert.equal(results[1].audio_url, undefined);
  assert.equal(results[1].category, 'morning');
  assert.ok(!JSON.stringify(results).includes('SNIPPET'));
  assert.deepEqual(parseTalkResults(''), []);
});

test('translation titles become search phrases only when distinctive', () => {
  assert.equal(phraseFromReference('AN 3:66 To the Kālāmas'), 'To the Kalamas');
  assert.equal(phraseFromReference('SN 56:11 Setting the Wheel of Dhamma in Motion'), 'Setting the Wheel of Dhamma in Motion');
  assert.equal(phraseFromReference('MN 11 The Shorter Lion’s Roar Discourse'), "The Shorter Lion's Roar Discourse");
  assert.equal(phraseFromReference('SN 51:15 To Uṇṇābha the Brahman'), 'To Unnabha the Brahman'); // Pāli name and 3+ words
  assert.equal(phraseFromReference('MN 59 Many Things to Be Felt'), 'Many Things to Be Felt'); // 3 distinctive words
  // Borderline: common English phrases with fewer than three distinctive words and no Pāli name are not searched.
  for (const generic of ['MN 118 Mindfulness of Breathing', 'AN 7:64 An Angry Person', 'SN 12:31 This Has Come Into Being',
    'SN 12:64 Where There is Passion', 'MN 111 One After Another', 'SN 22:86 To Anurādha', 'Thag 18 Mahā Kassapa',
    'Sn 1:8 Goodwill', 'SN 22:99 The Leash (1)', '101 Itivuttaka', 'Dhp XIV : Awakened', 'SN 1:41 On Fire', '', null]) {
    assert.equal(phraseFromReference(generic), null, String(generic));
  }
  assert.equal(plainTerms('  jhāna “right   view” '), 'jhana "right view"');
});

test('a phrase that is part of another dhammatalks.org title is not treated as distinctive', async () => {
  // "Unnabha the Brahman" (SN 48:42) is also inside "To Unnabha the Brahman" (SN 51:15).
  const sn4842 = canon.linksFor(canon.resolve('SN 48.42').unit).links.find((l) => l.source === 'dhammatalks');
  assert.equal(phraseFromReference(sn4842.reference), 'Unnabha the Brahman');
  assert.equal(sharedPhrase('Unnabha the Brahman', sn4842.url, canon), true);
  const an365 = canon.linksFor(canon.resolve('AN 3.65').unit).links.find((l) => l.source === 'dhammatalks');
  assert.equal(sharedPhrase('To the Kalamas', an365.url, canon), false);
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ passage: 'SN 48.42' }, { canon, fetchHtml });
  assert.deepEqual(r.results, []);
  assert.match(r.notes.at(-1), /also part of another/);
  assert.equal(calls.length, 0);
});

test('passage search uses the title of Ṭhānissaro\'s translation and labels the match', async () => {
  liveCache.clear();
  const terms = '"To the Kalamas"';
  // PAGE links to a second page; here the second pages are empty.
  const { calls, fetchHtml } = mockFetch({ [searchUrl(terms, 'evening', 2)]: '', [searchUrl(terms, 'morning', 2)]: '' });
  const r = await findTalks({ passage: 'AN 3.65' }, { canon, fetchHtml });
  assert.deepEqual(calls.slice(0, 2), [searchUrl(terms, 'evening'), searchUrl(terms, 'morning')]);
  assert.equal(calls.length, 4);
  assert.equal(r.passage.id, 'an3.65');
  assert.equal(r.passage.translation_url, 'https://www.dhammatalks.org/suttas/AN/AN3_66.html');
  assert.equal(r.searched_for, '"To the Kalamas"');
  assert.equal(r.results.length, 2); // the same talk from two searches is listed once
  assert.equal(r.source.license, 'CC BY-NC 4.0');
  assert.deepEqual(r.source, TALKS_SOURCE);
  assert.ok(r.notes.some((n) => /no passage-to-talk index/.test(n) && /not that the talk is about this sutta/.test(n)));
  assert.ok(r.notes.some((n) => /commentary/.test(n)));
  assert.ok(!JSON.stringify(r).includes('SNIPPET'));
  assert.equal(r.has_more, false);
  assert.equal(r.next_cursor, undefined);
  // Cached: a repeated request does not hit the site again.
  await findTalks({ passage: 'AN 3.65' }, { canon, fetchHtml });
  assert.equal(calls.length, 4);
});

test('passage search combines with a topic and narrows to one category', async () => {
  liveCache.clear();
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ passage: 'SN 56.11', query: 'jhāna', category: 'morning', page: 2, limit: 1 }, { canon, fetchHtml });
  assert.deepEqual(calls, [searchUrl('"Setting the Wheel of Dhamma in Motion" jhana', 'morning', 2)]);
  assert.match(calls[0], /[?&]page=2/);
  assert.equal(r.results.length, 1);
  assert.equal(r.has_more, true);
  assert.match(r.next_cursor, /^v1:[a-f0-9]{64}:morning:2:1$/);
});

test('no search runs when a passage has no distinctive translation of its own', async () => {
  const { calls, fetchHtml } = mockFetch();
  const verse = await findTalks({ passage: 'Dhp 183' }, { canon, fetchHtml });
  assert.deepEqual(verse.results, []);
  assert.match(verse.notes.at(-1), /only its chapter/);
  for (const p of ['Snp 1.8', 'MN 118', 'AN 7.64']) {
    const generic = await findTalks({ passage: p }, { canon, fetchHtml });
    assert.deepEqual(generic.results, [], p);
    assert.match(generic.notes.at(-1), /too general/, p);
  }
  assert.equal(calls.length, 0);
});

test('topic search, validation and outages', async () => {
  liveCache.clear();
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ query: 'Kālāmas faith' }, { canon, fetchHtml });
  assert.equal(r.searched_for, 'Kalamas faith');
  assert.equal(r.passage, undefined);
  assert.deepEqual(calls.slice(0, 2), [searchUrl('Kalamas faith', 'evening'), searchUrl('Kalamas faith', 'morning')]);
  await assert.rejects(findTalks({}, { canon, fetchHtml }), /Give a topic/);
  await assert.rejects(findTalks({ query: 'x', category: 'lectures' }, { canon, fetchHtml }), /category/);
  await assert.rejects(findTalks({ passage: 'MN 999' }, { canon, fetchHtml }));
  const down = async () => { throw new Error('www.dhammatalks.org unreachable'); };
  await assert.rejects(findTalks({ query: 'outage test' }, { canon, fetchHtml: down }), /unavailable right now.*dhammatalks\.org\/search/);
});

test('requests to the site are serialised and spaced', async () => {
  const started = [];
  await Promise.all([1, 2].map(() => politely(async () => { started.push(Date.now()); })));
  assert.equal(started.length, 2);
  assert.ok(started[1] - started[0] >= 950, `spacing ${started[1] - started[0]} ms`);
});

test('find_talks is registered as a read-only network tool', () => {
  const tools = [];
  const z = { string: () => chain(), number: () => chain(), enum: () => chain() };
  function chain() { const c = new Proxy(() => c, { get: () => () => c }); return c; }
  register({ tool: (name, description, shape, fn, options) => tools.push({ name, description, shape, options }), z, citation: chain(), canon });
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'find_talks');
  assert.deepEqual(tools[0].options, { network: true });
  assert.deepEqual(Object.keys(tools[0].shape), ['query', 'passage', 'category', 'page', 'limit', 'cursor']);
  assert.match(tools[0].description, /Link-only/);
});

// A site page of `n` results for one category, with a pager link when another page follows.
function sitePage(category, page, n, more) {
  const items = Array.from({ length: n }, (_, i) => {
    const id = `1506${String(page).padStart(2, '0')}-${category}-${i + 1}`;
    return `<li id="${id}" class="list-group-item li-audio search-result"><a href="/audio/${category}/2015/${id}.html" class="audio"><span>${category} p${page} #${i + 1}</span></a></li>`;
  }).join('\n');
  return `<ol>${items}</ol>${more ? `<a href="/search/?q=x&amp;cat=${category}&amp;page=${page + 1}">${page + 1}</a>` : ''}<a href="/search/?q=x&amp;cat=${category}&amp;page=${page + 1}9">${page + 1}9</a>`;
}

test('paging reaches every result: 20 per category per site page, interleaved, none skipped', async () => {
  liveCache.clear();
  const pages = {};
  // Evening: 2 site pages (20 + 5). Morning: 1 site page of 7. A "page=N9" pager link must not count as page N.
  pages[searchUrl('jhana', 'evening', 1)] = sitePage('evening', 1, 20, true);
  pages[searchUrl('jhana', 'evening', 2)] = sitePage('evening', 2, 5, false);
  pages[searchUrl('jhana', 'morning', 1)] = sitePage('morning', 1, 7, false);
  const { calls, fetchHtml } = mockFetch(pages);
  const seen = [];
  let r = await findTalks({ query: 'jhana' }, { canon, fetchHtml });
  assert.deepEqual(r.results.slice(0, 4).map((t) => t.title), ['evening p1 #1', 'morning p1 #1', 'evening p1 #2', 'morning p1 #2']);
  let rounds = 1;
  seen.push(...r.results.map((t) => t.url));
  while (r.has_more) {
    r = await findTalks({ query: 'jhana', cursor: r.next_cursor }, { canon, fetchHtml });
    seen.push(...r.results.map((t) => t.url));
    assert.ok(++rounds < 10);
  }
  assert.equal(seen.length, 32);
  assert.equal(new Set(seen).size, 32);
  assert.equal(r.next_cursor, undefined);
  assert.equal(new Set(calls).size, 3); // each site page fetched once, then cached

  // Passage mode with a small limit: results 6-20 of the first site page stay reachable.
  liveCache.clear();
  const terms = '"To the Kalamas"';
  const { fetchHtml: f2 } = mockFetch({ [searchUrl(terms, 'evening', 1)]: sitePage('evening', 1, 20, false), [searchUrl(terms, 'morning', 1)]: sitePage('morning', 1, 0, false) });
  let p = await findTalks({ passage: 'AN 3.65', limit: 5 }, { canon, fetchHtml: f2 });
  assert.match(p.next_cursor, /^v1:[a-f0-9]{64}:evening:1:5$/);
  const all = [...p.results];
  while (p.has_more) { p = await findTalks({ passage: 'AN 3.65', limit: 5, cursor: p.next_cursor }, { canon, fetchHtml: f2 }); all.push(...p.results); }
  assert.deepEqual(all.map((t) => t.title), Array.from({ length: 20 }, (_, i) => `evening p1 #${i + 1}`));
});

test('cursors are validated', () => {
  assert.deepEqual(parseCursor('evening:2:5,morning:1:0', ['evening', 'morning']), [{ category: 'evening', page: 2, offset: 5 }, { category: 'morning', page: 1, offset: 0 }]);
  for (const bad of ['', 'evening:0:1', 'evening:1', 'lectures:1:0', 'evening:1:0,evening:2:0', 'morning:1:0']) {
    assert.throws(() => parseCursor(bad, ['evening']), /cursor/, bad);
  }
});

test('local-clients guide lists every feature tool with its Internet column', async () => {
  const { readFileSync } = await import('node:fs');
  const guide = readFileSync(new URL('../docs/install/local-clients.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const features = await import('../src/features/index.mjs');
  function chain() { const c = new Proxy(() => c, { get: () => () => c }); return c; }
  const z = new Proxy({}, { get: () => () => chain() });
  const tools = [];
  for (const mod of Object.values(features)) {
    mod.register({ tool: (name, description, shape, fn, options) => tools.push({ name, description, network: !!options?.network }),
      prompt: () => {}, resource: () => {}, z, citation: chain(), canon, english: {}, providers: {} });
  }
  assert.ok(tools.some((t) => t.name === 'find_talks'));
  for (const { name, description, network } of tools) {
    const row = guide.split('\n').find((line) => line.startsWith(`| \`${name}\` |`));
    assert.ok(row, `${name} missing from docs/install/local-clients.md`);
    const internet = row.split('|').at(-2).trim();
    if (!network) assert.equal(internet, 'No', name);
    else if (/works offline/i.test(description)) assert.match(internet, /^No, unless/, name);
    else assert.equal(internet, 'Yes', name);
  }
});
