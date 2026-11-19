// Verify actual publisher bytes and canonical scope before metadata activation.
import {readFile, realpath} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {segmentsFromCorpus} from '../../src/canon.mjs';
import {readBundled} from '../../src/bundled-data.mjs';
import {atiNotice} from '../../src/english.mjs';
import {scopeHash} from '../../src/translation-scope.mjs';
import {extractAtiSection} from '../../src/ati-sections.mjs';
import {reviewedSectionLink,validateSectionRegistry,retainedAnMindShared} from '../../src/ati-section-registry.mjs';
import {AN_MIND_SECTION_PROFILE,ATI_SECTION_PROFILES} from '../../src/ati-section-profiles.mjs';

const [manifest, checkout] = process.argv.slice(2);
if (!manifest || !checkout) throw Error('Usage: verify_section_html.mjs MANIFEST ATI-CHECKOUT');
const m = JSON.parse(await readFile(manifest, 'utf8'));
const root = await realpath(checkout), verified = [];
// Bootstrap verification deliberately reads the immutable corpus without loading
// the existing translation table, which does not contain the new links yet.
const corpus = JSON.parse(gunzipSync(readBundled(new URL('../../server/data/canon.json.gz', import.meta.url))));
const units = new Map(corpus.units.map(unit => [unit.id,unit]));
const proposed = Object.fromEntries(m.links.map(row => [row.unit_id,[reviewedSectionLink(row,m)]]));
const previous = JSON.parse(await readFile(new URL('../../server/data/translations.json', import.meta.url),'utf8'));
const retained = (previous['an1.21'] || []).find(link => retainedAnMindShared(link,units.get('an1.21')));
if (!retained || !proposed['an1.21']) throw Error('Existing AN shared version must survive whole-section activation');
proposed['an1.21'].push(retained);
validateSectionRegistry(m,corpus,proposed,unit => segmentsFromCorpus(unit,corpus));
for (const row of m.links) {
  const path = await realpath(resolve(root, row.path.slice(1) + '.html'));
  if (!path.startsWith(root + sep)) throw Error('ATI section source escapes checkout');
  const raw = await readFile(path), html = raw.toString('utf8');
  if (createHash('sha256').update(raw).digest('hex') !== row.source_html_sha256) throw Error('ATI section HTML changed');
  const selected = extractAtiSection(html, row), notice = atiNotice(html);
  if (!notice.licensing || !notice.citation || scopeHash(notice) !== row.section.notice_sha256
    || scopeHash(selected.text) !== row.section.text_sha256
    || scopeHash(selected.translator_notes) !== row.section.notes_sha256) throw Error('ATI section body, notes or full notice changed');
  const unit = units.get(row.unit_id), segments = segmentsFromCorpus(unit,corpus);
  const first = segments.findIndex(s => s.ref === row.section.first_ref);
  const last = segments.findIndex(s => s.ref === row.section.last_ref);
  if (corpus.source.commit !== m.vri_commit || first < 0 || last < first
    || scopeHash(segments.slice(first, last + 1).map(({ref,type,text}) => ({ref,type,text}))) !== row.section.pali_sha256) throw Error('ATI section exact Pali body changed');
  const outside = segments.filter((s,i) => (i < first || i > last) && s.type !== 'heading');
  const profile = ATI_SECTION_PROFILES.find(value => value.unit_id === row.unit_id);
  const paratext = row.section.profile === AN_MIND_SECTION_PROFILE
    ? [{ref: segments[first].ref,text: profile.inline_paratext}, ...segments.filter((_,i) => i < first || i > last).map(({ref,text}) => ({ref,text}))]
    : row.section.profile === 'ati-sn27-feelings-v1'
    ? [{ref: 'sn27.5/2', text: 'Pañcamaṃ.'}] : outside.map(({ref,text}) => ({ref,text}));
  // The finite registry already verifies the exact inline suffix against the
  // full original two-segment root. Never remove it from canonical output.
  if (scopeHash(paratext) !== scopeHash(row.untranslated_paratext)) throw Error('ATI section untranslated paratext changed');
  verified.push({id:unit.id,characters:selected.text.length,notes:selected.translator_notes.length});
}
console.log(JSON.stringify({verified}));
