"""Copy the pin of a rebuilt dpd.json.gz into DPD_PIN in src/analyse.mjs (used by the monthly data refresh, #50).

Usage:
  python scripts/canon/update_dpd_pin.py <dpd.json.gz> <src/analyse.mjs>

The audit compares DPD_PIN with the `source` record that scripts/dpd/build_dpd.py writes into dpd.json.gz, so a
refresh to a new DPD release must move both together. Only the values inside `export const DPD_PIN = { ... }` are
rewritten (version, release, asset, asset_sha256, doi, attribution); nothing else in the file changes.
Prints the old and new version. Exits 0 without changes when the file has no DPD_PIN (DPD not merged yet).
"""
import gzip
import json
import re
import sys

KEYS = ['version', 'release', 'asset', 'asset_sha256', 'doi', 'attribution']


def js_string(value):
    return "'" + str(value).replace('\\', '\\\\').replace("'", "\\'") + "'"


def update(source, text):
    m = re.search(r'export const DPD_PIN = \{(.*?)\n\};', text, re.S)
    if not m:
        return text, None
    body = m.group(1)
    old = re.search(r"\n\s*version:\s*'([^']*)'", body)
    for key in KEYS:
        if key not in source:
            continue
        body, n = re.subn(r"(\n\s*" + key + r":\s*)'(?:[^'\\]|\\.)*'", lambda mm: mm.group(1) + js_string(source[key]), body)
        if n != 1:
            raise SystemExit(f'DPD_PIN.{key}: expected one entry, found {n}')
    return text[:m.start(1)] + body + text[m.end(1):], old.group(1) if old else None


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    with gzip.open(sys.argv[1], 'rt', encoding='utf-8') as f:
        source = json.load(f)['source']
    for key in ('version', 'asset_sha256'):
        if not source.get(key):
            raise SystemExit(f'{sys.argv[1]}: source.{key} is missing')
    with open(sys.argv[2], encoding='utf-8') as f:
        text = f.read()
    new_text, old = update(source, text)
    if old is None and new_text == text:
        print('no DPD_PIN found; nothing to update')
        return
    with open(sys.argv[2], 'w', encoding='utf-8', newline='\n') as f:
        f.write(new_text)
    print(f'DPD_PIN {old} -> {source["version"]}')


if __name__ == '__main__':
    main()
