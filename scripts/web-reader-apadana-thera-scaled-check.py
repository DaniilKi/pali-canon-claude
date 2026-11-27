#!/usr/bin/env python3
"""Bounded scaled Therā acceptance against independent source receipts and actual MCP.

Publisher bytes stay in the external pinned checkout. Device/host emulation is not
physical-device, signed-in host, human assistive, specialist or rights approval.
"""
import argparse
import copy
import gzip
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.request
from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool
from web_reader_apadana_intake import reviewed_intake
from canon.apadana_thera_pair_spans import canon_before_thera_pair
from web_reader_four_boundary_history import canon_before_four

ROOT = Path(__file__).resolve().parents[1]
HARNESS_SHA256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
HELPER_SHA256 = {name:hashlib.sha256((ROOT/'scripts'/name).read_bytes()).hexdigest() for name in ('web-reader-apadana-thera-expansion-check.py','web_reader_test_helpers.py')}
spec = importlib.util.spec_from_file_location('d249', ROOT / 'scripts/web-reader-apadana-thera-expansion-check.py')
engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
digest, compact = engine.digest, engine.compact
BASE = '64a336789ab5f4f02964ff3023ea6b26b330e406'
# Filled only from independently approved committed source receipts, never runtime.
GROUPS = {
    '61-80': ('THERA_SEVENTH_GOLDENS.json', 'THERA_EIGHTH_GOLDENS.json'),
    '81-100': ('THERA_NINTH_GOLDENS.json', 'THERA_TENTH_GOLDENS.json'),
    'held42': ('THERA_EDITORIAL_GAP_GOLDENS.json',),
    '61-70': ('THERA_SEVENTH_GOLDENS.json',),
    '71-80': ('THERA_EIGHTH_GOLDENS.json',),
    '81-90': ('THERA_NINTH_GOLDENS.json',),
    '91-100': ('THERA_TENTH_GOLDENS.json',),
}
GOLDEN_PINS = {
    'THERA_NINTH_GOLDENS.json': '070286aa013457d7bd387121945b8b720b83f1aeb1f6a788409594535de712f5',
    'THERA_TENTH_GOLDENS.json': '2bbc739ecb97d198ecc0e4f6d599569bc846c74e03744367c649d3e87309db89',
    'THERA_EDITORIAL_GAP_GOLDENS.json': '1aa8fadf962964ddf1ee2faefa86bcf3914944337ba61b7e2214600170210ac8',
    'THERA_SEVENTH_GOLDENS.json': '7071e9ceaa4475a974b30ee7afa43cd8f5186c30e198e8290752b340972fca68',
    'THERA_EIGHTH_GOLDENS.json': '4297ca598c8f0b78176f5e74cf158a581ce173a022f9c070ce3d8f9cce044d8b',
}
PRIVATE = 'SYNTHETIC_PRIVATE_SCALED_ā😀'


def git_bytes(path):
    return subprocess.check_output(['git', 'show', BASE + ':' + path], cwd=ROOT, stderr=subprocess.DEVNULL)


def baseline():
    manifest = json.loads(git_bytes('server/data/apadana.json'))
    try:
        raw = git_bytes('server/data/canon.json.gz')
    except subprocess.CalledProcessError:
        parts = json.loads(git_bytes('server/data/canon.json.gz.parts.json'))
        raw = b''.join(git_bytes('server/data/' + (p if isinstance(p, str) else p['file'])) for p in parts['parts'])
    return manifest, json.loads(gzip.decompress(raw))


def mutations(whole):
    """Every new owned apparatus gets malformed-owner/order/pin/extra-key controls."""
    uid = next(iter(whole))
    patches = [(uid, k, v) for k, v in (
        ('revision', {'translation_revision': '0'*40}), ('owner', {'text_id': 'thi-ap1'}),
        ('raw pin', {'raw_sha256': '0'*64}), ('root pin', {'root_sha256': '0'*64}),
        ('body pin', {'body_sha256': '0'*64}), ('notes pin', {'notes_sha256': '0'*64}),
        ('paratext pin', {'paratext_sha256': '0'*64}), ('fetched URL', {'fetched_url':'https://example.invalid/'}),
        ('terms', {'license': 'CC BY 4.0'}), ('license URL', {'license_url': 'https://example.invalid/'}),
        ('attribution', {'attribution': ''}), ('changes', {'changes': ''}),
        ('mapping notices', {'mapping_notes': []}), ('visible notices', {'notes': []}),
        ('all notices', {'mapping_notes': [], 'notes': []}))]
    empty_preface_uid = next((uid for uid,data in whole.items() if not data.get('publisher_paratext')),None)
    for uid, data in whole.items():
        if data.get('publisher_paratext') or uid == empty_preface_uid:
            patches.append((uid,'publisher preface wording',{'publisher_paratext':'SYNTHETIC altered publisher preface'}))
        for key in ('publisher_preface', 'chapter_summary', 'collection_summary', 'editorial_gap', 'publisher_divisions'):
            value = data.get(key)
            if not value:
                continue
            items = value if isinstance(value, list) else [value]
            def wrap(item):
                return {key: [item] + items[1:] if isinstance(value, list) else item}
            patches.append((uid, key + ' missing', {key: [] if isinstance(value, list) else None}))
            original = items[0]
            for field in original:
                old = original[field]
                bad = (([] if old else [999]) if isinstance(old, list) else -1 if isinstance(old, int) else 'invalid')
                if field == 'translator_notes':
                    bad = [{'number': 999, 'text': 'SYNTHETIC wrong scope'}]
                patches.append((uid, key + ' ' + field, wrap({**original, field: bad})))
            if original.get('translator_notes'):
                changed_notes = [{**n,'text':'SYNTHETIC changed owned note'} if i == 0 else n for i,n in enumerate(original['translator_notes'])]
                patches.append((uid,key+' same shape note wording',wrap({**original,'translator_notes':changed_notes})))
            patches.append((uid, key + ' extra key', wrap({**original, 'unexpected': True})))
            foreign = data['translator_notes'] if data['translator_notes'] != original.get('translator_notes') else [{'number':999,'text':'SYNTHETIC foreign note'}]
            patches.append((uid, key + ' foreign note', wrap({**original, 'translator_notes': foreign})))
    for uid,label,patch in patches:
        assert any(whole[uid].get(k) != value for k,value in patch.items()), 'No-op mutation: '+label
    return patches


def _baseline_profile_probe_diagnostic(result, elapsed_ms, error):
    """Pure bounded metadata, never captured text, messages, profiles or loop uid."""
    run = result if type(result) is subprocess.CompletedProcess else None
    stdout = run.stdout if run is not None else None
    stderr = run.stderr if run is not None else None
    def stream(value):
        if type(value) is str:
            value = value.encode('utf-8', errors='surrogatepass')
        if type(value) is not bytes:
            return None, None
        return len(value), hashlib.sha256(value).hexdigest()
    stdout_bytes, stdout_sha = stream(stdout)
    stderr_bytes, stderr_sha = stream(stderr)
    rc = run.returncode if run is not None and type(run.returncode) is int else None
    error_name = type(error).__name__
    allowed_python = {'AssertionError', 'JSONDecodeError', 'KeyError', 'TypeError',
                      'ValueError', 'UnicodeDecodeError', 'FileNotFoundError',
                      'PermissionError', 'OSError', 'CalledProcessError', 'TimeoutExpired'}
    python_class = error_name if error_name in allowed_python else 'other'
    if run is None:
        kind = 'probe-no-completed-result'
    elif rc is not None and rc != 0:
        kind = 'node-nonzero-returncode'
    elif python_class == 'JSONDecodeError':
        kind = 'probe-receipt-json'
    elif python_class in ('KeyError', 'TypeError'):
        kind = 'probe-receipt-shape'
    elif python_class == 'AssertionError':
        kind = 'probe-receipt-assertion'
    else:
        kind = 'probe-result-unknown'
    text = stderr if type(stderr) is str else stderr.decode('utf-8', errors='replace') if type(stderr) is bytes else ''
    truncated = len(text) > 8192
    scan = text[:4096] + '\n' + text[-4095:] if truncated else text
    allowed_classes = {'Error', 'AssertionError', 'SyntaxError', 'TypeError',
                       'ReferenceError', 'RangeError', 'URIError', 'EvalError'}
    allowed_codes = {'ERR_ASSERTION', 'ERR_MODULE_NOT_FOUND', 'MODULE_NOT_FOUND',
                     'ERR_PACKAGE_PATH_NOT_EXPORTED', 'ERR_REQUIRE_ESM',
                     'ERR_UNKNOWN_FILE_EXTENSION', 'ERR_INPUT_TYPE_NOT_ALLOWED',
                     'ERR_INVALID_ARG_TYPE', 'ERR_INVALID_MODULE_SPECIFIER',
                     'ERR_UNSUPPORTED_DIR_IMPORT', 'ERR_UNSUPPORTED_ESM_URL_SCHEME',
                     'ERR_WORKER_OUT_OF_MEMORY', 'ERR_BUFFER_TOO_LARGE',
                     'ENOENT', 'EACCES', 'ENOMEM', 'EPIPE', 'ETIMEDOUT'}
    classes, codes = set(), set()
    for line in scan.splitlines():
        header = re.match(r'^(Error|[A-Za-z]+Error)(?: \[([A-Z][A-Z0-9_]{0,63})\])?:', line)
        if header:
            if header[1] in allowed_classes: classes.add(header[1])
            if header[2] in allowed_codes: codes.add(header[2])
        code = re.fullmatch(r"\s{0,8}code: ['\"]([A-Z][A-Z0-9_]{0,63})['\"],?\s{0,4}", line)
        if code and code[1] in allowed_codes: codes.add(code[1])
    return {'schema': 'baseline-profile-probe-diagnostic-v1',
            'phase': 'baseline-profile-probe', 'failure_kind': kind,
            'returncode': rc, 'signal_number': -rc if rc is not None and rc < 0 else None,
            'elapsed_ms': round(elapsed_ms, 3) if type(elapsed_ms) in (int, float) and 0 <= elapsed_ms <= 86400000 else None,
            'stdout_utf8_bytes': stdout_bytes, 'stdout_sha256': stdout_sha,
            'stderr_utf8_bytes': stderr_bytes, 'stderr_sha256': stderr_sha,
            'python_exception_class': python_class,
            'node_error_class_hint': next(iter(classes)) if len(classes) == 1 else None,
            'node_error_code_hint': next(iter(codes)) if len(codes) == 1 else None,
            'node_error_hint_ambiguous': len(classes) > 1 or len(codes) > 1,
            'node_hint_scan_truncated': truncated}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path)
    parser.add_argument('--official-checkout',type=Path,help='Pinned Git tree for separately acquired source bytes; no lazy blob fetching')
    parser.add_argument('--server-dir', type=Path)
    parser.add_argument('--batch', choices=tuple(GROUPS), required=True)
    parser.add_argument('--report', type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--mcp-only', action='store_true')
    modes.add_argument('--a11y', action='store_true')
    parser.add_argument('--pilot', action='store_true', help='Bounded approved source; never a full-batch acceptance claim')
    parser.add_argument('--pilot-poem',type=int,help='Explicit independently approved publisher poem for a bounded apparatus pilot')
    args = parser.parse_args()
    server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
    manifest = json.loads((server_dir / 'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT / 'server/data/apadana.json').read_text())
    old, canon = baseline()
    assert len(old['links']) == 89
    for uid, row in old['links'].items():
        assert manifest['links'][uid] == row, 'Baseline source metadata changed: ' + uid
    assert {k:v for k,v in manifest['source'].items() if k != 'policy'} == {k:v for k,v in old['source'].items() if k != 'policy'}
    current_intake = reviewed_intake(ROOT)
    assert manifest['source']['policy'] == old['source']['policy'].replace('89 finite',str(len(current_intake['expected_profile_ids']))+' finite').replace('49 explicitly mapped Therā',str(sum(r['publisher_chapter']=='chapter-3' for r in current_intake['baseline_records']+current_intake['approved_records']))+' explicitly mapped Therā')
    profile_probe = """import assert from'node:assert/strict';import{APADANA_PROFILES as current}from'./src/apadana-profiles.mjs';
      let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s),url=x=>'data:text/javascript;base64,'+Buffer.from(x).toString('base64');
      const old=await import(url(p.root.replace('./apadana-thera-profiles.mjs',url(p.thera))));
      assert.equal(Object.keys(old.APADANA_PROFILES).length,89);for(const[id,row]of Object.entries(old.APADANA_PROFILES))assert.deepEqual(current[id],row,id);
      console.log(JSON.stringify({preserved:89}));"""
    profile_probe_started = time.monotonic()
    profile_run = None
    try:
        profile_run = subprocess.run(['node','--input-type=module','-e',profile_probe],cwd=ROOT,input=compact({'root':git_bytes('src/apadana-profiles.mjs').decode(),'thera':git_bytes('src/apadana-thera-profiles.mjs').decode()}),text=True,capture_output=True)
        assert profile_run.returncode == 0 and json.loads(profile_run.stdout)['preserved'] == 89, 'Baseline browser profiles changed'
    except Exception as profile_probe_error:
        try:
            diagnostic = _baseline_profile_probe_diagnostic(profile_run, (time.monotonic() - profile_probe_started) * 1000, profile_probe_error)
            encoded = json.dumps(diagnostic, ensure_ascii=True, separators=(',', ':'))
            if len(encoded.encode('utf-8')) <= 2048:
                sys.stderr.write('BASELINE_PROFILE_PROBE_DIAGNOSTIC:' + encoded + '\n')
                sys.stderr.flush()
        except Exception:
            pass  # Diagnostics must never replace the original failure.
        raise
    # Global navigation accepts only the finite independently sealed intake, in publisher order.
    intake_poems = {uid:row['poem'] for uid,row in old['links'].items()}
    for name,pin in GOLDEN_PINS.items():
        artifact = ROOT/'docs/evidence/apadana'/name
        assert hashlib.sha256(artifact.read_bytes()).hexdigest() == pin
        for poem in json.loads(artifact.read_text())['poems']:
            if poem['source_scope_decision'].startswith('APPROVE'):
                assert poem['id'] not in intake_poems
                intake_poems[poem['id']] = poem['poem']
    assert set(intake_poems).issubset(current_intake['expected_profile_ids']), 'Historical approvals not retained'
    intake_poems = {r['id']:r['poem'] for r in current_intake['baseline_records']+current_intake['approved_records']}
    assert set(manifest['links']) == set(intake_poems), 'Unreviewed source activation'
    reviewed_order = sorted((uid for uid in intake_poems if uid.startswith('tha-ap')),key=intake_poems.__getitem__)
    evidence, artifacts = [], []
    for name in GROUPS[args.batch]:
        path = ROOT / 'docs/evidence/apadana' / name
        assert name in GOLDEN_PINS and hashlib.sha256(path.read_bytes()).hexdigest() == GOLDEN_PINS[name], 'Unsealed independent receipt: ' + name
        item = json.loads(path.read_text())
        assert item['publisher_revision'] == engine.SOURCE_REVISION
        evidence.append(item)
    expected = {p['id']: p for e in evidence for p in e['poems'] if p['source_scope_decision'].startswith('APPROVE')}
    assert expected and not set(expected) & set(old['links'])
    assert len(expected) == sum(p['source_scope_decision'].startswith('APPROVE') for e in evidence for p in e['poems']), 'Duplicate approved source identities'
    summary_origins = {}
    for chapter in evidence:
        approved = [p for p in chapter['poems'] if p['source_scope_decision'].startswith('APPROVE')]
        for poem in approved:
            if poem.get('chapter_summary'):
                peers = [p['id'] for p in approved if p['id'] != poem['id']]
                if peers:summary_origins[poem['id']] = peers[0]
    rows = manifest['links']
    for e in evidence:
        for p in e['poems']:
            if not p['source_scope_decision'].startswith('APPROVE'):
                assert p['id'] not in rows, 'Held source activated'
    for uid, g in expected.items():
        row = rows[uid]
        for key in engine.PINS:
            assert row[key] == (g['root'][key] if key == 'root_sha256' else g[key])
        for key in ('poem', 'title', 'publisher_chapter', 'note_numbers', 'note_count', 'stanza_layout'):
            assert row[key] == g[key]
        assert row['path'] == '/text/' + g['path'].removeprefix('src/_poems/').removesuffix('.md') + '/'
        for key in ('chapter_summary','collection_summary','editorial_gap','publisher_divisions'):
            actual,proof = row.get(key),g.get(key)
            assert bool(actual) == bool(proof), 'Independent apparatus presence differs'
            if not proof:continue
            descriptors = actual if isinstance(actual,list) else [actual]
            proofs = proof if isinstance(proof,list) else [proof]
            for descriptor,scope in zip(descriptors,proofs,strict=True):
                if 'scope' in scope:
                    assert descriptor == scope['scope']
                for field in ('body_sha256','notes_sha256','root_sha256','first_ref','last_ref','parent_id','note_numbers','kind','label'):
                    if field in scope and field in descriptor:assert descriptor[field] == scope[field]
    checkout = args.source_root.resolve()
    official = (args.official_checkout or Path(os.environ.get('APADANA_OFFICIAL_CHECKOUT',str(checkout)))).resolve()
    git_env = {**os.environ,'GIT_NO_LAZY_FETCH':'1'}
    assert subprocess.check_output(['git', '-C', str(official), 'rev-parse', 'HEAD'], text=True,env=git_env).strip() == engine.SOURCE_REVISION
    for e in evidence:
        routing = e['publisher_routing']
        for a in [*e['rights'], *(routing if isinstance(routing, list) else [routing]), *e['poems']]:
            path = (checkout / a['path']).resolve()
            assert path.is_relative_to(checkout)
            raw = path.read_bytes()
            assert len(raw) == a['bytes'] and hashlib.sha256(raw).hexdigest() == a['raw_sha256']
            blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
            assert blob == a['git_blob_sha1']
            assert subprocess.check_output(['git', '-C', str(official), 'rev-parse', engine.SOURCE_REVISION + ':' + a['path']], text=True,env=git_env).strip() == blob
            artifacts.append({'path': a['path'], 'sha256': a['raw_sha256'], 'git_blob_sha1': blob})
    # Validate every old raw Pāli root against base64a3367, plus every selected new independent root.
    probe = """import{gunzipSync}from'node:zlib';import{readBundled}from'./src/bundled-data.mjs';
    let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s),d=JSON.parse(gunzipSync(readBundled(p)));
    console.log(JSON.stringify(d));"""
    run = subprocess.run(['node', '--input-type=module', '-e', probe], cwd=ROOT, input=json.dumps(str(server_dir/'data/canon.json.gz')), text=True, capture_output=True)
    assert run.returncode == 0
    current = json.loads(run.stdout)
    assert canon_before_thera_pair(canon_before_four(current)) == canon, 'Only independently verified atomic107/108 and333–336 metadata may differ from historical canonical snapshot'
    for uid in old['links']:
        a = next(u for u in canon['units'] if u['id'] == uid)
        b = next(u for u in current['units'] if u['id'] == uid)
        assert a == b and canon['books'][a['book']]['blocks'][a['start']:a['end']] == current['books'][b['book']]['blocks'][b['start']:b['end']]
    for uid, g in expected.items():
        u = next(u for u in current['units'] if u['id'] == uid)
        root = {'id': uid, 'book': u['book'], 'start': u['start'], 'end': u['end'], 'blocks': current['books'][u['book']]['blocks'][u['start']:u['end']]}
        assert digest(compact(root)) == g['root']['root_sha256']
    if args.pilot_poem is not None:
        assert args.pilot, '--pilot-poem requires --pilot'
        selected = {uid:g for uid,g in expected.items() if g['poem'] == args.pilot_poem}
        assert len(selected) == 1, 'Pilot source lacks finite independent approval'
        expected = selected
    elif args.pilot:
        expected = dict(list(expected.items())[:1])
    files = {}
    for uid in expected:
        row = rows[uid]
        path = (checkout / row['raw_url'].split(engine.SOURCE_REVISION + '/', 1)[1]).resolve()
        assert path.is_relative_to(checkout) and hashlib.sha256(path.read_bytes()).hexdigest() == row['raw_sha256']
        files[row['raw_url']] = str(path)
    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')
    work_root = Path('/tmp/pali-thera-scaled-browser')
    work_root.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='run-',dir=work_root) as work:
        stage = Path(work)
        ledger, preload = stage/'fetches.jsonl', stage/'provider.cjs'
        preload.write_text("const fs=require('node:fs'),files=" + json.dumps(files) + ";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);const ok=Object.hasOwn(files,url);fs.appendFileSync(" + json.dumps(str(ledger)) + ",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        server = subprocess.Popen(['node', '--require', str(preload), str(server_dir/'http.cjs')], cwd=stage, env={**os.environ, 'HOST':'127.0.0.1','PORT':str(port),'RATE_LIMIT_PER_MINUTE':'0','CHATGPT_WIDGET':'1'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        checks, receipts, scans = [], [], []
        def protocol(method, params):
            request = urllib.request.Request(base+'/mcp', data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(), headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
            with urllib.request.urlopen(request, timeout=90) as response:
                return json.load(response)['result']
        def rpc(name, arguments): return protocol('tools/call', {'name':name,'arguments':arguments})
        def tool(name, arguments):
            result = rpc(name, arguments)
            assert not result.get('isError'), 'Unexpected MCP tool error: ' + name
            return result['structuredContent']
        def source(data, uid):
            row, golden = rows[uid], expected[uid]
            assert data['text_id'] == uid and data['translation_id'] == version(uid)
            assert data['translation_revision'] == engine.SOURCE_REVISION
            assert data['url'] == row['url'] and data['fetched_url'] == row['raw_url']
            assert data['license'] == 'CC BY-NC-SA 4.0' and data['license_url'] == engine.LICENSE_URL
            assert 'Walters' in data['attribution'] and 'Whitman College' in data['attribution'] and data['changes']
            assert data['mapping_notes'] == row['mapping_notes'] and row['mapping_notes']
            assert all(note in data['notes'] for note in row['mapping_notes'])
            assert all(data[k] == row[k] for k in engine.PINS)
            assert [n['number'] for n in data['translator_notes']] == golden['note_numbers']
            assert digest(compact(data['translator_notes'])) == golden['notes_sha256']
            assert digest(data['publisher_paratext']) == golden['paratext_sha256']
            for key in ('publisher_preface', 'chapter_summary', 'collection_summary', 'editorial_gap', 'publisher_divisions'):
                contract = row.get(key)
                actual = data.get(key)
                assert bool(contract) == bool(actual)
                if contract:
                    contracts = contract if isinstance(contract, list) else [contract]
                    scopes = actual if isinstance(actual, list) else [actual]
                    for c, scope in zip(contracts, scopes, strict=True):
                        assert all(scope[k] == v for k,v in c.items())
                        assert set(scope) == set(c) | {'text','translator_notes'}
                        assert digest(scope['text']) == c['body_sha256']
                        assert digest(compact(scope['translator_notes'])) == c['notes_sha256']
        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(base+'/healthz',timeout=1).close(); break
                except OSError: time.sleep(.1)
            else: raise AssertionError('HTTP bundle startup failed')
            metadata = {uid:tool('get_text',{'uid':uid,'limit':200}) for uid in rows}
            assert not ledger.exists(), 'Metadata caused English fetch'
            for uid,meta in metadata.items():
                choices = meta['english_available']
                assert len(choices) == 1 and choices[0]['translation_id'] == version(uid)
                assert choices[0]['translation_revision'] == engine.SOURCE_REVISION and choices[0]['url'] == rows[uid]['url']
                if uid in engine.BASELINE_ROOT_SEGMENTS:
                    assert digest(compact([{k:s[k] for k in ('ref','type','text')} for s in meta['segments']])) == engine.BASELINE_ROOT_SEGMENTS[uid]
                if uid in engine.BASELINE_ROOT_RECEIPTS:
                    assert [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text'])} for s in meta['segments']] == engine.BASELINE_ROOT_RECEIPTS[uid]
                if uid in expected and 'segments' in expected[uid]['root']:
                    actual_segments = [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text'])} for s in meta['segments']]
                    golden_segments = [{k:s[k] for k in ('ref','type','text_sha256')} for s in expected[uid]['root']['segments']]
                    if actual_segments != golden_segments:
                        (stage/('segment-drift-'+uid+'.json')).write_text(compact({'actual':actual_segments,'independent':golden_segments}))
                        Path('/tmp/pali-thera-scaled-browser/segment-drift-'+uid+'.json').write_text(compact({'actual':actual_segments,'independent':golden_segments}))
                    assert actual_segments == golden_segments
            held = tool('get_text',{'uid':'tha-ap72','limit':200})
            assert not held['english_available'], 'Held publisher70 source became available'
            if 'tha-ap44' not in rows:
                assert not tool('get_text',{'uid':'tha-ap44','limit':200})['english_available'], 'Unapproved held42 source became available'
            for uid in expected:
                for request in ({'uid':uid,'translation':version(uid),'translation_revision':'0'*40}, {'uid':uid,'translation':version(uid),'offset':1,'prefix_sha256':'0'*64}, {'uid':uid,'translation':version('thi-ap1')}):
                    assert rpc('get_translation',request).get('isError')
            assert not ledger.exists(), 'Refused selector fetched English'
            whole, first, widgets = {}, {}, {}
            for uid, golden in expected.items():
                request = {'uid':uid,'translation':version(uid),'translation_revision':engine.SOURCE_REVISION,'limit':500}
                pieces = []
                while request:
                    data = tool('get_translation',request); source(data,uid)
                    first.setdefault(uid,data)
                    assert data['offset'] == len(''.join(pieces)) and len(pieces) < 150
                    pieces.append(data['text'])
                    request = data['continue_with']['arguments'] if data['continue_with'] else None
                    if request:
                        assert request['uid'] == uid and request['translation'] == version(uid)
                        assert request['translation_revision'] == engine.SOURCE_REVISION and request['prefix_sha256'] == digest(''.join(pieces))
                        assert rpc('get_translation',{**request,'prefix_sha256':'0'*64}).get('isError')
                whole[uid] = {**first[uid], 'text':''.join(pieces), 'continue_with':None}
                paragraphs = whole[uid]['text'].split('\n\n')
                assert digest(whole[uid]['text']) == golden['body_sha256']
                assert [digest(p) for p in paragraphs] == [p['sha256'] for p in golden['body_paragraphs']]
                assert [len(p.splitlines()) for p in paragraphs] == [p['lines'] for p in golden['body_paragraphs']]
                for paragraph, stanza in zip(paragraphs[1:-2],golden['stanza_layout'],strict=True):
                    assert re.sub(r'\[Note \d+\]','',paragraph).strip().endswith(stanza['suffix'])
                    assert len(paragraph.splitlines()) == stanza['lines']
                widgets[uid] = tool('read_passage_widget',{'uid':uid,'translation':version(uid),'english_translation_revision':engine.SOURCE_REVISION})
                source({**widgets[uid]['english'],'text_id':uid},uid)
                receipts.append({'uid':uid,'publisher_poem':golden['poem'],'pages':len(pieces),'paragraphs':len(paragraphs),'notes':golden['note_count'],**{k:rows[uid][k] for k in engine.PINS}})
            for uid,data in whole.items():
                gap = data.get('editorial_gap')
                if gap:
                    assert '[Note 12]' not in data['text']
                    assert [n['number'] for n in data['translator_notes']] == [n for n in range(1,14) if n != 12]
                    assert [n['number'] for n in gap['translator_notes']] == [12]
                    for label,quote in [('editorial marker',gap['text']),('editorial note',gap['translator_notes'][0]['text'])]:
                        query = {'text':quote,'language':'english','texts':[uid],'translation_ids':[version(uid)]}
                        if len(quote)<8 or len(quote)>2000 or len(re.findall(r'[^\W\d_]+',quote,re.UNICODE))>120:
                            assert rpc('verify_quote',query).get('isError')
                        else:
                            assert tool('verify_quote',query)['verdict'] == 'not_found_in_scope'
                    stanza = re.sub(r'\[Note \d+\]','',data['text'].split('\n\n')[26]).strip()
                    suffix = expected[uid]['stanza_layout'][25]['suffix']
                    assert stanza.endswith(suffix)
                    result = tool('verify_quote',{'text':stanza[:-len(suffix)].strip(),'language':'english','texts':[uid],'translation_ids':[version(uid)]})
                    assert result['verdict'] == 'found' and result['best_similarity'] == 1
            patches = mutations(whole)
            comparison = """import assert from'node:assert/strict';import{validateComparisonPage,comparisonChoices}from'./web/translation-comparison.mjs';let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s);for(const[uid,d]of Object.entries(p.first)){const choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.equal(comparisonChoices(choices,uid).length,1);validateComparisonPage(d,args,{uid,choices,accepted:null});}for(const[uid,label,patch]of p.patches){const d=p.first[uid],choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.throws(()=>validateComparisonPage({...d,...patch},args,{uid,choices,accepted:null}),label)}"""
            run = subprocess.run(['node','--input-type=module','-e',comparison],cwd=ROOT,input=compact({'first':first,'metadata':metadata,'patches':patches}),text=True,capture_output=True)
            if run.returncode:
                label = re.search(r'Missing expected exception[^\n]*',run.stderr)
                if label:Path('/tmp/pali-thera-scaled-browser/comparison-refusal-drift.json').write_text(compact({'failure':label.group(0)}))
            assert run.returncode == 0, 'Actual-response comparison mutation gate failed'
            checks.append({'check':'actual MCP body/stanzas/notes/apparatus/source/continuation and comparison validator','sources':len(expected),'mutations':len(patches),'baseline_metadata_and_raw_pali':89})
            resources = protocol('resources/list',{})['resources']
            uri = next(r['uri'] for r in resources if r['uri'].startswith('ui://pali-canon/reader-') and r['uri'].endswith('.html') and 'skybridge' not in r['uri'])
            html = protocol('resources/read',{'uri':uri})['contents'][0]['text']
            if not args.mcp_only:
                browser_checks(args,base,rows,expected,whole,metadata,widgets,html,patches,checks,scans,reviewed_order,summary_origins)
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(e['ok'] for e in events) and {e['url'] for e in events} == set(files)
            report = {'batch':args.batch,'pilot_only':args.pilot,'passed':len(checks),'checks':checks,'sources':receipts,'source_artifacts':artifacts,'publisher_revision':engine.SOURCE_REVISION,'source_review_goldens_sha256':{n:GOLDEN_PINS[n] for n in GROUPS[args.batch]},'global_intake_goldens_sha256':GOLDEN_PINS,'helper_sha256':HELPER_SHA256,'harness_sha256':HARNESS_SHA256,'server_file_sha256':{'server/'+str(p.relative_to(server_dir)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(server_dir.rglob('*')) if p.is_file()},'previous_metadata_baseline':BASE,'previous_profiles_links_pali_preserved':89,'outside_source_tree':bool(args.server_dir),'browser_mode':'not run' if args.mcp_only else 'chromium','upstream_provider_requests':0,'pinned_provider_reads':len(events),'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual packaged MCP with exact locally pinned official bytes; complete publisher-edition poems, not line-complete VRI translations. Chromium viewport and Apps SDK/MCP Apps bridge emulation only; no physical-device, signed-in host, human assistive, specialist or new rights acceptance. No live upstream availability claim. Synthetic private drafts only. Report excludes publisher wording, notes and draft bodies.'}
            assert report['a11y']['violations'] == 0
            rendered = json.dumps(report,indent=2)
            if args.report:
                args.report.parent.mkdir(parents=True,exist_ok=True); args.report.write_text(rendered+'\n')
            print(rendered)
        finally:
            server.terminate(); server.wait(timeout=10)


def browser_checks(args,base,rows,expected,whole,metadata,widgets,html,patches,checks,scans,reviewed_order,summary_origins,*,scope_captions=None):
    scope_captions = {} if scope_captions is None else scope_captions
    assert isinstance(scope_captions,dict) and not set(scope_captions)-{('tha-ap202','collection_summary')}
    assert all(isinstance(value,str) and value.endswith(' · not poem text') for value in scope_captions.values())
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        for width in (390,1280):
            for theme in ('light','dark'):
                print(compact({'phase':'viewport-start','width':width,'theme':theme}),file=sys.stderr,flush=True)
                context = browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
                old = [{'uid':'thi-ap31','title':'Preserved synthetic Therī note','ref':'thi-ap31/2','offset':1,'source_commit':metadata['thi-ap31']['source'].get('locator_revision','2d134ff9ef60f70a1eb03c9370580228811a3070'),'note':PRIVATE+' saved'}]
                initial = compact({'theme':theme,'remember_position':False,'saved':old,'reading_progress':[]})
                context.add_init_script(f'if(!localStorage.getItem({json.dumps(engine.KEY)}))localStorage.setItem({json.dumps(engine.KEY)},{json.dumps(initial)})')
                page, errors, forbidden, requests = context.new_page(), [], [], []
                page.set_default_timeout(15000)
                page.on('pageerror',lambda error:errors.append(type(error).__name__))
                page.on('dialog',lambda dialog:dialog.accept())
                state = {'drift':None}
                def intercept(route):
                    req = route.request
                    if not req.url.startswith(base+'/') or 'SYNTHETIC_PRIVATE_SCALED' in req.url or 'SYNTHETIC_PRIVATE_SCALED' in (req.post_data or '') or any('SYNTHETIC_PRIVATE_SCALED' in v for v in req.headers.values()):
                        forbidden.append('external request or private bytes');route.abort();return
                    if req.method == 'POST' and req.url.endswith('/mcp'):
                        command = req.post_data_json.get('params',{})
                        if command.get('name') == 'get_translation':
                            requests.append(command['arguments'])
                            if state['drift']:
                                response = route.fetch();content = response.json()
                                content['result']['structuredContent'].update(state['drift'])
                                route.fulfill(response=response,json=content);return
                    route.continue_()
                context.route('**/*',intercept)
                def audit(label):
                    assert not errors and not forbidden
                    assert 'SYNTHETIC_PRIVATE_SCALED' not in page.title()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    assert engine.profile(page)['saved'][:len(old)] == old
                    if args.a11y:
                        page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
                        result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                        scans.append({'width':width,'theme':theme,'state':label,'violations':[v['id'] for v in result['violations']]})
                def navigate(uid):
                    def wanted(response):
                        if response.request.method != 'POST' or not response.url.endswith('/mcp'):return False
                        command = (response.request.post_data_json or {}).get('params',{})
                        return command.get('name') == 'get_text' and command.get('arguments',{}).get('uid') == uid
                    destination = base+'/#read?uid='+uid
                    with page.expect_response(wanted) as pending:
                        if page.url == destination:page.reload()
                        else:page.goto(destination)
                    result = pending.value.json()['result']
                    assert not result.get('isError') and result['structuredContent']['text_id'] == uid
                    page.wait_for_function("uid=>new URLSearchParams(location.hash.slice(6)).get('uid')===uid",arg=uid)
                    expect(page.locator('.segment-label a').first).to_have_text(uid+'/1')
                    engine.loaded(page)
                    assert page.locator('.passage').first.inner_text() == metadata[uid]['segments'][0]['text']
                def choose(uid):
                    prior = len(requests)
                    read_tool(page,'English sources').click()
                    card = page.locator('#study .translation-choice').filter(has_text=rows[uid]['reference'])
                    expect(card).to_have_count(1)
                    assert len(requests) == prior
                    expect(page.get_by_role('button',name='Compare selected sources',exact=True)).to_have_count(0)
                    button = card.get_by_role('button').filter(has_text='Read source ·')
                    button.focus();page.keyboard.press('Enter')
                engine.saved(page,base)
                page.get_by_label('Your personal note',exact=True).first.fill(PRIVATE+' unsaved')
                for uid in expected:
                    prior = len(requests)
                    navigate(uid)
                    assert len(requests) == prior
                    choose(uid)
                    body = page.locator('#study > .translation');body.wait_for()
                    combined = []
                    while True:
                        assert len(combined) < 150
                        combined.append(body.text_content())
                        provenance = page.locator('#study > .provenance')
                        assert all(s in provenance.text_content() for s in (engine.SOURCE_REVISION,'CC BY-NC-SA 4.0','Walters','Whitman College'))
                        assert set(provenance.locator('a').evaluate_all('links=>links.map(l=>l.href)')) == {rows[uid]['url'],engine.LICENSE_URL}
                        notices = page.locator('#study > .notice').all_text_contents()
                        assert all(any(n in notice for notice in notices) for n in rows[uid]['mapping_notes'])
                        notes = page.get_by_role('region',name='Translator’s notes',exact=True)
                        if expected[uid]['note_numbers']:
                            actual = [{'number':int(li.get_attribute('value')),'text':li.locator('p').text_content()} for li in notes.locator('li').all()]
                            assert digest(compact(actual)) == rows[uid]['notes_sha256']
                        else:expect(notes).to_have_count(0)
                        preface = page.get_by_role('heading',name='Publisher preface · editorial, not poem text',exact=True)
                        expect(preface).to_have_count(int(bool(whole[uid]['publisher_paratext'])))
                        if whole[uid]['publisher_paratext']:
                            assert digest(preface.locator('..').locator('.translation').text_content()) == rows[uid]['paratext_sha256']
                        for key,caption in (('chapter_summary','Canonical chapter summary · not poem text'),('collection_summary','Canonical collection summary · not poem text'),('publisher_divisions','Publisher recitation division · not poem text'),('editorial_gap','Publisher editorial gap · not poem text')):
                            contracts = rows[uid].get(key) or []
                            contracts = contracts if isinstance(contracts,list) else [contracts]
                            if key == 'collection_summary' and uid == 'tha-ap102':
                                caption = 'Therā Apadāna first-hundred chapter summary and colophons · not poem text'
                            caption = scope_captions.get((uid,key),caption)
                            regions = page.get_by_role('region',name=caption,exact=True)
                            assert regions.count() == len(contracts)
                            for region,c in zip(regions.all(),contracts,strict=True):
                                assert digest(region.locator('.translation').text_content()) == c['body_sha256']
                                actual = [{'number':int(li.get_attribute('value')),'text':li.locator('p').text_content()} for li in region.locator('li').all()]
                                assert digest(compact(actual)) == c['notes_sha256']
                                if key == 'editorial_gap':
                                    expect(region.get_by_text('Original publisher placement: after local stanza 25 (printed global label 1164), before local stanza 26 (printed global label 1165).',exact=True)).to_have_count(1)
                        assert page.locator('#study audio,#study video,#study iframe,#study source').count() == 0
                        audit(uid+' page '+str(len(combined)))
                        button = page.get_by_role('button',name='Next English page →',exact=True)
                        if not button.count():break
                        last = body.text_content();button.focus();page.keyboard.press('Enter');expect(body).not_to_have_text(last)
                    assert digest(''.join(combined)) == rows[uid]['body_sha256']
                    read_tool(page,'English sources')  # Reopen the ordinary mobile study disclosure after selection.
                    nav = page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True,include_hidden=True)
                    nav.get_by_text('Reviewed publisher edition order',exact=True).click()
                    selector = nav.get_by_role('combobox',name='Poem in this reviewed publisher edition',exact=True)
                    assert selector.locator('option').evaluate_all('items=>items.map(i=>i.value)') == reviewed_order
                    for target in expected:
                        if target in summary_origins and target != uid:
                            if uid == summary_origins[target]:
                                prior = len(requests)
                                link = nav.get_by_role('link',name='Chapter summary source · publisher poem '+str(rows[target]['poem']),exact=True)
                                proof = engine.open_summary(page,link,target,uid)
                                assert len(requests) == prior
                                checks.append({'width':width,'theme':theme,'check':'chapter-specific source link actual response URL reference and first-body navigation',**proof})
                                navigate(uid)
                for uid,label,patch in patches:
                    navigate(uid);state['drift'] = patch;choose(uid)
                    expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible()
                    expect(page.locator('#study .translation')).to_have_count(0)
                    assert page.locator('.passage').first.inner_text() == metadata[uid]['segments'][0]['text']
                    audit('refused '+label)
                state['drift'] = None
                print(compact({'phase':'source-and-mutation-pass','width':width,'theme':theme,'sources':len(expected),'mutations':len(patches)}),file=sys.stderr,flush=True)
                engine.saved(page,base)
                expect(page.get_by_label('Your personal note',exact=True).first).to_have_value(PRIVATE+' unsaved')
                page.reload()
                expect(page.get_by_label('Your personal note',exact=True).first).to_have_value(PRIVATE+' unsaved')
                with page.expect_download() as pending:
                    page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
                exported = json.loads(Path(pending.value.path()).read_text())
                assert exported['saved'] == [{**old[0],'note':PRIVATE+' unsaved'}]
                assert engine.profile(page)['saved'] == old
                audit('synthetic local draft recovery export')
                for uid in dict.fromkeys((next(iter(expected)),list(expected)[-1])):
                    navigate(uid)
                    segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                    segment.get_by_role('button',name='Save passage '+uid+'/2',exact=True).click()
                    fresh = engine.profile(page)['saved'][-1]
                    assert fresh['ref'] == uid+'/2' and fresh['offset'] == 1
                    engine.saved(page,base)
                    engine.bookmark_link(page,fresh).focus();page.keyboard.press('Enter')
                    expect(page.locator('.segment-label a').first).to_have_text(fresh['ref'])
                    engine.loaded(page)
                    assert page.locator('.passage').first.inner_text() == metadata[uid]['segments'][1]['text']
                    audit('fresh exact bookmark '+uid)
                checks.append({'width':width,'theme':theme,'check':'all selected actual source reader bodies/notes/apparatus, revision navigation, single-source comparison refusal, cached drift refusal, synthetic local drafts/reload/export','sources':len(expected),'mutations':len(patches)})
                context.close()
                engine.check_widgets(browser,html,widgets,patches,width,theme,checks)
                widget_apparatus(browser,html,widgets,width,theme,checks,scope_captions=scope_captions)
                print(compact({'phase':'viewport-pass','width':width,'theme':theme}),file=sys.stderr,flush=True)
        browser.close()


def widget_apparatus(browser,html,widgets,width,theme,checks,*,scope_captions=None):
    """Narrow positive apparatus ownership check supplementing the D249 engine."""
    scope_captions = {} if scope_captions is None else scope_captions
    assert isinstance(scope_captions,dict) and not set(scope_captions)-{('tha-ap202','collection_summary')}
    assert all(isinstance(value,str) and value.endswith(' · not poem text') for value in scope_captions.values())
    selected = {u:w for u,w in widgets.items() if any(w['english'].get(k) for k in ('publisher_paratext','chapter_summary','collection_summary','publisher_divisions','editorial_gap'))}
    if not selected:return
    for bridge in ('Apps SDK','MCP Apps'):
        page = browser.new_page(viewport={'width':width,'height':900})
        traffic,errors = [],[]
        page.route('**/*',lambda route:(traffic.append('unexpected request'),route.abort()))
        page.on('pageerror',lambda error:errors.append(type(error).__name__))
        if bridge == 'Apps SDK':
            page.evaluate("theme=>{window.openai={theme,setWidgetState(){},openExternal(){},callTool(){throw Error('Unexpected tool')}}}",theme)
            page.set_content(html);frame = page.main_frame
            def send(data):page.evaluate("data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}",data)
        else:
            page.set_content('<iframe id="reader" style="border:0;width:100%;height:850px"></iframe>')
            page.evaluate("""p=>{window.messages=[];const f=document.querySelector('#reader');window.addEventListener('message',e=>{window.messages.push(e.data);if(e.data.method==='ui/initialize')f.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{hostContext:{theme:p.theme},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}}}},'*');if(e.data.method==='ui/update-model-context')f.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{}},'*')});f.srcdoc=p.html}""",{'html':html,'theme':theme})
            page.wait_for_function("window.messages.some(m=>m.method==='ui/notifications/initialized')")
            frame = page.frames[1]
            def send(data):page.evaluate("d=>document.querySelector('#reader').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:d}},'*')",data)
        for uid,widget in selected.items():
            send(widget)
            expect(frame.locator('#english > div.en')).to_have_text(widget['english']['text'])
            preface = frame.get_by_role('heading',name='Publisher preface · editorial, not poem text',exact=True)
            expect(preface).to_have_count(int(bool(widget['english']['publisher_paratext'])))
            if widget['english']['publisher_paratext']:
                assert digest(preface.locator('xpath=following-sibling::p[1]').text_content()) == widget['english']['paratext_sha256']
            for key,caption in (('chapter_summary','Canonical chapter summary · not poem text'),('collection_summary','Canonical collection summary · not poem text'),('publisher_divisions','Publisher recitation division · not poem text'),('editorial_gap','Publisher editorial gap · not poem text')):
                scopes = widget['english'].get(key) or []
                scopes = scopes if isinstance(scopes,list) else [scopes]
                if key == 'collection_summary' and uid == 'tha-ap102':
                    caption = 'Therā Apadāna first-hundred chapter summary and colophons · not poem text'
                caption = scope_captions.get((uid,key),caption)
                regions = frame.get_by_role('region',name=caption,exact=True)
                expect(regions).to_have_count(len(scopes))
                for region,scope in zip(regions.all(),scopes,strict=True):
                    assert digest(region.locator('p.en').text_content()) == scope['body_sha256']
                    notes = [{'number':int(li.get_attribute('value')),'text':li.text_content()} for li in region.locator('li').all()]
                    assert digest(compact(notes)) == scope['notes_sha256']
                    if key == 'editorial_gap':
                        expect(region.get_by_text('Original publisher placement: after local stanza 25 (printed global label 1164), before local stanza 26 (printed global label 1165).',exact=True)).to_have_count(1)
            # Direct-child note list owns poem notes only; nested summary/gap lists stay separate.
            notes = [{'number':int(li.get_attribute('value')),'text':li.text_content()} for li in frame.locator('#english > ol > li').all()]
            assert digest(compact(notes)) == widget['english']['notes_sha256']
        assert not errors and not traffic
        checks.append({'width':width,'theme':theme,'bridge':bridge,'check':'positive separately owned chapter/collection/division/editorial-gap bodies and original note numbers; exact gap placement caption; poem note ownership','sources':len(selected)})
        page.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == __file__]
        trace,context = error.__traceback__,{}
        while trace:
            scope = trace.tb_frame.f_locals
            if trace.tb_frame.f_code.co_filename == __file__:
                if re.fullmatch(r'(?:thi|tha)-ap\d+',str(scope.get('uid',''))):context['uid'] = scope['uid']
                if isinstance(scope.get('label'),str) and re.fullmatch(r'[A-Za-z0-9 _-]{1,90}',scope['label']):context['check_label'] = scope['label']
            trace = trace.tb_next
        code = re.search(r'net::ERR_[A-Z_]+',str(error))
        if code:context['browser_error_code'] = code.group(0)
        first_line = str(error).splitlines()[0] if str(error) else ''
        if first_line.startswith(('Page.goto:', 'Page.reload:')) and 'SYNTHETIC_PRIVATE' not in first_line:
            context['navigation_error'] = first_line[:500]
        print(json.dumps({'passed':False,'error_type':type(error).__name__,'failure_at':{'file':Path(__file__).name,'line':frames[-1].lineno if frames else None},'context':context,'limits':'Failure details redacted to protect publisher wording, translator notes and synthetic draft contents.'}),file=sys.stderr)
        sys.exit(1)
