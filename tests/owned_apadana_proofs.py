"""Finite physical proof copy for the original33+7 owned-fixture controls.

No cache, expected-runtime output, root fallback or directory discovery.
The independently reviewed manifest contains immutable Git1e1c7 proof bytes.
"""
import hashlib
import json
import re
from pathlib import Path

MANIFEST = 'tests/fixtures/approved33-proof-inputs.json'
MANIFEST_SHA = '4f7c1a7936d44ba951bf3eddcc81f7faf3ea72128ed103d6c9088e5eb6152989'
SOURCE_COMMIT = '1e1c7b13ba4f02ede75e87fca66032e6e8966f8a'


def copy_owned_apadana_proof_inputs(source_root, destination):
    from web_reader_next_ten_boundary_history import regular
    destination = Path(destination)
    assert destination.is_dir() and not destination.is_symlink()
    assert not any(destination.iterdir()), 'Only a fresh empty owned destination is accepted'
    raw = regular(source_root, MANIFEST)
    assert hashlib.sha256(raw).hexdigest() == MANIFEST_SHA
    spec = json.loads(raw)
    assert spec['schema'] == 'approved33-required-physical-proof-inputs-v1'
    assert spec['source_commit'] == SOURCE_COMMIT
    files = spec['files']
    assert type(files) is dict and list(files) == sorted(files)
    assert len(files) == spec['file_count'] == 208
    assert sum(row['bytes'] for row in files.values()) == spec['bytes'] == 15636542
    for name, row in files.items():
        assert type(name) is str and name.startswith('docs/evidence/apadana/') and '\\' not in name
        parts = name.split('/')
        assert all(part not in ('', '.', '..') for part in parts)
        assert set(row) == {'bytes', 'sha256'}
        assert type(row['bytes']) is int and row['bytes'] > 0
        assert type(row['sha256']) is str and re.fullmatch('[a-f0-9]{64}', row['sha256'])
        source = regular(source_root, name)
        assert {'bytes': len(source), 'sha256': hashlib.sha256(source).hexdigest()} == row
        parent = destination
        for part in parts[:-1]:
            parent = parent / part
            assert not parent.is_symlink(), 'Owned proof destination parent symlink refused'
            if parent.exists():
                assert parent.is_dir(), 'Owned proof destination parent directory required'
            else:
                parent.mkdir()
        target = parent / parts[-1]
        assert not target.exists() and not target.is_symlink()
        with target.open('xb') as stream:
            stream.write(source)
        copied = target.read_bytes()
        assert copied == source
        assert {'bytes': len(copied), 'sha256': hashlib.sha256(copied).hexdigest()} == row
    return frozenset(files)
