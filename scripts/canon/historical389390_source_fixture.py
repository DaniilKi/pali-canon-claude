#!/usr/bin/env python3
"""Create one authentic F3 packed source fixture after strict actual883d validation.

Stdlib only. No app/parser/test imports, network, recompression, English text,
current runtime/data mutation or release approval. The three already-fetched H
Git blobs are source witnesses, not a new historical runtime tree.
"""
import argparse
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess

ROOT=Path(__file__).absolute().parents[2]
H='4e9287bd5ebc78aba4b185b017e63eac6547bfd7'
SOURCE='2d134ff9ef60f70a1eb03c9370580228811a3070'
CURRENT='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
F3='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
PACKED='641c6f510431c3c681c74c24d36eef43af87b7ffe135d14fc0c19560f196e793'
OLD={'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11067, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–43', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11067, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '44–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}}
NEW={'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11063, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–42', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}, 'index_revision': 'apadana-thera389-390-v1'}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11063, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '43–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}, 'index_revision': 'apadana-thera389-390-v1'}}
H_ROWS={'server/data/canon.json.gz.part-0001': {'path': 'server/data/canon.json.gz.part-0001', 'bytes': 4194304, 'sha256': '526ba969d0fc3ce62fde7d11764313de43b91a2f71375d602cd647a43b601632', 'git_blob': '40a2779daf3f812e406ae96bb5d3fd70976185f1', 'mode': '100644'}, 'server/data/canon.json.gz.part-0002': {'path': 'server/data/canon.json.gz.part-0002', 'bytes': 1367692, 'sha256': '54bb0f581aff105d57b2270cdd2ca59821c722792ffae2c8a40486782c300cf4', 'git_blob': '4cde3956d793765b654c3857dcbbd9b485eb8439', 'mode': '100644'}, 'server/data/canon.json.gz.parts.json': {'path': 'server/data/canon.json.gz.parts.json', 'bytes': 455, 'sha256': '388a5daaf3a2cf7739b96dc865dbe93455e7e7b268bc22a683c1377180bfa250', 'git_blob': 'acad073edf27e22b864cea9e993ea883f34e84d1', 'mode': '100644'}}
sha=lambda raw:hashlib.sha256(raw).hexdigest()
compact=lambda value:json.dumps(value,ensure_ascii=False,separators=(',',':')).encode('utf-8')

def require(condition,label):
    if not condition:raise ValueError(label)

def physical(path,leaf_file=False):
    require('..'not in path.parts,'Parent traversal is not a source-fixture input')
    path=path.absolute()
    for item in reversed([path,*path.parents]):
        mode=item.lstat().st_mode
        require(not stat.S_ISLNK(mode),'Physical source-fixture paths required')
        require(stat.S_ISREG(mode)if item==path and leaf_file else stat.S_ISDIR(mode),'Unexpected source-fixture path type')
    return path

def exact_git_rows():
    # The workflow has already fetched H. Disable lazy fetch: no new network.
    env={k:v for k,v in os.environ.items()if not k.startswith('GIT_')};env['GIT_NO_LAZY_FETCH']='1'
    run=subprocess.run(['git','-C',str(ROOT),'ls-tree','-r','-z',H,'--',*H_ROWS],capture_output=True,check=True,timeout=20,env=env)
    found={}
    for item in run.stdout.split(b'\0'):
        if not item:continue
        meta,name=item.split(b'\t',1);mode,kind,oid=meta.decode('ascii').split();name=name.decode('ascii')
        require(name in H_ROWS and name not in found,'Unexpected H source witness path')
        expected=H_ROWS[name];require(mode==expected['mode']and kind=='blob'and oid==expected['git_blob'],'H source witness tree identity changed');found[name]=oid
    require(set(found)==set(H_ROWS),'Exact three H source witness rows required')
    command=('\n'.join(H_ROWS[name]['git_blob']for name in H_ROWS)+'\n').encode()
    run=subprocess.run(['git','-C',str(ROOT),'cat-file','--batch'],input=command,capture_output=True,check=True,timeout=20,env=env)
    require(len(run.stdout)<=sum(row['bytes']for row in H_ROWS.values())+600,'Unexpected H source witness output size')
    values={};offset=0
    for name,row in H_ROWS.items():
        end=run.stdout.find(b'\n',offset);require(end>=0,'Incomplete H source witness header');header=run.stdout[offset:end].decode('ascii').split();require(header==[row['git_blob'],'blob',str(row['bytes'])],'Unexpected H source witness object')
        offset=end+1;raw=run.stdout[offset:offset+row['bytes']];offset+=row['bytes'];require(run.stdout[offset:offset+1]==b'\n','Incomplete H source witness body');offset+=1
        require(len(raw)==row['bytes']and sha(raw)==row['sha256']and hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==row['git_blob'],'H source witness bytes changed');values[name]=raw
    require(offset==len(run.stdout),'Trailing H source witness bytes');return values

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--canon',required=True,type=Path);parser.add_argument('--out',required=True,type=Path);args=parser.parse_args()
    source=physical(args.canon,True);require('..'not in args.out.parts,'Parent traversal output refused');out=args.out.absolute();physical(out.parent)
    require(not out.exists()and not out.is_symlink(),'Fresh source fixture output directory required')
    require(not out.is_relative_to(ROOT)or out.is_relative_to(ROOT/'.fixtures'),'Source fixture must be external or inside the explicit untracked fixtures tree')
    raw=source.read_bytes();logical=gzip.decompress(raw)if raw[:2]==b'\x1f\x8b'else raw
    require(sha(logical)==CURRENT,'Exact actual883d canonical input required before historical source materialization')
    current=json.loads(logical);require(current['source']['commit']==SOURCE and len(current['books'])==61 and len(current['units'])==8544,'Actual source corpus identity changed')
    ids=[unit['id']for unit in current['units']];require(len(set(ids))==8544,'Duplicate canonical IDs')
    selected={unit['id']:unit for unit in current['units']if unit['id']in NEW}
    typed=lambda value:json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))
    require(typed(selected)==typed(NEW),'Exact complete typed new pair required')
    historical=copy.deepcopy(current)
    for index,unit in enumerate(historical['units']):
        if unit['id']in OLD:historical['units'][index]=copy.deepcopy(OLD[unit['id']])
    historical_logical=compact(historical);require(sha(historical_logical)==F3,'Detached two-record historical source fixture differs from exactF3')
    values=exact_git_rows();packed=values['server/data/canon.json.gz.part-0001']+values['server/data/canon.json.gz.part-0002'];manifest=json.loads(values['server/data/canon.json.gz.parts.json'])
    require(manifest['version']==1 and manifest['size']==len(packed)and manifest['sha256']==PACKED and sha(packed)==PACKED,'Authentic historical source gzip differs')
    require(gzip.decompress(packed)==historical_logical,'Historical physical witness must equal the exact detached source inverse')
    # Only the fresh owned output is created; input/server data are never opened for writing.
    out.mkdir(mode=0o700);physical(out)
    output=out/'canon.json.gz'
    flags=os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,'O_NOFOLLOW',0)
    fd=os.open(output,flags,0o600)
    with os.fdopen(fd,'wb')as stream:stream.write(packed)
    require(output.read_bytes()==packed,'Source gzip output readback differs')
    receipt={'schema':'boundary389390-historical-source-gzip-fixture-v1','actual_input_canonical_sha256':CURRENT,'historical_source_canonical_sha256':F3,'historical_source_compressed_sha256':PACKED,'historical_commit':H,'historical_physical_paths':list(H_ROWS),'source_fixture':str(output),'actual_input':{'path':str(source),'bytes':len(raw),'sha256':sha(raw)},'three_rows_only':True,'recompressed':False,'source_only':True,'installed_data_modified':False,'private_data_accessed':False,'behavioral_or_release_approval':False}
    with(out/'SOURCE_FIXTURE_RECEIPT.json').open('x',encoding='utf-8')as stream:json.dump(receipt,stream,indent=2);stream.write('\n')
    print(json.dumps(receipt))

if __name__=='__main__':main()
