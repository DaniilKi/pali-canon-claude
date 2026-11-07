/**
 * search_texts with English-keyboard input (issue #102). Around canon.search():
 *  1. the query is normalised (Velthuis, Harvard-Kyoto, doubled vowels, anglicised spellings, aliases), labelled;
 *  2. an English query (english: 'auto' when it looks English, or 'only') is expanded into Pāli terms through the
 *     glossary (DPD's English index), labelled expanded_from_english; the original search still runs unless 'only';
 *  3. a Pāli query that finds few texts is retried with spelling variants of the words the canon does not have
 *     (aspirates, doubled consonants, ny/ñ, ṃ/n), labelled spelling_note.
 */
import * as canon from './canon.mjs';
import { hasSearchQuotes, assertSearchQuery, isSourcePhrase, searchInputNote } from './search-segments.mjs';
import { normalizeInput, normalizationNote, spellingVariants, canonSpellings } from './input.mjs';
import { looksEnglish, expandEnglish, paliWordsInEnglish } from './glossary.mjs';

/** Fewer texts than this triggers the spelling-variant retry. */
export const FEW_HITS = 3;
export const MAX_EXPANSION_TERMS = 8;

function plainWords(query) {
  return canon.fold(query.replace(/"[^"]*"/g, ' ')).split(/[^a-z0-9]+/).filter((w) => w.length > 1);
}

function variantSearch(query, base, opts) {
  if (hasSearchQuotes(query)) return null;
  const words = plainWords(query);
  if (!words.length || words.some((w) => /\d/.test(w))) return null;
  const groups = [];
  const changed = [];
  for (const w of words) {
    const variants = spellingVariants(w);
    if (!variants.length) { groups.push([w]); continue; }
    groups.push([w, ...variants]);
    changed.push({ word: w, also_searched: variants, canon_spellings: variants.flatMap((v) => canonSpellings(v, { max: 2 })).slice(0, 4) });
  }
  if (!changed.length) return null;
  const r = canon.search(query, { ...opts, groups });
  if (r.total_texts_matched <= base.total_texts_matched && r.total_title_matches <= base.total_title_matches) return null;
  const desc = changed.map((c) => `"${c.word}" (${c.canon_spellings.length ? c.canon_spellings.join(', ') : c.also_searched.join(', ')})`).join('; ');
  return {
    ...r, query: base.query,
    spelling_note: `No exact match for ${changed.map((c) => `"${c.word}"`).join(', ')}${base.total_texts_matched ? ` beyond ${base.total_texts_matched} text${base.total_texts_matched > 1 ? 's' : ''}` : ''}; also searched spellings the canon uses: ${desc}. Variants ignore aspirates (th/t), doubled consonants, ny/ñ and ṃ/n.`,
    spelling_variants: changed,
    exact_search: { total_texts_matched: base.total_texts_matched },
  };
}

/** search_texts' canon search with normalised input, English expansion and spelling variants. */
export function searchWithInput(query, { collection, limit = 10, offset = 0, english = 'auto' } = {}) {
  assertSearchQuery(query);
  const opts = { collection, limit, offset };
  if (isSourcePhrase(query)) {
    if (english === 'only') throw new Error('A quoted source phrase with unconverted characters cannot use English expansion. Choose english auto or off to search the phrase as entered.');
    return { ...canon.search(query, opts), ...searchInputNote({ source_phrase: true }) };
  }
  const n = normalizeInput(query);
  const note = normalizationNote(n);
  // A rewritten word does not stop an English question from being expanded when most of its words are left as typed.
  const wordCount = (query.match(/[A-Za-z]+/g) || []).length;
  const mostlyAsTyped = !n.changed || n.changes.length * 2 < wordCount;
  const isEnglish = english === 'only' || (english === 'auto' && mostlyAsTyped && looksEnglish(query));
  let result;
  if (english !== 'only') result = canon.search(n.text, opts);
  if (isEnglish) {
    const exp = expandEnglish(query, { maxTerms: MAX_EXPANSION_TERMS });
    if (!exp) {
      if (english === 'only') {
        result = { ...canon.search(n.text, { ...opts, limit: 0 }), limit, results: [], total_texts_matched: 0, next_offset: null,
          title_matches: [], total_title_matches: 0, title_next_offset: null };
        result.expanded_from_english = { found: false, note: 'No word of the query is in the glossary (DPD English index); nothing was expanded.' };
      }
    } else {
      let groups = exp.groups;
      let r = canon.search(query, { ...opts, groups });
      let combined = 'all';
      if (!r.total_texts_matched && groups.length > 1) {
        groups = [groups.flat()];
        r = canon.search(query, { ...opts, groups });
        combined = 'any';
      }
      const label = {
        ...exp.mapping,
        source: exp.sources.includes('DPD meaning (phrase)') ? 'DPD English index and DPD meanings' : 'DPD English index',
        searched_pali: groups.map((g) => g.join(' | ')),
        combined: combined === 'all' ? 'every English word or phrase must be matched by one of its Pāli terms' : 'no text has all of them together, so texts with any of these Pāli terms are listed',
        ...(exp.dropped ? { dropped_terms: exp.dropped, dropped_note: `${exp.dropped} further Pāli term${exp.dropped > 1 ? 's' : ''} from the glossary were not searched (at most ${MAX_EXPANSION_TERMS} in all, 4 per word).` } : {}),
        ...(exp.unmatched.length ? { not_in_glossary: exp.unmatched } : {}),
        ...(exp.kept_pali ? { searched_as_pali: exp.kept_pali } : {}),
        note: 'The English was looked up in the glossary and the Pāli text was searched for these terms. They are dictionary glosses, not translations; check each passage. Turn this off with english: "off".',
      };
      if (!result || !result.total_texts_matched) {
        // Choose a title stream by its total count, not whether this particular page is empty.
        const titleSource = result?.total_title_matches ? result : r;
        result = { ...r, query, title_matches: titleSource.title_matches,
          total_title_matches: titleSource.total_title_matches, title_next_offset: titleSource.title_next_offset,
          tip: undefined };
        if (english !== 'only') label.original_search = 'The words as typed were also searched: they are not in the Pāli text (title matches, if any, are kept).';
      } else {
        result = { ...result, english_expansion_results: { results: r.results, total_texts_matched: r.total_texts_matched, next_offset: r.next_offset } };
      }
      result.expanded_from_english = label;
    }
  } else if (!result.total_texts_matched && !hasSearchQuotes(n.text) && paliWordsInEnglish(n.text)) {
    // Pāli words in an English question ("How many jhanas are there"): search the Pāli words only, labelled.
    const pali = paliWordsInEnglish(n.text);
    const r = canon.search(pali.join(' '), opts);
    if (r.total_texts_matched) {
      result = { ...r, query, english_words_ignored: { searched_pali: pali, note: `The English words of the question were left out and only the Pāli word${pali.length > 1 ? 's' : ''} ${pali.map((w) => `"${w}"`).join(', ')} searched (an English plural s dropped).` } };
    }
  }
  if (!isEnglish && !result.english_words_ignored && result.total_texts_matched < FEW_HITS) {
    const v = variantSearch(n.text, result, opts);
    if (v) result = v;
  }
  if (note) result = { ...result, input_normalised: note };
  return result;
}
