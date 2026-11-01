/**
 * Small in-memory LRU cache for live source responses (English translations, Access to Insight pages,
 * the Digital Pāḷi Dictionary). It only ever holds whole results exactly as the source served them,
 * together with their attribution and licence, for a few hours at most. Nothing is written to disk and
 * nothing outlives the process. SuttaCentral is never fetched, so it is never cached.
 *
 * Concurrent requests for the same key share one fetch. Failures are never cached.
 */
const num = (value, fallback) => (Number.isFinite(Number(value)) && String(value ?? '').trim() !== '' ? Number(value) : fallback);

export class LruCache {
  constructor({ maxBytes = 64 * 1024 * 1024, ttlMs = 6 * 60 * 60 * 1000, now = () => Date.now() } = {}) {
    this.maxBytes = maxBytes;
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map(); // key -> { value, bytes, expires }
    this.pending = new Map(); // key -> Promise
    this.bytes = 0;
    this.hits = 0;
    this.misses = 0;
  }

  get enabled() { return this.maxBytes > 0 && this.ttlMs > 0; }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) { this.delete(key); return undefined; }
    this.map.delete(key); // refresh recency
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (!this.enabled) return;
    const bytes = sizeOf(value);
    if (bytes > this.maxBytes / 4) return; // never let one huge page evict everything else
    this.delete(key);
    this.map.set(key, { value, bytes, expires: this.now() + this.ttlMs });
    this.bytes += bytes;
    for (const oldest of this.map.keys()) {
      if (this.bytes <= this.maxBytes) break;
      this.delete(oldest);
    }
  }

  delete(key) {
    const entry = this.map.get(key);
    if (!entry) return;
    this.bytes -= entry.bytes;
    this.map.delete(key);
  }

  clear() { this.map.clear(); this.pending.clear(); this.bytes = 0; this.hits = 0; this.misses = 0; }

  /** Return the cached value for `key`, or run `load()` once (even if called concurrently) and cache its result. */
  async wrap(key, load) {
    if (!this.enabled) return load();
    const cached = this.get(key);
    if (cached !== undefined) { this.hits += 1; return cached; }
    if (this.pending.has(key)) { this.hits += 1; return this.pending.get(key); }
    this.misses += 1;
    const promise = (async () => {
      try {
        const value = await load();
        this.set(key, value);
        return value;
      } finally { this.pending.delete(key); }
    })();
    this.pending.set(key, promise);
    return promise;
  }

  stats() {
    return { entries: this.map.size, bytes: this.bytes, max_bytes: this.maxBytes, ttl_seconds: Math.round(this.ttlMs / 1000), hits: this.hits, misses: this.misses };
  }
}

function sizeOf(value) {
  if (typeof value === 'string') return value.length * 2;
  try { return JSON.stringify(value).length * 2; } catch { return 1024; }
}

/**
 * Shared cache for live responses. Configure with PALI_CANON_CACHE_MB (default 64, 0 disables) and
 * PALI_CANON_CACHE_TTL_MINUTES (default 360). Disabled while an outage is being simulated so drills
 * always exercise the real fallback path.
 */
export const liveCache = new LruCache({
  maxBytes: process.env.PALI_CANON_SIMULATE_OUTAGE ? 0 : num(process.env.PALI_CANON_CACHE_MB, 64) * 1024 * 1024,
  ttlMs: num(process.env.PALI_CANON_CACHE_TTL_MINUTES, 360) * 60 * 1000,
});
