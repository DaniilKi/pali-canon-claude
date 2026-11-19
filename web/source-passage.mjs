/* Source metadata marks headings; callers choose a level for their surrounding pane. */
export function createSourcePassage(doc, segment, headingLevel, className = 'passage') {
  if (![2, 3, 4, 5].includes(headingLevel)) throw new Error('Unsupported source heading level.');
  const node = doc.createElement(segment.type === 'heading' ? 'h' + headingLevel : 'p');
  node.textContent = segment.text;
  node.className = className;
  node.lang = 'pi';
  return node;
}
