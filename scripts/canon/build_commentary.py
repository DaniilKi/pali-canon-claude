"""Build server/data/commentary.json.gz: the VRI Aṭṭhakathā (romn/*.att.xml) aligned to the root texts.

Usage:
    python scripts/canon/build_commentary.py <vri-dir> <vri-commit> <canon.json.gz> <out commentary.json.gz>

The VRI commentaries carry the paragraph numbers of the root text they explain
(`<p n="12">` in s0201a.att.xml comments on paragraph 12 of s0201m.mul.xml), and
they quote the root text in bold (lemmas). Alignment uses both:

1. Paragraph number. A commentary passage runs from one numbered paragraph to the
   next. Headings just before a numbered paragraph belong to the passage they
   introduce, and so does the opening of a text's commentary ("N. …suttavaṇṇanā"
   and its introduction) or a story told before its numbered verse (Dhammapada,
   Jātaka: a heading, then "… satthā … ārabbha kathesi"). Numbered front matter (introductory verses numbered 1, 2, 3… before
   the numbering restarts) is not a root reference and stays unaligned.
2. Lemma check. Every bold quotation in the passage is looked up in the root
   paragraph(s) it claims to explain. Only distinctive words count (found in at
   most 2% of the root book's paragraphs), since stock phrases prove nothing.
   The number is VRI's own cross-reference, so the quotations can confirm it or
   overturn it (see decide()):
     - confirmed (half of the quotations, or three, found): `paragraph+lemma`;
     - no distinctive quotation, or no other paragraph within 8 (neighbours
       excepted) fitting as well: aligned on the number alone, `paragraph`;
     - the quotations fit another paragraph within 8 better, or eight or more
       were checked and none found: left unaligned.
   Numbers out of sequence (a drop the next paragraph does not follow, or a typo
   such as "01") are not trusted.
   A verse quoted on its own and followed by the next verse with one explanation
   of both (the Dhammapada commentary's pairs) is one passage for both numbers.
   The report measures the check: it re-scores each passage against the wrong
   paragraph (7 further on) and gives how often that
   would have been aligned (the false-alignment rate of the check).
   Where a commentary file covers several root books (AN 2-4, the
   last five Abhidhamma books) the root book is chosen by the top-level division
   when the files have one, otherwise by the quotations, and only with a clear
   winner. No link is better than a wrong link.
3. Books that restart their paragraph numbers (the Jātaka at each nipāta, the
   Apadāna, Buddhavaṃsa, Cariyāpiṭaka, Paṭisambhidāmagga, Abhidhamma books) are
   split into segments where the numbering restarts. A passage goes to one
   segment only: the one whose verse it quotes, or whose paragraph its
   quotations clearly fit, or (on a tie) the one the previous passage went to,
   a little further on. Otherwise it stays unaligned.
4. Checks that can overturn the number: the stanza quoted right after the number
   is the root verse, so a stanza that is clearly the neighbouring paragraph's
   verse rejects the passage (the Suttanipāta commentary numbers some verses
   one higher than the root); a passage that opens with a heading naming a
   neighbouring text, not this one, is rejected (Theragāthā 16.3/16.4). Checks
   that can confirm it when the quotations point elsewhere: the passage quotes
   this paragraph's own verse in full ('paragraph+verse'), or its heading names
   this text ('paragraph+heading').

Passage boundaries: a numbered heading that opens a text ("3. Dukkhalakkhaṇavatthu",
"2. Mahākoṭṭhikattheragāthāvaṇṇanā", in the Jātaka even as body text) and
everything after it belong to the next numbered paragraph, never to the passage
before; when no numbered paragraph of that text follows, the passage still stops
before the heading and the rest stays unaligned. Book front matter (n="0",
"Namo tassa…", nikāya and book titles) belongs to no passage.

A root text (canon unit) gets an aligned passage when it holds the start of one of
the passage's root paragraphs, lies inside them, or is an abbreviated text in them.
Nothing is generated: every passage is VRI text, unchanged, except the ". " that
a paragraph number written "1." leaves at the start of its block.
A report of the alignment rates is written next to the output (*.report.json).
"""
import glob
import gzip
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vri  # noqa: E402

# Traditional names of the commentaries, by VRI file prefix. Shown to users with every passage.
WORKS = {
    's0101': ('Sumaṅgalavilāsinī', 'Dīgha Nikāya commentary', 'Sv'),
    's0102': ('Sumaṅgalavilāsinī', 'Dīgha Nikāya commentary', 'Sv'),
    's0103': ('Sumaṅgalavilāsinī', 'Dīgha Nikāya commentary', 'Sv'),
    's0201': ('Papañcasūdanī', 'Majjhima Nikāya commentary', 'Ps'),
    's0202': ('Papañcasūdanī', 'Majjhima Nikāya commentary', 'Ps'),
    's0203': ('Papañcasūdanī', 'Majjhima Nikāya commentary', 'Ps'),
    's0301': ('Sāratthappakāsinī', 'Saṃyutta Nikāya commentary', 'Spk'),
    's0302': ('Sāratthappakāsinī', 'Saṃyutta Nikāya commentary', 'Spk'),
    's0303': ('Sāratthappakāsinī', 'Saṃyutta Nikāya commentary', 'Spk'),
    's0304': ('Sāratthappakāsinī', 'Saṃyutta Nikāya commentary', 'Spk'),
    's0305': ('Sāratthappakāsinī', 'Saṃyutta Nikāya commentary', 'Spk'),
    's0401': ('Manorathapūraṇī', 'Aṅguttara Nikāya commentary', 'Mp'),
    's0402': ('Manorathapūraṇī', 'Aṅguttara Nikāya commentary', 'Mp'),
    's0403': ('Manorathapūraṇī', 'Aṅguttara Nikāya commentary', 'Mp'),
    's0404': ('Manorathapūraṇī', 'Aṅguttara Nikāya commentary', 'Mp'),
    's0501': ('Paramatthajotikā I', 'Khuddakapāṭha commentary', 'Pj I'),
    's0502': ('Dhammapada-aṭṭhakathā', 'Dhammapada commentary', 'Dhp-a'),
    's0503': ('Paramatthadīpanī (Udāna)', 'Udāna commentary', 'Ud-a'),
    's0504': ('Paramatthadīpanī (Itivuttaka)', 'Itivuttaka commentary', 'It-a'),
    's0505': ('Paramatthajotikā II', 'Suttanipāta commentary', 'Pj II'),
    's0506': ('Paramatthadīpanī (Vimānavatthu)', 'Vimānavatthu commentary', 'Vv-a'),
    's0507': ('Paramatthadīpanī (Petavatthu)', 'Petavatthu commentary', 'Pv-a'),
    's0508': ('Paramatthadīpanī (Theragāthā)', 'Theragāthā commentary', 'Th-a'),
    's0509': ('Paramatthadīpanī (Therīgāthā)', 'Therīgāthā commentary', 'Thī-a'),
    's0510': ('Visuddhajanavilāsinī', 'Apadāna commentary', 'Ap-a'),
    's0511': ('Madhuratthavilāsinī', 'Buddhavaṃsa commentary', 'Bv-a'),
    's0512': ('Paramatthadīpanī (Cariyāpiṭaka)', 'Cariyāpiṭaka commentary', 'Cp-a'),
    # PTS cites the Jātaka commentary by the pages of Fausbøll's edition, abbreviated Ja.
    's0513': ('Jātaka-aṭṭhakathā', 'Jātaka commentary', 'Ja'),
    's0514': ('Jātaka-aṭṭhakathā', 'Jātaka commentary', 'Ja'),
    's0515': ('Saddhammapajjotikā', 'Mahāniddesa commentary', 'Nidd-a I'),
    's0516': ('Saddhammapajjotikā', 'Cūḷaniddesa commentary', 'Nidd-a II'),
    's0517': ('Saddhammappakāsinī', 'Paṭisambhidāmagga commentary', 'Paṭis-a'),
    's0519': ('Nettippakaraṇa-aṭṭhakathā', 'Nettippakaraṇa commentary', 'Nett-a'),
    'vin01': ('Samantapāsādikā', 'Vinaya commentary', 'Sp'),
    'vin02': ('Samantapāsādikā', 'Vinaya commentary', 'Sp'),
    'abh01': ('Atthasālinī', 'Dhammasaṅgaṇī commentary', 'As'),
    'abh02': ('Sammohavinodanī', 'Vibhaṅga commentary', 'Vibh-a'),
    'abh03': ('Pañcapakaraṇa-aṭṭhakathā', 'commentary on the last five Abhidhamma books', 'Pañc-a'),
}
HEADING = {'subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead', 'centre'}
VERSE_ONLY = {'hangnum', 'gatha1', 'gatha2', 'gatha3', 'gathalast'} | HEADING
STORY = re.compile(r'ārabbha kathesi')
OPENING = re.compile(r'suttavaṇṇanā$')
# A numbered heading that opens the commentary on a text: "3. Dukkhalakkhaṇavatthu", "2. Mahākoṭṭhikattheragāthāvaṇṇanā",
# "5-10. Tissāditherīgāthāvaṇṇanā". It and everything after it belong to the next numbered paragraph, never to the
# passage before it (scripts/audit.mjs checks this on every aligned passage).
NUMBERED_OPENING = re.compile(r'^\d+(?:\s*[-–]\s*\d+)?\.\s*\S.*(?:vaṇṇanā|vatthu)$')
# Book front matter that never belongs to the first text's passage.
def heading_like(block):
    """A heading, or a short paragraph that is one: the Jātaka commentary marks "2. Vaṇṇupathajātakavaṇṇanā"
    as body text."""
    return block['rend'] in HEADING or (len(block['text']) <= 80 and bool(NUMBERED_OPENING.match(block['text'])))


NAMO = re.compile(r'^(?:\.\s*)?Namo tassa')
FRONT = {'centre', 'nikaya', 'book'}
NUM = re.compile(r'^(\d+)(?:\s*[-–]\s*(\d+))?$')
QUOTES = re.compile('[‘’“”\'"()\\[\\]–—,;:.?!…]')


def fold(value):
    value = unicodedata.normalize('NFD', value or '')
    value = ''.join(ch for ch in value if not unicodedata.combining(ch)).lower()
    return value.replace('ṁ', 'm')


def para_range(n):
    m = NUM.match((n or '').strip())
    if not m:
        return None
    a = int(m.group(1))
    tail = m.group(2) or m.group(1)
    if len(tail) < len(m.group(1)):  # "105-6" is 105-106
        tail = m.group(1)[:len(m.group(1)) - len(tail)] + tail
    b = int(tail)
    # There is no root paragraph 0: n="0" marks book front matter ("Namo tassa…").
    return (a, b) if b >= a and a > 0 else None


def lemma_words(lemma):
    """Words of a bold quotation worth checking: folded, niggahita/vowel endings trimmed, 4+ letters."""
    words = []
    for w in QUOTES.sub(' ', fold(lemma)).split():
        w = re.sub(r'(m|ti|nti)$', '', w) if len(w) > 5 else w
        if len(w) >= 4:
            words.append(w[:12])
    return words


def lemma_hits(lemmas, root, a, b):
    """(checked, hits): quotations with at least one distinctive word, and those found in paragraphs a..b."""
    text = root.text(a, b)[0]
    checked = hits = 0
    for lemma in lemmas:
        words = [w for w in lemma_words(lemma) if root.distinctive(w)]
        if not words:
            continue
        checked += 1
        if sum(1 for w in words if w in text) * 2 >= len(words):
            hits += 1
    return checked, hits


def accept(checked, hits):
    """Lemma rule: half the distinctive quotations found, or at least three of them."""
    return hits * 2 >= checked or hits >= 3


def decide(lemmas, root, a, b, window=8):
    """Alignment of a passage numbered a..b to `root`: (evidence or None, checked, hits).

    The paragraph number is VRI's own cross-reference; the quotations confirm it or overturn it.
    Paragraphs next to the claimed ones (a-1, b+1) are not counted as rivals: the commentary on a
    pair of verses or a run of similar suttas naturally quotes its neighbours.
    - the quotations fit another paragraph within `window` better (2+ found there, more than here,
      and at least twice as many when 3+ were found here): rejected;
    - enough quotations found here (accept()): 'paragraph+lemma';
    - no distinctive quotation, or none of them found anywhere nearby: aligned on the number ('paragraph');
    - some found here and none nearby fits as well: aligned on the number ('paragraph');
    - otherwise (none found here and some nearby, or 8+ checked and none found): rejected.
    """
    checked, hits = lemma_hits(lemmas, root, a, b)
    if not checked:
        return 'paragraph', checked, hits
    best_other = 0
    for q in range(a - window, b + window + 1):
        if a - 1 <= q <= b + 1 or q not in root.paras:
            continue
        best_other = max(best_other, lemma_hits(lemmas, root, q, q)[1])
    # A rival overturns the number when it fits better; strong local evidence (3+) only when the rival doubles it.
    if best_other >= 2 and best_other > hits and not (hits >= 3 and best_other < 2 * hits):
        return None, checked, hits
    if accept(checked, hits):
        return 'paragraph+lemma', checked, hits
    if hits == 0 and checked >= 8:
        return None, checked, hits
    if hits >= best_other:
        return 'paragraph', checked, hits
    return None, checked, hits


def stanza_words(blocks, num):
    """Words (folded, 4+ letters) of the stanza quoted right after the numbered block `num`, if any."""
    k, lines = num + 1, []
    if blocks[num]['rend'] != 'hangnum' and blocks[num]['text']:
        return []
    while k < len(blocks) and blocks[k]['rend'] in ('gatha1', 'gatha2', 'gatha3', 'gathalast'):
        lines.append(blocks[k]['text'])
        k += 1
    return [w for w in QUOTES.sub(' ', fold(' '.join(lines))).split() if len(w) >= 4]


def stanza_fit(blocks, p, root, a, b):
    """Share of the words of the stanza quoted right after the number found in root paragraphs a..b
    (0 when there is no stanza of at least four words)."""
    words = stanza_words(blocks, p['num'])
    if len(words) < 4 or not root.has(a, b):
        return 0
    text = root.text(a, b)[0]
    return sum(1 for w in words if w in text) / len(words)


def stanza_off(blocks, p, root, a, b):
    """The quoted stanza fits a neighbouring root paragraph (a-1 or b+1) and not paragraphs a..b."""
    neighbour = max(stanza_fit(blocks, p, root, q, q) for q in (a - 1, b + 1))
    return stanza_fit(blocks, p, root, a, b) < 0.5 and neighbour >= 0.8


def title_key(value):
    """Folded letters of a title or heading, with the nasal before k/g written n (saṃkhitta = saṅkhitta)."""
    return re.sub(r'[^a-z]', '', re.sub(r'[nm](?=[kg])', 'n', fold(value)))


GROUP = re.compile(r'^\d+\s*[-–]\s*\d+\.|ādi|(dvaya|ttika|tika|catukka|pañcaka|chakka|sattaka|aṭṭhaka|navaka|dasaka|vagga)(vaṇṇanā)?$')


def opening_keys(blocks, p, single=False):
    """Title keys of the headings that open a text ("N. …vaṇṇanā", "N. …vatthu", "…suttavaṇṇanā") at the head
    of passage p, before its numbered paragraph. single: only headings of one text (not "8-11. …",
    "…ādivaṇṇanā", "…suttacatukkavaṇṇanā", which name a group)."""
    keys = []
    for h in range(p['start'], p['num']):
        text = blocks[h]['text']
        if single and GROUP.search(text):
            continue
        if heading_like(blocks[h]) and (NUMBERED_OPENING.match(text) or OPENING.search(text)):
            keys.append(title_key(re.sub(r'(sutta)?vaṇṇanā$|vatthu$', '', re.sub(r'^[\d\-–. ]+', '', text))))
    return keys


def names(key, title):
    """A heading key names a text title: both start with the same 8 letters (6 when one is that short).
    A heading without an ordinal names the first of a numbered pair or series ("Abhabbaṭṭhāna…" for
    "Paṭhamaabhabbaṭṭhānasuttaṃ"), never the second ("Dasabala…" is not "Dutiyadasabalasuttaṃ")."""
    t = re.sub(r'(suttam|sutta)$', '', title_key(title or ''))
    if not key.startswith('pathama'):
        t = re.sub(r'^pathama', '', t)
    n = min(8, len(key), len(t))
    return n >= 6 and key[:n] == t[:n]


def units_at(root, q):
    """Canon texts (with any range starting there) holding the first block of root paragraph q."""
    return root.units_for(root.text(q, q)[1][:1])


def heading_names(blocks, p, root, a):
    """The passage opens with a text heading ("1. Paṭhamaduccaritasuttavaṇṇanā") that names the root text
    holding paragraph a."""
    keys = opening_keys(blocks, p)
    return any(names(k, u.get('title')) for k in keys for u in units_at(root, a))


def heading_elsewhere(blocks, p, root, a, b):
    """The passage opens with a heading that names a neighbouring root text (paragraphs a-3..b+3) and not
    the one holding paragraph a: the commentary numbers this boundary differently from the root (Theragāthā
    16.3/16.4: the commentary's 769 is Raṭṭhapāla's first verse, the root's 769 Telakāni's last)."""
    keys = opening_keys(blocks, p, single=True)
    here = [u for q in range(a, b + 1) for u in units_at(root, q)]
    if not keys or any(names(k, u.get('title')) for k in keys for u in here):
        return False
    ids = {u['id'] for u in here}
    return any(u['id'] not in ids and names(k, u.get('title'))
               for q in range(a - 3, b + 4) for u in units_at(root, q) for k in keys)


def top_div(block):
    return block['divs'][0]['id'] if block['divs'] else ''


def stem(file):
    return os.path.basename(file).split('.')[0]


def candidates(att_stem, canon_books):
    m = re.match(r'^([a-z]+\d+)a(\d*)$', att_stem)
    if not m:
        return []
    prefix, suffix = m.group(1), m.group(2)
    stems = {i: stem(b['file']) for i, b in enumerate(canon_books)}
    found = [i for i, s in stems.items() if re.match(rf'^{prefix}m\d*$', s)]
    exact = [i for i in found if stems[i] == f'{prefix}m{suffix}'] if suffix else []
    if exact:
        return exact
    # Jātaka: the commentary is split into s0513a1-4 and s0514a1-3; the root into s0513m and s0514m.
    return found


class RootBook:
    """Paragraph index of one canon book, or of one segment of it: paragraph number -> block indices and
    folded text.

    Many books restart their paragraph numbers (the Jātaka at each nipāta, the Apadāna, Buddhavaṃsa,
    Cariyāpiṭaka, Paṭisambhidāmagga, several Abhidhamma books): there paragraph 1 is a dozen different
    places. segments() splits such a book where the numbering restarts, and a commentary passage is aligned
    to one segment only, never to all the places that share its number (see main()).
    """

    def __init__(self, index, book, units, top, lo=0, hi=None, parent=None):
        self.index = index
        self.file = book['file']
        self.book = book
        self.top = top  # set of top-level division ids in the VRI file (e.g. {'an2'})
        self.blocks = book['blocks']
        self.lo, self.hi = lo, len(self.blocks) if hi is None else hi
        self.parent = parent
        self.paras = {}
        current = None
        for i in range(self.lo, self.hi):
            blk = self.blocks[i]
            r = para_range(blk[1])
            if r:
                current = r
                for p in range(r[0], r[1] + 1):
                    self.paras.setdefault(p, []).append(i)
                continue
            if current and blk[0] not in HEADING:
                for p in range(current[0], current[1] + 1):
                    self.paras[p].append(i)
        self.units = sorted(units, key=lambda u: (u['start'], u['end']))

        self._texts = {}
        self._cache = {}
        self._df = {}
        self._segments = None

    def segments(self):
        """The book split where its paragraph numbers restart (a number not above the one before it)."""
        if self._segments is None:
            cuts, prev = [self.lo], None
            for i in range(self.lo, self.hi):
                r = para_range(self.blocks[i][1])
                if r:
                    if prev and r[0] <= prev[0]:
                        cuts.append(i)
                    prev = r
            if len(cuts) == 1:
                self._segments = [self]
            else:
                cuts.append(self.hi)
                self._segments = [RootBook(self.index, self.book, self.units, self.top, x, y, self)
                                  for x, y in zip(cuts, cuts[1:])]
        return self._segments

    def distinctive(self, word):
        """A word found in at most 2% of the book's paragraphs (min. 3): stock words prove nothing.
        Counted over the whole book (every segment)."""
        if self.parent:
            return self.parent.distinctive(word)
        if word not in self._df:
            if not self._texts:
                self._texts = {(k, p): seg.text(p, p)[0] for k, seg in enumerate(self.segments()) for p in seg.paras}
            self._df[word] = sum(1 for t in self._texts.values() if word in t)
        return self._df[word] <= max(3, len(self._texts) * 0.02)

    def has(self, a, b):
        return any(p in self.paras for p in range(a, b + 1))

    def text(self, a, b):
        key = (a, b)
        if key not in self._cache:
            idx = sorted({i for p in range(a, b + 1) for i in self.paras.get(p, [])})
            self._cache[key] = (' '.join(fold(self.blocks[i][2]) for i in idx), idx)
        return self._cache[key]

    def units_for(self, idx):
        if not idx:
            return []
        lo, hi = min(idx), max(idx) + 1
        wanted = set(idx)
        return [u for u in self.units if u['start'] < hi and u['end'] > lo and any(u['start'] <= i < u['end'] for i in wanted)]

    def texts_for(self, a, b):
        """Canon texts explained by root paragraphs a..b: those holding the start of one of them, those lying
        inside them (several short texts in one paragraph), and abbreviated (peyyāla) texts in them. Not a text
        that merely shares a stray block with the paragraph (Ja 152 begins with the last line of a verse
        numbered 2, which belongs to Ja 151)."""
        idx = self.text(a, b)[1]
        wanted = set(idx)
        starts = {self.paras[p][0] for p in range(a, b + 1) if p in self.paras}
        out = []
        for u in self.units_for(idx):
            inside = all(i in wanted or self.blocks[i][0] in HEADING for i in range(u['start'], u['end']))
            if u.get('approximate') or inside or any(u['start'] <= i < u['end'] for i in starts):
                out.append(u)
        return out


def opens_text(blocks, h, j):
    """Block h (before numbered block j) is a heading that opens the commentary on a new text:
    "N. …suttavaṇṇanā", or a story told before the verse it explains (Dhammapada, Jātaka: a heading,
    then "…ti imaṃ dhammadesanaṃ satthā … ārabbha kathesi", the story, then the numbered verse)."""
    b = blocks[h]
    if not heading_like(b) or h + 1 > j:
        return False
    if NUMBERED_OPENING.match(b['text']):
        return True
    if b['rend'] == 'centre' or h + 1 >= j:
        return False
    return bool(OPENING.search(b['text'])) or bool(STORY.search(blocks[h + 1]['text']))


def back_to_opening(blocks, j, numbered, floor):
    """Extend a passage starting at j (headings included; numbered block at `numbered`) back to the
    heading that opens its text, unless one is already included. Never crosses a numbered paragraph,
    a book title or `floor`. Closing lines ("… niṭṭhitā", "Godhiko thero.") may be crossed: anything
    after the previous numbered paragraph that follows an opening heading belongs to the next one."""
    if any(opens_text(blocks, h, numbered + 1) for h in range(j, numbered)):
        return j
    for h in range(j - 1, floor, -1):
        if para_range(blocks[h]['n']) or blocks[h]['rend'] in ('nikaya', 'book'):
            break
        if opens_text(blocks, h, j):
            # with the chapter headings right above it ("16. Piyavaggo")
            while h - 1 > floor and blocks[h - 1]['rend'] in HEADING and blocks[h - 1]['rend'] not in FRONT                     and not para_range(blocks[h - 1]['n']):
                h -= 1
            return h
    return j


def passages_of(blocks):
    """Split commentary blocks into passages that each start at a numbered paragraph.

    Returns (passages, front) where passages are dicts {start, end, para:(a,b), front:bool}.
    """
    starts = [i for i, b in enumerate(blocks) if para_range(b['n'])]
    out = []
    for k, s in enumerate(starts):
        e = starts[k + 1] if k + 1 < len(starts) else len(blocks)
        divs = blocks[s]['divs']
        out.append({'start': s, 'end': e, 'para': para_range(blocks[s]['n']), 'div': top_div(blocks[s]),
                    'sub': divs[1]['id'] if len(divs) > 1 else '', 'raw': blocks[s]['n'].strip(), 'num': s})
    # Headings directly before a numbered paragraph introduce it: move them forward.
    if out:
        j = out[0]['start']
        while j - 1 >= 0 and blocks[j - 1]['rend'] in HEADING and blocks[j - 1]['rend'] not in FRONT:
            j -= 1
        out[0]['start'] = back_to_opening(blocks, j, out[0]['start'], -1)
    for k in range(1, len(out)):
        prev, cur = out[k - 1], out[k]
        j = cur['start']
        while j - 1 > prev['start'] and blocks[j - 1]['rend'] in HEADING and blocks[j - 1]['rend'] != 'centre':
            j -= 1
        # A new book inside the file: its front matter ("Namo tassa…", the nikāya and book titles) belongs to
        # neither text.
        k0 = j
        while k0 < cur['start'] and blocks[k0]['rend'] in ('nikaya', 'book'):
            k0 += 1
        if k0 > j:
            end = j
            while end - 1 > prev['start'] and blocks[end - 1]['rend'] == 'centre' and NAMO.match(blocks[end - 1]['text']):
                end -= 1
            prev['end'], cur['start'] = end, k0
            continue
        # The heading that opens a text's commentary, with any introduction before its first numbered
        # paragraph, belongs to that paragraph (see opens_text()).
        j = back_to_opening(blocks, j, cur['start'], prev['start'])
        prev['end'] = cur['start'] = j
    # A numbered verse quoted on its own, followed by the next verse and one explanation of both
    # (the Dhammapada commentary does this for pairs): one passage for both numbers.
    merged = []
    for p in out:
        prev = merged[-1] if merged else None
        opened = any(opens_text(blocks, h, p['num'] + 1) for h in range(p['start'], p['num']))
        if prev and prev['verse_only'] and not opened and prev['div'] == p['div'] and p['para'][0] == prev['para'][1] + 1:
            prev.update(end=p['end'], para=(prev['para'][0], p['para'][1]),
                        verse_only=all(b['rend'] in VERSE_ONLY for b in blocks[p['start']:p['end']]))
            continue
        p['verse_only'] = all(b['rend'] in VERSE_ONLY for b in blocks[p['start']:p['end']])
        merged.append(p)
    out = merged
    # A numbered heading that opens a text ("N. …vaṇṇanā", "N. …vatthu") never ends a passage: when it is
    # still inside one after its numbered paragraph (a summary of several texts with no paragraph number of
    # its own, a section the root does not number), the passage stops before it and the rest stays unaligned.
    for p in out:
        for h in range(p['num'] + 1, p['end']):
            if heading_like(blocks[h]) and NUMBERED_OPENING.match(blocks[h]['text']):
                p['end'] = h
                break
    # Front matter: a run of numbers followed (within the same division) by a restart at or below its first number.
    for k, p in enumerate(out):
        p['front'] = False
    run_start = 0
    for k in range(1, len(out) + 1):
        restart = k == len(out) or out[k]['div'] != out[k - 1]['div'] or out[k]['para'][0] < out[k - 1]['para'][1] - 2             or (out[k]['para'][0] <= out[k - 1]['para'][0] and out[k]['sub'] != out[k - 1]['sub'])
        if not restart:
            continue
        if k < len(out) and out[k]['div'] == out[run_start]['div'] and out[k]['para'][0] <= out[run_start]['para'][0] \
                and (k - run_start) < 40:
            for j in range(run_start, k):
                out[j]['front'] = True
        run_start = k
    # A number out of sequence (a drop that the next paragraph does not follow, or a typo such as "01")
    # is not trusted.
    for k, p in enumerate(out):
        p['anomaly'] = bool(re.match(r'^0\d', p['raw']))
        if 0 < k < len(out) - 1 and not p['front'] and not out[k - 1]['front'] and p['div'] == out[k - 1]['div']                 and p['para'][0] < out[k - 1]['para'][1] - 2 and out[k + 1]['para'][0] > out[k - 1]['para'][1]:
            p['anomaly'] = True
    return out


def main(vri_dir, commit, canon_path, out_path):
    canon = json.loads(gzip.open(canon_path).read())
    units_by_book = {}
    for u in canon['units']:
        units_by_book.setdefault(u['book'], []).append(u)
    roots = {}

    def root(i):
        if i not in roots:
            book = canon['books'][i]
            path = os.path.join(vri_dir, 'romn', book['file'])
            top = {top_div(b) for b in vri.parse(path)} - {''}
            roots[i] = RootBook(i, book, units_by_book.get(i, []), top)
        return roots[i]

    books, passages, unit_map = [], [], {}
    last = {}  # root book -> (segment, last paragraph) of the latest aligned passage
    cited = {}  # root book -> block indices that some numbered commentary passage claims to explain
    stats = {}
    files = sorted(glob.glob(os.path.join(vri_dir, 'romn', '*.att.xml')))
    for path in files:
        att = stem(path)
        prefix = re.match(r'^([a-z]+\d+)a', att)
        if not prefix or prefix.group(1) not in WORKS:
            print(f'skip {att}: not a commentary on a bundled root book', file=sys.stderr)
            continue
        cands = candidates(att, canon['books'])
        if not cands:
            print(f'skip {att}: no root book', file=sys.stderr)
            continue
        blocks = vri.parse(path)
        for b in blocks:
            # A paragraph number written "1." without VRI's dot markup leaves ". " after the number is removed
            # (and n="0" front matter reads ". Namo tassa…"): that dot is part of the number, not the text.
            if b['n'] is not None:
                b['text'] = re.sub(r'^\.\s+', '', b['text'])
        work, desc, abbr = WORKS[prefix.group(1)]
        title = next((b['text'] for b in blocks if b['rend'] == 'book'), work)
        bi = len(books)
        books.append({
            'file': os.path.basename(path), 'work': work, 'description': desc, 'abbr': abbr, 'title': title,
            'root_files': [canon['books'][c]['file'] for c in cands],
            # [rend, vri paragraph, text, PTS pages of the commentary edition]
            'blocks': [[b['rend'], b['n'], b['text'], ['%d.%d' % p for p in b['pages'].get('P', [])]] for b in blocks],
        })
        for p in passages_of(blocks):
            colls = sorted({'vinaya' if canon['books'][c]['collection'].startswith('vin') else canon['books'][c]['collection'] for c in cands})
            coll = '+'.join(colls)
            st = stats.setdefault(coll, {'passages': 0, 'aligned': 0, 'paragraph_only': 0, 'lemma': 0,
                                         'rejected_lemma': 0, 'no_root_paragraph': 0, 'ambiguous': 0, 'front_matter': 0,
                                         'control_checked': 0, 'control_accepted': 0, 'out_of_sequence': 0,
                                         'verse_mismatch': 0, 'verse': 0, 'heading': 0,
                                         'heading_mismatch': 0})
            st['passages'] += 1
            if p['front']:
                st['front_matter'] += 1
                continue
            if p['anomaly']:
                st['out_of_sequence'] += 1
                continue
            a, b = p['para']
            lemmas = [x for blk in blocks[p['start']:p['end']] for x in blk['bold']]
            pool = [root(c) for c in cands]
            if len(pool) > 1 and p['div']:
                same = [r for r in pool if p['div'] in r.top]
                if same:
                    pool = same
            # Every place in the candidate books that carries this number: one per book, or one per segment
            # where a book restarts its numbering (RootBook.segments()).
            pool = [seg for r in pool for seg in r.segments() if seg.has(a, b)]
            if not pool:
                st['no_root_paragraph'] += 1
                continue
            scored = []
            for r in pool:
                evidence, checked, hits = decide(lemmas, r, a, b)
                verse = stanza_fit(blocks, p, r, a, b) >= 0.8
                scored.append((verse, hits, checked, evidence, r))
            scored.sort(key=lambda x: (-x[0], -x[1]))
            pick = scored[0]
            if len(scored) > 1:
                second = scored[1]
                # The commentary goes through the root in order: the place where the previous passage was
                # aligned, a little further on, breaks a tie when the quotations confirm it there (never
                # overrules them).
                prev = last.get(pick[4].index)
                cont = [x for x in scored if prev and x[4] is prev[0] and prev[1] < a <= prev[1] + 20]
                if pick[0] and not second[0]:
                    pass  # only one place has the verse the commentary quotes
                elif pick[1] >= 2 and pick[1] > second[1]:
                    pass  # the quotations clearly fit one place
                elif cont and cont[0][:2] == pick[:2] and cont[0][3] == 'paragraph+lemma':
                    pick = cont[0]
                else:
                    st['ambiguous'] += 1
                    continue
            verse, hits, checked, evidence, r = pick
            cited.setdefault(r.index, set()).update(r.text(a, b)[1])
            # Control: would the same quotations have been accepted at a wrong paragraph (7 further on)?
            if checked and r.has(a + 7, b + 7):
                st['control_checked'] += 1
                st['control_accepted'] += decide(lemmas, r, a + 7, b + 7)[0] is not None
            # The quotations point elsewhere, but the passage quotes this paragraph's own verse in full right
            # after the number (Dhp-a explains verses 206-208 after quoting 208), or opens with a heading that
            # names this text ("1. Paṭhamaduccaritasuttavaṇṇanā" for AN 5.241): the number stands.
            if not evidence and stanza_fit(blocks, p, r, a, b) >= 0.8:
                evidence = 'paragraph+verse'
            elif not evidence and heading_names(blocks, p, r, a):
                evidence = 'paragraph+heading'
            # A stanza quoted right after the number is the root verse itself: when it is clearly the verse
            # of a neighbouring paragraph and not of this one, the number is off (Suttanipāta: the commentary
            # numbers some verses one higher than the root edition does). Not aligned.
            if evidence and stanza_off(blocks, p, r, a, b):
                st['verse_mismatch'] += 1
                continue
            if evidence and heading_elsewhere(blocks, p, r, a, b):
                st['heading_mismatch'] += 1
                continue
            if not evidence:
                st['rejected_lemma'] += 1
                continue
            idx = r.text(a, b)[1]
            st[{'paragraph': 'paragraph_only', 'paragraph+lemma': 'lemma', 'paragraph+verse': 'verse',
                'paragraph+heading': 'heading'}[evidence]] += 1
            st['aligned'] += 1
            pi = len(passages)
            # The root segment (block range) goes with the passage: in a book that restarts its numbering,
            # paragraphs a..b mean the ones inside it.
            passages.append([bi, p['start'], p['end'], r.index, a, b, checked, hits, evidence, r.lo, r.hi])
            last[r.index] = (r, b)
            for u in r.texts_for(a, b):
                unit_map.setdefault(u['id'], []).append(pi)
    # Per-collection unit coverage: texts with at least one aligned passage; and texts the commentary
    # explains by number at all (`cited`), aligned or not (it is silent on some, e.g. AN 1.9-10).
    coverage, cited_unaligned = {}, []
    root_books = {i for i, b in enumerate(canon['books']) for bk in books if b['file'] in bk['root_files']}
    for u in canon['units']:
        if u['book'] not in root_books:
            continue
        coll = 'vinaya' if u['collection'].startswith('vin') else u['collection']
        c = coverage.setdefault(coll, {'texts': 0, 'with_commentary': 0, 'cited': 0, 'cited_aligned': 0})
        c['texts'] += 1
        if u['id'] in unit_map:
            c['with_commentary'] += 1
        marks = cited.get(u['book'], ())
        if any(i in marks for i in range(u['start'], u['end'])):
            c['cited'] += 1
            c['cited_aligned'] += u['id'] in unit_map
            if u['id'] not in unit_map:
                cited_unaligned.append(u['id'])
    data = {
        'source': {
            'name': 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Aṭṭhakathā',
            'repository': 'https://github.com/VipassanaTech/tipitaka-xml',
            'commit': commit,
            'files': 'romn/*.att.xml',
            'attribution': 'Vipassana Research Institute (VRI), Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org',
            'terms': 'Made freely available by VRI for non-commercial use with attribution.',
        },
        'books': books,
        'passages': passages,
        'units': unit_map,
        # Texts the commentary numbers but that no passage is aligned to (the quotations contradict the number),
        # and the per-collection counts: scripts/audit.mjs holds them to a floor and a list of known exceptions.
        'cited_unaligned': cited_unaligned,
        'coverage': coverage,
    }
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    with gzip.GzipFile(out_path, 'wb', compresslevel=9, mtime=0) as fh:
        fh.write(raw)
    report = {'passages': stats, 'texts': coverage, 'cited_unaligned': cited_unaligned, 'books': len(books), 'aligned_passages': len(passages),
              'aligned_texts': len(unit_map), 'bytes_raw': len(raw), 'bytes_gz': os.path.getsize(out_path)}
    with open(out_path + '.report.json', 'w', encoding='utf-8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    main(*sys.argv[1:])
