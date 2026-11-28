import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('browser preflight collectors preserve UTF-8 across byte-split stdin chunks', {timeout:15000}, () => {
  const source=readFileSync(new URL('../scripts/web-reader-thera141-180-check.py',import.meta.url),'utf8');
  const profile=source.match(/profile_probe="""([\s\S]*?)"""/);
  const canonical=source.match(/    probe = ("(?:\\.|[^"\\])*")\n    run = subprocess.run/);
  const comparison=source.match(/comparison = """([\s\S]*?)"""/);
  assert.ok(profile&&canonical&&comparison,'All three actual browser preflight programs remain covered');
  const programs=[profile[1],JSON.parse(canonical[1]),comparison[1]];
  const expected={text:'Sumedhā · 漢 · 😀',end:'unchanged'};
  const raw=Buffer.from(JSON.stringify(expected));
  for(const program of programs){
    const collectors=[...program.matchAll(/(?:process\.stdin\.setEncoding\('utf8'\);)?let s='';for await\(const c of process\.stdin\)s\+=c;/g)];
    assert.equal(collectors.length,1,'Exercise the actual collector, without replacing its algorithm');
    const collector=collectors[0][0];
    for(const character of ['ā','漢','😀']){
      const cut=raw.indexOf(Buffer.from(character))+1;
      assert.ok(cut>0&&(raw[cut]&0xc0)===0x80,'A real multi-byte character crosses the chunk boundary');
      const prefix="import{Readable}from'node:stream';const raw=Buffer.from("+JSON.stringify(raw.toString('base64'))+",'base64');Object.defineProperty(process,'stdin',{value:Readable.from([raw.subarray(0,"+cut+"),raw.subarray("+cut+")])});";
      const run=body=>spawnSync(process.execPath,['--input-type=module','-e',prefix+body+'process.stdout.write(JSON.stringify(JSON.parse(s)));'],{encoding:'utf8',timeout:3000,maxBuffer:64*1024});
      const valid=run(collector);assert.equal(valid.error,undefined);assert.equal(valid.signal,null);assert.equal(valid.status,0);assert.deepEqual(JSON.parse(valid.stdout),expected);
      const old=run(collector.replace("process.stdin.setEncoding('utf8');",''));
      assert.equal(old.error,undefined);assert.equal(old.signal,null);assert.equal(old.status,0);
      assert.notDeepEqual(JSON.parse(old.stdout),expected,'The negative control must reproduce silent replacement characters');
    }
  }
});
