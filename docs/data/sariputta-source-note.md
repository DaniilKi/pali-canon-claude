# One original VRI source note: verified local implementation (D258)

The independent [source/schema approval](../evidence/source-notes/SARIPUTTA_SOURCE_SCHEMA_APPROVAL.json) authorizes implementation of one exact original Roman Pāli VRI edition remark, record `vri:s0510m1:note-only:1130`. It approves neither runtime behavior nor release, remote CI or push. The preceding 285-choice stack is locally approved and committed at `ff798f681147e12160167fbeb9ef1927bb54c45c`; remote dev remains `a9755d2`. Historical D254–D257 receipts keep their original stage-specific claims.

## Source and ownership

The note has its own unnumbered, note-only `gatha1` element in `s0510m1.mul.xml`, physical zero-based element 1130 after marker 372, at VRI revision `2d134ff9ef60f70a1eb03c9370580228811a3070`. It is an edition remark, not canonical body text, commentary, translator English or a new translation. Its location-only display points are `tha-ap3/236` (UID offset 235) and `vri-book:s0510m1/387` (book offset 386). They do not prove a unique semantic stanza owner or an independently collated Thai witness.

Preserve the exact neighboring original 373 note and its `gāthāro` spelling, distinct from the recovered note's `gāthāyo`. Do not deduplicate them, rebuild a stanza, silently correct wording or insert a root block. Raw insertion would require a separate 420-unit-span/244-old-profile reindex project; the approved sidecar avoids that change.

The XML SHA-256 is `ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1`; its raw UTF-16LE element occupies `[196320,196466)` with SHA-256 `986c6f423be82278f4a62441de602fcda1e412493c4a51570bd5ab712a1ec723`. The original note text SHA-256 is `e4544e7b41ad8ed3f72d281f9735359c51aac2f8c758588731a1135e4a03fa60`. The approved record hash is `0d7ab15b095a5175742655a16b67fabf31ed47f73d10fe3de1c821eb1e2b11b7`, over compact recursively key-sorted UTF-8 JSON, without Unicode normalization or self-hash. The approved registry-file byte hash is `1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e`. These are distinct integrity domains; none replaces existing source/locator pins.

The same established VRI noncommercial-with-attribution baseline grant governs this original apparatus. Preserve full VRI source/terms and an extraction-change disclosure. The supplied snapshot contains XML only: no upstream rights notice was newly fetched or renewed. No Walters/Whitman translation or media rights are invoked or expanded.

## Approved additive contract

Only `tha-ap3` and source book `s0510m1` receive a top-level `source_notes` envelope, on every returned page, including out-of-range, exact, context and continuation reads. Availability total 1 counts only this separately indexed note, not every VRI variant or remark. At opening, show an availability card with explicit fixed navigation commands; do not guess offsets or automatically fetch. The original note remains Roman Pāli whatever root script or none/raw/structured variant mode the reader selects.

A validated anchor-containing page carries one fixed note entry, displayed once in a separately labelled sibling aside after the existing empty marker. Existing root `notes`, `segments`, `pali.segments`, variants, source objects and English responses remain unchanged. The authentic four-key empty anchor must occur exactly once; a mutated or duplicate anchor suppresses apparatus rather than attaching it to foreign words. Finite anchor validation does not authenticate arbitrary page text.

A missing, malformed, duplicate, foreign or hash-invalid record/envelope yields only an apparatus-unavailable warning. Pāli reading, unrelated tools and private drafts remain usable; no note wording appears on failure. Lazy artifact loading must not abort startup or global canon loading. Cache only successful immutable pinned artifact/record/extraction identities, never a missing artifact as complete empty coverage. Clients must revalidate mutated same-object host events and older affected payloads lacking the envelope; identical validated note views should avoid unnecessary DOM replacement or focus changes.

The note must stay outside print, scripture quotations, root search/analysis, model-sharing context, study/save/highlight controls and private storage. Physical-location language, an original Roman Pāli label, attribution and terms belong in the reader; raw XML/byte details can remain API/evidence details. Both widget resources and native rendering need the new apparatus contract; old clients cannot retroactively gain that completeness guarantee.

## Reproduction and validation procedure

Sealed architecture and original-first derivation are external at `/tmp/pali-sariputta-architecture/` and `/tmp/pali-sariputta-independent/`. The approved implementation uses a standard-library builder, a finite manifest, a small separately labelled artifact and shared strict client policy. Intended builder commands are:

```sh
python -X utf8 scripts/canon/build_source_notes.py \
  --xml /path/to/pinned-vri/s0510m1.mul.xml \
  --canon /path/to/unpacked/canon.json.gz \
  --manifest scripts/canon/source_note_manifest.json \
  --output /tmp/source-notes.json

python -X utf8 scripts/canon/build_source_notes.py \
  --xml /path/to/pinned-vri/s0510m1.mul.xml \
  --canon /path/to/unpacked/canon.json.gz \
  --manifest scripts/canon/source_note_manifest.json \
  --verify server/data/source-notes.json
```

The builder verifies exact XML/bytes/neighbors and all prior book tuples without changing canon or root data; runtime must not fetch XML or network sources. The builder and independent source replay passed the exact 14,645 represented book tuples. Commands above describe the approved reproduction procedure; final local execution results are recorded below.

Required gates include source/record/neighbor/owner mutation refusals, all 8,544 old unit and source-book segment/API/anchor comparisons, affected paging/exact/context/script/variant modes and unaffected selections, lazy artifact failures, native/two-widget stale cached envelopes, accessible location-only display, old anchors/drafts/focus/private-state preservation, installed bytes and strict whole-resource equality. Root owns builds, full checks, package, exact CI and Git. Chromium/axe/simulated bridges do not replace physical-device, human assistive, signed-in-host, live-provider or specialist review. Whole-body metadata does not authenticate arbitrary forged partial-page wording.

## Coverage, separate holds and remote validation

Expected unchanged baseline totals are 285 choices (40 Therī, 245 Therā), 2,868 links, 1,764/2,187 indexed and 1,738/2,161 member-aware coverage. Canonical logical SHA-256 `1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32`, all 61 books/8,544 units, 420 existing spans and prior profile/link objects must remain unchanged. This note adds no English or scripture coverage. Final compatibility and actual metadata checks confirm these unchanged totals and hashes; the note is separately indexed apparatus, not added English or scripture coverage.

Publisher260's isolated local proposal at `dbcdfcb…` is a separate representation experiment, outside the catalogue; production activation remains held. Other source holds and historical receipts remain unchanged.

Prior macOS Node 22 job `136004108676` on exact remote `a9755d2` ended CANCELLED at 07:02:42; 52 other jobs passed. No underlying cause or assertion failure is established by that outcome. One supported exact-job debug retry is recommended for recovery but has not been executed. No further cancellation, push, main change, force push, deployment or outreach is authorized by this task. Local source/schema approval does not reconcile remote CI or complete the project.


## Completed local validation and independent review

D258 local implementation is verified: source/client 17/17, serialization 3/3 and preservation 3/3 passed, covering all 8,544 units/61 books, all 420 spans in four modes, 342 entire old API-field comparisons and 285 profiles. Independent corpus proof covers 134,380 segments. The final full check passed at 07:48:16 in 333.791 seconds on Linux x64 Node 24.22.1/npm 11.9.0: 1,742 total, 1,571 pass, 171 optional-source skips, zero failure/cancel; audit 8,544 texts/zero problems. Historical projection (26 unique targeted checks) and five adversarial cases are included in final validation. No English coverage, canonical body, old locator or private-data change is introduced. Independent local implementation acceptance is recorded in the D258 final review. Local Git records this implementation; remote CI, push and publication remain unapproved.

Actual browser modes passed 14 cases each: normal 44.812 seconds, accessibility 204.284 seconds and real installed-package 43.246 seconds. Accessibility completed 400 axe scans with zero violations. Chromium widths 390/1,280, light/dark themes and two simulated host bridges were exercised with zero upstream requests; all owned process groups were reaped without leftovers. This does not certify physical devices, human assistive use, signed-in hosts, live-provider availability or specialist interpretation.

The genuine offline npm archive has 39 files/34 runtime files, 40,626,684 bytes and SHA-256 `0eab98e2b513be65e6abd68306b7caa9dec4dd74ecf3d45288c1abc3e1a13adb`; installed/current/archive bytes match. Actual installed checks preserve 270 old API cases; two missing-sidecar cases retain authentic Pāli, with zero network use. Both complete v33 widget resources passed strict byte equality and 8,544 alignment checks with zero network attempts. Smoke passed 34 tools/64 checks; evals passed 195/201 with six live skips. Unique YAML and 238 shell-syntax checks passed. Configured 49 browser groups, 67 jobs, 100 gates and 296 publisher fixtures are configuration only, not remote CI execution.

Earlier diagnostic failures remain preserved: the first full run had three intentional frozen-file assertions resolved by finite exact reversal retaining old hashes, plus an incomplete VRI fixture missing older Theragāthā XML resolved by adding four byte-pinned original files. No test was disabled. The CI author's initial static syntax failure was corrected, and initial package-cache `ENOENT` was resolved by an explicit `/tmp` cache. Final full validation passed; historical error logs remain evidence rather than being overwritten.

At the 07:46 read, remote dev `a9755d2` and main `451a…` remained unchanged. Exact prior macOS job was CANCELLED at 07:02:42, with 52 other jobs passed; no underlying cause or assertion failure is established. The recommended supported exact-job debug retry remains unexecuted. The finite implementation has independent local acceptance; no push, main change, deployment or outreach is authorized. Packaged README/THIRD_PARTY and final production bytes remain frozen.

Final independent [local implementation acceptance](../evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json) is separate from the original source/schema approval. It authorizes only this finite unpublished local implementation, with all publication and remote approvals false.
