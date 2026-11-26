# Ten Apadāna record boundaries

This batch corrects the ownership and metadata of ten existing Pāli records. It
adds no English translations and claims no increase in whole-text coverage.
The application component is `6ab4a322108aec740c330e4afd974ee4da808886`;
this component alone is not a validated release. The final exact commit and
its checks determine integration status.

## Scope

The paired records are 348/349 and 374/375 in VRI Book 36, and 423/424,
426/427 and 428/429 in Book 37. Raw source paths are `romn/s0510m1.mul.xml`
and `romn/s0510m2.mul.xml` at VRI revision
`2d134ff9ef60f70a1eb03c9370580228811a3070`.

The former cuts 10371, 10790, 55, 216 and 277 become 10367, 10786, 51,
212 and 273 respectively. The ten records use the new index revision
`apadana-thera-next10-v1`; effective positional locator revisions append this
to the VRI revision. Older repaired records keep their distinct namespaces.

The independently derived canonical logical SHA256 changes from
`0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b`
to `f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de`.
All 61 source books, the other 8,534 unit objects, commentary, source notices,
and all 343 existing Apadāna English profiles and links are preserved.
The affected unions retain all 340 source blocks and 17 notes. Closing formulas,
speaker labels and chapter apparatus keep their evidenced ownership.

## Old links and private study data

All 144 old segment positions require deliberate reopening before use with the
new locator revision. Of these, 69 numeric references now identify a different
source position, ten no longer exist, and 65 retain the same source position.
Even the latter must not silently acquire a new pin. The independently sealed
crosswalk records these distinctions; it is evidence, not a personal-data
migration command.

Bookmarks, notes, drafts, copied citations and exports must keep their original
identity. A stale positional request refuses before displaying replacement
text. A fresh whole-poem request can reveal the corrected current edition, after
which the reader can deliberately choose a current position. No personal
records are automatically reassigned.

## Independent source evidence

`docs/evidence/apadana/boundaries-next-ten` contains the original-first oracle,
old/new records, complete 144-position crosswalk, isolated render evidence and
source pins. Runtime inventory and review are in its `runtime` subdirectory.
These are finite source/runtime approvals, not substitutes for behavioral tests,
a genuine package installation, browser acceptance or exact-commit CI.

The derived parallels index changes exactly two fields: the canonical packed
input checksum and its intermediate candidate-pair count, 12,642 to 12,639.
The count was independently derived from the frozen prior algorithm and source
metadata, rather than copied from the candidate output. Five candidate pairs
are removed and two added; the published final edges and their citations are
unchanged. The independent model and complete expected object are retained in
`parallels-independent` so the equality check is reproducible.

An earlier cohort handoff called the inline page marker at Book 36 paragraph
10788 “PTS 290.” The original XML actually marks PTS **291** there. Record 375
begins with the carried start page 290, then encounters that inline 291 marker.
The oracle and tests preserve both facts. No publisher marker was rewritten.

## Historical acceptance tests

Older finite releases retain their immutable authorities. New test-only helpers
verify the current physical corpus and runtime before constructing the exact
prior DD7 test inputs. The source-input inverse separately restores whole
prior files and checks their frozen hashes. It does not rewrite production
responses, weaken current source assertions or project runtime bytes.

Public validation still freshly reads all 27 data files. Private reuse is
limited to one explicit operation and rechecks physical proof files; it is not
an ambient cache. Old child deadlines and Windows serial file scheduling remain
unchanged. Unknown, mutated or missing authorities fail closed.

## Deferred work and acceptance limits

The sixteen proposed English candidates remain a separate research batch.
None is activated by this correction. Each needs its own provenance, reuse
rights and whole-unit correspondence review. Other Book 37 structural leads
are not approved by implication.

The preceding DD7 automatic recheck had 58 successful package jobs and one
macOS Node 22 timeout after 30 minutes, with no failed assertion or completed
TAP summary. Earlier exact-candidate checks passed, but that does not turn the
later timeout into success. The timeout is recorded separately; no blind rerun
or relaxed deadline is authorized by this batch. Promotion requires the new
exact candidate's complete required checks.

Browser automation and emulated viewports do not establish physical-phone,
human screen-reader or signed-in host acceptance. These remain explicit manual
gaps unless a final receipt supplies actual evidence. Main and production are
outside this continuation; only a validated fast-forward of
`dev/pali-reliability` is permitted.
