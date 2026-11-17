import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterAndSortComics, paginate, toMillis, includesText } from './comicFilters.js';

const comics = [
  {
    _id: '1', title: 'Batman', series: 'Batman', scriptwriter: ['Frank Miller'], artist: ['David Mazzucchelli'],
    readingStatus: 'completed', rating: 5, createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    _id: '2', title: 'Superman', series: 'Action Comics', author: 'Siegel',
    readingStatus: 'unread', rating: 3, createdAt: '2024-03-01T00:00:00.000Z',
  },
  {
    _id: '3', title: 'Aquaman', series: 'Aquaman', scriptwriter: ['Peter David'],
    readingStatus: 'reading', createdAt: { seconds: Date.parse('2024-02-01') / 1000 },
  },
];

const titles = (list) => list.map((c) => c.title);

test('toMillis handles ISO strings, Firestore timestamps and empty values', () => {
  assert.equal(toMillis('2024-01-01T00:00:00.000Z'), Date.parse('2024-01-01T00:00:00.000Z'));
  assert.equal(toMillis({ seconds: 10 }), 10000);
  assert.equal(toMillis({ _seconds: 10 }), 10000);
  assert.equal(toMillis(null), 0);
  assert.equal(toMillis('not a date'), 0);
});

test('includesText searches strings and arrays case-insensitively', () => {
  assert.equal(includesText('Frank Miller', 'miller'), true);
  assert.equal(includesText(['A', 'Frank Miller'], 'frank'), true);
  assert.equal(includesText(undefined, 'x'), false);
});

test('default sort is most recent first', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, {})), ['Superman', 'Aquaman', 'Batman']);
});

test('sorts by title and by rating', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, { sort: 'title' })), ['Aquaman', 'Batman', 'Superman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { sort: 'rating' })), ['Batman', 'Superman', 'Aquaman']);
});

test('filters by reading status', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, { status: 'reading' })), ['Aquaman']);
});

test('author filter matches author and every creator role', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, { author: 'miller' })), ['Batman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { author: 'mazzucchelli' })), ['Batman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { author: 'siegel' })), ['Superman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { author: 'david', sort: 'title' })), ['Aquaman', 'Batman']);
});

test('series filter is a partial, case-insensitive match', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, { series: 'action' })), ['Superman']);
});

test('free-text search looks at title, author and series', () => {
  assert.deepEqual(titles(filterAndSortComics(comics, { search: 'MAN', sort: 'title' })), ['Aquaman', 'Batman', 'Superman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { search: 'siegel' })), ['Superman']);
  assert.deepEqual(titles(filterAndSortComics(comics, { search: 'action comics' })), ['Superman']);
  assert.deepEqual(filterAndSortComics(comics, { search: 'zzz' }), []);
});

test('filters combine and do not mutate the input', () => {
  const copy = JSON.parse(JSON.stringify(comics));
  assert.deepEqual(titles(filterAndSortComics(comics, { search: 'man', status: 'unread' })), ['Superman']);
  assert.deepEqual(comics, copy);
});

test('paginate slices pages and reports navigation info', () => {
  const items = Array.from({ length: 120 }, (_, i) => i);
  const p1 = paginate(items, 1, 50);
  assert.equal(p1.items.length, 50);
  assert.equal(p1.totalPages, 3);
  assert.equal(p1.hasMore, true);

  const p3 = paginate(items, 3, 50);
  assert.deepEqual([p3.items[0], p3.items.length, p3.hasMore], [100, 20, false]);
});

test('paginate clamps out-of-range pages and handles empty lists', () => {
  const items = [1, 2, 3];
  assert.equal(paginate(items, 99, 2).currentPage, 2);
  assert.equal(paginate(items, 0, 2).currentPage, 1);
  assert.deepEqual(paginate([], 1, 50), { items: [], currentPage: 1, totalPages: 1, hasMore: false });
});
