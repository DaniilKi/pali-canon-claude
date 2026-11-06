import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uposatha, festivals } from '../src/calendar.mjs';

const load = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const sample = load('calendar-published-samples.json');
const reference = load('calendar-reference.json');

test('Myanmar eighth-day lunar mappings match three MOI publication samples without claiming an observance list', () => {
  for (const s of sample.myanmar_lunar_date_samples) {
    assert.ok(sample.sources[s.source].url.startsWith('https://www.moi.gov.mm/'));
    const result = uposatha(s.date, s.date, 'myanmar');
    assert.equal(result.days.length, 1);
    const d = result.days[0];
    assert.deepEqual([d.lunar_day, d.lunar_month_name, d.myanmar_year, d.phase], [s.lunar_day, s.month, s.myanmar_year, s.phase], s.date);
    assert.equal(d.status, 'computed');
    assert.match(result.disclaimer, /not an official announcement/);
  }
});

test('MyCO 2027 provides three exact full-moon holiday checks and two range-only checks', () => {
  const full = uposatha('2027-01-01', '2027-12-31', 'myanmar').days.filter((d) => d.phase === 'full');
  let exact = 0, windows = 0;
  for (const h of sample.myco_2027_full_moon_holidays) {
    const matches = full.filter((d) => d.lunar_month_name === h.month);
    assert.equal(matches.length, 1, h.month);
    if (h.from === h.to) { assert.equal(matches[0].date, h.from); exact++; }
    else { assert.ok(matches[0].date >= h.from && matches[0].date <= h.to, h.holiday); windows++; }
  }
  assert.deepEqual([exact, windows], [3, 2]);
});

test('the different MyCO and aviation 2026 Thadingyut windows both contain the computed full moon', () => {
  const myco = sample.myco_2026_thadingyut_window;
  const aviation = reference.myanmar.years['2026'].holidays.find((h) => h.month === 'Thadingyut');
  const days = uposatha('2026-10-01', '2026-10-31', 'myanmar').days.filter((d) => d.phase === 'full' && d.lunar_month_name === 'Thadingyut');
  assert.equal(days.length, 1);
  for (const window of [myco, aviation]) assert.ok(days[0].date >= window.from && days[0].date <= window.to);
});

test('the new holiday evidence does not invent a Myanmar Māgha Pūjā date', () => {
  for (const year of [2026, 2027]) {
    const m = festivals(year, 'myanmar').festivals.find((f) => f.id === 'magha-puja');
    assert.equal(m.date, null);
    assert.equal(m.status, 'not computed');
  }
});
