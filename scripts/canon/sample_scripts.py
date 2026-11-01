"""Sample paragraph pairs from the VRI script editions for the transliteration tests.

Usage:
    python scripts/canon/sample_scripts.py <vri-checkout> <out.json.gz>

<vri-checkout> is a sparse checkout of VipassanaTech/tipitaka-xml at the pinned
commit (see COMMIT) containing romn/ and the script folders for FILES:

    git sparse-checkout set --no-cone '/romn/*.mul.xml' '/deva/s0101m.mul.xml' ...

For every file it reads the same paragraphs (<p> elements, in document order)
from romn/ and from each script edition, drops page-break markup and variant
notes, and keeps a deterministic sample. Variant notes are sampled separately,
because their abbreviations ("sī. syā.") are punctuated differently. The
fixture records the commit and the SHA-256 of every file it read, so a
different checkout is detected. tests/scripts.test.mjs compares
src/script.mjs against it in both directions.

Lao (laoo/) and Lanna (lana/) editions do not exist at the pinned commit, so
those two scripts are tested by round trip only.
"""
import gzip
import hashlib
import html
import json
import os
import random
import re
import subprocess
import sys

COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
REPOSITORY = 'https://github.com/VipassanaTech/tipitaka-xml'
SCRIPTS = ['deva', 'sinh', 'thai', 'mymr', 'khmr']
ABSENT = ['laoo', 'lana']
# Root texts from each piṭaka and several Nikāyas, prose and verse.
FILES = ['s0101m', 's0201m', 's0301m', 's0402m1', 's0502m', 's0508m', 's0514m', 'vin01m', 'vin02m1', 'abh01m']
PER_FILE = 100
NOTES_PER_FILE = 20
SEED = 26

PARA = re.compile(r'<p\b([^>]*)>(.*?)</p\s*>', re.S)
NOTE = re.compile(r'<note\b[^>]*>(.*?)</note\s*>', re.S)
REND = re.compile(r'rend="([^"]*)"')


def read(path):
    raw = open(path, 'rb').read()
    return raw, raw.decode('utf-16')


def clean(fragment):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', fragment))).strip()


def paragraphs(text):
    out = []
    for m in PARA.finditer(text):
        body = re.sub(r'<pb\b[^>]*/>', '', m.group(2))
        body = NOTE.sub('', body)
        rend = REND.search(m.group(1))
        out.append((rend.group(1) if rend else '', clean(body)))
    return out


def notes(text):
    return [clean(m.group(1)) for m in NOTE.finditer(text)]


def main(vri, out_path):
    try:
        head = subprocess.run(['git', '-C', vri, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        head = None
    if head != COMMIT:
        sys.exit(f'{vri} is at {head}, expected the pinned commit {COMMIT}')
    for folder in ABSENT:
        if os.path.isdir(os.path.join(vri, folder)):
            print(f'note: {folder}/ exists in this checkout; consider adding it to SCRIPTS')
    rng = random.Random(SEED)
    files = {}
    items = []
    note_items = []
    for name in FILES:
        texts = {}
        for script in ['romn'] + SCRIPTS:
            rel = f'{script}/{name}.mul.xml'
            raw, text = read(os.path.join(vri, rel))
            files[rel] = hashlib.sha256(raw).hexdigest()
            texts[script] = text
        paras = {s: paragraphs(t) for s, t in texts.items()}
        lengths = {len(p) for p in paras.values()}
        if len(lengths) != 1:
            sys.exit(f'{name}: paragraph counts differ between editions: {lengths}')
        candidates = [i for i, (_, text) in enumerate(paras['romn']) if text]
        for i in sorted(rng.sample(candidates, min(PER_FILE, len(candidates)))):
            item = {'file': name, 'p': i, 'rend': paras['romn'][i][0], 'romn': paras['romn'][i][1]}
            for s in SCRIPTS:
                item[s] = paras[s][i][1]
            items.append(item)
        nts = {s: notes(t) for s, t in texts.items()}
        if len({len(n) for n in nts.values()}) == 1:
            for i in sorted(rng.sample(range(len(nts['romn'])), min(NOTES_PER_FILE, len(nts['romn'])))):
                item = {'file': name, 'note': i, 'romn': nts['romn'][i]}
                for s in SCRIPTS:
                    item[s] = nts[s][i]
                note_items.append(item)
    fixture = {
        'source': {
            'name': 'VRI Chaṭṭha Saṅgāyana Tipiṭaka (tipitaka-xml)',
            'repository': REPOSITORY,
            'commit': COMMIT,
            'attribution': 'Vipassana Research Institute, www.tipitaka.org',
            'files_sha256': files,
            'absent_scripts': ABSENT,
            'generator': 'scripts/canon/sample_scripts.py',
            'seed': SEED,
        },
        'scripts': SCRIPTS,
        'paragraphs': items,
        'notes': note_items,
    }
    data = json.dumps(fixture, ensure_ascii=False, indent=0, sort_keys=False).encode('utf-8')
    os.makedirs(os.path.dirname(out_path) or '.', exist_ok=True)
    with open(out_path, 'wb') as f:
        # mtime=0 keeps the file byte-identical between runs.
        with gzip.GzipFile(fileobj=f, mode='wb', mtime=0, filename='') as gz:
            gz.write(data)
    print(f'{len(items)} paragraphs and {len(note_items)} notes from {len(FILES)} books -> {out_path} ({os.path.getsize(out_path)} bytes)')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
