import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildIndex,toCsv,licenseName,LICENSE_LABELS} from '../scripts/export-index.mjs';

test('Milinda citation exports retain fourteen distinct question addresses and the correct non-CC rights',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../server/data/reviewed-ati-sections.json',import.meta.url),'utf8'));
 const index=buildIndex();
 assert.equal(manifest.links.length,45);
 const rows=manifest.links.filter(row=>row.unit_id.startsWith('mil'));assert.equal(rows.length,14);
 const seen=new Set();
 for(const row of rows){
  const record=index.texts.find(x=>x.id===row.unit_id);
  assert.ok(record,row.unit_id);assert.equal(record.english_count,1);assert.equal(record.partial_english_count,0);assert.equal(record.shared_english_count,0);
  const [choice]=record.english;
  assert.equal(choice.translation_id,`ati:${row.path}#${row.anchor}`);
  assert.equal(new URL(choice.url).hash,`#${row.anchor}`);
  assert.equal(choice.translator,'John Kelly');assert.equal(choice.license,'Kelly-free-distribution-2005');
  assert.equal(choice.license_name,licenseName(choice.license));assert.match(choice.license_name,/John Kelly.*not Creative Commons/);
  assert.match(choice.mapping_note,/substantive question/);
  assert.deepEqual(choice.source_section,row.section);assert.equal(choice.whole_unit_coverage,true);
  assert.equal(choice.translation_scope,undefined);assert.equal(choice.text,undefined);assert.equal(choice.translator_notes,undefined);
  seen.add(choice.translation_id);
 }
 assert.equal(seen.size,14);
 const rights=LICENSE_LABELS['Kelly-free-distribution-2005'];assert.equal(rights.url,null);assert.match(rights.terms,/free of charge.*any medium.*complete licence/);
 const csv=toCsv(index);
 for(const id of seen)assert.ok(csv.includes(id));
});
