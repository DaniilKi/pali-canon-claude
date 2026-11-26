# Bounded history validation without repeated full-data scans

This is a **test-only performance repair** accompanying the six-record Apadāna
boundary repair. It adds no scripture, translation, source permission, locator,
application behavior, or production deployment.

## Observed failure

Candidate `32f29a5fb45f2cfa33368f42592b9c4d9570cbd9` passed 57 of 59 package
jobs and all three companion workflows. Both Windows package jobs exceeded
existing Python test deadlines. The preserved [terminal CI receipt](../evidence/apadana/boundaries340-347/operation-scope/EXACT32F_TERMINAL_CI.json)
identifies the actual failed jobs; this was not a blanket source or reader failure.
No duplicate rerun was submitted.

The unchanged seven-case current333 suite was profiled once before and once after
the repair under the same 115-second internal / 120-second outer bounds. Both
passed. Nested historical inputs had revalidated the same 27 actual data files
1,940 times, hashing about 79.8 GB during one small suite. The copier accounted for
only two seconds; changing copying alone would not address the main cost.

After the repair, the same suite made 40 complete captures across its separate
public operations, hashing about 1.65 GB. Profiled total time fell from 107.071 to
35.465 seconds. Physical proof checks increased from 1,955 to 2,302. These are
local Linux measurements including profiler overhead, **not Windows acceptance
or an application-speed benchmark**. See the [bound comparison](../evidence/apadana/boundaries340-347/operation-scope/BEFORE_AFTER_COMPARISON.json).

## Preserved contract

- Every new public catalogue/data call freshly reads and hashes all 27 actual
  data files against independent sealed expectations. Same-size or restored-mtime
  changes cannot reuse an earlier success.
- One synchronous internal catalogue operation owns immutable checked bytes and
  the four independently pinned historical fixtures. Only its private readers
  can share them; public entry points reject carried scopes.
- Source, runtime and historical proof files are still guarded physical reads
  on internal access. Missing, tampered and symlinked authority remains fatal.
- The scope is thread-bound and closes on success or exception. Closed/reentered
  scopes cannot be reused; buffers are released. There is no global positive,
  path/mtime cache, environment switch, arbitrary callback or runtime projection.
- All 45 retained historical function bodies remain AST-identical (two catalogue
  bodies are preserved under private names). The two proof-only runtime bodies
  gain only scope rejection. Existing 30/120-second child deadlines, assertions,
  full test inventory, CI matrix and mandatory23 source gate are unchanged.
- A separate seven-case negative suite checks the new lifecycle and fresh-read
  guarantees. Its fixtures first establish a genuine valid catalogue/runtime;
  a failure caused by missing unrelated evidence cannot count as protection.

The [independent patch review](../evidence/apadana/boundaries340-347/operation-scope/INDEPENDENT_STATIC_REVIEW.json)
and [body-preservation proof](../evidence/apadana/boundaries340-347/operation-scope/OLD_BODY_AST_PRESERVATION.json)
record the finite implementation scope.

## Source-history and release evidence

The updated finite source-input inverse has SHA-256
`8109fc3557518af7c832cd6bc057a61a51408363861ffb27d216ebe4b6345c41`.
All 36 rows restore complete immutable C1 files; 34 row values are unchanged.
Only the approved/four history helper rows change. The prior `7440a63f…` proof is
preserved [as history](../evidence/apadana/boundaries340-347/history/SIX_BOUNDARY_SOURCE_INVERSES_at32f.json).
These inverses normalize **test source inputs only**. They must never normalize
an actual installed response, corpus, runtime byte inventory, or unknown mutation.

The four previously failing wrapper commands plus the separate scope controls
passed locally in 38.287 seconds, without changing their deadlines. Source-frame,
mandatory-source and exact-commit cross-platform CI results are recorded in the
subsequent release receipts. A pending or failed job is not approval to advance
dev; refetch before a normal fast-forward, and preserve a concurrent owner's work.

The application and all 39 package members must stay byte-identical to the
reviewed `d2462e4` / `32f29a5` component snapshot. Its genuine installed-reader and
browser receipts remain applicable only while that identity is verified. Physical
phones/tablets, human assistive testing, signed-in native hosts and live-provider
uptime are separate unperformed acceptance work. Main and production remain
outside this release task.

## Repeatable focused checks

```sh
node --test tests/approved-acceptance.test.mjs \
  tests/approved-current333-authority-negatives.test.mjs \
  tests/approved-current339-authority-negatives.test.mjs \
  tests/held234-current333-chain.test.mjs tests/six-operation-scope.test.mjs
```

For a comparable optional profile, run the unchanged
`tests/approved_current333_authority_negatives.py` with `python3 -m cProfile`,
an external fail-closed deadline, and a fresh output path. Retain the test/helper
hashes, stderr case count, source state and pstats. Do not overwrite earlier
profiles or interpret profiler time as uninstrumented runtime. Run further
profiles only for an unresolved performance question, not as a release loop.
