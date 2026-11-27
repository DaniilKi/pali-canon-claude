import {after} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {join as hJoin,relative as hRelative} from 'node:path';
import {fileURLToPath as hFileURLToPath} from 'node:url';
import {lstatSync as hLstatSync} from 'node:fs';
const historicalH=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
after(()=>historicalH.close());
const actualHSourceRoot=hFileURLToPath(new URL('../',import.meta.url));
const HISTORY_SOURCE_PATHS=Object.freeze([".github/workflows/check.yml","package.json","scripts/audit-widget.mjs","scripts/build.mjs","scripts/web-reader-source-notes-check.py","tests/web-reader-ci-artifacts.test.mjs"]);
function readHistoricalHSource(file,...options){
 const name=typeof file==='string'?file:hRelative(actualHSourceRoot,hFileURLToPath(file)).replaceAll('\\','/');
 if(name==='.github/workflows/npx.yml'){
  // Explicit unchanged-H source witness outside the finiteH fixture; no fallback.
  for(const part of ['.github','.github/workflows']){const stat=hLstatSync(hJoin(actualHSourceRoot,part));assert.ok(stat.isDirectory()&&!stat.isSymbolicLink());}
  const actual=hJoin(actualHSourceRoot,name),stat=hLstatSync(actual);assert.ok(stat.isFile()&&!stat.isSymbolicLink());
  const raw=readFileSync(actual);assert.equal(raw.length,1779);assert.equal(createHash('sha256').update(raw).digest('hex'),'6537692c69f9c46a0fe3b4805cc2749e35d308da730435aeec95c9488e100bc9');
  assert.deepEqual(options,['utf8']);return raw.toString('utf8');
 }
 assert.ok(HISTORY_SOURCE_PATHS.includes(name),'Closed named H source input only: '+name);
 return readFileSync(hJoin(historicalH.root,name),...options);
}
import {normalizeFrozen440SourceInput} from './helpers/boundary333-336-source-input.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {projectCheckStageWorkflow} from './helpers/check-stage-baseline.mjs';

const GROUP='vrieditionnote',BASE='ff798f681147e12160167fbeb9ef1927bb54c45c';
const BASE_WORKFLOW_SHA='caba90b591b0b8855513730d4a4252afdcab467e710baf8d65ae00d0f981c8e9';
const REPORTS=['standalone-source-notes.report.json','standalone-source-notes-launch.report.json','standalone-source-notes-a11y.report.json','standalone-source-notes-a11y-launch.report.json','standalone-source-notes-independent.report.json','installed-source-notes.report.json','installed-source-notes-launch.report.json'];
const read=name=>{const raw=normalizeFrozen440SourceInput(name,readHistoricalHSource(name,'utf8'));return name==='.github/workflows/check.yml'?projectCheckStageWorkflow(raw):raw;};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const steps=text=>text.match(/^      - [^]*?(?=^      - |^  [a-z][\w-]*:|(?![^]))/gm)||[];
const named=(text,name)=>{const found=steps(text).filter(step=>step.startsWith('      - name: '+name+'\n'));assert.equal(found.length,1,name);return found[0];};
const ownSteps=text=>steps(text).filter(step=>step.includes("\n        if: matrix.group == 'vrieditionnote'\n"));
const group=text=>text.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
const groups=text=>group(text).match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
const conditionGroups=step=>step.match(/^        if: (.+)$/m)[1].split(' || ').map(term=>{const match=term.match(/^matrix\.group == '([a-z0-9]+)'$/);assert.ok(match,'finite matrix checkout condition');return match[1];});
function originalWorkflow(source){
 const additions=ownSteps(source);assert.equal(additions.length,5,'one baseline fetch and four mandatory gates');
 let restored=source;for(const step of additions)restored=restored.replace(step,'');
 restored=restored.replace(', vrieditionnote','').replaceAll(" || matrix.group == 'vrieditionnote'",'');
 restored=restored.replace('            --mount "type=bind,src=$GITHUB_WORKSPACE/web/source-notes-policy.mjs,dst=/app/web/source-notes-policy.mjs,readonly" \\\n','');
 for(const report of REPORTS)restored=restored.replace('            '+report+'\n','');
 return restored;
}

test('source-note CI preserves every byte and budget of the prior66-job workflow',()=>{
 const current=read('.github/workflows/check.yml'),original=originalWorkflow(current);assert.equal(sha(original),BASE_WORKFLOW_SHA);
 const retainedSourceStep=named(current,'Check retained reader views and the shared live cache under mixed load'),oldRetained=named(original,'Check retained reader views and the shared live cache under mixed load');
 const policyMount='            --mount "type=bind,src=$GITHUB_WORKSPACE/web/source-notes-policy.mjs,dst=/app/web/source-notes-policy.mjs,readonly" \\\n';
 assert.equal(current.split(policyMount).length-1,1,'new pure policy is mounted exactly once in the source-reader isolation job');assert.ok(retainedSourceStep.includes(policyMount));assert.equal(retainedSourceStep.replace(policyMount,''),oldRetained,'all existing mounts, no-network isolation and source-reader command stay byte-exact');
 const currentGroups=groups(current),oldGroups=groups(original);assert.equal(currentGroups.length,49);assert.equal(new Set(currentGroups).size,49);assert.equal(oldGroups.length,48);assert.deepEqual(currentGroups.filter(name=>name!==GROUP),oldGroups);
 const budget=text=>group(text).match(/^    timeout-minutes: \$\{\{ (.+) \}\}$/m)[1];const evaluate=(text,name)=>runInNewContext(budget(text),{matrix:{group:name}},{timeout:1000});
 assert.equal(evaluate(current,GROUP),20);for(const name of oldGroups)assert.equal(evaluate(current,name),evaluate(original,name),name+' keeps its exact budget');
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))[1].split(',').map(value=>value.trim());
 const node=current.split('  check:')[1],compat=current.split('  reader-compat:')[1].split('  check:')[0],install=read('.github/workflows/npx.yml');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(oldGroups.length+otherJobs,66);assert.equal(currentGroups.length+otherJobs,67);assert.doesNotMatch(node,/timeout-minutes:/);assert.equal(node,original.split('  check:')[1]);
 const historicalSourceGroups=['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanatherapair101','apadanatherapair121','apadanathera141','apadanathera161','apadanathera181','apadanathera201','apadanathera221','apadanathera231','apadanathera234','apadanathera241','apadanathera251','apadanaedition','thagsixteen'];
 const required=(text,names)=>steps(text).filter(step=>/^        run:/m.test(step)&&!step.startsWith('      - name: Fetch exact ')&&names.some(name=>step.includes("\n        if: matrix.group == '"+name+"'\n")));
 assert.equal(required(original,historicalSourceGroups).length,96);assert.equal(required(current,[...historicalSourceGroups,GROUP]).length,100);
 const sourceFixture='Check out exact public Apadāna source fixtures without credentials',xmlFixture='Check out exact public Apadāna original XML without credentials';
 assert.equal(named(current,sourceFixture),named(original,sourceFixture),'all296 Walters fixture paths and original checkout conditions stay byte-exact');
 const paths=text=>[...text.matchAll(/^            (.+)$/gm)].map(match=>match[1]);const publisherPaths=paths(named(current,sourceFixture));assert.equal(publisherPaths.length,296);assert.equal(new Set(publisherPaths).size,296);assert.ok(!conditionGroups(named(current,sourceFixture)).includes(GROUP));assert.ok(!publisherPaths.includes('src/_poems/chapter-3/poem-260.md'));
 const xml=named(current,xmlFixture);assert.equal(xml.replace(" || matrix.group == 'vrieditionnote'",''),named(original,xmlFixture));assert.ok(conditionGroups(xml).includes(GROUP));assert.deepEqual(paths(xml),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(xml,/persist-credentials: false/);
 const retained=group(current).split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);for(const report of REPORTS)assert.equal(retained.filter(path=>path===report).length,1,report+' is retained once');
});

test('source-note lane runs exact original replay and focused compatibility before three mandatory browser modes',()=>{
 const source=read('.github/workflows/check.yml'),selected=ownSteps(source);assert.equal(selected.length,5);const [baseline,validation,normal,a11y,installed]=selected;
 assert.ok(baseline.startsWith('      - name: Fetch exact source-note baseline for independent compatibility checks\n'));assert.ok(baseline.includes('git fetch --no-tags --depth=1 origin '+BASE));assert.ok(baseline.includes('git cat-file -e '+BASE+'^{commit}'));assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const replay=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/canon/build_source_notes.py '));assert.equal(replay.length,1);
 for(const flag of ['--xml .fixtures/apadana-vri-pinned/romn/s0510m1.mul.xml','--canon "$RUNNER_TEMP/vrieditionnote-inputs/canon.json.gz"','--manifest scripts/canon/source_note_manifest.json','--verify server/data/source-notes.json'])assert.ok(replay[0].includes(flag));assert.ok(replay[0].endsWith(' > standalone-source-notes-independent.report.json'));assert.doesNotMatch(replay[0],/--output|\/tmp\//);
 assert.ok(validation.includes('node scripts/shard-data.mjs --unpack server/data "$RUNNER_TEMP/vrieditionnote-inputs"'));
 assert.ok(validation.includes('VRI_SOURCE_CHECKOUT=.fixtures/apadana-vri-pinned node --test tests/source-notes.test.mjs tests/source-notes-client.test.mjs tests/source-notes-compatibility.test.mjs'));assert.equal(validation.match(/node --test/g).length,1);assert.doesNotMatch(validation,/APADANA_SOURCE_CHECKOUT|apadana\/build|tests\/apadana|tests\/thera/,'no duplicate historical publisher source cohort');
 const browser=selected.slice(2).flatMap(step=>step.split('\n').filter(line=>line.includes('python scripts/web-reader-source-notes-check.py ')));assert.equal(browser.length,3);
 assert.ok(browser[0].endsWith('--launch-receipt standalone-source-notes-launch.report.json --report standalone-source-notes.report.json'));assert.doesNotMatch(browser[0],/--a11y|--server-dir/);
 assert.ok(browser[1].endsWith('--a11y --launch-receipt standalone-source-notes-a11y-launch.report.json --report standalone-source-notes-a11y.report.json'));
 assert.ok(browser[2].includes('--server-dir "$RUNNER_TEMP/source-notes-installed/node_modules/pali-canon-mcp/server" --package-archive "$1" --launch-receipt installed-source-notes-launch.report.json --report installed-source-notes.report.json'));
 assert.ok(installed.includes('npm pack --pack-destination "$RUNNER_TEMP/source-notes-package"'));assert.ok(installed.includes('set -- "$RUNNER_TEMP/source-notes-package/"*.tgz\n          test "$#" -eq 1\n          test -f "$1"'));
 assert.ok(installed.includes('npm install --prefix "$RUNNER_TEMP/source-notes-installed" --offline --ignore-scripts --no-audit --no-fund --package-lock=false "$1"'));assert.doesNotMatch(installed,/tar -x|cp -R|package\/server/);
 assert.doesNotMatch(selected.join('\n'),/--mcp-only|--pilot|--source-root|--live|curl |wget |continue-on-error|\|\| true|npm run check|npm test/);
});

test('finite source-note projection leaves all34 historical artifact tests byte-for-byte intact',()=>{
 const current=read('tests/web-reader-ci-artifacts.test.mjs');const begin='// Source-note-only projection: retain every original historical assertion below unchanged.\n',end='// End source-note-only projection.\n\n';
 assert.equal(current.split(begin).length,2);assert.equal(current.split(end).length,2);const start=current.indexOf(begin),finish=current.indexOf(end,start)+end.length;const adapter=current.slice(start,finish);
 assert.match(adapter,/conditionalSteps\(source,'vrieditionnote'\)/);assert.match(adapter,/additions\.length,5/);assert.doesNotMatch(adapter,/filter\(|timeout|sha256|\.includes\('apadana/,'adapter removes only explicit source-note additions');
 const old=(current.slice(0,start)+current.slice(finish)).replaceAll('sourceNotesHistoricalWorkflow()',"readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8')");assert.equal(sha(old),'9b1f4ffdc57bbbffc3c92128fa0d13e500072343550fc0a0ee379e1dca40f84e','all prior assertions, sealed hashes and historical budgets remain exact');assert.equal(old.split('\n').filter(line=>line.startsWith('test(')).length,34);
});

test('source-note package gate retains strict widget equality and binds the original sidecar and policy before launch',()=>{
 const auditor=read('scripts/audit-widget.mjs');assert.equal(sha(auditor),'0f80a72b6b348ff147709b076534aca0088d95034925c9d92b02e1e313c51bbf','original strict widget audit is unchanged');assert.ok(auditor.includes("for (const uri of [WIDGET_URI, SKYBRIDGE_URI]) assert.equal((await client.readResource({ uri })).contents[0].text, WIDGET_HTML)"));
 const build=read('scripts/build.mjs');assert.ok(build.includes('define: { __PALI_WIDGET_HASH_SOURCE__: JSON.stringify(contentSha256.toString()) }'));assert.ok(build.includes("import { createSourceNotesPolicy } from '../web/source-notes-policy.mjs'"));assert.ok(build.includes('common.define.__PALI_SOURCE_NOTES_POLICY_SOURCE__ = JSON.stringify(createSourceNotesPolicy.toString());'),'new independent factory literal leaves original SHA helper literal unchanged');
 const registry=readFileSync(new URL('../server/data/source-notes.json',import.meta.url));assert.equal(sha(registry),'1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e');const artifact=JSON.parse(registry);assert.equal(artifact.schema,'vri-source-note-registry-v1');assert.equal(artifact.extraction_revision,'sariputta-note1130-v1');assert.deepEqual(artifact.records.map(row=>row.id),['vri:s0510m1:note-only:1130']);assert.ok(JSON.parse(read('package.json')).files.includes('server'),'committed sidecar is in actual npm package data directory');
 const harness=read('scripts/web-reader-source-notes-check.py');
 const launch=harness.indexOf("launch={'status':'launching'"),write=harness.search(/assert not launchpath\.exists\(\)[^\n]+;\s*write_launch\(\)/),popen=harness.search(/server\s*=\s*subprocess\.Popen\(/);assert.ok(launch>=0&&write>launch&&popen>write,'source-note receipt exists before launching installed runtime');
 const receipt=harness.slice(launch,write);for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','started_utc','server_argv','server_cwd','package_archive','approval_sha256','record_sha256','registry_sha256'])assert.ok(receipt.includes(field),'before-launch receipt binds '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name\s*==\s*'node_modules'/);assert.match(harness,/not server_dir\.is_relative_to\(ROOT\)/);assert.match(harness,/isolated-npm-install/);assert.match(harness,/start_new_session=True/);assert.match(harness,/server_process_group/);assert.match(harness,/server_group_cleanup/);assert.match(harness,/os\.killpg\(/);
});
