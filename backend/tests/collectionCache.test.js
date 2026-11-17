import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CollectionCache,
  comicsCache,
  setCacheDb,
  getDb,
  isDuplicateComic,
} from '../src/services/collectionCache.js';
import { createMockFirestore, MockTimestamp } from './helpers/mockFirestore.js';

let mock;
beforeEach(() => {
  mock = createMockFirestore({
    comics: {
      c1: { title: 'Batman', issueNumber: 1, createdAt: new MockTimestamp('2024-01-01') },
      c2: { title: 'Superman', issueNumber: 5 },
    },
  });
  setCacheDb(mock.db);
});

test('getDb returns the injected database', () => {
  assert.equal(getDb(), mock.db);
});

test('loads the collection only once', async () => {
  const cache = new CollectionCache('comics');
  await cache.all();
  await cache.all();
  await cache.get('c1');
  assert.equal(mock.stats.collectionGets.comics, 1);
  assert.equal(mock.stats.reads, 2);
});

test('concurrent first loads share a single Firestore query', async () => {
  const cache = new CollectionCache('comics');
  await Promise.all([cache.all(), cache.all(), cache.get('c2')]);
  assert.equal(mock.stats.collectionGets.comics, 1);
});

test('adds _id and converts Firestore Timestamps to Dates', async () => {
  const cache = new CollectionCache('comics');
  const c1 = await cache.get('c1');
  assert.equal(c1._id, 'c1');
  assert.ok(c1.createdAt instanceof Date);
  assert.equal(c1.createdAt.toISOString(), '2024-01-01T00:00:00.000Z');
});

test('get returns null for unknown ids', async () => {
  const cache = new CollectionCache('comics');
  assert.equal(await cache.get('nope'), null);
});

test('set, merge and remove update the cache in place', async () => {
  const cache = new CollectionCache('comics');
  await cache.all();

  cache.set('c3', { title: 'Hulk' });
  cache.merge('c1', { rating: 4 });
  cache.remove('c2');

  const all = await cache.all();
  assert.deepEqual(all.map((c) => c._id).sort(), ['c1', 'c3']);
  assert.equal((await cache.get('c1')).rating, 4);
  assert.equal((await cache.get('c1')).title, 'Batman');
  assert.equal(mock.stats.collectionGets.comics, 1);
});

test('writes made while the initial load is in flight are not lost', async () => {
  const cache = new CollectionCache('comics');
  const loading = cache.all();
  cache.set('c9', { title: 'Thor' });
  cache.remove('c2');
  await loading;
  const ids = (await cache.all()).map((c) => c._id).sort();
  assert.deepEqual(ids, ['c1', 'c9']);
});

test('writes before any load are ignored (next load reads fresh data)', async () => {
  const cache = new CollectionCache('comics');
  cache.set('ghost', { title: 'Ghost' });
  const ids = (await cache.all()).map((c) => c._id).sort();
  assert.deepEqual(ids, ['c1', 'c2']);
});

test('setCacheDb invalidates previously loaded caches', async () => {
  await comicsCache.all();
  const other = createMockFirestore({ comics: { x: { title: 'X' } } });
  setCacheDb(other.db);
  const ids = (await comicsCache.all()).map((c) => c._id);
  assert.deepEqual(ids, ['x']);
});

test('isDuplicateComic: same title (case-insensitive) and issue number', async () => {
  assert.equal(await isDuplicateComic('batman', 1), true);
  assert.equal(await isDuplicateComic('  BATMAN ', '1'), true);
  assert.equal(await isDuplicateComic('Batman', 2), false);
  assert.equal(await isDuplicateComic('Batman'), true, 'without issue number any same title is a duplicate');
  assert.equal(await isDuplicateComic('Flash', 1), false);
  assert.equal(await isDuplicateComic('', 1), false);
  assert.equal(await isDuplicateComic('Batman', 1, 'c1'), false, 'excludeId skips the comic itself');
});
