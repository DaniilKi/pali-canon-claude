// Public read-only providers. Fixed host allowlist, bounded responses, retries and mirror fallback.
const ALLOWED = [
  { host: 'accesstoinsight.org' }, { host: 'www.accesstoinsight.org' },
  { host: 'www.dhammatalks.org' }, { host: 'dhammatalks.org' },
  { host: 'www.dpdict.net' }, { host: 'dpdict.net' },
  { host: 'raw.githubusercontent.com', prefixes: ['/bcbsit/ati/', '/digitalpalireader/accesstoinsight/'] },
  { host: 'cdn.jsdelivr.net', prefixes: ['/gh/bcbsit/ati@'] },
  // Ānandajoti Bhikkhu's text-and-translation pages only (CC BY-SA); nothing else on the site is fetched.
  { host: 'ancient-buddhist-texts.net', prefixes: ['/Texts-and-Translations/'] },
];
/** Every host the server may contact (used by scripts/outage.mjs to simulate a total outage). */
export const ALLOWED_HOSTS = ALLOWED.map((r) => r.host);
const MAX_BYTES = 6 * 1024 * 1024;
const USER_AGENT = 'pali-canon-claude/2.0 (scripture study; read-only; https://github.com/DaniilKi/pali-canon-claude)';

function allowed(url) {
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const rule = ALLOWED.find((r) => r.host === url.hostname);
  if (!rule) return false;
  return !rule.prefixes || rule.prefixes.some((p) => url.pathname.startsWith(p));
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class HttpError extends Error {
  constructor(message, status, retryable) { super(message); this.status = status; this.retryable = retryable; }
}

// Test hook: PALI_CANON_SIMULATE_OUTAGE=accesstoinsight.org,www.dhammatalks.org makes those hosts fail like an outage.
const SIMULATED_OUTAGE = new Set(String(process.env.PALI_CANON_SIMULATE_OUTAGE || '').split(',').map((h) => h.trim()).filter(Boolean));

async function fetchOnce(url, { json, timeout }) {
  let target = new URL(url);
  if (SIMULATED_OUTAGE.has(target.hostname)) throw new HttpError(`${target.hostname} unreachable (simulated outage)`, 503, true);
  const signal = AbortSignal.timeout(timeout);
  for (let redirects = 0; redirects <= 4; redirects += 1) {
    if (!allowed(target)) throw new HttpError('Provider URL is outside the supported public sources.', 0, false);
    let response;
    try {
      response = await fetch(target, { redirect: 'manual', signal, headers: { 'User-Agent': USER_AGENT, Accept: json ? 'application/json' : 'text/html,text/plain' } });
    } catch (error) {
      throw new HttpError(`${target.hostname} unreachable (${error.cause?.code || error.name || 'network error'})`, 0, true);
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get('location');
      if (!location) throw new HttpError('Redirect without destination.', response.status, false);
      target = new URL(location, target);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      const retryable = response.status >= 500 || response.status === 429;
      throw new HttpError(`${target.hostname} returned HTTP ${response.status}`, response.status, retryable);
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      throw new HttpError('Response too large.', response.status, false);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) throw new HttpError('Response exceeded the 6 MB limit.', 200, false);
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const body = Buffer.concat(chunks).toString('utf8');
    if (!json) return body;
    try { return JSON.parse(body); } catch { throw new HttpError(`${target.hostname} returned invalid JSON.`, 200, true); }
  }
  throw new HttpError('Too many redirects.', 0, false);
}

/** Fetch with retries (network errors, 5xx, 429). */
export async function fetchPublic(url, { json = true, retries = 2, timeout = 20000 } = {}) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try { return await fetchOnce(url, { json, timeout }); } catch (error) {
      last = error;
      if (!error.retryable || attempt === retries) break;
      await wait(400 * 3 ** attempt);
    }
  }
  throw last;
}

/** Try mirrors in order; returns { body, url, mirror } from the first that answers. */
export async function fetchMirrors(urls, { json = false, timeout = 15000 } = {}) {
  const failures = [];
  for (const [index, url] of urls.entries()) {
    try {
      return { body: await fetchPublic(url, { json, retries: index === 0 ? 1 : 0, timeout }), url, mirror: index };
    } catch (error) {
      failures.push(`${new URL(url).hostname}: ${error.message}`);
      if (error.status === 404 && index === urls.length - 1) break;
    }
  }
  const error = new Error(`All sources failed — ${failures.join('; ')}`);
  error.failures = failures;
  throw error;
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bull: '•', copy: '©', middot: '·', ensp: ' ', emsp: ' ', thinsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Ntilde: 'Ñ',
};

export function decodeHtml(value) {
  return String(value ?? '').replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (whole, key) => {
    if (key.startsWith('#')) {
      const point = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[key] ?? whole;
  });
}

export function plainText(html) {
  return decodeHtml(String(html ?? '')
    .replace(/<!--[^]*?-->/g, '')
    .replace(/<(script|style|svg|nav|noscript)\b[^>]*>[^]*?<\/\1\s*>/gi, '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|dt|dd|blockquote|tr|section|article)>/gi, '\n')
    // Page/reference markers such as <span class="ref">Nya 1</span> are removed so they never fuse with text.
    .replace(/<(span|a|sup)\b[^>]*class=["'][^"']*\b(ref|pts|pagenum|pagebreak|anchor|seg)\b[^"']*["'][^>]*>[^<]*<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ''))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function shortText(value, limit = 1600) {
  const text = plainText(value);
  return text.length > limit ? `${text.slice(0, limit)}… [excerpt shortened]` : text;
}
