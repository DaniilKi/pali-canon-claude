import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyQuote, englishScope } from '../src/verify.mjs';

// Synthetic review text; these fixtures are not scripture or translations.
const quote = 'This synthetic review fixture carries several distinctive ordered tokens to check that separate translation sources remain independent';
const plan = englishScope(['MN 10']).pages;
const page = (text, id) => ({ text, translation_id: id, translator: 'Review fixture',
  url: 'https://accesstoinsight.org/fixture.html', attribution: 'Synthetic fixture', license: 'Fixture', notes: [] });

test('an exact quotation in a later source is not hidden by a preceding partial source', async () => {
  const result = await verifyQuote({ text: quote, language: 'english', texts: ['MN 10'] }, {
    fetchTranslation: async (_unit, id) => {
      const index = plan.findIndex((p) => p.translation_id === id);
      if (index > 1) throw new Error('Unused fixture source');
      return page(index === 0 ? quote.split(' ').slice(3).join(' ') : quote, id);
    },
  });
  assert.equal(result.verdict, 'found');
  assert.equal(result.best_similarity, 1);
  assert.equal(result.matches[0].translation_id, plan[1].translation_id);
  assert.equal(result.matches[0].matched_words, quote.toLowerCase());
});

test('source boundaries preserve actual fallback identity and skip empty sources', async () => {
  const actual = 'ati:/fixture/actual-later-source';
  const result = await verifyQuote({ text: quote, language: 'english', texts: ['MN 10'] }, {
    fetchTranslation: async (_unit, id) => {
      const index = plan.findIndex((p) => p.translation_id === id);
      return page(index === 0 ? '' : index === 1 ? quote.split(' ').slice(3).join(' ') : quote,
        index === 2 ? actual : id);
    },
  });
  assert.equal(result.best_similarity, 1);
  assert.equal(result.matches[0].translation_id, actual);
  assert.equal(result.matches[0].requested_translation_id, plan[2].translation_id);
});

test('fragments in independent sources cannot form one exact quotation', async () => {
  const split = Math.floor(quote.split(' ').length / 2);
  const words = quote.split(' ');
  const result = await verifyQuote({ text: quote, language: 'english', texts: ['MN 10'] }, {
    fetchTranslation: async (_unit, id) => {
      const index = plan.findIndex((p) => p.translation_id === id);
      if (index > 1) throw new Error('Unused fixture source');
      return page((index === 0 ? words.slice(0, split) : words.slice(split)).join(' '), id);
    },
  });
  assert.ok(result.best_similarity < 1);
  assert.notEqual(result.verdict, 'found');
});

test('a long quotation cannot be verified using only a matching 120-word prefix', async () => {
  const prefix = Array.from({ length: 120 }, (_, i) => `token${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`).join(' ');
  let fetched = 0;
  await assert.rejects(verifyQuote({ text: `${prefix} absenttail`, language: 'english', texts: ['MN 10'] }, {
    fetchTranslation: async (_unit, id) => { fetched += 1; return page(prefix, id); },
  }), /120 words|120-word/);
  assert.equal(fetched, 0, 'reject before fetching sources or issuing a partial verdict');
});

test('the word comparison limit also applies to explicit Pāli input', async () => {
  await assert.rejects(verifyQuote({ text: Array(121).fill('dhamma').join(' '), language: 'pali' }), /120 words|120-word/);
});

test('a quotation at the 120-word limit is compared in full', async () => {
  const text = Array.from({ length: 120 }, (_, i) => `token${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`).join(' ');
  const result = await verifyQuote({ text, language: 'english', texts: ['MN 10'] }, {
    fetchTranslation: async (_unit, id) => page(text, id),
  });
  assert.equal(result.verdict, 'found');
  assert.equal(result.best_similarity, 1);
  assert.equal(result.matches[0].matched_words, text);
});
