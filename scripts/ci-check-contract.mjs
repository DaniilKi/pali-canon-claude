// CI may expose the existing full check as separate, fail-closed steps only
// while this exact command contract holds. No test filtering or retry is added.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const CHECK_STAGES=Object.freeze([
  Object.freeze({script:'build',command:'npm run build',body:'node scripts/build.mjs'}),
  Object.freeze({script:'test',command:'npm test',body:'node scripts/test.mjs'}),
  Object.freeze({script:'audit',command:'npm run audit',body:'node scripts/audit.mjs'}),
]);

export function verifyCheckContract(pkg){
  assert.ok(pkg?.scripts&&typeof pkg.scripts==='object','Full check scripts must be present');
  const scripts=pkg.scripts;
  assert.equal(scripts.check,'npm run build && npm test && npm run audit','CI must include every complete check component');
  for(const hook of ['precheck','postcheck'])assert.ok(!Object.hasOwn(scripts,hook),'A check-only lifecycle hook requires explicit CI integration: '+hook);
  for(const stage of CHECK_STAGES)assert.equal(scripts[stage.script],stage.body,'The complete '+stage.script+' command changed; review CI before running it');
  return CHECK_STAGES;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const stages=verifyCheckContract(JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')));
  console.log(JSON.stringify({status:'passed',node:process.version,platform:process.platform,arch:process.arch,commands:stages.map(stage=>stage.command)}));
}
