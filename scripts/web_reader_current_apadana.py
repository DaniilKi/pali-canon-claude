"""Stable current QA entrypoints; PhaseA is the exact stateless382 implementation.

No old closure, epoch selector, actual-response projection or trust cache. Public
source APIs remain source-only; capture_current performs actual27 exactly once.
"""
from web_reader_intake382 import (CANON, source_authority382, _capture382_current,
    approved382_catalogue, approved382_runtime, reviewed_intake382,
    curated_additions382, _source_metadata_pins as _fixed_source_metadata_pins,
    _all_metadata_pins as _fixed_all_metadata_pins)


def source_authority(root):
    return source_authority382(root)


def capture_current(root):
    return _capture382_current(root)


def approved_catalogue(root):
    return approved382_catalogue(root)


def approved_runtime(root):
    return approved382_runtime(root)


def reviewed_intake(root):
    return reviewed_intake382(root)


def curated_additions(root, anchor_filename):
    return curated_additions382(root, anchor_filename)


def source_metadata_pins():
    return _fixed_source_metadata_pins()


def all_metadata_pins():
    return _fixed_all_metadata_pins()


def source_views(context):
    """Separate already validated source views; never project an actual response."""
    return {'current': context, 'historical382': context}


def widget_contract():
    """Fixed independent PhaseA widget declaration; not application output."""
    return {'version': 'v50', 'uri': 'ui://pali-canon/reader-v50.html',
            'skybridge': 'ui://pali-canon/reader-v50.skybridge.html'}
