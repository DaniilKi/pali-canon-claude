/** Separate finite Therā extraction; never dispatch by a shared publisher poem number. */
import { THERA_APADANA_PROFILES } from './apadana-thera-profiles.mjs';
import { digest, plainMarkdown } from './apadana-presentation.mjs';
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };

export function parseTheraApadana(raw, profile) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  if (!known || JSON.stringify(profile) !== JSON.stringify(known) || digest(raw) !== known.raw_sha256
    || profile.publisher_chapter !== 'chapter-3') fail();
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front || !new RegExp(`^order: ${profile.poem}$`, 'm').test(front[1]) || !/^category: chapter-3$/m.test(front[1])) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1]; if (title !== profile.title) fail();
  const present = value => plainMarkdown((profile.id === 'tha-ap42' ? value.replace(/<span class="diacritics" data-state="on">(c|cc)<\/span><span class="no-diacritics" data-state="off">(ch|chch)<\/span>/g, (_all, diacritic, alternate) => {
    // Only this exact reviewed artifact has both single and doubled alternatives.
    if (alternate !== (diacritic === 'c' ? 'ch' : 'chch')) fail();
    return diacritic;
  }) : value)
    .replace(/<dfn id="#(?:PTS|BJTS)">([^]*?)<\/dfn>/g, '$1')
    .replace(/<a href="#(?:PTS|BJTS)" class="abbr">([^<>]*)<\/a>/g, '$1')
    .replace(/<span class="diacritics" data-state="on">c<\/span><span class="no-diacritics" data-state="off">ch<\/span>/g, 'c'));
  const rest = raw.slice(front[0].length).trim(), at = rest.search(/^\[\^\d+\]:/m);
  if (at < 0 && (profile.poem !== 28 || profile.note_count !== 0 || profile.note_numbers.length)) fail();
  let poem = at < 0 ? rest : rest.slice(0, at).trim();
  const entries = [...(at < 0 ? '' : rest.slice(at)).matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  const notes = entries.map((entry, i) => {
    if (Number(entry[1]) !== i + 1 || !entry[2].trim()) fail();
    return { number: i + 1, text: present(entry[2]) };
  });
  const notesFor = numbers => numbers.map(number => { const note = notes[number - 1]; if (!note || note.number !== number) fail(); return note; });
  const refs = (value, numbers) => {
    const found = [...value.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
    if (found.some(n => !numbers.includes(n)) || numbers.some(n => !found.includes(n))) fail();
  };
  let publisher_divisions;
  if (profile.publisher_divisions) {
    if (profile.publisher_divisions.length !== 1) fail();
    const scope = profile.publisher_divisions[0];
    let marker;
    if (profile.id === 'tha-ap51') {
      // In this exact artifact the recitation heading shares a paragraph with stanza15.
      // Remove only its original line; the four following stanza lines stay together.
      marker = '\n\nThe Fifth Recitation Portion.  \n';
      const parts = poem.split(marker);
      if (parts.length !== 2 || scope.before_local_label !== '15' || scope.before_publisher_label !== '1229') fail();
      const stanza = present(parts[1].split('\n\n')[0]);
      if (stanza.split('\n').length !== 4 || !stanza.endsWith('(15) [1229]')) fail();
      poem = parts.join('\n\n');
    } else {
      marker = ({17: '\n\nThe Third Recitation Portion is Finished.', 30: '\n\nThe Fourth Recitation Portion.'})[profile.poem];
      if (!marker || !poem.endsWith(marker) || poem.split(marker).length !== 2
        || scope.parent_id !== profile.id || scope.placement !== (profile.poem === 17 ? 'after_poem' : 'after_chapter_summary')) fail();
      poem = poem.slice(0, -marker.length);
    }
    const text = present(marker), translator_notes = notesFor(scope.note_numbers);
    refs(marker, scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    publisher_divisions = [{ ...scope, text, translator_notes }];
  }
  let chapter_summary;
  if (profile.chapter_summary) {
    if (!['tha-ap22', 'tha-ap32', 'tha-ap42', 'tha-ap52', 'tha-ap62'].includes(profile.id)) fail();
    const marker = '\n\nThe Summary:\n\n', parts = poem.split(marker); if (parts.length !== 2) fail();
    poem = parts[0]; const summaryRaw = marker.trim() + '\n\n' + parts[1], text = present(summaryRaw), translator_notes = notesFor(profile.chapter_summary.note_numbers);
    refs(summaryRaw, profile.chapter_summary.note_numbers);
    if (digest(text) !== profile.chapter_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.chapter_summary.notes_sha256) fail();
    chapter_summary = { ...profile.chapter_summary, text, translator_notes };
  }
  const owned = [...profile.note_numbers, ...(profile.chapter_summary?.note_numbers || []), ...(profile.publisher_divisions || []).flatMap(s => s.note_numbers)];
  if (new Set(owned).size !== owned.length || owned.length !== notes.length || notes.some(n => !owned.includes(n.number))) fail();
  const headings = [...poem.matchAll(/^### /gm)]; if (headings.length !== 1) fail();
  const split = headings[0].index; if (['tha-ap13', 'tha-ap23', 'tha-ap33', 'tha-ap43', 'tha-ap53'].includes(profile.id) !== (split > 0)) fail();
  const preface = poem.slice(0, split), body = poem.slice(split); refs(preface, []); refs(body, profile.note_numbers);
  const publisher_paratext = present(preface), text = present(body), translator_notes = notesFor(profile.note_numbers), paragraphs = text.split(/\n\n+/);
  if (paragraphs.length !== profile.stanza_layout.length + 3 || !paragraphs[0].startsWith(`[${profile.poem}. `)
    || !(profile.id === 'tha-ap34' ? /^This indeed / : profile.id === 'tha-ap48' ? /^Thus indeed, / : /^Thus indeed /).test(paragraphs.at(-2))
    || !(['tha-ap33', 'tha-ap45'].includes(profile.id) ? /^The Legend of / : /^The legend of /).test(paragraphs.at(-1))
    || translator_notes.length !== profile.note_count || digest(text) !== profile.body_sha256
    || digest(JSON.stringify(translator_notes)) !== profile.notes_sha256 || digest(publisher_paratext) !== profile.paratext_sha256) fail();
  for (const [i, stanza] of profile.stanza_layout.entries()) {
    if (!stanza.suffix || paragraphs[i + 1].split('\n').length !== stanza.lines
      || !paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim().endsWith(stanza.suffix)) fail();
  }
  return { title, text, translator_notes, publisher_paratext, ...(chapter_summary ? {chapter_summary} : {}), ...(publisher_divisions ? {publisher_divisions} : {}) };
}
