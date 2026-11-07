import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('full-study hosting templates allocate at least the reproduced 2 GiB working budget',()=>{
 const fly=readFileSync(new URL('../fly.toml',import.meta.url),'utf8'),render=readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
 const vm=fly.match(/\[\[vm\]\]([^]*?)(?=\n\[|$)/)?.[1],memory=vm?.match(/^\s*memory\s*=\s*"(\d+)(mb|gb)"/m);
 assert.ok(memory,'Fly template must state the full-study memory allocation');
 assert.ok(Number(memory[1])*(memory[2]==='gb'?1024:1)>=2048,'512 MB and 1 GB do not cover the reproduced study session');
 const plan=render.match(/^\s+plan:\s*([\w.-]+)/m)?.[1],ram=plan?.match(/^[\d.]+c-(\d+)g$/)?.[1];
 assert.ok(ram&&Number(ram)>=2,'Render template must use a verified compute plan with at least 2 GB RAM');
});
