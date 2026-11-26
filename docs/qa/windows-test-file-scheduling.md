# Windows test-file scheduling

Windows now defaults to one test file at a time in the existing `scripts/test.mjs`
child. Linux and macOS retain their default file scheduling. This changes only
release-test scheduling, **not the application or its runtime concurrency**.

The driver still discovers every top-level `tests/*.test.mjs` file, sorts the full
list, invokes one `node --test` child, forwards trailing arguments, inherits stdio
and preserves the child exit status (or fails closed when it is absent). Every
original assertion and30/120-second Python deadline remains. The original2,011
cases are retained; two entry-point probe cases make the matched normal inventory
**2,013**. The complete-test CI phase remains bounded at30minutes.

## Observed evidence

The operation-scope optimization in `7b613ce` fixed the earlier large Windows
validation timeouts. Both Windows20/22 jobs then passed the333/339 suites and new
scope controls, but the unchanged held234 seven-case wrapper still exceeded its
30-second child deadline. The [exact run reconciliation](../evidence/apadana/boundaries340-347/windows-scheduling/EXACT7B_CI_RECONCILIATION.json)
preserves56 successful jobs, two Windows failures and one cancelled macOS20 job
with no executed steps. That cancellation's cause is not established. All three
companion workflows passed. No old run was retried.

An isolated [Windows22 diagnostic](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45852677830)
used unchanged7b source plus exactly one diagnostic workflow. Its four-core host,
Node22.23.5 and Python3.12.10 were recorded; default file concurrency was3.

| Original wrapper cohort | Elapsed | Observed result |
|---|---:|---|
|held234 alone|24.539s|1/1 pass, zero skips|
|333/339/held234, default concurrency|53.333s|2 pass,1 fail, zero skips|
|same three files, file concurrency1|108.904s|3/3 pass, zero skips|

Every original child limit remained unchanged. No outer timeout, signal, spawn
error or unverified cleanup was reported. The diagnostic correctly ended as a
failure because its default-concurrency contrast failed; it was never a release
approval. The [structured observations](../evidence/apadana/boundaries340-347/windows-scheduling/DIAGNOSTIC_RESULTS.json)
retain exact source, time and count bindings.

This supports a serial Windows scheduling candidate; it does not prove a
machine-level cause. The artifact ZIP was not extracted through the local export
route, so the concurrent cohort's failing test and category remain **unverified**.
Fixed order, cache warmth and focused-versus-full workload differences also
limit inference. Cap2 was not measured. The full exact-candidate Windows20/22
inventory must pass before dev promotion; the focused comparison cannot replace it.

## Integrity and continuation

Two new probes copy the actual driver byte-for-byte into owned temporary
fixtures. They exercise real file discovery, including every existing filename,
an extra test and ignored/nested inputs, while intercepting and verifying child
process APIs before import. Simulated Windows/Linux/macOS and success, nonzero,
absent-status and spawn-error results verify completeness, flags, arguments,
single invocation and fail-closed behavior. These simulations are not real OS
acceptance. The probes passed2/2 locally; all30 related source-history controls
also passed without skips.

The finite current-to-C1 source inverse is now
`21c6076b7954b65f807a7ae044d61fb7f61f8a352e4acc6b28eae5ebbd87aaf7`.
All37 rows restore exact immutable originals. The previous36 row values remain
byte-identical; the sole extra row is the complete test driver. Both earlier
proofs (`7440a63f…` and `8109fc35…`) remain preserved in history. Independent
[map review](../evidence/apadana/boundaries340-347/windows-scheduling/INDEPENDENT_SOURCE_INVERSE_V4_REVIEW.json)
and [runner review](../evidence/apadana/boundaries340-347/windows-scheduling/RUNNER_AND_PROBES_STATIC_REVIEW.json)
are separate from future CI acceptance.

Rebind all39 package members to the reviewed application snapshot before release.
No scripture, translation, source permission, locator, private study data,
application source, browser behavior or production setting changes here. The
isolated diagnostic workflow stays on its diagnostic branch and is represented
only as inert evidence in this release. Main and production remain outside scope.

Do not substitute a longer timeout, filtered file list, extra skip, repeated
passing suite or a synthetic probe for the required full Windows evidence. Any
later scheduling change needs its own measured justification and exact-commit
validation. Real devices, human accessibility, native signed-in hosts and live
source availability remain separate acceptance work.

## Owned-fixture physical identity

The first Mac22 run of the scheduling candidate `85d512e` exposed a mistake in
its new probe fixture: Node ESM resolved `/var/...` through `/private/var/...`,
while the expected argument list used the lexical alias. The application and
Windows scheduling driver were unchanged. Exact path comparisons correctly
caught the mismatch; no filename or status assertion was removed.

The fixture now canonicalizes only its **newly created owned temporary directory**
with `realpathSync`. A directory-symlink/junction regression is included inside
the existing first test case across all three simulated platforms. The original
lexical-root version reproduces one failure and one pass; the physical-root
version passes both, with zero skips. Full argument identity, status behavior,
child limits and the2,013-case inventory remain preserved. This is not a rule to
resolve untrusted source/proof roots: their existing symlink refusals stay exact.

[Negative/positive evidence and independent reviews](../evidence/apadana/boundaries340-347/fixture-realpath/EVIDENCE_MANIFEST.json)
preserve the failure. The37-row source inverse and loader are byte-identical;
the regenerated V5 receipt changes only the new probe hash to
`ba247c73b24cfdebc2854189188c0afcfd23229cbb95d4bbfb39fd8f2c51355a`.
Actual macOS and Windows checks on the corrected commit remain required; a
Linux alias reproduction and simulated platforms do not replace them.
