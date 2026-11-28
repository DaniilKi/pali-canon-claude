# Validating the current Apadāna reader

Current source declarations and actual runtime acceptance have separate entrypoints.
Use these roles when adding a reviewed collection slice; keep older source witnesses
under their existing names.

- JavaScript: `tests/helpers/current-apadana.mjs` exports `currentContext`,
  `currentAuthority`, `requireCurrentProfiles`, `requireCurrentMetadata`,
  `currentSourceViews`, and `assertCurrentSourceClosure`.
- Python: `scripts/web_reader_current_apadana.py` exports `source_authority`,
  `capture_current`, `approved_catalogue`, `approved_runtime`, `reviewed_intake`,
  `curated_additions`, and `source_views`.

`currentContext` and `source_authority` validate independently approved source
metadata. They do not read server data or accept a runtime. `capture_current`
validates source metadata, authenticates historical prerequisites and the current
independent runtime inventory, then reads each of the 27 actual data files once.
It returns `(context, runtime_rows)`. A browser driver can use that single capture
and compare its target's 34 physical runtime files directly. The public Python
`web_reader_approved_acceptance.assert_runtime` wrapper also checks those 34 target files.

The current declaration composes the unchanged source authority for 382 choices with
four exact approved publisher editions. Its `historical382` member is source
metadata, not a projected API response or an old runtime check. Earlier source
contexts, all full profile/link objects, holds, numbering qualifications, source
revisions and rights notices remain explicit. Whole publisher-edition coverage
does not claim line-complete VRI correspondence.

The old 198-row source map and pure 382 helper remain immutable hash-bound witnesses.
One flat live map, `docs/evidence/apadana/current/CURRENT_SOURCE_INPUTS.json`,
protects their pathname domains plus the reviewed current inputs. Its owner
facade is pinned separately by CI; it is excluded from its own map. The owned H
provider is also pinned separately. There is no epoch environment switch, trust
cache, global root replacement, or per-intake old-runtime snapshot.

## Source-metadata setup

The existing apadana CI group runs this checked-in recipe once:

```sh
python scripts/check-current-source-adapters.py --source-root "$GITHUB_WORKSPACE"
```

It authenticates the V5 index from the workflow's exact path/hash literals,
selects three independently pinned helper identities, and invokes both genuine
retained-five/seven `source_metadata` entrypoints. It checks malformed metadata
contracts too. This does not generate their full external installed/browser
contracts, archive/install evidence or runtime approvals. The recipe executes
already authenticated source buffers, including when stale bytecode is present.

Before the final CI index exists, an explicit independently reviewed three-pin
contract may be passed with `--reviewed-support-contract` and
`--reviewed-support-sha`. A stale index or an unsealed live map must refuse.
Developer-contract success is distinct from ordinary checked-in CI success.

## Next intake

Review source rights, boundaries, identities, original notes and normalization
before changing the two stable current facades. Keep the existing pure source
prefixes immutable; bind the new source documents and independent runtime
inventory in the stable owner. Preserve the actual-data readset and every prior
negative scenario. Update genuine current predicates using independent source
declarations while keeping historical literals under their historical roles.
Registry order preserves a source prefix; navigation sorts reviewed publisher
poem numbers, so an older navigation list may be an ordered subsequence.

Regenerate the single live source map from the final physical files and review
its owner hash separately. Preserve the existing CI support witnesses, scenario
inventory, jobs and bounds. Do not clear source holds, substitute an old API
shape, infer missing wording, or treat an inventory review as release approval.

The H preparation V4 receipt distinguishes the historical 380 source prerequisite
from current source validation and actual current runtime capture. Its closed
phase names and original limits remain fixed. The old 254-proof receipt keeps its
original scope; the pair's 10 and current four's 10 metadata controls are additional
scopes, not a reinterpretation of that receipt.

Installed and browser automation does not establish physical-device or human
assistive acceptance. See [the four-poem manual checklist](english394-407/manual-acceptance.md)
for the remaining hands-on checks. Private drafts, bookmarks and exports stay
local; the QA facade does not change their formats or publish user data.
