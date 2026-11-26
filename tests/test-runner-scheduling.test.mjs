import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';

function ownedDriver(){
 const root=mkdtempSync(join(tmpdir(),'pali-driver-probe-'));
 const script=join(root,'scripts/test.mjs');
 mkdirSync(join(root,'scripts'));mkdirSync(join(root,'tests'));
 const source=readFileSync(new URL('../scripts/test.mjs',import.meta.url));
 writeFileSync(script,source);assert.deepEqual(readFileSync(script),source);
 const names=readdirSync(new URL('./',import.meta.url),{withFileTypes:true})
  .filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')).map(entry=>entry.name);
 assert.ok(names.length>0&&!names.includes('synthetic-extra.test.mjs'));
 names.push('synthetic-extra.test.mjs');
 for(const name of names)writeFileSync(join(root,'tests',name),'// Owned synthetic discovery input; never executed.\n');
 writeFileSync(join(root,'tests','ignored.mjs'),'// Not a test file.\n');
 mkdirSync(join(root,'tests','nested'));writeFileSync(join(root,'tests','nested','ignored.test.mjs'),'// Not top-level.\n');
 return {root,script,files:names.sort().map(name=>resolve(root,'tests',name)),close:()=>rmSync(root,{recursive:true,force:true})};
}
// The real driver is copied byte-for-byte into an owned fixture. Every child
// process API is intercepted before import; no synthetic test body can execute.
const probeSource=String.raw`
import cp from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import {pathToFileURL} from 'node:url';
import 'node:path';
const input=JSON.parse(process.argv[1]);
for(const name of ['spawn','fork','exec','execSync','execFile','execFileSync'])cp[name]=()=>{throw Error('Unexpected subprocess API: '+name);};
const mock=(executable,args,options)=>{
 if(executable!==process.execPath||options.stdio!=='inherit')throw Error('Unexpected test child');
 console.log(JSON.stringify({executable,args,stdio:options.stdio}));
 return {status:input.status,...(input.childError?{error:new Error('Synthetic child spawn error')}: {})};
};
cp.spawnSync=mock;syncBuiltinESMExports();
if((await import('node:child_process')).spawnSync!==mock)throw Error('Interception not installed');
Object.defineProperty(process,'platform',{value:input.platform});
process.argv=[process.execPath,input.script,...input.extra];
await import(pathToFileURL(input.script).href);
`;
function probe(fixture,platform,status,extra=[],childError=false){
 const input={platform,status,script:fixture.script,extra,childError};
 const r=spawnSync(process.execPath,['--input-type=module','-e',probeSource,JSON.stringify(input)],{
  cwd:fixture.root,encoding:'utf8',timeout:10000,killSignal:'SIGKILL',maxBuffer:256*1024,
 });
 assert.equal(r.error,undefined,String(r.error||''));
 assert.equal(r.signal,null,r.stderr);
 const lines=r.stdout.trim().split(/\r?\n/);
 assert.equal(lines.length,1,'Exactly one test-runner child invocation');
 const observed=JSON.parse(lines[0]);
 assert.equal(observed.executable,process.execPath);
 assert.equal(observed.stdio,'inherit');
 return {status:r.status,args:observed.args};
}

test('actual driver discovers every test once and preserves trailing options on all platforms',{timeout:35000},()=>{
 const fixture=ownedDriver(),extra=['--test-name-pattern=synthetic-probe'];
 try{
  for(const platform of ['win32','linux','darwin']){
   const r=probe(fixture,platform,0,extra);
   assert.equal(r.status,0);
   const flags=platform==='win32'?['--test','--test-concurrency=1']:['--test'];
   assert.deepEqual(r.args,[...flags,...fixture.files,...extra]);
   assert.equal(new Set(r.args.filter(value=>value.endsWith('.test.mjs'))).size,fixture.files.length);
  }
 }finally{fixture.close();}
});

test('actual driver forwards failures and refuses absent status or child spawn errors',{timeout:35000},()=>{
 const fixture=ownedDriver();
 try{
  for(const platform of ['win32','linux','darwin']){
   assert.equal(probe(fixture,platform,19).status,19);
   assert.equal(probe(fixture,platform,null).status,1);
   assert.equal(probe(fixture,platform,null,[],true).status,1);
  }
 }finally{fixture.close();}
});
