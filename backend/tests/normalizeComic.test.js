import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeComicForInsert } from '../src/utils/normalizeComic.js';

test('rating keeps only the integer part and accepts comma decimals', () => {
  assert.equal(normalizeComicForInsert({ rating: 4.7 }).rating, 4);
  assert.equal(normalizeComicForInsert({ rating: '3,9' }).rating, 3);
  assert.equal(normalizeComicForInsert({ rating: -2 }).rating, 0);
});

test('invalid or missing rating is left untouched', () => {
  assert.equal(normalizeComicForInsert({ rating: 'abc' }).rating, 'abc');
  assert.equal('rating' in normalizeComicForInsert({ title: 'x' }), false);
});

test('language is normalized for Spanish and English', () => {
  assert.equal(normalizeComicForInsert({ language: 'es' }).language, 'Español (España)');
  assert.equal(normalizeComicForInsert({ language: 'Español' }).language, 'Español (España)');
  assert.equal(normalizeComicForInsert({ language: 'Inglés' }).language, 'Inglés');
  assert.equal(normalizeComicForInsert({ language: 'English' }).language, 'Inglés');
  assert.equal(normalizeComicForInsert({ language: 'Français' }).language, 'Français');
});

test('does not mutate the input object', () => {
  const input = { rating: 4.5, language: 'es' };
  normalizeComicForInsert(input);
  assert.deepEqual(input, { rating: 4.5, language: 'es' });
});
