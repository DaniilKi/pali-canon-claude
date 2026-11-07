import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fetchRecorderSource, readFetchLedger } from './helpers/synthetic-fetch-ledger.mjs';

test('authoritative fixture counts do not change when earlier stderr arrives after a response',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pali-ledger-test-'));const path=join(dir,'events.jsonl');let child;
 try{
  await writeFile(path,'');
  const code=`const pending=[];console.error=message=>pending.push(String(message));${fetchRecorderSource(path)}recordSyntheticFetch('https://synthetic.invalid/earlier');process.stdout.write('RESPONSE\\n');process.stdin.once('data',()=>{for(const message of pending)process.stderr.write(message+'\\n');process.stdin.pause()});`;
  child=spawn(process.execPath,['-e',code],{stdio:['pipe','pipe','pipe']});let stderr='';child.stderr.on('data',b=>{stderr+=b;});
  const ended=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Fixture exited '+code)));});
  await new Promise((resolve,reject)=>{child.stdout.once('data',()=>resolve());child.once('error',reject);child.once('exit',code=>reject(Error('No response, exit '+code)));});
  assert.equal(stderr,'');const before=await readFetchLedger(path);assert.deepEqual(before,[{kind:'fetch',url:'https://synthetic.invalid/earlier'}]);
  const oldStderrCount=(stderr.match(/SYNTHETIC_FETCH /g)||[]).length;
  child.stdin.end('FLUSH\n');await ended;
  assert.equal((stderr.match(/SYNTHETIC_FETCH /g)||[]).length,oldStderrCount+1,'Old log counting changes even though no additional fetch ran');
  assert.deepEqual(await readFetchLedger(path),before,'Provider-side evidence remains exact');
 }finally{if(child&&child.exitCode===null)child.kill();await rm(dir,{recursive:true,force:true});}
});

test('missing or malformed ledger evidence cannot silently pass as zero fetches',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pali-ledger-invalid-'));const path=join(dir,'events.jsonl');
 try{
  await assert.rejects(readFetchLedger(path));
  for(const text of ['{"kind":"fetch","url":"x"}', 'not json\n','{"kind":"other"}\n','{"kind":"fetch"}\n','{"kind":"fetch","url":"x","extra":true}\n']){
   await writeFile(path,text);await assert.rejects(readFetchLedger(path));
  }
  await writeFile(path,'{"kind":"unexpected"}\n');assert.deepEqual(await readFetchLedger(path),[{kind:'unexpected'}]);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('an unexpected network attempt is recorded synchronously before it throws',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'pali-ledger-reject-'));const path=join(dir,'events.jsonl');
 try{
  await writeFile(path,'');
  const code=`${fetchRecorderSource(path)}try{rejectUnexpectedNetwork();process.exitCode=2}catch(error){if(error.message!=='UNEXPECTED_NETWORK_ATTEMPT')process.exitCode=3}`;
  const child=spawn(process.execPath,['-e',code],{stdio:['ignore','ignore','pipe']});child.stderr.resume();
  await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>code===0?resolve():reject(Error('Fixture exited '+code)));});
  assert.deepEqual(await readFetchLedger(path),[{kind:'unexpected'}]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
