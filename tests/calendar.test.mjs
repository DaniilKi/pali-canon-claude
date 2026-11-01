import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import * as canon from '../src/canon.mjs';
import * as cal from '../src/calendar.mjs';

const ref = JSON.parse(readFileSync(new URL('./fixtures/calendar-reference.json', import.meta.url), 'utf8'));
const YEARS = ['2024', '2025', '2026'];
const addDays = (iso, n) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);
const key = (d) => `${d.date} ${d.phase}`;

test('Meeus ch. 49 example 49.a (new moon of February 1977) and ch. 47 example 47.a (moon longitude)', () => {
  const jde = cal.phaseInstant(-283, 0) / 86_400_000 + 2440587.5 + cal.deltaT(1977) / 86400;
  assert.ok(Math.abs(jde - 2443192.65118) < 0.00002, `JDE ${jde}`);
  // 1992 April 12, 0h TD: λ = 133.162655° with the full series; the 26 largest terms agree to 0.02°.
  const ms = (2448724.5 - 2440587.5) * 86_400_000 - cal.deltaT(1992) * 1000;
  assert.ok(Math.abs(cal.moonLongitude(ms) - 133.162655) < 0.02, String(cal.moonLongitude(ms)));
});

test('Thai Mahānikāya: every uposatha day 2024–2026 matches the splendidmoons calendar', () => {
  const mine = cal.uposatha('2024-01-01', '2025-12-31', 'thai-mahanikaya').days.concat(cal.uposatha('2026-01-01', '2026-12-31', 'thai-mahanikaya').days);
  const expected = ref['thai-mahanikaya'].days;
  assert.ok(expected.length > 140);
  assert.deepEqual(mine.map(key).sort(), expected.map(key).sort());
});

test('Thai Mahānikāya: festivals 2024–2026 match splendidmoons and the Wat Metta lists', () => {
  for (const y of YEARS) {
    const got = Object.fromEntries(cal.festivals(+y, 'thai-mahanikaya').festivals.map((f) => [f.id, f.date ?? f.start]));
    for (const f of ref['thai-mahanikaya'].festivals.filter((x) => x.date.startsWith(y))) assert.equal(got[f.festival], f.date, `${y} ${f.festival}`);
    for (const [id, date] of Object.entries(ref['thai-dhammayut'].years[y].festivals)) assert.equal(got[id], date, `Wat Metta ${y} ${id}`);
  }
  assert.equal(cal.thaiYearType(2025), 'adhikavara');
  assert.equal(cal.thaiYearType(2026), 'adhikamasa');
});

// Days on which Wat Metta's published "Dhammayut" list differs from the Pakkhagaṇanā count. All fall in
// May 2025 or later, and on every one of them the list gives the Mahānikāya date (docs/calendar.md).
const DHAMMAYUT_EXPLAINED = [
  '2025-05-11 full', '2025-05-19 waning-half', '2025-05-26 new', '2025-06-03 waxing-half',
  '2025-08-09 full', '2025-08-17 waning-half', '2025-10-07 full', '2025-10-15 waning-half',
  '2025-12-05 full', '2025-12-13 waning-half',
  '2026-08-13 new', '2026-08-21 waxing-half', '2026-08-28 full', '2026-09-05 waning-half',
  '2026-10-26 full', '2026-11-03 waning-half', '2026-12-24 full',
];

test('Thai Dhammayut: Pakkhagaṇanā matches Wat Metta 2024 – April 2025 exactly; later differences are the listed Mahānikāya dates', () => {
  const mine = [...cal.uposatha('2024-01-01', '2025-12-31', 'thai-dhammayut').days, ...cal.uposatha('2026-01-01', '2026-12-31', 'thai-dhammayut').days];
  const mineSet = new Set(mine.map((d) => `${d.date} ${d.phase.endsWith('half') ? 'half' : d.phase}`));
  const mn = new Set([...cal.uposatha('2024-01-01', '2025-12-31', 'thai-mahanikaya').days, ...cal.uposatha('2026-01-01', '2026-12-31', 'thai-mahanikaya').days].map((d) => `${d.date} ${d.phase.endsWith('half') ? 'half' : d.phase}`));
  const differing = [];
  for (const y of YEARS) {
    for (const d of ref['thai-dhammayut'].years[y].days) {
      const k = `${d.date} ${d.phase}`;
      if (d.mahanikaya_one_day_earlier) assert.ok(mn.has(`${addDays(d.date, -1)} ${d.phase}`), `asterisk ${k}: Mahānikāya one day earlier`);
      if (mineSet.has(k)) continue;
      assert.ok(d.date >= '2025-05-01', `unexplained Dhammayut difference before May 2025: ${k}`);
      assert.ok(mn.has(k), `${k} is the Mahānikāya date`);
      differing.push(k);
    }
  }
  const strip = (k) => k.replace(/ (waxing|waning)-half$/, ' half');
  assert.deepEqual(differing.sort(), DHAMMAYUT_EXPLAINED.map(strip).sort());
  // The Dhammayut output reports the Mahānikāya day next to each Pakkhagaṇanā day.
  const may = cal.uposatha('2025-05-01', '2025-05-31', 'thai-dhammayut').days.find((d) => d.phase === 'full');
  assert.deepEqual([may.date, may.mahanikaya_date], ['2025-05-12', '2025-05-11']);
});

test('Sri Lanka: every full-moon poya day 2024–2026 matches the government gazettes, including Adhi Poson 2026', () => {
  for (const y of YEARS) {
    const mine = cal.uposatha(`${y}-01-01`, `${y}-12-31`, 'sri-lanka').days.filter((d) => d.phase === 'full');
    const expected = ref['sri-lanka'].years[y].poya_days;
    assert.deepEqual(mine.map((d) => `${d.date} ${d.lunar_month_name}`), expected.map((p) => `${p.date} ${p.poya}`), y);
  }
  const f = Object.fromEntries(cal.festivals(2026, 'sri-lanka').festivals.map((x) => [x.id, x]));
  assert.equal(f.vesak.date, '2026-05-01');
  assert.equal(f['magha-puja'].date, '2026-02-01');
  assert.equal(f['asalha-puja'].date, '2026-07-29');
});

test('Myanmar: the full moon of each month falls inside the published holiday dates (2025, 2026)', () => {
  const NUM = { Tagu: 1, Kason: 2, Waso: 4, Thadingyut: 7, Tazaungmon: 8, Tabaung: 12 };
  for (const [y, block] of Object.entries(ref.myanmar.years)) {
    const fulls = cal.uposatha(`${y}-01-01`, `${y}-12-31`, 'myanmar').days.filter((d) => d.phase === 'full');
    for (const h of block.holidays) {
      const fm = fulls.find((d) => (+d.lunar_month >= 13 ? +d.lunar_month - 12 : +d.lunar_month) === NUM[h.month]);
      assert.ok(fm && fm.date >= h.from && fm.date <= h.to, `${y} ${h.holiday}: computed ${fm?.date}, published ${h.from}–${h.to}`);
    }
  }
  // 2026 (1388 ME) is a big watat year: a First Waso precedes Waso, and the Rains Retreat follows the second.
  const w = cal.uposatha('2026-06-01', '2026-08-31', 'myanmar').days.filter((d) => d.phase === 'full').map((d) => `${d.date} ${d.lunar_month_name}`);
  assert.deepEqual(w, ['2026-06-29 First Waso', '2026-07-29 Waso', '2026-08-28 Wagaung']);
  assert.equal(cal.festivals(2026, 'myanmar').festivals.find((f) => f.id === 'vassa-start').date, '2026-07-30');
});

test('every uposatha and festival text resolves in the bundled canon to the intended text', () => {
  const titles = {
    'Kd 1': 'Mahākhandhako', 'Kd 2': 'Sannipātānujānanā', 'Kd 3': 'Vassūpanāyikānujānanā', 'Kd 4': 'Aphāsukavihāro', 'Kd 7': 'Kathinānujānanā',
    'AN 3.70': 'Uposathasuttaṃ', 'AN 8.41': 'Saṅkhittūposathasuttaṃ', 'DN 14': 'Mahāpadānasuttaṃ', 'DN 16': 'Mahāparinibbānasuttaṃ',
    'Dhp 183': 'Buddhavaggo', 'Dhp 184': 'Buddhavaggo', 'Dhp 185': 'Buddhavaggo', 'MN 123': 'Acchariyaabbhutasuttaṃ', 'Ud 1.1': 'Paṭhamabodhisuttaṃ',
    'SN 56.11': 'Dhammacakkappavattanasuttaṃ', 'SN 22.59': 'Anattalakkhaṇasuttaṃ', 'SN 8.7': 'Pavāraṇāsuttaṃ',
  };
  const all = [...cal.UPOSATHA_TEXTS, ...Object.values(cal.FESTIVALS).flatMap((f) => f.texts)];
  for (const t of all) {
    assert.ok(t.citation in titles, `${t.citation} has an expected title in this test`);
    assert.equal(canon.resolve(t.citation).unit.title, titles[t.citation], t.citation);
    assert.ok(['canonical'].includes(t.basis));
  }
  assert.ok(cal.FESTIVALS['asalha-puja'].texts.some((t) => t.citation === 'SN 56.11'));
  // Kd 3 really contains the rule that the rains begin the day after the Āsāḷha full moon.
  assert.ok(canon.search('aparajjugatāya āsāḷhiyā').results.some((r) => r.id === 'pli-tv-kd3'));
});

test('every date is labelled computed with its rule; inputs are validated', () => {
  for (const t of cal.TRADITION_IDS) {
    const u = cal.uposatha('2025-01-01', '2025-03-31', t);
    assert.equal(u.status, 'computed');
    assert.match(u.disclaimer, /not an official announcement/);
    assert.ok(u.tradition.rule.length > 50 && u.tradition.rule_source && u.tradition.code_source);
    assert.ok(u.days.length >= 11 && u.days.every((d) => d.status === 'computed' && d.lunar_month_name && d.lunar_day));
    const f = cal.festivals(2025, t);
    assert.equal(f.festivals.length, 7);
    assert.ok(f.festivals.every((x) => x.status === (x.date || x.start ? 'computed' : 'not computed')));
  }
  assert.throws(() => cal.uposatha('2025-01-01', '2027-06-01', 'myanmar'), /two years/);
  assert.throws(() => cal.uposatha('2025-02-01', '2025-01-01', 'myanmar'), /before/);
  assert.throws(() => cal.uposatha('2025-02-30', '2025-03-01', 'myanmar'), /Not a calendar date/);
  assert.throws(() => cal.uposatha('1900-01-01', '1900-02-01', 'sri-lanka'), /1950/);
  assert.throws(() => cal.festivals(2025, 'mahayana'), /Unknown tradition/);
});

test('the feature registers two offline, read-only tools that return resolved texts', async () => {
  const tools = {};
  cal.register({ tool: (name, description, schema, fn, opts = {}) => { tools[name] = { description, schema, fn, opts }; }, z, canon });
  assert.deepEqual(Object.keys(tools).sort(), ['festivals', 'uposatha']);
  for (const t of Object.values(tools)) assert.ok(!t.opts.network);
  const r = await tools.festivals.fn({ year: 2025, tradition: 'thai-mahanikaya' });
  const asalha = r.festivals.find((f) => f.id === 'asalha-puja');
  assert.equal(asalha.date, '2025-07-10');
  assert.deepEqual(asalha.texts[0], { citation: 'SN 56.11', id: 'sn56.11', title: 'Dhammacakkappavattanasuttaṃ', role: asalha.texts[0].role, basis: 'canonical' });
  const u = await tools.uposatha.fn({ from: '2025-07-01', to: '2025-07-31', tradition: 'sri-lanka' });
  assert.ok(u.days.some((d) => d.date === '2025-07-10' && d.phase === 'full' && d.lunar_month_name === 'Esala'));
  assert.equal(u.texts[0].id, 'pli-tv-kd2');
});
