// Uposatha (observance day) and festival calendar: pure JavaScript, offline, no data files.
//
// Every date this module returns is COMPUTED from a named rule; none is an official
// announcement. The rules, their sources and the checks against published calendars for
// 2024–2026 are documented in docs/calendar.md; tests/calendar.test.mjs compares the output
// with the published reference dates in tests/fixtures/calendar-reference.json.
//
// Four reckonings:
//   thai-mahanikaya  Thai lunar calendar (Suriyayatra / Chulasakarat rules for adhikamāsa and
//                    adhikavāra years), ported from splendidmoons (MIT, © 2023 Gambhiro Bhikkhu):
//                    https://github.com/splendidmoons/splendidmoons
//   thai-dhammayut   Pakkhagaṇanā fortnight reckoning, ported from pythaidate's PakDate
//                    (MIT, © 2023 Mark Hollow): https://github.com/hmmbug/pythaidate
//   myanmar          Modern Burmese calendar arithmetic (third era, 1312 ME onwards), ported from
//                    ceMmDateTime.js (MIT, © 2018 Yan Naing Aye): https://github.com/yan9a/mmcal
//   sri-lanka        Lunar days (tithi) from the real sun and moon (Meeus, Astronomical
//                    Algorithms, ch. 25, 47 and 49) in Sri Lanka time (UTC+5:30).

const DAY_MS = 86_400_000;
const rad = Math.PI / 180;

export const TRADITIONS = {
  'thai-mahanikaya': {
    name: 'Thai Mahānikāya',
    time_zone: 'Asia/Bangkok (UTC+7)',
    utcOffsetMinutes: 420,
    rule: 'Thai lunisolar calendar (the civil "wan phra" calendar). Months alternate 29 days (odd months) and 30 days (even months). A year is common (354 days), adhikavāra (355: month 7 gets a 30th day) or adhikamāsa (384: a second month 8, "2nd Āsāḷha"), decided by the Suriyayatra / Chulasakarat rules (horakhun, kammacubala, avoman and tithi of the year) as implemented by splendidmoons. Uposatha falls on the 8th and 15th (full moon) of the waxing fortnight and the 8th and last day (14th or 15th, new moon) of the waning fortnight.',
    rule_source: 'https://splendidmoons.github.io/how-to-calculate-uposathas',
    code_source: 'https://github.com/splendidmoons/splendidmoons (MIT, © 2023 Gambhiro Bhikkhu)',
  },
  'thai-dhammayut': {
    name: 'Thai Dhammayut',
    time_zone: 'Asia/Bangkok (UTC+7)',
    utcOffsetMinutes: 420,
    rule: 'Pakkhagaṇanā (ปักขคณนา), the fortnight reckoning kept by the Dhammayut order, which follows the real moon more closely than the civil calendar, so some uposatha days differ from the Mahānikāya ones by one day (earlier or later). Fortnights of 14 or 15 days are counted on the Pakkhagaṇanā board from its epoch (1736-01-28); uposatha falls on the 8th and the last day of each fortnight. Festival months follow the Thai lunar calendar.',
    rule_source: 'docs/calendar.md',
    code_source: 'https://github.com/hmmbug/pythaidate (MIT, © 2023 Mark Hollow)',
  },
  myanmar: {
    name: 'Myanmar (Burmese calendar)',
    time_zone: 'Asia/Yangon (UTC+6:30)',
    utcOffsetMinutes: 390,
    rule: 'Burmese lunisolar calendar, third era (1312 ME = 1950 CE onwards): the mean full moon of (2nd) Waso fixes the year; watat years insert a 30-day 1st Waso, big-watat years also give Nayon 30 days; months alternate 29 and 30 days. Uposatha (ဥပုသ်) falls on the 8th, 15th (full moon), 23rd and last day (new moon) of each month.',
    rule_source: 'https://cool-emerald.blogspot.com/2013/06/algorithm-program-and-calculation-of.html',
    code_source: 'https://github.com/yan9a/mmcal (MIT, © 2018 Yan Naing Aye)',
  },
  'sri-lanka': {
    name: 'Sri Lanka (poya days)',
    time_zone: 'Asia/Colombo (UTC+5:30)',
    utcOffsetMinutes: 330,
    rule: 'A poya day is the day on whose evening (18:00 Sri Lanka time) the lunar day (tithi) of the full moon is current: the sun–moon elongation is between 168° and 180°. If no 18:00 falls inside that tithi, the day of the full moon itself. New-moon and quarter-moon days use the same rule with tithis 30, 8 and 23. Months are named by the sidereal (Lahiri ayanāṃsa) sign of the sun at the new moon that opens them (amānta reckoning); a month in which the sun does not change sign is an adhi (extra) month and takes the name of the next month.',
    rule_source: 'docs/calendar.md',
    code_source: 'Meeus, Astronomical Algorithms (2nd ed., 1998), chapters 25, 47 and 49',
  },
};

// ---------------------------------------------------------------------------
// Astronomy (Meeus, Astronomical Algorithms, 2nd ed.)

/** ΔT = TT − UT in seconds (Espenak & Meeus 2006 polynomials), valid 1941–2150. */
export function deltaT(year) {
  if (year < 1961) { const t = year - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (year < 1986) { const t = year - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (year < 2005) { const t = year - 2000; return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (year < 2050) { const t = year - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u - 0.5628 * (2150 - year);
}

const jdToMs = (jd) => (jd - 2440587.5) * DAY_MS;
const msToJd = (ms) => ms / DAY_MS + 2440587.5;

/**
 * Instant (UTC, ms since epoch) of a lunar phase. k is an integer lunation count from the
 * new moon of 2000-01-06; phase 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
 * Meeus ch. 49 with the periodic and the fourteen additional corrections; ΔT removed.
 */
export function phaseInstant(k, phase) {
  k += phase;
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * rad;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * rad;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * rad;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * rad;
  const s = Math.sin;
  let c;
  if (phase === 0 || phase === 0.5) {
    const n = phase === 0;
    c = (n ? -0.4072 : -0.40614) * s(Mp) + (n ? 0.17241 : 0.17302) * E * s(M) + (n ? 0.01608 : 0.01614) * s(2 * Mp)
      + (n ? 0.01039 : 0.01043) * s(2 * F) + (n ? 0.00739 : 0.00734) * E * s(Mp - M) - (n ? 0.00514 : 0.00515) * E * s(Mp + M)
      + (n ? 0.00208 : 0.00209) * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F)
      + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
      - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O) - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F)
      + 0.00004 * s(3 * M) + 0.00003 * s(Mp + M - 2 * F) + 0.00003 * s(2 * Mp + 2 * F) - 0.00003 * s(Mp + M + 2 * F)
      + 0.00003 * s(Mp - M + 2 * F) - 0.00002 * s(Mp - M - 2 * F) - 0.00002 * s(3 * Mp + M) + 0.00002 * s(4 * Mp);
  } else {
    c = -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F)
      + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.0018 * s(Mp - 2 * F) - 0.0007 * s(Mp + 2 * F)
      - 0.0004 * s(3 * Mp) - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F)
      - 0.00028 * E * E * s(Mp + 2 * M) + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(O) - 0.00005 * s(Mp - M - 2 * F)
      + 0.00004 * s(2 * Mp + 2 * F) - 0.00004 * s(Mp + M + 2 * F) + 0.00004 * s(Mp - 2 * M) + 0.00003 * s(Mp + M - 2 * F)
      + 0.00003 * s(3 * M) + 0.00002 * s(2 * Mp - 2 * F) + 0.00002 * s(Mp - M + 2 * F) - 0.00002 * s(3 * Mp + M);
    const W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M)
      + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F);
    c += phase === 0.25 ? W : -W;
  }
  const A = [
    [325, 299.77 + 0.107408 * k - 0.009173 * T * T], [165, 251.88 + 0.016321 * k], [164, 251.83 + 26.651886 * k],
    [126, 349.42 + 36.412478 * k], [110, 84.66 + 18.206239 * k], [62, 141.74 + 53.303771 * k], [60, 207.14 + 2.453732 * k],
    [56, 154.84 + 7.30686 * k], [47, 34.52 + 27.261239 * k], [42, 207.19 + 0.121824 * k], [40, 291.34 + 1.844379 * k],
    [37, 161.72 + 24.198154 * k], [35, 239.56 + 25.513099 * k], [23, 331.55 + 3.592518 * k],
  ];
  for (const [coef, deg] of A) c += coef * 1e-6 * s(deg * rad);
  jde += c;
  const year = 2000 + k / 12.3685;
  return jdToMs(jde) - deltaT(year) * 1000;
}

const PHASES = [['new', 0], ['first-quarter', 0.25], ['full', 0.5], ['last-quarter', 0.75]];

/** Astronomical phases with instants in [fromMs, toMs). */
export function moonPhases(fromMs, toMs) {
  const out = [];
  let k = Math.floor((fromMs - jdToMs(2451550.09766)) / (29.530588861 * DAY_MS)) - 1;
  for (; ; k++) {
    for (const [name, p] of PHASES) {
      const t = phaseInstant(k, p);
      if (t >= toMs) return out;
      if (t >= fromMs) out.push({ phase: name, instant: t, k });
    }
  }
}

/** Apparent geocentric longitude of the sun in degrees (Meeus ch. 25, low accuracy). */
export function sunLongitude(ms) {
  const T = (msToJd(ms) - 2451545) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  return (((L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) % 360) + 360) % 360;
}

/** Lahiri (Chitrapaksha) ayanāṃsa in degrees, linear approximation: 23.853° at J2000 + 50.29″ a year. */
export function lahiriAyanamsa(ms) {
  const years = (msToJd(ms) - 2451545) / 365.25;
  return 23.853 + (50.29 / 3600) * years;
}

// ---------------------------------------------------------------------------
// Civil-date helpers (dates are 'YYYY-MM-DD' strings; arithmetic in UTC days)

const parseDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Dates must be YYYY-MM-DD (got "${iso}").`);
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (new Date(ms).toISOString().slice(0, 10) !== iso) throw new Error(`Not a calendar date: ${iso}.`);
  return ms;
};
const fmt = (ms) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso, n) => fmt(parseDate(iso) + n * DAY_MS);
/** Local civil date of a UTC instant in a fixed-offset time zone. */
export const localDate = (ms, offsetMinutes) => fmt(Math.floor((ms + offsetMinutes * 60_000) / DAY_MS) * DAY_MS);

// ---------------------------------------------------------------------------
// Thai lunar calendar (Mahānikāya), after splendidmoons (MIT, © 2023 Gambhiro Bhikkhu).

const ERA_DAYS = 292207, ERA_HORAKHUN = 373, KAMMACUBALA_DAILY = 800, ERA_AVOMAN = 650, CYCLE_SOLAR = 692, CYCLE_DAILY = 11;

function suriya(ceYear) {
  const cs = ceYear - 638;
  const a = cs * ERA_DAYS + ERA_HORAKHUN;
  const horakhun = Math.floor(a / KAMMACUBALA_DAILY + 1);
  const kammacubala = KAMMACUBALA_DAILY - (a % KAMMACUBALA_DAILY);
  const b = horakhun * CYCLE_DAILY + ERA_AVOMAN;
  const avoman = b % CYCLE_SOLAR;
  const tithi = (Math.floor(b / CYCLE_SOLAR) + horakhun) % 30;
  return { kammacubala, avoman, tithi };
}
const wouldBeAdhikamasa = (y) => { const t = suriya(y).tithi; return (t >= 24 && t <= 29) || (t >= 0 && t <= 5); };
const isAdhikamasa = (y) => wouldBeAdhikamasa(y) && !wouldBeAdhikamasa(y + 1);
const wouldBeAdhikavara = (y) => { const s = suriya(y); return s.kammacubala <= 207 ? s.avoman <= 126 : s.avoman < 137; };
const isAdhikavara = (y) => !isAdhikamasa(y) && ((isAdhikamasa(y - 1) && wouldBeAdhikavara(y - 1)) || wouldBeAdhikavara(y));

/** Thai lunar year type for the year whose Āsāḷha falls in CE year y. */
export function thaiYearType(y) {
  return isAdhikamasa(y) ? 'adhikamasa' : isAdhikavara(y) ? 'adhikavara' : 'common';
}
const thaiYearLength = (y) => 354 + (isAdhikamasa(y) ? 30 : isAdhikavara(y) ? 1 : 0);

const KATTIKA_EPOCH = { year: 2015, date: '2015-11-25' }; // Kattika full moon (month 12) of 2015, splendidmoons epoch
const kattikaCache = new Map();
/** Full moon of month 12 (Kattika) that ends Thai lunar year y (falls in CE year y). */
function kattika(y) {
  if (kattikaCache.has(y)) return kattikaCache.get(y);
  let date = KATTIKA_EPOCH.date;
  if (y >= KATTIKA_EPOCH.year) for (let i = KATTIKA_EPOCH.year + 1; i <= y; i++) date = addDays(date, thaiYearLength(i));
  else for (let i = KATTIKA_EPOCH.year; i > y; i--) date = addDays(date, -thaiYearLength(i));
  kattikaCache.set(y, date);
  return date;
}

export const THAI_MONTHS = { 1: 'Magasira', 2: 'Phussa', 3: 'Māgha', 4: 'Phagguṇa', 5: 'Citta', 6: 'Visākha', 7: 'Jeṭṭha', 8: 'Āsāḷha', 9: 'Savaṇa', 10: 'Bhaddapāda', 11: 'Assayuja', 12: 'Kattika' };

/** Lunar months of Thai year y: from the day after the new moon that ends the previous Kattika (month 12) to the new moon that ends this year's. */
export function thaiMonths(y) {
  const adhikamasa = isAdhikamasa(y), adhikavara = isAdhikavara(y);
  const months = [];
  let day = addDays(kattika(y - 1), 16);
  for (const m of [1, 2, 3, 4, 5, 6, 7, 8, ...(adhikamasa ? ['8b'] : []), 9, 10, 11, 12]) {
    let length = m === '8b' ? 30 : m % 2 ? 29 : 30;
    if (m === 7 && adhikavara) length = 30;
    months.push({ year: y, month: m === '8b' ? 8 : m, second: m === '8b', name: m === '8b' ? '2nd Āsāḷha' : THAI_MONTHS[m], start: day, length });
    day = addDays(day, length);
  }
  return months;
}

/** Thai lunar year (by its Āsāḷha's CE year) that contains a civil date. */
function thaiYearOf(iso) {
  const y = +iso.slice(0, 4);
  return iso > addDays(kattika(y), 15) ? y + 1 : y;
}

// ---------------------------------------------------------------------------
// Burmese calendar (third era), after ceMmDateTime.js (MIT, © 2018 Yan Naing Aye).

const MM_SY = 1577917828.0 / 4320000.0; // solar year
const MM_LM = 1577917828.0 / 53433336.0; // lunar month
const MM_MO = 1954168.050623; // beginning of 0 ME
export const MYANMAR_MONTHS = { 0: 'First Waso', 1: 'Tagu', 2: 'Kason', 3: 'Nayon', 4: 'Waso', 5: 'Wagaung', 6: 'Tawthalin', 7: 'Thadingyut', 8: 'Tazaungmon', 9: 'Nadaw', 10: 'Pyatho', 11: 'Tabodwe', 12: 'Tabaung', 13: 'Late Tagu', 14: 'Late Kason' };

function mmConst(my) {
  // Third era (after independence, 1312 ME on) and second era (1217–1311 ME, needed only to look back a few years).
  if (my < 1217) throw new Error('The Burmese calendar is computed only from 1312 ME (1950 CE).');
  const third = my >= 1312;
  let WO = third ? -0.5 : -1, EW = 0;
  const fme = third ? [[1377, 1]] : [[1234, 1], [1261, -1]];
  const wte = third ? [1344, 1345] : [1263, 1264];
  for (const [y, o] of fme) if (y === my) WO += o;
  if (wte.includes(my)) EW = 1;
  return { WO, NM: third ? 8 : 4, EW };
}
function mmWatat(my) {
  const c = mmConst(my);
  const TA = (MM_SY / 12 - MM_LM) * (12 - c.NM);
  let ed = (MM_SY * (my + 3739)) % MM_LM;
  if (ed < TA) ed += MM_LM;
  const fm = Math.round(MM_SY * my + MM_MO - ed + 4.5 * MM_LM + c.WO);
  const TW = MM_LM - (MM_SY / 12 - MM_LM) * c.NM;
  return { fm, watat: (ed >= TW ? 1 : 0) ^ c.EW };
}
function mmYear(my) {
  const y2 = mmWatat(my);
  let myt = y2.watat, yd = 0, y1;
  do { yd++; y1 = mmWatat(my - yd); } while (y1.watat === 0 && yd < 3);
  if (myt) myt = Math.floor(((y2.fm - y1.fm) % 354) / 31) + 1;
  return { myt, tg1: y1.fm + 354 * yd - 102 };
}
/** Julian day number → Burmese date { my, mm, md, myt }. */
export function myanmarDate(jdn) {
  const my = Math.floor((jdn - 0.5 - MM_MO) / MM_SY);
  const yo = mmYear(my);
  let dd = jdn - yo.tg1 + 1;
  const b = Math.floor(yo.myt / 2), c = Math.floor(1 / (yo.myt + 1));
  const myl = 354 + (1 - c) * 30 + b;
  const mmt = Math.floor((dd - 1) / myl);
  dd -= mmt * myl;
  const a = Math.floor((dd + 423) / 512);
  let mm = Math.floor((dd - b * a + c * a * 30 + 29.26) / 29.544);
  const e = Math.floor((mm + 12) / 16), f = Math.floor((mm + 11) / 16);
  const md = dd - Math.floor(29.544 * mm - 29.26) - b * e + c * f * 30;
  mm += f * 3 - e * 4 + 12 * mmt;
  return { my, mm, md, myt: yo.myt };
}
const mmMonthLength = (mm, myt) => 30 - (mm % 2) + (mm === 3 ? Math.floor(myt / 2) : 0);
const isoToJdn = (iso) => Math.round(msToJd(parseDate(iso)) + 0.5);

function myanmarDay(iso) {
  const d = myanmarDate(isoToJdn(iso));
  const len = mmMonthLength(d.mm, d.myt);
  const base = d.mm >= 13 ? d.mm - 12 : d.mm;
  return { ...d, length: len, name: MYANMAR_MONTHS[d.mm], base };
}

// ---------------------------------------------------------------------------
// Pakkhagaṇanā (ปักขคณนา), the Dhammayut fortnight reckoning, after pythaidate's PakDate
// (MIT, © 2023 Mark Hollow): https://github.com/hmmbug/pythaidate

const PAK_JDN_OFFSET = 2355147; // epoch 1736-01-28 CE
const PAK_DAYS_IN_CYCLE = 289577;
// 1 = "mahā" (15-day) and 0 = "cūḷa" (14-day) patterns for each level of the board.
const PAK_LAYOUT = [
  [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]],
  [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 1]],
  [[1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 0]],
  [[0, 0, 0, 1], [0, 0, 1]],
  [[1, 1, 1, 1, 0], [1, 1, 1, 0]],
];

/** Pakkhagaṇanā position of a Julian day number: { day (1–15), fortnightLength (14|15), waxing }. */
export function pakkhaDay(jdn) {
  const horakhun = jdn - PAK_JDN_OFFSET;
  if (horakhun <= 0) throw new Error('Before the Pakkhagaṇanā epoch (1736).');
  let days = horakhun % PAK_DAYS_IN_CYCLE;
  if (days === 0) days = PAK_DAYS_IN_CYCLE;
  const cycle = Math.ceil(horakhun / PAK_DAYS_IN_CYCLE);
  const div = (a, b) => { let c = 0; while (b < a) { a -= b; c++; } return [c + 1, a]; };
  const data = [];
  let rem;
  [data[0], rem] = div(days, 16168);
  let maha = PAK_LAYOUT[0][0][data[0] - 1];
  for (const [row, divisor] of [[1, 1447], [2, 251], [3, 59], [4, 15]]) {
    [data[row], rem] = div(rem, divisor);
    let next = PAK_LAYOUT[row][1 - maha][data[row] - 1];
    if (next === undefined) {
      data[row] -= 1;
      rem += divisor;
      next = PAK_LAYOUT[row][1 - maha][data[row] - 1];
    }
    maha = next;
  }
  const pakkhagen = (cycle - 1) * 19612 + (data[0] - 1) * 1095 + (data[1] - 1) * 98 + (data[2] - 1) * 17 + (data[3] - 1) * 4 + data[4];
  return { day: rem, fortnightLength: maha ? 15 : 14, waxing: pakkhagen % 2 === 0 };
}

// ---------------------------------------------------------------------------
// Moon longitude and lunar days (tithi) for the Sri Lankan reckoning

/** Geocentric ecliptic longitude of the moon in degrees: Meeus ch. 47, the 26 largest periodic terms (about 0.01°). */
export function moonLongitude(ms) {
  const T = (msToJd(ms) + deltaT(1970 + ms / (365.2425 * DAY_MS)) / 86400 - 2451545) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * rad;
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * rad;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * rad;
  const F = (93.272095 + 483202.0175233 * T - 0.0036539 * T * T) * rad;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const s = Math.sin;
  const sum = 6.288774 * s(Mp) + 1.274027 * s(2 * D - Mp) + 0.658314 * s(2 * D) + 0.213618 * s(2 * Mp) - 0.185116 * E * s(M)
    - 0.114332 * s(2 * F) + 0.058793 * s(2 * D - 2 * Mp) + 0.057066 * E * s(2 * D - M - Mp) + 0.053322 * s(2 * D + Mp)
    + 0.045758 * E * s(2 * D - M) - 0.040923 * E * s(M - Mp) - 0.03472 * s(D) - 0.030383 * E * s(M + Mp)
    + 0.015327 * s(2 * D - 2 * F) - 0.012528 * s(Mp + 2 * F) + 0.01098 * s(Mp - 2 * F) + 0.010675 * s(4 * D - Mp)
    + 0.010034 * s(3 * Mp) + 0.008548 * s(4 * D - 2 * Mp) - 0.007888 * E * s(2 * D + M - Mp) - 0.006766 * E * s(2 * D + M)
    - 0.005163 * s(D - Mp) + 0.004987 * E * s(D + M) + 0.004036 * E * s(2 * D - M + Mp)
    + 0.003958 * s((119.75 + 131.849 * T) * rad) + 0.001962 * s(Lp * rad - F) + 0.000318 * s((53.09 + 479264.29 * T) * rad);
  return (((Lp + sum) % 360) + 360) % 360;
}

/** Sun–moon elongation in degrees [0, 360). */
export const elongation = (ms) => (((moonLongitude(ms) - sunLongitude(ms)) % 360) + 360) % 360;

/** Instant near `approxMs` at which the elongation equals `deg` (Newton steps on the mean synodic rate). */
function elongationCrossing(deg, approxMs) {
  let t = approxMs;
  for (let i = 0; i < 12; i++) {
    let e = elongation(t) - deg;
    e = (((e % 360) + 540) % 360) - 180;
    if (Math.abs(e) < 1e-6) break;
    t -= (e / 12.190749) * DAY_MS;
  }
  return t;
}

const SL_EVENING_HOUR = 18;
const SL_TITHI_END = { 'waxing-half': 96, full: 180, 'waning-half': 276, new: 360 };
const SL_TITHI_NAME = { 'waxing-half': 'śukla aṣṭamī (8)', full: 'pūrṇimā (15)', 'waning-half': 'kṛṣṇa aṣṭamī (23)', new: 'amāvāsyā (30)' };

/** Sri Lankan observance day for the tithi of `phase` whose end lies near `approxMs`. */
function sriLankaDay(phase, approxMs) {
  const end = elongationCrossing(SL_TITHI_END[phase] % 360, approxMs);
  const start = elongationCrossing(SL_TITHI_END[phase] - 12, end - 0.95 * DAY_MS);
  const off = TRADITIONS['sri-lanka'].utcOffsetMinutes * 60_000;
  const endDay = Math.floor((end + off) / DAY_MS);
  for (let day = endDay; day >= endDay - 1; day--) {
    const evening = day * DAY_MS + SL_EVENING_HOUR * 3_600_000 - off;
    if (evening >= start && evening < end) return { date: fmt(day * DAY_MS), start, end };
  }
  return { date: fmt(endDay * DAY_MS), start, end };
}

export const SRI_LANKA_MONTHS = ['Bak', 'Vesak', 'Poson', 'Esala', 'Nikini', 'Binara', 'Vap', 'Il', 'Unduvap', 'Duruthu', 'Navam', 'Medin'];
const SANSKRIT_MONTHS = ['Caitra', 'Vaiśākha', 'Jyeṣṭha', 'Āṣāḍha', 'Śrāvaṇa', 'Bhādrapada', 'Āśvina', 'Kārttika', 'Mārgaśīrṣa', 'Pauṣa', 'Māgha', 'Phālguna'];
const siderealSign = (ms) => Math.floor(((((sunLongitude(ms) - lahiriAyanamsa(ms)) % 360) + 360) % 360) / 30);

/** Sri Lankan days (all four phases) for lunations around [fromMs, toMs). */
function sriLankaDays(fromMs, toMs) {
  const phases = moonPhases(fromMs - 40 * DAY_MS, toMs + 40 * DAY_MS);
  const news = phases.filter((p) => p.phase === 'new');
  const map = { new: 'new', 'first-quarter': 'waxing-half', full: 'full', 'last-quarter': 'waning-half' };
  const out = [];
  for (const p of phases) {
    if (p.instant < fromMs - 2 * DAY_MS || p.instant >= toMs + 2 * DAY_MS) continue;
    const phase = map[p.phase];
    // The amānta month runs from one new moon to the next; a new-moon day closes its month.
    const opening = news.filter((n) => n.instant < p.instant - (p.phase === 'new' ? DAY_MS : 0)).at(-1);
    const closing = opening && news.find((n) => n.instant > opening.instant + DAY_MS);
    if (!opening || !closing) continue;
    const s1 = siderealSign(opening.instant), s2 = siderealSign(closing.instant);
    const idx = (s1 + 1) % 12;
    const adhi = s1 === s2;
    const day = sriLankaDay(phase, p.instant);
    out.push({
      date: day.date,
      phase,
      lunar_day: SL_TITHI_NAME[phase],
      lunar_month_name: `${adhi ? 'Adhi ' : ''}${SRI_LANKA_MONTHS[idx]}`,
      lunar_month_sanskrit: `${adhi ? 'Adhika ' : ''}${SANSKRIT_MONTHS[idx]}`,
      tithi_utc: { start: new Date(day.start).toISOString().slice(0, 16) + 'Z', end: new Date(day.end).toISOString().slice(0, 16) + 'Z' },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Day generators: each returns days with date, phase, lunar_day and lunar month

const PHASE_LABEL = { 'waxing-half': 'Waxing half moon (8th)', full: 'Full moon', 'waning-half': 'Waning half moon (8th)', new: 'New moon' };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function mahanikayaDays(from, to) {
  const out = [];
  for (let y = thaiYearOf(from); y <= thaiYearOf(to); y++) {
    for (const mo of thaiMonths(y)) {
      const month = { lunar_month: mo.second ? '8 (second Āsāḷha)' : String(mo.month), lunar_month_name: mo.name, lunar_year_type: thaiYearType(y) };
      out.push({ date: addDays(mo.start, 7), phase: 'waxing-half', lunar_day: 'waxing 8', ...month });
      out.push({ date: addDays(mo.start, 14), phase: 'full', lunar_day: 'waxing 15', ...month });
      out.push({ date: addDays(mo.start, 22), phase: 'waning-half', lunar_day: 'waning 8', ...month });
      out.push({ date: addDays(mo.start, mo.length - 1), phase: 'new', lunar_day: `waning ${mo.length - 15}`, ...month });
    }
  }
  return out.filter((d) => d.date >= from && d.date <= to);
}

const closest = (days, phase, ms) => days.filter((d) => d.phase === phase)
  .sort((a, b) => Math.abs(parseDate(a.date) - ms) - Math.abs(parseDate(b.date) - ms))[0];

function dhammayutDays(from, to) {
  const mn = mahanikayaDays(addDays(from, -3), addDays(to, 3));
  const out = [];
  for (let ms = parseDate(from); ms <= parseDate(to); ms += DAY_MS) {
    const p = pakkhaDay(Math.round(msToJd(ms) + 0.5));
    if (p.day !== 8 && p.day !== p.fortnightLength) continue;
    const phase = p.day === 8 ? (p.waxing ? 'waxing-half' : 'waning-half') : (p.waxing ? 'full' : 'new');
    const day = { date: fmt(ms), phase, lunar_day: `${p.waxing ? 'waxing' : 'waning'} ${p.day}`, fortnight_days: p.fortnightLength };
    const twin = closest(mn, phase, ms);
    if (twin) Object.assign(day, { lunar_month: twin.lunar_month, lunar_month_name: twin.lunar_month_name, mahanikaya_date: twin.date });
    out.push(day);
  }
  return out;
}

function myanmarDays(from, to) {
  const out = [];
  for (let ms = parseDate(from); ms <= parseDate(to); ms += DAY_MS) {
    const d = myanmarDay(fmt(ms));
    const phase = d.md === 8 ? 'waxing-half' : d.md === 15 ? 'full' : d.md === 23 ? 'waning-half' : d.md === d.length ? 'new' : null;
    if (!phase) continue;
    out.push({
      date: fmt(ms), phase, lunar_day: d.md <= 15 ? `waxing ${d.md}` : `waning ${d.md - 15}`,
      lunar_month: String(d.mm), lunar_month_name: d.name, myanmar_year: d.my, myanmar_year_type: ['common', 'little watat', 'big watat'][d.myt],
    });
  }
  return out;
}

const sriLankaDaysIn = (from, to) => sriLankaDays(parseDate(from), parseDate(to) + DAY_MS).filter((d) => d.date >= from && d.date <= to);

const GENERATORS = { 'thai-mahanikaya': mahanikayaDays, 'thai-dhammayut': dhammayutDays, myanmar: myanmarDays, 'sri-lanka': sriLankaDaysIn };

// ---------------------------------------------------------------------------
// Texts associated with uposatha and the festivals (the tool resolves each against the bundled canon)

export const UPOSATHA_TEXTS = [
  { citation: 'Kd 2', role: 'Uposathakkhandhaka (Mahāvagga 2): the Vinaya rules for the monastic uposatha and the recitation of the Pāṭimokkha.', basis: 'canonical' },
  { citation: 'AN 3.70', role: 'Uposathasutta: the Buddha to Visākhā on kinds of uposatha observance.', basis: 'canonical' },
  { citation: 'AN 8.41', role: 'Saṅkhittūposathasutta: the uposatha with eight factors kept by lay followers.', basis: 'canonical' },
];

export const FESTIVALS = {
  'magha-puja': {
    name: 'Māgha Pūjā',
    texts: [
      { citation: 'DN 14', role: 'Mahāpadānasutta, which contains the Ovāda-pāṭimokkha verses.', basis: 'canonical' },
      { citation: 'Dhp 183', role: 'Ovāda-pāṭimokkha verse.', basis: 'canonical' },
      { citation: 'Dhp 184', role: 'Ovāda-pāṭimokkha verse.', basis: 'canonical' },
      { citation: 'Dhp 185', role: 'Ovāda-pāṭimokkha verse.', basis: 'canonical' },
    ],
    association: 'Tradition (the commentaries) places the Buddha\'s teaching of the Ovāda-pāṭimokkha to 1,250 arahants on the Māgha full moon; the canonical texts do not give the date.',
  },
  vesak: {
    name: 'Vesak (Visākha Pūjā)',
    texts: [
      { citation: 'MN 123', role: 'Acchariyaabbhutasutta: the wonders at the Bodhisatta\'s birth.', basis: 'canonical' },
      { citation: 'Ud 1.1', role: 'Paṭhamabodhisutta: the Buddha just after the awakening.', basis: 'canonical' },
      { citation: 'Kd 1', role: 'Mahākhandhaka (Mahāvagga 1): opens with the weeks after the awakening.', basis: 'canonical' },
      { citation: 'DN 16', role: 'Mahāparinibbānasutta: the Buddha\'s last days and final passing.', basis: 'canonical' },
    ],
    association: 'Tradition (the commentaries) places the birth, awakening and final passing on the Visākha (Vesākha) full moon; the canonical texts do not give these dates.',
  },
  'asalha-puja': {
    name: 'Āsāḷha Pūjā',
    texts: [
      { citation: 'SN 56.11', role: 'Dhammacakkappavattanasutta: the first discourse, to the group of five at Isipatana.', basis: 'canonical' },
      { citation: 'SN 22.59', role: 'Anattalakkhaṇasutta: the discourse on not-self to the same five.', basis: 'canonical' },
      { citation: 'Kd 1', role: 'Mahākhandhaka (Mahāvagga 1): narrates the first discourse and the first ordinations.', basis: 'canonical' },
    ],
    association: 'Tradition (the commentaries) places the first discourse on the Āsāḷha full moon; the canonical texts do not give the date.',
  },
  'vassa-start': {
    name: 'Start of the Rains Retreat (Vassa)',
    texts: [{ citation: 'Kd 3', role: 'Vassūpanāyikakkhandhaka (Mahāvagga 3): the rule that the earlier rains residence is entered on the day after the Āsāḷha full moon, and the later one a month after (paraphrased in English).', basis: 'canonical' }],
  },
  'vassa-end': {
    name: 'End of the Rains Retreat (Vassa)',
    texts: [{ citation: 'Kd 3', role: 'Vassūpanāyikakkhandhaka (Mahāvagga 3): the rules of the rains residence.', basis: 'canonical' }],
  },
  pavarana: {
    name: 'Pavāraṇā',
    texts: [
      { citation: 'Kd 4', role: 'Pavāraṇākkhandhaka (Mahāvagga 4): the invitation ceremony at the end of the rains.', basis: 'canonical' },
      { citation: 'SN 8.7', role: 'Pavāraṇāsutta: the Buddha\'s own Pavāraṇā with five hundred monks on the fifteenth-day uposatha.', basis: 'canonical' },
    ],
  },
  'kathina-season': {
    name: 'Kaṭhina season',
    texts: [{ citation: 'Kd 7', role: 'Kaṭhinakkhandhaka (Mahāvagga 7): the kaṭhina cloth for monks who have completed the rains.', basis: 'canonical' }],
    association: 'Kaṭhina is offered in the month after the rains: from the day after Pavāraṇā to the next full moon.',
  },
};

// ---------------------------------------------------------------------------
// Festivals per tradition

function thaiFestivalDates(year, t) {
  const months = thaiMonths(year);
  const adhikamasa = isAdhikamasa(year);
  const fm = (m, second = false) => {
    const mo = months.find((x) => x.month === m && !!x.second === second);
    return { date: addDays(mo.start, 14), lunar_date: `full moon (waxing 15) of month ${mo.second ? '8 (second Āsāḷha)' : mo.month}, ${mo.name}` };
  };
  const base = { 'magha-puja': fm(adhikamasa ? 4 : 3), vesak: fm(adhikamasa ? 7 : 6), 'asalha-puja': fm(8, adhikamasa), pavarana: fm(11), kattika: fm(12) };
  let pick = (x) => x;
  if (t === 'thai-dhammayut') {
    const pool = dhammayutDays(`${year - 1}-12-01`, `${year}-12-31`);
    pick = (x) => {
      const d = closest(pool, 'full', parseDate(x.date)).date;
      return d === x.date ? x : { ...x, date: d, mahanikaya_date: x.date };
    };
  }
  const res = { 'magha-puja': pick(base['magha-puja']), vesak: pick(base.vesak), 'asalha-puja': pick(base['asalha-puja']), pavarana: pick(base.pavarana) };
  // Days derived from a full moon carry its Mahānikāya counterpart too, so every differing day is visible.
  const mn = (x, n) => (x.mahanikaya_date ? { mahanikaya_date: addDays(x.mahanikaya_date, n) } : {});
  res['vassa-start'] = { date: addDays(res['asalha-puja'].date, 1), lunar_date: 'waning 1 of the Āsāḷha month (the day after Āsāḷha Pūjā)', ...mn(res['asalha-puja'], 1) };
  res['vassa-end'] = { date: res.pavarana.date, lunar_date: 'Pavāraṇā day: full moon of month 11 (Assayuja)', ...mn(res.pavarana, 0) };
  const kattika = pick(base.kattika);
  res['kathina-season'] = {
    start: addDays(res.pavarana.date, 1), end: kattika.date, lunar_date: 'waning 1 of month 11 to the full moon of month 12 (Kattika)',
    ...(res.pavarana.mahanikaya_date || kattika.mahanikaya_date ? { mahanikaya_start: addDays(base.pavarana.date, 1), mahanikaya_end: base.kattika.date } : {}),
  };
  const notes = [`Thai lunar year ${year} is ${thaiYearType(year)}${adhikamasa ? ': Māgha and Visākha Pūjā move to months 4 and 7, and Āsāḷha Pūjā to the second month 8' : ''}.`];
  if (t === 'thai-dhammayut') {
    const differ = Object.entries(res).filter(([, x]) => x.mahanikaya_date || x.mahanikaya_start).map(([id]) => FESTIVALS[id].name);
    if (differ.length) notes.push(`This year the Pakkhagaṇanā date differs from the Thai Mahānikāya (civil calendar) date for: ${differ.join(', ')}. The Mahānikāya date is given as mahanikaya_date (mahanikaya_start and mahanikaya_end for the Kaṭhina season).`);
    notes.push(DHAMMAYUT_PUBLISHED_NOTE);
  }
  return { res, notes };
}

function myanmarFestivalDates(year) {
  const days = myanmarDays(`${year}-01-01`, `${year}-12-31`);
  const fm = (m) => days.find((d) => d.phase === 'full' && (+d.lunar_month >= 13 ? +d.lunar_month - 12 : +d.lunar_month) === m);
  const kason = fm(2), waso = fm(4), thadingyut = fm(7), tazaungmon = fm(8);
  const res = {
    'magha-puja': { date: null, note: 'Not given: Māgha Pūjā is not among the full-moon public holidays in the official Myanmar lists for 2024–2026, and no published source was found that names the Burmese full moon on which it is kept.' },
    vesak: kason && { date: kason.date, lunar_date: `full moon of ${kason.lunar_month_name}` },
    'asalha-puja': waso && { date: waso.date, lunar_date: 'full moon of (2nd) Waso' },
    'vassa-start': waso && { date: addDays(waso.date, 1), lunar_date: 'waning 1 of (2nd) Waso' },
    pavarana: thadingyut && { date: thadingyut.date, lunar_date: 'full moon of Thadingyut' },
    'vassa-end': thadingyut && { date: thadingyut.date, lunar_date: 'full moon of Thadingyut' },
    'kathina-season': thadingyut && tazaungmon && { start: addDays(thadingyut.date, 1), end: tazaungmon.date, lunar_date: 'waning 1 of Thadingyut to the full moon of Tazaungmon' },
  };
  const watat = days.some((d) => d.lunar_month === '0');
  return { res, notes: watat ? ['This Burmese year has an intercalary First Waso (watat year); the Rains Retreat follows the second Waso.'] : [] };
}

function sriLankaFestivalDates(year) {
  const all = sriLankaDays(Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1)).filter((d) => d.phase === 'full' && d.date.startsWith(`${year}-`));
  const poya = (name) => all.find((d) => d.lunar_month_name === name);
  const navam = poya('Navam'), vesak = poya('Vesak'), esala = poya('Esala'), vap = poya('Vap'), il = poya('Il');
  const res = {
    'magha-puja': navam && { date: navam.date, lunar_date: 'Navam full moon poya (the Māgha month)' },
    vesak: vesak && { date: vesak.date, lunar_date: 'Vesak full moon poya' },
    'asalha-puja': esala && { date: esala.date, lunar_date: 'Esala full moon poya' },
    'vassa-start': esala && { date: addDays(esala.date, 1), lunar_date: 'the day after Esala poya' },
    pavarana: vap && { date: vap.date, lunar_date: 'Vap full moon poya' },
    'vassa-end': vap && { date: vap.date, lunar_date: 'Vap full moon poya' },
    'kathina-season': vap && il && { start: addDays(vap.date, 1), end: il.date, lunar_date: 'the day after Vap poya to Il poya' },
  };
  const notes = all.filter((d) => d.lunar_month_name.startsWith('Adhi ')).map((d) => `${d.date} is ${d.lunar_month_name} poya, an extra (adhi) month; festivals are kept in the regular month.`);
  return { res, notes };
}

// ---------------------------------------------------------------------------
// Public API

const DHAMMAYUT_PUBLISHED_NOTE = 'The Dhammayut lists published by Wat Metta follow the Pakkhagaṇanā reckoning through April 2025 but give the Mahānikāya dates from May 2025 on (its 2026 list is "for both the Dhammayut Order and the Mahānikāya Order in Thailand"). Where the two differ from May 2025, that published list has the mahanikaya_date. Check the list your monastery publishes.';
export const DISCLAIMER = 'Computed from the stated rule; not an official announcement. National authorities, Sangha bodies and individual monasteries publish the dates they keep, and these can differ, usually by one day.';
export const TRADITION_IDS = Object.keys(TRADITIONS);

function traditionInfo(t) {
  const info = TRADITIONS[t];
  if (!info) throw new Error(`Unknown tradition "${t}". Use one of: ${TRADITION_IDS.join(', ')}.`);
  const { utcOffsetMinutes, ...rest } = info;
  return { id: t, ...rest };
}

function checkYear(y) {
  if (!Number.isInteger(y) || y < 1950 || y > 2100) throw new Error('Years 1950–2100 are supported.');
}

/** Uposatha (observance) days from `from` to `to` (inclusive, YYYY-MM-DD, at most 731 days) for one tradition. */
export function uposatha(from, to, t) {
  const tradition = traditionInfo(t);
  const a = parseDate(from), b = parseDate(to);
  if (b < a) throw new Error('"to" must not be before "from".');
  if ((b - a) / DAY_MS > 731) throw new Error('Ask for at most two years (731 days) at a time.');
  checkYear(+from.slice(0, 4));
  checkYear(+to.slice(0, 4));
  const days = GENERATORS[t](from, to).map((d) => ({
    date: d.date, weekday: WEEKDAYS[new Date(parseDate(d.date)).getUTCDay()], phase: d.phase, label: PHASE_LABEL[d.phase], ...d, status: 'computed',
  }));
  const notes = [];
  if (t === 'thai-dhammayut') {
    const differ = days.filter((d) => d.mahanikaya_date && d.mahanikaya_date !== d.date).length;
    notes.push(`${differ} of these ${days.length} days differ from the Thai Mahānikāya (civil calendar) day, which is given as mahanikaya_date.`);
    notes.push(DHAMMAYUT_PUBLISHED_NOTE);
  }
  if (t === 'sri-lanka') notes.push('Only full-moon poya days are public holidays in Sri Lanka, and only they were checked against the government gazettes (2024–2026). New-moon and quarter-moon days use the same tithi rule but have not been checked against a published list.');
  return { tradition, from, to, status: 'computed', disclaimer: DISCLAIMER, days, notes, texts: UPOSATHA_TEXTS };
}

/** Festival dates of one Gregorian year for one tradition, with the texts associated with each. */
export function festivals(year, t) {
  const tradition = traditionInfo(t);
  checkYear(year);
  const { res, notes } = t === 'myanmar' ? myanmarFestivalDates(year) : t === 'sri-lanka' ? sriLankaFestivalDates(year) : thaiFestivalDates(year, t);
  const list = Object.entries(FESTIVALS).map(([id, f]) => {
    const r = res[id] || { date: null, note: 'Not found in this year by the rule.' };
    return { id, name: f.name, ...r, status: r.date || r.start ? 'computed' : 'not computed', texts: f.texts, ...(f.association ? { association: f.association } : {}) };
  });
  return { year, tradition, status: 'computed', disclaimer: DISCLAIMER, festivals: list, notes };
}

// ---------------------------------------------------------------------------
// MCP registration

/** Attach the bundled-canon id and title to each associated text (all are verified to resolve in tests/calendar.test.mjs). */
export function resolveTexts(canon, texts) {
  return texts.map((x) => {
    const { unit } = canon.resolve(x.citation);
    return { citation: x.citation, id: unit.id, title: unit.title, role: x.role, basis: x.basis };
  });
}

export function register({ tool, z, canon }) {
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date as YYYY-MM-DD (years 1950–2100).');
  const tradition = z.enum(TRADITION_IDS).describe('thai-mahanikaya (Thai civil lunar calendar), thai-dhammayut (Pakkhagaṇanā), myanmar (Burmese calendar) or sri-lanka (poya days).');

  tool('uposatha', 'Uposatha (observance) days — full moon, new moon and the two half-moon days — between two dates for one Theravāda tradition: Thai Mahānikāya, Thai Dhammayut, Myanmar or Sri Lanka. Each day gives its lunar month and lunar day. Dates are computed offline from the stated rule and labelled as computed, not official; local monasteries may keep a different day.', {
    from: date,
    to: date.describe('Last date, YYYY-MM-DD, at most 731 days after "from".'),
    tradition,
  }, ({ from, to, tradition: t }) => {
    const result = uposatha(from, to, t);
    return { ...result, texts: resolveTexts(canon, result.texts) };
  });

  tool('festivals', 'Dates of Māgha Pūjā, Vesak (Visākha Pūjā), Āsāḷha Pūjā, the start and end of the Rains Retreat (Vassa), Pavāraṇā and the Kaṭhina season in one year for one tradition, with the canonical texts associated with each (for example SN 56.11 for Āsāḷha Pūjā). Dates are computed offline and labelled as computed, not official.', {
    year: z.number().int().min(1950).max(2100).describe('Gregorian year, 1950–2100.'),
    tradition,
  }, ({ year, tradition: t }) => {
    const result = festivals(year, t);
    return { ...result, festivals: result.festivals.map((f) => ({ ...f, texts: resolveTexts(canon, f.texts) })) };
  });
}
