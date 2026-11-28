import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync,existsSync,symlinkSync,realpathSync,lstatSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {resolve,join,dirname,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {digest,inventory,loadBaseline,makeContext,nodeArguments,eventCollector,aggregateReceipts,execute,MAX_CHILD_MS,ciIdentity,historicalWindowsPythonWrappers,historicalNativePythonPartitionFixture,WINDOWS_PYTHON_PARTITION_INDEX,CURRENT380_CI_INDEX} from '../scripts/ci-test-partitions.mjs';
import {assertCurrentSourceClosure,currentContext,CURRENT_SOURCE_FILE,CURRENT_WIDGET_VERSION,CURRENT_WIDGET_URI} from './helpers/current-apadana.mjs';
import {CURRENT_WIDGET_VERSION as HISTORICAL382_WIDGET_VERSION} from './helpers/intake382-metadata.mjs';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..'), COMMIT='0123456789abcdef0123456789abcdef01234567';
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture(){const root=realpathSync(mkdtempSync(join(tmpdir(),'ci-partitions-')));mkdirSync(join(root,'scripts'));mkdirSync(join(root,'tests'));for(const file of ['test.mjs','ci-test-partitions.mjs','ci-test-reporter.mjs'])copyFileSync(join(ROOT,'scripts',file),join(root,'scripts',file));const files={
 'a.test.mjs':"import test from 'node:test';function add(){test('duplicate λ',()=>{});}add();add();\n",
 'b.test.mjs':"import test from 'node:test';test('parent',async t=>{await t.test('子',()=>{});await t.test('子',()=>{});});\n",
 'c.test.mjs':"import test from 'node:test';test('optional',{skip:'fixture only'},()=>{});\n",
 'd.test.mjs':"import test from 'node:test';test('pending',{todo:'fixture only'},()=>{throw Error('expected fixture TODO');});\n",
 'ci-test-partitions.test.mjs':"import test from 'node:test';test('added fixture case',()=>{});\n"};for(const[name,body]of Object.entries(files))writeFileSync(join(root,'tests',name),body);const baseline={schema:'reviewed-ci-test-baseline-v1',commit:'c7e5939c3c479a78d3537e17deac6318162f3896',legacy_test_count:7,added_test_count:1,driver:{path:'scripts/test.mjs',sha256:digest(readFileSync(join(root,'scripts/test.mjs')))},files:Object.fromEntries(Object.keys(files).filter(n=>n!=='ci-test-partitions.test.mjs').sort().map(n=>['tests/'+n,digest(files[n])])),additions:Object.fromEntries(['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs','tests/ci-test-partitions.test.mjs'].map(n=>[n,digest(readFileSync(join(root,n)))]))};const index=join(root,'baseline.json');writeFileSync(index,JSON.stringify(baseline));const pin=digest(readFileSync(index));return {root,index,pin,checked:loadBaseline(root,index,pin),cleanup(){rmSync(root,{recursive:true,force:true});}};}
function node20(receipt,platform){const r=clone(receipt);r.events.context.node_major=20;r.events.context.platform=platform;r.events.context_sha256=digest(JSON.stringify(r.events.context));return r;}
function fakeReceipt(context,rows){const counts={tests:rows.filter(x=>x.type==='test').length,suites:rows.filter(x=>x.type==='suite').length,pass:rows.filter(x=>x.type==='test'&&x.status==='pass').length,fail:0,cancelled:0,skipped:rows.filter(x=>x.type==='test'&&x.status==='skip').length,todo:rows.filter(x=>x.type==='test'&&x.status==='todo').length};return {schema:'complete-ci-test-receipt-v1',events:{schema:'complete-ci-test-events-v1',context,context_sha256:digest(JSON.stringify(context)),complete:true,cases:clone(rows),summary:counts},execution:{exit_code:0,signal:null,error:null,timed_out:false,cleanup_unverified:false,bound_ms:10000}};}
function aggregateFixture(f){const contexts=[0,1,2,3].map(partition=>makeContext(f.root,f.checked,{commit:COMMIT,mode:'partition',partition,platform:'win32',node:'v20.20.2'}));const rows=f.checked.inventory.map(({path},i)=>({file:path,line:1,column:1,name:'case '+i,type:'test',nesting:0,status:'pass'}));const full=makeContext(f.root,f.checked,{commit:COMMIT,mode:'full',platform:'linux',node:'v20.20.2'});f.checked.baseline.legacy_test_count=4;f.checked.baseline.added_test_count=1;for(const c of [...contexts,full]){c.legacy_test_count=4;c.added_test_count=1;}return {reference:fakeReceipt(full,rows),parts:contexts.map(c=>fakeReceipt(c,rows.filter(r=>c.selected_files.includes(r.file))))};}

test('complete sorted discovery and finite additions reject omissions substitution and nonregular files',()=>{assertSuccessorBaselineFixtures();const f=fixture();try{const all=inventory(f.root);assert.equal(all.length,5);const partitions=[0,1,2,3].map(partition=>makeContext(f.root,f.checked,{commit:COMMIT,mode:'partition',partition}).selected_files);assert.deepEqual(partitions.flat().sort(),all.map(r=>r.path));assert.equal(new Set(partitions.flat()).size,all.length);writeFileSync(join(f.root,'tests','ignored.txt'),'no test');mkdirSync(join(f.root,'tests','nested'));writeFileSync(join(f.root,'tests','nested','hidden.test.mjs'),'throw Error()');assert.deepEqual(inventory(f.root),all);writeFileSync(join(f.root,'tests','a.test.mjs'),'changed');assert.throws(()=>loadBaseline(f.root,f.index,f.pin));copyFileSync(join(f.root,'tests','b.test.mjs'),join(f.root,'tests','a.test.mjs'));assert.throws(()=>loadBaseline(f.root,f.index,f.pin));rmSync(join(f.root,'tests','a.test.mjs'));assert.throws(()=>loadBaseline(f.root,f.index,f.pin));mkdirSync(join(f.root,'tests','a.test.mjs'));assert.throws(()=>inventory(f.root));}finally{f.cleanup();}});

test('real full and four partition children preserve the same nested Unicode duplicate skip and TODO cases',{timeout:30000},async()=>{const f=fixture();try{const full=await execute(f.root,f.checked,{commit:COMMIT,mode:'full',receipt:join(f.root,'full.json'),boundMs:10000,platform:'linux'});const parts=[];for(let partition=0;partition<4;partition++)parts.push(await execute(f.root,f.checked,{commit:COMMIT,mode:'partition',partition,receipt:join(f.root,'p'+partition+'.json'),boundMs:10000,platform:'win32'}));assert.equal(full.events.summary.tests,8);assert.equal(full.events.cases.filter(r=>r.name==='duplicate λ').length,2);assert.equal(full.events.cases.filter(r=>r.name==='子'&&r.nesting===1).length,2);const approved=aggregateReceipts(node20(full,'linux'),parts.map(p=>node20(p,'win32')),f.checked,COMMIT);assert.equal(approved.summary.tests,8);assert.equal(approved.summary.skipped,1);assert.equal(approved.summary.todo,1);assert.equal(approved.disjoint_complete_file_cover,true);}finally{f.cleanup();}});

test('terminal event accounting rejects missing summaries cancellations failures and duplicate summary events',()=>{const f=fixture();try{const c=makeContext(f.root,f.checked,{commit:COMMIT,mode:'full'}),data={file:join(f.root,'tests','a.test.mjs'),line:1,column:1,name:'same λ',nesting:0,details:{type:'test'}};const collector=eventCollector(f.root,c);collector.accept({type:'test:pass',data});assert.throws(()=>collector.seal());collector.accept({type:'test:plan',data:{nesting:0,count:1}});for(const[k,v]of Object.entries({tests:1,suites:0,pass:1,fail:0,cancelled:0,skipped:0,todo:0}))collector.accept({type:'test:diagnostic',data:{nesting:0,message:k+' '+v}});assert.equal(collector.seal().cases[0].name,'same λ');assert.throws(()=>collector.accept({type:'test:diagnostic',data:{nesting:0,message:'pass 1'}}));for(const failureType of ['testCodeFailure','cancelledByParent']){const bad=eventCollector(f.root,c);bad.accept({type:'test:fail',data:{...data,details:{type:'test',error:{failureType}}}});bad.accept({type:'test:plan',data:{nesting:0,count:1}});for(const[k,v]of Object.entries({tests:1,suites:0,pass:0,fail:failureType==='testCodeFailure'?1:0,cancelled:failureType==='cancelledByParent'?1:0,skipped:0,todo:0}))bad.accept({type:'test:diagnostic',data:{nesting:0,message:k+' '+v}});assert.throws(()=>bad.seal());}}finally{f.cleanup();}});

test('aggregate refuses corrupt identity cover source hashes statuses counts and duplicated terminal cases',()=>{const f=fixture();try{const base=aggregateFixture(f);assert.throws(()=>ciIdentity({GITHUB_ACTIONS:'true'}));assert.throws(()=>ciIdentity({GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'1',GITHUB_RUN_ATTEMPT:'0',GITHUB_SHA:COMMIT}));assert.deepEqual(ciIdentity({GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'1',GITHUB_RUN_ATTEMPT:'2',GITHUB_SHA:COMMIT}),{run_id:'1',run_attempt:'2',sha:COMMIT});assert.equal(aggregateReceipts(base.reference,base.parts,f.checked,COMMIT).complete,true);const as22=clone(base);for(const receipt of [as22.reference,...as22.parts]){receipt.events.context.node_major=22;receipt.events.context_sha256=digest(JSON.stringify(receipt.events.context));}assert.equal(aggregateReceipts(as22.reference,as22.parts,f.checked,COMMIT,null,22).node_major,22);assert.throws(()=>aggregateReceipts(as22.reference,as22.parts,f.checked,COMMIT));assert.throws(()=>aggregateReceipts(base.reference,base.parts,f.checked,COMMIT,null,22));const mixed=clone(as22);mixed.parts[2].events.context.node_major=20;mixed.parts[2].events.context_sha256=digest(JSON.stringify(mixed.parts[2].events.context));assert.throws(()=>aggregateReceipts(mixed.reference,mixed.parts,f.checked,COMMIT,null,22));for(const unknownMajor of [18,21,24,NaN,'22'])assert.throws(()=>aggregateReceipts(as22.reference,as22.parts,f.checked,COMMIT,null,unknownMajor));const mutations=[x=>x.parts.pop(),x=>x.parts[1]=clone(x.parts[0]),x=>x.parts[0].events.context.commit='f'.repeat(40),x=>x.parts[0].events.context.inventory[0].sha256='a'.repeat(64),x=>x.parts[0].events.context.added_sources['scripts/ci-test-reporter.mjs']='b'.repeat(64),x=>x.parts[0].events.cases[0].status='skip',x=>x.parts[0].events.cases.push(clone(x.parts[0].events.cases[0])),x=>x.parts[0].events.summary.tests++,x=>x.parts[0].execution.signal='SIGTERM',x=>x.parts[0].execution.exit_code=19,x=>x.parts[0].execution.timed_out=true,x=>x.parts[0].execution.cleanup_unverified=true,x=>x.parts[0].events.complete=false,x=>x.reference.events.context.mode='partition',x=>x.parts[0].unknown=true,x=>x.parts[0].events.context.unknown=true,x=>x.parts[0].events.context.ci={run_id:'1',run_attempt:'2',sha:COMMIT},x=>x.parts[0].events.cases[0].name='unknown case'];for(const mutate of mutations){const x=clone(base);mutate(x);assert.throws(()=>aggregateReceipts(x.reference,x.parts,f.checked,COMMIT));}}finally{f.cleanup();}});

test('a real failing child cannot seal an approving execution receipt',{timeout:15000},async()=>{const f=fixture();try{writeFileSync(join(f.root,'tests','a.test.mjs'),"import test from 'node:test';test('deliberate synthetic failure',()=>{throw Error('fixture failure');});");f.checked.inventory=inventory(f.root);await assert.rejects(execute(f.root,f.checked,{commit:COMMIT,mode:'full',receipt:join(f.root,'failure.json'),boundMs:5000}));const r=JSON.parse(readFileSync(join(f.root,'failure.json')));assert.notEqual(r.execution.exit_code,0);assert.notEqual(r.events?.complete,true);}finally{f.cleanup();}});

test('a bounded hung child fails closed without an approving complete receipt',{timeout:15000},async()=>{const f=fixture();try{writeFileSync(join(f.root,'tests','a.test.mjs'),"import test from 'node:test';test('owned synthetic hang',async()=>{await new Promise(()=>{setInterval(()=>{},1000);});});");f.checked.inventory=inventory(f.root);await assert.rejects(execute(f.root,f.checked,{commit:COMMIT,mode:'full',receipt:join(f.root,'timeout.json'),boundMs:800}));const r=JSON.parse(readFileSync(join(f.root,'timeout.json')));assert.equal(r.execution.timed_out,true);assert.notEqual(r.execution.exit_code,0);assert.notEqual(r.events?.complete,true);await assert.rejects(execute(f.root,f.checked,{commit:COMMIT,mode:'partition',partition:0,receipt:join(f.root,'too-long.json'),boundMs:MAX_CHILD_MS+1}));}finally{f.cleanup();}});

test('the real CLI activates its reporter before unchanged complete-file argv',{timeout:15000},()=>{const f=fixture();try{const context=makeContext(f.root,f.checked,{commit:COMMIT,mode:'full'});const actual=nodeArguments(f.root,context);const reporterArgument=actual.find(a=>a.startsWith('--test-reporter='));const reporterURL=new URL(reporterArgument.slice('--test-reporter='.length));assert.equal(reporterURL.protocol,'file:');assert.equal(fileURLToPath(reporterURL),resolve(f.root,'scripts/ci-test-reporter.mjs'));const old=['--test',...(context.platform==='win32'?['--test-concurrency=1']:context.platform==='linux'&&context.mode==='full'?['--test-concurrency=2']:[]),...f.checked.inventory.map(r=>resolve(f.root,r.path))];assert.deepEqual(actual.filter(a=>!a.startsWith('--test-reporter=')),old);assert.ok(actual.indexOf(actual.find(a=>a.startsWith('--test-reporter=')))<actual.indexOf(resolve(f.root,context.selected_files[0])));for(const[platform,mode,flags]of [['linux','full',['--test-concurrency=2']],['linux','partition',[]],['win32','full',['--test-concurrency=1']],['win32','partition',['--test-concurrency=1']],['darwin','full',[]],['freebsd','full',[]]]){const vector=makeContext(f.root,f.checked,{commit:COMMIT,mode,partition:mode==='partition'?0:null,platform});assert.deepEqual(nodeArguments(f.root,vector),['--test',...flags,'--test-reporter='+pathToFileURL(resolve(f.root,'scripts/ci-test-reporter.mjs')).href,...vector.selected_files.map(p=>resolve(f.root,p))]);}const bootstrap=join(f.root,'invoke.mjs');writeFileSync(bootstrap,`import child from 'node:child_process';import{syncBuiltinESMExports}from'node:module';const original=child.execFileSync;child.execFileSync=(file,args,options)=>file==='git'&&JSON.stringify(args)===JSON.stringify(['rev-parse','HEAD'])?'${COMMIT}\\n':original(file,args,options);syncBuiltinESMExports();process.chdir(${JSON.stringify(f.root)});const{main}=await import(${JSON.stringify(pathToFileURL(join(f.root,'scripts','ci-test-partitions.mjs')).href)});await main(['run','--mode','full','--receipt',${JSON.stringify(join(f.root,'cli.json'))},'--baseline-index',${JSON.stringify(f.index)},'--baseline-sha','${f.pin}']);`);const r=spawnSync(process.execPath,[bootstrap],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,env:{...process.env,GITHUB_ACTIONS:'false'}});assert.equal(r.error,undefined,r.stderr);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);const receipt=JSON.parse(readFileSync(join(f.root,'cli.json')));assert.equal(receipt.events.summary.tests,8);assert.equal(receipt.events.complete,true);assert.equal(receipt.events.context.commit,COMMIT);assert.equal(receipt.events.context.node_major,Number(process.versions.node.split('.')[0]));assert.equal(digest(readFileSync(join(f.root,'scripts/test.mjs'))),f.checked.baseline.driver.sha256);}finally{f.cleanup();}});

// Read the real YAML bytes directly; none of the historical workflow inverses apply.
function rawWorkflowContract(raw) {
  const section = name => {
    const match = new RegExp('^  '+name+':\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:|$(?![\\s\\S]))','m').exec(raw);
    assert.ok(match, 'Missing actual CI job '+name);
    return match[1];
  };
  const conformance=current=>{
    const marker='      - name: Verify bounded Python partition protocol\n';assert.equal(current.split(marker).length-1,1);
    const start=current.indexOf(marker),end=current.indexOf('\n      - ',start+1),body=current.slice(start,end<0?current.length:end).trimEnd();
    assert.equal(body,marker+'        timeout-minutes: 3\n        run: node scripts/check-python-partitions.mjs');
    const build='      - name: Build complete check artifacts\n';assert.equal(current.split(build).length-1,1);
    const following=current.indexOf('\n      - ',current.indexOf(build)+1);assert.equal(following+1,start,'Conformance immediately follows complete build');
  };
  const check=section('check');conformance(check);
  assert.match(check,/os: \[ubuntu-latest, macos-latest, windows-latest\]/);
  assert.match(check,/node: \[20, 22\]/);
  assert.match(check,/exclude:\s*\n\s*- os: windows-latest\s*\n\s*node: 20\s*\n\s*- os: windows-latest\s*\n\s*node: 22/);
  assert.match(check,/name: Run complete test inventory\s*\n\s*if: matrix.os != 'ubuntu-latest'\s*\n\s*timeout-minutes: 30\s*\n\s*run: npm test/);
  assert.equal((check.match(/ci-test-partitions\.mjs run --mode full/g)||[]).length,2);
  const exactPostchecks=current=>{
    for (const command of ['npm run audit','npm run smoke','npm run pack:desktop']) {
      const line=new RegExp('^\\s*(?:- )?run: '+command+'\\s*$','m');assert.match(current,line);
    }
  };
  exactPostchecks(check);
  const currentJobs=[check];
  for (const version of [20,22]) {
    const parts=section('windows'+version+'-parts'), gate=section('windows'+version);conformance(gate);assert.doesNotMatch(parts,/Verify bounded Python partition protocol|node scripts\/check-python-partitions\.mjs/);
    assert.match(check,new RegExp("name: Run full Linux"+version+" inventory reference\\s*\\n\\s*if: matrix.os == 'ubuntu-latest' && matrix.node == "+version+"\\s*\\n\\s*timeout-minutes: 30"));
    assert.ok(check.includes('name: linux'+version+'-full-inventory'));
    assert.match(parts,/runs-on: windows-latest/);
    assert.match(parts,/partition: \[0, 1, 2, 3\]/);
    assert.match(parts,new RegExp('node-version: '+version+'(?:\\s|$)'));
    assert.match(parts,new RegExp('name: Run bounded serial Windows'+version+' partition\\s*\\n\\s*timeout-minutes: 20'));
    assert.match(parts,/--mode partition --partition \$\{\{ matrix.partition \}\}/);
    assert.match(parts,/if: always\(\)/);
    assert.ok(parts.includes('name: windows'+version+'-partition-${{ matrix.partition }}'));
    assert.match(gate,new RegExp('name: Node '+version+' / windows-latest'));
    assert.match(gate,new RegExp('node-version: '+version+'(?:\\s|$)'));
    assert.ok(gate.includes('needs: [check, windows'+version+'-parts]'));
    assert.match(gate,/if: always\(\)/);
    for (const needed of ['REFERENCE_JOBS_RESULT','PARTITION_JOBS_RESULT'])
      assert.ok(gate.includes('test "$'+needed+'" = success'));
    assert.match(gate,/merge-multiple: false/);
    assert.equal((gate.match(/ci-test-partitions\.mjs aggregate/g)||[]).length,1);
    assert.match(gate,/--output /);
    assert.ok(gate.includes('name: linux'+version+'-full-inventory'));
    assert.ok(gate.includes('pattern: windows'+version+'-partition-*'));
    for (let index=0;index<4;index++) assert.ok(gate.includes('windows'+version+'-partition-'+index+'/partition-'+index+'.json'));
    assert.ok(gate.indexOf('--parts ')>gate.indexOf('--baseline-sha '));
    exactPostchecks(gate);
    for (const path of ['tests/approved-acceptance.test.mjs','tests/held234-current333-chain.test.mjs']) assert.ok(gate.includes(path));
    currentJobs.push(parts,gate);
  }
  assert.equal(currentJobs.length,5);
  for (const current of currentJobs) {
    const step=name=>{
      const start=current.indexOf('      - name: '+name+'\n');assert.ok(start>=0,'Required fixture Python step '+name);
      const next=current.indexOf('\n      - ',start+1);
      return {start,body:current.slice(start,next<0?current.length:next)};
    };
    const setup=step('Set explicit Python for fixture validation');
    const verification=step('Verify fixture Python version');
    assert.match(setup.body,/^        uses: actions\/setup-python@v5\s*$/m);
    assert.match(setup.body,/^          python-version: '3\.12'\s*$/m);
    assert.match(verification.body,/^        timeout-minutes: 1\s*$/m);
    const command="        run: python3 -c 'import sys; assert sys.version_info[:2] == (3, 12); print(\"fixture-python\", sys.executable, sys.version.split()[0])'";
    assert.ok(verification.body.split('\n').includes(command),'Verify the actual python3 executable and exact3.12 minor');
    assert.doesNotMatch(setup.body,/^\s*if:/m);
    assert.doesNotMatch(verification.body,/^\s*if:/m);
    const install=current.indexOf('run: npm ci --no-audit --no-fund'),build=current.indexOf('run: npm run build');
    assert.ok(setup.start<verification.start&&verification.start<install&&verification.start<build,'Fixture Python must be verified before install and build');
    assert.match(current,/git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf/);
    assert.match(current,/node scripts\/ci-check-contract\.mjs/);
    assert.match(current,/run: npm run build/);
    assert.doesNotMatch(current,/test-name-pattern|continue-on-error:\s*true|--test-skip-pattern|--test-only/);
  }
  return true;
}

test('raw CI workflow keeps the full reference and four bounded Windows partitions',()=>{
  const raw=readFileSync(join(ROOT,'.github/workflows/check.yml'),'utf8');
  assert.equal(rawWorkflowContract(raw),true);
  const inJob=(text,name,change)=>{
    const start=text.indexOf('  '+name+':\n');assert.ok(start>=0);
    const tail=text.slice(start),next=/\n  [a-zA-Z0-9_-]+:/.exec(tail);
    const end=next?start+next.index+1:text.length;
    return text.slice(0,start)+change(text.slice(start,end))+text.slice(end);
  };
  const mutations=[
    text=>inJob(text,'windows20-parts',s=>s.replace('partition: [0, 1, 2, 3]','partition: [0, 1, 2]')),
    text=>inJob(text,'windows20',s=>s.replace('needs: [check, windows20-parts]','needs: [check]')),
    text=>inJob(text,'windows20',s=>s.replace('merge-multiple: false','merge-multiple: true')),
    text=>inJob(text,'windows20-parts',s=>s.replace('--mode partition --partition','--mode partition --test-only --partition')),
    text=>inJob(text,'check',s=>s.replace('run: npm run audit','run: echo removed-audit')),
    text=>inJob(text,'windows20',s=>s.replace(/--output "[^"\n]+" /,'')),
    text=>inJob(text,'windows22-parts',s=>s.replace('partition: [0, 1, 2, 3]','partition: [0, 1, 2]')),
    text=>inJob(text,'windows22',s=>s.replace('needs: [check, windows22-parts]','needs: [check]')),
    text=>inJob(text,'windows22',s=>s.replace('merge-multiple: false','merge-multiple: true')),
    text=>inJob(text,'windows22-parts',s=>s.replace('--mode partition --partition','--mode partition --test-only --partition')),
    text=>inJob(text,'windows22',s=>s.replace(/--output "[^"\n]+" /,'')),
    ...['check','windows20-parts','windows20','windows22-parts','windows22'].flatMap(job=>[
      text=>inJob(text,job,s=>s.replace("          python-version: '3.12'\n",'')),
      text=>inJob(text,job,s=>s.replace("python-version: '3.12'","python-version: '3.13'"))
    ])
  ];
  for (const [index,mutate] of mutations.entries()) {
    const changed=mutate(raw);assert.notEqual(changed,raw,'Each adversarial workflow edit must change actual bytes');
    assert.throws(()=>rawWorkflowContract(changed),'Workflow mutation '+index+' must refuse');
  }
});

// Owned source-only V2 loader fixtures. No alternate production loader mode.
// The immutable340-path predecessor is real; this private fixture adds one
// tiny source file and explicitly records only the39 reviewed edited paths.
function assertSuccessorBaselineFixtures(){
  const current=assertCurrent380CIBaseline();assertCurrent380CIFixtureRefusals(current);
  const historical=prepareHistoricalHSourceInputs(ROOT);
  try{assert.equal(Object.isFrozen(historical),true);assert.deepEqual(Object.keys(historical),['root','index','workflow','close']);assert.equal(typeof historical.root,'string');assert.notEqual(historical.root,ROOT);assert.equal(realpathSync(historical.root),historical.root);assert.equal(typeof historical.close,'function');return assertOwnedHSuccessorBaselineFixtures(historical);}
  finally{historical.close();}
}
function assertOwnedHSuccessorBaselineFixtures(historical){
  const historicalWrappers=assertOwnedHWindowsPythonBaselineFixtures(historical);
  const f=fixture();
  try{
    const predecessorPath='docs/evidence/qa/windows20-partitions/BASELINE_3CED_TEST_FILES.json';
    const predecessor=readFileSync(join(historical.root,predecessorPath));
    assert.equal(digest(predecessor),'f5e3df6886ecbf01904b2ef657bf90944f118edb5b387ece1c4262c0cb25359d');
    const prior=JSON.parse(predecessor);
    rmSync(join(f.root,'tests'),{recursive:true});mkdirSync(join(f.root,'tests'));
    const allowedChanged=new Set(["tests/apadana-disclosures.test.mjs","tests/apadana-fourth-client.test.mjs","tests/apadana-fourth.test.mjs","tests/apadana-held234.test.mjs","tests/apadana-next.test.mjs","tests/apadana-thera.test.mjs","tests/apadana-third.test.mjs","tests/ci-test-partitions.test.mjs","tests/current339-source-inverses.test.mjs","tests/current343-bindings.test.mjs","tests/held234-client.test.mjs","tests/held234-current333-chain.test.mjs","tests/intake343-metadata.test.mjs","tests/intake359-metadata-history.test.mjs","tests/next-ten-history-data.test.mjs","tests/six-boundary-source-input.test.mjs","tests/source-notes-baseline-projection.test.mjs","tests/source-notes-compatibility.test.mjs","tests/thera-commentary-locators.test.mjs","tests/thera141-180-client.test.mjs","tests/thera181-220-client.test.mjs","tests/thera221-230-client.test.mjs","tests/thera241-250-client.test.mjs","tests/thera261-280-client.test.mjs","tests/thera261-280-source.test.mjs","tests/thera281-285-client.test.mjs","tests/thera281-285-source.test.mjs","tests/thera287-288-client.test.mjs","tests/thera287-288-source.test.mjs","tests/thera292-299-client.test.mjs","tests/thera292-299-source.test.mjs","tests/thera312-319-client.test.mjs","tests/thera312-319-source.test.mjs","tests/thera321-329-client.test.mjs","tests/thera321-329-source.test.mjs","tests/thera331-334-preface-client.test.mjs","tests/thera331-334-source.test.mjs","tests/thera335-350-source.test.mjs","tests/widget-hosted-selections.test.mjs"]);
    const changes={};
    for(const[path,before]of Object.entries(prior.files)){
      const bytes=Object.hasOwn(historicalWrappers,path)?Buffer.from(historicalWrappers[path],'utf8'):readFileSync(join(historical.root,path));if(Object.hasOwn(historicalWrappers,path))writeFileSync(join(f.root,path),bytes);else copyFileSync(join(historical.root,path),join(f.root,path));
      const after=digest(bytes);
      if(after!==before){assert.ok(allowedChanged.has(path),'Unexpected changed predecessor test in owned fixture');changes[path]={before_sha256:before,after_sha256:after};}
    }
    const added='tests/successor-fixture-added.test.mjs';
    const addedBody="import test from 'node:test';test('owned successor fixture case',()=>{});\n";
    writeFileSync(join(f.root,added),addedBody);
    const write=(path,value)=>{mkdirSync(dirname(join(f.root,path)),{recursive:true});writeFileSync(join(f.root,path),value);};
    write(predecessorPath,predecessor);
    write(prior.legacy_v1.path,readFileSync(join(historical.root,prior.legacy_v1.path)));
    const reviewPath='docs/evidence/qa/windows20-partitions/INTAKE368_CASE_INVENTORY_REVIEW.json';
    const evidencePath='docs/evidence/qa/windows20-partitions/OWNED_V2_FIXTURE_EVIDENCE.json';
    const evidence=JSON.stringify({scope:'Owned unit fixture only, not release acceptance',added_cases:1});write(evidencePath,evidence);
    const baseline={schema:'reviewed-ci-test-baseline-v2',commit:'3cedb7b7a71a42db1601026cb6d995dafe43c9ce',
      legacy_test_count:2076,added_test_count:1,driver:prior.driver,
      predecessor:{path:predecessorPath,sha256:digest(predecessor)},changed_files:changes,
      added_files:{[added]:digest(addedBody)},
      additions:Object.fromEntries(['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs'].map(path=>[path,digest(readFileSync(join(f.root,path)))])),
      case_inventory:{path:reviewPath,sha256:''}};
    const review={schema:'reviewed-ci-successor-source-case-inventory-v1',status:'GO_EXACT_SOURCE_DELTA_AND_TERMINAL_CASE_INVENTORY_ONLY',
      baseline_commit:baseline.commit,predecessor_sha256:digest(predecessor),
      inventory_sha256:digest(JSON.stringify(inventory(f.root))),driver:baseline.driver,additions:baseline.additions,
      changed_files:changes,added_files:baseline.added_files,preserved_original_test_count:2068,
      preserved_QA_test_count:8,preserved_original_skipped_count:267,added_case_count:1,
      added_cases_by_file:{[added]:1},evidence:[{path:evidencePath,sha256:digest(evidence)}]};
    const publish=(index=baseline,audit=review)=>{const text=JSON.stringify(audit);write(reviewPath,text);index.case_inventory.sha256=digest(text);writeFileSync(f.index,JSON.stringify(index));return digest(readFileSync(f.index));};
    const pin=publish();const loaded=loadBaseline(f.root,f.index,pin);
    assert.equal(loaded.inventory.length,341);assert.equal(loaded.baseline.legacy_test_count+loaded.baseline.added_test_count,2077);
    const refusal=change=>{const b=clone(baseline),r=clone(review);change(b,r);const changedPin=publish(b,r);assert.throws(()=>loadBaseline(f.root,f.index,changedPin));publish();};
    for(const mutate of [
      b=>b.schema='reviewed-ci-test-baseline-v3',b=>b.commit='f'.repeat(40),
      b=>b.legacy_test_count=2068,b=>b.added_test_count=null,b=>b.added_test_count=0,
      b=>b.predecessor.sha256='f'.repeat(64),
      b=>b.changed_files['tests/not-in-predecessor.test.mjs']={before_sha256:'a'.repeat(64),after_sha256:'b'.repeat(64)},
      b=>b.added_files[Object.keys(prior.files)[0]]='a'.repeat(64),
      b=>b.added_files['tests/*.test.mjs']='a'.repeat(64),
      b=>b.additions['scripts/test.mjs']=prior.driver.sha256,
      (_b,r)=>r.preserved_QA_test_count=7,(_b,r)=>r.preserved_original_skipped_count=266,
      (_b,r)=>r.added_case_count=2,(_b,r)=>r.added_cases_by_file[added]=2,
      (_b,r)=>r.inventory_sha256='a'.repeat(64),(_b,r)=>r.status='PENDING'
    ])refusal(mutate);
    if(Object.keys(changes).length){const changed=Object.keys(changes)[0];refusal(b=>b.changed_files[changed].before_sha256='0'.repeat(64));refusal(b=>delete b.changed_files[changed]);}
    for(const path of [added,Object.keys(prior.files)[0],'scripts/ci-test-reporter.mjs',reviewPath,predecessorPath,evidencePath]){
      const file=join(f.root,path),before=readFileSync(file);writeFileSync(file,Buffer.concat([before,Buffer.from('\nchanged')]));
      assert.throws(()=>loadBaseline(f.root,f.index,pin),'V2 physical mutation '+path);writeFileSync(file,before);
    }
    const unknown=join(f.root,'tests','unreviewed-added.test.mjs');writeFileSync(unknown,addedBody);assert.throws(()=>loadBaseline(f.root,f.index,pin));rmSync(unknown);
    const required=join(f.root,added),saved=readFileSync(required);rmSync(required);assert.throws(()=>loadBaseline(f.root,f.index,pin));writeFileSync(required,saved);
    assert.equal(loadBaseline(f.root,f.index,pin).inventory.length,341);
  }finally{f.cleanup();}
}

// Current V3 validation precedes this finite historical-input seam.
function assertCurrentPartitionWorkflow(raw,pin){
  assert.equal(rawWorkflowContract(raw),true);
  const index='docs/evidence/qa/windows20-partitions/BASELINE_368_WINDOWS_PYTHON_PARTITIONS.json';
  const paths=[...raw.matchAll(/^  CI_TEST_BASELINE_INDEX: (.+)$/gm)];assert.equal(paths.length,1);assert.equal(paths[0][1],index);
  const hashes=[...raw.matchAll(/^  CI_TEST_BASELINE_SHA: ([a-f0-9]{64})$/gm)];assert.equal(hashes.length,1);assert.equal(hashes[0][1],pin);
}
function assertHistoricalWindowsPythonBaselineFixtures(historicalRoot,indexProof,workflowProof){
  const indexPath=WINDOWS_PYTHON_PARTITION_INDEX;
  const row=indexProof;assert.ok(row&&Number.isSafeInteger(row.bytes)&&/^[a-f0-9]{64}$/.test(row.sha256),'Independent physical SOURCE binding for current index');
  const indexBytes=readFileSync(join(historicalRoot,indexPath));assert.equal(indexBytes.length,row.bytes);assert.equal(digest(indexBytes),row.sha256);
  const actual=loadBaseline(historicalRoot,join(historicalRoot,indexPath),row.sha256);assert.equal(actual.inventory.length,345);assert.equal(actual.baseline.legacy_test_count+actual.baseline.added_test_count,2092);
  const history=historicalWindowsPythonWrappers(historicalRoot,join(historicalRoot,indexPath),row.sha256);
  assert.deepEqual(Object.keys(history),['tests/six-boundary-history.test.mjs','tests/six-operation-scope.test.mjs']);
  const workflow=workflowProof.raw;assertCurrentPartitionWorkflow(workflow,workflowProof.pin);
  const inJob=(text,name,change)=>{const start=text.indexOf('  '+name+':\n');assert.ok(start>=0);const tail=text.slice(start),next=/\n  [a-zA-Z0-9_-]+:/.exec(tail),end=next?start+next.index+1:text.length;return text.slice(0,start)+change(text.slice(start,end))+text.slice(end);};
  const block='      - name: Verify bounded Python partition protocol\n        timeout-minutes: 3\n        run: node scripts/check-python-partitions.mjs';
  for(const job of ['check','windows20','windows22'])for(const change of [s=>s.replace(block,''),s=>s.replace(block,block.replace('timeout-minutes: 3','timeout-minutes: 4')),s=>s.replace(block,block+'\n        if: false'),s=>s.replace(block,block+'\n        continue-on-error: true'),s=>s.replace(block,block.replace('node scripts/check-python-partitions.mjs','node -e ""'))]){
    const changed=inJob(workflow,job,change);assert.notEqual(changed,workflow);assert.throws(()=>assertCurrentPartitionWorkflow(changed,workflowProof.pin));
  }
  assert.throws(()=>assertCurrentPartitionWorkflow(workflow.replace(workflowProof.pin,'0'.repeat(64)),workflowProof.pin));
  const f=fixture();
  try{
    const b=clone(actual.baseline),reviewPath=b.case_inventory.path,r=JSON.parse(readFileSync(join(historicalRoot,reviewPath)));
    const old=JSON.parse(readFileSync(join(historicalRoot,b.predecessor.path))),prior=JSON.parse(readFileSync(join(historicalRoot,old.predecessor.path))),oldReview=JSON.parse(readFileSync(join(historicalRoot,old.case_inventory.path)));
    const paths=new Set([b.predecessor.path,old.predecessor.path,prior.legacy_v1.path,old.case_inventory.path,...oldReview.evidence.map(x=>x.path),...actual.inventory.map(x=>x.path),b.driver.path,...Object.keys(b.additions),...Object.keys(b.supporting_sources),...Object.keys(b.python_sources)]);
    rmSync(join(f.root,'tests'),{recursive:true});mkdirSync(join(f.root,'tests'));
    for(const path of paths){mkdirSync(dirname(join(f.root,path)),{recursive:true});copyFileSync(join(historicalRoot,path),join(f.root,path));}
    const index=join(f.root,indexPath);mkdirSync(dirname(index),{recursive:true});
    const write=(path,value)=>{mkdirSync(dirname(join(f.root,path)),{recursive:true});writeFileSync(join(f.root,path),value);};
    const publish=(candidate=b,proof=r)=>{const text=JSON.stringify(proof);write(reviewPath,text);candidate.case_inventory.sha256=digest(text);writeFileSync(index,JSON.stringify(candidate));return digest(readFileSync(index));};
    const pin=publish();assert.equal(loadBaseline(f.root,index,pin).inventory.length,345);
    const refusal=change=>{const candidate=clone(b),proof=clone(r);change(candidate,proof);const changedPin=publish(candidate,proof);assert.throws(()=>loadBaseline(f.root,index,changedPin));publish();};
    const wrapper='tests/six-boundary-history.test.mjs';
    for(const mutate of [
      b=>b.schema='unknown-v3',b=>b.commit='f'.repeat(40),b=>b.legacy_test_count=2075,b=>b.added_test_count=17,b=>b.predecessor.sha256='0'.repeat(64),
      b=>delete b.source_overrides[wrapper],b=>b.source_overrides[wrapper].after_sha256=b.source_overrides['tests/six-operation-scope.test.mjs'].after_sha256,
      b=>b.source_overrides['tests/unknown.test.mjs']={before_sha256:'a'.repeat(64),after_sha256:'b'.repeat(64)},
      b=>delete b.files[wrapper],b=>b.files[wrapper]='0'.repeat(64),b=>delete b.supporting_sources['tests/helpers/partitioned-python.mjs'],
      b=>b.supporting_sources['scripts/not-approved.mjs']='a'.repeat(64),b=>b.python_sources['tests/six_boundary_history_acceptance.py']='0'.repeat(64),
      (_b,r)=>r.status='PENDING',(_b,r)=>r.windows_only=false,(_b,r)=>r.behavioral_or_release_approval=true,
      (_b,r)=>r.before_wrapper_sources[wrapper].utf8+='\n',(_b,r)=>r.registrations[wrapper].after[0].options_source='{timeout:65001}',
      (_b,r)=>r.registrations[wrapper].after=[],(_b,r)=>r.partition_suites[0].partitions[0].methods=[],(_b,r)=>r.partition_suites[1].child_timeout_ms=60001
    ])refusal(mutate);
    const physical=[...Object.keys(b.source_overrides),...Object.keys(b.supporting_sources),...Object.keys(b.python_sources),b.predecessor.path,reviewPath];
    for(const path of physical){const file=join(f.root,path),before=readFileSync(file);writeFileSync(file,Buffer.concat([before,Buffer.from('\nSYNTHETIC_SOURCE_DRIFT')]));assert.throws(()=>loadBaseline(f.root,index,pin),'V3 actual source mutation '+path);writeFileSync(file,before);}
    const required=join(f.root,wrapper),before=readFileSync(required);rmSync(required);assert.throws(()=>loadBaseline(f.root,index,pin));writeFileSync(required,before);
    const unknown=join(f.root,'tests','unknown-extra.test.mjs');writeFileSync(unknown,"import test from 'node:test';test('unreviewed',()=>{});\n");assert.throws(()=>loadBaseline(f.root,index,pin));rmSync(unknown);
    assert.equal(loadBaseline(f.root,index,pin).inventory.length,345);
  }finally{f.cleanup();}
  return history;
}

// Genuine current workflow: only independently declared finite H deltas are permitted.
const CURRENT375_H_WORKFLOW_SHA="435b5bd244445c6f48e9593053fa7d0bb672c945ebad1ca0fa87f08b2e83788c";
const CURRENT375_H_FETCH="      - name: Fetch exact accepted H for owned historical fixture inputs\n        timeout-minutes: 2\n        shell: bash\n        run: |\n          git fetch --no-tags --depth=1 origin 4e9287bd5ebc78aba4b185b017e63eac6547bfd7\n          git cat-file -e '4e9287bd5ebc78aba4b185b017e63eac6547bfd7^{commit}'\n";
const CURRENT375_READER_H_FETCH="      - name: Fetch exact accepted H for Apadāna owned historical source fixtures\n        if: matrix.group == 'apadana' || matrix.group == 'apadanatherapair101' || matrix.group == 'apadanathera221' || matrix.group == 'apadanathera231' || matrix.group == 'apadanathera251'\n        timeout-minutes: 2\n        shell: bash\n        run: |\n          git fetch --no-tags --depth=1 origin 4e9287bd5ebc78aba4b185b017e63eac6547bfd7\n          git cat-file -e '4e9287bd5ebc78aba4b185b017e63eac6547bfd7^{commit}'\n";
const CURRENT375_READER_ANCHOR="      - name: Fetch exact reviewed Apadāna baseline for independent preservation checks\n";
const CURRENT375_SPARSE_BEFORE="            src/_poems/chapter-3/poem-360.md\n            src/_poems/chapter-3/chapter-3.json\n";
const CURRENT375_SPARSE_AFTER="            src/_poems/chapter-3/poem-360.md\n            src/_poems/chapter-3/poem-371.md\n            src/_poems/chapter-3/poem-372.md\n            src/_poems/chapter-3/poem-374.md\n            src/_poems/chapter-3/poem-375.md\n            src/_poems/chapter-3/poem-376.md\n            src/_poems/chapter-3/poem-377.md\n            src/_poems/chapter-3/poem-378.md\n            src/_poems/chapter-3/chapter-3.json\n";
const CURRENT375_SEVEN_GATE="      - name: Require all seven publisher371-378 source API and widget cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          set -euo pipefail\n          node --test --test-reporter=tap tests/thera371-378-seven.test.mjs | tee reviewed-publisher371-378-seven.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher371-378-seven.tap\",\"utf8\"); for(const [key,value] of [[\"tests\",2],[\"pass\",2],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) assert.match(tap,new RegExp(\"^# \"+key+\" \"+value+\"$\",\"m\"));'\n";
const CURRENT375_SOURCE_ANCHOR="      - name: Validate all Apadāna source and rights pins before browser retrieval\n";

function current375JobBlock(text,name){
 const start=text.indexOf('  '+name+':\n');assert.ok(start>=0,'Mandatory actual workflow job '+name);const tail=text.slice(start),next=/\n  [a-zA-Z0-9_-]+:/.exec(tail),end=next?start+next.index+1:text.length;return {start,end,raw:text.slice(start,end)};
}
const CURRENT380_FIVE_GATE="      - name: Require all five publisher381/383-386 source API and widget cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          set -euo pipefail\n          node --test --test-reporter=tap tests/thera381-386-five.test.mjs | tee reviewed-publisher381-386-five.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher381-386-five.tap\",\"utf8\"); for(const [key,value] of [[\"tests\",2],[\"pass\",2],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) assert.match(tap,new RegExp(\"^# \"+key+\" \"+value+\"$\",\"m\"));'\n";
const CURRENT380_FIVE_SPARSE="            src/_poems/chapter-3/poem-381.md\n            src/_poems/chapter-3/poem-383.md\n            src/_poems/chapter-3/poem-384.md\n            src/_poems/chapter-3/poem-385.md\n            src/_poems/chapter-3/poem-386.md\n";
const CURRENT389390_INSTALLED_FRUIT_GATE="      - name: Check repaired 389-390 saved positions and exports in a fresh installed reader\n        if: matrix.group == 'provenance'\n        timeout-minutes: 4\n        run: |\n          mkdir -p \"$RUNNER_TEMP/fruit-pair-package\" \"$RUNNER_TEMP/fruit-pair-install\"\n          npm pack --pack-destination \"$RUNNER_TEMP/fruit-pair-package\"\n          npm install --offline --ignore-scripts --no-audit --no-fund --prefix \"$RUNNER_TEMP/fruit-pair-install\" \"$RUNNER_TEMP/fruit-pair-package/\"*.tgz\n          PALI_BROWSER=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\" python scripts/web-reader-fruit-boundary-check.py --source-root \"$GITHUB_WORKSPACE\" --installed-root \"$RUNNER_TEMP/fruit-pair-install/node_modules/pali-canon-mcp\" --report installed-fruit-boundary.report.json\n";
const CURRENT389390_FRUIT_REPORT="            installed-fruit-boundary.report.json\n";
const CURRENT389390_SOURCE16_BEFORE="      - name: Replay sixteen originals without application parser inputs\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          node scripts/shard-data.mjs --unpack server/data .fixtures/english16-canon\n          python3 scripts/apadana/thera335-350/portable_source_replay.py --publisher-checkout .fixtures/apadana-pinned --canon .fixtures/english16-canon/canon.json.gz --vri-xml .fixtures/vri-english335-350/romn/s0510m1.mul.xml --out .fixtures/english16-source-replay\n";
const CURRENT389390_SOURCE16_AFTER="      - name: Replay sixteen originals without application parser inputs\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          node scripts/shard-data.mjs --unpack server/data .fixtures/english16-canon\n          python3 scripts/canon/historical389390_source_fixture.py --canon .fixtures/english16-canon/canon.json.gz --out .fixtures/english16-historical-source\n          python3 scripts/apadana/thera335-350/portable_source_replay.py --publisher-checkout .fixtures/apadana-pinned --canon .fixtures/english16-historical-source/canon.json.gz --vri-xml .fixtures/vri-english335-350/romn/s0510m1.mul.xml --out .fixtures/english16-source-replay\n";
const CURRENT389390_SOURCE9_BEFORE="      - name: Replay nine exact sources with independent goldens and original VRI tuples\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          python3 -X utf8 scripts/apadana/thera351-360-nine/source-nine-replay.py --publisher-root .fixtures/apadana-pinned --canon .fixtures/english16-canon/canon.json.gz --vri-xml .fixtures/vri-english335-350/romn/s0510m1.mul.xml --out .fixtures/english9-source-replay\n";
const CURRENT389390_SOURCE9_AFTER="      - name: Replay nine exact sources with independent goldens and original VRI tuples\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          python3 -X utf8 scripts/apadana/thera351-360-nine/source-nine-replay.py --publisher-root .fixtures/apadana-pinned --canon .fixtures/english16-historical-source/canon.json.gz --vri-xml .fixtures/vri-english335-350/romn/s0510m1.mul.xml --out .fixtures/english9-source-replay\n";
function portableSourceWorkflowBefore389390(text){
 const reader=current375JobBlock(text,'reader-browser-group');
 assert.equal(reader.raw.split(CURRENT389390_SOURCE16_AFTER).length-1,1);assert.equal(reader.raw.split(CURRENT389390_SOURCE9_AFTER).length-1,1);assert.ok(reader.raw.includes(CURRENT389390_SOURCE16_AFTER+CURRENT389390_SOURCE9_AFTER));
 const prior=reader.raw.replace(CURRENT389390_SOURCE16_AFTER,CURRENT389390_SOURCE16_BEFORE).replace(CURRENT389390_SOURCE9_AFTER,CURRENT389390_SOURCE9_BEFORE);
 return text.slice(0,reader.start)+prior+text.slice(reader.end);
}
const SOURCE_PAIR401402_PARTS=Object.freeze(["      - name: Require both publisher401-402 source API and widget cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          set -euo pipefail\n          node --test --test-reporter=tap tests/thera401-402-pair.test.mjs | tee reviewed-publisher401-402-pair.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher401-402-pair.tap\",\"utf8\"); for(const [key,value] of [[\"tests\",2],[\"pass\",2],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) assert.match(tap,new RegExp(\"^# \"+key+\" \"+value+\"$\",\"m\"));'\n","            src/_poems/chapter-3/poem-401.md\n            src/_poems/chapter-3/poem-402.md\n","      - name: Check both publisher401-402 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        run: |\n          python scripts/web-reader-thera401-402-check.py --mode normal --source-root \"$GITHUB_WORKSPACE\" --server-dir server --publisher-root .fixtures/apadana-pinned --browser \"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\" --report standalone-thera401-402.report.json\n","      - name: Audit both publisher401-402 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        run: |\n          python scripts/web-reader-thera401-402-check.py --mode a11y --source-root \"$GITHUB_WORKSPACE\" --server-dir server --publisher-root .fixtures/apadana-pinned --browser \"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\" --report standalone-thera401-402-a11y.report.json\n","      - name: Check both publisher401-402 sources in a fresh npm installation\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        run: |\n          mkdir -p \"$RUNNER_TEMP/pair401402-install\"\n          npm install --offline --ignore-scripts --no-audit --no-fund --prefix \"$RUNNER_TEMP/pair401402-install\" \"$RUNNER_TEMP/apadana-package/\"*.tgz\n          python scripts/web-reader-thera401-402-check.py --mode installed --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$RUNNER_TEMP/pair401402-install/node_modules/pali-canon-mcp/server\" --publisher-root .fixtures/apadana-pinned --browser \"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\" --report installed-thera401-402.report.json\n","            reviewed-publisher401-402-pair.tap\n            standalone-thera401-402.report.json\n            standalone-thera401-402-a11y.report.json\n            installed-thera401-402.report.json\n"]);
function beforeSourcePair401402Workflow(text){
 for(const part of SOURCE_PAIR401402_PARTS){assert.equal(text.split(part).length-1,1,'Every finite401402 source/browser/sparse/report addition is exact');text=text.replace(part,'');}
 return text;
}
// Four reviewed current-cohort additions; the normalized whole workflow seals their positions as well as bytes.
const CURRENT_FOUR394407_WORKFLOW_SHA='39c224a626a235d4bf5bfd0b37fbbd739bfb40ce5b07065e03e296743f1108eb';
const SOURCE_FOUR394407_PARTS=Object.freeze(["            src/_poems/chapter-3/poem-394.md\n            src/_poems/chapter-3/poem-397.md\n            src/_poems/chapter-3/poem-406.md\n            src/_poems/chapter-3/poem-407.md\n","      - name: Validate the current source-metadata adapter recipe\n        if: matrix.group == 'apadana'\n        shell: bash\n        run: |\n          set -euo pipefail\n          python3 -B scripts/check-current-source-adapters.py --source-root \"$GITHUB_WORKSPACE\"\n      - name: Require both publisher394-407 source API and widget cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          set -euo pipefail\n          node --test --test-reporter=tap tests/thera394-407-four.test.mjs | tee reviewed-publisher394-407-four.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher394-407-four.tap\",\"utf8\"); const names=[...tap.matchAll(/^ok \\d+ - (.+)$/gm)].map(row=>row[1]); assert.deepEqual(names,[\"publisher394/397/406/407 exact sources preserve382 objects,121 paragraphs,141 notes and both label domains\", \"publisher394/397/406/407 actual API and widget guards retain source rights, citations and6000+439 continuation\"]); for(const [key,value] of [[\"tests\",2],[\"pass\",2],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) { const rows=tap.split(/\\r?\\n/).filter(line=>line.startsWith(\"# \"+key+\" \")); assert.deepEqual(rows,[\"# \"+key+\" \"+value]); } assert.doesNotMatch(tap,/^\\s*not ok\\b/m);'\n","      - name: Check all four publisher394-407 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_four_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-four394407/normal\" --name four386-normal -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera394-407-four-check.py\" --mode normal --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$GITHUB_WORKSPACE/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_four_chromium\" --report \"$GITHUB_WORKSPACE/.ci-four394407/normal/REPORT.json\"\n      - name: Audit all four publisher394-407 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_four_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-four394407/a11y\" --name four386-a11y -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera394-407-four-check.py\" --mode a11y --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$GITHUB_WORKSPACE/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_four_chromium\" --report \"$GITHUB_WORKSPACE/.ci-four394407/a11y/REPORT.json\"\n      - name: Prepare a fresh offline npm installation for publisher394-407\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          set -euo pipefail\n          test ! -e \"$RUNNER_TEMP/four394407-install\"\n          pali_four_archives=(\"$RUNNER_TEMP/apadana-package/\"*.tgz)\n          test \"${#pali_four_archives[@]}\" -eq 1\n          test -f \"${pali_four_archives[0]}\"\n          mkdir -p \"$RUNNER_TEMP/four394407-install\"\n          npm install --offline --ignore-scripts --no-audit --no-fund --prefix \"$RUNNER_TEMP/four394407-install\" \"${pali_four_archives[0]}\"\n      - name: Check all four publisher394-407 sources in a fresh npm installation\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_four_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-four394407/installed\" --name four386-installed -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera394-407-four-check.py\" --mode installed --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$RUNNER_TEMP/four394407-install/node_modules/pali-canon-mcp/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_four_chromium\" --report \"$GITHUB_WORKSPACE/.ci-four394407/installed/REPORT.json\"\n","            reviewed-publisher394-407-four.tap\n            .ci-four394407/normal/\n            .ci-four394407/a11y/\n            .ci-four394407/installed/\n"]);
function beforeSourceFour394407Workflow(text){
 for(const part of SOURCE_FOUR394407_PARTS){assert.equal(text.split(part).length-1,1,'Every reviewed394407 sparse/source/mode/report addition is exact and unique');text=text.replace(part,'');}
 return text;
}
// Finite eight-source layer; deliberately invalid until exact parts/source contracts freeze.
const CURRENT_EIGHT411419_WORKFLOW_SHA='b8fa313ea29f77b064b5e80b823100f0589a1aafba0a384b14c789ec4800a3d3';
const CURRENT_EIGHT_BOOTSTRAP_CODE="import {createHash} from 'node:crypto';\nimport {lstatSync,readFileSync} from 'node:fs';\nimport {dirname,isAbsolute,join,resolve} from 'node:path';\nconst INDEX='docs/evidence/qa/english381-386/BASELINE_380_TEST_FILES.json';\nconst MAP='docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json';\nconst OWNER='tests/helpers/current-apadana.mjs';\nconst SUPPORTS=[\"docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json\",\"docs/evidence/apadana/english401-402-pair/CURRENT_SOURCE_INPUTS.json\",\"docs/evidence/apadana/thera389-390/CURRENT_SOURCE_INPUTS.json\",\"scripts/check-python-partitions.mjs\",\"scripts/ci-python-partition-driver.py\",\"tests/helpers/current-apadana.mjs\",\"tests/helpers/current389390-metadata.mjs\",\"tests/helpers/historical-h-inputs.mjs\",\"tests/helpers/intake375-metadata.mjs\",\"tests/helpers/intake380-metadata.mjs\",\"tests/helpers/intake382-metadata.mjs\",\"tests/helpers/partitioned-python.mjs\",\"tests/helpers/verse-scope-python.mjs\",\"tests/materialize_h_history.py\"];\nconst LEAVES=['scripts/check-current-source-adapters.py','scripts/web-reader-thera411-419-eight-check.py','scripts/apadana/thera411-419-eight/browser-inputs.py'];\nconst digest=raw=>createHash('sha256').update(raw).digest('hex');\nconst plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;\nfunction need(value,code){if(!value)throw new Error('PREFLIGHT_'+code);}\nfunction pin(value){need(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),'SHA_TYPE');}\nfunction relative(name){need(typeof name==='string'&&/^[a-zA-Z0-9_./-]+$/.test(name)&&!name.startsWith('/')&&name.split('/').every(x=>x&&x!=='.'&&x!=='..'),'RELATIVE_PATH');return name;}\nfunction rootPath(value){\n need(typeof value==='string'&&isAbsolute(value)&&!value.split(/[\\\\/]/).includes('..')&&resolve(value)===value,'ROOT');\n const parents=[];for(let p=value;;p=dirname(p)){parents.push(p);if(dirname(p)===p)break;}\n for(const p of parents.reverse()){const s=lstatSync(p);need(s.isDirectory()&&!s.isSymbolicLink(),'ROOT_COMPONENT');}\n return value;\n}\nfunction regular(root,name){\n let p=root;const parts=relative(name).split('/');\n for(const[i,part]of parts.entries()){p=join(p,part);const s=lstatSync(p);need(!s.isSymbolicLink()&&(i===parts.length-1?s.isFile():s.isDirectory()),'REGULAR_COMPONENT');if(i===parts.length-1)need(Number.isSafeInteger(s.size)&&s.size>=0&&s.size<=4*1024*1024,'SOURCE_BYTE_BOUND');}\n const raw=readFileSync(p);need(raw.length<=4*1024*1024,'SOURCE_BYTE_BOUND');return raw;\n}\nfunction main(){\n const root=rootPath(process.env.GITHUB_WORKSPACE),workflow=regular(root,'.github/workflows/check.yml').toString('utf8');\n const paths=[...workflow.matchAll(/^  CI_TEST_BASELINE_INDEX: (.+)$/gm)],pins=[...workflow.matchAll(/^  CI_TEST_BASELINE_SHA: (.+)$/gm)];\n need(paths.length===1&&paths[0][1]===INDEX&&pins.length===1,'WORKFLOW_INDEX');pin(pins[0][1]);\n need(process.env.CI_TEST_BASELINE_INDEX===INDEX&&process.env.CI_TEST_BASELINE_SHA===pins[0][1],'INDEX_ENV');\n const indexRaw=regular(root,INDEX);need(digest(indexRaw)===pins[0][1],'INDEX_RAW');\n const index=JSON.parse(indexRaw);need(plain(index)&&index.schema==='reviewed-ci-test-baseline-v5'&&plain(index.supporting_sources),'INDEX_SCHEMA');\n need(JSON.stringify(Object.keys(index.supporting_sources).sort())===JSON.stringify(SUPPORTS),'SUPPORT_MEMBERSHIP');\n const bytes=new Map();\n for(const name of SUPPORTS){const expected=index.supporting_sources[name];pin(expected);const raw=regular(root,name);need(digest(raw)===expected,'SUPPORT_RAW');bytes.set(name,raw);}\n const mapRaw=bytes.get(MAP),ownerRaw=bytes.get(OWNER);need(mapRaw&&ownerRaw,'OWNER_MAP_MEMBERSHIP');\n const ownerPins=[...ownerRaw.toString('utf8').matchAll(/^export const CURRENT_SOURCE_SHA='([a-f0-9]{64})';$/gm)];\n need(ownerPins.length===1&&ownerPins[0][1]===digest(mapRaw),'OWNER_MAP_BINDING');\n const map=JSON.parse(mapRaw);need(plain(map)&&map.schema==='reviewed-current-apadana-source-inputs-v1'&&map.status==='APPROVED_EXACT_CURRENT_APADANA_SOURCE_INPUTS_ONLY'&&plain(map.files),'MAP_SCHEMA');\n for(const name of LEAVES){\n  need(Object.hasOwn(map.files,name),'LEAF_MEMBERSHIP');const row=map.files[name];\n  need(plain(row)&&JSON.stringify(Object.keys(row).sort())===JSON.stringify(['bytes','sha256'])&&Number.isSafeInteger(row.bytes)&&row.bytes>=0,'LEAF_ROW');pin(row.sha256);\n  const raw=regular(root,name);need(raw.length===row.bytes,'LEAF_BYTES');need(digest(raw)===row.sha256,'LEAF_RAW');\n }\n process.stdout.write('CURRENT_SOURCE_PREFLIGHT:'+JSON.stringify({schema:'reviewed-current-source-preexecution-v1',status:'PASS',support_files:SUPPORTS.length,mandatory_leaf_files:LEAVES.length,index_sha256:digest(indexRaw),map_sha256:digest(mapRaw)})+'\\n');\n}\ntry{main();}catch(error){\n const code=typeof error?.message==='string'&&/^PREFLIGHT_[A-Z0-9_]+$/.test(error.message)?error.message:'PREFLIGHT_IO_OR_JSON_FAILURE';\n process.stderr.write('CURRENT_SOURCE_PREFLIGHT:'+JSON.stringify({schema:'reviewed-current-source-preexecution-v1',status:'FAIL',code})+'\\n');process.exitCode=1;\n}\n";
const EIGHT_BOOTSTRAP_SUPPORTS=Object.freeze(["docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json","docs/evidence/apadana/english401-402-pair/CURRENT_SOURCE_INPUTS.json","docs/evidence/apadana/thera389-390/CURRENT_SOURCE_INPUTS.json","scripts/check-python-partitions.mjs","scripts/ci-python-partition-driver.py","tests/helpers/current-apadana.mjs","tests/helpers/current389390-metadata.mjs","tests/helpers/historical-h-inputs.mjs","tests/helpers/intake375-metadata.mjs","tests/helpers/intake380-metadata.mjs","tests/helpers/intake382-metadata.mjs","tests/helpers/partitioned-python.mjs","tests/helpers/verse-scope-python.mjs","tests/materialize_h_history.py"]);
const CURRENT_EIGHT_BOOTSTRAP_PART="          node --input-type=module <<'CURRENT_SOURCE_PREFLIGHT'\n"+CURRENT_EIGHT_BOOTSTRAP_CODE.split('\n').filter((line,i,all)=>i<all.length-1||line).map(line=>'          '+line+'\n').join('')+'          CURRENT_SOURCE_PREFLIGHT\n';
const SOURCE_EIGHT411419_PARTS=Object.freeze([CURRENT_EIGHT_BOOTSTRAP_PART,"            src/_poems/chapter-3/poem-411.md\n            src/_poems/chapter-3/poem-412.md\n            src/_poems/chapter-3/poem-414.md\n            src/_poems/chapter-3/poem-415.md\n            src/_poems/chapter-3/poem-416.md\n            src/_poems/chapter-3/poem-417.md\n            src/_poems/chapter-3/poem-418.md\n            src/_poems/chapter-3/poem-419.md\n","      - name: Require both publisher411-419 source API and widget cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          set -euo pipefail\n          node --test --test-reporter=tap tests/thera411-419-eight.test.mjs | tee reviewed-publisher411-419-eight.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher411-419-eight.tap\",\"utf8\"); const names=[...tap.matchAll(/^ok \\d+ - (.+)$/gm)].map(row=>row[1]); assert.deepEqual(names,[\"publisher411/412/414-419 exact sources retain386 objects,179 paragraphs,183 notes and156 local labels\", \"publisher411/412/414-419 actual API and embedded guards preserve54 cursors,155 quotes and6000+1546 continuation\"]); for(const [key,value] of [[\"tests\",2],[\"pass\",2],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) { const rows=tap.split(/\\r?\\n/).filter(line=>line.startsWith(\"# \"+key+\" \")); assert.deepEqual(rows,[\"# \"+key+\" \"+value]); } assert.doesNotMatch(tap,/^\\s*not ok\\b/m);'\n","      - name: Check all eight publisher411-419 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_eight_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-eight411419/normal\" --name eight394-normal -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera411-419-eight-check.py\" --mode normal --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$GITHUB_WORKSPACE/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_eight_chromium\" --report \"$GITHUB_WORKSPACE/.ci-eight411419/normal/REPORT.json\"\n      - name: Audit all eight publisher411-419 reader sources\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_eight_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-eight411419/a11y\" --name eight394-a11y -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera411-419-eight-check.py\" --mode a11y --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$GITHUB_WORKSPACE/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_eight_chromium\" --report \"$GITHUB_WORKSPACE/.ci-eight411419/a11y/REPORT.json\"\n      - name: Prepare a fresh offline npm installation for publisher411-419\n        if: matrix.group == 'apadana'\n        timeout-minutes: 5\n        shell: bash\n        run: |\n          set -euo pipefail\n          test ! -e \"$RUNNER_TEMP/eight411419-install\"\n          pali_eight_archives=(\"$RUNNER_TEMP/apadana-package/\"*.tgz)\n          test \"${#pali_eight_archives[@]}\" -eq 1\n          test -f \"${pali_eight_archives[0]}\"\n          mkdir -p \"$RUNNER_TEMP/eight411419-install\"\n          npm install --offline --ignore-scripts --no-audit --no-fund --prefix \"$RUNNER_TEMP/eight411419-install\" \"${pali_eight_archives[0]}\"\n      - name: Check all eight publisher411-419 sources in a fresh npm installation\n        if: matrix.group == 'apadana'\n        timeout-minutes: 7\n        shell: bash\n        run: |\n          set -euo pipefail\n          pali_eight_chromium=\"$(python -c 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()')\"\n          python3 -B \"$GITHUB_WORKSPACE/scripts/apadana/thera351-360-nine/run-installed-bounded.py\" --output-dir \"$GITHUB_WORKSPACE/.ci-eight411419/installed\" --name eight394-installed -- python3 -B \"$GITHUB_WORKSPACE/scripts/web-reader-thera411-419-eight-check.py\" --mode installed --source-root \"$GITHUB_WORKSPACE\" --server-dir \"$RUNNER_TEMP/eight411419-install/node_modules/pali-canon-mcp/server\" --publisher-root \"$GITHUB_WORKSPACE/.fixtures/apadana-pinned\" --browser \"$pali_eight_chromium\" --report \"$GITHUB_WORKSPACE/.ci-eight411419/installed/REPORT.json\"\n","            reviewed-publisher411-419-eight.tap\n            .ci-eight411419/normal/\n            .ci-eight411419/a11y/\n            .ci-eight411419/installed/\n"]);
function beforeSourceEight411419Workflow(text){
 for(const part of SOURCE_EIGHT411419_PARTS){assert.equal(text.split(part).length-1,1,'Every eight-source bootstrap/sparse/gate/mode/report part is exact and unique');text=text.replace(part,'');}
 return text;
}
function assertCurrentEightSourceBootstrapFixtures(){
 const owner=realpathSync(mkdtempSync(join(tmpdir(),'ci-eight-source-preflight-'))),INDEX='docs/evidence/qa/english381-386/BASELINE_380_TEST_FILES.json',MAP='docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json',OWNER='tests/helpers/current-apadana.mjs';
 const supports=EIGHT_BOOTSTRAP_SUPPORTS,leaves=['scripts/check-current-source-adapters.py','scripts/web-reader-thera411-419-eight-check.py','scripts/apadana/thera411-419-eight/browser-inputs.py'];
 const imports=["import {createHash} from 'node:crypto';","import {lstatSync,readFileSync} from 'node:fs';","import {dirname,isAbsolute,join,resolve} from 'node:path';"];
 const lines=CURRENT_EIGHT_BOOTSTRAP_CODE.split('\n');assert.deepEqual(lines.slice(0,3),imports);const code=lines.slice(3).join('\n');
 const leafBytes=Object.fromEntries(leaves.map(name=>[name,Buffer.from('# public synthetic source-preflight fixture '+name+'\n')]));let environment,index,seeded=false;
 const write=(name,raw)=>{const p=join(owner,name);mkdirSync(dirname(p),{recursive:true});writeFileSync(p,raw);};
 const sealIndex=()=>{const raw=JSON.stringify(index),pin=digest(raw);write(INDEX,raw);write('.github/workflows/check.yml','env:\n  CI_TEST_BASELINE_INDEX: '+INDEX+'\n  CI_TEST_BASELINE_SHA: '+pin+'\n');environment={GITHUB_WORKSPACE:owner,CI_TEST_BASELINE_INDEX:INDEX,CI_TEST_BASELINE_SHA:pin};};
 const publish=manifest=>{write(MAP,JSON.stringify(manifest));write(OWNER,"export const CURRENT_SOURCE_SHA='"+digest(readFileSync(join(owner,MAP)))+"';\n");index={schema:'reviewed-ci-test-baseline-v5',supporting_sources:Object.fromEntries(supports.map(name=>[name,digest(readFileSync(join(owner,name)))]))};sealIndex();};
 const reset=()=>{
  if(!seeded){for(const name of supports)write(name,'// public synthetic support fixture '+name+'\n');seeded=true;}
  for(const name of leaves){rmSync(join(owner,name),{recursive:true,force:true});write(name,leafBytes[name]);}
  const manifest={schema:'reviewed-current-apadana-source-inputs-v1',status:'APPROVED_EXACT_CURRENT_APADANA_SOURCE_INPUTS_ONLY',baseline_commit:'0'.repeat(40),files:Object.fromEntries(leaves.map(name=>[name,{bytes:leafBytes[name].length,sha256:digest(leafBytes[name])}]))};publish(manifest);return manifest;
 };
 const run=expected=>{
  const output=[],errors=[],processSurface={env:{...environment},stdout:{write:value=>output.push(String(value))},stderr:{write:value=>errors.push(String(value))},exitCode:0};
  runInNewContext(code,{createHash,lstatSync,readFileSync,dirname,isAbsolute,join,resolve,process:processSurface},{timeout:1000});
  const text=[...output,...errors].join('');assert.ok(Buffer.byteLength(text,'utf8')<=2048);const records=text.trim().split('\n');assert.equal(records.length,1);assert.ok(records[0].startsWith('CURRENT_SOURCE_PREFLIGHT:'));const result=JSON.parse(records[0].slice('CURRENT_SOURCE_PREFLIGHT:'.length));
  assert.equal(result.status,expected?'PASS':'FAIL');assert.equal(processSurface.exitCode,expected?0:1);if(expected){assert.equal(result.support_files,14);assert.equal(result.mandatory_leaf_files,3);}
 };
 let completed=0,pristine;
 const refuse=change=>{run(true);change(clone(pristine));run(false);pristine=reset();run(true);completed++;};
 try{
  pristine=reset();run(true);
  refuse(()=>{delete environment.CI_TEST_BASELINE_SHA;});
  refuse(()=>{environment.CI_TEST_BASELINE_INDEX='docs/evidence/qa/foreign.json';});
  refuse(()=>write(INDEX,readFileSync(join(owner,INDEX),'utf8')+' '));
  refuse(()=>{index.supporting_sources['tests/helpers/unreviewed.mjs']='0'.repeat(64);sealIndex();});
  refuse(()=>write(OWNER,readFileSync(join(owner,OWNER),'utf8')+'// changed\n'));
  refuse(manifest=>{manifest.status='PENDING';publish(manifest);});
  refuse(()=>{write(OWNER,"export const CURRENT_SOURCE_SHA='"+'0'.repeat(64)+"';\n");index.supporting_sources[OWNER]=digest(readFileSync(join(owner,OWNER)));sealIndex();});
  refuse(()=>{delete index.supporting_sources[MAP];sealIndex();});
  for(const name of leaves){
   refuse(()=>rmSync(join(owner,name)));
   refuse(()=>{const raw=Buffer.from(leafBytes[name]);raw[0]^=1;write(name,raw);});
   refuse(()=>{rmSync(join(owner,name));mkdirSync(join(owner,name));});
   refuse(manifest=>{delete manifest.files[name];publish(manifest);});
   refuse(manifest=>{manifest.files[name].bytes=true;publish(manifest);});
   refuse(manifest=>{manifest.files[name].bytes++;publish(manifest);});
   refuse(manifest=>{manifest.files[name].sha256='0'.repeat(64);publish(manifest);});
  }
  assert.equal(completed,29);run(true);
 }finally{rmSync(owner,{recursive:true,force:true});}
}

function assertCurrentEightWorkflow(raw,pin){
 assert.equal(rawWorkflowContract(raw),true);assert.match(pin,/^[a-f0-9]{64}$/);
 const livePins=[...raw.matchAll(/^  CI_TEST_BASELINE_SHA: (.+)$/gm)];assert.equal(livePins.length,1);assert.equal(livePins[0][1],pin);
 const normalized=raw.replace(livePins[0][0],'  CI_TEST_BASELINE_SHA: PENDING_ROOT_REVIEWED_BASELINE_SHA');
 assert.equal(digest(normalized),CURRENT_EIGHT411419_WORKFLOW_SHA,'Exact eight-source placement, bootstrap, source gate, modes, sparse and report parts must remain');
 return assertCurrent375Workflow(beforeSourceEight411419Workflow(raw),pin);
}
function assertCurrentEightWorkflowRefusals(raw,pin){
 assert.equal(assertCurrentEightWorkflow(raw,pin),true);
 // Finite eight-source counterfactuals preserve all current-four and earlier refusals below.
 for(const part of SOURCE_EIGHT411419_PARTS){
  for(const replacement of ['',part+part,part+'-UNREVIEWED']){const changed=raw.replace(part,replacement);assert.notEqual(changed,raw);assert.throws(()=>assertCurrentEightWorkflow(changed,pin),'Eight-source parts must reject loss, duplication and edit');}
  const removed=raw.replace(part,''),other=current375JobBlock(removed,'hosted-memory'),steps='    steps:\n';assert.equal(other.raw.split(steps).length-1,1);const moved=removed.slice(0,other.start)+other.raw.replace(steps,steps+part)+removed.slice(other.end);assert.notEqual(moved,raw);assert.throws(()=>assertCurrentEightWorkflow(moved,pin),'Exact eight-source parts moved to another job must refuse');
 }
 for(const [part,before,after]of [
  [SOURCE_EIGHT411419_PARTS[0],'SUPPORT_MEMBERSHIP','REMOVED_SUPPORT_CHECK'],
  [SOURCE_EIGHT411419_PARTS[0],'scripts/check-current-source-adapters.py','scripts/unreviewed-recipe.py'],
  [SOURCE_EIGHT411419_PARTS[2],"if: matrix.group == 'apadana'","if: matrix.group == 'core'"],
  [SOURCE_EIGHT411419_PARTS[2],'timeout-minutes: 5','timeout-minutes: 6'],
  [SOURCE_EIGHT411419_PARTS[2],'["pass",2]','["pass",1]'],
  [SOURCE_EIGHT411419_PARTS[3],'timeout-minutes: 7','timeout-minutes: 8'],
  [SOURCE_EIGHT411419_PARTS[3],'--mode a11y','--mode normal'],
  [SOURCE_EIGHT411419_PARTS[3],'npm install --offline','npm install']
 ]){assert.ok(part.includes(before));const changed=raw.replace(part,part.replace(before,after));assert.notEqual(changed,raw);assert.throws(()=>assertCurrentEightWorkflow(changed,pin),'Eight-source bootstrap, group, cap, count, mode and offline drift must refuse');}
 // Keep the entire old-four positive and all48 refusals meaningful on their exact source layer.
 assertCurrent375WorkflowRefusals(beforeSourceEight411419Workflow(raw),pin);
}
function assertCurrent375Workflow(raw,pin){
 assert.equal(rawWorkflowContract(raw),true);assert.match(pin,/^[a-f0-9]{64}$/);
 const livePins=[...raw.matchAll(/^  CI_TEST_BASELINE_SHA: (.+)$/gm)];assert.equal(livePins.length,1);assert.equal(livePins[0][1],pin);
 const normalized=raw.replace(livePins[0][0],'  CI_TEST_BASELINE_SHA: PENDING_ROOT_REVIEWED_BASELINE_SHA');
 assert.equal(digest(normalized),CURRENT_FOUR394407_WORKFLOW_SHA,'Exact current job/step placement, source recipes, gates, modes, sparse paths and artifacts must remain');
 let text=beforeSourceFour394407Workflow(raw);
 text=beforeSourcePair401402Workflow(text);
 text=portableSourceWorkflowBefore389390(text);
 const fruit=current375JobBlock(text,'reader-browser-group');
 assert.equal(fruit.raw.split(CURRENT389390_INSTALLED_FRUIT_GATE).length-1,1);assert.ok(fruit.raw.includes(CURRENT389390_INSTALLED_FRUIT_GATE+'      - name: Check source-aware Pāli print and PDF privacy\n'));
 assert.equal(fruit.raw.split(CURRENT389390_FRUIT_REPORT).length-1,1);assert.ok(fruit.raw.includes('            standalone-bookmark-pin-a11y.report.json\n'+CURRENT389390_FRUIT_REPORT+'            standalone-a11y.report.json\n'));
 const fruitBefore=fruit.raw.replace(CURRENT389390_INSTALLED_FRUIT_GATE,'').replace(CURRENT389390_FRUIT_REPORT,'');text=text.slice(0,fruit.start)+fruitBefore+text.slice(fruit.end);
 assert.equal(text.split(CURRENT380_FIVE_GATE).length-1,1);assert.equal(text.split(CURRENT380_FIVE_SPARSE).length-1,1);text=text.replace(CURRENT380_FIVE_GATE,'').replace(CURRENT380_FIVE_SPARSE,'');
 const path='  CI_TEST_BASELINE_INDEX: '+CURRENT380_CI_INDEX,sha='  CI_TEST_BASELINE_SHA: '+pin;assert.equal(text.split(path).length-1,1);assert.equal(text.split(sha).length-1,1);
 text=text.replace(path,'  CI_TEST_BASELINE_INDEX: docs/evidence/qa/windows20-partitions/BASELINE_368_WINDOWS_PYTHON_PARTITIONS.json').replace(sha,'  CI_TEST_BASELINE_SHA: 87c19eaa93596af180e91e4b5d0ca310ba1e192a141485aecdefdb7a831d0976');
 const original104="          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'\n";
 for(const name of ['check','windows20-parts','windows20','windows22-parts','windows22']){const block=current375JobBlock(text,name);assert.equal(block.raw.split(CURRENT375_H_FETCH).length-1,1);assert.ok(block.raw.includes(original104+CURRENT375_H_FETCH));const replacement=block.raw.replace(original104+CURRENT375_H_FETCH,original104);text=text.slice(0,block.start)+replacement+text.slice(block.end);}
 const reader=current375JobBlock(text,'reader-browser-group');assert.equal(reader.raw.split(CURRENT375_READER_H_FETCH).length-1,1);assert.equal(reader.raw.split(CURRENT375_SEVEN_GATE).length-1,1);assert.ok(reader.raw.includes(CURRENT375_READER_H_FETCH+CURRENT375_READER_ANCHOR));assert.ok(reader.raw.includes(CURRENT375_SEVEN_GATE+CURRENT375_SOURCE_ANCHOR));assert.equal(reader.raw.split(CURRENT375_SPARSE_AFTER).length-1,1);
 const replacement=reader.raw.replace(CURRENT375_READER_H_FETCH+CURRENT375_READER_ANCHOR,CURRENT375_READER_ANCHOR).replace(CURRENT375_SPARSE_AFTER,CURRENT375_SPARSE_BEFORE).replace(CURRENT375_SEVEN_GATE+CURRENT375_SOURCE_ANCHOR,CURRENT375_SOURCE_ANCHOR);text=text.slice(0,reader.start)+replacement+text.slice(reader.end);
 assert.equal(digest(text),CURRENT375_H_WORKFLOW_SHA,'Every old actual job/group/step/command/cap and exact finite new375 source gate must remain');return true;
}
function assertCurrent375WorkflowRefusals(raw,pin){
 assert.equal(assertCurrent375Workflow(raw,pin),true);
 // Bounded metadata-only counterfactuals: each exact part must refuse missing, duplicate, edited and relocated forms.
 for(const part of SOURCE_FOUR394407_PARTS){
  for(const replacement of ['',part+part,part+'-UNREVIEWED']){const changed=raw.replace(part,replacement);assert.notEqual(changed,raw);assert.throws(()=>assertCurrent375Workflow(changed,pin),'New394407 workflow part must refuse omission, duplication and editing');}
  const removed=raw.replace(part,''),other=current375JobBlock(removed,'hosted-memory'),steps='    steps:\n';assert.equal(other.raw.split(steps).length-1,1);
  const moved=removed.slice(0,other.start)+other.raw.replace(steps,steps+part)+removed.slice(other.end);assert.notEqual(moved,raw);assert.throws(()=>assertCurrent375Workflow(moved,pin),'An exact new394407 part moved to another job must refuse');
 }
 const sourcePart=SOURCE_FOUR394407_PARTS[1],modesPart=SOURCE_FOUR394407_PARTS[2];
 for(const [part,before,after]of [
  [sourcePart,"if: matrix.group == 'apadana'","if: matrix.group == 'core'"],
  [sourcePart,'timeout-minutes: 5','timeout-minutes: 6'],
  [sourcePart,'scripts/check-current-source-adapters.py --source-root','scripts/check-current-source-adapters.py --reviewed-support-contract'],
  [sourcePart,'["pass",2]','["pass",1]'],
  [modesPart,'timeout-minutes: 7','timeout-minutes: 8'],
  [modesPart,'--mode a11y','--mode normal'],
  [modesPart,'npm install --offline','npm install']
 ]){assert.ok(part.includes(before));const changed=raw.replace(part,part.replace(before,after));assert.notEqual(changed,raw);assert.throws(()=>assertCurrent375Workflow(changed,pin),'New394407 group, cap, argv, exact2case, mode or offline requirement must refuse drift');}
 const pinLine='  CI_TEST_BASELINE_SHA: '+pin;assert.equal(raw.split(pinLine).length-1,1);assert.throws(()=>assertCurrent375Workflow(raw.replace(pinLine,pinLine+'\n'+pinLine),pin),'Exactly one actual baseline digest line is required');
 for(const part of SOURCE_PAIR401402_PARTS)for(const replacement of ['',part+'-UNREVIEWED']){const changed=raw.replace(part,replacement);assert.notEqual(changed,raw);assert.throws(()=>assertCurrent375Workflow(changed,pin),'Exact new401402 workflow source gate/browser/sparse/report must refuse drift');}
 for(const marker of ['node scripts/ci-check-contract.mjs','timeout-minutes: 30',CURRENT375_SEVEN_GATE,CURRENT380_FIVE_GATE,CURRENT389390_INSTALLED_FRUIT_GATE,CURRENT389390_FRUIT_REPORT]){assert.ok(raw.includes(marker));const changed=raw.replace(marker,(marker===CURRENT375_SEVEN_GATE||marker===CURRENT380_FIVE_GATE)?'':marker+'-MUTATED');assert.notEqual(changed,raw);assert.throws(()=>assertCurrent375Workflow(changed,pin));}
 for(const marker of ["          python3 scripts/canon/historical389390_source_fixture.py --canon .fixtures/english16-canon/canon.json.gz --out .fixtures/english16-historical-source\n", "python3 scripts/apadana/thera335-350/portable_source_replay.py --publisher-checkout .fixtures/apadana-pinned --canon .fixtures/english16-historical-source/canon.json.gz", "python3 -X utf8 scripts/apadana/thera351-360-nine/source-nine-replay.py --publisher-root .fixtures/apadana-pinned --canon .fixtures/english16-historical-source/canon.json.gz"]){assert.equal(raw.split(marker).length-1,1);for(const replacement of ['',marker+'-UNREVIEWED']){const changed=raw.replace(marker,replacement);assert.notEqual(changed,raw);assert.throws(()=>assertCurrent375Workflow(changed,pin));}}
}

// Actual live source/V5 validation occurs before any named historical-H materialization.
function assertCurrent380CIBaseline(){
  assertCurrentSourceClosure(ROOT);const currentSource=currentContext(ROOT);assert.equal(currentSource.canonical.new_canonical_logical_sha256,'883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a');assert.equal(HISTORICAL382_WIDGET_VERSION,'v50');assert.equal(currentSource.english.historical382.ids.length,382);assert.equal(currentSource.widget.version,CURRENT_WIDGET_VERSION);assert.equal(currentSource.widget.uri,CURRENT_WIDGET_URI);
  const raw=readFileSync(join(ROOT,'.github/workflows/check.yml'),'utf8');assert.equal(rawWorkflowContract(raw),true);
  const paths=[...raw.matchAll(/^  CI_TEST_BASELINE_INDEX: (.+)$/gm)],pins=[...raw.matchAll(/^  CI_TEST_BASELINE_SHA: ([a-f0-9]{64})$/gm)];
  assert.equal(paths.length,1);assert.equal(paths[0][1],CURRENT380_CI_INDEX);assert.equal(pins.length,1);
  const pin=pins[0][1];assertCurrentEightWorkflowRefusals(raw,pin);assertCurrentEightSourceBootstrapFixtures();if(process.env.CI_TEST_BASELINE_INDEX!==undefined)assert.equal(process.env.CI_TEST_BASELINE_INDEX,CURRENT380_CI_INDEX);if(process.env.CI_TEST_BASELINE_SHA!==undefined)assert.equal(process.env.CI_TEST_BASELINE_SHA,pin);
  const actual=loadBaseline(ROOT,join(ROOT,CURRENT380_CI_INDEX),pin);assert.equal(actual.baseline.schema,'reviewed-ci-test-baseline-v5');assert.equal(actual.baseline.legacy_test_count,2092);assert.ok(actual.baseline.added_test_count>0);assert.ok(actual.inventory.length>345);
  return actual;
}
// Additive current V5 refusals inside the existing complete-inventory scenario.
function assertCurrent380CIFixtureRefusals(actual){
  const f=fixture();
  try{
    const b=clone(actual.baseline),reviewPath=b.case_inventory.path,r=JSON.parse(readFileSync(join(ROOT,reviewPath)));
    const paths=new Set([...actual.inventory.map(x=>x.path),b.driver.path,...Object.keys(b.additions),...Object.keys(b.supporting_sources),...Object.keys(b.python_sources),b.predecessor.index.path,b.predecessor.review.path,reviewPath,CURRENT380_CI_INDEX,...r.evidence.map(x=>x.path)]);
    rmSync(join(f.root,'tests'),{recursive:true});mkdirSync(join(f.root,'tests'));
    for(const path of paths){mkdirSync(dirname(join(f.root,path)),{recursive:true});copyFileSync(join(ROOT,path),join(f.root,path));}
    const index=join(f.root,CURRENT380_CI_INDEX),write=(path,value)=>writeFileSync(join(f.root,path),JSON.stringify(value));
    const publish=(candidate=b,proof=r)=>{write(reviewPath,proof);candidate.case_inventory.sha256=digest(readFileSync(join(f.root,reviewPath)));writeFileSync(index,JSON.stringify(candidate));return digest(readFileSync(index));};
    const pin=publish();assert.deepEqual(loadBaseline(f.root,index,pin).inventory,actual.inventory);
    const refusal=change=>{const candidate=clone(b),proof=clone(r);change(candidate,proof);assert.throws(()=>loadBaseline(f.root,index,publish(candidate,proof)));publish();};
    for(const change of [b=>b.legacy_test_count--,b=>b.added_test_count++,b=>b.changed_files['tests/unreviewed.test.mjs']={before_sha256:'a'.repeat(64),after_sha256:'b'.repeat(64)},b=>b.changed_files['tests/ci-test-partitions.test.mjs'].before_sha256='0'.repeat(64),(_b,r)=>r.status='PENDING',(_b,r)=>r.behavioral_or_release_approval=true])refusal(change);
    const added=Object.keys(b.added_files)[0],historical382Manifest='docs/evidence/apadana/english401-402-pair/CURRENT_SOURCE_INPUTS.json',manifest=CURRENT_SOURCE_FILE,currentOwner='tests/helpers/current-apadana.mjs';
    for(const path of [added,historical382Manifest,manifest,currentOwner]){
      const file=join(f.root,path),saved=readFileSync(file);assert.deepEqual(loadBaseline(f.root,index,pin).inventory,actual.inventory);
      try{writeFileSync(file,Buffer.concat([saved,Buffer.from('\nSYNTHETIC_CURRENT375_SOURCE_DRIFT')]));assert.throws(()=>loadBaseline(f.root,index,pin),'V5 actual current source drift '+path);}
      finally{writeFileSync(file,saved);}
      assert.deepEqual(loadBaseline(f.root,index,pin).inventory,actual.inventory);
    }
  }finally{f.cleanup();}
}
// Named H V4 scenario: every original historical assertion and mutation remains.
function assertOwnedHWindowsPythonBaselineFixtures(historical){
  const indexPath=WINDOWS_PYTHON_PARTITION_INDEX;
  const row=historical.index;assert.equal(row.path,join(historical.root,indexPath));assert.ok(row&&Number.isSafeInteger(row.bytes)&&/^[a-f0-9]{64}$/.test(row.sha256),'Independent physical SOURCE binding for current V4 index');
  const indexBytes=readFileSync(join(historical.root,indexPath));assert.equal(indexBytes.length,row.bytes);assert.equal(digest(indexBytes),row.sha256);
  const actual=loadBaseline(historical.root,join(historical.root,indexPath),row.sha256);assert.equal(actual.baseline.schema,'reviewed-ci-test-baseline-v4');assert.equal(actual.inventory.length,345);assert.equal(actual.baseline.legacy_test_count+actual.baseline.added_test_count,2092);
  const history=historicalNativePythonPartitionFixture(historical.root,join(historical.root,indexPath),row.sha256);
  const workflow=readFileSync(join(historical.root,'.github/workflows/check.yml'),'utf8');assert.equal(workflow,historical.workflow.raw);assert.equal(historical.workflow.pin,row.sha256);assertCurrentPartitionWorkflow(workflow,row.sha256);
  const f=fixture();
  try{
    const b=clone(actual.baseline),reviewPath=b.case_inventory.path,r=JSON.parse(readFileSync(join(historical.root,reviewPath)));
    const old=JSON.parse(readFileSync(join(historical.root,b.predecessor.path))),prior=JSON.parse(readFileSync(join(historical.root,old.predecessor.path))),oldReview=JSON.parse(readFileSync(join(historical.root,old.case_inventory.path)));
    const paths=new Set([b.predecessor.path,old.predecessor.path,prior.legacy_v1.path,old.case_inventory.path,...oldReview.evidence.map(x=>x.path),...actual.inventory.map(x=>x.path),b.driver.path,...Object.keys(b.additions),...Object.keys(b.supporting_sources),...Object.keys(b.python_sources)]);
    rmSync(join(f.root,'tests'),{recursive:true});mkdirSync(join(f.root,'tests'));
    for(const path of paths){mkdirSync(dirname(join(f.root,path)),{recursive:true});copyFileSync(join(historical.root,path),join(f.root,path));}
    const index=join(f.root,indexPath);mkdirSync(dirname(index),{recursive:true});
    const write=(path,value)=>{mkdirSync(dirname(join(f.root,path)),{recursive:true});writeFileSync(join(f.root,path),value);};
    const publish=(candidate=b,proof=r)=>{const text=JSON.stringify(proof);write(reviewPath,text);candidate.case_inventory.sha256=digest(text);writeFileSync(index,JSON.stringify(candidate));return digest(readFileSync(index));};
    const pin=publish();assert.equal(loadBaseline(f.root,index,pin).inventory.length,345);
    const refusal=change=>{const candidate=clone(b),proof=clone(r);change(candidate,proof);const changedPin=publish(candidate,proof);assert.throws(()=>loadBaseline(f.root,index,changedPin));publish();};
    const wrapper='tests/six-boundary-history.test.mjs';
    for(const mutate of [
      b=>b.schema='unknown-v4',b=>b.commit='f'.repeat(40),b=>b.legacy_test_count=2075,b=>b.added_test_count=17,b=>b.predecessor.sha256='0'.repeat(64),
      b=>delete b.source_overrides[wrapper],b=>b.source_overrides[wrapper].after_sha256=b.source_overrides['tests/six-operation-scope.test.mjs'].after_sha256,
      b=>b.source_overrides['tests/unknown.test.mjs']={before_sha256:'a'.repeat(64),after_sha256:'b'.repeat(64)},
      b=>delete b.files[wrapper],b=>b.files[wrapper]='0'.repeat(64),b=>delete b.supporting_sources['tests/helpers/partitioned-python.mjs'],
      b=>b.supporting_sources['scripts/not-approved.mjs']='a'.repeat(64),b=>b.python_sources['tests/six_boundary_history_acceptance.py']='0'.repeat(64),
      (_b,r)=>r.status='PENDING',(_b,r)=>r.behavioral_or_release_approval=true,
      (_b,r)=>r.before_wrapper_sources[wrapper].utf8+='\n',(_b,r)=>r.registrations[wrapper].after[0].options_source='{timeout:65001}',
      (_b,r)=>r.registrations[wrapper].after=[],(_b,r)=>r.partition_suites[0].partitions[0].methods=[],(_b,r)=>r.partition_suites[1].child_timeout_ms=60001,
      (_b,r)=>delete r.partition_platforms,(_b,r)=>r.partition_platforms=[],(_b,r)=>r.partition_platforms=['win32'],(_b,r)=>r.partition_platforms=['darwin'],(_b,r)=>r.partition_platforms=['win32','darwin'],
      (_b,r)=>r.partition_platforms=['win32','darwin','linux','freebsd'],(_b,r)=>r.partition_platforms=['win32','darwin','linux','linux'],(_b,r)=>r.partition_platforms=['darwin','win32','linux'],(_b,r)=>r.partition_platforms=['win32','darwin','unknown'],
      (_b,r)=>r.windows_only=true,(_b,r)=>r.non_windows_original_branch_exact=true,(_b,r)=>r.other_platforms_original_branch_exact=false,
      (_b,r)=>delete r.historical_v3_fixture,(_b,r)=>r.historical_v3_fixture.commit='f'.repeat(40),(_b,r)=>r.historical_v3_fixture.index.sha256='0'.repeat(64),
      (_b,r)=>r.historical_v3_fixture.index.utf8+='\n',(_b,r)=>r.historical_v3_fixture.review.bytes++,(_b,r)=>r.historical_v3_fixture.review.extra=true,
      (_b,r)=>delete r.historical_v3_fixture.sources[wrapper],(_b,r)=>r.historical_v3_fixture.sources['scripts/unknown.mjs']=clone(r.historical_v3_fixture.sources[wrapper]),
      (_b,r)=>r.historical_v3_fixture.sources[wrapper]=clone(r.historical_v3_fixture.sources['tests/six-operation-scope.test.mjs']),
      (_b,r)=>r.historical_v3_fixture.sources[wrapper].utf8+='\n',(_b,r)=>r.historical_v3_fixture.sources[wrapper].bytes=-1
    ])refusal(mutate);
    const preserved=actual.inventory.find(x=>!Object.hasOwn(b.source_overrides,x.path)).path;
    const physical=[...new Set([...Object.keys(b.source_overrides),preserved,...Object.keys(b.supporting_sources),...Object.keys(b.python_sources),b.predecessor.path,reviewPath,indexPath])];
    for(const path of physical){
      const file=join(f.root,path),before=readFileSync(file);
      writeFileSync(file,Buffer.concat([before,Buffer.from('\nSYNTHETIC_SOURCE_DRIFT')]));assert.throws(()=>loadBaseline(f.root,index,pin),'V4 physical mutation '+path);writeFileSync(file,before);
      rmSync(file);assert.throws(()=>loadBaseline(f.root,index,pin),'V4 missing physical source '+path);writeFileSync(file,before);
      writeFileSync(file,readFileSync(join(f.root,b.driver.path)));assert.throws(()=>loadBaseline(f.root,index,pin),'V4 physical substitution '+path);writeFileSync(file,before);
    }
    const unknown=join(f.root,'tests','unknown-extra.test.mjs');writeFileSync(unknown,"import test from 'node:test';test('unreviewed',()=>{});\n");assert.throws(()=>loadBaseline(f.root,index,pin));rmSync(unknown);
    assert.equal(loadBaseline(f.root,index,pin).inventory.length,345);
    // Restore exactly the six immutable CoreB sources and old V3 authorities,
    // after actual V4 sources and every refusal have been checked unmodified.
    for(const [path,source]of Object.entries(history.historical_v3_fixture.sources))write(path,source.utf8);
    write(indexPath,history.historical_v3_fixture.index.utf8);write(reviewPath,history.historical_v3_fixture.review.utf8);
    assert.equal(loadBaseline(f.root,index,history.historical_v3_fixture.index.sha256).baseline.schema,'reviewed-ci-test-baseline-v3');
    return assertHistoricalWindowsPythonBaselineFixtures(f.root,history.historical_v3_fixture.index,{raw:workflow,pin:row.sha256});
  }finally{f.cleanup();}
}
