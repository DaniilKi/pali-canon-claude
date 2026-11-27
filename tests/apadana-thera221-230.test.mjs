/** Current380 app/API stays actual R; historical baseline inputs are explicit owned H. */
import {after as closeThera221HistoricalInputs} from 'node:test';
import {lstatSync as thera221InputStat} from 'node:fs';
import {resolve as thera221Resolve,isAbsolute as thera221IsAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertCurrent380SourceClosure,intake380Authority,requireProfiles380,requireMetadata380} from './helpers/intake380-metadata.mjs';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
const actualThera221Root=new URL('../',import.meta.url);
function readThera221RegularBytes(root,path){
 assert.equal(typeof path,'string');assert.ok(path&&!path.startsWith('/')&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'));
 let target=root;const parts=path.split('/');for(let i=0;i<parts.length;i++){target=new URL(parts[i]+(i===parts.length-1?'':'/'),target);const stat=thera221InputStat(target);assert.equal(stat.isSymbolicLink(),false,'Declared221 input has no alias component');assert.equal(i===parts.length-1?stat.isFile():stat.isDirectory(),true);}
 return readActualFileSync(target);
}
function thera221ReadMode(raw,options){assert.ok(options.length===0||options.length===1&&options[0]==='utf8','Existing explicit Buffer or utf8 mode only');return options.length?raw.toString('utf8'):raw;}
assertCurrent380SourceClosure(actualThera221Root);
requireProfiles380(APADANA_PROFILES,actualThera221Root);
requireMetadata380(APADANA_PROFILES,JSON.parse(readThera221RegularBytes(actualThera221Root,'server/data/apadana.json')),actualThera221Root);
const thera221Source=intake380Authority(actualThera221Root),thera221Manifest=thera221Source.historical375.documents['H_HISTORY_FIXTURE_INPUTS.json'];
const thera221HRows=Object.freeze({...thera221Manifest.source_files,...thera221Manifest.runtime_extension});
const ownedThera221H=prepareHistoricalHRuntimeInputs(actualThera221Root),thera221HRoot=pathToFileURL(ownedThera221H.root+'/');
let thera221HistoricalModules;
try{
 thera221HistoricalModules=await Promise.all(['boundary333-336-source-input.mjs','four-history-data.mjs','canon-before-four.mjs','source-note-baseline.mjs'].map(name=>import(new URL('tests/helpers/'+name,thera221HRoot).href)));
}catch(error){try{ownedThera221H.close();}catch(cleanup){throw new AggregateError([error,cleanup],'H221 helper import and cleanup both failed');}throw error;}
closeThera221HistoricalInputs(()=>ownedThera221H.close());
const [{frozen440FileReader},{historical440DataReader},{canonBeforeFour},{sourceNoteBaselineProjection}]=thera221HistoricalModules;
function readThera221HBytes(path){const row=thera221HRows[path];assert.ok(row,'Explicit H221 input row');const raw=readThera221RegularBytes(thera221HRoot,path);assert.equal(raw.length,row.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256,'Exact owned H221 input');return raw;}
const thera221MetadataWitnesses=Object.freeze({
  "docs/evidence/apadana/THERA_221_230_GOLDENS.json": {
    "path": "docs/evidence/apadana/THERA_221_230_GOLDENS.json",
    "bytes": 282596,
    "sha256": "c9c5f3f99e0aac62884a222ccaa89d13f07523da10e5cd044e8e40391cf76600",
    "git_blob": "e7045dd9c6932d07a1fadede3a77f986087befea",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_NORMALIZATION_REVIEW.json": {
    "path": "docs/evidence/apadana/THERA_221_230_NORMALIZATION_REVIEW.json",
    "bytes": 28650,
    "sha256": "92bae7dd7df6e06fef8055772d46dfebfb835ea4007bc5055ca4b67e9eab940e",
    "git_blob": "31fc5084fa43d3d1f0c958ad7cce3e88069e2c11",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_RIGHTS.json": {
    "path": "docs/evidence/apadana/THERA_221_230_RIGHTS.json",
    "bytes": 8120,
    "sha256": "aa9eb535a9f2495910bfa3145efd03dc4fceadc7f348293b853fe4a8250afc5b",
    "git_blob": "1131be6fbc8161441e825aa43f60db75fce9ecfb",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_INDEPENDENT_SOURCE_APPROVAL.json": {
    "path": "docs/evidence/apadana/THERA_221_230_INDEPENDENT_SOURCE_APPROVAL.json",
    "bytes": 78590,
    "sha256": "8957644d3c28c367d6e46b014c2679a00b59ec78c1e2d8f5c0133a20d11b9ac0",
    "git_blob": "6046f17827552fc560204ff71254f2b498325e67",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_BASELINE_FREEZE.json": {
    "path": "docs/evidence/apadana/THERA_221_230_BASELINE_FREEZE.json",
    "bytes": 2318834,
    "sha256": "2ebfb8bb16a72589b74f11ac8adde8bb8cfdf68caa7e817d27a2bc2b269f849a",
    "git_blob": "ffdf17e5ac335a1188cedf6462452adfe4da1fb8",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_SOURCE_APPROVAL.json": {
    "path": "docs/evidence/apadana/THERA_221_230_SOURCE_APPROVAL.json",
    "bytes": 27806,
    "sha256": "1bdfc072457986e81b5edeaa3e235a0bd9dfa37b2b1085e367315eecfe19f9e2",
    "git_blob": "6867d0bb1aeb551f629349758ec5b88aec165618",
    "mode": "100644"
  },
  "docs/evidence/apadana/THERA_221_230_INDEPENDENT_NORMALIZATION.json": {
    "path": "docs/evidence/apadana/THERA_221_230_INDEPENDENT_NORMALIZATION.json",
    "bytes": 35973,
    "sha256": "bdf28fb52df084b8b31afdc358b5cb83a23a7f9c7810c8f94d86b0707ba59082",
    "git_blob": "ffa55901c3ae5b648381ab1a7f6cdbf027b5df06",
    "mode": "100644"
  }
});
function readThera221MetadataBytes(path,expected){
 assert.equal(typeof expected,'string');assert.match(expected,/^[a-f0-9]{64}$/,'Original221 metadata descriptor SHA required');
 let raw;
 if(thera221HRows[path])raw=readThera221HBytes(path);
 else{
  const row=thera221MetadataWitnesses[path];assert.ok(row,'Only seven independently authenticated missing H221 metadata witnesses');
  assert.equal(row.path,path);assert.equal(row.mode,'100644');
  raw=readThera221RegularBytes(actualThera221Root,path);
  assert.equal(raw.length,row.bytes);assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256,'Exact actual-R immutable H221 metadata witness');
  assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),row.git_blob,'Original GitH metadata identity');
  const parsed=JSON.parse(raw);assert.ok(parsed&&typeof parsed==='object'&&!Array.isArray(parsed),'Exact221 object metadata witness, never application/runtime input');
 }
 assert.equal(createHash('sha256').update(raw).digest('hex'),expected,'Original221 descriptor verified before metadata bytes return');
 return raw;
}
const thera221ApprovalPath='docs/evidence/apadana/THERA_221_230_APPROVAL.json';
const thera221PinnedApproval=JSON.parse(readThera221MetadataBytes(thera221ApprovalPath,thera221HRows[thera221ApprovalPath].sha256));
const thera221MetadataPaths=new Set([thera221ApprovalPath]);
const thera221MetadataPins=new Map([[thera221ApprovalPath,thera221HRows[thera221ApprovalPath].sha256]]);
for(const descriptor of [...thera221PinnedApproval.goldens,...thera221PinnedApproval.source_reviews,...thera221PinnedApproval.rights,...['independent_source_approval','baseline_freeze','source_approval','previous_intake','independent_normalization','expected_profiles','expected_links'].map(key=>thera221PinnedApproval[key])]){
 assert.equal(typeof descriptor.file,'string');const path='docs/evidence/apadana/'+descriptor.file,raw=readThera221MetadataBytes(path,descriptor.sha256);assert.equal(createHash('sha256').update(raw).digest('hex'),descriptor.sha256,'Original221 descriptor seal');thera221MetadataPaths.add(path);thera221MetadataPins.set(path,descriptor.sha256);
}
const thera221PinnedBaseline=JSON.parse(readThera221MetadataBytes('docs/evidence/apadana/'+thera221PinnedApproval.baseline_freeze.file,thera221PinnedApproval.baseline_freeze.sha256));
const thera221HistoricalPaths=new Map();
for(const entries of [thera221PinnedBaseline.canonical_and_source_data,thera221PinnedBaseline.privacy_storage_files,thera221PinnedBaseline.helper_builder_auditor_files,thera221PinnedBaseline.historical_evidence_files])for(const[path,expected]of Object.entries(entries)){
 if(path==='server/data/apadana.json'||path==='tests/helpers/apadana-intake-expectations.mjs')continue;
 if(thera221HistoricalPaths.has(path))assert.equal(thera221HistoricalPaths.get(path),expected,'Repeated221 baseline seal agrees');thera221HistoricalPaths.set(path,expected);
}
function readDeclaredThera221Historical(path,...options){
 assert.equal(typeof path,'string');assert.ok(thera221MetadataPaths.has(path)||thera221HistoricalPaths.has(path),'Only explicit221 metadata/baseline paths enter old adapters');
 let raw;if(thera221MetadataPaths.has(path))raw=readThera221MetadataBytes(path,thera221MetadataPins.get(path));else if(thera221HRows[path])raw=readThera221HBytes(path);else{assert.ok(thera221HistoricalPaths.has(path));raw=readThera221RegularBytes(actualThera221Root,path);assert.equal(createHash('sha256').update(raw).digest('hex'),thera221HistoricalPaths.get(path),'Exact original-baseline witness at actual R');}
 return thera221ReadMode(raw,options);
}
const readThera221Historical=frozen440FileReader(historical440DataReader(readDeclaredThera221Historical));
function readFileSync(path,...options){
 assert.equal(typeof path,'string');
 if(path==='server/data/apadana.json')return thera221ReadMode(readThera221RegularBytes(actualThera221Root,path),options);
 if(thera221IsAbsolute(path)){assert.ok(externalThera221Paths.has(path),'Only exact declared publisher originals/rights');const stat=thera221InputStat(path);assert.ok(stat.isFile()&&!stat.isSymbolicLink());return thera221ReadMode(readActualFileSync(path),options);}
 return readThera221Historical(path,...options);
}
/** Exact source-scope curation, separate from production profile derivation. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readActualFileSync} from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, isApadanaRawUrl } from '../src/apadana-profiles.mjs';
import { THERA_APADANA_PROFILES } from '../src/apadana-thera-profiles.mjs';
import { parseTheraApadana } from '../src/apadana-thera.mjs';
import { parseApadana, quotationText, digest, rootDigest, validateLink } from '../src/apadana.mjs';
import { fetchPublic } from '../src/http.mjs';
import { CURRENT_APADANA_IDS } from './helpers/apadana-intake-expectations.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { validateApadanaChoice, validateEnglishPage } from '../web/translation-policy.mjs';

const approval = JSON.parse(readFileSync('docs/evidence/apadana/THERA_221_230_APPROVAL.json', 'utf8'));
const sealed = descriptor => {
  const raw = readFileSync('docs/evidence/apadana/'+descriptor.file);
  assert.equal(digest(raw), descriptor.sha256, `Independent evidence seal: ${descriptor.file}`);
  return JSON.parse(raw);
};
const inputs = approval.goldens.map(sealed), reviews = approval.source_reviews.map(sealed);
const rights = approval.rights.map(sealed), independent = sealed(approval.independent_source_approval);
const baseline = sealed(approval.baseline_freeze), sourceApproval = sealed(approval.source_approval);
const approved = approval.approved_ids;
const previous = sealed(approval.previous_intake);
const independentlyNormalized = sealed(approval.independent_normalization);
const expectedProfiles = sealed(approval.expected_profiles), expectedLinks = sealed(approval.expected_links);
const peerGolden = uid => {
  const rows = independentlyNormalized.poems.filter(row => row.canonical_owner === uid);
  assert.equal(rows.length, 1, uid + ' one independently derived normalization proof');
  return rows[0];
};
const golden = uid => {
  const rows = inputs.flatMap(input => input.poems).filter(row => row.id === uid);
  assert.equal(rows.length, 1, `One independently sealed source record for ${uid}`);
  return rows[0];
};
const originalThera221Checkout=process.env.APADANA_SOURCE_CHECKOUT;
const checkout=originalThera221Checkout?thera221Resolve(fileURLToPath(actualThera221Root),originalThera221Checkout):originalThera221Checkout;
const externalThera221Paths=new Set(checkout?[
 ...approved.map(uid=>thera221Resolve(checkout,golden(uid).path)),
 ...inputs.flatMap(input=>[...input.rights,input.publisher_routing].map(row=>thera221Resolve(checkout,row.path))),
]:[]);
const source = p => readFileSync(join(checkout, golden(p.id).path), 'utf8');
const tid = p => canon.translationId(p);
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const scopes = ['publisher_preface', 'chapter_summary', 'collection_summary', 'publisher_divisions', 'editorial_gap'];
function assertScopes(value, p, content) {
  for (const key of scopes) {
    assert.equal(Object.hasOwn(value, key), Object.hasOwn(p, key), `${p.id} ${key} presence`);
    if (!p[key]) continue;
    const actual = key === 'publisher_divisions' ? value[key] : [value[key]];
    const expected = key === 'publisher_divisions' ? p[key] : [p[key]];
    assert.equal(actual.length, expected.length);
    for (const [i, row] of actual.entries()) {
      const { text, translator_notes, ...descriptor } = row;
      assert.deepEqual(descriptor, expected[i]);
      if (content) {
        assert.equal(digest(text), descriptor.body_sha256);
        assert.equal(digest(JSON.stringify(translator_notes)), descriptor.notes_sha256);
        assert.deepEqual(translator_notes.map(note => note.number), descriptor.note_numbers);
      } else { assert.equal(text, undefined); assert.equal(translator_notes, undefined); }
    }
  }
}
function pinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = approved.map(uid => APADANA_PROFILES[uid]).find(row => row.raw_url === url.href);
    assert.ok(p, 'Only an exact independently approved source reaches transport');
    calls.push(p.id);
    return new Response(source(p));
  };
}

test('221–230 intake is exactly independently approved10 and preserves all256 prior profiles and links', () => {
  assert.equal(approval.status, 'approved');
  assert.equal(approval.base_commit, '9ceed785d30afdcdc1f09021d6098b5bb85f02fb');
  assert.equal(independent.baseline, approval.base_commit);
  assert.equal(independent.status, 'SOURCE_AND_NORMALIZATION_APPROVED_10_ONLY');
  assert.equal(independent.runtime_approval, false);
  assert.equal(independent.external_activation_count, 0);
  assert.deepEqual(sourceApproval.approved_ids, approved);
  assert.equal(sourceApproval.normalization_approval_count, 10);
  assert.equal(sourceApproval.external_activations, 0);
  assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids);
  assert.equal(approved.length, 10);
  assert.deepEqual(approved, approval.approved_records.map(row => row.id));
  assert.equal(approval.baseline_ids.length, 256);
  assert.deepEqual(approval.baseline_ids, previous.expected_profile_ids, 'Exact preceding256 curation chain');
  assert.deepEqual(approval.baseline_records, [...previous.baseline_records, ...previous.approved_records]);
  assert.equal(baseline.baseline, approval.base_commit);
  for (const [group, entries] of Object.entries({ canonical_and_source_data: baseline.canonical_and_source_data, privacy_storage_files: baseline.privacy_storage_files, helper_builder_auditor_files: baseline.helper_builder_auditor_files, historical_evidence_files: baseline.historical_evidence_files })) {
    for (const [path, hash] of Object.entries(entries)) {
      if (path === 'server/data/apadana.json' || path === 'tests/helpers/apadana-intake-expectations.mjs') continue;
      assert.equal(digest(sourceNoteBaselineProjection(path, readFileSync(path), hash)), hash, `${group}: existing ${path} is byte-exact`);
    }
  }
  const historical266 = [...approval.baseline_ids, ...approved];
  assert.equal(historical266.length, 266);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 266), historical266);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  const data = canon.load(), manifest = JSON.parse(readFileSync('server/data/apadana.json', 'utf8'));
  for (const uid of approval.baseline_ids) {
    const oldLink = baseline.translation_objects[uid], oldProfile = baseline.profile_objects[uid];
    assert.deepEqual(APADANA_PROFILES[uid], oldProfile, `${uid} previous profile exact`);
    assert.deepEqual(manifest.links[uid], oldLink, `${uid} previous source link exact`);
  }
  assert.equal(digest(JSON.stringify(canonBeforeFour(data.canon))), baseline.canon_logical_sha256, 'This intake cannot change canonical words, boundaries or locator revisions');
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), u = data.byId.get(uid), book = data.canon.books[u.book];
    assert.equal(p, THERA_APADANA_PROFILES[uid]);
    assert.deepEqual(p, expectedProfiles[uid], `${uid} source-author pure profile seal`);
    assert.deepEqual(manifest.links[uid], expectedLinks[uid], `${uid} exact source-author pure link seal`);
    assert.deepEqual(p, independent.approved_profile_objects[uid], `${uid} exact independently approved literal profile`);
    assert.equal(p.path, `/text/chapter-3/poem-${String(g.poem).padStart(3, '0')}/`);
    assert.equal(p.raw_url, `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/${g.path}`);
    assert.equal(p.poem, g.poem); assert.equal(p.title, g.title); assert.equal(p.translation_revision, APADANA_COMMIT);
    assert.equal(p.license, 'CC BY-NC-SA 4.0'); assert.equal(p.translator, 'Jonathan S. Walters');
    assert.match(p.reference, /complete publisher-edition poem/);
    assert.match(p.mapping_notes.join(' '), /not a line-complete/);
    assert.deepEqual(p.mapping_notes, g.mapping_notes);
    const review = reviews.flatMap(row => row.per_poem).filter(row => row.id === uid);
    assert.equal(review.length, 1, `${uid} source-author complete original-to-display comparison`);
    assert.equal(review[0].poem, p.poem);
    assert.equal(review[0].all_stanzas_notes_and_colophons_compared, true);
    assert.equal(review[0].body_paragraph_count, g.body_paragraphs.length);
    assert.equal(review[0].physical_stanza_count, g.physical_stanza_count);
    assert.equal(review[0].local_labels, g.printed_local_verse_label_count);
    assert.equal(review[0].poem_notes, g.note_count);
    const sourceRecord = sourceApproval.approved_records.filter(row => row.id === uid);
    assert.equal(sourceRecord.length, 1); assert.equal(sourceRecord[0].publisher_poem, p.poem);
    assert.equal(sourceRecord[0].source_approval, true); assert.equal(sourceRecord[0].normalization_approval, true);
    assert.deepEqual(sourceRecord[0].edition_caveats, p.mapping_notes);
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(sourceRecord[0][key], p[key]);
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256']) assert.equal(p[key], g[key]);
    assert.equal(rootDigest(u, book), g.root.root_sha256); assert.equal(p.root_sha256, g.root.root_sha256);
    assert.deepEqual(p.stanza_layout, g.stanza_layout); assert.deepEqual(p.note_numbers, g.note_numbers);
    assert.equal(u.index_revision, undefined, 'This source intake cannot add any mapping revision');
    for (const key of scopes) {
      if (p[key]) for (const field of ['body_sha256', 'notes_sha256', 'note_numbers', 'root_start', 'root_end', 'root_sha256', 'first_ref', 'last_ref']) assert.deepEqual(p[key][field], g[key][field]);
      else if (key === 'publisher_preface') {
        // Golden preface audit metadata is not a runtime note-owned descriptor.
        assert.equal(g.publisher_preface.body_sha256, p.paratext_sha256);
        assert.deepEqual(g.publisher_preface.note_numbers, []);
      } else assert.ok(!g[key] || Array.isArray(g[key]) && g[key].length === 0);
    }
    validateLink(p, uid, u, book);
    assert.ok(Object.isFrozen(p) && Object.isFrozen(p.stanza_layout));
  }
  assert.equal(approval.expected_profile_ids.includes('tha-ap233'), false, 'Publisher231 remains outside this frozen historical cohort');
  for (const uid of ['tha-ap72', 'tha-ap142', 'tha-ap160', 'tha-ap161', 'tha-ap12', 'tha-ap262']) assert.equal(APADANA_PROFILES[uid], undefined);
  for (const row of rights) { assert.equal(row.license, 'CC BY-NC-SA 4.0'); assert.equal(row.english_bodies_notes_and_apparatus_live_only, true); assert.equal(row.no_audio_or_media_rights, true); assert.equal(row.normalized_wording_changes, false); }
});

test('source-enabled 221–230 intake verifies all10raw Gitblobs,78paragraphs,48entries,51labels and separate note owners', { skip: !checkout }, () => {
  let paragraphs = 0, entries = 0, labels = 0, poemNotes = 0, summaryNotes = 0, collectionNotes = 0;
  for (const input of inputs) for (const artifact of [...input.rights, input.publisher_routing]) {
    const raw = readFileSync(join(checkout, artifact.path));
    assert.equal(raw.length, artifact.bytes); assert.equal(digest(raw), artifact.raw_sha256); assert.equal(blob(raw), artifact.git_blob_sha1);
  }
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), peer = peerGolden(uid), raw = Buffer.from(source(p)), value = parseApadana(raw.toString(), p);
    assert.equal(peer.publisher_poem, p.poem); assert.equal(peer.source_path, g.path);
    for (const field of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(p[field], peer[field], uid + ' separate independent ' + field);
    assert.deepEqual(p.stanza_layout, peer.stanza_layout);
    assert.deepEqual(value.text.split('\n\n').map(digest), peer.body_paragraph_sha256s);
    assert.deepEqual(value.translator_notes.map(note => digest(note.text)), peer.note_text_sha256s);
    assert.equal(digest(quotationText({ ...value, translation_id: tid(p) })), peer.quotation_text_sha256);
    assert.equal(digest(value.publisher_paratext), peer.preface.body_sha256);
    assert.deepEqual(peer.preface.note_numbers, []);
    assert.equal(raw.length, g.bytes); assert.equal(digest(raw), g.raw_sha256); assert.equal(blob(raw), g.git_blob_sha1);
    assert.equal(digest(value.text), g.body_sha256); assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    const body = value.text.split('\n\n'); assert.equal(body.length, g.body_paragraphs.length); paragraphs += body.length;
    for (const row of g.body_paragraphs) {
      assert.equal(digest(body[row.paragraph]), row.sha256); assert.equal(body[row.paragraph].split('\n').length, row.lines);
    }
    assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers); poemNotes += value.translator_notes.length;
    for (const note of g.notes.filter(row => row.owner === 'poem')) assert.equal(digest(value.translator_notes.find(row => row.number === note.number).text), note.body_sha256);
    entries += p.stanza_layout.length;
    for (const stanza of p.stanza_layout) {
      const bounds = stanza.local_label.split('-').map(Number);
      assert.ok(bounds.length <= 2 && bounds.every(Number.isInteger));
      labels += bounds.length === 2 ? bounds[1] - bounds[0] + 1 : 1;
    }
    summaryNotes += value.chapter_summary?.translator_notes.length || 0;
    collectionNotes += value.collection_summary?.translator_notes.length || 0;
    assertScopes(value, p, true);
  }
  assert.deepEqual({ paragraphs, entries, labels, poemNotes, summaryNotes, collectionNotes },
    { paragraphs: 78, entries: 48, labels: 51, poemNotes: 41, summaryNotes: 0, collectionNotes: 0 });
  for (const uid of ['tha-ap232']) assert.deepEqual(parseApadana(source(APADANA_PROFILES[uid]), APADANA_PROFILES[uid]).chapter_summary.translator_notes, []);
});

test('source-enabled finite combined entries, note-only pairs and original two-paragraph summary remain exact', { skip: !checkout }, () => {
  const combinations = {
    'tha-ap224': [['2-3', 8]],
    'tha-ap228': [['1-2', 8]],
    'tha-ap229': [['1-2', 8]],
  };
  for (const [uid, expected] of Object.entries(combinations)) {
    const profile = APADANA_PROFILES[uid], parsed = parseApadana(source(profile), profile);
    assert.deepEqual(profile.stanza_layout.filter(row => row.lines === 8).map(row => [row.local_label, row.lines]), expected);
    const chunks = quotationText({ ...parsed, translation_id: tid(profile) }).split('\n\n');
    for (const [i, layout] of profile.stanza_layout.entries()) assert.equal(chunks[i].split('\n').length, layout.lines);
    assert.equal(chunks.length, profile.stanza_layout.length, uid + ' combined range is one physical quotation entry');
  }
  const paired = APADANA_PROFILES['tha-ap228'], raw = source(paired), record = golden(paired.id), parsed = parseApadana(raw, paired);
  const spans = [...raw.matchAll(/\[([^\[\]\n]+)\]\{\.diacritics data-state=on\}\[([^\[\]\n]+)\]\{\.no-diacritics data-state=off\}/g)];
  const expectedPairs = record.presentation_recipe.paired_markdown_display_inventory;
  assert.equal(spans.length, 2); assert.deepEqual(expectedPairs.map(row => row.owner), ['note1', 'note3']);
  for (const [i, span] of spans.entries()) {
    assert.equal(digest(span[0]), expectedPairs[i].raw_sha256);
    assert.equal(span[1], expectedPairs[i].diacritic); assert.equal(span[2], expectedPairs[i].alternate);
    assert.equal(digest(span[1]), expectedPairs[i].rendered_sha256);
    const note = parsed.translator_notes.find(row => row.number === Number(expectedPairs[i].owner.slice(4)));
    assert.equal(digest(note.text), record.notes.find(row => row.number === note.number).body_sha256);
    assert.ok(!note.text.includes('.diacritics') && !note.text.includes('.no-diacritics'));
  }
  const summaryProfile = APADANA_PROFILES['tha-ap232'], summaryRaw = source(summaryProfile), summaryRecord = golden(summaryProfile.id);
  const summary = parseApadana(summaryRaw, summaryProfile).chapter_summary;
  assert.equal(summary.text.split('\n\n').length, 2);
  for (const row of summaryRecord.chapter_summary.paragraphs) {
    const paragraph = summary.text.split('\n\n')[row.paragraph];
    assert.equal(digest(paragraph), row.sha256); assert.equal(paragraph.split('\n').length, row.lines);
  }
  assert.equal(summaryRecord.chapter_summary.paragraphs[0].lines, 7);
  assert.equal(summaryRecord.chapter_summary.publisher_stated_total, 55);
  assert.equal(summaryRecord.chapter_summary.printed_local_label_occurrences, 51);
  assert.equal(summaryRecord.chapter_summary.physical_publisher_entries, 48);
  assert.deepEqual(summary.translator_notes, []);
  const mutations = [
    [paired, raw, raw.replace('.diacritics data-state=on', '.diacritics data-state=off')],
    [paired, raw, raw.replace('.no-diacritics data-state=off', '.foreign data-state=off')],
    [paired, raw, raw.replace(spans[0][0], spans[0][1])],
    [paired, raw, raw.replace(spans[1][0], spans[1][2])],
    [summaryProfile, summaryRaw, summaryRaw.replace(/^The Summary:  $/m, 'The Summary:')],
    [summaryProfile, summaryRaw, summaryRaw.replace(/^The Summary:  \n/m, 'The Summary:\n\n')],
  ];
  for (const [profile, original, changed] of mutations) {
    assert.notEqual(changed, original, profile.id + ' finite source-shape control must mutate bytes');
    assert.throws(() => parseApadana(changed, profile), /differs/);
    assert.throws(() => parseTheraApadana(changed, { ...profile, raw_sha256: digest(changed) }), /differs/, 'Forged raw metadata cannot authorize a new source shape');
  }
});

test('all266 reviewed source links bind optional citation and joined-colophon fields by presence as well as value', () => {
  const data = canon.load();
  for (const p of Object.values(APADANA_PROFILES)) {
    const u = data.byId.get(p.id), book = data.canon.books[u.book];
    for (const key of ['exact_ref_url', 'colophons_share_physical_paragraph']) {
      const changed = { ...p };
      if (Object.hasOwn(p, key)) delete changed[key];
      else changed[key] = undefined;
      assert.throws(() => validateLink(changed, p.id, u, book), /differs/, `${p.id} ${key} presence`);
      const replacement = key === 'exact_ref_url' ? 'https://example.invalid/foreign' : !p[key];
      assert.throws(() => validateLink({ ...p, [key]: replacement }, p.id, u, book), /differs/, `${p.id} ${key} value`);
    }
  }
});

test('source-enabled finite labels and physical paragraphs remain intact while quotations exclude every apparatus owner', { skip: !checkout }, () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], value = parseApadana(source(p), p), body = value.text.split('\n\n');
    const quote = quotationText({ ...value, translation_id: tid(p), translation_revision: APADANA_COMMIT });
    const chunks = quote.split('\n\n'); assert.equal(chunks.length, p.stanza_layout.length);
    for (const [i, layout] of p.stanza_layout.entries()) {
      assert.equal(chunks[i].split('\n').length, layout.lines);
      const labels = layout.entries || [layout];
      for (const entry of labels) assert.ok(!chunks[i].includes(entry.suffix), `${uid} excludes exact label ${entry.suffix}`);
    }
    for (const excluded of [body[0], body.at(-2), body.at(-1), value.publisher_paratext, value.chapter_summary?.text, value.collection_summary?.text].filter(Boolean)) assert.ok(!quote.includes(excluded));
    for (const note of value.translator_notes) assert.ok(!quote.includes(note.text), `${uid} note wording excluded`);
    const expectedQuote = p.stanza_layout.map((layout, index) => body[index + 1].replace(/\[Note \d+\]/g, '').trim().slice(0, -layout.suffix.length).trim()).join('\n\n');
    assert.equal(quote, expectedQuote, `${uid} only source stanza wording is quotation evidence`);
    for (const patch of [{ text: value.text + ' changed' }, { translation_scope: {} }, { whole_unit_coverage: false }, { translation_id: 'ap:chapter-3/poem-158' }]) {
      assert.throws(() => quotationText({ ...value, translation_id: tid(p), ...patch }), /differs/);
    }
  }

});

test('source-enabled unreviewed wording, profile fields, layout shapes and held transport refuse', { skip: !checkout }, async () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], raw = source(p);
    for (const changed of [raw + '\n', raw.replace('category: chapter-3', 'category: chapter-4'), raw.replace(/^order: \d+$/m, 'order: 158')]) assert.throws(() => parseApadana(changed, p), /differs/);
    for (const patch of [{ id: 'tha-ap160' }, { poem: 158 }, { path: '/text/chapter-3/poem-234/' }, { raw_url: p.raw_url.replace(APADANA_COMMIT, '0'.repeat(40)) }, { translation_revision: '0'.repeat(40) }, { root_sha256: '0'.repeat(64) }, { body_sha256: '0'.repeat(64) }, { notes_sha256: '0'.repeat(64) }, { paratext_sha256: '0'.repeat(64) }, { stanza_layout: [] }, { note_numbers: [999] }, { raw_sha256: digest(raw + '\n') }, { publisher_preface: {} }, { chapter_summary: {} }, { publisher_divisions: [] }, { editorial_gap: {} }]) assert.throws(() => parseTheraApadana(raw, { ...p, ...patch }), /differs/);
  }
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Held source transport'); };
  for (const poem of ['010', '070', '140', '158', '159', '260', '570']) {
    const url = `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;
    assert.equal(isApadanaRawUrl(url), false); await assert.rejects(fetchPublic(url, { json: false }), /outside the supported public sources/);
  }
  assert.equal(calls, 0);
});

test('source-enabled all10API pages retain rights, scopes, exact continuation and refuse stale cached metadata', { skip: !checkout }, async () => {
  const calls = []; pinnedFetch(calls); const data = canon.load();
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], u = data.byId.get(uid), choice = english.available(u).find(row => row.translation_id === tid(p));
    assert.ok(choice); assertScopes(choice, p, false); validateApadanaChoice(choice, uid);
    const context = { uid, choices: english.available(u), accepted: null };
    let args = { limit: 500, translation_revision: APADANA_COMMIT }, body = '', first;
    while (args) {
      const value = await english.translation(u, tid(p), args); first ??= value; body += value.text;
      assert.equal(value.license, 'CC BY-NC-SA 4.0'); assert.match(value.attribution, /Jonathan S\. Walters and Whitman College/);
      assert.deepEqual(value.mapping_notes, p.mapping_notes); for (const note of p.mapping_notes) assert.ok(value.notes.includes(note));
      assertScopes(value, p, true); validateApadanaChoice(value, uid, true);
      assert.deepEqual(validateEnglishPage(value, { uid, translation: tid(p), ...args }, context), value.continue_with?.arguments || null);
      const changedNotes = value.translator_notes.map(note => ({ ...note, text: note.text + ' changed' }));
      for (const patch of [{ mapping_notes: [] }, { notes: [] }, { translator_notes: [] }, { translator_notes: changedNotes }, { translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes)) }, { chapter_summary: p.chapter_summary ? null : {} }, { editorial_gap: {} }, { publisher_divisions: [] }]) assert.throws(() => validateEnglishPage({ ...value, ...patch }, { uid, translation: tid(p), ...args }, context), `${uid} ${Object.keys(patch)}`);
      args = value.continue_with?.arguments;
    }
    assert.equal(digest(body), p.body_sha256);
    for (const options of [{ offset: 500 }, { translation_revision: '0'.repeat(40) }, { allow_partial: true }, { allow_shared: true }]) await assert.rejects(english.translation(u, tid(p), options));
    if (first.continue_with) await assert.rejects(english.translation(u, tid(p), { ...first.continue_with.arguments, prefix_sha256: '0'.repeat(64) }), /prefix changed/);
    const widget = await readPassage({ uid, translation: tid(p), englishCharacters: 500 });
    assert.ok(!widget.english_error, widget.english_error); assertScopes(widget.english, p, true);
    const start = u.start, beforeRootMutation = calls.length;
    try {
      u.start += 1;
      await assert.rejects(english.translation(u, tid(p), { translation_revision: APADANA_COMMIT }));
      assert.equal(calls.length, beforeRootMutation, 'A changed canonical source span refuses before transport');
    } finally { u.start = start; }
    const link = data.translations[uid].find(row => canon.translationId(row) === tid(p)), original = structuredClone(link);
    for (const patch of [{ license: 'CC0' }, { path: '/text/chapter-3/poem-234/' }, { raw_url: p.raw_url.replace(APADANA_COMMIT, '0'.repeat(40)) }, { translation_revision: '0'.repeat(40) }, { raw_sha256: '0'.repeat(64) }, { body_sha256: '0'.repeat(64) }, { notes_sha256: '0'.repeat(64) }, { paratext_sha256: '0'.repeat(64) }, { root_sha256: '0'.repeat(64) }, { stanza_layout: [] }, { note_numbers: [999] }, { chapter_summary: null }, { index_revision: 'unreviewed' }, { publisher_preface: {} }, { exact_ref_url: 'https://example.invalid/foreign' }, { colophons_share_physical_paragraph: !p.colophons_share_physical_paragraph }]) {
      Object.assign(link, patch); const before = calls.length;
      try { await assert.rejects(english.translation(u, tid(p), { translation_revision: APADANA_COMMIT })); assert.equal(calls.length, before, 'Warmed source metadata refuses before another fetch'); }
      finally { for (const key of Object.keys(link)) delete link[key]; Object.assign(link, structuredClone(original)); }
    }
  }
});
