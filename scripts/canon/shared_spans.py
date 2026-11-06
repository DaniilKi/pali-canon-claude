"""Keep explicitly shared index records within their declared owner's final span.

The CLI repairs a previously built compact index, without fetching source material:
  python3 scripts/canon/shared_spans.py INPUT.json.gz OUTPUT.json.gz [COMMENTARY-IN.gz COMMENTARY-OUT.gz]
"""
import copy
import gzip
import json
import sys


def synchronise_shared_spans(units, annotations=False):
    """Follow only existing shares_passage_with relationships; reject invalid ones."""
    by_id = {u['id']: u for u in units}
    changed = []
    done, active = set(), set()

    def visit(unit):
        key = unit['id']
        if key in done:
            return
        if key in active:
            raise ValueError(f'Cycle in shared passages: {key}')
        active.add(key)
        owner_id = unit.get('shares_passage_with')
        if owner_id:
            owner = by_id.get(owner_id)
            if not owner or not unit.get('approximate') or owner['book'] != unit['book']:
                raise ValueError(f'Invalid shared passage: {key} -> {owner_id}')
            visit(owner)
            fields = ['start', 'end'] + (['vri', 'pts'] if annotations else [])
            if any(unit.get(field) != owner.get(field) for field in fields):
                for field in fields:
                    if field in owner:
                        unit[field] = copy.deepcopy(owner[field])
                    else:
                        unit.pop(field, None)
                changed.append(key)
        active.remove(key)
        done.add(key)

    for unit in units:
        visit(unit)
    return changed


def repair_compact(data):
    """Repair annotations and parent groups affected by stale shared records only."""
    changed = synchronise_shared_spans(data['units'], annotations=True)
    affected = set(changed)
    by_id = {u['id']: u for u in data['units']}
    groups = []
    for group in data['units']:
        if group.get('kind') != 'range' or not affected.intersection(group.get('members', [])):
            continue
        members = [by_id[key] for key in group['members']]
        if any(u['book'] != group['book'] for u in members):
            raise ValueError(f'Cross-book shared group: {group["id"]}')
        start, end = min(u['start'] for u in members), max(u['end'] for u in members)
        if start != group['start']:
            raise ValueError(f'Group start changed; rebuild from source: {group["id"]}')
        if end == group['end']:
            continue
        last = max(members, key=lambda u: u['end'])
        if group.get('pts') and (not last.get('pts') or last['pts']['volume'] != group['pts']['volume']):
            raise ValueError(f'Group page volume changed; rebuild from source: {group["id"]}')
        group['end'] = end
        paras = [b[1] for b in data['books'][group['book']]['blocks'][start:end] if b[1]]
        group['vri'] = (paras[0] if len(paras) == 1 else f"{paras[0].split('-')[0]}–{paras[-1].split('-')[-1]}") if paras else None
        if group.get('pts'):
            group['pts']['end_page'] = last['pts']['end_page']
        groups.append(group['id'])
    return {'shared_records': changed, 'groups': groups}


def repair_commentary(data, canon, corrections):
    """Remove stale assignments, retaining only already aligned owner/member passages."""
    by_id = {u['id']: u for u in canon['units']}
    removed = {}
    for key in corrections['shared_records'] + corrections['groups']:
        unit = by_id[key]
        owners = unit.get('members') or [unit['shares_passage_with']]
        allowed = {pi for owner in owners for pi in data['units'].get(owner, [])}
        previous = data['units'].get(key, [])
        kept = [pi for pi in previous if pi in allowed]
        if previous and not kept:
            raise ValueError(f'Alignment coverage would change; rebuild from source: {key}')
        if previous != kept:
            data['units'][key] = kept
            removed[key] = len(previous) - len(kept)
    return removed


def write_gzip(path, data):
    with open(path, 'wb') as output:
        with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=9, mtime=0) as compressed:
            compressed.write(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))


if __name__ == '__main__':
    if len(sys.argv) not in (3, 5) or len(set(sys.argv[1:])) != len(sys.argv[1:]):
        raise SystemExit('Usage: shared_spans.py INPUT.json.gz OUTPUT.json.gz [COMMENTARY-IN.gz COMMENTARY-OUT.gz] (distinct paths)')
    with gzip.open(sys.argv[1], 'rt', encoding='utf-8') as source:
        data = json.load(source)
    report = repair_compact(data)
    if len(sys.argv) == 5:
        with gzip.open(sys.argv[3], 'rt', encoding='utf-8') as source:
            commentary = json.load(source)
        report['removed_commentary_assignments'] = repair_commentary(commentary, data, report)
        write_gzip(sys.argv[4], commentary)
    write_gzip(sys.argv[2], data)
    print(json.dumps(report))
