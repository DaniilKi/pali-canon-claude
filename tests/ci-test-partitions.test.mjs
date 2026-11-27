import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,copyFileSync,rmSync,existsSync,symlinkSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {digest,inventory,loadBaseline,makeContext,nodeArguments,eventCollector,aggregateReceipts,execute,MAX_CHILD_MS,ciIdentity} from '../scripts/ci-test-partitions.mjs';
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

test('the real CLI activates its reporter before unchanged complete-file argv',{timeout:15000},()=>{const f=fixture();try{const context=makeContext(f.root,f.checked,{commit:COMMIT,mode:'full'});const actual=nodeArguments(f.root,context);const reporterArgument=actual.find(a=>a.startsWith('--test-reporter='));const reporterURL=new URL(reporterArgument.slice('--test-reporter='.length));assert.equal(reporterURL.protocol,'file:');assert.equal(fileURLToPath(reporterURL),resolve(f.root,'scripts/ci-test-reporter.mjs'));const old=['--test',...(process.platform==='win32'?['--test-concurrency=1']:[]),...f.checked.inventory.map(r=>resolve(f.root,r.path))];assert.deepEqual(actual.filter(a=>!a.startsWith('--test-reporter=')),old);assert.ok(actual.indexOf(actual.find(a=>a.startsWith('--test-reporter=')))<actual.indexOf(resolve(f.root,context.selected_files[0])));const bootstrap=join(f.root,'invoke.mjs');writeFileSync(bootstrap,`import child from 'node:child_process';import{syncBuiltinESMExports}from'node:module';const original=child.execFileSync;child.execFileSync=(file,args,options)=>file==='git'&&JSON.stringify(args)===JSON.stringify(['rev-parse','HEAD'])?'${COMMIT}\\n':original(file,args,options);syncBuiltinESMExports();process.chdir(${JSON.stringify(f.root)});const{main}=await import(${JSON.stringify(pathToFileURL(join(f.root,'scripts','ci-test-partitions.mjs')).href)});await main(['run','--mode','full','--receipt',${JSON.stringify(join(f.root,'cli.json'))},'--baseline-index',${JSON.stringify(f.index)},'--baseline-sha','${f.pin}']);`);const r=spawnSync(process.execPath,[bootstrap],{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,env:{...process.env,GITHUB_ACTIONS:'false'}});assert.equal(r.error,undefined,r.stderr);assert.equal(r.status,0,r.stdout+'\n'+r.stderr);const receipt=JSON.parse(readFileSync(join(f.root,'cli.json')));assert.equal(receipt.events.summary.tests,8);assert.equal(receipt.events.complete,true);assert.equal(receipt.events.context.commit,COMMIT);assert.equal(receipt.events.context.node_major,Number(process.versions.node.split('.')[0]));assert.equal(digest(readFileSync(join(f.root,'scripts/test.mjs'))),f.checked.baseline.driver.sha256);}finally{f.cleanup();}});

// Read the real YAML bytes directly; none of the historical workflow inverses apply.
function rawWorkflowContract(raw) {
  const section = name => {
    const match = new RegExp('^  '+name+':\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:|$(?![\\s\\S]))','m').exec(raw);
    assert.ok(match, 'Missing actual CI job '+name);
    return match[1];
  };
  const check=section('check');
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
    const parts=section('windows'+version+'-parts'), gate=section('windows'+version);
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
// tiny source file and explicitly records only the eight known edited paths.
function assertSuccessorBaselineFixtures(){
  const f=fixture();
  try{
    const predecessorPath='docs/evidence/qa/windows20-partitions/BASELINE_3CED_TEST_FILES.json';
    const predecessor=readFileSync(join(ROOT,predecessorPath));
    assert.equal(digest(predecessor),'f5e3df6886ecbf01904b2ef657bf90944f118edb5b387ece1c4262c0cb25359d');
    const prior=JSON.parse(predecessor);
    rmSync(join(f.root,'tests'),{recursive:true});mkdirSync(join(f.root,'tests'));
    const allowedChanged=new Set(['tests/ci-test-partitions.test.mjs','tests/current343-bindings.test.mjs','tests/held234-current333-chain.test.mjs','tests/intake343-metadata.test.mjs','tests/intake359-metadata-history.test.mjs','tests/next-ten-history-data.test.mjs','tests/six-boundary-source-input.test.mjs','tests/thera335-350-source.test.mjs']);
    const changes={};
    for(const[path,before]of Object.entries(prior.files)){
      const bytes=readFileSync(join(ROOT,path));copyFileSync(join(ROOT,path),join(f.root,path));
      const after=digest(bytes);
      if(after!==before){assert.ok(allowedChanged.has(path),'Unexpected changed predecessor test in owned fixture');changes[path]={before_sha256:before,after_sha256:after};}
    }
    const added='tests/successor-fixture-added.test.mjs';
    const addedBody="import test from 'node:test';test('owned successor fixture case',()=>{});\n";
    writeFileSync(join(f.root,added),addedBody);
    const write=(path,value)=>{mkdirSync(dirname(join(f.root,path)),{recursive:true});writeFileSync(join(f.root,path),value);};
    write(predecessorPath,predecessor);
    write(prior.legacy_v1.path,readFileSync(join(ROOT,prior.legacy_v1.path)));
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
