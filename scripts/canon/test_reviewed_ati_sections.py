"""Build-lane regressions; publisher prose remains in an optional local checkout."""
import copy
import hashlib
import json
import os
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

import reviewed_ati_sections as sections

ROOT = Path(__file__).resolve().parents[2]


class ReviewedAtiSections(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(sections.MANIFEST.read_text(encoding='utf-8'))

    def write_manifest(self, path, value):
        path.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def test_finite_identity_cannot_be_relabelled_or_extended(self):
        self.assertEqual(len(sections.manifest_rows()['links']), 45)
        old = [r for r in self.manifest['links'] if r['unit_id'] not in sections.AN_TEN_IDENTITIES]
        self.assertEqual(hashlib.sha256(json.dumps(old, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest(),
                         '5445cc945d6c9247a0676ddf4413b551e13cf9b9b9aa5b324bfd9f070d20ce9f')
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp, 'manifest.json')
            for kind in ['commit', 'owner', 'path', 'anchor', 'license', 'translator', 'profile', 'first', 'last', 'notes', 'paragraphs', 'extra', 'duplicate', 'missing', 'paratext', 'source']:
                bad = copy.deepcopy(self.manifest)
                row = bad['links'][0]
                if kind == 'commit': bad['ati_commit'] = '0' * 40
                elif kind == 'owner': row['unit_id'] = 'mil3.1.9'
                elif kind == 'path': row['path'] += '/../other'
                elif kind == 'anchor': row['anchor'] = 'miln-2-3-08'
                elif kind == 'license': row['license'] = 'CC-BY-NC'
                elif kind == 'translator': row['translator'] = 'Different author'
                elif kind == 'profile': row['section']['profile'] = 'whole-page'
                elif kind == 'first': row['section']['first_ref'] = row['unit_id'] + '/1'
                elif kind == 'last': row['section']['last_ref'] = row['unit_id'] + '/6'
                elif kind == 'notes': row['section']['note_count'] = 1
                elif kind == 'paragraphs': row['section']['paragraph_count'] = 10
                elif kind == 'extra': row['section']['guessed_alignment'] = True
                elif kind == 'duplicate': bad['links'][-1] = copy.deepcopy(row)
                elif kind == 'missing': bad['links'].pop()
                elif kind == 'paratext': row['untranslated_paratext'] = []
                elif kind == 'source': row['source_html_sha256'] = '0' * 64
                self.write_manifest(path, bad)
                with self.subTest(kind=kind), self.assertRaises(ValueError):
                    sections.manifest_rows(path)
            for approved in [r for r in self.manifest['links'] if r['unit_id'] in sections.AN_TEN_IDENTITIES]:
                for kind in ['selection_id', 'missing_selection', 'extra_key', 'heading', 'parent_title', 'anchor', 'paragraphs', 'notes', 'first', 'last', 'paratext', 'path', 'source']:
                    bad = copy.deepcopy(self.manifest)
                    row = next(r for r in bad['links'] if r['unit_id'] == approved['unit_id'])
                    if kind == 'selection_id': row['section']['selection_id'] = 'an1.44'
                    elif kind == 'missing_selection': del row['section']['selection_id']
                    elif kind == 'extra_key': row['section']['selector'] = 'p'
                    elif kind == 'heading': row['section']['heading'] = row['english_title']
                    elif kind == 'parent_title': row['english_title'] += ' invented heading'
                    elif kind == 'anchor': row['anchor'] = row['section']['anchor'] = 'invented'
                    elif kind == 'paragraphs': row['section']['paragraph_count'] += 1
                    elif kind == 'notes': row['section']['note_count'] = 1 - row['section']['note_count']
                    elif kind == 'first': row['section']['first_ref'] = row['unit_id'] + '/99'
                    elif kind == 'last': row['section']['last_ref'] = row['unit_id'] + '/99'
                    elif kind == 'paratext': row['untranslated_paratext'].append({'ref': row['unit_id'] + '/1', 'text': 'invented'})
                    elif kind == 'path': row['path'] = '/tipitaka/an/an01/an01.021-040.than'
                    elif kind == 'source': row['source_html_sha256'] = '0' * 64
                    self.write_manifest(path, bad)
                    with self.subTest(unit=approved['unit_id'], kind=kind), self.assertRaises(ValueError):
                        sections.manifest_rows(path)

    def test_whole_page_and_wrong_owner_proposals_are_withheld_without_mutating_other_links(self):
        page = self.manifest['links'][0]['path']
        existing = {
            'wrong-owner': [
                {'source': 'ati', 'path': page, 'url': 'https://accesstoinsight.org' + page + '.html#wrong'},
                {'source': 'ati', 'url': 'https://www.accesstoinsight.org' + page + '.html?bypass=1'},
            ],
            'keep': [{'source': 'dhammatalks', 'url': 'https://www.dhammatalks.org/suttas/MN/MN1.html'}],
        }
        before = copy.deepcopy(existing)
        out, removed = sections.withhold_section_page_proposals(existing)
        self.assertEqual(existing, before)
        self.assertEqual(out, {'keep': before['keep']})
        self.assertEqual(len(removed), 2)
        original = json.loads(Path(ROOT, 'server/data/translations.json').read_text(encoding='utf-8'))
        retained = {}
        for owner, path, digest in sections.RETAINED_SHARED_BINDINGS:
            link = next(link for link in original[owner]
                        if hashlib.sha256(json.dumps(link, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest() == digest)
            retained[owner] = [copy.deepcopy(link)]
        before = copy.deepcopy(retained)
        self.assertEqual(len(retained), 5)
        self.assertEqual(sections.withhold_section_page_proposals(retained), (before, []))
        for owner, path, digest in sections.RETAINED_SHARED_BINDINGS:
            for kind in ['missing', 'duplicate', 'moved', 'forged', 'scope_removed']:
                bad = copy.deepcopy(before)
                if kind == 'missing': bad[owner].clear()
                elif kind == 'duplicate': bad[owner].append(copy.deepcopy(bad[owner][0]))
                elif kind == 'moved': bad['an1.44'] = bad.pop(owner)
                elif kind == 'forged': bad[owner][0]['shared_scope']['alignment'] = 'whole-unit'
                elif kind == 'scope_removed': del bad[owner][0]['shared_scope']
                snapshot = copy.deepcopy(bad)
                # Preflight refusal happens before source reads and leaves every
                # historical choice intact, even when the caller supplied bad data.
                with self.subTest(owner=owner, kind=kind), self.assertRaises(ValueError):
                    sections.apply_reviewed_section_links(bad, {}, 'unused')
                self.assertEqual(bad, snapshot)
                with patch.object(sections, 'reviewed_section_links', return_value={}), \
                     patch.object(sections, 'withhold_section_page_proposals', return_value=(bad, [])), \
                     self.assertRaises(ValueError):
                    sections.apply_reviewed_section_links(before, {}, 'unused')
                self.assertEqual(retained, before)
            polluted = copy.deepcopy(before)
            polluted['an1.44'] = [copy.deepcopy(before[owner][0])]
            polluted[owner].append({k: copy.deepcopy(v) for k, v in before[owner][0].items() if k != 'shared_scope'})
            output, removed = sections.withhold_section_page_proposals(polluted)
            self.assertEqual(output, before)
            self.assertEqual(len(removed), 2)

    @unittest.skipUnless(os.getenv('PALI_ATI_SECTIONS_SOURCE_DIR'), 'Set PALI_ATI_SECTIONS_SOURCE_DIR to the pinned official ATI checkout')
    def test_actual_pinned_sources_activate_atomically_and_reject_root_and_source_drift(self):
        checkout = Path(os.environ['PALI_ATI_SECTIONS_SOURCE_DIR'])
        # Use the same integrity-checked shard reader as the application.
        data = subprocess.run(['node', '--input-type=module', '-e',
            "import{readBundled}from'./src/bundled-data.mjs';import{gunzipSync}from'node:zlib';process.stdout.write(gunzipSync(readBundled('server/data/canon.json.gz')));"],
            cwd=ROOT, capture_output=True, check=True)
        canon = json.loads(data.stdout)
        original = json.loads(Path(ROOT, 'server/data/translations.json').read_text(encoding='utf-8'))
        before = copy.deepcopy(original)
        out, report = sections.apply_reviewed_section_links(original, canon, checkout)
        self.assertEqual(original, before)
        self.assertEqual(set(report['owners']), set(sections.IDENTITIES))
        self.assertEqual(sections.apply_reviewed_section_links(out, canon, checkout)[0], out)
        for uid, links in before.items():
            self.assertEqual([link for link in out[uid] if link.get('match') != 'reviewed-ati-section'],
                             [link for link in links if link.get('match') != 'reviewed-ati-section'])
        for kind in ['canonical_revision', 'identity', 'root_wording']:
            bad = copy.deepcopy(canon)
            first = next(unit for unit in bad['units'] if unit['id'] == self.manifest['links'][0]['unit_id'])
            if kind == 'canonical_revision': bad['source']['commit'] = '0' * 40
            elif kind == 'identity': first['title'] += ' changed'
            else: bad['books'][first['book']]['blocks'][first['start']][2] += ' changed'
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                sections.apply_reviewed_section_links(original, bad, checkout)
            self.assertEqual(original, before)
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp, 'source')
            for filename in [path.lstrip('/') + '.html' for path in sections.PAGES]:
                path = Path(filename)
                target = source / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes((checkout / path).read_bytes())
            target = source / 'tipitaka/kn/miln/miln.2x.kell.html'
            target.write_bytes(target.read_bytes() + b' changed')
            with self.assertRaises(ValueError):
                sections.apply_reviewed_section_links(original, canon, source)
            self.assertEqual(original, before)
            target.unlink()
            outside = Path(tmp, 'outside.html')
            outside.write_bytes((checkout / 'tipitaka/kn/miln/miln.2x.kell.html').read_bytes())
            try:
                target.symlink_to(outside)
            except OSError as error:
                if os.name == 'nt' and getattr(error, 'winerror', None) == 1314:
                    return  # Windows privilege restriction; no unsafe fallback.
                raise
            with self.assertRaises(ValueError):
                sections.apply_reviewed_section_links(original, canon, source)
            self.assertEqual(original, before)


if __name__ == '__main__':
    unittest.main()
