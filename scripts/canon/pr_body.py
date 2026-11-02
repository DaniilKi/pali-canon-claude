"""Fit the data refresh report into a pull request body (used by .github/workflows/data-refresh.yml, #50).

Usage:
  python scripts/canon/pr_body.py REPORT.md BODY.md [--limit 60000]

GitHub refuses a PR body over 65,536 characters. A longer report is cut at the last section boundary that fits
(the end of a <details> block or the start of a heading), never in the middle of a table. Any <details> block or
code fence still open at the cut is closed, and a note points to the full report in the workflow run.
"""
import argparse
import re

FOOTER = '\nOpened by the monthly data refresh workflow (#50).\n'
NOTE = '\n… report truncated; the full report is in the workflow run (artifact "data-refresh-report").\n'


def close_open(text):
    """Close a code fence and any <details> blocks left open at the end of text."""
    tail = ''
    if sum(1 for line in text.split('\n') if line.startswith('```')) % 2:
        tail += '```\n'
    open_ = len(re.findall(r'<details[\s>]', text)) - text.count('</details>')
    tail += '</details>\n' * max(open_, 0)
    return tail


def truncate(text, limit=60000):
    if len(text) + len(FOOTER) <= limit:
        return text + FOOTER
    room = limit - len(NOTE) - len(FOOTER) - 200  # 200 characters for the closing tags
    head = text[:room]
    cuts = [m.end() for m in re.finditer(r'\n</details>\n', head)]
    cuts += [m.start() + 1 for m in re.finditer(r'\n(?=## |<details)', head)]
    cut = max(cuts, default=0)
    if cut == 0:  # one huge section: cut at a line end and close what is open
        cut = head.rfind('\n') + 1
    kept = text[:cut]
    if not kept.endswith('\n'):
        kept += '\n'
    return kept + close_open(kept) + NOTE + FOOTER


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('report')
    ap.add_argument('body')
    ap.add_argument('--limit', type=int, default=60000)
    args = ap.parse_args(argv)
    with open(args.report, encoding='utf-8') as f:
        text = f.read()
    with open(args.body, 'w', encoding='utf-8', newline='\n') as f:
        f.write(truncate(text, args.limit))


if __name__ == '__main__':
    main()
