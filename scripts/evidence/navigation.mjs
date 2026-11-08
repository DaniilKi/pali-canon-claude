// Exhaust the compiled navigation graph; linked essays/translations are never fetched.
import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import * as topics from '../../src/topics.mjs';
import * as paritta from '../../src/paritta.mjs';
import { readAssignment } from './study.mjs';
const json = value => JSON.parse(JSON.stringify(value));

export async function auditNavigation(call) {
  const counts = { topic_catalogue_pages: 0, topics: 0, topic_text_refs: 0, topic_edges: 0,
    lists: 0, list_text_refs: 0, list_edges: 0, parittas: 0, paritta_sources: 0, paritta_pages: 0,
    canonical_readings: 0, canonical_pages: 0 };
  const data = topics.topicsIndex(), lists = topics.listsIndex();
  const topicIds = new Set(data.topics.map(t => t.slug)), listIds = new Set(lists.lists.map(l => l.slug));
  const read = new Set();
  async function text(ref) {
    const unit = canon.resolve(ref.citation).unit;
    assert.equal(ref.id, unit.id);
    assert.deepEqual(ref.read_with, { tool: 'get_text', uid: unit.id });
    assert.equal(!!ref.approximate, !!unit.approximate);
    const alignment = canon.alignmentInfo(unit);
    if (alignment) assert.deepEqual(ref.alignment, alignment);
    if (read.has(unit.id)) return;
    const checked = await readAssignment(call, { uid: unit.id }, unit);
    counts.canonical_pages += checked.pages; counts.canonical_readings++;
    read.add(unit.id);
  }
  function edge(item, tool, ids) {
    assert.ok(ids.has(item.slug), `Unknown navigation target ${item.slug}`);
    assert.deepEqual(item.read_with, { tool, name: item.slug });
  }
  const catalogue = [];
  let offset = 0;
  do {
    const page = await call('list_topics', { offset, limit: 37 });
    assert.equal(page.total, data.topics.length);
    assert.equal(page.offset, offset);
    assert.deepEqual(page.topics.map(t => t.slug), data.topics.slice(offset, offset + 37).map(t => t.slug));
    assert.equal(page.returned, page.topics.length);
    assert.equal(page.source.commit, data.source.commit);
    assert.equal(page.next_offset, offset + page.returned < page.total ? offset + page.returned : null);
    catalogue.push(...page.topics); counts.topic_catalogue_pages++;
    offset = page.next_offset;
  } while (offset !== null);
  for (const item of catalogue) {
    edge(item, 'topic', topicIds);
    const actual = await call(item.read_with.tool, { name: item.read_with.name });
    const raw = data.topics.find(t => t.slug === item.slug);
    assert.equal(actual.topic.slug, item.slug);
    assert.equal(actual.topic.ati_url, raw.ati_url);
    assert.equal(actual.source.commit, data.source.commit);
    assert.equal(actual.source.license, data.source.license);
    assert.equal(actual.texts.length, raw.texts.length);
    for (const [i, ref] of actual.texts.entries()) {
      assert.equal(ref.id, raw.texts[i].id);
      assert.equal(ref.ati_url, raw.texts[i].ati_url);
      assert.equal(ref.ati_reference, raw.texts[i].ati_reference);
      await text(ref); counts.topic_text_refs++;
    }
    assert.deepEqual((actual.see_also || []).map(e => e.slug), raw.see_also || []);
    for (const e of [...(actual.see_also || []), ...(actual.other_matches || [])]) { edge(e, 'topic', topicIds); counts.topic_edges++; }
    if (actual.dhamma_list) { edge(actual.dhamma_list, 'dhamma_list', listIds); counts.topic_edges++; }
    // Further reading remains a source link, explicitly distinguished from scripture.
    assert.equal(actual.further_reading?.length || 0, raw.further_reading?.length || 0);
    for (const [i,e] of (actual.further_reading || []).entries()) {
      assert.equal(e.url, raw.further_reading[i].url);
      if (raw.further_reading[i].scope === 'withheld-publisher-page') {
        assert.equal(e.scope, 'withheld-publisher-page');
        assert.equal(e.kind, 'External publisher page; automatic canonical mapping withheld after source review. Not an available whole-unit translation.');
        assert.equal(e.read_with, undefined);
        assert.equal(e.id, undefined);
      } else {
        assert.match(e.kind, /commentary, not scripture/);
      }
    }
    counts.topics++;
  }
  const catalogueLists = await call('dhamma_list', {});
  assert.deepEqual(catalogueLists.lists.map(l => l.slug), lists.lists.map(l => l.slug));
  for (const item of catalogueLists.lists) {
    edge(item, 'dhamma_list', listIds);
    const actual = await call(item.read_with.tool, { name: item.read_with.name });
    const raw = lists.lists.find(l => l.slug === item.slug);
    assert.equal(actual.slug, item.slug);
    assert.equal(actual.status, raw.status);
    assert.equal(actual.status_meaning, lists.status_labels[raw.status]);
    assert.equal(actual.status_note, raw.status_note);
    assert.equal(actual.count, raw.count); assert.equal(actual.members.length, raw.members.length);
    const weighted = actual.members.reduce((n,m) => n + (m.list ? lists.lists.find(l => l.slug === m.list)?.count : 1), 0);
    assert.equal(weighted, actual.count, 'Composite teaching sets retain their subgroup counts');
    assert.equal(actual.gloss_note, lists.gloss_note);
    assert.deepEqual(actual.source.pali, canon.source());
    for (const [i,m] of actual.members.entries()) {
      assert.equal(m.n, i + 1); assert.equal(m.pali, raw.members[i].pali); assert.equal(m.gloss, raw.members[i].gloss);
      assert.equal(m.list, raw.members[i].list);
      if (m.list) { edge({ slug: m.list, read_with: m.read_with }, 'dhamma_list', listIds); counts.list_edges++; }
    }
    for (const [key,rawKey] of [['defined_in','defined_in'],['see_also_texts','see_also_texts']]) {
      const refs = actual[key] || [], expected = raw[rawKey] || [];
      assert.equal(refs.length, expected.length);
      for (const [i,ref] of refs.entries()) { assert.equal(ref.id, canon.resolve(expected[i]).unit.id); await text(ref); counts.list_text_refs++; }
    }
    assert.deepEqual((actual.related_lists || []).map(e => e.slug), raw.related || []);
    for (const e of [...(actual.related_lists || []), ...(actual.other_matches || [])]) { edge(e, 'dhamma_list', listIds); counts.list_edges++; }
    if (actual.topic) { edge(actual.topic, 'topic', topicIds); counts.list_edges++; }
    counts.lists++;
  }
  const chants = await call('paritta', {});
  assert.deepEqual(chants.paritta.map(e => e.key), paritta.PARITTA.map(e => e.key));
  assert.deepEqual(chants.chanting_books, paritta.chantingBooks());
  for (const entry of chants.paritta) {
    const raw = paritta.PARITTA.find(e => e.key === entry.key);
    assert.deepEqual(entry.read_with, { tool: 'paritta', name: entry.key });
    const opened = await call('paritta', { name: entry.key });
    assert.equal(opened.text_id, canon.resolve(raw.texts[0]).unit.id);
    assert.equal(entry.texts.length, raw.texts.length);
    for (const [i, choice] of entry.texts.entries()) {
      const unit = canon.resolve(raw.texts[i]).unit;
      assert.equal(choice.text_id, unit.id);
      assert.deepEqual(choice.read_with, { tool: 'paritta', name: entry.key, text: unit.id });
      const all = canon.segments(unit);
      let expected = all;
      if (raw.passage) {
        const expression = new RegExp('\\b' + canon.fold(raw.passage).split(/\s+/u).join('[\\s\\p{P}]+') + '\\b', 'u');
        const hits = all.filter(s => expression.test(canon.fold(s.text)));
        assert.ok(hits.length);
        expected = [all.find(s => s.type === 'heading'), ...hits];
      }
      const limit = raw.passage ? 1 : 7;
      let command = { ...choice.read_with, offset: 0, limit }, index = 0;
      do {
        const { tool, ...args } = command;
        const page = await call(tool, args);
        assert.equal(page.key, entry.key); assert.equal(page.text_id, unit.id);
        assert.equal(page.citation, unit.acronym);
        assert.deepEqual(page.source, canon.source());
        assert.equal(page.terms, canon.source().terms);
        assert.equal(page.attribution, canon.source().attribution);
        assert.deepEqual(page.chanting_books, paritta.chantingBooks());
        const english = canon.describe(unit).english.map(({source,translator,reference,url,license,translation_id,translation_scope,includes_commentary}) => ({
          source,translator,reference,url,...(license ? {license} : {}),translation_id,
          ...(translation_scope ? { translation_scope, whole_unit_coverage: false } : {}),
          ...(includes_commentary ? { includes_commentary: true } : {}),
        }));
        assert.deepEqual(page.english, json(english), 'English remains source-indexed links, not chanting-book content');
        assert.deepEqual(page.other_sources || [], raw.texts.filter(t => t !== raw.texts[i]));
        if (raw.note) assert.ok(page.notes.includes(raw.note));
        assert.deepEqual(page.canonical_read_with, { tool: 'get_text', uid: unit.id });
        if (!read.has(unit.id)) {
          const checked = await readAssignment(call, { uid: page.canonical_read_with.uid }, unit);
          counts.canonical_pages += checked.pages; counts.canonical_readings++; read.add(unit.id);
        }
        assert.equal(page.total_segments, expected.length);
        assert.equal(page.offset, index);
        const part = expected.slice(index, index + limit);
        assert.deepEqual(page.segments, part);
        assert.equal(page.returned, part.length);
        index += part.length;
        assert.equal(page.next_offset, index < expected.length ? index : null);
        assert.deepEqual(page.continue_with, index < expected.length ? { tool: 'paritta', name: entry.key, text: unit.id, offset: index, limit } : null);
        command = page.continue_with; counts.paritta_pages++;
      } while (command);
      assert.equal(index, expected.length);
      counts.paritta_sources++;
    }
    counts.parittas++;
  }
  return json(counts);
}
