#!/usr/bin/env node
/**
 * Builds server/data/parallels.json.gz (issue #29, D59): cross-references from the commentaries' own
 * citations, and passages shared word for word between canonical texts. Offline and deterministic: it reads
 * only the bundled server/data/canon.json.gz and server/data/commentary.json.gz, records their SHA-256 and
 * VRI commit, and writes the same bytes for the same inputs. No SuttaCentral data is read or derived.
 *
 *   node scripts/parallels/build.mjs            write server/data/parallels.json.gz
 *   node scripts/parallels/build.mjs --check    rebuild in memory and fail if the committed file differs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../../src/canon.mjs';
import * as commentary from '../../src/commentary.mjs';
import { loadGlossary } from '../../src/glossary-data.mjs';
import { buildCitations, PREFIXES, MIN_WHOLE, MIN_PART } from './citations.mjs';
import { buildShared, PARAMS } from './shared.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'server', 'data');
const OUT = join(DATA, 'parallels.json.gz');
const sha256 = (file) => createHash('sha256').update(readFileSync(join(DATA, file))).digest('hex');

const collectionOf = (id) => canon.load().byId.get(id).collection;

export function build() {
  const cites = buildCitations();
  const shared = buildShared();
  const count = (links, key) => {
    const out = {};
    for (const l of links) for (const id of key(l)) { const c = collectionOf(id); out[c] = (out[c] || 0) + 1; }
    return Object.fromEntries(Object.entries(out).sort());
  };
  const citations = cites.links.map((l) => ({
    from: l.from, to: l.to, match: l.match, commentary_ref: l.commentary_ref, work: l.work,
    ...(l.vri_reference ? { vri_reference: l.vri_reference, cited: l.cited } : {}),
    ...(l.named ? { named: l.named } : {}),
    ...(l.quotation_found ? { quotation_found: l.quotation_found, quotation_span: l.quotation_span } : {}),
    ...(l.target_segment ? { target_segment: l.target_segment } : {}),
    evidence: l.evidence,
  }));
  const out = {
    source: {
      name: 'Parallels and cross-references built from the bundled VRI Chaṭṭha Saṅgāyana canon and commentary',
      builder: 'scripts/parallels/build.mjs',
      inputs: {
        'canon.json.gz': { sha256: sha256('canon.json.gz'), vri_commit: canon.source().commit },
        'commentary.json.gz': { sha256: sha256('commentary.json.gz'), vri_commit: commentary.load().source.commit },
        // DPD sutta names, read only to rule out ambiguous sutta names; nothing from it is stored.
        'glossary.json.gz': { sha256: sha256('glossary.json.gz'), vri_commit: loadGlossary().source.canon_commit },
      },
      attribution: 'Derived from the Vipassana Research Institute (VRI) Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org',
      terms: 'Made freely available by VRI for non-commercial use with attribution. No SuttaCentral data is used.',
      method: {
        'commentary-citation': {
          'vri-reference+quotation': `VRI's own bracketed reference in the commentary (book, volume, VRI paragraph), with the quotation before it found in the cited paragraph (±1): a piece of at least ${MIN_WHOLE} letters whole, or a run of ${MIN_PART} letters`,
          'vri-reference': "VRI's own bracketed reference, no quotation to check; never used for SN or AN",
          'sutta-name': 'a sutta named in the commentary whose name, diacritics included, equals the title of exactly one canonical text and is not the start of the title or DPD sutta name of any other text',
          'sutta-name+nikaya': 'a sutta named after its Nikāya ("Majjhimanikāye … sutte"), the title unique within that Nikāya, with the same name rules',
          reference_books: Object.keys(PREFIXES).sort(),
          rules: [
            'Only commentary passages aligned to exactly one text are read, so the citing text is known.',
            'A cited paragraph must occur exactly once in its book and belong to one text.',
            'A quotation that is not in the cited paragraph drops the link.',
            'Relative references (anantarasutte, purimasutte, paṭhamasutte) are never resolved.',
            'A text citing itself is not a link.',
            'A sutta name is dropped when it is also the start of the title or DPD sutta name of another text (udaya / Udayamāṇavapucchā), when a Cūḷa- or Mahā- title ends in it, when a VRI reference in brackets next to it points at another text, or when it follows "Evaṃ me sutanti" (the commentary naming its own text).',
            'A sutta name is dropped when a quotation next to it (just before, or introduced just after as what was said) comes from another text: the VRI reference on it does not point at the named text and another text holds more of the quotation than the named one.',
          ],
        },
        'shared-passage': {
          ...PARAMS,
          description: `Runs of ${PARAMS.shingle_words} words (diacritics and case folded) found in at most ${PARAMS.max_texts_per_shingle} texts; a pair is linked when they share at least ${PARAMS.min_shared_words} words with ${PARAMS.min_run_words} in one stretch, or at least ${PARAMS.min_short_words} words covering ${PARAMS.min_short_coverage * 100}% of the shorter text. Runs never cross a peyyāla mark.`,
        },
      },
    },
    counts: {
      commentary_citations: citations.length,
      commentary_citations_by_match: Object.fromEntries(Object.entries(citations.reduce((o, l) => ({ ...o, [l.match]: (o[l.match] || 0) + 1 }), {})).sort()),
      commentary_citations_from: count(citations, (l) => [l.from]),
      commentary_citations_to: count(citations, (l) => [l.to]),
      shared_passages: shared.links.length,
      shared_passages_by_collection: count(shared.links, (l) => [l.a, l.b]),
      citation_stats: Object.fromEntries(Object.entries(cites.stats).sort()),
      shared_stats: shared.stats,
    },
    citations,
    shared: shared.links,
  };
  const gz = gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 });
  gz[9] = 3; // gzip header OS byte: the same on every platform
  return { out, gz };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { out, gz } = build();
  if (process.argv.includes('--check')) {
    const same = Buffer.compare(readFileSync(OUT), gz) === 0;
    console.log(same ? 'parallels.json.gz is up to date' : 'parallels.json.gz differs from a fresh build');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUT, gz);
  console.log(`wrote ${OUT}: ${(gz.length / 1e6).toFixed(2)} MB gz`);
  console.log(JSON.stringify({ ...out.counts, citation_stats: undefined, shared_stats: undefined }, null, 1));
  console.log(JSON.stringify(out.counts.citation_stats, null, 1), JSON.stringify(out.counts.shared_stats));
}
