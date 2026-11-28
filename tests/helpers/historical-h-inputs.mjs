/** Explicit owned H inputs after a genuine380 source positive; never test registration. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {lstatSync,readFileSync,readdirSync,mkdtempSync,mkdirSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve,relative as relativePath} from 'node:path';
import {URL,fileURLToPath} from 'node:url';
import {INTAKE375_BASE} from './intake375-metadata.mjs';
import {current382Authority as current389390Authority,assertCurrent382SourceClosure as assertCurrent389390SourceClosure,CURRENT_CANONICAL_SHA} from './intake382-metadata.mjs';
const MATERIALIZER='tests/materialize_h_history.py';
const MATERIALIZER_SHA='1a9ab71ef11e547ed660afdbadd14245ade64f5d1e20d882be44db34f37c2055';
const H_INDEX='docs/evidence/qa/windows20-partitions/BASELINE_368_WINDOWS_PYTHON_PARTITIONS.json';
const H_WORKFLOW='.github/workflows/check.yml';
const PREPARE_TIMEOUT_MS=20000;
const sha=b=>createHash('sha256').update(b).digest('hex');
function rel(name){assert.equal(typeof name,'string');assert.match(name,/^[a-zA-Z0-9_./-]+$/);assert.ok(name&&!name.startsWith('/')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'));return name;}
function physical(root){let base;if(typeof root==='string')base=resolve(root);else{assert.ok(root&&Object.getPrototypeOf(root)===URL.prototype);assert.equal(root.protocol,'file:');base=resolve(fileURLToPath(root));}const parents=[];for(let p=base;;p=dirname(p)){parents.push(p);if(dirname(p)===p)break;}for(const p of parents.reverse()){const stat=lstatSync(p);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink(),'Physical nonsymlink root required');}return base;}
function read(root,name){let file=root;const parts=rel(name).split('/');for(let i=0;i<parts.length;i++){file=join(file,parts[i]);const stat=lstatSync(file);assert.equal(stat.isSymbolicLink(),false);assert.equal(i===parts.length-1?stat.isFile():stat.isDirectory(),true);}return readFileSync(file);}
function row(root,name,value){assert.equal(value.path,name);assert.ok(Number.isSafeInteger(value.bytes)&&value.bytes>=0);assert.match(value.sha256,/^[a-f0-9]{64}$/);assert.match(value.git_blob,/^[a-f0-9]{40}$/);assert.ok(['100644','100755'].includes(value.mode));const raw=read(root,name);assert.equal(raw.length,value.bytes);assert.equal(sha(raw),value.sha256,'Exact owned H bytes '+name);assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),value.git_blob);return raw;}
function files(root){const names=[];function walk(dir){for(const name of readdirSync(dir).sort()){const path=join(dir,name),stat=lstatSync(path);assert.equal(stat.isSymbolicLink(),false,'No symlink in owned H input');if(stat.isDirectory())walk(path);else{assert.ok(stat.isFile());names.push(relativePath(root,path).replaceAll('\\','/'));}}}walk(root);return names.sort();}
function descriptor(value,path){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),['path','bytes','sha256'].sort());assert.equal(value.path,path);assert.ok(Number.isSafeInteger(value.bytes)&&value.bytes>=0);assert.match(value.sha256,/^[a-f0-9]{64}$/);}
// Auxiliary locked input is authenticated in actual R; it is deliberately not
// part of the approved967-Git-row H fixture output.
function verifyCurrentLockedDependency(current,dependency){
 const lock=dependency.lockfile,raw=read(current,lock.path);
 assert.equal(raw.length,lock.bytes);assert.equal(sha(raw),lock.sha256,'Exact actual-R lock witness for H installed dependency');
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),lock.git_blob);
 const entry=JSON.parse(raw).packages['node_modules/'+dependency.package];assert.equal(entry.version,dependency.version);assert.equal(entry.integrity,dependency.integrity);
}
function prepare(currentRoot,kind){
 const current=physical(currentRoot);assert.ok(kind==='source'||kind==='runtime');
 // Both checks are source-only; the fixed runtime builder additionally performs
 // the stateless actual382 data/runtime positive before it writes any H bytes.
 assertCurrent389390SourceClosure(current);const context=current389390Authority(current),authority=context.english,manifest=authority.historical375.documents['H_HISTORY_FIXTURE_INPUTS.json'];
 assert.equal(manifest.schema,'H-history-fixture-inputs-v1');assert.equal(manifest.status,'approved');assert.equal(manifest.commit,INTAKE375_BASE);
 assert.match(MATERIALIZER_SHA,/^[a-f0-9]{64}$/,'Pending reviewed H materializer; no invocation');assert.equal(sha(read(current,MATERIALIZER)),MATERIALIZER_SHA);
 descriptor(manifest.index,H_INDEX);descriptor(manifest.workflow,H_WORKFLOW);
 const expected={...manifest.source_files,...(kind==='runtime'?manifest.runtime_extension:{})},dependencies=manifest.dependency_inputs;assert.deepEqual(Object.keys(dependencies),['node_modules/axe-core/axe.min.js']);assert.deepEqual(Object.keys(manifest.source_files),Object.keys(manifest.source_files).sort());assert.ok(Object.keys(manifest.source_files).every(name=>!name.startsWith('server/')&&!name.startsWith('node_modules/')));assert.equal(manifest.source_file_count,Object.keys(manifest.source_files).length);assert.equal(manifest.runtime_file_count,34);assert.equal(Object.keys(manifest.runtime_extension).length,34);
 assert.ok(!Object.keys(manifest.runtime_extension).some(name=>Object.hasOwn(manifest.source_files,name)),'Fixed H domains must be disjoint');
 for(const dependency of Object.values(dependencies))verifyCurrentLockedDependency(current,dependency);
 const owner=realpathSync(mkdtempSync(join(tmpdir(),'pali-owned-H-'+kind+'-'))),destination=join(owner,'H');mkdirSync(destination,{mode:0o700});let active=true;
 const close=()=>{if(!active)return;const stat=lstatSync(owner);assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());assert.equal(realpathSync(owner),owner);rmSync(owner,{recursive:true});active=false;};
 try{
  const argv=['-B',join(current,MATERIALIZER),kind,'--source-root',current,'--destination',destination];
  const prepStarted=performance.now();
  const result=spawnSync('python3',argv,{cwd:current,encoding:'utf8',timeout:PREPARE_TIMEOUT_MS,killSignal:'SIGKILL',maxBuffer:1024*1024});
  if(result.error!==undefined||result.signal!==null||result.status!==0){
   // Captured UTF8 representation only, not a claim about unobserved/truncated emitted bytes.
   const summary={schema:'owned-H-preparation-result-v1',kind,elapsed_ms:Math.round((performance.now()-prepStarted)*1000)/1000,pid:Number.isSafeInteger(result.pid)&&result.pid>0?result.pid:null,error_code:typeof result.error?.code==='string'?result.error.code.slice(0,64):null,status:Number.isSafeInteger(result.status)?result.status:null,signal:typeof result.signal==='string'?result.signal.slice(0,32):null,captured_stdout_present:typeof result.stdout==='string',captured_stdout_utf8_bytes:Buffer.byteLength(result.stdout??'','utf8'),captured_stderr_present:typeof result.stderr==='string',captured_stderr_utf8_bytes:Buffer.byteLength(result.stderr??'','utf8')};
   process.stderr.write('H_PREP_RESULT:'+JSON.stringify(summary)+'\n');
  }
  assert.equal(result.error,undefined,String(result.error??'')+'\n'+(result.stderr??''));assert.equal(result.signal,null,result.stderr);assert.equal(result.status,0,result.stderr);
  const receipt=JSON.parse(result.stdout);assert.deepEqual(Object.keys(receipt).sort(),['schema','kind','commit','root','files','index','workflow','current380_checked','current382_source_checked','current382_runtime_checked','current_canonical_logical_sha256'].sort());assert.equal(receipt.schema,'owned-H-history-fixture-v3');assert.equal(receipt.kind,kind);assert.equal(receipt.commit,INTAKE375_BASE);assert.equal(receipt.root,destination);assert.equal(receipt.current380_checked,true);assert.equal(receipt.current382_source_checked,true);assert.equal(receipt.current382_runtime_checked,kind==='runtime');assert.equal(receipt.current_canonical_logical_sha256,CURRENT_CANONICAL_SHA);assert.equal(receipt.current_canonical_logical_sha256,context.canonical.new_canonical_logical_sha256);assert.deepEqual(receipt.index,manifest.index);assert.deepEqual(receipt.workflow,manifest.workflow);
  assert.ok(!Object.keys(dependencies).some(name=>Object.hasOwn(expected,name)));const selected=[...Object.keys(expected),...Object.keys(dependencies)].sort();assert.deepEqual(receipt.files,selected);assert.deepEqual(files(destination),selected,'Exactly the declared H domain, no extra source or runtime files');
  for(const name of Object.keys(expected))row(destination,name,expected[name]);
  for(const[name,dependency]of Object.entries(dependencies)){
   const raw=read(destination,name);assert.equal(raw.length,dependency.bytes);assert.equal(sha(raw),dependency.sha256,'Exact installed H dependency, never a Git blob');
   verifyCurrentLockedDependency(current,dependency);
  }
  const indexRaw=read(destination,H_INDEX),workflowRaw=read(destination,H_WORKFLOW);assert.equal(indexRaw.length,manifest.index.bytes);assert.equal(sha(indexRaw),manifest.index.sha256);assert.equal(workflowRaw.length,manifest.workflow.bytes);assert.equal(sha(workflowRaw),manifest.workflow.sha256);
  const historicalIndex=JSON.parse(indexRaw);assert.equal(Object.keys(historicalIndex.files).length,345);assert.equal(historicalIndex.legacy_test_count+historicalIndex.added_test_count,2092);
  for(const[path,pin]of Object.entries(historicalIndex.files)){assert.ok(Object.hasOwn(expected,path),'All H345 source witnesses required');assert.equal(expected[path].sha256,pin);}
  for(const[path,pin]of Object.entries({...historicalIndex.additions,...historicalIndex.supporting_sources,...historicalIndex.python_sources,[historicalIndex.driver.path]:historicalIndex.driver.sha256,[historicalIndex.predecessor.path]:historicalIndex.predecessor.sha256,[historicalIndex.case_inventory.path]:historicalIndex.case_inventory.sha256})){assert.ok(Object.hasOwn(expected,path),'H tooling/evidence source required');assert.equal(expected[path].sha256,pin);}
  const raw=workflowRaw.toString('utf8'),hashes=[...raw.matchAll(/^  CI_TEST_BASELINE_SHA: ([a-f0-9]{64})$/gm)];assert.equal(hashes.length,1);assert.equal(hashes[0][1],manifest.index.sha256,'H workflow binds H index, never current V5');
  assert.match(raw,/^  CI_TEST_BASELINE_INDEX: docs\/evidence\/qa\/windows20-partitions\/BASELINE_368_WINDOWS_PYTHON_PARTITIONS\.json$/m);
  // Recheck the current declaration and executable, never return a cached seal.
  assertCurrent389390SourceClosure(current);assert.equal(sha(read(current,MATERIALIZER)),MATERIALIZER_SHA);
  return Object.freeze({root:destination,index:Object.freeze({path:join(destination,H_INDEX),sha256:manifest.index.sha256,bytes:manifest.index.bytes}),workflow:Object.freeze({raw,pin:manifest.index.sha256}),close});
 }catch(error){try{close();}catch(cleanup){throw new AggregateError([error,cleanup],'Owned H preparation and cleanup both failed');}throw error;}
}
export function prepareHistoricalHSourceInputs(root){return prepare(root,'source');}
export function prepareHistoricalHRuntimeInputs(root){return prepare(root,'runtime');}
