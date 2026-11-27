# Required actual bindings for the nine-source installed CLI

These are new typed wrappers over actual evidence; do not edit or relabel sparse initial receipts. All descriptors are `{path: absolute physical regular file, sha256: exact SHA256}`. Every wrapper may include extra underlying evidence descriptors/commands/observations. Missing observations must stay pending rather than be inferred.

The component is `aebbf84d8e008a2eb5d1a3cf88e0934cf84dc524`. The package tree is `70556a886f8fc78a542f04052230aaeef0cf87ea`. They have deliberately different roles: all34 runtime bytes equal component aeb; all39 package members, including five docs, equal Git705. No all39-equals-aeb claim is permitted. Final later commits require a separate exact39 rebind before promotion.

`install_receipt` required fields:

```
schema: english9-actual-offline-install39-receipt-v1
status: PASS
installed: exact absolute physical package directory (.../node_modules/pali-canon-mcp)
archive_sha256: exact tarball SHA256
offline_npm_install: true
npm_scripts_executed: false
registry_downloads: 0
observed_http_fetches: 0
all39_archive_checkout_install_bytes_exact: true
members: {relative_member: {bytes: positive integer, sha256: SHA256}, ...exact39}
```

Zero observed HTTP must have actual observation/guard evidence, not merely absent log lines. Include the install command, exact successful process result and underlying log/receipt hashes. Initial `INITIAL_INSTALLED_PACKAGE39_BINDING.json` is useful underlying evidence but lacks these observations and does not establish Git705 equivalence by itself.

`Git_archive_installed_binding` required fields:

```
schema: english9-commit-archive-installed39-binding-v1
status: PASS
commit: 70556a886f8fc78a542f04052230aaeef0cf87ea
application_component_commit: aebbf84d8e008a2eb5d1a3cf88e0934cf84dc524
archive_sha256: same exact tarball SHA256
all39_commit_archive_installed_exact: true
members: same exact39 typed byte/hash records
```

Bind actual Git blobs, archive members and fresh installation. Runtime34 must independently equal the existing reviewed a9043c14 inventory. Reject omitted, extra, substituted or duplicate members and symlinks. Package docs are Git705 docs; other37 inputs match aeb only where independently established. The tarball itself is separately sealed in `archive`.

`source_widget_HTML` is the complete independently reconstructed v46 source HTML file, not an HTTP golden. `required_authorities.widget_source` is a new review wrapper:

```
schema: english9-independent-whole-widget-source-review-v1
status: PASS
application_component_commit: aebbf84d8e008a2eb5d1a3cf88e0934cf84dc524
widget_version: v46
html_sha256: SHA256 of source_widget_HTML
html_obtained_from_http: false
all_profile_objects_from_independent_approval: true
```

Include exact source/dependency/oracle hashes and method. The CLI itself fetches both actual installed resource URIs and requires whole-string equality. `INSTALLED_WIDGET368.json` independently proves its stated actual installed-widget scope; it does not replace this source reconstruction role.

`runtime_inventory` and `required_authorities.runtime` are already real source-scope receipts: a9043c14b7774d69d97e2327300cf437257cd71c12e3e39f8f5de68010941425 and38fbf6b7de3cb7f06f03e28a41bf03b6a5402940b6d8b2ebb09d142365f1160e. `source_schema` can bind PROFILE_SCHEMA_REVIEW547c1600…; it transports original source-only90918… approval. `preservation` must bind the actual359-object/26-data/no-held-activation preservation role; the existing runtime review contains those independently observed fields. `harness_static` will be the peer review of the final single CLI/contract closure. No source/runtime receipt is behavioral or release approval.

The original VRI/ap3 source-note focus acceptance is separate from English-note mutations here. Root must run the retained genuine source-note gate on this new installation/HTML and bind that actual receipt before promotion. This CLI reports that it does not exercise original VRI note focus; do not turn its90 translator-note/source-integrity controls into an ap3 claim.

The contract stays BLOCKED until the binding roles exist and a new immutable READY copy is reviewed. This is an APP/package component acceptance; final exact-Git/current-source/CI/dev-promotion reconciliation remains required.
