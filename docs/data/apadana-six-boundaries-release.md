# Six Apadāna records released to dev

`dev/pali-reliability` was normally fast-forwarded from `c1b2433` to
[`dd7b697df2c54308084fffd934af38130d01f952`](https://github.com/DaniilKi/pali-canon-claude/commit/dd7b697df2c54308084fffd934af38130d01f952)
after all required exact-candidate checks passed. Main stays at `451a857`; no
production deployment, force push or main merge occurred. This evidence branch
adds receipts only and is not a newer software release.

The three corrected pairs are 340/341, 343/344 and 346/347. Their opening source
blocks now belong to the right poem. Every word, all 17 notes and the other 8,538
records are preserved. All 343 existing Apadāna English choices remain unchanged;
this repair adds no translation coverage.

All 89 historical positions require deliberate reopening under the current
locator revision, including numerically unchanged references. Old bookmarks,
notes, drafts and exports are preserved without automatic migration. Earlier
107/108 and333–336 revisions remain exact; source-book coordinates are unchanged.

## Validation and exact links

- [Main candidate workflow: 59/59 jobs passed](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45863080262).
- [Installed reading-command evidence passed](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45863080357).
- [Full bundled corpus passed](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45863080256).
- [Fresh npx installs passed](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45863080230).
- [Real Ubuntu/macOS/Windows × Node20/22 helper preflight passed](https://github.com/DaniilKi/pali-canon-claude/actions/runs/45861570067).

Every full OS/Node leg ran 2,013 cases: 1,759 pass, 254 explicitly optional fixture
skips, zero failures/cancellations. The separately mandatory original-source
gate passed all 23 cases with **zero skips**. Existing source assertions and
30/120-second Python child limits remained unchanged. Firefox/WebKit study
compatibility jobs also passed; none is physical-device or human AT acceptance.

The genuine installed-browser check covered 15 families, 712 old-reference
refusals and 89 current segments. It used synthetic study data and simulated
embedded bridges, made zero external-source requests, and did not certify native
signed-in hosts. All 39 archive/install members remain byte-identical through the
test-helper corrections. Local helper performance measurements and the measured
Windows serial scheduling mitigation concern validation cost, not app speed.

Automatic dev rechecks were observed on this exact same commit after the push.
Their recorded statuses remain distinct from completed candidate validation; no
duplicate manual run or cancellation was submitted. See the [complete release receipt](../evidence/apadana/boundaries340-347/release-dd7/FINAL_RELEASE_RECEIPT.json)
and [exact 59+3 gate](../evidence/apadana/boundaries340-347/release-dd7/FINAL_EXACT_DD7_CI_GATE.json).
The preflight-first diagnostic plan was adjusted when one Mac runner queued for
over 10 minutes: full CI started in parallel, with every target and release gate
still required. Prior failures are preserved rather than called successful.

## Next work remains separate

The [source-only cohort guide](https://github.com/DaniilKi/pali-canon-claude/blob/902bc627440c654250bf14fdc1d0ceb463315cf8/docs/data/apadana-next-cohort-handoff.md)
plans ten further root records and 16 English candidates. It adds no active text,
namespace or coverage; two English candidates depend on the proposed 348/349
correction. The Book37 raw transport is verified, but other 24 structural flags
and a lexical lead remain unreviewed. Existing rights/alignment holds, physical
phones/tablets, human accessibility, native hosts and live-provider availability
remain separate. This finite release is not completion of the entire Pāli project.
