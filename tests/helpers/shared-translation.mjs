import * as canon from '../../src/canon.mjs';
import { scopeHash } from '../../src/translation-scope.mjs';
import { syntheticText } from './partial-translation.mjs';
export const sharedIds = ['iti10', 'iti11', 'iti12', 'iti13'];
export function syntheticShared(ids = sharedIds) {
  return { source: 'dhammatalks', url: 'https://www.dhammatalks.org/suttas/SYNTHETIC/SHARED.html', translator: 'Synthetic fixture translator',
    reference: 'Synthetic condensed shared page', match: 'synthetic-test-only',
    shared_scope: { version: 1, status: 'reviewed', owner_id: ids[0], text_ids: [...ids], presentation: 'condensed', alignment: 'unverified',
      source_commit: canon.source().commit, text_sha256: scopeHash(syntheticText),
      pali_sha256: scopeHash(ids.map(id => ({ id, segments: canon.segments(canon.resolve(id).unit).map(({ ref, type, text }) => ({ ref, type, text })) }))) } };
}
