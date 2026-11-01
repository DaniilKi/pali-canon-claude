import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import { topicsIndex, listsIndex, topic, listTopics, dhammaList, key } from '../src/topics.mjs';
import * as features from '../src/features/index.mjs';

const d = canon.load();
const textOf = (u) => canon.fold(d.canon.books[u.book].blocks.slice(u.start, u.end).map((b) => b[2]).join(' '));

test('topic index: at least 300 topics, each with texts, from a pinned CC BY source', () => {
  const data = topicsIndex();
  assert.ok(data.topics.length >= 300, `${data.topics.length} topics`);
  assert.match(data.source.commit, /^[0-9a-f]{40}$/);
  assert.match(data.source.license, /CC BY 4\.0/);
  assert.match(data.source.attribution, /Access to Insight/);
  const slugs = new Set();
  for (const t of data.topics) {
    assert.ok(t.texts.length > 0, t.slug);
    assert.ok(!slugs.has(t.slug), `duplicate ${t.slug}`);
    slugs.add(t.slug);
    assert.match(t.ati_url, /^https:\/\/www\.accesstoinsight\.org\/index-(subject|number)\.html#/);
    for (const s of t.see_also) assert.ok(data.topics.some((x) => x.slug === s), `${t.slug} see_also ${s}`);
  }
});

test('every topic citation resolves to the bundled canon text it names', () => {
  let n = 0;
  for (const t of topicsIndex().topics) {
    for (const x of t.texts) {
      const { unit } = canon.resolve(x.id);
      assert.equal(unit.id, x.id, `${t.slug}: ${x.id}`);
      assert.equal(canon.resolve(x.citation).unit.id, x.id, `${t.slug}: ${x.citation}`);
      assert.match(x.ati_url, /^https:\/\/www\.accesstoinsight\.org\/tipitaka\//);
      n += 1;
    }
  }
  assert.ok(n > 1000, `${n} links`);
});

test('SN and AN topic links never rely on a number alone', () => {
  // Every SN/AN link must be one the bundled translation index already ties to that exact ATI page.
  for (const t of topicsIndex().topics) {
    for (const x of t.texts.filter((y) => /^(sn|an)\d/.test(y.id))) {
      const links = (d.translations[x.id] || []).concat(d.translations[canon.resolve(x.id).unit.id] || []);
      const container = d.canon.units.find((u) => u.kind === 'range' && u.members?.includes(x.id));
      if (container) links.push(...(d.translations[container.id] || []));
      assert.ok(links.some((l) => l.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\.html?$/, '') === x.ati_url.replace(/^https?:\/\/(www\.)?/, '').replace(/\.html?$/, '')), `${t.slug}: ${x.id} ${x.ati_url}`);
    }
  }
});

test('topic() finds by name, alias and numbered form, and enriches texts', () => {
  const e = topic(canon, 'emptiness');
  assert.equal(e.topic.slug, 'emptiness');
  assert.ok(e.texts.some((x) => x.id === 'mn121' && x.title));
  assert.match(e.source.license, /CC BY 4\.0/);
  assert.equal(topic(canon, 'Equanimity').topic.slug, 'upekkha');
  const h = topic(canon, '5 hindrances');
  assert.equal(h.topic.slug, 'n5-hindrances');
  assert.equal(h.dhamma_list.slug, 'five-hindrances');
  assert.throws(() => topic(canon, 'zzzz qqqq'), /No topic matches/);
  const all = listTopics({ limit: 5 });
  assert.ok(all.total >= 300);
  assert.equal(all.topics.length, 5);
  assert.ok(listTopics({ query: 'anger' }).topics.length >= 1);
  assert.ok(listTopics({ index: 'numerical' }).topics.every((t) => t.index === 'numerical'));
});

test('numbering differences are reported, not hidden', () => {
  for (const t of topicsIndex().topics) {
    const x = t.texts.find((y) => key(y.ati_reference) !== key(y.citation) && /^AN /.test(y.ati_reference));
    if (!x) continue;
    const out = topic(canon, t.slug).texts.find((y) => y.id === x.id);
    assert.match(out.numbering_note, /Access to Insight cites this as/);
    return;
  }
});

const CORE = ['four-noble-truths', 'three-characteristics', 'five-aggregates', 'five-hindrances', 'seven-factors-of-awakening',
  'noble-eightfold-path', 'thirty-seven-aids-to-awakening', 'four-foundations-of-mindfulness', 'four-right-efforts', 'four-bases-of-power',
  'five-faculties', 'five-powers', 'ten-fetters', 'dependent-origination', 'four-jhanas', 'brahmaviharas', 'ten-paramis'];

test('dhamma lists: core lists present, counts match members, every member checked in each defining passage', () => {
  const { lists } = listsIndex();
  for (const slug of CORE) assert.ok(lists.some((l) => l.slug === slug), slug);
  for (const l of lists) {
    assert.ok(['canonical', 'canonical-later-name', 'later'].includes(l.status), l.slug);
    if (l.status !== 'canonical') assert.ok(l.status_note, `${l.slug} needs a status_note`);
    const total = l.members.reduce((n, m) => n + (m.list ? lists.find((x) => x.slug === m.list).count : 1), 0);
    assert.equal(total, l.count, l.slug);
    assert.ok(l.defined_in.length >= 1, l.slug);
    for (const c of l.defined_in) {
      const { unit } = canon.resolve(c);
      const text = textOf(unit);
      for (const m of l.members) {
        assert.ok(m.pali && m.gloss && m.match, `${l.slug} member`);
        assert.ok(text.includes(m.match), `${l.slug}: "${m.match}" (${m.pali}) not found in ${c} (${unit.id})`);
      }
    }
    for (const c of l.see_also_texts || []) assert.ok(canon.resolve(c).unit, `${l.slug}: ${c}`);
    for (const r of l.related || []) assert.ok(lists.some((x) => x.slug === r), `${l.slug} related ${r}`);
  }
});

test('the ten pāramīs are labelled as a later list', () => {
  const p = dhammaList(canon, 'paramis');
  assert.equal(p.slug, 'ten-paramis');
  assert.equal(p.status, 'later');
  assert.match(p.status_note, /later list/i);
  assert.match(p.status_note, /not given as a set in the four main Nikāyas/);
  assert.equal(p.defined_in[0].id, 'bv2');
  assert.equal(dhammaList(canon, 'three marks').status, 'canonical-later-name');
});

test('dhamma_list() output: Pāli members, labelled glosses, resolved citations', () => {
  const h = dhammaList(canon, 'five hindrances');
  assert.equal(h.count, 5);
  assert.deepEqual(h.members.map((m) => m.pali), ['kāmacchanda', 'byāpāda', 'thinamiddha', 'uddhaccakukkucca', 'vicikicchā']);
  assert.match(h.gloss_note, /not translations/);
  assert.equal(h.defined_in[0].id, 'sn46.51');
  assert.ok(h.defined_in[0].title);
  assert.equal(h.topic.slug, 'n5-hindrances');
  assert.equal(dhammaList(canon, 'eightfold path').slug, 'noble-eightfold-path');
  assert.equal(dhammaList(canon, '37 aids').slug, 'thirty-seven-aids-to-awakening');
  assert.equal(dhammaList(canon, 'twelve links').slug, 'dependent-origination');
  assert.equal(dhammaList(canon, 'Brahmavihāras').slug, 'brahmaviharas');
  assert.equal(dhammaList(canon, 'Four Noble Truths').defined_in[0].id, 'sn56.11');
  const all = dhammaList(canon);
  assert.ok(all.lists.length >= 30);
  assert.throws(() => dhammaList(canon, 'qqqq zzzz'), /No numbered list matches/);
  for (const m of h.members) assert.equal(m.match, undefined);
});

test('topics feature is registered with read-only, offline tools', () => {
  assert.ok(Object.values(features).some((f) => f.register && f.dhammaList));
  const registered = [];
  const tool = (name, description, shape, fn, opts = {}) => registered.push({ name, network: !!opts.network });
  const z = { string: () => chain(), enum: () => chain(), number: () => chain() };
  function chain() { const c = new Proxy(() => c, { get: () => () => c }); return c; }
  Object.values(features).find((f) => f.dhammaList).register({ tool, z, canon });
  assert.deepEqual(registered.map((r) => r.name), ['topic', 'list_topics', 'dhamma_list']);
  assert.ok(registered.every((r) => !r.network));
});

test('data files stay small', () => {
  for (const f of ['topics.json', 'dhamma_lists.json']) {
    const size = readFileSync(new URL(`../server/data/${f}`, import.meta.url)).length;
    assert.ok(size < 1_000_000, `${f} ${size}`);
  }
});

test('every topic and list slug opens itself', () => {
  for (const t of topicsIndex().topics) assert.equal(topic(canon, t.slug).topic.slug, t.slug);
  for (const l of listsIndex().lists) assert.equal(dhammaList(canon, l.slug).slug, l.slug);
  assert.equal(topic(canon, 'dependent origination').dhamma_list.slug, 'dependent-origination');
  assert.equal(topic(canon, 'the four noble truths').dhamma_list.slug, 'four-noble-truths');
});
