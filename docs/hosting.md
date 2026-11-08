# Hosting the server on the web

Most people use Pali Canon for Claude as a small program that runs on their own computer. Some apps
cannot start programs, though: Claude on the web and on phones, ChatGPT, and Claude's connector
directory all need an **address on the internet** instead. This page explains how to run that web
version, for this project or for a temple, university or library that wants its own copy.

The web version is the same server with the same 34 tools (35 when the ChatGPT reading view is switched on with `CHATGPT_WIDGET=1`). It only reads; it cannot change anything.
It needs no login, because everything it serves is public scripture and openly licensed material.

## What it offers

| Address | What it is |
|---|---|
| `/mcp` | The connection point for AI apps (the "MCP endpoint", using the *Streamable HTTP* standard). |
| `/healthz` | A status check. Returns `"status": "ok"` and simple counts, for uptime monitors. |
| `/` or `/reader` | The standalone Pāli Library reader: browsing, search, reading and browser-local bookmarks. See [web-reader guide](web-app.md). |
| `/reader.js`, `/reader.css` | First-party reader assets. |

## Privacy

- **Nothing anyone asks is logged or stored.** The server never writes down request content, the
  passages or words looked up, IP addresses or browser details.
- It keeps only **running totals** in memory: how many requests, how many of each tool, how many were
  turned away by the rate limit. You can see them at `/healthz`. They reset when the server restarts.
- Method/tool labels come from the MCP protocol and the configured tool list. Unrecognised names are
  grouped under `other`, so arbitrary request strings are not retained or published as health-counter keys,
  and those counter dictionaries stay bounded even when invalid requests keep arriving.
- To stop one visitor from overloading the server, it remembers each visitor's IP address **in memory
  for one minute** to count their requests (120 a minute by default). Nothing is written to disk.
- English translations and dictionary entries fetched from their websites are kept **in memory for up
  to six hours** so that many people reading the same sutta cause only one visit to the source website.
  They are kept exactly as served, with their translator, attribution and licence. SuttaCentral content
  is never fetched, so it is never kept.

## Licences: keep it free

The Pāli text (VRI), Ṭhānissaro Bhikkhu's translations (dhammatalks.org), Access to Insight and the
Digital Pāḷi Dictionary are all licensed for **non-commercial use only**. Anyone hosting this server
must offer it free of charge, with no paid tiers, adverts or sale of access. Every answer already
carries the attribution and licence of its source; do not remove them.

## Connect an AI app

Once the server is online at, say, `https://pali-canon-mcp.fly.dev`, the address to give apps is
`https://pali-canon-mcp.fly.dev/mcp`.

- **Claude (web, desktop or mobile):** Settings → Connectors → *Add custom connector*. Name it
  "Pali Canon" and paste the `/mcp` address. No sign-in is needed. Connectors added on the web also
  appear on your phone.
- **Other MCP apps:** choose "Streamable HTTP" (sometimes just "HTTP") and paste the same address.

## Run it with Docker

Docker runs a ready-made package of the server (an *image*) on any computer or server.

```sh
docker run -p 8080:8080 ghcr.io/daniilki/pali-canon-mcp
```

Then open <http://localhost:8080/healthz>. The connection point is <http://localhost:8080/mcp>.
The image works on ordinary PCs and servers (amd64) and on ARM machines such as Apple Silicon and
Raspberry Pi (arm64). A new image is published for every release.

To build it yourself from this repository: `docker build -t pali-canon-mcp .`

## Run it without Docker

All you need is Node.js 20 or newer. The server is already built into one file, so there is nothing
to install first. From the repository folder run:

```sh
node server/http.cjs
```

## Settings

All settings are optional environment variables.

| Setting | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | Port to listen on. |
| `HOST` | `0.0.0.0` | Network address to listen on. |
| `RATE_LIMIT_PER_MINUTE` | `120` | Requests each visitor may make per minute. `0` turns the limit off. |
| `TRUST_PROXY` | off | How many proxies sit in front of the server. Set to `1` on a hosting platform such as Fly.io or Render, so each visitor's real address (the one the platform adds last to `X-Forwarded-For`) is used for the rate limit. Addresses a visitor writes in that header themselves are ignored. Leave it off when the server faces the internet directly. |
| `PALI_CANON_CACHE_MB` | `64` | Live-response cache budget. Hosted core tools and reader calls share the worker's cache; `0` disables caching. |
| `PALI_CANON_CACHE_TTL_MINUTES` | `360` | How long a fetched page is kept (six hours). |
| `CHATGPT_WIDGET` | off | `1` adds the ChatGPT reading view: one extra read-only tool, `read_passage_widget`, and its page. `fly.toml` and `render.yaml` turn it on. See [listings/chatgpt.md](listings/chatgpt.md). |

The full offline study tools retain several datasets and indexes in one server process. The shipped
hosting templates now allocate **2 GB per instance** (`memory = "2gb"` on Fly; Render's
[`1c-2g` compute plan](https://render.com/docs/compute-plans), previously called `standard`).
This raises the configured resource tier; review the provider's current cost before deployment.
Changing the template does not resize or deploy an existing service.

On 7 November 2026, an isolated installed package at development commit `09b9523` was exercised with
Node 20.20.2 in `node:20-slim`, using actual HTTP MCP requests and no outbound network. A fresh
512 MiB Docker container completed initialization and a verse read, then its first `search_texts`
request crashed the server with **JavaScript heap out of memory**. Under a 2 GiB container limit,
the same sequential session completed reading, canonical search, word analysis, quotation verification,
commentary search, post-canonical search, parallels and glossary lookup. Server process high-water
RSS reached about **1,132 MiB**. A separate unrestricted Linux/Node 24 run reached about 1,235 MiB.
These measurements supersede the earlier 512 MB recommendation based on a narrower reading load test.

This is a representative working budget, not an upper bound: concurrent requests, cold index builds,
platform differences and a full live-response cache can require more. Monitor the deployed instance
and repeat realistic load tests before choosing its concurrency limit or reducing memory. Disabling
the 64 MB live cache does not remove the bundled study datasets. Do not shrink V8's heap merely to
fit a small instance; that can make an otherwise valid tool request abort the process.

To reproduce the process measurements on Linux after building (or point `--server-dir` at an extracted
npm package):

```sh
node scripts/profile-memory.mjs --server-dir server --budget-mb 2048 --report memory.json
```

The profiler starts a temporary isolated HTTP server, follows a fixed study sequence, records Linux
`/proc` resident/high-water memory after each operation, blocks outbound requests, and cleans up the
server. It exits nonzero if a tool fails or the measured peak exceeds the supplied MiB budget. It does
not impose an operating-system memory limit itself. The **Hosted memory budget** CI job runs it inside
a Docker container constrained to the Fly template's memory allocation, with swap and external
networking disabled, and uploads the report. This does not establish actual-host or signed-in-client
acceptance. See [verify-quote.md](verify-quote.md#memory) for the quotation index alone.

## Deploy on Fly.io

[Fly.io](https://fly.io) runs Docker images close to users. The repository includes `fly.toml`.

1. Create a Fly.io account and install `flyctl` ([guide](https://fly.io/docs/flyctl/install/)).
2. `fly auth login`, then `fly apps create pali-canon-mcp` (choose another name if it is taken, and
   change `app` in `fly.toml` to match).
3. `fly deploy`. The address will be `https://<app>.fly.dev/mcp`.
4. Automatic deploys: create a deploy token with `fly tokens create deploy`, and add it to the GitHub
   repository as a secret named `FLY_API_TOKEN` (Settings → Secrets and variables → Actions). From then
   on, every release tag (`v*`) deploys automatically, and the *Deploy to Fly.io* workflow can be run by
   hand. Without the secret the workflow does nothing.

`fly.toml` keeps one Machine with one performance vCPU and 2 GB RAM always running. This is a proposed
resource tier for deployment review; no existing Machine was changed. Review the current provider
price before applying it.

The sustained one-CPU Docker budget is not equivalent to `shared-cpu-1x`. Fly's
[CPU performance reference](https://docs.fly.io/machines/cpu-performance) describes shared vCPUs as a
small baseline quota with accumulated burst credits; performance vCPUs receive a full baseline CPU
quota. Credit depletion can therefore invalidate a cold-index timing measured under a continuous
one-CPU cap. The template uses `cpu_kind = "performance"`, `cpus = 1` to match that assumption rather
than relying on credits. This still does not reproduce Fly hardware, neighbours or routing, and a
cheaper shared profile needs its own cold-start and depleted-credit acceptance tests.

A local conservative approximation using a 5 ms quota per 80 ms period with no initial burst missed
the audit's 30-second HTTP readiness deadline. It included the test driver in the same quota and did
not emulate Fly's credit system. It is evidence against transferring the sustained-CPU result to a
shared tier, not a claim that shared Machines can never serve this application.

The template now measures concurrent **requests**, with a soft routing threshold of **16** and a hard
threshold of **48**. The application admits at most 24 outstanding tool calls, including reader calls. The old
100-request soft threshold was above that bound; the new value is intended to prefer spare Machines
before the core queue fills. The higher hard threshold leaves room for metadata, reader and retry
responses; it is not a promise of 48 simultaneous heavy reads. Fly documents how these thresholds
[deprioritize or exclude a Machine from routing](https://docs.fly.io/reference/load-balancing).

This only helps when other capacity exists. Fly's [autostop/autostart](https://docs.fly.io/launch/autostop-autostart)
starts and stops already-created Machines; it does not create additional instances. A one-Machine
deployment can still return busy responses. Provisioning, costs, actual multi-Machine routing and
host-specific load testing require a separate deployment review. No Machines were created or scaled
by this development change.

## Deploy on Render

[Render](https://render.com) can build the same Dockerfile. The repository includes `render.yaml`.

1. Create a Render account and connect the GitHub repository.
2. New → Blueprint, choose the repository; Render reads `render.yaml`.
3. The address will be `https://<service>.onrender.com/mcp`. The health check uses `/healthz`.

Render's free plan sleeps when idle, so the first request after a pause can take up to a minute; the
`1c-2g` plan in `render.yaml` stays awake and supplies 2 GB RAM. The former 512 MB `starter`
configuration was insufficient for the reproduced full-study session.

## Uptime monitoring

The installed HTTP entry keeps core tools and reader execution in one shared worker thread. CPU-heavy searches
share that worker and its datasets; `/healthz`, HTTP transport, resources, prompts and widget
registration stay on the HTTP thread. This does not add CPU capacity. Ship **all three runtime bundles**
(`index.cjs`, `http.cjs`, `http-worker.cjs`) with `server/data`; copying only `http.cjs` is insufficient.
The npm package and Dockerfile include the complete directory. Stdio remains in one thread.

Health reports the worker's bounded state and pending count, plus the cache snapshot from its last
completed tool call; `frontend_cache` remains for diagnostics but reader requests no longer populate it.
The reader uses the same corpus objects, search state and live cache as the core tools, avoiding a
second copy of the large post-canonical/commentary datasets in the HTTP loop. Widget resources and
advertised metadata stay available on the HTTP thread; a reading request still needs healthy worker
capacity. A crashed or unresponsive worker makes health return HTTP 503. At most 24
tool calls may be outstanding; additional calls return an explicit queue-full tool error for retry.
A 180-second dispatch deadline includes queueing and provider waits. If any admitted call exceeds it,
the watchdog rejects outstanding calls and stops the worker; the process must restart before tool
execution can resume. This can reject a very slow provider batch too. No request is automatically replayed. A successful liveness
probe does not promise that a slow tool has completed.

Point any free uptime monitor (for example UptimeRobot or Better Stack) at `https://<your address>/healthz`
every five minutes. It returns HTTP 200 with `"status": "ok"` when the server is healthy.

### Recovering from hosted tool errors

Capacity and worker failures preserve their existing human-readable `error` text and now return the
same JSON in the text response and `structuredContent`:

| Code | Meaning | Action |
|---|---|---|
| `HOSTED_TOOL_BUSY` | The bounded core queue is full | `retryable: true`, `retry_after_seconds: 5`: wait, then retry the **same read arguments** with a smaller batch if needed |
| `HOSTED_TOOL_UNAVAILABLE` / `HOSTED_TOOL_CLOSED` | The worker cannot serve more reads | `retryable: false`, `requires_restart: true`: the operator must restore the service before the read is retried |
| `HOSTED_TOOL_DISPATCH_FAILED` / `HOSTED_TOOL_EXECUTION_FAILED` | An internal execution step failed | Report it to the operator; automatic retry is not advised |

The five-second value is a minimum backoff hint, not a reserved slot or availability guarantee. Clients
must bound and space retries; the server never automatically replays a read. These errors no longer
suggest resolving a different citation. Actual citation/provider errors retain their existing
contracts, including source-unavailable versus not-found distinctions. Only trusted internal error
types can produce these infrastructure instructions; a matching code on an ordinary error cannot.
The separate HTTP per-IP 429 response still has its own `Retry-After` header.

## Load test

`node scripts/loadtest.mjs` starts the web server locally and runs **50 study sessions at the same time**.
Each session connects, lists the tools, resolves a citation, reads Pāli text, searches and browses.
Add `--live` to also fetch an English translation and a dictionary entry, or `--url https://…/mcp` to
test a deployed server (keep in mind its rate limit applies to you).

For mixed offline study operations with independent five-second health probes, run:

```sh
node scripts/audit-hosted-load.mjs --server-dir server --clients 16 --rounds 3 --report concurrency.json
node scripts/smoke.mjs --http
```

The hosted CI job runs the mixed test inside **one CPU and 2 GiB**, without swap or external network.
The original 48-call sample completed every tool call but missed 15 of 19 health deadlines; warm
rounds took about 18–22 seconds. With isolated execution and a bounded 64 MiB commentary index cache
(the shipped folded corpus needs about 59 MB), the same sample completed all 48 calls and 365 health
probes without a failure: maximum health latency was 365 ms and warm rounds took 3.1 and 0.9 seconds.
Process high-water RSS was about 1.3 GiB. These are local Node 20 container measurements, not an
actual-provider SLA, proof of 64 simultaneous heavy calls, full-cache or signed-in-client acceptance.

The compute worker now requests a **1,408 MiB old-generation JavaScript heap** inside the same
**2 GiB container limit**. A diagnostic Node 20 full-study run observed an automatic heap limit of
1,098,907,648 bytes and a worker exit with `ERR_WORKER_OUT_OF_MEMORY`, even though the server process
and its health endpoint could remain alive. The larger explicit worker heap addresses that internal
limit; it does not allocate extra infrastructure or replace the outer memory cap.
[Node's worker resource-limit documentation](https://nodejs.org/docs/latest-v20.x/api/worker_threads.html#new-workerfilename-options)
distinguishes JavaScript heap limits from buffers and process-wide memory, and notes that
`--max-old-space-size` overrides this worker setting. The fixed-budget audits must still pass; custom
V8 flags or larger workloads require their own acceptance checks.

### Capacity with populated caches

The capacity audit fills the shared live-response cache through both public reading tools, using
sixteen distinct linked URLs served by a local synthetic fetch fixture. Each page explicitly says
it is a cache-pressure fixture, not scripture. The final fixture size leaves the 64 MiB cache at
**99.8% of its accounted byte budget**, with no real provider requests. The audit asserts that the
frontend cache stays empty; reading and translation calls reuse the worker cache. It remains populated
through the subsequent workload. Optional `--reader-caches` also opens one source-faithful widget page
from all 109 post-canonical books, 61 root files and 47 commentary books before mixed tool requests.

```sh
node scripts/audit-hosted-load.mjs --clients 24 --rounds 3 --full-cache --reader-caches --reader-ui --report capacity.json
# Deliberate overload: queue-full rejections remain visible and are accepted only with this flag.
node scripts/audit-hosted-load.mjs --clients 100 --rounds 3 --full-cache --allow-overload --report overload.json
```

Before moving the reader into the worker, Linux/Node 20.20.2 measurements under one CPU and 2 GiB,
without swap or external network, showed:

| Workload | Result |
|---|---|
| 32 clients, both caches at 99.8%, all reader datasets warmed by one page from every book, 96 mixed calls | All 96 completed with the 32-call queue; all 643 health probes passed; peak RSS about 1.73 GiB |
| 100 clients, same warmed-reader/full-cache setup, previous 64-call queue | 162 completed, 102 queue-full replies and **36 client timeouts**; healthy probes alone hid this capacity failure |
| 100 clients, same setup, 32-call queue for core tools only | 126 completed and 174 explicit queue-full retry responses; **zero other failures**; all 677 health probes passed; queue drained and exact MN 10 recovery read succeeded; peak RSS about 1.82 GiB |

The queue was reduced from 64 to 32 outstanding core calls after that reproduced failure. Reader
calls now also share that bound; they cannot bypass admission or load duplicate study corpora. This
chooses more early retry responses instead of admitting work that exceeds ordinary client deadlines;
it adds no CPU capacity. Health remained responsive in both cases, so it must be evaluated alongside
actual tool completion and retry counts.

After sharing reader execution with the worker, the same 100-client/300-call recipe at the same
one-CPU/2 GiB limits used **1.41 GiB peak server RSS**, compared with **1.78 GiB** immediately before
the change (about 21% lower). The cache remained 99.8% full, the duplicate frontend cache stayed empty,
and all 217 source books were visited. There were 97 successful reads and 203 explicit busy replies,
with zero other failures and all 674 probes healthy. Previously 136 reads completed and 164 were busy:
reader calls now also consume the 32-call bound, so these counts do not demonstrate higher throughput.
The strict 32-client case completed all 96 reads without rejection, with 686 healthy probes and
1.36 GiB peak RSS. Both samples drained the queue and completed an exact recovery read.

The cold maximum stayed about **54 seconds** (54,325 ms before and 54,135 ms after), so this change
does **not** resolve cold-search latency. Warm-round maxima in the overload sample were 6.3 and 5.7
seconds. An isolated source-level CPU profile found first full scans spent time normalizing text,
creating indexes and collecting garbage; retained indexes make repeated queries faster. These are
local samples, not a latency distribution or reserved CPU. Further cold-index work and real-host
acceptance remain open.

Sharing admission also means reader calls can wait behind cold searches. Reader v17 permits a
bounded **90-second navigation wait**, covering the reproduced 54–55-second cold reads that exceeded
the previous 30-second UI timer. It shows the wait budget and provides a keyboard-accessible **Stop
waiting** control. Cancellation or timeout clears the old passage and requests cleared reading context, and a late
success/failure cannot replace a newer reading. Host rejection, transport failure or explicit busy
replies still end the wait immediately; a host may impose its own shorter deadline.

Stop waiting ends the UI wait, not the server's running read: it does not claim a host cancellation
API or interrupt a synchronous scan. The worker retains a bounded 24-call admission limit and 180-second
watchdog, and the UI never replays automatically. The installed mixed-load audit can pass measured
tool durations through both bridge implementations using deterministic clocks (`--reader-ui`),
including a same-HTML 30-second timer control. Chromium separately verifies the 55/90-second timer
boundaries, keyboard cancellation and stale replies with browser clock control. These checks fix a
UI deadline mismatch, not cold-search speed, actual-host latency or support for long calls in every
client. Explicit busy replies and healthy probes do not establish interactive-host acceptance.

UI replay runs after the measured burst, so simulated client rendering is not charged to the server's
one-CPU budget. An earlier instrumentation-heavy overload sample ran it during the burst and hit 28
ordinary 60-second MCP client timeouts; that failed run is retained separately. The audit preserves
normal client timeouts and reports unexpected failures rather than extending them to obtain a pass.
Deferred replay still exposed eight client timeouts, and a separate server-only probe confirmed the
worker heap exhaustion described above. The final admission bound is 24, with explicit busy responses
for excess work; the proposed Fly hard routing limit is 48. A healthy probe alone is insufficient.

For a prestarted **local** resource-isolated server, the audit also accepts `--connect-url` (HTTP
127.0.0.1 only), `--server-pid` and `--server-log`. This keeps client CPU outside the server budget while
measuring the actual server PID and checking its outbound guard log. It does not create or expose a
production service. Record the independently enforced container limits and stop the owned server
after testing; the audit deliberately does not terminate an externally supplied process.

With the explicit worker heap and 24-call admission, a fresh server-only one-CPU/2 GiB test completed
76 of 300 calls and returned 224 controlled busy responses, with **zero unexpected tool or health
failures**. All 424 health probes passed, the queue drained and the exact recovery read succeeded.
Maximum cold tool time was **33.0 seconds**, warm maxima 3.6 and 2.4 seconds, and peak server RSS
**1.59 GiB**. Reader replies at 33 seconds still fail the former UI timer, while v17 displays them.
This removes the reproduced automatic-heap failure in that sample, not every possible workload or
host deadline. The combined client/server container scenarios remain separately reported because
their CPU and memory budgets include the test driver too.

The final CI-style combined-container, full-cache 24-client case completed all 72 calls with no
rejections, 474 healthy probes (323 ms maximum), 33.1 seconds maximum tool time and 1.54 GiB peak
server RSS. A separate fresh-process case without live-cache/reader-book prepopulation completed
all 72 calls with 323 healthy probes and no rejections. Both use the same one-CPU/2 GiB limit,
unchanged 60-second MCP client deadline and deterministic post-burst UI replay.

These are instance burst measurements with the **per-IP rate limiter disabled**. The deployed default
of 120 requests/minute/IP still applies, including initialization and metadata requests. Cold rounds
took roughly 48–57 seconds in the populated-cache samples, close to many MCP clients' 60-second
deadline. Use small batches, handle explicit queue-full responses with a later retry, and measure the
actual host before increasing traffic. Fly's HTTP concurrency settings are routing limits, not a
promise that 100 or 200 simultaneous heavy tools will complete without rejection.

The hosted CI job repeats the 24-client populated-cache/warmed-reader scenario and requires no
rejections, successful recovery reading and healthy probes during cache population as well as the
burst. A deliberate overload run reports `passed_with_overload`, never an unconditional pass. This
still does not establish an upper bound for other queries, larger responses, more simultaneous calls,
real provider behavior, native-reader review or signed-in-client acceptance. Admission bounds do not guarantee those latencies for arbitrary queries or hosts.

Result on a Windows 11 laptop (1 November 2026), 50 concurrent sessions, no errors:

| Operation | p50 | p95 |
|---|---|---|
| connect | 148 ms | 168 ms |
| resolve a citation | 61 ms | 70 ms |
| read Pāli text | 70 ms | 1.7 s |
| full-text search | 1.2 s | 1.8 s |
| English translation (live, with `--live`) | 1.2 s | 1.3 s |
| dictionary (live, with `--live`) | 0.6 s | 0.6 s |
| all requests (300; 400 with `--live`) | 0.13 s | 1.7 s |

With `--live`, the 50 identical translation requests caused a single visit to dhammatalks.org, thanks to
the in-memory cache.

## For developers

- `src/server.mjs` registers every tool, prompt and resource (`createServer()`); `src/index.mjs` connects
  it to stdio and `src/http-server.mjs` to Streamable HTTP. The HTTP server is **stateless**: every POST
  gets a fresh server and transport, so any number of machines can run behind a load balancer. `GET` and
  `DELETE` on `/mcp` return 405 (there are no sessions or server-sent event streams).
- `npm run build` bundles both `server/index.cjs` (stdio) and `server/http.cjs` (HTTP).
- CORS allows any origin (`*`) with the MCP headers, since the server is public, read-only and uses no cookies.
- Request bodies are limited to 1 MB.
- HTTP keep-alive connections have a 65-second idle window and a 66-second header deadline. This
  avoids reaping a pooled connection during the several-second event-loop pause of a first-use index
  load. These are connection/header settings, not the tool execution timeout. See the
  [Node HTTP timeout documentation](https://nodejs.org/api/http.html#serverkeepalivetimeout).
- `.github/workflows/docker.yml` builds the multi-arch image to `ghcr.io/daniilki/pali-canon-mcp` on `v*`
  tags and on demand, and smoke-tests it on pull requests. `.github/workflows/deploy.yml` deploys to
  Fly.io only when the `FLY_API_TOKEN` secret exists.
