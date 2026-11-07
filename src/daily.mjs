// Daily text and reading plans (issue #45). Everything is chosen from the bundled VRI canon:
// no scripture is generated, and the study-guide plans list citations and links only.
import * as canonModule from './canon.mjs';

const DAY_MS = 86400000;
const SUTTA_POOL_COLLECTIONS = new Set(['dn', 'mn', 'sn', 'an', 'kp', 'ud', 'iti', 'snp']);
const ATI = 'https://www.accesstoinsight.org';

// ---- dates ----------------------------------------------------------------

/** Parse "YYYY-MM-DD" (UTC) or default to today in UTC. Returns { date, dayNumber }. */
export function parseDate(value, now = new Date()) {
  let date = value;
  if (date === undefined || date === null || date === '') date = now.toISOString().slice(0, 10);
  const m = String(date).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new Error(`Date "${value}" is not in YYYY-MM-DD form (for example 2026-11-01).`);
  // Date.UTC interprets 00–99 as 1900–1999; set the full ISO year explicitly.
  const instant = new Date(0);
  instant.setUTCFullYear(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const ms = instant.getTime();
  const check = new Date(ms).toISOString().slice(0, 10);
  if (check !== `${m[1]}-${m[2]}-${m[3]}`) throw new Error(`Date "${value}" does not exist.`);
  return { date: check, dayNumber: Math.floor(ms / DAY_MS) };
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Spread step: the first number at or after ~0.382·n that is coprime with n, so the walk visits every item once per cycle. */
function step(n) {
  if (n <= 2) return 1;
  let k = Math.max(1, Math.floor(n * 0.381966));
  while (gcd(k, n) !== 1) k += 1;
  return k;
}

/** Position in a cycle of n items for a day number: a fixed permutation, the same for everyone on that date. */
export function cyclePosition(dayNumber, n) {
  const day = ((dayNumber % n) + n) % n;
  return (day * step(n)) % n;
}

// ---- pools ----------------------------------------------------------------

let cache = null;

function pools(canon) {
  if (cache?.canon === canon) return cache;
  const d = canon.load();
  const num = (id) => Number(id.match(/(\d+)$/)?.[1] ?? 0);
  const verses = d.canon.units.filter((u) => u.collection === 'dhp' && u.kind !== 'range' && /^dhp\d+$/.test(u.id))
    .sort((a, b) => num(a.id) - num(b.id));
  const chapters = d.canon.units.filter((u) => u.collection === 'dhp' && u.kind === 'range')
    .sort((a, b) => a.book - b.book || a.start - b.start);
  const suttas = d.canon.units.filter((u) => SUTTA_POOL_COLLECTIONS.has(u.collection) && u.kind !== 'range' && !u.approximate
    && d.translations[u.id]?.length)
    .sort((a, b) => a.book - b.book || a.start - b.start);
  cache = { canon, verses, chapters, suttas, plans: new Map() };
  return cache;
}

function english(canon, u) {
  return canon.describe(u).english.map(({ source, translator, reference, url, license, translation_id }) => ({
    source, translator, ...(reference ? { reference } : {}), url, ...(license ? { license } : {}), translation_id,
  }));
}

function sourceBlock(canon) {
  const s = canon.source();
  return { pali: { name: s.name, attribution: s.attribution, terms: s.terms, commit: s.commit } };
}

// ---- daily text -----------------------------------------------------------

export function dailyText(canon, { date, kind = 'verse' } = {}, now = new Date()) {
  const { date: day, dayNumber } = parseDate(date, now);
  const p = pools(canon);
  const pool = kind === 'sutta' ? p.suttas : p.verses;
  if (!pool.length) throw new Error('No texts are available for the daily text.');
  const position = cyclePosition(dayNumber, pool.length);
  const u = pool[position];
  const described = canon.describe(u);
  const base = {
    date: day, kind,
    how_chosen: kind === 'sutta'
      ? `Fixed rotation through ${pool.length} suttas of DN, MN, SN, AN, Kp, Ud, Iti and Snp that have an English translation linked; the same date always gives the same sutta (for this data version), and every sutta comes round once in ${pool.length} days.`
      : `Fixed rotation through the ${pool.length} verses of the Dhammapada; the same date always gives the same verse, and every verse comes round once in ${pool.length} days.`,
    rotation: { position: position + 1, of: pool.length },
    text: { id: u.id, citation: u.acronym, title: u.title || null, pts: described.pts, vri_paragraphs: described.vri_paragraphs },
    read_with: { tool: 'get_text', uid: u.id },
  };
  const links = { suttacentral: described.links.suttacentral };
  if (kind === 'sutta') {
    return {
      ...base,
      first_line: described.first_line,
      segments: described.segments,
      read_with: { tool: 'get_text', uid: u.id, note: 'Read the whole Pāli text (and an English translation) with get_text.' },
      english: english(canon, u), notes: described.notes, links, source: sourceBlock(canon),
    };
  }
  const chapter = p.chapters.find((c) => c.members?.includes(u.id));
  const pali = canon.segments(u).filter((s) => s.type === 'verse');
  return {
    ...base,
    chapter: chapter ? { id: chapter.id, citation: chapter.acronym, title: chapter.title } : null,
    pali,
    english: english(canon, u), notes: described.notes, links, source: sourceBlock(canon),
  };
}

// ---- reading plans --------------------------------------------------------

// Access to Insight study guides by Ṭhānissaro Bhikkhu. Each pair is the guide's link (in order of first
// citation) and the text it resolves to through this server's verified translation-link index. Links the
// index cannot place on exactly one text are left out and listed under `omitted`; none are guessed by number.
const GUIDES = {
  'ati-into-the-stream': {
    title: 'Into the Stream: A Study Guide on the First Stage of Awakening',
    author: 'Ṭhānissaro Bhikkhu',
    url: `${ATI}/lib/study/into_the_stream.html`,
    cite: '"Into the Stream: A Study Guide on the First Stage of Awakening", by Thanissaro Bhikkhu. Access to Insight (BCBS Edition), 17 December 2013.',
    copyright: '© 2011 Metta Forest Monastery',
    license: 'CC BY-NC 4.0',
    entries: [
      ['kn/dhp/dhp.13.than', 'dhp167-178'], ['mn/mn.095x.than', 'mn95'], ['sn/sn45/sn45.002.than', 'sn45.2'], ['an/an08/an08.054.than', 'an8.54'],
      ['an/an04/an04.073.than', 'an4.73'], ['an/an04/an04.192.than', 'an4.192'], ['mn/mn.110.than', 'mn110'], ['kn/dhp/dhp.06.than', 'dhp76-89'],
      ['kn/dhp/dhp.14.than', 'dhp179-196'], ['an/an05/an05.202.than', 'an5.202'], ['an/an06/an06.086.than', 'an6.86'], ['kn/snp/snp.2.09.than', 'snp2.9'],
      ['an/an03/an03.065.than', 'an3.65'], ['an/an08/an08.053.than', 'an8.53'], ['an/an07/an07.079.than', 'an7.83'], ['mn/mn.135.than', 'mn135'],
      ['mn/mn.002.than', 'mn2'], ['sn/sn22/sn22.122.than', 'sn22.122'], ['sn/sn22/sn22.039.than', 'sn22.39'], ['dn/dn.02.0.than', 'dn2'],
      ['an/an10/an10.176.than', 'an10.176'], ['mn/mn.118.than', 'mn118'], ['an/an08/an08.030.than', 'an8.30'], ['an/an07/an07.064.than', 'an7.68'],
      ['sn/sn45/sn45.008.than', 'sn45.8'], ['an/an10/an10.092.than', 'an10.92'], ['sn/sn12/sn12.020.than', 'sn12.20'], ['sn/sn12/sn12.068.than', 'sn12.68'],
      ['mn/mn.044.than', 'mn44'], ['mn/mn.106.than', 'mn106'], ['mn/mn.075x.than', 'mn75'], ['mn/mn.078.than', 'mn78'],
      ['kn/snp/snp.4.09.than', 'snp4.9'], ['sn/sn55/sn55.032.than', 'sn55.32'], ['sn/sn55/sn55.033.than', 'sn55.33'], ['an/an05/an05.175.than', 'an5.175'],
      ['an/an05/an05.148.than', 'an5.148'], ['sn/sn48/sn48.053.than', 'sn48.53'], ['an/an10/an10.093.than', 'an10.93'], ['sn/sn55/sn55.030.than', 'sn55.30'],
      ['sn/sn55/sn55.021.than', 'sn55.21'], ['an/an04/an04.184.than', 'an4.184'], ['sn/sn55/sn55.001.than', 'sn55.1'], ['sn/sn13/sn13.001.than', 'sn13.1'],
      ['sn/sn13/sn13.002.than', 'sn13.2'], ['sn/sn13/sn13.008.than', 'sn13.8'], ['an/an05/an05.038.than', 'an5.38'], ['sn/sn55/sn55.040.than', 'sn55.40'],
      ['mn/mn.070.than', 'mn70'], ['sn/sn55/sn55.054.than', 'sn55.54'],
    ],
    omitted: [
      ['kn/iti/iti.1.001-027.than', 'The guide cites single verses inside a page that holds Iti 1–27; the index links that page to one text only, so the verses are not placed by number.'],
      ['an/an02/an02.031.than', 'Not in the verified link index.'], ['sn/sn09/sn09.011.than', 'Not in the verified link index.'],
      ['sn/sn47/sn47.035.than', 'Not in the verified link index.'], ['dn/dn.16.5-6.than', 'Excerpt of DN 16; not in the verified link index.'],
      ['an/an10/an10.013.than', 'Not in the verified link index.'], ['sn/sn22/sn22.089.than', 'Not in the verified link index.'],
      ['an/an05/an05.254.than', 'Not in the verified link index.'], ['an/an03/an03.089.than', 'Not in the verified link index.'],
    ],
  },
  'ati-four-noble-truths': {
    title: 'The Four Noble Truths: A Study Guide',
    author: 'Ṭhānissaro Bhikkhu',
    url: `${ATI}/lib/study/truths.html`,
    cite: '"The Four Noble Truths: A Study Guide", by Thanissaro Bhikkhu. Access to Insight (BCBS Edition), 30 November 2013.',
    copyright: '© 1999 Metta Forest Monastery',
    license: 'CC BY-NC 4.0',
    entries: [
      ['mn/mn.061.than', 'mn61'], ['sn/sn56/sn56.031.than', 'sn56.31'], ['an/an06/an06.063.than', 'an6.63'], ['sn/sn56/sn56.011.than', 'sn56.11'],
      ['sn/sn38/sn38.014.than', 'sn38.14'], ['mn/mn.141.than', 'mn141'], ['sn/sn22/sn22.048.than', 'sn22.48'], ['mn/mn.109.than', 'mn109'],
      ['sn/sn22/sn22.079.than', 'sn22.79'], ['mn/mn.028.than', 'mn28'], ['mn/mn.044.than', 'mn44'], ['sn/sn22/sn22.056.than', 'sn22.56'],
      ['dn/dn.22.0.than', 'dn22'], ['an/an10/an10.092.than', 'an10.92'], ['sn/sn12/sn12.070.than', 'sn12.70'], ['sn/sn12/sn12.002.than', 'sn12.2'],
      ['sn/sn22/sn22.053.than', 'sn22.53'], ['sn/sn12/sn12.064.than', 'sn12.64'], ['dn/dn.11.0.than', 'dn11'], ['kn/ud/ud.8.01.than', 'ud8.1'],
      ['kn/ud/ud.8.03.than', 'ud8.3'], ['kn/ud/ud.8.04.than', 'ud8.4'], ['sn/sn45/sn45.008.than', 'sn45.8'], ['mn/mn.126.than', 'mn126'],
      ['sn/sn45/sn45.001.than', 'sn45.1'], ['sn/sn45/sn45.002.than', 'sn45.2'], ['mn/mn.117.than', 'mn117'], ['an/an10/an10.176.than', 'an10.176'],
      ['mn/mn.010.than', 'mn10'], ['mn/mn.118.than', 'mn118'], ['mn/mn.125.horn', 'mn125'], ['an/an04/an04.041.than', 'an4.41'],
      ['an/an05/an05.028.than', 'an5.28'], ['kn/dhp/dhp.25.than', 'dhp360-382'], ['an/an09/an09.036.than', 'an9.36'], ['dn/dn.02.0.than', 'dn2'],
      ['kn/thig/thig.05.10.than', 'thig5.10'],
    ],
    omitted: [['sn/sn12/sn12.023.than', 'Not in the verified link index.']],
  },
};

export const GUIDE_DATA = GUIDES;

const PLAN_INFO = {
  'dhammapada-26-days': { title: 'The Dhammapada in 26 days', description: 'One chapter (vagga) of the Dhammapada a day, in order: 26 chapters, 423 verses.' },
  'mn-year': { title: 'The Majjhima Nikāya in a year', description: 'All 152 Middle-Length Discourses over 365 days, in order. Long suttas are split by segment so each day has a similar amount of Pāli.' },
  'ati-into-the-stream': { title: `Study guide: ${GUIDES['ati-into-the-stream'].title}`, description: 'The texts cited in Ṭhānissaro Bhikkhu\'s Access to Insight study guide, one a day in the order the guide first cites them. Read the guide itself for its commentary; this plan lists citations and links only.' },
  'ati-four-noble-truths': { title: `Study guide: ${GUIDES['ati-four-noble-truths'].title}`, description: 'The texts cited in Ṭhānissaro Bhikkhu\'s Access to Insight study guide, one a day in the order the guide first cites them. Read the guide itself for its commentary; this plan lists citations and links only.' },
};

export const PLAN_NAMES = Object.keys(PLAN_INFO);

function entry(canon, u, extra = {}) {
  const d = canon.describe(u);
  return {
    id: u.id, citation: u.acronym, title: u.title || null, pts: d.pts,
    ...extra,
    english: english(canon, u),
    links: { suttacentral: d.links.suttacentral },
  };
}

function segmentChars(canon, u) {
  return canon.segments(u).map((s) => s.text.length);
}

/** Split lengths into p contiguous parts of similar total; returns [offset, limit] pairs. */
export function splitParts(lengths, p) {
  const total = lengths.reduce((a, b) => a + b, 0);
  const parts = [];
  let start = 0;
  let acc = 0;
  for (let k = 1; k < p; k += 1) {
    const target = (total * k) / p;
    let end = start;
    // Each part keeps at least one segment and leaves at least one for each later part.
    while (end < lengths.length - (p - k) && (end === start || acc + lengths[end] <= target)) { acc += lengths[end]; end += 1; }
    parts.push([start, end - start]);
    start = end;
  }
  parts.push([start, lengths.length - start]);
  return parts;
}

function buildPlan(canon, name) {
  const p = pools(canon);
  if (p.plans.has(name)) return p.plans.get(name);
  const d = canon.load();
  let days;
  if (name === 'dhammapada-26-days') {
    days = p.chapters.map((u) => [{ unit: u, extra: { get_text: { uid: u.id } } }]);
  } else if (name === 'mn-year') {
    const mn = d.canon.units.filter((u) => u.collection === 'mn' && u.kind !== 'range')
      .sort((a, b) => Number(a.id.slice(2)) - Number(b.id.slice(2)));
    const lengths = mn.map((u) => segmentChars(canon, u));
    const chars = lengths.map((l) => l.reduce((a, b) => a + b, 0));
    const parts = mn.map(() => 1);
    // Highest-average rule: give each extra day to the sutta with the most Pāli per day so far.
    for (let extra = 365 - mn.length; extra > 0; extra -= 1) {
      let best = -1;
      for (let i = 0; i < mn.length; i += 1) {
        if (parts[i] >= lengths[i].length) continue;
        if (best < 0 || chars[i] / parts[i] > chars[best] / parts[best]) best = i;
      }
      parts[best] += 1;
    }
    days = [];
    mn.forEach((u, i) => {
      splitParts(lengths[i], parts[i]).forEach(([offset, limit], k) => {
        days.push([{ unit: u, extra: { ...(parts[i] > 1 ? { part: k + 1, of: parts[i] } : {}), get_text: { uid: u.id, offset, limit } } }]);
      });
    });
  } else if (GUIDES[name]) {
    days = GUIDES[name].entries.map(([path, id]) => {
      const url = `${ATI}/tipitaka/${path}.html`;
      const { unit, notes } = canon.resolve(url);
      if (unit.id !== id) throw new Error(`Study-guide link ${url} resolves to ${unit.id}, expected ${id}.`);
      const link = (d.translations[id] || []).find((t) => t.source === 'ati' && t.path === `/tipitaka/${path}`);
      return [{ unit, extra: { guide_link: { url, ...(link?.reference ? { reference: link.reference } : {}), translator: link?.translator }, ...(notes.length ? { notes } : {}), get_text: { uid: id } } }];
    });
  } else {
    throw new Error(`Unknown reading plan "${name}". Available plans: ${PLAN_NAMES.join(', ')}.`);
  }
  p.plans.set(name, days);
  return days;
}

function planHeader(canon, name, days) {
  const info = PLAN_INFO[name];
  const guide = GUIDES[name];
  return {
    name, title: info.title, description: info.description, days: days.length,
    ...(guide ? {
      guide: { title: guide.title, author: guide.author, url: guide.url, cite: guide.cite, copyright: guide.copyright, license: guide.license,
        note: 'Link only: the guide\'s text is not reproduced. The order of texts follows the guide\'s first citation of each; links this server cannot place on exactly one text are listed under omitted, never guessed.' },
      omitted: guide.omitted.map(([path, reason]) => ({ url: `${ATI}/tipitaka/${path}.html`, reason })),
    } : {}),
    source: sourceBlock(canon),
  };
}

export function listPlans(canon) {
  return {
    plans: PLAN_NAMES.map((name) => {
      const days = buildPlan(canon, name);
      return { name, title: PLAN_INFO[name].title, description: PLAN_INFO[name].description, days: days.length };
    }),
    usage: 'Call reading_plan with a plan name and a day number (1 = first day). Omit the day to see the whole schedule.',
  };
}

export function readingPlan(canon, { name, day } = {}) {
  if (!name) return listPlans(canon);
  const key = String(name).trim().toLowerCase();
  const days = buildPlan(canon, key);
  const header = planHeader(canon, key, days);
  if (day === undefined || day === null) {
    return { ...header, schedule: days.map((readings, i) => ({ day: i + 1, readings: readings.map(({ unit, extra }) => ({ id: unit.id, citation: unit.acronym, ...(extra.part ? { part: extra.part, of: extra.of } : {}) })) })) };
  }
  if (!Number.isInteger(day) || day < 1 || day > days.length) throw new Error(`Day ${day} is outside plan "${key}", which runs from day 1 to day ${days.length}.`);
  return { ...header, day, readings: days[day - 1].map(({ unit, extra }) => entry(canon, unit, extra)) };
}

// ---- registration ---------------------------------------------------------

export function register({ tool, z, canon = canonModule }) {
  const date = z.string().max(20).optional().describe('Date as YYYY-MM-DD (UTC). Defaults to today in UTC.');
  tool('daily_text', 'A Dhammapada verse (default) or a sutta for a given day, chosen by a fixed rotation through the bundled Pāli canon so the same date always gives the same text. Returns the Pāli (verse) or the opening line (sutta), citation, PTS page, English translation links and source attribution. Works offline.', {
    date,
    kind: z.enum(['verse', 'sutta']).default('verse').describe('"verse" for a Dhammapada verse, "sutta" for a sutta that has an English translation.'),
  }, (args) => dailyText(canon, args));

  tool('reading_plan', `Reading plans through the canon: ${PLAN_NAMES.join(', ')}. Give a plan name and a day number to get that day's readings (citation, PTS page, get_text arguments, English links). Omit the name to list plans; omit the day for the whole schedule. Works offline.`, {
    name: z.string().max(60).optional().describe(`Plan name: ${PLAN_NAMES.join(', ')}.`),
    day: z.number().int().min(1).max(400).optional().describe('Day of the plan, starting at 1.'),
  }, (args) => readingPlan(canon, args));
}
