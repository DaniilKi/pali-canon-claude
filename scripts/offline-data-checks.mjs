// Dependency-free fixtures shared by installed npm checks and the isolated corpus audit.
// Every bundled dataset is reached without fetching linked translations or dictionary pages.
export const offlineDataChecks = [
  ['get_text', { uid: 'MN 10', limit: 1 }, (d) => d.text_id === 'mn10' && d.segments?.length > 0],
  ['get_metadata', { uid: 'AN 4.61' }, (d) => d.english?.some((entry) => entry.translation_id.startsWith('aj:'))],
  ['search_commentary', { query: 'dhamma', limit: 1 }, (d) => d.canonical === false && d.content_type === 'commentary' && d.results?.[0]?.read_with?.tool === 'get_commentary'],
  ['get_commentary', { uid: 'mn10/c66' }, (d) => d.available === true && d.returned === 1 && d.next_offset === null && d.segments?.[0]?.ref === 'mn10/c66' && /ariyavaṃsā[\s\S]*\(a\. ni\. 4\.28\)/.test(d.segments[0].text)],
  ['get_post_canonical', { citation: 'Vism 1.1', limit: 1 }, (d) => d.canonical === false && d.segments?.length > 0],
  ['analyse_passage', { uid: 'Dhp 183', limit: 4 }, (d) => d.words?.length > 0],
  ['glossary', { term: 'suffering' }, (d) => d.english_to_pali?.some((entry) => entry.pali === 'dukkha')],
  ['get_parallels', { uid: 'DN 22', limit: 50 }, (d) => d.links?.some((link) => link.text.id === 'mn10' && link.source === 'shared-passage')],
  ['dhamma_list', { name: 'five hindrances' }, (d) => d.count === 5 && d.defined_in?.[0]?.id === 'sn46.51'],
  ['topic', { name: 'emptiness' }, (d) => d.texts?.some((text) => text.id === 'mn121')],
  ['vinaya_rule', { rule: 'Pc 5' }, (d) => d.canonical_text?.id === 'pli-tv-bu-vb-pc5' && d.buddhist_monastic_code?.url?.endsWith('/Section0016.html#Pc5')],
  ['lookup_name', { name: 'Sāriputta', textLimit: 3 }, (d) => d.dictionary?.name === 'Dictionary of Pāli Proper Names' && d.appears_in?.total_texts_matched > 0],
];
