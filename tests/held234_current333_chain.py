"""Extract only actual held234 metadata preflight AST; never import its browser CLI."""
import ast
import copy
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import web_reader_apadana_intake as intake

CLI = ROOT / 'scripts/web-reader-thera-held234-check.py'
READERS = ('reviewed_held234_intake', 'curated_additions', 'read_261_280',
    'read_281_285', 'read_287_288', 'read_292_299', 'read_301_310')
HISTORICAL = ('historical303', 'historical308', 'historical310', 'historical317', 'historical325')
METADATA = {'approval', 'current_additions', 'current_curation', 'current_ids', *HISTORICAL}
ASSIGNMENTS = METADATA | {'evidence_dir'}
BRIDGES = (
    "historical303['baseline_ids'] == approval['expected_profile_ids']",
    "historical308['baseline_ids'] == historical303['expected_profile_ids']",
    "historical310['baseline_ids'] == historical308['expected_profile_ids']",
    "historical317['baseline_ids'] == historical310['expected_profile_ids']",
    "historical325['baseline_ids'] == historical317['expected_profile_ids']",
    "current_curation['baseline_ids'] == historical325['expected_profile_ids']",
)


def extract_actual_preflight():
    tree = ast.parse(CLI.read_text(encoding='utf-8'), filename=str(CLI))
    main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'main')
    # Finite original metadata section: exclude argparse/signals and everything
    # from the first prior-source reconstruction onward, including all browser,
    # runtime, fixture source, network, process and Playwright operations.
    start = next(i for i, node in enumerate(main.body) if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == 'approval' for target in node.targets))
    stop = next(i for i, node in enumerate(main.body) if isinstance(node, ast.Assign)
        and any(isinstance(target, ast.Name) and target.id == 'prior' for target in node.targets))
    selected = []
    allowed_names = METADATA | {'ROOT', 'BASE', 'UID', 'len', 'set', *READERS}
    for node in main.body[start:stop]:
        if isinstance(node, ast.Assign) and all(isinstance(target, ast.Name)
                and target.id in ASSIGNMENTS for target in node.targets):
            selected.append(node)
        elif isinstance(node, ast.Assert):
            names = {part.id for part in ast.walk(node.test) if isinstance(part, ast.Name)}
            if names & METADATA and names <= allowed_names:
                selected.append(node)
    # Only the original AST nodes are compiled, with original line references.
    # No injected bridge/assertion or duplicated preflight implementation.
    assert selected and all(isinstance(node, (ast.Assign, ast.Assert)) for node in selected)
    for node in selected:
        for call in (part for part in ast.walk(node) if isinstance(part, ast.Call)):
            assert (isinstance(call.func, ast.Name) and call.func.id in {'len', 'set', *READERS}) or (
                isinstance(call.func, ast.Attribute) and ast.unparse(call.func)
                in {'json.loads', 'args.approval.read_text'}), 'Only finite metadata reads/calls may execute'
    return tree, selected


def run_actual_preflight(overrides=None):
    tree, selected = extract_actual_preflight()
    env = {'__builtins__': {'len': len, 'set': set}, 'ROOT': ROOT,
        'BASE': '7d5ac90845402b322dabf2c5120d1485b15c0bda', 'UID': 'tha-ap236',
        'json': json, 'args': SimpleNamespace(approval=ROOT / 'docs/evidence/apadana/THERA_HELD234_APPROVAL.json')}
    env.update({name: getattr(intake, name) for name in READERS})
    env.update(overrides or {})
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(CLI), 'exec'), env)
    return tree, selected, env


class Held234Current333Chain(unittest.TestCase):
    def positive(self):
        tree, selected, env = run_actual_preflight()
        self.assertEqual(len(env['current_ids']), 333)
        self.assertEqual(len(env['current_additions']['ids']), 48)
        for name, count in zip(HISTORICAL, (303, 308, 310, 317, 325), strict=True):
            self.assertEqual(len(env[name]['expected_profile_ids']), count)
        assertions = [ast.unparse(node.test) for node in selected if isinstance(node, ast.Assert)]
        for bridge in BRIDGES:
            self.assertEqual(assertions.count(bridge), 1, 'Actual exact historical bridge must remain once: ' + bridge)
        self.assertNotIn("current_curation['baseline_ids'] == historical317['expected_profile_ids']", assertions)
        imports = [alias.name for node in tree.body if isinstance(node, ast.ImportFrom)
            and node.module == 'web_reader_apadana_intake' for alias in node.names]
        self.assertIn('read_301_310', imports, 'The actual CLI must import its real325 reader')
        self.assertEqual(sum(isinstance(node, ast.Assign) and any(isinstance(target, ast.Name)
            and target.id == 'historical325' for target in node.targets) for node in selected), 1)
        return env

    def test_01_actual_sealed_metadata_preserves_all303_308_310_317_325_to333_bridges(self):
        self.positive()

    def test_02_only_current_curation_baseline_regressed_to317_is_rejected_after_positive(self):
        env = self.positive()
        def changed(root, anchor):
            value = copy.deepcopy(intake.curated_additions(root, anchor))
            value['curation']['baseline_ids'] = list(env['historical317']['expected_profile_ids'])
            return value
        with self.assertRaises(AssertionError):
            run_actual_preflight({'curated_additions': changed})

    def test_03_only_historical325_baseline_regressed_to310_is_rejected_after_positive(self):
        env = self.positive()
        def changed(root):
            value = copy.deepcopy(intake.read_301_310(root))
            value['baseline_ids'] = list(env['historical310']['expected_profile_ids'])
            return value
        with self.assertRaises(AssertionError):
            run_actual_preflight({'read_301_310': changed})

    def test_04_same_count_held_substitution_in333_baseline_is_rejected_after_positive(self):
        env = self.positive()
        def changed(root, anchor):
            value = copy.deepcopy(intake.curated_additions(root, anchor))
            ids = value['curation']['baseline_ids']
            self.assertEqual(len(ids), 325)
            self.assertNotIn('tha-ap262', ids)
            ids[-1] = 'tha-ap262'
            self.assertEqual(len(ids), 325)
            self.assertEqual(len(set(ids)), 325)
            self.assertEqual(value['curation']['expected_profile_ids'], env['current_ids'])
            return value
        with self.assertRaises(AssertionError):
            run_actual_preflight({'curated_additions': changed})


if __name__ == '__main__':
    unittest.main()
