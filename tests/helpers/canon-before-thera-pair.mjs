// Independently pinned inverse of the finite canonical 107/108 repair.
// Historical tests retain their old hashes; this is never a saved-data migration.
import assert from 'node:assert/strict';

export const THERA_PAIR_REVISION = 'apadana-thera105-106-v1';
export const PRE_THERA_PAIR_SHA256 = '49701605d61352898b3970143192e12b3509dbda966cfb42511e2af0e5f790a1';
const source = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const oldUnits = {
  'tha-ap107': { id: 'tha-ap107', book: 36, start: 5231, end: 5252, title: 'Muṭṭhipupphiyattheraapadānaṃ', collection: 'ap', acronym: 'Tha Ap 107', vri: '24–29', pts: { volume: 1, page: 142, end_page: 142 } },
  'tha-ap108': { id: 'tha-ap108', book: 36, start: 5252, end: 5271, title: 'Udakapūjakattheraapadāna', collection: 'ap', acronym: 'Tha Ap 108', vri: '30–35', pts: { volume: 1, page: 142, end_page: 143 } },
};
const newUnits = structuredClone(oldUnits);
Object.assign(newUnits['tha-ap107'], { end: 5248, vri: '24–28', index_revision: THERA_PAIR_REVISION });
Object.assign(newUnits['tha-ap108'], { start: 5248, vri: '29–35', index_revision: THERA_PAIR_REVISION });

export function canonBeforeTheraPair(canon) {
  assert.equal(canon.source?.commit, source, 'Historical Therā pair snapshot requires reviewed VRI source');
  const selected = {};
  for (const id of Object.keys(oldUnits)) {
    const rows = canon.units.filter(unit => unit.id === id);
    assert.equal(rows.length, 1, 'Missing or duplicate reviewed Therā paired unit');
    selected[id] = rows[0];
  }
  const equals = expected => { try { assert.deepEqual(selected, expected); return true; } catch { return false; } };
  assert.ok(equals(oldUnits) || equals(newUnits), 'Unreviewed, mixed or partial Therā paired metadata state');
  return { ...canon, units: canon.units.map(unit => Object.hasOwn(oldUnits, unit.id) ? structuredClone(oldUnits[unit.id]) : unit) };
}
