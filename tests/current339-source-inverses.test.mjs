import {frozen440FileReader} from './helpers/boundary333-336-source-input.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as readCurrentFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {sourceInverses,projectD4Source,d4FileReader} from './helpers/current339-source-inverse.mjs';
import {WIDGET_VERSION,WIDGET_URI} from '../src/chatgpt-widget.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const readFileSync=frozen440FileReader(readCurrentFileSync);
const sha=x=>createHash('sha256').update(x).digest('hex');
test('actual current359 and v45 bindings retain every exact D4 assertion through finite source inputs',()=>{
 assert.equal(CURRENT_APADANA_IDS.length,359);assert.equal(WIDGET_VERSION,'v45');assert.equal(WIDGET_URI,'ui://pali-canon/reader-v45.html');
 assert.ok(Object.keys(sourceInverses.files).length>=20);
 const reader=d4FileReader(readCurrentFileSync);
 for(const [path,row]of Object.entries(sourceInverses.files)){
  const current=readFileSync(path,'utf8');assert.equal(sha(current),row.current_sha256);assert.equal(sha(projectD4Source(path,current)),row.d4_sha256);
  assert.equal(sha(reader(path)),row.d4_sha256);assert.equal(sha(reader(path,'utf8')),row.d4_sha256);
  for(const bad of [current+'\n// unrelated mutation\n',current.replace(row.hunks[0].after,''),current+row.hunks[0].after])assert.throws(()=>projectD4Source(path,bad));
 }
 assert.equal(projectD4Source('unlisted/path','unchanged'),'unchanged');
});
