"""Test-only exact current -> historical source replay input."""
import argparse
import gzip
from pathlib import Path
from web_reader_four_boundary_history import historical_canon_bytes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--canon', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.canon.is_symlink() or args.canon.resolve() == args.output.resolve():
        raise ValueError('Regular input and a distinct new historical output required')
    raw = args.canon.read_bytes()
    body = historical_canon_bytes(gzip.decompress(raw) if raw[:2] == b'\x1f\x8b' else raw)
    with args.output.open('xb') as stream:
        stream.write(body)


if __name__ == '__main__':
    main()
