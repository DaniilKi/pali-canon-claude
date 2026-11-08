# Preserve citation-resolution notes in English retrieval (D212)

Reproduced against dev `8052fc165ac4581420d6332f1dd19b4de8073e38`, without restoring older datasets or bundles.

A request for `get_translation` with `uid: "sn56.106"` correctly resolved to the existing primary record `sn56.105-107`, but discarded the resolver’s explanation that the requested member is not separately indexed. The shared page’s existing scope warnings still appeared; the specific citation-resolution warning was missing. Ordinary alternate-numbering notes, such as AN3.65/3.66, were affected by the same handler omission.

The handler now copies the resolver notes and provider notes into a new response array. Scripture, translator text, licences, source selection, source hashes, permissions and continuation arguments are unchanged. Cached provider results are not mutated. A continuation using the canonical group ID retains source warnings without inheriting an earlier member-specific alias note. Shared consent is still mandatory, and the shared page remains page-level with no individual alignment or whole-unit coverage claim.

## Verification

- Before/after reproduction and installed-package receipt: [metadata evidence](translation-resolution-notes.json). No English body is stored in the evidence.
- Two new actual MCP regressions check text/structured parity, resolver/provider notes, unchanged attribution, explicit consent before fetch, group identity and canonical continuation/cache isolation.
- Focused translation selection, partial and condensed-source set: 27/27 passed.
- Build and audit of all 8,544 canonical texts passed with zero failures.
- Extracted installed stdio package outside the checkout served the actual pinned local ATI shared page, with the note restored. Missing consent refused before fetch; canonical continuation did not repeat the member alias; one local fixture fetch, zero upstream requests.
- Independent review approved the narrow handler/test change. Data files are identical to D211. Exact-head CI provides the complete-suite verification for this separate change.

These are local snapshot and synthetic-provider regression checks, not live-source availability, human scholarly review or new source permission. Main and deployment remain separate.
