import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HttpToolWorker} from '../src/http-tool-worker.mjs';

test('full-study hosting templates match the sustained CPU and memory working budget',()=>{
 const fly=readFileSync(new URL('../fly.toml',import.meta.url),'utf8'),render=readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
 const vm=fly.match(/\[\[vm\]\]([^]*?)(?=\n\[|$)/)?.[1],memory=vm?.match(/^\s*memory\s*=\s*"(\d+)(mb|gb)"/m);
 assert.ok(memory,'Fly template must state the full-study memory allocation');
 assert.ok(Number(memory[1])*(memory[2]==='gb'?1024:1)>=2048,'512 MB and 1 GB do not cover the reproduced study session');
 assert.match(vm,/cpu_kind\s*=\s*"performance"/,'A shared burst-credit CPU does not match the sustained one-CPU capacity test');
 assert.match(vm,/cpus\s*=\s*1\b/,'Re-evaluate capacity before changing the tested CPU count');
 const plan=render.match(/^\s+plan:\s*([\w.-]+)/m)?.[1],ram=plan?.match(/^[\d.]+c-(\d+)g$/)?.[1];
 assert.ok(ram&&Number(ram)>=2,'Render template must use a verified compute plan with at least 2 GB RAM');
});
test('Fly routes toward spare capacity before the core queue fills and bounds front-door concurrency',async()=>{
 const fly=readFileSync(new URL('../fly.toml',import.meta.url),'utf8'),section=fly.match(/\[http_service\.concurrency\]([^]*?)(?=\n\[|$)/)?.[1],worker=new HttpToolWorker();
 try{const soft=Number(section?.match(/soft_limit\s*=\s*(\d+)/)?.[1]),hard=Number(section?.match(/hard_limit\s*=\s*(\d+)/)?.[1]),limit=worker.status().limit;assert.match(section,/type\s*=\s*"requests"/);assert.ok(soft>0&&soft<limit,'Prefer spare Machines before the worker rejects reads');assert.ok(hard>=limit&&hard<=limit*2,'Allow metadata/retry responses without implying an unbounded request budget');}
 finally{await worker.close();}
});
