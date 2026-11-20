import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const INTAKE_241_250_GROUPS=['apadanathera241'];
const before241250Groups=groups=>groups.filter(name=>!INTAKE_241_250_GROUPS.includes(name));
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

test('every browser-group JSON report is retained as a CI artifact',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 assert.ok(group,'browser matrix exists');
 const selected=group.match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(x=>x.trim());
 assert.ok(selected?.includes('highlights'),'source-aware highlight acceptance is selected');
 assert.ok(selected?.includes('navigation'),'source-pinned navigation acceptance is selected');
 assert.ok(selected?.includes('conflicts'),'local note-conflict acceptance is selected');
 assert.ok(selected?.includes('booksearch'),'complete source-book search acceptance is selected');
 assert.ok(selected?.includes('chapters'),'chapter and compact-context acceptance is selected');
 for(const name of ['anten','textspacing','apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition','thagsixteen',...PAIR_GROUPS,...INTAKE_141_180_GROUPS,...INTAKE_181_220_GROUPS,...INTAKE_241_250_GROUPS]){
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const steps=[...group.matchAll(/if: matrix\.group == 'draftsafety'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]).join('\n');
 const commands=steps.split('\n').filter(line=>line.includes('python scripts/web-reader-study-focus-check.py'));
 assert.equal(commands.length,3,'normal, accessibility and installed checks are required');
 assert.ok(commands.some(line=>line.includes('--a11y --report standalone-study-focus-a11y.report.json')));
 assert.ok(commands.some(line=>line.includes('--server-dir "$RUNNER_TEMP/draft-focus-package/package/server" --report installed-study-focus.report.json')));
 assert.ok(commands.some(line=>line.includes('--report standalone-study-focus.report.json')));
});


test('Apadāna browser CI uses a pinned public fixture without persisted credentials or publisher network',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const fixture=source.split('      - name: Check out exact public Apadāna source fixtures without credentials')[1]?.split('      - name: Validate all Apadāna source and rights pins')[0];
 assert.ok(fixture,'exact public fixture checkout exists');
 assert.deepEqual(beforePairGroups(conditionGroups(fixture)),['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition']);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);
 assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);
 assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files.filter(path=>!pairFixtureFiles.includes(path)&&!intake141180FixtureFiles.includes(path)&&!intake181220FixtureFiles.includes(path)&&!intake241250FixtureFiles.includes(path)),['LICENSE.md','src/_pages/about.md','src/_includes/site/footer.njk','src/_includes/layouts/epub-metadata.xml','src/_data/site.json','src/_poems/_poems.json',...Array.from({length:40},(_,i)=>i+1).map(n=>'src/_poems/chapter-4/poem-'+String(n).padStart(3,'0')+'.md'),...Array.from({length:90},(_,i)=>i+11).map(n=>'src/_poems/chapter-3/poem-'+String(n).padStart(3,'0')+'.md'),'src/_poems/chapter-3/chapter-3.json']);
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 assert.match(source,/group:[^\n]*apadananext/);assert.match(source,/matrix\.group == 'apadananext'[^\n]*20/);
 const steps=[...source.matchAll(/if: matrix\.group == 'apadananext'([^]*?)(?=\n      -|$)/g)].map(m=>m[1]).join('\n');
 assert.equal((steps.match(/python scripts\/web-reader-apadana-next-check\.py --source-root \.fixtures\/apadana-pinned/g)||[]).length,3);
 assert.match(steps,/node --test tests\/apadana-next\.test\.mjs tests\/apadana-next-client\.test\.mjs tests\/apadana-next-boundaries\.test\.mjs/);
 assert.doesNotMatch(steps,/--live|curl |wget |https:\/\/apadanatranslation\.com/);
});


test('third Apadāna chapter has its own bounded pinned-source and three-mode browser gate',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const install=readFileSync(new URL('../.github/workflows/npx.yml',import.meta.url),'utf8');
 assert.deepEqual(matrix(install,'os'),['ubuntu-latest','macos-latest','windows-latest']);assert.deepEqual(matrix(install,'node'),['20','24']);
 for(const [file,name]of [['npx.yml','npx'],['corpus.yml','corpus'],['evidence.yml','evidence']]){
  const workflow=readFileSync(new URL('../.github/workflows/'+file,import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(beforePairGroups(conditionGroups(xml)),['apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial']);
 assert.match(xml,/uses: actions\/checkout@v4/);assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);
 assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(xml,/path: \.fixtures\/apadana-vri-pinned/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]).filter(path=>path!=='romn/s0510a.att.xml'),['romn/s0510m1.mul.xml']);
 const goldenFiles=['THERA_SEVENTH_GOLDENS.json','THERA_EIGHTH_GOLDENS.json','THERA_NINTH_GOLDENS.json','THERA_TENTH_GOLDENS.json','THERA_EDITORIAL_GAP_GOLDENS.json'];
 const approval=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_SCALED_APPROVAL.json',import.meta.url),'utf8'));
 assert.equal(approval.status,'approved');assert.equal(approval.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 for(const input of approval.goldens){
  assert.match(input.sha256,/^[a-f0-9]{64}$/);
  const bytes=readFileSync(new URL('../docs/evidence/apadana/'+input.file,import.meta.url));
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const approval=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_PAIR_INTAKE_APPROVAL.json',import.meta.url),'utf8'));
 assert.equal(approval.status,'approved');assert.equal(approval.base_commit,'b5669a334add97ebc0c3c32f9b3fb45ed90d9780');
 assert.deepEqual(approval.goldens.map(input=>input.file),goldenFiles);
 for(const input of approval.goldens){const bytes=readFileSync(new URL('../docs/evidence/apadana/'+input.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),input.sha256);}
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
 const workflow=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const step=workflow.split('      - name: Check retained reader views and the shared live cache under mixed load')[1].split('      - uses:')[0];
 assert.match(step,/--mount "type=bind,src=\$GITHUB_WORKSPACE\/web\/content-sha256\.mjs,dst=\/app\/web\/content-sha256\.mjs,readonly"/);
 assert.match(step,/--network none/);assert.match(step,/--cap-drop ALL/);assert.match(step,/--security-opt no-new-privileges/);
 assert.match(step,/--full-cache --reader-caches --reader-ui/);
 const widget=readFileSync(new URL('../src/chatgpt-widget.mjs',import.meta.url),'utf8');
 assert.match(widget,/from ['"]\.\.\/web\/content-sha256\.mjs['"]/);
});


test('scaled preservation jobs fetch only their exact historical baseline before source checks',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const step=namedStep(workflow,'Fetch exact reviewed Apadāna baseline for independent preservation checks');
 assert.match(step,/if: matrix\.group == 'apadanatherascaled61' \|\| matrix\.group == 'apadanatherascaled81' \|\| matrix\.group == 'apadanatheraeditorial'/);
 assert.match(step,/git fetch --no-tags --depth=1 origin 64a336789ab5f4f02964ff3023ea6b26b330e406/);
 assert.match(step,/git cat-file -e 64a336789ab5f4f02964ff3023ea6b26b330e406\^\{commit\}/);
 assert.doesNotMatch(step,/--unshallow|fetch-depth: 0|git reset|git checkout/);
 assert.ok(workflow.indexOf(step)<workflow.indexOf('      - name: Validate scaled Therā 61-80'),'baseline is present before the independent preservation gate');
});

test('Therā 141–180 adds exactly two bounded source and reader groups while preserving all 57 prior jobs',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=before181220Groups(group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim()));
 assert.equal(selected.length,41);assert.equal(new Set(selected).size,41);
 assert.equal(before141180Groups(selected).length,39);assert.equal(beforePairGroups(selected).length,37);
 assert.deepEqual(selected.filter(name=>INTAKE_141_180_GROUPS.includes(name)),INTAKE_141_180_GROUPS);
 const insertion=selected.indexOf('apadanatherapair121')+1;
 assert.deepEqual(selected.slice(insertion,insertion+2),INTAKE_141_180_GROUPS);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))?.[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFileSync(new URL('../.github/workflows/npx.yml',import.meta.url),'utf8');
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
 const base=new URL('../docs/evidence/apadana/',import.meta.url);
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const selected=before241250Groups(group.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(name=>name.trim()));
 assert.equal(selected.length,43);assert.equal(new Set(selected).size,43);
 assert.equal(before181220Groups(selected).length,41);assert.equal(before141180Groups(selected).length,39);assert.equal(beforePairGroups(selected).length,37);
 assert.deepEqual(selected.filter(name=>INTAKE_181_220_GROUPS.includes(name)),INTAKE_181_220_GROUPS);
 const insertion=selected.indexOf('apadanathera161')+1;
 assert.deepEqual(selected.slice(insertion,insertion+2),INTAKE_181_220_GROUPS);
 const matrix=(text,key)=>text.match(new RegExp('^        '+key+': \\[([^\\]]+)\\]','m'))?.[1].split(',').map(value=>value.trim());
 const node=source.split('  check:')[1],compat=source.split('  reader-compat:')[1].split('  check:')[0];
 const install=readFileSync(new URL('../.github/workflows/npx.yml',import.meta.url),'utf8');
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
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]).filter(path=>!intake241250FixtureFiles.includes(path));
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
 const base=new URL('../docs/evidence/apadana/',import.meta.url);
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
 const raw=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const install=readFileSync(new URL('../.github/workflows/npx.yml',import.meta.url),'utf8');
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
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
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
 const harness=readFileSync(new URL('../scripts/web-reader-thera241-250-check.py',import.meta.url),'utf8');
 const write=harness.indexOf('write_launch()  # Contemporaneous record exists BEFORE the server subprocess.'),popen=harness.indexOf('server = subprocess.Popen('),launch=harness.indexOf("launch={'status':'launching'");
 assert.ok(launch>=0&&write>launch&&popen>write,'archive/runtime launch binding is written before the actual server subprocess');
 const receipt=harness.slice(launch,write);
 for(const field of ['server_file_sha256','harness_sha256','helper_sha256','package_sha256','approval_sha256','started_utc','server_argv','server_cwd','package_archive'])assert.ok(receipt.includes(field),'before-Popen launch evidence includes '+field);
 assert.match(harness,/server_dir\.parent\.parent\.name == 'node_modules'/);
 assert.match(harness,/runtime_origin[^\n]+isolated-npm-install/);
 assert.match(harness,/full_batch_acceptance[^\n]+not args\.pilot and not args\.mcp_only/);
});

test('Therā 241–250 CI binds the reviewed ten-poem normalization, separate pure profiles/links and unchanged canon',()=>{
 const base=new URL('../docs/evidence/apadana/',import.meta.url);
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
