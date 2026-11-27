"""Finite additive owned fixture closure for current368 QA; no ambient roots.

The original208 copier and its immutable input manifest remain untouched.
Current actual27 buffers and old DD/C1/AP343/AP359 inputs stay separate.
"""
from pathlib import Path
import hashlib
from owned_apadana_proofs import copy_owned_apadana_proof_inputs


EXTRA_OLD_RUNTIME_PINS = {'tests/fixtures/reviewed-runtime-2449.json': 'cd6fd0af3f72c8e907130dd40aec4660e2ce8b8155ec7959a178e59517c53080',
 'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json': 'af30339018c4843e4da2599fcabf25797173c58398123dc365ad09f6a2ced00f'}


def _copy_checked(source_root, destination, name, pin):
    from web_reader_next_ten_boundary_history import regular
    from web_reader_six_boundary_history import safe_destination
    raw = regular(source_root, name)
    assert hashlib.sha256(raw).hexdigest() == pin
    target = safe_destination(destination, name)
    if target.exists():
        assert regular(destination, name) == raw
    else:
        with target.open('xb') as stream:
            stream.write(raw)
    copied = regular(destination, name)
    assert copied == raw and hashlib.sha256(copied).hexdigest() == pin


def copy_owned_intake368_source_proof_inputs(source_root, destination):
    from web_reader_intake368 import DIRECTORY, PINS, _authority
    from web_reader_next_ten_boundary_history import _physical_root
    from web_reader_six_boundary_history import _reject_c1_scope
    _reject_c1_scope(source_root); _reject_c1_scope(destination)
    source_root = _physical_root(source_root)
    destination = _physical_root(destination)
    _authority(source_root)  # source-only positive before any owned fixture
    old_names = copy_owned_apadana_proof_inputs(source_root, destination)
    new_names = tuple(DIRECTORY + '/' + name for name in PINS)
    assert not set(old_names) & set(new_names)
    for name, pin in PINS.items():
        _copy_checked(source_root, destination, DIRECTORY + '/' + name, pin)
    return frozenset(old_names) | frozenset(new_names)


def copy_owned_intake368_proof_inputs(source_root, destination):
    from web_reader_intake368 import fixture_names
    from web_reader_next_ten_boundary_history import regular
    from web_reader_four_boundary_history import copy_historical_fixture
    from web_reader_next_ten_boundary_history import _physical_root
    from web_reader_six_boundary_history import _reject_c1_scope
    _reject_c1_scope(source_root); _reject_c1_scope(destination)
    source_root = _physical_root(source_root)
    destination = _physical_root(destination)
    # The original208 copier first requires a genuinely fresh empty root.
    copied = copy_owned_intake368_source_proof_inputs(source_root, destination)
    # The existing finite copy graph validates/copies ACTUAL new27 and every
    # separate historical input, including AP359, under the owned operation.
    copy_historical_fixture(source_root, destination)
    for name, pin in EXTRA_OLD_RUNTIME_PINS.items():
        _copy_checked(source_root, destination, name, pin)
    for name in fixture_names():
        original = regular(source_root, name)
        copied_raw = regular(destination, name)
        assert copied_raw == original
        assert hashlib.sha256(copied_raw).digest() == hashlib.sha256(original).digest()
    return copied | frozenset(fixture_names()) | frozenset(EXTRA_OLD_RUNTIME_PINS)
