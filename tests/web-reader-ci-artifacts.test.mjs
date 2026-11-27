// Exact unchanged H witnesses physically read at actual R. This finite map is
// independently Git-H authenticated; it is not current375 source truth or fallback.
import {lstatSync as statFixedHCurrentWitness} from 'node:fs';
const FIXED_H_UNCHANGED_CURRENT_WITNESSES=Object.freeze(Object.fromEntries(Object.entries({".github/workflows/npx.yml":{"bytes":1779,"sha256":"6537692c69f9c46a0fe3b4805cc2749e35d308da730435aeec95c9488e100bc9","git_blob":"f1d18733de99afce020f7e1f7b311daae33d1b75","mode":"100644"},".github/workflows/corpus.yml":{"bytes":815,"sha256":"d2882ae1443d7bcb371d2b75b3dc1bd0165256bb7d0e38aa8ab22300d0d350a1","git_blob":"55a50d5d72b1a662eadc6913624bff5459d1d737","mode":"100644"},".github/workflows/evidence.yml":{"bytes":6533,"sha256":"15ec53e5fb36ce9d058871777a347c92ff45d37fdd0ec6559aabf34abbc9b851","git_blob":"bc39fb8ab9d703b3ecf52ffe1bcdf570fd5a3880","mode":"100644"},"docs/evidence/apadana/THERA_SEVENTH_GOLDENS.json":{"bytes":80348,"sha256":"7071e9ceaa4475a974b30ee7afa43cd8f5186c30e198e8290752b340972fca68","git_blob":"92398316656a3654cd90c0c77e4ac49523d4d700","mode":"100644"},"docs/evidence/apadana/THERA_EIGHTH_GOLDENS.json":{"bytes":85569,"sha256":"4297ca598c8f0b78176f5e74cf158a581ce173a022f9c070ce3d8f9cce044d8b","git_blob":"b13bd3211ec07a16bef2e3b5c5ba64f67529adb6","mode":"100644"},"docs/evidence/apadana/THERA_NINTH_GOLDENS.json":{"bytes":123430,"sha256":"070286aa013457d7bd387121945b8b720b83f1aeb1f6a788409594535de712f5","git_blob":"54425b85baeb0fbf55c1e407f8ee078a29f48a48","mode":"100644"},"docs/evidence/apadana/THERA_TENTH_GOLDENS.json":{"bytes":138401,"sha256":"2bbc739ecb97d198ecc0e4f6d599569bc846c74e03744367c649d3e87309db89","git_blob":"16e40ca4af70f3cc9a0849dce0921528d95b9c7d","mode":"100644"},"docs/evidence/apadana/THERA_EDITORIAL_GAP_GOLDENS.json":{"bytes":26654,"sha256":"1aa8fadf962964ddf1ee2faefa86bcf3914944337ba61b7e2214600170210ac8","git_blob":"db0b8d04ae881ae69fdd03523c704886fc4971d4","mode":"100644"},"docs/evidence/apadana/THERA_ELEVENTH_GOLDENS.json":{"bytes":143916,"sha256":"d53ff2d5f4abc6c78d6b5bed3b2b096def1ac35f665fe82263605a440a46284d","git_blob":"d9d918e68622c0f4eaf1738d20d15287b395fb0c","mode":"100644"},"docs/evidence/apadana/THERA_TWELFTH_GOLDENS.json":{"bytes":163777,"sha256":"75148adcdafab5931e527400e2e97129d1a04df58c0ad91142c5dac1564a9d5b","git_blob":"75cf95c7faec462d222e315922fbb4ccf0031e8b","mode":"100644"},"docs/evidence/apadana/THERA_THIRTEENTH_GOLDENS.json":{"bytes":188638,"sha256":"bd2ef2c127a6e67b63aa78552845556d1490445c35ca12809859deddf5ea6e97","git_blob":"1220382357a03b14f34b77a8664eef9964073e92","mode":"100644"},"docs/evidence/apadana/THERA_FOURTEENTH_GOLDENS.json":{"bytes":159872,"sha256":"f3106f279d9e41cc3ebf72ff574a7f1d968e5f5b6555a1dad7f18cc0cd3f8e07","git_blob":"1178095c711eac7535f7df571e772becbedd2b6e","mode":"100644"}}).map(([path,row])=>[path,Object.freeze(row)])));
function readFixedHUnchangedCurrentWitness(path,...options){
 assert.equal(typeof path,'string');assert.ok(Object.hasOwn(FIXED_H_UNCHANGED_CURRENT_WITNESSES,path),'Only the literal twelve H witnesses may read actual R');
 assert.ok(options.length===0||options.length===1&&options[0]==='utf8','Exact original Buffer or utf8 read mode');
 const row=FIXED_H_UNCHANGED_CURRENT_WITNESSES[path];assert.equal(row.mode,'100644');
 let target=new URL('../',import.meta.url);const parts=path.split('/');
 for(let i=0;i<parts.length;i++){target=new URL(parts[i]+(i===parts.length-1?'':'/'),target);const stat=statFixedHCurrentWitness(target);assert.equal(stat.isSymbolicLink(),false);assert.equal(i===parts.length-1?stat.isFile():stat.isDirectory(),true);}
 const raw=readOwnedHPhysicalFile(target);assert.equal(raw.length,row.bytes,'Fixed H unchanged witness byte count '+path);assert.equal(createHash('sha256').update(raw).digest('hex'),row.sha256,'Fixed H unchanged witness SHA '+path);
 assert.equal(createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex'),row.git_blob,'Fixed H Git blob identity '+path);
 return options.length?raw.toString('utf8'):raw;
}
// Historical H source/metadata inputs only. The owned provider validates CURRENT375 first.
// Registration stays at this actual-R file; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readCurrentFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';
const {frozen440FileReader}=await import(new URL('tests/helpers/boundary333-336-source-input.mjs',HistoricalHBase).href);
const readFileSync=frozen440FileReader(readCurrentFileSync);
import {createHash} from 'node:crypto';

const REMAINING_GROUPS=['apadanathera231','apadanathera251'];
const beforeRemainingGroups=groups=>groups.filter(name=>!REMAINING_GROUPS.includes(name));
const INTAKE_221_230_GROUPS=['apadanathera221'];
const before221230Groups=groups=>beforeRemainingGroups(groups).filter(name=>!INTAKE_221_230_GROUPS.includes(name));
const INTAKE_241_250_GROUPS=['apadanathera241'];
const before241250Groups=groups=>before221230Groups(groups).filter(name=>!INTAKE_241_250_GROUPS.includes(name));
const INTAKE_181_220_GROUPS=['apadanathera181','apadanathera201'];
const before181220Groups=groups=>before241250Groups(groups).filter(name=>!INTAKE_181_220_GROUPS.includes(name));
const INTAKE_141_180_GROUPS=['apadanathera141','apadanathera161'];
const before141180Groups=groups=>before181220Groups(groups).filter(name=>!INTAKE_141_180_GROUPS.includes(name));
const PAIR_GROUPS=['apadanatherapair101','apadanatherapair121'];
const beforePairGroups=groups=>before141180Groups(groups).filter(name=>!PAIR_GROUPS.includes(name));
const pairFixtureFiles=Array.from({length:41},(_,i)=>'src/_poems/chapter-3/poem-'+String(i+101).padStart(3,'0')+'.md');
const intake141180FixtureFiles=Array.from({length:40},(_,i)=>'src/_poems/chapter-3/poem-'+String(i+142)+'.md');
const intake181220FixtureFiles=Array.from({length:40},(_,i)=>'src/_poems/chapter-3/poem-'+String(i+182)+'.md');
const intake241250FixtureFiles=Array.from({length:10},(_,i)=>'src/_poems/chapter-3/poem-'+String(i+241)+'.md');
// Publisher221 is an unchanged prior neighbor;231 is only the new boundary fixture.
const intake221230FixtureFiles=Array.from({length:10},(_,i)=>'src/_poems/chapter-3/poem-'+String(i+222)+'.md');
const intake221230Reports=['standalone-apadanathera221.report.json','standalone-apadanathera221-launch.report.json','standalone-apadanathera221-a11y.report.json','standalone-apadanathera221-a11y-launch.report.json','standalone-apadanathera221-independent.report.json','installed-apadanathera221.report.json','installed-apadanathera221-launch.report.json'];
const remainingFixtureFiles=[232,233,235,236,237,238,239,240,251,252,253,254,255,256,257,258,259].map(n=>'src/_poems/chapter-3/poem-'+n+'.md');
const remainingReports=REMAINING_GROUPS.flatMap(name=>[['standalone',''],['standalone','-launch'],['standalone','-a11y'],['standalone','-a11y-launch'],['standalone','-independent'],['installed',''],['installed','-launch']].map(([prefix,suffix])=>prefix+'-'+name+suffix+'.report.json'));

const stepsOf=source=>source.match(/^      - [^]*?(?=^      - |^  [a-z][\w-]*:|(?![^]))/gm)||[];
const namedStep=(source,name)=>{
 const steps=stepsOf(source).filter(step=>step.startsWith('      - name: '+name+'\n'));
 assert.equal(steps.length,1,'exact named CI step: '+name);return steps[0];
};
function conditionGroups(step){
 const condition=step.match(/^        if: (.+)$/m)?.[1];assert.ok(condition,'source checkout has an explicit matrix condition');
 return condition.split(' || ').map(term=>{const name=term.match(/^matrix\.group == '([a-z0-9]+)'$/)?.[1];assert.ok(name,'only explicit finite groups may select a public source checkout');return name;});
}
const conditionalSteps=(source,name)=>stepsOf(source).filter(step=>step.includes("\n        if: matrix.group == '"+name+"'\n"));
function beforeRemainingWorkflow(source){
 if(!source.includes("matrix.group == 'apadanathera231'")&&!source.includes("matrix.group == 'apadanathera251'"))return source;
 const added=[namedStep(source,'Fetch exact remaining-intake baseline for independent preservation checks'),...REMAINING_GROUPS.flatMap(name=>conditionalSteps(source,name))];assert.equal(added.length,9,'only shared baseline fetch and two four-step source/browser groups are projected out');
 let projected=source;for(const step of added)projected=projected.replace(step,'');
 for(const name of REMAINING_GROUPS)projected=projected.replace(', '+name,'').replaceAll(" || matrix.group == '"+name+"'",'');
 for(const file of remainingFixtureFiles)projected=projected.replace('            '+file+'\n','');
 for(const report of remainingReports)projected=projected.replace('            '+report+'\n','');
 return projected;
}
function before221230Workflow(source){
 source=beforeRemainingWorkflow(source);
 const additions=conditionalSteps(source,'apadanathera221');assert.equal(additions.length,5,'finite221 projection removes only one baseline fetch and four required steps');
 let projected=source;for(const step of additions)projected=projected.replace(step,'');
 projected=projected.replace(', apadanathera221','').replaceAll(" || matrix.group == 'apadanathera221'",'');
 for(const file of intake221230FixtureFiles)projected=projected.replace('            '+file+'\n','');
 for(const report of intake221230Reports)projected=projected.replace('            '+report+'\n','');
 return projected;
}

const HELD234_GROUP='apadanathera234';
const held234Reports=[['standalone',''],['standalone','-launch'],['standalone','-a11y'],['standalone','-a11y-launch'],['standalone','-independent'],['installed',''],['installed','-launch']].map(([prefix,suffix])=>prefix+'-'+HELD234_GROUP+suffix+'.report.json');
function beforeHeld234Workflow(source){
 if(!source.includes("matrix.group == 'apadanathera234'"))return source;
 const additions=conditionalSteps(source,HELD234_GROUP);assert.equal(additions.length,5,'one immutable baseline fetch and four required source/browser gates');
 let projected=source;for(const step of additions)projected=projected.replace(step,'');
 projected=projected.replace(', '+HELD234_GROUP,'').replaceAll(" || matrix.group == '"+HELD234_GROUP+"'",'');
 projected=projected.replace('            src/_poems/chapter-3/poem-234.md\n','');
 for(const report of held234Reports)projected=projected.replace('            '+report+'\n','');
 return projected;
}

// Source-note-only projection: retain every original historical assertion below unchanged.
const {projectCheckStageWorkflow}=await import(new URL('tests/helpers/check-stage-baseline.mjs',HistoricalHBase).href);
function beforeSourceNotesWorkflow(source){
 if(!source.includes("matrix.group == 'vrieditionnote'"))return source;
 const additions=conditionalSteps(source,'vrieditionnote');assert.equal(additions.length,5,'only one source-note baseline fetch and four mandatory gates are projected out');
 let projected=source;for(const step of additions)projected=projected.replace(step,'');
 projected=projected.replace(', vrieditionnote','').replaceAll(" || matrix.group == 'vrieditionnote'",'');
 projected=projected.replace('            --mount "type=bind,src=$GITHUB_WORKSPACE/web/source-notes-policy.mjs,dst=/app/web/source-notes-policy.mjs,readonly" \\\n','');
 for(const report of ['standalone-source-notes.report.json','standalone-source-notes-launch.report.json','standalone-source-notes-a11y.report.json','standalone-source-notes-a11y-launch.report.json','standalone-source-notes-independent.report.json','installed-source-notes.report.json','installed-source-notes-launch.report.json'])projected=projected.replace('            '+report+'\n','');
 return projected;
}
function sourceNotesHistoricalWorkflow(){return beforeSourceNotesWorkflow(projectCheckStageWorkflow(readFileSync(new URL('.github/workflows/check.yml',HistoricalHBase),'utf8')));}
// End source-note-only projection.

test('every browser-group JSON report is retained as a CI artifact',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 assert.ok(group,'browser matrix exists');
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(x=>x.trim());
 assert.ok(selected?.includes('highlights'),'source-aware highlight acceptance is selected');
 assert.ok(selected?.includes('navigation'),'source-pinned navigation acceptance is selected');
 assert.ok(selected?.includes('conflicts'),'local note-conflict acceptance is selected');
 assert.ok(selected?.includes('booksearch'),'complete source-book search acceptance is selected');
 assert.ok(selected?.includes('chapters'),'chapter and compact-context acceptance is selected');
 for(const name of ['anten','textspacing','apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition','thagsixteen',...PAIR_GROUPS,...INTAKE_141_180_GROUPS,...INTAKE_181_220_GROUPS,...INTAKE_241_250_GROUPS,...INTAKE_221_230_GROUPS,...REMAINING_GROUPS]){
  assert.ok(selected?.includes(name),name+' acceptance is selected');
  const steps=[...group.matchAll(new RegExp("if: matrix\\.group == '"+name+"'([^]*?)(?=\\n      -|$)",'g'))].map(match=>match[1]).join('\n');
  assert.match(steps,/--a11y/,name+' accessibility mode runs');
  assert.match(steps,/--(?:package|server)-dir/,name+' isolated package mode runs');
  assert.ok((steps.match(/--report/g)||[]).length>=3,name+' retains normal, accessibility and isolated package reports');
 }
 for(const condition of group.matchAll(/matrix\.group == '([^']+)'/g))assert.ok(selected.includes(condition[1]),`browser group ${condition[1]} has steps but is never selected`);
 const produced=new Set([...group.matchAll(/--report\s+([\w.-]+\.report\.json)/g)].map(x=>x[1]));
 for(const x of group.matchAll(/>\s+([\w.-]+\.report\.json)/g))produced.add(x[1]);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0];
 assert.ok(paths,'artifact upload paths exist');assert.ok(produced.size>10,'report discovery cannot silently become empty');
 const retained=new Set(paths.trim().split(/\s+/));
 for(const report of produced)assert.ok(retained.has(report),`${report} is generated but not retained`);
});

test('installed Firefox and WebKit evidence is retained and required by reader acceptance',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const compat=source.split('  reader-compat:')[1]?.split(/^  [a-z][\w-]*:/m)[0];
 assert.ok(compat,'cross-engine job exists');
 assert.match(compat,/engine:\s*\[firefox,\s*webkit\]/,'both independent engines run');
 assert.match(compat,/playwright install --with-deps \$\{\{ matrix\.engine \}\}/,'install requested engine rather than substituting Chromium');
 assert.match(compat,/web-reader-compat-check\.py[^\n]+--engine \$\{\{ matrix\.engine \}\}[^\n]+--server-dir/,'execute actual engine against installed runtime');
 const produced=[...compat.matchAll(/--report\s+([\w.-]+\.report\.json)/g)].map(x=>x[1]);
 assert.ok(produced.length,'compatibility evidence cannot silently become empty');
 const paths=compat.split('          path:')[1];
 assert.ok(paths,'compatibility artifact upload exists');
 for(const report of produced)assert.ok(paths.includes(report),`${report} is generated but not retained`);
 const aggregate=source.split('  reader-browser:')[1]?.split('  reader-compat:')[0];
 assert.match(aggregate,/needs:[^\n]*reader-browser-group[^\n]*reader-compat/,'aggregate must await Chromium and independent engines');
 assert.match(aggregate,/needs\['reader-compat'\]\.result/,'aggregate checks engine failures');
 assert.match(aggregate,/COMPAT_RESULT[^\n]*success/,'compatibility result must succeed');
});

test('the existing draft-safety gate runs quotation and commentary focus in all three modes',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const steps=[...group.matchAll(/if: matrix\.group == 'draftsafety'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]).join('\n');
 const commands=steps.split('\n').filter(line=>line.includes('python scripts/web-reader-study-focus-check.py'));
 assert.equal(commands.length,3,'normal, accessibility and installed checks are required');
 assert.ok(commands.some(line=>line.includes('--a11y --report standalone-study-focus-a11y.report.json')));
 assert.ok(commands.some(line=>line.includes('--server-dir "$RUNNER_TEMP/draft-focus-package/package/server" --report installed-study-focus.report.json')));
 assert.ok(commands.some(line=>line.includes('--report standalone-study-focus.report.json')));
});


test('Apadāna browser CI uses a pinned public fixture without persisted credentials or publisher network',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const fixture=source.split('      - name: Check out exact public Apadāna source fixtures without credentials')[1]?.split('      - name: Validate all Apadāna source and rights pins')[0];
 assert.ok(fixture,'exact public fixture checkout exists');
 assert.deepEqual(beforePairGroups(conditionGroups(fixture)),['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition']);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);
 assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);
 assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files.filter(path=>!pairFixtureFiles.includes(path)&&!intake141180FixtureFiles.includes(path)&&!intake181220FixtureFiles.includes(path)&&!intake241250FixtureFiles.includes(path)&&!intake221230FixtureFiles.includes(path)&&!remainingFixtureFiles.includes(path)),['LICENSE.md','src/_pages/about.md','src/_includes/site/footer.njk','src/_includes/layouts/epub-metadata.xml','src/_data/site.json','src/_poems/_poems.json',...Array.from({length:40},(_,i)=>i+1).map(n=>'src/_poems/chapter-4/poem-'+String(n).padStart(3,'0')+'.md'),...Array.from({length:90},(_,i)=>i+11).map(n=>'src/_poems/chapter-3/poem-'+String(n).padStart(3,'0')+'.md'),'src/_poems/chapter-3/chapter-3.json']);
 const steps=[...source.matchAll(/if: matrix\.group == 'apadana'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]).join('\n');
 assert.match(steps,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.equal((steps.match(/python scripts\/web-reader-apadana-check\.py --source-root \.fixtures\/apadana-pinned/g)||[]).length,3);
 assert.equal((steps.match(/python scripts\/web-reader-apadana-three-check\.py --source-root \.fixtures\/apadana-pinned/g)||[]).length,3);
 assert.match(steps,/node --test tests\/apadana-parser\.test\.mjs/);
 assert.doesNotMatch(steps,/--live|https:\/\/apadanatranslation\.com|curl |wget /);
 const paths=source.split('          path: |')[1].split('          if-no-files-found:')[0];
 assert.doesNotMatch(paths,/fixtures|poem-|\.md|apadana-site/,'only metadata reports are uploaded, never source fixtures');
});


test('next Apadāna chapter has independent bounded source acceptance and retained reports',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 assert.match(source,/group:[^\n]*apadananext/);assert.match(source,/matrix\.group == 'apadananext'[^\n]*20/);
 const steps=[...source.matchAll(/if: matrix\.group == 'apadananext'([^]*?)(?=\n      -|$)/g)].map(m=>m[1]).join('\n');
 assert.equal((steps.match(/python scripts\/web-reader-apadana-next-check\.py --source-root \.fixtures\/apadana-pinned/g)||[]).length,3);
 assert.match(steps,/node --test tests\/apadana-next\.test\.mjs tests\/apadana-next-client\.test\.mjs tests\/apadana-next-boundaries\.test\.mjs/);
 assert.doesNotMatch(steps,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
});


test('third Apadāna chapter has its own bounded pinned-source and three-mode browser gate',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanathird').length,1);
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanathird'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'apadanathird'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,4,'one source/refusal step and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(commands,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-third\.test\.mjs tests\/apadana-third-boundaries\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-third-check.py --source-root .fixtures/apadana-pinned'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-third.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-third-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-third-package/package/server" --report installed-apadana-third.report.json')));
 assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>path.includes('apadana-third')),['standalone-apadana-third.report.json','standalone-apadana-third-a11y.report.json','installed-apadana-third.report.json']);
});


test('fourth Apadāna chapter has its own bounded pinned-source and three-mode browser gate',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanafourth').length,1);
 assert.equal(beforePairGroups(selected).length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanafourth'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'apadanafourth'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,4,'one source/refusal step and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(commands,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-fourth\.test\.mjs tests\/apadana-fourth-client\.test\.mjs tests\/apadana-fourth-boundaries\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-fourth-check.py --source-root .fixtures/apadana-pinned'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-fourth.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-fourth-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-fourth-package/package/server" --report installed-apadana-fourth.report.json')));
 assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>path.includes('apadana-fourth')),['standalone-apadana-fourth.report.json','standalone-apadana-fourth-a11y.report.json','installed-apadana-fourth.report.json']);
});


test('Therā publisher selections has its own bounded pinned-source and three-mode browser gate',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanathera').length,1);
 assert.equal(beforePairGroups(selected).length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanathera'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'apadanathera'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,4,'one source/refusal step and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(commands,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-thera\.test\.mjs tests\/apadana-thera-boundaries\.test\.mjs tests\/thera-commentary-locators\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-thera-check.py --source-root .fixtures/apadana-pinned'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-thera.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-thera-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-thera-package/package/server" --report installed-apadana-thera.report.json')));
 assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>/^(?:standalone|installed)-apadana-thera(?:-a11y)?\.report\.json$/.test(path)),['standalone-apadana-thera.report.json','standalone-apadana-thera-a11y.report.json','installed-apadana-thera.report.json']);
});


test('publisher-edition navigation has an independent bounded three-mode gate without English retrieval',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanaedition').length,1);
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanaedition'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'apadanaedition'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,4,'one unit step and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/node --test tests\/apadana-edition-navigation\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-edition-check.py'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-edition.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-edition-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-edition-package/package/server" --report installed-apadana-edition.report.json')));
 assert.doesNotMatch(commands,/--live|--source-root|curl |wget |https:\/\/apadanatranslation\.com/);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>path.includes('apadana-edition')),['standalone-apadana-edition.report.json','standalone-apadana-edition-a11y.report.json','installed-apadana-edition.report.json']);
});
test('Next Therā publisher chapter has its own bounded pinned-source and three-mode browser gate',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanatheranext').length,1);
 assert.equal(beforePairGroups(selected).length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanatheranext'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'apadanatheranext'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,4,'one source/refusal step and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(commands,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-thera-next\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-thera-next-check.py --source-root .fixtures/apadana-pinned'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-thera-next.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-thera-next-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-thera-next-package/package/server" --report installed-apadana-thera-next.report.json')));
 assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>/^(?:standalone|installed)-apadana-thera-next(?:-a11y)?\.report\.json$/.test(path)),['standalone-apadana-thera-next.report.json','standalone-apadana-thera-next-a11y.report.json','installed-apadana-thera-next.report.json']);
});




test('Theragāthā sixteen has bounded source, native, three-mode browser and metadata-only artifact gates',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='thagsixteen').length,1);
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'thagsixteen'[^\n]*20/);
 const steps=[...group.matchAll(/if: matrix\.group == 'thagsixteen'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]);
 assert.equal(steps.length,5,'one exact fixture checkout, one native guard and three browser modes');
 const commands=steps.join('\n');
 assert.match(commands,/repository: VipassanaTech\/tipitaka-xml/);
 assert.match(commands,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);
 assert.match(commands,/persist-credentials: false/);
 assert.match(commands,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...commands.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0508m.mul.xml','romn/s0508a2.att.xml']);
 assert.match(commands,/VRI_SOURCE_CHECKOUT=\.fixtures\/thag-pinned node --test tests\/thag-sixteen-boundaries\.test\.mjs tests\/thag-sixteen-consumers\.test\.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thag-sixteen-check.py'));
 assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-thag-sixteen.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-thag-sixteen-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/thag-sixteen-package/package/server" --report installed-thag-sixteen.report.json')));
 const paths=group.split('          path: |')[1]?.split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.deepEqual(paths.filter(path=>path.includes('thag-sixteen')),['standalone-thag-sixteen.report.json','standalone-thag-sixteen-a11y.report.json','installed-thag-sixteen.report.json']);
 assert.ok(paths.every(path=>path.endsWith('.report.json')),'only metadata reports, never source XML, are uploaded');
});


test('supplementary Therā acceptance retains independent source checks, three modes and held-source fixtures',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim());
 assert.equal(selected.filter(name=>name==='apadanatheraexpansion').length,1);assert.equal(beforePairGroups(selected).length,37);
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanatheraexpansion'[^\n]*20/);
 const sharedXml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(beforePairGroups(conditionGroups(sharedXml)),['apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial']);
 const steps=conditionalSteps(group,'apadanatheraexpansion');assert.equal(steps.length,4,'source validation and three browser modes retain the shared exact XML checkout');
 const commands=[sharedXml,...steps].join('\n');assert.match(commands,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(commands,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-thera-fifth\.test\.mjs tests\/apadana-thera-sixth\.test\.mjs/);
 assert.match(commands,/repository: VipassanaTech\/tipitaka-xml/);assert.match(commands,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(commands,/persist-credentials: false/);assert.match(commands,/romn\/s0510m1\.mul\.xml/);
 assert.match(commands,/python scripts\/apadana\/review_thera_fifth_sixth\.py --source-root \.fixtures\/apadana-pinned/);assert.match(commands,/EXTRACTION_COMPARISON\.json" standalone-apadana-independent-review\.report\.json/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-thera-expansion-check.py --source-root .fixtures/apadana-pinned'));assert.equal(browser.length,3);
 assert.ok(browser.some(line=>line.endsWith('--report standalone-apadana-thera-expansion.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-apadana-thera-expansion-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadana-thera-expansion-package/package/server" --report installed-apadana-thera-expansion.report.json')));
 assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 for(const report of ['standalone-apadana-independent-review.report.json','standalone-apadana-thera-expansion.report.json','standalone-apadana-thera-expansion-a11y.report.json','installed-apadana-thera-expansion.report.json'])assert.ok(group.split('          path: |')[1].includes(report));
 assert.ok(group.includes('src/_poems/chapter-3/poem-042.md'),'the original held-source artifact remains available for D249 refusal regressions and separately approved editorial activation');
});

test('scaled Therā CI retains all fifty-two earlier jobs and adds exactly three bounded Chromium groups',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
 const added=['apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial'];
 const previous=['core','study','personal','provenance','comparison','notes','backup','conflicts','highlights','navigation','booksearch','chapters','citations','searchpins','headings','commentary','postsearch','vinayapartials','scriptrefresh','milinda','draftsafety','annumbered','milindapartial','anten','apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanaedition','thagsixteen','textspacing'];
 assert.deepEqual(beforePairGroups(selected).filter(name=>!added.includes(name)),previous,'all earlier Chromium jobs retain their original identities and order');
 assert.deepEqual(selected.filter(name=>added.includes(name)),added);assert.equal(new Set(beforePairGroups(selected)).size,37);
 const jobs=source.split('\njobs:\n')[1];
 assert.deepEqual([...jobs.matchAll(/^  ([a-z][\w-]*):$/gm)].map(match=>match[1]),['hosted-memory','reader-browser-group','reader-browser','reader-compat','check']);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))?.[1].split(',').map(value=>value.trim());
 const node=jobs.split('  check:')[1],compat=jobs.split('  reader-compat:')[1].split('  check:')[0];
 assert.deepEqual(matrix(node,'os'),['ubuntu-latest','macos-latest','windows-latest']);assert.deepEqual(matrix(node,'node'),['20','22']);
 assert.deepEqual(matrix(compat,'engine'),['firefox','webkit']);
 const install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 assert.deepEqual(matrix(install,'os'),['ubuntu-latest','macos-latest','windows-latest']);assert.deepEqual(matrix(install,'node'),['20','24']);
 for(const [file,name]of [['npx.yml','npx'],['corpus.yml','corpus'],['evidence.yml','evidence']]){
  const workflow=readFixedHUnchangedCurrentWitness('.github/workflows/'+file,'utf8');
  assert.deepEqual([...workflow.split('\njobs:\n')[1].matchAll(/^  ([a-z][\w-]*):$/gm)].map(match=>match[1]),[name]);
  assert.match(workflow,/branches:[^\n]*'dev\/\*\*'/,'the earlier gate still runs on dev pushes');
 }
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(previous.length+otherJobs,52,'the preceding complete configured matrix remains present');
 assert.equal(beforePairGroups(selected).length+otherJobs,55,'only the three new bounded groups increase the configured matrix');
 assert.equal(before141180Groups(selected).length+otherJobs,57,'the paired intake adds exactly two further bounded groups');
 const timeout=group.match(/^    timeout-minutes: (.+)$/m)?.[1];
 assert.match(timeout,/&& 20 \|\| 10 \}\}$/);
 for(const name of added)assert.ok(timeout.includes("matrix.group == '"+name+"'"),name+' has the finite twenty-minute bound');
});

test('scaled Therā groups require five sealed independent source inputs and all focused, browser and package evidence',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(beforePairGroups(conditionGroups(xml)),['apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial']);
 assert.match(xml,/uses: actions\/checkout@v4/);assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);
 assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(xml,/path: \.fixtures\/apadana-vri-pinned/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]).filter(path=>path!=='romn/s0510a.att.xml'),['romn/s0510m1.mul.xml']);
 const goldenFiles=['THERA_SEVENTH_GOLDENS.json','THERA_EIGHTH_GOLDENS.json','THERA_NINTH_GOLDENS.json','THERA_TENTH_GOLDENS.json','THERA_EDITORIAL_GAP_GOLDENS.json'];
 const approval=JSON.parse(readFileSync(new URL('docs/evidence/apadana/THERA_SCALED_APPROVAL.json',HistoricalHBase),'utf8'));
 assert.equal(approval.status,'approved');assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 for(const input of approval.goldens){
  assert.match(input.sha256,/^[a-f0-9]{64}$/);
  const bytes=readFixedHUnchangedCurrentWitness('docs/evidence/apadana/'+input.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256,input.file+' remains sealed to the independent approval');
 }
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 assert.ok(retained.every(path=>path.endsWith('.report.json')),'all uploaded browser artifacts remain metadata reports');
 for(const [name,batch]of [['apadanatherascaled61','61-80'],['apadanatherascaled81','81-100'],['apadanatheraeditorial','held42']]){
  const steps=conditionalSteps(group,name);assert.equal(steps.length,4,name+' has exactly four named validation/browser steps in addition to common pinned checkouts');
  for(const step of steps)assert.match(step,/^      - name: /);
  const validation=steps[0],commands=steps.join('\n');
  assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
  assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned node --test tests\/apadana-thera-scaled\.test\.mjs tests\/held42-editorial-gap\.test\.mjs tests\/editorial-content-sha256\.test\.mjs tests\/thera-hundred-client\.test\.mjs/);
  assert.match(validation,/node scripts\/shard-data\.mjs --unpack server\/data "\$RUNNER_TEMP\/scaled-inputs"/);
  const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera_scaled.py '));assert.equal(independent.length,1);
  assert.deepEqual([...independent[0].matchAll(/--goldens docs\/evidence\/apadana\/([A-Z_]+\.json)/g)].map(match=>match[1]),goldenFiles);
  assert.match(validation,/python scripts\/canon\/historical_thera_pair_snapshot\.py --canon "\$RUNNER_TEMP\/scaled-inputs\/canon\.json\.gz" --output "\$RUNNER_TEMP\/scaled-inputs\/canon-before-thera-pair\.json"/);
  assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned/);assert.match(independent[0],/--canon "\$RUNNER_TEMP\/scaled-inputs\/canon-before-thera-pair\.json"/);
  assert.match(independent[0],/--xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml --output-dir "\$RUNNER_TEMP\/scaled-independent-review"/);
  assert.ok(validation.includes('cp "$RUNNER_TEMP/scaled-independent-review/EXTRACTION_COMPARISON.json" standalone-'+name+'-independent.report.json'));
  const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-apadana-thera-scaled-check.py '));assert.equal(browser.length,3);
  for(const line of browser)assert.ok(line.includes('--batch '+batch+' --source-root .fixtures/apadana-pinned'));
  assert.ok(browser.some(line=>line.endsWith('--report standalone-'+name+'.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
  assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-'+name+'-a11y.report.json')));
  assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/'+name+'-package/package/server" --report installed-'+name+'.report.json')));
  assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/'+name+'-package"'));
  assert.ok(steps[3].includes('tar -xzf "$RUNNER_TEMP/'+name+'-package/"*.tgz -C "$RUNNER_TEMP/'+name+'-package"'));
  for(const report of ['standalone-'+name+'.report.json','standalone-'+name+'-a11y.report.json','standalone-'+name+'-independent.report.json','installed-'+name+'.report.json'])assert.equal(retained.filter(path=>path===report).length,1,report+' is retained exactly once');
  assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/,'publisher inputs stay pinned and offline during validation');
 }
});


test('paired Therā gates add two bounded source-pinned groups while retaining historical fixtures and named evidence gates',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=before141180Groups(group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim()));
 assert.deepEqual(selected.filter(name=>PAIR_GROUPS.includes(name)),PAIR_GROUPS);
 const insertion=selected.indexOf('apadanatheraeditorial')+1;
 assert.deepEqual(selected.slice(insertion,insertion+2),PAIR_GROUPS);
 assert.equal(selected.length,39);assert.equal(new Set(selected).size,39);
 const timeout=group.match(/^    timeout-minutes: (.+)$/m)?.[1];
 for(const name of PAIR_GROUPS)assert.ok(timeout.includes("matrix.group == '"+name+"'"));
 assert.match(timeout,/&& 20 \|\| 10 \}\}$/);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');
 assert.deepEqual(conditionGroups(fixture).filter(name=>PAIR_GROUPS.includes(name)),PAIR_GROUPS);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files.filter(path=>pairFixtureFiles.includes(path)),pairFixtureFiles);
 assert.equal(new Set(files).size,files.length);
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml).filter(name=>PAIR_GROUPS.includes(name)),PAIR_GROUPS);
 assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const baseline=namedStep(group,'Fetch exact paired-intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),PAIR_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin b5669a334add97ebc0c3c32f9b3fb45ed90d9780/);
 assert.match(baseline,/git cat-file -e b5669a334add97ebc0c3c32f9b3fb45ed90d9780\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const goldenFiles=['THERA_ELEVENTH_GOLDENS.json','THERA_TWELFTH_GOLDENS.json','THERA_THIRTEENTH_GOLDENS.json','THERA_FOURTEENTH_GOLDENS.json'];
 const approval=JSON.parse(readFileSync(new URL('docs/evidence/apadana/THERA_PAIR_INTAKE_APPROVAL.json',HistoricalHBase),'utf8'));
 assert.equal(approval.status,'approved');assert.equal(approval.base_commit,'b5669a334add97ebc0c3c32f9b3fb45ed90d9780');
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 for(const input of approval.goldens){const bytes=readFixedHUnchangedCurrentWitness('docs/evidence/apadana/'+input.file);assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256);}
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 for(const [name,batch]of [['apadanatherapair101','101-120'],['apadanatherapair121','121-140']]){
  const steps=conditionalSteps(group,name);assert.equal(steps.length,4);
  for(const step of steps)assert.match(step,/^      - name: /);
  const validation=steps[0],commands=steps.join('\n');
  assert.ok(group.indexOf(baseline)<group.indexOf(validation));
  assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
  assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned node --test tests\/apadana-thera-pair-boundaries\.test\.mjs tests\/apadana-thera-pair-intake\.test\.mjs/);
  const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera_pair_intake.py '));assert.equal(independent.length,1);
  assert.deepEqual([...independent[0].matchAll(/--goldens docs\/evidence\/apadana\/([A-Z_]+\.json)/g)].map(match=>match[1]),goldenFiles);
  assert.ok(independent[0].includes('--canon "$RUNNER_TEMP/'+name+'-inputs/canon.json.gz"'));
  assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned/);assert.match(independent[0],/--xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml/);
  assert.doesNotMatch(independent[0],/canon-before-thera-pair/,'new source review must validate the actual repaired canonical snapshot');
  assert.ok(validation.includes('cp "$RUNNER_TEMP/'+name+'-independent-review/INDEPENDENT_SOURCE_REPLAY.json" standalone-'+name+'-independent.report.json'));
  const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera-pair-intake-check.py '));assert.equal(browser.length,3);
  for(const line of browser)assert.ok(line.includes('--batch '+batch+' --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
  assert.ok(browser.some(line=>line.endsWith('--report standalone-'+name+'.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
  assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-'+name+'-a11y.report.json')));
  assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/'+name+'-package/package/server" --report installed-'+name+'.report.json')));
  assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/'+name+'-package"'));
  for(const report of ['standalone-'+name+'.report.json','standalone-'+name+'-a11y.report.json','standalone-'+name+'-independent.report.json','installed-'+name+'.report.json'])assert.equal(retained.filter(path=>path===report).length,1);
  assert.doesNotMatch(commands,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
 }
 assert.ok(retained.every(path=>path.endsWith('.report.json')),'source artifacts never become uploaded browser evidence');
});

test('isolated mixed-load reader source imports include only the shared integrity helper as a read-only input',()=>{
 const workflow=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const step=workflow.split('      - name: Check retained reader views and the shared live cache under mixed load')[1].split('      - uses:')[0];
 assert.match(step,/--mount "type=bind,src=\$GITHUB_WORKSPACE\/web\/content-sha256\.mjs,dst=\/app\/web\/content-sha256\.mjs,readonly"/);
 assert.match(step,/--network none/);assert.match(step,/--cap-drop ALL/);assert.match(step,/--security-opt no-new-privileges/);
 assert.match(step,/--full-cache --reader-caches --reader-ui/);
 const widget=readFileSync(new URL('src/chatgpt-widget.mjs',HistoricalHBase),'utf8');
 assert.match(widget,/from ['"]\.\.\/web\/content-sha256\.mjs['"]/);
});


test('scaled preservation jobs fetch only their exact historical baseline before source checks',()=>{
 const workflow=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const step=namedStep(workflow,'Fetch exact reviewed Apadāna baseline for independent preservation checks');
 assert.match(step,/if: matrix\.group == 'apadanatherascaled61' \|\| matrix\.group == 'apadanatherascaled81' \|\| matrix\.group == 'apadanatheraeditorial'/);
 assert.match(step,/git fetch --no-tags --depth=1 origin 64a336789ab5f4f02964ff3023ea6b26b330e406/);
 assert.match(step,/git cat-file -e 64a336789ab5f4f02964ff3023ea6b26b330e406\^\{commit\}/);
 assert.doesNotMatch(step,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 assert.ok(workflow.indexOf(step)<workflow.indexOf('      - name: Validate scaled Therā 61-80'),'baseline is present before the independent preservation gate');
});

test('Therā 141–180 adds exactly two bounded source and reader groups while preserving all 57 prior jobs',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=before181220Groups(group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim()));
 assert.equal(selected.length,41);assert.equal(new Set(selected).size,41);
 assert.equal(before141180Groups(selected).length,39);assert.equal(beforePairGroups(selected).length,37);
 assert.deepEqual(selected.filter(name=>INTAKE_141_180_GROUPS.includes(name)),INTAKE_141_180_GROUPS);
 const insertion=selected.indexOf('apadanatherapair121')+1;
 assert.deepEqual(selected.slice(insertion,insertion+2),INTAKE_141_180_GROUPS);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))?.[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(before141180Groups(selected).length+otherJobs,57,'every prior expanded job remains required');
 assert.equal(selected.length+otherJobs,59,'only the two new bounded intake groups are added');
 const timeout=group.match(/^    timeout-minutes: (.+)$/m)?.[1];
 for(const name of INTAKE_141_180_GROUPS)assert.ok(timeout.includes("matrix.group == '"+name+"'"));
 assert.match(timeout,/&& 20 \|\| 10 \}\}$/);
 const baseline=namedStep(group,'Fetch exact 141-180 intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),INTAKE_141_180_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin 05fc4e29540fc0799145dc28838bedb7d964b2c7/);
 assert.match(baseline,/git cat-file -e 05fc4e29540fc0799145dc28838bedb7d964b2c7\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');
 assert.deepEqual(conditionGroups(fixture).filter(name=>INTAKE_141_180_GROUPS.includes(name)),INTAKE_141_180_GROUPS);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files.filter(path=>intake141180FixtureFiles.includes(path)),intake141180FixtureFiles);
 assert.equal(new Set(files).size,files.length,'each old/new/held source artifact occurs once');
 for(const n of [70,140,158,159,181])assert.ok(files.includes('src/_poems/chapter-3/poem-'+String(n).padStart(3,'0')+'.md'),'held material and exact boundary neighbors remain source fixtures');
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml).filter(name=>INTAKE_141_180_GROUPS.includes(name)),INTAKE_141_180_GROUPS);
 assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const goldenFiles=['THERA_FIFTEENTH_GOLDENS.json','THERA_SIXTEENTH_GOLDENS.json','THERA_SEVENTEENTH_GOLDENS.json','THERA_EIGHTEENTH_GOLDENS.json'];
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 for(const [name,batch]of [['apadanathera141','141-160'],['apadanathera161','161-180']]){
  const steps=conditionalSteps(group,name);assert.equal(steps.length,4,'one source/refusal and three reader modes per new group');
  for(const step of steps)assert.match(step,/^      - name: /);
  const validation=steps[0],commands=steps.join('\n');
  assert.ok(group.indexOf(baseline)<group.indexOf(validation));
  assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
  assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned node --test tests\/apadana-thera141-180\.test\.mjs tests\/thera141-180-client\.test\.mjs tests\/apadana-thera-pair-boundaries\.test\.mjs tests\/apadana-pair-locator-compat\.test\.mjs tests\/web-tool-result\.test\.mjs/);
  const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera141_180.py '));assert.equal(independent.length,1);
  assert.deepEqual([...independent[0].matchAll(/--goldens docs\/evidence\/apadana\/([A-Z_]+\.json)/g)].map(match=>match[1]),goldenFiles);
  assert.ok(independent[0].includes('--canon "$RUNNER_TEMP/'+name+'-inputs/canon.json.gz"'));
  assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned/);assert.match(independent[0],/--xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml/);
  assert.doesNotMatch(independent[0],/canon-before-thera-pair/,'the new source review validates current exact canonical data');
  assert.ok(validation.includes('cp "$RUNNER_TEMP/'+name+'-independent-review/INDEPENDENT_SOURCE_REPLAY.json" standalone-'+name+'-independent.report.json'));
  const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera141-180-check.py '));assert.equal(browser.length,3);
  for(const line of browser)assert.ok(line.includes('--batch '+batch+' --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
  assert.ok(browser.some(line=>line.endsWith('--report standalone-'+name+'.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
  assert.ok(browser.some(line=>line.endsWith('--a11y --report standalone-'+name+'-a11y.report.json')));
  assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/'+name+'-package/package/server" --report installed-'+name+'.report.json')));
  assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/'+name+'-package"'));
  assert.ok(steps[3].includes('tar -xzf "$RUNNER_TEMP/'+name+'-package/"*.tgz -C "$RUNNER_TEMP/'+name+'-package"'));
  for(const report of ['standalone-'+name+'.report.json','standalone-'+name+'-a11y.report.json','standalone-'+name+'-independent.report.json','installed-'+name+'.report.json'])assert.equal(retained.filter(path=>path===report).length,1);
  assert.doesNotMatch(commands,/--pilot|--mcp-only|--live|curl |wget |https:\/\/apadanatranslation\.com/,'CI requires full source and reader acceptance');
 }
 assert.ok(retained.every(path=>path.endsWith('.report.json')),'source fixtures never become uploaded reader evidence');
});

test('Therā 141–180 CI consumes four independently sealed chapters with explicit held scopes and current canonical identity',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase);
 const approval=JSON.parse(readFileSync(new URL('THERA_141_180_APPROVAL.json',base),'utf8'));
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');
 assert.equal(approval.base_commit,'05fc4e29540fc0799145dc28838bedb7d964b2c7');
 assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.equal(approval.before_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');
 assert.equal(approval.after_canon_sha256,approval.before_canon_sha256,'this intake changes no canonical boundaries');
 assert.equal(approval.baseline_ids.length,168);assert.equal(new Set(approval.baseline_ids).size,168);
 assert.equal(approval.approved_ids.length,38);assert.equal(new Set(approval.approved_ids).size,38);
 assert.ok(approval.approved_ids.every(id=>!approval.baseline_ids.includes(id)));
 for(const id of ['tha-ap72','tha-ap142','tha-ap160','tha-ap161'])assert.ok(!approval.approved_ids.includes(id),'held/conditional source remains unactivated: '+id);
 const goldenFiles=['THERA_FIFTEENTH_GOLDENS.json','THERA_SIXTEENTH_GOLDENS.json','THERA_SEVENTEENTH_GOLDENS.json','THERA_EIGHTEENTH_GOLDENS.json'];
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 const records=[];
 const familySuffix={goldens:'GOLDENS',source_reviews:'SOURCE_REVIEW',rights:'RIGHTS',independent_source_approvals:'SOURCE_APPROVAL'};
 for(const family of ['goldens','source_reviews','rights','independent_source_approvals']){
  assert.equal(approval[family].length,4,family+' requires all four independent chapter inputs');
  assert.deepEqual(approval[family].map(input=>input.file),goldenFiles.map(file=>file.replace('GOLDENS',familySuffix[family])));
  for(const input of approval[family]){
   assert.match(input.sha256,/^[a-f0-9]{64}$/);const bytes=readFileSync(new URL(input.file,base));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256,input.file+' matches its independent curatorial seal');
   if(family==='goldens')records.push(...JSON.parse(bytes).poems);
  }
 }
 assert.equal(records.length,40);assert.equal(new Set(records.map(row=>row.id)).size,40);
 assert.ok(approval.approved_ids.every(id=>records.some(row=>row.id===id)));
 for(const field of ['independent_source_approval','baseline_freeze']){
  const seal=approval[field];assert.match(seal.sha256,/^[a-f0-9]{64}$/);
  assert.equal(createHash('sha256').update(readFileSync(new URL(seal.file,base))).digest('hex'),seal.sha256);
 }
});

test('Therā 181–220 adds two receipt-bound groups while preserving all 59 jobs and 68 source-reader steps',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=before241250Groups(group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim()));
 assert.equal(selected.length,43);assert.equal(new Set(selected).size,43);
 assert.equal(before181220Groups(selected).length,41);assert.equal(before141180Groups(selected).length,39);assert.equal(beforePairGroups(selected).length,37);
 assert.deepEqual(selected.filter(name=>INTAKE_181_220_GROUPS.includes(name)),INTAKE_181_220_GROUPS);
 const insertion=selected.indexOf('apadanathera161')+1;
 assert.deepEqual(selected.slice(insertion,insertion+2),INTAKE_181_220_GROUPS);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))?.[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(before181220Groups(selected).length+otherJobs,59);assert.equal(selected.length+otherJobs,61);
 const historicalSourceGroups=['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanatherapair101','apadanatherapair121','apadanathera141','apadanathera161','apadanaedition','thagsixteen'];
 const requiredRunSteps=name=>conditionalSteps(group,name).filter(step=>/^        run:/m.test(step));
 const historicalSteps=historicalSourceGroups.flatMap(requiredRunSteps);
 assert.equal(historicalSteps.length,68,'all prior required source/browser run steps remain, excluding fixture checkout steps');
 assert.equal([...historicalSourceGroups,...INTAKE_181_220_GROUPS].flatMap(requiredRunSteps).length,76);
 for(const step of historicalSteps)assert.match(step,/^      - name: /);
 const timeout=group.match(/^    timeout-minutes: (.+)$/m)?.[1];
 for(const name of INTAKE_181_220_GROUPS)assert.ok(timeout.includes("matrix.group == '"+name+"'"));
 assert.match(timeout,/&& 20 \|\| 10 \}\}$/);
 const baseline=namedStep(group,'Fetch exact 181-220 intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),INTAKE_181_220_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin 94c607310845b84dc3cd51ba3a19ce6fecd28683/);
 assert.match(baseline,/git cat-file -e 94c607310845b84dc3cd51ba3a19ce6fecd28683\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');
 assert.deepEqual(conditionGroups(fixture).filter(name=>INTAKE_181_220_GROUPS.includes(name)),INTAKE_181_220_GROUPS);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]).filter(path=>!intake241250FixtureFiles.includes(path)&&!intake221230FixtureFiles.includes(path)&&!remainingFixtureFiles.includes(path));
 assert.equal(files.length,258);assert.equal(new Set(files).size,258);
 assert.deepEqual(files.filter(path=>intake181220FixtureFiles.includes(path)),intake181220FixtureFiles);
 assert.equal(files.filter(path=>!intake181220FixtureFiles.includes(path)).length,218);
 for(const n of [70,140,158,159,221])assert.ok(files.includes('src/_poems/chapter-3/poem-'+String(n).padStart(3,'0')+'.md'),'held originals and final neighbor remain available');
 for(const path of ['src/_poems/chapter-3/poem-011.md','src/_poems/chapter-4/poem-017.md','src/_poems/chapter-3/poem-028.md','src/_poems/chapter-3/poem-141.md'])assert.ok(files.includes(path),'bounded legacy-note probe uses an existing exact fixture');
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml).filter(name=>INTAKE_181_220_GROUPS.includes(name)),INTAKE_181_220_GROUPS);
 assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const goldenFiles=['THERA_NINETEENTH_GOLDENS.json','THERA_TWENTIETH_GOLDENS.json','THERA_TWENTY_FIRST_GOLDENS.json','THERA_TWENTY_SECOND_GOLDENS.json'];
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 for(const [name,batch]of [['apadanathera181','181-200'],['apadanathera201','201-220']]){
  const steps=conditionalSteps(group,name);assert.equal(steps.length,4);
  for(const step of steps)assert.match(step,/^      - name: /);
  const validation=steps[0],commands=steps.join('\n');assert.ok(group.indexOf(baseline)<group.indexOf(validation));
  assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
  assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned node --test tests\/apadana-thera181-220\.test\.mjs tests\/thera181-220-client\.test\.mjs tests\/thera-cached-poem-notes\.test\.mjs tests\/apadana-thera-pair-boundaries\.test\.mjs tests\/apadana-pair-locator-compat\.test\.mjs tests\/web-tool-result\.test\.mjs/);
  for(const file of ["apadana-next-client", "apadana-next", "apadana-third", "apadana-fourth-client", "thera-hundred-client", "apadana-integration", "apadana-three", "thera-commentary-locators"])assert.ok(validation.includes(' tests/'+file+'.test.mjs'),'actual-source legacy cohort gate remains configured: '+file);
  const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera181_220.py '));assert.equal(independent.length,1);
  assert.deepEqual([...independent[0].matchAll(/--goldens docs\/evidence\/apadana\/([A-Z_]+\.json)/g)].map(match=>match[1]),goldenFiles);
  assert.ok(independent[0].includes('--canon "$RUNNER_TEMP/'+name+'-inputs/canon.json.gz"'));
  assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned/);assert.match(independent[0],/--xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml/);
  assert.doesNotMatch(independent[0],/canon-before-thera-pair/);
  assert.ok(validation.includes('cp "$RUNNER_TEMP/'+name+'-independent-review/INDEPENDENT_SOURCE_REPLAY.json" standalone-'+name+'-independent.report.json'));
  const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera181-220-check.py '));assert.equal(browser.length,3);
  for(const line of browser)assert.ok(line.includes('--batch '+batch+' --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
  assert.ok(browser.some(line=>line.endsWith('--launch-receipt standalone-'+name+'-launch.report.json --report standalone-'+name+'.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
  assert.ok(browser.some(line=>line.endsWith('--a11y --launch-receipt standalone-'+name+'-a11y-launch.report.json --report standalone-'+name+'-a11y.report.json')));
  assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/'+name+'-package/package/server" --package-archive "$RUNNER_TEMP/'+name+'-package/"*.tgz --launch-receipt installed-'+name+'-launch.report.json --report installed-'+name+'.report.json')));
  assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/'+name+'-package"'));
  assert.ok(steps[3].includes('tar -xzf "$RUNNER_TEMP/'+name+'-package/"*.tgz -C "$RUNNER_TEMP/'+name+'-package"'));
  for(const report of ['standalone-'+name+'.report.json','standalone-'+name+'-launch.report.json','standalone-'+name+'-a11y.report.json','standalone-'+name+'-a11y-launch.report.json','standalone-'+name+'-independent.report.json','installed-'+name+'.report.json','installed-'+name+'-launch.report.json'])assert.equal(retained.filter(path=>path===report).length,1);
  assert.doesNotMatch(commands,/--pilot|--mcp-only|--live|curl |wget |https:\/\/apadanatranslation\.com/);
 }
 assert.ok(retained.every(path=>path.endsWith('.report.json')),'only source-free metadata reports and launch receipts are uploaded');
});

test('Therā 181–220 CI requires four independent chapter seals and preserves all 206 preceding choices and canonical data',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase);
 const approval=JSON.parse(readFileSync(new URL('THERA_181_220_APPROVAL.json',base),'utf8'));
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');
 assert.equal(approval.base_commit,'94c607310845b84dc3cd51ba3a19ce6fecd28683');
 assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.equal(approval.before_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');
 assert.equal(approval.after_canon_sha256,approval.before_canon_sha256);
 assert.equal(approval.baseline_ids.length,206);assert.equal(new Set(approval.baseline_ids).size,206);
 assert.equal(approval.approved_ids.length,40);assert.equal(new Set(approval.approved_ids).size,40);
 assert.ok(approval.approved_ids.every(id=>!approval.baseline_ids.includes(id)));
 for(const id of ['tha-ap72','tha-ap142','tha-ap160','tha-ap161'])assert.ok(!approval.approved_ids.includes(id),'prior hold remains unactivated: '+id);
 const goldenFiles=['THERA_NINETEENTH_GOLDENS.json','THERA_TWENTIETH_GOLDENS.json','THERA_TWENTY_FIRST_GOLDENS.json','THERA_TWENTY_SECOND_GOLDENS.json'];
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 const records=[],familySuffix={goldens:'GOLDENS',source_reviews:'SOURCE_REVIEW',rights:'RIGHTS',independent_source_approvals:'SOURCE_APPROVAL'};
 for(const family of ['goldens','source_reviews','rights','independent_source_approvals']){
  assert.equal(approval[family].length,4);
  assert.deepEqual(approval[family].map(input=>input.file),goldenFiles.map(file=>file.replace('GOLDENS',familySuffix[family])));
  for(const input of approval[family]){
   assert.match(input.sha256,/^[a-f0-9]{64}$/);const bytes=readFileSync(new URL(input.file,base));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256,input.file+' matches its independent curatorial seal');
   if(family==='goldens')records.push(...JSON.parse(bytes).poems);
  }
 }
 assert.equal(records.length,40);assert.equal(new Set(records.map(row=>row.id)).size,40);
 assert.ok(approval.approved_ids.every(id=>records.some(row=>row.id===id)));
 for(const field of ['independent_source_approval','baseline_freeze']){
  const seal=approval[field];assert.match(seal.sha256,/^[a-f0-9]{64}$/);
  assert.equal(createHash('sha256').update(readFileSync(new URL(seal.file,base))).digest('hex'),seal.sha256);
 }
});


test('only the two new source groups receive a bounded thirty-minute budget; previous group budgets stay unchanged',()=>{
 const raw=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const timeout=raw.match(/^    timeout-minutes: (\$\{\{[^\n]+)$/m)?.[1];assert.ok(timeout);
 const expr=timeout.slice(3,-2).trim();
 const prefix="(matrix.group == 'apadanathera181' || matrix.group == 'apadanathera201') && 30 || ";
 assert.ok(expr.startsWith(prefix));const prior=expr.slice(prefix.length);
 const names=before241250Groups(raw.match(/group: \[([^\]]+)\]/)?.[1].split(',').map(name=>name.trim()));assert.equal(names.length,43);
 const evaluate=(code,name)=>runInNewContext(code,{matrix:{group:name}},{timeout:1000});
 for(const name of names){
  const actual=evaluate(expr,name);
  if(['apadanathera181','apadanathera201'].includes(name))assert.equal(actual,30,name);
  else{const old=evaluate(prior,name);assert.ok([10,20].includes(old));assert.equal(actual,old,name+' retains its previous bounded budget');}
 }
});

test('Therā 241–250 adds exactly one twenty-minute group and preserves the entire a9755d2 workflow projection',()=>{
 const source=before221230Workflow(beforeHeld234Workflow(sourceNotesHistoricalWorkflow()));
 const group=source.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
 assert.equal(selected.length,44);assert.equal(new Set(selected).size,44);
 assert.equal(before241250Groups(selected).length,43);
 assert.deepEqual(selected.filter(name=>INTAKE_241_250_GROUPS.includes(name)),INTAKE_241_250_GROUPS);
 assert.equal(selected[selected.indexOf('apadanathera201')+1],'apadanathera241');
 const additions=conditionalSteps(source,'apadanathera241');
 assert.equal(additions.length,5,'only one baseline fetch and four required source/browser steps are new');
 const baseline=namedStep(group,'Fetch exact 241-250 intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),INTAKE_241_250_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin a9755d267c309ad930df0ef154e6c8a03f1f371e/);
 assert.match(baseline,/git cat-file -e a9755d267c309ad930df0ef154e6c8a03f1f371e\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const steps=additions.filter(step=>step!==baseline);assert.equal(steps.length,4);
 assert.ok(steps.every(step=>/^      - name: /m.test(step)&&/^        run:/m.test(step)));
 assert.ok(source.indexOf(baseline)<source.indexOf(steps[0]));
 const historicalSourceGroups=['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanatherapair101','apadanatherapair121','apadanathera141','apadanathera161','apadanaedition','thagsixteen',...INTAKE_181_220_GROUPS];
 const historicalSteps=historicalSourceGroups.flatMap(name=>conditionalSteps(group,name).filter(step=>/^        run:/m.test(step)));
 assert.equal(historicalSteps.length,76);assert.equal(historicalSteps.length+steps.length,80);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(before241250Groups(selected).length+otherJobs,61);assert.equal(selected.length+otherJobs,62);
 assert.doesNotMatch(node,/timeout-minutes:/,'this intake does not change the separately pending Node matrix');
 const expression=group.match(/^    timeout-minutes: \$\{\{ (.+) \}\}$/m)[1];
 assert.equal(runInNewContext(expression,{matrix:{group:'apadanathera241'}},{timeout:1000}),20);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');
 assert.deepEqual(conditionGroups(fixture).filter(name=>INTAKE_241_250_GROUPS.includes(name)),INTAKE_241_250_GROUPS);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.equal(files.length,268);assert.equal(new Set(files).size,268);
 assert.deepEqual(files.filter(path=>intake241250FixtureFiles.includes(path)),intake241250FixtureFiles);
 assert.equal(files.filter(path=>!intake241250FixtureFiles.includes(path)).length,258);
 for(const n of [234,260])assert.ok(!files.includes('src/_poems/chapter-3/poem-'+n+'.md'),'unapproved material is not introduced as a fixture');
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml).filter(name=>INTAKE_241_250_GROUPS.includes(name)),INTAKE_241_250_GROUPS);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const reports=['standalone-apadanathera241.report.json','standalone-apadanathera241-launch.report.json','standalone-apadanathera241-a11y.report.json','standalone-apadanathera241-a11y-launch.report.json','standalone-apadanathera241-independent.report.json','installed-apadanathera241.report.json','installed-apadanathera241-launch.report.json'];
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 for(const report of reports)assert.equal(retained.filter(path=>path===report).length,1,report+' retained exactly once');
 let projected=source;
 for(const step of additions)projected=projected.replace(step,'');
 projected=projected.replace(', apadanathera241','').replaceAll(" || matrix.group == 'apadanathera241'",'');
 for(const file of intake241250FixtureFiles)projected=projected.replace('            '+file+'\n','');
 for(const report of reports)projected=projected.replace('            '+report+'\n','');
 assert.equal(createHash('sha256').update(projected).digest('hex'),'5412aabb5407b56cbdbcdb0901dbd8c34ec17a82056f89d26641d7812916f031','removing only the named241 additions restores every byte of exact a9755d2 workflow');
 const originalExpression=projected.match(/^    timeout-minutes: (\$\{\{[^\n]+)$/m)[1].slice(3,-2).trim();
 for(const name of before241250Groups(selected))assert.equal(runInNewContext(expression,{matrix:{group:name}},{timeout:1000}),runInNewContext(originalExpression,{matrix:{group:name}},{timeout:1000}),name+' budget is unchanged');
});

test('Therā 241–250 CI requires portable independent normalization and source-enabled core/client refusals before three full reader modes',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const steps=conditionalSteps(source,'apadanathera241').filter(step=>!step.startsWith('      - name: Fetch exact '));
 assert.equal(steps.length,4);const validation=steps[0],commands=steps.join('\n');
 assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(validation,/node scripts\/shard-data\.mjs --unpack server\/data "\$RUNNER_TEMP\/apadanathera241-inputs"/);
 const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera241_250.py '));assert.equal(independent.length,1);
 assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned --canon "\$RUNNER_TEMP\/apadanathera241-inputs\/canon.json.gz" --xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml/);
 assert.match(independent[0],/--goldens docs\/evidence\/apadana\/THERA_TWENTY_FIFTH_GOLDENS.json --profiles docs\/evidence\/apadana\/THERA_241_250_EXPECTED_PROFILES.json --links docs\/evidence\/apadana\/THERA_241_250_EXPECTED_LINKS.json --verify-only > standalone-apadanathera241-independent.report.json$/);
 assert.doesNotMatch(independent[0],/--raw-packet|--payloads|--output|\/tmp\//,'portable replay uses sealed metadata and never packages English payloads');
 assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned node --test tests\/apadana-thera241-250.test.mjs tests\/thera241-250-client.test.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera241-250-check.py '));assert.equal(browser.length,3);
 for(const line of browser)assert.ok(line.includes('--batch 241-250 --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
 assert.ok(browser.some(line=>line.endsWith('--launch-receipt standalone-apadanathera241-launch.report.json --report standalone-apadanathera241.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --launch-receipt standalone-apadanathera241-a11y-launch.report.json --report standalone-apadanathera241-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadanathera241-installed/node_modules/pali-canon-mcp/server" --package-archive "$1" --launch-receipt installed-apadanathera241-launch.report.json --report installed-apadanathera241.report.json')));
 assert.match(steps[3],/npm pack --pack-destination "\$RUNNER_TEMP\/apadanathera241-package"/);
 assert.match(steps[3],/set -- "\$RUNNER_TEMP\/apadanathera241-package\/"\*\.tgz\n          test "\$#" -eq 1\n          test -f "\$1"/);
 assert.match(steps[3],/npm install --prefix "\$RUNNER_TEMP\/apadanathera241-installed" --offline --ignore-scripts --no-audit --no-fund --package-lock=false "\$1"/);
 assert.doesNotMatch(steps[3],/tar -x|cp -R|package\/server/,'installed acceptance executes a genuine isolated npm install');
 assert.doesNotMatch(commands,/--pilot|--mcp-only|--live|curl |wget |https:\/\/apadanatranslation\.com|continue-on-error|\|\| true/,'all source, refusal and real browser assertions remain mandatory');
 const harness=readFileSync(new URL('scripts/web-reader-thera241-250-check.py',HistoricalHBase),'utf8');
 const write=harness.indexOf('write_launch()  # Contemporaneous record exists BEFORE the server subprocess.'),popen=harness.indexOf('server = subprocess.Popen('),launch=harness.indexOf("launch={'status':'launching'");
 assert.ok(launch>=0&&write>launch&&popen>write,'archive/runtime launch binding is written before the actual server subprocess');
 const receipt=harness.slice(launch,write);
 for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','approval_sha256','started_utc','server_argv','server_cwd','package_archive'])assert.ok(receipt.includes(field),'before-Popen launch evidence includes '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name == 'node_modules'/);
 assert.match(harness,/runtime_origin[^\n]+isolated-npm-install/);
 assert.match(harness,/full_batch_acceptance[^\n]+not args\.pilot and not args\.mcp_only/);
});

test('Therā 241–250 CI binds the reviewed ten-poem normalization, separate pure profiles/links and unchanged canon',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase);
 const approval=JSON.parse(readFileSync(new URL('THERA_241_250_APPROVAL.json',base),'utf8'));
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');
 assert.equal(approval.base_commit,'a9755d267c309ad930df0ef154e6c8a03f1f371e');
 assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.equal(approval.baseline_ids.length,246);assert.equal(new Set(approval.baseline_ids).size,246);
 const ids=Array.from({length:10},(_,i)=>'tha-ap'+(i+243));assert.deepEqual(approval.approved_ids,ids);
 assert.ok(ids.every(id=>!approval.baseline_ids.includes(id)));
 assert.equal(approval.before_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');
 assert.equal(approval.after_canon_sha256,approval.before_canon_sha256);
 const descriptors=[...approval.goldens,...approval.source_reviews,...approval.rights,...approval.independent_source_approvals,approval.independent_source_approval,approval.baseline_freeze,approval.expected_profiles,approval.expected_links];
 for(const descriptor of descriptors)assert.equal(createHash('sha256').update(readFileSync(new URL(descriptor.file,base))).digest('hex'),descriptor.sha256,descriptor.file+' is independently sealed');
 assert.deepEqual(approval.goldens.map(row=>row.file),['THERA_TWENTY_FIFTH_GOLDENS.json']);
 const golden=JSON.parse(readFileSync(new URL(approval.goldens[0].file,base),'utf8'));
 assert.equal(approval.goldens[0].sha256,'3667516ab4e548e575daa4e89ba4890c4c351b73e723177754527eb035246d4c');
 assert.deepEqual(golden.poems.map(row=>row.id),ids);assert.deepEqual(golden.poems.map(row=>row.path),intake241250FixtureFiles);
 assert.equal(golden.totals.body_paragraphs,67);assert.equal(golden.totals.physical_publisher_stanzas,37);assert.equal(golden.totals.poem_notes,34);
 const profiles=JSON.parse(readFileSync(new URL(approval.expected_profiles.file,base),'utf8')),links=JSON.parse(readFileSync(new URL(approval.expected_links.file,base),'utf8'));
 assert.equal(approval.expected_profiles.file,'THERA_241_250_EXPECTED_PROFILES.json');assert.equal(approval.expected_profiles.sha256,'356bb1b3aa144389d69d6f7446eaa84065af2bcaad3ca40522dcfbb39cd150c0');
 assert.equal(approval.expected_links.file,'THERA_241_250_EXPECTED_LINKS.json');assert.equal(approval.expected_links.sha256,'4c1e466abe86985073358436160ee71189d942c792efc306f81b104f40df57a1');
 assert.deepEqual(Object.keys(profiles),ids);assert.deepEqual(Object.keys(links),ids);
 for(const id of ids){assert.equal(profiles[id].english,undefined);assert.equal(profiles[id].match,undefined);assert.deepEqual(links[id],{...profiles[id],english:profiles[id].title,match:'individually-reviewed-whole-poem'});}
 assert.equal(approval.finite_integration_authority.canonical_changes_authorized,false);assert.equal(approval.finite_integration_authority.new_namespace_authorized,false);
 assert.deepEqual(approval.finite_integration_authority.out_of_scope_evidence.filter(row=>row.publisher_poem).map(row=>row.publisher_poem),[234,260]);
});

test('Therā 221–230 adds one twenty-minute group while restoring the exact 9ceed785 workflow under historical projection',()=>{
 const source=beforeRemainingWorkflow(beforeHeld234Workflow(sourceNotesHistoricalWorkflow()));
 const group=source.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
 assert.equal(selected.length,45);assert.equal(new Set(selected).size,45);assert.equal(before221230Groups(selected).length,44);
 assert.deepEqual(selected.filter(name=>INTAKE_221_230_GROUPS.includes(name)),INTAKE_221_230_GROUPS);
 assert.deepEqual(selected.slice(selected.indexOf('apadanathera201')+1,selected.indexOf('apadanathera201')+3),['apadanathera221','apadanathera241']);
 const baseline=namedStep(group,'Fetch exact 221-230 intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),INTAKE_221_230_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin 9ceed785d30afdcdc1f09021d6098b5bb85f02fb/);
 assert.match(baseline,/git cat-file -e 9ceed785d30afdcdc1f09021d6098b5bb85f02fb\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const steps=conditionalSteps(group,'apadanathera221').filter(step=>step!==baseline);assert.equal(steps.length,4);
 assert.ok(steps.every(step=>/^      - name: /m.test(step)&&/^        run:/m.test(step)));
 assert.ok(source.indexOf(baseline)<source.indexOf(steps[0]),'immutable local baseline exists before source preservation gates');
 const historicalSourceGroups=['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanatherapair101','apadanatherapair121','apadanathera141','apadanathera161','apadanaedition','thagsixteen',...INTAKE_181_220_GROUPS,...INTAKE_241_250_GROUPS];
 const historicalSteps=historicalSourceGroups.flatMap(name=>conditionalSteps(group,name).filter(step=>/^        run:/m.test(step)&&!step.startsWith('      - name: Fetch exact ')));
 assert.equal(historicalSteps.length,80);assert.equal(historicalSteps.length+steps.length,84);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(before221230Groups(selected).length+otherJobs,62);assert.equal(selected.length+otherJobs,63);
 assert.doesNotMatch(node,/timeout-minutes:/,'new source work does not change the separately pending Node matrix');
 const expression=group.match(/^    timeout-minutes: \$\{\{ (.+) \}\}$/m)[1];
 assert.equal(runInNewContext(expression,{matrix:{group:'apadanathera221'}},{timeout:1000}),20);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');
 assert.deepEqual(conditionGroups(fixture).filter(name=>INTAKE_221_230_GROUPS.includes(name)),INTAKE_221_230_GROUPS);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);assert.match(fixture,/persist-credentials: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.equal(files.length,278);assert.equal(new Set(files).size,278);
 assert.deepEqual(files.filter(path=>intake221230FixtureFiles.includes(path)),intake221230FixtureFiles);
 assert.equal(files.filter(path=>!intake221230FixtureFiles.includes(path)).length,268);
 assert.equal(files.filter(path=>path==='src/_poems/chapter-3/poem-221.md').length,1,'old221 neighbor is reused without duplicate source path');
 assert.ok(files.includes('src/_poems/chapter-3/poem-231.md'),'231 is a source-boundary fixture, not an activated poem');
 for(const n of [234,260])assert.ok(!files.includes('src/_poems/chapter-3/poem-'+n+'.md'));
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml).filter(name=>INTAKE_221_230_GROUPS.includes(name)),INTAKE_221_230_GROUPS);
 assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(xml,/persist-credentials: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);
 for(const report of intake221230Reports)assert.equal(retained.filter(path=>path===report).length,1,report+' is retained exactly once');
 const projected=before221230Workflow(source);
 assert.equal(createHash('sha256').update(projected).digest('hex'),'e68d2234d1969340bdd27a4096734b18a92149cc5077fd0423360960b51b90e3','only221 additions may be removed to restore every byte of reviewed9ceed workflow');
 const priorExpression=projected.match(/^    timeout-minutes: (\$\{\{[^\n]+)$/m)[1].slice(3,-2).trim();
 for(const name of before221230Groups(selected))assert.equal(runInNewContext(expression,{matrix:{group:name}},{timeout:1000}),runInNewContext(priorExpression,{matrix:{group:name}},{timeout:1000}),name+' keeps its existing budget');
});

test('Therā 221–230 CI binds independent replay and all six new and legacy source tests before full browser acceptance',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const steps=conditionalSteps(source,'apadanathera221').filter(step=>!step.startsWith('      - name: Fetch exact '));
 assert.equal(steps.length,4);const validation=steps[0],commands=steps.join('\n');
 assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.match(validation,/node scripts\/shard-data\.mjs --unpack server\/data "\$RUNNER_TEMP\/apadanathera221-inputs"/);
 const independent=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera221_230.py '));assert.equal(independent.length,1);
 assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned --canon "\$RUNNER_TEMP\/apadanathera221-inputs\/canon.json.gz" --xml \.fixtures\/apadana-vri-pinned\/romn\/s0510m1\.mul\.xml/);
 assert.match(independent[0],/--goldens docs\/evidence\/apadana\/THERA_221_230_GOLDENS.json --profiles docs\/evidence\/apadana\/THERA_221_230_EXPECTED_PROFILES.json --links docs\/evidence\/apadana\/THERA_221_230_EXPECTED_LINKS.json --verify-only > standalone-apadanathera221-independent.report.json$/);
 assert.doesNotMatch(independent[0],/--raw-packet|--payloads|--output|\/tmp\//,'finite independent replay uses portable metadata, not external English payloads');
 assert.match(validation,/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned node --test tests\/apadana-thera221-230.test.mjs tests\/thera221-230-client.test.mjs tests\/apadana-thera181-220.test.mjs tests\/thera181-220-client.test.mjs tests\/apadana-thera241-250.test.mjs tests\/thera241-250-client.test.mjs/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera221-230-check.py '));assert.equal(browser.length,3);
 for(const line of browser)assert.ok(line.includes('--batch 221-230 --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
 assert.ok(browser.some(line=>line.endsWith('--launch-receipt standalone-apadanathera221-launch.report.json --report standalone-apadanathera221.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
 assert.ok(browser.some(line=>line.endsWith('--a11y --launch-receipt standalone-apadanathera221-a11y-launch.report.json --report standalone-apadanathera221-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadanathera221-installed/node_modules/pali-canon-mcp/server" --package-archive "$1" --launch-receipt installed-apadanathera221-launch.report.json --report installed-apadanathera221.report.json')));
 assert.match(steps[3],/npm pack --pack-destination "\$RUNNER_TEMP\/apadanathera221-package"/);
 assert.match(steps[3],/set -- "\$RUNNER_TEMP\/apadanathera221-package\/"\*\.tgz\n          test "\$#" -eq 1\n          test -f "\$1"/);
 assert.match(steps[3],/npm install --prefix "\$RUNNER_TEMP\/apadanathera221-installed" --offline --ignore-scripts --no-audit --no-fund --package-lock=false "\$1"/);
 assert.doesNotMatch(steps[3],/tar -x|cp -R|package\/server/,'future installed gate executes a genuine external npm install');
 assert.doesNotMatch(commands,/--pilot|--mcp-only|--live|curl |wget |https:\/\/apadanatranslation\.com|continue-on-error|\|\| true/);
 const harness=readFileSync(new URL('scripts/web-reader-thera221-230-check.py',HistoricalHBase),'utf8');
 const write=harness.indexOf('write_launch()  # Contemporaneous record exists BEFORE the server subprocess.'),popen=harness.indexOf('server = subprocess.Popen('),launch=harness.indexOf("launch={'status':'launching'");
 assert.ok(launch>=0&&write>launch&&popen>write,'actual new server launch follows its contemporaneous archive/runtime receipt');
 const receipt=harness.slice(launch,write);
 for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','approval_sha256','started_utc','server_argv','server_cwd','package_archive'])assert.ok(receipt.includes(field),'before-Popen launch binding includes '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name == 'node_modules'/);assert.match(harness,/runtime_origin[^\n]+isolated-npm-install/);
 assert.match(harness,/full_batch_acceptance[^\n]+not args\.pilot and not args\.mcp_only/);
});

test('Therā 221–230 CI consumes the independent ten-poem seals with note-only226 pairs and separate two-paragraph230 apparatus',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase);
 const approval=JSON.parse(readFileSync(new URL('THERA_221_230_APPROVAL.json',base),'utf8'));
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');
 assert.equal(approval.base_commit,'9ceed785d30afdcdc1f09021d6098b5bb85f02fb');assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.equal(approval.baseline_ids.length,256);assert.equal(new Set(approval.baseline_ids).size,256);
 const ids=Array.from({length:10},(_,i)=>'tha-ap'+(i+223));assert.deepEqual(approval.approved_ids,ids);
 assert.deepEqual(approval.expected_profile_ids,approval.baseline_ids.concat(ids));assert.equal(approval.expected_profile_ids.length,266);
 assert.ok(ids.every(id=>!approval.baseline_ids.includes(id)));
 assert.equal(approval.before_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');assert.equal(approval.after_canon_sha256,approval.before_canon_sha256);
 const descriptors=[...approval.goldens,...approval.source_reviews,...approval.rights,approval.source_approval,approval.independent_source_approval,approval.independent_normalization,approval.normalization_seals,approval.normalization_replay,approval.copy_policy,approval.baseline_freeze,approval.expected_profiles,approval.expected_links,approval.previous_intake];
 for(const descriptor of descriptors)assert.equal(createHash('sha256').update(readFileSync(new URL(descriptor.file,base))).digest('hex'),descriptor.sha256,descriptor.file+' matches its independent seal');
 assert.equal(approval.previous_intake.file,'THERA_241_250_APPROVAL.json');assert.deepEqual(approval.goldens.map(row=>row.file),['THERA_221_230_GOLDENS.json']);
 assert.equal(approval.goldens[0].sha256,'c9c5f3f99e0aac62884a222ccaa89d13f07523da10e5cd044e8e40391cf76600');
 const golden=JSON.parse(readFileSync(new URL(approval.goldens[0].file,base),'utf8'));
 assert.deepEqual(golden.poems.map(row=>row.id),ids);assert.deepEqual(golden.poems.map(row=>row.path),Array.from({length:10},(_,i)=>'src/_poems/chapter-3/poem-'+(i+221)+'.md'));
 assert.equal(golden.totals.body_paragraphs,78);assert.equal(golden.totals.physical_publisher_stanzas,48);assert.equal(golden.totals.printed_local_label_occurrences,51);assert.equal(golden.totals.poem_notes,41);
 assert.equal(approval.independent_normalization.file,'THERA_221_230_INDEPENDENT_NORMALIZATION.json');assert.equal(approval.independent_normalization.sha256,'bdf28fb52df084b8b31afdc358b5cb83a23a7f9c7810c8f94d86b0707ba59082');
 const peer=JSON.parse(readFileSync(new URL(approval.independent_normalization.file,base),'utf8'));
 assert.equal(peer.status,'INDEPENDENT_ORIGINAL_DERIVED_EXPECTATIONS; NOT_RUNTIME_APPROVAL');assert.equal(peer.runtime_approval,false);assert.equal(peer.release_approval,false);
 assert.deepEqual(peer.poems.map(row=>row.canonical_owner),ids);
 for(const row of peer.poems){
  const original=golden.poems.find(item=>item.id===row.canonical_owner);
  for(const field of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256'])assert.equal(row[field],original[field],row.canonical_owner+' independently derives '+field);
  assert.equal(row.root_sha256,original.root.root_sha256);assert.equal(row.source_path,original.path);
  assert.deepEqual(row.body_paragraph_sha256s,original.body_paragraphs.map(part=>part.sha256));
 }
 const profiles=JSON.parse(readFileSync(new URL(approval.expected_profiles.file,base),'utf8')),links=JSON.parse(readFileSync(new URL(approval.expected_links.file,base),'utf8'));
 assert.equal(approval.expected_profiles.file,'THERA_221_230_EXPECTED_PROFILES.json');assert.equal(approval.expected_profiles.sha256,'637d8d8f523a3e5d33c1c33e36133d2535a8e7f4007e3bb5d1e51b20f07820ea');
 assert.equal(approval.expected_links.file,'THERA_221_230_EXPECTED_LINKS.json');assert.equal(approval.expected_links.sha256,'b87cb20b9840e95af3154250293985c3bb70c76109d4dd2887a02456297e1d0f');
 assert.deepEqual(Object.keys(profiles),ids);assert.deepEqual(Object.keys(links),ids);
 for(const id of ids){assert.equal(profiles[id].english,undefined);assert.equal(profiles[id].match,undefined);assert.deepEqual(links[id],{...profiles[id],english:profiles[id].title,match:'individually-reviewed-whole-poem'});assert.ok(profiles[id].poem>=221&&profiles[id].poem<=230,'231 boundary fixture grants no activation');}
 const paired=golden.poems.find(row=>row.poem===226).presentation_recipe.paired_markdown_display_inventory;
 assert.deepEqual(paired.map(row=>[row.owner,row.diacritic,row.alternate,row.occurrences]),[['note1','C','Ch',1],['note3','cc','chch',1]]);
 assert.equal(golden.poems.flatMap(row=>row.presentation_recipe.paired_markdown_display_inventory).length,2,'the only display pairs belong to two poem226 notes');
 const summary=golden.poems.find(row=>row.poem===230).chapter_summary;
 assert.equal(summary.parent_id,'tha-ap232');assert.equal(summary.paragraph_count,2);assert.deepEqual(summary.paragraphs.map(row=>row.lines),[7,1]);assert.equal(summary.summary_heading_shares_physical_paragraph,true);assert.deepEqual(summary.note_numbers,[]);
 const peerSummary=peer.poems.find(row=>row.canonical_owner==='tha-ap232').chapter_summary;
 assert.equal(peerSummary.body_sha256,summary.body_sha256);assert.equal(peerSummary.paragraphs,2);assert.deepEqual(peerSummary.line_counts,[7,1]);assert.deepEqual(peerSummary.paragraph_sha256s,summary.paragraphs.map(row=>row.sha256));
 assert.equal(profiles['tha-ap232'].chapter_summary.body_sha256,summary.body_sha256);
 assert.equal(approval.finite_integration_authority.canonical_changes_authorized,false);assert.equal(approval.finite_integration_authority.new_namespace_authorized,false);
});

test('remaining Therā CI adds two twenty-minute lanes while restoring every byte of the cdbefd266 workflow',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 const group=source.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
 const selected=group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
 assert.equal(selected.length,47);assert.equal(new Set(selected).size,47);assert.equal(beforeRemainingGroups(selected).length,45);
 assert.deepEqual(selected.filter(name=>REMAINING_GROUPS.includes(name)),REMAINING_GROUPS);
 assert.equal(selected[selected.indexOf('apadanathera221')+1],'apadanathera231');assert.equal(selected[selected.indexOf('apadanathera241')+1],'apadanathera251');
 const baseline=namedStep(group,'Fetch exact remaining-intake baseline for independent preservation checks');
 assert.deepEqual(conditionGroups(baseline),REMAINING_GROUPS);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin cdbefd514164a559bc5aaab631c267f3084e31a6/);assert.match(baseline,/git cat-file -e cdbefd514164a559bc5aaab631c267f3084e31a6\^\{commit\}/);
 assert.doesNotMatch(baseline,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 const historicalSourceGroups=['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanatherapair101','apadanatherapair121','apadanathera141','apadanathera161','apadanaedition','thagsixteen',...INTAKE_181_220_GROUPS,...INTAKE_241_250_GROUPS,...INTAKE_221_230_GROUPS];
 const historical=historicalSourceGroups.flatMap(name=>conditionalSteps(group,name).filter(step=>/^        run:/m.test(step)&&!step.startsWith('      - name: Fetch exact ')));
 assert.equal(historical.length,84);assert.equal(historical.length+REMAINING_GROUPS.flatMap(name=>conditionalSteps(group,name)).length,92);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0],install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;
 assert.equal(beforeRemainingGroups(selected).length+otherJobs,63);assert.equal(selected.length+otherJobs,65);assert.doesNotMatch(node,/timeout-minutes:/);
 const expression=group.match(/^    timeout-minutes: \$\{\{ (.+) \}\}$/m)[1];
 for(const name of REMAINING_GROUPS){assert.equal(runInNewContext(expression,{matrix:{group:name}},{timeout:1000}),20);assert.equal(conditionalSteps(group,name).length,4);assert.ok(group.indexOf(baseline)<group.indexOf(conditionalSteps(group,name)[0]));}
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials');assert.deepEqual(conditionGroups(fixture).filter(name=>REMAINING_GROUPS.includes(name)),REMAINING_GROUPS);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);assert.equal(files.length,295);assert.equal(new Set(files).size,295);
 assert.deepEqual(files.filter(path=>remainingFixtureFiles.includes(path)),remainingFixtureFiles);assert.equal(files.filter(path=>!remainingFixtureFiles.includes(path)).length,278);
 assert.equal(files.filter(path=>path==='src/_poems/chapter-3/poem-231.md').length,1,'old231 fixture is reused');for(const n of [234,260])assert.ok(!files.includes('src/_poems/chapter-3/poem-'+n+'.md'),'held source is not added');
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');assert.deepEqual(conditionGroups(xml).filter(name=>REMAINING_GROUPS.includes(name)),REMAINING_GROUPS);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml','romn/s0510a.att.xml']);
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);for(const report of remainingReports)assert.equal(retained.filter(path=>path===report).length,1);
 const projected=beforeRemainingWorkflow(source);assert.equal(createHash('sha256').update(projected).digest('hex'),'18bc1c70573e13b066ee0f6b69487b64007660ec8e8bd0246979920c43b84eec','only17 fixture paths, two groups/nine steps and their reports/conditions are projected out');
 const oldExpression=projected.match(/^    timeout-minutes: (\$\{\{[^\n]+)$/m)[1].slice(3,-2).trim();for(const name of beforeRemainingGroups(selected))assert.equal(runInNewContext(expression,{matrix:{group:name}},{timeout:1000}),runInNewContext(oldExpression,{matrix:{group:name}},{timeout:1000}),name+' keeps its exact budget');
});

test('remaining Therā CI runs each separate nine-source replay and wrapper pair before its selected browser triplet',()=>{
 const source=beforeHeld234Workflow(sourceNotesHistoricalWorkflow());
 for(const [name,batch,family]of [['apadanathera231','A','231-240'],['apadanathera251','B','251-259']]){
  const steps=conditionalSteps(source,name);assert.equal(steps.length,4);const validation=steps[0],commands=steps.join('\n'),stem=family.replace('-','_');
  assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);assert.ok(validation.includes('node scripts/shard-data.mjs --unpack server/data "$RUNNER_TEMP/'+name+'-inputs"'));
  const replay=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera'+stem+'.py '));assert.equal(replay.length,1);
  for(const flag of ['--source-root .fixtures/apadana-pinned','--canon "$RUNNER_TEMP/'+name+'-inputs/canon.json.gz"','--xml .fixtures/apadana-vri-pinned/romn/s0510m1.mul.xml','--goldens docs/evidence/apadana/THERA_'+stem+'_GOLDENS.json','--profiles docs/evidence/apadana/THERA_'+stem+'_EXPECTED_PROFILES.json','--links docs/evidence/apadana/THERA_'+stem+'_EXPECTED_LINKS.json'])assert.ok(replay[0].includes(flag));
  assert.ok(replay[0].endsWith('--verify-only > standalone-'+name+'-independent.report.json'));assert.doesNotMatch(replay[0],/--raw-packet|--payloads|--output|\/tmp\//);
  const tests=validation.split('\n').filter(line=>line.includes('node --test '));assert.equal(tests.length,1);assert.ok(tests[0].endsWith('node --test tests/apadana-thera'+family+'.test.mjs tests/thera'+family+'-client.test.mjs'),'only this independent nine-source wrapper pair runs');
  assert.match(tests[0],/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned/);
  const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera-remaining-check.py '));assert.equal(browser.length,3);for(const line of browser)assert.ok(line.includes('--batch '+batch+' --source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
  assert.ok(browser.some(line=>line.endsWith('--launch-receipt standalone-'+name+'-launch.report.json --report standalone-'+name+'.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));
  assert.ok(browser.some(line=>line.endsWith('--a11y --launch-receipt standalone-'+name+'-a11y-launch.report.json --report standalone-'+name+'-a11y.report.json')));
  assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/'+name+'-installed/node_modules/pali-canon-mcp/server" --package-archive "$1" --launch-receipt installed-'+name+'-launch.report.json --report installed-'+name+'.report.json')));
  assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/'+name+'-package"'));assert.ok(steps[3].includes('set -- "$RUNNER_TEMP/'+name+'-package/"*.tgz\n          test "$#" -eq 1\n          test -f "$1"'));
  assert.ok(steps[3].includes('npm install --prefix "$RUNNER_TEMP/'+name+'-installed" --offline --ignore-scripts --no-audit --no-fund --package-lock=false "$1"'));assert.doesNotMatch(steps[3],/tar -x|cp -R|package\/server/);
  assert.doesNotMatch(commands,/--batch all|--pilot|--mcp-only|--live|curl |wget |continue-on-error|\|\| true/,'each lane executes full selected9 acceptance without duplicating all18');
 }
 const harness=readFileSync(new URL('scripts/web-reader-thera-remaining-check.py',HistoricalHBase),'utf8');
 const write=harness.indexOf('write_launch()  # Contemporaneous record exists BEFORE the server subprocess.'),popen=harness.indexOf('server = subprocess.Popen('),launch=harness.indexOf("launch={'status':'launching'");assert.ok(launch>=0&&write>launch&&popen>write);
 const receipt=harness.slice(launch,write);for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','approval_sha256','started_utc','server_argv','server_cwd','package_archive','selected_groups','selected_source_count','source_group_seals'])assert.ok(receipt.includes(field),'before-Popen receipt binds '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name == 'node_modules'/);assert.match(harness,/runtime_origin[^\n]+isolated-npm-install/);assert.match(harness,/full_batch_acceptance[^\n]+not args\.pilot and not args\.mcp_only/);
 assert.match(harness,/all18_source_browser_acceptance[^\n]+args\.batch=='all' and not args\.pilot and not args\.mcp_only/,'A/B reports cannot claim all18 browser acceptance');
});

test('remaining curation binds two independently approved nine-poem packets without inventing a combined source derivation',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase),approval=JSON.parse(readFileSync(new URL('THERA_REMAINING_APPROVAL.json',base),'utf8'));
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');assert.equal(approval.base_commit,'cdbefd514164a559bc5aaab631c267f3084e31a6');assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.equal(approval.baseline_ids.length,266);assert.equal(new Set(approval.baseline_ids).size,266);assert.equal(approval.source_groups.length,2);assert.deepEqual(approval.source_groups.map(group=>group.batch),['A','B']);
 assert.equal(Object.hasOwn(approval,'goldens'),false);assert.equal(Object.hasOwn(approval,'independent_normalization'),false,'no fabricated global18 derivation descriptor');
 const expectedA=[233,234,235,237,238,239,240,241,242].map(n=>'tha-ap'+n),expectedB=Array.from({length:9},(_,i)=>'tha-ap'+(i+253));
 assert.deepEqual(approval.source_groups.map(group=>group.approved_ids),[expectedA,expectedB]);assert.deepEqual(approval.approved_ids,expectedA.concat(expectedB));assert.deepEqual(approval.expected_profile_ids,approval.baseline_ids.concat(approval.approved_ids));assert.equal(approval.expected_profile_ids.length,284);assert.equal(new Set(approval.expected_profile_ids).size,284);
 const sealed=descriptor=>{const raw=readFileSync(new URL(descriptor.file,base));assert.equal(createHash('sha256').update(raw).digest('hex'),descriptor.sha256,descriptor.file+' matches its independent seal');return JSON.parse(raw);};
 sealed(approval.baseline_freeze);sealed(approval.previous_intake);assert.equal(approval.previous_intake.file,'THERA_221_230_APPROVAL.json');assert.equal(approval.previous_intake.sha256,'4ae2cd3fea1c64e323dfa41c15403c33215e90f8834c7ee0a4db708f77f68bed');
 for(const [index,group]of approval.source_groups.entries()){
  assert.equal(group.approved_ids.length,9);assert.deepEqual(group.approved_records.map(row=>row.id),group.approved_ids);
  const golden=sealed(group.goldens),profiles=sealed(group.expected_profiles),links=sealed(group.expected_links),peer=sealed(group.independent_normalization);
  for(const descriptor of [group.source_approval,group.independent_source_approval,...group.source_reviews,...group.rights,group.normalization_replay,group.normalization_seals,group.copy_policy])sealed(descriptor);
  const stem=index===0?'231_240':'251_259';assert.equal(group.goldens.file,'THERA_'+stem+'_GOLDENS.json');assert.equal(group.independent_normalization.file,'THERA_'+stem+'_INDEPENDENT_NORMALIZATION.json');
  assert.equal(group.independent_source_approval.sha256,index===0?'6049ff90fc2b45fe0be400ee6c05aff1e498854aebee3fa06337ec60680f23e6':'3626c99eeb7cdd9ee12f76417159d4d0c974bf97fffdd5b29bb60218df38697d');
  assert.deepEqual(golden.poems.map(row=>row.id),group.approved_ids);assert.deepEqual(Object.keys(profiles),group.approved_ids);assert.deepEqual(Object.keys(links),group.approved_ids);
  assert.deepEqual(peer.poems.map(row=>index===0?row.canonical_owner:row.id),group.approved_ids);assert.equal(peer.runtime_approval,false);assert.equal(peer.release_approval,false);
  for(const row of golden.poems){const id=row.id,proof=peer.poems.find(item=>(index===0?item.canonical_owner:item.id)===id);for(const field of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256'])assert.equal(proof[field],row[field]);assert.equal(proof.root_sha256,row.root.root_sha256);assert.deepEqual(proof.body_paragraph_sha256s,row.body_paragraphs.map(part=>part.sha256));assert.equal(profiles[id].english,undefined);assert.equal(profiles[id].match,undefined);assert.deepEqual(links[id],{...profiles[id],english:profiles[id].title,match:'individually-reviewed-whole-poem'});}
  assert.equal(golden.totals.poems,9);assert.equal(golden.totals.body_paragraphs,index===0?60:63);assert.equal(golden.totals.poem_notes,index===0?26:34);
 }
 assert.equal(approval.before_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');assert.equal(approval.after_canon_sha256,approval.before_canon_sha256);assert.equal(approval.independent_source_group_count,2);assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);assert.equal(approval.external_activation_count,0);
 for(const id of ['tha-ap236','tha-ap262']){assert.ok(approval.held_ids.includes(id));assert.ok(!approval.approved_ids.includes(id));}assert.equal(approval.finite_integration_authority.canonical_changes_authorized,false);assert.equal(approval.finite_integration_authority.new_namespace_authorized,false);
});


test('held234 CI adds one finite lane and restores the exact immutable284 workflow',()=>{
 const source=sourceNotesHistoricalWorkflow();
 const projected=beforeHeld234Workflow(source);
 assert.equal(createHash('sha256').update(projected).digest('hex'),'ba0d99ad77bcb27af61e006bcd9923c1c528bf3fa95101193c99b570bad9d832','only one held234 lane, baseline fetch, fixture, conditions and reports may be projected away');
 const group=source.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
 const oldGroup=projected.split('  reader-browser-group:')[1].split('  reader-browser:')[0];
 const selected=text=>text.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim());
 const current=selected(group),old=selected(oldGroup);assert.equal(current.length,48);assert.equal(new Set(current).size,48);assert.equal(old.length,47);assert.deepEqual(current.filter(name=>name!==HELD234_GROUP),old);
 assert.equal(current[current.indexOf('apadanathera231')+1],HELD234_GROUP);
 const budget=text=>text.match(/^    timeout-minutes: \$\{\{ (.+) \}\}$/m)[1];
 assert.equal(runInNewContext(budget(group),{matrix:{group:HELD234_GROUP}},{timeout:1000}),20);
 for(const name of old)assert.equal(runInNewContext(budget(group),{matrix:{group:name}},{timeout:1000}),runInNewContext(budget(oldGroup),{matrix:{group:name}},{timeout:1000}),name+' exact old budget');
 const baseline=namedStep(group,'Fetch exact held234 intake baseline for independent preservation checks');assert.deepEqual(conditionGroups(baseline),[HELD234_GROUP]);
 assert.match(baseline,/git fetch --no-tags --depth=1 origin 7d5ac90845402b322dabf2c5120d1485b15c0bda/);assert.match(baseline,/git cat-file -e 7d5ac90845402b322dabf2c5120d1485b15c0bda\^\{commit\}/);
 const selectedSteps=conditionalSteps(group,HELD234_GROUP);assert.equal(selectedSteps.length,5);assert.equal(selectedSteps.filter(step=>!step.startsWith('      - name: Fetch exact ')).length,4);assert.ok(group.indexOf(baseline)<group.indexOf(selectedSteps[1]));
 const required=text=>stepsOf(text).filter(step=>/^        run:/m.test(step)&&!step.startsWith('      - name: Fetch exact ')&&conditionGroupsSafe(step).some(name=>['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition','thagsixteen',...PAIR_GROUPS,...INTAKE_141_180_GROUPS,...INTAKE_181_220_GROUPS,...INTAKE_241_250_GROUPS,...INTAKE_221_230_GROUPS,...REMAINING_GROUPS,HELD234_GROUP].includes(name)));
 function conditionGroupsSafe(step){return /^        if: matrix\.group == '[a-z0-9]+'(?: \|\| matrix\.group == '[a-z0-9]+')*$/m.test(step)?conditionGroups(step):[];}
 assert.equal(required(oldGroup).length,92);assert.equal(required(group).length,96);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0],install=readFixedHUnchangedCurrentWitness('.github/workflows/npx.yml','utf8');
 const otherJobs=1+1+matrix(compat,'engine').length+matrix(node,'os').length*matrix(node,'node').length+matrix(install,'os').length*matrix(install,'node').length+1+1;assert.equal(old.length+otherJobs,65);assert.equal(current.length+otherJobs,66);assert.doesNotMatch(node,/timeout-minutes:/);
 const fixture=namedStep(group,'Check out exact public Apadāna source fixtures without credentials'),oldFixture=namedStep(oldGroup,'Check out exact public Apadāna source fixtures without credentials');
 const paths=text=>[...text.matchAll(/^            (.+)$/gm)].map(match=>match[1]);const files=paths(fixture);assert.equal(files.length,296);assert.equal(new Set(files).size,296);assert.deepEqual(files.filter(path=>path!=='src/_poems/chapter-3/poem-234.md'),paths(oldFixture));assert.equal(files.filter(path=>path==='src/_poems/chapter-3/poem-234.md').length,1);assert.ok(!files.includes('src/_poems/chapter-3/poem-260.md'));
 for(const name of ['Check out exact public Apadāna source fixtures without credentials','Check out exact public Apadāna original XML without credentials'])assert.ok(conditionGroups(namedStep(group,name)).includes(HELD234_GROUP));
 const retained=group.split('          path: |')[1].split('          if-no-files-found:')[0].trim().split(/\s+/);for(const report of held234Reports)assert.equal(retained.filter(path=>path===report).length,1);
});

test('held234 lane executes independent one-source replay, exact wrappers and three genuine browser modes',()=>{
 const source=sourceNotesHistoricalWorkflow();const steps=conditionalSteps(source,HELD234_GROUP).filter(step=>!step.startsWith('      - name: Fetch exact '));assert.equal(steps.length,4);
 const validation=steps[0],commands=steps.join('\n');assert.match(validation,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 const replay=validation.split('\n').filter(line=>line.trim().startsWith('python scripts/apadana/review_thera_held234.py '));assert.equal(replay.length,1);
 for(const flag of ['--source-root .fixtures/apadana-pinned','--canon "$RUNNER_TEMP/apadanathera234-inputs/canon.json.gz"','--xml .fixtures/apadana-vri-pinned/romn/s0510m1.mul.xml','--goldens docs/evidence/apadana/THERA_HELD234_GOLDENS.json','--profiles docs/evidence/apadana/THERA_HELD234_EXPECTED_PROFILES.json','--links docs/evidence/apadana/THERA_HELD234_EXPECTED_LINKS.json'])assert.ok(replay[0].includes(flag));
 assert.ok(replay[0].endsWith('--verify-only > standalone-apadanathera234-independent.report.json'));assert.doesNotMatch(replay[0],/--raw-packet|--payloads|--output|\/tmp\//);
 const tests=validation.split('\n').filter(line=>line.includes('node --test '));assert.equal(tests.length,1);assert.ok(tests[0].endsWith('node --test tests/apadana-held234.test.mjs tests/held234-client.test.mjs'));assert.match(tests[0],/APADANA_SOURCE_CHECKOUT=\.fixtures\/apadana-pinned APADANA_OFFICIAL_CHECKOUT=\.fixtures\/apadana-pinned VRI_SOURCE_CHECKOUT=\.fixtures\/apadana-vri-pinned/);
 const browser=commands.split('\n').filter(line=>line.includes('python scripts/web-reader-thera-held234-check.py '));assert.equal(browser.length,3);for(const line of browser)assert.ok(line.includes('--source-root .fixtures/apadana-pinned --official-checkout .fixtures/apadana-pinned'));
 assert.ok(browser.some(line=>line.endsWith('--launch-receipt standalone-apadanathera234-launch.report.json --report standalone-apadanathera234.report.json')&&!line.includes('--a11y')&&!line.includes('--server-dir')));assert.ok(browser.some(line=>line.endsWith('--a11y --launch-receipt standalone-apadanathera234-a11y-launch.report.json --report standalone-apadanathera234-a11y.report.json')));
 assert.ok(browser.some(line=>line.includes('--server-dir "$RUNNER_TEMP/apadanathera234-installed/node_modules/pali-canon-mcp/server" --package-archive "$1" --launch-receipt installed-apadanathera234-launch.report.json --report installed-apadanathera234.report.json')));
 assert.ok(steps[3].includes('npm pack --pack-destination "$RUNNER_TEMP/apadanathera234-package"'));assert.ok(steps[3].includes('set -- "$RUNNER_TEMP/apadanathera234-package/"*.tgz\n          test "$#" -eq 1\n          test -f "$1"'));assert.ok(steps[3].includes('npm install --prefix "$RUNNER_TEMP/apadanathera234-installed" --offline --ignore-scripts --no-audit --no-fund --package-lock=false "$1"'));assert.doesNotMatch(steps[3],/tar -x|cp -R|package\/server/);assert.doesNotMatch(commands,/--batch|--pilot|--mcp-only|--live|curl |wget |continue-on-error|\|\| true/);
 const harness=readFileSync(new URL('scripts/web-reader-thera-held234-check.py',HistoricalHBase),'utf8');
 const launch=harness.indexOf("launch={'status':'launching'"),write=harness.indexOf('write_launch()  # Contemporaneous record exists BEFORE the server subprocess.'),popen=harness.indexOf('server = subprocess.Popen(');assert.ok(launch>=0&&write>launch&&popen>write);
 const receipt=harness.slice(launch,write);for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','approval_sha256','started_utc','server_argv','server_cwd','package_archive','selected_source_count','source_approval','independent_normalization'])assert.ok(receipt.includes(field),'new source before-Popen receipt binds '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name\s*==\s*'node_modules'/);assert.match(harness,/not server_dir\.is_relative_to\(ROOT\)/);assert.match(harness,/isolated-npm-install/);assert.match(harness,/selected_source_count[^\n]+1/);
});

test('held234 curation admits exactly one separately sealed source while frozen remaining284 stays historical',()=>{
 const base=new URL('docs/evidence/apadana/',HistoricalHBase),raw=readFileSync(new URL('THERA_HELD234_APPROVAL.json',base));assert.equal(createHash('sha256').update(raw).digest('hex'),'14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7');const current=JSON.parse(raw);
 const sealed=seal=>{assert.equal(seal.file.split('/').length,1);const bytes=readFileSync(new URL(seal.file,base));assert.equal(createHash('sha256').update(bytes).digest('hex'),seal.sha256);return JSON.parse(bytes);};
 const previous=sealed(current.previous_intake);assert.equal(current.previous_intake.file,'THERA_REMAINING_APPROVAL.json');assert.equal(current.previous_intake.sha256,'20d72ee82ce1a0e07c9b5f5b87c68266637462a91ab1a0d4ba38152ee7396d40');assert.equal(previous.expected_profile_ids.length,284);assert.ok(previous.held_ids.includes('tha-ap236'));assert.ok(!previous.approved_ids.includes('tha-ap236'));
 assert.equal(current.base_commit,'7d5ac90845402b322dabf2c5120d1485b15c0bda');assert.deepEqual(current.baseline_ids,previous.expected_profile_ids);assert.deepEqual(current.baseline_records,previous.baseline_records.concat(previous.approved_records));assert.deepEqual(current.approved_ids,['tha-ap236']);assert.deepEqual(current.approved_records,[{id:'tha-ap236',publisher_chapter:'chapter-3',poem:234}]);assert.deepEqual(current.expected_profile_ids,current.baseline_ids.concat(current.approved_ids));assert.equal(current.expected_profile_ids.length,285);assert.equal(new Set(current.expected_profile_ids).size,285);
 assert.equal(current.goldens.length,1);const golden=sealed(current.goldens[0]),profiles=sealed(current.expected_profiles),links=sealed(current.expected_links),peer=sealed(current.independent_source_approval);assert.deepEqual(golden.poems.map(row=>row.id),['tha-ap236']);assert.deepEqual(Object.keys(profiles),['tha-ap236']);assert.deepEqual(Object.keys(links),['tha-ap236']);assert.equal(current.independent_source_approval.sha256,'9b7b6cf1d4efe45ee06330551651e1baaf76f20226a35c47a07224592d1cfb8d');assert.equal(peer.status,'APPROVE_ONE_EXACT_PUBLISHER234_SOURCE_AND_FINITE_NORMALIZATION_IDENTITY_SCOPE_ONLY');assert.deepEqual(peer.approved_profile_objects,profiles);assert.deepEqual(peer.approved_link_objects,links);assert.equal(peer.runtime_approval,false);assert.equal(peer.release_approval,false);
 for(const field of ['source_approval','independent_normalization','normalization_replay','normalization_seals','copy_policy'])sealed(current[field]);for(const family of ['source_reviews','rights']){assert.ok(current[family].length);for(const seal of current[family])sealed(seal);}
 assert.equal(current.before_canon_sha256,current.after_canon_sha256);assert.equal(current.after_canon_sha256,previous.after_canon_sha256);assert.ok(!current.held_ids.includes('tha-ap236'));assert.ok(current.held_ids.includes('tha-ap262'));assert.equal(current.runtime_approval,false);assert.equal(current.release_approval,false);assert.equal(current.external_activation_count,0);
 const helper=readFileSync(new URL('scripts/web_reader_apadana_intake.py',HistoricalHBase),'utf8'),harness=readFileSync(new URL('scripts/web-reader-thera-remaining-check.py',HistoricalHBase),'utf8');assert.match(helper,/def reviewed_remaining_intake\(root\):/);assert.match(helper,/len\(current\['expected_profile_ids'\]\)==284/);assert.match(helper,/len\(current\['expected_profile_ids'\]\)==285/);assert.match(harness,/approval==reviewed_remaining_intake\(ROOT\)/);assert.match(harness,/curated_additions\(ROOT,'THERA_REMAINING_APPROVAL.json'\)/);assert.match(harness,/all18_source_browser_acceptance[^\n]+args\.batch=='all' and not args\.pilot and not args\.mcp_only/);assert.match(harness,/registry_profiles[^\n]+len\(current_ids\)/);
});
