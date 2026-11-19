import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { plainMarkdown, parseApadana, quotationText, validateLink } from '../src/apadana.mjs';
import { APADANA_PROFILES, APADANA_LICENSE, isApadanaRawUrl } from '../src/apadana-profiles.mjs';
import { readBundled } from '../src/bundled-data.mjs';
import { gunzipSync } from 'node:zlib';
const manifest = JSON.parse(readFileSync(new URL('../server/data/apadana.json', import.meta.url), 'utf8'));

// All wording in these parser fixtures is invented; publisher translation bodies are not bundled.
const poem = (p, note='[^1]: an editorial definition') => `---\ntitle: Fixture\ncategory: chapter-4\norder: ${p.poem}\n---\n\n### \\[${p.poem}. Fi[x]{.diacritics data-state=on}[xx]{.no-diacritics data-state=off}ture[^1]\\]\n\nInvented \\[addition\\] line. (${1}) \\[${p.verses[0]}\\]\n\nThus indeed Fixture spoke these verses.\n\nThe legend of Fixture is finished.\n\n${note}\n`;

test('diacritic alternatives never consume surrounding bracketed headings or interpolation', () => {
  assert.equal(plainMarkdown('### \\[7. Kaṭa[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}chubhikkhadāyikā[^1]\\]'), '[7. Kaṭacchubhikkhadāyikā[Note 1]]');
  assert.equal(plainMarkdown('### \\[9. Pañ[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}adīpikā[^1]\\]'), '[9. Pañcadīpikā[Note 1]]');
  assert.equal(plainMarkdown('\\[a [c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off} addition\\]'), '[a c addition]');
  assert.throws(() => plainMarkdown('[a[b]]{.diacritics data-state=on}[b]{.no-diacritics data-state=off}'), /differs/);
});

test('parser retains both numbering systems and separates substantive stanzas from editorial material', () => {
  const p = { poem: 7, verses: [60,60], note_count: 1 }, value = parseApadana(poem(p), p);
  assert.equal(value.text.split('\n\n')[0], '[7. Fixture[Note 1]]');
  assert.match(value.text, /Invented \[addition\] line\. \(1\) \[60\]/);
  assert.equal(value.publisher_paratext, '');
  assert.deepEqual(value.translator_notes, [{ number:1, text:'an editorial definition' }]);
  assert.equal(quotationText(value), 'Invented [addition] line.');
});

test('poem-one preface is separate and contiguous note definitions remain independent', () => {
  const p = { poem:1, verses:[1,1], note_count:3 };
  const raw = poem(p, '[^1]: first\n[^2]: second\n[^3]: third')
    .replace('### ', 'Preface[^2]\n\n# Fixture chapter\n\n### ')
    .replace('(1) \\[1\\]', '(1) \\[1\\][^3]');
  const value = parseApadana(raw,p);
  assert.equal(value.publisher_paratext,'Preface[Note 2]\n\nFixture chapter');
  assert.equal(value.translator_notes.length,3);
  assert.match(value.text,/\[1\]\[Note 3\]/);
  assert.equal(quotationText(value),'Invented [addition] line.');
});

test('missing or reordered stanzas, undefined notes and unexpected summaries fail closed', () => {
  const p = { poem:7,verses:[60,60],note_count:1 }, raw=poem(p);
  for (const changed of [raw.replace('\\[60\\]','\\[61\\]'),raw.replace('(1)','(2)'),raw.replace('[^1]:','[^2]:'),raw.replace('Thus indeed','An unwanted paragraph.\n\nThus indeed')]) assert.throws(()=>parseApadana(changed,p),/differs/);
});

test('finite metadata binds each whole root, provenance and rights with no bodies bundled', () => {
  assert.equal(APADANA_LICENSE,'CC BY-NC-SA 4.0');
  assert.deepEqual(Object.keys(manifest.links),[...Array.from({length:40},(_,i)=>'thi-ap'+(i+1)),...Array.from({length:30},(_,i)=>'tha-ap'+(i+13)),'tha-ap43','tha-ap45','tha-ap46','tha-ap47','tha-ap48','tha-ap49','tha-ap50','tha-ap51','tha-ap52','tha-ap53','tha-ap54','tha-ap55','tha-ap56','tha-ap57','tha-ap58','tha-ap59','tha-ap60','tha-ap61','tha-ap62']);
  const c=JSON.parse(gunzipSync(readBundled(new URL('../server/data/canon.json.gz',import.meta.url))));
  for(const [id,link]of Object.entries(manifest.links)){
    const u=c.units.find(u=>u.id===id),b=c.books[u.book];
    assert.equal(validateLink(link,id,u,b).id,id);
    assert.throws(()=>validateLink(link,id),/differs/);
    for(const key of ['raw_sha256','body_sha256','notes_sha256','root_sha256','translation_revision','translator','license','title','reference','url','mapping_notes']) assert.throws(()=>validateLink({...link,[key]:'changed'},id,u,b),/differs/);
    for(const key of ['partial_scope','shared_scope','section','parts'])assert.throws(()=>validateLink({...link,[key]:null},id,u,b),/differs/);
    for(const key of ['text','translator_notes','publisher_paratext'])assert.equal(Object.hasOwn(link,key),false);
    assert.equal(isApadanaRawUrl(link.raw_url),true);
    for(const changed of [link.raw_url+'?x=1',link.raw_url.replace(manifest.source.commit,'main'),link.raw_url.replace('https:','http:'),link.raw_url.replace(/poem-\d{3}\.md/,'poem-042.md')])if(changed!==link.raw_url)assert.equal(isApadanaRawUrl(changed),false);
  }
});

test('actual pinned extraction can be independently replayed without retaining publisher fixtures', { skip:!process.env.APADANA_SOURCE_CHECKOUT }, () => {
  const historicalIds=new Set([...Array.from({length:40},(_,i)=>'thi-ap'+(i+1)),...Array.from({length:20},(_,i)=>'tha-ap'+(i+13))]);
  for(const p of Object.values(APADANA_PROFILES).filter(p=>historicalIds.has(p.id))){
    const raw=readFileSync(`${process.env.APADANA_SOURCE_CHECKOUT}/src/_poems/${p.publisher_chapter||'chapter-4'}/poem-${String(p.poem).padStart(3,'0')}.md`,'utf8');
    const value=parseApadana(raw,p);
    assert.equal(value.translator_notes.length,p.note_count);
    if(p.stanza_layout) assert.equal(value.text.split(/\n\n/).length,p.stanza_layout.length+3);
    else assert.equal(value.text.split(/\n\n/).filter(x=>/\(\d+\)\s*\[\d+(?:-\d+)?\](?:\[Note \d+\])*$/.test(x)).length,p.verses[1]-p.verses[0]+1);
    assert.equal(quotationText(value).includes('Thus indeed'),false);
    if(p.poem===1)assert.match(value.text,/\(16\) \[16\]\[Note 20\]/);
    if(p.poem===7)assert.equal(value.text.split('\n')[0],'[7. Kaṭacchubhikkhadāyikā[Note 1]]');
    if(p.poem===9)assert.equal(value.text.split('\n')[0],'[9. Pañcadīpikā[Note 1]]');
  }
});
