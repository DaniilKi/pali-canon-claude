"""Build-lane regressions; publisher prose remains in an optional local checkout."""
import copy
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import reviewed_ati_sections as sections

ROOT = Path(__file__).resolve().parents[2]


class ReviewedAtiSections(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(sections.MANIFEST.read_text(encoding='utf-8'))

    def write_manifest(self, path, value):
        path.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')

    def test_finite_identity_cannot_be_relabelled_or_extended(self):
        self.assertEqual(len(sections.manifest_rows()['links']), 14)
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
            for filename in ['miln.2x.kell.html', 'miln.3x.kell.html']:
                path = Path('tipitaka/kn/miln', filename)
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
