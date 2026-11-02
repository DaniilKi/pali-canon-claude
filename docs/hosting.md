# Hosting the server on the web

Most people use Pali Canon for Claude as a small program that runs on their own computer. Some apps
cannot start programs, though: Claude on the web and on phones, ChatGPT, and Claude's connector
directory all need an **address on the internet** instead. This page explains how to run that web
version, for this project or for a temple, university or library that wants its own copy.

The web version is the same server with the same 26 tools (27 when the ChatGPT reading view is switched on with `CHATGPT_WIDGET=1`). It only reads; it cannot change anything.
It needs no login, because everything it serves is public scripture and openly licensed material.

## What it offers

| Address | What it is |
|---|---|
| `/mcp` | The connection point for AI apps (the "MCP endpoint", using the *Streamable HTTP* standard). |
| `/healthz` | A status check. Returns `"status": "ok"` and simple counts, for uptime monitors. |
| `/` | A one-line description. |

## Privacy

- **Nothing anyone asks is logged or stored.** The server never writes down request content, the
  passages or words looked up, IP addresses or browser details.
- It keeps only **running totals** in memory: how many requests, how many of each tool, how many were
  turned away by the rate limit. You can see them at `/healthz`. They reset when the server restarts.
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
| `PALI_CANON_CACHE_MB` | `64` | Memory for recently fetched translations and dictionary entries. `0` turns it off. |
| `PALI_CANON_CACHE_TTL_MINUTES` | `360` | How long a fetched page is kept (six hours). |
| `CHATGPT_WIDGET` | off | `1` adds the ChatGPT reading view: one extra read-only tool, `read_passage_widget`, and its page. `fly.toml` and `render.yaml` turn it on. See [listings/chatgpt.md](listings/chatgpt.md). |

The whole Pāli Canon is loaded at start-up so that reading and searching are fast, so the server needs
a fair amount of memory. Measured on 1 November 2026 (Windows 11, Node.js 26, `server/http.cjs`): about
290 MB right after start-up and about 345 MB at the peak of the 50-session load test below. Give it at
least 512 MB, as `fly.toml` does.

The optional `verify_quote` tool builds a Pāli word index the first time a Pāli quotation is checked, and
keeps it. This adds roughly 50 to 80 MB of resident memory for as long as the server runs, and during the
build (about 4 seconds) memory can briefly be 100 MB or more above that starting point. With the 64 MB
translation cache full as well, a server near the 345 MB load-test peak comes close to 512 MB on that first
check. If the host restarts for lack of memory, give it 768 MB or set a smaller `PALI_CANON_CACHE_MB`.
See [verify-quote.md](verify-quote.md#memory).

The bundled dictionary (`server/data/dpd.json.gz`, a subset of the Digital Pāḷi Dictionary) is loaded the
first time `analyse_passage` is called or `lookup_pali` has to answer offline because dpdict.net cannot be
reached, and it is then kept. Measured on 1 November 2026 (Windows 11, Node.js 26): about 0.9 s to load,
about 170 MB more JavaScript heap and about 280 MB more resident memory. On top of the 345 MB load-test
peak that is over 512 MB, so a host that offers `analyse_passage` should have 1 GB (or at least 768 MB with
a smaller `PALI_CANON_CACHE_MB`).

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

`fly.toml` keeps one machine (shared CPU, 512 MB) always running so the first request is fast.

## Deploy on Render

[Render](https://render.com) can build the same Dockerfile. The repository includes `render.yaml`.

1. Create a Render account and connect the GitHub repository.
2. New → Blueprint, choose the repository; Render reads `render.yaml`.
3. The address will be `https://<service>.onrender.com/mcp`. The health check uses `/healthz`.

Render's free plan sleeps when idle, so the first request after a pause can take up to a minute; the
`starter` plan in `render.yaml` stays awake.

## Uptime monitoring

Point any free uptime monitor (for example UptimeRobot or Better Stack) at `https://<your address>/healthz`
every five minutes. It returns HTTP 200 with `"status": "ok"` when the server is healthy.

## Load test

`node scripts/loadtest.mjs` starts the web server locally and runs **50 study sessions at the same time**.
Each session connects, lists the tools, resolves a citation, reads Pāli text, searches and browses.
Add `--live` to also fetch an English translation and a dictionary entry, or `--url https://…/mcp` to
test a deployed server (keep in mind its rate limit applies to you).

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
- `.github/workflows/docker.yml` builds the multi-arch image to `ghcr.io/daniilki/pali-canon-mcp` on `v*`
  tags and on demand, and smoke-tests it on pull requests. `.github/workflows/deploy.yml` deploys to
  Fly.io only when the `FLY_API_TOKEN` secret exists.
