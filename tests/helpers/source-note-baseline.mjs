/** Historical intake projection for three exact, separately tested additive
 * source-note changes. This is not a general source-code normalizer.
 * No baseline, profile, corpus, locator or private-data seal is replaced.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const APPROVED=freeze({
  "web/reader.js": {
    "historical_sha256": "ba9f930608b219fc01dd41dcd35f4cb123afe911da1dc21449c2c082d570dafe",
    "approved_source_note_sha256": "7158816561af99d414a82716776e7a2d36373c682aa36ddcf333a9e5424ad47d",
    "additions": [
      "import { createSourceNotesPolicy } from './source-notes-policy.mjs';\nimport { contentSha256 } from './content-sha256.mjs';\nimport { SOURCE_NOTES_PROFILE } from '../src/source-notes-profiles.mjs';\n",
      "const sourceNotesPolicy = createSourceNotesPolicy(contentSha256, SOURCE_NOTES_PROFILE);\n",
      "// Original edition apparatus is never a segment, a quotation or private data.\nfunction originalEditionNote(record) {\n  const aside = el('aside', undefined, 'original-edition-note');\n  aside.setAttribute('role', 'note'); aside.setAttribute('aria-label', 'Original VRI edition note (Roman Pāli)');\n  const text = el('p', record.text, 'edition-note-text'); text.lang = 'pi-Latn';\n  aside.append(el('h3', 'Original VRI edition note (Roman Pāli)'), text,\n    el('p', 'Physical source location only; the remark’s stanza span has not been verified.', 'muted'),\n    el('p', record.qualification, 'muted'),\n    el('p', record.provenance.attribution + ' ' + record.provenance.terms, 'edition-note-provenance'),\n    el('p', 'Extracted from an original note-only source element and displayed separately from root text.', 'muted'));\n  return aside;\n}\nfunction originalEditionStatus(state) {\n  if (state.state === 'absent' || state.state === 'available' && !state.opening) return null;\n  const aside = el('aside', undefined, 'source-notes-status');\n  aside.setAttribute('aria-label', 'Original edition apparatus');\n  if (state.state === 'unavailable') {\n    aside.setAttribute('role', 'status'); aside.append(el('p', state.warning));\n  } else {\n    const command = state.availability.read_with;\n    const context = command.book ? { book: command.book } : { uid: command.uid };\n    const href = readingPosition(context, command.offset, state.anchor_ref, command.source_commit);\n    aside.append(el('h3', 'Original edition apparatus'),\n      el('p', '1 separately indexed original VRI edition note is available at its recorded location.'),\n      link('Open original edition note location', href, 'button'),\n      el('p', 'This opens its recorded physical location, not a verified stanza span. No English source is requested.', 'muted'));\n  }\n  return aside;\n}\n",
      "  const sourceNotes = sourceNotesPolicy.inspect(data), sourceNotesStatus = originalEditionStatus(sourceNotes);\n  if (sourceNotesStatus) view.append(sourceNotesStatus);\n",
      "    if (sourceNotes.entry && segment.ref === sourceNotes.anchor_ref) passages.append(originalEditionNote(sourceNotes.entry));\n"
    ]
  },
  "scripts/build.mjs": {
    "historical_sha256": "fdc7adeecdd98156871fe35e5aee89d8f8938cac0e0041101274eead3cc64009",
    "approved_source_note_sha256": "709bdd937a4f7621e3d5870dcab820ad25211ec3f87a63d44206c49c529d491c",
    "additions": [
      "import { createSourceNotesPolicy } from '../web/source-notes-policy.mjs';\n",
      "// The finite edition-note policy has its own frozen literal. Keep the original\n// widget hash literal and whole-resource audit unchanged.\ncommon.define.__PALI_SOURCE_NOTES_POLICY_SOURCE__ = JSON.stringify(createSourceNotesPolicy.toString());\n"
    ]
  },
  "src/server.mjs": {
    "historical_sha256": "ed142f6875b2278fd6d789c3bee6c3ceda58d06fedcc34d994878f5eb96bfff6",
    "approved_source_note_sha256": "7a04c8715136bcec8fdec9c1370a4a86d47cfd3f623ec7160622bd1d7e5324d4",
    "additions": [
      "import { sourceNotesForPage } from './source-notes.mjs';\n",
      "    const sourceNotes = sourceNotesForPage({ corpus: canon.load().canon, unitId: unit.id,\n      source: result.source, segments: page, offset });\n    if (sourceNotes) result.source_notes = sourceNotes;\n"
    ]
  }
});
export const SOURCE_NOTE_PROJECTED_FILES=Object.freeze(Object.keys(APPROVED));

/** Remove only these pinned additions, then prove the exact OLD file hash.
 * The caller retains its original historical assertion over these bytes.
 * Every other file is returned unchanged for the original assertion to check.
 */
export function sourceNoteBaselineProjection(path,bytes,historicalHash){
 assert.ok(Buffer.isBuffer(bytes),'Historical source projection requires exact bytes');
 if(!Object.hasOwn(APPROVED,path))return bytes;
 const approved=APPROVED[path];
 assert.equal(historicalHash,approved.historical_sha256,'No alternate historical authority is accepted');
 assert.equal(digest(bytes),approved.approved_source_note_sha256,'Only the exact approved source-note additions may be projected');
 let text=bytes.toString('utf8');
 assert.ok(Buffer.from(text,'utf8').equals(bytes),'No source encoding or normalization change is accepted');
 for(const addition of approved.additions){
  const parts=text.split(addition);
  assert.equal(parts.length,2,'Every exact approved addition must occur once');
  text=parts.join('');
 }
 const original=Buffer.from(text,'utf8');
 assert.equal(digest(original),approved.historical_sha256,'Removing only approved additions must recover exact historical code');
 return original;
}
