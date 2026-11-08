/* Print only the retrieved Pāli page. Never copy notes, controls, or study panes. */
export function installPagePrinting(doc = document, win = window) {
  const view = doc.getElementById('view');
  const sheet = doc.createElement('article');
  sheet.id = 'print-document';
  sheet.setAttribute('aria-hidden', 'true');
  doc.body.append(sheet);
  const add = (parent, tag, text, className) => {
    const node = doc.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  };
  const routes = new WeakMap();
  const reading = () => win.location.hash.startsWith('#read?') && view.querySelector('section[aria-label="Pāli passage"]');
  function prepare() {
    sheet.replaceChildren();
    const passage = reading();
    const attribution = view.querySelector(':scope > .provenance');
    if (!passage || routes.get(passage) !== win.location.hash || !passage.querySelector('.segment .passage') || !attribution) {
      add(sheet, 'h1', 'No Pāli page ready to print');
      add(sheet, 'p', 'Open a Pāli passage and wait for its source attribution before printing. Personal notes and other screens are not printed.');
      return false;
    }
    add(sheet, 'p', view.querySelector(':scope > .eyebrow')?.textContent || 'Pāli Library');
    add(sheet, 'h1', view.querySelector(':scope > h2')?.textContent || 'Pāli passage');
    add(sheet, 'p', 'Loaded Pāli page only — not necessarily the complete work. English, study material, bookmarks and personal notes are excluded.', 'print-scope');
    const range = [...view.querySelectorAll(':scope > p.muted')].find(node => node.textContent.startsWith('Segments '));
    if (range) add(sheet, 'p', range.textContent, 'print-scope');
    for (const notice of view.querySelectorAll(':scope > .notice')) add(sheet, 'p', notice.textContent, 'print-scope');
    for (const segment of passage.querySelectorAll(':scope > .segment')) {
      const block = add(sheet, 'section', '', 'print-segment');
      add(block, 'p', segment.querySelector('.segment-label span')?.textContent || '', 'print-reference');
      const text = add(block, 'p', segment.querySelector('.passage')?.textContent || '', 'print-passage');
      text.lang = 'pi';
    }
    const source = add(sheet, 'section', '', 'print-provenance');
    add(source, 'h2', 'Source and terms');
    // Include licence URLs and expanded source revisions without copying live HTML.
    for (const part of attribution.children) add(source, 'p', part.textContent);
    for (const anchor of attribution.querySelectorAll('a[href]')) add(source, 'p', anchor.textContent + ': ' + anchor.href);
    const url = new URL(win.location.href);
    url.search = ''; // Hosting query parameters are not part of the reading citation.
    add(source, 'p', 'Reading page: ' + url.href);
    return true;
  }
  function update() {
    const passage = reading();
    if (passage && !routes.has(passage)) routes.set(passage, win.location.hash);
    const toolbar = view.querySelector(':scope > .toolbar');
    if (!passage || !toolbar || toolbar.querySelector('[data-print-page]')) return;
    const target = toolbar.querySelector('.study-actions > .toolbar') || toolbar;
    const control = add(target, 'button', 'Print loaded Pāli page');
    control.type = 'button'; control.dataset.printPage = '';
    control.addEventListener('click', () => { if (prepare()) win.print(); });
  }
  new win.MutationObserver(update).observe(view, { childList: true, subtree: true });
  win.addEventListener('beforeprint', prepare);
  win.addEventListener('afterprint', () => sheet.replaceChildren());
  // Erase an old snapshot even if the browser never emits afterprint.
  win.addEventListener('hashchange', () => sheet.replaceChildren());
  update();
}
