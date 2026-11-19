"""Create the exact D249/D250 canonical input without changing old receipts.

This test-only adapter accepts the complete reviewed post-107/108 snapshot and
uses the finite strict inverse. It never rewrites installed data or saved user
metadata, and refuses unrelated changes before writing a new output file.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path

from apadana_thera_pair_spans import (
    PRE_PAIR_SHA256, TARGETS, canon_before_thera_pair, digest, paired_state,
)

POST_PAIR_SHA256 = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--canon', type=Path, required=True,
                        help='Freshly unpacked current canonical JSON or gzip JSON.')
    parser.add_argument('--output', type=Path, required=True,
                        help='New historical compact JSON file; existing files refuse.')
    args = parser.parse_args()
    if args.canon.resolve() == args.output.resolve():
        raise ValueError('Historical snapshot must not replace its canonical input')
    raw = args.canon.read_bytes()
    current = json.loads(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)
    if digest(current) != POST_PAIR_SHA256 or paired_state(current['units']) != 'new':
        raise ValueError('Exact complete post-pair canonical snapshot required')
    historical = canon_before_thera_pair(current)
    if digest(historical) != PRE_PAIR_SHA256:
        raise ValueError('Strict inverse differs from sealed D249/D250 canonical input')
    changed = [old['id'] for old, new in zip(current['units'], historical['units'])
               if old != new]
    if changed != list(TARGETS):
        raise ValueError('Historical snapshot changed unexpected canonical records')
    body = json.dumps(historical, ensure_ascii=False, separators=(',', ':')).encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('xb') as stream:
        stream.write(body)
    print(json.dumps({'post_pair_canon_sha256': digest(current),
                      'historical_canon_sha256': hashlib.sha256(body).hexdigest(),
                      'changed_units': changed,
                      'installed_data_modified': False,
                      'private_data_accessed': False}))


if __name__ == '__main__':
    main()
