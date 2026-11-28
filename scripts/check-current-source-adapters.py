#!/usr/bin/env python3
"""Exercise both genuine legacy source-metadata adapters from reviewed helper pins.

Ordinary CI uses its pinned V5 index. Before a final index exists, developers may
supply an explicit independently reviewed support contract and its raw SHA. This
is not a generator for the drivers' full installed/browser contract receipts.
"""
import argparse
from copy import deepcopy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import tempfile

ROOT=Path(__file__).absolute().parents[1]
HELPERS=('tests/helpers/current-apadana.mjs','tests/helpers/intake380-metadata.mjs',
         'tests/helpers/intake382-metadata.mjs')
DRIVERS=('scripts/web-reader-thera371-378-seven-check.py',
         'scripts/web-reader-thera381-386-five-check.py')
sha=lambda b:hashlib.sha256(b).hexdigest()


def require(ok,code):
    if not ok:raise ValueError(code)


def physical(root):
    require(type(root) is type(Path('.')),'EXACT_NATIVE_SOURCE_ROOT')
    require('..'not in root.parts,'NO_PARENT_SOURCE_ALIAS')
    root=root.absolute()
    for p in [root,*root.parents]:
        require(not p.is_symlink()and p.is_dir(),'PHYSICAL_SOURCE_ROOT')
    return root


def regular(root,name):
    require(type(name)is str and re.fullmatch('[a-zA-Z0-9_./-]+',name)is not None and
            name and not name.startswith('/')and all(x not in('','..','.')for x in name.split('/')),
            'FIXED_RELATIVE_SOURCE_PATH')
    p=root
    for i,part in enumerate(name.split('/')):
        p=p/part;require(not p.is_symlink(),'NO_SOURCE_COMPONENT_ALIAS')
        require(p.is_file()if i==len(name.split('/'))-1 else p.is_dir(),'REGULAR_SOURCE_COMPONENT')
    return p.read_bytes()


def decode(raw):
    require(len(raw)<=2*1024*1024,'BOUNDED_METADATA_CONTRACT')
    def unique(items):
        out={}
        for key,value in items:
            require(key not in out,'DUPLICATE_METADATA_KEY');out[key]=value
        return out
    return json.loads(raw,object_pairs_hook=unique)


def support_pins(root,reviewed=None,reviewed_sha=None):
    if reviewed is not None:
        require(type(reviewed_sha)is str and re.fullmatch('[a-f0-9]{64}',reviewed_sha)is not None,
                'REVIEWED_SUPPORT_RAW_SHA_REQUIRED')
        raw=reviewed.read_bytes();require(sha(raw)==reviewed_sha,'EXACT_REVIEWED_SUPPORT_CONTRACT')
        source=decode(raw)
        require(type(source)is dict and set(source)=={'schema','helpers'}and
                source['schema']=='reviewed-current-source-adapter-support-v1','CLOSED_SUPPORT_CONTRACT')
        pins=source['helpers']
    else:
        workflow=regular(root,'.github/workflows/check.yml').decode('utf-8')
        paths=re.findall(r'^  CI_TEST_BASELINE_INDEX: (.+)$',workflow,re.M)
        hashes=re.findall(r'^  CI_TEST_BASELINE_SHA: ([a-f0-9]{64})$',workflow,re.M)
        require(len(paths)==len(hashes)==1,'ONE_PINNED_CURRENT_INDEX')
        for env,wanted in [('CI_TEST_BASELINE_INDEX',paths[0]),('CI_TEST_BASELINE_SHA',hashes[0])]:
            require(env not in os.environ or os.environ[env]==wanted,'EXACT_CI_BASELINE_ENV')
        raw=regular(root,paths[0]);require(sha(raw)==hashes[0],'EXACT_CURRENT_INDEX_RAW_SHA')
        source=decode(raw);require(source.get('schema')=='reviewed-ci-test-baseline-v5','EXISTING_V5_SUPPORT_AUTHORITY')
        supports=source['supporting_sources'];require(all(p in supports for p in HELPERS),'LIVE_FACADE_DIRECT_SUPPORT_REQUIRED')
        pins={p:supports[p]for p in HELPERS}
    require(type(pins)is dict and set(pins)==set(HELPERS),'EXACT_THREE_HELPER_IDENTITIES')
    for name,pin in pins.items():
        require(type(pin)is str and re.fullmatch('[a-f0-9]{64}',pin)is not None,'TYPED_HELPER_SHA')
        require(sha(regular(root,name))==pin,'EXACT_HELPER_SOURCE_BYTES')
    return dict(sorted(pins.items()))


def contract(root,pins):
    return {'source_root':str(root),'qa_source_closure':dict(pins)}


def checked_module(root,name,pins):
    # Authenticate the actual driver before executing its definitions. The live
    # facade is directly pinned above; read its one closed map digest, no imports.
    facade=regular(root,HELPERS[0]).decode('utf-8')
    digest=re.findall(r"export const CURRENT_SOURCE_SHA='([a-f0-9]{64})';",facade)
    require(len(digest)==1,'SEALED_LIVE_SOURCE_MAP_REQUIRED')
    raw=regular(root,'docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json')
    require(sha(raw)==digest[0],'EXACT_LIVE_MAP_FROM_TRUSTED_FACADE')
    manifest=decode(raw);row=manifest['files'][name];body=regular(root,name)
    require(row=={'bytes':len(body),'sha256':sha(body)},'EXACT_PROTECTED_LEGACY_DRIVER')
    spec=importlib.util.spec_from_file_location('reviewed_'+Path(name).stem.replace('-','_'),root/name)
    module=importlib.util.module_from_spec(spec)
    exec(compile(body,str(root/name),'exec'),module.__dict__)
    return module


def check(root,pins):
    results=[]
    with tempfile.TemporaryDirectory(prefix='pali-current-adapters-')as owned:
        stage=Path(owned)
        for name in DRIVERS:
            module=checked_module(root,name,pins);good=contract(root,pins)
            observed=module.source_metadata(good,stage)
            require(type(observed)is dict and type(observed.get('ids'))is list,'GENUINE_ADAPTER_METADATA')
            negatives=[]
            for kind in ('missing-helper','extra-helper','wrong-helper-type',*HELPERS):
                bad=deepcopy(good)
                if kind=='missing-helper':bad['qa_source_closure'].pop(HELPERS[0])
                elif kind=='extra-helper':bad['qa_source_closure']['tests/helpers/unreviewed.mjs']='0'*64
                elif kind=='wrong-helper-type':bad['qa_source_closure']=None
                else:bad['qa_source_closure'][kind]='0'*64
                try:module.source_metadata(bad,stage)
                except (ValueError,TypeError,AttributeError,AssertionError,FileNotFoundError):pass
                else:raise ValueError('MALFORMED_SOURCE_METADATA_CONTRACT_ACCEPTED')
                negatives.append(kind)
            results.append({'driver':name,'driver_sha256':sha(regular(root,name)),
                            'source_metadata_positive':True,'negative_contract_controls':negatives,
                            'declared_ids':len(observed['ids']),
                            'actual_server_or_installed_browser_execution':False})
    return results


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root',type=Path,default=ROOT)
    parser.add_argument('--reviewed-support-contract',type=Path)
    parser.add_argument('--reviewed-support-sha')
    args=parser.parse_args()
    try:
        root=physical(args.source_root)
        pins=support_pins(root,args.reviewed_support_contract,args.reviewed_support_sha)
        results=check(root,pins)
        print(json.dumps({'schema':'current-source-adapter-preflight-v1','status':'PASS',
                          'contract_keys':['source_root','qa_source_closure'],
                          'helper_pins':pins,'adapters':results,
                          'full_installed_contracts_generated':False},separators=(',',':')))
    except Exception as error:
        print(json.dumps({'schema':'current-source-adapter-preflight-v1','status':'FAIL',
                          'error_type':type(error).__name__,
                          'error_code_sha256':sha(str(error).encode('utf-8','replace'))},separators=(',',':')))
        raise SystemExit(1)


if __name__=='__main__':main()
