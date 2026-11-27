import {intake375Authority} from './intake375-metadata.mjs';
import {intake380Authority,INTAKE380_IDS} from './intake380-metadata.mjs';
import {intake368Authority,INTAKE368_IDS} from './intake368-metadata.mjs';
import {intake359Authority,INTAKE359_IDS,INTAKE359_PUBLISHERS} from './intake359-metadata.mjs';
import {publisher343Authority} from './intake343-metadata.mjs';
import {publisher339Authority,requireHistorical333Maps} from './thera339-legacy-projection.mjs';
/** Independent curatorial expectations; never derive this whitelist from runtime data. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {remainingEvidence} from './thera-remaining-evidence.mjs';
import {held234Evidence} from './thera-held234-evidence.mjs';
import {thera261280Evidence} from './thera261-280-evidence.mjs';
import {thera281285Evidence} from './thera281-285-evidence.mjs';
import {thera287288Evidence} from './thera287-288-evidence.mjs';
import {thera292299Evidence} from './thera292-299-evidence.mjs';
import {thera301310Evidence} from './thera301-310-evidence.mjs';
import {publisher333Authority,requireHistorical325Maps} from './thera333-legacy-projection.mjs';

const historical=JSON.parse(readFileSync(new URL('../../docs/evidence/apadana/THERA_SCALED_APPROVAL.json',import.meta.url),'utf8'));
const previousBytes=readFileSync(new URL('../../docs/evidence/apadana/THERA_241_250_APPROVAL.json',import.meta.url));
const previous=JSON.parse(previousBytes);
const intake=JSON.parse(readFileSync(new URL('../../docs/evidence/apadana/THERA_221_230_APPROVAL.json',import.meta.url),'utf8'));
assert.equal(previous.schema,'reviewed-apadana-intake-v1');
assert.equal(previous.status,'approved');
assert.equal(previous.expected_profile_ids.length,256);
assert.equal(createHash('sha256').update(previousBytes).digest('hex'),'4d11c069b21e87ba7b58ea9a55c6b39d0a1beef0c9cd9f824e7c3f6146736df2');
assert.equal(intake.previous_intake.file,'THERA_241_250_APPROVAL.json');
assert.equal(intake.previous_intake.sha256,createHash('sha256').update(previousBytes).digest('hex'));
assert.deepEqual(intake.baseline_ids,previous.expected_profile_ids);
assert.deepEqual(intake.baseline_records,[...previous.baseline_records,...previous.approved_records]);
assert.equal(intake.base_commit,'9ceed785d30afdcdc1f09021d6098b5bb85f02fb');
assert.equal(intake.approved_ids.length,10);
assert.equal(intake.schema,'reviewed-apadana-intake-v1');
assert.equal(intake.status,'approved');
assert.equal(intake.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
assert.deepEqual(intake.expected_profile_ids,[...intake.baseline_ids,...intake.approved_ids]);
assert.equal(new Set(intake.expected_profile_ids).size,intake.expected_profile_ids.length);
const latest=remainingEvidence('A').combined;
assert.equal(latest.previous_intake.file,'THERA_221_230_APPROVAL.json');
const intakeBytes=readFileSync(new URL('../../docs/evidence/apadana/THERA_221_230_APPROVAL.json',import.meta.url));
assert.equal(createHash('sha256').update(intakeBytes).digest('hex'),'4ae2cd3fea1c64e323dfa41c15403c33215e90f8834c7ee0a4db708f77f68bed');
assert.equal(latest.previous_intake.sha256,createHash('sha256').update(intakeBytes).digest('hex'));
assert.deepEqual(latest.baseline_ids,intake.expected_profile_ids);
assert.deepEqual(latest.baseline_records,[...intake.baseline_records,...intake.approved_records]);
const held234=held234Evidence().approval;
assert.deepEqual(held234.baseline_ids,latest.expected_profile_ids);
assert.deepEqual(held234.baseline_records,[...latest.baseline_records,...latest.approved_records]);
const newIntake=thera261280Evidence(),historical303=newIntake.approval;
assert.deepEqual(newIntake.previous,held234,'The sealed285 intake remains the exact historical anchor');
assert.deepEqual(historical303.baseline_ids,held234.expected_profile_ids);
assert.deepEqual(historical303.baseline_records,[...held234.baseline_records,...held234.approved_records]);
const approvedPairs=[[263,261],[264,262],[265,263],[266,264],[267,265],[269,267],[270,268],[271,269],[272,270],[273,271],[274,272],[275,273],[276,274],[277,275],[278,276],[279,277],[280,278],[281,279]];
const approvedRecords=approvedPairs.map(([canonical,poem])=>({id:'tha-ap'+canonical,publisher_chapter:'chapter-3',poem}));
assert.deepEqual(historical303.approved_records,approvedRecords);
assert.deepEqual(historical303.approved_ids,approvedRecords.map(row=>row.id));
assert.ok(historical303.approved_ids.every(id=>!historical303.baseline_ids.includes(id)));
assert.deepEqual(historical303.expected_profile_ids,[...held234.expected_profile_ids,...historical303.approved_ids]);
assert.equal(historical303.baseline_ids.length,285);assert.equal(historical303.expected_profile_ids.length,303);
assert.equal(new Set(historical303.expected_profile_ids).size,303);
for(const id of ['tha-ap262','tha-ap268','tha-ap282']){assert.ok(historical303.held_ids.includes(id));assert.ok(!historical303.expected_profile_ids.includes(id));}
const historicalRecords=[...historical303.baseline_records,...historical303.approved_records];
assert.deepEqual(historicalRecords.map(row=>row.id),historical303.expected_profile_ids);

const five=thera281285Evidence(),historical308=five.approval;
assert.deepEqual(five.previous,historical303,'The sealed303 intake remains the exact historical anchor');
assert.deepEqual(historical308.baseline_ids,historical303.expected_profile_ids);
assert.deepEqual(historical308.baseline_records,historicalRecords);
const fivePairs=[[283,281],[284,282],[285,283],[286,284],[287,285]];
const fiveRecords=fivePairs.map(([canonical,poem])=>({id:'tha-ap'+canonical,publisher_chapter:'chapter-3',poem}));
assert.deepEqual(historical308.approved_records,fiveRecords);
assert.deepEqual(historical308.approved_ids,fiveRecords.map(row=>row.id));
assert.deepEqual(Object.keys(five.profiles),historical308.approved_ids);
assert.deepEqual(Object.keys(five.links),historical308.approved_ids);
assert.ok(historical308.approved_ids.every(id=>!historical308.baseline_ids.includes(id)));
assert.deepEqual(historical308.expected_profile_ids,[...historical303.expected_profile_ids,...historical308.approved_ids]);
assert.equal(historical308.baseline_ids.length,303);assert.equal(historical308.expected_profile_ids.length,308);
assert.equal(new Set(historical308.expected_profile_ids).size,308);
assert.deepEqual(historical308.held_ids,historical303.held_ids);
assert.deepEqual(Object.keys(five.baseline.profile_objects),historical303.expected_profile_ids);
assert.deepEqual(Object.keys(five.baseline.translation_objects),historical303.expected_profile_ids);
for(const id of historical303.baseline_ids){
  assert.deepEqual(five.baseline.profile_objects[id],newIntake.baseline.profile_objects[id]);
  assert.deepEqual(five.baseline.translation_objects[id],newIntake.baseline.translation_objects[id]);
}
for(const id of historical303.approved_ids){
  assert.deepEqual(five.baseline.profile_objects[id],newIntake.profiles[id]);
  assert.deepEqual(five.baseline.translation_objects[id],newIntake.links[id]);
}
for(const id of historical308.held_ids)assert.ok(!historical308.expected_profile_ids.includes(id));
const records308=[...historical308.baseline_records,...historical308.approved_records];
assert.deepEqual(records308.map(row=>row.id),historical308.expected_profile_ids);

const two=thera287288Evidence(),historical310=two.approval;
assert.deepEqual(two.previous,historical308,'The sealed308 intake remains the exact historical anchor');
assert.deepEqual(historical310.baseline_ids,historical308.expected_profile_ids);
assert.deepEqual(historical310.baseline_records,records308);
const twoRecords=[{id:'tha-ap289',publisher_chapter:'chapter-3',poem:287},{id:'tha-ap290',publisher_chapter:'chapter-3',poem:288}];
assert.deepEqual(historical310.approved_records,twoRecords);
assert.deepEqual(historical310.approved_ids,twoRecords.map(row=>row.id));
assert.deepEqual(Object.keys(two.profiles),historical310.approved_ids);
assert.deepEqual(Object.keys(two.links),historical310.approved_ids);
assert.ok(historical310.approved_ids.every(id=>!historical310.baseline_ids.includes(id)));
assert.deepEqual(historical310.expected_profile_ids,[...historical308.expected_profile_ids,...historical310.approved_ids]);
assert.equal(historical310.baseline_ids.length,308);assert.equal(historical310.expected_profile_ids.length,310);
assert.equal(new Set(historical310.expected_profile_ids).size,310);
assert.deepEqual(historical310.held_ids,historical308.held_ids);
assert.deepEqual(Object.keys(two.baseline.profile_objects),historical308.expected_profile_ids);
assert.deepEqual(Object.keys(two.baseline.translation_objects),historical308.expected_profile_ids);
for(const id of historical308.baseline_ids){
  assert.deepEqual(two.baseline.profile_objects[id],five.baseline.profile_objects[id]);
  assert.deepEqual(two.baseline.translation_objects[id],five.baseline.translation_objects[id]);
}
for(const id of historical308.approved_ids){
  assert.deepEqual(two.baseline.profile_objects[id],five.profiles[id]);
  assert.deepEqual(two.baseline.translation_objects[id],five.links[id]);
}
for(const id of historical310.held_ids)assert.ok(!historical310.expected_profile_ids.includes(id));
const records310=[...historical310.baseline_records,...historical310.approved_records];
assert.deepEqual(records310.map(row=>row.id),historical310.expected_profile_ids);

const seven=thera292299Evidence(),historical317=seven.approval;
assert.deepEqual(seven.previous,historical310,'The sealed310 intake remains the exact historical anchor');
assert.deepEqual(historical317.baseline_ids,historical310.expected_profile_ids);
assert.deepEqual(historical317.baseline_records,records310);
const sevenRecords=[{id:'tha-ap294',publisher_chapter:'chapter-3',poem:292},{id:'tha-ap295',publisher_chapter:'chapter-3',poem:293},{id:'tha-ap296',publisher_chapter:'chapter-3',poem:294},{id:'tha-ap297',publisher_chapter:'chapter-3',poem:295},{id:'tha-ap298',publisher_chapter:'chapter-3',poem:296},{id:'tha-ap300',publisher_chapter:'chapter-3',poem:298},{id:'tha-ap301',publisher_chapter:'chapter-3',poem:299}];
assert.deepEqual(historical317.approved_records,sevenRecords);
assert.deepEqual(historical317.approved_ids,sevenRecords.map(row=>row.id));
assert.deepEqual(Object.keys(seven.profiles),historical317.approved_ids);
assert.deepEqual(Object.keys(seven.links),historical317.approved_ids);
assert.ok(historical317.approved_ids.every(id=>!historical317.baseline_ids.includes(id)));
assert.deepEqual(historical317.expected_profile_ids,[...historical310.expected_profile_ids,...historical317.approved_ids]);
assert.equal(historical317.baseline_ids.length,310);assert.equal(historical317.expected_profile_ids.length,317);
assert.equal(new Set(historical317.expected_profile_ids).size,317);
assert.deepEqual(historical317.held_ids,historical310.held_ids);
assert.deepEqual(Object.keys(seven.baseline.profile_objects),historical310.expected_profile_ids);
assert.deepEqual(Object.keys(seven.baseline.translation_objects),historical310.expected_profile_ids);
for(const id of historical310.baseline_ids){
  assert.deepEqual(seven.baseline.profile_objects[id],two.baseline.profile_objects[id]);
  assert.deepEqual(seven.baseline.translation_objects[id],two.baseline.translation_objects[id]);
}
for(const id of historical310.approved_ids){
  assert.deepEqual(seven.baseline.profile_objects[id],two.profiles[id]);
  assert.deepEqual(seven.baseline.translation_objects[id],two.links[id]);
}
for(const id of historical317.held_ids)assert.ok(!historical317.expected_profile_ids.includes(id));
assert.ok(!historical317.expected_profile_ids.includes('tha-ap299'),'Publisher297 remains outside the approved seven');

const eight=thera301310Evidence(),current=eight.approval;
assert.deepEqual(eight.previous,historical317,'The sealed317 intake remains the exact historical anchor');
assert.deepEqual(current.baseline_ids,historical317.expected_profile_ids);
assert.deepEqual(current.baseline_records,[...historical317.baseline_records,...historical317.approved_records]);
const eightRecords=[{id:'tha-ap303',publisher_chapter:'chapter-3',poem:301},{id:'tha-ap304',publisher_chapter:'chapter-3',poem:302},{id:'tha-ap305',publisher_chapter:'chapter-3',poem:303},{id:'tha-ap306',publisher_chapter:'chapter-3',poem:304},{id:'tha-ap307',publisher_chapter:'chapter-3',poem:305},{id:'tha-ap310',publisher_chapter:'chapter-3',poem:308},{id:'tha-ap311',publisher_chapter:'chapter-3',poem:309},{id:'tha-ap312',publisher_chapter:'chapter-3',poem:310}];
assert.deepEqual(current.approved_records,eightRecords);
assert.deepEqual(current.approved_ids,eightRecords.map(row=>row.id));
assert.deepEqual(Object.keys(eight.profiles),current.approved_ids);
assert.deepEqual(Object.keys(eight.links),current.approved_ids);
assert.ok(current.approved_ids.every(id=>!current.baseline_ids.includes(id)));
assert.deepEqual(current.expected_profile_ids,[...historical317.expected_profile_ids,...current.approved_ids]);
assert.equal(current.baseline_ids.length,317);assert.equal(current.expected_profile_ids.length,325);
assert.equal(new Set(current.expected_profile_ids).size,325);
assert.deepEqual(current.held_ids,[...historical317.held_ids,'tha-ap308','tha-ap309']);
assert.deepEqual(Object.keys(eight.baseline.profile_objects),historical317.expected_profile_ids);
assert.deepEqual(Object.keys(eight.baseline.translation_objects),historical317.expected_profile_ids);
for(const id of historical317.baseline_ids){
  assert.deepEqual(eight.baseline.profile_objects[id],seven.baseline.profile_objects[id]);
  assert.deepEqual(eight.baseline.translation_objects[id],seven.baseline.translation_objects[id]);
}
for(const id of historical317.approved_ids){
  assert.deepEqual(eight.baseline.profile_objects[id],seven.profiles[id]);
  assert.deepEqual(eight.baseline.translation_objects[id],seven.links[id]);
}
for(const id of current.held_ids)assert.ok(!current.expected_profile_ids.includes(id));
assert.ok(!current.expected_profile_ids.includes('tha-ap299'),'Publisher297 remains outside the approved seven');
assert.ok(!current.expected_profile_ids.includes('tha-ap308')&&!current.expected_profile_ids.includes('tha-ap309'),'Publisher306/307 remain outside the approved eight');
const records=[...current.baseline_records,...current.approved_records];
assert.deepEqual(records.map(row=>row.id),current.expected_profile_ids);
assert.ok(records.every(row=>/^(?:thi|tha)-ap\d+$/.test(row.id)&&Number.isInteger(row.poem)&&row.poem>0&&['chapter-3','chapter-4'].includes(row.publisher_chapter)));

/* BEGIN finite publisher333 curatorial extension; historical325 assertions above stay intact. */
const latest333=publisher333Authority();
assert.deepEqual(latest333.approval.previous_intake,{file:'THERA_301_310_APPROVAL.json',sha256:'5b6ee312e81f422e464922a53354800f492c571ec98f837fa119ba01de6c7042'});
assert.deepEqual(latest333.approval.baseline_ids,current.expected_profile_ids);
assert.deepEqual(latest333.approval.baseline_records,records);
assert.deepEqual(latest333.approval.held_ids,current.held_ids);
requireHistorical325Maps({...eight.baseline.profile_objects,...eight.profiles},{...eight.baseline.translation_objects,...eight.links});
const records333=[...records,...latest333.newRecords];
assert.deepEqual(records333.map(row=>row.id),latest333.approval.expected_profile_ids);
assert.equal(records333.length,333);assert.equal(new Set(records333.map(row=>row.id)).size,333);
/* END finite publisher333 curatorial extension. */

/* BEGIN finite publisher339 extension; every prior333 assertion above stays intact. */
const latest339=publisher339Authority();
assert.deepEqual(latest339.approval.previous_intake,{file:'THERA_312_319_APPROVAL.json',sha256:'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'});
assert.deepEqual(latest339.approval.baseline_ids,latest333.approval.expected_profile_ids);
assert.deepEqual(latest339.approval.baseline_records,records333);
assert.deepEqual(latest339.approval.held_ids,latest333.approval.held_ids);
requireHistorical333Maps({...eight.baseline.profile_objects,...eight.profiles,...latest333.profiles},{...eight.baseline.translation_objects,...eight.links,...latest333.links});
const records339=[...records333,...latest339.newRecords];
assert.deepEqual(records339.map(row=>row.id),latest339.approval.expected_profile_ids);
assert.equal(records339.length,339);assert.equal(new Set(records339.map(row=>row.id)).size,339);
assert.equal(records339.filter(row=>row.publisher_chapter==='chapter-4').length,40);
assert.equal(records339.filter(row=>row.publisher_chapter==='chapter-3').length,299);
/* END finite publisher339 extension. */

/* BEGIN finite343 metadata extension; earlier339 assertion bodies stay exact. */
const latest343=publisher343Authority();
assert.deepEqual(latest343.approval.baseline_ids,latest339.approval.expected_profile_ids);
assert.deepEqual(latest343.approval.baseline_records,records339);
assert.deepEqual(latest343.approval.held_ids,latest339.approval.held_ids);
const records343=[...records339,...latest343.newRecords];
assert.deepEqual(records343.map(row=>row.id),latest343.approval.expected_profile_ids);
assert.equal(records343.length,343);assert.equal(new Set(records343.map(row=>row.id)).size,343);
assert.equal(records343.filter(row=>row.publisher_chapter==='chapter-4').length,40);
assert.equal(records343.filter(row=>row.publisher_chapter==='chapter-3').length,303);
/* END finite343 metadata extension. */

/* BEGIN finite359 extension; every prior343 assertion stays historical and exact. */
const latest359=intake359Authority();
assert.deepEqual(latest359.compact.ids,latest343.approval.expected_profile_ids);
assert.deepEqual(latest359.approval.baseline_ids,latest343.approval.expected_profile_ids);
assert.deepEqual(latest359.approval.approved_records,INTAKE359_IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:INTAKE359_PUBLISHERS[i]})));
const records359=[...records343,...latest359.approval.approved_records];
assert.deepEqual(records359.map(row=>row.id),latest359.approval.expected_profile_ids);
assert.deepEqual(records359.slice(0,343),records343);
assert.deepEqual(records359.slice(343).map(row=>row.id),INTAKE359_IDS);
assert.equal(records359.length,359);assert.equal(new Set(records359.map(row=>row.id)).size,359);
assert.equal(records359.filter(row=>row.publisher_chapter==='chapter-4').length,40);
assert.equal(records359.filter(row=>row.publisher_chapter==='chapter-3').length,319);
/* END finite359 extension. */

/* BEGIN finite368 extension; all named359 records and assertions above remain historical. */
const latest368=intake368Authority();
assert.deepEqual(latest368.compact.ids,latest359.approval.expected_profile_ids);
assert.deepEqual(latest368.approval.baseline_ids,latest359.approval.expected_profile_ids);
const records368=[...records359,...latest368.approval.approved_records];
assert.deepEqual(records368.map(row=>row.id),latest368.approval.expected_profile_ids);
assert.deepEqual(records368.slice(0,359),records359);
assert.deepEqual(records368.slice(359).map(row=>row.id),INTAKE368_IDS);
assert.equal(records368.length,368);assert.equal(new Set(records368.map(row=>row.id)).size,368);
assert.equal(records368.filter(row=>row.publisher_chapter==='chapter-4').length,40);
assert.equal(records368.filter(row=>row.publisher_chapter==='chapter-3').length,328);
assert.ok(!records368.some(row=>row.id==='tha-ap360'||row.publisher_chapter==='chapter-3'&&row.poem===358));
/* END finite368 extension. */

// Preserved pure375 source chain; current380 appends below without retargeting any historical assertion.
const current375=intake375Authority();
const current375Records=[...current375.selection.baseline_records,...current375.selection.approved_records];
assert.deepEqual(current375Records.map(row=>row.id),current375.ids);

/* Explicit380 addition: every prior375 chain assertion remains unchanged. */
assert.equal(current375Records.length,375);assert.equal(current375Records.filter(row=>row.publisher_chapter==='chapter-3').length,335);
const current380=intake380Authority();assert.deepEqual(current380.historical375,current375);
assert.deepEqual(current380.selection.baseline_records,current375Records);
const current380Records=[...current375Records,...current380.selection.approved_records];
assert.deepEqual(current380Records.map(row=>row.id),current380.ids);assert.deepEqual(current380Records.slice(0,375),current375Records);
assert.deepEqual(current380Records.slice(375).map(row=>row.id),INTAKE380_IDS);assert.equal(current380Records.length,380);assert.equal(new Set(current380Records.map(row=>row.id)).size,380);
assert.equal(current380Records.filter(row=>row.publisher_chapter==='chapter-4').length,40);assert.equal(current380Records.filter(row=>row.publisher_chapter==='chapter-3').length,340);

export const CURRENT_APADANA_IDS=Object.freeze([...current380.ids]);
export const CURRENT_APADANA_RECORDS=Object.freeze(current380Records.map(row=>Object.freeze({...row})));
export const CURRENT_THERA_IDS=Object.freeze(current380Records.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));
export const BASELINE_APADANA_IDS=Object.freeze([...historical.baseline_ids]);
/** Select only immutable pre-D250 records, using their reviewed publisher metadata. */
export function historicalApadanaIds(lastTheraPoem=60){
  return historical.baseline_records.filter(row=>row.publisher_chapter==='chapter-4'||row.poem<=lastTheraPoem).map(row=>row.id);
}

export const CURRENT_APADANA_URLS=Object.freeze(current380Records.map(row=>`https://apadanatranslation.com/text/${row.publisher_chapter}/poem-${String(row.poem).padStart(3,'0')}/`));
