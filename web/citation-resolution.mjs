/** Resolve public citations without inferring source types or paragraph positions. */
import { SCRIPTS } from '../src/script.mjs';
import { parseCitation, citationId } from '../src/citations.mjs';
import { sourceRevision } from './reading-position.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.hasOwn(value, key);
const text = (value, max = 1000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\u0000-\u001f\u007f<>]/.test(value);
const id = value => typeof value === 'string' && /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(value) && value.length <= 200;
const citation = value => text(value, 300) && !/https?:|javascript:|data:/i.test(value);
const fail = () => { throw Error('Citation lookup returned incomplete or unsupported source metadata. No passage was substituted.'); };

export function citationSelection(args, rawQuery) {
  if (rawQuery !== undefined) {
    try { decodeURIComponent(rawQuery.replace(/\+/g, ' ')); } catch { throw Error('The citation lookup URL has invalid character encoding.'); }
  }
  const keys = [...args.keys()];
  if (keys.length !== 1 || keys[0] !== 'reference' || !text(args.get('reference'), 300)) throw Error('Give one citation or title only. Reading positions, source pins and other fields cannot be added to a citation lookup.');
  return args.get('reference').trim();
}

/** Check literal citation/ID agreement with the shared parser, without corpus inference. */
function canonicalIdentity(row) {
  if (!id(row.id) || !citation(row.citation)) return false;
  try { const parsed = parseCitation(row.citation); return (parsed.kind === 'uid' ? parsed.uid : parsed.kind === 'id' ? citationId(parsed) : null) === row.id; }
  catch { return false; }
}

export function citationRoute(reference) {
  const args = new URLSearchParams({ reference });
  citationSelection(args);
  return '#resolve?' + args;
}

function source(data, post) {
  const value = data.source;
  const name = post ? 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI): Ṭīkā and Añña (post-canonical) books' : 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI)';
  if (!object(value) || value.name !== name || value.repository !== 'https://github.com/VipassanaTech/tipitaka-xml' || !text(value.commit, 100) || !text(value.attribution, 10000) || !text(value.terms, 10000)) fail();
  try { sourceRevision({ source: { commit: value.commit } }); sourceRevision(data); } catch { fail(); }
  return { name: value.name, repository: value.repository, commit: value.commit, attribution: value.attribution, terms: value.terms, ...(own(value, 'locator_revision') ? { locator_revision: value.locator_revision } : {}) };
}

function alternatives(data, key) {
  if (!own(data, key)) return [];
  if (!Array.isArray(data[key]) || data[key].length > 100) fail();
  const seen = new Set();
  return data[key].map(row => {
    if (!object(row) || !canonicalIdentity(row) || !text(row.title) || seen.has(row.id) || own(row, 'canonical') && row.canonical !== true || own(row, 'read_with')) fail();
    seen.add(row.id);
    if (own(row, 'matched_name') && !text(row.matched_name) || own(row, 'title_roman') && !text(row.title_roman)) fail();
    return { id: row.id, citation: row.citation, title: row.title, ...(own(row, 'matched_name') ? { matched_name: row.matched_name } : {}), ...(own(row, 'title_roman') ? { title_roman: row.title_roman } : {}), href: '#read?' + new URLSearchParams({ uid: row.id }) };
  });
}

/** Only displayed public metadata and existing, unpinned current-source reader links. */
export function validateCitationResolution(data, script = 'roman') {
  if (!SCRIPTS.includes(script) || !object(data) || !citation(data.citation) || !text(data.title) || !Array.isArray(data.notes) || data.notes.length > 100 || data.notes.some(note => !text(note, 10000)) || own(data, 'approximate') && typeof data.approximate !== 'boolean' || own(data, 'canonical') && ![true, false].includes(data.canonical)) fail();
  const post = data.canonical === false;
  let context;
  if (post) {
    const command = data.read_with;
    if (!text(data.label, 10000) || !object(data.book) || data.book.canonical !== false || !id(data.book.id) || !text(data.book.title) || !object(command) || Object.keys(command).some(key => !['tool', 'citation', 'script'].includes(key)) || command.tool !== 'get_post_canonical' || command.citation !== data.citation || own(command, 'script') && command.script !== script || own(data, 'also_named') || own(data, 'also_on_that_page')) fail();
    context = { kind: 'post', uid: command.citation };
  } else {
    if (!canonicalIdentity(data) || own(data, 'read_with') || own(data, 'label') || own(data, 'book')) fail();
    context = { uid: data.id };
  }
  const checked = { citation: data.citation, title: data.title, canonical: !post, notes: [...data.notes], source: source(data, post), href: '#read?' + new URLSearchParams(context), also_named: alternatives(data, 'also_named'), also_on_that_page: alternatives(data, 'also_on_that_page') };
  for (const key of ['title_roman', 'input_script', 'input_romanized', 'script', 'script_note', 'matched_by']) {
    if (own(data, key)) { if (!text(data[key], 2000)) fail(); checked[key] = data[key]; }
  }
  if (own(data, 'script') && data.script !== script || own(data, 'input_script') && !SCRIPTS.includes(data.input_script) || own(data, 'input_romanized') !== own(data, 'input_script')) fail();
  if (own(data, 'input_normalised')) {
    if (!text(data.input_normalised, 4000) && !(object(data.input_normalised) && text(data.input_normalised.note, 4000))) fail();
    checked.input_normalised = typeof data.input_normalised === 'string' ? data.input_normalised : data.input_normalised.note;
  }
  if (own(data, 'name_match')) {
    const match = data.name_match;
    if (!object(match) || !['query', 'matched_name', 'via', 'match'].every(key => text(match[key], 1000))) fail();
    checked.name_match = { query: match.query, matched_name: match.matched_name, via: match.via, match: match.match };
  }
  for (const key of ['alignment_note', 'alignment_method']) if (own(data, key)) { if (!text(data[key], 4000)) fail(); checked[key] = data[key]; }
  if (own(data, 'alignment')) {
    if (!text(data.alignment, 4000) && !object(data.alignment)) fail();
    const value = JSON.stringify(data.alignment); if (value.length > 10000) fail(); checked.alignment = JSON.parse(value);
  }
  if (post) checked.label = data.label;
  if (own(data, 'approximate')) checked.approximate = data.approximate;
  return checked;
}
