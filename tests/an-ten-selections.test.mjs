// Independent 2026-11-19 source-review pins; publisher bodies remain in optional local artifacts.
import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {liveCache} from '../src/cache.mjs';
import {plainText} from '../src/http.mjs';
import {canonBeforeTheraPairGzip} from './helpers/canon-before-thera-pair-gzip.mjs';
import {extractAtiSection} from '../src/ati-sections.mjs';
import {AN_TEN_SECTION_PROFILE} from '../src/ati-section-profiles.mjs';
import {sectionHash, reviewedSectionLink, retainedAtiShared, assertRegisteredSection, validateSectionRegistry} from '../src/ati-section-registry.mjs';
import {getAtiText, translationCoverage} from '../src/providers.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {dailyText, cyclePosition} from '../src/daily.mjs';
import {buildIndex, toCsv} from '../scripts/export-index.mjs';
import {buildCoverage} from '../scripts/coverage.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';

const reviewed = [
  {
    "unit_id": "an1.45",
    "path": "/tipitaka/an/an01/an01.045-046.than",
    "parent_title": "Udakarahaka Suttas: A Pool of Water",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      1
    ],
    "actual_printed_label": "45",
    "selection_raw_span_sha256": "7f493fcdedd386274a3a537ad0db8bdc3b5e6bd8e6988bae975f0a4b6993b622",
    "text_characters": 564,
    "text_sha256": "4b20c4c0a6d121f860ef0e2e434c101e687a82de85e80efbf99ef04e78e3c3ca",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "c6f4d4898e1844091dabb21aa338b492be115913f2af077c2bd57708890a8bfb",
    "root_blocks_sha256": "21e8b78274e211f0d7d71ad765178e166fa2114ba78cd159dec9e12b6d436c63",
    "first_ref": "an1.45/1",
    "last_ref": "an1.45/1",
    "selected_pali_scope_sha256": "2f719ca4d753bb7f698ec80b17a3fe5bbb17232bf78e959e9025438737afe560",
    "untranslated_paratext": [
      {
        "ref": "an1.45/1",
        "text": "Pañcamaṃ."
      }
    ]
  },
  {
    "unit_id": "an1.46",
    "path": "/tipitaka/an/an01/an01.045-046.than",
    "parent_title": "Udakarahaka Suttas: A Pool of Water",
    "source_fragment": null,
    "source_chapter_ordinal": 2,
    "source_paragraph_ordinals": [
      1
    ],
    "actual_printed_label": "46",
    "selection_raw_span_sha256": "65cc496cd8a0ef11b639b4922a2234fe7a8e50f3d793d102f463381b2b0d4184",
    "text_characters": 571,
    "text_sha256": "e8c31f06a537c1b0846b3088bbcbab71459cba9afffd958ff99606757e9d5c1f",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "c6f4d4898e1844091dabb21aa338b492be115913f2af077c2bd57708890a8bfb",
    "root_blocks_sha256": "108aa53d9914b95f05f75db24bd463ec0035f263442fff330e36e1c813d4be16",
    "first_ref": "an1.46/1",
    "last_ref": "an1.46/1",
    "selected_pali_scope_sha256": "1ba91f604fb2bc77c05cafdb7e84aea4aa25df9bb65e58c893c71d47c58762c3",
    "untranslated_paratext": [
      {
        "ref": "an1.46/1",
        "text": "Chaṭṭhaṃ."
      }
    ]
  },
  {
    "unit_id": "an1.49",
    "path": "/tipitaka/an/an01/an01.049.than",
    "parent_title": "Pabhassara Sutta: Luminous",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      1
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "0a226a8829e182dfeccbe1ff3d259c8729e5d6d32545e55d8e6ea70df571b820",
    "text_characters": 74,
    "text_sha256": "ad5fff15a7880169782c84f9658b47bd204c6f5f20441256b744193d20f84f87",
    "owned_note_count": 1,
    "owned_notes_sha256": "840f501605f6c795e2f0cb9fd995a350933b189389060cc36d36ff87cbb1e91a",
    "notice_sha256": "3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe",
    "root_blocks_sha256": "32e0cf65219331cd3065f5066a25d862d0413b9b562b9e7daf8fa8f76668ede9",
    "first_ref": "an1.49/1",
    "last_ref": "an1.49/1",
    "selected_pali_scope_sha256": "da63de4bf7ba0963a8da88d9316061f7089b1afeca12db8849021fe6f81ea9aa",
    "untranslated_paratext": [
      {
        "ref": "an1.49/1",
        "text": "Navamaṃ."
      }
    ]
  },
  {
    "unit_id": "an1.50",
    "path": "/tipitaka/an/an01/an01.049.than",
    "parent_title": "Pabhassara Sutta: Luminous",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      2
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "50b7d9023186a4cace053a7c760e9ca19fc323f0c53281f01c39db356ada613f",
    "text_characters": 74,
    "text_sha256": "18ad64a10133bdb9e09d98c83774fa323b7cbd27555dae986307500ca85c4776",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe",
    "root_blocks_sha256": "0abbf89c4709ec29b40eff8f601e867ed5e248d6109b8c76a215621edfc8b997",
    "first_ref": "an1.50/1",
    "last_ref": "an1.50/1",
    "selected_pali_scope_sha256": "b500aa50ce6c8e062f4a4c06a9b0db48b2e828c29ee59a4e96cb474804fdbbe2",
    "untranslated_paratext": [
      {
        "ref": "an1.50/1",
        "text": "Dasamaṃ."
      },
      {
        "ref": "an1.50/2",
        "text": "Paṇihitaacchavaggo pañcamo."
      }
    ]
  },
  {
    "unit_id": "an1.51",
    "path": "/tipitaka/an/an01/an01.049.than",
    "parent_title": "Pabhassara Sutta: Luminous",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      3
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "5a96be7e968d165a4385055a133e9adb7ad9c942e1ce68763575237e40509bd1",
    "text_characters": 276,
    "text_sha256": "ae80bff0ea5fc017aadbff57405bc7e35af56f6dde137aa085ae3036b75ce7b4",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe",
    "root_blocks_sha256": "fbb4492966f6ee3a7481903ff0e60c965b5d3551fe6698e1efdd3ec0a22e6e0d",
    "first_ref": "an1.51/2",
    "last_ref": "an1.51/2",
    "selected_pali_scope_sha256": "fca227ef0299b6a89b6d166c687f088331c705b41ae071d80af143fd5302ea7f",
    "untranslated_paratext": [
      {
        "ref": "an1.51/2",
        "text": "Paṭhamaṃ."
      },
      {
        "ref": "an1.51/1",
        "text": "6. Accharāsaṅghātavaggo"
      }
    ]
  },
  {
    "unit_id": "an1.52",
    "path": "/tipitaka/an/an01/an01.049.than",
    "parent_title": "Pabhassara Sutta: Luminous",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      4
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "886ffc5dd17c48f9f5f51a3dc441d2a463acdd460cf5ac13f53864861d84d525",
    "text_characters": 280,
    "text_sha256": "075c928e14fee7f87e86859fbf33ecfae801e7ed94084f30346f699a3886f7c4",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe",
    "root_blocks_sha256": "851dd7a4be6d3a4e6eb10937b6e29d4b1a44587869f33c9fa107868e1c52f84f",
    "first_ref": "an1.52/1",
    "last_ref": "an1.52/1",
    "selected_pali_scope_sha256": "2c9a379cadc54f65467f52d588d2807ae13e99ff2400dcb5868257b5f5e36007",
    "untranslated_paratext": [
      {
        "ref": "an1.52/1",
        "text": "Dutiyaṃ."
      }
    ]
  },
  {
    "unit_id": "an2.32",
    "path": "/tipitaka/an/an02/an02.031.than",
    "parent_title": "Kataññu Suttas: Gratitude",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      1,
      2,
      3
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "0f3541d68a3611e907196fc7ad356f47b634dccd62a9e52a0bd0d6cee372e4be",
    "text_characters": 610,
    "text_sha256": "bbddb911bf7cde2c3168e7a43a9227ee89dd5fc9a2a16d691f23e437e2e720a1",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "693ec730c062294a3570512540f883b863bb57f47765b3782199a9a404977d60",
    "root_blocks_sha256": "42b3a5a794cdbf71667e74d9f3bb8ef8904b26fb4b5ceef1452469ab9285886f",
    "first_ref": "an2.32/2",
    "last_ref": "an2.32/3",
    "selected_pali_scope_sha256": "23f8e4b82e9cc192acac469126732fdd882d081eafd7b9c59367fec471a31396",
    "untranslated_paratext": [
      {
        "ref": "an2.32/1",
        "text": "4. Samacittavaggo"
      }
    ]
  },
  {
    "unit_id": "an2.33",
    "path": "/tipitaka/an/an02/an02.031.than",
    "parent_title": "Kataññu Suttas: Gratitude",
    "source_fragment": "s32",
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      4
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "090c465b0e297ddf3121fd4485a8d131908e7e3541bf25a0ec6e13972e96d4b2",
    "text_characters": 1110,
    "text_sha256": "bdc350b08c88e3fdcae4a5eda3d6dfe8673be80f57cc2e92cc8f481a3e4b5716",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "693ec730c062294a3570512540f883b863bb57f47765b3782199a9a404977d60",
    "root_blocks_sha256": "cc7ab0271a3323aaff14bc4c016b4a1e48f381cc3370808b53528450bf756ce1",
    "first_ref": "an2.33/1",
    "last_ref": "an2.33/1",
    "selected_pali_scope_sha256": "37bc151dc2c13035409dd7615d38f0b756f14e9f549ac92aa0d78eaa6c406fb2",
    "untranslated_paratext": []
  },
  {
    "unit_id": "an2.125",
    "path": "/tipitaka/an/an02/an02.125-126.than",
    "parent_title": "Ghosa Suttas: Voice",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      1
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "18f41811a7fb42925ae16c5d3526bd1fede3978bc3d172c7b39ad3a4a9a43120",
    "text_characters": 191,
    "text_sha256": "87b4f5adaddcb888ce05e057814287bd06c893fdb684d5a3621abe89273a40d1",
    "owned_note_count": 1,
    "owned_notes_sha256": "96af177b56cdb5e8517636272a1621ebc901da3c027afdef3b8f30a86cc158c7",
    "notice_sha256": "d96963652b5b6f051df62ac6a54047af61d5f715b1dd3bcfdab4e62bc0b04de7",
    "root_blocks_sha256": "116b49764bc4e618f546bf7e8c370d0419bf62fc0f7ab2a656852557063031f5",
    "first_ref": "an2.125/1",
    "last_ref": "an2.125/1",
    "selected_pali_scope_sha256": "16f04b3b880ff406ec05d72bf4965b2430e89945fcc30dfb99386c73d01b021d",
    "untranslated_paratext": []
  },
  {
    "unit_id": "an2.126",
    "path": "/tipitaka/an/an02/an02.125-126.than",
    "parent_title": "Ghosa Suttas: Voice",
    "source_fragment": null,
    "source_chapter_ordinal": 1,
    "source_paragraph_ordinals": [
      2
    ],
    "actual_printed_label": null,
    "selection_raw_span_sha256": "617aac9b45961c34a805d09f86e4d156d4f49bc60fe25d188effd08d7d4810b2",
    "text_characters": 189,
    "text_sha256": "6220a0c6952b7cb290ba2fb9c05ac68f15bf125c009dbed183113910613f1409",
    "owned_note_count": 0,
    "owned_notes_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
    "notice_sha256": "d96963652b5b6f051df62ac6a54047af61d5f715b1dd3bcfdab4e62bc0b04de7",
    "root_blocks_sha256": "1712705eecbb99f5895c430d2f38ebc3e308151a05136948d4340a04ac55f1fa",
    "first_ref": "an2.126/1",
    "last_ref": "an2.126/1",
    "selected_pali_scope_sha256": "45b35310f8a164866acbc2540c8d192548ff6632b1499a1bb09142323b2ba17f",
    "untranslated_paratext": []
  }
];
const clone = value => JSON.parse(JSON.stringify(value));
const hash = value => createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
const registry = JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json','utf8'));
const rows = registry.links.filter(row => row.section.profile === AN_TEN_SECTION_PROFILE);
const sourceRoot = process.env.PALI_ATI_SECTIONS_SOURCE_DIR;
const source = path => readFileSync(join(sourceRoot,path.slice(1)+'.html'),'utf8');
const exact = row => `ati:${row.path}::selection:${row.unit_id}`;
const unit = row => canon.load().byId.get(row.unit_id);
const validate = (r=registry,t=canon.load().translations,c=canon.load().canon) => validateSectionRegistry(r,c,t,u=>canon.segmentsFromCorpus(u,c));
const legacy = row => Object.entries(canon.load().translations).flatMap(([owner,links])=>links.filter(l=>l.path===row.path && l.shared_scope).map(link=>({owner,link})))[0];
const oldFetch = globalThis.fetch;
afterEach(()=>{globalThis.fetch=oldFetch;liveCache.clear();});
function provider() {
  const requests=[];
  globalThis.fetch=async url=>{const u=new URL(url);requests.push(u.href);assert.equal(u.hostname,'accesstoinsight.org');assert.equal(u.hash,'');const path=u.pathname.replace(/\.html$/,'');assert.ok(rows.some(r=>r.path===path),'unexpected provider: '+u.href);return new Response(source(path),{status:200});};
  return requests;
}
// Independent literal structure selector: direct scripture paragraphs precede notes/See-also.
// It does not use implementation profiles, section extractor or generated English bodies.
function independentlySelect(review) {
  const raw=source(review.path), chunk=english.atiContent(raw);
  const beforeEditorial=chunk.split(/<div class="(?:notes|seeAlso)">/)[0];
  const paragraphs=[...beforeEditorial.matchAll(/<p>([^]*?)<\/p>/g)];
  assert.equal(paragraphs.length,review.path.includes('045-046')||review.path.includes('125-126')?2:4);
  const indexes=review.path.includes('045-046')?[review.source_chapter_ordinal-1]:review.source_paragraph_ordinals.map(n=>n-1);
  const chosen=indexes.map(i=>paragraphs[i]);
  const bodies=chosen.map(p=>{
    let text=p[1].replace(/<a class="noteTag"[^>]*>[^]*?<\/a>/g,'').replace(/<span class="altID">[^]*?<\/span>/g,'');
    if(review.actual_printed_label){assert.ok(text.startsWith(review.actual_printed_label+'. '));text=text.slice(review.actual_printed_label.length+1);}
    return plainText(text);
  });
  const note=review.owned_note_count?[{number:1,text:plainText(chunk.match(/<dd>([^]*?)<\/dd>/)[1])}]:[];
  const span=beforeEditorial.slice(chosen[0].index,chosen.at(-1).index+chosen.at(-1)[0].length);
  return {raw,text:bodies.join('\n\n'),translator_notes:note,span};
}

test('ten appended bindings preserve all 35 old sections, 22 partials, shared registry, corpus and every previous translation',()=>{
  assert.equal(rows.length,10);assert.deepEqual(rows.map(r=>r.unit_id),reviewed.map(r=>r.unit_id));
  assert.equal(registry.links.length,45);
  assert.equal(hash(stable(registry.links.filter(r=>r.section.profile!==AN_TEN_SECTION_PROFILE))),'5445cc945d6c9247a0676ddf4413b551e13cf9b9b9aa5b324bfd9f070d20ce9f');
  for(const [file,pin] of [['scripts/canon/reviewed_partial_pages.json','3ceb1f0d8f827f60ee461b1960c4e31d9845950ad8adab89057937755e2a79dd'],['scripts/canon/reviewed_shared_pages.json','9cbc197c272a7685c45dd1c217100270a369917e2e28ccf758a829f4e23e3a2e']])assert.equal(hash(stable(JSON.parse(readFileSync(file,'utf8')))),pin,file);
  assert.equal(hash(canonBeforeTheraPairGzip(canon.load().canon)),'a1b11469abc0d0e190f9bbe609c67d96225e1d3e370cd26775355fa15bdf6c96');
  const translations=JSON.parse(readFileSync('server/data/translations.json','utf8'));let removed=0;
  for(const [id,links]of Object.entries(translations)){translations[id]=links.filter(l=>{if(l.section?.profile===AN_TEN_SECTION_PROFILE){removed++;return false;}return true;});if(!translations[id].length)delete translations[id];}
  assert.equal(removed,10);assert.equal(hash(stable(translations)),'8a5543848d7f08a2a6ef5bb98909bd967de9da0e54daccf33e17174c0c2455f2');
  assert.deepEqual(registry,JSON.parse(readFileSync('server/data/reviewed-ati-sections.json','utf8')));assert.doesNotThrow(()=>validate());
});

test('independent owner, rawroot, substantive segment and paratext pins remain exact; internal IDs never invent publisher fragments',()=>{
  for(const review of reviewed){const row=rows.find(r=>r.unit_id===review.unit_id),u=unit(row),segments=canon.segments(u).map(({ref,type,text})=>({ref,type,text}));
    assert.equal(row.path,review.path);assert.equal(row.anchor,review.source_fragment);assert.equal(row.section.heading,null);assert.equal(row.english_title,review.parent_title);
    assert.equal(row.section.selection_id,u.id);assert.equal(row.section.first_ref,review.first_ref);assert.equal(row.section.last_ref,review.last_ref);assert.deepEqual(row.untranslated_paratext,review.untranslated_paratext);
    const first=segments.findIndex(s=>s.ref===review.first_ref),last=segments.findIndex(s=>s.ref===review.last_ref);
    assert.equal(sectionHash(segments.slice(first,last+1)),review.selected_pali_scope_sha256);
    assert.equal(sectionHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),review.root_blocks_sha256);
    assert.equal(row.root.root_blocks_sha256,review.root_blocks_sha256);assert.equal(row.section.pali_sha256,review.selected_pali_scope_sha256);
    const choices=canon.describe(u).english,whole=choices.find(c=>c.translation_id===exact(row));assert.ok(whole);assert.equal(whole.url,`https://accesstoinsight.org${row.path}.html${review.source_fragment?'#'+review.source_fragment:''}`);
    assert.equal(whole.source_section.heading,null);assert.ok(!whole.url.includes('::selection:'));
  }
  const gratitude=rows.find(r=>r.unit_id==='an2.33');assert.equal(canon.resolve(`https://www.accesstoinsight.org${gratitude.path}.html#s32`).unit.id,'an2.33');
  for(const path of new Set(rows.map(r=>r.path))){const shared=legacy({path});assert.ok(retainedAtiShared(shared.link,canon.load().byId.get(shared.owner)));for(const fragment of ['', '#top','#fnt-1','#fn-1','#an1.49','#selection:an1.49','#invented'])assert.throws(()=>canon.resolve(`https://accesstoinsight.org${path}.html${fragment}`),/anthology|Shared-page|fragment|selection/i);}
  assert.throws(()=>canon.resolve('https://accesstoinsight.org/tipitaka/an/an01/an01.021-040.than.html'),/anthology|Shared-page/i);
});

test('forged headings, ownership, selectors, note counts, pins and URLs fail validation instead of becoming whole articles',()=>{
  for(const change of [r=>r.section.heading='Invented heading',r=>delete r.section.heading,r=>r.section.selection_id='an1.50',r=>r.anchor='invented',r=>r.section.anchor='invented',r=>r.section.note_count=0,r=>r.section.notice_sha256='0'.repeat(64),r=>r.section.text_sha256='0'.repeat(64),r=>r.root.root_blocks_sha256='0'.repeat(64),r=>r.section.first_ref='an1.49/2',r=>r.english_title='Invented parent']){
    const altered=clone(registry),row=altered.links.find(r=>r.unit_id==='an1.49');change(row);assert.throws(()=>validate(altered),/Registered ATI/);
  }
  const row=rows.find(r=>r.unit_id==='an1.49'),link=reviewedSectionLink(row,registry);
  for(const change of [l=>delete l.section,l=>l.section=null,l=>l.section={...l.section,heading:'Invented'},l=>l.section={...l.section,selection_id:'an1.50'},l=>l.url+='#invented',l=>l.path='/tipitaka/an/an01/unreviewed',l=>l.source='dhammatalks',l=>l.shared_scope={}]){const l=clone(link);change(l);assert.throws(()=>assertRegisteredSection(l,unit(row),registry),/Registered ATI/);}
  assert.throws(()=>assertRegisteredSection(link,canon.load().byId.get('an1.50'),registry),/Registered ATI/);
});

test('unknown and malformed selection aliases refuse before network, with no arbitrary provider fallback',async()=>{
  let requests=0;globalThis.fetch=async()=>{requests++;throw Error('unexpected network');};const row=rows[0];
  for(const which of [exact(row)+':extra',`ati:${row.path}::selection:an1.999`,`ati:${row.path}#an1.45`,`ati:${row.path}::selection:AN1.45`,`ati:${row.path}::selection:an1.46`,`ati:${row.path}::selection:`,`ati:${row.path}::selection:an1.045`])await assert.rejects(english.translation(unit(row),which),/not linked|Unknown|selector/i);
  for(const r of rows)await assert.rejects(english.translation(unit(r),'ati:'+r.path),/shared/i);
  assert.equal(requests,0);
});

test('four actual artifacts reproduce all ten independently reviewed body, notes, span and complete rights pins',{skip:!sourceRoot},()=>{
  for(const review of reviewed){const row=rows.find(r=>r.unit_id===review.unit_id),expected=independentlySelect(review),actual=extractAtiSection(expected.raw,row);
    assert.equal(hash(expected.raw),row.source_html_sha256);assert.equal(hash(expected.span),review.selection_raw_span_sha256);assert.equal(row.section.section_html_sha256,review.selection_raw_span_sha256);
    assert.equal(expected.text.length,review.text_characters);assert.equal(sectionHash(expected.text),review.text_sha256);assert.equal(sectionHash(expected.translator_notes),review.owned_notes_sha256);
    assert.equal(actual.text,expected.text);assert.deepEqual(actual.translator_notes,expected.translator_notes);assert.equal(actual.title,review.parent_title);
    assert.equal(row.section.text_sha256,review.text_sha256);assert.equal(row.section.notes_sha256,review.owned_notes_sha256);assert.equal(row.section.note_count,review.owned_note_count);
    const notice=english.atiNotice(expected.raw);assert.equal(sectionHash(notice),review.notice_sha256);assert.equal(row.section.notice_sha256,review.notice_sha256);assert.match(notice.licensing,/©(?:1995|2002|2006) Thanissaro Bhikkhu/);assert.match(notice.licensing,/Attribution-NonCommercial 4\.0 International/);assert.match(notice.licensing,/Documents linked from this page may be subject to other restrictions/);assert.match(notice.citation,/Access to Insight \(BCBS Edition\)/);
  }
});

test('all five exact retained shared bindings remain mandatory; no moved, duplicate or downgraded page survives',()=>{
  const bindings=[...new Set(['an1.21',...rows.map(r=>legacy(r).owner)])];assert.equal(bindings.length,5);
  for(const owner of bindings){
    const original=canon.load().translations[owner].find(l=>l.shared_scope);assert.ok(original,owner);
    for(const change of [t=>t[owner]=t[owner].filter(l=>l!==t[owner].find(l=>l.shared_scope)),t=>t[owner].push(clone(original)),t=>delete t[owner].find(l=>l.shared_scope).shared_scope,t=>t[owner].find(l=>l.shared_scope).shared_scope.presentation='condensed']){
      const translations=clone(canon.load().translations);change(translations);assert.throws(()=>validate(registry,translations),/Registered ATI|shared-page/i,owner);
    }
  }
});

test('failed exact selection extraction never substitutes another treatment, whole article or translation provider',{skip:!sourceRoot},async()=>{
  const row=rows.find(r=>r.unit_id==='an1.49'),requests=[];
  globalThis.fetch=async url=>{requests.push(String(url));return new Response(source(rows.find(r=>r.unit_id==='an1.45').path),{status:200});};
  await assert.rejects(english.translation(unit(row),exact(row)),/reviewed ATI|changed|source/i);
  assert.deepEqual(requests,[`https://accesstoinsight.org${row.path}.html`]);assert.equal(liveCache.map.size,0);
});

test('actual selected sources reject raw, structural and metadata drift before returning wording',{skip:!sourceRoot},()=>{
  for(const row of rows){const raw=source(row.path);for(const delta of [{section:{...row.section,selection_id:'an9.999'}},{section:{...row.section,heading:'Invented'}},{section:{...row.section,note_count:9}},{section:{...row.section,text_sha256:'0'.repeat(64)}},{section:{...row.section,notes_sha256:'0'.repeat(64)}},{section:{...row.section,section_html_sha256:'0'.repeat(64)}}])assert.throws(()=>extractAtiSection(raw,{...row,...delta}),/reviewed ATI/);
    for(const changed of [raw+'\n',raw.replace('class="chapter"','class="edited"'),raw.replace('</p>','<i>Injected</i></p>'),raw.replace('©','Copyright ')])assert.throws(()=>extractAtiSection(changed,row),/reviewed ATI/);
  }
});

test('MCP reads all ten exact bodies with isolated owned notes, honest URLs and complete page-specific rights',{skip:!sourceRoot,timeout:60000},async()=>{
  const requests=provider(),[a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'independent-an-ten',version:'1'});await Promise.all([client.connect(a),createServer().connect(b)]);
  try{for(const review of reviewed){const row=rows.find(r=>r.unit_id===review.unit_id),expected=independentlySelect(review);const result=await client.callTool({name:'get_translation',arguments:{uid:row.unit_id,translation:exact(row),limit:12000}});assert.ok(!result.isError,JSON.stringify(result));const page=JSON.parse(result.content[0].text);
    assert.equal(page.text,expected.text);assert.equal(page.translation_id,exact(row));assert.equal(page.text_id,row.unit_id);assert.equal(page.title,review.parent_title);assert.equal(page.source_section.heading,null);assert.equal(page.source_section.selection_id,row.unit_id);assert.deepEqual(page.translator_notes,expected.translator_notes);assert.equal(Object.hasOwn(page,'translation_scope'),false);assert.equal(page.next_offset,null);
    assert.equal(page.url,reviewedSectionLink(row,registry).url);assert.equal(page.license,english.atiNotice(expected.raw).licensing);assert.equal(page.attribution,english.atiNotice(expected.raw).citation);
    assert.equal((await english.translation(unit(row))).translation_id,exact(row));
    const cached=await english.translation(unit(row),exact(row));assert.deepEqual(cached.translator_notes,expected.translator_notes);page.translator_notes.push({number:9,text:'Caller mutation'});assert.deepEqual((await english.translation(unit(row),exact(row))).translator_notes,expected.translator_notes);
  }assert.equal(requests.length,10);assert.equal([...liveCache.map.keys()].filter(k=>k.startsWith('ati-section:')).length,10);
  }finally{await client.close();}
});

test('parents selection continuation pins only its own body and cannot switch to neighbor or bare shared source',{skip:!sourceRoot},async()=>{
  provider();const row=rows.find(r=>r.unit_id==='an2.33'),expected=independentlySelect(reviewed.find(r=>r.unit_id===row.unit_id));let page=await english.translation(unit(row),exact(row),{limit:500}),text=page.text;assert.ok(page.continue_with);
  while(page.continue_with){const{uid,translation,...options}=page.continue_with.arguments;assert.equal(uid,row.unit_id);assert.equal(translation,exact(row));assert.equal(options.prefix_sha256,hash(expected.text.slice(0,options.offset)));page=await english.translation(canon.resolve(uid).unit,translation,options);text+=page.text;}
  assert.equal(text,expected.text);await assert.rejects(english.translation(unit(row),exact(row),{offset:500,limit:500,prefix_sha256:'0'.repeat(64)}),/prefix|changed/i);
});

for(const [field,mutate]of [['body',v=>v.text+=' Changed'],['notes',v=>v.translator_notes=[]],['rights',v=>v.license='Changed licence'],['attribution',v=>v.attribution='Changed author'],['title',v=>v.title='Invented individual heading'],['URL',v=>v.url+='#invented']])test(`cached owned-note selection refuses ${field} mutation before wording`,{skip:!sourceRoot},async()=>{
  provider();const row=rows.find(r=>r.unit_id==='an1.49');await english.translation(unit(row),exact(row));const entry=[...liveCache.map].find(([key])=>key.startsWith('ati-section:'));assert.ok(entry);mutate(entry[1].value);await assert.rejects(english.translation(unit(row),exact(row)),/changed|reviewed|snapshot|notice|source/i);
});

test('cached selection still revalidates current complete registry, sibling mapping, legacy scope and full original root',{skip:!sourceRoot},async()=>{
  provider();const row=rows.find(r=>r.unit_id==='an1.49'),data=canon.load(),oldTranslations=data.translations,oldCorpus=data.canon;await english.translation(unit(row),exact(row));
  try{for(const mutate of [t=>t['an1.49']=t['an1.49'].filter(l=>!l.shared_scope),t=>t['an1.50']=t['an1.50'].filter(l=>!l.section),t=>t['an1.49'].find(l=>l.section).section.heading='Forged']){const t=clone(oldTranslations);mutate(t);data.translations=t;await assert.rejects(english.translation(unit(row),exact(row)),/Registered ATI|shared-page|reviewed/i);data.translations=oldTranslations;}
    const c={...oldCorpus,books:[...oldCorpus.books]},u=unit(row);c.books[u.book]={...c.books[u.book],blocks:[...c.books[u.book].blocks]};c.books[u.book].blocks[u.start]=clone(c.books[u.book].blocks[u.start]);c.books[u.book].blocks[u.start][2]+=' Changed root';data.canon=c;await assert.rejects(english.translation(unit(row),exact(row)),/Registered ATI|shared-page|reviewed/i);
  }finally{data.translations=oldTranslations;data.canon=oldCorpus;}
});

test('quotation verification separates owned translator notes and other treatments while old shared page retains consent and page-level attribution',{skip:!sourceRoot,timeout:60000},async()=>{
  provider();const row=rows.find(r=>r.unit_id==='an1.49'),review=reviewed.find(r=>r.unit_id===row.unit_id),expected=independentlySelect(review),bare='ati:'+row.path;
  const body=await verifyQuote({text:expected.text,language:'english',texts:[row.unit_id],translation_ids:[exact(row)]});assert.equal(body.verdict,'found');assert.equal(body.matches[0].text_id,row.unit_id);
  const editorial=expected.translator_notes[0].text.split(/[.!?]\s/)[0];const excluded=await verifyQuote({text:editorial,language:'english',texts:[row.unit_id],translation_ids:[exact(row)]});assert.notEqual(excluded.verdict,'found');
  const neighbor=independentlySelect(reviewed.find(r=>r.unit_id==='an1.51')).text;const other=await verifyQuote({text:neighbor,language:'english',texts:[row.unit_id],translation_ids:[exact(row)]});assert.notEqual(other.verdict,'found');
  await assert.rejects(verifyQuote({text:editorial,language:'english',texts:[row.unit_id],translation_ids:[bare]}),/include_shared/);
  const shared=await verifyQuote({text:editorial,language:'english',texts:[row.unit_id,'an1.50'],translation_ids:[bare],include_shared:true});assert.equal(shared.verdict,'found');assert.equal(shared.matches[0].text_id,null);assert.equal(shared.matches[0].whole_unit_coverage,false);assert.equal(shared.scope.translations_checked.length,1);
  const article=await getAtiText({path:row.path,limit:12000});assert.equal(Object.hasOwn(article,'canon_text_id'),false);assert.ok(article.text.includes(editorial));
  const page=await english.translation(unit(row),bare,{allow_shared:true,limit:500});assert.equal(page.text_id,null);assert.equal(page.translation_id,bare);assert.equal(page.whole_unit_coverage,false);assert.deepEqual(page.translation_scope.text_ids,['an1.49','an1.50','an1.51','an1.52']);assert.equal(page.continue_with.arguments.allow_shared,true);assert.equal(page.continue_with.arguments.translation,bare);
});

test('coverage, daily rotation and exports measure ten first whole mappings and zero first English access; all shared choices remain',()=>{
  const d=canon.load(),before=Object.fromEntries(Object.entries(d.translations).map(([id,links])=>[id,links.filter(l=>l.section?.profile!==AN_TEN_SECTION_PROFILE)]));
  for(const r of rows){assert.ok(before[r.unit_id]?.some(l=>!l.partial_scope&&!l.shared_scope)===false);assert.ok(english.available(unit(r)).some(c=>c.translation_scope?.kind==='shared_page'));}
  const whole=t=>Object.values(t).flat().filter(l=>!l.partial_scope&&!l.shared_scope).length;assert.equal(whole(d.translations)-whole(before),10);
  const totals=translationCoverage({refresh:true}).total;assert.deepEqual([totals.shared_links,totals.with_shared_english,totals.shared_only],[12,110,22]);
  const coverage=buildCoverage();assert.deepEqual([coverage.shared_links,coverage.shared_texts],[12,110]);assert.equal(coverage.dhammatalks+coverage.ati+coverage.anandajoti+coverage.apadana,whole(d.translations));
  const exported=buildIndex().texts.filter(t=>rows.some(r=>r.unit_id===t.id));assert.equal(exported.length,10);for(const record of exported){assert.equal(record.english_count,1);assert.equal(record.shared_english_count,1);const whole=record.english.find(l=>l.source_section);assert.equal(whole.translation_id,exact(rows.find(r=>r.unit_id===record.id)));assert.equal(whole.whole_unit_coverage,true);assert.equal(whole.source_section.heading,null);assert.equal(record.english.find(l=>l.translation_scope).whole_unit_coverage,false);}
  assert.match(toCsv({texts:exported}),/::selection:an1\.49/);
  const collections=new Set(['dn','mn','sn','an','kp','ud','iti','snp']);const pool=t=>d.canon.units.filter(u=>collections.has(u.collection)&&u.kind!=='range'&&!u.approximate&&t[u.id]?.some(l=>!l.partial_scope&&!l.shared_scope)).sort((a,b)=>a.book-b.book||a.start-b.start);const current=pool(d.translations),previous=pool(before);assert.equal(current.length-previous.length,10);
  assert.equal(dailyText(canon,{kind:'sutta',date:'2026-11-19'}).rotation.of,current.length);
  const start=Date.UTC(2026,0,1)/86400000;
  for(const row of rows){const position=current.findIndex(u=>u.id===row.unit_id);let day=start;while(cyclePosition(day,current.length)!==position)day++;const daily=dailyText(canon,{kind:'sutta',date:new Date(day*86400000).toISOString().slice(0,10)});assert.equal(daily.text.id,row.unit_id);const choices=daily.english||daily.translations||daily.links?.english;assert.ok(choices?.some(l=>l.translation_id===exact(row)),JSON.stringify(daily));}
});
