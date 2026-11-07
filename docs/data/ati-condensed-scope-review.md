# Condensed single-discourse pages: review and implementation boundary (D191)

SN 36.15 remains held. Its source relationship is credible, but current scope
metadata cannot honestly represent the English page as complete VRI coverage.
This is a representation gap, not a rejection of the translator's work.

## Evidence and decision

The pinned VRI unit is paragraph 263 in `s0304m.mul.xml`, blocks 1356–1358,
PTS S iv 219–221. It has one heading and a single 1,940-character prose segment,
`sn36.15/2`. That segment contains separate cessation (`nirodho`), stilling
(`vūpasamo`) and subsiding (`paṭippassaddhi`) treatments. Nyanaponika's
[ATI page](https://www.accesstoinsight.org/tipitaka/sn/sn36/sn36.015.nypo.html)
has one gradual-cessation sequence. Ānanda's inquiry, three feelings, contact,
cessation/path and gratification/danger/escape support the association. They do
not establish complete correspondence or locate each omission/condensation.

Existing partial scope requires a proper contiguous body subset with prose
outside it. Shared scope requires at least two contiguous independent units.
Selecting the entire one prose segment as partial or allowing singleton shared
pages would bypass meaningful safeguards. Keep both contracts unchanged.

## Recommended additive contract

A future `condensed_scope` declaration should return `kind: condensed_page`.
Initially allow exactly one independent, non-approximate subject unit. Require
reviewed status, condensed presentation, unverified alignment, exact ownership,
canonical commit, complete root-segment hash, complete extracted-English hash,
size bounds and validated source URL. Reject coexistence with partial/shared
scope and duplicate ownership. Preserve source HTML, rights and provenance pins.

Return `whole_unit_coverage: false`, `individual_alignment_verified: false`,
`text_id: null` and a separately named subject/requested unit ID. A quotation
match or absence concerns the **publisher page**, not a particular canonical
passage. Never assert that the one English sequence aligns with one particular
VRI treatment. A complete-unit Pāli reading command is comparative context only.

Require explicit `allow_condensed` retrieval consent, exact translation ID and
`include_condensed` verification consent with explicit texts. Preserve scope,
source version and prefix hashes across continuation; prohibit fallback.
Ordinary attached English, comparison prompts and widget reading stay closed
until each surface has explicit semantics. Do not add this to whole-unit counts.

## Consumer and regression checklist

| Area | Required work |
|---|---|
| `translation-scope.mjs` | Third strict presence-based classifier; preserve partial/shared validation. |
| `canon.mjs` | Unique owner, no range inheritance, separate discovery metadata and URL handling. |
| `english.mjs` | Explicit third-kind handling; scoped-and-not-shared currently assumes partial. |
| `verify.mjs` | Page-level positive/negative results, null individual ID, exact opt-in and independent returned scope/version/hash validation; mixed-source tie handling. |
| Tool schemas and continuations | Consent parameters, exact selector and consistent continuation fields. |
| Coverage, providers and export | Separate condensed availability counts; whole-unit and legacy CSV English counts unchanged. |
| Daily, aliases, search, talks | Preserve existing scoped exclusions and full descriptors where exposed. |
| Build manifest | Separate scoped path; current reviewed-story loader emits whole-text links and drops scope declarations. |
| Package/audits | Rebuild bundles; audit corpus/export, installed stdio/HTTP, eight-script input and version-selection behavior. |

Required regressions: malformed/removed/changed declarations; duplicate owners;
wrong-unit and absent-consent rejection before fetch; no default retrieval;
unchanged whole-unit counts; page-level positive/negative verification; mixed
source ties; exact version, continuation and source drift. Retain singleton
shared and real-SN36.15 whole-prose partial rejection tests.

An independent read-only review inspected the source, contracts and consumers;
43 focused existing tests passed. This batch documents the complete boundary
and adds four independently verified whole-discourse choices. It does **not**
ship a partially wired condensed feature or approve SN 36.15. Future work can
implement this bounded contract without rediscovering the architecture.

## Second concrete case from D192: substantive ending inside a segment

ATI AN 2.46 (*Bombast*) maps by content to indexed AN 2.47, VRI paragraph 48,
`s0402m1.mul.xml` blocks 120–122. Both assembly descriptions match; the final
summary and assertion that the questioning-trained assembly is foremost are
absent. They begin at offsets 828 and 860 within `an2.47/2` (960 characters).
There are only two prose segments. Whole-segment partial scope cannot cover
both descriptions while excluding the omitted ending. This page remains held,
with source rights permitted but whole-VRI coverage unestablished.

This is a second real candidate for the proposed separate page-level contract;
it is not permission to implement only its declaration while other consumers
still assume whole-unit or partial-span semantics. D192 instead delivers six
new whole-unit English choices plus one alternate through existing contracts.
