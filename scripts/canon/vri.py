"""Parse VRI Chaṭṭha Saṅgāyana TEI XML (romn) into a flat list of blocks.

Each block keeps the visible Pāli text, its VRI paragraph number, the
variant-reading notes, the page breaks of the printed editions it carries
(P = Pali Text Society, M = Myanmar, V = VRI, T = Thai) and the stack of
enclosing divisions. Nothing is normalised beyond markup removal: the text
is the VRI text.
"""
import html
import re

BLOCK = re.compile(
    r'<div\b([^>]*)>|</div\s*>|<head\b([^>]*)>(.*?)</head\s*>|<p\b([^>]*)>(.*?)</p\s*>|<trailer\b([^>]*)>(.*?)</trailer\s*>',
    re.S,
)
ATTR = re.compile(r'(\w+)="([^"]*)"')
PB = re.compile(r'<pb\b[^>]*ed="(\w)"[^>]*n="([^"]+)"[^>]*/?>')
NOTE = re.compile(r'<note\b[^>]*>(.*?)</note\s*>', re.S)
PARANUM = re.compile(r'<hi rend="paranum">.*?</hi>\s*(?:<hi rend="dot">.*?</hi>)?', re.S)
TAG = re.compile(r'<[^>]+>')
SPACE = re.compile(r'\s+')


def clean(fragment):
    return SPACE.sub(' ', html.unescape(TAG.sub('', fragment))).strip()


def page(value):
    """'1.0055' -> (1, 55); '0.0001' -> (0, 1)."""
    vol, _, num = value.partition('.')
    try:
        return int(vol), int(num)
    except ValueError:
        return None


def read(path):
    raw = open(path, 'rb').read()
    for encoding in ('utf-16', 'utf-8'):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f'Cannot decode {path}')


def parse(path):
    text = read(path)
    blocks = []
    stack = []
    for m in BLOCK.finditer(text):
        if m.group(1) is not None:
            attrs = dict(ATTR.findall(m.group(1)))
            stack.append({'id': attrs.get('id', ''), 'type': attrs.get('type', ''), 'title': ''})
            continue
        if m.group(0).startswith('</div'):
            if stack:
                stack.pop()
            continue
        if m.group(2) is not None:
            attrs, body, kind = dict(ATTR.findall(m.group(2))), m.group(3), 'head'
        elif m.group(4) is not None:
            attrs, body, kind = dict(ATTR.findall(m.group(4))), m.group(5), 'p'
        else:
            attrs, body, kind = dict(ATTR.findall(m.group(6))), m.group(7), 'trailer'
        rend = attrs.get('rend', kind)
        pages = {}
        offsets = {}
        marked = PB.sub(lambda m: f'\x00{m.group(1)}{m.group(2)}\x00', NOTE.sub('', PARANUM.sub('', body)))
        marked = SPACE.sub(' ', html.unescape(TAG.sub('', marked))).strip()
        visible_parts, cursor = [], 0
        for piece in re.split(r'\x00(\w)([\d.]+)\x00', marked):
            visible_parts.append(piece)
        # re.split with two groups yields [text, ed, value, text, ed, value, ...]
        text_so_far = ''
        for i in range(0, len(visible_parts), 3):
            text_so_far += visible_parts[i]
            if i + 2 < len(visible_parts):
                ed, value = visible_parts[i + 1], visible_parts[i + 2]
                parsed = page(value)
                if parsed:
                    pages.setdefault(ed, []).append(parsed)
                    offsets.setdefault(ed, []).append(len(SPACE.sub(' ', text_so_far).lstrip()))
        notes = [clean(n) for n in NOTE.findall(body)]
        visible = clean(NOTE.sub('', PARANUM.sub('', PB.sub('', body))))
        if kind == 'head' and stack and not stack[-1]['title']:
            stack[-1]['title'] = visible
        if not visible and rend != 'hangnum' and not attrs.get('n'):
            continue
        blocks.append({
            'kind': kind,
            'rend': rend,
            'n': attrs.get('n'),
            'text': visible,
            'notes': notes,
            'pages': pages,
            'page_offsets': offsets,
            'divs': [dict(d) for d in stack],
        })
    return blocks


LABEL = re.compile(r'^\(?(\d+)\)?(?:\s*[-–]\s*(\d+))?\s*[.)]\s*(.*)$')


def label(text):
    """'2-5. Dutiyādi…' -> (2, 5, 'Dutiyādi…'); '10. Satipaṭṭhānasuttaṃ' -> (10, 10, …)."""
    m = LABEL.match(text)
    if not m:
        return None
    start = int(m.group(1))
    end = int(m.group(2)) if m.group(2) else start
    return start, end, m.group(3).strip()
