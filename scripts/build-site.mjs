// Prepares the documentation site source for GitHub Pages (built by .github/workflows/pages.yml with GitHub's Jekyll).
// No dependencies: it copies site/ (layout, config, CSS), docs/ and llms.txt into dist/site, and
//  - renames each README.md to index.md, so every folder has a home page;
//  - adds front matter (title from the first heading, the page's source path for "suggest a change");
//  - rewrites links that leave docs/ (README, AGENTS.md, THIRD_PARTY.md, code) to their GitHub pages;
//  - protects pages that contain Liquid-like text ({{ or {%) with {% raw %};
//  - writes the citation index export to export/ (skip with --no-export).
//
//   node scripts/build-site.mjs [--out dist/site] [--no-export]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = 'https://github.com/DaniilKi/pali-canon-claude';
const IMAGE = /\.(svg|png|jpe?g|gif|webp)$/i;

/** Where a relative link from a docs file points on the site (or on GitHub when it leaves docs/). */
export function rewriteTarget(target, fromRepoPath, exists = (p) => existsSync(join(root, p))) {
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/')) return target;
  const cut = target.search(/[?#]/);
  const path = cut >= 0 ? target.slice(0, cut) : target;
  const suffix = cut >= 0 ? target.slice(cut) : '';
  if (!path) return target;
  const resolved = posix.normalize(posix.join(posix.dirname(fromRepoPath), path));
  if (resolved === 'docs' || resolved.startsWith('docs/')) {
    return path.replace(/(^|\/)README\.md$/, '$1index.md') + suffix;
  }
  if (resolved.startsWith('..')) return target;
  const clean = resolved.replace(/\/$/, '');
  if (IMAGE.test(clean)) return `https://raw.githubusercontent.com/DaniilKi/pali-canon-claude/main/${clean}`;
  const isDir = path.endsWith('/') || (exists(clean) && statSync(join(root, clean)).isDirectory());
  return `${REPO}/${isDir ? 'tree' : 'blob'}/main/${clean}${suffix}`;
}

/** Rewrites inline and reference links in markdown, leaving fenced code blocks and inline code alone. */
export function rewriteLinks(markdown, fromRepoPath, exists) {
  let fenced = false;
  return markdown.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced) return line;
    const ref = line.match(/^(\s*\[[^\]]+\]:\s*)(\S+)(.*)$/);
    if (ref) return ref[1] + rewriteTarget(ref[2], fromRepoPath, exists) + ref[3];
    return line.split(/(`[^`]*`)/).map((part) => (part.startsWith('`') ? part
      : part.replace(/\]\(([^)\s]+)(\s+"[^"]*")?\)/g, (_, t, title = '') => `](${rewriteTarget(t, fromRepoPath, exists)}${title})`))).join('');
  }).join('\n');
}

export function titleOf(markdown, fallback) {
  const h = markdown.match(/^#\s+(.+?)\s*#*\s*$/m);
  const text = h ? h[1] : fallback;
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
}

/** One docs page as it goes on the site. */
export function sitePage(markdown, docsRelPath, exists) {
  if (/^---\r?\n/.test(markdown)) return markdown;
  const body = rewriteLinks(markdown, `docs/${docsRelPath}`, exists);
  const front = `---\ntitle: ${JSON.stringify(titleOf(markdown, docsRelPath))}\nsource_path: ${JSON.stringify(docsRelPath)}\n---\n`;
  return front + (/\{\{|\{%/.test(body) ? `{% raw %}\n${body}\n{% endraw %}\n` : body);
}

function walk(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [relative(base, p).split(sep).join('/')];
  });
}

export async function buildSite(out, { exportIndex = true } = {}) {
  const dist = resolve(root, 'dist');
  if (out.startsWith(dist + sep)) rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(resolve(root, 'site'), out, { recursive: true });
  const pages = [];
  for (const rel of walk(resolve(root, 'docs'))) {
    const src = resolve(root, 'docs', rel);
    const destRel = rel.replace(/(^|\/)README\.md$/, '$1index.md');
    const dest = join(out, destRel);
    mkdirSync(dirname(dest), { recursive: true });
    if (rel.endsWith('.md')) {
      writeFileSync(dest, sitePage(readFileSync(src, 'utf8'), rel));
      pages.push(destRel);
    } else cpSync(src, dest);
  }
  cpSync(resolve(root, 'llms.txt'), join(out, 'llms.txt'));
  if (exportIndex) {
    const { writeExport } = await import('./export-index.mjs');
    writeExport(join(out, 'export'));
  }
  return pages;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const flag = process.argv.indexOf('--out');
  const out = resolve(flag >= 0 ? process.argv[flag + 1] : resolve(root, 'dist', 'site'));
  const pages = await buildSite(out, { exportIndex: !process.argv.includes('--no-export') });
  console.log(`Prepared ${pages.length} pages, llms.txt${process.argv.includes('--no-export') ? '' : ' and export/'} in ${out}`);
}
