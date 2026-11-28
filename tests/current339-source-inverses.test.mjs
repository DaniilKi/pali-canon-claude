import {INTAKE382_IDS} from './helpers/intake382-metadata.mjs';
// Historical H source/metadata inputs only. The owned provider validates CURRENT380 first.
// Registration stays at this actual-R file; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readCurrentFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {CURRENT_WIDGET_URI,CURRENT_WIDGET_VERSION} from './helpers/current389390-metadata.mjs';
const {frozen440FileReader}=await import(new URL('tests/helpers/boundary333-336-source-input.mjs',HistoricalHBase).href);
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';import {createHash} from 'node:crypto';
const {sourceInverses,projectD4Source,d4FileReader}=await import(new URL('tests/helpers/current339-source-inverse.mjs',HistoricalHBase).href);
import {WIDGET_VERSION,WIDGET_URI} from '../src/chatgpt-widget.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const readFileSync=frozen440FileReader(readCurrentFileSync);
const sha=x=>createHash('sha256').update(x).digest('hex');
test('actual current359 and v45 bindings retain every exact D4 assertion through finite source inputs',()=>{
 assert.equal(intake380Authority().historical368.ids.length,368);assert.equal(intake380Authority().ids.length,380);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,380),intake380Authority().ids);assert.deepEqual(CURRENT_APADANA_IDS.slice(380),INTAKE382_IDS);assert.equal(CURRENT_APADANA_IDS.length,382);assert.equal(WIDGET_VERSION,CURRENT_WIDGET_VERSION);assert.equal(WIDGET_URI,CURRENT_WIDGET_URI);
 assert.ok(Object.keys(sourceInverses.files).length>=20);
 const reader=d4FileReader(readCurrentFileSync);
 for(const [path,row]of Object.entries(sourceInverses.files)){
  const current=readFileSync(path,'utf8');assert.equal(sha(current),row.current_sha256);assert.equal(sha(projectD4Source(path,current)),row.d4_sha256);
  assert.equal(sha(reader(path)),row.d4_sha256);assert.equal(sha(reader(path,'utf8')),row.d4_sha256);
  for(const bad of [current+'\n// unrelated mutation\n',current.replace(row.hunks[0].after,''),current+row.hunks[0].after])assert.throws(()=>projectD4Source(path,bad));
 }
 assert.equal(projectD4Source('unlisted/path','unchanged'),'unchanged');
});
