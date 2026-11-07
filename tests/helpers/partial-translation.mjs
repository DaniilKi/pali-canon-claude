import * as canon from '../../src/canon.mjs';
import { scopeHash } from '../../src/translation-scope.mjs';
export const syntheticText = ('Synthetic fixture only: amber lantern copper window. '.repeat(45) + 'Synthetic ending.').trim();
export const syntheticHtml = `<html><head><title>Synthetic fixture</title></head><body><div id="sutta"><p>${syntheticText}</p></div><div class="footer">Fixture footer</div></body></html>`;
export function syntheticLink(unitId = 'patthana1.1', first = 5, last = 8) {
  const unit = canon.resolve(unitId).unit;
  const selected = canon.segments(unit).slice(first, last + 1).map(({ ref, type, text }) => ({ ref, type, text }));
  return { source: 'dhammatalks', url: `https://www.dhammatalks.org/suttas/SYNTHETIC/${unitId === 'patthana1.1' ? 'PARTIAL' : unitId.toUpperCase()}.html`,
    translator: 'Synthetic fixture translator', reference: 'Synthetic fixture only', match: 'synthetic-test-only',
    partial_scope: { version: 1, status: 'reviewed', unit_id: unitId, first_ref: selected[0].ref, last_ref: selected.at(-1).ref,
      source_commit: canon.source().commit, pali_sha256: scopeHash(selected), text_sha256: scopeHash(syntheticText) } };
}
