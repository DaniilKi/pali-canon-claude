# Actual contrast and prospective Windows cap1

The saved diagnostic console confirms four available/logical CPUs, nominal default file concurrency3, Node22.23.5 and Python3.12.10 over exact7b source plus one diagnostic workflow.

| Mode | Elapsed | Node result |
| --- | ---: | --- |
| Original held234 alone |24.539s|1/1 pass, zero skips|
| Original333/339/held234 at default concurrency |53.333s|2 pass,1 fail, zero skips|
| Same three files at concurrency1 |108.904s|3/3 pass, zero skips|

No outer deadline, signal or spawn error is reported. These are case-cohort times, not invented per-file timings. The raw artifact ZIP was not extracted because the parent's local retrieval failed. **The concurrent failing test and failure category remain unknown.** Neither120-second child can have reached its own deadline within a53-second cohort; that does not identify which test failed. Fixed run order, cache warmth and focused-versus-full workload differences remain confounders.

The results support preparing a **Windows-only default cap1 candidate**, without claiming a proven held234 concurrent timeout or a complete fix. Cap2 was not tested and still permits overlap.

The exact applied proposal is reviewed in `EXACT_RUNNER_CAP_AND_ENTRYPOINT_PROBES_GO.json`:

- Driver SHA`0693509f…`: only added comments and a Windows scheduling-option spread. Complete sorted discovery, one Node child, forwarded argument order, inherited stdio and existing exit expression remain exact.
- Probe SHA`0aee4ffd…`: executes the copied actual driver with real owned file discovery, an independent extra filename and ignored/nested inputs. A verified isolated child-process mock captures exactly one invocation; platform and status probes cover Windows/Linux/macOS and0/19/null/error-result paths.
- The parent's targeted probe run passed2/2 with zero skips. This reviewer read the receipt and did not rerun it.

Preserve all2011 original cases and count the2 new probe cases explicitly. In the matched normalCI environment the expected total is2013; existing optional-source skips must not grow through the scheduling change. Keep every30/120-second child limit and the30-minute full-test phase.

The remaining gates are the independent closed source plan/inverse/loader binding, an exact source commit and unchanged application/package binding, and the complete single-TAP suite on **Windows20 and22 at that exact commit**, plus other required checks. Focused diagnostic results do not replace these gates. No existing failed job was retried, no app/source words changed and no dev/main promotion, runtime or release approval is given here.
