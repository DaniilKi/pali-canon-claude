# Source inverse V3 review

**GO_EXACT_V3_SOURCE_INVERSE_AND_LOADER_FOR_ROOT_BINDING.** Map `8109fc35…`, generation receipt `499810a1…`, and final loader `49d67232…` match the reviewed path plan `26676cf5…`.

All 36 existing rows match current source hashes. Their 60 inverse hunks each match once and restore the entire sealed C1 original byte-for-byte. The other 668 original source files are unchanged. Together these account for all 704 originals. Exactly 34 raw JSON row-value spans are byte-identical to old map `7440a63f…`; only the two reviewed Python helper rows changed.

The generation receipt binds 16 new source files. The seventeenth is the separately sealed loader, avoiding a self-hash cycle. The only two added paths are the reviewed operation-scope controls; the only changed earlier new-file hash is the reviewed six-boundary helper. The final loader is exactly the current loader with one old-map SHA replaced. Its ordered path list, code and strict guards remain byte-identical.

Independent static inverse replay also recovered all three exact 32f helper source hashes from the applied patch. All 45 original function AST proofs and two runtime bodies after their sole added rejection guard remain intact. The peer's finite scope semantics approval is preserved separately.

Root can copy these exact map/loader bytes and preserve the old map in history. Copied-byte binding and root-owned tests/CI remain separate. This source-only review ran no app, helper, tests, build, Git or network and changed no tracked file. It does not establish Windows performance, CI success, runtime/package changes, release or deployment approval.
