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
from web_reader_intake380 import reviewed_intake380
from web_reader_intake382 import reviewed_intake382

CLI = ROOT / 'scripts/web-reader-thera-held234-check.py'
READERS = ('reviewed_held234_intake', 'curated_additions', 'read_261_280',
    'read_281_285', 'read_287_288', 'read_292_299', 'read_301_310', 'read_312_319', 'read_321_329', 'read_331_334', 'read_335_350', 'read_historical368', 'read_historical375', 'read_historical380', 'read_historical382', 'reviewed_intake')
HISTORICAL = ('historical303', 'historical308', 'historical310', 'historical317', 'historical325', 'historical333', 'historical339', 'historical343', 'historical359', 'historical368', 'historical375', 'historical380', 'historical382')
METADATA = {'approval', 'current_additions', 'current_curation', 'current_ids', 'expected_current', *HISTORICAL}
ASSIGNMENTS = METADATA | {'evidence_dir'}
BRIDGES = (
    "historical303['baseline_ids'] == approval['expected_profile_ids']",
    "historical308['baseline_ids'] == historical303['expected_profile_ids']",
    "historical310['baseline_ids'] == historical308['expected_profile_ids']",
    "historical317['baseline_ids'] == historical310['expected_profile_ids']",
    "historical325['baseline_ids'] == historical317['expected_profile_ids']",
    "historical333['baseline_ids'] == historical325['expected_profile_ids']",
    "historical339['baseline_ids'] == historical333['expected_profile_ids']",
    "historical343['baseline_ids'] == historical339['expected_profile_ids']",
    "historical359['baseline_ids'] == historical343['expected_profile_ids']",
    "historical368['baseline_ids'] == historical359['expected_profile_ids']",
    "historical375['baseline_ids'] == historical368['expected_profile_ids']",
    "historical380['baseline_ids'] == historical375['expected_profile_ids']",
    "historical382['baseline_ids'] == historical380['expected_profile_ids']",
    "current_curation['baseline_ids'] == expected_current['baseline_ids']",
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
    env.update({name: reviewed_intake382 if name=='read_historical382' else reviewed_intake380 if name=='read_historical380' else getattr(intake, {'read_historical368':'_reviewed_current368', 'read_historical375':'_reviewed_current375'}.get(name,name)) for name in READERS})
    env.update(overrides or {})
    exec(compile(ast.Module(body=selected, type_ignores=[]), str(CLI), 'exec'), env)
    return tree, selected, env


class Held234Current375Chain(unittest.TestCase):
    """Original375 case lineage; actual current380 CLI AST and both source hops."""
    def positive(self):
        tree, selected, env = run_actual_preflight()
        self.assertEqual(len(env['historical375']['expected_profile_ids']), 375)
        self.assertEqual(len(set(env['historical375']['expected_profile_ids'])), 375)
        self.assertEqual(len(env['historical375']['expected_profile_ids'][285:]), 90)
        self.assertEqual(len(env['historical380']['expected_profile_ids']), 380)
        self.assertEqual(len(env['historical382']['expected_profile_ids']), 382)
        self.assertEqual(env['current_ids'],env['expected_current']['expected_profile_ids'])
        self.assertEqual(len(set(env['historical380']['expected_profile_ids'])), 380)
        self.assertEqual(len(set(env['current_ids'])),len(env['current_ids']))
        self.assertEqual(len(env['historical380']['expected_profile_ids'][285:]), 95)
        self.assertEqual(len(env['historical382']['expected_profile_ids'][285:]), 97)
        self.assertEqual(env['current_additions']['ids'],env['expected_current']['expected_profile_ids'][285:])
        for name, count in zip(HISTORICAL, (303,308,310,317,325,333,339,343,359,368,375,380,382), strict=True):
            self.assertEqual(len(env[name]['expected_profile_ids']), count)
        assertions = [ast.unparse(node.test) for node in selected if isinstance(node, ast.Assert)]
        for bridge in BRIDGES:
            self.assertEqual(assertions.count(bridge), 1, bridge)
        aliases = [(alias.name, alias.asname) for node in tree.body if isinstance(node, ast.ImportFrom)
            and node.module == 'web_reader_apadana_intake' for alias in node.names]
        self.assertIn(('_reviewed_current368', 'read_historical368'), aliases)
        self.assertIn(('_reviewed_current375', 'read_historical375'), aliases)
        direct380=[(alias.name,alias.asname)for node in tree.body if isinstance(node,ast.ImportFrom)and node.module=='web_reader_intake380'for alias in node.names]
        self.assertIn(('reviewed_intake380','read_historical380'),direct380)
        direct382=[(alias.name,alias.asname)for node in tree.body if isinstance(node,ast.ImportFrom)and node.module=='web_reader_intake382'for alias in node.names]
        self.assertIn(('reviewed_intake382','read_historical382'),direct382)
        self.assertNotIn("current_curation['baseline_ids'] == historical359['expected_profile_ids']", assertions)
        self.assertEqual(env['historical375']['expected_profile_ids'][-7:], ['tha-ap373','tha-ap374','tha-ap376','tha-ap377','tha-ap378','tha-ap379','tha-ap380'])
        self.assertEqual(env['current_ids'][:375], env['historical375']['expected_profile_ids'])
        self.assertEqual(env['current_ids'][375:380], ['tha-ap383','tha-ap385','tha-ap386','tha-ap387','tha-ap388'])
        self.assertEqual(env['current_ids'][:380],env['historical380']['expected_profile_ids'])
        self.assertEqual(env['current_ids'][380:382],['tha-ap403','tha-ap404'])
        self.assertNotIn('tha-ap375', env['current_ids'])
        return env

    def test_01_actual375_metadata_keeps_every_historical_bridge_and_exact_suffix(self):
        self.positive()

    def test_02_current375_baseline_cannot_skip_or_substitute_the368_hop(self):
        env = self.positive()
        # Keep the original375->368 refusal; add the actual380->375 boundary.
        for replacement in [env['historical359']['expected_profile_ids'],
                list(reversed(env['historical368']['expected_profile_ids'])),
                env['historical368']['expected_profile_ids'][:-1] + ['tha-ap375']]:
            def changed375(root):
                value = copy.deepcopy(intake._reviewed_current375(root))
                value['baseline_ids'] = list(replacement)
                return value
            with self.assertRaises(AssertionError):
                run_actual_preflight({'read_historical375': changed375})
        for replacement in [env['historical368']['expected_profile_ids'],
                list(reversed(env['historical375']['expected_profile_ids'])),
                env['historical375']['expected_profile_ids'][:-1] + ['tha-ap375']]:
            def changed380(root):
                value=copy.deepcopy(reviewed_intake380(root))
                value['baseline_ids']=list(replacement)
                return value
            with self.assertRaises(AssertionError):
                run_actual_preflight({'read_historical380':changed380})
        for replacement in [env['historical368']['expected_profile_ids'],env['historical375']['expected_profile_ids'],
                list(reversed(env['historical380']['expected_profile_ids'])),
                env['historical380']['expected_profile_ids'][:-1]+['tha-ap375']]:
            def changed(root,anchor):
                value=copy.deepcopy(intake.curated_additions(root,anchor))
                value['curation']['baseline_ids']=list(replacement)
                return value
            with self.assertRaises(AssertionError):
                run_actual_preflight({'curated_additions':changed})

    def test_03_historical368_baseline_keeps_full359_identity_and_order(self):
        env = self.positive()
        for replacement in [env['historical343']['expected_profile_ids'],
                list(reversed(env['historical359']['expected_profile_ids'])),
                env['historical359']['expected_profile_ids'][:-1] + ['tha-ap375']]:
            def changed(root):
                value = copy.deepcopy(intake._reviewed_current368(root))
                value['baseline_ids'] = list(replacement)
                return value
            with self.assertRaises(AssertionError):
                run_actual_preflight({'read_historical368': changed})

    def test_04_missing_or_wrong368_reader_is_rejected_after_genuine_positive(self):
        self.positive()
        for reader in (intake.read_335_350, lambda root: {}):
            with self.assertRaises((AssertionError, KeyError)):
                run_actual_preflight({'read_historical368': reader})
        for reader in (intake._reviewed_current368, lambda root: {}):
            with self.assertRaises((AssertionError, KeyError)):
                run_actual_preflight({'read_historical375': reader})


if __name__ == '__main__':
    unittest.main()
