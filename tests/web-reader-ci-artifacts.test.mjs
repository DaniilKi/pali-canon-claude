import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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
 for(const name of ['anten','textspacing','apadana']){
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
 assert.match(fixture,/if: matrix\.group == 'apadana'/);
 assert.match(fixture,/repository: apadana-translation\/apadana-site/);
 assert.match(fixture,/ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4/);
 assert.match(fixture,/persist-credentials: false/);
 assert.match(fixture,/sparse-checkout-cone-mode: false/);
 const files=[...fixture.matchAll(/^            (.+)$/gm)].map(match=>match[1]);
 assert.deepEqual(files,['LICENSE.md','src/_pages/about.md','src/_includes/site/footer.njk','src/_includes/layouts/epub-metadata.xml','src/_data/site.json','src/_poems/_poems.json',...[1,2,3,6,7,8,9].map(n=>'src/_poems/chapter-4/poem-'+String(n).padStart(3,'0')+'.md')]);
 const steps=[...source.matchAll(/if: matrix\.group == 'apadana'([^]*?)(?=\n      -|$)/g)].map(match=>match[1]).join('\n');
 assert.match(steps,/node scripts\/apadana\/build\.mjs --source \.fixtures\/apadana-pinned --check/);
 assert.equal((steps.match(/python scripts\/web-reader-apadana-check\.py --source-root \.fixtures\/apadana-pinned/g)||[]).length,3);
 assert.doesNotMatch(steps,/--live|https:\/\/apadanatranslation\.com|curl |wget /);
 const paths=source.split('          path: |')[1].split('          if-no-files-found:')[0];
 assert.doesNotMatch(paths,/fixtures|poem-|\.md|apadana-site/,'only metadata reports are uploaded, never source fixtures');
});
