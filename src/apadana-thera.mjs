/** Separate finite Therā extraction; never dispatch by a shared publisher poem number. */
import { THERA_APADANA_PROFILES } from './apadana-thera-profiles.mjs';
import { digest, plainMarkdown } from './apadana-presentation.mjs';
const fail = () => { throw new Error('Apadāna source metadata or content differs from the reviewed pinned publication.'); };

/** Only the exact Sobhita artifact combines original labels in physical paragraphs. */
export function theraMultiLabelQuotation(paragraph, stanza, profile, index) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  if (profile?.id !== 'tha-ap133' || profile.poem !== 131 || !known
    || ![2, 5].includes(index) || JSON.stringify(stanza) !== JSON.stringify(known.stanza_layout[index])
    || stanza.finite_multi_label !== true || stanza.paragraph !== index + 1
    || stanza.lines !== (index === 2 ? 12 : 8) || stanza.entries.length !== (index === 2 ? 3 : 2)) fail();
  const lines = paragraph.replace(/\[Note \d+\]/g, '').trim().split('\n');
  if (lines.length !== stanza.lines) fail();
  for (const [i, entry] of stanza.entries.entries()) {
    if (entry.line !== (i + 1) * 4 || !entry.suffix || !lines[entry.line - 1].endsWith(entry.suffix)) fail();
    lines[entry.line - 1] = lines[entry.line - 1].slice(0, -entry.suffix.length).trimEnd();
  }
  return lines.join('\n');
}

/** The exact208 artifact shares its heading and first stanza in one paragraph.
 * These five literal selectors preserve the body; they are not a selector grammar.
 * Independent source-review hashes bind the heading, physical paragraph and each
 * selected entry before this helper returns any quotation words.
 */
export function theraJoinedHeadingStanza(paragraphs, stanza, profile, index) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  const entryPins = [
    '43c7716457f885548bdbdfad7513748f2b2158f7071e2cd8ebf7c9327cbce5fa',
    '5239342f4d5ab74d39857c87b18040d5a10a360b2e36d1114bc9fa11a2bdf73c',
    '1315d2eb2c1af78f09d7c0415bbbf0acd60e17509403cfa88518d320b1462013',
    '654b8629d9de28da53723a21c230f836a8c0c4bc21696c893bced0dae7415eb6',
    'b4e1c4f75ab4dd1966238d108fa34c773067eac526cfe2115db1a46259ebb42f',
  ];
  if (profile?.id !== 'tha-ap210' || profile.poem !== 208 || !known
    || JSON.stringify(profile) !== JSON.stringify(known)
    || known.raw_sha256 !== 'd616cbea21dc15386ee4253c6c73e053380e35d62f6e88e8b8052a8d93213a76'
    || !Number.isInteger(index) || index < 0 || index > 4 || known.stanza_layout.length !== 5
    || JSON.stringify(stanza) !== JSON.stringify(known.stanza_layout[index])
    || Object.keys(stanza).sort().join(',') !== 'first_line,lines,local_label,paragraph,publisher_label,suffix'
    || stanza.paragraph !== index || stanza.first_line !== [2, 1, 1, 1, 1][index] || stanza.lines !== 4
    || !Array.isArray(paragraphs) || paragraphs.length !== 7
    || digest(paragraphs[0]) !== '5a66ec001d3cc36f1f1546a3f72cfe92abfda97e3335791af9b818934c13e330'
    || digest(paragraphs[0].split('\n')[0]) !== '2a9ae565ec013f54a8f5d6b036ca95a8a6e3d8a65d955debdc3704999bfb3882') fail();
  const lines = paragraphs[stanza.paragraph].split('\n');
  if (lines.length !== stanza.lines + stanza.first_line - 1) fail();
  const selected = lines.slice(stanza.first_line - 1).join('\n');
  if (digest(selected) !== entryPins[index]) fail();
  return selected;
}

export function parseTheraApadana(raw, profile) {
  const known = THERA_APADANA_PROFILES[profile?.id];
  if (!known || JSON.stringify(profile) !== JSON.stringify(known) || digest(raw) !== known.raw_sha256
    || profile.publisher_chapter !== 'chapter-3') fail();
  // This exact file keeps original order235 beside printed poem234. Its
  // filename/path and raw pin identify it independently of the sorting value.
  let expectedOrder = profile.poem;
  if (profile.id === 'tha-ap236') {
    if (profile.poem !== 234 || profile.path !== '/text/chapter-3/poem-234/'
      || profile.raw_sha256 !== '24e6aa7f6352e29fa850811602ce63084197d3aab66953a203b3cbe53d26a91a') fail();
    expectedOrder = 235;
  }
  const front = raw.match(/^---\n([^]*?)\n---\n/);
  if (!front || !new RegExp(`^order: ${expectedOrder}$`, 'm').test(front[1]) || !/^category: chapter-3$/m.test(front[1])) fail();
  const title = front[1].match(/^title: (.+)$/m)?.[1]; if (title !== profile.title) fail();
  const present = value => plainMarkdown((['tha-ap42', 'tha-ap121'].includes(profile.id) ? value.replace(/<span class="diacritics" data-state="on">(c|cc)<\/span><span class="no-diacritics" data-state="off">(ch|chch)<\/span>/g, (_all, diacritic, alternate) => {
    // Only this exact reviewed artifact has both single and doubled alternatives.
    if (alternate !== (diacritic === 'c' ? 'ch' : 'chch')) fail();
    return diacritic;
  }) : value)
    .replace(/<dfn id="#(?:PTS|BJTS)">([^]*?)<\/dfn>/g, '$1')
    .replace(/<a href="#(?:PTS|BJTS)" class="abbr">([^<>]*)<\/a>/g, '$1')
    .replace(/<span class="diacritics" data-state="on">c<\/span><span class="no-diacritics" data-state="off">ch<\/span>/g, 'c'));
  const rest = raw.slice(front[0].length).trim(), at = rest.search(/^\[\^\d+\]:/m);
  // Only these exact reviewed artifacts have no translator-note definitions.
  if (at < 0 && (!['tha-ap30', 'tha-ap88'].includes(profile.id) || profile.note_count !== 0 || profile.note_numbers.length)) fail();
  let poem = at < 0 ? rest : rest.slice(0, at).trim();
  const entries = [...(at < 0 ? '' : rest.slice(at)).matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
  // Only the exact263 artifact owns these three HTML c/ch displays: its
  // heading and both colophons. Keep their state-on spelling through the
  // existing renderer, refusing duplicate/off-only/foreign-owner controls.
  if (profile.id === 'tha-ap265') {
    if (profile.poem !== 263 || profile.path !== '/text/chapter-3/poem-263/'
      || profile.raw_sha256 !== 'bd26ab528dfcfbb8a74ac61ebb3c313803c0f90b0eb686de5829a9ab0f383755') fail();
    const token = '<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>';
    const checkHtmlPairs = (value, count) => {
      if (value.split(token).length !== count + 1
        || /<span\b[^>]*\bclass="(?:no-)?diacritics"/.test(value.split(token).join(''))) fail();
    };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== 7) fail();
    for (const [i, paragraph] of paragraphs.entries()) checkHtmlPairs(paragraph, [0, 5, 6].includes(i) ? 1 : 0);
    for (const entry of entries) checkHtmlPairs(entry[2], 0);
  }
  // These new exact artifacts use only the established Pandoc display syntax.
  // Bind every reviewed pair to its source paragraph or note before rendering.
  if (['tha-ap238', 'tha-ap242'].includes(profile.id)) {
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const checkPairs = (value, expected) => {
      let remaining = value;
      for (const token of expected) {
        if (remaining.split(token).length !== 2) fail();
        remaining = remaining.replace(token, '');
      }
      if (/\{\.(?:no-)?diacritics\b/.test(remaining)) fail();
    };
    if (profile.id === 'tha-ap238') {
      const paragraphs = poem.split('\n\n');
      if (paragraphs.length !== 7) fail();
      for (const [i, paragraph] of paragraphs.entries()) checkPairs(paragraph, i === 3 ? [upper] : []);
    } else checkPairs(poem, []);
    for (const [i, entry] of entries.entries()) {
      checkPairs(entry[2], i === 1 ? (profile.id === 'tha-ap238' ? [lower, upper] : [lower]) : []);
    }
  }
  // Publisher253/254/256 have these fourteen exact source-owned display pairs.
  // Preserve the reviewed heading/colophon and stanza coordinates, including
  // duplicate lower-case pairs inside individual notes; accept no extra pair.
  if (['tha-ap255', 'tha-ap256', 'tha-ap258'].includes(profile.id)) {
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const checkPairs = (value, expected) => {
      let remaining = value;
      for (const [token, count] of expected) {
        if (remaining.split(token).length !== count + 1) fail();
        remaining = remaining.split(token).join('');
      }
      if (/\{\.(?:no-)?diacritics\b/.test(remaining)) fail();
    };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== (profile.id === 'tha-ap258' ? 6 : 7)) fail();
    for (const [i, paragraph] of paragraphs.entries()) {
      const expected = profile.id === 'tha-ap258' ? (i === 1 ? [[upper, 1]] : [])
        : [0, 5, 6].includes(i) ? [[profile.id === 'tha-ap255' ? upper : lower, 1]] : [];
      checkPairs(paragraph, expected);
    }
    for (const [i, entry] of entries.entries()) {
      const expected = profile.id === 'tha-ap255' ? (i === 0 ? [[upper, 1], [lower, 2]] : i === 2 ? [[lower, 2]] : [])
        : profile.id === 'tha-ap256' && i === 0 ? [[upper, 1], [lower, 1]] : [];
      checkPairs(entry[2], expected);
    }
  }
  // Six reviewed321/323-326/329 artifacts use only these source-owned
  // Pandoc alternatives. Existing presentation keeps state-on spelling; these
  // finite owners do not authorize new markup, moved notes or chapter text.
  if (['tha-ap323', 'tha-ap325', 'tha-ap326', 'tha-ap327', 'tha-ap328', 'tha-ap331'].includes(profile.id)) {
    const lower = '[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}';
    const upper = '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}';
    const counts = { 'tha-ap323': 10, 'tha-ap325': 7, 'tha-ap326': 13, 'tha-ap327': 9, 'tha-ap328': 7, 'tha-ap331': 11 };
    const paragraphs = poem.split('\n\n');
    if (paragraphs.length !== counts[profile.id]) fail();
    const check = (value, token) => {
      if (token && value.split(token).length !== 2) fail();
      if (/\{\.(?:no-)?diacritics\b/.test(token ? value.replace(token, '') : value)) fail();
    };
    for (const [i, paragraph] of paragraphs.entries()) {
      const token = profile.id === 'tha-ap323' && i === 6 ? lower
        : profile.id === 'tha-ap327' && i === 1 ? upper
        : profile.id === 'tha-ap331' && [0, 9, 10].includes(i) ? lower : undefined;
      check(paragraph, token);
    }
    for (const entry of entries) check(entry[2], profile.id === 'tha-ap326' && entry[1] === '7' ? lower : undefined);
  }
  // Publisher226 alone owns these two exact paired note displays. The existing
  // presentation rule keeps the state-on spelling; no new grammar is accepted.
  const pairedNotes = profile.id === 'tha-ap228' ? {
    1: '[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}',
    3: '[cc]{.diacritics data-state=on}[chch]{.no-diacritics data-state=off}',
  } : undefined;
  if (pairedNotes && /\{\.(?:no-)?diacritics\b/.test(poem)) fail();
  const notes = entries.map((entry, i) => {
    if (Number(entry[1]) !== i + 1 || !entry[2].trim()) fail();
    if (pairedNotes) {
      const expected = pairedNotes[i + 1];
      if (expected && entry[2].split(expected).length !== 2
        || /\{\.(?:no-)?diacritics\b/.test(expected ? entry[2].replace(expected, '') : entry[2])) fail();
    }
    return { number: i + 1, text: present(entry[2]) };
  });
  const notesFor = numbers => numbers.map(number => { const note = notes[number - 1]; if (!note || note.number !== number) fail(); return note; });
  const refs = (value, numbers) => {
    const found = [...value.matchAll(/\[\^(\d+)\]/g)].map(m => Number(m[1]));
    if (found.some(n => !numbers.includes(n)) || numbers.some(n => !found.includes(n))) fail();
  };
  let editorial_gap;
  if (profile.editorial_gap) {
    // Only this reviewed raw artifact has an independently owned editorial gap.
    // Its original wording is read live and verified by the sidecar hash, never supplied here.
    const scope = profile.editorial_gap;
    if (profile.id !== 'tha-ap44' || profile.poem !== 42
      || scope.kind !== 'publisher_editorial_gap' || scope.parent_id !== profile.id
      || scope.placement !== 'before_local_label' || scope.after_local_label !== '25'
      || scope.after_publisher_label !== '1164' || scope.before_local_label !== '26'
      || scope.before_publisher_label !== '1165' || JSON.stringify(scope.note_numbers) !== '[12]'
      || Object.keys(scope).length !== 10) fail();
    const parts = poem.split('\n\n'), marker = parts[26];
    if (parts.length !== 32 || !marker || marker.length !== 16 || marker.includes('\n')) fail();
    const before = present(parts[25]).replace(/\[Note \d+\]/g, '').trim();
    const after = present(parts[27]).replace(/\[Note \d+\]/g, '').trim();
    if (!before.endsWith('(25) [1164]') || !after.endsWith('(26) [1165]')) fail();
    refs(marker, scope.note_numbers);
    const text = present(marker), translator_notes = notesFor(scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    editorial_gap = { ...scope, text, translator_notes };
    poem = [...parts.slice(0, 26), ...parts.slice(27)].join('\n\n');
  }
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
      marker = ({17: '\n\nThe Third Recitation Portion is Finished.', 30: '\n\nThe Fourth Recitation Portion.', 74: '\n\nThe Sixth Recitation Portion.'})[profile.poem];
      if (!marker || !poem.endsWith(marker) || poem.split(marker).length !== 2
        || scope.parent_id !== profile.id || scope.placement !== ([17, 74].includes(profile.poem) ? 'after_poem' : 'after_chapter_summary')) fail();
      poem = poem.slice(0, -marker.length);
    }
    const text = present(marker), translator_notes = notesFor(scope.note_numbers);
    refs(marker, scope.note_numbers);
    if (digest(text) !== scope.body_sha256 || digest(JSON.stringify(translator_notes)) !== scope.notes_sha256) fail();
    publisher_divisions = [{ ...scope, text, translator_notes }];
  }
  let collection_summary;
  if (profile.collection_summary) {
    // Each hundred's endmatter is distinct from its separately owned chapter.
    if (!((profile.id === 'tha-ap102' && profile.poem === 100)
      || (profile.id === 'tha-ap202' && profile.poem === 200))) fail();
    const marker = '\n\nThen there is the Summary of Chapters:\n\n', parts = poem.split(marker);
    if (parts.length !== 2) fail();
    poem = parts[0];
    const summaryRaw = marker.trim() + '\n\n' + parts[1], text = present(summaryRaw), translator_notes = notesFor(profile.collection_summary.note_numbers);
    refs(summaryRaw, profile.collection_summary.note_numbers);
    if (digest(text) !== profile.collection_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.collection_summary.notes_sha256) fail();
    collection_summary = { ...profile.collection_summary, text, translator_notes };
  }
  let chapter_summary;
  if (profile.chapter_summary) {
    if (!['tha-ap22', 'tha-ap32', 'tha-ap42', 'tha-ap52', 'tha-ap62', 'tha-ap82', 'tha-ap92', 'tha-ap102', 'tha-ap112', 'tha-ap122', 'tha-ap132', 'tha-ap152', 'tha-ap162', 'tha-ap172', 'tha-ap182', 'tha-ap192', 'tha-ap202', 'tha-ap212', 'tha-ap222', 'tha-ap252', 'tha-ap232', 'tha-ap242', 'tha-ap272', 'tha-ap312'].includes(profile.id)) fail();
    // Publisher230 joins its summary heading to the verse paragraph. Keep the
    // exact original hard break, with no synthetic blank paragraph after it.
    const marker = profile.id === 'tha-ap232' ? '\n\nThe Summary:  \n' : '\n\nThe Summary:\n\n';
    const parts = poem.split(marker); if (parts.length !== 2) fail();
    poem = parts[0];
    const summaryRaw = profile.id === 'tha-ap232' ? marker.slice(2) + parts[1] : marker.trim() + '\n\n' + parts[1];
    const text = present(summaryRaw), translator_notes = notesFor(profile.chapter_summary.note_numbers);
    refs(summaryRaw, profile.chapter_summary.note_numbers);
    if (digest(text) !== profile.chapter_summary.body_sha256 || digest(JSON.stringify(translator_notes)) !== profile.chapter_summary.notes_sha256) fail();
    chapter_summary = { ...profile.chapter_summary, text, translator_notes };
  }
  const owned = [...profile.note_numbers, ...(profile.editorial_gap?.note_numbers || []), ...(profile.chapter_summary?.note_numbers || []), ...(profile.collection_summary?.note_numbers || []), ...(profile.publisher_divisions || []).flatMap(s => s.note_numbers)];
  if (new Set(owned).size !== owned.length || owned.length !== notes.length || notes.some(n => !owned.includes(n.number))) fail();
  // Publisher101 alone uses ## for its poem heading, beside a separate ## preface.
  const headings = [...poem.matchAll(profile.id === 'tha-ap103' ? /^## \\\[101\. /gm : /^### /gm)]; if (headings.length !== 1) fail();
  const split = headings[0].index; if (['tha-ap13', 'tha-ap23', 'tha-ap33', 'tha-ap43', 'tha-ap53', 'tha-ap63', 'tha-ap73', 'tha-ap83', 'tha-ap93', 'tha-ap103', 'tha-ap113', 'tha-ap123', 'tha-ap133', 'tha-ap143', 'tha-ap153', 'tha-ap163', 'tha-ap173', 'tha-ap183', 'tha-ap193', 'tha-ap203', 'tha-ap213', 'tha-ap243', 'tha-ap223', 'tha-ap233', 'tha-ap253', 'tha-ap263', 'tha-ap273', 'tha-ap283', 'tha-ap323'].includes(profile.id) !== (split > 0)) fail();
  const preface = poem.slice(0, split), body = poem.slice(split); refs(preface, []); refs(body, profile.note_numbers);
  const publisher_paratext = present(preface), text = present(body), translator_notes = notesFor(profile.note_numbers), paragraphs = text.split(/\n\n+/);
  const joinedColophons = ['tha-ap134', 'tha-ap184'].includes(profile.id);
  const colophons = joinedColophons ? paragraphs.at(-1).split('\n') : paragraphs.slice(-2);
  if (paragraphs.length !== profile.stanza_layout.length + (joinedColophons || profile.id === 'tha-ap210' ? 2 : 3) || !paragraphs[0].startsWith(`[${profile.poem}. `)
    || colophons.length !== 2
    || !(profile.id === 'tha-ap34' ? /^This indeed / : profile.id === 'tha-ap48' ? /^Thus indeed, / : /^Thus indeed /).test(colophons[0])
    || !(['tha-ap33', 'tha-ap45'].includes(profile.id) ? /^The Legend of / : /^The legend of /).test(colophons[1])
    || translator_notes.length !== profile.note_count || digest(text) !== profile.body_sha256
    || digest(JSON.stringify(translator_notes)) !== profile.notes_sha256 || digest(publisher_paratext) !== profile.paratext_sha256) fail();
  for (const [i, stanza] of profile.stanza_layout.entries()) {
    if (stanza.finite_multi_label) { theraMultiLabelQuotation(paragraphs[i + 1], stanza, profile, i); continue; }
    const entry = profile.id === 'tha-ap210' ? theraJoinedHeadingStanza(paragraphs, stanza, profile, i) : paragraphs[i + 1];
    if (!stanza.suffix || entry.split('\n').length !== stanza.lines
      || !entry.replace(/\[Note \d+\]/g, '').trim().endsWith(stanza.suffix)) fail();
  }
  return { title, text, translator_notes, publisher_paratext, ...(editorial_gap ? {editorial_gap} : {}), ...(chapter_summary ? {chapter_summary} : {}), ...(collection_summary ? {collection_summary} : {}), ...(publisher_divisions ? {publisher_divisions} : {}) };
}
