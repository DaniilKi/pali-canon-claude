/** Historical SOURCE INPUTS only: never canonical/runtime response projection. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {relative,sep} from 'node:path';
const sourceRoot=fileURLToPath(new URL('../../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const count=(value,part)=>value.split(part).length-1;
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const EXPECTED_SHA='8f6e361cda6aceaffd775b061b8e84505efb56ede3ed56fd60cdad146ecd5156';
const FROZEN440_COMMIT='4408f24bddee66ef7b4bcf1e532ba70d46f57a3d';
const EXPECTED_PATHS=Object.freeze([".github/workflows/check.yml","scripts/canon/build_canon.py","scripts/export-index.mjs","scripts/installed-corpus.mjs","scripts/web-reader-thera-held234-check.py","scripts/web-reader-thera-pair-intake-check.py","scripts/web-reader-thera-remaining-check.py","scripts/web-reader-thera141-180-check.py","scripts/web-reader-thera181-220-check.py","scripts/web-reader-thera221-230-check.py","scripts/web-reader-thera241-250-check.py","scripts/web_reader_approved_acceptance.py","src/analyse.mjs","src/canon.mjs","src/chatgpt-widget.mjs","src/citations.mjs","src/locator-policy.mjs","src/server.mjs","tests/an-numbered-sections.test.mjs","tests/an-ten-selections.test.mjs","tests/an247-cross-questioning-partial.test.mjs","tests/an859-prose-partial.test.mjs","tests/apadana-disclosures.test.mjs","tests/apadana-fourth-boundaries.test.mjs","tests/apadana-fourth-client.test.mjs","tests/apadana-fourth.test.mjs","tests/apadana-held234.test.mjs","tests/apadana-next-boundaries.test.mjs","tests/apadana-next.test.mjs","tests/apadana-pair-boundary.test.mjs","tests/apadana-thera-boundaries.test.mjs","tests/apadana-thera-pair-boundaries.test.mjs","tests/apadana-thera-pair-intake.test.mjs","tests/apadana-thera.test.mjs","tests/apadana-thera141-180.test.mjs","tests/apadana-thera181-220.test.mjs","tests/apadana-thera221-230.test.mjs","tests/apadana-thera241-250.test.mjs","tests/apadana-third-boundaries.test.mjs","tests/apadana-third.test.mjs","tests/approved_acceptance.py","tests/approved_current333_authority_negatives.py","tests/approved_current339_authority_negatives.py","tests/current339-source-inverses.test.mjs","tests/dt-scope-and-potaliya.test.mjs","tests/final-excerpt-binding-review.test.mjs","tests/held234-client.test.mjs","tests/helpers/current339-source-inverse.mjs","tests/helpers/publisher339-ci-baseline.mjs","tests/helpers/source-note-baseline.mjs","tests/helpers/thera-remaining-client.mjs","tests/helpers/thera-remaining-source.mjs","tests/helpers/thera339-legacy-projection.mjs","tests/milinda-medicine-partial.test.mjs","tests/priority-prose-review.test.mjs","tests/source-notes-baseline-projection.test.mjs","tests/source-notes-ci.test.mjs","tests/source-notes-compatibility.test.mjs","tests/thera-commentary-locators.test.mjs","tests/thera141-180-client.test.mjs","tests/thera181-220-client.test.mjs","tests/thera221-230-client.test.mjs","tests/thera241-250-client.test.mjs","tests/thera261-280-source.test.mjs","tests/thera281-285-source.test.mjs","tests/thera287-288-source.test.mjs","tests/thera292-299-source.test.mjs","tests/thera301-310-source.test.mjs","tests/thera312-319-client.test.mjs","tests/thera312-319-source.test.mjs","tests/thera321-329-client.test.mjs","tests/thera321-329-source.test.mjs","tests/thera339-legacy-projection.test.mjs","tests/web-reader-ci-artifacts.test.mjs","tests/widget-hosted-selections.test.mjs","web/bookmark-location.mjs","web/canonical-search.mjs","web/passage-notes.mjs","web/quote-check.mjs","web/reader.js","web/reading-position.mjs","web/tool-result.mjs"]);
const raw=readFileSync(new URL('../../docs/evidence/apadana/BOUNDARY333_336_SOURCE_INVERSES.json',import.meta.url));
export function decodeBoundarySourceInverses(bytes){
 assert.equal(sha(bytes),EXPECTED_SHA,'Mandatory separately reviewed440→boundary source-input authority');
 const map=JSON.parse(bytes);
 assert.equal(map.schema,'finite-boundary333-336-source-inverses-v1');assert.equal(map.base_commit,FROZEN440_COMMIT);
 assert.equal(map.source_inputs_only,true);assert.equal(map.runtime_or_corpus_projection,false);
 assert.deepEqual(Object.keys(map.files),EXPECTED_PATHS,'Only the independently reviewed exact ordered source paths');
 for(const[path,row]of Object.entries(map.files)){
  assert.match(path,/^(?:src|web|tests|scripts|\.github\/workflows)\/[a-zA-Z0-9_./-]+$/);assert.ok(!path.split('/').includes('..'));
  assert.deepEqual(Object.keys(row),['frozen440_sha256','current_sha256','hunks']);
  assert.match(row.frozen440_sha256,/^[a-f0-9]{64}$/);assert.match(row.current_sha256,/^[a-f0-9]{64}$/);
  assert.notEqual(row.frozen440_sha256,row.current_sha256,'No undeclared unchanged file in currentdelta');
  assert.ok(Array.isArray(row.hunks)&&row.hunks.length>0);
  for(const hunk of row.hunks){assert.deepEqual(Object.keys(hunk),['before','after']);assert.equal(typeof hunk.before,'string');assert.equal(typeof hunk.after,'string');assert.ok(hunk.before.length&&hunk.after.length);assert.notEqual(hunk.before,hunk.after);}
 }
 return freeze(map);
}
export const boundarySourceInverses=decodeBoundarySourceInverses(raw);
export const boundarySourceProofBytes=()=>Buffer.from(raw);
/** Exact prior440 is admitted for historical tests; strictcurrent forbids that path. */
export function projectFrozen440Source(path,source,{requireCurrent=false}={}){
 const row=boundarySourceInverses.files[path];if(!row){assert.equal(requireCurrent,false,'Strictcurrent requires a declared changed source');return source;}
 assert.equal(typeof source,'string');const actual=sha(source);
 if(!requireCurrent&&actual===row.frozen440_sha256)return source;
 assert.equal(actual,row.current_sha256,'Only exact reviewed current source or explicit historical440 may enter: '+path);
 let old=source;
 for(const hunk of row.hunks){assert.equal(count(old,hunk.after),1,'Each exact current source hunk occurs once: '+path);old=old.replace(hunk.after,hunk.before);}
 assert.equal(sha(old),row.frozen440_sha256,'Full frozen440 source/assertion bytes restored: '+path);return old;
}
export function frozen440FileReader(reader){
 assert.equal(typeof reader,'function');return (path,...options)=>{
  const raw=reader(path,...options);
  const key=typeof path==='string'?path:path instanceof URL&&path.protocol==='file:'?relative(sourceRoot,fileURLToPath(path)).split(sep).join('/'):null;
  if(!key||!Object.hasOwn(boundarySourceInverses.files,key))return raw;
  assert.ok(options.length===0||options.length===1&&options[0]==='utf8','Only existing explicit source read modes');
  const old=projectFrozen440Source(key,raw.toString('utf8'));return typeof raw==='string'?old:Buffer.from(old,'utf8');
 };
}

/** Preserve deliberately changed HISTORICAL inputs for the original strict guard.
 * This is not validation: only the exact new source can normalize here; the
 * caller's immutable old hash assertion must still decide every other input.
 */
export function normalizeFrozen440SourceInput(path,source){
 const row=boundarySourceInverses.files[path];
 return row&&typeof source==='string'&&sha(source)===row.current_sha256?projectFrozen440Source(path,source,{requireCurrent:true}):source;
}
