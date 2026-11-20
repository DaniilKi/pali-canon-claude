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

export const CURRENT_APADANA_IDS=Object.freeze([...current.expected_profile_ids]);
export const CURRENT_APADANA_RECORDS=Object.freeze(records.map(row=>Object.freeze({...row})));
export const CURRENT_THERA_IDS=Object.freeze(records.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));
export const BASELINE_APADANA_IDS=Object.freeze([...historical.baseline_ids]);
/** Select only immutable pre-D250 records, using their reviewed publisher metadata. */
export function historicalApadanaIds(lastTheraPoem=60){
  return historical.baseline_records.filter(row=>row.publisher_chapter==='chapter-4'||row.poem<=lastTheraPoem).map(row=>row.id);
}

export const CURRENT_APADANA_URLS=Object.freeze(records.map(row=>`https://apadanatranslation.com/text/${row.publisher_chapter}/poem-${String(row.poem).padStart(3,'0')}/`));
