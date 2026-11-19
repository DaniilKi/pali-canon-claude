/** Finite, live-only Walters/Whitman Apadāna. No translated bodies are bundled. */
import { fetchPublic } from './http.mjs';
import { digest, plainMarkdown } from './apadana-presentation.mjs';
import { parseTheraApadana } from './apadana-thera.mjs';
import { THERA_APADANA_PROFILES } from './apadana-thera-profiles.mjs';
export { digest, plainMarkdown };
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_TRANSLATOR, APADANA_LICENSE_URL } from './apadana-profiles.mjs';
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };
export const rootDigest = (unit, book) => digest(JSON.stringify({ id: unit.id, book: unit.book, start: unit.start, end: unit.end, blocks: book.blocks.slice(unit.start, unit.end) }));

function validateEditorialGap(result, profile) {
  const expected = profile?.editorial_gap;
  if (!expected) { if (Object.hasOwn(result, 'editorial_gap')) fail(); return; }
  if (profile.id !== 'tha-ap44' || profile.poem !== 42 || profile.raw_sha256 !== '71d18cea42a26ac2fc490f43c5265f83d517d8794f2df5d652d0fadbf17a4533'
    || Object.keys(expected).sort().join(',') !== 'after_local_label,after_publisher_label,before_local_label,before_publisher_label,body_sha256,kind,note_numbers,notes_sha256,parent_id,placement'
    || expected.kind !== 'publisher_editorial_gap' || expected.parent_id !== profile.id || expected.placement !== 'before_local_label'
    || expected.after_local_label !== '25' || expected.after_publisher_label !== '1164' || expected.before_local_label !== '26' || expected.before_publisher_label !== '1165'
    || JSON.stringify(expected.note_numbers) !== '[12]') fail();
  const gap = result.editorial_gap;
  if (!gap || typeof gap !== 'object' || Array.isArray(gap)
    || Object.keys(gap).sort().join(',') !== Object.keys(expected).concat(['text','translator_notes']).sort().join(',')
    || Object.keys(expected).some(key => JSON.stringify(gap[key]) !== JSON.stringify(expected[key]))
    || typeof gap.text !== 'string' || !gap.text.trim() || gap.text.length > 50000
    || !Array.isArray(gap.translator_notes) || gap.translator_notes.length !== 1
    || gap.translator_notes.some(note => !note || typeof note !== 'object' || Array.isArray(note)
      || Object.keys(note).sort().join(',') !== 'number,text' || note.number !== 12 || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 50000)
    || digest(gap.text) !== expected.body_sha256 || digest(JSON.stringify(gap.translator_notes)) !== expected.notes_sha256) fail();
}

export function parseApadana(raw, profile) {
  if (typeof raw !== 'string' || raw.includes('\r') || !profile) fail();
  if (Object.hasOwn(THERA_APADANA_PROFILES, profile.id)) return parseTheraApadana(raw, profile);
  if (profile.poem >= 11 && profile.poem <= 40) return parseReviewedChapter(raw, profile);
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1];
  if (!title || !new RegExp(`^order: ${profile.poem}$`, 'm').test(front[1]) || !/^category: chapter-4$/m.test(front[1])) fail();
  const rest = raw.slice(front[0].length).trim();
  const notesAt = rest.search(/^\[\^\d+\]:/m);
  if (notesAt < 0) fail();
  let poem = rest.slice(0, notesAt).trim();
  const definitions = rest.slice(notesAt);
  // Only reviewed poem 10 has chapter paratext. Preserve its publisher order,
  // and retain note 8's original ownership and number outside the poem.
  let summaryRaw;
  if (profile.chapter_summary) {
    if (profile.id !== 'thi-ap10' || profile.poem !== 10) fail();
    const parts = poem.split('\n\nThe Summary:\n\n');
    if (parts.length !== 2) fail();
    [poem, summaryRaw] = [parts[0], 'The Summary:\n\n' + parts[1]];
  }
  // Definitions can be adjacent without a blank line: split by line-start markers, not paragraph breaks.
  const entries = [...definitions.matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  if (!entries.length || entries[0].index !== 0) fail();
  const allNotes = entries.map((entry, index) => {
    if (Number(entry[1]) !== index + 1 || !entry[2].trim()) fail();
    return { number: Number(entry[1]), text: plainMarkdown(entry[2]) };
  });
  const translator_notes = allNotes.slice(0, profile.note_count);
  if (allNotes.length !== profile.note_count + (summaryRaw === undefined ? 0 : 1)) fail();
  const references = [...poem.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
  if (references.some(n => !translator_notes[n - 1]) || translator_notes.some(n => !references.includes(n.number))) fail();
  let chapter_summary;
  if (summaryRaw !== undefined) {
    const text = plainMarkdown(summaryRaw), paragraphs = text.split(/\n\n+/);
    const refs = [...summaryRaw.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
    const summaryNotes = allNotes.slice(profile.note_count);
    if (profile.note_count !== 7 || paragraphs.length !== 3 || paragraphs[0] !== 'The Summary:'
      || paragraphs[1].split('\n').length !== 8 || paragraphs[2] !== 'The Sumedhā Chapter, the First'
      || refs.length !== 1 || refs[0] !== 8 || summaryNotes[0].number !== 8
      || digest(text) !== profile.chapter_summary.body_sha256
      || digest(JSON.stringify(summaryNotes)) !== profile.chapter_summary.notes_sha256) fail();
    chapter_summary = { ...profile.chapter_summary, text, translator_notes: summaryNotes };
  }
  const headings = [...poem.matchAll(/^### /gm)];
  if (headings.length !== 1) fail();
  const split = headings[0].index;
  if ((profile.poem === 1) !== (split > 0)) fail();
  const publisher_paratext = plainMarkdown(poem.slice(0, split));
  const text = plainMarkdown(poem.slice(split));
  const paragraphs = text.split(/\n\n+/);
  const stanzas = paragraphs.flatMap(p => {
    const match = p.match(/\((\d+)\)\s*\[(\d+(?:-\d+)?)\](?:\[Note \d+\])*$/);
    return match ? [{ local: Number(match[1]), global: match[2], text: p }] : [];
  });
  const [first, last] = profile.verses;
  const labels = profile.publisher_verse_labels;
  if (labels && (profile.id !== 'thi-ap5' || profile.poem !== 5 || JSON.stringify(labels) !== JSON.stringify(['37','38','39-40','40','42','41','43','44','45']))) fail();
  if (stanzas.length !== last - first + 1 || stanzas.some((s, i) => s.local !== i + 1 || s.global !== (labels ? labels[i] : String(first + i)))) fail();
  // Exactly the reviewed heading + stanzas + the two publisher colophons. No silent summary/editorial inclusion.
  if (paragraphs.length !== stanzas.length + 3 || !paragraphs[0].startsWith(`[${profile.poem}. `) ||
      !/^Thus indeed /.test(paragraphs.at(-2)) || !/legend of .*is finished\.\]?(?:\[Note \d+\])?$/.test(paragraphs.at(-1))) fail();
  return { title, text, translator_notes, publisher_paratext, ...(chapter_summary ? { chapter_summary } : {}) };
}

/** Finite chapter layouts, independently reviewed against the pinned source.
 * Labels describe the publisher, never inferred VRI alignment or renumbering.
 */
function parseReviewedChapter(raw, profile) {
  const known = APADANA_PROFILES[profile.id];
  if (!known?.stanza_layout || JSON.stringify(profile) !== JSON.stringify(known) || digest(raw) !== profile.raw_sha256) fail();
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front || !new RegExp(`^order: ${profile.poem}$`, 'm').test(front[1]) || !/^category: chapter-4$/m.test(front[1])) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1]; if (title !== profile.title) fail();
  const rest = raw.slice(front[0].length).trim(), at = rest.search(/^\[\^\d+\]:/m); if (at < 0) fail();
  let poem = rest.slice(0, at).trim();
  const present = value => plainMarkdown([18, 24, 27, 33].includes(profile.poem) ? value.replace(/<span class="diacritics" data-state="on">(c|cc)<\/span><span class="no-diacritics" data-state="off">(ch|chch)<\/span>/g, (_all, a, b) => {
    if (b !== (a === 'c' ? 'ch' : 'chch')) fail(); return a;
  }) : value);
  const definitions = [...rest.slice(at).matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  const allNotes = definitions.map((entry, i) => {
    if (Number(entry[1]) !== i + 1 || !entry[2].trim()) fail();
    return { number: i + 1, text: present(entry[2]) };
  });
  const notesFor = numbers => numbers.map(number => { const note = allNotes[number - 1]; if (!note || note.number !== number) fail(); return note; });
  const ownReferences = (text, numbers) => {
    const refs = [...text.matchAll(/\[\^(\d+)\]/g)].map(match => Number(match[1]));
    if (refs.some(number => !numbers.includes(number)) || numbers.some(number => !refs.includes(number))) fail();
  };
  let collection_summary;
  if (profile.collection_summary) {
    if (profile.id !== 'thi-ap40' || profile.poem !== 40) fail();
    const marker = '\n\nAnd then there is the Summary of Chapters:\n\n', parts = poem.split(marker);
    if (parts.length !== 2) fail();
    poem = parts[0]; const summaryRaw = marker.trim() + '\n\n' + parts[1], text = present(summaryRaw), translator_notes = notesFor(profile.collection_summary.note_numbers);
    ownReferences(summaryRaw, profile.collection_summary.note_numbers);
    if (digest(text) !== profile.collection_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.collection_summary.notes_sha256) fail();
    collection_summary = { ...profile.collection_summary, text, translator_notes };
  }
  let chapter_summary;
  if (profile.chapter_summary) {
    const marker = ({ 20: '\n\nThe Summary:[^27]\n\n', 30: '\n\nThe Summary:\n\n', 40: '\n\nThe Summary:\n\n' })[profile.poem];
    if (!marker) fail(); const parts = poem.split(marker); if (parts.length !== 2) fail();
    poem = parts[0]; const summaryRaw = marker.trim() + '\n\n' + parts[1], text = present(summaryRaw), translator_notes = notesFor(profile.chapter_summary.note_numbers);
    ownReferences(summaryRaw, profile.chapter_summary.note_numbers);
    if (digest(text) !== profile.chapter_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.chapter_summary.notes_sha256) fail();
    chapter_summary = { ...profile.chapter_summary, text, translator_notes };
  }
  let publisher_divisions;
  if (profile.publisher_divisions) {
    const marker = ({ 17: '(The First Recitation Portion)[^21]  \n', 28: 'The Fourth Recitation Portion  \n' })[profile.poem];
    if (!marker || poem.split(marker).length !== 2 || profile.publisher_divisions.length !== 1) fail();
    const scope = profile.publisher_divisions[0], text = present(marker), translator_notes = notesFor(scope.note_numbers);
    ownReferences(marker, scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    publisher_divisions = [{ ...scope, text, translator_notes }]; poem = poem.replace(marker, '');
  }
  const owned = [...profile.note_numbers, ...(profile.publisher_preface?.note_numbers || []), ...(profile.chapter_summary?.note_numbers || []), ...(profile.collection_summary?.note_numbers || []), ...(profile.publisher_divisions || []).flatMap(s => s.note_numbers)];
  if (new Set(owned).size !== owned.length || owned.length !== allNotes.length || allNotes.some(n => !owned.includes(n.number))) fail();
  const headings = [...poem.matchAll(/^### /gm)]; if (headings.length !== 1) fail();
  const split = headings[0].index; if ([11, 21, 31].includes(profile.poem) !== (split > 0)) fail();
  const prefaceRaw = poem.slice(0, split), publisher_paratext = present(prefaceRaw); let body = poem.slice(split), publisher_preface;
  if (profile.publisher_preface) {
    if (profile.id !== 'thi-ap31' || profile.poem !== 31 || profile.publisher_preface.parent_id !== profile.id
      || profile.publisher_preface.body_sha256 !== profile.paratext_sha256) fail();
    const translator_notes = notesFor(profile.publisher_preface.note_numbers);
    ownReferences(prefaceRaw, profile.publisher_preface.note_numbers);
    if (digest(publisher_paratext) !== profile.publisher_preface.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.publisher_preface.notes_sha256) fail();
    // publisher_paratext remains the sole copy of the prefatory wording.
    publisher_preface = { ...profile.publisher_preface, translator_notes };
  } else if (/\[\^\d+\]/.test(prefaceRaw)) fail();
  ownReferences(body, profile.note_numbers);
  const paragraphSplit = ({ 19: { at: 24, cut: 4, lines: 8, left: '\\[534\\][^29]', right: '(24) \\[535\\]' },
    21: { at: 37, cut: 8, lines: 12, left: '(38-39) \\[676-677\\]', right: '(40) \\[678\\]' },
    28: { at: 72, cut: 4, lines: 8, left: '(63)', right: '(64)' } })[profile.poem];
  if (paragraphSplit) {
    // Exact reviewed adjacent stanzas share one source paragraph. Insert only a break.
    const rule = paragraphSplit, paragraphs = body.split(/\n\n+/), lines = paragraphs[rule.at]?.split('\n');
    if (lines?.length !== rule.lines || !lines[rule.cut - 1].trim().endsWith(rule.left) || !lines.at(-1).trim().endsWith(rule.right)) fail();
    paragraphs.splice(rule.at, 1, lines.slice(0, rule.cut).join('\n'), lines.slice(rule.cut).join('\n')); body = paragraphs.join('\n\n');
  }
  const text = present(body), translator_notes = notesFor(profile.note_numbers), paragraphs = text.split(/\n\n+/);
  if (translator_notes.length !== profile.note_count || paragraphs.length !== profile.stanza_layout.length + 3
    || !paragraphs[0].startsWith(`[${profile.poem}. `) || !/^Thus indeed /.test(paragraphs.at(-2))
    || !(profile.poem <= 20 ? /legend of .*is finished\.$/.test(paragraphs.at(-1)) : /^The legend of /.test(paragraphs.at(-1))) || digest(text) !== profile.body_sha256
    || digest(JSON.stringify(translator_notes)) !== profile.notes_sha256 || digest(publisher_paratext) !== profile.paratext_sha256) fail();
  for (const [i, stanza] of profile.stanza_layout.entries()) {
    if (!stanza.suffix || paragraphs[i + 1].split('\n').length !== stanza.lines || !paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim().endsWith(stanza.suffix)) fail();
  }
  return { title, text, translator_notes, publisher_paratext, ...(publisher_preface ? { publisher_preface } : {}), ...(chapter_summary ? { chapter_summary } : {}), ...(collection_summary ? { collection_summary } : {}), ...(publisher_divisions ? { publisher_divisions } : {}) };
}

export function validateLink(link, id, unit, book) {
  const profile = Object.values(APADANA_PROFILES).find(p => p.path === link?.path);
  if (!profile || (id !== undefined && (id !== profile.id || !unit || !book))) fail();
  for (const key of ['id', 'poem', 'source', 'path', 'url', 'raw_url', 'translator', 'license', 'translation_revision', 'raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256', 'note_count']) {
    if (link[key] !== profile[key]) fail();
  }
  if (['partial_scope', 'shared_scope', 'section', 'parts'].some(key => Object.hasOwn(link, key))) fail();
  for (const key of ['title', 'reference', 'mapping_notes']) if (JSON.stringify(link[key]) !== JSON.stringify(profile[key])) fail();
  for (const key of ['publisher_chapter', 'index_revision', 'publisher_verse_labels', 'publisher_preface', 'chapter_summary', 'collection_summary', 'note_numbers', 'root_verses', 'stanza_layout', 'publisher_divisions', 'editorial_gap']) {
    if (Object.hasOwn(link, key) !== Object.hasOwn(profile, key) || JSON.stringify(link[key]) !== JSON.stringify(profile[key])) fail();
  }
  if (link.english !== undefined && link.english !== profile.title) fail();
  if (unit && (!book || unit.id !== profile.id || rootDigest(unit, book) !== profile.root_sha256)) fail();
  if (unit && profile.index_revision && unit.index_revision !== profile.index_revision) fail();
  for (const key of ['chapter_summary', 'collection_summary']) if (unit && profile[key]) {
    const s = profile[key];
    if (rootDigest({ ...unit, start: s.root_start, end: s.root_end }, book) !== s.root_sha256) fail();
  }
  return profile;
}

/** Only numbered substantive stanzas are quotation evidence, never headings, notes or colophons. */
export function quotationText(result) {
  const profile = Object.values(APADANA_PROFILES).find(p => 'ap:' + p.path.replace(/^\/text\/|\/$/g, '') === result.translation_id);
  if (typeof result.translation_id === 'string' && /^ap:/i.test(result.translation_id.trim()) && !profile) fail();
  validateEditorialGap(result, profile);
  if (profile) {
    if (['translation_scope', 'source_section', 'partial_scope', 'shared_scope', 'section', 'parts'].some(key => Object.hasOwn(result, key))
      || result.whole_unit_coverage === false) fail();
    if (digest(result.text || '') !== profile.body_sha256) fail();
    if (profile.stanza_layout) {
      const paragraphs = result.text.split(/\n\n+/);
      return profile.stanza_layout.map((stanza, i) => {
        const text = paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim();
        if (!stanza.suffix || !text.endsWith(stanza.suffix)) fail();
        return text.slice(0, -stanza.suffix.length).trim();
      }).join('\n\n');
    }
  }
  return String(result.text || '').split(/\n\n+/).filter(p => /\(\d+\)\s*\[(?:\d+|39-40)\](?:\[Note \d+\])*$/.test(p))
    .map(p => p.replace(/\[Note \d+\]/g, '').replace(/\s*\(\d+\)\s*\[(?:\d+|39-40)\]\s*$/, '')).join('\n\n');
}

export async function translation(link) {
  const profile = validateLink(link);
  // Sole fixed official artifact. fetchPublic's allowlist independently forbids alternate refs/paths.
  const raw = await fetchPublic(profile.raw_url, { json: false });
  if (digest(raw) !== profile.raw_sha256) fail();
  const result = parseApadana(raw, profile);
  validateEditorialGap(result, profile);
  if (digest(result.text) !== profile.body_sha256 || digest(JSON.stringify(result.translator_notes)) !== profile.notes_sha256 || digest(result.publisher_paratext) !== profile.paratext_sha256) fail();
  const theri = !Object.hasOwn(THERA_APADANA_PROFILES, profile.id);
  return { ...result, source: 'apadana', url: profile.url, fetched_from: 'official pinned repository', fetched_url: profile.raw_url,
    translator: APADANA_TRANSLATOR, attribution: 'Jonathan S. Walters and Whitman College, Legends of the Buddhist Saints. No endorsement is implied.',
    license: APADANA_LICENSE, license_url: APADANA_LICENSE_URL, translation_revision: APADANA_COMMIT,
    raw_sha256: profile.raw_sha256, body_sha256: profile.body_sha256, notes_sha256: profile.notes_sha256,
    paratext_sha256: profile.paratext_sha256, root_sha256: profile.root_sha256,
    mapping_notes: [...profile.mapping_notes],
    changes: 'Presentation extraction: retain diacritics; remove alternate no-diacritic display, Markdown and abbreviation markup; preserve interpolations and both numbering systems; label and separate translator notes and publisher preface. Chapter summary and its original note number, where present, are separately scoped outside the poem. No translation wording is generated.'
      + (!theri ? ' Finite Therā presentation removes only reviewed definition and local abbreviation-link wrappers, retaining their wording. Original malformed numbering and unmatched emphasis remain unchanged. Separately owned recitation endings and chapter summaries stay outside poem text and quotation evidence; empty apparatus note lists are not invented.' : '')
      + (!theri && profile.id === 'tha-ap42' ? ' Exact paired c/cc HTML displays retain the diacritic spelling and remove only the alternate display. The original chapter summary remains separately scoped, including its original closing paragraph and count wording.' : '')
      + (!theri && profile.poem >= 41 && profile.poem <= 60 ? ' Supplementary finite Therā extraction preserves the reviewed original bracket forms, compound and out-of-order labels, embedded note markers, and colophon punctuation and notes. These publisher-edition entries do not assert line-by-line VRI alignment.' : '')
      + (!theri && profile.poem === 49 ? ' The exact fifth recitation marker is displayed separately before publisher local stanza 15/global 1229. It owns no notes and is excluded from poem text and quotation evidence; the original stanza wording and order are retained.' : '')
      + (profile.editorial_gap ? ' The original publisher editorial gap and original note 12 are separately scoped outside poem text, pagination and quotation evidence. Its caption records the source placement after local stanza 25/global 1164 and before local stanza 26/global 1165; it asserts no canonical stanza alignment. Original poem notes retain numbers 1–11 and 13.' : '')
      + (!theri && profile.id === 'tha-ap102' ? ' Original poem notes 1–2, tenth-chapter summary note 3 and first-hundred chapter-summary/colophon note 4 remain separately owned. The first-hundred summary covers only the publisher’s first hundred poems and first ten chapters, not the end of all Therā Apadāna; neither summary is poem quotation evidence or a translation-coverage total.' : '')
      + (!theri && [50, 60].includes(profile.poem) ? ' The original zero-note chapter summary remains separately scoped, including the canonical chapter closing. Publisher summary counts are preserved as original wording, not validated translation-coverage totals.' : '')
      + (theri && profile.poem === 17 ? ' The publisher recitation division and its original note 21 are displayed separately, before the identified publisher stanza, outside poem text and quotation evidence.' : '')
      + (theri && [18, 24, 27, 33].includes(profile.poem) ? ' Exact paired HTML display spans retain the diacritic spelling and remove only its alternate display; original editorial placeholders remain unchanged.' : '')
      + (theri && profile.poem === 31 ? ' The fourth-chapter publisher preface owns original note 1, separately from poem notes 2–18. Original duplicate local stanza 11 is retained; no number is inferred or corrected.' : '')
      + (theri && profile.poem === 40 ? ' The publisher collection summary and its original notes 11–12 are separately scoped from the chapter summary and notes 8–10 and from poem text and notes 1–7. Original summary counts and closing colophons are retained without inferring complete VRI line alignment.' : '')
      + (theri && profile.poem === 19 ? ' One paragraph break separates printed publisher stanza 534 from local 24/global 535, originally printed in the same paragraph; wording and labels are unchanged.' : '')
      + (theri && profile.poem === 21 ? ' One paragraph break separates the publisher combined local 38-39/global 676-677 stanza from local 40/global 678; wording and labels are unchanged.' : '')
      + (theri && profile.poem === 28 ? ' The publisher fourth recitation division is displayed separately before local 50/global 1009; it owns no notes, and stanza notes stay with their original stanzas. One paragraph break separates printed local 63 and 64; no wording or labels are changed.' : '') };
}
