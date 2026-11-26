import {canonBeforeSix,c1LogicalInput} from './canon-before-six.mjs';
// TEST-ONLY historical inverse. Never import from src/, web/ or server bundles.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const OLD_CANON_SHA = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32';
export const NEW_CANON_SHA = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8';
const source = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const oldUnits = {"tha-ap333":{"id":"tha-ap333","book":36,"start":9767,"end":9793,"title":"Gandhadhūpiyattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 333","vri":"1–7","pts":{"volume":1,"page":267,"end_page":267}},"tha-ap334":{"id":"tha-ap334","book":36,"start":9793,"end":9816,"title":"Udakapūjakattheraapadāna","collection":"ap","acronym":"Tha Ap 334","vri":"8–14","pts":{"volume":1,"page":267,"end_page":267}},"tha-ap335":{"id":"tha-ap335","book":36,"start":9816,"end":9833,"title":"Punnāgapupphiyattheraapadāna","collection":"ap","acronym":"Tha Ap 335","vri":"15–19","pts":{"volume":1,"page":267,"end_page":267}},"tha-ap336":{"id":"tha-ap336","book":36,"start":9833,"end":9890,"title":"Ekadussadāyakattheraapadāna","collection":"ap","acronym":"Tha Ap 336","vri":"20–37","pts":{"volume":1,"page":267,"end_page":267}}};
const newUnits = {"tha-ap333":{"id":"tha-ap333","book":36,"start":9767,"end":9789,"title":"Gandhadhūpiyattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 333","vri":"1–6","pts":{"volume":1,"page":267,"end_page":267},"index_revision":"apadana-thera333-336-v1"},"tha-ap334":{"id":"tha-ap334","book":36,"start":9789,"end":9812,"title":"Udakapūjakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 334","vri":"7–13","pts":{"volume":1,"page":267,"end_page":267},"index_revision":"apadana-thera333-336-v1"},"tha-ap335":{"id":"tha-ap335","book":36,"start":9812,"end":9829,"title":"Punnāgapupphiyattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 335","vri":"14–18","pts":{"volume":1,"page":267,"end_page":267},"index_revision":"apadana-thera333-336-v1"},"tha-ap336":{"id":"tha-ap336","book":36,"start":9829,"end":9890,"title":"Ekadussadāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 336","vri":"19–37","pts":{"volume":1,"page":267,"end_page":267},"index_revision":"apadana-thera333-336-v1"}};
const digest = raw => createHash('sha256').update(raw).digest('hex');
function state(canon) {
  assert.equal(canon.source?.commit, source);
  const selected = {};
  for (const id of Object.keys(oldUnits)) {
    const rows = canon.units.filter(unit => unit.id === id);
    assert.equal(rows.length, 1, 'Missing or duplicate reviewed four-poem unit');
    selected[id] = rows[0];
  }
  const equals = expected => { try { assert.deepEqual(selected, expected); return true; } catch { return false; } };
  assert.ok(equals(oldUnits) || equals(newUnits), 'Mixed or unreviewed four-poem metadata');
  return equals(newUnits) ? 'new' : 'old';
}
function historicalC1CanonBeforeFour(canon) {
  state(canon);
  return {...canon, units: canon.units.map(unit => Object.hasOwn(oldUnits,unit.id) ? structuredClone(oldUnits[unit.id]) : unit)};
}
function historicalC1ExactHistoricalCanonBytes(raw) {
  assert.equal(digest(raw), NEW_CANON_SHA, 'Exact complete current canonical snapshot required');
  const canon = JSON.parse(raw);
  assert.equal(state(canon), 'new');
  const historical = Buffer.from(JSON.stringify(canonBeforeFour(canon)), 'utf8');
  assert.equal(digest(historical), OLD_CANON_SHA);
  return historical;
}

export function canonBeforeFour(canon){return historicalC1CanonBeforeFour(canonBeforeSix(canon));}
export function exactHistoricalCanonBytes(raw){return historicalC1ExactHistoricalCanonBytes(c1LogicalInput(raw));}
