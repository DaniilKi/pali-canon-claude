// A declaration is reviewed data, not an automatic alignment or rights approval.
import { createHash } from 'node:crypto';
export const scopeHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const isPartial = link => Object.hasOwn(link, 'partial_scope');
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function partialScope(link, unit, segments, source) {
  if (!isPartial(link)) return null;
  const p = link.partial_scope;
  const fail = () => { throw new Error('Invalid or unreviewed partial translation scope. No whole-unit coverage or source retrieval is inferred.'); };
  const fields = new Set(['version', 'status', 'unit_id', 'first_ref', 'last_ref', 'source_commit', 'pali_sha256', 'text_sha256']);
  if (!p || p.version !== 1 || Object.keys(p).some(k => !fields.has(k)) || p.status !== 'reviewed' || p.unit_id !== unit.id || p.source_commit !== source.commit
    || !sha(p.pali_sha256) || !sha(p.text_sha256) || unit.approximate) fail();
  const first = segments.findIndex(s => s.ref === p.first_ref);
  const last = segments.findIndex(s => s.ref === p.last_ref);
  if (first < 0 || last < first || (first === 0 && last === segments.length - 1)) fail();
  if (!segments.slice(first, last + 1).some(s => s.type !== 'heading') || !segments.some((s, i) => s.type !== 'heading' && (i < first || i > last))) fail();
  const selected = segments.slice(first, last + 1).map(({ ref, type, text }) => ({ ref, type, text }));
  if (scopeHash(selected) !== p.pali_sha256) fail();
  if (!['dhammatalks', 'ati', 'anandajoti'].includes(link.source)) fail();
  if (link.parts && (link.source !== 'anandajoti' || !Array.isArray(link.parts) || !link.parts.length || link.parts.length > 32)) fail();
  const readPages = [];
  for (let offset = first; offset <= last; offset += 200) readPages.push({ tool: 'get_text', uid: unit.id, offset, limit: Math.min(200, last - offset + 1) });
  return { kind: 'partial_unit', version: 1, unit_id: unit.id, first_ref: p.first_ref, last_ref: p.last_ref,
    source_commit: p.source_commit, pali_sha256: p.pali_sha256, text_sha256: p.text_sha256,
    scope_sha256: scopeHash({ mapping: p, source: link.source, url: link.url, path: link.path, parts: link.parts || null, translator: link.translator }), whole_unit_coverage: false,
    pali_segments: last - first + 1, read_with: readPages[0],
    ...(readPages.length > 1 ? { read_pages: readPages } : {}),
    note: 'Only this declared contiguous Pāli span has a linked translation. This is not a whole-unit translation or word-level alignment. Stop the Pāli reading at last_ref. Use read_pages when present; generic get_text continuation can leave this span.' };
}
