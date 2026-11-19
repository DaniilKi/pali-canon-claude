/** Independent curatorial expectations; never derive this whitelist from runtime data. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const intake=JSON.parse(readFileSync(new URL('../../docs/evidence/apadana/THERA_SCALED_APPROVAL.json',import.meta.url),'utf8'));
assert.equal(intake.schema,'reviewed-apadana-intake-v1');
assert.equal(intake.status,'approved');
assert.equal(intake.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
assert.deepEqual(intake.expected_profile_ids,[...intake.baseline_ids,...intake.approved_ids]);
assert.equal(new Set(intake.expected_profile_ids).size,intake.expected_profile_ids.length);
const records=[...intake.baseline_records,...intake.approved_records];
assert.deepEqual(records.map(row=>row.id),intake.expected_profile_ids);
assert.ok(records.every(row=>/^(?:thi|tha)-ap\d+$/.test(row.id)&&Number.isInteger(row.poem)&&row.poem>0&&['chapter-3','chapter-4'].includes(row.publisher_chapter)));

export const CURRENT_APADANA_IDS=Object.freeze([...intake.expected_profile_ids]);
export const CURRENT_THERA_IDS=Object.freeze(records.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));
export const BASELINE_APADANA_IDS=Object.freeze([...intake.baseline_ids]);
/** Select only immutable pre-D250 records, using their reviewed publisher metadata. */
export function historicalApadanaIds(lastTheraPoem=60){
  return intake.baseline_records.filter(row=>row.publisher_chapter==='chapter-4'||row.poem<=lastTheraPoem).map(row=>row.id);
}

export const CURRENT_APADANA_URLS=Object.freeze(records.map(row=>`https://apadanatranslation.com/text/${row.publisher_chapter}/poem-${String(row.poem).padStart(3,'0')}/`));
