import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { liveCache } from '../src/cache.mjs';
import { findTalks, parseTalkResults, phraseFromReference, plainTerms, politely, searchUrl, register, TALKS_SOURCE } from '../src/talks.mjs';

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
  for (const [ref, id] of [['AN 3.65', 'an3.65'], ['MN 118', 'mn118'], ['Dhp 183', 'dhp183'], ['Snp 1.8', 'snp1.8'], ['SN 56.11', 'sn56.11']]) {
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
  assert.equal(phraseFromReference('MN 118 Mindfulness of Breathing'), 'Mindfulness of Breathing');
  assert.equal(phraseFromReference('SN 56:11 Setting the Wheel of Dhamma in Motion'), 'Setting the Wheel of Dhamma in Motion');
  assert.equal(phraseFromReference('MN 11 The Shorter Lion’s Roar Discourse'), "The Shorter Lion's Roar Discourse");
  for (const generic of ['Sn 1:8 Goodwill', 'SN 22:99 The Leash (1)', '101 Itivuttaka', 'Dhp XIV : Awakened', 'SN 1:41 On Fire', '', null]) {
    assert.equal(phraseFromReference(generic), null, String(generic));
  }
  assert.equal(plainTerms('  jhāna “right   view” '), 'jhana "right view"');
});

test('passage search uses the title of Ṭhānissaro\'s translation and labels the match', async () => {
  liveCache.clear();
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ passage: 'AN 3.65' }, { canon, fetchHtml });
  assert.deepEqual(calls, [searchUrl('"To the Kalamas"', 'evening'), searchUrl('"To the Kalamas"', 'morning')]);
  assert.equal(r.passage.id, 'an3.65');
  assert.equal(r.passage.translation_url, 'https://www.dhammatalks.org/suttas/AN/AN3_66.html');
  assert.equal(r.searched_for, '"To the Kalamas"');
  assert.equal(r.results.length, 2); // the same talk from two searches is listed once
  assert.equal(r.source.license, 'CC BY-NC 4.0');
  assert.deepEqual(r.source, TALKS_SOURCE);
  assert.ok(r.notes.some((n) => /no passage-to-talk index/.test(n) && /not that the talk is about this sutta/.test(n)));
  assert.ok(r.notes.some((n) => /commentary/.test(n)));
  assert.ok(!JSON.stringify(r).includes('SNIPPET'));
  assert.equal(r.next_page, 2);
  // Cached: a repeated request does not hit the site again.
  await findTalks({ passage: 'AN 3.65' }, { canon, fetchHtml });
  assert.equal(calls.length, 2);
});

test('passage search combines with a topic and narrows to one category', async () => {
  liveCache.clear();
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ passage: 'MN 118', query: 'jhāna', category: 'morning', page: 2, limit: 1 }, { canon, fetchHtml });
  assert.deepEqual(calls, [searchUrl('"Mindfulness of Breathing" jhana', 'morning', 2)]);
  assert.match(calls[0], /[?&]page=2/);
  assert.equal(r.results.length, 1);
  assert.equal(r.has_more, true);
});

test('no search runs when a passage has no distinctive translation of its own', async () => {
  const { calls, fetchHtml } = mockFetch();
  const verse = await findTalks({ passage: 'Dhp 183' }, { canon, fetchHtml });
  assert.deepEqual(verse.results, []);
  assert.match(verse.notes.at(-1), /only its chapter/);
  const generic = await findTalks({ passage: 'Snp 1.8' }, { canon, fetchHtml });
  assert.deepEqual(generic.results, []);
  assert.match(generic.notes.at(-1), /too general/);
  assert.equal(calls.length, 0);
});

test('topic search, validation and outages', async () => {
  liveCache.clear();
  const { calls, fetchHtml } = mockFetch();
  const r = await findTalks({ query: 'Kālāmas faith' }, { canon, fetchHtml });
  assert.equal(r.searched_for, 'Kalamas faith');
  assert.equal(r.passage, undefined);
  assert.equal(calls.length, 2);
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
  assert.deepEqual(Object.keys(tools[0].shape), ['query', 'passage', 'category', 'page', 'limit']);
  assert.match(tools[0].description, /Link-only/);
});
