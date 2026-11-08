"""Curated ATI verse excerpts: no ordinary proposal survives; activation needs pinned source verification."""
import gzip
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit
MANIFEST=Path(__file__).with_suffix('.json')

def manifest_rows(manifest=MANIFEST):
    m=json.loads(Path(manifest).read_text(encoding='utf-8'))
    if m.get('version')!=1 or not isinstance(m.get('links'),list) or not 1<=len(m['links'])<=32:
        raise ValueError('Invalid reviewed partial-page manifest')
    paths=set();owners=set()
    for r in m['links']:
        if not isinstance(r,dict):raise ValueError('Invalid partial page row')
        p=r.get('partial_scope',{})
        if not isinstance(p,dict):raise ValueError('Invalid partial scope record')
        path_match=re.fullmatch(r'/tipitaka/(?:kn/(?P<kn>thag|snp)|(?P<mn>mn))/[a-z0-9_.-]+',r.get('path',''))
        owner_pattern=(path_match['kn']+r'\d+\.\d+' if path_match and path_match['kn'] else r'mn\d+')
        if (not path_match or '..' in r['path']
                or not re.fullmatch(owner_pattern,r.get('unit_id',''))
                or r['path'] in paths or r.get('unit_id') in owners
                or r.get('license')!='Olendzki-free-distribution-2005' or r.get('translator')!='Andrew Olendzki'
                or not r.get('mapping_note') or not r.get('source_reference') or not r.get('english_title')
                or not isinstance(r.get('root'),dict) or r['root'].get('id')!=r.get('unit_id')
                or set(p)!=set(['version','status','unit_id','first_ref','last_ref','source_commit','pali_sha256','text_sha256','notice_sha256','extractor'])
                or p.get('version')!=1 or p.get('status')!='reviewed' or p.get('unit_id')!=r.get('unit_id')
                or p.get('extractor')!='ati-freeverse-v1' or p.get('source_commit')!=m.get('vri_commit')
                or any(not isinstance(v,str) or not re.fullmatch(r'[a-f0-9]{64}',v) for v in [r.get('source_html_sha256'),r['root'].get('root_blocks_sha256'),p.get('pali_sha256'),p.get('text_sha256'),p.get('notice_sha256')])):
            raise ValueError('Invalid or duplicate reviewed partial page')
        paths.add(r['path']);owners.add(r['unit_id'])
    return m

def withhold_partial_page_proposals(out,manifest=MANIFEST):
    paths={r['path'] for r in manifest_rows(manifest)['links']}
    def known(link):
        p=urlsplit(link.get('url',''))
        return ((link.get('source')=='ati' and link.get('path') in paths)
                or (p.hostname and p.hostname.removeprefix('www.')=='accesstoinsight.org' and p.path.removesuffix('.html') in paths))
    result={};removed=[]
    for owner,links in out.items():
        kept=[]
        for link in links:
            if known(link):removed.append({'unit_id':owner,'url':link.get('url')})
            else:kept.append(link)
        if kept:result[owner]=kept
    return result,removed

def reviewed_partial_links(canon,ati_root,manifest=MANIFEST):
    m=manifest_rows(manifest)
    if canon['source']['commit']!=m['vri_commit']:raise ValueError('Partial canonical source changed')
    by_id={u['id']:u for u in canon['units']};accepted={}
    for r in m['links']:
        u=by_id.get(r['unit_id']);e=r['root']
        if not u or u.get('approximate') or u.get('kind') or u.get('members'):raise ValueError('Partial owner is not an exact primary unit')
        blocks=canon['books'][u['book']]['blocks'][u['start']:u['end']]
        digest=hashlib.sha256(json.dumps(blocks,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        if any(u.get(k)!=e.get(k) for k in ['title','vri','book','start','end']) or digest!=e['root_blocks_sha256']:raise ValueError('Partial complete root changed')
        accepted[u['id']]={'source':'ati','path':r['path'],'url':'https://accesstoinsight.org'+r['path']+'.html','english':r['english_title'],
            'translator':r['translator'],'license':r['license'],'reference':r['source_reference'],'match':'reviewed-partial-page','mapping_note':r['mapping_note'],
            'review':{'ati_commit':m['ati_commit'],'vri_commit':m['vri_commit'],'source_html_sha256':r['source_html_sha256']},'partial_scope':r['partial_scope']}
    verifier=Path(__file__).with_name('verify_partial_html.mjs')
    result=subprocess.run(['node',str(verifier),str(manifest),str(ati_root)],capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise ValueError('Partial source/span/notice verification failed: '+result.stderr[-1600:])
    return accepted

def apply_reviewed_partial_links(out,canon,ati_root,manifest=MANIFEST):
    accepted=reviewed_partial_links(canon,ati_root,manifest)
    result,removed=withhold_partial_page_proposals(out,manifest)
    for owner,link in accepted.items():result.setdefault(owner,[]).append(link)
    return result,{'owners':list(accepted),'page_bindings_replaced':removed}

if __name__=='__main__':
    if len(sys.argv)!=5 or sys.argv[2]==sys.argv[4]:raise SystemExit('Usage: reviewed_partial_pages.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT OUTPUT.json')
    ci,ti,root,output=sys.argv[1:];canon=json.load(gzip.open(ci,'rt',encoding='utf-8'))
    out,report=apply_reviewed_partial_links(json.loads(Path(ti).read_text(encoding='utf-8')),canon,root)
    Path(output).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8');print(json.dumps(report))
