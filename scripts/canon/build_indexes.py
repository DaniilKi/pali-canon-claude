"""Collect translation reference indexes (titles, PTS references, licences only; no text).

Usage:
  python3 scripts/canon/build_indexes.py ati <bcbsit-ati checkout> <out ati-index.json>
  python3 scripts/canon/build_indexes.py dhammatalks <out dt-index.json>

ATI: reads the [TITLE]/[PTS_ID]/[ALT_ID]/[AUTHOR]/[LICENSE] metadata block and <title> of every tipitaka page.
dhammatalks.org: reads the public sitemap and each sutta page's <title>, politely (4 at a time).
"""
import concurrent.futures as cf
import glob
import html
import json
import os
import re
import sys
import time
import urllib.request

UA = 'pali-canon-claude index builder (read-only; https://github.com/DaniilKi/pali-canon-claude)'


def ati(root, out):
    pages = []
    for p in glob.glob(os.path.join(root, 'tipitaka', '**', '*.html'), recursive=True):
        t = open(p, encoding='utf-8', errors='replace').read()
        get = lambda k: html.unescape((re.search(r'\[' + k + r'\]=\{(.*?)\}', t, re.S) or [None, ''])[1]).strip()
        title = re.search(r'<title>(.*?)</title>', t, re.S)
        pages.append({'path': os.path.relpath(p, root).replace(os.sep, '/'), 'title': get('TITLE'), 'subtitle': get('SUBTITLE'),
                      'pts': get('PTS_ID'), 'alt_id': get('ALT_ID'), 'author': get('AUTHOR'), 'author_short': get('AUTHOR_SHORTNAME'),
                      'license': get('LICENSE'), 'source': get('SOURCE'),
                      'html_title': html.unescape(re.sub(r'\s+', ' ', title.group(1))).strip() if title else ''})
    json.dump(pages, open(out, 'w'), ensure_ascii=False)
    print('ATI pages:', len(pages))


def fetch(url):
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return urllib.request.urlopen(req, timeout=40).read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 * (attempt + 1))
    raise err


def dhammatalks(out):
    sitemap = fetch('https://www.dhammatalks.org/sitemap.xml')
    urls = [u for u in re.findall(r'<loc>([^<]*)</loc>', sitemap) if re.search(r'/suttas/(DN|MN|SN|AN|KN)/', u)]

    def one(u):
        try:
            t = fetch(u)
            m = re.search(r'<title>(.*?)</title>', t, re.S)
            h = re.search(r'<h1[^>]*>(.*?)</h1>', t, re.S)
            return {'url': u, 'title': html.unescape(re.sub(r'\s+', ' ', m.group(1))).strip() if m else '',
                    'h1': html.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', h.group(1)))).strip() if h else ''}
        except Exception as e:  # noqa: BLE001
            return {'url': u, 'error': str(e)}
    with cf.ThreadPoolExecutor(4) as ex:
        pages = list(ex.map(one, urls))
    json.dump(pages, open(out, 'w'), ensure_ascii=False)
    print('dhammatalks pages:', len(pages), 'errors:', sum(1 for p in pages if 'error' in p))


if __name__ == '__main__':
    if sys.argv[1] == 'ati':
        ati(sys.argv[2], sys.argv[3])
    else:
        dhammatalks(sys.argv[2])
