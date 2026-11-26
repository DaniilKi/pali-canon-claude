"""Independent deterministic input binding and two-field-only expected object.
No candidate parallels/build outputs are read; source metadata + frozenDD only.
"""
from pathlib import Path
import copy,gzip,hashlib,io,json,zlib
E=Path('/tmp/pali-next-ten-evidence-nov26');out=E/'parallels-independent'
sha=lambda b:hashlib.sha256(b).hexdigest()
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode('utf-8')
source=E/'input/canon.json.gz';packed=source.read_bytes();old_raw=gzip.decompress(packed)
assert sha(old_raw)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
canon=json.loads(old_raw);assert compact(canon)==old_raw;assert len({u['id'] for u in canon['units']})==len(canon['units'])==8544
new_raw=(E/'source-oracle/NEW_TEN_RECORDS.json').read_bytes();assert sha(new_raw)=='c0a008965acd462b45dcf35eaf8e19abd6246f36a9c64fbb4cab5d4fd16962b0';new=json.loads(new_raw)
future=dict(canon,units=[new.get(u['id'],u) for u in canon['units']]);future_raw=compact(future)
assert sha(future_raw)=='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
def pack(raw):
 target=io.BytesIO()
 with gzip.GzipFile(filename='',fileobj=target,mode='wb',compresslevel=9,mtime=0) as f:f.write(raw)
 return target.getvalue()
assert pack(old_raw)==packed,'Gzip writer/old frozen byte compatibility must hold before deriving future'
future_packed=pack(future_raw)
old_path=Path('/tmp/pali-next-ten-boundaries-nov26/tests/fixtures/canon-before-next-ten/parallels.json.gz');old_bytes=old_path.read_bytes();assert sha(old_bytes)=='40cbb52a5a2dd0d41fc49f8d8e0ba4d9090abc25ca89a6fe9426a399d9c3e701';old_parallel_raw=gzip.decompress(old_bytes);old_parallel=json.loads(old_parallel_raw);assert compact(old_parallel)==old_parallel_raw
model=json.loads((out/'MODEL_REPORT.json').read_bytes());assert old_parallel['counts']['shared_stats']==dict(model['phases']['old']['stats'],links=old_parallel['counts']['shared_stats']['links'])
assert old_parallel['source']['inputs']['canon.json.gz']['sha256']==sha(packed)
expected=copy.deepcopy(old_parallel);expected['source']['inputs']['canon.json.gz']['sha256']=sha(future_packed);expected['counts']['shared_stats']['candidate_pairs']=model['phases']['new']['stats']['candidate_pairs'];expected_raw=compact(expected)
with (out/'DD_PARALLELS_BASELINE.json.gz').open('xb') as f:f.write(old_bytes)
with (out/'DD_PARALLELS_BASELINE.json').open('xb') as f:f.write(old_parallel_raw)
with (out/'EXPECTED_PARALLELS_TWO_FIELD_DELTA.json').open('xb') as f:f.write(expected_raw)
binding={'schema':'source-only-canonical-packed-and-parallels-two-field-binding-v1','status':'INDEPENDENT_DERIVED_EXPECTATION_NOT_CANDIDATE_OUTPUT','old_canon':{'packed_bytes':len(packed),'packed_sha256':sha(packed),'logical_bytes':len(old_raw),'logical_sha256':sha(old_raw)},'new_canon':{'packed_bytes':len(future_packed),'packed_sha256':sha(future_packed),'logical_bytes':len(future_raw),'logical_sha256':sha(future_raw)},'deterministic_writer':{'type':'stdlib gzip.GzipFile','filename':'','mtime':0,'compresslevel':9,'zlib_runtime_version':zlib.ZLIB_RUNTIME_VERSION,'entire_old_repacked_bytes_equal_input':True},'old_parallels':{'file':'DD_PARALLELS_BASELINE.json.gz','bytes':len(old_bytes),'sha256':sha(old_bytes),'logical_file':'DD_PARALLELS_BASELINE.json','logical_bytes':len(old_parallel_raw),'logical_sha256':sha(old_parallel_raw)},'expected_new_parallels':{'file':'EXPECTED_PARALLELS_TWO_FIELD_DELTA.json','logical_bytes':len(expected_raw),'logical_sha256':sha(expected_raw)},'candidate_pairs':{'old':model['phases']['old']['stats']['candidate_pairs'],'new':model['phases']['new']['stats']['candidate_pairs']},'only_allowed_changes':[['source','inputs','canon.json.gz','sha256'],['counts','shared_stats','candidate_pairs']],'old_all_shared_stats_exact_model_parity':True,'canonical_unit_ids_unique':True,'all_other_parallels_fields_and_final_edges':'Expected byte-value exact frozenDD object; no final-stage algorithm executed and no actual candidate object read','no_app_imports_builder_network_Git_or_tests':True}
(out/'PACKED_AND_PARALLELS_BINDINGS.json').write_text(json.dumps(binding,indent=2)+'\n');print(json.dumps(binding,indent=2))
