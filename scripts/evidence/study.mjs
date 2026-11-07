// Exhaust the shipped reading plans and daily pools without fetching linked English or guides.
import assert from 'node:assert/strict';
import * as canon from '../../src/canon.mjs';
import { GUIDE_DATA } from '../../src/daily.mjs';

const DAY = 86400000;
const json = value => JSON.parse(JSON.stringify(value));
const source = () => canon.source();
const cache = new Map();
const segments = unit => {
  if (!cache.has(unit.id)) cache.set(unit.id, canon.segments(unit));
  return cache.get(unit.id);
};
function sourceCard(card) {
  assert.deepEqual(card.pali, { name: source().name, attribution: source().attribution, terms: source().terms, commit: source().commit });
}
function english(unit) {
  return json(canon.describe(unit).english.map(({ source, translator, reference, url, license, translation_id }) => ({
    source, translator, ...(reference ? { reference } : {}), url, ...(license ? { license } : {}), translation_id,
  })));
}

/** Follow a whole reading's pages, or stop at the explicit planned-part boundary. */
export async function readAssignment(call, args, unit) {
  assert.equal(args.uid, unit.id);
  const all = segments(unit);
  const start = args.offset ?? 0;
  const end = args.limit === undefined ? all.length : start + args.limit;
  assert.ok(Number.isInteger(start) && start >= 0 && start < end && end <= all.length, 'Assigned reading must have valid, nonempty source bounds');
  let offset = start, pages = 0;
  do {
    const request = pages ? { ...args, offset, limit: 60 } : args;
    const result = await call('get_text', request);
    assert.equal(result.text_id, unit.id);
    assert.deepEqual(result.source, source(), 'Reading must retain pinned source and terms');
    assert.equal(result.attribution, source().attribution);
    assert.equal(result.offset, offset);
    assert.equal(result.total_segments, all.length);
    assert.ok(Number.isInteger(result.limit) && result.limit >= 1 && result.limit <= 200);
    const expected = all.slice(offset, Math.min(end, offset + result.limit));
    assert.deepEqual(result.segments, expected, 'Assigned page omits, repeats, changes or spills beyond source bounds');
    assert.equal(result.returned, expected.length);
    assert.ok(result.returned > 0);
    offset += result.returned; pages++;
    assert.equal(result.next_offset, offset < all.length ? offset : null);
  } while (offset < end);
  return { pages, segments: end - start, start, end };
}

export async function auditStudyCommands(call) {
  const counts = { plans: 0, plan_days: 0, plan_readings: 0, plan_pages: 0, guide_links: 0,
    verse_days: 0, sutta_days: 0, daily_pages: 0, period_checks: 0, iso_date_edges: 0 };
  const catalog = await call('reading_plan', {});
  assert.ok(catalog.plans.length >= 4);
  const mnCoverage = new Map();
  const dhpMembers = [];
  for (const plan of catalog.plans) {
    const full = await call('reading_plan', { name: plan.name });
    assert.equal(full.days, plan.days);
    assert.equal(full.schedule.length, plan.days);
    sourceCard(full.source);
    if (GUIDE_DATA[plan.name]) {
      const guide = GUIDE_DATA[plan.name];
      assert.equal(full.guide.url, guide.url);
      assert.equal(full.guide.license, guide.license);
      assert.equal(full.guide.copyright, guide.copyright);
      assert.deepEqual(full.omitted, guide.omitted.map(([path, reason]) => ({ url: `https://www.accesstoinsight.org/tipitaka/${path}.html`, reason })));
      assert.equal(full.days, guide.entries.length);
    }
    for (let day = 1; day <= plan.days; day++) {
      const actual = await call('reading_plan', { name: plan.name, day });
      assert.equal(actual.name, plan.name); assert.equal(actual.day, day); assert.equal(actual.days, plan.days);
      sourceCard(actual.source);
      const scheduled = full.schedule[day - 1];
      assert.equal(scheduled.day, day);
      assert.equal(actual.readings.length, scheduled.readings.length);
      for (const [i, reading] of actual.readings.entries()) {
        const unit = canon.resolve(reading.citation).unit;
        assert.equal(unit.id, reading.id);
        assert.equal(reading.id, scheduled.readings[i].id);
        assert.equal(reading.part, scheduled.readings[i].part);
        assert.equal(reading.of, scheduled.readings[i].of);
        assert.deepEqual(reading.english, english(unit));
        assert.equal(reading.links.suttacentral, `https://suttacentral.net/${unit.id}`);
        const checked = await readAssignment(call, reading.get_text, unit);
        counts.plan_pages += checked.pages;
        counts.plan_readings++;
        if (plan.name === 'mn-year') {
          assert.equal(checked.start, mnCoverage.get(unit.id) ?? 0, 'Each MN part must start where the previous one ended');
          mnCoverage.set(unit.id, checked.end);
        } else if (plan.name === 'dhammapada-26-days') dhpMembers.push(...unit.members);
        if (GUIDE_DATA[plan.name]) {
          const [path, id] = GUIDE_DATA[plan.name].entries[day - 1];
          const url = `https://www.accesstoinsight.org/tipitaka/${path}.html`;
          assert.equal(reading.guide_link.url, url);
          assert.equal(reading.id, id);
          assert.equal(canon.resolve(url).unit.id, id);
          const link = canon.load().translations[id].find(t => t.source === 'ati' && t.path === `/tipitaka/${path}`);
          assert.ok(link, 'Guide URL must be in the verified translation index');
          assert.equal(reading.guide_link.translator, link.translator);
          counts.guide_links++;
        }
      }
      counts.plan_days++;
    }
    counts.plans++;
  }
  assert.equal(mnCoverage.size, 152);
  for (let n = 1; n <= 152; n++) assert.equal(mnCoverage.get(`mn${n}`), segments(canon.resolve(`mn${n}`).unit).length);
  assert.deepEqual(dhpMembers, Array.from({ length: 423 }, (_, i) => `dhp${i + 1}`));
  const d = canon.load();
  const pools = {
    verse: d.canon.units.filter(u => u.collection === 'dhp' && /^dhp\d+$/.test(u.id) && u.kind !== 'range'),
    sutta: d.canon.units.filter(u => ['dn','mn','sn','an','kp','ud','iti','snp'].includes(u.collection)
      && u.kind !== 'range' && !u.approximate && d.translations[u.id]?.length),
  };
  // Consecutive dates cross leap day and year boundaries; coverage and periodicity are checked
  // independently of the production permutation's step/position calculation.
  const beginning = Date.parse('2024-01-01T00:00:00Z');
  for (const [kind, pool] of Object.entries(pools)) {
    const seen = new Set(); let first;
    for (let day = 0; day < pool.length; day++) {
      const date = new Date(beginning + day * DAY).toISOString().slice(0, 10);
      const actual = await call('daily_text', { kind, date });
      first ??= actual;
      assert.equal(actual.date, date); assert.equal(actual.kind, kind);
      assert.equal(actual.rotation.of, pool.length);
      assert.ok(actual.rotation.position >= 1 && actual.rotation.position <= pool.length);
      assert.ok(!seen.has(actual.text.id), 'A daily cycle cannot repeat before every entry is visited');
      seen.add(actual.text.id);
      const unit = canon.resolve(actual.text.citation).unit;
      assert.equal(unit.id, actual.text.id);
      sourceCard(actual.source);
      assert.deepEqual(actual.english, english(unit));
      assert.equal(actual.links.suttacentral, `https://suttacentral.net/${unit.id}`);
      if (kind === 'verse') {
        assert.deepEqual(actual.pali, segments(unit).filter(s => s.type === 'verse'));
        const chapter = canon.resolve(actual.chapter.citation).unit;
        assert.equal(chapter.id, actual.chapter.id);
        assert.ok(chapter.members.includes(unit.id), 'Daily verse must belong to the returned chapter');
      } else {
        assert.ok(actual.english.length); assert.ok(!unit.approximate);
        assert.equal(actual.first_line, canon.describe(unit).first_line);
        assert.equal(actual.segments, segments(unit).length);
      }
      assert.equal(actual.read_with.tool, 'get_text');
      assert.equal(actual.read_with.uid, unit.id);
      const { tool, note, ...arguments_ } = actual.read_with;
      assert.deepEqual(arguments_, { uid: unit.id }, 'Daily reading command must open the selected whole text');
      const checked = await readAssignment(call, arguments_, unit);
      counts.daily_pages += checked.pages; counts[`${kind}_days`]++;
    }
    assert.deepEqual([...seen].sort(), pool.map(u => u.id).sort());
    for (const delta of [0, pool.length]) {
      const date = new Date(beginning + delta * DAY).toISOString().slice(0, 10);
      const repeated = await call('daily_text', { kind, date });
      assert.equal(repeated.text.id, first.text.id);
      assert.deepEqual(repeated.rotation, first.rotation);
      counts.period_checks++;
    }
  }
  for (const date of ['0000-02-29', '0001-01-01', '0099-12-31', '0100-01-01', '2000-02-29', '9999-12-31']) {
    const actual = await call('daily_text', { date });
    assert.equal(actual.date, date);
    assert.ok(pools.verse.some(u => u.id === actual.text.id));
    counts.iso_date_edges++;
  }
  return counts;
}
