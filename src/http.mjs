// Public read-only providers. No caller-controlled hosts, secrets, or persistent cache.
const ALLOWED_HOSTS = new Set(['suttacentral.net', 'www.accesstoinsight.org', 'accesstoinsight.org', 'www.dpdict.net', 'dpdict.net']);
const MAX_BYTES = 6 * 1024 * 1024;

export async function fetchPublic(url, { json = true } = {}) {
  let target = new URL(url);
  const signal = AbortSignal.timeout(25000);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname) || target.port || target.username || target.password) {
      throw new Error('Provider URL is outside the supported public sources.');
    }
    const response = await fetch(target, {
      redirect: 'manual', signal,
      headers: { 'User-Agent': 'pali-canon-claude/1.0 (personal scripture study; read-only)', Accept: json ? 'application/json' : 'text/html' },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (!response.headers.get('location')) throw new Error('Provider returned a redirect without a destination.');
      target = new URL(response.headers.get('location'), target);
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`${target.hostname} returned HTTP ${response.status}${response.status === 503 ? '; provider busy, retry later' : ''}.`);
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      await response.body?.cancel();
      throw new Error('Provider response is too large. Request a smaller collection or a specific text.');
    }
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) throw new Error('Provider response exceeded the 6 MB read limit. Request a specific text.');
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
    const body = Buffer.concat(chunks).toString('utf8');
    if (!json) return body;
    try { return JSON.parse(body); } catch { throw new Error(`${target.hostname} returned an invalid JSON response.`); }
  }
  throw new Error('Provider returned too many redirects.');
}

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  bull: '•', copy: '©', middot: '·', ensp: ' ', emsp: ' ', thinsp: ' ',
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
    .replace(/<[^>]*>/g, ''))
    .replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function shortText(value, limit = 1600) {
  const text = plainText(value);
  return text.length > limit ? `${text.slice(0, limit)}… [excerpt shortened]` : text;
}
