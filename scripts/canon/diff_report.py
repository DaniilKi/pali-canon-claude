"""Readable diff between two builds of the bundled data (used by the monthly data refresh, #50).

Usage:
  python scripts/canon/diff_report.py OLD_DATA_DIR NEW_DATA_DIR [--out report.md] [--json summary.json]
                                      [--changed-list files.txt] [--check NAME=OUTCOME ...] [--note TEXT ...] [--limit N]
                                      [--budget-mb MB] [--extra FILE ...]

OLD_DATA_DIR and NEW_DATA_DIR each hold a copy of server/data/ (the committed one and the rebuilt one).
Only the files present in both are compared in detail; every file is listed with its size. A file counts as
changed only when its parsed content differs (gzip headers alone do not count).

The report covers:
  * upstream versions: the VRI commit of canon.json.gz (with a compare link) and the `source` record of every
    other data file that has one (DPD release, commentary and post-canonical builds);
  * texts added and removed (by citation ID), texts moved (another book or another VRI paragraph range),
    texts whose boundaries or wording changed, title, approximate-flag and member changes;
  * PTS changes: start/end page per text, and the number of PTS, Thai, Myanmar and VRI page markers;
  * translation-link changes in translations.json: added, removed, moved to another text, match type changed;
  * books added or removed and, per book, how many blocks changed;
  * the report's own checks (summary "report_checks", also shown in the Checks table):
      - package size budget: the new data files plus every --extra file (the server bundle, README and the other
        packaged files) must stay within --budget-mb (on-disk size, an upper bound for the packed size);
      - linked unit IDs: every unit ID or citation that anandajoti.json, topics.json and dhamma_lists.json point to
        must still exist in the new canon. Ānandajoti links on texts whose wording changed are listed for a rebuild
        with scripts/anandajoti/build.mjs (their coverage was measured on the old wording).

It reads data only and writes Markdown (and optionally JSON). Exit status is 0 whether or not anything changed or a
report check failed: the JSON summary has "changed": true|false and "report_checks" for the workflow.
"""
import argparse
import gzip
import hashlib
import json
import os
import sys
from collections import Counter, defaultdict

EDITIONS = {'P': 'PTS', 'T': 'Thai', 'M': 'Myanmar', 'V': 'VRI'}


def load(path):
    if not os.path.exists(path):
        return None
    if path.endswith('.gz'):
        with gzip.open(path, 'rt', encoding='utf-8') as f:
            return json.load(f)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def fmt_size(n):
    return f'{n / 1048576:.2f} MB' if n >= 1048576 else f'{n / 1024:.1f} kB'


def capped(items, limit):
    items = list(items)
    if len(items) <= limit:
        return items, 0
    return items[:limit], len(items) - limit


# ---------------------------------------------------------------- canon

def unit_view(canon, u):
    """What a reader would notice about one text, independent of block indices (which shift with any edit)."""
    book = canon['books'][u['book']]
    blocks = book['blocks'][u['start']:u['end']]
    text = '\n'.join(b[2] or '' for b in blocks)
    first_para = next((b[1] for b in blocks if b[1]), '')
    pts = u.get('pts') or {}
    return {
        'book': book['file'],
        'vri': u.get('vri', ''),
        'first_paragraph': first_para,
        'blocks': len(blocks),
        'text_sha': hashlib.sha1(text.encode('utf-8')).hexdigest(),
        'words': len(text.split()),
        'title': u.get('title', ''),
        'approximate': bool(u.get('approximate')),
        'members': [m if isinstance(m, str) else json.dumps(m, ensure_ascii=False) for m in (u.get('members') or [])],
        'pts': (pts.get('volume'), pts.get('page'), pts.get('end_page')) if pts else None,
        'collection': u.get('collection', ''),
        'acronym': u.get('acronym', u['id']),
    }


def pts_str(p):
    if not p:
        return 'none'
    vol, page, end = p
    s = f'{vol}.{page}' if vol else f'{page}'
    return s + (f'–{end}' if end and end != page else '')


def marker_counts(canon):
    c = Counter()
    for book in canon['books']:
        for b in book['blocks']:
            for ed, marks in (b[4] if len(b) > 4 and b[4] else {}).items():
                c[ed] += len(marks)
    return c


def diff_canon(old, new):
    out = {'source': (old.get('source', {}).get('commit'), new.get('source', {}).get('commit'))}
    ou = {u['id']: unit_view(old, u) for u in old['units']}
    nu = {u['id']: unit_view(new, u) for u in new['units']}
    out['units'] = (len(ou), len(nu))
    out['added'] = [(i, nu[i]['acronym']) for i in sorted((i for i in nu if i not in ou), key=lambda i: (nu[i]['collection'], i))]
    out['removed'] = [(i, ou[i]['acronym']) for i in sorted((i for i in ou if i not in nu), key=lambda i: (ou[i]['collection'], i))]
    moved, bounds, wording, titles, approx, members, pts = [], [], [], [], [], [], []
    for i in sorted(set(ou) & set(nu), key=lambda i: (nu[i]['collection'], i)):
        a, b = ou[i], nu[i]
        if a['book'] != b['book'] or a['vri'] != b['vri']:
            moved.append((i, b['acronym'], f"{a['book']} ¶{a['vri']}", f"{b['book']} ¶{b['vri']}"))
        elif a['first_paragraph'] != b['first_paragraph'] or a['blocks'] != b['blocks']:
            bounds.append((i, b['acronym'], f"¶{a['first_paragraph']}, {a['blocks']} blocks", f"¶{b['first_paragraph']}, {b['blocks']} blocks"))
        if a['text_sha'] != b['text_sha']:
            wording.append((i, b['acronym'], a['words'], b['words']))
        if a['title'] != b['title']:
            titles.append((i, b['acronym'], a['title'], b['title']))
        if a['approximate'] != b['approximate']:
            approx.append((i, b['acronym'], a['approximate'], b['approximate']))
        if a['members'] != b['members']:
            members.append((i, b['acronym'], len(a['members']), len(b['members'])))
        if a['pts'] != b['pts']:
            pts.append((i, b['acronym'], pts_str(a['pts']), pts_str(b['pts'])))
    out.update(moved=moved, bounds=bounds, wording=wording, titles=titles, approximate=approx, members=members, pts=pts)
    out['wording_by_collection'] = Counter(nu[w[0]]['collection'] for w in wording)
    out['markers'] = (marker_counts(old), marker_counts(new))
    ob = {b['file']: b for b in old['books']}
    nb = {b['file']: b for b in new['books']}
    out['books_added'] = sorted(set(nb) - set(ob))
    out['books_removed'] = sorted(set(ob) - set(nb))
    per_book = []
    for f in sorted(set(ob) & set(nb)):
        a = [json.dumps(x, ensure_ascii=False) for x in ob[f]['blocks']]
        b = [json.dumps(x, ensure_ascii=False) for x in nb[f]['blocks']]
        if a == b:
            continue
        ca, cb = Counter(a), Counter(b)
        removed = sum((ca - cb).values())
        added = sum((cb - ca).values())
        per_book.append((f, len(a), len(b), added, removed))
    out['books_changed'] = per_book
    return out


# ---------------------------------------------------------------- translation links

def link_key(link):
    return (link.get('source', ''), link.get('url', ''))


def diff_links(old, new):
    def index(d):
        by = {}
        for uid, links in d.items():
            for l in links:
                by.setdefault(link_key(l), []).append((uid, l))
        return by
    oi, ni = index(old or {}), index(new or {})
    added, removed, moved, match = [], [], [], []
    for k in sorted(set(ni) | set(oi)):
        a = {uid: l for uid, l in oi.get(k, [])}
        b = {uid: l for uid, l in ni.get(k, [])}
        if not a:
            added.extend((uid, k[0], k[1], l.get('match', '')) for uid, l in b.items())
        elif not b:
            removed.extend((uid, k[0], k[1], l.get('match', '')) for uid, l in a.items())
        elif set(a) != set(b):
            moved.append((k[0], k[1], ', '.join(sorted(a)), ', '.join(sorted(b))))
        else:
            for uid in a:
                if a[uid].get('match') != b[uid].get('match'):
                    match.append((uid, k[0], k[1], a[uid].get('match', ''), b[uid].get('match', '')))
    count = lambda d: Counter(l.get('source', '') for links in (d or {}).values() for l in links)
    return {'added': added, 'removed': removed, 'moved': moved, 'match': match,
            'counts': (count(old), count(new)), 'texts': (len(old or {}), len(new or {}))}


# ---------------------------------------------------------------- report

def table(rows, header, limit):
    shown, more = capped(rows, limit)
    if not shown:
        return ['None.', '']
    lines = ['| ' + ' | '.join(header) + ' |', '|' + '---|' * len(header)]
    for r in shown:
        lines.append('| ' + ' | '.join(str(c).replace('|', '\\|') for c in r) + ' |')
    if more:
        lines.append(f'| … and {more} more | ' + ' | ' * (len(header) - 1))
    return lines + ['']


def section(title, rows, header, limit, open_=False):
    n = len(rows)
    lines = [f'<details{" open" if open_ and n else ""}><summary><b>{title}</b>: {n}</summary>', '']
    lines += table(rows, header, limit)
    return lines + ['</details>', '']


def source_line(src):
    if not isinstance(src, dict):
        return ''
    for k in ('version', 'commit', 'release'):
        if src.get(k):
            return f'{k} {src[k]}'
    return json.dumps(src, ensure_ascii=False)[:120]


# ---------------------------------------------------------------- data keyed by unit ID

def dependent_ids(new_dir, canon):
    """(file, where, ID or citation) for every reference in the ID-keyed data files that the canon no longer has.

    bmc.json is keyed by Pātimokkha rule (pj1, ss1, ...), resolved through the citation parser; tests/vinaya-bmc.test.mjs
    checks those against the bundled canon."""
    ids = {u['id'] for u in canon['units']}
    acronyms = {u.get('acronym') for u in canon['units']}
    missing = []
    ana = load(os.path.join(new_dir, 'anandajoti.json')) or {}
    for uid in (ana.get('links') or {}):
        if uid not in ids:
            missing.append(('anandajoti.json', 'links', uid))
    topics = load(os.path.join(new_dir, 'topics.json')) or {}
    for t in topics.get('topics') or []:
        for x in t.get('texts') or []:
            if x.get('id') and x['id'] not in ids:
                missing.append(('topics.json', f"topic {t.get('slug', '?')}", x['id']))
    lists = load(os.path.join(new_dir, 'dhamma_lists.json')) or {}
    for li in lists.get('lists') or []:
        for field in ('defined_in', 'see_also_texts'):
            for cit in li.get(field) or []:
                if cit not in acronyms:
                    missing.append(('dhamma_lists.json', f"list {li.get('slug', '?')} {field}", cit))
    return missing


def report(old_dir, new_dir, checks, notes, limit, budget_mb=None, extras=()):
    names = sorted(set(os.listdir(old_dir)) | set(os.listdir(new_dir)))
    names = [n for n in names if n.endswith(('.json', '.json.gz')) and not n.endswith('.report.json')]
    summary = {'changed': False, 'files': {}, 'checks': dict(checks), 'report_checks': {}}
    md = ['# Data refresh report', '']
    if notes:
        md += [f'- {n}' for n in notes] + ['']
    checks_at = len(md)  # the Checks table goes here once the report's own checks are known

    # Files and upstream versions
    md += ['## Files and upstream versions', '', '| File | Old | New | Upstream (old → new) |', '|---|---|---|---|']
    total_new = 0
    for n in names:
        po, pn = os.path.join(old_dir, n), os.path.join(new_dir, n)
        so = sha256(po) if os.path.exists(po) else None
        sn = sha256(pn) if os.path.exists(pn) else None
        size_o = fmt_size(os.path.getsize(po)) if so else '—'
        size_n = fmt_size(os.path.getsize(pn)) if sn else '—'
        if sn:
            total_new += os.path.getsize(pn)
        # Gzip headers and zlib versions change the bytes of identical data, so compare the parsed content.
        changed = so != sn and (so is None or sn is None or load(po) != load(pn))
        summary['files'][n] = {'old_sha256': so, 'new_sha256': sn, 'changed': changed}
        if changed:
            summary['changed'] = True
        up = ''
        if n.endswith('.gz') and changed:
            src_o = (load(po) or {}).get('source') if so else None
            src_n = (load(pn) or {}).get('source') if sn else None
            a, b = source_line(src_o), source_line(src_n)
            up = a if a == b else f'{a or "—"} → {b or "—"}'
        mark = '' if changed else ' (unchanged)'
        md.append(f'| `{n}`{mark} | {size_o} | {size_n} | {up} |')
    total_extra = sum(os.path.getsize(f) for f in extras)
    total = total_new + total_extra
    summary['size'] = {'data_bytes': total_new, 'extra_bytes': total_extra, 'total_bytes': total, 'budget_mb': budget_mb}
    line = f'Total size of the new data files: {fmt_size(total_new)}'
    if extras:
        line += f'; with the server bundle and the other packaged files ({len(extras)}): {fmt_size(total)}'
    if budget_mb is not None:
        over = total > budget_mb * 1048576
        summary['report_checks'][f'package size budget (≤ {budget_mb:g} MB)'] = 'failure' if over else 'success'
        line += f' (package budget {budget_mb:g} MB: ' + ('**over budget**' if over else 'within budget') + ')'
    md += ['', line + '.', '']

    # Canon
    oc, nc = load(os.path.join(old_dir, 'canon.json.gz')), load(os.path.join(new_dir, 'canon.json.gz'))
    if oc and nc:
        d = diff_canon(oc, nc)
        a, b = d['source']
        md += ['## Pāli texts (canon.json.gz)', '']
        if a != b:
            md += [f'VRI tipitaka-xml commit `{a}` → `{b}` '
                   f'([upstream changes](https://github.com/VipassanaTech/tipitaka-xml/compare/{a}...{b})).', '']
        else:
            md += [f'VRI tipitaka-xml commit unchanged (`{a}`).', '']
        ma, mb = d['markers']
        md += [f'- Texts: {d["units"][0]} → {d["units"][1]} ({len(d["added"])} added, {len(d["removed"])} removed, '
               f'{len(d["moved"])} moved, {len(d["bounds"])} with new boundaries, {len(d["wording"])} with changed wording)',
               f'- PTS start/end pages changed: {len(d["pts"])}',
               '- Page markers: ' + ', '.join(f'{EDITIONS[e]} {ma.get(e, 0)} → {mb.get(e, 0)}' for e in EDITIONS),
               f'- Books: {len(d["books_added"])} added, {len(d["books_removed"])} removed, {len(d["books_changed"])} changed', '']
        if d['wording_by_collection']:
            md += ['Changed wording by collection: ' + ', '.join(f'{k} {v}' for k, v in sorted(d['wording_by_collection'].items())), '']
        md += section('Texts added', d['added'],
                      ['ID', 'Citation'], limit, True)
        md += section('Texts removed', d['removed'],
                      ['ID', 'Citation'], limit, True)
        md += section('Texts moved (other book or VRI paragraphs)', d['moved'], ['ID', 'Citation', 'Old', 'New'], limit, True)
        md += section('PTS page changes', d['pts'], ['ID', 'Citation', 'Old PTS', 'New PTS'], limit, True)
        md += section('Boundaries changed (same VRI paragraphs)', d['bounds'], ['ID', 'Citation', 'Old', 'New'], limit)
        md += section('Wording changed', d['wording'], ['ID', 'Citation', 'Old words', 'New words'], limit)
        md += section('Titles changed', d['titles'], ['ID', 'Citation', 'Old', 'New'], limit)
        md += section('Approximate (abbreviated) flag changed', d['approximate'], ['ID', 'Citation', 'Old', 'New'], limit)
        md += section('Grouped members changed', d['members'], ['ID', 'Citation', 'Old count', 'New count'], limit)
        md += section('Books changed', [(f, a_, b_, ad, rm) for f, a_, b_, ad, rm in d['books_changed']],
                      ['Book', 'Old blocks', 'New blocks', 'Blocks new or edited', 'Blocks gone or edited'], limit)
        if d['books_added'] or d['books_removed']:
            md += [f'Books added: {", ".join(d["books_added"]) or "none"}. Books removed: {", ".join(d["books_removed"]) or "none"}.', '']
        summary['canon'] = {k: len(v) for k, v in d.items() if isinstance(v, list)}
        summary['canon']['commit'] = {'old': a, 'new': b}
        ana = (load(os.path.join(new_dir, 'anandajoti.json')) or {}).get('links') or {}
        recheck = [(w[0], w[1], ana[w[0]].get('reference') or '', ana[w[0]].get('coverage', '')) for w in d['wording'] if w[0] in ana]
        if recheck:
            md += [f'{len(recheck)} Ānandajoti link(s) are on texts whose wording changed. Their Pāli coverage was measured on '
                   'the old wording: rerun `node scripts/anandajoti/build.mjs --cache <dir>` before merging.', '']
            md += section('Ānandajoti links to recheck', recheck, ['ID', 'Citation', 'Site reference', 'Old coverage'], limit, True)
        summary['anandajoti_recheck'] = len(recheck)

    # Data keyed by unit ID (built separately; the refresh does not rebuild it)
    if nc:
        missing = dependent_ids(new_dir, nc)
        summary['report_checks']['linked unit IDs resolve'] = 'failure' if missing else 'success'
        summary['dangling_ids'] = [list(m) for m in missing]
        md += ['## Data keyed by unit ID', '',
               'anandajoti.json, topics.json and dhamma_lists.json are built separately and point at canon IDs or citations; '
               'every one must still resolve in the new canon.', '']
        md += section('IDs that no longer resolve', missing, ['File', 'Where', 'ID or citation'], limit, True)

    # Translation links
    ot, nt = load(os.path.join(old_dir, 'translations.json')), load(os.path.join(new_dir, 'translations.json'))
    if ot is not None and nt is not None:
        d = diff_links(ot, nt)
        (co, cn), (to, tn) = d['counts'], d['texts']
        md += ['## Translation links (translations.json)', '',
               f'- Texts with links: {to} → {tn}',
               '- Links by source: ' + ', '.join(f'{s} {co.get(s, 0)} → {cn.get(s, 0)}' for s in sorted(set(co) | set(cn))),
               f'- {len(d["added"])} added, {len(d["removed"])} removed, {len(d["moved"])} moved to another text, '
               f'{len(d["match"])} with a different match type', '']
        md += section('Links added', d['added'], ['Text', 'Source', 'URL', 'Match'], limit, True)
        md += section('Links removed', d['removed'], ['Text', 'Source', 'URL', 'Match'], limit, True)
        md += section('Links moved to another text', d['moved'], ['Source', 'URL', 'Old text', 'New text'], limit, True)
        md += section('Match type changed', d['match'], ['Text', 'Source', 'URL', 'Old', 'New'], limit)
        summary['links'] = {k: len(d[k]) for k in ('added', 'removed', 'moved', 'match')}

    all_checks = list(checks) + list(summary['report_checks'].items())
    if all_checks:
        rows = ['## Checks', '', '| Check | Result |', '|---|---|']
        rows += [f'| {k} | {"pass" if v == "success" else ("**" + v + "**")} |' for k, v in all_checks]
        md[checks_at:checks_at] = rows + ['']
    if not summary['changed']:
        md.insert(2, '**No data file changed.**\n')
    md += ['---', '', 'Review every moved text, PTS change and link change before merging; this PR is never merged automatically.']
    return '\n'.join(md) + '\n', summary


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('old_dir')
    ap.add_argument('new_dir')
    ap.add_argument('--out')
    ap.add_argument('--json')
    ap.add_argument('--check', action='append', default=[], help='NAME=OUTCOME, shown in the Checks table')
    ap.add_argument('--note', action='append', default=[])
    ap.add_argument('--changed-list', help='write the names of the files whose content changed, one per line')
    ap.add_argument('--limit', type=int, default=150, help='rows shown per list (default 150)')
    ap.add_argument('--budget-mb', type=float, help='fail the "package size budget" report check above this many MB')
    ap.add_argument('--extra', action='append', default=[], help='another packaged file counted in the size budget')
    args = ap.parse_args(argv)
    checks = [tuple(c.split('=', 1)) if '=' in c else (c, 'unknown') for c in args.check]
    md, summary = report(args.old_dir, args.new_dir, checks, args.note, args.limit, args.budget_mb, args.extra)
    if args.out:
        with open(args.out, 'w', encoding='utf-8', newline='\n') as f:
            f.write(md)
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stdout.write(md)
    if args.changed_list:
        with open(args.changed_list, 'w', encoding='utf-8', newline='\n') as f:
            f.write(''.join(n + '\n' for n, v in summary['files'].items() if v['changed'] and v['new_sha256']))
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
