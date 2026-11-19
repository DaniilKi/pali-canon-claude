/** Finite publisher section identities, never a caller-supplied fragment or selector. */
export const ATI_SECTION_PROFILE = 'ati-kelly-milinda-v1';
export const ATI_SECTION_COMMIT = '45fedca341497120651efa20e756b04a13e61089';
export const ATI_SECTION_LICENSE = 'Kelly-free-distribution-2005';
export const SN27_SECTION_PROFILE = 'ati-sn27-feelings-v1';
export const AN_MIND_SECTION_PROFILE = 'ati-an1-ekadhamma-numbered-paragraph-v1';
export const AN_MIND_SECTION_PATH = '/tipitaka/an/an01/an01.021-040.than';
export const AN_MIND_SHARED_LINK_SHA256 = '67e00d1d18e2f94eb11d297d6b79e719d144a3c19c961b114af9c192556078cb';
const anRows = [
  [21,2,'Paṭhamaṃ.'],[22,1,'Dutiyaṃ.'],[23,1,'Tatiyaṃ.'],[24,1,'Catutthaṃ.'],[25,1,'Pañcamaṃ.'],
  [26,1,'Chaṭṭhaṃ.'],[27,1,'Sattamaṃ.'],[28,1,'Aṭṭhamaṃ.'],[29,1,'Navamaṃ.'],[30,1,'Dasamaṃ.'],
  [31,2,'Paṭhamaṃ.'],[32,1,'Dutiyaṃ.'],[33,1,'Tatiyaṃ.'],[34,1,'Catutthaṃ.'],[35,1,'Pañcamaṃ.'],
  [36,1,'Chaṭṭhaṃ.'],[37,1,'Sattamaṃ.'],[38,1,'Aṭṭhamaṃ.'],[39,1,'Navamaṃ.'],[40,1,'Dasamaṃ.'],
];
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
export const ATI_SECTION_PROFILES = Object.freeze([...rows.map(([unit_id, part, anchor, paragraphs, notes]) => Object.freeze({
  unit_id, path: page + part + '.kell', anchor, paragraphs, notes,
  profile: ATI_SECTION_PROFILE, collection: 'mil', translator: 'John Kelly', license: ATI_SECTION_LICENSE,
  source_html_sha256: part === '2x' ? '44c59b3954ea8dd2b1966d5cd22f0836080b65fd351e474440a3b28dc1535dfd' : '5e0d563f4e3403167dbb73ec80190bdeb1592895d4af2e5141675692fec42fe5',
})), Object.freeze({
  unit_id: 'sn27.5', path: '/tipitaka/sn/sn27/sn27.001-010.than', anchor: 'sn27.005', paragraphs: 1, notes: 0,
  profile: SN27_SECTION_PROFILE, collection: 'sn', translator: 'Thanissaro Bhikkhu', license: 'CC-BY-NC',
  source_html_sha256: '4cda764c8a27a64faf96f6cd2ce0dc08808816ab80d329f3ad264b4516ee1e79',
  inline_paratext: 'Pañcamaṃ.',
}), ...anRows.map(([number, first_ref_number, inline_paratext]) => Object.freeze({
  unit_id: `an1.${number}`, path: AN_MIND_SECTION_PATH, anchor: `sutta-${number}`, paragraphs: 1, notes: 0,
  profile: AN_MIND_SECTION_PROFILE, collection: 'an', translator: 'Thanissaro Bhikkhu', license: 'CC-BY-NC',
  source_html_sha256: 'df8afc7457b8720a55f487f52fb47bff94371e52455cf3596daecc5fbbfa65a4',
  label: `${number}.`, first_ref_number, inline_paratext,
  root_heading: number === 21 ? '3. Akammaniyavaggo' : number === 31 ? '4. Adantavaggo' : null,
  tail_paratext: number === 30 ? 'Akammaniyavaggo tatiyo.' : number === 40 ? 'Adantavaggo catuttho.' : null,
}))]);
export const isAtiSectionId = id => typeof id === 'string' && ATI_SECTION_PROFILES.some(row => id === `ati:${row.path}#${row.anchor}`);
export const isAtiSectionPath = path => ATI_SECTION_PROFILES.some(row => row.path === path);
