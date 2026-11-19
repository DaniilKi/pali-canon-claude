import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {milindaSourceUnit,isMilindaPageId,translatorNotes} from '../web/milinda-sources.mjs';
import {comparisonChoices,validateComparisonPage} from '../web/translation-comparison.mjs';
import {validateEnglishPage} from '../web/translation-policy.mjs';
const rows=JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json','utf8')).links.filter(row=>row.unit_id.startsWith('mil'));
const id=row=>'ati:'+row.path+'#'+row.anchor;
const choice=row=>({translation_id:id(row),translator:row.translator,whole_unit_coverage:true,source_section:row.section});
const page=row=>({translation_id:id(row),translator:row.translator,text_id:row.unit_id,source_section:row.section,text:'Synthetic policy fixture only.',attribution:'Synthetic attribution.',license:'Synthetic licence.',offset:0,limit:500,prefix_sha256:'a'.repeat(64),next_offset:null,translator_notes:Array.from({length:row.section.note_count},(_,i)=>({number:i+1,text:'Synthetic policy note '+(i+1)+'.'}))});

test('all fourteen reviewed question identities remain finite and tied to their exact units',()=>{
 assert.equal(rows.length,14);
 for(const row of rows){
  assert.equal(milindaSourceUnit(id(row)),row.unit_id);
  assert.equal(isMilindaPageId('ati:'+row.path),true);
  assert.deepEqual(comparisonChoices([choice(row)],row.unit_id),[choice(row)]);
  assert.equal(validateEnglishPage(page(row),{uid:row.unit_id,translation:id(row)},{uid:row.unit_id,choices:[choice(row)]}),null);
  assert.equal(validateComparisonPage(page(row),{uid:row.unit_id,translation:id(row),limit:500},{uid:row.unit_id,choices:[choice(row)]}),null);
  assert.throws(()=>comparisonChoices([choice(row)],'mil3.9.99'));
  assert.throws(()=>validateEnglishPage({...page(row),text_id:'mil3.9.99'},{uid:'mil3.9.99',translation:id(row)},{uid:'mil3.9.99',choices:[choice(row)]}));
 }
});

test('source fragments cannot broaden ordinary ATI, DT or ABT IDs or select an unreviewed Milinda anchor',()=>{
 const row=rows[0],base=choice(row);
 for(const translation_id of ['ati:'+row.path,'ati:'+row.path+'#unknown','ati:'+row.path+'.html#'+row.anchor,'ati:'+row.path+'#'+row.anchor+'#more','ati:'+row.path+'#'+row.anchor+'?query=1','ati:'+row.path+'%23'+row.anchor,'ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-8','ati:/tipitaka/mn/mn.001.than#miln-2-1-08','dt:MN/MN10#miln-2-1-08','aj:Texts/Source#miln-2-1-08'])assert.throws(()=>comparisonChoices([{...base,translation_id}],row.unit_id));
 assert.equal(milindaSourceUnit('ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-08'),'mil3.3.8','The actual Contact body anchor remains distinct from the faulty publisher ToC');
});

test('owned translator notes preserve their source numbering, Unicode and text without caller mutations',()=>{
 const data={translation_id:'dt:SYNTHETIC/NOTES',translator_notes:[{number:1,text:'Synthetic note ā <script>fixture</script>\nline'},{number:2,text:'Synthetic second note.'}]},before=structuredClone(data);
 const notes=translatorNotes(data);assert.deepEqual(notes,data.translator_notes);notes[0].text='Changed local copy';assert.deepEqual(data,before);
 assert.deepEqual(translatorNotes({translation_id:'dt:MN/MN10'}),[]);
 assert.deepEqual(translatorNotes({translation_id:id(rows[0]),source_section:rows[0].section,translator_notes:[]}),[]);
});

test('missing or malformed note declarations refuse before English wording can be displayed',()=>{
 const row=rows[0],args={uid:row.unit_id,translation:id(row)},context={uid:row.unit_id,choices:[choice(row)]};
 const missing=page(row);delete missing.translator_notes;assert.throws(()=>validateEnglishPage(missing,args,context),/missing/);
 for(const translator_notes of [null,{},['not a note record'],[{number:2,text:'Wrong first number'}],[{number:1,text:''}],[{number:1,text:'text',url:'https://untrusted.invalid'}],[{number:1,text:'one'},{number:1,text:'duplicate'}],[{number:1,text:'x'.repeat(50001)}],Array.from({length:33},(_,i)=>({number:i+1,text:'note'}))])assert.throws(()=>validateEnglishPage({...page(row),translator_notes},args,context),/translator-note/);
});

test('question response metadata cannot drift from its selected ordinary source descriptor',()=>{
 const row=rows[0],args={uid:row.unit_id,translation:id(row)},context={uid:row.unit_id,choices:[choice(row)]};
 for(const source_section of [undefined,null,{...row.section,unit_id:rows[1].unit_id},{...row.section,anchor:rows[1].anchor},{...row.section,text_sha256:'0'.repeat(64)},{...row.section,notes_sha256:'0'.repeat(64)},{...row.section,status:'unreviewed'}])assert.throws(()=>validateEnglishPage({...page(row),source_section},args,context),/question identity|descriptor/);
});

test('finite question profiles refuse missing, extra or falsely declared owned-note counts',()=>{
 for(const row of rows){
  const args={uid:row.unit_id,translation:id(row)},context={uid:row.unit_id,choices:[choice(row)]};
  const expected=row.section.note_count;
  for(const count of [0,1,2,3].filter(count=>count!==expected)){
   const translator_notes=Array.from({length:count},(_,i)=>({number:i+1,text:'Synthetic note '+(i+1)}));
   assert.throws(()=>validateEnglishPage({...page(row),translator_notes},args,context),/translator-note count/);
   const section={...row.section,note_count:count},alteredChoice={...choice(row),source_section:section};
   assert.throws(()=>comparisonChoices([alteredChoice],row.unit_id),/descriptor|count/);
   assert.throws(()=>validateEnglishPage({...page(row),source_section:section,translator_notes},args,{...context,choices:[alteredChoice]}),/descriptor|count/);
  }
 }
 assert.equal(rows.find(r=>r.unit_id==='mil3.5.6').section.note_count,1);
 assert.equal(rows.find(r=>r.unit_id==='mil3.5.5').section.note_count,2);
});
