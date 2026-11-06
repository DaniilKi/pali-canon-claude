"""Synthetic XML fixtures only: no Chinese translation body is stored in the repository."""
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import inspect_cbeta_khp as inspect

ET.register_namespace('', inspect.NS['t'])
ET.register_namespace('cb', inspect.NS['cb'])


def fixture():
    root = ET.Element(f"{{{inspect.NS['t']}}}TEI", {inspect.XML_ID: 'N26n0008'})
    def t(parent, name, text=None, attrs=None):
        node = ET.SubElement(parent, f"{{{inspect.NS['t']}}}{name}", attrs or {})
        node.text = text
        return node
    header = t(root, 'teiHeader')
    desc = t(header, 'fileDesc')
    t(t(desc, 'titleStmt'), 'author', '悟醒譯')
    publication = t(desc, 'publicationStmt')
    t(t(publication, 'availability'), 'p', 'Available for non-commercial use when distributed with this header intact.')
    t(publication, 'date', '2025-01-30 02:14:01 +0800')
    t(t(desc, 'sourceDesc'), 'bibl', '漢譯南傳大藏經（元亨寺版）')
    text = t(root, 'text')
    body = t(text, 'body')
    headings = ['一 三歸文', '二 十戒文', '三 三十二身分', '四 問沙彌文', '五 吉祥經', '六 三寶經', '七 戶外經', '八 伏藏經', '九 慈悲經']
    ids = ['pN26p0001a0701', 'pN26p0001a1101', 'pN26p0002a0401', 'pN26p0002a0901']
    for i, heading in enumerate(headings, 1):
        section = ET.SubElement(body, f"{{{inspect.NS['cb']}}}div", {'type': 'other'})
        ET.SubElement(section, f"{{{inspect.NS['cb']}}}mulu").text = heading
        t(section, 'head', '小誦經' if i == 1 else heading)
        if i == 1:
            preface = t(section, 'lg', 'SYNTHETIC PREFACE', {inspect.XML_ID: 'lgN26p0001a0301'})
            t(preface, 'ref', attrs={'cRef': 'PTS.Khp.1'})
            t(section, 'p', heading, {inspect.XML_ID: 'pN26p0001a0601', inspect.CB_TYPE: 'head1'})
        paragraph = t(section, 'p', 'SYNTHETIC BODY: not scripture', {inspect.XML_ID: ids[i - 1] if i <= 4 else f'fixture{i}'})
        if i == 2:
            t(paragraph, 'ref', attrs={'cRef': 'PTS.Khp.2'})
        if i == 4:
            t(paragraph, 'anchor', attrs={inspect.XML_ID: 'nkr_note_orig_0002001', 'n': '0002001'})
        if i == 5:
            t(paragraph, 'ref', attrs={'cRef': 'PTS.Khp.3'})
    back = t(text, 'back')
    t(back, 'note', 'SYNTHETIC NOTE: not a translation', {'target': '#nkr_note_orig_0002001', 'n': '0002001', 'resp': '#resp2', 'type': 'orig'})
    return root


class CandidateInspection(unittest.TestCase):
    def test_heading_mapping_keeps_pages_distinct_and_exports_no_body(self):
        result = inspect.inspect_tree(fixture())
        self.assertEqual([row['canonical_id'] for row in result['candidate_boundaries']], ['kp1', 'kp2', 'kp3', 'kp4'])
        self.assertEqual(result['candidate_boundaries'][2]['source_section'], 3)
        self.assertEqual(result['pts_khp_3_source_section'], 5)
        self.assertNotIn('SYNTHETIC', json.dumps(result))

    def test_duplicate_xml_identity_is_ambiguous(self):
        root = fixture()
        root.findall('.//t:p', inspect.NS)[-1].set(inspect.XML_ID, 'pN26p0002a0401')
        with self.assertRaisesRegex(ValueError, 'duplicate XML IDs'):
            inspect.inspect_tree(root)

    def test_missing_or_reordered_headings_are_rejected(self):
        for mode in ['missing', 'reordered', 'duplicate']:
            root = fixture()
            body = root.find('./t:text/t:body', inspect.NS)
            sections = list(body)
            if mode == 'duplicate':
                sections[3].find('cb:mulu', inspect.NS).text = '三 三十二身分'
            else:
                body.remove(sections[3])
                if mode == 'reordered':
                    body.insert(0, sections[3])
            with self.assertRaisesRegex(ValueError, 'section headings'):
                inspect.inspect_tree(root)

    def test_changed_body_boundaries_are_rejected(self):
        root = fixture()
        section = root.findall('./t:text/t:body/cb:div', inspect.NS)[2]
        ET.SubElement(section, f"{{{inspect.NS['t']}}}p", {inspect.XML_ID: 'unexpected'}).text = 'SYNTHETIC extra passage'
        with self.assertRaisesRegex(ValueError, 'content boundaries'):
            inspect.inspect_tree(root)

    def test_pts_page_three_cannot_supply_the_third_text_mapping(self):
        root = fixture()
        sections = root.findall('./t:text/t:body/cb:div', inspect.NS)
        ref = sections[4].find('.//t:ref', inspect.NS)
        sections[4].find('t:p', inspect.NS).remove(ref)
        sections[2].append(ref)
        with self.assertRaisesRegex(ValueError, 'page reference in section 5'):
            inspect.inspect_tree(root)

    def test_linked_note_cannot_be_missing_or_ambiguous(self):
        for duplicate in [False, True]:
            root = fixture()
            back = root.find('./t:text/t:back', inspect.NS)
            note = back.find('t:note', inspect.NS)
            back.append(copy.deepcopy(note)) if duplicate else back.remove(note)
            with self.assertRaisesRegex(ValueError, 'linked source note'):
                inspect.inspect_tree(root)

    def test_preface_is_not_silently_folded_into_the_first_translation(self):
        result = inspect.inspect_tree(fixture())['candidate_boundaries'][0]
        self.assertEqual(result['content_xml_ids'], ['pN26p0001a0701'])
        self.assertEqual(result['excluded_preface_xml_ids'], ['lgN26p0001a0301'])

    def test_original_header_condition_is_required(self):
        root = fixture()
        root.find('.//t:availability/t:p', inspect.NS).text = 'Changed fixture condition'
        with self.assertRaisesRegex(ValueError, 'header condition'):
            inspect.inspect_tree(root)

    def test_structural_success_cannot_assign_a_license_or_approve_translation(self):
        data = ET.tostring(fixture(), encoding='utf-8')
        # Use a synthetic pin only inside this test, preserving the production pin unchanged.
        pinned = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                  'git_blob_sha1': hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()}
        with tempfile.TemporaryDirectory() as directory, patch.dict(inspect.SPEC['source'], pinned):
            path = Path(directory) / 'fixture.xml'
            path.write_bytes(data)
            result = inspect.inspect_file(path)
        self.assertFalse(result['gates']['runtime_enabled'])
        self.assertEqual(result['gates']['independent_bilingual_review'], 'not_obtained')
        self.assertIsNone(result['rights']['assigned_cc_license'])
        self.assertFalse(result['translation_text_exported'])

    def test_real_pin_rejects_a_synthetic_or_modified_document(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.xml'
            path.write_bytes(ET.tostring(fixture()))
            with self.assertRaisesRegex(ValueError, 'Pinned CBETA artifact'):
                inspect.inspect_file(path)
            path.write_bytes(b'x' * inspect.SPEC['source']['bytes'])
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                inspect.inspect_file(path)

    def test_cli_failure_replaces_a_stale_success_report(self):
        with tempfile.TemporaryDirectory() as directory:
            path, report = Path(directory) / 'fixture.xml', Path(directory) / 'result.json'
            path.write_bytes(ET.tostring(fixture()))
            report.write_text('{"status":"old_success"}')
            result = subprocess.run([sys.executable, str(Path(inspect.__file__)), str(path), '--report', str(report)], capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(json.loads(report.read_text())['status'], 'rejected')

    def test_cli_report_cannot_overwrite_the_original_source(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.xml'
            data = ET.tostring(fixture())
            path.write_bytes(data)
            result = subprocess.run([sys.executable, str(Path(inspect.__file__)), str(path), '--report', str(path)], capture_output=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(path.read_bytes(), data)


if __name__ == '__main__':
    unittest.main()
