/** Loader for server/data/glossary.json.gz (scripts/dpd/build_glossary.py): DPD English index, phrases and sutta names. */
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

let cached = null;

/** { source, headwords: [[lemma, pos, meaning, ebt_count]], en: { key: [index] }, phrases: { key: [index] }, names: [[id, [names]]] } */
export function loadGlossary() {
  if (cached) return cached;
  const name = 'glossary.json.gz';
  const candidates = [join(here, 'data', name), join(here, '..', 'server', 'data', name), join(process.cwd(), 'server', 'data', name)];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error('Bundled glossary data (glossary.json.gz) is missing. Reinstall the extension.');
  cached = JSON.parse(gunzipSync(readFileSync(found)).toString('utf8'));
  return cached;
}
