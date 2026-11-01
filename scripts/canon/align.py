"""Align standard citation numbers to VRI text locations by matching opening words.

The citation numbering in common use (Bodhi / SuttaCentral IDs such as sn46.131-140)
is taken from the file and segment names of the public-domain Mahāsaṅgīti Pāli root
(bilara-data root/pli/ms, Public Domain Mark). Its wording derives from the VRI
edition, so each text's opening words can be found in the VRI blocks. Only the
resulting mapping (citation number -> VRI book/block) is kept; no Mahāsaṅgīti or
SuttaCentral text is shipped.
"""
import json
import os
import re
import unicodedata

LETTERS = re.compile(r'[^a-zāīūṅñṭḍṇḷṃ]')
SKIP_SEGMENT = re.compile(r':0(?:\.|$)|:\d+\.0$|:\d+(?:\.\d+)*\.0\.\d+$')


ENUMERATOR = re.compile(r'\([^()]{0,6}\)')
TAGS = re.compile(r'<[^>]+>')


def norm(text):
    # Drop markup and short enumerators such as "(Ka)", "(Kha)" that only one edition prints.
    text = ENUMERATOR.sub('', TAGS.sub('', text))
    text = unicodedata.normalize('NFC', text.lower()).replace('ṁ', 'ṃ').replace('ŋ', 'ṃ')
    text = text.replace('…pe…', '').replace('pe…', '')
    return LETTERS.sub('', text)


def member_key(segment_id):
    return segment_id.split(':', 1)[0]


def read_root(path):
    data = json.load(open(path, encoding='utf-8'))
    members = {}
    for seg, text in data.items():
        key = member_key(seg)
        members.setdefault(key, []).append((seg, text))
    return members


# Setting formulae that editions write out or abbreviate differently ("Sāvatthinidānaṃ").
STOCK = re.compile(r'^(?:sāvatthiyaṃviharati(?:jetavaneanāthapiṇḍikassaārāme)?|sāvatthinidānaṃ|sāvatthiyaṃ|tatravoca|tatrakhobhagavābhikkhūāmantesibhikkhavotibhadantetitebhikkhūbhagavatopaccassosuṃbhagavāetadavoca)')


def openings(segments, length=48):
    """Distinctive normalised opening text: first body segments, skipping headings, numbering lines and stock settings."""
    body = [norm(t) for s, t in segments if not SKIP_SEGMENT.search(s)]
    body = [b for b in body if b and not b.isdigit()]
    joined = ''.join(body)
    while True:
        stripped = STOCK.sub('', joined)
        if stripped == joined:
            break
        joined = stripped
    return joined[:length], joined


def root_files(bilara, prefix):
    base = os.path.join(bilara, 'root', 'pli', 'ms', prefix)
    for dirpath, _, files in os.walk(base):
        for f in files:
            if f.endswith('_root-pli-ms.json'):
                yield os.path.join(dirpath, f)


UID = re.compile(r'^([a-z-]+?)(\d+(?:\.\d+)*)?(?:-(\d+))?$')


# Canonical order of the Vibhaṅga rule classes (not alphabetical).
VINAYA_ORDER = {c: i for i, c in enumerate(['pj', 'ss', 'ay', 'np', 'pc', 'pd', 'sk', 'as'])}


def sort_key(uid):
    m = re.match(r'^(pli-tv-b[ui]-vb-)([a-z]+)(.*)$', uid)
    if m:
        rest = [int(p) if p.isdigit() else p for p in re.findall(r'\d+|[a-z-]+', m.group(3))]
        return [m.group(1), VINAYA_ORDER.get(m.group(2), 99)] + rest
    parts = re.findall(r'\d+|[a-z-]+', uid)
    return [int(p) if p.isdigit() else p for p in parts]


BODY = ('bodytext', 'gatha1', 'gatha2', 'gatha3', 'gathalast', 'hangnum', 'unindented', 'indent', 'centre', 'subhead')


class Stream:
    """All VRI blocks of one collection as a single normalised string with block offsets."""

    def __init__(self, canon, collections):
        self.parts, self.offsets = [], []
        text, pos = [], 0
        for bi, book in enumerate(canon['books']):
            if book['collection'] not in collections:
                continue
            for k, blk in enumerate(book['blocks']):
                if blk[0] not in BODY:
                    continue
                t = norm(blk[2])
                self.parts.append((bi, k))
                self.offsets.append(pos)
                text.append(t)
                pos += len(t)
        self.text = ''.join(text)

    def locate(self, offset):
        import bisect
        i = bisect.bisect_right(self.offsets, offset) - 1
        return self.parts[i]


def align_group(stream, members, start=0, window=600000):
    """members: [(key, segments)] in citation order. Returns {key: (book, block, offset)} and misses."""
    found, misses, pos = {}, [], start
    for key, segs in members:
        op, full = openings(segs, 40)
        if len(op) < 10:
            op = full[:max(len(full), 0)]
        if len(op) < 6:
            misses.append((key, 'too short'))
            continue
        j = stream.text.find(op, pos, pos + window) if found else stream.text.find(op, pos)
        if j < 0:
            # tolerate punctuation/sandhi drift: retry with a shorter prefix
            short = op[:20]
            j = stream.text.find(short, pos, pos + window) if found else stream.text.find(short, pos)
        if j < 0:
            misses.append((key, op[:30]))
            continue
        found[key] = (*stream.locate(j), j)
        pos = j + 1
    return found, misses


class RegionStream(Stream):
    """Stream restricted to explicit (book, start_block, end_block) spans."""

    def __init__(self, canon, spans):
        self.parts, self.offsets = [], []
        text, pos = [], 0
        for bi, s, e in spans:
            for k in range(s, e):
                blk = canon['books'][bi]['blocks'][k]
                if blk[0] not in BODY:
                    continue
                t = norm(blk[2])
                self.parts.append((bi, k))
                self.offsets.append(pos)
                text.append(t)
                pos += len(t)
        self.text = ''.join(text)


def align_region(stream, members):
    """Monotonic search with a local fallback: each member must occur after the previous match;
    if it does not, search the whole region (editions occasionally reorder)."""
    found, misses, pos = {}, [], 0
    for key, segs in members:
        op, full = openings(segs, 40)
        candidates = [op] + ([op[:24]] if len(op) > 24 else []) + ([full[40:80]] if len(full) > 80 else [])
        j = -1
        for cand in candidates:
            if len(cand) < 8:
                continue
            j = stream.text.find(cand, pos)
            if j >= 0:
                break
        if j < 0:
            for cand in candidates:
                if len(cand) >= 12 and (j := stream.text.find(cand)) >= 0:
                    break
        if j < 0:
            misses.append((key, op[:30]))
            continue
        found[key] = (*stream.locate(j), j)
        pos = j + 1
    return found, misses


def longest_increasing(keys_offsets):
    """Indexes (into the list) forming the longest strictly increasing run of offsets, preserving citation order."""
    import bisect
    tails, tails_idx, prev = [], [], [-1] * len(keys_offsets)
    for i, (_, off) in enumerate(keys_offsets):
        j = bisect.bisect_left(tails, off)
        if j == len(tails):
            tails.append(off)
            tails_idx.append(i)
        else:
            tails[j] = off
            tails_idx[j] = i
        prev[i] = tails_idx[j - 1] if j else -1
    out, k = [], tails_idx[-1] if tails_idx else -1
    while k >= 0:
        out.append(k)
        k = prev[k]
    return set(out)


def align_ordered(stream, members):
    """Align, keep only matches consistent with citation order, then re-search the rest between anchored neighbours."""
    found, misses = align_region(stream, members)
    order = [k for k, _ in members]
    seq = [(k, found[k][2]) for k in order if k in found]
    keep = longest_increasing(seq)
    anchored = {seq[i][0]: found[seq[i][0]] for i in keep}
    dropped = [k for k, _ in seq if k not in anchored]
    segs = dict(members)
    # Re-search unanchored members inside the window between their anchored neighbours.
    for idx, key in enumerate(order):
        if key in anchored:
            continue
        lo = max((anchored[k][2] for k in order[:idx] if k in anchored), default=0)
        hi = min((anchored[k][2] for k in order[idx + 1:] if k in anchored), default=len(stream.text))
        op, full = openings(segs[key], 40)
        hit = -1
        for cand in (op, op[:24], op[:16], full[40:80], full[80:120]):
            if len(cand) >= 10:
                hit = stream.text.find(cand, lo + 1, hi)
                if hit >= 0:
                    break
        if hit >= 0:
            anchored[key] = (*stream.locate(hit), hit)
    still = [(k, 'unlocated') for k in order if k not in anchored]
    return anchored, still, dropped


def distinctive_windows(full, size=36, step=18, span=600):
    """Candidate anchors from the opening of a text, most distinctive first is decided by the caller."""
    out = []
    for i in range(0, max(1, min(len(full), span) - size + 1), step):
        w = full[i:i + size]
        if len(w) >= 16:
            out.append((i, w))
    if not out and len(full) >= 8:
        out.append((0, full))
    return out


def align_unique(stream, members):
    """Anchor each text on an opening window that is rare in the region, keep anchors in citation order.

    For every member we try windows from its first ~600 normalised characters and prefer one that
    occurs exactly once in the region (falling back to the rarest). The match position minus the
    window offset estimates where the text starts. A longest-increasing pass then drops anchors that
    contradict citation order, and those members are re-searched between their neighbours.
    """
    text = stream.text
    anchors = {}
    for key, segs in members:
        _, full = openings(segs, 40)
        best = None
        for off, w in distinctive_windows(full):
            count = text.count(w)
            if count == 0:
                continue
            if best is None or count < best[0]:
                best = (count, off, w)
            if count == 1:
                break
        if best is None:
            continue
        count, off, w = best
        positions = []
        j = text.find(w)
        while j >= 0 and len(positions) < 50:
            positions.append(j)
            j = text.find(w, j + 1)
        anchors[key] = (count, off, w, positions)
    order = [k for k, _ in members]
    # First pass: unique anchors only.
    fixed = {k: a[3][0] - a[1] for k, a in anchors.items() if a[0] == 1}
    raw = {k: a[3][0] for k, a in anchors.items() if a[0] == 1}
    seq = [(k, fixed[k]) for k in order if k in fixed]
    keep = longest_increasing(seq)
    placed = {seq[i][0]: seq[i][1] for i in keep}
    # Second pass: ambiguous anchors take the occurrence that fits between placed neighbours.
    for idx, key in enumerate(order):
        if key in placed or key not in anchors:
            continue
        lo = max((placed[k] for k in order[:idx] if k in placed), default=-1)
        hi = min((placed[k] for k in order[idx + 1:] if k in placed), default=len(text) + 1)
        _, off, _, positions = anchors[key]
        fits = [(p - off, p) for p in positions if lo < p - off < hi]
        if fits:
            placed[key] = fits[0][0]
            raw[key] = fits[0][1]
    # (book, estimated start block, position, block holding the anchor window itself)
    found = {k: (*stream.locate(max(0, p)), p, stream.locate(raw.get(k, p))[1]) for k, p in placed.items()}
    misses = [(k, 'unplaced') for k in order if k not in found]
    return found, misses


def root_title(segments):
    """The Pāli title segment(s) of a Mahāsaṅgīti root text (0.x lines), last one is the text title."""
    heads = [t for s, t in segments if re.search(r':0\.\d+$', s)]
    return heads[-1].strip() if heads else ''
