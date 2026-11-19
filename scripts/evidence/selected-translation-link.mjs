/** Audit internal selection identity separately from the actual publisher URL. */
import { assertRegisteredSection } from '../../src/ati-section-registry.mjs';
import { AN_TEN_SECTION_PROFILE } from '../../src/ati-section-profiles.mjs';

export function auditSelectedTranslationLink(canon, ownerId, link) {
  const snapshot = canon.load(), owner = snapshot.byId.get(ownerId);
  const row = snapshot.sectionRegistry.links.find(row => row.unit_id === ownerId && row.section.profile === AN_TEN_SECTION_PROFILE);
  if (!owner || !row || link.section?.profile !== AN_TEN_SECTION_PROFILE) throw Error('Selected translation has no finite reviewed owner.');
  assertRegisteredSection(link, owner, snapshot.sectionRegistry);
  canon.linksFor(owner);
  const identity = `ati:${row.path}::selection:${row.unit_id}`;
  if (canon.translationId(link) !== identity) throw Error('Internal selection identity does not match its exact owner.');
  const publisherUrl = `https://accesstoinsight.org${row.path}.html${row.anchor ? '#' + row.anchor : ''}`;
  if (link.url !== publisherUrl) throw Error('Selected translation does not retain its actual publisher URL.');
  if (row.anchor === null) {
    let refusal;
    try { canon.resolve(publisherUrl); } catch (error) { refusal = error; }
    if (!refusal || !/^Shared-page URL concerns /.test(refusal.message)) throw Error('Unanchored publisher URL must remain explicitly ambiguous; the internal selection is not a URL fragment.');
  } else if (canon.resolve(publisherUrl).unit.id !== ownerId) {
    throw Error('Actual publisher fragment resolves to a different selection owner.');
  }
  return { translation_id: identity, publisher_url: publisherUrl, publisher_url_ambiguous: row.anchor === null, publisher_anchor: row.anchor };
}
