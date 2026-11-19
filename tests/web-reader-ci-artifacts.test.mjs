import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

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
 for(const name of ['anten','textspacing','apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition','thagsixteen']){
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
 assert.deepEqual(conditionGroups(fixture),['apadana','apadananext','apadanathird','apadanafourth','apadanathera','apadanatheranext','apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial','apadanaedition']);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);
 assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);
 assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files,['LICENSE.md','src/_pages/about.md','src/_includes/site/footer.njk','src/_includes/layouts/epub-metadata.xml','src/_data/site.json','src/_poems/_poems.json',...Array.from({length:40},(_,i)=>i+1).map(n=>'src/_poems/chapter-4/poem-'+String(n).padStart(3,'0')+'.md'),...Array.from({length:90},(_,i)=>i+11).map(n=>'src/_poems/chapter-3/poem-'+String(n).padStart(3,'0')+'.md'),'src/_poems/chapter-3/chapter-3.json']);
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
 assert.equal(selected.length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
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
 assert.equal(selected.length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
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
 assert.equal(selected.length,37,'all 34 earlier browser groups plus three bounded scaled-source groups remain selected');
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
 assert.equal(selected.filter(name=>name==='apadanatheraexpansion').length,1);assert.equal(selected.length,37);
 assert.match(group,/timeout-minutes:[^\n]*matrix\.group == 'apadanatheraexpansion'[^\n]*20/);
 const sharedXml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(sharedXml),['apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial']);
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
 assert.deepEqual(selected.filter(name=>!added.includes(name)),previous,'all earlier Chromium jobs retain their original identities and order');
 assert.deepEqual(selected.filter(name=>added.includes(name)),added);assert.equal(new Set(selected).size,37);
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
 assert.equal(selected.length+otherJobs,55,'only the three new bounded groups increase the configured matrix');
 const timeout=group.match(/^    timeout-minutes: (.+)$/m)?.[1];
 assert.match(timeout,/&& 20 \|\| 10 \}\}$/);
 for(const name of added)assert.ok(timeout.includes("matrix.group == '"+name+"'"),name+' has the finite twenty-minute bound');
});

test('scaled Therā groups require five sealed independent source inputs and all focused, browser and package evidence',()=>{
 const source=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
 const group=source.split('  reader-browser-group:')[1]?.split('  reader-browser:')[0];
 const xml=namedStep(group,'Check out exact public Apadāna original XML without credentials');
 assert.deepEqual(conditionGroups(xml),['apadanatheraexpansion','apadanatherascaled61','apadanatherascaled81','apadanatheraeditorial']);
 assert.match(xml,/uses: actions\/checkout@v4/);assert.match(xml,/repository: VipassanaTech\/tipitaka-xml/);
 assert.match(xml,/ref: 2d134ff9ef60f70a1eb03c9370580228811a3070/);assert.match(xml,/path: \.fixtures\/apadana-vri-pinned/);
 assert.match(xml,/persist-credentials: false/);assert.match(xml,/sparse-checkout-cone-mode: false/);
 assert.deepEqual([...xml.matchAll(/^            (.+)$/gm)].map(match=>match[1]),['romn/s0510m1.mul.xml']);
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
  assert.match(independent[0],/--source-root \.fixtures\/apadana-pinned/);assert.match(independent[0],/--canon "\$RUNNER_TEMP\/scaled-inputs\/canon\.json\.gz"/);
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
