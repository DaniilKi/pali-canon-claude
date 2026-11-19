/** Finite publisher section identities, never a caller-supplied fragment or selector. */
export const ATI_SECTION_PROFILE = 'ati-kelly-milinda-v1';
export const ATI_SECTION_COMMIT = '45fedca341497120651efa20e756b04a13e61089';
export const ATI_SECTION_LICENSE = 'Kelly-free-distribution-2005';
const page = '/tipitaka/kn/miln/miln.';
const rows = [
  ['mil3.1.8', '2x', 'miln-2-1-08', 9, 0],
  ['mil3.1.15', '2x', 'miln-2-1-14', 7, 0],
  ['mil3.3.8', '2x', 'miln-2-3-08', 11, 0],
  ['mil3.3.9', '2x', 'miln-2-3-9', 6, 0],
  ['mil3.3.10', '2x', 'miln-2-3-10', 5, 0],
  ['mil3.3.11', '2x', 'miln-2-3-11', 6, 0],
  ['mil3.3.12', '2x', 'miln-2-3-12', 5, 0],
  ['mil3.3.13', '2x', 'miln-2-3-13', 5, 0],
  ['mil3.3.14', '2x', 'miln-2-3-14', 5, 0],
  ['mil3.5.5', '3x', 'miln-3-5-05', 13, 2],
  ['mil3.5.6', '3x', 'miln-3-5-06', 3, 1],
  ['mil3.5.7', '3x', 'miln-3-5-07', 11, 0],
  ['mil3.7.5', '3x', 'miln-3-7-05', 21, 1],
  ['mil3.7.8', '3x', 'miln-3-7-08', 7, 0],
];
export const ATI_SECTION_PROFILES = Object.freeze(rows.map(([unit_id, part, anchor, paragraphs, notes]) => Object.freeze({
  unit_id, path: page + part + '.kell', anchor, paragraphs, notes,
  source_html_sha256: part === '2x' ? '44c59b3954ea8dd2b1966d5cd22f0836080b65fd351e474440a3b28dc1535dfd' : '5e0d563f4e3403167dbb73ec80190bdeb1592895d4af2e5141675692fec42fe5',
})));
export const isAtiSectionId = id => typeof id === 'string' && ATI_SECTION_PROFILES.some(row => id === `ati:${row.path}#${row.anchor}`);
export const isAtiSectionPath = path => ATI_SECTION_PROFILES.some(row => row.path === path);
