"""Independent byte/context review only; never imports or executes project code."""
import hashlib,json,re,subprocess,stat
from pathlib import Path

ROOT=Path('/tmp/pali325-reconcile-nov26')
OUT=Path('/tmp/pali325-nov26/canonical-review')
OLD='6555a21f7290a28a893a8dfb3aa37117ff13afd6'
AUTH=Path('/tmp/pali-301-310-package-review/CURRENT_RUNTIME_INVENTORY_APPROVAL.json')
AUTH_SHA='bae09c75ce5bb5d90e62044b60f5ac468e0c3c0569484117e28f938720aabf09'
PREFIX=b'../pali-thera292-299-local/node_modules/'
REPLACEMENT=b'node_modules/'
COUNTS={'http-worker.cjs':222,'http.cjs':230,'index.cjs':222}
sha=lambda b:hashlib.sha256(b).hexdigest()
def git(path):return subprocess.check_output(['git','show',OLD+':'+path],cwd=ROOT)
def write(name,value):
    p=OUT/name
    assert not p.exists(),'Preserve prior evidence: '+str(p)
    p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
raw=AUTH.read_bytes();assert sha(raw)==AUTH_SHA
authority=json.loads(raw);files=authority['files'];assert len(files)==34
expected={name:dict(row) for name,row in files.items()}
context_proofs={};runtime=[];helpers={}
for name,pin in files.items():
    old=git('server/'+name);assert {'bytes':len(old),'sha256':sha(old)}==pin
    current=(ROOT/'server'/name).read_bytes()
    if name in COUNTS:
        assert old.count(PREFIX)==COUNTS[name]
        lines=old.splitlines(keepends=True);newlines=current.splitlines(keepends=True)
        assert len(lines)==len(newlines)
        proofs=[];factory_names=[];comment_count=factory_count=0
        for index,line in enumerate(lines):
            if PREFIX not in line:continue
            assert line.count(PREFIX)==1
            if re.fullmatch(rb'// '+re.escape(PREFIX)+rb'[^\r\n]+\n',line):
                shape='comment';comment_count+=1
                assert index+1<len(lines)
            else:
                assert re.fullmatch(rb'  "'+re.escape(PREFIX)+rb'[^"\r\n]+"\([^\r\n]*\) \{\n',line)
                assert index>0 and re.fullmatch(rb'var require_[\w$]+ = __commonJS\(\{\n',lines[index-1])
                assert lines[index-2]==b'// '+line.split(b'"')[1]+b'\n'
                shape='factory';factory_count+=1
                factory_names.append(lines[index-1].decode().strip())
            derived_line=line.replace(PREFIX,REPLACEMENT)
            assert newlines[index]==derived_line
            proofs.append({'line':index+1,'shape':shape,'old':line.decode().rstrip('\n'),'new':derived_line.decode().rstrip('\n'),'factory_declaration':lines[index-1].decode().strip() if shape=='factory' else lines[index+1].decode().strip()})
        assert comment_count+factory_count==COUNTS[name]
        derived=old.replace(PREFIX,REPLACEMENT)
        assert PREFIX not in derived and derived==current
        old_helper=re.search(rb'var __commonJS = \(cb, mod\) => function __require\(\) \{\n.*?\n\};\n',old,re.S).group()
        new_helper=re.search(rb'var __commonJS = \(cb, mod\) => function __require\(\) \{\n.*?\n\};\n',current,re.S).group()
        assert old_helper==new_helper
        assert b'cb[__getOwnPropNames(cb)[0]]' in old_helper
        assert b'var __getOwnPropNames = Object.getOwnPropertyNames;' in old
        assert b'var __getOwnPropNames = Object.getOwnPropertyNames;' in current
        helpers[name]={'sha256':sha(old_helper),'unchanged':True,'helper_source':old_helper.decode(),'factory_variables_unchanged':factory_names}
        expected[name]={'bytes':len(derived),'sha256':sha(derived)}
        context_proofs[name]={'occurrences':len(proofs),'comment_count':comment_count,'factory_count':factory_count,'every_context':proofs}
        runtime.append({'path':name,'old':pin,'derived_new':expected[name],'actual_matches_derived':True,'prefix_occurrences':len(proofs)})
    else:
        assert current==old,name+' unrelated approved runtime bytes changed'
    assert {'bytes':len(current),'sha256':sha(current)}==expected[name]
observed_paths=[]
for p in sorted((ROOT/'server').rglob('*')):
    assert not p.is_symlink()
    if p.is_file():observed_paths.append(p.relative_to(ROOT/'server').as_posix())
assert set(observed_paths)==set(expected) and len(observed_paths)==34
original_map=json.loads(Path('/tmp/pali325-nov26/entry/ADAPTATION_PROPOSAL.json').read_text())['current_and_original_source_tree_exact']
assert len(original_map)==107
source_proofs={}
extra=['scripts/build.mjs','tests/helpers/source-note-baseline.mjs','tests/helpers/apadana-intake-expectations.mjs','tests/source-notes-baseline-projection.test.mjs']
for name in sorted(set(original_map)|set(extra)):
    old=git(name);current=(ROOT/name).read_bytes()
    if name in original_map:assert sha(old)==original_map[name]
    assert current==old,'Source/helper changed: '+name
    source_proofs[name]={'sha256':sha(old),'bytes':len(old),'current_equals_original_git6555':True}
modes={}
for name in COUNTS:
    p=ROOT/'server'/name
    entry=subprocess.check_output(['git','ls-tree',OLD,'server/'+name],cwd=ROOT,text=True).strip()
    modes[name]={'original_git_mode':entry.split()[0],'current_filesystem_mode':oct(stat.S_IMODE(p.stat().st_mode)),'mode_is_separate_from_content_inventory':True}
write('CANONICAL_RUNTIME_INVENTORY.json',{'schema':'reviewed-current325-canonical-runtime-inventory-v1','baseline_commit':OLD,'old_runtime_authority_sha256':AUTH_SHA,'derivation':'For three named CJS files only, replace exact UTF-8 literal ../pali-thera292-299-local/node_modules/ with node_modules/. Every old occurrence must be an approved comment or immediately declared __commonJS factory method key. Other31 files unchanged.','files':expected})
write('EVERY_CONTEXT_PROOF.json',context_proofs)
write('SOURCE_HELPER_EQUIVALENCE.json',source_proofs)
write('FACTORY_HELPER_EQUIVALENCE.json',helpers)
write('CANONICAL_BUILD_REVIEW.json',{'schema':'independent325-canonical-build-review-v1','status':'GO_EXACT_RESTRICTED_THREE_CJS_PATH_CANONICALIZATION_ONLY','old_commit':OLD,'current_head':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'old_runtime_authority':str(AUTH),'old_runtime_authority_sha256':AUTH_SHA,'expected_inventory_derived_from_old_sealed_git_bytes':True,'current_runtime_not_used_as_expectation':True,'runtime_paths':34,'changed_paths':3,'unchanged_paths':31,'changes':runtime,'source_equivalence':{'prior_source_map_files':107,'total_with_extra_build_baseline_helpers':len(source_proofs),'all_current_equal_original_git6555':True},'semantics':'Each replacement is either a line comment or the single method-name key immediately after a var require_* = __commonJS({ declaration. Factory variable declarations, body bytes, callsites and __commonJS helper remain identical. The helper enumerates the first own property of its singleton callback object and invokes that value; it does not look up a fixed pathname. Renaming that key and its comment does not change selected callable or module export/cache behavior. Diagnostic function names/stack labels can differ; no general JavaScript observational-equivalence claim is made.','corpus_data_wording':'All approved data files, source-note sidecar, compiled web assets and every other runtime path match old325 authority exactly; no source/English wording or bundled content is added.','modes':modes,'mode_comment':'Original Git tracks http/index100755 and worker100644. Current filesystem permissions are reported separately; historical checkout0700 and archive metadata are not content or runtime-behavior equivalence evidence. Regenerated755 entrypoints retain Git executable identity.','contexts':{'file':'EVERY_CONTEXT_PROOF.json','sha256':sha((OUT/'EVERY_CONTEXT_PROOF.json').read_bytes())},'source_helpers':{'file':'SOURCE_HELPER_EQUIVALENCE.json','sha256':sha((OUT/'SOURCE_HELPER_EQUIVALENCE.json').read_bytes())},'factory_helpers':{'file':'FACTORY_HELPER_EQUIVALENCE.json','sha256':sha((OUT/'FACTORY_HELPER_EQUIVALENCE.json').read_bytes())},'new_inventory':{'file':'CANONICAL_RUNTIME_INVENTORY.json','sha256':sha((OUT/'CANONICAL_RUNTIME_INVENTORY.json').read_bytes())},'limits':['Static byte/context review only; no test/build/app import/server/network/Git mutation performed.','Fresh canonical archive/install, strict installed widget equality, source-required tests and exact-SHA platformCI remain required.','Review approves a new sealed proof chain preserving original325 authority; it does not authorize replacing old authority or restoring workspace-local prefixes.']})
print(json.dumps({'status':'GO','changed':3,'unchanged':31,'source_files':len(source_proofs),'review_sha256':sha((OUT/'CANONICAL_BUILD_REVIEW.json').read_bytes())}))
