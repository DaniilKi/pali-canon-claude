# ATI translation failover follow-up — 8 November 2026

Reported nightly run [42475222823](https://github.com/DaniilKi/pali-canon-claude/actions/runs/42475222823)
failed the ATI translation check with ATI and GitHub raw deliberately disabled.
Normal live smoke passed62 checks and its rotating DT sample passed250/250.
The existing120-character log prefix hid the actual later-mirror error. Full job
logs were inspected; the failure's underlying CDN error was not retained and
cannot be reconstructed. This does not prove a current general outage or dev
regression.

A current-dev probe based on92e76e2 plus the early-AN metadata additions used the
project's existing `english.translation` path with
`PALI_CANON_SIMULATE_OUTAGE=accesstoinsight.org,raw.githubusercontent.com`.
Node's cloud proxy was explicitly enabled with `NODE_USE_ENV_PROXY=1`.
AN3.65, exact `ati:/tipitaka/an/an03/an03.065.than`, succeeded through
**BCBS official repository (jsDelivr CDN)** and returned the requested first
12,000 characters. No extra hosts, bypass, fallback substitution, timeout change
or relaxed assertion was used. This is a successful current probe, not an
explanation or retroactive pass for the failed nightly run.

The outage script now preserves up to4,096 characters of each tool error rather
than120/140, labels truncation explicitly and strips terminal controls. A pure
regression uses the four-mirror-shaped error with the CDN error after character120,
and tests bounds/missing messages. Existing outage expectations and nightly
failure handling are unchanged. No scripture bodies or credentials enter the
fixture. A future failure can expose each mirror's actual bounded diagnostic.

Remaining: monitor the next nightly or exact-head source diagnostic run. A
recurrence with complete logs is needed to establish the earlier failure's cause.
