# Separate 389/390 boundary repair — not released

This isolated work starts from `b7ef03f8be233524880c001fbc03e0b1c968efb1`. It is separate from the 380-choice English intake and must not be promoted under that intake's CI results.

Original VRI evidence supports changing the boundary between `tha-ap389` and `tha-ap390` to block 11063 and restoring the source-attested final `ṃ` in the second title. The repair preserves all 61 source books, every source word and note, and all 8,542 other canonical records. No English translation is activated. Commentary is unchanged and the CLI refuses intersecting accepted commentary evidence.

The independently reviewed namespace is `apadana-thera389-390-v1`. The full logical canon checksum including the two new `index_revision` fields is `883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a`. The pre-namespace metadata checksum `939cbc9d…` is not a runtime oracle. A strict two-record inverse returns the previous `f3b3a608…` canon only for explicitly historical fixture work.

Root execution has passed the original-XML repair CLI, independent full-output equality, compilation, and six focused Node cases including five genuine Python methods. The direct regressions cover fresh source-pinned positions, stale and unversioned citations, widget/cache guards, bookmarks, notes and exports. Old references comprise nine stable positions, seven collisions and two vanished references; stability alone does not authorize silently rebasing a saved position. Private study records are not rewritten.

Generated changes so far affect only the second compressed canonical shard and its manifest, plus four compiled files. The first shard is byte-identical. These measurements must be rechecked after any later change.

## Still required before integration

- Declare and independently validate actual new-canon runtime bytes and UI v49 expectations. Preserve old 375/380 authorities as historical evidence; do not change their claims to imply they approved this repair.
- Adapt current-runtime and source/CI bindings explicitly. The actual application and current-data assertions must continue to use the new canon, rather than a projected historical F3 view. A historical inverse may support only named historical fixtures.
- Run the complete relevant corpus/parallels/metadata audit, fresh installed-reader/browser flows, current study-data compatibility cases, and required cross-platform CI on the exact candidate.
- Preserve rights holds, all 380 existing translation choices, source attribution and private local study data. The separate proposed publisher 387/388 English additions remain inactive.

No main merge, deployment or dev fast-forward is authorized by these focused results. This document records a local checkpoint, not a completed release.
