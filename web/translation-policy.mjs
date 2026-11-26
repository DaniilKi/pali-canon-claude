import {translatorNotes,sectionSourceUnit,milindaSourceUnit,anTenSourceUnit,validateSectionIdentity,validateSectionDescriptor} from './milinda-sources.mjs';
import {contentSha256} from './content-sha256.mjs';

import { APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR, APADANA_PROFILES } from '../src/apadana-profiles.mjs';

// Explicit reviewed publisher-preface owners; earlier presentation contracts stay unchanged.
const PINNED_NEW_PARATEXT_IDS = new Set(["tha-ap44","tha-ap63","tha-ap64","tha-ap65","tha-ap66","tha-ap67","tha-ap68","tha-ap69","tha-ap70","tha-ap71","tha-ap73","tha-ap74","tha-ap75","tha-ap76","tha-ap77","tha-ap78","tha-ap79","tha-ap80","tha-ap81","tha-ap82","tha-ap83","tha-ap84","tha-ap85","tha-ap86","tha-ap87","tha-ap88","tha-ap89","tha-ap90","tha-ap91","tha-ap92","tha-ap93","tha-ap94","tha-ap95","tha-ap96","tha-ap97","tha-ap98","tha-ap99","tha-ap100","tha-ap101","tha-ap102","tha-ap103","tha-ap104","tha-ap105","tha-ap106","tha-ap107","tha-ap108","tha-ap109","tha-ap110","tha-ap111","tha-ap112","tha-ap113","tha-ap114","tha-ap115","tha-ap116","tha-ap117","tha-ap118","tha-ap119","tha-ap120","tha-ap121","tha-ap122","tha-ap123","tha-ap124","tha-ap125","tha-ap126","tha-ap127","tha-ap128","tha-ap129","tha-ap130","tha-ap131","tha-ap132","tha-ap133","tha-ap134","tha-ap135","tha-ap136","tha-ap137","tha-ap138","tha-ap139","tha-ap140","tha-ap141","tha-ap143","tha-ap144","tha-ap145","tha-ap146","tha-ap147","tha-ap148","tha-ap149","tha-ap150","tha-ap151","tha-ap152","tha-ap153","tha-ap154","tha-ap155","tha-ap156","tha-ap157","tha-ap158","tha-ap159","tha-ap162","tha-ap163","tha-ap164","tha-ap165","tha-ap166","tha-ap167","tha-ap168","tha-ap169","tha-ap170","tha-ap171","tha-ap172","tha-ap173","tha-ap174","tha-ap175","tha-ap176","tha-ap177","tha-ap178","tha-ap179","tha-ap180","tha-ap181","tha-ap182","tha-ap183","tha-ap184","tha-ap185","tha-ap186","tha-ap187","tha-ap188","tha-ap189","tha-ap190","tha-ap191","tha-ap192","tha-ap193","tha-ap194","tha-ap195","tha-ap196","tha-ap197","tha-ap198","tha-ap199","tha-ap200","tha-ap201","tha-ap202","tha-ap203","tha-ap204","tha-ap205","tha-ap206","tha-ap207","tha-ap208","tha-ap209","tha-ap210","tha-ap211","tha-ap212","tha-ap213","tha-ap214","tha-ap215","tha-ap216","tha-ap217","tha-ap218","tha-ap219","tha-ap220","tha-ap221","tha-ap222","tha-ap243","tha-ap244","tha-ap245","tha-ap246","tha-ap247","tha-ap248","tha-ap249","tha-ap250","tha-ap251","tha-ap252","tha-ap223","tha-ap224","tha-ap225","tha-ap226","tha-ap227","tha-ap228","tha-ap229","tha-ap230","tha-ap231","tha-ap232","tha-ap233","tha-ap234","tha-ap235","tha-ap237","tha-ap238","tha-ap239","tha-ap240","tha-ap241","tha-ap242","tha-ap253","tha-ap254","tha-ap255","tha-ap256","tha-ap257","tha-ap258","tha-ap259","tha-ap260","tha-ap261","tha-ap236","tha-ap263","tha-ap264","tha-ap265","tha-ap266","tha-ap267","tha-ap269","tha-ap270","tha-ap271","tha-ap272","tha-ap273","tha-ap274","tha-ap275","tha-ap276","tha-ap277","tha-ap278","tha-ap279","tha-ap280","tha-ap281","tha-ap283","tha-ap284","tha-ap285","tha-ap286","tha-ap287","tha-ap289","tha-ap290","tha-ap294","tha-ap295","tha-ap296","tha-ap297","tha-ap298","tha-ap300","tha-ap301","tha-ap303","tha-ap304","tha-ap305","tha-ap306","tha-ap307","tha-ap310","tha-ap311","tha-ap312","tha-ap314","tha-ap315","tha-ap316","tha-ap317","tha-ap318","tha-ap319","tha-ap320","tha-ap321","tha-ap323","tha-ap325","tha-ap326","tha-ap327","tha-ap328","tha-ap331"]);


export const apadanaId = uid => APADANA_PROFILES[uid]?.path ? 'ap:' + APADANA_PROFILES[uid].path.replace(/^\/text\/|\/$/g, '') : undefined;
export const apadanaFamily = id => typeof id === 'string' && /^ap:/i.test(id.trim());
const isApadana = value => apadanaFamily(value?.translation_id) || value?.source === 'apadana' || value?.source === 'Legends of the Buddhist Saints (Apadāna)' || own(value, 'translation_revision') || own(value, 'publisher_paratext') || own(value, 'chapter_summary') || own(value, 'publisher_divisions') || own(value, 'publisher_preface') || own(value, 'collection_summary') || own(value, 'editorial_gap');

function sameParatext(value, expected, content) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const { text, translator_notes, ...descriptor } = value;
  return sameScope(descriptor, expected) && (content
    ? nonempty(text) && text.length <= 50000 && Array.isArray(translator_notes)
      && translator_notes.length === expected.note_numbers.length
      && translator_notes.every((n, i) => n && typeof n === 'object' && !Array.isArray(n)
        && Object.keys(n).sort().join(',') === 'number,text' && n.number === expected.note_numbers[i]
        && nonempty(n.text) && n.text.length <= 50000)
    : !own(value, 'text') && !own(value, 'translator_notes'));
}

function samePinnedContent(value, expected) {
  try { return contentSha256(value.text) === expected.body_sha256 && contentSha256(JSON.stringify(value.translator_notes)) === expected.notes_sha256; }
  catch { return false; }
}

/** Separately owned chapter paratext is never folded into poem text or notes. */
export function validateChapterSummary(value, uid, content = false) {
  const expected = APADANA_PROFILES[uid]?.chapter_summary;
  if (!expected) { if (own(value, 'chapter_summary')) throw Error('The pinned Apadāna chapter-summary owner changed.'); return; }
  if (!sameParatext(value.chapter_summary, expected, content)
    || content && ['tha-ap82','tha-ap92','tha-ap102','tha-ap112','tha-ap122','tha-ap132','tha-ap152','tha-ap162','tha-ap172','tha-ap182','tha-ap192','tha-ap202','tha-ap212','tha-ap222','tha-ap252','tha-ap232','tha-ap242','tha-ap272','tha-ap312'].includes(uid) && !samePinnedContent(value.chapter_summary, expected)) {
    throw Error('The pinned Apadāna chapter-summary scope or note ownership changed.');
  }
}

/** The fourth-chapter preface wording stays solely in publisher_paratext. */
export function validatePublisherPreface(value, uid, content = false) {
  const profile = APADANA_PROFILES[uid], expected = uid === 'thi-ap31' ? profile?.publisher_preface : undefined;
  if (!expected) { if (own(value, 'publisher_preface')) throw Error('The pinned Apadāna publisher-preface owner changed.'); return; }
  const preface = value.publisher_preface;
  if (!preface || typeof preface !== 'object' || Array.isArray(preface)) throw Error('The pinned Apadāna publisher-preface scope or note ownership changed.');
  const { translator_notes, ...descriptor } = preface;
  if (Object.keys(expected).sort().join(',') !== 'body_sha256,kind,label,note_numbers,notes_sha256,parent_id'
    || expected.kind !== 'publisher_preface' || expected.parent_id !== uid || expected.label !== 'Fourth Therī chapter preface'
    || expected.body_sha256 !== profile.paratext_sha256 || !sameScope(expected.note_numbers, [1])
    || Object.keys(preface).sort().join(',') !== Object.keys(expected).concat(content ? ['translator_notes'] : []).sort().join(',')
    || !sameScope(descriptor, expected) || own(preface, 'text') || (content
      ? !Array.isArray(translator_notes) || translator_notes.length !== 1 || translator_notes.some(note => !note || typeof note !== 'object' || Array.isArray(note)
        || Object.keys(note).sort().join(',') !== 'number,text' || note.number !== 1 || !nonempty(note.text) || note.text.length > 50000)
      : own(preface, 'translator_notes'))) throw Error('The pinned Apadāna publisher-preface scope or note ownership changed.');
}

/** Canonical collection paratext keeps its own identity, wording and notes. */
export function validateCollectionSummary(value, uid, content = false) {
  const expected = ['thi-ap40','tha-ap102','tha-ap202'].includes(uid) ? APADANA_PROFILES[uid]?.collection_summary : undefined;
  if (!expected) { if (own(value, 'collection_summary')) throw Error('The pinned Apadāna collection-summary owner changed.'); return; }
  const summary = value.collection_summary;
  if (expected.kind !== 'canonical_collection_summary' || expected.parent_id !== uid
    || (uid === 'thi-ap40' ? !sameScope(expected.note_numbers, [11,12])
      : uid === 'tha-ap102' ? !sameScope(expected.note_numbers, [4]) || expected.label !== 'Therā Apadāna first-hundred chapter summary and colophons'
        || expected.root_start !== 5145 || expected.root_end !== 5152 || expected.first_ref !== 'tha-ap102/12' || expected.last_ref !== 'tha-ap102/15'
      : !sameScope(expected.note_numbers, [6,7]) || expected.label !== 'Therā Apadāna second-hundred chapter summary and colophons'
        || expected.root_start !== 7417 || expected.root_end !== 7424 || expected.first_ref !== 'tha-ap202/11' || expected.last_ref !== 'tha-ap202/15')
    || !summary || typeof summary !== 'object' || Array.isArray(summary)
    || Object.keys(summary).sort().join(',') !== Object.keys(expected).concat(content ? ['text', 'translator_notes'] : []).sort().join(',')
    || !sameParatext(summary, expected, content)
    || content && ['tha-ap102','tha-ap202'].includes(uid) && !samePinnedContent(summary, expected)) {
    throw Error('The pinned Apadāna collection-summary scope or note ownership changed.');
  }
}

/** Publisher recitation divisions and their notes remain separate from the poem. */
export function validatePublisherDivisions(value, uid, content = false) {
  const expected = APADANA_PROFILES[uid]?.publisher_divisions;
  if (!expected) { if (own(value, 'publisher_divisions')) throw Error('The pinned Apadāna publisher-division owner changed.'); return; }
  const divisions = value.publisher_divisions;
  if (!Array.isArray(divisions) || divisions.length !== expected.length
    || divisions.some((division, i) => !sameParatext(division, expected[i], content)
      || content && uid === 'tha-ap76' && !samePinnedContent(division, expected[i]))) {
    throw Error('The pinned Apadāna publisher-division scope or note ownership changed.');
  }
}

/** A single publisher's editorial omission has no canonical stanza or root scope. */
export function validateEditorialGap(value, uid, content = false) {
  const profile = APADANA_PROFILES[uid], expected = uid === 'tha-ap44' ? profile?.editorial_gap : undefined;
  const fail = () => { throw Error('The pinned Apadāna editorial-gap scope, content or note ownership changed.'); };
  if (!expected) { if (own(value, 'editorial_gap')) fail(); return; }
  const gap = value.editorial_gap;
  if (profile.raw_sha256 !== '71d18cea42a26ac2fc490f43c5265f83d517d8794f2df5d652d0fadbf17a4533'
    || Object.keys(expected).sort().join(',') !== 'after_local_label,after_publisher_label,before_local_label,before_publisher_label,body_sha256,kind,note_numbers,notes_sha256,parent_id,placement'
    || expected.kind !== 'publisher_editorial_gap' || expected.parent_id !== uid || expected.placement !== 'before_local_label'
    || expected.after_local_label !== '25' || expected.after_publisher_label !== '1164'
    || expected.before_local_label !== '26' || expected.before_publisher_label !== '1165'
    || !sameScope(expected.note_numbers, [12]) || !sameParatext(gap, expected, content)) fail();
  if (content) {
    try { if (contentSha256(gap.text) !== expected.body_sha256 || contentSha256(JSON.stringify(gap.translator_notes)) !== expected.notes_sha256) fail(); }
    catch { fail(); }
  }
}

export function validateApadanaChoice(value, uid, content = false) {
  if (!isApadana(value)) return;
  const profile = APADANA_PROFILES[uid];
  if (!profile || value.translation_id !== apadanaId(uid) || value.translation_revision !== APADANA_COMMIT
    || value.translator !== APADANA_TRANSLATOR || value.license !== APADANA_LICENSE || value.url !== profile.url
    || own(value, 'translation_scope') || own(value, 'source_section') || value.whole_unit_coverage === false) {
    throw Error('The pinned Apadāna source identity or terms changed. No English source was displayed.');
  }
  if (content && (JSON.stringify(value.mapping_notes) !== JSON.stringify(profile.mapping_notes)
    || !Array.isArray(value.notes) || profile.mapping_notes.some(note => !value.notes.includes(note)))) {
    throw Error('The pinned Apadāna edition or mapping notices changed. No English was displayed.');
  }
  if (content) {
    let valid = false;
    try { valid = Array.isArray(value.translator_notes) && contentSha256(JSON.stringify(value.translator_notes)) === profile.notes_sha256; } catch {}
    if (!valid) throw Error('The pinned Apadāna poem-note content changed. No English was displayed.');
  }
  if (content && PINNED_NEW_PARATEXT_IDS.has(uid)) {
    let valid = false;
    try { valid = typeof value.publisher_paratext === 'string' && value.publisher_paratext.length <= 50000 && contentSha256(value.publisher_paratext) === profile.paratext_sha256; } catch {}
    if (!valid) throw Error('The pinned Apadāna publisher-preface content changed. No English was displayed.');
  }
  validateChapterSummary(value, uid, content);
  validatePublisherPreface(value, uid, content);
  validateCollectionSummary(value, uid, content);
  validatePublisherDivisions(value, uid, content);
  validateEditorialGap(value, uid, content);
}

/** Browser display/consent guards for backend-validated metadata. Not source, rights or alignment approval. */
const own = (value, key) => value && Object.hasOwn(value, key);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
export const sameScope = (a, b) => stable(a) === stable(b);

const MEDICINE_ID = 'ati:/tipitaka/kn/miln/miln.5x.olen';
const MEDICINE_EXTRACTOR = 'ati-milinda-medicine-two-verses-v1';
function medicineFamily(id) {
  if (typeof id !== 'string') return false;
  let decoded=id;try{decoded=decodeURIComponent(id);}catch{}
  return decoded.trim().split(/[?#]/,1)[0].replace(/\.html?$/i,'').toLowerCase()===MEDICINE_ID;
}

export function scopeDescriptor(choice, requestedId) {
  validateApadanaChoice(choice, requestedId);
  validateSectionIdentity(choice);
  if (sectionSourceUnit(choice?.translation_id)) {
    validateSectionDescriptor(choice);
    if (sectionSourceUnit(choice.translation_id) !== requestedId || own(choice, 'translation_scope') || own(choice, 'whole_unit_coverage') && choice.whole_unit_coverage !== true) throw Error('The reviewed source section belongs to another selection or changed scope. No English source was requested.');
  }
  const fail = () => { throw new Error('This source has an unsupported or incomplete scope declaration. No scoped source was requested. Reload the passage and review the updated sources.'); };
  const reserved=medicineFamily(choice?.translation_id), selector=choice?.translation_scope?.extractor===MEDICINE_EXTRACTOR;
  if (!own(choice, 'translation_scope')) { if(reserved)fail();return null; }
  const scope = choice.translation_scope;
  if (reserved || selector) {
    const read=scope?.read_with;
    if(choice.translation_id!==MEDICINE_ID || requestedId!=='mil6.4.1' || scope?.kind!=='partial_unit' || scope.version!==1 || scope.unit_id!=='mil6.4.1' || scope.first_ref!=='mil6.4.1/20' || scope.last_ref!=='mil6.4.1/21' || scope.extractor!==MEDICINE_EXTRACTOR || scope.pali_segments!==2 || scope.whole_unit_coverage!==false || own(choice,'whole_unit_coverage')&&choice.whole_unit_coverage!==false || !read || Object.keys(read).sort().join(',')!=='limit,offset,tool,uid' || read.tool!=='get_text' || read.uid!=='mil6.4.1' || read.offset!==19 || read.limit!==2 || own(scope,'read_pages') || own(scope,'pali_excerpt')) fail();
  }
  if (!scope || ![1,2].includes(scope.version) || scope.whole_unit_coverage !== false || !sha(scope.scope_sha256) || !sha(scope.text_sha256) || !sha(scope.pali_sha256) || !nonempty(scope.source_commit) || !nonempty(scope.note) || !nonempty(choice.translation_id)) fail();
  if (scope.kind === 'shared_page') {
    if(scope.version!==1)fail();
    const ids = scope.text_ids;
    const presentation = scope.presentation || (scope.condensed === true ? 'condensed' : null);
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 32 || ids.some(id => !nonempty(id) || id.length > 300) || new Set(ids).size !== ids.length || !ids.includes(requestedId) || scope.owner_id !== ids[0] || scope.individual_alignment_verified !== false || !nonempty(scope.source_reference) || !['condensed', 'compilation'].includes(presentation) || (presentation === 'compilation' && !sha(scope.notice_sha256)) || (own(scope, 'condensed') && scope.condensed !== (presentation === 'condensed'))) fail();
    return { kind: scope.kind, label: presentation === 'compilation' ? 'Shared compilation page' : 'Shared condensed page', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_shared: true, scope_sha256: scope.scope_sha256 } };
  }
  if (scope.kind === 'partial_unit') {
    const prefix = requestedId + '/';
    if(choice.translation_id.startsWith('ati:')&&(!(scope.version===2?['ati-chapter-prose-v1','ati-chapter-p5-of5-no-notes-v1','ati-chapter-p1to4-of5-notes-v1'].includes(scope.extractor):['ati-freeverse-v1','ati-chapter-p2-of2-v1','ati-chapter-p11-of11-v1','ati-chapter-p1-of4-v1','ati-chapter-p14-of24-v1','ati-excerpt-verse-pre-v1','ati-chapter-p1to3-of4-ellipsis-v1','ati-vinaya-mv6-p1to5-of5-v1','ati-vinaya-mv8-p1to22-of22-v1','ati-vinaya-mv1-mixed21p6v-v1','ati-milinda-medicine-two-verses-v1'].includes(scope.extractor))||!sha(scope.notice_sha256)))fail();
    if(scope.version===2){const p=scope.pali_excerpt;if(!choice.translation_id.startsWith('ati:')||scope.first_ref!==scope.last_ref||!p||p.ref!==scope.first_ref||p.type!=='prose'||!nonempty(p.text)||p.text.length>2000000||p.offset_unit!=='utf16_code_units'||!sha(p.segment_sha256)||!Number.isSafeInteger(p.start_char)||!Number.isSafeInteger(p.end_char)||p.start_char<0||p.end_char<=p.start_char||p.end_char-p.start_char!==p.text.length||own(scope,'read_with')||own(scope,'read_pages'))fail();}
    else if(own(scope,'pali_excerpt'))fail();
    if (scope.unit_id !== requestedId || !nonempty(scope.first_ref) || !nonempty(scope.last_ref) || !scope.first_ref.startsWith(prefix) || !scope.last_ref.startsWith(prefix) || !/^[1-9]\d*$/.test(scope.first_ref.slice(prefix.length)) || !/^[1-9]\d*$/.test(scope.last_ref.slice(prefix.length)) || Number(scope.first_ref.slice(prefix.length)) > Number(scope.last_ref.slice(prefix.length))) fail();
    return { kind: scope.kind, label: 'Partial-unit source', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_partial: true, scope_sha256: scope.scope_sha256 } };
  }
  fail();
}

/** Validate identity/scope before rendering; return only a checked same-source continuation. */
export function validateEnglishPage(data, args, context) {
  const offset = args.offset || 0;
  if(medicineFamily(data?.translation_id) || data?.translation_scope?.extractor===MEDICINE_EXTRACTOR)scopeDescriptor(data,context.uid);
  if (data && typeof data === 'object') {
    translatorNotes(data);
    if (sectionSourceUnit(data.translation_id) && sectionSourceUnit(data.translation_id) !== context.uid) throw Error('The section source belongs to a different Pāli selection. No English was displayed.');
  }
  if (!data || !nonempty(data.text) || !nonempty(data.translation_id) || !nonempty(data.translator) || !nonempty(data.attribution) || !(nonempty(data.license) || (data.license && typeof data.license === 'object' && nonempty(data.license.name))) || data.offset !== offset) throw new Error('The English source response is incomplete. No translation was displayed.');
  const choice = context.choices.find(c => c.translation_id === data.translation_id);
  if (!choice) throw new Error('The returned English source version was not in the reviewed list. Reload the passage and review sources again.');
  validateApadanaChoice(choice, context.uid);
  if (isApadana(choice) || isApadana(data) || apadanaFamily(args.translation)) {
    validateApadanaChoice(data, context.uid, true);
    if (!isApadana(choice) || !isApadana(data) || args.translation !== choice.translation_id
      || args.translation_revision !== APADANA_COMMIT || data.source !== 'apadana'
      || ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].some(key => data[key] !== APADANA_PROFILES[context.uid][key])
      || data.fetched_url !== APADANA_PROFILES[context.uid].raw_url || data.license_url !== APADANA_LICENSE_URL
      || !nonempty(data.changes) || data.changes.length > 2000
      || typeof data.publisher_paratext !== 'string' || data.publisher_paratext.length > 50000
      || Boolean(data.publisher_paratext.trim()) !== (APADANA_PROFILES[context.uid].paratext_sha256 !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
      || !Array.isArray(data.translator_notes) || data.translator_notes.length !== APADANA_PROFILES[context.uid].note_count
      || (offset > 0 && (!sha(args.prefix_sha256) || data.prefix_sha256 !== args.prefix_sha256))) {
      throw Error('The pinned Apadāna source response does not match its reviewed identity. No English was displayed.');
    }
  }
  if(medicineFamily(choice.translation_id) || choice.translation_scope?.extractor===MEDICINE_EXTRACTOR)scopeDescriptor(choice,context.uid);
  if (sectionSourceUnit(data.translation_id) && (!own(choice, 'source_section') || !sameScope(data.source_section, choice.source_section) || data.source_section?.unit_id !== context.uid || !anTenSourceUnit(data.translation_id) && data.source_section?.anchor !== data.translation_id.split('#')[1] || data.source_section?.status !== 'reviewed')) throw new Error(milindaSourceUnit(data.translation_id) ? 'The reviewed question identity changed. Reload the passage and review sources again; no English was displayed.' : 'The reviewed discourse identity changed. Reload the passage and review sources again; no English was displayed.');
  if (context.accepted) {
    const accepted = context.accepted;
    if (data.translation_id !== args.translation || data.whole_unit_coverage !== false || !own(data, 'translation_scope') || !sameScope(data.translation_scope, accepted.scope)) throw new Error('The source scope or version changed after review. Reload the passage and give fresh consent; no scoped text was displayed.');
    if (accepted.kind === 'shared_page') {
      if (args.allow_shared !== true || args.allow_partial === true || data.text_id !== null || data.requested_text_id !== context.uid || data.citation !== accepted.scope.source_reference) throw new Error('A shared page was incorrectly attributed to an individual discourse. No scoped text was displayed.');
    } else if (args.allow_partial !== true || args.allow_shared === true || data.text_id !== context.uid) throw new Error('The partial source no longer matches the reviewed unit. No scoped text was displayed.');
    if (args.scope_sha256 !== accepted.scope.scope_sha256) throw new Error('The scope consent is missing its reviewed mapping pin.');
  } else if (own(data, 'translation_scope') || data.whole_unit_coverage === false || own(choice, 'translation_scope') || data.text_id !== context.uid || args.allow_shared === true || args.allow_partial === true) throw new Error('This response needs a separate scope review. No partial/shared page was displayed as a whole-text translation.');
  if (data.next_offset === null || data.next_offset === undefined) {
    if (data.continue_with != null) throw new Error('The source returned an inconsistent continuation. Reload its first page.');
    return null;
  }
  const next = data.continue_with?.arguments;
  if (data.continue_with?.name !== 'get_translation' || !next || next.uid !== context.uid || next.translation !== data.translation_id || !Number.isSafeInteger(next.offset) || next.offset <= offset || next.offset > 2000000 || next.offset !== data.next_offset || !sha(next.prefix_sha256) || !Number.isInteger(next.limit) || next.limit < 500 || next.limit > 30000) throw new Error('The source returned an unsafe continuation. No next-page request was made.');
  if (isApadana(choice) ? next.translation_revision !== APADANA_COMMIT : own(next, 'translation_revision')) throw Error('The next page changed or dropped the pinned translation revision.');
  if (context.accepted) {
    const shared = context.accepted.kind === 'shared_page';
    if (next.scope_sha256 !== context.accepted.scope.scope_sha256 || next[shared ? 'allow_shared' : 'allow_partial'] !== true || next[shared ? 'allow_partial' : 'allow_shared'] === true) throw new Error('The next page dropped or changed its scope consent. Review the source again.');
  } else if (next.allow_shared === true || next.allow_partial === true || own(next, 'scope_sha256')) throw new Error('The next page unexpectedly changes source scope. Review it separately.');
  return JSON.parse(JSON.stringify(next));
}
