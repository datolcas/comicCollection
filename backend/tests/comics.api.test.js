import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import { MockTimestamp } from './helpers/mockFirestore.js';

const seed = () => ({
  comics: {
    c1: {
      title: 'Batman', issueNumber: 1, author: 'Bob', series: 'Batman', genre: ['Action'],
      readingStatus: 'completed', rating: 5, createdAt: new MockTimestamp('2024-01-01'),
    },
    c2: {
      title: 'Superman', issueNumber: 2, author: 'Clark', series: 'Superman', genre: ['Action', 'Sci-Fi'],
      readingStatus: 'unread', rating: 3, createdAt: new MockTimestamp('2024-03-01'),
    },
    c3: {
      title: 'Aquaman', issueNumber: 3, author: 'Bob', series: 'Aquaman', genre: ['Fantasy'],
      readingStatus: 'reading', createdAt: new MockTimestamp('2024-02-01'),
    },
    sold1: {
      title: 'Vendido', issueNumber: 1, sold: true, createdAt: new MockTimestamp('2024-04-01'),
    },
  },
});

let api;
beforeEach(async () => {
  api = await startTestServer(seed());
});
afterEach(async () => {
  await api.close();
});

const titles = (list) => list.map((c) => c.title);

test('GET /comics lists non-sold comics sorted by most recent', async () => {
  const res = await api.get('/comics');
  assert.equal(res.status, 200);
  assert.deepEqual(titles(res.body), ['Superman', 'Aquaman', 'Batman']);
  assert.equal(typeof res.body[0].createdAt, 'string', 'dates are serialized as ISO strings');
});

test('GET /comics?sold=true includes sold comics', async () => {
  const res = await api.get('/comics?sold=true');
  assert.equal(res.body.length, 4);
});

test('GET /comics supports filters, search and sorting', async () => {
  assert.deepEqual(titles((await api.get('/comics?status=reading')).body), ['Aquaman']);
  assert.deepEqual(titles((await api.get('/comics?author=Bob&sort=title')).body), ['Aquaman', 'Batman']);
  assert.deepEqual(titles((await api.get('/comics?series=Superman')).body), ['Superman']);
  assert.deepEqual(titles((await api.get('/comics?genre=Sci-Fi')).body), ['Superman']);
  assert.deepEqual(titles((await api.get('/comics?search=MAN&sort=title')).body), ['Aquaman', 'Batman', 'Superman']);
  assert.deepEqual(titles((await api.get('/comics?search=clark')).body), ['Superman']);
  assert.deepEqual(titles((await api.get('/comics?sort=rating')).body).slice(0, 2), ['Batman', 'Superman']);
});

test('GET /comics paginates with limit/page', async () => {
  const p1 = await api.get('/comics?limit=2&page=1&sort=title');
  assert.deepEqual(titles(p1.body.data), ['Aquaman', 'Batman']);
  assert.equal(p1.body.hasMore, true);

  const p2 = await api.get('/comics?limit=2&page=2&sort=title');
  assert.deepEqual(titles(p2.body.data), ['Superman']);
  assert.equal(p2.body.hasMore, false);
});

test('GET /comics/:id returns a comic or 404', async () => {
  const ok = await api.get('/comics/c1');
  assert.equal(ok.status, 200);
  assert.equal(ok.body._id, 'c1');
  assert.equal((await api.get('/comics/missing')).status, 404);
});

test('POST /comics creates a comic and rejects duplicates', async () => {
  const created = await api.post('/comics', { title: 'Flash', issueNumber: 1, rating: 4.8 });
  assert.equal(created.status, 201);
  assert.ok(created.body._id);
  assert.equal(created.body.rating, 4, 'rating is normalized');
  assert.equal(created.body.sold, false);
  assert.ok(api.store.comics.has(created.body._id), 'persisted in Firestore');

  const dup = await api.post('/comics', { title: 'flash', issueNumber: '1' });
  assert.equal(dup.status, 409);

  const list = await api.get('/comics');
  assert.ok(titles(list.body).includes('Flash'), 'new comic visible without reloading');
});

test('PUT /comics/:id merges changes and protects _id/createdAt', async () => {
  const res = await api.put('/comics/c1', { _id: 'hack', createdAt: 'hack', rating: 2, location: 'Estantería 1' });
  assert.equal(res.status, 200);
  assert.equal(res.body._id, 'c1');
  assert.equal(res.body.rating, 2);
  assert.equal(res.body.title, 'Batman', 'untouched fields are kept');
  assert.equal(res.body.createdAt, '2024-01-01T00:00:00.000Z');

  const stored = api.store.comics.get('c1');
  assert.equal(stored.location, 'Estantería 1');
  assert.ok(!('_id' in stored));
  assert.ok(stored.createdAt instanceof MockTimestamp);

  assert.equal((await api.get('/comics/c1')).body.location, 'Estantería 1');
});

test('PUT /comics/:id on an unknown comic returns 404', async () => {
  assert.equal((await api.put('/comics/missing', { rating: 1 })).status, 404);
});

test('marking a comic as sold hides it from the default list', async () => {
  await api.put('/comics/c2', { sold: true });
  assert.ok(!titles((await api.get('/comics')).body).includes('Superman'));
});

test('DELETE /comics/:id removes the comic', async () => {
  const res = await api.del('/comics/c1');
  assert.equal(res.status, 200);
  assert.ok(!api.store.comics.has('c1'));
  assert.equal((await api.get('/comics/c1')).status, 404);
});

test('GET /comics/statistics ignores sold comics', async () => {
  const res = await api.get('/comics/statistics');
  assert.equal(res.status, 200);
  assert.equal(res.body.totalComics, 3);
  assert.equal(res.body.completedComics, 1);
  assert.equal(res.body.avgRating, '4.00');
  assert.deepEqual(res.body.genreStats[0], { _id: 'Action', count: 2 });
  assert.deepEqual(res.body.topAuthors[0], { _id: 'Bob', count: 2 });
});

test('GET /comics/export returns JSON and CSV', async () => {
  const json = await api.get('/comics/export');
  assert.equal(json.status, 200);
  assert.equal(json.body.length, 4);

  const csv = await api.get('/comics/export?format=csv');
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  const lines = csv.text.split('\n');
  assert.equal(lines.length, 5, 'header + 4 comics');
  assert.equal(lines[0].split(',').length, 12);
});

test('POST /comics/import adds every comic', async () => {
  const res = await api.post('/comics/import', [{ title: 'A', _id: 'ignored' }, { title: 'B' }]);
  assert.equal(res.status, 201);
  assert.equal(api.store.comics.size, 6);
  const list = titles((await api.get('/comics')).body);
  assert.ok(list.includes('A') && list.includes('B'));

  assert.equal((await api.post('/comics/import', { not: 'an array' })).status, 400);
});

test('a full session of actions reads the comics collection only once', async () => {
  await api.get('/comics');
  await api.get('/comics?search=bat');
  await api.get('/comics?limit=2&page=2');
  await api.post('/comics', { title: 'Flash', issueNumber: 1 });
  await api.put('/comics/c1', { rating: 1 });
  await api.del('/comics/c2');
  await api.get('/comics/statistics');
  await api.get('/comics/export');
  await api.get('/comics/c3');

  assert.equal(api.stats.collectionGets.comics, 1);
  assert.equal(api.stats.reads, 4, 'only the initial load of 4 documents');
});
