// Bulk export of the citation index: citation ID ↔ VRI book and paragraphs ↔ PTS page ↔ English translation links.
// Writes JSON and CSV (plus a licence notice) into dist/export/ (or --out <dir>). No scripture text is exported.
//
//   node scripts/export-index.mjs [--out dist/export]
//
// release.yml attaches these files to every GitHub release; pages.yml publishes them under /export/ on the docs site.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as canon from '../src/canon.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const CSV_COLUMNS = [
  'id', 'citation', 'title', 'pitaka', 'collection', 'kind', 'approximate',
  'vri_book', 'vri_file', 'vri_paragraphs',
  'pts', 'pts_volume', 'pts_page', 'pts_end_page',
  'members', 'english_inherited_from', 'english_count', 'english_urls', 'english_translators',
  'english_references', 'english_translation_ids', 'english_licenses',
  'partial_english_count', 'partial_english', 'shared_english_count', 'shared_english',
];

const CC_BY_NC_4 = 'https://creativecommons.org/licenses/by-nc/4.0/';

/**
 * Readable names for the licence labels on translation links. The Access to Insight codes are the
 * page's own LICENSE field (checked against the notices on accesstoinsight.org pages, November 2026).
 * A code not listed here is exported with license_name null: read the page's own notice.
 */
export const LICENSE_LABELS = {
  'CC BY-NC 4.0': {
    name: 'CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial 4.0 International)',
    url: CC_BY_NC_4,
    used_by: 'dhammatalks.org',
  },
  'CC-BY-NC': {
    name: 'CC BY-NC (Creative Commons Attribution-NonCommercial)',
    terms: 'the page states the version (4.0 on the pages checked)',
    url: CC_BY_NC_4,
    used_by: 'Access to Insight',
  },
  BPS: {
    name: 'BPS free-distribution terms (Buddhist Publication Society)',
    terms: 'copies free of charge, reprints of no more than 50 copies, derivatives marked as such, licence text included; otherwise all rights reserved',
    url: null,
    used_by: 'Access to Insight',
  },
  ATI_DEPRECATED: {
    name: 'Access to Insight free-distribution licence (older, not Creative Commons)',
    terms: 'copies free of charge, derivatives marked as such, licence text included; otherwise all rights reserved',
    url: null,
    used_by: 'Access to Insight',
  },
  'CC BY-SA 3.0': {
    name: 'CC BY-SA 3.0 (Creative Commons Attribution-ShareAlike 3.0 Unported)',
    terms: "the site's Copyright Notice gives 3.0 Unported, its page footers link 4.0; share-alike, credit Ānandajoti Bhikkhu",
    url: 'https://creativecommons.org/licenses/by-sa/3.0/',
    used_by: 'Ancient Buddhist Texts (Ānandajoti Bhikkhu)',
  },
};

export const licenseName = (code) => (code && LICENSE_LABELS[code] ? LICENSE_LABELS[code].name : null);

export const LICENSE_NOTE = [
  'This index maps citation IDs to locations in the Chaṭṭha Saṅgāyana Tipiṭaka (Vipassana Research Institute, VRI) and to English translation pages.',
  'It contains no scripture text and no translation text: only IDs, Pāli titles, paragraph numbers, PTS page references, translator names and URLs.',
  'The Pāli titles and page markers come from the VRI edition, which VRI makes freely available for non-commercial use with attribution.',
  'Translation pages belong to their publishers and keep their own licences: dhammatalks.org (Ṭhānissaro Bhikkhu) is CC BY-NC 4.0;',
  'Ancient Buddhist Texts (Ānandajoti Bhikkhu) is CC BY-SA 3.0 (share-alike);',
  'Access to Insight licences vary by page: each link carries its licence code (`license`) and readable name (`license_name`) in the JSON, and the CSV lists the readable names in `english_licenses`.',
  'Do not sell this data or content reached through it.',
  'Citation numbering follows the public scheme also used by SuttaCentral; no SuttaCentral content is included.',
].join(' ');

/** One record per citable text, in canon order. */
export function buildIndex() {
  const d = canon.load();
  const src = canon.source();
  const texts = d.canon.units.map((u) => {
    const info = canon.describe(u);
    const { via } = canon.linksFor(u);
    return {
      id: u.id,
      citation: u.acronym,
      title: u.title || null,
      pitaka: info.pitaka,
      collection: info.collection,
      kind: u.kind || 'text',
      approximate: Boolean(u.approximate),
      vri: { book: info.vri_book, file: info.vri_file, paragraphs: u.vri || null },
      pts: u.pts ? { label: info.pts, volume: u.pts.volume || null, page: u.pts.page ?? null, end_page: u.pts.end_page ?? u.pts.page ?? null } : null,
      ...(u.members ? { members: u.members } : {}),
      english_inherited_from: via ? via.id : null,
      english_count: info.english.filter(t => !t.translation_scope).length,
      partial_english_count: info.english.filter(t => t.translation_scope?.kind === 'partial_unit').length,
      shared_english_count: info.english.filter(t => t.translation_scope?.kind === 'shared_page').length,
      english: info.english.map((t) => ({
        source: t.source,
        translator: t.translator || null,
        reference: t.reference || null,
        url: t.url,
        translation_id: t.translation_id,
        license: t.license || (t.source === 'dhammatalks.org' ? 'CC BY-NC 4.0' : null),
        match: t.match,
        ...(t.translation_scope ? { translation_scope: t.translation_scope, whole_unit_coverage: false } : {}),
      })).map((e) => ({ ...e, license_name: licenseName(e.license) })),
    };
  });
  return {
    name: 'Pali Canon citation index',
    generated_by: 'scripts/export-index.mjs (https://github.com/DaniilKi/pali-canon-claude)',
    version: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version,
    source: { name: src.name, repository: src.repository, commit: src.commit, attribution: src.attribution, terms: src.terms },
    license: LICENSE_NOTE,
    license_labels: LICENSE_LABELS,
    count: texts.length,
    texts,
  };
}


const cell = (value) => {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** RFC 4180 CSV, one row per text; multi-valued cells are joined with " | ". */
export function toCsv(index) {
  const rows = [CSV_COLUMNS.join(',')];
  for (const t of index.texts) {
    const whole = t.english.filter(e => !e.translation_scope);
    const partial = t.english.filter(e => e.translation_scope?.kind === 'partial_unit');
    const shared = t.english.filter(e => e.translation_scope?.kind === 'shared_page');
    const row = {
      id: t.id, citation: t.citation, title: t.title, pitaka: t.pitaka, collection: t.collection, kind: t.kind,
      approximate: t.approximate ? 'true' : 'false',
      vri_book: t.vri.book, vri_file: t.vri.file, vri_paragraphs: t.vri.paragraphs,
      pts: t.pts?.label, pts_volume: t.pts?.volume, pts_page: t.pts?.page, pts_end_page: t.pts?.end_page,
      members: (t.members || []).join(' | '),
      english_inherited_from: t.english_inherited_from,
      shared_english_count: shared.length,
      shared_english: JSON.stringify(shared),
      partial_english_count: partial.length,
      partial_english: JSON.stringify(partial),
      english_count: whole.length,
      english_urls: whole.map((e) => e.url).join(' | '),
      english_translators: whole.map((e) => e.translator || '').join(' | '),
      english_references: whole.map((e) => e.reference || '').join(' | '),
      english_translation_ids: whole.map((e) => e.translation_id || '').join(' | '),
      english_licenses: whole.map((e) => e.license_name || e.license || 'unknown: see the page').join(' | '),
    };
    rows.push(CSV_COLUMNS.map((c) => cell(row[c])).join(','));
  }
  return `${rows.join('\r\n')}\r\n`;
}

export function notice(index) {
  return [
    '# Pali Canon citation index',
    '',
    `Version ${index.version}. ${index.count} texts.`,
    '',
    'Files:',
    '',
    '- `citation-index.json`: one record per text with its VRI book and paragraphs, PTS reference and English translation links.',
    '- `citation-index.csv`: the same, one row per text (multi-valued cells joined with " | "). Columns: ' + CSV_COLUMNS.join(', ') + '.',
    '',
    'Whole-unit English counts and the legacy CSV english_* link columns exclude partial sources and condensed shared pages. shared_english is a separate JSON array retaining the full member list and unverified individual alignment; shared_english_count counts page links, not full translations. JSON english entries retain translation_scope; CSV partial_english is a JSON array preserving complete scope, identity, reading commands and licence metadata. Partial links do not establish whole-unit coverage. english_inherited_from concerns whole-unit links only.',
    '',
    '## Source and licence',
    '',
    `Pāli edition: ${index.source.name}, ${index.source.repository} at commit ${index.source.commit}.`,
    `Attribution: ${index.source.attribution}. Terms: ${index.source.terms}`,
    '',
    index.license,
    '',
    '## Licence labels on translation links',
    '',
    "Each link's `license` code (JSON) and its readable name (`license_name` in the JSON, `english_licenses` in the CSV):",
    '',
    ...Object.entries(LICENSE_LABELS).map(([code, l]) => `- \`${code}\` (${l.used_by}): ${l.name}${l.terms ? `: ${l.terms}` : ''}${l.url ? `. ${l.url}` : '.'}`),
    '',
    'Each Access to Insight page carries its own full licence notice, which governs. Read it before reusing a page.',
    '',
    'Software: MIT (https://github.com/DaniilKi/pali-canon-claude/blob/main/LICENSE). Details: https://github.com/DaniilKi/pali-canon-claude/blob/main/THIRD_PARTY.md',
    '',
  ].join('\n');
}

export function writeExport(outDir) {
  const index = buildIndex();
  mkdirSync(outDir, { recursive: true });
  const files = {
    'citation-index.json': `${JSON.stringify(index)}\n`,
    'citation-index.csv': toCsv(index),
    'citation-index-LICENSE.md': notice(index),
  };
  for (const [name, body] of Object.entries(files)) writeFileSync(resolve(outDir, name), body);
  return { index, files: Object.keys(files) };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const flag = process.argv.indexOf('--out');
  const outDir = resolve(flag >= 0 ? process.argv[flag + 1] : resolve(root, 'dist', 'export'));
  const { index, files } = writeExport(outDir);
  console.log(`Wrote ${files.join(', ')} (${index.count} texts) to ${outDir}`);
}
