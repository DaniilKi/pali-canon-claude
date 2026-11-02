"""Build server/data/dpd.json.gz: a compact, offline subset of the Digital Pāḷi Dictionary (DPD).

Input is DPD's own SQLite release (dpd.db from dpd.db.tar.xz on github.com/digitalpalidictionary/dpd-db/releases).
Nothing is generated: every headword, meaning, grammar tag, root and split is copied from that database.

Kept:
  - every headword (id, lemma, part of speech, grammar, short meaning, root key, construction);
  - every root (meaning, root sign);
  - the inflection -> headword map ("lookup" rows with headwords and their grammar tags) and the
    deconstructor (compound and sandhi splits), restricted to the word forms that occur in the bundled
    VRI root texts (server/data/canon.json.gz) as the tokeniser reads them (quotation sandhi
    "-’nti" = "-ṃ ti", a vowel lengthened before "ti", each undone only where DPD knows the result)
    and the parts of every kept split.

Usage:
  python scripts/dpd/build_dpd.py DPD_DB CANON_JSON_GZ OUT_JSON_GZ --archive-sha256 HEX

Licence: DPD is CC BY-NC-SA 4.0 (Bodhirasa Bhikkhu). The output is a derivative and carries the same licence.
"""
import argparse
import gzip
import hashlib
import json
import re
import sqlite3
import sys

LETTERS = "a-zA-ZāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ"
TOKEN = re.compile(f"[{LETTERS}]+(?:[’‘'`]+[{LETTERS}]+)*")
QUOTES = re.compile(r"[’‘'`]+")
LONG_TO_SHORT = {"ā": "a", "ī": "i", "ū": "u"}
MAX_SPLITS = 3


def tokens(text):
    """Word tokens of a VRI block (same rule as tokenize() in src/analyse.mjs)."""
    return TOKEN.findall(re.sub(r"<[^>]+>", " ", text))


def parts(token, known):
    """Lookup forms for one token, following src/analyse.mjs wordParts(): [(form, note)].

    "-’’nti" becomes "-ṃ" + "ti" only when DPD knows both results; a long final vowel is shortened only
    directly before the particle "ti" and only when DPD knows the short form.
    """
    pieces = [p for p in QUOTES.split(token.lower().replace("ṁ", "ṃ")) if p]
    out = []
    for i, piece in enumerate(pieces):
        if (i > 0 and piece.startswith("n") and len(piece) > 1 and out and not out[-1][0].endswith("ṃ")
                and not known(piece) and known(piece[1:]) and known(out[-1][0] + "ṃ")):
            prev, prev_note = out[-1]
            out[-1] = (prev + "ṃ", prev_note or "quotation sandhi: final -ṃ written as n before ti")
            piece = piece[1:]
        out.append((piece, None))
    fixed = []
    for i, (form, note) in enumerate(out):
        nxt = out[i + 1][0] if i + 1 < len(out) else None
        if nxt == "ti" and form[-1:] in LONG_TO_SHORT and not known(form) and known(form[:-1] + LONG_TO_SHORT[form[-1]]):
            form, note = form[:-1] + LONG_TO_SHORT[form[-1]], note or "final vowel lengthened before ti (sandhi)"
        fixed.append((form, note))
    return fixed


def first_line(value):
    return (value or "").split("\n")[0].strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db")
    ap.add_argument("canon")
    ap.add_argument("out")
    ap.add_argument("--archive-sha256", required=True, help="SHA-256 of the dpd.db.tar.xz release asset")
    ap.add_argument("--asset-url", default=None)
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    info = dict(con.execute("select key, value from db_info"))
    version = info["dpd_release_version"]
    if info.get("license") != "CC BY-NC-SA 4.0":
        sys.exit(f"Unexpected DPD licence {info.get('license')!r}; stop and review.")

    # Keys only first (the full lookup table does not fit comfortably in memory); rows are read per wanted form.
    keys = set()
    for key, hw, decon in con.execute("select lookup_key, headwords, deconstructor from lookup"):
        if (hw or "[]").strip() != "[]" or (decon or "[]").strip() != "[]":
            keys.add(key)
    known = lambda form: form in keys
    rows = {}

    def lookup(form):
        if form not in keys:
            return None
        if form not in rows:
            hw, decon, gram = con.execute("select headwords, deconstructor, grammar from lookup where lookup_key = ?", (form,)).fetchone()
            rows[form] = (json.loads(hw) if hw else [], json.loads(gram) if gram else [], json.loads(decon) if decon else [])
        return rows[form]

    canon = json.load(gzip.open(args.canon, "rt", encoding="utf-8"))
    wanted = set()
    for book in canon["books"]:
        for block in book["blocks"]:
            for tok in tokens(block[2]):
                for form, _ in parts(tok, known):
                    wanted.add(form)
    canon_source = canon["source"]
    del canon
    # Parts of every kept split (two levels), so components can be glossed too.
    frontier = set(wanted)
    for _ in range(2):
        nxt = set()
        for form in frontier:
            for split in (lookup(form) or ((), (), ()))[2][:MAX_SPLITS]:
                for piece in split.split(" + "):
                    piece = piece.strip()
                    if piece and piece not in wanted:
                        nxt.add(piece)
        wanted |= nxt
        frontier = nxt

    forms = {}
    for form in sorted(wanted):
        found = lookup(form)
        if not found:
            continue
        h, g, d = found
        row = [h, g, d[:MAX_SPLITS]]
        while row and not row[-1]:
            row.pop()
        forms[form] = row
    rows.clear()
    keys.clear()

    headwords = []
    for row in con.execute("select id, lemma_1, pos, grammar, meaning_1, meaning_2, root_key, construction, plus_case from dpd_headwords order by id"):
        hid, lemma, pos, grammar, m1, m2, root_key, construction, plus_case = row
        meaning = (m1 or m2 or "").strip()
        headwords.append([hid, lemma, pos, grammar, meaning, root_key or "", first_line(construction), plus_case or ""])
    roots = {}
    for root, meaning, sign, group in con.execute("select root, root_meaning, root_sign, root_group from dpd_roots"):
        roots[root] = [meaning, sign, group]

    db_hash = hashlib.sha256()
    with open(args.db, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            db_hash.update(chunk)

    asset = args.asset_url or f"https://github.com/digitalpalidictionary/dpd-db/releases/download/{version}/dpd.db.tar.xz"
    data = {
        "source": {
            "name": "Digital Pāḷi Dictionary (DPD)",
            "author": info.get("author", "Bodhirasa Bhikkhu"),
            "version": version,
            "repository": "https://github.com/digitalpalidictionary/dpd-db",
            "release": f"https://github.com/digitalpalidictionary/dpd-db/releases/tag/{version}",
            "asset": asset,
            "asset_sha256": args.archive_sha256,
            "db_sha256": db_hash.hexdigest(),
            "doi": info.get("doi", ""),
            "citation": info.get("citation", ""),
            "website": "https://www.dpdict.net/",
            "license": "CC BY-NC-SA 4.0",
            "license_url": "https://creativecommons.org/licenses/by-nc-sa/4.0/",
            "attribution": f"Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, {version}, CC BY-NC-SA 4.0 (https://www.dpdict.net/)",
            "subset": "All headwords and roots; inflection -> headword map and deconstructor splits for the word forms of the bundled VRI root texts. Derived file, same licence (CC BY-NC-SA 4.0).",
            "canon_commit": canon_source.get("commit", ""),
        },
        "roots": roots,
        "headwords": headwords,
        "forms": forms,
    }
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    with open(args.out, "wb") as fh:
        with gzip.GzipFile(filename="", mode="wb", fileobj=fh, compresslevel=9, mtime=0) as gz:
            gz.write(raw)
    print(f"DPD {version}: {len(headwords)} headwords, {len(roots)} roots, {len(forms)} forms "
          f"({sum(1 for v in forms.values() if v and v[0])} with headwords, {sum(1 for v in forms.values() if len(v) > 2 and v[2])} with splits); "
          f"raw {len(raw) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
