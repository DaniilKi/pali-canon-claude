"""Test-only exact current -> historical source replay input."""
import argparse
import copy
import json
import gzip
from pathlib import Path
from web_reader_four_boundary_history import historical_canon_bytes
from canon.apadana_thera389390_spans import canon_before_389390, POST_PAIR_SHA256, digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--canon', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.canon.is_symlink() or args.canon.resolve() == args.output.resolve():
        raise ValueError('Regular input and a distinct new historical output required')
    raw = args.canon.read_bytes()
    current_source_canon = json.loads(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)
    if digest(current_source_canon) != POST_PAIR_SHA256:
        raise ValueError('Exact current883d source input required before historical replay')
    historical_source_canon = canon_before_389390(copy.deepcopy(current_source_canon))
    body = historical_canon_bytes(json.dumps(historical_source_canon, ensure_ascii=False, separators=(',', ':')).encode())
    with args.output.open('xb') as stream:
        stream.write(body)


if __name__ == '__main__':
    main()
