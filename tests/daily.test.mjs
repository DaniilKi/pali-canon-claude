import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { dailyText, readingPlan, listPlans, parseDate, cyclePosition, splitParts, PLAN_NAMES, GUIDE_DATA } from '../src/daily.mjs';

test('dates parse in UTC and bad dates are rejected', () => {
  assert.equal(parseDate('1970-01-01').dayNumber, 0);
  assert.equal(parseDate('2026-11-01').date, '2026-11-01');
  assert.equal(parseDate(undefined, new Date('2026-11-01T23:59:00Z')).date, '2026-11-01');
  assert.equal(parseDate(undefined, new Date('2026-11-01T23:59:00-05:00')).date, '2026-11-02');
  assert.throws(() => parseDate('2026-02-30'), /does not exist/);
  assert.throws(() => parseDate('1 Nov 2026'), /YYYY-MM-DD/);
});

test('rotation visits every item once per cycle', () => {
  for (const n of [1, 2, 26, 152, 423, 1182]) {
    const seen = new Set();
    for (let d = 0; d < n; d += 1) seen.add(cyclePosition(d, n));
    assert.equal(seen.size, n, `n=${n}`);
  }
  assert.equal(cyclePosition(-1, 423), cyclePosition(422, 423));
});

test('daily_text is deterministic and returns bundled Dhammapada verses', () => {
  const a = dailyText(canon, { date: '2026-11-01' });
  const b = dailyText(canon, { date: '2026-11-01' });
  assert.deepEqual(a, b);
  assert.equal(a.kind, 'verse');
  assert.match(a.text.id, /^dhp\d+$/);
  assert.equal(canon.resolve(a.text.citation).unit.id, a.text.id);
  assert.ok(a.pali.length >= 1);
  // The Pāli is the bundled text, word for word.
  const bundled = canon.segments(canon.resolve(a.text.id).unit).filter((s) => s.type === 'verse').map((s) => s.text);
  assert.deepEqual(a.pali.map((s) => s.text), bundled);
  assert.ok(a.source.pali.attribution);
  assert.ok(a.chapter && a.chapter.id.startsWith('dhp'));
  assert.notEqual(dailyText(canon, { date: '2026-11-02' }).text.id, a.text.id);
  assert.equal(dailyText(canon, {}, new Date('2026-11-01T12:00:00Z')).text.id, a.text.id);
});

test('daily_text covers all 423 verses in 423 days and each resolves', () => {
  const ids = new Set();
  const start = parseDate('2026-01-01').dayNumber;
  for (let i = 0; i < 423; i += 1) {
    const date = new Date((start + i) * 86400000).toISOString().slice(0, 10);
    const t = dailyText(canon, { date });
    ids.add(t.text.id);
  }
  assert.equal(ids.size, 423);
  for (let n = 1; n <= 423; n += 1) assert.ok(ids.has(`dhp${n}`), `dhp${n}`);
});

test('daily sutta is deterministic, has English and resolves', () => {
  const a = dailyText(canon, { date: '2026-11-01', kind: 'sutta' });
  assert.deepEqual(a, dailyText(canon, { date: '2026-11-01', kind: 'sutta' }));
  assert.equal(canon.resolve(a.text.citation).unit.id, a.text.id);
  assert.ok(a.english.length >= 1);
  assert.equal(a.read_with.uid, a.text.id);
  assert.ok(a.first_line);
});

test('at least three plans are listed', () => {
  const { plans } = listPlans(canon);
  assert.ok(plans.length >= 3);
  assert.deepEqual(plans.map((p) => p.name), PLAN_NAMES);
  assert.deepEqual(readingPlan(canon, {}).plans, plans);
  assert.throws(() => readingPlan(canon, { name: 'nope' }), /Available plans/);
  assert.throws(() => readingPlan(canon, { name: 'dhammapada-26-days', day: 27 }), /day 1 to day 26/);
});

test('every plan entry resolves with the bundled canon', () => {
  for (const name of PLAN_NAMES) {
    const plan = readingPlan(canon, { name });
    assert.equal(plan.schedule.length, plan.days, name);
    for (let day = 1; day <= plan.days; day += 1) {
      const { readings } = readingPlan(canon, { name, day });
      assert.ok(readings.length >= 1, `${name} day ${day}`);
      for (const r of readings) {
        assert.equal(canon.resolve(r.citation).unit.id, r.id, `${name} day ${day} ${r.citation}`);
        assert.equal(canon.resolve(r.get_text.uid).unit.id, r.id);
      }
    }
  }
});

test('Dhammapada plan: 26 chapters covering verses 1-423 in order', () => {
  const plan = readingPlan(canon, { name: 'dhammapada-26-days' });
  assert.equal(plan.days, 26);
  const ids = plan.schedule.map((d) => d.readings[0].id);
  assert.equal(ids[0], 'dhp1-20');
  assert.equal(ids[25], 'dhp383-423');
  let next = 1;
  for (const id of ids) {
    const [, from, to] = id.match(/^dhp(\d+)-(\d+)$/).map(Number);
    assert.equal(from, next);
    next = to + 1;
  }
  assert.equal(next, 424);
});

test('MN plan: 152 suttas over 365 days, every segment read exactly once', () => {
  const plan = readingPlan(canon, { name: 'mn-year' });
  assert.equal(plan.days, 365);
  const covered = new Map();
  for (let day = 1; day <= 365; day += 1) {
    const [r] = readingPlan(canon, { name: 'mn-year', day }).readings;
    const { offset, limit } = r.get_text;
    assert.ok(limit >= 1 && limit <= 200, `day ${day}`);
    const prev = covered.get(r.id) ?? 0;
    assert.equal(offset, prev, `${r.id} continues where the last day stopped`);
    covered.set(r.id, offset + limit);
  }
  assert.equal(covered.size, 152);
  for (let n = 1; n <= 152; n += 1) {
    const u = canon.resolve(`MN ${n}`).unit;
    assert.equal(covered.get(u.id), canon.segments(u).length, u.id);
  }
});

test('splitParts keeps every part non-empty', () => {
  assert.deepEqual(splitParts([5, 5, 5, 5], 2), [[0, 2], [2, 2]]);
  assert.deepEqual(splitParts([100, 1, 1], 3), [[0, 1], [1, 1], [2, 1]]);
  assert.deepEqual(splitParts([3], 1), [[0, 1]]);
});

test('study-guide sources have verified whole-link identities or explicit reviewed external-excerpt subjects', () => {
  const translations = canon.load().translations;
  for (const [name, guide] of Object.entries(GUIDE_DATA)) {
    assert.match(guide.url, /^https:\/\/www\.accesstoinsight\.org\/lib\/study\//);
    for (const [path, id] of guide.entries) {
      const url = `https://www.accesstoinsight.org/tipitaka/${path}.html`;
      const day = guide.entries.findIndex(([p]) => p === path) + 1;
      const reading = readingPlan(canon,{name,day}).readings[0];
      if (reading.guide_link.scope === 'withheld-publisher-page') {
        assert.ok(['mn/mn.075x.than','mn/mn.095x.than'].includes(path));
        assert.equal(reading.id,id);assert.equal(reading.guide_link.whole_unit_coverage,false);
        assert.equal(reading.guide_link.individual_alignment_verified,false);
        assert.match(reading.notes.join(' '),/publisher excerpt/);
        assert.throws(()=>canon.resolve(url),/not linked/);
      } else {
        assert.equal(canon.resolve(url).unit.id, id, `${name} ${path}`);
        assert.ok((translations[id] || []).some((t) => t.source === 'ati' && t.path === `/tipitaka/${path}`), `${id} links ${path}`);
      }
    }
    const plan = readingPlan(canon, { name });
    assert.equal(plan.days, guide.entries.length);
    assert.equal(plan.guide.license, 'CC BY-NC 4.0');
    assert.ok(plan.omitted.length === guide.omitted.length);
    const day1 = readingPlan(canon, { name, day: 1 }).readings[0];
    assert.equal(day1.guide_link.url, `https://www.accesstoinsight.org/tipitaka/${guide.entries[0][0]}.html`);
  }
  // PTS-numbered AN pages are reported with the translator's own reference (ATI's AN 7.64 is AN 7.68 here).
  const stream = readingPlan(canon, { name: 'ati-into-the-stream' }).schedule.map((d) => d.readings[0].id);
  assert.ok(stream.includes('an7.68'));
  assert.ok(!stream.includes('iti1'), 'Iti verses inside a multi-text page are not placed by number');
});

test('tools register read-only and offline', () => {
  const tools = [];
  const z = { string: () => chain(), number: () => chain(), enum: () => chain() };
  function chain() { const o = new Proxy({}, { get: () => () => o }); return o; }
  const mod = { tool: (name, description, shape, fn, opts) => tools.push({ name, opts }), z };
  return import('../src/daily.mjs').then((m) => {
    m.register(mod);
    assert.deepEqual(tools.map((t) => t.name), ['daily_text', 'reading_plan']);
    assert.ok(tools.every((t) => !t.opts?.network));
  });
});
