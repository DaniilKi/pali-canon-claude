/** Reviewed publisher sequence only; canonical pages and English consent keep their existing routes. */
import {APADANA_BASE, APADANA_COMMIT, APADANA_LICENSE, APADANA_PROFILES, APADANA_TRANSLATOR, APADANA_VRI_COMMIT} from '../src/apadana-profiles.mjs';
import {validateApadanaChoice, apadanaId} from './translation-policy.mjs';
import {readingPagePosition} from './reading-navigation.mjs';

const own = (value, key) => Object.hasOwn(value, key);
const fail = () => { throw Error('Reviewed publisher-edition navigation is unavailable because its source identity or revision changed. The loaded Pāli remains unchanged.'); };
function family(profile) {
  if (profile?.id?.startsWith('thi-ap') && profile.path?.startsWith('/text/chapter-4/') && profile.poem >= 1 && profile.poem <= 40 && !own(profile, 'publisher_chapter')) return 'theri';
  if (profile?.id?.startsWith('tha-ap') && profile.publisher_chapter === 'chapter-3' && profile.path?.startsWith('/text/chapter-3/')) return 'thera';
  return null;
}
const locator = profile => APADANA_VRI_COMMIT + (profile.index_revision ? '-' + profile.index_revision : '');
function entry(profile) {
  const chapter = family(profile) === 'theri' ? 'chapter-4' : 'chapter-3';
  if (!Number.isSafeInteger(profile.poem) || profile.poem < 1 || profile.path !== '/text/' + chapter + '/poem-' + String(profile.poem).padStart(3, '0') + '/'
    || profile.source !== 'apadana' || profile.license !== APADANA_LICENSE || profile.translator !== APADANA_TRANSLATOR
    || profile.url !== APADANA_BASE + profile.path || profile.translation_revision !== APADANA_COMMIT || typeof profile.title !== 'string' || !profile.title.trim()) fail();
  return {uid: profile.id, poem: profile.poem, title: profile.title,
    label: 'Publisher poem ' + profile.poem + ' · ' + profile.title + ' · ' + profile.id,
    href: readingPagePosition({uid: profile.id}, 0, locator(profile))};
}

export function apadanaEditionNavigation(data) {
  const profile = APADANA_PROFILES[data?.text_id];
  if (!profile || !family(profile)) return null;
  const selected = family(profile), expectedLocator = locator(profile), source = data.source;
  if (data.canonical === false || data.content_type === 'commentary' || data.selection === 'source_book'
    || source?.commit !== APADANA_VRI_COMMIT || source.repository !== 'https://github.com/VipassanaTech/tipitaka-xml'
    || (source.locator_revision || source.commit) !== expectedLocator
    || own(source, 'locator_revision') !== Boolean(profile.index_revision) || !Array.isArray(data.english_available)) fail();
  const choices = data.english_available.filter(choice => choice.translation_id === apadanaId(profile.id));
  if (choices.length !== 1 || data.english_available.some(choice => typeof choice.translation_id === 'string' && /^ap:/i.test(choice.translation_id) && choice.translation_id !== apadanaId(profile.id))) fail();
  validateApadanaChoice(choices[0], profile.id);
  const profiles = Object.entries(APADANA_PROFILES).filter(([, value]) => family(value) === selected);
  if (!profiles.length || selected === 'theri' && profiles.length !== 40 || profiles.some(([uid, value]) => uid !== value.id)) fail();
  const poems = profiles.map(([, value]) => entry(value)).sort((a, b) => a.poem - b.poem);
  if (new Set(poems.map(value => value.poem)).size !== poems.length || new Set(poems.map(value => value.uid)).size !== poems.length) fail();
  const at = poems.findIndex(value => value.uid === profile.id); if (at < 0) fail();
  const groups = [];
  for (const poem of poems) {
    const first = Math.floor((poem.poem - 1) / 10) * 10 + 1, label = 'Publisher poems ' + first + '–' + (first + 9);
    let group = groups.find(value => value.label === label);
    if (!group) { group = {label, poems: []}; groups.push(group); }
    group.poems.push(poem);
  }
  const group = groups.find(value => value.poems.some(poem => poem.uid === profile.id));
  const ending = group.poems.at(-1), endingProfile = APADANA_PROFILES[ending.uid];
  const summary = endingProfile.chapter_summary?.parent_id === ending.uid ? ending : null;
  return {family: selected, revision: APADANA_COMMIT,
    title: selected === 'theri' ? 'Reviewed Therī publisher edition' : 'Reviewed Therā publisher poems',
    note: selected === 'theri' ? 'The 40 reviewed poems follow this publisher edition. This is not the whole Apadāna or line-complete VRI English.' : 'Only the reviewed Therā publisher poems are listed. Other poems remain outside this reviewed sequence; this is not complete Therā or line-complete VRI English.',
    current: poems[at], previous: at > 0 ? poems[at - 1] : null, next: at + 1 < poems.length ? poems[at + 1] : null, groups, summary};
}

/** Recheck the current authority and exact target on explicit selector submission. */
export function apadanaEditionLink(data, uid) {
  const navigation = apadanaEditionNavigation(data), target = navigation?.groups.flatMap(group => group.poems).find(poem => poem.uid === uid);
  if (!target) fail();
  return target.href;
}
