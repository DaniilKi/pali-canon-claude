"""Build server/data/glossary.json.gz: an English <-> Pali glossary and a sutta-name index from DPD (issue #102).

Input is the same pinned DPD SQLite release as build_dpd.py (dpd.db), the bundled canon and the bundled DPD subset.
Nothing is generated or written by hand: every English key, Pali headword, meaning and sutta name is copied from DPD.

Kept:
  - headwords: every DPD headword whose word forms occur in the bundled VRI canon (the ids in dpd.json.gz `forms`),
    with part of speech, the first meaning (meaning_1, else meaning_2) and DPD's own count in the early texts
    (ebt_count);
  - en: DPD's English index (the `epd` column of the `lookup` table), limited to those headwords, ranked by where the
    English word stands in the meaning (first sense first, "(comm)" senses last) and then by ebt_count, at most
    MAX_PER_KEY per key;
  - phrases: multi-word senses taken verbatim from meaning_1 ("mindfulness while breathing in and out"), so an English
    phrase can be matched as a whole; source recorded as "DPD meaning";
  - names: from DPD's `sutta_info` table only dpd_sutta and dpd_sutta_var (DPD's own sutta names), mapped to the bundled canon's text
    ID through the CST file and paragraph number (cst_file, cst_paranum). Every sc_* column (SuttaCentral), every
    dv_* column and the dpd_code column (it follows SuttaCentral numbering) are dropped; dpd_code is read only to skip group rows. A row is kept only when the canon text found there carries the same title as CST
    (cst_sutta) or DPD (dpd_sutta); groups of texts (vagga, samyutta rows) are skipped.

Usage:
  python -I scripts/dpd/build_glossary.py DPD_DB CANON_JSON_GZ DPD_JSON_GZ OUT_JSON_GZ --archive-sha256 HEX

Licence: DPD is CC BY-NC-SA 4.0 (Bodhirasa Bhikkhu). The output is a derivative and carries the same licence.
"""
import argparse
import gzip
import json
import re
import sqlite3
import sys
import unicodedata

MAX_PER_KEY = 10
# Parts of speech that are not words to search for (sandhi forms, abbreviations, affixes, letters).
SKIP_POS = {"sandhi", "abbrev", "suffix", "prefix", "letter", "cs", "root", "ve"}
KEY = r"[a-zāīūṅñṭḍṇḷṃ][a-zāīūṅñṭḍṇḷṃ' -]*"
STOP = {"a", "an", "the", "of", "to", "in", "on", "at", "by", "for", "with", "and", "or", "is", "be", "as", "it", "from"}


def fold(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return s.replace("ṁ", "m").replace("ṃ", "m")


def clean(lemma):
    return re.sub(r"\s+\d+(?:\.\d+)?$", "", lemma or "")


def title_key(title):
    """Folded title without the number, spaces and a final sutta/suttam/suttanta: "10. Mahāsatipaṭṭhānasuttaṃ" -> "mahasatipatthana"."""
    t = fold(re.sub(r"^\s*\d+[.)]?\s*", "", clean(title)))
    t = re.sub(r"[^a-z]", "", t)
    return re.sub(r"(suttantam|suttanta|suttam|sutta)$", "", t)


def senses(meaning):
    return [s.strip() for s in (meaning or "").split(";") if s.strip()]


def sense_rank(meaning, key):
    """0 when the English key is a word of one of DPD's own senses, 1 when only of a commentarial "(comm)" sense."""
    pat = re.compile(r"(?<![a-z])" + re.escape(key.lower()) + r"(?![a-z])")
    best = 2
    for s in senses(meaning):
        if pat.search(s.lower()):
            best = min(best, 1 if s.startswith("(comm)") else 0)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("db")
    ap.add_argument("canon")
    ap.add_argument("dpd_subset")
    ap.add_argument("out")
    ap.add_argument("--archive-sha256", required=True)
    args = ap.parse_args()

    con = sqlite3.connect(args.db)
    info = dict(con.execute("select key, value from db_info"))
    version = info["dpd_release_version"]
    if info.get("license") != "CC BY-NC-SA 4.0":
        sys.exit(f"Unexpected DPD licence {info.get('license')!r}; stop and review.")

    subset = json.load(gzip.open(args.dpd_subset, "rt", encoding="utf-8"))
    if subset["source"]["version"] != version:
        sys.exit(f"dpd.json.gz is {subset['source']['version']}, dpd.db is {version}: rebuild them from the same release.")
    in_canon = set()
    for row in subset["forms"].values():
        in_canon.update(row[0] if row else [])
    del subset

    # Headwords in the canon, grouped by clean lemma + pos (the epd index names lemmas without homonym numbers).
    by_lemma = {}
    for hid, lemma, pos, m1, m2, ebt in con.execute("select id, lemma_1, pos, meaning_1, meaning_2, ebt_count from dpd_headwords"):
        if hid not in in_canon or pos in SKIP_POS:
            continue
        meaning = (m1 or m2 or "").strip()
        if not meaning:
            continue
        key = (clean(lemma), pos)
        cur = by_lemma.get(key)
        if cur is None or (ebt or 0) > cur[3]:
            by_lemma[key] = [clean(lemma), pos, meaning, ebt or 0]

    headwords = []
    index = {}

    def hw(key):
        if key not in index:
            index[key] = len(headwords)
            headwords.append(by_lemma[key])
        return index[key]

    en = {}
    for key, epd in con.execute("select lookup_key, epd from lookup where epd is not null and epd not in ('', '[]')"):
        k = unicodedata.normalize("NFC", key.strip().lower())
        if not k or k in STOP or not re.fullmatch(KEY, k):
            continue
        items = []
        for lemma, pos, meaning in json.loads(epd):
            found = by_lemma.get((lemma, pos))
            if found:
                items.append(((sense_rank(meaning, k), -found[3], lemma), (lemma, pos)))
        if not items:
            continue
        items.sort()
        ids = []
        for _, ref in items:
            i = hw(ref)
            if i not in ids:
                ids.append(i)
        en[k] = (en.get(k, []) + [i for i in ids if i not in en.get(k, [])])[:MAX_PER_KEY]

    # Multi-word senses of meaning_1, verbatim, as phrase keys (only those of 2-6 plain words).
    phrases = {}
    for (lemma, pos), (_, _, meaning, ebt) in sorted(by_lemma.items(), key=lambda kv: -kv[1][3]):
        if ebt <= 0:
            continue
        for s in senses(meaning):
            p = re.sub(r"\([^)]*\)", " ", s.lower())
            p = re.sub(r"\s+", " ", p).strip()
            words = p.split(" ")
            if not (2 <= len(words) <= 6 or "-" in p) or len(words) > 6 or not re.fullmatch(KEY, p) or p in en:
                continue
            lst = phrases.setdefault(p, [])
            if len(lst) < MAX_PER_KEY:
                i = hw((lemma, pos))
                if i not in lst:
                    lst.append(i)

    # Sutta names: dpd_sutta and dpd_sutta_var mapped to canon text IDs through CST file + paragraph.
    canon = json.load(gzip.open(args.canon, "rt", encoding="utf-8"))
    book_by_file = {b["file"]: i for i, b in enumerate(canon["books"])}
    units = [u for u in canon["units"] if not u.get("approximate") and u.get("kind") != "range"]

    def unit_at(book, para):
        blocks = canon["books"][book]["blocks"]
        hits = [k for k, b in enumerate(blocks) if str(b[1] or "").split("-")[0] == str(para)]
        if not hits:
            return None
        k = hits[0]
        cands = [u for u in units if u["book"] == book and u["start"] <= k < u["end"]]
        cands.sort(key=lambda u: u["end"] - u["start"])
        return cands[0] if cands else None

    names = []
    skipped = 0
    for code, name, var, cst_file, para, cst_sutta in con.execute(
            "select dpd_code, dpd_sutta, dpd_sutta_var, cst_file, cst_paranum, cst_sutta from sutta_info"):
        if not code or "-" in code or not cst_file or not para:
            continue
        book = book_by_file.get(cst_file.replace("romn/", ""))
        if book is None:
            skipped += 1
            continue
        u = unit_at(book, para)
        if not u or title_key(u.get("title")) not in {title_key(cst_sutta), title_key(name), *(title_key(v) for v in (var or "").split(";"))}:
            skipped += 1
            continue
        variants = [clean(v) for v in [name] + [x.strip() for x in (var or "").split(";")] if v and v.strip()]
        names.append([u["id"], sorted(set(variants), key=variants.index)])

    out = {
        "source": {
            "name": "Digital Pāḷi Dictionary",
            "version": version,
            "release": f"https://github.com/digitalpalidictionary/dpd-db/releases/tag/{version}",
            "asset_sha256": args.archive_sha256,
            "attribution": f"Digital Pāḷi Dictionary by Bodhirasa Bhikkhu, {version}, CC BY-NC-SA 4.0 (https://www.dpdict.net/)",
            "license": "CC BY-NC-SA 4.0",
            "canon_commit": canon["source"]["commit"],
            "tables": {
                "en": "lookup.epd (DPD's English index), headwords limited to those found in the bundled canon",
                "phrases": "multi-word senses of dpd_headwords.meaning_1, verbatim",
                "names": "sutta_info.dpd_sutta and dpd_sutta_var only (sc_*, dv_* and code columns dropped), mapped to canon text IDs through cst_file + cst_paranum",
            },
        },
        "headwords": headwords,
        "en": en,
        "phrases": phrases,
        "names": names,
    }
    data = json.dumps(out, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode("utf-8")
    with open(args.out, "wb") as raw, gzip.GzipFile(fileobj=raw, mode="wb", compresslevel=9, mtime=0) as f:
        f.write(data)
    print(f"headwords {len(headwords)}, en keys {len(en)}, phrases {len(phrases)}, names {len(names)} (skipped {skipped})")


if __name__ == "__main__":
    main()
