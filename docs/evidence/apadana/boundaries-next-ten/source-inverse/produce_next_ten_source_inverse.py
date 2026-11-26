#!/usr/bin/env python3
"""Offline reviewed-plan-only NEXT→DD7 SOURCE inverse producer. Never imports app code."""
import argparse
import difflib
import hashlib
import json
import pathlib
import re

BASE = 'dd7b697df2c54308084fffd934af38130d01f952'
MANIFEST_SHA = '2c111042d70c0c57315b36ce9a4eea81bad84701201bdbd991c26bf0c27c0d9d'
ROOTS = ('.github', 'docs', 'scripts', 'skills', 'src', 'tests', 'web')
EXTENSIONS = frozenset(('.mjs', '.js', '.py', '.yml', '.yaml', '.cjs', '.ts', '.tsx', '.md'))
TOP_FILES = frozenset(('AGENTS.md', 'CHANGELOG.md', 'CLAUDE.md', 'CODE_OF_CONDUCT.md',
    'CONTRIBUTING.md', 'GEMINI.md', 'HANDOFF.md', 'PRIVACY.md', 'README.md',
    'SECURITY.md', 'TERMS.md', 'THIRD_PARTY.md', 'package-lock.json', 'package.json'))
HOLDER = 'tests/helpers/next-ten-source-input.mjs'
SIX_MAP = 'docs/evidence/apadana/boundaries340-347/SIX_BOUNDARY_SOURCE_INVERSES.json'
SIX_SHA = '21c6076b7954b65f807a7ae044d61fb7f61f8a352e4acc6b28eae5ebbd87aaf7'


def need(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def guarded_path(path, directory=False):
    path = pathlib.Path(path).absolute()
    # Inspect the supplied spelling before normalization (including root aliases).
    for part in reversed((path, *path.parents)):
        need(not part.is_symlink(), 'symlink forbidden: ' + str(part))
    need(path.is_dir() if directory else path.is_file(), 'missing/wrong file type: ' + str(path))
    return path.resolve(strict=True)


def key_path(root, key):
    need(isinstance(key, str) and re.fullmatch(r'[A-Za-z0-9_./-]+', key) is not None,
         'unsafe source path')
    need(not key.startswith('/') and all(x not in ('', '.', '..') for x in key.split('/')),
         'path traversal')
    result = guarded_path(root / key)
    need(result.is_relative_to(root), 'source path escape')
    return result


def selected(key):
    p = pathlib.PurePosixPath(key)
    return key in TOP_FILES or (len(p.parts) > 1 and p.parts[0] in ROOTS
                               and p.suffix in EXTENSIONS)


def inventory(root):
    found = set()
    for top in ROOTS:
        base = guarded_path(root / top, directory=True)
        for p in base.rglob('*'):
            need(not p.is_symlink(), 'symlink in source tree: ' + str(p))
            key = p.relative_to(root).as_posix()
            if selected(key) and p.is_file():
                key_path(root, key)
                found.add(key)
    for p in root.iterdir():
        # Root Markdown is source too; other root JSON is intentionally not package authority.
        if p.name in TOP_FILES or p.suffix == '.md':
            key_path(root, p.name)
            found.add(p.name)
    return found


def sealed_file(path, pin):
    need(re.fullmatch('[0-9a-f]{64}', pin) is not None, 'invalid required SHA256')
    data = guarded_path(path).read_bytes()
    need(sha(data) == pin, 'seal mismatch: ' + str(path))
    return json.loads(data)


def inverse(old, current):
    for context in (3, 6, 12, 24, 48, 96, 192, 10**9):
        a, b = old.splitlines(keepends=True), current.splitlines(keepends=True)
        hunks = []
        for group in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_grouped_opcodes(context):
            before = ''.join(a[group[0][1]:group[-1][2]])
            after = ''.join(b[group[0][3]:group[-1][4]])
            if not before or not after:
                break
            hunks.append({'before': before, 'after': after})
        else:
            restored = current
            for hunk in hunks:
                if restored.count(hunk['after']) != 1:
                    break
                restored = restored.replace(hunk['after'], hunk['before'], 1)
            else:
                if hunks and restored == old:
                    return hunks
    need(old and current, 'empty whole source unsupported')
    return [{'before': old, 'after': current}]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=pathlib.Path)
    parser.add_argument('--current', required=True, type=pathlib.Path)
    parser.add_argument('--plan', required=True, type=pathlib.Path)
    parser.add_argument('--plan-sha256', required=True)
    parser.add_argument('--out', required=True, type=pathlib.Path)
    args = parser.parse_args()
    manifest = sealed_file(args.manifest, MANIFEST_SHA)
    plan = sealed_file(args.plan, args.plan_sha256)
    need(manifest.get('schema') == 'immutable-dd7-original-source-inputs-v1'
         and manifest.get('base_commit') == BASE, 'wrong original authority')
    need(plan.get('schema') == 'next-ten-source-path-plan-v1'
         and plan.get('base_commit') == BASE
         and plan.get('source_inputs_only') is True
         and plan.get('runtime_or_corpus_projection') is False, 'wrong reviewed plan')
    oldroot = guarded_path(args.manifest.parent, directory=True)
    current = guarded_path(args.current, directory=True)
    originals = manifest['files']
    need(len(originals) == 961 and list(originals) == sorted(originals), 'wrong original inventory')
    need(all(selected(k) for k in originals), 'manifest outside source inventory')
    need(inventory(oldroot) == set(originals), 'original directory inventory mismatch')
    now_paths = inventory(current)
    need(set(originals) <= now_paths, 'deleted original source')
    changed, verified = [], {}
    # Verify ALL961 independent originals, including unchanged files, before inverses.
    for key, row in originals.items():
        old = key_path(oldroot, key).read_bytes()
        need(len(old) == row['bytes'] and sha(old) == row['sha256'], 'original drift: ' + key)
        observed = key_path(current, key).read_bytes()
        verified[key] = (old, observed)
        if old != observed:
            changed.append(key)
    declared, added = plan['changed_existing_paths'], plan['new_code_paths']
    for paths in (declared, added):
        need(isinstance(paths, list) and paths == sorted(set(paths)), 'plan must be sorted/unique')
        need(all(selected(k) for k in paths), 'non-source planned path')
    need(changed == declared, 'changed-existing set differs from reviewed plan')
    need(sorted(now_paths - set(originals)) == added, 'new source set differs from reviewed plan')
    need(HOLDER in added and HOLDER not in originals, 'new seal holder must be separately reviewed')
    need(SIX_MAP not in declared + added, 'old SIX inverse is immutable')
    need(sha(key_path(current, SIX_MAP).read_bytes()) == SIX_SHA, 'old SIX inverse drift')
    rows = {}
    for key in declared:
        old, observed = verified[key]
        before, after = old.decode('utf8'), observed.decode('utf8')
        hunks = inverse(before, after)
        restored = after
        for hunk in hunks:
            need(restored.count(hunk['after']) == 1, 'ambiguous inverse: ' + key)
            restored = restored.replace(hunk['after'], hunk['before'], 1)
        need(restored.encode('utf8') == old, 'whole DD7 restoration failed: ' + key)
        rows[key] = {'dd7_sha256': sha(old), 'current_sha256': sha(observed), 'hunks': hunks}
    new_bytes = {k: key_path(current, k).read_bytes() for k in added}
    result = {'schema': 'finite-next-ten-to-dd7-source-inverses-v1', 'base_commit': BASE,
              'source_inputs_only': True, 'runtime_or_corpus_projection': False, 'files': rows}
    out = args.out.absolute()
    need(not out.exists() and not out.is_symlink(), 'refuse output overwrite')
    parent = guarded_path(out.parent, directory=True)
    out = parent / out.name
    need(not out.is_relative_to(current) and not out.is_relative_to(oldroot), 'output must be external')
    payload = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    receipt = {'schema': 'next-ten-source-inverse-generation-receipt-v1', 'base_commit': BASE,
               'original_manifest_sha256': MANIFEST_SHA, 'reviewed_plan_sha256': args.plan_sha256,
               'producer_sha256': sha(guarded_path(__file__).read_bytes()),
               'originals_verified': 961, 'all_whole_originals_restored': True,
               'inverse_sha256': sha(payload), 'ordered_paths': list(rows),
               'changed_existing_count': len(rows), 'hunk_count': sum(len(r['hunks']) for r in rows.values()),
               'new_code': {k: {'bytes': len(b), 'sha256': sha(b)} for k in added if k != HOLDER
                            for b in [new_bytes[k]]},
               'sealholder_sha256_pending_final_literal_binding': HOLDER,
               'immutable_old_six_inverse_sha256': SIX_SHA,
               'source_inputs_only': True, 'runtime_or_corpus_projection': False}
    need(inventory(current) == now_paths, 'source inventory changed during generation')
    for key, (_, observed) in verified.items():
        need(key_path(current, key).read_bytes() == observed, 'source changed during generation: ' + key)
    for key, observed in new_bytes.items():
        need(key_path(current, key).read_bytes() == observed, 'new source changed during generation: ' + key)
    need(sha(key_path(current, SIX_MAP).read_bytes()) == SIX_SHA, 'old SIX inverse changed during generation')
    out.mkdir()  # Exclusive; outputs are produced only after every validation succeeds.
    (out / 'NEXT_TEN_SOURCE_INVERSES.json').write_bytes(payload)
    (out / 'GENERATION_RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')


if __name__ == '__main__':
    main()
