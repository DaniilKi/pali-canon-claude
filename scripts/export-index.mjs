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
];

export const LICENSE_NOTE = [
  'This index maps citation IDs to locations in the Chaṭṭha Saṅgāyana Tipiṭaka (Vipassana Research Institute, VRI) and to English translation pages.',
  'It contains no scripture text and no translation text: only IDs, Pāli titles, paragraph numbers, PTS page references, translator names and URLs.',
  'The Pāli titles and page markers come from the VRI edition, which VRI makes freely available for non-commercial use with attribution.',
  'Translation pages belong to their publishers and keep their own licences: dhammatalks.org (Ṭhānissaro Bhikkhu) is CC BY-NC 4.0;',
  'Access to Insight licences vary by page (the licence label of each link is included). Do not sell this data or content reached through it.',
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
      english: info.english.map((t) => ({
        source: t.source,
        translator: t.translator || null,
        reference: t.reference || null,
        url: t.url,
        translation_id: t.translation_id,
        license: t.license || (t.source === 'dhammatalks.org' ? 'CC BY-NC 4.0' : null),
        match: t.match,
      })),
    };
  });
  return {
    name: 'Pali Canon citation index',
    generated_by: 'scripts/export-index.mjs (https://github.com/DaniilKi/pali-canon-claude)',
    version: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version,
    source: { name: src.name, repository: src.repository, commit: src.commit, attribution: src.attribution, terms: src.terms },
    license: LICENSE_NOTE,
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
    const row = {
      id: t.id, citation: t.citation, title: t.title, pitaka: t.pitaka, collection: t.collection, kind: t.kind,
      approximate: t.approximate ? 'true' : 'false',
      vri_book: t.vri.book, vri_file: t.vri.file, vri_paragraphs: t.vri.paragraphs,
      pts: t.pts?.label, pts_volume: t.pts?.volume, pts_page: t.pts?.page, pts_end_page: t.pts?.end_page,
      members: (t.members || []).join(' | '),
      english_inherited_from: t.english_inherited_from,
      english_count: t.english.length,
      english_urls: t.english.map((e) => e.url).join(' | '),
      english_translators: t.english.map((e) => e.translator || '').join(' | '),
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
    '## Source and licence',
    '',
    `Pāli edition: ${index.source.name}, ${index.source.repository} at commit ${index.source.commit}.`,
    `Attribution: ${index.source.attribution}. Terms: ${index.source.terms}`,
    '',
    index.license,
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
