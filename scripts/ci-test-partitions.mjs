// CI-only complete-inventory execution and receipt reconciliation. Public npm test is unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync,renameSync,lstatSync,existsSync,mkdirSync,realpathSync} from 'node:fs';
import {resolve,relative,dirname,sep,isAbsolute} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn,execFileSync} from 'node:child_process';

export const PARTITIONS=4, MAX_CHILD_MS=20*60*1000, MAX_FULL_MS=30*60*1000;
const BASE='c7e5939c3c479a78d3537e17deac6318162f3896';
const NEW_FILES=['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs','tests/ci-test-partitions.test.mjs'];
const hex=(s,n)=>typeof s==='string'&&new RegExp(`^[a-f0-9]{${n}}$`).test(s);
export const digest=b=>createHash('sha256').update(b).digest('hex');
const objectSha=x=>digest(JSON.stringify(x));
const posix=p=>p.split(sep).join('/');
function regular(root,path){assert.equal(typeof path,'string');assert.ok(!isAbsolute(path)&&!path.includes('\\')&&path.split('/').every(p=>p&&p!=='.'&&p!=='..'));let file=resolve(root);assert.ok(lstatSync(file).isDirectory()&&!lstatSync(file).isSymbolicLink());for(const part of path.split('/')){file=resolve(file,part);const stat=lstatSync(file);assert.ok(!stat.isSymbolicLink());}assert.ok(lstatSync(file).isFile());return readFileSync(file);}
export function inventory(root){return readdirSync(resolve(root,'tests')).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>({path:'tests/'+n,sha256:digest(regular(root,'tests/'+n))}));}
function loadBaselineV1(root,path,pin){assert.ok(hex(pin,64),'Explicit independent baseline hash required');const raw=readFileSync(path);assert.equal(digest(raw),pin);const b=JSON.parse(raw);assert.equal(b.schema,'reviewed-ci-test-baseline-v1');assert.equal(b.commit,BASE);assert.ok(Number.isSafeInteger(b.legacy_test_count)&&b.legacy_test_count>0);assert.ok(Number.isSafeInteger(b.added_test_count)&&b.added_test_count>0);assert.deepEqual(Object.keys(b.driver),['path','sha256']);assert.equal(b.driver.path,'scripts/test.mjs');assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256);assert.deepEqual(Object.keys(b.additions).sort(),NEW_FILES);for(const[name,sha]of Object.entries(b.additions)){assert.ok(hex(sha,64));assert.equal(digest(regular(root,name)),sha);}const current=inventory(root);assert.deepEqual(current.map(x=>x.path),[...Object.keys(b.files),'tests/ci-test-partitions.test.mjs'].sort());for(const row of current)assert.equal(row.sha256,b.files[row.path]??b.additions[row.path]);assert.ok(Object.keys(b.files).every(name=>/^tests\/[a-zA-Z0-9_.-]+\.test\.mjs$/.test(name)&&hex(b.files[name],64)));return {baseline:b,baseline_sha256:pin,inventory:current};}
// V2 is a finite reviewed successor; V1's fixture/legacy path stays unchanged.
const V2_BASE='3cedb7b7a71a42db1601026cb6d995dafe43c9ce';
const V2_PREDECESSOR='docs/evidence/qa/windows20-partitions/BASELINE_3CED_TEST_FILES.json';
const V2_PREDECESSOR_SHA='f5e3df6886ecbf01904b2ef657bf90944f118edb5b387ece1c4262c0cb25359d';
const V2_CASE_REVIEW='docs/evidence/qa/windows20-partitions/INTAKE368_CASE_INVENTORY_REVIEW.json';
const V2_TOOLS=['scripts/ci-test-partitions.mjs','scripts/ci-test-reporter.mjs'];
const V2_QA='tests/ci-test-partitions.test.mjs';
function exactKeys(value,keys){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));assert.deepEqual(Object.keys(value).sort(),[...keys].sort());}
function literalTestMap(value){assert.ok(value&&typeof value==='object'&&!Array.isArray(value));const keys=Object.keys(value);assert.deepEqual(keys,[...keys].sort(),'File maps must be sorted literal paths');for(const path of keys){assert.match(path,/^tests\/[a-zA-Z0-9_.-]+\.test\.mjs$/);assert.ok(hex(value[path],64));}return keys;}
function loadBaselineV2(root,b,pin){
  exactKeys(b,['schema','commit','legacy_test_count','added_test_count','driver','predecessor','changed_files','added_files','additions','case_inventory']);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v2');assert.equal(b.commit,V2_BASE);
  exactKeys(b.predecessor,['path','sha256']);assert.equal(b.predecessor.path,V2_PREDECESSOR);assert.equal(b.predecessor.sha256,V2_PREDECESSOR_SHA);
  const predecessorBytes=regular(root,V2_PREDECESSOR);assert.equal(digest(predecessorBytes),V2_PREDECESSOR_SHA);
  const prior=JSON.parse(predecessorBytes);
  exactKeys(prior,['schema','commit','legacy_v1','driver','tooling','files','counts','source_inventory_sha256']);
  assert.equal(prior.schema,'reviewed-ci-predecessor-inventory-v1');assert.equal(prior.commit,V2_BASE);
  assert.deepEqual(prior.counts,{original_test_files:339,original_terminal_tests:2068,preserved_QA_tests:8,total_terminal_tests:2076,existing_optional_source_skips:267});
  const priorPaths=literalTestMap(prior.files);assert.equal(priorPaths.length,340);
  assert.equal(prior.source_inventory_sha256,objectSha(priorPaths.map(path=>({path,sha256:prior.files[path]}))));
  exactKeys(prior.legacy_v1,['path','sha256']);
  assert.equal(prior.legacy_v1.path,'docs/evidence/qa/windows20-partitions/BASELINE_C7E_TEST_FILES.json');
  assert.equal(prior.legacy_v1.sha256,'7916fa2261424f745c146104ee5d6aabf1a9d78132b2d834f5ad38c1f3827aad');
  const legacyBytes=regular(root,prior.legacy_v1.path);assert.equal(digest(legacyBytes),prior.legacy_v1.sha256);
  const legacy=JSON.parse(legacyBytes);assert.equal(legacy.schema,'reviewed-ci-test-baseline-v1');assert.equal(legacy.commit,BASE);
  assert.equal(legacy.legacy_test_count,2068);assert.equal(legacy.added_test_count,8);
  assert.deepEqual(prior.driver,legacy.driver);assert.deepEqual(prior.tooling,legacy.additions);
  assert.deepEqual(priorPaths,[...Object.keys(legacy.files),V2_QA].sort());
  for(const[path,sha]of Object.entries(legacy.files))assert.equal(prior.files[path],sha);
  assert.equal(prior.files[V2_QA],prior.tooling[V2_QA]);
  exactKeys(b.driver,['path','sha256']);assert.deepEqual(b.driver,prior.driver,'Public test driver stays exact');
  assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256);
  assert.equal(b.legacy_test_count,2076,'The baseline already includes all eight QA tests');
  assert.ok(Number.isSafeInteger(b.added_test_count)&&b.added_test_count>0,'Independent added terminal-case count required');
  assert.ok(b.changed_files&&typeof b.changed_files==='object'&&!Array.isArray(b.changed_files));
  assert.deepEqual(Object.keys(b.changed_files),Object.keys(b.changed_files).sort());
  const expected={...prior.files};
  for(const[path,change]of Object.entries(b.changed_files)){
    assert.ok(Object.hasOwn(prior.files,path),'Changed file must be an exact predecessor test path');
    exactKeys(change,['before_sha256','after_sha256']);assert.equal(change.before_sha256,prior.files[path]);
    assert.ok(hex(change.after_sha256,64));assert.notEqual(change.after_sha256,change.before_sha256);
    expected[path]=change.after_sha256;
  }
  const addedPaths=literalTestMap(b.added_files);assert.ok(addedPaths.length>0,'Literal new test paths required');
  for(const path of addedPaths){assert.ok(!Object.hasOwn(prior.files,path),'Added file cannot replace a predecessor file');expected[path]=b.added_files[path];}
  exactKeys(b.additions,V2_TOOLS);
  for(const[path,sha]of Object.entries(b.additions)){assert.ok(hex(sha,64));assert.equal(digest(regular(root,path)),sha);}
  assert.equal(b.additions['scripts/ci-test-reporter.mjs'],prior.tooling['scripts/ci-test-reporter.mjs'],'Reporter remains unchanged');
  const expectedRows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));
  const current=inventory(root);assert.deepEqual(current,expectedRows,'Exact finite old/new test file inventory required');
  exactKeys(b.case_inventory,['path','sha256']);assert.equal(b.case_inventory.path,V2_CASE_REVIEW);assert.ok(hex(b.case_inventory.sha256,64));
  const reviewBytes=regular(root,V2_CASE_REVIEW);assert.equal(digest(reviewBytes),b.case_inventory.sha256);
  const review=JSON.parse(reviewBytes);
  exactKeys(review,['schema','status','baseline_commit','predecessor_sha256','inventory_sha256','driver','additions','changed_files','added_files','preserved_original_test_count','preserved_QA_test_count','preserved_original_skipped_count','added_case_count','added_cases_by_file','evidence']);
  assert.equal(review.schema,'reviewed-ci-successor-source-case-inventory-v1');
  assert.equal(review.status,'GO_EXACT_SOURCE_DELTA_AND_TERMINAL_CASE_INVENTORY_ONLY');
  assert.equal(review.baseline_commit,V2_BASE);assert.equal(review.predecessor_sha256,V2_PREDECESSOR_SHA);
  assert.equal(review.inventory_sha256,objectSha(expectedRows));
  assert.deepEqual(review.driver,b.driver);assert.deepEqual(review.additions,b.additions);
  assert.deepEqual(review.changed_files,b.changed_files);assert.deepEqual(review.added_files,b.added_files);
  assert.equal(review.preserved_original_test_count,2068);assert.equal(review.preserved_QA_test_count,8);
  assert.equal(review.preserved_original_skipped_count,267);
  assert.equal(review.added_case_count,b.added_test_count);
  assert.ok(review.added_cases_by_file&&typeof review.added_cases_by_file==='object'&&!Array.isArray(review.added_cases_by_file));
  assert.deepEqual(Object.keys(review.added_cases_by_file),Object.keys(review.added_cases_by_file).sort());
  let addedCount=0;
  for(const[path,count]of Object.entries(review.added_cases_by_file)){
    assert.ok(Object.hasOwn(b.added_files,path)||Object.hasOwn(b.changed_files,path));
    assert.ok(Number.isSafeInteger(count)&&count>0);addedCount+=count;
  }
  assert.equal(addedCount,b.added_test_count);
  assert.ok(addedPaths.every(path=>Object.hasOwn(review.added_cases_by_file,path)),'Every added test file has reviewed terminal cases');
  assert.ok(Array.isArray(review.evidence)&&review.evidence.length>0);
  for(const row of review.evidence){exactKeys(row,['path','sha256']);assert.ok(hex(row.sha256,64));assert.equal(digest(regular(root,row.path)),row.sha256);}
  return {baseline:b,baseline_sha256:pin,inventory:current};
}
const V3_PYTHON={"tests/six_boundary_history_acceptance.py":"1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55","tests/six_operation_scope_controls.py":"e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570"};
const V3_SUITES=[
  {
    "key": "six-history",
    "script": "tests/six_boundary_history_acceptance.py",
    "class_name": "SixHistoryControls",
    "source_sha256": "1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55",
    "full_inventory": [
      "test_01_exact_positive_and_explicit_historical_logical_frame",
      "test_02_cached_positive_does_not_hide_any_current_data_mutation",
      "test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering",
      "test_04_original_C1_bytes_cannot_replace_actual_future_data",
      "test_05_C1_fixture_tampering_and_symlink_refuse_after_positive",
      "test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them",
      "test_07_runtime_parent_and_full343_objects_are_mandatory"
    ],
    "partitions": [
      {
        "id": "heavy",
        "methods": [
          "test_02_cached_positive_does_not_hide_any_current_data_mutation"
        ]
      },
      {
        "id": "remaining",
        "methods": [
          "test_01_exact_positive_and_explicit_historical_logical_frame",
          "test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering",
          "test_04_original_C1_bytes_cannot_replace_actual_future_data",
          "test_05_C1_fixture_tampering_and_symlink_refuse_after_positive",
          "test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them",
          "test_07_runtime_parent_and_full343_objects_are_mandatory"
        ]
      }
    ],
    "old_per_stream_output_cap_bytes": 1048576,
    "child_timeout_ms": 60000,
    "node_timeout_ms": 65000
  },
  {
    "key": "six-operation-scope",
    "script": "tests/six_operation_scope_controls.py",
    "class_name": "SixOperationScopeControls",
    "source_sha256": "e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570",
    "full_inventory": [
      "test_01_verified_immutable_original_bytes_within_one_operation",
      "test_02_public_gates_reject_active_and_closed_internal_scopes",
      "test_03_exception_closes_and_prevents_escaped_reuse",
      "test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime",
      "test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation",
      "test_06_every_original_fixture_is_verified_before_operation_use",
      "test_07_mutation_after_capture_never_survives_the_next_operation"
    ],
    "partitions": [
      {
        "id": "heavy",
        "methods": [
          "test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime"
        ]
      },
      {
        "id": "remaining",
        "methods": [
          "test_01_verified_immutable_original_bytes_within_one_operation",
          "test_02_public_gates_reject_active_and_closed_internal_scopes",
          "test_03_exception_closes_and_prevents_escaped_reuse",
          "test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation",
          "test_06_every_original_fixture_is_verified_before_operation_use",
          "test_07_mutation_after_capture_never_survives_the_next_operation"
        ]
      }
    ],
    "old_per_stream_output_cap_bytes": 262144,
    "child_timeout_ms": 60000,
    "node_timeout_ms": 65000
  }
];
const V3_REGISTRATIONS={
  "tests/ci-test-partitions.test.mjs": [
    {
      "name": "complete sorted discovery and finite additions reject omissions substitution and nonregular files",
      "name_expression": "'complete sorted discovery and finite additions reject omissions substitution and nonregular files'",
      "line": 21,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 2,
      "options_source": null
    },
    {
      "name": "real full and four partition children preserve the same nested Unicode duplicate skip and TODO cases",
      "name_expression": "'real full and four partition children preserve the same nested Unicode duplicate skip and TODO cases'",
      "line": 23,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:30000}"
    },
    {
      "name": "terminal event accounting rejects missing summaries cancellations failures and duplicate summary events",
      "name_expression": "'terminal event accounting rejects missing summaries cancellations failures and duplicate summary events'",
      "line": 25,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 2,
      "options_source": null
    },
    {
      "name": "aggregate refuses corrupt identity cover source hashes statuses counts and duplicated terminal cases",
      "name_expression": "'aggregate refuses corrupt identity cover source hashes statuses counts and duplicated terminal cases'",
      "line": 27,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 2,
      "options_source": null
    },
    {
      "name": "a real failing child cannot seal an approving execution receipt",
      "name_expression": "'a real failing child cannot seal an approving execution receipt'",
      "line": 29,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:15000}"
    },
    {
      "name": "a bounded hung child fails closed without an approving complete receipt",
      "name_expression": "'a bounded hung child fails closed without an approving complete receipt'",
      "line": 31,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:15000}"
    },
    {
      "name": "the real CLI activates its reporter before unchanged complete-file argv",
      "name_expression": "'the real CLI activates its reporter before unchanged complete-file argv'",
      "line": 33,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:15000}"
    },
    {
      "name": "raw CI workflow keeps the full reference and four bounded Windows partitions",
      "name_expression": "'raw CI workflow keeps the full reference and four bounded Windows partitions'",
      "line": 109,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 2,
      "options_source": null
    }
  ],
  "tests/six-boundary-history.test.mjs": [
    {
      "name": "six-boundary actual data and immutable C1 inputs refuse proof loss drift and historical fallback",
      "name_expression": "'six-boundary actual data and immutable C1 inputs refuse proof loss drift and historical fallback'",
      "line": 2,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:65000}"
    }
  ],
  "tests/six-operation-scope.test.mjs": [
    {
      "name": "private per-operation history reuse preserves fresh public data/proof checks and refuses escaped scopes",
      "name_expression": "'private per-operation history reuse preserves fresh public data/proof checks and refuses escaped scopes'",
      "line": 6,
      "column": 1,
      "registration_ancestors": [],
      "argument_count": 3,
      "options_source": "{timeout:65000}"
    }
  ]
};

// Fixed Windows-Python scheduling successor. Immutable V1/V2 remain separate.
const V3_BASE='fb15396db578c78f838829668e36f32b65376806';
const V3_INDEX='docs/evidence/qa/windows20-partitions/BASELINE_368_WINDOWS_PYTHON_PARTITIONS.json';
const V3_PREDECESSOR='docs/evidence/qa/windows20-partitions/BASELINE_368_TEST_FILES.json';
const V3_PREDECESSOR_SHA='4b715398e0503381dc990a1eb2a60a7c8d777f1923372fa8101fc64403d69832';
const V3_REVIEW='docs/evidence/qa/windows20-partitions/WINDOWS_PYTHON_PARTITION_CASE_SOURCE_REVIEW.json';
const V3_QA='tests/ci-test-partitions.test.mjs';
const V3_WRAPPERS=['tests/six-boundary-history.test.mjs','tests/six-operation-scope.test.mjs'];
const V3_OVERRIDES=[V3_QA,...V3_WRAPPERS];
const V3_SUPPORT=['scripts/check-python-partitions.mjs','scripts/ci-python-partition-driver.py','tests/helpers/partitioned-python.mjs'];
export const WINDOWS_PYTHON_PARTITION_INDEX=V3_INDEX;
function sourcePins(root,pins,names){exactKeys(pins,names);assert.deepEqual(Object.keys(pins),[...names].sort());for(const name of names){assert.ok(hex(pins[name],64));assert.equal(digest(regular(root,name)),pins[name],'Exact current executable source '+name);}}
function predecessor368Metadata(root){
  const raw=regular(root,V3_PREDECESSOR);assert.equal(digest(raw),V3_PREDECESSOR_SHA);const b=JSON.parse(raw);
  exactKeys(b,['schema','commit','legacy_test_count','added_test_count','driver','predecessor','changed_files','added_files','additions','case_inventory']);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v2');assert.equal(b.commit,V2_BASE);assert.equal(b.legacy_test_count,2076);assert.equal(b.added_test_count,16);
  assert.deepEqual(b.predecessor,{path:V2_PREDECESSOR,sha256:V2_PREDECESSOR_SHA});
  const priorRaw=regular(root,V2_PREDECESSOR);assert.equal(digest(priorRaw),V2_PREDECESSOR_SHA);const prior=JSON.parse(priorRaw);assert.equal(prior.commit,V2_BASE);assert.equal(literalTestMap(prior.files).length,340);
  const legacyRaw=regular(root,prior.legacy_v1.path);assert.equal(digest(legacyRaw),prior.legacy_v1.sha256);assert.equal(prior.legacy_v1.sha256,'7916fa2261424f745c146104ee5d6aabf1a9d78132b2d834f5ad38c1f3827aad');
  const expected={...prior.files};assert.equal(Object.keys(b.changed_files).length,39);assert.equal(Object.keys(b.added_files).length,5);
  for(const[name,row]of Object.entries(b.changed_files)){exactKeys(row,['before_sha256','after_sha256']);assert.equal(row.before_sha256,prior.files[name]);assert.ok(hex(row.after_sha256,64));expected[name]=row.after_sha256;}
  for(const name of literalTestMap(b.added_files)){assert.ok(!Object.hasOwn(prior.files,name));expected[name]=b.added_files[name];}
  const rows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));assert.equal(rows.length,345);
  assert.equal(b.case_inventory.path,V2_CASE_REVIEW);const reviewRaw=regular(root,V2_CASE_REVIEW);assert.equal(digest(reviewRaw),b.case_inventory.sha256);const review=JSON.parse(reviewRaw);
  assert.equal(review.schema,'reviewed-ci-successor-source-case-inventory-v1');assert.equal(review.status,'GO_EXACT_SOURCE_DELTA_AND_TERMINAL_CASE_INVENTORY_ONLY');assert.equal(review.inventory_sha256,objectSha(rows));
  assert.deepEqual(review.changed_files,b.changed_files);assert.deepEqual(review.added_files,b.added_files);assert.deepEqual(review.driver,b.driver);assert.deepEqual(review.additions,b.additions);
  for(const row of review.evidence){exactKeys(row,['path','sha256']);assert.ok(hex(row.sha256,64));assert.equal(digest(regular(root,row.path)),row.sha256,'Preserved V2 source-case evidence');}
  return {baseline:b,expected};
}
function validateRegistrationReview(review,overrides){
  exactKeys(review,V3_OVERRIDES);
  for(const path of V3_OVERRIDES){
    const item=review[path];exactKeys(item,['before_sha256','after_sha256','before','after']);assert.equal(item.before_sha256,overrides[path].before_sha256);assert.equal(item.after_sha256,overrides[path].after_sha256);
    const required=V3_REGISTRATIONS[path];assert.deepEqual(item.before,required);assert.ok(Array.isArray(item.after));assert.equal(item.after.length,required.length);
    for(let i=0;i<required.length;i++){
      const actual=item.after[i],prior=required[i];exactKeys(actual,['name','name_expression','line','column','registration_ancestors','argument_count','options_source']);
      for(const key of ['name','name_expression','registration_ancestors','argument_count','options_source'])assert.deepEqual(actual[key],prior[key],'Unchanged literal registration '+path+' '+key);
      assert.ok(Number.isSafeInteger(actual.line)&&actual.line>0&&Number.isSafeInteger(actual.column)&&actual.column>0);
    }
  }
}
function loadBaselineV3(root,b,pin){
  exactKeys(b,['schema','commit','legacy_test_count','added_test_count','predecessor','driver','source_overrides','additions','supporting_sources','python_sources','files','case_inventory']);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v3');assert.equal(b.commit,V3_BASE);assert.equal(b.legacy_test_count,2076);assert.equal(b.added_test_count,16);
  assert.deepEqual(b.predecessor,{path:V3_PREDECESSOR,sha256:V3_PREDECESSOR_SHA});const prior=predecessor368Metadata(root);
  assert.deepEqual(b.driver,prior.baseline.driver);assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256,'Unchanged public test driver');
  exactKeys(b.source_overrides,V3_OVERRIDES);assert.deepEqual(Object.keys(b.source_overrides),V3_OVERRIDES);const expected={...prior.expected};
  for(const path of V3_OVERRIDES){const row=b.source_overrides[path];exactKeys(row,['before_sha256','after_sha256']);assert.equal(row.before_sha256,prior.expected[path]);assert.ok(hex(row.after_sha256,64));assert.notEqual(row.after_sha256,row.before_sha256);expected[path]=row.after_sha256;}
  const expectedRows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));assert.equal(literalTestMap(b.files).length,345);assert.deepEqual(b.files,Object.fromEntries(expectedRows.map(row=>[row.path,row.sha256])),'Exact finite predecessor plus three current overrides');
  sourcePins(root,b.additions,V2_TOOLS);assert.equal(b.additions['scripts/ci-test-reporter.mjs'],prior.baseline.additions['scripts/ci-test-reporter.mjs'],'Reporter unchanged');
  sourcePins(root,b.supporting_sources,V3_SUPPORT);sourcePins(root,b.python_sources,Object.keys(V3_PYTHON));assert.deepEqual(b.python_sources,V3_PYTHON,'Unchanged complete seven-method Python sources');
  const current=inventory(root);assert.deepEqual(current,expectedRows,'All actual current345 sources, no observed-source projection');
  exactKeys(b.case_inventory,['path','sha256']);assert.equal(b.case_inventory.path,V3_REVIEW);assert.ok(hex(b.case_inventory.sha256,64));const raw=regular(root,V3_REVIEW);assert.equal(digest(raw),b.case_inventory.sha256);const review=JSON.parse(raw);
  exactKeys(review,['schema','status','baseline_commit','predecessor','driver','source_overrides','additions','supporting_sources','python_sources','inventory_sha256','counts','registrations','before_wrapper_sources','partition_suites','windows_only','non_windows_original_branch_exact','conformance_is_separate_gate','behavioral_or_release_approval']);
  assert.equal(review.schema,'reviewed-windows-python-partition-case-source-v1');assert.equal(review.status,'GO_EXACT_SOURCE_DELTA_AND_UNCHANGED_NODE_REGISTRATIONS_ONLY');assert.equal(review.baseline_commit,V3_BASE);
  for(const key of ['predecessor','driver','source_overrides','additions','supporting_sources','python_sources'])assert.deepEqual(review[key],b[key]);
  assert.equal(review.inventory_sha256,objectSha(expectedRows));assert.deepEqual(review.counts,{files:345,preserved_cases:2076,added_cases:16,total_cases:2092});
  validateRegistrationReview(review.registrations,b.source_overrides);exactKeys(review.before_wrapper_sources,V3_WRAPPERS);
  for(const path of V3_WRAPPERS){const row=review.before_wrapper_sources[path];exactKeys(row,['sha256','utf8']);assert.equal(typeof row.utf8,'string');assert.equal(row.sha256,prior.expected[path]);assert.equal(digest(row.utf8),row.sha256,'Authentic complete historical wrapper source');}
  assert.deepEqual(review.partition_suites,V3_SUITES);assert.equal(review.windows_only,true);assert.equal(review.non_windows_original_branch_exact,true);assert.equal(review.conformance_is_separate_gate,true);assert.equal(review.behavioral_or_release_approval,false);
  return {baseline:b,baseline_sha256:pin,inventory:current};
}
export function historicalWindowsPythonWrappers(root,index,pin){
  const checked=loadBaseline(root,index,pin);assert.equal(checked.baseline.schema,'reviewed-ci-test-baseline-v3');const raw=regular(root,V3_REVIEW);assert.equal(digest(raw),checked.baseline.case_inventory.sha256);const review=JSON.parse(raw);
  return Object.freeze(Object.fromEntries(V3_WRAPPERS.map(path=>[path,review.before_wrapper_sources[path].utf8])));
}

const V4_COREB='2bbd93a95663126be56c7c64940d0166f3947614';
const V4_HISTORY_PINS={
  index:{bytes:40286,sha256:'6e270a07dd0850cf9e649d60b16a8c1a120b9a62e7535a6b596187792ef39f14'},
  review:{bytes:16778,sha256:'12f25d5f641901a77bfccbdacc5cba8a0ef96e9f8fcfaaaf9671c4722b2b1984'},
  sources:{
    'scripts/check-python-partitions.mjs':{bytes:42389,sha256:'47821bb1967ee8aa91d249632c8a767e1deb729f412f00ea2ea777bfc0eef276'},
    'scripts/ci-test-partitions.mjs':{bytes:41115,sha256:'30e4290196fd97178e2bf9f1d769e37199cc71a4ba954e4851d3344eff4f20fa'},
    'tests/ci-test-partitions.test.mjs':{bytes:35255,sha256:'3a2408895e3678a1fae04a5aa34750c66eceab065fa9dc991d29a432a26eab47'},
    'tests/helpers/partitioned-python.mjs':{bytes:25278,sha256:'9f3ad23d4a3044878d0f816621b67c21d0f94256bda0dac0ae2ce1da76cc20e8'},
    'tests/six-boundary-history.test.mjs':{bytes:996,sha256:'6735f441468293b3bb23a58b3531dfbc60f10b0391d787707ecf24c9aff80b38'},
    'tests/six-operation-scope.test.mjs':{bytes:1110,sha256:'e18fdc6a2dd73190e274bf32c67c50467bae55b1ad32ca4c258de143892bda53'}
  }
};
function validateV4HistoricalDescriptor(row,expected){
  exactKeys(row,['bytes','sha256','utf8']);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>=0);assert.equal(typeof row.utf8,'string');
  assert.equal(row.bytes,expected.bytes);assert.equal(row.sha256,expected.sha256);assert.equal(Buffer.byteLength(row.utf8,'utf8'),row.bytes);assert.equal(digest(row.utf8),row.sha256,'Exact immutable CoreB source beforeimage');
  assert.equal(Buffer.from(row.utf8,'utf8').toString('utf8'),row.utf8,'Canonical UTF8 historical bytes');
}
function validateV4HistoricalFixture(fixture){
  exactKeys(fixture,['commit','index','review','sources']);assert.equal(fixture.commit,V4_COREB);
  validateV4HistoricalDescriptor(fixture.index,V4_HISTORY_PINS.index);validateV4HistoricalDescriptor(fixture.review,V4_HISTORY_PINS.review);
  exactKeys(fixture.sources,Object.keys(V4_HISTORY_PINS.sources));assert.deepEqual(Object.keys(fixture.sources),Object.keys(V4_HISTORY_PINS.sources));
  for(const path of Object.keys(V4_HISTORY_PINS.sources))validateV4HistoricalDescriptor(fixture.sources[path],V4_HISTORY_PINS.sources[path]);
  const index=JSON.parse(fixture.index.utf8),review=JSON.parse(fixture.review.utf8);
  assert.equal(index.schema,'reviewed-ci-test-baseline-v3');assert.equal(index.commit,V3_BASE);assert.equal(index.case_inventory.path,V3_REVIEW);assert.equal(index.case_inventory.sha256,fixture.review.sha256);
  assert.equal(review.schema,'reviewed-windows-python-partition-case-source-v1');assert.equal(review.status,'GO_EXACT_SOURCE_DELTA_AND_UNCHANGED_NODE_REGISTRATIONS_ONLY');assert.equal(review.baseline_commit,V3_BASE);
  for(const path of Object.keys(fixture.sources))assert.equal(fixture.sources[path].sha256,index.files[path]??index.additions[path]??index.supporting_sources[path],'CoreB index binds each historical source');
  return index;
}

function loadBaselineV4(root,b,pin){
  exactKeys(b,['schema','commit','legacy_test_count','added_test_count','predecessor','driver','source_overrides','additions','supporting_sources','python_sources','files','case_inventory']);
  assert.equal(b.schema,'reviewed-ci-test-baseline-v4');assert.equal(b.commit,V4_COREB);assert.equal(b.legacy_test_count,2076);assert.equal(b.added_test_count,16);
  assert.deepEqual(b.predecessor,{path:V3_PREDECESSOR,sha256:V3_PREDECESSOR_SHA});const prior=predecessor368Metadata(root);
  assert.deepEqual(b.driver,prior.baseline.driver);assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256,'Unchanged public test driver');
  exactKeys(b.source_overrides,V3_OVERRIDES);assert.deepEqual(Object.keys(b.source_overrides),V3_OVERRIDES);const expected={...prior.expected};
  for(const path of V3_OVERRIDES){const row=b.source_overrides[path];exactKeys(row,['before_sha256','after_sha256']);assert.equal(row.before_sha256,prior.expected[path]);assert.ok(hex(row.after_sha256,64));assert.notEqual(row.after_sha256,row.before_sha256);expected[path]=row.after_sha256;}
  const expectedRows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));assert.equal(literalTestMap(b.files).length,345);assert.deepEqual(b.files,Object.fromEntries(expectedRows.map(row=>[row.path,row.sha256])),'Exact finite predecessor plus three current overrides');
  sourcePins(root,b.additions,V2_TOOLS);assert.equal(b.additions['scripts/ci-test-reporter.mjs'],prior.baseline.additions['scripts/ci-test-reporter.mjs'],'Reporter unchanged');
  sourcePins(root,b.supporting_sources,V3_SUPPORT);sourcePins(root,b.python_sources,Object.keys(V3_PYTHON));assert.deepEqual(b.python_sources,V3_PYTHON,'Unchanged complete seven-method Python sources');
  const current=inventory(root);assert.deepEqual(current,expectedRows,'All actual current345 sources, no observed-source projection');
  exactKeys(b.case_inventory,['path','sha256']);assert.equal(b.case_inventory.path,V3_REVIEW);assert.ok(hex(b.case_inventory.sha256,64));const raw=regular(root,V3_REVIEW);assert.equal(digest(raw),b.case_inventory.sha256);const review=JSON.parse(raw);
  exactKeys(review,['schema','status','baseline_commit','predecessor','driver','source_overrides','additions','supporting_sources','python_sources','inventory_sha256','counts','registrations','before_wrapper_sources','partition_suites','partition_platforms','other_platforms_original_branch_exact','conformance_is_separate_gate','behavioral_or_release_approval','historical_v3_fixture']);
  assert.equal(review.schema,'reviewed-native-python-partition-case-source-v2');assert.equal(review.status,'GO_EXACT_NATIVE_PLATFORM_SOURCE_DELTA_AND_UNCHANGED_NODE_REGISTRATIONS_ONLY');assert.equal(review.baseline_commit,V4_COREB);
  for(const key of ['predecessor','driver','source_overrides','additions','supporting_sources','python_sources'])assert.deepEqual(review[key],b[key]);
  assert.equal(review.inventory_sha256,objectSha(expectedRows));assert.deepEqual(review.counts,{files:345,preserved_cases:2076,added_cases:16,total_cases:2092});
  validateRegistrationReview(review.registrations,b.source_overrides);exactKeys(review.before_wrapper_sources,V3_WRAPPERS);
  for(const path of V3_WRAPPERS){const row=review.before_wrapper_sources[path];exactKeys(row,['sha256','utf8']);assert.equal(typeof row.utf8,'string');assert.equal(row.sha256,prior.expected[path]);assert.equal(digest(row.utf8),row.sha256,'Authentic complete historical wrapper source');}
  assert.deepEqual(review.partition_suites,V3_SUITES);assert.deepEqual(review.partition_platforms,['win32','darwin','linux']);assert.equal(review.other_platforms_original_branch_exact,true);assert.equal(review.conformance_is_separate_gate,true);assert.equal(review.behavioral_or_release_approval,false);
  const historical=validateV4HistoricalFixture(review.historical_v3_fixture);assert.equal(b.supporting_sources['scripts/ci-python-partition-driver.py'],historical.supporting_sources['scripts/ci-python-partition-driver.py'],'Unchanged original partition driver');
  return {baseline:b,baseline_sha256:pin,inventory:current};
}
export function historicalNativePythonPartitionFixture(root,index,pin){
  const checked=loadBaseline(root,index,pin);assert.equal(checked.baseline.schema,'reviewed-ci-test-baseline-v4');
  const raw=regular(root,V3_REVIEW);assert.equal(digest(raw),checked.baseline.case_inventory.sha256);const review=JSON.parse(raw);
  return Object.freeze({historical_v3_fixture:review.historical_v3_fixture,before_wrapper_sources:Object.freeze(Object.fromEntries(V3_WRAPPERS.map(path=>[path,review.before_wrapper_sources[path].utf8])))});
}


// Flat current380 successor. H metadata stays a named, immutable historical input.
const V5_BASE='4e9287bd5ebc78aba4b185b017e63eac6547bfd7';
const V5_INDEX='docs/evidence/qa/english381-386/BASELINE_380_TEST_FILES.json';
const V5_REVIEW='docs/evidence/qa/english381-386/CASE_SOURCE_REVIEW.json';
const V5_AUDIT='docs/evidence/qa/english381-386/CASE_SOURCE_AUDIT.json';
const V5_H_INDEX_SHA='87c19eaa93596af180e91e4b5d0ca310ba1e192a141485aecdefdb7a831d0976';
const V5_H_REVIEW_SHA='f91fa9cfa922d57c44f9ce998206dfe4f704d81386ad5e9e90d223a52f57f74a';
// Deliberately invalid until the actual authored sources and independent AST audit freeze.
const V5_CHANGED_PATHS=Object.freeze(["tests/an-numbered-sections.test.mjs","tests/an-ten-selections.test.mjs","tests/an247-cross-questioning-partial.test.mjs","tests/an859-prose-partial.test.mjs","tests/apadana-disclosures.test.mjs","tests/apadana-four-boundary-migration.test.mjs","tests/apadana-fourth-boundaries.test.mjs","tests/apadana-fourth-client.test.mjs","tests/apadana-fourth.test.mjs","tests/apadana-held234.test.mjs","tests/apadana-next-boundaries.test.mjs","tests/apadana-next-ten-migration.test.mjs","tests/apadana-next.test.mjs","tests/apadana-pair-boundary.test.mjs","tests/apadana-six-boundary-migration.test.mjs","tests/apadana-thera-boundaries.test.mjs","tests/apadana-thera-pair-boundaries.test.mjs","tests/apadana-thera-pair-intake.test.mjs","tests/apadana-thera.test.mjs","tests/apadana-thera141-180.test.mjs","tests/apadana-thera181-220.test.mjs","tests/apadana-thera221-230.test.mjs","tests/apadana-thera241-250.test.mjs","tests/apadana-third-boundaries.test.mjs","tests/apadana-third.test.mjs","tests/approved-acceptance.test.mjs","tests/approved-current333-authority-negatives.test.mjs","tests/approved-current339-authority-negatives.test.mjs","tests/boundary333-336-source-input.test.mjs","tests/browser-current359-routing.test.mjs","tests/browser-current368-routing.test.mjs","tests/check-ci-stages.test.mjs","tests/ci-test-partitions.test.mjs","tests/current333-uri-bindings.test.mjs","tests/current333-version-bindings.test.mjs","tests/current339-source-inverses.test.mjs","tests/current343-bindings.test.mjs","tests/dt-scope-and-potaliya.test.mjs","tests/final-excerpt-binding-review.test.mjs","tests/four-boundary-history.test.mjs","tests/four-history-data.test.mjs","tests/held234-client.test.mjs","tests/held234-current333-chain.test.mjs","tests/intake343-ci.test.mjs","tests/intake343-metadata.test.mjs","tests/intake343-source-input.test.mjs","tests/intake359-history.test.mjs","tests/intake359-metadata-history.test.mjs","tests/intake359-source-history.test.mjs","tests/intake368-history.test.mjs","tests/intake368-source-seal.test.mjs","tests/milinda-medicine-partial.test.mjs","tests/next-ten-history-data.test.mjs","tests/next-ten-history.test.mjs","tests/next-ten-source-history.test.mjs","tests/priority-prose-review.test.mjs","tests/publisher317-ci.test.mjs","tests/publisher325-ci.test.mjs","tests/publisher333-ci.test.mjs","tests/publisher339-ci.test.mjs","tests/six-boundary-ci.test.mjs","tests/six-boundary-history.test.mjs","tests/six-boundary-source-input.test.mjs","tests/six-operation-scope.test.mjs","tests/source-notes-baseline-projection.test.mjs","tests/source-notes-ci.test.mjs","tests/source-notes-compatibility.test.mjs","tests/thera-commentary-locators.test.mjs","tests/thera141-180-client.test.mjs","tests/thera181-220-client.test.mjs","tests/thera221-230-client.test.mjs","tests/thera241-250-client.test.mjs","tests/thera261-280-client.test.mjs","tests/thera261-280-source.test.mjs","tests/thera281-285-client.test.mjs","tests/thera281-285-source.test.mjs","tests/thera287-288-client.test.mjs","tests/thera287-288-source.test.mjs","tests/thera292-299-client.test.mjs","tests/thera292-299-source.test.mjs","tests/thera301-310-client.test.mjs","tests/thera301-310-source.test.mjs","tests/thera312-319-client.test.mjs","tests/thera312-319-source.test.mjs","tests/thera321-329-client.test.mjs","tests/thera321-329-source.test.mjs","tests/thera331-334-preface-client.test.mjs","tests/thera331-334-source.test.mjs","tests/thera333-legacy-projection.test.mjs","tests/thera333-legacy-source-inverses.test.mjs","tests/thera335-350-source.test.mjs","tests/thera339-legacy-projection.test.mjs","tests/thera351-360-nine-source.test.mjs","tests/verse-scope-review.test.mjs","tests/web-reader-ci-artifacts.test.mjs","tests/widget-hosted-selections.test.mjs"]);
const V5_ADDED_PATHS=Object.freeze(["tests/apadana-thera389390-boundary.test.mjs","tests/current375-bindings.test.mjs","tests/held234-current375-chain.test.mjs","tests/intake375-current-negatives.test.mjs","tests/scaled-profile-probe-diagnostics.test.mjs","tests/thera371-378-seven.test.mjs","tests/thera381-386-five.test.mjs","tests/verse-scope-python.test.mjs"]);
const V5_FILE_COUNT=353, V5_ADDED_CASE_COUNT=21;
const V5_SUPPORT=Object.freeze([...V3_SUPPORT,
 'tests/helpers/intake375-metadata.mjs','tests/helpers/intake380-metadata.mjs','tests/helpers/historical-h-inputs.mjs','tests/helpers/verse-scope-python.mjs',
 'tests/materialize_h_history.py','tests/helpers/current389390-metadata.mjs','docs/evidence/apadana/thera389-390/CURRENT_SOURCE_INPUTS.json'
].sort());
export const CURRENT380_CI_INDEX=V5_INDEX;
function v5Configuration(){
 for(const paths of [V5_CHANGED_PATHS,V5_ADDED_PATHS]){assert.ok(paths.length>0,'Pending current380 CI file audit');assert.deepEqual([...paths],[...paths].sort());assert.equal(new Set(paths).size,paths.length);for(const path of paths)assert.match(path,/^tests\/[a-zA-Z0-9_.-]+\.test\.mjs$/,'Pending current380 CI path freeze');}
 assert.ok(V5_CHANGED_PATHS.includes(V2_QA),'Current CI QA source must be explicitly reviewed');
 assert.ok(Number.isSafeInteger(V5_FILE_COUNT)&&V5_FILE_COUNT===345+V5_ADDED_PATHS.length,'Pending current380 file count');
 assert.ok(Number.isSafeInteger(V5_ADDED_CASE_COUNT)&&V5_ADDED_CASE_COUNT>0,'Pending independent current375 terminal-case audit');
}
function v5Predecessor(){return {commit:V5_BASE,index:{path:V3_INDEX,sha256:V5_H_INDEX_SHA},review:{path:V3_REVIEW,sha256:V5_H_REVIEW_SHA}};}
function h375PredecessorMetadata(root){
 const indexRaw=regular(root,V3_INDEX),reviewRaw=regular(root,V3_REVIEW);assert.equal(digest(indexRaw),V5_H_INDEX_SHA);assert.equal(digest(reviewRaw),V5_H_REVIEW_SHA);
 const b=JSON.parse(indexRaw),r=JSON.parse(reviewRaw);
 assert.equal(b.schema,'reviewed-ci-test-baseline-v4');assert.equal(b.commit,V4_COREB);assert.equal(b.legacy_test_count,2076);assert.equal(b.added_test_count,16);assert.equal(literalTestMap(b.files).length,345);
 assert.deepEqual(b.case_inventory,{path:V3_REVIEW,sha256:V5_H_REVIEW_SHA});assert.equal(r.schema,'reviewed-native-python-partition-case-source-v2');assert.equal(r.status,'GO_EXACT_NATIVE_PLATFORM_SOURCE_DELTA_AND_UNCHANGED_NODE_REGISTRATIONS_ONLY');
 assert.deepEqual(r.counts,{files:345,preserved_cases:2076,added_cases:16,total_cases:2092});assert.deepEqual(r.partition_suites,V3_SUITES);assert.deepEqual(r.partition_platforms,['win32','darwin','linux']);assert.equal(r.behavioral_or_release_approval,false);
 // No strict V4-current loader is called against380 files, and no H beforeimage is copied here.
 return b;
}
function v5RegistrationRows(rows){
 assert.ok(Array.isArray(rows)&&rows.length>0);
 for(const row of rows){exactKeys(row,['name','name_expression','line','column','registration_ancestors','argument_count','options_source']);assert.ok(row.name===null||typeof row.name==='string');assert.equal(typeof row.name_expression,'string');assert.ok(Array.isArray(row.registration_ancestors));assert.ok(Number.isSafeInteger(row.argument_count)&&row.argument_count>0);assert.ok(row.options_source===null||typeof row.options_source==='string');for(const key of ['line','column'])assert.ok(Number.isSafeInteger(row[key])&&row[key]>0);}
 return rows.map(({line,column,...identity})=>identity);
}
// Exactly two newly bounded, formerly uncapped verse fixtures; no other options may change.
const V5_VERSE_OPTION_CASES=Object.freeze([
 'partial holds are narrowly validated, global and immutable and survive ordinary linker rebuilds',
 'reviewed adjacent-pair repair is idempotent and refuses drift before any pending span edits'
]);
// Exactly three formerly unbounded boundary fixtures gain finite125s ceilings.
const V5_BOUNDARY_OPTION_CASES=Object.freeze([{"path":"tests/apadana-thera-boundaries.test.mjs","name":"both Therā boundary pairs and false commentary ownership change atomically with exact original source parity","before":"{ skip: !python }","after":"{ skip: !python, timeout: 125000 }"},{"path":"tests/apadana-thera-pair-boundaries.test.mjs","name":"finite pair gate is atomic, source-conserving, idempotent and rejects drift before mutation","before":"{ skip: !python }","after":"{ skip: !python, timeout: 125000 }"},{"path":"tests/apadana-thera-pair-boundaries.test.mjs","name":"optional complete original XML replay checks strict freshness, all source wording and idempotence","before":"{ skip: !python || !sourceRoot }","after":"{ skip: !python || !sourceRoot, timeout: 125000 }"}]);
function v5PreservedRegistrations(path,before,after){
 const old=v5RegistrationRows(before),current=v5RegistrationRows(after);assert.equal(current.length,old.length);const exceptions=[];
 for(let i=0;i<old.length;i++){
  const expected={...old[i]},actual=current[i];
  if(expected.options_source!==actual.options_source){
   if(path==='tests/verse-scope-review.test.mjs'){
   assert.equal(path,'tests/verse-scope-review.test.mjs');assert.ok(V5_VERSE_OPTION_CASES.includes(expected.name));assert.equal(expected.options_source,'{skip:!python}');assert.equal(actual.options_source,'{skip:!python,timeout:125000}');exceptions.push(expected.name);expected.options_source=actual.options_source;
   }else{
    const rule=V5_BOUNDARY_OPTION_CASES.find(row=>row.path===path&&row.name===expected.name);assert.ok(rule,'Only the three exact reviewed formerly unbounded boundary cases may add a ceiling');assert.equal(expected.options_source,rule.before);assert.equal(actual.options_source,rule.after);exceptions.push(expected.name);expected.options_source=actual.options_source;
   }
  }
  assert.deepEqual(actual,expected,'Every old registration/name/ancestry/arity and all other options remain exact');
 }
 if(path==='tests/verse-scope-review.test.mjs')assert.deepEqual(exceptions,[...V5_VERSE_OPTION_CASES],'Both reviewed finite125s ceilings must actually occur');else assert.deepEqual(exceptions,V5_BOUNDARY_OPTION_CASES.filter(row=>row.path===path).map(row=>row.name),'All exact reviewed boundary ceilings and no other option exception must actually occur');
}
function loadBaselineV5(root,b,pin){
 v5Configuration();
 exactKeys(b,['schema','commit','legacy_test_count','added_test_count','driver','predecessor','changed_files','added_files','additions','supporting_sources','python_sources','files','case_inventory']);
 assert.equal(b.schema,'reviewed-ci-test-baseline-v5');assert.equal(b.commit,V5_BASE);assert.equal(b.legacy_test_count,2092);assert.equal(b.added_test_count,V5_ADDED_CASE_COUNT);assert.deepEqual(b.predecessor,v5Predecessor());
 const prior=h375PredecessorMetadata(root);assert.deepEqual(b.driver,prior.driver);assert.equal(digest(regular(root,b.driver.path)),b.driver.sha256);
 exactKeys(b.changed_files,V5_CHANGED_PATHS);assert.deepEqual(Object.keys(b.changed_files),[...V5_CHANGED_PATHS]);const expected={...prior.files};
 for(const path of V5_CHANGED_PATHS){assert.ok(Object.hasOwn(prior.files,path));const row=b.changed_files[path];exactKeys(row,['before_sha256','after_sha256']);assert.equal(row.before_sha256,prior.files[path]);assert.ok(hex(row.after_sha256,64));assert.notEqual(row.after_sha256,row.before_sha256);expected[path]=row.after_sha256;}
 assert.deepEqual(literalTestMap(b.added_files),[...V5_ADDED_PATHS]);for(const path of V5_ADDED_PATHS){assert.ok(!Object.hasOwn(prior.files,path));expected[path]=b.added_files[path];}
 const rows=Object.keys(expected).sort().map(path=>({path,sha256:expected[path]}));assert.equal(rows.length,V5_FILE_COUNT);assert.deepEqual(literalTestMap(b.files),rows.map(x=>x.path));assert.deepEqual(b.files,Object.fromEntries(rows.map(x=>[x.path,x.sha256])));
 sourcePins(root,b.additions,V2_TOOLS);assert.equal(b.additions['scripts/ci-test-reporter.mjs'],prior.additions['scripts/ci-test-reporter.mjs']);sourcePins(root,b.supporting_sources,V5_SUPPORT);for(const path of V3_SUPPORT)assert.equal(b.supporting_sources[path],prior.supporting_sources[path],'Existing H Python partition protocol source stays exact');sourcePins(root,b.python_sources,Object.keys(V3_PYTHON));assert.deepEqual(b.python_sources,V3_PYTHON,'Original fourteen Python method sources remain exact H');
 const current=inventory(root);assert.deepEqual(current,rows,'Independent flat H plus finite380 delta must match every actual source');
 exactKeys(b.case_inventory,['path','sha256']);assert.equal(b.case_inventory.path,V5_REVIEW);assert.ok(hex(b.case_inventory.sha256,64));const raw=regular(root,V5_REVIEW);assert.equal(digest(raw),b.case_inventory.sha256);const r=JSON.parse(raw);
 exactKeys(r,['schema','status','baseline_commit','predecessor','driver','changed_files','added_files','additions','supporting_sources','python_sources','inventory_sha256','counts','registrations','added_cases_by_file','evidence','partition_suites','partition_platforms','conformance_is_separate_gate','behavioral_or_release_approval']);
 assert.equal(r.schema,'reviewed-next-five-CI-source-case-review-v1');assert.equal(r.status,'GO_EXACT_CURRENT380_SOURCE_DELTA_AND_CASE_INVENTORY_ONLY');assert.equal(r.baseline_commit,V5_BASE);
 for(const key of ['predecessor','driver','changed_files','added_files','additions','supporting_sources','python_sources'])assert.deepEqual(r[key],b[key]);assert.equal(r.inventory_sha256,objectSha(rows));
 const counts={baseline_files:345,preserved_cases:2092,added_files:V5_ADDED_PATHS.length,added_cases:V5_ADDED_CASE_COUNT,total_files:V5_FILE_COUNT,total_cases:2092+V5_ADDED_CASE_COUNT};assert.deepEqual(r.counts,counts);
 exactKeys(r.registrations,['changed','added']);exactKeys(r.registrations.changed,V5_CHANGED_PATHS);exactKeys(r.registrations.added,V5_ADDED_PATHS);
 for(const path of V5_CHANGED_PATHS){const item=r.registrations.changed[path];exactKeys(item,['before_sha256','after_sha256','before','after']);assert.equal(item.before_sha256,b.changed_files[path].before_sha256);assert.equal(item.after_sha256,b.changed_files[path].after_sha256);v5PreservedRegistrations(path,item.before,item.after);}
 for(const path of V5_ADDED_PATHS){const item=r.registrations.added[path];exactKeys(item,['sha256','after']);assert.equal(item.sha256,b.added_files[path]);v5RegistrationRows(item.after);for(const row of item.after){assert.equal(typeof row.name,'string');assert.deepEqual(row.registration_ancestors,[],'New380 cases are literal top-level registrations');}}
 exactKeys(r.added_cases_by_file,V5_ADDED_PATHS);assert.deepEqual(Object.keys(r.added_cases_by_file),[...V5_ADDED_PATHS]);let added=0;for(const [path,n]of Object.entries(r.added_cases_by_file)){assert.ok(Number.isSafeInteger(n)&&n>0);assert.equal(n,r.registrations.added[path].after.length,'Exact literal new-case count');added+=n;}assert.equal(added,V5_ADDED_CASE_COUNT);
 assert.deepEqual(r.partition_suites,V3_SUITES);assert.deepEqual(r.partition_platforms,['win32','darwin','linux']);assert.equal(r.conformance_is_separate_gate,true);assert.equal(r.behavioral_or_release_approval,false);
 assert.ok(Array.isArray(r.evidence)&&r.evidence.length===1);const evidence=r.evidence[0];exactKeys(evidence,['path','sha256']);assert.equal(evidence.path,V5_AUDIT);assert.ok(hex(evidence.sha256,64));const auditRaw=regular(root,V5_AUDIT);assert.equal(digest(auditRaw),evidence.sha256);const audit=JSON.parse(auditRaw);
 exactKeys(audit,['schema','status','baseline_commit','changed_files','added_files','registrations','counts','all_H_scenarios_preserved','source_only','runtime_or_release_approval']);assert.equal(audit.schema,'independent-current380-CI-case-source-audit-v1');assert.equal(audit.status,'GO_EXACT_CURRENT380_SOURCE_CASES_AND_H_SCENARIO_PRESERVATION_ONLY');assert.equal(audit.baseline_commit,V5_BASE);for(const key of ['changed_files','added_files','registrations','counts'])assert.deepEqual(audit[key],r[key]);assert.equal(audit.all_H_scenarios_preserved,true);assert.equal(audit.source_only,true);assert.equal(audit.runtime_or_release_approval,false);
 return {baseline:b,baseline_sha256:pin,inventory:current};
}
function revalidateV5Sources(root,checked){
 const raw=regular(root,V5_INDEX);assert.equal(digest(raw),checked.baseline_sha256);const again=loadBaselineV5(root,JSON.parse(raw),checked.baseline_sha256);assert.deepEqual(again,checked,'All current V5 source/support/authority bytes must still match after execution');
}

export function loadBaseline(root,path,pin){
  assert.ok(hex(pin,64),'Explicit independent baseline hash required');
  const raw=readFileSync(path);assert.equal(digest(raw),pin);const b=JSON.parse(raw);
  if(b.schema==='reviewed-ci-test-baseline-v1')return loadBaselineV1(root,path,pin);
  if(b.schema==='reviewed-ci-test-baseline-v5'){assert.equal(resolve(path),resolve(root,V5_INDEX));assert.equal(digest(regular(root,V5_INDEX)),pin);return loadBaselineV5(root,b,pin);}
  if(b.schema==='reviewed-ci-test-baseline-v4'){assert.equal(resolve(path),resolve(root,V3_INDEX));assert.equal(digest(regular(root,V3_INDEX)),pin);return loadBaselineV4(root,b,pin);}
  if(b.schema==='reviewed-ci-test-baseline-v3'){assert.equal(resolve(path),resolve(root,V3_INDEX));assert.equal(digest(regular(root,V3_INDEX)),pin);return loadBaselineV3(root,b,pin);}
  assert.equal(b.schema,'reviewed-ci-test-baseline-v2');return loadBaselineV2(root,b,pin);
}

export function selectedFiles(rows,mode,partition){assert.ok(mode==='full'||mode==='partition');if(mode==='full'){assert.equal(partition,null);return rows.map(r=>r.path);}assert.ok(Number.isInteger(partition)&&partition>=0&&partition<PARTITIONS);const selected=rows.filter((_,i)=>i%PARTITIONS===partition).map(r=>r.path);assert.ok(selected.length,'Every partition must be nonempty');return selected;}
export function nodeArguments(root,context){return ['--test',...(context.platform==='win32'?['--test-concurrency=1']:context.platform==='linux'&&context.mode==='full'?['--test-concurrency=2']:[]),'--test-reporter='+pathToFileURL(resolve(root,'scripts/ci-test-reporter.mjs')).href,...context.selected_files.map(p=>resolve(root,p))];}
export function makeContext(root,checked,{commit,mode,partition=null,platform=process.platform,node=process.version,ci=null}){assert.ok(hex(commit,40));const c={schema:'complete-ci-test-context-v1',commit,ci,mode,partition,partition_count:PARTITIONS,platform,node_major:Number(node.match(/^v(\d+)\./)?.[1]),baseline_sha256:checked.baseline_sha256,legacy_test_count:checked.baseline.legacy_test_count,added_test_count:checked.baseline.added_test_count,legacy_driver:checked.baseline.driver,inventory:checked.inventory,added_sources:checked.baseline.additions,selected_files:selectedFiles(checked.inventory,mode,partition)};assert.ok(Number.isInteger(c.node_major)&&c.node_major>=20);return c;}
const rowKey=row=>JSON.stringify([row.file,row.line,row.column,row.name,row.type,row.nesting,row.status]);
export function eventCollector(root,context){const cases=[],summary={};let rootPlan=false;return {accept(event){const d=event.data;if(event.type==='test:plan'&&d.nesting===0)rootPlan=true;if(event.type==='test:diagnostic'&&d.nesting===0){const m=/^(tests|suites|pass|fail|cancelled|skipped|todo) (\d+)$/.exec(d.message);if(m){assert.ok(!Object.hasOwn(summary,m[1]),'Duplicate terminal summary');summary[m[1]]=Number(m[2]);}}if(event.type!=='test:pass'&&event.type!=='test:fail')return;assert.equal(typeof d.file,'string','Terminal event must identify its actual source file');const file=posix(relative(resolve(root),resolve(d.file)));assert.ok(file&&!file.startsWith('../')&&!isAbsolute(file));assert.equal(typeof d.name,'string');assert.ok(Number.isSafeInteger(d.nesting)&&d.nesting>=0);const nullable=x=>x===undefined?null:x;const line=nullable(d.line),column=nullable(d.column);assert.ok(line===null||Number.isSafeInteger(line)&&line>0);assert.ok(column===null||Number.isSafeInteger(column)&&column>0);const type=d.details?.type??'test';assert.ok(type==='test'||type==='suite');const skipped=d.skip!==undefined&&d.skip!==false,todo=d.todo!==undefined&&d.todo!==false;assert.ok(!(skipped&&todo));let status=skipped?'skip':todo?'todo':event.type==='test:pass'?'pass':'fail';if(d.details?.error?.failureType==='cancelledByParent')status='cancelled';cases.push({file,line,column,name:d.name,type,nesting:d.nesting,status});},seal(){assert.ok(rootPlan,'Missing terminal root plan');assert.deepEqual(Object.keys(summary).sort(),['cancelled','fail','pass','skipped','suites','tests','todo']);const tests=cases.filter(c=>c.type==='test'),suites=cases.filter(c=>c.type==='suite');assert.equal(tests.length,summary.tests);assert.equal(suites.length,summary.suites);for(const[status,key]of [['pass','pass'],['skip','skipped'],['todo','todo'],['fail','fail'],['cancelled','cancelled']])assert.equal(tests.filter(c=>c.status===status).length,summary[key],`Terminal ${status} count`);assert.equal(summary.fail,0);assert.equal(summary.cancelled,0);assert.ok(cases.every(c=>c.status!=='fail'&&c.status!=='cancelled'));return {schema:'complete-ci-test-events-v1',context,context_sha256:objectSha(context),complete:true,cases:cases.sort((a,b)=>rowKey(a)<rowKey(b)?-1:rowKey(a)>rowKey(b)?1:0),summary};}};}
export function writeExclusive(path,value){assert.ok(!existsSync(path),'Receipt must be new');mkdirSync(dirname(path),{recursive:true});const temp=path+'.tmp';writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{flag:'wx'});assert.ok(!existsSync(path));renameSync(temp,path);}
function validateContext(c,checked,commit,ci,expectedNodeMajor=20){assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);assert.deepEqual(Object.keys(c).sort(),['schema','commit','ci','mode','partition','partition_count','platform','node_major','baseline_sha256','legacy_test_count','added_test_count','legacy_driver','inventory','added_sources','selected_files'].sort());assert.equal(c.schema,'complete-ci-test-context-v1');assert.equal(c.commit,commit);assert.deepEqual(c.ci,ci);if(ci)assert.equal(ci.sha,commit);assert.equal(c.partition_count,PARTITIONS);assert.equal(c.baseline_sha256,checked.baseline_sha256);assert.equal(c.legacy_test_count,checked.baseline.legacy_test_count);assert.equal(c.added_test_count,checked.baseline.added_test_count);assert.deepEqual(c.legacy_driver,checked.baseline.driver);assert.deepEqual(c.inventory,checked.inventory);assert.deepEqual(c.added_sources,checked.baseline.additions);assert.deepEqual(c.selected_files,selectedFiles(c.inventory,c.mode,c.partition));assert.equal(c.node_major,expectedNodeMajor,'Reference and partitions must match the trusted Node major');}
export function verifyReceipt(receipt,checked,commit,ci=null,expectedNodeMajor=20){assert.deepEqual(Object.keys(receipt).sort(),['schema','events','execution'].sort());assert.equal(receipt.schema,'complete-ci-test-receipt-v1');const {events,execution}=receipt;assert.deepEqual(Object.keys(events).sort(),['schema','context','context_sha256','complete','cases','summary'].sort());assert.deepEqual(Object.keys(execution).sort(),['exit_code','signal','error','timed_out','cleanup_unverified','bound_ms'].sort());assert.equal(events.schema,'complete-ci-test-events-v1');assert.equal(events.complete,true);assert.equal(events.context_sha256,objectSha(events.context));validateContext(events.context,checked,commit,ci,expectedNodeMajor);assert.equal(execution.exit_code,0);assert.equal(execution.signal,null);assert.equal(execution.timed_out,false);assert.equal(execution.error,null);assert.equal(execution.cleanup_unverified,false);assert.ok(Number.isInteger(execution.bound_ms)&&execution.bound_ms>0&&execution.bound_ms<=(events.context.mode==='full'?MAX_FULL_MS:MAX_CHILD_MS));// Validate typed case/summary independently of event arrival order.
assert.ok(Array.isArray(events.cases));for(const r of events.cases){assert.deepEqual(Object.keys(r),['file','line','column','name','type','nesting','status']);assert.ok(typeof r.file==='string'&&!r.file.startsWith('/')&&!r.file.includes('\\')&&r.file.split('/').every(x=>x&&x!=='.'&&x!=='..'));assert.equal(typeof r.name,'string');assert.ok(['test','suite'].includes(r.type));assert.ok(['pass','skip','todo'].includes(r.status));assert.ok(Number.isSafeInteger(r.nesting)&&r.nesting>=0);for(const k of ['line','column'])assert.ok(r[k]===null||Number.isSafeInteger(r[k])&&r[k]>0);}const tests=events.cases.filter(x=>x.type==='test');assert.deepEqual(Object.keys(events.summary).sort(),['cancelled','fail','pass','skipped','suites','tests','todo']);for(const k of Object.keys(events.summary))assert.ok(Number.isSafeInteger(events.summary[k])&&events.summary[k]>=0);assert.equal(events.summary.tests,tests.length);assert.equal(events.summary.suites,events.cases.length-tests.length);assert.equal(events.summary.fail,0);assert.equal(events.summary.cancelled,0);for(const[s,k]of [['pass','pass'],['skip','skipped'],['todo','todo']])assert.equal(events.summary[k],tests.filter(r=>r.status===s).length);return events;}
export function aggregateReceipts(reference,parts,checked,commit,ci=null,expectedNodeMajor=20){assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);assert.ok(hex(commit,40));const ref=verifyReceipt(reference,checked,commit,ci,expectedNodeMajor);assert.equal(ref.context.mode,'full');assert.equal(ref.context.platform,'linux');assert.equal(ref.summary.tests,checked.baseline.legacy_test_count+checked.baseline.added_test_count);assert.equal(parts.length,PARTITIONS);const seen=new Set(),files=[],cases=[];const totals={tests:0,suites:0,pass:0,fail:0,cancelled:0,skipped:0,todo:0};for(const receipt of parts){const e=verifyReceipt(receipt,checked,commit,ci,expectedNodeMajor);assert.equal(e.context.mode,'partition');assert.equal(e.context.platform,'win32');assert.ok(!seen.has(e.context.partition),'Duplicate partition');seen.add(e.context.partition);files.push(...e.context.selected_files);cases.push(...e.cases);for(const k of Object.keys(totals))totals[k]+=e.summary[k];}assert.deepEqual([...seen].sort(),[0,1,2,3]);assert.equal(new Set(files).size,files.length);assert.deepEqual(files.sort(),checked.inventory.map(r=>r.path));assert.deepEqual(cases.map(rowKey).sort(),ref.cases.map(rowKey).sort(),'Exact terminal case multiset differs');assert.deepEqual(totals,ref.summary);return {schema:'complete-ci-test-aggregate-v1',commit,ci,node_major:expectedNodeMajor,baseline_sha256:checked.baseline_sha256,partition_count:PARTITIONS,inventory:checked.inventory,summary:totals,exact_case_multiset:true,disjoint_complete_file_cover:true,complete:true};}
export async function execute(root,checked,{commit,mode,partition=null,receipt,boundMs=mode==='full'?MAX_FULL_MS:MAX_CHILD_MS,platform=process.platform,node=process.version,ci=null}){assert.ok(Number.isInteger(boundMs)&&boundMs>0&&boundMs<=(mode==='full'?MAX_FULL_MS:MAX_CHILD_MS));const context=makeContext(root,checked,{commit,mode,partition,platform,node,ci});const contextFile=receipt+'.context.json',eventsFile=receipt+'.events.json';writeExclusive(contextFile,{root:resolve(root),events_file:resolve(eventsFile),context});assert.ok(!existsSync(receipt)&&!existsSync(eventsFile));const env={...process.env,PALI_CI_TEST_CONTEXT:resolve(contextFile)};delete env.NODE_TEST_CONTEXT; // Explicit new CLI must not inherit node:test's recursive-child marker.
let timedOut=false,error=null,cleanupUnverified=false;const execution=await new Promise(resolveResult=>{let child;try{child=spawn(process.execPath,nodeArguments(root,context),{cwd:root,stdio:'inherit',detached:process.platform!=='win32',env});}catch(e){resolveResult({exit_code:null,signal:null,error:e.code??'SPAWN_ERROR',timed_out:false,cleanup_unverified:false,bound_ms:boundMs});return;}const timer=setTimeout(()=>{timedOut=true;try{if(process.platform==='win32'){const killed=execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore'});}else{process.kill(-child.pid,'SIGKILL');}}catch{cleanupUnverified=true;child.kill('SIGKILL');}},boundMs);child.once('error',e=>{error=e.code??'SPAWN_ERROR';});child.once('close',(code,signal)=>{clearTimeout(timer);resolveResult({exit_code:code,signal,error,timed_out:timedOut,cleanup_unverified:cleanupUnverified,bound_ms:boundMs});});});const events=existsSync(eventsFile)?JSON.parse(readFileSync(eventsFile,'utf8')):null;const result={schema:'complete-ci-test-receipt-v1',events,execution};writeExclusive(receipt,result);assert.equal(execution.exit_code,0,'Test process failed');assert.equal(execution.signal,null);assert.equal(execution.error,null);assert.equal(execution.timed_out,false);assert.ok(events?.complete,'Reporter must seal terminal events');assert.deepEqual(events.context,context);assert.equal(events.context_sha256,objectSha(context));assert.deepEqual(inventory(root),checked.inventory,'Test inventory changed during execution');for(const[name,pin]of Object.entries(checked.baseline.additions))assert.equal(digest(regular(root,name)),pin,'Reviewed tooling changed during execution');if(checked.baseline.schema==='reviewed-ci-test-baseline-v3'){sourcePins(root,checked.baseline.supporting_sources,V3_SUPPORT);sourcePins(root,checked.baseline.python_sources,Object.keys(V3_PYTHON));assert.equal(digest(regular(root,V3_INDEX)),checked.baseline_sha256);assert.equal(digest(regular(root,V3_REVIEW)),checked.baseline.case_inventory.sha256);}if(checked.baseline.schema==='reviewed-ci-test-baseline-v4'){sourcePins(root,checked.baseline.supporting_sources,V3_SUPPORT);sourcePins(root,checked.baseline.python_sources,Object.keys(V3_PYTHON));assert.equal(digest(regular(root,V3_INDEX)),checked.baseline_sha256);assert.equal(digest(regular(root,V3_REVIEW)),checked.baseline.case_inventory.sha256);}assert.equal(digest(regular(root,checked.baseline.driver.path)),checked.baseline.driver.sha256);return result;}
function args(argv){const values={};for(let i=0;i<argv.length;i++){assert.ok(argv[i].startsWith('--'));const key=argv[i].slice(2);assert.ok(!Object.hasOwn(values,key));if(key==='parts'){values.parts=argv.slice(i+1);assert.equal(values.parts.length,4);break;}assert.ok(i+1<argv.length);values[key]=argv[++i];}return values;}
export function ciIdentity(env=process.env) {
  if(env.GITHUB_ACTIONS!=='true') return null;
  assert.match(env.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/,'CI run identity required');
  assert.match(env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]*$/,'CI run attempt required');
  assert.ok(hex(env.GITHUB_SHA,40),'CI SHA required');
  return {run_id:env.GITHUB_RUN_ID,run_attempt:env.GITHUB_RUN_ATTEMPT,sha:env.GITHUB_SHA};
}
export async function main(argv=process.argv.slice(2)){const command=argv.shift();assert.ok(command==='run'||command==='aggregate');const a=args(argv);const allowed=command==='run'?['mode','partition','receipt','baseline-index','baseline-sha']:['reference','output','baseline-index','baseline-sha','parts'];assert.ok(Object.keys(a).every(k=>allowed.includes(k)));const root=process.cwd(),commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:5000}).trim();assert.ok(hex(commit,40));const ci=ciIdentity();if(ci)assert.equal(ci.sha,commit);const checked=loadBaseline(root,a['baseline-index'],a['baseline-sha']);if(command==='run'){assert.ok(a.mode==='full'||a.mode==='partition');assert.ok(typeof a.receipt==='string');const partition=a.partition===undefined?null:Number(a.partition);await execute(root,checked,{commit,mode:a.mode,partition,receipt:resolve(a.receipt),ci});if(checked.baseline.schema==='reviewed-ci-test-baseline-v5')revalidateV5Sources(root,checked);}else{assert.equal(typeof a.output,'string');const ref=JSON.parse(readFileSync(a.reference,'utf8')),parts=a.parts.map(p=>JSON.parse(readFileSync(p,'utf8')));const expectedNodeMajor=Number(process.versions.node.split('.')[0]);assert.ok(expectedNodeMajor===20||expectedNodeMajor===22);const result=aggregateReceipts(ref,parts,checked,commit,ci,expectedNodeMajor);writeExclusive(resolve(a.output),result);console.log(JSON.stringify({commit,complete:true,files:result.inventory.length,summary:result.summary}));}}
if(process.argv[1]&&realpathSync(process.argv[1])===realpathSync(fileURLToPath(import.meta.url)))main().catch(e=>{console.error('CI partition gate refused: '+e.message);process.exitCode=1;});
