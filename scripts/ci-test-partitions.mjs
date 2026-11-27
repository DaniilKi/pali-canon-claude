// CI-only complete-inventory execution and receipt reconciliation. Public npm test is unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync,renameSync,lstatSync,existsSync,mkdirSync,realpathSync} from 'node:fs';
import {resolve,relative,dirname,sep,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';

export const PARTITIONS=4, MAX_CHILD_MS=20*60*1000, MAX_FULL_MS=30*60*1000;
const BASE='c7e5939c3c479a78d3537e17deac6318162f3896';
const NEW_FILES=['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs','tests/ci-test-partitions.test.mjs'];
const hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
export const digest=b=>createHash('sha256').update(b).digest('hex');
const objectSha=x=>digest(JSON.stringify(x));
const posix=p=>p.split(sep).join('/');
function regular(root,path){assert.equal(typeof path,'string');assert.ok(!isAbsolute(path)&&!path.includes('\\')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'));let file=resolve(root);assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());for(const part of path.split('/')){file=resolve(file,part);const stat=lstatSync(file);assert.ok(!stat.isSymbolicLink());}assert.ok(lstatSync(file).isFile());return readFileSync(file);}
export function inventory(root){return readdirSync(resolve(root,'tests')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>({path:'tests/'+n,sha256:digest(regular(root,'tests/'+n))}));}
function loadBaselineV1(root,path,pin){assert.ok(hex(pin,64),'Explicit independent baseline hash required');const raw=readFileSync(path);assert.equal(digest(raw),pin);const b=JSON.parse(raw);assert.equal(b.schema,'reviewed-ci-test-baseline-v1');assert.equal(b.commit,BASE);assert.ok(Number.isSafeInteger(b.legacy_test_count)&&b.legacy_test_count>0);assert.ok(Number.isSafeInteger(b.added_test_count)&&b.added_test_count>0);assert.deepEqual(Object.keys(b.driver),['path','sha256']);assert.equal(b.driver.path,'scripts/test.mjs');assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256);assert.deepEqual(Object.keys(b.additions).sort(),NEW_FILES);for(const[name,sha]of Object.entries(b.additions)){assert.ok(hex(sha,64));assert.equal(digest(regular(root,name)),sha);}const current=inventory(root);assert.deepEqual(current.map(x=>x.path),[...Object.keys(b.files),'tests/ci-test-partitions.test.mjs'].sort());for(const row of current)assert.equal(row.sha256,b.files[row.path]??b.additions[row.path]);assert.ok(Object.keys(b.files).every(name=>/^tests\/[a-zA-Z0-9_.-]+\.test\.mjs$/.test(name)&&hex(b.files[name],64)));return {baseline:b,baseline_sha256:pin,inventory:current};}
// V2 is a finite reviewed successor; V1's fixture/legacy path stays unchanged.
const V2_BASE='3cedb7b7a71a42db1601026cb6d995dafe43c9ce';
const V2_PREDECESSOR='docs/evidence/qa/windows20-partitions/BASELINE_3CED_TEST_FILES.json';
const V2_PREDECESSOR_SHA='f5e3df6886ecbf01904b2ef657bf90944f118edb5b387ece1c4262c0cb25359d';
const V2_CASE_REVIEW='docs/evidence/qa/windows20-partitions/INTAKE368_CASE_INVENTORY_REVIEW.json';
const V2_TOOLS=['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs'];
const V2_QA='tests/ci-test-partitions.test.mjs';
function exactKeys(value,keys){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...keys].sort());}
function literalTestMap(value){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));const keys=Object.keys(value);assert.deepEqual(keys,[...keys].sort(),'File maps must be sorted literal paths');for(const path of keys){assert.match(path,/^tests\/[a-zA-Z0-9_.-]+\.test\.mjs$/);assert.ok(hex(value[path],64));}return keys;}
function loadBaselineV2(root,b,pin){
  exactKeys(b,['schema','commit','legacy_test_count','added_test_count','driver','predecessor','changed_files','added_files','additions','case_inventory']);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v2');assert.equal(b.commit,V2_BASE);
  exactKeys(b.predecessor,['path','sha256']);assert.equal(b.predecessor.path,V2_PREDECESSOR);assert.equal(b.predecessor.sha256,V2_PREDECESSOR_SHA);
  const predecessorBytes=regular(root,V2_PREDECESSOR);assert.equal(digest(predecessorBytes),V2_PREDECESSOR_SHA);
  const prior=JSON.parse(predecessorBytes);
  exactKeys(prior,['schema','commit','legacy_v1','driver','tooling','files','counts','source_inventory_sha256']);
  assert.equal(prior.schema,'reviewed-ci-predecessor-inventory-v1');assert.equal(prior.commit,V2_BASE);
  assert.deepEqual(prior.counts,{original_test_files:339,original_terminal_tests:2068,preserved_QA_tests:8,total_terminal_tests:2076,existing_optional_source_skips:267});
  const priorPaths=literalTestMap(prior.files);assert.equal(priorPaths.length,340);
  assert.equal(prior.source_inventory_sha256,objectSha(priorPaths.map(path=>({path,sha256:prior.files[path]}))));
  exactKeys(prior.legacy_v1,['path','sha256']);
  assert.equal(prior.legacy_v1.path,'docs/evidence/qa/windows20-partitions/BASELINE_C7E_TEST_FILES.json');
  assert.equal(prior.legacy_v1.sha256,'7916fa2261424f745c146104ee5d6aabf1a9d78132b2d834f5ad38c1f3827aad');
  const legacyBytes=regular(root,prior.legacy_v1.path);assert.equal(digest(legacyBytes),prior.legacy_v1.sha256);
  const legacy=JSON.parse(legacyBytes);assert.equal(legacy.schema,'reviewed-ci-test-baseline-v1');assert.equal(legacy.commit,BASE);
  assert.equal(legacy.legacy_test_count,2068);assert.equal(legacy.added_test_count,8);
  assert.deepEqual(prior.driver,legacy.driver);assert.deepEqual(prior.tooling,legacy.additions);
  assert.deepEqual(priorPaths,[...Object.keys(legacy.files),V2_QA].sort());
  for(const[path,sha]of Object.entries(legacy.files))assert.equal(prior.files[path],sha);
  assert.equal(prior.files[V2_QA],prior.tooling[V2_QA]);
  exactKeys(b.driver,['path','sha256']);assert.deepEqual(b.driver,prior.driver,'Public test driver stays exact');
  assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256);
  assert.equal(b.legacy_test_count,2076,'The baseline already includes all eight QA tests');
  assert.ok(Number.isSafeInteger(b.added_test_count)&&b.added_test_count>0,'Independent added terminal-case count required');
  assert.ok(b.changed_files&&typeof b.changed_files==='object'&&!Array.isArray(b.changed_files));
  assert.deepEqual(Object.keys(b.changed_files),Object.keys(b.changed_files).sort());
  const expected={...prior.files};
  for(const[path,change]of Object.entries(b.changed_files)){
    assert.ok(Object.hasOwn(prior.files,path),'Changed file must be an exact predecessor test path');
    exactKeys(change,['before_sha256','after_sha256']);assert.equal(change.before_sha256,prior.files[path]);
    assert.ok(hex(change.after_sha256,64));assert.notEqual(change.after_sha256,change.before_sha256);
    expected[path]=change.after_sha256;
  }
  const addedPaths=literalTestMap(b.added_files);assert.ok(addedPaths.length>0,'Literal new test paths required');
  for(const path of addedPaths){assert.ok(!Object.hasOwn(prior.files,path),'Added file cannot replace a predecessor file');expected[path]=b.added_files[path];}
  exactKeys(b.additions,V2_TOOLS);
  for(const[path,sha]of Object.entries(b.additions)){assert.ok(hex(sha,64));assert.equal(digest(regular(root,path)),sha);}
  assert.equal(b.additions['scripts/ci-test-reporter.mjs'],prior.tooling['scripts/ci-test-reporter.mjs'],'Reporter remains unchanged');
  const expectedRows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));
  const current=inventory(root);assert.deepEqual(current,expectedRows,'Exact finite old/new test file inventory required');
  exactKeys(b.case_inventory,['path','sha256']);assert.equal(b.case_inventory.path,V2_CASE_REVIEW);assert.ok(hex(b.case_inventory.sha256,64));
  const reviewBytes=regular(root,V2_CASE_REVIEW);assert.equal(digest(reviewBytes),b.case_inventory.sha256);
  const review=JSON.parse(reviewBytes);
  exactKeys(review,['schema','status','baseline_commit','predecessor_sha256','inventory_sha256','driver','additions','changed_files','added_files','preserved_original_test_count','preserved_QA_test_count','preserved_original_skipped_count','added_case_count','added_cases_by_file','evidence']);
  assert.equal(review.schema,'reviewed-ci-successor-source-case-inventory-v1');
  assert.equal(review.status,'GO_EXACT_SOURCE_DELTA_AND_TERMINAL_CASE_INVENTORY_ONLY');
  assert.equal(review.baseline_commit,V2_BASE);assert.equal(review.predecessor_sha256,V2_PREDECESSOR_SHA);
  assert.equal(review.inventory_sha256,objectSha(expectedRows));
  assert.deepEqual(review.driver,b.driver);assert.deepEqual(review.additions,b.additions);
  assert.deepEqual(review.changed_files,b.changed_files);assert.deepEqual(review.added_files,b.added_files);
  assert.equal(review.preserved_original_test_count,2068);assert.equal(review.preserved_QA_test_count,8);
  assert.equal(review.preserved_original_skipped_count,267);
  assert.equal(review.added_case_count,b.added_test_count);
  assert.ok(review.added_cases_by_file&&typeof review.added_cases_by_file==='object'&&!Array.isArray(review.added_cases_by_file));
  assert.deepEqual(Object.keys(review.added_cases_by_file),Object.keys(review.added_cases_by_file).sort());
  let addedCount=0;
  for(const[path,count]of Object.entries(review.added_cases_by_file)){
    assert.ok(Object.hasOwn(b.added_files,path)||Object.hasOwn(b.changed_files,path));
    assert.ok(Number.isSafeInteger(count)&&count>0);addedCount+=count;
  }
  assert.equal(addedCount,b.added_test_count);
  assert.ok(addedPaths.every(path=>Object.hasOwn(review.added_cases_by_file,path)),'Every added test file has reviewed terminal cases');
  assert.ok(Array.isArray(review.evidence)&&review.evidence.length>0);
  for(const row of review.evidence){exactKeys(row,['path','sha256']);assert.ok(hex(row.sha256,64));assert.equal(digest(regular(root,row.path)),row.sha256);}
  return {baseline:b,baseline_sha256:pin,inventory:current};
}
export function loadBaseline(root,path,pin){
  assert.ok(hex(pin,64),'Explicit independent baseline hash required');
  const raw=readFileSync(path);assert.equal(digest(raw),pin);const b=JSON.parse(raw);
  if(b.schema==='reviewed-ci-test-baseline-v1')return loadBaselineV1(root,path,pin);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v2');return loadBaselineV2(root,b,pin);
}

export function selectedFiles(rows,mode,partition){assert.ok(mode==='full'||mode==='partition');if(mode==='full'){assert.equal(partition,null);return rows.map(r=>r.path);}assert.ok(Number.isInteger(partition)&&partition>=0&&partition<PARTITIONS);const selected=rows.filter((_,i)=>i%PARTITIONS===partition).map(r=>r.path);assert.ok(selected.length,'Every partition must be nonempty');return selected;}
export function nodeArguments(root,context){return ['--test',...(context.platform==='win32'?['--test-concurrency=1']:[]),'--test-reporter='+pathToFileURL(resolve(root,'scripts/ci-test-reporter.mjs')).href,...context.selected_files.map(p=>resolve(root,p))];}
export function makeContext(root,checked,{commit,mode,partition=null,platform=process.platform,node=process.version,ci=null}){assert.ok(hex(commit,40));const c={schema:'complete-ci-test-context-v1',commit,ci,mode,partition,partition_count:PARTITIONS,platform,node_major:Number(node.match(/^v(\d+)\./)?.[1]),baseline_sha256:checked.baseline_sha256,legacy_test_count:checked.baseline.legacy_test_count,added_test_count:checked.baseline.added_test_count,legacy_driver:checked.baseline.driver,inventory:checked.inventory,added_sources:checked.baseline.additions,selected_files:selectedFiles(checked.inventory,mode,partition)};assert.ok(Number.isInteger(c.node_major)&&c.node_major>=20);return c;}
const rowKey=row=>JSON.stringify([row.file,row.line,row.column,row.name,row.type,row.nesting,row.status]);
export function eventCollector(root,context){const cases=[],summary={};let rootPlan=false;return {accept(event){const d=event.data;if(event.type==='test:plan'&&d.nesting===0)rootPlan=true;if(event.type==='test:diagnostic'&&d.nesting===0){const m=/^(tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(d.message);if(m){assert.ok(!Object.hasOwn(summary,m[1]),'Duplicate terminal summary');summary[m[1]]=Number(m[2]);}}if(event.type!=='test:pass'&&event.type!=='test:fail')return;assert.equal(typeof d.file,'string','Terminal event must identify its actual source file');const file=posix(relative(resolve(root),resolve(d.file)));assert.ok(file&&!file.startsWith('../')&&!isAbsolute(file));assert.equal(typeof d.name,'string');assert.ok(Number.isSafeInteger(d.nesting)&&d.nesting>=0);const nullable=x=>x===undefined?null:x;const line=nullable(d.line),column=nullable(d.column);assert.ok(line===null||Number.isSafeInteger(line)&&line>0);assert.ok(column===null||Number.isSafeInteger(column)&&column>0);const type=d.details?.type??'test';assert.ok(type==='test'||type==='suite');const skipped=d.skip!==undefined&&d.skip!==false,todo=d.todo!==undefined&&d.todo!==false;assert.ok(!(skipped&&todo));let status=skipped?'skip':todo?'todo':event.type==='test:pass'?'pass':'fail';if(d.details?.error?.failureType==='cancelledByParent')status='cancelled';cases.push({file,line,column,name:d.name,type,nesting:d.nesting,status});},seal(){assert.ok(rootPlan,'Missing terminal root plan');assert.deepEqual(Object.keys(summary).sort(),['cancelled','fail','pass','skipped','suites','tests','todo']);const tests=cases.filter(c=>c.type==='test'),suites=cases.filter(c=>c.type==='suite');assert.equal(tests.length,summary.tests);assert.equal(suites.length,summary.suites);for(const[status,key]of [['pass','pass'],['skip','skipped'],['todo','todo'],['fail','fail'],['cancelled','cancelled']])assert.equal(tests.filter(c=>c.status===status).length,summary[key],`Terminal ${status} count`);assert.equal(summary.fail,0);assert.equal(summary.cancelled,0);assert.ok(cases.every(c=>c.status!=='fail'&&c.status!=='cancelled'));return {schema:'complete-ci-test-events-v1',context,context_sha256:objectSha(context),complete:true,cases:cases.sort((a,b)=>rowKey(a)<rowKey(b)?-1:rowKey(a)>rowKey(b)?1:0),summary};}};}
export function writeExclusive(path,value){assert.ok(!existsSync(path),'Receipt must be new');mkdirSync(dirname(path),{recursive:true});const temp=path+'.tmp';writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});assert.ok(!existsSync(path));renameSync(temp,path);}
function validateContext(c,checked,commit,ci,expectedNodeMajor=20){assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);assert.deepEqual(Object.keys(c).sort(),['schema','commit','ci','mode','partition','partition_count','platform','node_major','baseline_sha256','legacy_test_count','added_test_count','legacy_driver','inventory','added_sources','selected_files'].sort());assert.equal(c.schema,'complete-ci-test-context-v1');assert.equal(c.commit,commit);assert.deepEqual(c.ci,ci);if(ci)assert.equal(ci.sha,commit);assert.equal(c.partition_count,PARTITIONS);assert.equal(c.baseline_sha256,checked.baseline_sha256);assert.equal(c.legacy_test_count,checked.baseline.legacy_test_count);assert.equal(c.added_test_count,checked.baseline.added_test_count);assert.deepEqual(c.legacy_driver,checked.baseline.driver);assert.deepEqual(c.inventory,checked.inventory);assert.deepEqual(c.added_sources,checked.baseline.additions);assert.deepEqual(c.selected_files,selectedFiles(c.inventory,c.mode,c.partition));assert.equal(c.node_major,expectedNodeMajor,'Reference and partitions must match the trusted Node major');}
export function verifyReceipt(receipt,checked,commit,ci=null,expectedNodeMajor=20){assert.deepEqual(Object.keys(receipt).sort(),['schema','events','execution'].sort());assert.equal(receipt.schema,'complete-ci-test-receipt-v1');const {events,execution}=receipt;assert.deepEqual(Object.keys(events).sort(),['schema','context','context_sha256','complete','cases','summary'].sort());assert.deepEqual(Object.keys(execution).sort(),['exit_code','signal','error','timed_out','cleanup_unverified','bound_ms'].sort());assert.equal(events.schema,'complete-ci-test-events-v1');assert.equal(events.complete,true);assert.equal(events.context_sha256,objectSha(events.context));validateContext(events.context,checked,commit,ci,expectedNodeMajor);assert.equal(execution.exit_code,0);assert.equal(execution.signal,null);assert.equal(execution.timed_out,false);assert.equal(execution.error,null);assert.equal(execution.cleanup_unverified,false);assert.ok(Number.isInteger(execution.bound_ms)&&execution.bound_ms>0&&execution.bound_ms<=(events.context.mode==='full'?MAX_FULL_MS:MAX_CHILD_MS));// Validate typed case/summary independently of event arrival order.
assert.ok(Array.isArray(events.cases));for(const r of events.cases){assert.deepEqual(Object.keys(r),['file','line','column','name','type','nesting','status']);assert.ok(typeof r.file==='string'&&!r.file.startsWith('/')&&!r.file.includes('\\')&&r.file.split('/').every(x=>x&&x!=='.'&&x!=='..'));assert.equal(typeof r.name,'string');assert.ok(['test','suite'].includes(r.type));assert.ok(['pass','skip','todo'].includes(r.status));assert.ok(Number.isSafeInteger(r.nesting)&&r.nesting>=0);for(const k of ['line','column'])assert.ok(r[k]===null||Number.isSafeInteger(r[k])&&r[k]>0);}const tests=events.cases.filter(x=>x.type==='test');assert.deepEqual(Object.keys(events.summary).sort(),['cancelled','fail','pass','skipped','suites','tests','todo']);for(const k of Object.keys(events.summary))assert.ok(Number.isSafeInteger(events.summary[k])&&events.summary[k]>=0);assert.equal(events.summary.tests,tests.length);assert.equal(events.summary.suites,events.cases.length-tests.length);assert.equal(events.summary.fail,0);assert.equal(events.summary.cancelled,0);for(const[s,k]of [['pass','pass'],['skip','skipped'],['todo','todo']])assert.equal(events.summary[k],tests.filter(r=>r.status===s).length);return events;}
export function aggregateReceipts(reference,parts,checked,commit,ci=null,expectedNodeMajor=20){assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);assert.ok(hex(commit,40));const ref=verifyReceipt(reference,checked,commit,ci,expectedNodeMajor);assert.equal(ref.context.mode,'full');assert.equal(ref.context.platform,'linux');assert.equal(ref.summary.tests,checked.baseline.legacy_test_count+checked.baseline.added_test_count);assert.equal(parts.length,PARTITIONS);const seen=new Set(),files=[],cases=[];const totals={tests:0,suites:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0};for(const receipt of parts){const e=verifyReceipt(receipt,checked,commit,ci,expectedNodeMajor);assert.equal(e.context.mode,'partition');assert.equal(e.context.platform,'win32');assert.ok(!seen.has(e.context.partition),'Duplicate partition');seen.add(e.context.partition);files.push(...e.context.selected_files);cases.push(...e.cases);for(const k of Object.keys(totals))totals[k]+=e.summary[k];}assert.deepEqual([...seen].sort(),[0,1,2,3]);assert.equal(new Set(files).size,files.length);assert.deepEqual(files.sort(),checked.inventory.map(r=>r.path));assert.deepEqual(cases.map(rowKey).sort(),ref.cases.map(rowKey).sort(),'Exact terminal case multiset differs');assert.deepEqual(totals,ref.summary);return {schema:'complete-ci-test-aggregate-v1',commit,ci,node_major:expectedNodeMajor,baseline_sha256:checked.baseline_sha256,partition_count:PARTITIONS,inventory:checked.inventory,summary:totals,exact_case_multiset:true,disjoint_complete_file_cover:true,complete:true};}
export async function execute(root,checked,{commit,mode,partition=null,receipt,boundMs=mode==='full'?MAX_FULL_MS:MAX_CHILD_MS,platform=process.platform,node=process.version,ci=null}){assert.ok(Number.isInteger(boundMs)&&boundMs>0&&boundMs<=(mode==='full'?MAX_FULL_MS:MAX_CHILD_MS));const context=makeContext(root,checked,{commit,mode,partition,platform,node,ci});const contextFile=receipt+'.context.json',eventsFile=receipt+'.events.json';writeExclusive(contextFile,{root:resolve(root),events_file:resolve(eventsFile),context});assert.ok(!existsSync(receipt)&&!existsSync(eventsFile));const env={...process.env,PALI_CI_TEST_CONTEXT:resolve(contextFile)};delete env.NODE_TEST_CONTEXT; // Explicit new CLI must not inherit node:test's recursive-child marker.
let timedOut=false,error=null,cleanupUnverified=false;const execution=await new Promise(resolveResult=>{let child;try{child=spawn(process.execPath,nodeArguments(root,context),{cwd:root,stdio:'inherit',detached:process.platform!=='win32',env});}catch(e){resolveResult({exit_code:null,signal:null,error:e.code??'SPAWN_ERROR',timed_out:false,cleanup_unverified:false,bound_ms:boundMs});return;}const timer=setTimeout(()=>{timedOut=true;try{if(process.platform==='win32'){const killed=execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore'});}else{process.kill(-child.pid,'SIGKILL');}}catch{cleanupUnverified=true;child.kill('SIGKILL');}},boundMs);child.once('error',e=>{error=e.code??'SPAWN_ERROR';});child.once('close',(code,signal)=>{clearTimeout(timer);resolveResult({exit_code:code,signal,error,timed_out:timedOut,cleanup_unverified:cleanupUnverified,bound_ms:boundMs});});});const events=existsSync(eventsFile)?JSON.parse(readFileSync(eventsFile,'utf8')):null;const result={schema:'complete-ci-test-receipt-v1',events,execution};writeExclusive(receipt,result);assert.equal(execution.exit_code,0,'Test process failed');assert.equal(execution.signal,null);assert.equal(execution.error,null);assert.equal(execution.timed_out,false);assert.ok(events?.complete,'Reporter must seal terminal events');assert.deepEqual(events.context,context);assert.equal(events.context_sha256,objectSha(context));assert.deepEqual(inventory(root),checked.inventory,'Test inventory changed during execution');for(const[name,pin]of Object.entries(checked.baseline.additions))assert.equal(digest(regular(root,name)),pin,'Reviewed tooling changed during execution');assert.equal(digest(regular(root,checked.baseline.driver.path)),checked.baseline.driver.sha256);return result;}
function args(argv){const values={};for(let i=0;i<argv.length;i++){assert.ok(argv[i].startsWith('--'));const key=argv[i].slice(2);assert.ok(!Object.hasOwn(values,key));if(key==='parts'){values.parts=argv.slice(i+1);assert.equal(values.parts.length,4);break;}assert.ok(i+1<argv.length);values[key]=argv[++i];}return values;}
export function ciIdentity(env=process.env) {
  if(env.GITHUB_ACTIONS!=='true') return null;
  assert.match(env.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/,'CI run identity required');
  assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]*$/,'CI run attempt required');
  assert.ok(hex(env.GITHUB_SHA,40),'CI SHA required');
  return {run_id:env.GITHUB_RUN_ID,run_attempt:env.GITHUB_RUN_ATTEMPT,sha:env.GITHUB_SHA};
}
export async function main(argv=process.argv.slice(2)){const command=argv.shift();assert.ok(command==='run'||command==='aggregate');const a=args(argv);const allowed=command==='run'?['mode','partition','receipt','baseline-index','baseline-sha']:['reference','output','baseline-index','baseline-sha','parts'];assert.ok(Object.keys(a).every(k=>allowed.includes(k)));const root=process.cwd(),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000}).trim();assert.ok(hex(commit,40));const ci=ciIdentity();if(ci)assert.equal(ci.sha,commit);const checked=loadBaseline(root,a['baseline-index'],a['baseline-sha']);if(command==='run'){assert.ok(a.mode==='full'||a.mode==='partition');assert.ok(typeof a.receipt==='string');const partition=a.partition===undefined?null:Number(a.partition);await execute(root,checked,{commit,mode:a.mode,partition,receipt:resolve(a.receipt),ci});}else{assert.equal(typeof a.output,'string');const ref=JSON.parse(readFileSync(a.reference,'utf8')),parts=a.parts.map(p=>JSON.parse(readFileSync(p,'utf8')));const expectedNodeMajor=Number(process.versions.node.split('.')[0]);assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);const result=aggregateReceipts(ref,parts,checked,commit,ci,expectedNodeMajor);writeExclusive(resolve(a.output),result);console.log(JSON.stringify({commit,complete:true,files:result.inventory.length,summary:result.summary}));}}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(fileURLToPath(import.meta.url)))main().catch(e=>{console.error('CI partition gate refused: '+e.message);process.exitCode=1;});
