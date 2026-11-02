"""Map English translations on dhammatalks.org and Access to Insight to canon text IDs.

Usage: python3 scripts/canon/build_translations.py <canon.json.gz> <dt-index.json> <ati-index.json> <out.json>
           [--content <bcbsit-ati checkout> <dt-page-cache-dir>]

--content runs the content-based linker (#37) on the pages left unlinked: names, numbers and PTS spans.

Both sites number SN and AN (and parts of KN) by the older PTS scheme, which differs
from the standard IDs in places, so pages are matched by content: the Pāli title,
the PTS page (ATI) and number proximity. Each mapping records how it was matched.
"""
import gzip
import html
import json
import os
import re
import sys
import time
import unicodedata
import urllib.request

ORDINALS = re.compile(r'(pathama|dutiya|tatiya|catuttha|pancama|chattha|sattama|atthama|navama|dasama)')


def fold(text):
    text = unicodedata.normalize('NFD', text or '').lower()
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.replace('ṁ', 'm').replace('ṃ', 'm')
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'(suttam|sutta|suttani|gatha|theragatha|therigatha|vatthu|vaggo|vagga|pali)', '', text)
    return re.sub(r'[^a-z]', '', text)


def base(title):
    return ORDINALS.sub('', fold(title))


def similar(a, b):
    a, b = fold(a), fold(b)
    if not a or not b or len(a) < 3 or len(b) < 3:
        return 0
    if a == b:
        return 3
    if ORDINALS.sub('', a) == ORDINALS.sub('', b):
        return 2
    if a in b or b in a:
        return 1
    return 0


def number_of(uid):
    m = re.search(r'(\d+)(?:-(\d+))?$', uid)
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None


def section_of(uid):
    m = re.match(r'^([a-z-]+\d*\.)', uid)
    return m.group(1) if m else re.match(r'^[a-z-]+', uid).group(0)


STRONG = {'number+title', 'pts-start+title', 'pts-start+number', 'chapter', 'number'}
ORDINAL_WORDS = {'pathama': 1, 'dutiya': 2, 'tatiya': 3, 'catuttha': 4, 'pancama': 5, 'chattha': 6, 'sattama': 7, 'atthama': 8, 'navama': 9, 'dasama': 10}


def pali_ordinal(title):
    t = fold(title)
    for word, n in ORDINAL_WORDS.items():
        if t.startswith(word):
            return n
    return None


def english_ordinal(text):
    m = re.search(r'\((\d+)\)\s*$', (text or '').split('|')[0].strip()) or re.search(r'\((\d+)\)', text or '')
    return int(m.group(1)) if m else None


def english_title(entry):
    if entry['source'] == 'ati':
        return entry.get('english', '')
    return re.sub(r'^\S+ [\dIVXLC:.,–-]+\s*', '', entry.get('reference', ''))


def page_key(entry):
    """The sutta a page is about, ignoring the translator: ATI 'an03.065.than' and 'an03.065.bodh' share 'an03.065'."""
    if entry['source'] == 'ati':
        return re.sub(r'x$', '', entry['path'].rsplit('.', 1)[0])   # 'sn22.084x.wlsh' is another translation of sn22.084
    return entry['url']


def conservative(out, by_id, report):
    """Keep only links with strong evidence; drop anything ambiguous. A missing link is safe, a wrong one is not."""
    strong_ati_titles = {}
    for uid, links in out.items():
        for l in links:
            if l['source'] == 'ati' and l['match'] in STRONG:
                strong_ati_titles.setdefault(uid, set()).add(fold(english_title(l)))
    kept, dropped = {}, {}
    for uid, links in out.items():
        unit = by_id.get(uid, {})
        p_ord = pali_ordinal(unit.get('title', ''))
        good = []
        for l in links:
            ok = l['match'] in STRONG
            if l['match'] == 'ati-title':
                # A dhammatalks.org page bridged through ATI must carry the same English title as a strongly matched ATI page.
                ok = fold(english_title(l)) in strong_ati_titles.get(uid, set()) and bool(fold(english_title(l)))
                if ok:
                    l = dict(l, match='ati-title-confirmed')
            e_ord = english_ordinal(l.get('reference', '') if l['source'] == 'dhammatalks' else l.get('english', ''))
            if ok and p_ord and e_ord and p_ord != e_ord:
                ok = False
            if ok:
                good.append(l)
            else:
                dropped[l['match']] = dropped.get(l['match'], 0) + 1
        # One sutta per text: if links point at different pages of the same source, keep only an unambiguous best.
        final = []
        for source in ('dhammatalks', 'ati'):
            group = [l for l in good if l['source'] == source]
            keys = {page_key(l) for l in group}
            if len(keys) <= 1:
                final.extend(group)
                continue
            num = re.search(r'(\d+)$', uid)
            exact = [l for l in group if l['match'].startswith(('number', 'pts-start'))]
            exact_keys = {page_key(l) for l in exact}
            if len(exact_keys) == 1:
                final.extend(exact)
                dropped['ambiguous-sibling'] = dropped.get('ambiguous-sibling', 0) + len(group) - len(exact)
            else:
                dropped['ambiguous'] = dropped.get('ambiguous', 0) + len(group)
        if final:
            kept[uid] = final
    report['dropped_for_safety'] = dropped
    return kept


# ---------------------------------------------------------------------------
# Content-based linker (#37): a second pass over the pages the rules above left
# unlinked. It compares the names in the English (people, places, Pāli terms the
# translator kept) with the Pāli of the texts near the page's own number, and
# for Access to Insight also with the PTS page the page cites. A link is added
# only when one text carries rare names from the page and no nearby text comes
# close. Nothing is fetched from SuttaCentral; dhammatalks.org pages are read
# once, politely, and cached outside the repository.
# ---------------------------------------------------------------------------
CONTENT_WINDOW = 15          # texts within this many numbers of the page's own number are candidates
CONTENT_MAX_SHARE = 0.02     # a name is "rare" if at most 2% of the collection's texts contain it,
CONTENT_MIN_RARE = 6         # or at most this many texts, whichever is larger
ENGLISH_STOP = set("""about above after again against almost already also although always among another anyone anything
around because become before behind being below beside besides between beyond blessed brahmin brahmins brahman brahmans
cannot could during either elsewhere enough every everyone everything further having however indeed instead itself later
little many master monks monk might never nothing often other others otherwise perhaps rather really since something
sometimes still their themselves there therefore these thing things those though through thus together toward towards
under unless until venerable whatever when whenever where whereas wherever whether which while whoever whole whose
would yourself lord friend friends reverend householder teacher great noble nuns lady ladies gods
world truth chapter section notes translator introduction sutta suttas samyutta nikaya vagga devaputta""".split())


def content_fold(word):
    w = unicodedata.normalize('NFD', word or '').lower()
    w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    w = w.replace('ṁ', 'm').replace('ṃ', 'm').replace('.', '')
    w = re.sub(r'([aiu])\1', r'\1', w)   # Velthuis-style long vowels on older ATI pages ("Saariputta")
    return re.sub(r'[^a-z]', '', w)


def stem(term):
    s = term[:-1] if len(term) <= 6 else term[:-2]
    return s if len(s) >= 4 else None


def html_body(raw, start_marks, end_marks):
    found = [raw.find(m) for m in start_marks if raw.find(m) >= 0]
    lo = min(found) if found else 0
    his = [raw.find(m, lo) for m in end_marks if raw.find(m, lo) >= 0]
    body = raw[lo:min(his)] if his else raw[lo:]
    return re.sub(r'<(script|style)\b.*?</\1>', ' ', body, flags=re.S | re.I)


def english_terms(body):
    """Names and Pāli words in an English page: capitalised words, words with diacritics, italicised words."""
    italics = ' '.join(re.findall(r'<(?:i|em)\b[^>]*>(.*?)</(?:i|em)>', body, flags=re.S | re.I))
    text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
    raw = [w.strip('.') for w in re.findall(r"[A-Za-zÀ-ɏḀ-ỿ.]+", text) if w[:1].isupper() or re.search(r'[^\x00-\x7f]', w)]
    raw += re.findall(r"[A-Za-zÀ-ɏḀ-ỿ]+", html.unescape(re.sub(r'<[^>]+>', ' ', italics)))
    terms = set()
    for w in raw:
        f = content_fold(w)
        if len(f) >= 5 and f not in ENGLISH_STOP and stem(f):
            terms.add(f)
    return terms


def read_page(page, ati_root, dt_cache):
    entry = page['entry']
    if entry['source'] == 'ati':
        raw = open(os.path.join(ati_root, page['file']), encoding='utf-8', errors='replace').read()
        return html_body(raw, ['id="H_docTitle"', 'id="H_content"'], ['id="F_footer"', 'id="F_toenail"', 'id="F_citation"'])
    os.makedirs(dt_cache, exist_ok=True)
    cached = os.path.join(dt_cache, re.sub(r'[^A-Za-z0-9_.-]', '_', entry['url'].split('/suttas/')[1]))
    if not os.path.exists(cached):
        req = urllib.request.Request(entry['url'], headers={'User-Agent': 'pali-canon-claude link builder (read-only; https://github.com/DaniilKi/pali-canon-claude)'})
        raw = urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
        open(cached, 'w', encoding='utf-8').write(raw)
        time.sleep(1)
    raw = open(cached, encoding='utf-8').read()
    return html_body(raw, ['id="sutta"'], ['class="footer'])


def content_link(out, pages, canon, by_id, ati_root, dt_cache):
    """Link pages the conservative rules left unlinked, on names shared with exactly one nearby text."""
    report = {'considered': 0, 'added': {}, 'rejected': {}}
    reject = lambda why: report['rejected'].__setitem__(why, report['rejected'].get(why, 0) + 1)
    linked_urls = {l['url'] for links in out.values() for l in links}
    tokens, coll_units = {}, {}
    for u in canon['units']:
        if u.get('approximate') or u.get('kind') == 'range':
            continue
        blocks = canon['books'][u['book']]['blocks'][u['start']:u['end']]
        tokens[u['id']] = {content_fold(w) for b in blocks for w in re.findall(r'\S+', b[2] or '')}
        coll_units.setdefault(u['collection'], []).append(u['id'])
    hit_cache, df_cache = {}, {}

    def hits(term, uid):
        key = (term, uid)
        if key not in hit_cache:
            s = stem(term)
            hit_cache[key] = any(t.startswith(s) for t in tokens.get(uid, ()))
        return hit_cache[key]

    def df(term, coll):
        key = (term, coll)
        if key not in df_cache:
            df_cache[key] = sum(1 for uid in coll_units.get(coll, []) if hits(term, uid))
        return df_cache[key]

    proposals = []
    for page in pages:
        entry = page['entry']
        if entry['url'] in linked_urls:
            continue
        if re.search(r'\d-\d|intro', page.get('name', '')):   # multi-text pages and introductions stay unlinked
            continue
        section, n = page['section'], page['n']
        cands = [by_id[uid] for uid in tokens if section_of(uid) == section and number_of(uid)
                 and abs(number_of(uid)[0] - n) <= CONTENT_WINDOW]
        if not cands:
            continue
        report['considered'] += 1
        coll = cands[0]['collection']
        try:
            body = read_page(page, ati_root, dt_cache)
        except Exception:  # noqa: BLE001
            reject('unreadable')
            continue
        limit = max(CONTENT_MIN_RARE, CONTENT_MAX_SHARE * len(coll_units.get(coll, [])))
        rare = {t for t in english_terms(body) if 0 < df(t, coll) <= limit}
        score = {u['id']: {t for t in rare if hits(t, u['id'])} for u in cands}
        ranked = sorted(cands, key=lambda u: (-len(score[u['id']]), abs(number_of(u['id'])[0] - n)))
        others = lambda uid: set().union(*[score[u['id']] for u in cands if u['id'] != uid]) if len(cands) > 1 else set()
        e_ord = english_ordinal(entry.get('reference', '') if entry['source'] == 'dhammatalks' else entry.get('english', ''))

        def pts_fits(u):
            if not page['pts']:
                return None
            vol, pg = page['pts']
            p = u.get('pts') or {}
            return p.get('volume') == vol and p.get('page', 10 ** 6) <= pg <= p.get('end_page', -1)

        def distance(u):
            return abs(number_of(u['id'])[0] - n)

        best, why = ranked[0], None
        top = len(score[best['id']])
        second = len(score[ranked[1]['id']]) if len(ranked) > 1 else 0
        unique_names = score[best['id']] - others(best['id'])
        # 1. The page's PTS page lies in the text, and the text has names from the page that no nearby text has.
        if top >= 1 and top > second and unique_names and pts_fits(best):
            why = 'content-pts+names'
        # 2. Two or more rare names from the page occur in this text and in no other text nearby, close to the page's number.
        elif top >= 2 and second == 0 and pts_fits(best) is not False and distance(best) <= 5:
            why = 'content-number+names'
        else:
            # 3. The page's Pāli title names exactly one nearby text (ordinal agreeing), close to the page's number,
            #    with nothing in the names pointing elsewhere.
            titled = [(u, similar(page['title'], u.get('title', ''))) for u in cands] if page.get('title') else []
            titled = [(u, sim) for u, sim in titled if sim >= 2]
            if len(titled) > 1 and e_ord:
                titled = [(u, sim) for u, sim in titled if pali_ordinal(u.get('title', '')) == e_ord]
            if len(titled) == 1:
                u, sim = titled[0]
                if (distance(u) <= (5 if sim == 3 else 2) and pts_fits(u) is not False
                        and len(score[u['id']]) >= top and not (sim == 2 and e_ord is None and pali_ordinal(u.get('title', '')))):
                    best, why = u, 'content-title+number'
        pts_ok = pts_fits(best)
        if os.environ.get('CONTENT_DEBUG'):
            report.setdefault('decisions', []).append({'url': entry['url'], 'claimed': f'{section}{n}', 'pts': page['pts'], 'match': why,
                'pts_ok': pts_ok, 'ranked': [(u['id'], u.get('title', ''), sorted(score[u['id']])) for u in ranked[:3]]})
        if not why:
            reject('pts-mismatch' if pts_ok is False and top else ('no-rare-names' if not top else 'not-unique'))
            continue
        p_ord = pali_ordinal(best.get('title', ''))
        if p_ord and e_ord and p_ord != e_ord:
            reject('ordinal')
            continue
        proposals.append((best['id'], dict(entry, match=why, evidence=sorted(score[best['id']]))))
    # One page per source per text: drop every proposal that collides with another or with an existing link.
    claim = {}
    for uid, l in proposals:
        claim.setdefault((uid, l['source']), set()).add(page_key(l))
    for uid, l in proposals:
        existing = {page_key(x) for x in out.get(uid, []) if x['source'] == l['source']}
        if len(claim[(uid, l['source'])]) > 1 or (existing and page_key(l) not in existing):
            reject('collision')
            continue
        out.setdefault(uid, []).append(l)
        report['added'][l['match']] = report['added'].get(l['match'], 0) + 1
    return out, report


def main():
    canon = json.load(gzip.open(sys.argv[1], 'rt', encoding='utf-8'))
    dt = json.load(open(sys.argv[2]))
    ati = json.load(open(sys.argv[3]))
    units = [u for u in canon['units'] if not u.get('approximate')]
    by_id = {u['id']: u for u in canon['units']}
    by_section = {}
    for u in units:
        by_section.setdefault(section_of(u['id']), []).append(u)
    out = {}
    report = {'dhammatalks': {}, 'ati': {}}

    STABLE = ('dn', 'mn', 'iti', 'kp', 'ud', 'snp', 'thag', 'thig')   # numbering identical across these schemes

    def number_ok(section):
        return re.match(r'[a-z]+', section).group(0) in STABLE

    def near(section, n, window=40):
        return [u for u in by_section.get(section, []) if u.get('kind') != 'range'
                and number_of(u['id']) and abs(number_of(u['id'])[0] - n) <= window]

    def choose(section, n, title, pts=None, bridge=None):
        exact = by_id.get(f'{section}{n}')
        if exact is not None and exact.get('kind') == 'range':
            exact = None
        if exact is not None and title and similar(title, exact.get('title', '')):
            return exact, 'number+title'
        if pts:
            vol, pg = pts
            starts = [u for u in near(section, n, 60) if u.get('pts') and u['pts']['volume'] == vol and u['pts']['page'] == pg]
            inside = [u for u in near(section, n, 60) if u.get('pts') and u['pts']['volume'] == vol and u['pts']['page'] <= pg <= u['pts']['end_page']]
            for pool, why in ((starts, 'pts-start'), (inside, 'pts')):
                if not pool:
                    continue
                titled = [u for u in pool if title and similar(title, u.get('title', ''))]
                if titled:
                    return min(titled, key=lambda u: abs(number_of(u['id'])[0] - n)), why + '+title'
                # A PTS page identifies a text only if exactly one text starts there; dense sections
                # (AN 1, AN 2…) put several short suttas on one page, so number alone is not enough.
                if len(pool) == 1 and exact in pool:
                    return exact, why + '+number'
                if len(pool) == 1:
                    return pool[0], why
        if bridge and title:
            # Nearest number first: same-titled siblings (Tittha Sutta (1), (2), (3)) must not all bridge to the first one.
            for uid, other_title in sorted(bridge.get(section, []), key=lambda x: abs(number_of(x[0])[0] - n)):
                if similar(title, other_title) >= 2 and abs(number_of(uid)[0] - n) <= 6:
                    return by_id[uid], 'ati-title'
        if title:
            scored = [(-similar(title, u.get('title', '')), abs(number_of(u['id'])[0] - n), u) for u in near(section, n)]
            scored = [x for x in scored if x[0] < 0]
            if scored:
                scored.sort(key=lambda x: (x[0], x[1]))
                return scored[0][2], 'title'
        if exact is not None and number_ok(section):
            return exact, 'number'
        return None, None

    def offset_fill(pending, matched):
        """For unmatched SN/AN pages, infer the numbering offset from matched neighbours on both sides."""
        filled = []
        for section, n, entry in pending:
            lower = [(m, k) for (sec, m, k) in matched if sec == section and m < n]
            upper = [(m, k) for (sec, m, k) in matched if sec == section and m > n]
            if not lower or not upper:
                continue
            lo, hi = max(lower), min(upper)
            if lo[1] == hi[1] and hi[0] - lo[0] <= 12:
                uid = f'{section}{n + lo[1]}'
                if uid in by_id and by_id[uid].get('kind') != 'range':
                    filled.append((uid, dict(entry, match='neighbour-offset')))
        return filled

    def add(uid, entry):
        out.setdefault(uid, []).append(entry)

    bridge, ati_matched, ati_pending, dt_matched, dt_pending = {}, [], [], [], []
    pages = []   # every page with its claimed position, for the content linker
    # ---- Access to Insight ----
    roman = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6}
    for page in ati:
        path = page['path']
        name = path.split('/')[-1]
        if not path.startswith('tipitaka/') or re.search(r'\.00x?\.', name) or '/sltp/' in path:
            continue
        m = (re.match(r'(dn|mn)\.(\d+)', name) or re.match(r'(sn|an)(\d+)\.(\d+)', name) or re.match(r'(ud|snp)\.(\d+)\.(\d+)', name)
             or re.match(r'(thag|thig)\.(\d+)\.(\d+)', name) or re.match(r'(iti)\.\d+\.(\d+)', name) or re.match(r'(khp)\.(\d+)\.', name)
             or re.match(r'(dhp)\.(\d+)\.', name))
        if not m:
            continue
        coll = {'khp': 'kp'}.get(m.group(1), m.group(1))
        title = (page.get('html_title') or '').split(':')[0]
        pts = None
        pm = re.match(r'\s*[A-Z][a-zī]*\.?\s+([ivx]+)\s+(\d+)', page.get('pts') or '')
        if pm and pm.group(1) in roman:
            pts = (roman[pm.group(1)], int(pm.group(2)))
        entry = {'source': 'ati', 'english': (page.get('html_title') or '').split(':', 1)[-1].strip(), 'path': '/' + path.rsplit('.html', 1)[0], 'url': 'https://www.accesstoinsight.org/' + path,
                 'translator': page.get('author') or page.get('author_short') or '', 'license': page.get('license', ''),
                 'reference': page.get('pts', '')}
        # The Pāli name ATI gives the page ("Adittapariyaya Sutta: The Fire Sermon"), for sutta-name lookups (D61).
        if ':' in (page.get('html_title') or '') and title.strip():
            entry['pali_title'] = title.strip()
        if coll == 'dhp':
            vaggas = sorted([u for u in canon['units'] if u['collection'] == 'dhp' and u.get('kind') == 'range'],
                            key=lambda u: number_of(u['id'])[0])
            k = int(m.group(2))
            if 1 <= k <= len(vaggas):
                add(vaggas[k - 1]['id'], dict(entry, match='chapter'))
            continue
        if m.lastindex == 3:
            section, n = f'{coll}{int(m.group(2))}.', int(m.group(3))
        else:
            section, n = coll, int(m.group(2))
        cdb = re.search(r'corresponds to CDB (?:SN )?([\d.]+)', page.get('alt_id') or '')
        if cdb and coll == 'sn':
            s, _, k = cdb.group(1).partition('.')
            section, n = f'sn{int(s)}.', int(k)
        pages.append({'entry': entry, 'section': section, 'n': n, 'title': title, 'pts': pts, 'file': path, 'name': name})
        unit, why = choose(section, n, title, pts)
        report['ati'][why or 'unmatched'] = report['ati'].get(why or 'unmatched', 0) + 1
        if unit:
            add(unit['id'], dict(entry, match=why))
            bridge.setdefault(section, []).append((unit['id'], title))
            if section.endswith('.'):
                ati_matched.append((section, n, number_of(unit['id'])[0] - n))
        elif section.endswith('.'):
            ati_pending.append((section, n, entry))
    # ---- dhammatalks.org (Ṭhānissaro Bhikkhu) ----
    for page in dt:
        if 'error' in page:
            continue
        path = page['url'].split('/suttas/')[1]
        parts = page['title'].split(' | ')
        ref = parts[0]
        pali = parts[1] if len(parts) > 2 else ''
        m = (re.match(r'(DN|MN)/\1(\d+)\.html', path) or re.match(r'(SN|AN)/\1(\d+)_(\d+)\.html', path)
             or re.match(r'KN/(Ud)/ud(\d+)_(\d+)\.html', path) or re.match(r'KN/(StNp)/StNp(\d+)_(\d+)\.html', path)
             or re.match(r'KN/(Thag|Thig)/\w+?(\d+)_(\d+)\.html', path) or re.match(r'KN/(Thag|Thig)/\w+?(\d+)\.html', path)
             or re.match(r'KN/(Iti)/iti(\d+)\.html', path) or re.match(r'KN/(Khp)/khp(\d+)\.html', path)
             or re.match(r'KN/(Dhp)/Ch(\d+)\.html', path) or re.match(r'(SN)/SN(\d+)\.html', path))
        if not m:
            continue
        coll = {'StNp': 'snp', 'Khp': 'kp'}.get(m.group(1), m.group(1).lower())
        if coll in ('thag', 'thig') and m.lastindex == 2:
            # thag11.html: a single-poem nipāta → thag11.1
            section, n, title = f'{coll}{m.group(2)}.', 1, re.sub(r'^\w+ [\d:]+ ', '', ref)
        elif coll == 'dhp':
            vaggas = sorted([u for u in canon['units'] if u['collection'] == 'dhp' and u.get('kind') == 'range'],
                            key=lambda u: number_of(u['id'])[0])
            k = int(m.group(2))
            if 1 <= k <= len(vaggas):
                add(vaggas[k - 1]['id'], {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref, 'match': 'chapter'})
                report['dhammatalks']['chapter'] = report['dhammatalks'].get('chapter', 0) + 1
            continue
        elif coll == 'sn' and m.lastindex == 2:
            section, n, title = 'sn', int(m.group(2)), pali   # whole-saṃyutta page (SN 43, 44)
            uid = f'sn{n}.1'
            if uid in by_id:
                add(uid, {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref,
                          'match': 'whole-samyutta', 'covers': f'SN {n}'})
            continue
        elif m.lastindex == 3:
            section, n, title = f'{coll}{int(m.group(2))}.', int(m.group(3)), pali
        else:
            section, n, title = coll, int(m.group(2)), pali
        if coll in ('thag', 'thig') and not title:
            title = re.sub(r'^\w+ [\d:]+ ', '', ref)
        unit, why = choose(section, n, title, bridge=bridge)
        entry = {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref}
        pages.append({'entry': entry, 'section': section, 'n': n, 'title': title, 'pts': None, 'name': path.split('/')[-1]})
        report['dhammatalks'][why or 'unmatched'] = report['dhammatalks'].get(why or 'unmatched', 0) + 1
        if unit:
            add(unit['id'], dict(entry, match=why))
            if section.endswith('.'):
                dt_matched.append((section, n, number_of(unit['id'])[0] - n))
        elif section.endswith('.'):
            dt_pending.append((section, n, entry))

    for uid, entry in offset_fill(ati_pending, ati_matched) + offset_fill(dt_pending, dt_matched):
        add(uid, entry)
        report[entry['source']]['neighbour-offset'] = report[entry['source']].get('neighbour-offset', 0) + 1
    out = conservative(out, by_id, report)
    if '--content' in sys.argv:
        k = sys.argv.index('--content')
        ati_root, dt_cache = sys.argv[k + 1], sys.argv[k + 2]
        out, content_report = content_link(out, pages, canon, by_id, ati_root, dt_cache)
        report['content'] = content_report
    json.dump(out, open(sys.argv[4], 'w'), ensure_ascii=False, separators=(',', ':'))
    print(json.dumps(report, indent=1))
    print('texts with translations:', len(out), 'links:', sum(len(v) for v in out.values()))


if __name__ == '__main__':
    main()
